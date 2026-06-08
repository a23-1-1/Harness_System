"""
DB Demo Studio — FastAPI 应用入口
"""
import os
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

from app.ws.manager import ConnectionManager

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


# ─── 全局管理器 ──────────────────────────────────────────────
ws_manager = ConnectionManager()


# ─── 生命周期 ────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动/关闭生命周期"""
    logger.info("🚀 DB Demo Studio 启动", extra={"data": {"status": "starting"}})
    # 启动时检查 Redis / PG 连接（可在此添加健康检查预热）
    yield
    # 关闭时清理
    logger.info("🛑 DB Demo Studio 关闭", extra={"data": {"status": "stopping"}})


# ─── 应用 ────────────────────────────────────────────────────
app = FastAPI(
    title="DB Demo Studio API",
    description="AI 协作式数据库课程演示工作台",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
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
from app.ws import handlers  # noqa: E402

app.include_router(conversations.router, prefix="/api/v5")


# ─── 健康检查 ────────────────────────────────────────────────
@app.get("/api/v5/health")
async def health_check():
    """健康检查端点"""
    return {
        "status": "ok",
        "service": "db-demo-studio",
        "version": "0.1.0",
        "timestamp": datetime.now(tz=timezone.utc).isoformat(),
    }
