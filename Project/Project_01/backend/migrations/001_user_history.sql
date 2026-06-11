-- 001_user_history.sql — 用户历史与教师 Profile 扩展
-- teacher_profiles 即用户表，无需单独 teachers 表

-- 教师 Profile 扩展字段
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT '';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'teacher';
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE teacher_profiles ADD COLUMN IF NOT EXISTS teaching_subjects JSONB DEFAULT '[]';

-- 对话最后消息时间（用于历史分组）
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;

-- 回填：用 updated_at 填充缺失的 last_message_at
UPDATE conversations
SET last_message_at = updated_at
WHERE last_message_at IS NULL AND updated_at IS NOT NULL;
