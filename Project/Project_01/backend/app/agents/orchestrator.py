"""
DB Demo Studio — Orchestrator Agent

编排 AI 工作流：意图识别 → 工具选择 → LLM 生成 → 结果组装。
支持流式 step:preview 推送、用户可打断（per-conversation）、单步重写、demo_snapshot 持久化。
"""
import asyncio
import json
import logging
import uuid
from typing import Optional

from sqlalchemy import select

from app.llm.gateway import llm_gateway
from app.database import async_session_factory
from app.models.conversation import Conversation, Message, Demo
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)

# 工具注册表（后续 MCP 服务器接入后扩展）
TOOL_REGISTRY = {
    "sql_analyze": {"name": "SQL 分析", "description": "解析 SQL 语法结构"},
    "explain_engine": {"name": "EXPLAIN 引擎", "description": "获取查询执行计划"},
    "mermaid_gen": {"name": "Mermaid 生成", "description": "生成 Mermaid 图表"},
    "simulator": {"name": "模拟器", "description": "构建 B+树/事务模拟器"},
}

# P0 标准阶段标签
P0_STAGES = ["lex", "parse", "optimize", "plan", "execute", "result"]


class OrchestratorAgent:
    """Orchestrator Agent —— 编排 AI 协作流程"""

    def __init__(self):
        # per-conversation 打断事件，避免 C1/C2 全局标志位问题
        self._interrupt_events: dict[str, asyncio.Event] = {}

    def interrupt(self, conv_id: str):
        """标记指定对话的打断请求"""
        event = self._interrupt_events.get(conv_id)
        if event:
            event.set()
            logger.info("打断请求已设置", extra={"data": {"convId": conv_id}})

    def _check_interrupted(self, conv_id: str) -> bool:
        """检查指定对话是否被打断"""
        event = self._interrupt_events.get(conv_id)
        return event is not None and event.is_set()

    async def process_message(self, websocket, ws_manager, conv_id: str, payload: dict):
        """处理用户消息：保存 → 缓存 → 分析 → 生成 → 推送"""
        msg_type = payload.get("type", "text")
        content = payload.get("content", "")

        # 创建 per-conversation 打断事件（用于 Orchestrator.interrupt 标记）
        self._interrupt_events[conv_id] = asyncio.Event()

        try:
            # 1. 保存用户消息到 PostgreSQL + 更新计数器
            msg_id = await self._save_user_message(conv_id, msg_type, content)

            # 2. 写入 Redis 消息缓存
            await redis_cache.push_message(conv_id, {
                "id": msg_id,
                "role": "user",
                "type": msg_type,
                "content": {"text": content} if msg_type == "text" else payload,
            })

            # 3. 推送 agent:thinking — 正在分析
            await ws_manager.send_personal(websocket, "agent:thinking", {
                "step": "analyze",
                "message": "正在分析输入内容，识别教学意图…",
            })

            # 4. 调用 LLM Gateway 生成演示
            try:
                result = await llm_gateway.generate_demo(content, conv_id)
                steps = result.get("steps", [])
            except asyncio.CancelledError:
                raise  # 由 manager.py 的 task.cancel() 发起，向上传播
            except Exception as e:
                logger.error(f"LLM 生成失败: {e}", extra={"data": {"convId": conv_id}})
                await ws_manager.send_personal(websocket, "demo:complete", {
                    "demoId": f"demo_{conv_id}",
                    "title": f"演示: {content[:30]}",
                    "steps": [
                        {"index": 1, "stage": "error", "title": "处理异常",
                         "content": f"AI 处理过程中出现错误: {str(e)[:100]}"},
                    ],
                })
                return

            # 5. 检查打断（CancelledError 优先传播，作为补充）
            if self._check_interrupted(conv_id):
                await self._notify_interrupted(ws_manager, websocket)
                return

            # 6. 推送每个步骤的预览（流式生成）
            for step in steps:
                if self._check_interrupted(conv_id):
                    await self._notify_interrupted(ws_manager, websocket)
                    return

                stage = step.get("stage", "")
                stage_label = self._stage_label(stage)
                await ws_manager.send_personal(websocket, "step:preview", {
                    "stepIndex": step.get("index", 0),
                    "title": step.get("title", ""),
                    "content": step.get("content", ""),
                    "stage": stage,
                    "stageLabel": stage_label,
                    "interactiveHint": step.get("interactive_hint", ""),
                })

            # 7. 保存 AI 回复消息 + demo_snapshot 到 PG
            title = result.get("title", f"演示: {content[:30]}")
            demo_id = await self._save_demo_snapshot(conv_id, title, steps, msg_id)

            # 写入 Redis 缓存
            await redis_cache.push_message(conv_id, {
                "id": demo_id,
                "role": "assistant",
                "type": "demo_snapshot",
                "content": {"title": title, "steps": steps},
            })

            # 8. demo:complete 前等待 300ms，给网络上的 chat:interrupt 消息抵达时间
            # asyncio.sleep 是取消点——如果 task.cancel() 在此期间被调用，
            # CancelledError 会在 sleep 内部被抛出，无需手动轮询
            try:
                await asyncio.sleep(0.3)
            except asyncio.CancelledError:
                logger.info("打断请求在 demo:complete 前到达", extra={"data": {"convId": conv_id}})
                return

            # 再检查一次 Event 打断标记
            if self._check_interrupted(conv_id):
                await self._notify_interrupted(ws_manager, websocket)
                return

            await ws_manager.send_personal(websocket, "demo:complete", {
                "demoId": demo_id,
                "title": title,
                "steps": steps,
            })

        except asyncio.CancelledError:
            # task.cancel() — manager.py 发出的打断请求
            logger.info("process_message 被 task.cancel() 取消", extra={"data": {"convId": conv_id}})
            # 发送打断通知（ws 连接仍有效，只取消了任务）
            await self._notify_interrupted(ws_manager, websocket)

        except Exception as e:
            logger.error(f"Agent 处理失败: {e}", extra={"data": {"convId": conv_id}})
            await ws_manager.send_personal(websocket, "demo:complete", {
                "demoId": f"demo_{conv_id}",
                "title": f"演示: {content[:30]}",
                "steps": [
                    {"index": 1, "stage": "error", "title": "处理异常",
                     "content": f"AI 处理过程中出现错误: {str(e)[:100]}"},
                ],
            })
        finally:
            # 清理 per-conversation 打断事件
            self._interrupt_events.pop(conv_id, None)

    async def _notify_interrupted(self, ws_manager, websocket):
        """推送打断通知"""
        await ws_manager.send_personal(websocket, "agent:thinking", {
            "step": "interrupted",
            "message": "生成已中断",
        })

    async def regenerate_step(self, websocket, ws_manager, conv_id: str, payload: dict):
        """局部重写某一步骤（step:regenerate）"""
        step_index = payload.get("stepIndex", 0)
        instructions = payload.get("instructions", "")

        # 单 session 内完成读→改→写（G1）
        async with async_session_factory() as db:
            # 1. 加载最近的 demo_snapshot 消息
            result = await db.execute(
                select(Message)
                .where(Message.conv_id == conv_id, Message.type == "demo_snapshot")
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            snapshot_msg = result.scalar_one_or_none()

            if not snapshot_msg:
                await ws_manager.send_personal(websocket, "error", {
                    "code": "NO_SNAPSHOT",
                    "message": "没有找到演示快照，请先生成一个演示",
                })
                return

            steps = snapshot_msg.content.get("steps", [])
            if step_index < 0 or step_index >= len(steps):
                await ws_manager.send_personal(websocket, "error", {
                    "code": "INVALID_STEP",
                    "message": f"步骤索引 {step_index} 无效，当前共 {len(steps)} 步",
                })
                return

            original_step = steps[step_index]

            # 2. 用 LLM 重写该步
            rewrite_prompt = f"""原始步骤内容：
标题：{original_step.get('title', '')}
内容：{original_step.get('content', '')}

修改要求：{instructions}

请仅输出该步骤的修改结果（JSON，保持与原始结构一致）：
{{
  "title": "修改后的标题",
  "content": "修改后的内容，80-200字"
}}
直接输出 JSON，不要多余说明。"""
            try:
                result_text = await llm_gateway.chat_with_json(rewrite_prompt)
                rewritten = json.loads(result_text)
            except Exception as e:
                await ws_manager.send_personal(websocket, "error", {
                    "code": "REWRITE_FAILED",
                    "message": f"重写步骤失败: {str(e)[:100]}",
                })
                return

            # 3. 更新步骤
            steps[step_index]["title"] = rewritten.get("title", original_step["title"])
            steps[step_index]["content"] = rewritten.get("content", original_step["content"])
            snapshot_msg.content["steps"] = steps

            # 4. 持久化到 PG
            snapshot_msg.content = snapshot_msg.content
            await db.commit()

        # 5. 推送 step:regenerated（与 step:preview payload 一致，G6）
        original_stage = original_step.get("stage", "")
        await ws_manager.send_personal(websocket, "step:regenerated", {
            "stepIndex": step_index,
            "title": steps[step_index]["title"],
            "content": steps[step_index]["content"],
            "stage": original_stage,
            "stageLabel": self._stage_label(original_stage),
            "interactiveHint": original_step.get("interactive_hint", ""),
        })

    async def _save_user_message(self, conv_id: str, msg_type: str, content: str) -> str:
        """保存用户消息到 PG，返回消息 ID"""
        async with async_session_factory() as db:
            result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = result.scalar_one_or_none()
            if not conv:
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
                content={"text": content},
            )
            db.add(msg)
            conv.message_count += 1
            await db.commit()
            msg_id = msg.id

        logger.info("消息已持久化", extra={"data": {"convId": conv_id, "msgId": msg_id, "type": msg_type}})
        return msg_id

    async def _save_demo_snapshot(self, conv_id: str, title: str, steps: list, trigger_msg_id: str) -> str:
        """保存演示快照到 PG（assistant 消息 + demo 表）"""
        demo_id = f"demo_{uuid.uuid4().hex[:12]}"
        # 计算当前版本号：查询已有快照数 + 1（G2）
        new_version = 1
        new_order = 1

        async with async_session_factory() as db:
            # 查询当前最大 version 和 snapshot_order
            result = await db.execute(
                select(Demo)
                .where(Demo.conv_id == conv_id)
                .order_by(Demo.version.desc())
                .limit(1)
            )
            latest_demo = result.scalar_one_or_none()
            if latest_demo:
                new_version = latest_demo.version + 1
                new_order = latest_demo.snapshot_order + 1

            # 保存为 assistant 消息，metadata 关联触发消息（C3）
            msg = Message(
                conv_id=conv_id,
                role="assistant",
                type="demo_snapshot",
                content={"title": title, "steps": steps},
                metadata_={
                    "triggerMsgId": trigger_msg_id,
                    "demoId": demo_id,
                    "version": new_version,
                },
            )
            db.add(msg)

            # 保存到 demos 表
            demo = Demo(
                id=demo_id,
                conv_id=conv_id,
                version=new_version,
                snapshot_order=new_order,
                title={"zh": title},
                demo_type="p0",
                content={
                    "steps": steps,
                    "triggerMsgId": trigger_msg_id,
                },
            )
            db.add(demo)

            # 更新对话计数器（M1：user + assistant 都算）
            result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
            conv = result.scalar_one_or_none()
            if conv:
                conv.message_count += 1
                conv.snapshot_count += 1

            await db.commit()

        logger.info("演示快照已持久化", extra={"data": {
            "convId": conv_id, "demoId": demo_id, "version": new_version, "stepCount": len(steps),
        }})
        return demo_id

    def _stage_label(self, stage: str) -> str:
        """获取阶段中文标签"""
        labels = {
            "lex": "词法分析",
            "parse": "语法解析",
            "optimize": "查询优化",
            "plan": "执行计划",
            "execute": "执行过程",
            "result": "结果分析",
        }
        return labels.get(stage, stage)

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
