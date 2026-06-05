#!/bin/bash
# init.sh -- Verify the project builds cleanly before starting work.
# Run this after cloning or when resuming work.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "============================================"
echo " DB Demo Studio — Environment Initialization"
echo "============================================"
echo ""

# ── 1. Verify harness files ──
echo "[1/6] Verifying harness files..."
FILES_OK=true
for file in AGENTS.md CLAUDE.md feature_list.json progress.md session-handoff.md clean-state-checklist.md evaluator-rubric.md quality-document.md; do
  if [ ! -f "$file" ]; then
    echo "  MISSING: $file"
    FILES_OK=false
  else
    echo "  OK: $file"
  fi
done

for doc in docs/requirements-spec.md docs/ARCHITECTURE.md docs/PRODUCT.md docs/RELIABILITY.md docs/harness-development-guide.md docs/harness-v2-plan.md; do
  if [ -f "$doc" ]; then
    echo "  OK: $doc"
  fi
done
echo ""

# ── 2. Backend environment ──
echo "[2/6] Setting up backend environment..."
if [ -d "backend" ]; then
    if [ ! -d "backend/venv" ]; then
        python -m venv backend/venv
    fi
    source backend/venv/bin/activate 2>/dev/null || source backend/venv/Scripts/activate
    if [ -f backend/requirements.txt ]; then
        pip install --upgrade pip -q
        pip install -r backend/requirements.txt -q
        echo "  Backend dependencies installed"
    else
        echo "  No backend/requirements.txt yet — skipping"
    fi
else
    echo "  No backend/ directory yet — skipping"
fi
echo ""

# ── 3. Frontend environment ──
echo "[3/6] Setting up frontend environment..."
if [ -f frontend/package.json ]; then
    cd frontend
    if command -v pnpm &> /dev/null; then
        pnpm install --silent
    elif command -v npm &> /dev/null; then
        npm install --silent
    fi
    echo "  Frontend dependencies installed"
    cd "$PROJECT_DIR"
else
    echo "  No frontend/package.json yet — skipping"
fi
echo ""

# ── 4. Docker databases ──
echo "[4/6] Checking Docker databases..."
if [ -f docker/docker-compose.yml ]; then
    if command -v docker &> /dev/null; then
        docker compose -f docker/docker-compose.yml ps 2>/dev/null || \
            echo "  Containers not running — start with: docker compose -f docker/docker-compose.yml up -d"
    else
        echo "  Docker not available — skipping"
    fi
else
    echo "  No docker/docker-compose.yml yet — skipping"
fi
echo ""

# ── 5. Verify key dependencies ──
echo "[5/6] Verifying key dependencies..."
python -c "import fastapi; print('  fastapi: OK')" 2>/dev/null || echo "  fastapi: NOT INSTALLED"
python -c "import redis; print('  redis: OK')" 2>/dev/null || echo "  redis: NOT INSTALLED"
python -c "import anthropic; print('  anthropic: OK')" 2>/dev/null || echo "  anthropic: NOT INSTALLED"
python -c "import pytest; print('  pytest: OK')" 2>/dev/null || echo "  pytest: NOT INSTALLED"
command -v node &> /dev/null && echo "  node $(node -v): OK" || echo "  node: NOT FOUND"
command -v docker &> /dev/null && echo "  docker: OK" || echo "  docker: NOT FOUND"
echo ""

# ── 6. Summary ──
echo "[6/6] Summary..."
echo ""

if [ "$FILES_OK" = true ]; then
    echo "============================================"
    echo " Init complete. All harness files present."
    echo "============================================"
    echo ""
    echo "Quick start:"
    echo "  Backend:  cd backend && uvicorn app.main:app --reload --port 8000"
    echo "  Frontend: cd frontend && pnpm dev"
    echo "  DB:       docker compose -f docker/docker-compose.yml up -d"
    echo ""
    echo "Next: read feature_list.json, pick ONE feature, implement it, re-run ./init.sh"
else
    echo "============================================"
    echo " Init complete with WARNINGS."
    echo " Some harness files are missing."
    echo "============================================"
    exit 1
fi
