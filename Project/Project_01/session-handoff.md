# Session Handoff — AI 协作式数据库课程演示工作台

## Current Objective

- Goal: 维护与验证阶段（feat-001 ~ feat-010 已全部完成）
- Current status: 功能完整，待定期跑 clean-state-checklist + benchmark
- Branch: `master`（Plan A 单分支，工作目录 `Project/Project_01/`）

## Completed This Session

- [x] feat-001 ~ feat-010 全部实现（见 `feature_list.json` + `progress.md`）
- [x] Harness 文件体系落地（AGENTS.md、docs 三件套、scripts、质量文档）
- [x] Git Plan A：合并 `feat-003-p0-demo` → `master`，删除过时本地分支

## Verification Evidence

| Check | Command | Result | Notes |
|---|---|---|---|
| 健康检查 | `curl http://localhost:8000/api/v5/health` | 按需验证 | 应返回当前 `backend/app/main.py` |
| 环境初始化 | `bash init.sh` | 按需验证 | 6 步 Harness + 依赖检查 |
| 架构边界 | `bash scripts/check-architecture.sh` | 按需验证 | 前端禁 Node 模块等 |

## Files Changed

- 主代码：`backend/app/`（FastAPI）、`frontend/src/`（React 19）
- 唯一后端入口：`backend/app/main.py`（`uvicorn app.main:app`）

## Decisions Made

- **技术栈**：React 19 + Vite 8 前端，FastAPI + WebSocket 后端（非 Streamlit，无 `app.py`）
- **LLM**：DeepSeek / SiliconFlow（见 `backend/app/llm/gateway.py`）
- **单后端**：仅一个应用 API（`:8000`）；MySQL/PG explain 容器是演示引擎，不是第二套业务后台
- **Git Plan A**（2026-06-12）：仅 `master` 分支；`feat-003` 内容已合并，可删远程 `origin/feat-003-p0-demo`

## Next Session Startup

1. 确认在 `Project/Project_01/` 目录
2. Read `AGENTS.md` → `CLAUDE.md` → `progress.md`
3. Run `bash init.sh`
4. **二选一启动后端**（勿同时占用 8000）：
   - **本地开发**：`docker compose up -d postgres redis` + `cd backend && uvicorn app.main:app --reload --port 8000`
   - **全 Docker**：`docker compose up -d --build`（不要同时再起本地 uvicorn）
5. 前端：`cd frontend && pnpm dev` → http://localhost:5173

## Recommended Next Step

1. 执行 `clean-state-checklist.md` + `scripts/benchmark.sh` 并记录结果
2. 加强 pytest / vitest 自动化测试
3. 可选：删除远程 `origin/feat-003-p0-demo`

## 失败尝试（勿重蹈）

- 本地 `uvicorn :8000` 与 `docker compose` 的 `backend:8000` 同时运行 → 前端连到错误实例，改代码不生效
- 在错误目录或旧分支启动 → 本仓库仅 `Project/Project_01/` + `master` 为当前真相源
