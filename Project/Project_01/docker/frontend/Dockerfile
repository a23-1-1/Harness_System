# ═══════════════════════════════════════════════════════════════
# Dockerfile — React 19 前端（多阶段构建 + Nginx 部署）
# ═══════════════════════════════════════════════════════════════
# 特性：
#   - 多阶段构建，最终镜像仅含 Nginx + 静态文件
#   - 前端路由 404 → index.html 重写（由 nginx.conf 处理）
#   - 构建时注入 VITE_ 环境变量
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: 构建 ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-/api}
ENV VITE_WS_URL=${VITE_WS_URL:-ws://localhost:8000/ws}

# 先复制依赖配置 → 利用 Docker 缓存层加速
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# 复制源码并构建
COPY . .
RUN pnpm build

# ─── Stage 2: 运行（Nginx） ───────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# 时区
RUN apk add --no-cache tzdata curl \
    && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone

# 从 builder 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 配置（含前端路由 404 → index.html 重写 + API/WebSocket 反向代理）
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:80 || exit 1

CMD ["nginx", "-g", "daemon off;"]
