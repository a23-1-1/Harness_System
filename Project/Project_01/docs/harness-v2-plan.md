# DB Demo Studio — 完整 Harness 重配置方案（v2.0）

> 参照：learn-harness-engineering/project-06（Capstone）最大 Harness 模式  
> 适配：AI 协作式数据库课程演示工作台（React + FastAPI + WebSocket + Redis + PostgreSQL）  
> 生成日期：2026-06-05  
> 最后更新：2026-06-12（Harness 文件体系已落地，feat-001~010 全部完成）

---

## 目录

- [一、对标分析：当前状态 vs 目标状态](#一对标分析当前状态-vs-目标状态)
- [二、Harness 文件体系重配置](#二harness-文件体系重配置)
- [三、需求分析](#三需求分析)
- [四、方案设计：功能拆解与架构](#四方案设计功能拆解与架构)
- [五、开发文档体系](#五开发文档体系)
- [六、任务拆解与执行计划](#六任务拆解与执行计划)
- [七、质量把关体系](#七质量把关体系)
- [八、分支策略与协作方案](#八分支策略与协作方案)
- [九、附录：设计决策记录（ADR）](#九附录设计决策记录adr)

---

## 一、对标分析：当前状态 vs 目标状态

### 1.1 Project-06 的 Harness 配置清单（参照标准）

| Harness 文件 | 内容要点 | 目的 |
|-------------|---------|------|
| **AGENTS.md** | 启动流程(7步)、项目上下文、Docs 层级(3 文档)、Electron 层边界(4 层)、约定(TypeScript strict)、Done 定义(7 条)、会话交接、清理状态 | 全规则 Agent 入口——**系统化启动** |
| **CLAUDE.md** | 快速参考：构建命令、关键文件表(16 个文件)、架构规则(5 条)、IPC 通道(14 个全量)、"如何添加功能"(7 步)、测试命令 | Claude Code 快速参考——**查找导向** |
| **feature_list.json** | 15 个功能，全部 status:"pass" + evidence + testedAt | 功能真相源——**有证据才能标记完成** |
| **init.sh** | 5 步验证：安装→类型检查→构建→Harness 文件存在检查→样本数据验证 | 会话启动——**先验证再写代码** |
| **claude-progress.md** | 带时间戳会话日志、每个会话的"做了什么/决策/问题/基准分数/下一步" | 跨会话记忆——**决策可追溯** |
| **session-handoff.md** | 上次会话总结：已完成/剩余/决策/修改的文件/阻塞/下一步 | 接力棒——**具体的文件:行号级指引** |
| **clean-state-checklist.md** | 30+ 项检查，7 个分类：构建/架构/运行时/日志/数据完整性/性能/仓库 | 会话完成闸门——**不留烂摊子** |
| **evaluator-rubric.md** | 15 个评分维度(1-5 分)、Harness 文件评估、文档评估、IPC 覆盖率 | 质量评分卡——**可量化** |
| **quality-document.md** | 15 个评分维度(A-F 成绩单)、运行时证据、基准分数 | 质量证书——**可验证** |
| **docs/ARCHITECTURE.md** | 完整层图、数据流、存储布局 | Agent 可读架构——**理解系统** |
| **docs/PRODUCT.md** | 所有功能描述 + UI 布局 | Agent 可读产品——**知道该做什么** |
| **docs/RELIABILITY.md** | 日志、清理状态、基准策略 | Agent 可读可靠性——**知道怎么测试** |
| **scripts/benchmark.sh** | 带计时的基准任务套件 | 性能基准——**可测量** |
| **scripts/cleanup-scanner.sh** | 孤立文件检测 | 清理扫描——**自动检测** |
| **scripts/check-architecture.sh** | 层边界守卫 | 架构验证——**自动执行规则** |

### 1.2 当前 DB Demo Studio 的 Harness 状态（更新于 2026-06-12）

| 文件 | 状态 | 备注 |
|------|------|------|
| AGENTS.md | ✅ 已完成 | 7 步启动流程、层边界、Done 定义、会话交接 |
| CLAUDE.md | ✅ 已完成 | 构建命令、关键文件表、WebSocket/REST API 参考 |
| feature_list.json | ✅ 已完成 | 10 个功能全部 `done`，均有 `evidence` |
| init.sh | ✅ 已完成 | 6 步验证：Harness 文件检查 + 后端/前端/Docker |
| progress.md | ✅ 已完成 | 记录至 feat-010 完成（Session 010，2026-06-10） |
| session-handoff.md | ✅ 已更新 | Plan A 单分支策略已记录；维护阶段交接 |
| docs/requirements-spec.md | ✅ 已完成 | v5 完整规格（源文档） |
| docs/ARCHITECTURE.md | ✅ 已完成 | 已从 requirements-spec 拆分 |
| docs/PRODUCT.md | ✅ 已完成 | 已从 requirements-spec 拆分 |
| docs/RELIABILITY.md | ✅ 已完成 | 日志、清理状态、基准策略 |
| clean-state-checklist.md | ✅ 已完成 | 7 类 30+ 项检查 |
| evaluator-rubric.md | ✅ 已同步 | 功能评分已更新至 feat-010 |
| quality-document.md | ✅ 已同步 | 10/10 功能已实现 |
| scripts/benchmark.sh | ✅ 已完成 | 性能基准任务套件 |
| scripts/cleanup-scanner.sh | ✅ 已完成 | 孤立文件检测 |
| scripts/check-architecture.sh | ✅ 已完成 | 层边界守卫 |
| .cursor/agents/harness-auditor.md | ✅ 新增 | 项目级 Harness 审计子代理（可选入库） |

**功能完成度**：feat-001 ~ feat-010 全部 `done`，证据见 `feature_list.json`。

---

## 二、Harness 文件体系重配置

> **设计原因**：project-06 证明了"最大 Harness"模式——AGENTS.md（系统规则）+ CLAUDE.md（快速参考）**双层指令体系**比单一文件更有效。AGENTS.md 负责完整性（Agent 不会遗漏步骤），CLAUDE.md 负责查找速度（Agent 快速定位关键信息）。

### 2.1 文件职责矩阵

| 文件 | 谁读 | 什么时候读 | 更新频率 | 最大长度 |
|------|------|-----------|---------|---------|
| **AGENTS.md** | 所有 Agent | 每次会话开始（完整阅读） | 架构变更时 | 120 行 |
| **CLAUDE.md** | Claude Code 专用 | 按需查找 | 项目增长时 | 80 行 |
| **feature_list.json** | 所有 Agent | 每次选功能前 | 每个功能完成时 | 无硬限制 |
| **init.sh** | 所有 Agent | 每次会话第一条命令 | 新增依赖/验证时 | 无硬限制 |
| **progress.md** | 人类 + Agent | 会话开始回顾 | 每个会话结束 | 无硬限制 |
| **session-handoff.md** | 下一个会话的 Agent | 会话开始时 | 每个会话结束 | 80 行 |
| **clean-state-checklist.md** | Agent（会话结束前自检） | 每次提交前 | 新增功能时 | 无硬限制 |
| **evaluator-rubric.md** | 人类（代码审查） | 每周回顾 | 每个功能完成时 | — |
| **quality-document.md** | 人类（质量报告） | 里程碑审查 | 每个功能完成时 | — |
| **docs/ARCHITECTURE.md** | Agent（理解系统） | 功能设计时 | 架构变更时 | — |
| **docs/PRODUCT.md** | Agent（功能实现） | 功能实现时 | 功能变更时 | — |
| **docs/RELIABILITY.md** | Agent（测试/运维） | 测试/部署时 | 可靠性策略变更时 | — |

### 2.2 AGENTS.md 与 CLAUDE.md 的分工设计

**设计原因**：project-06 中两个文件存在信息重叠——这是**故意的**，因为：
1. AGENTS.md 面向通用 Agent（Cursor、Codex 等），需要**完整上下文**
2. CLAUDE.md 面向 Claude Code，可以**更精简**，因为 Claude Code 能读项目文件自行推理

**分工规则**：

| 内容类型 | AGENTS.md | CLAUDE.md |
|---------|-----------|-----------|
| 启动流程 | ✅ 详细 7 步 | 引用 AGENTS.md |
| 技术栈 | ✅ 完整 | ✅ 精简版 |
| 关键文件表 | ❌ | ✅（Agent 按需查） |
| IPC/API 通道列表 | ❌ | ✅（Agent 按需查） |
| 架构规则 | ✅ 带边界约束 | ✅ 快速检查表 |
| "如何添加功能"步骤 | ❌ | ✅（操作手册） |
| Done 定义 | ✅ | 引用 AGENTS.md |
| 会话交接规则 | ✅ | ❌ |
| 测试命令 | ❌ | ✅ |

---

## 三、需求分析

### 3.1 产品一句话

**DB Demo Studio** = AI 对话工作台 + 数据库课程演示生产流水线。

教师通过自然语言对话与 AI 协作，完成数据库课程知识点的**演示生成、可视化、模拟器搭建、讲解词打磨、测验出题和效果验证**。所有功能都通过对话触发、对话优化、对话反馈。

### 3.2 用户角色与场景

| 角色 | 场景 | 核心交互 |
|------|------|---------|
| **教师（核心用户）** | 备课 | 创建对话→输入 SQL/知识点→AI 生成演示→对话精修→导出 |
| **教师** | 课堂演示 | 实时播放演示→对话提问展开子演示→全班同步播放 |
| **学生** | 课堂跟随 | 接收同步演示→AI 追问→嵌入式答题→获得解释 |
| **学生** | 课后自学 | 打开分享链接→自步调浏览→AI 苏格拉底式引导→答题自测 |

### 3.3 演示能力三级体系

| 等级 | 名称 | 核心能力 | 对话触发示例 |
|------|------|---------|------------|
| **P0** | 即时演示 | 6 阶段分步讲解（lex→parse→optimize→plan→execute→result） | "讲讲 JOIN 查询" |
| **P1** | 轻量可视化 | Mermaid/ASCII/ECharts 图 + 对话调样式 | "加个 ER 图，改成蓝色系" |
| **P2** | 专业模拟器 | SQL 分步执行/B+树/事务隔离/锁竞争 | "模拟这个 SQL 的 JOIN 执行过程" |

### 3.4 非功能需求（性能指标）

| 指标 | 目标 | 测量方式 |
|------|------|---------|
| 对话切换延迟 | < 200ms | `conv:switch` 事件→`conv:loaded` 事件时间差 |
| 消息历史加载（最近 50 条） | < 100ms | Redis List 读取耗时 |
| WebSocket 重连+上下文恢复 | < 1s | 断线→`session:active` 恢复 |
| AI 首帧响应 | < 500ms | `chat:message`→`agent:thinking` 时间差 |
| 课堂广播延迟 | < 100ms | 教师 `player:seek`→学生端收到 |
| LLM 缓存命中率 | > 30% | `llm:cache:misses` / `llm:cache:hits` |
| 前端体积 | < 400KB (含 Mermaid/D3.js) | `vite build` 输出 |

### 3.5 技术约束

- ✅ Claude Sonnet 4.6 主 Provider（DeepSeek fallback）
- ✅ Redis 做热（会话/缓存/广播），PG 做冷（持久化/搜索/RAG）
- ✅ WebSocket 优先（实时交互），REST 仅用于 CRUD
- ✅ MCP 工具服务器独立进程，热插拔，语言无关
- ✅ Docker 管理 EXPLAIN 引擎（MySQL 8.0:3308, PostgreSQL 16:5433）

---

## 四、方案设计：功能拆解与架构

### 4.1 功能依赖图与优先级

```
Phase 1: 基础设施（第 1-2 周）
┌──────────────────────────────────────────────────────────────┐
│  feat-001: 项目脚手架 & 对话基础设施                          │
│  ├── FastAPI + WebSocket 骨架                                │
│  ├── React 19 + Vite 8 三栏布局                              │
│  ├── Redis + PostgreSQL + Docker Compose                     │
│  ├── 多对话 CRUD（F0.1）                                     │
│  └── WebSocket 连接池 + 心跳 + 重连（F0.3）                  │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
Phase 2: AI 能力（第 2-3 周）
┌──────────────────────────────────────────────────────────────┐
│  feat-002: AI Agent Runtime & LLM Gateway                    │
│  ├── LLM Gateway（Claude + DeepSeek + Prompt Caching）       │
│  ├── Orchestrator Agent + MCP 工具链骨架                     │
│  ├── Agent 执行轨迹推送（agent:thinking, agent:tool_call）   │
│  └── 教师风格 Profile 加载（F0.6）                           │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
Phase 3: 核心演示（第 3-5 周）
┌──────────────────────────────┐  ┌────────────────────────────┐
│  feat-003: P0 即时演示       │  │  feat-007: 课堂广播          │
│  6 阶段分步讲解 + 流式生成   │  │  Redis Pub/Sub + Room 管理  │
│  + 对话精修 + 版本快照       │  │  + 多端同步                 │
└──────────────┬───────────────┘  └──────────────┬─────────────┘
               │                                  │
               ▼                                  │
Phase 4: 可视化 & 模拟器（第 5-7 周）              │
┌──────────────────────────────┐                  │
│  feat-004: P1 轻量可视化     │                  │
│  Mermaid/ECharts + EXPLAIN   │                  │
│  + Docker 引擎集成           │                  │
└──────────────┬───────────────┘                  │
               ▼                                  │
┌──────────────────────────────┐                  │
│  feat-005: P2 专业模拟器     │                  │
│  B+树 / 事务 / SQL 模拟器    │                  │
└──────────────┬───────────────┘                  │
               │                                  │
               ▼                                  ▼
Phase 5: 教学闭环 + 导出（第 7-9 周）
┌──────────────────────────────┐  ┌────────────────────────────┐
│  feat-006: 测验 & 教学闭环   │  │  feat-008: 搜索/快照/导出   │
│  自动出题 + 错题讲解         │  │  历史搜索 + 版本对比 + 导出  │
│  + 掌握度 + 自适应建议       │  │  + 复用改编                  │
└──────────────┬───────────────┘  └──────────────┬─────────────┘
               │                                  │
               ▼                                  ▼
Phase 6: 智能增强 + 生产部署（第 9-11 周）
┌──────────────────────────────────────────────────────────────┐
│  feat-009: 课纲 RAG & 教师风格学习                           │
│  pgvector + 知识点搜索 + 风格自动学习 + LLM 缓存优化         │
└──────────────────────────────┬───────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  feat-010: 性能优化 & 生产部署                                │
│  Redis 调优 + PG 分表 + 限流 + Docker 一键部署 + AI 审计      │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 每个功能的设计说明

#### feat-001：项目脚手架 & 对话基础设施

**为什么放在第一个**：没有这个，AI 对话流走不通，后续所有功能无法验证。这是"骨架"——必须先有架子，再填肉。

**核心设计决策**：
- **为什么选 FastAPI 而不是 Flask？** 因为 WebSocket 原生支持更好，async/await 不依赖扩展；requirements-spec.md 第 6 节明确指定了 FastAPI。
- **为什么 Redis 做消息缓存而不是直接查 PG？** 对话切换延迟要求 < 200ms，PG 查询无法保证——Redis List O(1) 读取最近 50 条。
- **为什么前端用 pnpm 而不是 npm？** project-06 文档中推荐 pnpm 作为仓库级别包管理器——更快、磁盘更高效。
- **为什么 Docker Compose 管理数据库而不是本地安装？** 可复现的开发环境，"在我机器上能跑"问题不再存在。

**拆解子任务**：
1. 创建目录结构（frontend/、backend/、docker/、mcp-servers/）
2. Docker Compose 配置（MySQL 8.0:3308 + PostgreSQL 16:5433 + Redis 7）
3. FastAPI 骨架（main.py + WebSocket Manager + 基础路由）
4. React 三栏布局（ConversationPanel + ChatPanel + DemoPreview）
5. WebSocket 连接/重连/心跳
6. 多对话 CRUD（REST API + PostgreSQL schema）
7. Redis 会话缓存（session:active:{convId}）+ PG 消息持久化
8. 消息模型实现（text/sql/image/demo_snapshot/tool_call/quiz）

---

#### feat-002：AI Agent Runtime & LLM Gateway

**为什么放在 PM 基础之后、演示之前**：对话演示需要 AI 才知道如何生成——AI 是核心引擎。

**核心设计决策**：
- **为什么用 Orchestrator + Specialist 双 Agent 模式？** requirements-spec.md 第 6 节架构图——Orchestrator 负责编排（"要做什么"），Specialist MCP Agent 负责执行（"怎么做"），解耦使 MCP 服务器可以独立进程热插拔。
- **为什么用 Claude Sonnet 4.6 而不是 GPT？** Claude 在 3.7 版本中已经证明在遵循编码规则（"一次只做一个功能"）上更可靠。Sonnet 4.6 添加了 prompt caching 原生支持。
- **为什么需要 Prompt Caching？** 相同教学场景（"再讲一次 JOIN"）频繁重复，缓存命中 > 30% 可大幅降低 API 成本。
- **为什么需要 DeepSeek fallback？** 当 Claude API 限流或不可用时，系统不能完全挂掉——DeepSeek 作为降级路径。

**拆解子任务**：
1. LLM Gateway 实现（Claude + DeepSeek fallback chain）
2. Orchestrator Agent 编排逻辑（意图识别 → 工具选择）
3. MCP 工具服务器协议骨架
4. Agent 执行轨迹流式推送（agent:thinking, agent:tool_call, step:preview）
5. 教师风格 Profile 数据结构 → Redis 缓存加载

---

#### feat-003：P0 即时演示 — 对话式生成与 6 阶段分步讲解

**为什么先做 P0 再做可视化和模拟器**：P0 是**纯文本讲解**——不需要图表引擎、不需要 Docker 数据库——验证的是"对话→演示"这条核心链路能否走通。如果在 P0 上 AI 就讲不清楚，可视化做得再漂亮也没用。

**核心设计决策**：
- **为什么 6 个阶段是 lex→parse→optimize→plan→execute→result？** requirements-spec.md 第 3.6 节指定——这是 SQL 执行的标准流水线，也可以映射到非 SQL 知识点的链路。每个阶段是对话交互入口。
- **为什么用户要能打断 AI？** 流式生成中，AI 可能理解错意图——如果等生成完才发现，浪费 token 和时间。中断后保留已生成部分。
- **为什么每个步骤要存版本快照？** model-spec 第 2.2 节对话生命周期——每轮对话产生一个"演示快照版本"，支持回溯。这样用户说"回到上一版"时能立刻恢复。

**拆解子任务**：
1. DemoPackage 数据模型（v4，关联 convId + snapshotOrder）
2. 6 阶段演示模板引擎（lex/parse/optimize/plan/execute/result）
3. 流式生成 + 步骤预览推送（step:preview 事件）
4. 用户打断处理（保存已生成部分 → 等待新指令）
5. 对话精修单步（"第三步改通俗点"→ 局部重写）

---

#### feat-004：P1 轻量可视化 & EXPLAIN 引擎集成

**为什么先 Mermaid 再做 D3.js 模拟器**：Mermaid 生成成本低——只需文本代码。先验证"对话→图表"这个交互范式能工作，再投入到更复杂的 D3.js 动画。

**核心设计决策**：
- **为什么 Docker 启动 MySQL/PG 而不是连生产数据库？** EXPLAIN 结果依赖数据库版本——Docker 提供隔离的可复现环境。testcontainers 模式保证每个演示场景的 EXPLAIN 输出一致。
- **为什么需要双引擎对比？** MySQL 和 PostgreSQL 对同一 SQL 的 EXPLAIN 可能完全不同——这是教学核心（"同样的 SQL，不同数据库怎么执行"）。

**拆解子任务**：
1. Mermaid 生成 Agent（MCP 服务器：文字 → Mermaid 代码）
2. ECharts 生成 Agent（MCP 服务器：数据 → 图表配置）
3. Docker MySQL 8.0 EXPLAIN 引擎集成
4. Docker PostgreSQL 16 EXPLAIN 引擎集成
5. 双引擎对比视图（左右对比 + 差异高亮）
6. 对话调整样式（颜色/高亮/分步展示）

---

#### feat-005：P2 专业模拟器（B+树 / 事务 / SQL 执行）

**为什么要三个独立的模拟器而不是一个通用引擎**：B+树索引、事务隔离、SQL 执行三者底层模型完全不同——强行通用引擎会导致配置复杂度超过可对话范围。

**核心设计决策**：
- **为什么用 D3.js 而不是 Canvas 手绘？** D3.js 数据驱动——对话生成的 JSON 配置直接驱动动画，不需要写 Canvas 渲染代码。
- **为什么事务模拟器需要"双会话对比"？** 事务隔离级别的核心是"两个并发事务看到不同的数据"——单窗口无法展示。双会话并排演示是教学最佳实践。

**拆解子任务**：
1. B+树模拟器（插入/删除/查找动画，D3.js）
2. 事务隔离级别模拟器（双会话对比：RR 幻读、RC 不可重复读）
3. SQL 分步执行模拟器（Nested Loop / Hash Join / Sort Merge 可视化）
4. 对话生成 D3.js 动画配置（"插入 42 到 B+树"→ 动画 JSON）

---

#### feat-006：对话式测验 & 教学闭环

**为什么放在模拟器之后**：出题需要知识点结构化信息——P0-P2 三个阶段已经产出了结构化的 DemoPackage，测验引擎可以直接从中提取考点。

**核心设计决策**：
- **为什么三种题型而不是全开放？** 选择题有标准答案（可自动判分），判断题快速验证理解，简答题需要 AI 评判——三种覆盖不同认知层次。
- **为什么学生答错后是 AI 讲解而不是直接给正确答案？** 苏格拉底式引导——引导学生自己找到正确答案，比直接给答案更有效。

**拆解子任务**：
1. 知识点提取引擎（从 DemoPackage 提取考点）
2. 选择题生成器（题干 + 4 选项 + 正确选项 + AI 解释）
3. 判断题生成器（对/错 + AI 解释）
4. 学生答题界面（嵌入式：在演示步骤中穿插题目）
5. AI 错题讲解（对话式：追问 + 引导 + 最终答案）
6. 掌握度追踪（学生 → 知识点 → 正确率 → 薄弱点）

---

#### feat-007：课堂广播 & 多端同步

**为什么和 P0 并行开发**：它依赖 feat-003 的 demo 模型但不依赖可视化。可以在 P0 做完后立刻开发。

**核心设计决策**：
- **为什么用 Redis Pub/Sub 而不是 WebSocket 广播？** Redis Pub/Sub 天然支持多服务器实例——一台 FastAPI 发布，所有实例上的 WebSocket 连接都能收到。WebSocket 广播需要自己管理跨实例转发。
- **为什么 Room 设计用 MySQL Set 而不是 PG 表？** Room 成员变化频繁（学生进出），Set 操作 O(1) 而 PG 表需要 DELETE + INSERT。

**拆解子任务**：
1. Redis Pub/Sub 通道设计（room:{convId}, teacher:events）
2. WebSocket Room Manager（加入/离开/广播）
3. 教师端→学生端同步（player:seek → 全班跳转到同一步骤）
4. 多设备连接池（同一教师多个标签页同步）

---

#### feat-008：对话搜索 / 版本快照 / 导出

**为什么需要跨演示版本对比**：教师想"对比我和李老师的 JOIN 讲解"、"看看上个月的版本改了什么"——这是知识复用和协作的核心。

**核心设计决策**：
- **为什么导出多种格式而不只提供一种？** 不同场景需求不同：交互网页给学生自用、MP4 插入课件 PPT、Mermaid 代码嵌入文档、LMS 集成到教学平台。

**拆解子任务**：
1. 对话历史搜索（标题/日期/知识点语义搜索）
2. 演示版本快照回溯 + 对比 UI
3. 多格式导出（交互网页 / MP4 / Mermaid 代码 / LMS 嵌入）
4. 基于已有演示复用改编（"复制这个改成 LEFT JOIN 版"）

---

#### feat-009：课纲 RAG & 教师风格学习

**为什么用 pgvector 而不是外部向量数据库？** 已经在用 PostgreSQL，pgvector 扩展零额外运维成本，且语义搜索和结构化查询可以在同一查询中完成。

**核心设计决策**：
- **为什么教师风格要自动学习而不是手动配置？** 教师在对话中的反复修改隐含了偏好——AI 观察修改模式（"总是改得更通俗"→ 降低技术深度）比让教师填表单更自然。

**拆解子任务**：
1. pgvector 课纲/教材向量化 + 知识点搜索 API
2. 教师风格 Profile 自动学习（编辑模式分析 → 偏好向量更新）
3. LLM 响应缓存策略优化（Redis Key 设计 + TTL 调整）
4. 缓存命中率监控面板

---

#### feat-010：性能优化 & 生产部署

**为什么放在最后**：过早优化是万恶之源——在所有功能就绪后再根据真实使用数据优化。

**拆解子任务**：
1. Redis 缓存策略调优（TTL/淘汰/冷热分离）
2. PG 分表 + 连接池优化
3. 速率限制（Redis Sorted Set 滑动窗口）
4. Docker Compose 一键部署
5. 前端体积优化（代码分割 + Tree Shaking）
6. AI 审计日志（Token/Prompt/工具调用全记录）

---

## 五、开发文档体系

### 5.1 文档三件套设计

> **设计原因**：project-06 的文档三件套（ARCHITECTURE.md + PRODUCT.md + RELIABILITY.md）解决了"Agent 从哪里获取信息"的问题。每个文档职责单一，Agent 按需加载，不浪费上下文。

### 5.2 docs/ARCHITECTURE.md（架构文档）

**目标读者**：Agent（理解系统结构）

**内容大纲**（根据 requirements-spec.md 第 6 节）：

1. **系统总览图**（前端 → WebSocket/REST → 后端 → Redis/PG/Docker）
2. **前端层**：React 组件树、状态管理、WebSocket hook
3. **后端层**：FastAPI 路由、WebSocket Manager、Agent Runtime
4. **LLM Gateway 层**：Claude→ DeepSeek fallback chain、Prompt Caching
5. **工具层**：MCP 服务器架构（进程边界、协议、热插拔）
6. **基础设施层**：Redis 数据结构（6 种 key 模式）、PostgreSQL schema、Docker 拓扑
7. **数据流**：一次对话交互的完整链路（从 WebSocket 到 LLM 到 Redis 到 PG）
8. **层边界规则**：什么可以跨层、什么不行

### 5.3 docs/PRODUCT.md（产品文档）

**目标读者**：Agent（理解功能应该做什么）

**内容大纲**（根据 requirements-spec.md 第 3 节）：

1. **多对话架构**：对话列表、对话生命周期、状态流转
2. **消息模型**：8 种消息类型、多模态输入
3. **P0 即时演示**：6 阶段详解、每阶段的对话交互
4. **P1 轻量可视化**：Mermaid/ASCII/ECharts、对话调样式
5. **P2 专业模拟器**：SQL/B+树/事务三种模拟器
6. **测验系统**：三种题型、答题反馈、掌握度
7. **导出系统**：4 种导出格式
8. **课堂广播**：教师→学生同步流程

### 5.4 docs/RELIABILITY.md（可靠性文档）

**目标读者**：Agent（知道怎么测试）

**内容大纲**（根据 requirements-spec.md 第 8 节 + project-06 模式）：

1. **日志策略**：JSON 结构化格式、日志级别定义、每个服务的日志点
2. **清理状态管理**：重置 API 设计、数据隔离、幂等性
3. **基准策略**：测量什么、目标值、如何运行
4. **错误处理**：WebSocket 断线恢复、LLM 降级、Redis 不可用降级
5. **性能指标**：所有非功能需求的具体测量方法

---

## 六、任务拆解与执行计划

### 6.1 整体时间线（11 周）

```
Week 1-2:  ████████  feat-001 项目脚手架 & 对话基础设施          ✅ 完成
Week 2-3:  ████████  feat-002 AI Agent Runtime & LLM Gateway    ✅ 完成
Week 3-5:  ████████████████  feat-003 P0 即时演示 || feat-007   ✅ 完成
Week 5-7:  ████████████████  feat-004 P1 可视化 || feat-005     ✅ 完成
Week 7-9:  ████████████████  feat-006 测验闭环 || feat-008       ✅ 完成
Week 9-11: ████████████████  feat-009 课纲 RAG || feat-010       ✅ 完成
```

**当前阶段**（2026-06-12）：维护 / 验证 / 生产部署优化。新功能在 `Project/Project_01/` 目录下于 `master` 分支开发。

### 6.2 每周执行模板（基于 PIV 循环）

```
星期一：Plan
  ├─ 读 feature_list.json → 选本周功能
  ├─ 功能已拆解：按子任务开 Ticket
  └─ 明确本周 Done 标准

星期二~四：Implement
  ├─ 每个子任务：写代码 + 写测试 + 更新 progress.md
  └─ 每完成一个子任务 → git commit

星期五：Verify
  ├─ 跑 clean-state-checklist.md
  ├─ 跑 benchmark.sh
  ├─ 跑 check-architecture.sh
  ├─ 更新 feature_list.json（status + evidence + testedAt）
  ├─ 更新 quality-document.md
  ├─ 更新 evaluator-rubric.md
  └─ 更新 session-handoff.md
```

---

## 七、质量把关体系

### 7.1 五层质量闸门

> **设计原因**：project-06 的质量体系不是单一检查，而是**分层递进**——从代码级到产品级，每层有独立的标准和验证方式。

```
Layer 1: 编译闸门（每次编辑后，<1s）
  ├─ TypeScript: tsc --noEmit
  ├─ Python: mypy / pyright
  └─ 失败 = 不能提交

Layer 2: 单元测试闸门（每个子任务完成时，<10s）
  ├─ 后端: pytest -x -q
  ├─ 前端: vitest run
  └─ 失败 = 功能不能标记 done

Layer 3: 集成测试闸门（每个功能完成时，<1min）
  ├─ WebSocket 协议测试
  ├─ API 端到端测试
  └─ 失败 = 功能不能标记 done

Layer 4: 架构闸门（每次提交前，<30s）
  ├─ scripts/check-architecture.sh
  │   ├─ 前端不能 import Node.js 模块
  │   ├─ 后端路由必须在 routes/ 下
  │   └─ IPC/API 通道必须在 shared types 中定义
  └─ 失败 = 不能提交

Layer 5: 产品闸门（每周五，<5min）
  ├─ clean-state-checklist.md（30+ 项检查）
  ├─ benchmark.sh（性能基准）
  ├─ evaluator-rubric.md（评分卡）
  └─ 失败 = 下周优先修复
```

### 7.2 clean-state-checklist.md（30+ 项）

> **设计原因**：project-06 的清单是**验证的组合**——不只是测试，还包括架构规则、日志质量、数据完整性、仓库卫生——每项都有明确的"是/否"判断标准。

**分类设计**：

| 分类 | 检查项数 | 示例 |
|------|---------|------|
| **构建** | 3 | TypeScript 编译通过、Python 无 import 错误、前端构建成功 |
| **架构** | 6 | 前端无 Python 模块引用、所有 IPC 在 `shared/types.ts` 定义、API 路由注册正确 |
| **运行时** | 9 | 应用启动无错误、WebSocket 连接成功、文档导入、索引、Q&A、对话历史、反馈按钮、重置按钮、状态栏 |
| **日志** | 7 | JSON 可解析、含 timestamp/level/service/message、导入/索引/Q&A/错误事件有对应日志 |
| **数据完整性** | 5 | 无空分块、Q&A 历史跨重启持久化、反馈持久化、元数据一致、清理状态完全清除 |
| **性能** | 4 | benchmark.sh 无错误、导入吞吐量合理、索引速度达标、查询延迟达标 |
| **仓库** | 6 | 无意外文件、无敏感数据、无 build 产物提交、progress.md 更新、feature_list.json 准确、handoff 已更新 |

### 7.3 evaluator-rubric.md（评分标准）

> **设计原因**：project-06 的评分卡使用 1-5 制——不是通过/不通过，而是**量化质量**。每个分数有明确的判定标准——避免了主观评价。

**评分尺度**：

| 分数 | 含义 | 各维度的判定标准 |
|------|------|----------------|
| 5 | 优秀 | 实现完整 + 有证据（日志/测试/文档）+ 无已知问题 |
| 4 | 良好 | 实现完整 + 有证据 + 有小瑕疵（如日志少几条） |
| 3 | 及格 | 实现基本完整 + 缺部分证据 |
| 2 | 不足 | 实现有缺陷或缺关键验证 |
| 1 | 未完成 | 功能不存在或完全不工作 |

**评估维度（按功能）**：
每个功能独立评分，最后取平均。feat-001 到 feat-010 各占一个维度，外加"Harness 完整性""文档质量""IPC/API 覆盖率"三个 meta 维度。

---

## 八、分支策略与协作方案

### 8.1 当前分支策略（Plan A，2026-06-12）

本仓库采用 **单 `master` 主分支**，模块通过目录区分，不使用多分支体系（与 `README.md`、`AGENTS.md` 一致）。

| 项 | 状态 |
|----|------|
| 本地分支 | 仅 `master` |
| 远程主分支 | `origin/master`（已与本地同步） |
| 工作目录 | `Project/Project_01/`（DB Demo Studio） |
| 已废弃本地分支 | `feat-003-p0-demo`、`p01-baseline`、`p01-improved`、`project-01`、`project-02`（Plan A 清理已删除） |
| 待清理远程分支 | `origin/feat-003-p0-demo`（内容已合并进 `master`，可安全删除） |

**开发约定**：所有新工作在 `master` 上、于 `Project/Project_01/` 目录内完成；实验性对比用目录（如 `Project_01_experiment/`）而非新分支。

<!-- ### 8.2 历史方案（已废弃，2026-06-05 草案）

曾规划多分支对比实验：

| 分支 | 角色 |
|------|------|
| `p01-baseline` | 标准实现 |
| `p01-improved` | 改进实验 |
| `project-01` | 汇合点 |

已于 2026-06-12 执行 Plan A：fast-forward 合并 `feat-003-p0-demo` → `master`，删除过时本地分支。
-->

---

## 九、附录：设计决策记录（ADR）

### ADR-001：为什么选择 AGENTS.md + CLAUDE.md 双文件而非单文件？

**日期**：2026-06-05  
**决策**：采用双层指令体系  
**原因**：
1. project-06 证明了双文件体系的有效性——AGENTS.md 提供完整性（启动流程 7 步），CLAUDE.md 提供查找效率（IPC 通道列表、关键文件表）
2. 单一文件过长导致 Agent 遵守度下降（ETH Zurich 研究：超过 150 行的 CLAUDE.md 使任务成功率下降）
3. 两个文件面向不同的 Agent 运行时——AGENTS.md 是通用格式（Cursor、Codex 等），CLAUDE.md 是 Claude Code 专用格式

### ADR-002：为什么 feature_list.json 用 "pass/fail" 而非 "done/not-started"？

**日期**：2026-06-05  
**决策**：采用 project-06 的 `status: "pass/fail"` + `evidence` + `testedAt` 模式  
**原因**：
1. "done" 太主观——Agent 可能声称完成但实际没通过验证
2. "pass" 意味着"测试通过、有证据、有时戳"——验证驱动
3. `evidence` 字段是可追溯的真值——任何人都能检查证据是否成立

**实际落地**（2026-06-12）：采用 `status: "done"` + `evidence`；`testedAt` 未强制，完成证据写在 `evidence` 字段。10 个功能均已标记 `done` 并附证据。

### ADR-003：为什么在 P0 文本演示之前先做 Docker + Redis？

**日期**：2026-06-05  
**决策**：feat-001 包含了完整的基础设施  
**原因**：
1. 对话基础设施（WebSocket + Redis + PG）是所有功能的基石——没有它，后续功能的验证都无法进行
2. 先跑通"用户发消息→WebSocket→Redis→PG"这条完整链路，再叠加 AI 和演示
3. 如果基础设施有问题，在开发周期早期暴露——而不是在第 5 周才发现 Redis 连不上

---

> **文档维护规则**：每完成一个功能后，更新对应的 docs/（ARCHITECTURE/PRODUCT/RELIABILITY），更新 feature_list.json（status + evidence），更新 evaluator-rubric.md，更新 quality-document.md。  
> **下一份要读的文件**：`AGENTS.md`（Agent 启动入口）→ `CLAUDE.md`（快速参考）→ `progress.md`（当前状态）→ `clean-state-checklist.md`（验证闸门）
