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
        self.active_connections: dict[str, dict[WebSocket, str]] = {}
        self.websocket_map: dict[WebSocket, str] = {}
        # per-conv 正在运行的 process_message 任务，用于精确打断
        self._active_tasks: dict[str, asyncio.Task] = {}
        self.heartbeat_interval = 30

    async def connect(self, websocket: WebSocket, conv_id: str, teacher_id: str):
        await websocket.accept()
        if conv_id not in self.active_connections:
            self.active_connections[conv_id] = {}
        self.active_connections[conv_id][websocket] = teacher_id
        self.websocket_map[websocket] = conv_id
        await redis_cache.set_session(conv_id, {"teacherId": teacher_id, "wsActive": True})
        logger.info(f"WebSocket connect: conv={conv_id}, teacher={teacher_id}")

    async def disconnect(self, websocket: WebSocket):
        conv_id = self.websocket_map.pop(websocket, None)
        if conv_id and conv_id in self.active_connections:
            self.active_connections[conv_id].pop(websocket, None)
            if not self.active_connections[conv_id]:
                del self.active_connections[conv_id]
                await redis_cache.delete_session(conv_id)
        logger.info(f"WebSocket disconnect: conv={conv_id}")

    async def send_personal(self, websocket: WebSocket, event: str, payload: dict):
        """向指定客户端发送消息（asyncio 单线程，无需额外锁）"""
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"send failed: {e}")

    async def broadcast(self, conv_id: str, event: str, payload: dict, exclude: Optional[WebSocket] = None):
        if conv_id not in self.active_connections:
            return
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        for ws in self.active_connections[conv_id]:
            if ws == exclude:
                continue
            try:
                await ws.send_text(message)
            except Exception as e:
                logger.error(f"broadcast failed: {e}")

    async def handle_messages(self, websocket: WebSocket, conv_id: str):
        """消息处理循环——所有长时间运行的任务均通过 create_task 异步执行，不阻塞消息接收。"""
        heartbeat_task = asyncio.create_task(self._heartbeat(websocket))
        try:
            while True:
                raw = await websocket.receive_text()
                data = json.loads(raw)
                event = data.get("event", "")
                payload = data.get("payload", {})

                if event == "chat:message":
                    from app.agents.orchestrator import orchestrator
                    # 取消同一 conv 之前的未完成任务（精确打断，无需轮询）
                    prev = self._active_tasks.get(conv_id)
                    if prev and not prev.done():
                        prev.cancel()
                    task = asyncio.create_task(
                        orchestrator.process_message(websocket, self, conv_id, payload)
                    )
                    self._active_tasks[conv_id] = task
                    def _cleanup(t: asyncio.Task, cid=conv_id):
                        if self._active_tasks.get(cid) is t:
                            self._active_tasks.pop(cid, None)
                    task.add_done_callback(_cleanup)

                elif event == "chat:interrupt":
                    from app.agents.orchestrator import orchestrator
                    # 只设置 interrupt flag，不 cancel 任务——让 checkpoint 优雅退出
                    orchestrator.interrupt(conv_id)

                elif event == "step:regenerate":
                    from app.agents.orchestrator import orchestrator
                    task = asyncio.create_task(
                        orchestrator.regenerate_step(websocket, self, conv_id, payload)
                    )

                elif event == "demo:export":
                    from app.agents.orchestrator import orchestrator
                    task = asyncio.create_task(
                        orchestrator.export_demo(websocket, self, conv_id, payload)
                    )

                elif event == "simulator:update":
                    from app.agents.orchestrator import orchestrator
                    task = asyncio.create_task(
                        orchestrator.update_simulator(websocket, self, conv_id, payload)
                    )

                elif event == "ping":
                    await self.send_personal(websocket, "pong", {"timestamp": payload.get("timestamp", "")})

                else:
                    logger.warning(f"unknown event: {event}")

        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"handle error: {e}")
        finally:
            heartbeat_task.cancel()
            prev = self._active_tasks.pop(conv_id, None)
            if prev and not prev.done():
                prev.cancel()
            await self.disconnect(websocket)

    async def _heartbeat(self, websocket: WebSocket):
        try:
            while True:
                await asyncio.sleep(self.heartbeat_interval)
                await websocket.send_text(json.dumps({"event": "ping", "payload": {}}))
        except asyncio.CancelledError:
            pass
        except Exception:
            pass


# 全局单例
ws_manager = ConnectionManager()
