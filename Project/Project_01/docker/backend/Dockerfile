# ═══════════════════════════════════════════════════════════════
# Dockerfile — FastAPI 后端（多阶段构建，轻量化）
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: 依赖安装 ────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# 系统依赖（编译用，最终阶段会删除）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 先复制依赖文件 → 利用 Docker 缓存层
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ─── Stage 2: 运行阶段 ────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# 系统依赖（运行时最低要求）
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 从 builder 复制已安装的包
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# 复制应用代码
COPY . .

# 非 root 用户运行
RUN groupadd -r dbdemo && useradd -r -g dbdemo -d /app -s /sbin/nologin dbdemo \
    && chown -R dbdemo:dbdemo /app
USER dbdemo

EXPOSE 8000

# 健康检查端点
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/v5/health || exit 1

# 启动（Uvicorn + WebSocket 支持）
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--ws", "websockets", "--loop", "uvloop"]
