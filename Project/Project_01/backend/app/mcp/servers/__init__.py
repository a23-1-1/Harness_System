"""
DB Demo Studio — MCP 工具初始化

在应用启动时注册所有 MCP 工具。
"""
import logging

from app.mcp.registry import mcp_registry
from app.mcp.servers.sql_analyze import analyze_sql
from app.mcp.servers.explain_engine import explain_mysql, explain_postgres
from app.mcp.servers.mermaid_gen import generate_mermaid

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
    logger.info(f"MCP 工具初始化完成，已注册 {len(mcp_registry.list_tools())} 个工具")
