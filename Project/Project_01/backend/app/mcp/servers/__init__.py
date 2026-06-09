"""
DB Demo Studio — MCP 工具初始化

在应用启动时注册所有 MCP 工具。
"""
import logging

from app.mcp.registry import mcp_registry
from app.mcp.servers.sql_analyze import analyze_sql
from app.mcp.servers.explain_engine import explain_mysql, explain_postgres
from app.mcp.servers.mermaid_gen import generate_mermaid
from app.mcp.servers.simulator_engine import simulate_bplus_tree, simulate_transaction, simulate_sql_execution, simulate_sql_strategy_compare

logger = logging.getLogger(__name__)


def register_all_tools():
    """注册所有 MCP 工具"""
    mcp_registry.register(
        name="sql_analyze",
        handler=analyze_sql,
        description="分析 SQL 语法结构，提取表名、列名、关键字和 JOIN 类型",
        schema={
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "要分析的 SQL 语句"},
            },
            "required": ["sql"],
        },
    )
    mcp_registry.register(
        name="explain_mysql",
        handler=explain_mysql,
        description="在 MySQL 8.0 EXPLAIN 引擎上执行 EXPLAIN FORMAT=JSON",
        schema={
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "要分析的 SQL 语句"},
            },
            "required": ["sql"],
        },
    )
    mcp_registry.register(
        name="explain_postgres",
        handler=explain_postgres,
        description="在 PostgreSQL 16 EXPLAIN 引擎上执行 EXPLAIN (FORMAT JSON)",
        schema={
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "要分析的 SQL 语句"},
            },
            "required": ["sql"],
        },
    )
    mcp_registry.register(
        name="mermaid_gen",
        handler=generate_mermaid,
        description="根据 SQL 分析和阶段描述生成 Mermaid 图表代码",
        schema={
            "type": "object",
            "properties": {
                "sql_analysis": {"type": "object", "description": "SQL 分析结果"},
                "stage": {"type": "string", "description": "演示阶段 (lex/parse/optimize/plan/execute/result)"},
            },
            "required": ["sql_analysis"],
        },
    )
    mcp_registry.register(
        name="simulator_bplus_tree",
        handler=simulate_bplus_tree,
        description="B+树模拟器：生成插入/删除/查找的逐步动画数据",
        schema={
            "type": "object",
            "properties": {
                "operation": {"type": "string", "enum": ["insert", "delete", "search"]},
                "key": {"type": "integer"},
                "order": {"type": "integer"},
            },
            "required": ["operation", "key"],
        },
    )
    mcp_registry.register(
        name="simulator_transaction",
        handler=simulate_transaction,
        description="事务隔离级别模拟器：生成 RR 幻读/脏读/不可重复读等场景",
        schema={
            "type": "object",
            "properties": {
                "isolation_level": {"type": "string"},
                "scenario": {"type": "string"},
            },
            "required": ["isolation_level", "scenario"],
        },
    )
    mcp_registry.register(
        name="simulator_sql_execution",
        handler=simulate_sql_execution,
        description="SQL 分步执行模拟器：展示 Nested Loop / Hash Join / Sort Merge 逐步执行",
        schema={
            "type": "object",
            "properties": {
                "sql": {"type": "string"},
                "join_type": {"type": "string"},
                "tables": {"type": "array"},
            },
            "required": ["sql"],
        },
    )
    mcp_registry.register(
        name="simulator_strategy_compare",
        handler=simulate_sql_strategy_compare,
        description="SQL JOIN 策略对比：并排展示 Nested Loop / Hash Join / Sort Merge 的代价、原理和适用场景",
        schema={
            "type": "object",
            "properties": {
                "sql": {"type": "string"},
                "tables": {"type": "array"},
            },
        },
    )
    logger.info(f"MCP 工具初始化完成，已注册 {len(mcp_registry.list_tools())} 个工具")
