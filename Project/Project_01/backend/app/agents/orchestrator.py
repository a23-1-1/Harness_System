"""
DB Demo Studio — Orchestrator Agent

编排 AI 工作流：意图识别 → 工具选择 → LLM 生成 → 结果组装。
"""
import logging
from typing import Optional
from sqlalchemy import select

from app.llm.gateway import llm_gateway
from app.database import async_session_factory
from app.models.conversation import Conversation, Message
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)

# 工具注册表（后续 MCP 服务器接入后扩展）
TOOL_REGISTRY = {
    "sql_analyze": {"name": "SQL 分析", "description": "解析 SQL 语法结构"},
    "explain_engine": {"name": "EXPLAIN 引擎", "description": "获取查询执行计划"},
    "mermaid_gen": {"name": "Mermaid 生成", "description": "生成 Mermaid 图表"},
    "simulator": {"name": "模拟器", "description": "构建 B+树/事务模拟器"},
}


class OrchestratorAgent:
    """Orchestrator Agent —— 编排 AI 协作流程"""

    async def process_message(self, websocket, ws_manager, conv_id: str, payload: dict):
        """处理用户消息：保存 → 缓存 → 分析 → 生成 → 推送"""
        msg_type = payload.get("type", "text")
        content = payload.get("content", "")

        # 1. 保存用户消息到 PostgreSQL + 更新计数器
        async with async_session_factory() as db:
            # 确保对话存在
            result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = result.scalar_one_or_none()
            if not conv:
                # 自动创建不存在的对话
                conv = Conversation(
                    id=conv_id,
                    teacher_id="default",
                    title=f"对话 {conv_id[:8]}",
                )
                db.add(conv)
                await db.flush()

            msg = Message(
                conv_id=conv_id,
                role="user",
                type=msg_type,
                content={"text": content} if msg_type == "text" else payload,
            )
            db.add(msg)
            # 更新对话 message_count
            result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = result.scalar_one_or_none()
            if conv:
                conv.message_count += 1
            await db.commit()

        logger.info("消息已持久化", extra={"data": {"convId": conv_id, "msgId": msg.id, "type": msg_type}})

        # 2. 写入 Redis 消息缓存
        await redis_cache.push_message(conv_id, {
            "id": msg.id,
            "role": "user",
            "type": msg_type,
            "content": {"text": content} if msg_type == "text" else payload,
        })

        # 3. 推送 step:preview — 确认收到
        await ws_manager.send_personal(websocket, "step:preview", {
            "stepIndex": 0,
            "content": f"收到消息: {content[:50]}...",
            "type": msg_type,
        })

        # 4. 推送 agent:thinking — 正在分析
        await ws_manager.send_personal(websocket, "agent:thinking", {
            "step": "analyze",
            "message": "正在调用 sql_analyze 分析 SQL…",
        })

        # 5. 调用 LLM Gateway 生成演示
        try:
            teacher_profile = None
            result = await llm_gateway.generate_demo(content, conv_id, teacher_profile)
            steps = result.get("steps", [])

            # 6. 推送每个步骤的预览
            for step in steps:
                await ws_manager.send_personal(websocket, "step:preview", {
                    "stepIndex": step.get("index", 0),
                    "content": step.get("content", ""),
                    "title": step.get("title", ""),
                })

            # 7. 推送 demo:complete — 演示就绪
            await ws_manager.send_personal(websocket, "demo:complete", {
                "demoId": f"demo_{conv_id}",
                "title": f"演示: {content[:30]}",
                "steps": steps,
            })

        except Exception as e:
            logger.error(f"Agent 处理失败: {e}", extra={"data": {"convId": conv_id}})
            await ws_manager.send_personal(websocket, "demo:complete", {
                "demoId": f"demo_{conv_id}",
                "title": f"演示: {content[:30]}",
                "steps": [
                    {"index": 1, "title": "处理异常", "content": f"AI 处理过程中出现错误: {str(e)[:100]}"},
                ],
            })

    async def identify_intent(self, user_input: str) -> str:
        """识别用户意图（关键词匹配）"""
        input_lower = user_input.lower()
        if "select" in input_lower or "join" in input_lower or "sql" in input_lower:
            return "sql_query"
        if "b+树" in input_lower or "btree" in input_lower or "索引" in input_lower:
            return "bplus_tree"
        if "事务" in input_lower or "隔离" in input_lower or "幻读" in input_lower:
            return "transaction"
        return "knowledge_point"


# 全局单例
orchestrator = OrchestratorAgent()
