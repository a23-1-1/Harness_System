# Harness 管理驱动开发：AI 协作项目开发完整指南

> 基于 [learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering) 6 个渐进式项目实战 + 全网最佳实践研究
> 适用于：AI 协作式数据库课程演示工作台（DB Demo Studio）

---

## 目录

- [0. 核心思想：模型不重要，Harness 才重要](#0-核心思想模型不重要harness-才重要)
- [1. 什么是 Harness？五子系统模型](#1-什么是-harness五子系统模型)
- [2. 从 reference 项目学渐进式 Harness 演进](#2-从-reference-项目学渐进式-harness-演进)
- [3. Harness 文件详解：每个文件怎么写](#3-harness-文件详解每个文件怎么写)
- [4. 结合你的项目：DB Demo Studio 开发路线图](#4-结合你的项目db-demo-studio-开发路线图)
- [5. 开发工作流：PIV 循环（Plan → Implement → Verify）](#5-开发工作流piv-循环plan--implement--verify)
- [6. 会话交接：跨会话不丢上下文](#6-会话交接跨会话不丢上下文)
- [7. 多分支协作：baseline vs improved](#7-多分支协作baseline-vs-improved)
- [8. 常见错误 & 避坑指南](#8-常见错误--避坑指南)
- [9. 检查清单：你的项目现在处于什么阶段](#9-检查清单你的项目现在处于什么阶段)

---

## 0. 核心思想：模型不重要，Harness 才重要

**同一模型，不同 Harness 配置，编码排名可差 28 位**（Terminal Bench 2.0）。

Anthropic 工程师的结论：
> "It is not a model problem. It is a configuration problem."
> ——不是模型问题，是配置问题。

**Harness 就是给 AI 编码 Agent 装上的"安全带 + 导航 + 仪表盘"**：

| 类比 | Harness 组件 | 作用 |
|------|-------------|------|
| 🗺️ 导航 | `CLAUDE.md` | 告诉 Agent 项目规则、技术栈、禁区 |
| 📊 仪表盘 | `feature_list.json` + `progress.md` | 当前进度、下一步做什么 |
| 🔧 启动钥匙 | `init.sh` | 一键验证环境是否健康 |
| 📝 行车记录 | `session-handoff.md` | 每次会话结束后，下一个人能接着开 |

---

## 1. 什么是 Harness？五子系统模型

`harness-creator` skill 定义了五个子系统，每个解决一个具体问题：

| 子系统 | 最小产出 | 解决什么问题 |
|--------|----------|-------------|
| **📋 指令 (Instructions)** | `CLAUDE.md` 或 `AGENTS.md` | Agent 不知道项目规则、技术栈、禁区 |
| **📊 状态 (State)** | `feature_list.json` + `progress.md` | Agent 乱做、做一半、声称完成但没完成 |
| **✅ 验证 (Verification)** | `init.sh` + 测试命令 | 环境坏了、Agent 不知道代码是否真的能用 |
| **🎯 范围 (Scope)** | 功能依赖关系 + 完成标准 | Agent 越界修改无关文件、做了一半跳到别的功能 |
| **🔄 生命周期 (Lifecycle)** | `session-handoff.md` | 下次会话忘记之前做了什么、重复踩坑 |

---

## 2. 从 Reference 项目学渐进式 Harness 演进

`learn-harness-engineering/projects/` 有 6 个项目，每个演示一个 Harness 演进阶段。这**不是**6 个独立项目，而是**同一个应用**的 6 个开发阶段，每个阶段的 Harness 从弱到强。

### 2.1 六个阶段一览

```
项目复杂度
  ↑
P6 │ ████████████████  完整 Harness（15 功能 + 基准测试 + 清理脚本 + 架构检查）
P5 │ ██████████████    评估器循环（3 角色协作：单角色 → 生成+评估 → 规划+生成+评估）
P4 │ ████████████      运行时反馈（日志 + 架构检查脚本 + 隐藏 bug 修复）
P3 │ ██████████        多会话连续性（init.sh + session-handoff + clean-state-checklist）
P2 │ ████████          智能体可读工作区（AGENTS.md + feature_list.json + 文档区）
P1 │ ██████            Baseline vs Minimal Harness（starter 仅一个 task-prompt）
  └──────────────────────────────→ 开发阶段
```

### 2.2 每个阶段增加的 Harness 文件

| 阶段 | 新增 Harness 文件 | 学会了什么 |
|------|------------------|-----------|
| **P1** | `CLAUDE.md`、`feature_list.json`、`init.sh`、`progress.md` | 最基础的五件套，项目从零开始 |
| **P2** | `session-handoff.md`、`docs/ARCHITECTURE.md`、`docs/PRODUCT.md` | 多会话协作、架构文档 |
| **P3** | `clean-state-checklist.md`（49 项检查） | 每次结束前系统化检查，确保不留烂摊子 |
| **P4** | `scripts/check-architecture.sh`、`logger.ts` | 运行时质量守卫（架构边界检查 + 结构化日志） |
| **P5** | `evaluator-rubric.md`、`sprint-contract.md` | 评估器循环（生成 → 评分 → 修订） |
| **P6** | `benchmark.sh`、`cleanup-scanner.sh`、`quality-document.md` | 完整的生产级 Harness（15 功能 + 60+ 检查项） |

### 2.3 核心模式：Starter vs Solution

每个项目都有两个目录：
```
project-01/
├── starter/      ← "弱 Harness"（只有一个 task-prompt.md）
└── solution/     ← "强 Harness"（完整五件套）
```

**这是最关键的洞察**：同一个代码任务，Harness 强弱直接影响 AI Agent 的工作质量。你可以对比两个版本的质量差异。

### 2.4 你的项目对应哪个阶段？

**DB Demo Studio 目前处于 P1→P2 阶段：**

| 你已有的 | 对应阶段 | 还缺什么 |
|----------|---------|---------|
| ✅ `CLAUDE.md` | P1 | — |
| ✅ `feature_list.json`（10 功能） | P1 | — |
| ✅ `init.sh` | P1 | — |
| ✅ `progress.md` | P1 | — |
| ✅ `session-handoff.md` | P2 | — |
| ✅ `docs/requirements-spec.md` | P2 | — |
| ❌ `docs/ARCHITECTURE.md` | P2 | **建议创建** |
| ❌ `clean-state-checklist.md` | P3 | 做完 feat-001 后创建 |
| ❌ 架构检查脚本 | P4 | 做完 feat-003 后创建 |
| ❌ 评估器 Rubric | P5 | 做完 feat-006 后加入 |

---

## 3. Harness 文件详解：每个文件怎么写

### 3.1 CLAUDE.md — Agent 的"操作手册"

**设计原则：只写 Agent 发现不了的东西。**

> 如果规则可以从 `package.json`、`tsconfig.json`、ESLint 配置、CI 流水线中推导出来——**不要**写进 CLAUDE.md。

**推荐长度：70-150 行。** 超过 150 行→上下文占用过多，Agent 反而容易忽略。

**模板结构**（每部分 5-15 行）：

```markdown
# [项目名] Agent Guide

## 技术栈
# 一行一技术，Agent 据此选择工具和语法
# 例：React 19 + FastAPI + WebSocket + Redis + PostgreSQL

## 启动流程
# 从零到跑起来的 3-5 步
# 1. ./init.sh
# 2. 读 feature_list.json
# 3. 读 progress.md

## 工作规则（7-10 条行为约束）
# 优先用「不要做 X」而非「要做 X」——负面约束对 LLM 更强
# 例：
# - 一次只做一个功能
# - 不要修改与当前功能无关的文件
# - 不要在没跑验证之前标记完成

## 完成标准
# 一个功能「真正完成」必须满足什么条件
# 例：
# - [ ] 功能行为可对话触发
# - [ ] 测试通过
# - [ ] 证据记录在 progress.md

## 避坑指南（5-10 条 Agent 容易犯的错）
# 这是 CLAUDE.md 最有价值的部分
# 只在 Agent 真的犯了某个错之后才加进去（棘轮原则）
# 例：
# - 不要在 init.sh 失败的情况下继续写代码
# - WebSocket 重连必须先恢复对话上下文，不能只重建连接
```

**棘轮原则（The Ratchet Principle）**：
> "好的 CLAUDE.md 里的每一行，都应该能追溯到一次真实发生过的错误。"
> 不要写"以防万一"的规则——它们有中性到负面的影响。

**规则分三级（Constitution Pattern）**：

| 级别 | 含义 | 示例 |
|------|------|------|
| **MUST** | 强制，无例外 | `MUST 一次只做一个功能` |
| **SHOULD** | 推荐，有理由可破例 | `SHOULD 优先用 Redis 缓存而非直接查 PG` |
| **WONT** | 禁止，即使被要求也不行 | `WONT 不经用户确认修改 feature_list.json 的依赖关系` |

### 3.2 feature_list.json — 功能的"来源真相"

**核心规则**：
- `id`、`description`、`dependencies` 是**只读**的（创建后不改）
- 只有 `status` 和 `evidence` 是**可变**的
- 修改功能描述 → 必须走受控流程（先确认再改）

**状态流转**：

```
not-started → in-progress → done
                  ↓ (最多 3 次尝试失败)
              blocked → 需要人工介入
```

**你的 feature_list.json 分析**（当前 10 个功能）：

```
feat-001 项目脚手架 ─────────────────────────────────────┐
    ↓                                                     │
feat-002 AI Agent Runtime ───┐                           │
    ↓                        ↓                            │
feat-003 P0 即时演示     feat-007 课堂广播               │
    ↓                        ↓                            │
feat-004 P1 可视化           │                            │
    ↓                        ↓                            │
feat-005 P2 模拟器    feat-008 搜索/快照/导出            │
    ↓                        ↓                            │
feat-006 测验闭环 ──────────┘                            │
    ↓                                                     │
feat-009 课纲 RAG                                         │
    ↓                                                     │
feat-010 性能优化 ←────────────────────────────────────┘
```

这 10 个功能是**按依赖关系**排列的，好的顺序是：
1. **feat-001** → 基础框架（前后端 + Docker + Redis + PG）
2. **feat-002** → AI 能力（LLM Gateway + MCP 工具链）
3. **feat-003** → 核心演示（P0 6 阶段分步讲解）
4. **feat-007** → 课堂广播（并行于 P1/P2）
5. **feat-004** → P1 可视化
6. **feat-005** → P2 模拟器
7. **feat-006** → 测验闭环
8. **feat-008** → 搜索/导出
9. **feat-009** → RAG + 风格学习
10. **feat-010** → 性能优化

### 3.3 progress.md — 跨会话的记忆

**每次会话结束前必须更新。** 更新内容：

```markdown
## Current State
**Last Updated:** 2026-06-05 14:30
**Active Feature:** feat-001 — 项目脚手架

### What's Done
- [x] FastAPI 骨架搭建（main.py + WebSocket Manager）
- [x] React 三栏布局（ConversationPanel + ChatPanel）
- [x] Docker Compose MySQL + PostgreSQL 配置

### What's In Progress
- [ ] WebSocket 重连逻辑
  - Details: 需要在断线后恢复对话上下文
  - Blockers: Redis session:active 键过期策略待确认

### What's Next
1. 完成 WebSocket 重连 + 心跳
2. 实现多对话 CRUD（REST API）
3. 前端对话列表 UI

### 失败尝试（最有价值的部分！）
- 尝试用 SSE 替代 WebSocket → 发现无法支持双向课堂广播 → 放弃
- PostgreSQL LISTEN/NOTIFY 替代 Redis Pub/Sub → 延迟不可控 → 放弃
```

### 3.4 init.sh — 一键环境验证

**每次新会话的第一条命令。** 作用：
1. 激活虚拟环境 / 安装依赖
2. 检查关键服务是否运行（Redis、PG、Docker）
3. 检查关键包是否安装
4. 报错 → Agent 先修复环境，再写代码

### 3.5 session-handoff.md — 把接力棒交给下一个自己

**不要等到快结束时才写。** 在会话过程中随时记录关键决策、失败尝试和当前位置。

最重要的部分：**失败的尝试**——这比"做了什么"更有价值，因为它避免了下一个会话重蹈覆辙。

---

## 4. 结合你的项目：DB Demo Studio 开发路线图

### 4.1 当前 Git 分支结构

```
master (仅目录结构)
 ├── project-01
 │   ├── p01-baseline ← 当前正在做的分支（Harness 已配好）
 │   └── p01-improved ← 未来改进版（可以有不同的 CLAUDE.md）
 └── project-02       ← 另一个项目
```

### 4.2 推荐的开发节奏（周计划）

#### 第 1 周：feat-001 项目脚手架

```
目标：前后端连通 + 对话基础设施可用

Day 1-2: 创建目录结构 + Docker Compose（MySQL 8.0 + PG 16）
Day 2-3: FastAPI 骨架（main.py + WebSocket Manager + 基础路由）
Day 3-4: React 三栏布局（ConversationPanel + ChatPanel + DemoPreview）
Day 4-5: WebSocket 连接/重连/心跳 + 多对话 CRUD（REST）
Day 5:   Redis 会话缓存 + PG 消息持久化

验证标准：
- [ ] 前端能连接 WebSocket，收发消息
- [ ] 对话列表能创建/切换/删除
- [ ] 刷新页面后对话恢复
- [ ] Docker 数据库启动正常
```

#### 第 2 周：feat-002 AI Agent Runtime

```
目标：AI 能响应对话并执行工具

Day 1-2: LLM Gateway（Claude + DeepSeek fallback + Prompt Caching）
Day 2-3: Orchestrator Agent 编排 + Specialist MCP 工具链骨架
Day 3-4: Agent 执行轨迹推送（agent:thinking 事件）
Day 4-5: 流式响应 + 用户打断 + 教师 Profile 加载

验证标准：
- [ ] 用户输入 SQL → AI 识别意图并响应
- [ ] 工具调用过程可见（agent:thinking + agent:tool_call）
- [ ] 用户中断后 AI 停止生成
```

...（第 3-7 周类推，对应 feature_list.json 的依赖图）

### 4.3 每个功能的标准操作流程（SOP）

```
┌─────────────────────────────────────────────────────┐
│              开始一个新功能                           │
├─────────────────────────────────────────────────────┤
│ 1. git switch p01-baseline                          │
│ 2. 读 CLAUDE.md                                     │
│ 3. 读 feature_list.json → 找到下一个未完成功能        │
│ 4. 读 progress.md → 了解上次进度                     │
│ 5. ./init.sh → 验证环境                              │
│ 6. 只做这个功能，不改其他文件                          │
│ 7. 每完成一个子任务 → 更新 progress.md               │
│ 8. 功能完成 → 跑验证 → 更新 feature_list.json        │
│ 9. git commit → 记录提交                             │
│ 10. 更新 session-handoff.md → 为下次做准备            │
└─────────────────────────────────────────────────────┘
```

---

## 5. 开发工作流：PIV 循环（Plan → Implement → Verify）

```
┌──────────────────────────────────────────┐
│              PIV 循环                      │
│                                          │
│  ① Plan（规划）                           │
│     ├─ 读 feature_list.json 选功能        │
│     ├─ 检查依赖是否满足                    │
│     └─ 明确完成标准                        │
│        ↓                                  │
│  ② Implement（实现）                      │
│     ├─ 只写这个功能需要的代码              │
│     ├─ 不重构无关代码                      │
│     └─ 每完成一个子步骤更新 progress.md     │
│        ↓                                  │
│  ③ Verify（验证）                         │
│     ├─ 跑测试（pytest + vitest）           │
│     ├─ 端到端验证（不是只看单元测试）       │
│     ├─ 检查回归（改了共享模块？跑相关测试） │
│     └─ 通过 → 标记完成，不通过 → 回到 ②    │
│        ↓                                  │
│  重复下一个功能                            │
└──────────────────────────────────────────┘
```

**三层验证时机**：

| 时机 | 验证内容 | 耗时目标 |
|------|---------|---------|
| 每次编辑后 | Linter / Formatter | < 1 秒 |
| 功能完成时 | 单元测试 + 端到端验证 | < 10 秒 |
| 会话结束前 | 全量回归测试 | < 1 分钟 |
| 提交前 | 全量测试 + 架构检查 | < 2 分钟 |

**关键规则**：
> "不要相信 Agent 的自我评估。只相信自动化测试输出。"
> 功能不能标记 `done`，除非有通过的端到端测试作为证据。

---

## 6. 会话交接：跨会话不丢上下文

### 6.1 问题

AI Agent 有有限的上下文窗口。会话切换最常见的失败模式：

1. **遗忘** — 不知道上次做到了哪里
2. **重复** — 重新做已经完成的工作
3. **踩坑** — 再次尝试上次已经失败的方案
4. **谎报** — 声称完成但实际没完成

### 6.2 解决方案：四件套交接

```
CLAUDE.md              持久化：项目约定（每次会话都读）
progress.md            当前进度（完成/进行中/下一步）
feature_list.json       功能状态（not-started/in-progress/done）
session-handoff.md     会话快照（具体到文件:行号 + 失败原因）
```

### 6.3 一个好的 handoff 长什么样

❌ **差的交接**：
```
继续做 JOIN 查询功能。上次做了一些后端工作。
```

✅ **好的交接**：
```
## 当前状态
- 分支: p01-baseline, feat-003 (P0 即时演示)
- 编译: ✅ | 测试: 23/25 通过（2 个失败在 test_ws_reconnect.py:45）

## 已完成
- ✅ WebSocket Manager 基础框架 (backend/app/ws/manager.py)
- ✅ chat:message 和 chat:interrupt 事件处理
- ✅ 前端 ChatPanel 消息流渲染

## 未完成
- [ ] step:preview 流式推送 → 见 backend/app/ws/handlers.py:78
- [ ] 用户打断后恢复上下文 → 需要存 Redis session:active:{convId}

## 失败的尝试
- 用 asyncio.Queue 做消息缓冲 → WebSocket disconnect 时丢消息 → 改为 Redis List
- 前端用 EventSource (SSE) → 不支持双向 → 确认用 WebSocket

## 恢复步骤
1. 读 progress.md 和 feature_list.json
2. cd backend && uvicorn app.main:app --reload
3. 从 backend/app/ws/handlers.py:78 开始实现 step:preview
```

---

## 7. 多分支协作：baseline vs improved

你的分支结构天然支持 **Harness A/B 对比**：

### 7.1 baseline 分支策略

```
p01-baseline:
  目标：按部就班，遵循 requirements-spec.md 的标准架构
  CLAUDE.md: 严格的 MUST/SHOULD/WONT 规则
  feature_list.json: 10 个功能按依赖顺序
  init.sh: 标准环境
```

### 7.2 improved 分支策略

```
p01-improved:
  目标：探索更好的架构或更快的实现方式
  CLAUDE.md: 更宽松的策略，允许 Agent 提出架构改进
  feature_list.json: 可以和 baseline 不同——也许把某些功能合并
  init.sh: 可以用不同的工具栈（比如试试 uv 替代 pip）
```

### 7.3 对比方法

两个分支做完后，用 `validate-harness.mjs` 审计：

```bash
# 在 p01-baseline 上
git switch p01-baseline
node ~/.claude/skills/harness-creator/scripts/validate-harness.mjs --target .

# 在 p01-improved 上  
git switch p01-improved
node ~/.claude/skills/harness-creator/scripts/validate-harness.mjs --target .
```

对比五个子系统的评分，找到哪个方案更有效。

---

## 8. 常见错误 & 避坑指南

### 8.1 CLAUDE.md 常见错误

| ❌ 错误做法 | ✅ 正确做法 |
|------------|-----------|
| 写到 300+ 行，什么都想告诉 Agent | 保持 70-150 行，只写 Agent 发现不了的 |
| 复制 `package.json` 里的依赖列表 | Agent 自己能读 `package.json` |
| 写"万一有用"的规则 | 只在 Agent 犯错后才加规则（棘轮原则） |
| 全是正面引导"应该做 X" | 优先负面约束"不要做 X"——对 LLM 信号更强 |
| 用 AI 自动生成 CLAUDE.md | 人写的规则比 AI 生成的好 17pp |

### 8.2 feature_list.json 常见错误

| ❌ 错误做法 | ✅ 正确做法 |
|------------|-----------|
| 功能描述太模糊（"做登录功能"）| 明确完成标准（"用户可以输入邮箱密码登录，跳转到仪表盘"）|
| 做完功能不改 status | 做完立即改 + 填写 evidence |
| 同时做多个功能 | 一次只做一个 |
| 做完不改，继续加新功能 | 功能完成 → 验证 → 标记 → 提交 → 再做下一个 |
| 直接改依赖关系或描述 | 创建新功能条目，旧的不改 |

### 8.3 会话管理常见错误

| ❌ 错误做法 | ✅ 正确做法 |
|------------|-----------|
| 不写 handoff，依赖聊天记忆 | 每次结束前更新 progress.md + handoff |
| 环境坏了还在写代码 | 先跑 `./init.sh`，修复环境再开发 |
| 一次会话做太多事 | 1 个会话 = 0.5-1 个功能 |
| 不提交就切分支 | 先提交或 stash |
| 信任 Agent 的"我做完了" | 只看测试结果，不信口头承诺 |

### 8.4 Harness 演进常见错误

| ❌ 错误做法 | ✅ 正确做法 |
|------------|-----------|
| 一开始就建完整 Harness | 从最小五件套开始，逐渐加 |
| Harness 只建不维护 | 每周回顾一次，删掉不再需要的，加上新发现的问题 |
| 所有项目用同一套 Harness | 每个项目/分支可以有不同配置 |
| 盲目跟教程 | 你的实际情况优先于教程 |

---

## 9. 检查清单：你的项目现在处于什么阶段

### ✅ 已就绪

- [x] Git 仓库 + 分支体系（master / project-01 / p01-baseline / p01-improved / project-02）
- [x] `CLAUDE.md`（React + FastAPI + WebSocket 技术栈，完整规则）
- [x] `feature_list.json`（10 个功能，带依赖关系）
- [x] `init.sh`（前后端 + Docker 环境检测）
- [x] `progress.md`（初始会话日志）
- [x] `session-handoff.md`（交接模板）
- [x] `docs/requirements-spec.md`（v5 完整规格说明书）

### 🔜 建议创建

- [ ] `docs/ARCHITECTURE.md` — 在实现 feat-001 过程中，记录架构决策
- [ ] `clean-state-checklist.md` — 在 feat-001 完成后创建（参考 P3 的 49 项检查）
- [ ] `scripts/check-architecture.sh` — 在 feat-003 后创建（架构边界守卫）

### 🎯 下一步行动

```
1. 保持在 p01-baseline 分支
2. 开始 feat-001：项目脚手架
   ├─ 创建目录结构（frontend/, backend/, docker/, mcp-servers/）
   ├─ Docker Compose 配置
   ├─ FastAPI 骨架 + WebSocket Manager
   ├─ React 三栏布局
   └─ Redis + PG 连接
3. 每完成一个子步骤 → 更新 progress.md
4. 功能完成 → 跑验证 → 更新 feature_list.json → git commit
5. 进入 feat-002
```

---

## 附录：参考资源

- **harness-creator skill**：`D:\AgentSkill\harness-creator\`（你已全局安装）
- **参考项目**：`D:\AI_Projects\01_Research\Harness_System\learn-harness-engineering\projects\`
- **需求规格说明书**：`Project_01\docs\requirements-spec.md`
- **harness-creator 脚本文档**：[GitHub - walkinglabs/learn-harness-engineering](https://github.com/walkinglabs/learn-harness-engineering)

---

> **最后一条建议**：Harness 工程是一个持续的过程（像 SRE），不是一次性设置。最好的团队每年重写 Harness 3-5 次——而且每次重写都是在**删减**，不是堆砌。目标不是"全"，而是"准"。
