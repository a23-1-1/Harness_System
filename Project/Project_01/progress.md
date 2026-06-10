# Session Progress Log — DB Demo Studio

> AI 协作式数据库课程演示工作台
> 基于 requirements-spec.md v5

## Current State

**Last Updated:** 2026-06-09
**Session ID:** 006
**Active Feature:** feat-006 — 对话式测验 & 教学闭环

## Status

### What's Done

#### feat-001 ~ feat-005 / feat-007 ✅（全部完成）
- 见 progress.md 历史记录及此前会话

#### feat-009 课纲 RAG & 教师风格学习 ✅（已全部完成）

- [x] **TeacherProfile 模型** (`backend/app/models/teacher.py` — 新建)
  - PG 表（teacher_id PK，style/preferences/teaching_subjects JSON 字段）
  - Redis 缓存（1h TTL），被 init_db 自动发现

- [x] **教师 Profile REST API** (`backend/app/routes/teacher.py` — 新建)
  - `GET /api/v5/teacher/profile?teacher_id=default` — 读取风格配置（Redis → PG → 默认值三级回退）
  - `POST /api/v5/teacher/profile` — 保存风格配置，清除缓存
  - API 前缀与 CLAUDE.md 文档一致

- [x] **教师风格自动学习** (`backend/app/agents/orchestrator.py`)
  - `_load_teacher_profile()` — 每次 `process_message` 自动加载 Profile
  - `_infer_style_from_edit()` — 从 `step:regenerate` 操作推断偏好（篇幅/正式度/举例倾向）
  - `_update_style_from_edit()` — 异步更新 Profile 到 PG + 刷新 Redis 缓存（不阻塞 AI 生成）
  - LLM Gateway `generate_demo` 传入 `teacher_profile` 参数，影响生成风格

- [x] **课纲 RAG & 知识点搜索 API** (`backend/app/routes/curriculum.py` — 新建)
  - `GET /api/v5/curriculum/search?q=&category=` — 知识点搜索
  - 内置种子知识库（15 个知识点：SQL 基础/索引/查询优化/事务）
  - 关键词匹配（title/content/keywords 模糊搜索）
  - Redis 缓存（5 分钟 TTL）
  - pgvector 扩展检测 + 预留向量搜索接口（`PG_VECTOR_ENABLED=true` 时启用）

- [x] **对话搜索 + 版本快照 API** (`backend/app/routes/conversations.py`)
  - `GET /conversations?q=&page=&limit=` — 关键词搜索（title/summary/id） + 分页 + 总数
  - `GET /conversations/{id}/snapshots` — 演示版本快照列表
  - `GET /conversations/{id}/messages?page=&limit=` — 消息历史分页

- [x] **演示对比 & 复用 API** (`backend/app/routes/demos.py` — 新建)
  - `GET /demos/{id}` — 单个 DemoPackage 详情
  - `POST /demos/{convId}/compare` — 两版本快照逐步骤对比（内容 diff 分析）
  - `POST /demos/{convId}/copy` — 基于已有演示创建新对话（复用改编）

- [x] **多格式导出增强** (`backend/app/agents/orchestrator.py`)
  - 新增 mermaid 格式导出（提取各步骤 Mermaid 代码，打包为 Markdown）
  - 新增 LTI 格式导出（LMS 嵌入 HTML，Canvas/Moodle 兼容）
  - 保留原有 HTML 交互页导出

- [x] **前端搜索 & 复用集成**
  - `useConversations` — 新增 `search(q)` / `copy(id)` 方法
  - `ConversationPanel` — 搜索输入即时调用后端 API；卡片新增"基于此改编"按钮
  - `useWebSocket` — 支持 role/studentId 参数
  - `App.tsx` — handleSearch/handleCopy/handleExport 集成

- [x] **前端导出增强**
  - `DemoPreview` — onExport 支持 `format` 参数
  - `App.tsx` — demo:export 传递 format
  - 导出按钮点击 → demo:export WebSocket 事件 → 后端生成对应格式

- [x] **StudentProgress 模型** (`backend/app/models/student_progress.py`)
  - 学生掌握度追踪表（quiz_answers / mastery / total_questions / correct_answers）
  - 自动被 init_db 发现建表

- [x] **学生进度 REST API** (`backend/app/routes/students.py`)
  - `GET /api/v5/students/{studentId}/progress` — 单学生进度 + 掌握度
  - `GET /api/v5/students/report` — 全班报告 + 薄弱点分析 + 推荐

- [x] **quiz:generate AI 出题**（后端 orchestrator.py + manager.py 路由）
  - 教师端 `quiz:generate` → LLM 根据演示步骤生成选择题/判断题
  - 推送 `quiz:generated` 事件到客户端
  - 降级路径（LLM 失败时返回默认题目）

- [x] **quiz:answer 学生答题 + AI 判题**（后端 orchestrator.py + manager.py 路由）
  - 学生提交答案 → 自动判对错
  - 答对：简短肯定 + 解析
  - 答错：LLM 苏格拉底式引导讲解
  - 自动记录到 StudentProgress（掌握度更新）
  - 推送 `quiz:result` 事件

- [x] **前端 QuizCard 组件** (`frontend/src/components/ChatPanel/QuizCard.tsx`)
  - 单选/判断两种题型交互式答题卡片
  - 选项高亮实时反馈
  - 提交后显示正确/错误标识 + 讲解
  - `quiz:generated` / `quiz:result` 事件消息渲染

- [x] **代码审查修复**（本轮回合）
  - QuizCard.tsx — `results`/`explanations` state 提交后即时写入（不再依赖 `quiz:result` 事件）
  - QuizCard.tsx — `charAt(0)` → `getOptionLabel()` 正则匹配防空格/格式差异
  - orchestrator.py — `generate_quiz` 参数校验（count 范围 1-10、q_type 枚举）
  - orchestrator.py — 降级时加 `logger.warning` + 推送 `agent:thinking` 提示用户重试
  - orchestrator.py — `answer_quiz` 新增 `topic` 参数，StudentProgress.subject 优先用 topic
  - students.py — `get_class_report` mastery 聚合从 `max()` 改为平均值
  - students.py — `weakness_threshold` 查询参数（默认 0.6）
  - CLAUDE.md — WebSocket 事件表新增 `quiz:generate` / `quiz:generated`

## Files Modified / Created This Session

- `backend/app/models/student_progress.py` — **新建**
- `backend/app/routes/students.py` — **新建**（+ 后续修复 mastery 聚合/阈值参数）
- `backend/app/agents/orchestrator.py` — 新增 `generate_quiz()` / `answer_quiz()` + datetime import（+ 后续修复参数校验/降级日志/subject 语义）
- `backend/app/ws/manager.py` — 新增 `quiz:generate` / `quiz:answer` 路由
- `backend/app/main.py` — 注册 students router
- `frontend/src/components/ChatPanel/QuizCard.tsx` — **新建**（+ 后续修复提交即时反馈/getOptionLabel）
- `frontend/src/components/ChatPanel/index.tsx` — QuizCard 集成 + quiz:generated/quiz:result 渲染
- `frontend/src/App.tsx` — handleQuizAnswer + 传递 onQuizAnswer
- `CLAUDE.md` — 事件表 + `quiz:generate` / `quiz:generated`

## Notes for Next Session

1. 启动后端验证 `quiz:generate` / `quiz:answer` 端到端
2. 前端快速操作面板加「出题」快捷按钮
3. 掌握度可视化（薄弱知识点雷达图）
