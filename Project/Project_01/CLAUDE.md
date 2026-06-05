# CLAUDE.md — DB Demo Studio

> Claude Code 快速参考。完整规则请见 `AGENTS.md`。

## 构建与运行

```bash
# 后端
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 前端
cd frontend
pnpm install
pnpm dev                    # localhost:5173

# Docker 数据库
docker compose -f docker/docker-compose.yml up -d

# 完整验证
bash init.sh
```

## 关键文件

| 文件 | 用途 |
|------|---------|
| `backend/app/main.py` | FastAPI 应用入口，CORS，生命周期 |
| `backend/app/ws/manager.py` | WebSocket 连接池 + 心跳 |
| `backend/app/ws/handlers.py` | 消息路由（chat:message → Agent） |
| `backend/app/agents/orchestrator.py` | Orchestrator Agent（意图 → 工具选择） |
| `backend/app/llm/gateway.py` | LLM 网关（Claude + DeepSeek + 缓存） |
| `backend/app/models/conversation.py` | 对话 + 消息 PG 模型 |
| `frontend/src/App.tsx` | 根 React 组件（三栏布局） |
| `frontend/src/hooks/useWebSocket.ts` | WebSocket 连接/重连钩子 |
| `frontend/src/components/ChatPanel/` | 消息流 + 输入 + Agent 轨迹 |
| `frontend/src/components/ConversationPanel/` | 对话列表 + 搜索 |
| `frontend/src/components/DemoPreview/` | 演示预览（三视图联动） |
| `feature_list.json` | 功能跟踪（pass/fail + 证据） |

## 架构规则（必须遵守）

- 前端禁止导入 Python 或 Node.js 服务器模块。
- 所有实时通信走 WebSocket。
- REST 仅用于 CRUD 操作。
- Redis 用于热数据（会话/缓存/广播），PG 用于冷数据（持久化）。
- MCP 服务器是独立进程——禁止嵌入 FastAPI。
- Python：所有函数使用类型注解。TypeScript：严格模式。
- 仅使用命名导出。

## API 参考

### WebSocket 事件（客户端 → 服务端）

| 事件 | 用途 |
|-------|---------|
| `chat:message` | 发送消息（text/sql/image/knowledge）|
| `chat:interrupt` | 打断 AI 生成 |
| `conv:create\|switch\|delete\|rename` | 对话管理 |
| `step:regenerate` | 重生成单步 |
| `quiz:answer` | 提交答案 |
| `player:seek` | 跳转到步骤 |
| `demo:export` | 导出演示 |

### WebSocket 事件（服务端 → 客户端）

| 事件 | 用途 |
|-------|---------|
| `agent:thinking` | Agent 执行轨迹 |
| `agent:tool_call` | 工具调用状态 |
| `step:preview` | 步骤预览 |
| `demo:updated\|complete` | 演示更新/就绪 |
| `quiz:result` | 答题结果 |
| `conv:list\|loaded` | 对话列表/已加载 |

### REST API

```
GET    /api/v5/conversations              → 对话列表
POST   /api/v5/conversations              → 创建对话
GET    /api/v5/conversations/:id          → 对话详情
PATCH  /api/v5/conversations/:id          → 更新对话
DELETE /api/v5/conversations/:id          → 删除对话
GET    /api/v5/conversations/:id/messages → 消息历史
POST   /api/v5/demos/:id/export           → 导出演示
GET    /api/v5/teacher/profile            → 读取风格配置
POST   /api/v5/teacher/profile            → 保存风格配置
```

## 如何添加功能

1. 在 `backend/app/models/` 中定义数据模型。
2. 在 `backend/app/routes/` 中添加 REST 路由，或在 `backend/app/ws/handlers.py` 中添加 WebSocket 处理器。
3. 如果是 AI 驱动功能，在 `backend/app/agents/` 中添加 Agent 逻辑。
4. 在 `frontend/src/components/` 中构建 UI。
5. 在服务方法中添加日志调用。
6. 运行 `bash scripts/check-architecture.sh` 验证层边界。
7. 更新 `feature_list.json`，状态设为 "pass" + 填写证据。

## 测试

```bash
# 后端
cd backend && pytest -v

# 前端
cd frontend && pnpm test

# 完整质量闸门
bash init.sh
bash scripts/cleanup-scanner.sh
bash scripts/benchmark.sh
```
