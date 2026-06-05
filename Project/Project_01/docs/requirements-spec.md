# DB Demo Studio — 需求规格说明书 v5（AI 协作对话版）

> 融合《需求规格说明书 v3》教学可视化三级体系 + v4 AI Native 架构 + 多对话 AI 协作工作台。
>
> **核心设计理念：** 所有功能都是"AI 对话交互"的延伸——用户不是在操作工具，而是在与 AI 对话协作完成数据库课程知识演示的创造、优化和交付。多对话管理让用户可以并行推进多个备课任务，对话历史让每一次协作都被记录和复用。

---

## 1. 产品定位

### 1.1 一句话定义

**AI 协作式数据库课程演示工作台**——用户在与 AI 的多轮对话中，协作完成课程知识点演示的生成、可视化、模拟器搭建、讲解词打磨、测验出题和效果验证。所有功能都可对话触发、对话优化、对话反馈。

### 1.2 核心体验

```
┌─────────────────────────────────────────────────────────────────┐
│  DB Demo Studio = AI 对话工作台 + 演示生产流水线                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  教师打开 →  创建/选择对话 →  输入知识点/案例                    │
│       ↓                              ↓                           │
│   AI 回复（演示初稿 + 执行轨迹）      ←  Agent 编排工具链            │
│       ↓                                                          │
│   教师在对话中:                                                    │
│     "把第三步的讲解改得更通俗"  →  AI 实时重写                      │
│     "加一个 B+树可视化"        →  AI 生成动画配置                  │
│     "给这一步出两道选择题"      →  AI 生成嵌入式测验                │
│     "对比两个执行策略"         →  AI 解释证据与代价                │
│       ↓                                                          │
│  演示成品 = 对话的"物化产物"                                        │
│  切换对话 → 开始另一个备课任务                                       │
│  历史对话 → 可回溯、可复用、可对比                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 三场景（升级）

| 场景 | v4 | v5 升级 |
|---|---|---|
| 教师备课 | 单轮输入→生成 | **多对话并行**：每节课一个独立对话，AI 协作精修 |
| 课堂演示 | 自适应播放 | **对话即控制**：课堂中可对话提问 AI 实时展开子演示 |
| 学生自学 | 被动观看+答题 | **学生也有 AI 对话**：每步可追问，AI 以苏格拉底式引导 |

### 1.4 演示能力三级体系

| 优先级 | 核心特征 | 对话交互方式 |
|---|---|---|
| **P0 即时演示** | 6 阶段分步讲解 | 对话输入知识点/案例 → AI 流式生成 → 对话精修每步 |
| **P1 轻量可视化** | Mermaid/ASCII/ECharts | 对话"加个 ER 图"或"画个事务时序"→ AI 生成 → "颜色改蓝"→ AI 调整 |
| **P2 专业模拟器** | SQL 分步/B+树/事务隔离/概念演示 | 对话"模拟这个 JOIN 的执行"或"演示锁竞争"→ AI 构建交互式模拟器 |

---

## 2. 核心概念：AI 对话工作台

- **技术栈：**
  - **AI 层：** **DeepSeek API**（OpenAI-compatible SDK；本仓库统一 Provider，见 [`learning_constraints.md`](../../00_Roadmap/learning_constraints.md)）+ **Agent 编排**（Tool Calling）+ **SSE 流式输出** + Prompt Registry
  - **执行 grounding：** Docker 沙箱 MySQL 8 + PostgreSQL 16（`EXPLAIN`）+ Python `sqlparse` / `workflow.py` SQL 解析引擎
  - **应用层：** React 18 + TypeScript + Vite + Tailwind CSS（前端）+ **Fast API**（后端 SSE 对话、工具调度）；`packages/ai-tools/` 工具层
  - **渲染层：** Python `moviepy`（MP4 + 字幕）
  - **数据层：** PostgreSQL 16 + MinIO/S3 + 向量库（课纲/教材 RAG，Phase 1 可选简化）

### 2.1 多对话架构

```
┌──────────────────────────────────────────────────────────────────┐
│  DB Demo Studio — AI 对话工作台                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─ 对话列表 ───────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  ➤ 当前: JOIN 查询讲解 (P1 Mermaid 演示)                  │   │
│  │    📁 对话中: 第 3 轮 | 1 个演示 | 4 条消息               │   │
│  │                                                          │   │
│  │    B+树索引原理 (P2 模拟器)                               │   │
│  │    📁 对话中: 第 2 轮 | 1 个演示 | 8 条消息               │   │
│  │                                                          │   │
│  │    事务隔离级别 (P2 事务演示)                              │   │
│  │    📁 已定稿 | 演示已导出                                  │   │
│  │                                                          │   │
│  │    SELECT 基础语法 (P0 即时)                               │   │
│  │    📁 草稿 | 未完成                                        │   │
│  │                                                          │   │
│  │  [+ 新建对话]                                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ 当前对话区 ─────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  用户: 讲讲 JOIN 查询的执行过程                             │   │
│  │  ────────────────────────────────────────────────────     │   │
│  │  AI: 好的，我来分析这个知识点...                            │   │
│  │      [轨迹] 正在调用: knowledge_analyze → demo_plan → ...  │   │
│  │      [步骤预览] lex → parse → optimize → plan → ...       │   │
│  │      [演示就绪] Mermaid 图 + 6 步讲解 + 双引擎对比         │   │
│  │  ────────────────────────────────────────────────────     │   │
│  │  用户: 第三步的优化策略能讲得再通俗点吗？                     │   │
│  │  ────────────────────────────────────────────────────     │   │
│  │  AI: 当然，我来重新生成 optimize 阶段的讲解...              │   │
│  │      [优化后] 用了一个"全表扫描"的比喻...                   │   │
│  │                                                          │   │
│  │  ┌─ 快捷操作 ────────────────────────────────────┐       │   │
│  │  │  📊 加可视化   📝 出题   🔄 换引擎            │       │   │
│  │  │  🔊 TTS 试听   📤 导出   🤖 换模型           │       │   │
│  │  └──────────────────────────────────────────────┘       │   │
│  │                                                          │   │
│  │  [ 输入知识点 / 案例 / SQL / 修改指令... ] [发送]         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ 演示预览面板 (联动当前对话) ────────────────────────────┐   │
│  │  ← 与对话同步更新的 Player / FlowEditor / 可视化内容       │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 对话生命周期

```
创建对话 (标题自动生成/手动命名)
    │
    轮次 1: 用户输入知识点/案例/SQL → AI 生成演示初稿
    │       用户可: 反馈/修改/追问
    │
    轮次 N: 用户迭代精修 → AI 实时响应
    │       每轮对话产生一个"演示快照版本"
    │
    定稿: 用户满意 → 标记为"已定稿"
    │
    导出: 交互网页 / MP4 / Mermaid 代码 / 嵌入 LMS
    │
    存档: 对话历史完整保留 → 可回溯/可复用/可对比
```

### 2.3 对话中的 AI 协作模式

每种功能都在对话中通过自然语言触发和迭代：

| 你想做什么 | 在对话中说 | AI 做什么 |
|---|---|---|
| 生成演示 | "讲讲 JOIN 查询" | 编排工具链，生成 6 步演示 |
| 换可视化 | "加个 Mermaid ER 图" | 生成 Mermaid 代码，嵌入演示步骤 |
| 精修内容 | "第三步讲得太深了，改浅显" | 重写该步讲解词，保持上下文一致 |
| 加测验 | "给第二步出两道选择题" | 分析该步知识点，生成测验题 |
| 对比引擎 | "对比两个执行策略" | 解释不同策略证据与代价 |
| 换模型 | "用 Claude 重新生成" | 切换 LLM Provider，重新生成 |
| 改风格 | "讲得活泼一点，多举例" | 更新教师风格 profile，重新生成 |
| 建模拟器 | "模拟这个 SQL 的执行过程" | 构建分步执行模拟器 |

---

## 3. 功能需求（所有功能都是"可对话"的）

### 3.0 对话系统基础设施

| 子项 | 说明 |
|---|---|
| **F0.1 多对话管理** | 创建/切换/重命名/删除对话，每个对话独立上下文 |
| **F0.2 对话历史持久化** | 完整消息记录 + 每轮快照，支持按标题/日期/知识点搜索 |
| **F0.3 对话状态保持** | 刷新/重连后恢复对话上下文，WebSocket 重连自动恢复 |
| **F0.4 AI 协作交互** | 所有操作可对话触发，AI 响应含执行轨迹+操作反馈+建议下一步 |
| **F0.5 演示版本快照** | 每次 AI 响应自动保存当前演示快照，支持版本回溯和对比 |
| **F0.6 教师风格 Profile** | AI 学习教师对话中的编辑偏好，逐渐个性化响应 |

### 3.1 对话式演示生成（替代旧"输入→固定输出"）

| 子项 | 对话交互方式 |
|---|---|
| **F1.1 知识点/案例输入** | 用户在对话中输入 SQL、概念描述或课程案例，AI 自动识别意图 |
| **F1.2 多模态输入** | 对话中可发 SQL/文字/图片/表结构图，AI 理解并处理 |
| **F1.3 流式生成+反馈** | AI 边生成边推送步骤预览，用户可随时打断"停，这里改一下" |
| **F1.4 演示类型协商** | AI 推荐最佳演示类型并说明理由，用户可对话调整 |
| **F1.5 迭代精修** | 用户对任一步骤对话反馈，AI 理解上下文后局部重写 |
| **F1.6 执行轨迹可追溯** | AI 展示"我是怎么生成这个演示的"，用户可审查每一步证据 |

**对话示例：**

```
用户: 讲讲 JOIN 查询
AI:   好的！我来分析 JOIN 查询的执行过程。
      [调用 sql_analyze] 识别到 SELECT ... FROM students
      INNER JOIN courses ON ...
      [调用 explain_mysql] MySQL EXPLAIN 完成
      [调用 explain_postgres] PostgreSQL EXPLAIN 完成
      [生成演示] 6 步演示已就绪，我推荐用 P1 Mermaid 可视化展示
      因为 JOIN 的执行过程用流程图最直观。

      要现在预览吗？或者你想先调整什么？

用户: 把第三步的"optimize"用更通俗的方式讲
AI:   好的，我来重写 optimize 阶段的讲解。
      [原版] "MySQL 选择了 Nested Loop Join 算法，cost=2.20"
      [新版] "MySQL 就像查通讯录：先找到 students 表，对每一行
      去 courses 表里找匹配项——这叫做 Nested Loop Join。
      总工作量大约 2.20 个单位的代价。"

      这样感觉如何？我还可以用 Mermaid 画个匹配过程的流程图。
```

### 3.2 对话式 Mermaid/ASCII 生成（P1）

| 子项 | 对话交互方式 |
|---|---|
| **F2.1 对话生成** | "加个 ER 图"→ AI 生成 Mermaid，可对话调整 |
| **F2.2 对话调样式** | "颜色改成蓝色系""把第三行高亮"→ AI 调整代码 |
| **F2.3 对话拆步骤** | "按执行步骤分步展示"→ AI 生成分步 Mermaid |
| **F2.4 ASCII 动画** | "做个锁等待的 ASCII 动画"→ AI 生成文本动画 |

### 3.3 对话式模拟器构建（P2）

| 子项 | 对话交互方式 |
|---|---|
| **F3.1 SQL/过程模拟器** | "模拟这个 SQL 一步步怎么执行"或"演示锁冲突过程"→ AI 构建分步执行模拟器 |
| **F3.2 B+树模拟器** | "演示 B+树插入 42 的过程"→ AI 生成 D3.js 动画配置 |
| **F3.3 事务模拟器** | "演示 RR 级别下的幻读"→ AI 构建双会话对比演示 |

### 3.4 对话式测验与教学闭环

| 子项 | 对话交互方式 |
|---|---|
| **F4.1 出题** | "给这个知识点出 3 道选择题"→ AI 生成，可对话调难度 |
| **F4.2 错题讲解** | 学生答题后 AI 对话式讲解错误原因 |
| **F4.3 掌握度分析** | "学生哪些知识点比较薄弱？"→ AI 基于数据对话汇报 |
| **F4.4 自适应建议** | "下一步该讲什么？"→ AI 根据掌握度对话推荐 |

### 3.5 对话式导出与协作

| 子项 | 对话交互方式 |
|---|---|
| **F5.1 导出** | "导出这节课的演示"→ AI 打包导出，可选格式 |
| **F5.2 分享** | "把这个演示分享给学生"→ AI 生成分享链接/LMS 嵌入代码 |
| **F5.3 对比** | "对比我和李老师的 JOIN 讲解"→ AI 加载两个演示并对比 |
| **F5.4 复用** | "基于这个演示改一个讲 LEFT JOIN 的版本"→ AI 复制并调整 |

### 3.6 阶段演示展示（对话增强版）

每个阶段不仅是静态展示，更是对话交互入口；在 SQL 场景中，它对应 lex/parse/optimize/plan/execute/result，在其他课程知识场景中则映射到对应的知识链路：

| 阶段 | 对话式交互 |
|---|---|
| **lex** | 用户点击关键字 → AI 解释每个关键字含义 |
| **parse** | 用户点击表名 → AI 展示表结构 + 索引信息 |
| **optimize** | 用户问"为什么选这个扫描方式"→ AI 对比其他策略 |
| **plan** | 用户点击代价数值 → AI 拆解代价构成 |
| **execute** | 用户问"扫描了多少行"→ AI 对比估计 vs 实际 |
| **result** | 用户问"这条结果说明了什么"→ AI 生成教学总结 |

---

## 4. 数据模型

### 4.1 对话模型

```json
{
  "id": "conv_01j2x...",
  "title": "JOIN 查询讲解",
  "teacherId": "t_001",
  "status": "active|draft|finalized|archived",
  "demoType": "p0|p1|p2",
  "curriculumNode": "JOIN",
  "createdAt": "2026-06-02T10:00:00Z",
  "updatedAt": "2026-06-02T11:30:00Z",
  "messageCount": 12,
  "snapshotCount": 3,
  "tags": ["database-course", "chapter-3"],
  "summary": "讲解了 JOIN 查询的执行过程，生成了 Mermaid 可视化演示"
}
```

### 4.2 消息模型

```json
{
  "id": "msg_01j2y...",
  "convId": "conv_01j2x...",
  "role": "user|assistant|system|agent",
  "type": "text|sql|image|demo_snapshot|tool_call|quiz",
  "content": {
    "text": "讲讲 JOIN 查询",
    "sql": "SELECT ...",
    "imageUrl": "...",
    "toolCalls": [
      { "tool": "sql_analyze", "args": {...}, "result": {...} }
    ],
    "demoSnapshot": "dp_01j2z..."
  },
  "metadata": {
    "tokensUsed": 1500,
    "model": "claude-sonnet-4-6",
    "latencyMs": 3200
  },
  "createdAt": "2026-06-02T10:05:00Z"
}
```

### 4.3 DemoPackage v4（同上版，新增对话关联）

```json
{
  "id": "dp_01j2z...",
  "convId": "conv_01j2x...",
  "version": 4,
  "snapshotOrder": 2,
  "title": { "zh": "JOIN 查询执行过程", "en": "JOIN Query Execution" },
  "demoType": "mermaid|ascii|echarts|sql-simulator|bplus-tree|transaction",
  ...
}
```

### 4.4 Redis 数据结构

```json
// 活跃对话状态 (Redis String, TTL=24h)
"session:active:{convId}" -> {
  "wsConnectionId": "ws_abc123",
  "lastActivity": "2026-06-02T11:30:00Z",
  "currentSnapshotId": "dp_01j2z...",
  "context": {
    "lastMessageId": "msg_01j2y...",
    "pendingToolCalls": [],
    "generationStatus": "idle|streaming|interrupted"
  }
}

// 对话消息列表 (Redis List, 最近 50 条缓存)
"conv:messages:{convId}" -> [msg_01, msg_02, ...]

// WebSocket 连接映射 (Redis Set)
"ws:connections:{teacherId}" -> ["ws_abc123", "ws_def456"]

// Room 成员 (Redis Set, 课堂场景)
"room:members:{convId}" -> ["student_001", "student_002"]

// LLM 响应缓存 (Redis String, TTL=1h)
"llm:cache:{promptHash}" -> "{response}"

// 用户速率限制 (Redis Sorted Set)
"ratelimit:{teacherId}" -> score: timestamp, member: requestId

// 教师风格 Profile 缓存 (Redis String)
"teacher:profile:{teacherId}" -> {style: "concise", depth: "intermediate", ...}
```

---

## 5. API 接口

### 5.1 WebSocket 对话协议

连接: `ws://host/ws/chat?teacherId={id}&convId={convId}`

| 客户端 -> 服务端 | 说明 |
|---|---|
| `chat:message` | 发送消息（text/sql/image/knowledge） |
| `chat:interrupt` | 打断当前 AI 生成 |
| `conv:create` | 创建新对话 |
| `conv:switch` | 切换到指定对话 |
| `conv:delete` | 删除对话 |
| `conv:rename` | 重命名对话 |
| `step:regenerate` | 对话中重生成某一步 |
| `quiz:answer` | 学生提交答案 |
| `player:seek` | 跳转到指定步骤 |
| `demo:export` | 导出当前演示 |

| 服务端 -> 客户端 | 说明 |
|---|---|
| `conv:list` | 对话列表更新 |
| `conv:loaded` | 对话历史已加载 |
| `agent:thinking` | Agent 执行轨迹片段 |
| `agent:tool_call` | 工具调用状态更新 |
| `step:preview` | 单步生成预览 |
| `step:regenerated` | 单步重写完成 |
| `demo:updated` | 演示更新通知 |
| `demo:complete` | 完整演示就绪 |
| `demo:exported` | 导出完成 |
| `quiz:result` | 答题结果 + AI 解释 |
| `adaptive:suggest` | AI 建议下一步操作 |
| `error` | 错误信息 |

### 5.2 REST API

```
# 对话管理
GET    /api/v5/conversations              -> 对话列表（分页+搜索）
POST   /api/v5/conversations              -> 创建新对话
GET    /api/v5/conversations/:id          -> 对话详情+元数据
PATCH  /api/v5/conversations/:id          -> 更新对话（标题/标签/状态）
DELETE /api/v5/conversations/:id          -> 删除对话
GET    /api/v5/conversations/:id/messages -> 消息历史（分页）
GET    /api/v5/conversations/:id/snapshots -> 演示版本快照列表

# 演示
GET    /api/v5/demos/:id                  -> DemoPackage
POST   /api/v5/demos/:id/export           -> 导出（mp4/mermaid/lti）
POST   /api/v5/demos/:id/compare          -> 对比两个版本

# 教师
POST   /api/v5/teacher/profile            -> 保存风格配置
GET    /api/v5/teacher/profile            -> 读取风格配置

# 课纲 RAG
GET    /api/v5/curriculum/search?q=       -> 知识点搜索

# 学生
POST   /api/v5/feedback                   -> 掌握度数据上报
GET    /api/v5/students/:id/progress      -> 学生学习进度

# 系统
GET    /api/v5/health                     -> {status, redis, pg, providers}
```

---

## 6. 技术架构

```
┌─ Frontend (React 19 + Vite 8 + TailwindCSS v4) ──────────────┐
│  localhost:5173                                                │
│                                                                │
│  ┌─ ConversationPanel ───┐  ┌─ ChatPanel ────────────────┐   │
│  │ 对话列表               │  │ 消息流                      │   │
│  │ 搜索/筛选              │  │ 多模态输入(text/sql/image)  │   │
│  │ 状态标签(active/draft) │  │ Agent 执行轨迹展示          │   │
│  │ 快捷操作(新建/删除)    │  │ 快捷操作面板                │   │
│  └───────────────────────┘  │ 演示快照版本指示器           │   │
│                              └────────────────────────────┘   │
│  ┌─ Demo Preview (三栏合一的联动预览) ────────────────────┐   │
│  │  FlowEditor | ExecutionPlayer | Animation Engine        │   │
│  │  (Mermaid / D3.js / ECharts / 执行计划树)               │   │
│  └────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
         │ WebSocket (ws://) + REST
         ▼
┌─ Backend (FastAPI + Uvicorn) ────────────────────────────────┐
│  localhost:8000                                                │
│                                                                │
│  ┌─ WebSocket Manager ────────────┐  ┌─ AI Agent Runtime ─┐  │
│  │ 连接池管理 / 心跳 / 自动重连    │  │ Orchestrator Agent  │  │
│  │ Room 广播（教师->学生同步）      │  │ Specialist MCP     │  │
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
│  │  -> MCP 协议，独立进程，热插拔，语言无关                │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
         │ Redis pub/sub + asyncpg + aiomysql
         ▼
┌─ Infrastructure Layer ───────────────────────────────────────┐
│                                                                │
│  ┌─ Redis ─────────────────────────────────────────────┐     │
│  │                                                        │     │
│  │  【会话管理】                                          │     │
│  │   session:active:{convId}  -- 活跃对话状态 (TTL 24h)   │     │
│  │   ws:connections:{teacherId} -- WebSocket 连接池       │     │
│  │                                                        │     │
│  │  【消息缓存】                                          │     │
│  │   conv:messages:{convId} -- 最近 N 条消息 (List)       │     │
│  │   conv:snapshots:{convId} -- 演示快照索引 (Sorted Set) │     │
│  │                                                        │     │
│  │  【发布订阅】                                          │     │
│  │   pub/sub:room:{convId} -- 课堂广播通道                │     │
│  │   pub/sub:teacher:events -- 教师端事件广播             │     │
│  │                                                        │     │
│  │  【性能加速】                                          │     │
│  │   llm:cache:{hash} -- LLM 响应缓存 (TTL 1h)           │     │
│  │   teacher:profile:{id} -- 教师 Profile 缓存            │     │
│  │   curriculum:cache -- 课纲 RAG 缓存                    │     │
│  │                                                        │     │
│  │  【限流保护】                                          │     │
│  │   ratelimit:{teacherId} -- 用户级速率限制               │     │
│  │                                                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌─ PostgreSQL 16 ───────────────────────────────────────┐     │
│  │  conversations  -- 对话持久化 (消息存 PG, Redis 做缓存) │     │
│  │  demos          -- DemoPackage 持久化                   │     │
│  │  teacher_profiles -- 教师风格/偏好                      │     │
│  │  student_progress -- 学生掌握度数据                     │     │
│  │  pgvector       -- 课纲/教材向量化 RAG                  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌─ Docker (testcontainers 按需启动) ───────────────────┐     │
│  │  MySQL 8.0 :3308     -> EXPLAIN 引擎                  │     │
│  │  PostgreSQL 16 :5433  -> EXPLAIN 引擎 + 主存储         │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### 6.1 Redis 在架构中的角色

| 用途 | 数据结构 | 为什么用 Redis |
|---|---|---|
| **活跃对话状态** | String (JSON) | WebSocket 连接断开后恢复上下文，避免反复查 PG |
| **消息缓存** | List (cap 50) | 用户切换对话时快速加载最近消息，后续懒加载 PG 历史 |
| **WebSocket 连接池** | Set | 多开标签页/多设备场景，精准下发事件 |
| **课堂广播** | Pub/Sub | 教师讲->学生端实时同步，替代轮询 |
| **LLM 缓存** | String + Hash | 相同 Prompt 命中缓存，减少 API 调用（如重复"再讲一次"）|
| **速率限制** | Sorted Set | 防止学生端刷题/刷请求 |
| **教师 Profile** | String | 每次 AI 请求需要加载风格偏好 |

### 6.2 数据流：一次完整的对话交互

```
1. 用户发送消息
   +-> 前端 WebSocket -> FastAPI WebSocket Manager
      +-> Conversation Engine: 保存消息到 PG + Redis List
         +-> AI Agent Runtime: 加载对话上下文 (Redis + PG)
            +-> 加载教师 Profile (Redis -> miss -> PG)
            +-> 调用 MCP 工具链 (并发送 agent:thinking 事件)
            +-> LLM Gateway: 生成响应
            |  +-> 检查 Redis LLM Cache (hit -> 直接返回)
            |  +-> miss -> 调用 Claude/DeepSeek -> 写入缓存
            +-> 流式推送回前端 (agent:thinking -> step:preview -> demo:complete)
               +-> 每步写入 Redis conv:messages
                  +-> 最终写入 PG conversations 持久化

2. 用户切换对话
   +-> 前端 WebSocket -> FastAPI
      +-> Conversation Engine:
         +-> Redis: 读取新对话的最近消息列表 (O(1))
         +-> Redis: 更新 session:active 指向新 convId

3. 课堂广播 (教师讲->学生端同步)
   +-> 教师端: player:seek -> step:3
      +-> FastAPI -> Redis Pub/Sub "room:{convId}"
         +-> Room 内所有学生 WebSocket 收到同步消息
```

---

## 7. 配置项

| 变量 | 默认值 | 说明 |
|---|---|---|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis 连接 |
| `REDIS_TTL_SESSION` | `86400` | 活跃会话 TTL（秒） |
| `REDIS_TTL_LLM_CACHE` | `3600` | LLM 缓存 TTL（秒） |
| `REDIS_MESSAGE_CACHE_SIZE` | `50` | 每个对话缓存最近消息数 |
| `LLM_PROVIDER` | `claude` | 主 Provider |
| `CLAUDE_API_KEY` | -- | Anthropic API Key |
| `DEEPSEEK_API_KEY` | -- | DeepSeek fallback |
| `DATABASE_URL` | `postgresql://...` | 主数据库 |
| `PG_VECTOR_ENABLED` | `true` | 课纲 RAG |
| `MYSQL_HOST` | `127.0.0.1` | MySQL EXPLAIN |
| `MYSQL_PORT` | `3308` | |
| `PG_HOST` | `127.0.0.1` | PostgreSQL EXPLAIN |
| `PG_PORT` | `5433` | |
| `TTS_PROVIDER` | `edge` | TTS 引擎 |
| `MCP_SERVER_DIR` | `./mcp-servers/` | MCP Server 注册目录 |

---

## 8. 非功能需求

| 指标 | 目标 |
|---|---|
| 对话切换延迟 | < **200ms**（依赖 Redis 缓存） |
| 消息历史加载 | 最近 50 条 < 100ms（Redis），全量 < 500ms（PG） |
| WebSocket 重连 | 自动重连 + 上下文恢复 < 1s |
| AI 首帧响应 | < 500ms |
| LLM 缓存命中率 | 目标 > 30%（常见教学场景） |
| 课堂广播延迟 | < 100ms（Redis Pub/Sub） |
| 对话数量上限 | 无硬限制（PG 分表 + Redis 冷热分离） |
| 并发学生/教室 | > 200 学生/教室（Redis Pub/Sub + 异步 I/O） |
| 高可用 | Redis Sentinel / Cluster 可切换 |
| 数据持久性 | 对话/PG 全量持久化，Redis 仅缓存+状态 |
| 前端体积 | < 400KB (含 Mermaid/D3.js) |
| AI 审计 | 完整 Token/Prompt/工具调用日志 |

---

## 9. 落地路线图

| 时间 | 交付 | 验收标准 |
|---|---|---|
| **第 1 周** | Flask -> FastAPI + WebSocket + Redis 基础 | 多对话创建/切换，消息持久化，WebSocket 重连 |
| **第 2 周** | 对话式演示生成 + P1 可视化 | AI 对话生成演示，可对话精修单步，Mermaid 高亮 |
| **第 3 周** | P2 过程模拟器 + Redis Pub/Sub 课堂广播 | 对话构建模拟器，教师端->学生端实时同步 |
| **第 4 周** | P2 B+树 + 事务模拟器 | 对话生成动画配置，隔离级别切换 |
| **第 5 周** | 对话历史搜索 + 版本快照 + 导出 | 按知识点搜索历史，版本回溯对比，多格式导出 |
| **第 6 周** | 学生端 AI 对话 + 测验 + 掌握度追踪 | 学生可追问 AI，嵌入式答题，自适应跳过 |
| **第 7 周** | 教师风格学习 + LLM Cache + 性能优化 | 风格 Profile 自动学习，缓存命中率达标 |

---

> **设计原则：** 一切皆对话。每个功能都是 AI 对话的延伸，不是独立工具。
> 对话上下文是核心资产——历史可追溯、版本可对比、知识可复用。
> Redis 是做"热"的（会话/缓存/广播），PG 是做"冷"的（持久化/搜索/RAG）。
