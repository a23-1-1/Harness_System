# Clean State Checklist — DB Demo Studio

Run this checklist before committing and at the end of each session.

## Build

- [ ] `cd backend && python -m py_compile app/main.py` — Python syntax OK
- [ ] `cd frontend && npx tsc --noEmit` — TypeScript compiles with no errors
- [ ] `cd frontend && pnpm build` — Frontend builds successfully
- [ ] `cd backend && pytest -x -q` — Backend tests pass

## Architecture

- [ ] No `fs` or `path` imports in frontend code (`frontend/src/`)
- [ ] No React imports in backend code (`backend/app/`)
- [ ] All WebSocket event names defined in one shared location
- [ ] All REST endpoints follow `/api/v5/{resource}` pattern
- [ ] No direct PG/Redis access from WebSocket handlers (use models layer)
- [ ] All MCP server invocations go through `mcp/client.py`

## Runtime

- [ ] Backend starts without errors (`uvicorn app.main:app`)
- [ ] Frontend starts without errors (`pnpm dev`)
- [ ] WebSocket connection establishes successfully
- [ ] Conversation CRUD works (create/switch/delete/list)
- [ ] Message send/receive works end-to-end
- [ ] Agent execution traces appear in chat (agent:thinking)
- [ ] Redis connections active (`redis-cli PING`)
- [ ] PostgreSQL connections active (`pg_isready`)
- [ ] Docker MySQL+PG containers running (`docker compose ps`)

## Logging

- [ ] All log entries are valid JSON (parseable)
- [ ] Log entries include timestamp, level, service, and message
- [ ] WebSocket connect/disconnect emit INFO log
- [ ] Message operations emit INFO log with convId + messageType
- [ ] LLM Gateway emits INFO log with provider + cached boolean
- [ ] Errors emit ERROR log with exception details

## Data Integrity

- [ ] Messages persist across backend restart (verify in PG)
- [ ] Conversation metadata accurate after CRUD operations
- [ ] Demo snapshots increment version correctly
- [ ] Clean state reset removes all data (PG + Redis)
- [ ] No orphaned Redis keys after conversation deletion
- [ ] Teacher profile persists across sessions

## Performance

- [ ] `bash scripts/benchmark.sh` runs without errors
- [ ] Conversation switch latency < 200ms
- [ ] Recent messages (50) load < 100ms
- [ ] Docker databases respond within 1s
- [ ] Frontend bundle size < 400KB (`pnpm build` output)

## Repository

- [ ] No unintended files in `git status`
- [ ] No sensitive data (.env, credentials, API keys) staged
- [ ] No `dist/` or `node_modules/` committed
- [ ] `progress.md` updated with current state
- [ ] `feature_list.json` reflects actual feature status
- [ ] `session-handoff.md` updated if session is ending
- [ ] All harness files present (15 files: AGENTS.md, CLAUDE.md, feature_list.json, init.sh, progress.md, session-handoff.md, clean-state-checklist.md, evaluator-rubric.md, quality-document.md, docs/ARCHITECTURE.md, docs/PRODUCT.md, docs/RELIABILITY.md, scripts/benchmark.sh, scripts/cleanup-scanner.sh, scripts/check-architecture.sh)

## Scripts

- [ ] `bash scripts/check-architecture.sh` — no boundary violations
- [ ] `bash scripts/cleanup-scanner.sh` — no stale artifacts
- [ ] `bash scripts/benchmark.sh` — all tasks complete
- [ ] `bash init.sh` — all verification steps pass
