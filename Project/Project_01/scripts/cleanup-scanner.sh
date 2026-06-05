#!/bin/bash
# cleanup-scanner.sh — Detect stale artifacts in DB Demo Studio
# Usage: bash scripts/cleanup-scanner.sh

set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== DB Demo Studio Cleanup Scanner ==="
echo ""

WARNINGS=0

check_stale() {
    local CHECK_NAME="$1"
    local DESCRIPTION="$2"
    local TARGET="$3"

    echo "  [$CHECK_NAME] $DESCRIPTION"

    case "$CHECK_NAME" in
        "pg-orphans")
            echo "    Checking PostgreSQL for orphaned records..."
            echo "    Status: PENDING (PostgreSQL not yet connected — feat-001)"
            ;;
        "redis-stale")
            echo "    Checking Redis for stale session keys..."
            echo "    Status: PENDING (Redis not yet connected — feat-001)"
            ;;
        "file-orphans")
            echo "    Checking disk for orphaned import files..."
            echo "    Status: PENDING (Document service not yet built — feat-001)"
            ;;
        "snapshot-orphans")
            echo "    Checking for demo snapshots with missing conversations..."
            echo "    Status: PENDING (Demo system not yet built — feat-003)"
            ;;
        "feedback-orphans")
            echo "    Checking for feedback entries with missing conversations..."
            echo "    Status: PENDING (Feedback system not yet built — feat-006)"
            ;;
        "env-leaks")
            echo "    Checking for .env files in git staging..."
            if git ls-files --others --exclude-standard | grep -q ".env"; then
                echo "    WARNING: .env file detected in unstaged files!"
                WARNINGS=$((WARNINGS + 1))
            elif git diff --cached --name-only | grep -q ".env"; then
                echo "    WARNING: .env file detected in staged changes!"
                WARNINGS=$((WARNINGS + 1))
            else
                echo "    OK: No .env files found"
            fi
            ;;
        "node-modules")
            echo "    Checking for node_modules/ in git..."
            if git ls-files | grep -q "node_modules/"; then
                echo "    WARNING: node_modules/ files in git tracking!"
                WARNINGS=$((WARNINGS + 1))
            else
                echo "    OK: node_modules/ cleanly gitignored"
            fi
            ;;
        "dist-artifacts")
            echo "    Checking for dist/ or build/ in git..."
            if git ls-files | grep -qE "(dist/|build/)"; then
                echo "    WARNING: Build artifacts in git tracking!"
                WARNINGS=$((WARNINGS + 1))
            else
                echo "    OK: No build artifacts in git"
            fi
            ;;
        *)
            echo "    Unknown check: $CHECK_NAME"
            ;;
    esac
    echo ""
}

# Data integrity checks
echo "=== Data Integrity ==="
check_stale "pg-orphans" "Orphaned PG records" ""
check_stale "redis-stale" "Stale Redis session keys" ""
check_stale "file-orphans" "Orphaned import files on disk" ""
check_stale "snapshot-orphans" "Orphaned demo snapshots" ""
check_stale "feedback-orphans" "Orphaned feedback entries" ""
echo ""

# Security checks
echo "=== Security ==="
check_stale "env-leaks" ".env file detection" ""
echo ""

# Repository hygiene
echo "=== Repository Hygiene ==="
check_stale "node-modules" "node_modules/ in git" ""
check_stale "dist-artifacts" "Build artifacts in git" ""
echo ""

# Summary
echo "============================================"
echo " Cleanup Scan Complete"
echo " Warnings: $WARNINGS"
echo "============================================"
if [ "$WARNINGS" -gt 0 ]; then
    echo "Fix warnings before next session."
    exit 1
else
    echo "No issues found."
fi
