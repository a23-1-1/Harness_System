"""
DB Demo Studio — Mermaid 生成 MCP 服务器

根据 SQL 分析和演示阶段描述，生成 Mermaid 图代码。
支持：流程图 (flowchart)、ER 图 (erDiagram)、时序图 (sequenceDiagram)。
"""
import logging

logger = logging.getLogger(__name__)


def generate_mermaid(sql_analysis: dict, stage: str = "") -> dict:
    """基于 SQL 分析结果生成 Mermaid 代码"""
    tables = sql_analysis.get("tables", [])
    columns = sql_analysis.get("columns", [])
    keywords = sql_analysis.get("keywords", [])
    join_type = sql_analysis.get("join_type", "")

    table_names = [t["name"] for t in tables]
    join_clause = f" ({join_type})" if join_type else ""

    # 根据不同阶段生成不同 Mermaid 图
    if stage == "lex":
        # 词法分析 — 流程图展示 token 序列（须用节点 ID，不能写 ["SELECT"] 匿名链）
        kws = keywords[:6] or ["SELECT", "FROM", "WHERE"]
        node_lines = "\n  ".join(f'  T{i}["{kw}"]' for i, kw in enumerate(kws))
        edge_lines = "\n  ".join(f"  T{i} --> T{i + 1}" for i in range(len(kws) - 1))
        mermaid = f"flowchart LR\n{node_lines}\n{edge_lines}\n  style T0 fill:#2563eb,color:#fff"
        diagram_type = "flowchart"
        description = f"SQL 关键字识别流程{join_clause}"

    elif stage == "parse":
        # 语法解析 — ER 图展示表关系
        if table_names:
            er_rels = "\n  ".join(
                f"{table_names[0]} ||--o{{ {t} : \"references\"" for t in table_names[1:]
            ) if len(table_names) > 1 else f"{table_names[0]} {{ -- 表"
            mermaid = f"erDiagram\n  {er_rels}" if len(table_names) > 1 else f"flowchart LR\n  {table_names[0]}"
        else:
            mermaid = "flowchart LR\n  A[输入] --> B[解析]"
        diagram_type = "erDiagram" if len(table_names) > 1 else "flowchart"
        description = f"表关系与语法结构{join_clause}"

    elif stage == "optimize":
        # 查询优化 — 决策树展示策略选择
        strategies = ["全表扫描", "索引扫描"]
        if join_type:
            strategies = [join_type, "Hash Join", "Sort Merge Join"]
        nodes = "\n  ".join(
            f"  S{i}[{s}]" for i, s in enumerate(strategies)
        )
        edges = "\n  ".join(
            f"  Optimizer --> S{i}" for i in range(len(strategies))
        )
        mermaid = f"flowchart TD\n{nodes}\n{edges}"
        diagram_type = "flowchart"
        description = f"优化器策略选择 — 代价对比"

    elif stage == "plan":
        # 执行计划 — 树形结构展示计划
        if join_type:
            mermaid = f"""flowchart TD
  Root["执行计划{join_clause}"]
  Root --> A["驱动表: {table_names[0] if table_names else '?'}"]
  Root --> B["探测表: {table_names[1] if len(table_names) > 1 else '?'}"]
  A --> A1["扫描方式: 索引/全表"]
  B --> B1["扫描方式: 索引/全表"]
  Root --> Join["{join_type}"]
  Join --> Result["结果集"]"""
        else:
            tbl = table_names[0] if table_names else "表"
            mermaid = f"""flowchart TD
  Scan["Table Scan: {tbl}"]
  Filter["Filter: 条件过滤"]
  Result["Project: 结果集"]
  Scan --> Filter --> Result"""
        diagram_type = "flowchart"
        description = f"执行计划树{join_clause}"

    elif stage == "execute":
        # 执行过程 — 顺序图展示数据流（participant 使用安全别名）
        table_a = table_names[0] if table_names else "表A"
        table_b = table_names[1] if len(table_names) > 1 else "表B"
        mermaid = f"""sequenceDiagram
    participant Storage as 存储引擎
    participant T1 as {table_a}
    participant T2 as {table_b}
    Storage->>T1: 扫描数据页
    T1-->>Storage: 返回匹配行
    Storage->>T2: 探测匹配
    T2-->>Storage: 返回结果
    Storage->>Storage: 组装结果集"""
        diagram_type = "sequenceDiagram"
        description = f"执行过程数据流{join_clause}"

    else:
        # result 或其他 — 汇总图
        cols = columns[:4]
        col_list = ", ".join(cols) if cols else "*"
        mermaid = f"""flowchart LR
  subgraph 结果
    direction LR
    R1["行1: {col_list[:30]}"]
    R2["行2: ..."]
    R3["行N: ..."]
  end
  input["SQL查询"] --> Result["{len(table_names)} 表关联"]
  Result --> 结果"""
        diagram_type = "flowchart"
        description = f"查询结果分析 — {len(table_names)} 表{join_clause}"

    return {
        "mermaid": mermaid,
        "diagram_type": diagram_type,
        "description": description,
    }
