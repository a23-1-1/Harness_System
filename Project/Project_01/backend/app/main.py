"""
DB Demo Studio — FastAPI 应用入口
"""
import os
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# 加载 .env（从项目根目录，兼容 uvicorn 不同启动路径）
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)

from app.ws.manager import ConnectionManager, ws_manager
from app.ws.rooms import room_manager
from app.database import init_db
from app.redis_cache import redis_cache
from app.mcp.servers import register_all_tools

load_dotenv()

# ─── 日志配置 ────────────────────────────────────────────────
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")

if LOG_FORMAT == "json":
    class JSONFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            return json.dumps({
                "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                "level": record.levelname,
                "service": "backend",
                "message": record.getMessage(),
                "data": getattr(record, "data", None),
            }, ensure_ascii=False)
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logging.basicConfig(level=getattr(logging, LOG_LEVEL), handlers=[handler])
else:
    logging.basicConfig(level=getattr(logging, LOG_LEVEL),
                        format="%(asctime)s [%(levelname)s] %(message)s")

logger = logging.getLogger(__name__)


# ─── ws_manager 使用 manager.py 的单例，避免重复创建 ──
# ws_manager 已在 from app.ws.manager import ws_manager 时导入


# ─── 生命周期 ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动/关闭生命周期"""
    logger.info("🚀 DB Demo Studio 启动", extra={"data": {"status": "starting"}})
    # 注册 MCP 工具
    try:
        register_all_tools()
        logger.info("MCP 工具注册完成")
    except Exception as e:
        logger.warning(f"MCP 工具注册失败: {e}")
    # 自动创建数据库表（开发环境）
    try:
        await init_db()
        logger.info("数据库表初始化完成")
    except Exception as e:
        logger.warning(f"数据库初始化失败（若未启动 Docker 可忽略）: {e}")
    # Redis 连接预热
    try:
        await redis_cache.get_client()
    except Exception as e:
        logger.warning(f"Redis 连接失败（若未启动 Docker 可忽略）: {e}")
    # 启动 Room Pub/Sub 监听器
    room_manager.start_listener()
    yield
    await room_manager.stop_listener()
    await redis_cache.close()
    logger.info("🛑 DB Demo Studio 关闭", extra={"data": {"status": "stopping"}})


# ─── 应用 ────────────────────────────────────────────────────
app = FastAPI(
    title="DB Demo Studio API",
    description="AI 协作式数据库课程演示工作台",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — WebSocket 不受此影响（WebSocket 握手不走 CORS 中间件）
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── 中间件：请求日志 ──────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    from app.ws.manager import ws_manager
    # 处理 WebSocket 升级请求（通过 ws_manager 确认）
    if request.headers.get("upgrade", "").lower() == "websocket":
        return await call_next(request)
    start = datetime.now(tz=timezone.utc)
    response = await call_next(request)
    duration = (datetime.now(tz=timezone.utc) - start).total_seconds() * 1000
    logger.info(
        f"{request.method} {request.url.path} → {response.status_code} ({duration:.0f}ms)",
        extra={"data": {
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(duration),
        }},
    )
    return response


# ─── 路由注册 ────────────────────────────────────────────────
from app.routes import conversations  # noqa: E402
from app.routes import students  # noqa: E402
from app.ws import handlers  # noqa: E402

app.include_router(conversations.router, prefix="/api/v5")
app.include_router(handlers.router)
app.include_router(students.router, prefix="/api/v5")


# ─── 健康检查 ────────────────────────────────────────────────
@app.get("/api/v5/health")
async def health_check():
    """健康检查端点"""
    redis_ok = "unknown"
    try:
        client = await redis_cache.get_client()
        await client.ping()
        redis_ok = "connected"
    except Exception:
        redis_ok = "disconnected"
    return {
        "status": "ok",
        "service": "db-demo-studio",
        "version": "0.1.0",
        "redis": redis_ok,
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
