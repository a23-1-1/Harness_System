-- ═══════════════════════════════════════════════════════════════
-- init-db.sql — PostgreSQL 初始化脚本
-- ═══════════════════════════════════════════════════════════════
-- 由 docker compose 首次启动时自动执行
-- 扩展：pgvector（课纲 RAG 向量搜索）
-- 表：conversations / messages / demos / teacher_profiles / student_progress
-- ═══════════════════════════════════════════════════════════════

-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── 对话表 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'draft', 'finalized', 'archived')),
    demo_type TEXT CHECK (demo_type IN ('p0', 'p1', 'p2')),
    tags TEXT[] DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    snapshot_count INTEGER DEFAULT 0,
    summary TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_teacher ON conversations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ─── 消息表 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conv_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'agent')),
    type TEXT NOT NULL CHECK (type IN ('text', 'sql', 'image', 'demo_snapshot', 'tool_call', 'quiz', 'knowledge')),
    content JSONB NOT NULL DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conv_id, created_at);

-- ─── 演示表 ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS demos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conv_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    snapshot_order INTEGER DEFAULT 1,
    title JSONB DEFAULT '{}',
    demo_type TEXT DEFAULT 'text'
        CHECK (demo_type IN ('text', 'mermaid', 'echarts', 'sql-simulator', 'bplus-tree', 'transaction')),
    content JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_demos_conv ON demos(conv_id, snapshot_order);

-- ─── 教师 Profile 表 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teacher_profiles (
    teacher_id TEXT PRIMARY KEY,
    style JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    embedding vector(1536),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 学生进度表 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL,
    conv_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    quiz_results JSONB DEFAULT '[]',
    mastery JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_progress_conv ON student_progress(conv_id);
