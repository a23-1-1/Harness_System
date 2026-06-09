"""
DB Demo Studio — 模拟器引擎 MCP 服务器

为三个 P2 模拟器生成结构化配置数据：
1. B+树模拟器（插入/删除/查找动画）
2. 事务隔离级别模拟器（RR 幻读、锁竞争）
3. SQL 分步执行模拟器

每个模拟器返回的前端可消费的 steps 数组，
每步包含 simConfig 字段对齐前端 SimulatorPreview 读取路径。
"""
import logging
import math

logger = logging.getLogger(__name__)


def _median_of_sorted(arr: list[int]) -> int:
    """返回有序列表的中位数（用于 B+树分裂）"""
    return arr[len(arr) // 2]


def simulate_bplus_tree(operation: str = "insert", key: int = 42, order: int = 4) -> dict:
    """B+树模拟器：生成插入/删除/查找的逐步动画数据

    Args:
        operation: insert | delete | search
        key: 操作的目标键值
        order: B+树阶数（每个节点最多 order 个键）
    """
    steps = []
    if operation == "insert":
        # 初始叶子节点 [5, 15, 25, 35]，插入 42 → [5, 15, 25, 35, 42]
        after_insert = sorted([5, 15, 25, 35, key])
        mid = _median_of_sorted(after_insert)  # 25
        left_keys = [k for k in after_insert if k < mid]  # [5, 15]
        right_keys = [k for k in after_insert if k >= mid]  # [25, 35, 42] (中位数保留在右叶子)
        steps = [
            {"index": 1, "title": "查找插入位置",
             "content": f"从根节点开始遍历，比较键值 {key}，确定应插入到目标叶子节点",
             "simConfig": {"action": "traverse", "nodes": [
                 {"id": "root", "keys": [10, 20, 30], "type": "internal", "highlight": True}],
             }},
            {"index": 2, "title": f"插入键 {key}",
             "content": f"在目标叶子节点中插入键 {key}，叶子节点变为 {after_insert}",
             "simConfig": {"action": "insert", "nodes": [
                 {"id": "leaf", "keys": after_insert, "type": "leaf", "highlight": True}],
             }},
            {"index": 3, "title": "节点分裂",
             "content": f"节点键数 {len(after_insert)} 超过阶数上限 {order}，以中位数 {mid} 为界分裂",
             "simConfig": {"action": "split", "splitKey": mid, "nodes": [
                 {"id": "leaf_left", "keys": left_keys, "type": "leaf", "highlight": True},
                 {"id": "leaf_right", "keys": right_keys, "type": "leaf"},
             ]}},
            {"index": 4, "title": "父节点更新",
             "content": f"将中位数 {mid} 上推到父节点，父节点指针指向左右子节点",
             "simConfig": {"action": "promote", "nodes": [
                 {"id": "root", "keys": [mid, 30], "children": ["leaf_left", "leaf_right"], "type": "internal", "highlight": True},
                 {"id": "leaf_left", "keys": left_keys, "type": "leaf"},
                 {"id": "leaf_right", "keys": right_keys, "type": "leaf"},
             ]}},
            {"index": 5, "title": f"插入完成",
             "content": f"B+树结构已更新，键 {key} 位于右侧叶子节点",
             "simConfig": {"action": "complete", "nodes": [
                 {"id": "root", "keys": [mid, 30], "type": "internal"},
                 {"id": "leaf_left", "keys": left_keys, "type": "leaf"},
                 {"id": "leaf_right", "keys": right_keys, "type": "leaf", "highlight": True},
             ]}},
        ]
    elif operation == "delete":
        after_delete = [5, 15, 25, 35]  # 删除前的叶子内容
        if key in after_delete:
            after_delete.remove(key)
        steps = [
            {"index": 1, "title": f"查找键 {key}", "content": f"从根节点遍历到目标叶子节点查找键 {key}",
             "simConfig": {"action": "traverse", "nodes": [
                 {"id": "root", "keys": [10, 20, 30], "type": "internal"},
                 {"id": "leaf", "keys": sorted(after_delete + [key]), "type": "leaf", "highlight": True},
             ]}},
            {"index": 2, "title": f"删除键 {key}", "content": f"在叶子节点中删除键 {key}，叶子变为 {after_delete}",
             "simConfig": {"action": "delete", "nodes": [
                 {"id": "leaf", "keys": after_delete, "type": "leaf", "highlight": True}],
             }},
            {"index": 3, "title": "重新分布", "content": "节点键数未低于下限，无需合并",
             "simConfig": {"action": "redistribute", "nodes": [
                 {"id": "leaf", "keys": after_delete, "type": "leaf"}],
             }},
            {"index": 4, "title": "删除完成", "content": f"键 {key} 已删除",
             "simConfig": {"action": "complete", "nodes": [
                 {"id": "root", "keys": [10, 20, 30], "type": "internal"},
                 {"id": "leaf", "keys": after_delete, "type": "leaf"}],
             }},
        ]
    elif operation == "search":
        steps = [
            {"index": 1, "title": "从根节点遍历", "content": f"在根节点中二分查找键 {key} 的走向",
             "simConfig": {"action": "traverse", "nodes": [
                 {"id": "root", "keys": [10, 20, 30], "type": "internal", "highlight": True}],
             }},
            {"index": 2, "title": f"找到键 {key}", "content": f"在叶子节点中找到键 {key}，返回对应的值",
             "simConfig": {"action": "found", "nodes": [
                 {"id": "leaf", "keys": [5, 15, key, 25, 35], "type": "leaf", "highlight": True}],
             }},
        ]

    return {
        "simulator_type": "bplus_tree",
        "title": f"B+树 {operation} 操作演示",
        "operation": operation,
        "order": order,
        "key": key,
        "steps": steps,
        "total_steps": len(steps),
    }


def simulate_transaction(isolation_level: str = "READ COMMITTED", scenario: str = "phantom_read") -> dict:
    """事务隔离级别模拟器

    幻读在所有 < SERIALIZABLE 的级别下都可能发生。
    REPEATABLE READ 在标准 SQL 中通过间隙锁（gap lock）可防止幻读，
    但 MySQL InnoDB 的 RR 级别在特定条件下仍可能出现幻读（如快照读 vs 当前读）。
    本模拟器以 READ COMMITTED 为默认展示更典型的幻读场景。

    Args:
        isolation_level: READ UNCOMMITTED | READ COMMITTED | REPEATABLE READ | SERIALIZABLE
        scenario: phantom_read | dirty_read | non_repeatable_read | lock_wait
    """
    if scenario == "phantom_read":
        sessions = [
            {
                "id": "会话 A",
                "color": "#3b82f6",
            },
            {
                "id": "会话 B",
                "color": "#ef4444",
            },
        ]
        steps = [
            {"index": 1, "title": "会话 A 开始事务",
             "content": f"会话 A 执行 BEGIN，进入 {isolation_level} 隔离级别",
             "simConfig": {"action": "begin", "sessions": sessions,
                           "activeSqls": [{"session": 0, "sql": "BEGIN;", "result": "事务开始"}]}},
            {"index": 2, "title": "会话 A 查询",
             "content": "SELECT 返回 score > 80 的 3 行数据",
             "simConfig": {"action": "query", "sessions": sessions,
                           "activeSqls": [{"session": 0, "sql": "SELECT * FROM students WHERE score > 80;", "result": "返回 3 行"}]}},
            {"index": 3, "title": "会话 B 插入新行并提交",
             "content": "会话 B 插入一条 score=95 的新记录并提交",
             "simConfig": {"action": "insert", "sessions": sessions,
                           "activeSqls": [{"session": 1, "sql": "INSERT INTO students (score) VALUES (95); COMMIT;", "result": "插入成功"}]}},
            {"index": 4, "title": "会话 A 再次查询（幻读）",
             "content": f"在 {isolation_level} 级别下，会话 A 再次查询发现返回 4 行——比第一次多了一行幻影行",
             "simConfig": {"action": "phantom", "sessions": sessions,
                           "activeSqls": [{"session": 0, "sql": "SELECT * FROM students WHERE score > 80;", "result": "返回 4 行（幻读！）", "highlight": True}]}},
            {"index": 5, "title": "会话 A 提交",
             "content": "事务结束",
             "simConfig": {"action": "commit", "sessions": sessions,
                           "activeSqls": [{"session": 0, "sql": "COMMIT;"}]}},
        ]
    elif scenario == "dirty_read":
        sessions = [
            {"id": "会话 A", "color": "#3b82f6"},
            {"id": "会话 B", "color": "#ef4444"},
        ]
        steps = [
            {"index": 1, "title": "会话 A 修改数据未提交",
             "content": "会话 A 将 id=1 的 score 改为 100，未提交",
             "simConfig": {"action": "update", "sessions": sessions,
                           "activeSqls": [{"session": 0, "sql": "BEGIN; UPDATE students SET score=100 WHERE id=1;"}]}},
            {"index": 2, "title": "会话 B 读到未提交数据",
             "content": f"在 {isolation_level} 下，会话 B 读到了未提交的 100（脏读）",
             "simConfig": {"action": "dirty_read", "sessions": sessions,
                           "activeSqls": [{"session": 1, "sql": "SELECT score FROM students WHERE id=1;", "result": "读到 100（脏读！）", "highlight": True}]}},
            {"index": 3, "title": "会话 A 回滚",
             "content": "会话 A 执行 ROLLBACK，修改作废",
             "simConfig": {"action": "rollback", "sessions": sessions,
                           "activeSqls": [{"session": 0, "sql": "ROLLBACK;", "result": "修改已撤销"}]}},
            {"index": 4, "title": "会话 B 数据已无效",
             "content": "会话 B 之前读到的 100 是脏数据，业务逻辑出错",
             "simConfig": {"action": "invalid", "sessions": sessions}},
        ]
    else:
        sessions = []
        steps = [{"index": 1, "title": "场景待实现",
                  "content": f"场景 {scenario} 的定义尚未完成",
                  "simConfig": {"action": "unknown", "sessions": []}}]

    return {
        "simulator_type": "transaction",
        "title": f"事务隔离级别演示 — {scenario}@{isolation_level}",
        "isolation_level": isolation_level,
        "scenario": scenario,
        "sessions": sessions,
        "steps": steps,
        "total_steps": len(steps),
    }


def simulate_sql_execution(sql: str, join_type: str = "Nested Loop Join", tables: list = None) -> dict:
    """SQL 分步执行模拟器

    根据表大小动态计算 rows_in/rows_out。

    Args:
        sql: 原始 SQL
        join_type: 连接算法（Nested Loop Join / Hash Join / Sort Merge Join）
        tables: 参与的表列表 [{name, rows}]
    """
    if tables is None:
        tables = [{"name": "students", "rows": 100}, {"name": "scores", "rows": 500}]

    driver_rows = tables[0]["rows"]
    filtered = max(1, int(driver_rows * 0.2))
    probe_rows = tables[1]["rows"] if len(tables) > 1 else 100
    joined = max(1, int(filtered * (probe_rows / max(driver_rows, 1))))

    steps = [
        {"index": 1, "title": f"扫描驱动表: {tables[0]['name']}",
         "content": f"从 {tables[0]['name']} 表开始扫描，逐行读取数据页",
         "simConfig": {"action": "scan", "table": tables[0]["name"],
                       "rows_in": driver_rows, "rows_out": driver_rows}},
        {"index": 2, "title": "应用过滤条件",
         "content": f"检查每行是否满足 WHERE 条件，估算 {driver_rows} 行中约 {filtered} 行通过",
         "simConfig": {"action": "filter", "table": tables[0]["name"],
                       "rows_in": driver_rows, "rows_out": filtered}},
        {"index": 3, "title": f"{join_type} 匹配",
         "content": f"使用 {join_type} 算法在 {tables[1]['name']} 中查找匹配行，探测约 {probe_rows} 行",
         "simConfig": {"action": "join", "join_type": join_type,
                       "rows_in": filtered, "rows_out": joined, "probe_count": probe_rows}},
        {"index": 4, "title": "返回结果行",
         "content": f"将 {joined} 行匹配结果返回给客户端",
         "simConfig": {"action": "return", "rows_in": joined, "rows_out": joined}},
    ]

    return {
        "simulator_type": "sql_execution",
        "title": f"SQL 执行过程 — {join_type}",
        "sql": sql[:100] + ("..." if len(sql) > 100 else ""),
        "join_type": join_type,
        "tables": tables,
        "steps": steps,
        "total_steps": len(steps),
    }


def simulate_sql_strategy_compare(sql: str = "", tables: list = None) -> dict:
    """SQL 策略对比模拟器：并排展示三种 JOIN 算法的执行指标

    显示 Nested Loop / Hash Join / Sort Merge 三种策略的：
    - 预估代价
    - 扫描行数
    - 适用场景
    - 算法原理解释
    供前端并排卡片渲染。
    """
    if tables is None:
        tables = [{"name": "students", "rows": 100}, {"name": "scores", "rows": 500}]

    d = tables[0]["rows"]   # driver rows
    p = tables[1]["rows"]   # probe rows

    # 每种策略的代价估算公式
    strategies = [
        {
            "name": "Nested Loop Join",
            "cost": round(d * p * 1.0),
            "cost_formula": f"{d} × {p} = {d * p}",
            "rows_in": d * p,
            "rows_out": max(1, int(d * p * 0.1)),
            "probe_count": p,
            "best_for": "小表驱动大表，驱动表行数少时最有效",
            "principle": "对外层表的每一行，扫描内层表查找匹配。时间复杂度 O(n×m)。",
        },
        {
            "name": "Hash Join",
            "cost": round(d + p * 1.5),
            "cost_formula": f"{d} + {p} × 1.5 = {round(d + p * 1.5)}",
            "rows_in": d + p,
            "rows_out": max(1, int(d * p * 0.1)),
            "probe_count": p,
            "best_for": "大表等值连接，无法使用索引时",
            "principle": "对驱动表建哈希表，然后扫描内层表探测哈希表。时间复杂度 O(n+m)。",
        },
        {
            "name": "Sort Merge Join",
            "cost": round(d * 1.5 + p * 1.5 + (d + p) * 0.5),
            "cost_formula": f"{d}×1.5 + {p}×1.5 + ({d}+{p})×0.5 = {round(d * 1.5 + p * 1.5 + (d + p) * 0.5)}",
            "rows_in": d + p,
            "rows_out": max(1, int(d * p * 0.1)),
            "probe_count": p,
            "best_for": "大数据量排序连接，或 JOIN 列已有索引/排序时",
            "principle": "对两表先排序，然后并行扫描匹配。时间复杂度 O(n log n + m log m + n + m)。",
        },
    ]

    # 选代价最小的为"最优"
    best_strategy = min(strategies, key=lambda s: s["cost"])
    min_cost_val = best_strategy["cost"]
    for s in strategies:
        s["optimal"] = s["cost"] == min_cost_val

    return {
        "simulator_type": "strategy_compare",
        "title": f"JOIN 策略对比 — {tables[0]['name']}({tables[0]['rows']}行) × {tables[1]['name']}({tables[1]['rows']}行)",
        "tables": tables,
        "strategies": strategies,
        "total_strategies": len(strategies),
        "steps": [
            {"index": 1, "title": "策略概览",
             "content": f"对 {tables[0]['name']}({tables[0]['rows']}行) 和 {tables[1]['name']}({tables[1]['rows']}行) 执行 JOIN 连接，对比三种算法的代价和适用场景",
             "simConfig": {"action": "overview", "strategies": strategies}},
            {"index": 2, "title": "Nested Loop Join",
             "content": f"扫描驱动表 {tables[0]['name']} 的 {tables[0]['rows']} 行，对每行在 {tables[1]['name']} 中查找匹配。总探测次数 {tables[0]['rows'] * tables[1]['rows']} 次。",
             "simConfig": {"action": "detail", "strategy": strategies[0]}},
            {"index": 3, "title": "Hash Join",
             "content": f"对 {tables[0]['name']} 建哈希表（{tables[0]['rows']} 行），扫描 {tables[1]['name']} 的 {tables[1]['rows']} 行探测。",
             "simConfig": {"action": "detail", "strategy": strategies[1]}},
            {"index": 4, "title": "Sort Merge Join",
             "content": f"对两表分别排序后并行扫描匹配。适用于 JOIN 列有索引或已排序的场景。",
             "simConfig": {"action": "detail", "strategy": strategies[2]}},
            {"index": 5, "title": "结论",
             "content": f"最优策略: {best_strategy["name"]} (cost={min_cost_val})。对于 {tables[0]['rows']}行 × {tables[1]['rows']}行的场景，{best_strategy["best_for"]}",
             "simConfig": {"action": "conclusion", "optimal": best_strategy["name"], "strategies": strategies}},
        ],
        "total_steps": 5,
    }
