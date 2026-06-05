# CLAUDE.md — DB Demo Studio (AI 协作式数据库课程演示工作台)

> 基于 [requirements-spec.md](docs/requirements-spec.md) v5
> 核心设计理念：**一切皆对话**——每个功能都是 AI 对话的延伸，不是独立工具。

## 项目定位

用户在与 AI 的多轮对话中，协作完成数据库课程知识点演示的**生成、可视化、模拟器搭建、讲解词打磨、测验出题和效果验证**。所有功能都可**对话触发、对话优化、对话反馈**。

支持三种演示能力等级：
- **P0 即时演示**：6 阶段分步讲解（lex → parse → optimize → plan → execute → result）
- **P1 轻量可视化**：Mermaid / ASCII / ECharts 图
- **P2 专业模拟器**：SQL 分步执行 / B+树 / 事务隔离 / 锁竞争

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | **React 19 + Vite 8 + TailwindCSS v4** | 三栏布局（对话列表 + 消息流 + 演示预览） |
| 实时通信 | **WebSocket** | 聊天消息、Agent 轨迹推送、课堂广播 |
| 后端 | **FastAPI + Uvicorn** | REST API + WebSocket Manager |
| 主存储 | **PostgreSQL 16 + pgvector** | 对话持久化 + 课纲 RAG |
| 缓存 | **Redis 7+** | 会话状态、消息缓存、Pub/Sub 广播、LLM 缓存、限流 |
| AI | **Claude API (Anthropic SDK)** + DeepSeek (fallback) | LLM Gateway，支持 Prompt Caching |
| 可视化 | **Mermaid / D3.js / ECharts** | 对话生成图表 |
| 工具层 | **MCP Servers** (独立进程) | sql-analyze, explain-engine, curriculum-rag, mermaid-gen, simulator-engine |
| EXPlAIN 引擎 | **Docker (MySQL 8.0:3308, PostgreSQL 16:5433)** | testcontainers 按需启动 |
| 测试 | **pytest (backend) / Vitest (frontend)** | 后端 + 前端测试 |
| 包管理 | **pnpm (frontend) / pip + venv (backend)** | 分离管理 |

## 项目结构

```
Project_01/
├── frontend/             # React 19 + Vite 8
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConversationPanel/   # 对话列表
│   │   │   ├── ChatPanel/           # 消息流 + 输入
│   │   │   └── DemoPreview/         # 演示预览（三栏联动）
│   │   ├── hooks/                   # WebSocket, 状态管理
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/              # FastAPI
│   ├── app/
│   │   ├── ws/           # WebSocket Manager
│   │   ├── routes/       # REST API
│   │   ├── agents/       # AI Agent Runtime
│   │   ├── llm/          # LLM Gateway
│   │   └── models/       # PG / Redis 数据模型
│   ├── requirements.txt
│   └── main.py
├── mcp-servers/          # MCP 工具服务器（独立进程）
├── docker/               # Docker Compose (MySQL, PG)
├── docs/
│   └── requirements-spec.md
├── CLAUDE.md
├── feature_list.json
├── progress.md
├── init.sh
└── session-handoff.md
```

## Startup Workflow

1. **确认工作目录** — `pwd` 确保在 `Project_Project_01/`
2. **读此文件** — 了解项目规则
3. **读 requirements-spec.md** — 了解完整需求规格
4. **运行 `./init.sh`** — 初始化环境
5. **读取 `feature_list.json`** — 了解当前功能状态
6. **读取 `progress.md`** — 了解上次进度

如果 init.sh 失败，先修复环境再开发。

## 工作规则

- **一次一个功能**：从 `feature_list.json` 选一个未完成功能
- **对话优先**：所有功能都应通过对话触发和调整，不设独立 UI 控件
- **WebSocket 协议优先**：实时交互用 ws://，CRUD 操作用 REST
- **Redis 做热，PG 做冷**：会话/缓存/广播用 Redis，持久化/搜索/RAG 用 PG
- **验证必过**：不通过验证不能标记完成
- **更新制品**：每次结束前更新 progress.md 和 feature_list.json
- **保持干净**：下个会话能直接 `./init.sh` 启动

## 完成标准

一个功能完成必须满足**全部**：

- [ ] 功能行为实现并可通过对话触发
- [ ] WebSocket / REST 接口完整
- [ ] 前端对应 UI 组件渲染正确
- [ ] 测试通过（pytest + vitest）
- [ ] 证据记录在 feature_list.json 或 progress.md

## 验证命令

```bash
./init.sh                          # 完整环境验证

# 后端
cd backend && uvicorn app.main:app --reload --port 8000
pytest backend/ -v

# 前端
cd frontend && pnpm dev            # localhost:5173
cd frontend && pnpm test           # vitest

# Docker 数据库
docker compose -f docker/docker-compose.yml up -d
```

## WebSocket 协议参考

**连接**: `ws://localhost:8000/ws/chat?teacherId={id}&convId={convId}`

客户端 → 服务端：
- `chat:message` — 发送消息（text/sql/image/knowledge）
- `chat:interrupt` — 打断 AI 生成
- `conv:create|switch|delete|rename` — 对话管理
- `step:regenerate` — 重生成某一步
- `quiz:answer` — 学生提交答案
- `demo:export` — 导出演示

服务端 → 客户端：
- `agent:thinking` — Agent 执行轨迹
- `agent:tool_call` — 工具调用状态
- `step:preview` — 单步生成预览
- `demo:updated|complete` — 演示更新/就绪
- `quiz:result` — 答题结果
- `conv:list` — 对话列表更新

详见 `docs/requirements-spec.md` 第 5 节。

## 晋升规则

- **架构决策**：遵循 requirements-spec.md 的架构设计，修改需确认
- **需求不清晰**：先看文档和对话历史，再问用户
- **测试失败**：修复后重跑，连续失败标记阻塞
- **范围模糊**：重读 feature_list.json 中的完成标准
