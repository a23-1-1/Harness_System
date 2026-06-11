# DB Demo Studio

**AI 协作式数据库课程演示工作台**

教师通过自然语言对话与 AI 协作，完成数据库课程知识点的演示生成、可视化、模拟器搭建、讲解词打磨、测验出题和效果验证。所有功能通过对话触发、对话优化、对话反馈。

## 快速开始

### 前置条件

- Python 3.12+
- Node.js 20+ / pnpm 8+
- Docker（PostgreSQL + Redis）

### 启动

```bash
# 1. 启动数据库
docker compose up -d

# 2. 启动后端
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. 启动前端
cd frontend
pnpm install
pnpm dev          # http://localhost:5173
```

### 配置

复制 `.env.example` 为 `.env`，填入必要的 API Key：

| 变量 | 说明 | 必需 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API Key（LLM 生成演示用） | 是 |
| `DATABASE_URL` | PostgreSQL 连接 URL | 是（有默认值） |
| `REDIS_URL` | Redis 连接 URL | 是（有默认值） |

## 功能概览

| # | 功能 | 状态 |
|---|------|------|
| 001 | 项目脚手架 & 对话基础设施（FastAPI + WebSocket + React 19 三栏布局） | ✅ |
| 002 | AI Agent Runtime & LLM Gateway（DeepSeek + Prompt Caching） | ✅ |
| 003 | P0 即时演示（6 阶段分步讲解 + 流式生成 + 可打断 + 单步重写） | ✅ |
| 004 | P1 轻量可视化（Mermaid / EXPLAIN 引擎集成） | ✅ |
| 005 | P2 专业模拟器（B+树 / 事务 / SQL 执行 / 策略对比） | ✅ |
| 006 | 对话式测验 & 教学闭环（AI 出题 + 自动判题 + 掌握度分析） | ✅ |
| 007 | 课堂广播 & 多端同步（Redis Pub/Sub Room 管理） | ✅ |
| 008 | 对话搜索 / 版本快照 / 导出（搜索 API + 快照对比 + 多格式导出） | ✅ |
| 009 | 课纲 RAG & 教师风格学习（Profile API + 风格自动学习 + 知识点搜索） | ✅ |
| 010 | 性能优化 & 生产部署（速率限制 + 审计日志 + 前端体积优化） | ✅ |

完整功能跟踪见 [feature_list.json](feature_list.json)。

## 架构

```
Frontend (React 19 + Vite + TailwindCSS v4)    :5173
    │ WebSocket (ws://) + REST
Backend (FastAPI + Uvicorn)                     :8000
    ├── WebSocket Manager — 连接池 / 心跳 / Room 广播
    ├── AI Agent Runtime — Orchestrator Agent + MCP 工具
    ├── LLM Gateway — DeepSeek / Claude 双 Provider
    └── REST API — 对话 / 快照 / 教师 Profile / 课纲搜索
    │
Infrastructure
    ├── PostgreSQL — 对话 / 消息 / 快照 / 教师 Profile
    └── Redis — 会话缓存 / LLM 缓存 / 速率限制 / Pub/Sub
```

详细架构见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 技术栈

| 层 | 技术 |
|------|---------|
| 后端 | Python 3.12, FastAPI, Uvicorn, SQLAlchemy 2.0, asyncpg |
| 前端 | React 19, TypeScript 5.6, Vite 6, TailwindCSS v4 |
| 数据库 | PostgreSQL 16 (pgvector), Redis 7 |
| LLM | DeepSeek API, Claude API |
| 可视化 | Mermaid 11, D3.js 7 |
| 容器 | Docker Compose (backend + frontend + postgres + redis) |

## API 参考

### REST API

```
GET    /api/v5/conversations              → 对话列表（支持搜索/分页）
POST   /api/v5/conversations              → 创建对话
GET    /api/v5/conversations/:id          → 对话详情
PATCH  /api/v5/conversations/:id          → 更新对话
DELETE /api/v5/conversations/:id          → 删除对话
GET    /api/v5/conversations/:id/messages → 消息历史
GET    /api/v5/conversations/:id/snapshots→ 版本快照列表
POST   /api/v5/demos/:convId/compare      → 演示版本对比
POST   /api/v5/demos/:convId/copy         → 演示复用改编
GET    /api/v5/teacher/profile            → 教师风格配置
POST   /api/v5/teacher/profile            → 保存教师风格
GET    /api/v5/curriculum/search          → 知识点搜索
```

### WebSocket 事件

客户端发送：`chat:message`, `step:regenerate`, `quiz:answer`, `demo:export`, `player:seek` 等

服务端推送：`agent:thinking`, `step:preview`, `demo:complete`, `quiz:generated`, `demo:exported` 等

完整 API 文档见 [CLAUDE.md](CLAUDE.md)。

## 项目结构

```
backend/
  app/
    main.py               — FastAPI 入口，CORS，生命周期
    agents/orchestrator.py— AI Agent 编排
    llm/gateway.py        — LLM 网关
    ws/                   — WebSocket 连接管理 + 路由
    routes/               — REST API 路由
    models/               — SQLAlchemy 数据模型
    middleware/           — 速率限制 + 审计日志
    mcp/                  — MCP 工具注册
frontend/
  src/
    App.tsx               — 根组件（三栏布局）
    components/           — UI 组件
    hooks/                — React Hooks
    types/                — TypeScript 类型
```

## 文档

- [CLAUDEM.md](CLAUDE.md) — Claude Code 快速参考
- [AGENTS.md](AGENTS.md) — AI Agent 行为规则
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 系统架构
- [docs/PRODUCT.md](docs/PRODUCT.md) — 产品功能
- [feature_list.json](feature_list.json) — 功能跟踪
- [DEPLOYMENT.md](DEPLOYMENT.md) — 部署指南
