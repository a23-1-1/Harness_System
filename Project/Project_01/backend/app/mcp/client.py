"""
DB Demo Studio — MCP 客户端（协议通信）

提供标准 MCP 客户端接口，供 Orchestrator Agent 调用。
"""
import logging
from app.mcp.registry import mcp_registry

logger = logging.getLogger(__name__)


async def call_tool(name: str, **kwargs) -> dict:
    """调用 MCP 工具的简化接口"""
    return await mcp_registry.call(name, **kwargs)


def list_tools() -> list[dict]:
    """列出可用工具"""
    return mcp_registry.list_tools()
