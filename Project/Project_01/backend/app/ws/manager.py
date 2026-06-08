"""
DB Demo Studio — WebSocket 连接管理器

管理 WebSocket 连接池、心跳检测、消息广播。
"""
import json
import logging
import asyncio
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)


class ConnectionManager:
    """WebSocket 连接管理器"""

    def __init__(self):
        # {conv_id: {websocket: teacher_id}}
        self.active_connections: dict[str, dict[WebSocket, str]] = {}
        # {websocket: conv_id}
        self.websocket_map: dict[WebSocket, str] = {}
        self.heartbeat_interval = 30  # 秒

    async def connect(self, websocket: WebSocket, conv_id: str, teacher_id: str):
        """接受 WebSocket 连接"""
        await websocket.accept()
        if conv_id not in self.active_connections:
            self.active_connections[conv_id] = {}
        self.active_connections[conv_id][websocket] = teacher_id
        self.websocket_map[websocket] = conv_id
        # 更新 Redis 会话缓存
        await redis_cache.set_session(conv_id, {
            "teacherId": teacher_id,
            "wsActive": True,
        })
        logger.info(
            f"WebSocket 连接: conv={conv_id}, teacher={teacher_id}",
            extra={"data": {"convId": conv_id, "teacherId": teacher_id, "action": "connect"}},
        )

    async def disconnect(self, websocket: WebSocket):
        """断开 WebSocket 连接"""
        conv_id = self.websocket_map.pop(websocket, None)
        if conv_id and conv_id in self.active_connections:
            self.active_connections[conv_id].pop(websocket, None)
            if not self.active_connections[conv_id]:
                del self.active_connections[conv_id]
                await redis_cache.delete_session(conv_id)
        logger.info(
            f"WebSocket 断开: conv={conv_id}",
            extra={"data": {"convId": conv_id, "action": "disconnect"}},
        )

    async def send_personal(self, websocket: WebSocket, event: str, payload: dict):
        """向指定客户端发送消息"""
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"发送消息失败: {e}", extra={"data": {"event": event}})

    async def broadcast(self, conv_id: str, event: str, payload: dict, exclude: Optional[WebSocket] = None):
        """向对话中的所有客户端广播消息"""
        if conv_id not in self.active_connections:
            return
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        for ws in self.active_connections[conv_id]:
            if ws == exclude:
                continue
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.error(f"广播失败: {e}", extra={"data": {"convId": conv_id, "event": event}})

    async def handle_messages(self, websocket: WebSocket, conv_id: str):
        """处理来自客户端的消息（主循环）"""
        heartbeat_task = asyncio.create_task(self._heartbeat(websocket))
        try:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                event = data.get("event", "")
                payload = data.get("payload", {})

                logger.info(
                    f"收到事件: {event}",
                    extra={"data": {"event": event, "convId": conv_id}},
                )

                # 路由事件到对应的处理器
                if event == "chat:message":
                    await self._handle_chat_message(websocket, conv_id, payload)
                elif event == "chat:interrupt":
                    await self._handle_interrupt(websocket, conv_id)
                elif event == "ping":
                    await self.send_personal(websocket, "pong", {"timestamp": payload.get("timestamp", "")})
                else:
                    logger.warning(f"未知事件: {event}")
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"消息处理异常: {e}")
        finally:
            heartbeat_task.cancel()
            await self.disconnect(websocket)

    async def _handle_chat_message(self, websocket: WebSocket, conv_id: str, payload: dict):
        """处理 chat:message 事件，保存消息到 PostgreSQL"""
        from app.database import async_session_factory
        from app.models.conversation import Message

        msg_type = payload.get("type", "text")
        content = payload.get("content", "")

        # 保存用户消息到 PostgreSQL
        async with async_session_factory() as db:
            msg = Message(
                conv_id=conv_id,
                role="user",
                type=msg_type,
                content={"text": content} if msg_type == "text" else payload,
            )
            db.add(msg)
            await db.commit()
            logger.info(
                "消息已持久化",
                extra={"data": {"convId": conv_id, "msgId": msg.id, "type": msg_type}},
            )

        # 先回显消息确认
        await self.send_personal(websocket, "step:preview", {
            "stepIndex": 0,
            "content": f"收到消息: {content[:50]}...",
            "type": msg_type,
        })

        # TODO: feat-002 实现后，这里会调用 AI Agent Runtime
        # 暂时返回模拟响应
        await self.send_personal(websocket, "agent:thinking", {
            "step": "analyze",
            "message": "正在分析您的输入...",
        })
        await asyncio.sleep(0.5)
        await self.send_personal(websocket, "demo:complete", {
            "demoId": f"demo_{conv_id}",
            "title": f"演示: {content[:30]}",
            "steps": [
                {"index": 1, "title": "词法分析", "content": f"解析输入: {content}"},
                {"index": 2, "title": "语法解析", "content": "构建语法树..."},
                {"index": 3, "title": "演示就绪", "content": "AI 协作式演示等待进一步开发。"},
            ],
        })

    async def _handle_interrupt(self, websocket: WebSocket, conv_id: str):
        """处理 chat:interrupt 事件"""
        await self.send_personal(websocket, "agent:thinking", {
            "step": "interrupted",
            "message": "已中断",
        })

    async def _heartbeat(self, websocket: WebSocket):
        """心跳检测"""
        try:
            while True:
                await asyncio.sleep(self.heartbeat_interval)
                await websocket.send_text(json.dumps({"event": "ping", "payload": {}}))
        except asyncio.CancelledError:
            pass
        except Exception:
            pass
