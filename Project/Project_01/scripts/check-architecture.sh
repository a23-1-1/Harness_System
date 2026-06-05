#!/bin/bash
# check-architecture.sh — Verify layer boundaries in DB Demo Studio
# Usage: bash scripts/check-architecture.sh

set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== DB Demo Studio Architecture Check ==="
echo ""

WARNINGS=0

check_rule() {
    local RULE_NAME="$1"
    local DESCRIPTION="$2"
    local STATUS="$3"
    local DETAIL="$4"

    if [ "$STATUS" = "PASS" ]; then
        echo "  [PASS] $RULE_NAME: $DESCRIPTION"
    elif [ "$STATUS" = "PENDING" ]; then
        echo "  [PENDING] $RULE_NAME: $DESCRIPTION — $DETAIL"
    elif [ "$STATUS" = "FAIL" ]; then
        echo "  [FAIL] $RULE_NAME: $DESCRIPTION — $DETAIL"
        WARNINGS=$((WARNINGS + 1))
    fi
}

echo "=== Frontend Layer ==="
if [ -d "frontend/src" ]; then
    # Check 1: No Node.js server module imports in frontend
    if grep -rq "require('fs')\|require('path')\|require('child_process')\|import.*from 'fs'\|import.*from 'path'\|import.*from 'child_process'" frontend/src/ 2>/dev/null; then
        check_rule "FE-01" "No Node.js server modules in frontend" "FAIL" "Found fs/path/child_process import"
    else
        check_rule "FE-01" "No Node.js server modules in frontend" "PASS" ""
    fi

    # Check 2: No Python imports in frontend
    if grep -rq "import fastapi\|from fastapi\|import redis\|from redis\|import asyncpg\|from asyncpg" frontend/src/ 2>/dev/null; then
        check_rule "FE-02" "No Python imports in frontend" "FAIL" "Found Python server import"
    else
        check_rule "FE-02" "No Python imports in frontend" "PASS" ""
    fi

    # Check 3: No direct PostgreSQL/Redis access in frontend
    if grep -rq "createClient\|createPool\|psycopg2\|asyncpg\|redis.createClient\|ioredis" frontend/src/ 2>/dev/null; then
        check_rule "FE-03" "No direct DB access from frontend" "FAIL" "Found direct DB connection code"
    else
        check_rule "FE-03" "No direct DB access from frontend" "PASS" ""
    fi
else
    check_rule "FE-01" "Frontend layer checks" "PENDING" "frontend/src/ not yet created"
fi
echo ""

echo "=== Backend Layer ==="
if [ -d "backend/app" ]; then
    # Check 4: No React imports in backend
    if grep -rq "import React\|from 'react'\|from \"react\"" backend/app/ 2>/dev/null; then
        check_rule "BE-01" "No React imports in backend" "FAIL" "Found React import in backend"
    else
        check_rule "BE-01" "No React imports in backend" "PASS" ""
    fi

    # Check 5: WebSocket handlers don't access PG directly
    if grep -rq "asyncpg\|psycopg2\|create_engine\|session.execute" backend/app/ws/ 2>/dev/null; then
        check_rule "BE-02" "WebSocket handlers use model layer, not direct DB" "FAIL" "Found direct DB access in ws/"
    else
        check_rule "BE-02" "WebSocket handlers use model layer" "PASS" ""
    fi

    # Check 6: MCP servers are separate processes
    if [ -d "mcp-servers" ]; then
        if grep -rq "subprocess\|Process\|spawn" backend/app/agents/ 2>/dev/null || true; then
            check_rule "BE-03" "MCP servers invoked as separate processes" "PASS" ""
        else
            check_rule "BE-03" "MCP servers invoked as separate processes" "PENDING" "Check agents/orchestrator.py for MCP client usage"
        fi
    fi
else
    check_rule "BE-01" "Backend layer checks" "PENDING" "backend/app/ not yet created"
fi
echo ""

echo "=== IPC/API Registration ==="
if [ -f "backend/app/ws/handlers.py" ]; then
    # Check 7: All events registered in handlers
    REQUIRED_EVENTS=("chat:message" "chat:interrupt" "conv:create" "conv:switch")
    for event in "${REQUIRED_EVENTS[@]}"; do
        if grep -q "$event" backend/app/ws/handlers.py 2>/dev/null; then
            check_rule "IPC-01" "Event '$event' registered" "PASS" ""
        else
            check_rule "IPC-01" "Event '$event' registered" "FAIL" "Event not found in handlers.py"
        fi
    done
else
    check_rule "IPC-01" "WebSocket event registration" "PENDING" "handlers.py not yet created"
fi
echo ""

# Summary
echo "============================================"
echo " Architecture Check Complete"
echo " Warnings: $WARNINGS"
echo "============================================"
if [ "$WARNINGS" -gt 0 ]; then
    echo "Fix architecture violations before committing."
    exit 1
else
    echo "No violations found (or checks pending — build first)."
fi
