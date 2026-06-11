# 用户历史与教师账号

## 概述

DB Demo Studio 以 `teacher_id` 区分教师用户。`teacher_profiles` 表即用户表，无需单独的 `teachers` 表。前端通过 `localStorage` 记住当前教师 ID，切换后对话列表与 WebSocket 会话均按该 ID 隔离。

## 数据模型

| 表 | 关键字段 | 说明 |
|---|---|---|
| `teacher_profiles` | `teacher_id`, `display_name`, `email`, `avatar_url`, `role`, `style` | 教师资料与风格配置；`role` 默认 `teacher` |
| `conversations` | `teacher_id`, `updated_at`, `last_message_at` | 按教师隔离的对话历史；`last_message_at` 用于时间分组 |

`last_message_at` 在每次用户/助手发消息时由 Orchestrator 更新；历史数据可通过迁移脚本用 `updated_at` 回填。

## API

- `GET /api/v5/teacher/profile?teacher_id=` — 获取资料（首次访问自动创建，含 `role`）
- `PATCH /api/v5/teacher/profile?teacher_id=` — 更新 `display_name`、`style`、`preferences` 等
- `GET /api/v5/conversations?teacher_id=` — 按教师过滤对话列表（响应含 `last_message_at`）

## 前端行为

### localStorage

- 键名：`dbdemo_teacher_id`
- 默认值：`default`
- 切换教师时在 `UserAccountBar` 中写入，并由 `App` 同步到 `useConversations` / `useWebSocket`

### 左下角账户栏（UserAccountBar）

- 展示显示名称、连接状态
- 可编辑显示名称与教学风格备注
- **切换教师 ID**：输入新 ID 后点「切换」，会清空当前选中对话与右侧预览，并加载该教师的对话历史

### 对话列表分组

- 筛选为 **全部** 时：按 **今天 / 昨天 / 更早** 分组，依据 `last_message_at`（无则 `updated_at`）
- 筛选为具体状态时：平铺列表，卡片右上角显示相对时间（如「2小时前」）

## 迁移

已有数据库执行：

```bash
psql -f backend/migrations/001_user_history.sql
```

新安装由 `docker/backend/init-db.sql` 自动包含上述字段。
