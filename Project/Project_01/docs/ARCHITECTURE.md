# DB Demo Studio — 架构文档

> 面向 AI Agent 的系统架构参考。Agent 在实现任何功能前应先读此文档理解系统结构。

---

## 系统总览

```
┌─ Frontend (React 19 + Vite 8 + TailwindCSS v4) ──────────────┐
│  localhost:5173                                                │
│  ┌─ ConversationPanel ───┐  ┌─ ChatPanel ────────────────┐   │
│  │ 对话列表               │  │ 消息流                      │   │
│  │ 搜索/筛选/状态标签     │  │ 多模态输入(text/sql/image)  │   │
│  │ 快捷操作(新建/删除)    │  │ Agent 执行轨迹展示          │   │
│  └───────────────────────┘  │ 快捷操作面板                │   │
│                              │ 演示快照版本指示器           │   │
│                              └────────────────────────────┘   │
│  ┌─ Demo Preview (三栏联动) ──────────────────────────────┐   │
│  │  FlowEditor | ExecutionPlayer | Animation Engine        │   │
│  │  (Mermaid / D3.js / ECharts / 执行计划树)               │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
         │ WebSocket (ws://) + REST
         ▼
┌─ Backend (FastAPI + Uvicorn) ────────────────────────────────┐
│  localhost:8000                                                │
│  ┌─ WebSocket Manager ────────────┐  ┌─ AI Agent Runtime ─┐  │
│  │ 连接池管理 / 心跳 / 自动重连    │  │ Orchestrator Agent  │  │
│  │ Room 广播（教师→学生同步）      │  │ Specialist MCP     │  │
│  └────────────────────────────────┘  │ Agents (tool use)  │  │
│                                       └────────────────────┘  │
│  ┌─ Conversation Engine ───────────────────────────────────┐  │
│  │ 对话 CRUD | 上下文管理 | 消息路由 | 快照版本管理          │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─ LLM Gateway ─────────────────────────────────────────┐   │
│  │  Claude Sonnet 4.6 | DeepSeek | fallback chain       │   │
│  │  Prompt caching | Cost tracking | Structured Output   │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌─ Tool Layer (MCP Servers) ────────────────────────────┐   │
│  │  sql-analyze | explain-engine | curriculum-rag        │   │
│  │  mermaid-gen | simulator-engine | tts-engine          │   │
│  │  → MCP 协议，独立进程，热插拔，语言无关                │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
         │ Redis pub/sub + asyncpg + aiomysql
         ▼
┌─ Infrastructure Layer ───────────────────────────────────────┐
│  ┌─ Redis 7+ ───────────────────────────────────────────┐   │
│  │  session:active:{convId}     — 活跃对话状态 (TTL 24h) │   │
│  │  ws:connections:{teacherId}  — WebSocket 连接池       │   │
│  │  conv:messages:{convId}      — 最近 50 条消息缓存     │   │
│  │  conv:snapshots:{convId}     — 演示快照索引           │   │
│  │  pub/sub:room:{convId}       — 课堂广播通道           │   │
│  │  llm:cache:{hash}            — LLM 响应缓存 (TTL 1h) │   │
│  │  ratelimit:{teacherId}       — 用户级速率限制         │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌─ PostgreSQL 16 ───────────────────────────────────────┐   │
│  │  conversations / messages / demos / teacher_profiles  │   │
│  │  student_progress / pgvector (课纲 RAG)                │   │
│  └───────────────────────────────────────────────────────┘   │
│  ┌─ Docker ──────────────────────────────────────────────┐   │
│  │  MySQL 8.0 :3308      — EXPLAIN 引擎                  │   │
│  │  PostgreSQL 16 :5433   — EXPLAIN 引擎 + 主存储         │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 前端层

**目录结构**：
```
frontend/
  src/
    components/
      ConversationPanel/   # 对话列表（搜索/筛选/新建/删除）
      ChatPanel/           # 消息流 + 输入框 + Agent 轨迹展示
      DemoPreview/         # 三栏联动预览（FlowEditor/Player/Animation）
    hooks/
      useWebSocket.ts      # WebSocket 连接/重连/心跳
      useConversation.ts   # 对话状态管理
    App.tsx                # 根组件，三栏布局
    main.tsx               # 入口
  package.json
  vite.config.ts
```

**组件树**：
```
App
├── ConversationPanel
│   ├── ConversationList        # 对话项列表
│   ├── ConversationSearch      # 搜索框
│   └── NewConversationButton   # 新建按钮
├── ChatPanel
│   ├── MessageList             # 消息流（虚拟滚动）
│   │   ├── UserMessage         # 用户消息（text/sql/image）
│   │   ├── AssistantMessage    # AI 回复
│   │   │   ├── AgentThinking   # Agent 执行轨迹
│   │   │   └── DemoSnapshotIndicator  # 演示版本标记
│   │   └── SystemMessage       # 系统通知
│   ├── MessageInput            # 输入框 + 多模态按钮
│   └── QuickActions            # 快捷操作面板
└── DemoPreview
    ├── FlowEditor              # 步骤编辑（6 阶段）
    ├── ExecutionPlayer         # 执行播放（Mermaid/D3.js）
    └── AnimationEngine         # 动画引擎
```

**层边界规则**：
- ✅ 前端组件只通过 `window.knowledgeBase` API 与后端通信
- ✅ WebSocket hook 封装所有 ws:// 逻辑
- ❌ 前端绝对不能 import Node.js 模块（fs, path, child_process 等）
- ❌ 前端不能直接访问 Redis 或 PostgreSQL

---

## 后端层

**目录结构**：
```
backend/
  app/
    main.py                # FastAPI 应用入口 + CORS + 生命周期
    ws/
      manager.py           # WebSocket 连接池 + 心跳 + 重连
      handlers.py          # 消息路由（chat:message → Agent Runtime）
      rooms.py             # Room 管理（加入/离开/广播）
    routes/
      conversations.py     # 对话 CRUD REST API
      demos.py             # 演示 REST API
      teacher.py           # 教师 Profile API
      curriculum.py        # 课纲搜索 API
      students.py          # 学生进度 API
    agents/
      orchestrator.py      # Orchestrator Agent（意图识别 → 工具选择）
      runtime.py           # Agent Runtime（加载上下文 → 编排执行）
    llm/
      gateway.py           # LLM Gateway（Claude + DeepSeek + Prompt Caching）
      cache.py             # LLM 响应缓存（Redis）
      cost.py              # Token 成本追踪
    models/
      conversation.py      # 对话 + 消息 PG 模型
      demo.py              # DemoPackage PG 模型
      teacher.py           # 教师 Profile + 风格模型
    mcp/
      registry.py          # MCP 服务器注册/发现
      client.py            # MCP 客户端（协议通信）
  requirements.txt
  main.py                  # uvicorn 入口
```

**层边界规则**：
- ✅ API 路由在 `routes/` 下注册
- ✅ WebSocket 逻辑在 `ws/` 下
- ✅ Agent + LLM 逻辑在 `agents/` 和 `llm/` 下
- ❌ WebSocket handler 不能直接调用 PG（走 `models/`）

---

## WebSocket 协议

**连接**：`ws://localhost:8000/ws/chat?teacherId={id}&convId={convId}`

**客户端 → 服务端**：

| 事件 | payload | 说明 |
|------|---------|------|
| `chat:message` | `{type, content}` | 发送消息 |
| `chat:interrupt` | `{}` | 打断 AI 生成 |
| `conv:create` | `{title?}` | 新建对话 |
| `conv:switch` | `{convId}` | 切换对话 |
| `conv:delete` | `{convId}` | 删除对话 |
| `conv:rename` | `{convId, title}` | 重命名 |
| `step:regenerate` | `{stepIndex}` | 重生成某一步 |
| `quiz:answer` | `{questionId, answer}` | 学生提交答案 |
| `player:seek` | `{stepIndex}` | 跳转步骤 |
| `demo:export` | `{format}` | 导出演示 |

**服务端 → 客户端**：

| 事件 | payload | 说明 |
|------|---------|------|
| `conv:list` | `[Conversation]` | 对话列表更新 |
| `conv:loaded` | `{convId, messages[]}` | 对话历史已加载 |
| `agent:thinking` | `{step, message}` | Agent 执行轨迹 |
| `agent:tool_call` | `{tool, status}` | 工具调用状态 |
| `step:preview` | `{stepIndex, content}` | 单步预览 |
| `step:regenerated` | `{stepIndex, content}` | 单步重写完成 |
| `demo:updated` | `{demoId}` | 演示更新 |
| `demo:complete` | `{demoId}` | 演示就绪 |
| `quiz:result` | `{correct, explanation}` | 答题结果 |
| `error` | `{code, message}` | 错误 |

---

## LLM Gateway 层

**Provider Chain**：
```
用户消息 → Claude Sonnet 4.6 (primary)
              ↓ 失败/限流
           DeepSeek (fallback)
              ↓ 都失败
           返回错误 + 建议稍后重试
```

**Prompt Caching 策略**：
- 相同的系统 Prompt + 对话前缀 → Redis 缓存命中
- TTL: 1 小时（同一节课内的重复提问最可能命中）
- Key: `llm:cache:{sha256(systemPrompt + lastNMessages)}`

---

## 工具层（MCP Servers）

**服务器清单**：

| MCP 服务器 | 触发条件 | 输入 | 输出 |
|-----------|---------|------|------|
| `sql-analyze` | 用户输入 SQL 文本 | SQL 字符串 | AST + 表/列引用 |
| `explain-engine` | 需要查询计划 | SQL + 数据库类型 | EXPLAIN 输出 JSON |
| `curriculum-rag` | 需要课程知识点 | 关键词 | 匹配的知识点 + 教材段落 |
| `mermaid-gen` | 需要图表 | 描述文本 | Mermaid 代码 |
| `simulator-engine` | 需要动画 | 模拟器类型 + 参数 | D3.js 动画配置 JSON |
| `tts-engine` | 需要语音 | 讲解文本 | 音频 URL |

**进程模型**：每个 MCP 服务器是独立进程，通过 stdin/stdout JSON-RPC 与 Agent Runtime 通信。可热插拔——新增 MCP 服务器不需要重启后端。

---

## 数据流：一次完整的对话交互

```
1. 用户发送消息
   +→ 前端 WebSocket → FastAPI WebSocket Manager
      +→ Conversation Engine: 保存消息到 PG + Redis List
         +→ AI Agent Runtime: 加载对话上下文 (Redis + PG)
            +→ 加载教师 Profile (Redis → miss → PG)
            +→ 调用 MCP 工具链 (发送 agent:thinking 事件)
            +→ LLM Gateway: 生成响应
            |  +→ 检查 Redis LLM Cache (hit → 直接返回)
            |  +→ miss → 调用 Claude/DeepSeek → 写入缓存
            +→ 流式推送给前端 (agent:thinking → step:preview → demo:complete)
               +→ 每步写入 Redis conv:messages
                  +→ 最终写入 PG 持久化

2. 用户切换对话
   +→ 前端 WebSocket → FastAPI
      +→ Conversation Engine:
         +→ Redis: 读取新对话的最近消息列表 (O(1))
         +→ Redis: 更新 session:active 指向新 convId

3. 课堂广播 (教师→学生同步)
   +→ 教师端: player:seek → step:3
      +→ FastAPI → Redis Pub/Sub "room:{convId}"
         +→ Room 内所有学生 WebSocket 收到同步消息
```

---

## PostgreSQL Schema

```sql
-- 对话表
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'active',  -- active|draft|finalized|archived
  demo_type TEXT,                -- p0|p1|p2
  tags TEXT[],
  message_count INT DEFAULT 0,
  snapshot_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conv_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,             -- user|assistant|system|agent
  type TEXT NOT NULL,             -- text|sql|image|demo_snapshot|tool_call|quiz
  content JSONB NOT NULL,
  metadata JSONB,                 -- tokensUsed, model, latencyMs
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 演示表
CREATE TABLE demos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conv_id UUID REFERENCES conversations(id),
  version INT DEFAULT 1,
  snapshot_order INT DEFAULT 1,
  title JSONB,                    -- {zh, en}
  demo_type TEXT,                 -- mermaid|echarts|sql-simulator|bplus-tree|transaction
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 教师 Profile 表
CREATE TABLE teacher_profiles (
  teacher_id TEXT PRIMARY KEY,
  style JSONB,                    -- {formality, depth, pace, examples}
  preferences JSONB,              -- {language, default_llm, export_format}
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 学生进度表
CREATE TABLE student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  conv_id UUID REFERENCES conversations(id),
  quiz_results JSONB,             -- [ {questionId, correct, timestamp} ]
  mastery JSONB,                  -- {knowledgeNode: 0.0-1.0}
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Redis 数据结构

| Key 模式 | 类型 | 用途 | TTL |
|---------|------|------|-----|
| `session:active:{convId}` | String(JSON) | 活跃对话状态 | 24h |
| `ws:connections:{teacherId}` | Set | WebSocket 连接 ID 池 | 会话级别 |
| `conv:messages:{convId}` | List | 最近 50 条消息缓存 | 24h |
| `conv:snapshots:{convId}` | Sorted Set | 演示快照索引 (score=order) | 24h |
| `llm:cache:{hash}` | String | LLM 响应缓存 | 1h |
| `teacher:profile:{teacherId}` | String(JSON) | 教师 Profile 缓存 | 1h |
| `ratelimit:{teacherId}` | Sorted Set | 速率限制滑动窗口 | 1min |
| `room:members:{convId}` | Set | 课堂成员 ID | 会话级别 |

---

> 更新此文档的时机：架构变更（新增层、修改层边界、新增 MCP 服务器、修改数据模型）。
