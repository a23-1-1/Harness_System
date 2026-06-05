#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=== Harness Initialization ==="
echo "Project: AI 协作式数据库课程演示工作台"
echo ""

# 虚拟环境
if [ ! -d "venv" ]; then
    echo "[setup] Creating Python virtual environment..."
    python -m venv venv
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate

echo "[setup] Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt 2>/dev/null || echo "[warn] No requirements.txt yet"

echo ""
echo "=== Verification ==="
# 检查关键包
python -c "import streamlit; print(f'streamlit {streamlit.__version__} ✓')" 2>/dev/null || echo "[warn] streamlit not installed"
python -c "import anthropic; print(f'anthropic SDK ✓')" 2>/dev/null || echo "[warn] anthropic SDK not installed"
python -c "import pytest; print(f'pytest ✓')" 2>/dev/null || echo "[warn] pytest not installed"

echo ""
echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Read feature_list.json to see current feature state"
echo "2. Pick ONE unfinished feature to work on"
echo "3. Run: streamlit run app.py"
echo "4. Run: pytest .  (if tests exist)"
echo "5. Re-run ./init.sh before claiming done"
