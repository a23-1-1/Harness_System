# AGENTS.md — DB Demo Studio (AI 协作式数据库课程演示工作台)

## 启动流程

在写任何代码之前，按顺序完成以下步骤：

1. **完整阅读本文件。** 它定义了本项目的边界和约定。
2. **阅读 `CLAUDE.md`**（若使用 Claude Code 则作为快速参考）。
3. **阅读 `docs/ARCHITECTURE.md`** 了解完整的系统结构和数据流。
4. **阅读 `docs/PRODUCT.md`** 了解完整的功能需求。
5. **阅读 `docs/RELIABILITY.md`** 了解日志、可观测性、清理状态和基准测试要求。
6. **运行 `bash init.sh`** 验证项目能够正常构建和初始化。
7. **阅读 `feature_list.json`** 查看所有功能的当前状态。

## 项目背景

DB Demo Studio 是一个 AI 协作式数据库课程演示工作台。教师通过自然语言对话与 AI 协作，完成课程知识点演示的**创建、优化和交付**。

**演示能力等级：**
- **P0 即时演示**：6 阶段分步讲解（词法分析 → 语法解析 → 查询优化 → 执行计划 → 执行过程 → 结果分析）
- **P1 轻量可视化**：Mermaid / ASCII / ECharts 图表，对话驱动样式调整
- **P2 专业模拟器**：SQL 分步执行 / B+树 / 事务隔离 / 锁竞争

**核心理念**：一切皆对话。每个功能都是 AI 对话的延伸，而非独立工具。

## 文档层次结构

`docs/` 目录按 Agent 可读性组织：

```
docs/
  ARCHITECTURE.md    — 完整系统层、数据流、存储布局
  PRODUCT.md         — 功能需求和用户交互行为
  RELIABILITY.md     — 日志、可观测性、清理状态、基准测试
```

添加新功能时，在写代码之前更新对应的文档。

## 层边界

### 前端（`frontend/`）
- React 19 + Vite 8 + TailwindCSS v4
- 只能通过 WebSocket + REST 通信
- **禁止**导入 Node.js 模块（fs、path、child_process）
- **禁止**直接访问 Redis 或 PostgreSQL

### 后端（`backend/`）
- FastAPI + Uvicorn
- WebSocket 管理器（`backend/app/ws/`）
- REST API 路由（`backend/app/routes/`）
- AI Agent 运行时（`backend/app/agents/`）
- LLM 网关（`backend/app/llm/`）

### MCP 服务器（`mcp-servers/`）
- 独立进程，通过 stdin/stdout JSON-RPC 通信
- 可热插拔，语言无关
- 每个服务器只负责单一职责

### 基础设施
- Redis 7+：会话状态、消息缓存、Pub/Sub 广播、LLM 缓存、速率限制
- PostgreSQL 16：完整持久化、pgvector 用于课纲 RAG
- Docker：MySQL 8.0 :3308 + PostgreSQL 16 :5433 作为 EXPLAIN 引擎

## 约定

- Python：所有函数签名使用类型注解。没有注释不得使用 `Any`。
- TypeScript：严格模式。没有注释不得使用 `any`。
- 两种语言均只使用命名导出。
- 所有 WebSocket 事件定义在同一位置。
- 新 REST 端点遵循 `/api/v5/{资源}/{操作}` 模式。
- 所有服务方法在重要事件时必须记录 INFO 级别日志。
- DEBUG 级别用于常规数据访问。
- WARN 用于缺失但非关键的数据。
- ERROR 用于失败情况。
- Redis 用于热数据（会话/缓存/广播），PG 用于冷数据（持久化/搜索/RAG）。

## 完成定义

一个功能被认为是"完成"的条件：

1. 代码编译无错误（TypeScript `tsc` + Python `mypy`）。
2. 应用启动成功，WebSocket 连接成功。
3. 功能出现在 `feature_list.json` 中，状态为 `"pass"` 且有证据。
4. 代码遵守所有层边界。
5. 结构化日志覆盖所有服务操作。
6. 相关文档（`ARCHITECTURE.md` / `PRODUCT.md` / `RELIABILITY.md`）已更新。
7. `clean-state-checklist.md` 全部通过。

## 会话交接

恢复工作时，阅读 `session-handoff.md` 了解上次会话的上下文。结束会话时，更新以下内容：

- 完成了什么
- 还剩下什么
- 任何阻塞项或决策
- 修改了哪些文件
- 失败的尝试（**最有价值的部分**）

## 清理状态

在每个主要测试周期之前：

1. 运行 `bash scripts/cleanup-scanner.sh` 检查过期工件。
2. 使用重置功能清除所有数据。
3. 验证 `clean-state-checklist.md` 通过。
4. 运行 `bash scripts/benchmark.sh` 测量性能。

## 功能工作流（一次只做一个功能）

1. 从 `feature_list.json` 中挑选一个未完成的功能。
2. 验证所有依赖项已满足（状态为 "pass"）。
3. 只实现该功能——不要修改不相关的代码。
4. 每个子任务后运行验证。
5. 更新 `progress.md` 记录当前状态。
6. **仅当所有验证通过时**才将状态设为 "pass"。
7. 提交并撰写有描述性的提交信息。
8. 更新 `session-handoff.md`。
