#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "============================================"
echo " DB Demo Studio — Environment Initialization"
echo "============================================"
echo ""

# ── 后端环境 ──
echo "[backend] Setting up Python virtual environment..."
if [ ! -d "backend/venv" ]; then
    python -m venv backend/venv
fi
source backend/venv/bin/activate 2>/dev/null || source backend/venv/Scripts/activate

if [ -f backend/requirements.txt ]; then
    echo "[backend] Installing Python dependencies..."
    pip install --upgrade pip -q
    pip install -r backend/requirements.txt -q
else
    echo "[backend] No requirements.txt yet — skipping"
fi

# ── 前端环境 ──
if [ -f frontend/package.json ]; then
    echo "[frontend] Installing Node.js dependencies..."
    cd frontend
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "[frontend] WARNING: No pnpm or npm found"
    fi
    cd "$PROJECT_DIR"
else
    echo "[frontend] No frontend/package.json yet — skipping"
fi

# ── Docker 数据库 ──
if [ -f docker/docker-compose.yml ]; then
    echo "[docker] Checking Docker databases..."
    if command -v docker &> /dev/null; then
        docker compose -f docker/docker-compose.yml ps 2>/dev/null || \
            echo "[docker] Containers not running — start with: docker compose -f docker/docker-compose.yml up -d"
    else
        echo "[docker] Docker not available — skip"
    fi
fi

# ── 验证关键依赖 ──
echo ""
echo "=== Verification ==="

# Python 后端
python -c "import fastapi; print(f'[backend] fastapi ✓')" 2>/dev/null || echo "[backend] fastapi ✗"
python -c "import redis; print(f'[backend] redis ✓')" 2>/dev/null || echo "[backend] redis ✗"
python -c "import asyncpg; print(f'[backend] asyncpg ✓')" 2>/dev/null || echo "[backend] asyncpg ✗"
python -c "import anthropic; print(f'[backend] anthropic ✓')" 2>/dev/null || echo "[backend] anthropic ✗"
python -c "import pytest; print(f'[backend] pytest ✓')" 2>/dev/null || echo "[backend] pytest ✗"

# Node 前端
if command -v node &> /dev/null; then
    echo "[frontend] node $(node -v) ✓"
else
    echo "[frontend] node ✗"
fi

# Docker
if command -v docker &> /dev/null; then
    echo "[docker] docker $(docker -v) ✓"
else
    echo "[docker] docker ✗"
fi

echo ""
echo "============================================"
echo " Initialization Complete"
echo "============================================"
echo ""
echo "Quick start:"
echo "  Backend:  cd backend && uvicorn app.main:app --reload --port 8000"
echo "  Frontend: cd frontend && pnpm dev"
echo "  DB:       docker compose -f docker/docker-compose.yml up -d"
echo ""
echo "Next: read feature_list.json, pick ONE feature, implement it, re-run ./init.sh"
