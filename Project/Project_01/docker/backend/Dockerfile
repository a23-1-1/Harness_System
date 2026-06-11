# ═══════════════════════════════════════════════════════════════
# Dockerfile — FastAPI 后端（多阶段构建，轻量化）
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: 依赖安装 ────────────────────────────────────────
# slim 镜像 + 纯 wheel 安装，避免 apt-get 在受限网络下失败
FROM python:3.12-slim AS builder

WORKDIR /app

# 安装到 /app/packages，运行阶段 dbdemo 用户可访问
COPY requirements.txt .
RUN pip install --no-cache-dir --target=/app/packages -r requirements.txt

# ─── Stage 2: 运行阶段 ────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# 复制应用代码与依赖（slim 镜像已含 ca-certificates，无需 apt-get）
COPY . .
COPY --from=builder /app/packages /app/packages
ENV PYTHONPATH=/app/packages

# 非 root 用户运行
RUN groupadd -r dbdemo && useradd -r -g dbdemo -d /app -s /sbin/nologin dbdemo \
    && chown -R dbdemo:dbdemo /app
USER dbdemo

EXPOSE 8000

# 健康检查（使用 Python 标准库，无需 curl）
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v5/health')" || exit 1

# 启动（Uvicorn + WebSocket 支持）
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--ws", "websockets", "--loop", "uvloop"]
