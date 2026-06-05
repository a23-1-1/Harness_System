# AGENTS.md — DB Demo Studio (AI 协作式数据库课程演示工作台)

## Startup Rules

Before writing any code, complete these steps in order:

1. **Read this file completely.** It defines the boundaries and conventions for this project.
2. **Read `CLAUDE.md`** for the quick reference if using Claude Code.
3. **Read `docs/ARCHITECTURE.md`** to understand the full system structure and data flow.
4. **Read `docs/PRODUCT.md`** to understand the complete feature requirements.
5. **Read `docs/RELIABILITY.md`** to understand logging, observability, clean state, and benchmarking requirements.
6. **Run `bash init.sh`** to verify the project builds and initializes cleanly.
7. **Read `feature_list.json`** to see the current state of all features.

## Project Context

DB Demo Studio is an AI-collaborative database course demo workbench. Teachers use natural language conversation with AI to collaboratively create, optimize, and deliver course knowledge point demonstrations.

**Demo Capability Levels:**
- **P0 Instant Demo**: 6-stage step-by-step explanation (lex → parse → optimize → plan → execute → result)
- **P1 Lightweight Visualization**: Mermaid / ASCII / ECharts diagrams, conversation-driven style adjustment
- **P2 Professional Simulator**: SQL step execution / B+ tree / transaction isolation / lock contention

**Core Philosophy**: Everything is conversation. Every feature is an extension of AI dialogue, not a standalone tool.

## Docs Hierarchy

The `docs/` directory is organized for agent readability:

```
docs/
  ARCHITECTURE.md    — Full system layers, data flow, storage layout
  PRODUCT.md         — Feature requirements and user-facing behavior
  RELIABILITY.md     — Logging, observability, clean state, benchmarking
```

When adding new features, update the relevant doc before writing code.

## Layer Boundaries

### Frontend (`frontend/`)
- React 19 + Vite 8 + TailwindCSS v4
- Communicates exclusively through WebSocket + REST
- NEVER imports Node.js modules (fs, path, child_process)
- NEVER accesses Redis or PostgreSQL directly

### Backend (`backend/`)
- FastAPI + Uvicorn
- WebSocket Manager (`backend/app/ws/`)
- REST API routes (`backend/app/routes/`)
- AI Agent Runtime (`backend/app/agents/`)
- LLM Gateway (`backend/app/llm/`)

### MCP Servers (`mcp-servers/`)
- Independent processes, communicate via stdin/stdout JSON-RPC
- Hot-swappable, language-agnostic
- Each server has a single responsibility

### Infrastructure
- Redis 7+: Session state, message cache, Pub/Sub broadcast, LLM cache, rate limiting
- PostgreSQL 16: Full persistence, pgvector for curriculum RAG
- Docker: MySQL 8.0 :3308 + PostgreSQL 16 :5433 for EXPLAIN engines

## Conventions

- Python: type hints on all function signatures. No `Any` without a comment.
- TypeScript: strict mode. No `any` without a comment explaining why.
- Named exports only in both languages.
- All WebSocket events defined in one place.
- New REST endpoints follow the pattern: `/api/v5/{resource}/{action}`.
- All service methods must log at INFO level for significant events.
- DEBUG level for routine data access.
- WARN for missing but non-critical data.
- ERROR for failures.
- Redis for hot data (session/cache/broadcast), PG for cold data (persistence/search/RAG).

## Definition of Done

A feature is "done" when:

1. Code compiles without errors (TypeScript `tsc` + Python `mypy`).
2. The app launches and WebSocket connects successfully.
3. The feature appears in `feature_list.json` with status `"pass"` and evidence.
4. The code respects all layer boundaries.
5. Structured logging covers all service operations.
6. Relevant docs (`ARCHITECTURE.md` / `PRODUCT.md` / `RELIABILITY.md`) are updated.
7. `clean-state-checklist.md` passes all checks.

## Session Handoff

When resuming work, read `session-handoff.md` for context from the previous session. When finishing a session, update it with:

- What was accomplished
- What remains
- Any blockers or decisions made
- Files that were modified
- Failed approaches (the most valuable section)

## Clean State

Before each major testing cycle:

1. Run `bash scripts/cleanup-scanner.sh` to check for stale artifacts.
2. Use the Reset function to clear all data.
3. Verify `clean-state-checklist.md` passes.
4. Run `bash scripts/benchmark.sh` to measure performance.

## Feature Workflow (One Feature at a Time)

1. Pick exactly ONE unfinished feature from `feature_list.json`.
2. Verify all dependencies are met (status = "pass").
3. Implement only that feature — do not modify unrelated code.
4. Run verification after each sub-task.
5. Update `progress.md` with current state.
6. Set status to "pass" ONLY when all verification passes.
7. Commit with descriptive message.
8. Update `session-handoff.md`.
