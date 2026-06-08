# Session Progress Log — DB Demo Studio

> AI 协作式数据库课程演示工作台
> 基于 requirements-spec.md v5

## Current State

**Last Updated:** 2026-06-05
**Session ID:** 001
**Active Feature:** feat-001 — 项目脚手架 & 对话基础设施

## Status

### What's Done

- [x] Git 仓库初始化，采用单 `master` 主分支，模块通过目录区分
- [x] Agent harness 创建 & 定制化（基于 requirements-spec.md v5 优化）
- [x] 明确完整技术栈（React 19 + FastAPI + WebSocket + Redis + PG + Docker）

### What's In Progress

- [ ] feat-001 项目脚手架 & 对话基础设施
  - Details: FastAPI + WebSocket + React 三栏布局 + Redis + PG
  - Blockers: 无

### What's Next

1. 创建项目目录结构（frontend/, backend/, docker/, mcp-servers/）
2. 创建 backend FastAPI 骨架 + WebSocket Manager
3. 创建 frontend React 三栏布局（ConversationPanel + ChatPanel + DemoPreview）
4. Docker Compose 配置 MySQL 8.0 + PostgreSQL 16
5. 多对话 CRUD 接口 + 消息持久化

## Blockers / Risks

- [ ] 需确认 Anthropic API Key 配置方式（环境变量 /.env）
- [ ] 需确认 Docker 是否已安装

## Decisions Made

- **前端**: React 19 + Vite 8 + TailwindCSS v4（非 Streamlit）
- **后端**: FastAPI + Uvicorn（非 Flask）
- **实时通信**: WebSocket 优先，REST 仅用于 CRUD
- **缓存策略**: Redis 做热（会话/缓存/广播），PG 做冷（持久化/搜索/RAG）
- **演示等级**: P0 分步讲解 → P1 Mermaid 图 → P2 模拟器 → 逐级演进
- **对话范式**: 一切皆对话，不设独立 UI 控件

## Files Modified This Session

- `CLAUDE.md` — 全面重写为 React + FastAPI + WebSocket 技术栈
- `feature_list.json` — 10 个功能模块（对应 spec v5 的 F0-F5 分类）
- `init.sh` — 前后端双环境 + Docker 检测
- `progress.md` — 本文件
- `session-handoff.md` — 更新

## Notes for Next Session

开始 feat-001：创建项目骨架 → FastAPI 基础 → React 三栏布局 → Redis + PG 连接
