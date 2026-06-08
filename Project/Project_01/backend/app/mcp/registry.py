"""
DB Demo Studio — MCP 服务器注册/发现

管理所有 MCP 工具的注册、查找和调用路由。
支持热插拔——新增 MCP 服务器不需要重启后端。
"""
import logging
from typing import Any, Callable, Coroutine, Union

logger = logging.getLogger(__name__)


class McpRegistry:
    """MCP 工具注册表"""

    def __init__(self):
        self._tools: dict[str, dict] = {}

    def register(self, name: str, handler: Union[
                     Callable[..., Coroutine[Any, Any, dict]],
                     Callable[..., dict],
                 ],
                 description: str = "", schema: dict | None = None):
        """注册一个 MCP 工具"""
        self._tools[name] = {
            "name": name,
            "description": description,
            "handler": handler,
            "schema": schema or {},
        }
        logger.info(f"MCP 工具已注册: {name}")

    async def call(self, name: str, **kwargs) -> dict:
        """调用 MCP 工具（支持 sync 和 async handler）"""
        tool = self._tools.get(name)
        if not tool:
            return {"error": f"未知工具: {name}"}
        try:
            result = tool["handler"](**kwargs)
            if result is not None and hasattr(result, "__await__"):
                return await result
            return result
        except Exception as e:
            logger.error(f"MCP 工具调用失败: {name}", extra={"data": {"error": str(e)}})
            return {"error": str(e)}

    def list_tools(self) -> list[dict]:
        """列出所有已注册工具"""
        return [
            {"name": t["name"], "description": t["description"], "schema": t["schema"]}
            for t in self._tools.values()
        ]

    def get_handler(self, name: str) -> Callable | None:
        """获取工具处理器"""
        tool = self._tools.get(name)
        return tool["handler"] if tool else None


# 全局单例
mcp_registry = McpRegistry()
