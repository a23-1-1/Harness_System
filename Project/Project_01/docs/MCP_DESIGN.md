# DB Demo Studio — MCP 工具层设计说明

> 最后更新：2026-06-12  
> 适用代码路径：`Project/Project_01/backend/app/mcp/`

---

## 1. 什么是 MCP？在本项目里指什么？

**MCP（Model Context Protocol）** 的本意是：把「可执行的专业能力」从 LLM 里拆出来，变成**可注册、可发现、可调用**的工具，由 Agent 按意图选用。

在 DB Demo Studio 中，MCP 层解决的核心问题是：

| 问题 | 没有 MCP 时 | 有 MCP 后 |
|------|------------|----------|
| SQL 结构分析 | LLM 可能猜错表名/JOIN 类型 | `sql_analyze` 用 sqlparse 给出确定性结果 |
| EXPLAIN 计划 | LLM 编造执行计划 | `explain_mysql` / `explain_postgres` 连真实数据库 |
| 图表生成 | LLM 常产出无效 Mermaid | `mermaid_gen` 按阶段模板生成可渲染代码 |
| P2 模拟器 | LLM 难以输出稳定动画 JSON | `simulator_*` 生成前端 D3 可直接消费的 `simConfig` |

**一句话**：MCP 是 **Orchestrator Agent 的「专业工具箱」**——LLM 负责讲解与编排，MCP 负责**算得准、连得上、格式对**。

---

## 2. 架构总览

```
用户消息 (WebSocket chat:message)
        │
        ▼
┌───────────────────────────────────────────────────────────┐
│  Orchestrator Agent (backend/app/agents/orchestrator.py)   │
│  · 意图识别（SQL / 模拟器 / 普通知识点）                    │
│  · 选择工具链或直接走 LLM                                   │
│  · 组装 steps → step:preview → demo:complete               │
└───────────────┬─────────────────────────┬─────────────────┘
                │                         │
                ▼                         ▼
┌───────────────────────────┐   ┌─────────────────────────────┐
│  MCP 工具层                │   │  LLM Gateway                 │
│  registry + servers        │   │  (Claude / DeepSeek)         │
│  确定性、可测试、可替换      │   │  自然语言讲解、步骤叙事        │
└───────────────┬───────────┘   └─────────────────────────────┘
                │
    ┌───────────┼───────────┬──────────────┬────────────────┐
    ▼           ▼           ▼              ▼                ▼
 sql_analyze  explain_*  mermaid_gen   simulator_*      (可扩展)
    │           │           │              │
    ▼           ▼           │              ▼
 sqlparse    MySQL:3308     │         simConfig JSON
             PG:5433        │              │
                             ▼              ▼
                      Mermaid 代码    前端 SimulatorPreview
```

### 2.1 代码模块职责

| 模块 | 路径 | 职责 |
|------|------|------|
| **注册表** | `mcp/registry.py` | 工具注册、按名调用、列出 schema；全局单例 `mcp_registry` |
| **客户端** | `mcp/client.py` | 对外的 `call_tool()` / `list_tools()` 薄封装 |
| **服务器实现** | `mcp/servers/*.py` | 各工具的具体逻辑（单职责） |
| **启动注册** | `mcp/servers/__init__.py` | `register_all_tools()`，在 `main.py` 生命周期里调用 |
| **编排消费** | `agents/orchestrator.py` | 根据用户输入决定调用哪些工具、如何把结果喂给 LLM/前端 |

### 2.2 实现形态说明（重要）

`AGENTS.md` / `ARCHITECTURE.md` 中的**目标形态**是：

> 每个 MCP 服务器是**独立进程**，通过 stdin/stdout JSON-RPC 通信，可热插拔。

**当前实现（v1）** 是 **进程内注册表（In-Process Registry）**：

- 工具是 Python 函数，注册在 `McpRegistry` 字典里
- 启动时 `register_all_tools()` 一次性加载
- **没有**单独的子进程或 JSON-RPC 线协议

这样设计的原因：

1. 教学演示项目优先**快速集成、易调试**
2. 工具边界已按 MCP **语义**拆分（注册名、schema、单职责），便于日后抽成独立进程
3. `registry.call(name, **kwargs)` 接口与真正 MCP Client 对齐，迁移成本低

| 维度 | 文档目标 | 当前实现 |
|------|---------|---------|
| 进程隔离 | 独立进程 | 同进程 Python 模块 |
| 协议 | JSON-RPC over stdio | 直接函数调用 |
| 热插拔 | 不重启后端 | 需重启（或动态 `register()`） |
| 工具发现 | MCP list_tools | `mcp_registry.list_tools()` |

---

## 3. 工具清单（8 个已注册）

启动日志示例：`MCP 工具初始化完成，已注册 8 个工具`

| 注册名 | 源文件 | 类型 | 主要输入 | 主要输出 |
|--------|--------|------|---------|---------|
| `sql_analyze` | `servers/sql_analyze.py` | 同步 | `sql: str` | `tables`, `columns`, `keywords`, `join_type` |
| `explain_mysql` | `servers/explain_engine.py` | 异步 | `sql: str` | MySQL `EXPLAIN FORMAT=JSON` 结果 |
| `explain_postgres` | `servers/explain_engine.py` | 异步 | `sql: str` | PostgreSQL `EXPLAIN (FORMAT JSON)` 结果 |
| `mermaid_gen` | `servers/mermaid_gen.py` | 同步 | `sql_analysis`, `stage` | `mermaid`, `diagram_type`, `description` |
| `simulator_bplus_tree` | `servers/simulator_engine.py` | 同步 | `operation`, `key`, `order` | `steps[]` + `simConfig` |
| `simulator_transaction` | `servers/simulator_engine.py` | 同步 | `isolation_level`, `scenario` | 双会话时间线 `steps[]` |
| `simulator_sql_execution` | `servers/simulator_engine.py` | 同步 | `sql`, `join_type`, `tables` | JOIN 分步执行动画 |
| `simulator_strategy_compare` | `servers/simulator_engine.py` | 同步 | `sql`, `tables` | 多策略对比数据 |

每个工具注册时都带有 **JSON Schema** 描述（见 `servers/__init__.py`），供未来 Agent 自动选型或 UI 展示。

---

## 4. 各工具详解

### 4.1 `sql_analyze` — SQL 结构分析

**作用**：把用户输入的 SQL 解析成结构化事实，供后续 LLM 与 `mermaid_gen` 使用。

**实现**：`sqlparse` 遍历 token 流，提取：

- `tables`：FROM 子句中的表名
- `columns`：SELECT / WHERE 中的列
- `keywords`：SQL 关键字序列（用于词法分析阶段图）
- `join_type`：`INNER/LEFT/RIGHT/FULL/CROSS JOIN` 检测

**特点**：纯本地、无网络、毫秒级；不执行 SQL，无副作用。

---

### 4.2 `explain_mysql` / `explain_postgres` — 真实 EXPLAIN 引擎

**作用**：在 Docker 中的**专用 EXPLAIN 数据库**上执行只读 `EXPLAIN`，返回真实执行计划 JSON。

**连接目标**（默认端口，见 `docker-compose.yml`）：

| 引擎 | 容器 | 宿主机端口 |
|------|------|-----------|
| MySQL 8.0 | `mysql-explain` | 3308 |
| PostgreSQL 16 | `pgexplain` | 5433 |

**安全**：仅允许 `SELECT/WITH/EXPLAIN/...` 白名单；拒绝写操作。

**依赖**：`aiomysql` / `asyncpg`（可选安装；未安装时返回友好错误）。

**当前接入状态**：已在注册表注册，**Orchestrator 主流程尚未自动调用**（见 §6 差距说明）。可在后续把 EXPLAIN 结果注入 `llm_gateway.generate_demo()` 的上下文。

---

### 4.3 `mermaid_gen` — 按阶段生成 Mermaid

**作用**：根据 `sql_analyze` 结果 + P0 六阶段（`lex/parse/optimize/plan/execute/result`），生成对应类型的 Mermaid 代码。

**阶段 → 图类型映射**：

| stage | 图类型 | 内容示例 |
|-------|--------|---------|
| `lex` | flowchart LR | 关键字 token 链 `T0["SELECT"] --> T1["FROM"]` |
| `parse` | erDiagram / flowchart | 表关系 |
| `optimize` | flowchart TD | 优化策略决策树 |
| `plan` | flowchart TD | 执行计划算子树 |
| `execute` | sequenceDiagram | 存储引擎与表的数据流 |
| `result` | flowchart LR | 结果集概览 |

**接入点**：`orchestrator.py` 在 LLM 生成 steps 后，对**缺少 `mermaid` 字段的步骤**自动补图。

---

### 4.4 `simulator_*` — P2 专业模拟器数据层

**作用**：生成带 `simConfig` 的 `steps[]`，前端 `SimulatorPreview` + D3 直接渲染。

| 工具 | 教学场景 |
|------|---------|
| `simulator_bplus_tree` | B+ 树插入/删除/查找与分裂动画 |
| `simulator_transaction` | 事务隔离（幻读、脏读等）双会话对比 |
| `simulator_sql_execution` | Nested Loop / Hash Join 分步执行 |
| `simulator_strategy_compare` | 多种 JOIN 策略代价对比 |

**接入点**：`orchestrator._detect_simulator_intent()` 识别关键词（如「B+树」「事务」「JOIN 执行」）后**短路 LLM**，直接返回模拟器 steps。

---

## 5. 在项目中的调用流程

### 5.1 应用启动

```python
# main.py lifespan
register_all_tools()  # → mcp/servers/__init__.py
```

### 5.2 用户发消息后的 Orchestrator 流水线

```
chat:message
    │
    ├─ 含 SQL？ ──yes──► analyze_sql()          [MCP: sql_analyze，直接 import]
    │                      │
    │                      └──► sql_analysis 传入 llm_gateway.generate_demo()
    │
    ├─ 模拟器意图？ ──yes──► simulate_*()       [MCP: simulator_*，直接 import]
    │                      │
    │                      └──► 跳过 LLM，_send_simulator_result() → demo:complete
    │
    └─ 默认 ──► llm_gateway.generate_demo()     [LLM 生成 6 阶段讲解]
                    │
                    └──► 每步若无 mermaid ──► generate_mermaid()  [MCP: mermaid_gen]
                              │
                              └──► step:preview (含 mermaid) → demo:complete
```

### 5.3 与前端的关系

| MCP 输出字段 | 前端消费位置 |
|-------------|-------------|
| `steps[].content` / `title` | `DemoPreview` 播放/页面视图 |
| `steps[].mermaid` | `MermaidRenderer` + `mermaidSanitize.ts` |
| `steps[].simConfig` | `SimulatorPreview` + D3 hooks |
| `demo:complete` | `App.tsx` 演示状态总线 |

MCP **不直接面向浏览器**；一律经 WebSocket 事件（`step:preview` / `demo:complete`）下发。

### 5.4 与 LLM 的分工

| 能力 | 负责方 |
|------|--------|
| 教学叙事、通俗讲解、互动提示 | LLM Gateway |
| 表名/JOIN 类型/关键字序列 | `sql_analyze` |
| 可渲染的流程图代码 | `mermaid_gen`（LLM 也可生成，后端会补全） |
| 动画数据结构 | `simulator_*` |
| 真实执行计划 | `explain_*`（已注册，待主流程接入） |

---

## 6. 当前差距与演进方向

### 6.1 已落地

- [x] 8 个工具注册 + 启动日志
- [x] `sql_analyze` → LLM 上下文 + `mermaid_gen` 补图
- [x] 四条模拟器短路路径
- [x] EXPLAIN 引擎实现 + Docker 双库

### 6.2 待完善

| 项 | 说明 |
|----|------|
| `explain_mysql/postgres` 未入主路径 | 注册表有，Orchestrator 未在生成演示前 `await mcp_registry.call("explain_mysql", ...)` |
| 未统一走 `mcp_registry.call()` | Orchestrator 多处**直接 import 函数**，`client.py` 未被使用 |
| 无 `agent:tool_call` 事件 | 前端轨迹未展示「正在调用 sql_analyze」等（仅有 `agent:thinking`） |
| 进程外 MCP | 仍为 in-process；与 AGENTS.md「独立进程」目标不一致 |
| 文档中的 `curriculum-rag` / `tts-engine` | 规划项，尚无对应 `servers/` 实现（课纲搜索在 REST `curriculum.py`） |

### 6.3 推荐演进路线

1. **短期**：Orchestrator 统一通过 `call_tool()` 调用；EXPLAIN 结果注入 LLM prompt  
2. **中期**：WebSocket 推送 `agent:tool_call` 展示工具轨迹  
3. **长期**：将 `explain_engine` 等拆为独立 MCP 子进程，stdin/stdout JSON-RPC，真热插拔  

---

## 7. 如何新增一个 MCP 工具

1. 在 `backend/app/mcp/servers/` 新建模块，例如 `my_tool.py`：

```python
async def my_tool(arg: str) -> dict:
    return {"result": arg}
```

2. 在 `servers/__init__.py` 的 `register_all_tools()` 中注册：

```python
mcp_registry.register(
    name="my_tool",
    handler=my_tool,
    description="工具说明",
    schema={"type": "object", "properties": {"arg": {"type": "string"}}, "required": ["arg"]},
)
```

3. 在 `orchestrator.py` 中按意图调用：

```python
from app.mcp.client import call_tool
result = await call_tool("my_tool", arg="...")
```

4. 若输出需前端展示，扩展 `step:preview` payload 或 `simConfig` 约定，并更新 `frontend/src/types.d.ts`。

---

## 8. MCP 与能力等级（P0 / P1 / P2）对应关系

| 能力等级 | 用户感知 | 主要 MCP 工具 |
|---------|---------|--------------|
| **P0 即时演示** | 6 阶段文字讲解 + 基础图 | `sql_analyze`, `mermaid_gen` |
| **P1 轻量可视化** | EXPLAIN + 图表精修 | `explain_mysql`, `explain_postgres`, `mermaid_gen` |
| **P2 专业模拟器** | B+树/事务/SQL 动画 | `simulator_bplus_tree`, `simulator_transaction`, `simulator_sql_execution`, `simulator_strategy_compare` |

---

## 9. 相关文件索引

```
backend/app/mcp/
├── registry.py              # McpRegistry 类 + mcp_registry 单例
├── client.py                # call_tool / list_tools
└── servers/
    ├── __init__.py          # register_all_tools()
    ├── sql_analyze.py       # sqlparse 分析
    ├── explain_engine.py    # MySQL/PG EXPLAIN
    ├── mermaid_gen.py       # 阶段化 Mermaid
    └── simulator_engine.py  # P2 模拟器

backend/app/agents/orchestrator.py   # 工具编排入口
backend/app/llm/gateway.py         # sql_analysis 注入 LLM
backend/app/main.py                  # 启动时 register_all_tools()
frontend/src/components/DemoPreview/ # mermaid 渲染
frontend/src/components/DemoPreview/SimulatorPreview.tsx
```

---

## 10. 总结

DB Demo Studio 的 MCP 层是 **「确定性工具 + 可扩展注册」** 架构：

- **设计上** 对齐 MCP 思想：工具单职责、可发现、与 LLM 解耦  
- **实现上** 当前为 Python 进程内注册表，8 个工具覆盖 SQL 分析、EXPLAIN、图表、模拟器  
- **作用上** 让演示内容**可验证、可渲染、可动画**，而不是纯 LLM 幻觉  
- **演进上** 接口已预留，可逐步改为独立进程并接通 EXPLAIN 主路径  

如需修改 MCP 行为，优先阅读：`orchestrator.py`（何时调用）→ 对应 `servers/*.py`（怎么做）→ `registry.py`（怎么注册）。
