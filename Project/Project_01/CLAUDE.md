# CLAUDE.md — DB Demo Studio

> Quick Reference for Claude Code. See `AGENTS.md` for full rules.

## Build & Run

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
pnpm install
pnpm dev                    # localhost:5173

# Docker databases
docker compose -f docker/docker-compose.yml up -d

# Full verification
bash init.sh
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app entry, CORS, lifecycle |
| `backend/app/ws/manager.py` | WebSocket connection pool + heartbeat |
| `backend/app/ws/handlers.py` | Message routing (chat:message → Agent) |
| `backend/app/agents/orchestrator.py` | Orchestrator Agent (intent → tool selection) |
| `backend/app/llm/gateway.py` | LLM Gateway (Claude + DeepSeek + caching) |
| `backend/app/models/conversation.py` | Conversation + Message PG models |
| `frontend/src/App.tsx` | Root React component (3-panel layout) |
| `frontend/src/hooks/useWebSocket.ts` | WebSocket connection/reconnect hook |
| `frontend/src/components/ChatPanel/` | Message flow + input + agent traces |
| `frontend/src/components/ConversationPanel/` | Conversation list + search |
| `frontend/src/components/DemoPreview/` | Demo preview (3-view linked) |
| `feature_list.json` | Feature tracking with pass/fail + evidence |

## Architecture Rules (MUST follow)

- Frontend NEVER imports Python or Node.js server modules.
- All real-time communication goes through WebSocket.
- REST only for CRUD operations.
- Redis for hot data (session/cache/broadcast), PG for cold data (persistence).
- MCP servers are independent processes — never embed them in FastAPI.
- Python: type hints on all functions. TypeScript: strict mode.
- Named exports only.

## API Reference

### WebSocket Events (Client → Server)

| Event | Purpose |
|-------|---------|
| `chat:message` | Send message (text/sql/image/knowledge) |
| `chat:interrupt` | Interrupt AI generation |
| `conv:create\|switch\|delete\|rename` | Conversation management |
| `step:regenerate` | Regenerate a single step |
| `quiz:answer` | Submit answer |
| `player:seek` | Jump to step |
| `demo:export` | Export demo |

### WebSocket Events (Server → Client)

| Event | Purpose |
|-------|---------|
| `agent:thinking` | Agent execution trace |
| `agent:tool_call` | Tool call status |
| `step:preview` | Step preview |
| `demo:updated\|complete` | Demo update/ready |
| `quiz:result` | Answer result |
| `conv:list\|loaded` | Conversation list/loaded |

### REST API

```
GET    /api/v5/conversations              → Conversation list
POST   /api/v5/conversations              → Create conversation
GET    /api/v5/conversations/:id          → Conversation detail
PATCH  /api/v5/conversations/:id          → Update conversation
DELETE /api/v5/conversations/:id          → Delete conversation
GET    /api/v5/conversations/:id/messages → Message history
POST   /api/v5/demos/:id/export           → Export demo
GET    /api/v5/teacher/profile            → Read style config
POST   /api/v5/teacher/profile            → Save style config
```

## How to Add a Feature

1. Define the data model in `backend/app/models/`.
2. Add REST route in `backend/app/routes/` or WebSocket handler in `backend/app/ws/handlers.py`.
3. Add agent logic in `backend/app/agents/` if AI-powered.
4. Build the UI in `frontend/src/components/`.
5. Add logging calls to the service method.
6. Run `bash scripts/check-architecture.sh` to verify layer boundaries.
7. Update `feature_list.json` with status "pass" + evidence.

## Testing

```bash
# Backend
cd backend && pytest -v

# Frontend
cd frontend && pnpm test

# Full quality gate
bash init.sh
bash scripts/cleanup-scanner.sh
bash scripts/benchmark.sh
```
