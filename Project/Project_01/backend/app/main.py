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
from app.database import engine, init_db
from app.redis_cache import redis_cache
from app.mcp.servers import register_all_tools
from app.middleware.ratelimit import RateLimitMiddleware

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
origins_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [o.strip() for o in origins_raw.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 速率限制中间件（对 API 路由生效，Redis 不可用时降级为内存限流）
app.add_middleware(
    RateLimitMiddleware,
    limit=60,
    window=60,
    routes=["/api/"],
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
    # AI 审计日志（非 WebSocket 请求，跳过健康检查避免日志洪泛）
    if request.url.path != "/api/v5/health":
        try:
            from app.middleware.audit import log_api_request
            client_ip = request.client.host if request.client else ""
            log_api_request(request.method, request.url.path, response.status_code, duration, client_ip)
        except Exception:
            pass
    return response


# ─── 路由注册 ────────────────────────────────────────────────
from app.routes import conversations  # noqa: E402
from app.routes import students  # noqa: E402
from app.routes import demos  # noqa: E402
from app.routes import teacher  # noqa: E402
from app.routes import curriculum  # noqa: E402
from app.ws import handlers  # noqa: E402

app.include_router(conversations.router, prefix="/api/v5")
app.include_router(handlers.router)
app.include_router(students.router, prefix="/api/v5")
app.include_router(demos.router, prefix="/api/v5")
app.include_router(teacher.router, prefix="/api/v5")
app.include_router(curriculum.router, prefix="/api/v5")


# ─── 健康检查 ────────────────────────────────────────────────
@app.get("/api/v5/health")
async def health_check(deep: bool = False):
    """健康检查端点（deep=1 时额外探测 LLM API）"""
    redis_ok = "disconnected"
    try:
        redis_cache.reset_client()
        client = await redis_cache.get_client()
        if client is not None:
            await client.ping()
            redis_ok = "connected"
    except Exception:
        redis_ok = "disconnected"

    pg_ok = "disconnected"
    try:
        from sqlalchemy import text
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        pg_ok = "connected"
    except Exception:
        pg_ok = "disconnected"

    openai_sdk = "installed"
    try:
        import openai  # noqa: F401
    except ImportError:
        openai_sdk = "missing"

    from app.llm.gateway import llm_gateway
    llm_info = llm_gateway.config_status()
    llm_info["openai_sdk"] = openai_sdk
    if deep:
        llm_info = await llm_gateway.ping()

    overall = "ok"
    if redis_ok != "connected" or pg_ok != "connected":
        overall = "degraded"
    if llm_info.get("status") not in ("ready", "ok") and llm_info.get("ping") == "error":
        overall = "degraded"

    return {
        "status": overall,
        "service": "db-demo-studio",
        "version": "0.1.0",
        "redis": redis_ok,
        "pg": pg_ok,
        "llm": llm_info,
        "providers": llm_info.get("providers", {}),
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
