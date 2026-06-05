# 清理状态检查清单 — DB Demo Studio

在每次提交前和每个会话结束时运行此检查清单。

## 构建

- [ ] `cd backend && python -m py_compile app/main.py` — Python 语法正确
- [ ] `cd frontend && npx tsc --noEmit` — TypeScript 编译无错误
- [ ] `cd frontend && pnpm build` — 前端构建成功
- [ ] `cd backend && pytest -x -q` — 后端测试通过

## 架构

- [ ] 前端代码中无 `fs` 或 `path` 导入（`frontend/src/`）
- [ ] 后端代码中无 React 导入（`backend/app/`）
- [ ] 所有 WebSocket 事件名称定义在同一共享位置
- [ ] 所有 REST 端点遵循 `/api/v5/{资源}` 模式
- [ ] WebSocket 处理器不直接访问 PG/Redis（使用 models 层）
- [ ] 所有 MCP 服务器调用通过 `mcp/client.py`

## 运行时

- [ ] 后端启动无错误（`uvicorn app.main:app`）
- [ ] 前端启动无错误（`pnpm dev`）
- [ ] WebSocket 连接建立成功
- [ ] 对话 CRUD 正常（创建/切换/删除/列表）
- [ ] 消息收发端到端正常
- [ ] Agent 执行轨迹显示在聊天中（agent:thinking）
- [ ] Redis 连接活跃（`redis-cli PING`）
- [ ] PostgreSQL 连接活跃（`pg_isready`）
- [ ] Docker MySQL+PG 容器在运行（`docker compose ps`）

## 日志

- [ ] 所有日志条目为有效 JSON（可解析）
- [ ] 日志条目包含时间戳、级别、服务、消息
- [ ] WebSocket 连接/断开发出 INFO 级别日志
- [ ] 消息操作发出 INFO 级别日志，包含 convId + messageType
- [ ] LLM 网关发出 INFO 级别日志，包含 provider + 是否缓存命中
- [ ] 错误发出 ERROR 级别日志，包含异常详情

## 数据完整性

- [ ] 消息在重启后端后仍持久化（在 PG 中验证）
- [ ] 对话元数据在 CRUD 操作后准确
- [ ] 演示快照版本号正确递增
- [ ] 清理状态重置清除所有数据（PG + Redis）
- [ ] 删除对话后无孤立 Redis 键
- [ ] 教师 Profile 跨会话持久化

## 性能

- [ ] `bash scripts/benchmark.sh` 运行无错误
- [ ] 对话切换延迟 < 200ms
- [ ] 最近消息（50 条）加载 < 100ms
- [ ] Docker 数据库在 1s 内响应
- [ ] 前端打包体积 < 400KB（`pnpm build` 输出）

## 仓库

- [ ] `git status` 中无意外文件
- [ ] 无敏感数据（.env、凭证、API 密钥）已暂存
- [ ] 无 `dist/` 或 `node_modules/` 被提交
- [ ] `progress.md` 已更新当前状态
- [ ] `feature_list.json` 反映实际功能状态
- [ ] 如果会话即将结束，`session-handoff.md` 已更新
- [ ] 所有 Harness 文件存在（15 个文件：AGENTS.md、CLAUDE.md、feature_list.json、init.sh、progress.md、session-handoff.md、clean-state-checklist.md、evaluator-rubric.md、quality-document.md、docs/ARCHITECTURE.md、docs/PRODUCT.md、docs/RELIABILITY.md、scripts/benchmark.sh、scripts/cleanup-scanner.sh、scripts/check-architecture.sh）

## 脚本

- [ ] `bash scripts/check-architecture.sh` — 无层边界违规
- [ ] `bash scripts/cleanup-scanner.sh` — 无过期工件
- [ ] `bash scripts/benchmark.sh` — 所有任务完成
- [ ] `bash init.sh` — 所有验证步骤通过
