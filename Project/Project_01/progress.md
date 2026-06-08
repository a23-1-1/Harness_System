# Session Progress Log — DB Demo Studio

> AI 协作式数据库课程演示工作台
> 基于 requirements-spec.md v5

## Current State

**Last Updated:** 2026-06-08
**Session ID:** 004
**Active Feature:** feat-004 — P1 轻量可视化 & EXPLAIN 引擎集成

## Status

### What's Done

#### feat-001 / feat-002 / feat-003 ✅（全部完成）
- 见 progress.md 历史记录

#### feat-004 P1 轻量可视化 & EXPLAIN 引擎集成 ✅（已全部完成）

- [x] **explain-engine MCP 服务器** (`backend/app/mcp/servers/explain_engine.py`)
  - MySQL 8.0 EXPLAIN FORMAT=JSON（aiomysql）
  - PostgreSQL 16 EXPLAIN (FORMAT JSON)（asyncpg）
  - 只读 SQL 白名单（SELECT/WITH/EXPLAIN）防注入
  - Docker 双容器启动健康验证通过 ✅
  - 端到端 EXPLAIN 调用验证通过 ✅

- [x] **mermaid-gen MCP 服务器** (`backend/app/mcp/servers/mermaid_gen.py`)
  - 6 阶段对应图类型，MCP Registry 注册 5 个工具

- [x] **Orchestrator 集成 + LLM Prompt 增强** — SQL 分析注入 mermaid 自动生成
- [x] **前端 MermaidRenderer** — 单例 import，错误 fallback
- [x] **feature_list.json** — feat-004 标记 done

## Files Modified This Session

- `backend/app/mcp/servers/explain_engine.py` — 新建
- `backend/app/mcp/servers/mermaid_gen.py` — 新建
- `backend/app/mcp/servers/__init__.py` — 注册新工具
- `backend/app/agents/orchestrator.py` — SQL 分析 + mermaid 自动生成
- `backend/app/llm/gateway.py` — 增强 prompt + sql_analysis 注入
- `frontend/src/types.d.ts` — DemoStep mermaid 字段
- `frontend/src/components/DemoPreview/index.tsx` — MermaidRenderer
- `frontend/package.json` — 添加 mermaid 依赖

## Notes for Next Session

1. 启动 EXPLAIN 引擎：`docker compose up -d mysql-explain pgexplain`
2. 安装 aiomysql + asyncpg：`pip install aiomysql asyncpg`
3. 验证：发送 "SELECT * FROM students JOIN scores ON students.id = scores.student_id" 检查 mermaid 字段

#### feat-001 项目脚手架 ✅（已全部完成）
- [x] Git 仓库初始化，单 `master` 主分支，模块通过目录区分
- [x] Agent harness 创建 & 定制化（基于 requirements-spec.md v5 优化）
- [x] 明确完整技术栈（React 19 + FastAPI + WebSocket + Redis + PG + Docker）
- [x] backend/ 和 frontend/ 完整骨架代码
- [x] PostgreSQL 持久化（Conversation / Message / Demo 三张 ORM 模型）
- [x] WebSocket 连接池 + 心跳 + 重连
- [x] Redis 会话缓存 + LLM 缓存
- [x] Docker Compose PG+Redis 双容器验证通过
- [x] 前端三栏布局 UI（浅色 SaaS 风格 + 顶部导航栏 + 响应式 Grid）

#### feat-002 AI Agent & LLM Gateway ✅（已全部完成）
- [x] **LLM Gateway** (`backend/app/llm/gateway.py`)
  - 兼容 OpenAI SDK，支持 SiliconFlow 和 DeepSeek 双 Provider
  - Redis LLM 响应缓存（1 小时 TTL，相同 prompt 命中）
  - 自动降级响应（API 失败时返回结构化的降级演示）
  - JSON 格式输出强制（`response_format={"type": "json_object"}`）
  - Token 用量日志记录
  - 新增 `chat_with_json()` 通用 JSON 对话接口
- [x] **Orchestrator Agent** (`backend/app/agents/orchestrator.py`)
  - 完整流程编排：保存消息 → 推送 step:preview → 调用 LLM → 流式推送 → demo:complete
  - 意图识别工具（关键词匹配）
  - 工具注册表框架（sql_analyze / explain_engine / mermaid_gen / simulator）

#### feat-003 P0 即时演示 🔄（本轮开发）
- [x] **LLM System Prompt 升级** — 严格 P0 6 阶段标准输出（lex/parse/optimize/plan/execute/result），含 JSON schema、教学风格要求
- [x] **流式 step:preview 推送** — 逐步骤推送预览（含 stage 标签、interactive_hint）
- [x] **用户可打断** — `chat:interrupt` 设置 `_interrupted` 标志，Agent 在每步骤间检查
- [x] **step:regenerate 局部重写** — 读取最新 demo_snapshot → LLM 重写单步 → 更新 PG
- [x] **demo_snapshot 持久化** — 生成完成后保存 assistant 消息到 messages 表 + 快照到 demos 表
- [x] **前端 DemoPreview 6 阶段展示** — FlowView 显示 stage 标签 + PlayView 阶段说明
- [x] **前端 StepPreviewMessage** — 展示单步骤预览卡（含 stage badge）+ step:regenerated 事件
- [x] **引入 `chat_with_json()`** — LLM Gateway 新增通用 JSON 对话接口用于步骤重写

### What's Next

TODO（后续 sessions）:
1. feat-004 P1 轻量可视化 & EXPLAIN 引擎集成
   - Mermaid/ASCII/ECharts 对话式生成
   - Docker MySQL 8.0:3308 + PostgreSQL 16:5433 作为 EXPLAIN 引擎
2. 端到端测试：配置 DEEPSEEK_API_KEY → 重启后端 → 发送消息验证

## Files Modified This Session

- `backend/app/llm/gateway.py` — System Prompt 升级 P0 6 阶段 + `chat_with_json()`
- `backend/app/agents/orchestrator.py` — step:regenerate, interrupt, demo_snapshot 持久化
- `backend/app/ws/manager.py` — step:regenerate 路由 + interrupt 调用
- `frontend/src/types.d.ts` — DemoStep 增加 stage/interactive_hint
- `frontend/src/components/DemoPreview/index.tsx` — 6 阶段标识+阶段说明
- `frontend/src/components/ChatPanel/index.tsx` — StepPreviewMessage + step:regenerated
- `feature_list.json` — feat-002 done, feat-003 in-progress

## Notes for Next Session

1. 配置 DEEPSEEK_API_KEY（已在 .env 中，需确认有效性）
2. 重启后端：`cd backend && uvicorn app.main:app --reload --port 8000`
3. 在前端发送一条 SQL 消息，验证 P0 6 阶段生成流程
4. 测试 step:regenerate 和 interrupt 功能
