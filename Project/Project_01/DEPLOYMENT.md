# ═══════════════════════════════════════════════════════════════
# DEPLOYMENT.md — DB Demo Studio Docker 部署手册
# ═══════════════════════════════════════════════════════════════

## 目录

- [前置要求](#前置要求)
- [文件结构](#文件结构)
- [部署命令清单](#部署命令清单)
- [日常运维命令](#日常运维命令)
- [高频问题排查](#高频问题排查)
- [Windows 注意事项](#windows-注意事项)
- [Linux 部署注意事项](#linux-部署注意事项)

---

## 前置要求

| 工具 | 版本 | 验证命令 |
|------|------|---------|
| Docker Desktop | ≥ 24.x | `docker --version && docker compose version` |
| Git | ≥ 2.x | `git --version` |

> 若中国大陆网络访问 Docker Hub 慢，配置镜像加速器后运行。

---

## 文件结构

```
Project_Project_01/
├── docker-compose.yml          # 🔧 主编排文件（所有服务配置）
├── .env                        # 🔒 环境变量（从 .env.example 复制后修改）
├── .env.example                # 环境变量模板
│
├── frontend/                   # React 19 源码
├── backend/                    # FastAPI 源码
│
├── docker/
│   ├── backend/
│   │   ├── Dockerfile          # 🔧 FastAPI 多阶段构建
│   │   ├── .dockerignore       # 构建忽略
│   │   ├── redis.conf          # Redis 配置
│   │   └── init-db.sql         # PostgreSQL 初始化脚本
│   │
│   └── frontend/
│       ├── Dockerfile          # 🔧 React 多阶段构建 + Nginx
│       ├── .dockerignore       # 构建忽略
│       └── nginx.conf          # 🔧 反向代理 + WebSocket 配置
```

---

## 部署命令清单

### 1. 首次部署

```bash
# 1. 进入项目目录
cd Project/Project_01

# 2. 创建 .env（如不存在）
copy .env.example .env          # Windows
# cp .env.example .env          # Linux

# 3. 编辑 .env — 至少填入 CLAUDE_API_KEY 等密钥
notepad .env                    # Windows

# 4. 构建并启动所有服务
docker compose up -d --build

# 5. 检查所有服务状态
docker compose ps

# 6. 查看初始化日志
docker compose logs -f --tail=100
```

### 2. 更新部署（代码变更后）

```bash
# 拉取最新代码
git pull

# 仅重新构建后端（如果 backend/ 有变化）
docker compose up -d --build backend

# 仅重新构建前端（如果 frontend/ 有变化）
docker compose up -d --build frontend

# 或全部重新构建
docker compose up -d --build
```

### 3. 验证部署

```bash
# 健康检查
curl http://localhost/api/v5/health
# 预期: {"status":"ok","redis":"connected","postgres":"connected","timestamp":"..."}

# 前端页面
# 浏览器访问: http://localhost:80
# 或: http://localhost:3000（如果改了端口）

# WebSocket 测试
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Host: localhost" http://localhost/ws
```

---

## 日常运维命令

### 启动 / 停止 / 重启

```bash
# 启动所有服务（后台）
docker compose up -d

# 启动单个服务
docker compose up -d backend
docker compose up -d frontend
docker compose up -d postgres
docker compose up -d redis

# 停止所有服务
docker compose down

# 停止所有服务 + 删除数据卷（⚠️ 数据会丢失！）
docker compose down -v

# 重启所有服务
docker compose restart

# 重启单个服务
docker compose restart backend
```

### 日志

```bash
# 所有服务日志（实时追踪）
docker compose logs -f

# 单个服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis

# 最近 N 行
docker compose logs --tail=50 backend
```

### 进入容器内部

```bash
# 后端
docker compose exec backend bash

# 数据库
docker compose exec postgres psql -U dbdemo -d db_demo_studio

# Redis
docker compose exec redis redis-cli

# 查看 Redis 活跃会话键
docker compose exec redis redis-cli keys 'session:*'

# 查看 Redis 消息缓存
docker compose exec redis redis-cli llen conv:messages:*

# 查看 PostgreSQL 表
docker compose exec postgres psql -U dbdemo -d db_demo_studio -c "\dt"
```

### 镜像管理

```bash
# 查看构建的镜像
docker images | grep db-demo

# 清理旧镜像
docker image prune

# 查看容器资源占用
docker stats
```

---

## 高频问题排查

### 🔴 问题 1: 端口冲突

**现象**：`docker compose up -d` 报错 `port is already allocated`

**原因**：本机的 PostgreSQL(5432)、Redis(6379)、Web 服务(80/3000/8000) 已经在运行。

**解决方法**：

```bash
# 方案 A: 停止宿主机对应服务
netstat -ano | findstr :5432    # Windows 查看谁占用了端口
taskkill /PID <PID> /F

# 方案 B: 修改 .env 文件，换端口
PG_PORT=5433                    # 把宿主机 5433 → 容器 5432
REDIS_PORT=6380                 # 把宿主机 6380 → 容器 6379
FRONTEND_PORT=3000              # 把宿主机 3000 → 容器 80
BACKEND_PORT=8001               # 把宿主机 8001 → 容器 8000

# 方案 C: Docker Desktop → 停止已运行的同名容器
docker stop db-demo-postgres db-demo-redis db-demo-backend db-demo-frontend 2>/dev/null
docker compose up -d
```

### 🔴 问题 2: 数据库连接失败

**现象**：后端日志报 `could not connect to server` 或 `Connection refused`

**原因**：Docker 网络未就绪、依赖顺序问题、认证失败。

**排查步骤**：

```bash
# 1. 检查 PostgreSQL 容器是否健康
docker compose ps postgres
# 确保显示 healthy（而非 starting 或 unhealthy）

# 2. 检查 PostgreSQL 日志
docker compose logs postgres --tail=20

# 3. 测试容器间网络连通性
docker compose exec backend bash -c "ping -c 3 postgres"
docker compose exec backend bash -c "curl postgres:5432"

# 4. 手动连接数据库验证凭据
docker compose exec postgres psql -U dbdemo -d db_demo_studio -c "SELECT 1;"

# 5. 如果密码不对→检查.env中 PG_PASSWORD 是否与 DATABASE_URL 一致
#   注意：docker-compose.yml 中 environment 会覆盖 .env！
```

### 🔴 问题 3: WebSocket 连接失败

**现象**：前端能加载但聊天功能不可用，控制台报 `WebSocket connection to 'ws://...' failed`

**原因**：WebSocket 升级头未正确传递、Nginx 配置缺少 `proxy_set_header Upgrade` 或 `Connection "upgrade"`。

**排查步骤**：

```bash
# 1. 验证 Nginx 配置（docker/frontend/nginx.conf）
#   确认 /ws location 包含：
#     proxy_set_header Upgrade $http_upgrade;
#     proxy_set_header Connection "upgrade";
#     proxy_buffering off;
#     proxy_read_timeout 3600s;

# 2. 测试 WebSocket 直连后端（跳过 Nginx）
#   用 Python 快速测试：
docker compose exec backend python -c "
import asyncio, websockets
async def test():
    async with websockets.connect('ws://localhost:8000/ws?teacherId=test&convId=test') as ws:
        await ws.send('{\"event\":\"chat:message\",\"payload\":{\"type\":\"text\",\"content\":\"ping\"}}')
        print('WebSocket OK')
asyncio.run(test())
"

# 3. 检查浏览器控制台 WebSocket 请求的响应头
#   - 确认状态码 101 (Switching Protocols)
#   - 确认响应头包含 Upgrade: websocket
#   - 确认响应头包含 Connection: Upgrade

# 4. 如果是 HTTPS 环境→前端 VITE_WS_URL 必须用 wss:// 而非 ws://
```

### 🔴 问题 4: CORS / API 请求跨域

**现象**：前端可加载，API 请求报 `CORS policy: No 'Access-Control-Allow-Origin'`

**原因**：Nginx 已处理同域请求，但如果直接访问 `http://localhost:3000` → `http://localhost:8000` 会跨域。

**解决方法**：

```bash
# 方案 A（推荐）: 用 Nginx 统一端口（端口 80）
# 前端 → http://localhost:80
# API  → http://localhost:80/api/...（Nginx 反向代理到后端，不跨域）
# 这需要修改前端 VITE_API_BASE_URL=/api

# 方案 B: 后端开启 CORS
# 在 .env 中设置:
CORS_ORIGINS=http://localhost:3000,http://localhost:80

# 在 backend/app/main.py 中添加:
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=os.getenv("CORS_ORIGINS", "").split(","),
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )
```

### 🔴 问题 5: 前端路由 404（刷新页面后白屏）

**现象**：从首页正常进入，但刷新 /teacher/workbench 页面显示 404

**原因**：Nginx 不知道 React 路由，直接去查找 `/teacher/workbench` 文件。

**解决方法**（已配置在 nginx.conf 中，确认存在即可）：

```nginx
# 在 nginx.conf 中确认以下配置存在
location / {
    try_files $uri $uri/ /index.html;   # ← 这行就是修复
}
```

### 🔴 问题 6: 镜像构建失败

**现象**：`docker compose up -d --build` 报错

**排查步骤**：

```bash
# 1. 单独构建后端，查看详细输出
docker compose build --no-cache backend

# 2. 常见原因
#   - pip install 超时 → 换国内源
#     pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
#   - pnpm install 超时 → 换国内源 / 重试
#   - 磁盘空间不足 → docker system prune

# 3. 测试 pnpm-lock.yaml 是否存在
#    如不存在 → 去掉 Dockerfile 中的 --frozen-lockfile
```

### 🔴 问题 7: Docker Desktop 占用磁盘空间过大

```bash
# 查看磁盘占用
docker system df

# 清理悬空镜像、停止的容器、未使用的网络
docker system prune -f

# 清理所有 unused 镜像（含所有未被使用的）
docker image prune -a -f

# 查看各容器日志文件大小（Windows: C:\Users\<用户>\AppData\Local\Docker\）
```

### 🔴 问题 8: LLM API 调用失败

**现象**：对话中 AI 无响应或报 API Key 错误

```bash
# 1. 确认 .env 中 API Key 已填写
# 2. 检查后端日志
docker compose logs backend | grep -i "api_key\|claude\|deepseek"
# 3. 确认宿主机是否能访问 API 端点
curl -I https://api.anthropic.com
```

---

## Windows 注意事项

| 问题 | 解决方法 |
|------|---------|
| `host.docker.internal` 不可用 | Docker Desktop 设置中启用 "Expose daemon on tcp://localhost:2375" |
| 文件共享权限 | Docker Desktop → Settings → Resources → File Sharing → 添加项目目录 |
| CRLF 换行符 | 在 Dockerfile 和 .sh 脚本目录中添加 `.gitattributes: * text=auto eol=lf` |
| WSL2 后端慢 | 确保项目放在 WSL2 文件系统下（如 `\\wsl.localhost\...`）而非 Windows 路径 |

```bash
# Windows 专用：创建 .gitattributes 避免 CRLF 问题
echo "* text=auto eol=lf" >> .gitattributes
echo "*.bat text eol=crlf" >> .gitattributes
```

---

## Linux 部署注意事项

| 项目 | 说明 |
|------|------|
| Linux 上的 `host.docker.internal` 默认不可用 | 改用 `--add-host host.docker.internal:host-gateway`（已在 compose.yml 中预配置）|
| 防火墙检查 | `sudo ufw status` — 确保开放端口（80, 8000, 5432, 6379）|
| 数据持久化位置 | 数据卷默认在 `/var/lib/docker/volumes/`，如需备份直接备份该目录 |
| 生产环境安全 | 建议在 .env 中设置强密码，禁用 PostgreSQL 远程连接，Redis 设置密码 |

**Linux EXPOSE 数据库访问配置**：

```yaml
# 如果 MySQL EXPLAIN 引擎在宿主机运行
# 在 docker-compose.yml 中添加：
# extra_hosts:
#   - "host.docker.internal:host-gateway"
```

---

> **Docker Compose 生命周期**：
> `build` → `up -d` → `logs -f` → `ps` → `restart` → `down`
>