# Session Progress Log — DB Demo Studio

> AI 协作式数据库课程演示工作台
> 基于 requirements-spec.md v5

## Current State

**Last Updated:** 2026-06-08
**Session ID:** 002
**Active Feature:** feat-002 — AI Agent Runtime & LLM Gateway

## Status

### What's Done

#### feat-001 项目脚手架 ✅（已全部完成）
- [x] Git 仓库初始化，单 `master` 主分支，模块通过目录区分
- [x] Agent harness 创建 & 定制化（基于 requirements-spec.md v5 优化）
- [x] 明确完整技术栈（React 19 + FastAPI + WebSocket + Redis + PG + Docker）
- [x] backend/ 和 frontend/ 完整骨架代码
- [x] PostgreSQL 持久化（Conversation / Message / Demo 三张 ORM 模型）
- [x] WebSocket 连接池 + 心跳 + 重连
- [x] Redis 会话缓存 + LLM 缓存
- [x] Dockx`er Compose PG+Redis 双容器验证通过
- [x] 前端三栏布局 UI（浅色 SaaS 风格 + 顶部导航栏 + 响应式 Grid）

#### feat-002 开始开发
- [x] **LLM Gateway** (`backend/app/llm/gateway.py`)
  - 兼容 OpenAI SDK，支持 SiliconFlow 和 DeepSeek 双 Provider
  - Redis LLM 响应缓存（1 小时 TTL，相同 prompt 命中）
  - 自动降级响应（API 失败时返回结构化的降级演示）
  - JSON 格式输出强制（`response_format={"type": "json_object"}`）
  - 教师风格 Profile 可选注入
  - Token 用量日志记录
- [x] **Orchestrator Agent** (`backend/app/agents/orchestrator.py`)
  - 完整流程编排：保存消息 → 推送 step:preview → 推送 agent:thinking → 调用 LLM → 推送 step:preview 逐步骤 → 推送 demo:complete
  - 意图识别工具（关键词匹配，后续可扩展）
  - 工具注册表框架（sql_analyze / explain_engine / mermaid_gen / simulator）
- [x] **ws/manager.py** — chat:message 处理器改为调用 Orchestrator Agent（替换模拟响应）

### What's In Progress

- [ ] feat-002 AI Agent Runtime & LLM Gateway
  - Details: SiliconFlow DeepSeek API 集成 + Redis 缓存 + Agent 编排
  - Blockers: 需要配置 SILICONFLOW_API_KEY 才能端到端验证

### What's Next

1. ✅ 安装 openai SDK
2. ✅ 创建 LLM Gateway（gateway.py）
3. ✅ 创建 Orchestrator Agent（orchestrator.py）
4. ✅ ws/manager.py 对接 Agent 流程
5. ❌ 配置 API Key → 重启后端 → 发送消息验证 LLM 调用
6. ❌ 添加 token 审计日志（stdout + Redis）
7. ❌ 添加 Agent 执行轨迹事件（agent:tool_call 推送）

## Blockers / Risks

- [ ] 需配置 SILICONFLOW_API_KEY 或 DEEPSEEK_API_KEY（在 .env 文件中）
  - SiliconFlow: https://cloud.siliconflow.cn 注册获取
  - 或 DeepSeek: https://platform.deepseek.com 注册获取
- [ ] SiliconFlow/DeepSeek 国内网络访问情况待确认

## Decisions Made

- **LLM Provider**: SiliconFlow 作为默认（国内可直连，兼容 DeepSeek 模型）
- **SDK**: OpenAI SDK（统一接口，同时支持 SiliconFlow / DeepSeek / OpenAI）
- **输出格式**: JSON Object 强制（response_format），便于结构化解析
- **缓存策略**: 完整 messages 数组 SHA256 → 前 32 位作为缓存 key
- **降级策略**: LLM 调用异常时返回固定降级演示，不中断用户流程
- **缓存 TTL**: 1 小时（同一节课内的重复提问最可能命中）

## Files Modified This Session

- `feature_list.json` — feat-001 标记 done，feat-002 标记 in-progress
- `backend/app/llm/gateway.py` — 新建 LLM 网关
- `backend/app/agents/orchestrator.py` — 新建 Orchestrator Agent
- `backend/app/ws/manager.py` — chat:message 处理器对接 Agent
- `.env` — 更新为 SiliconFlow/DeepSeek 配置
- `.env.example` — 同步更新

## Notes for Next Session

1. 配置 SILICONFLOW_API_KEY（在 .env 中）
2. 重启后端：uvicorn app.main:app --reload --port 8000
3. 在浏览器中发送一条消息，验证 LLM 调用流程
4. 检查后端日志确认 token 用量和响应
