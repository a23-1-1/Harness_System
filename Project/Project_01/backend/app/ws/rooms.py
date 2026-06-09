"""
DB Demo Studio — WebSocket Room 管理器

课堂广播 & 多端同步：
- Room 管理：加入/离开/成员列表
- Redis Pub/Sub 课堂广播（教师→学生同步）
- player:seek 多端同步（全班跳转到同一步骤）
"""
import asyncio
import json
import logging
from typing import Optional

from fastapi import WebSocket
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)


class RoomManager:
    """课堂 Room 管理器"""

    def __init__(self):
        # conv_id -> { websocket: {"role": str, "student_id": str} }
        self._rooms: dict[str, dict[WebSocket, dict]] = {}
        # websocket -> conv_id 反向映射
        self._ws_room_map: dict[WebSocket, str] = {}
        self._pubsub_listener_task: Optional[asyncio.Task] = None

    # ─── Room 管理 ──────────────────────────────────────────

    async def join_room(self, websocket: WebSocket, conv_id: str, role: str = "student", student_id: str = "", teacher_id: str = ""):
        """加入课堂 Room，广播人数变化"""
        if conv_id not in self._rooms:
            self._rooms[conv_id] = {}
        self._rooms[conv_id][websocket] = {"role": role, "student_id": student_id, "teacher_id": teacher_id}
        self._ws_room_map[websocket] = conv_id

        # Redis Set 记录成员（辅助跨进程查询，用 student_id/teacher_id 不依赖内存地址）
        try:
            client = await redis_cache.get_client()
            if client:
                key = f"room:members:{conv_id}"
                member_id = f"student:{student_id}" if role == "student" else f"teacher:{teacher_id}"
                await client.sadd(key, member_id)
                await client.expire(key, 86400)
        except Exception:
            pass

        # 通知 Room 成员人数变化
        count = await self.get_member_count(conv_id)
        await self.broadcast_to_all(conv_id, "room:member_count", count)

        # 给加入者发送 room:joined 确认（含当前成员列表）
        members = await self.get_members(conv_id)
        await self._send(websocket, "room:joined", {
            "conv_id": conv_id,
            "role": role,
            "members": members,
        })

        logger.info(f"Room join: conv={conv_id}, role={role}, student={student_id or 'anonymous'}")

    async def leave_room(self, websocket: WebSocket):
        """离开课堂 Room，广播人数变化"""
        conv_id = self._ws_room_map.pop(websocket, None)
        if conv_id and conv_id in self._rooms:
            info = self._rooms[conv_id].pop(websocket, None)
            if info:
                # 清理 Redis Set
                try:
                    client = await redis_cache.get_client()
                    if client:
                        key = f"room:members:{conv_id}"
                        role = info["role"]
                        uid = info.get("student_id") if role == "student" else info.get("teacher_id")
                        member_id = f"{role}:{uid}"
                        await client.srem(key, member_id)
                except Exception:
                    pass
                # 通知 Room 人数变化
                if self._rooms.get(conv_id):
                    count = await self.get_member_count(conv_id)
                    await self.broadcast_to_all(conv_id, "room:member_count", count)

            if conv_id in self._rooms and not self._rooms[conv_id]:
                del self._rooms[conv_id]

            logger.info(f"Room leave: conv={conv_id}")

    async def get_members(self, conv_id: str) -> list[dict]:
        """获取 Room 成员列表"""
        room = self._rooms.get(conv_id, {})
        return [{"role": info["role"], "student_id": info["student_id"]} for info in room.values()]

    async def get_member_count(self, conv_id: str) -> dict:
        """获取教师/学生人数统计"""
        room = self._rooms.get(conv_id, {})
        teachers = sum(1 for info in room.values() if info["role"] == "teacher")
        students = sum(1 for info in room.values() if info["role"] == "student")
        return {"teachers": teachers, "students": students}

    async def get_connection_info(self, websocket: WebSocket) -> Optional[dict]:
        """获取连接的角色和 student_id"""
        conv_id = self._ws_room_map.get(websocket)
        if not conv_id or conv_id not in self._rooms:
            return None
        info = self._rooms[conv_id].get(websocket)
        return info

    @staticmethod
    def student_conv_id(room_conv_id: str, student_id: str, teacher_id: str = "") -> str:
        """学生私有对话 ID（包含 teacherId 防跨教室泄漏）"""
        return f"{room_conv_id}:student:{student_id}:teacher:{teacher_id}"

    # ─── 广播 ──────────────────────────────────────────────

    async def broadcast_to_students(self, conv_id: str, event: str, payload: dict):
        """向 Room 内所有学生广播"""
        if conv_id not in self._rooms:
            return
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        room = self._rooms.get(conv_id)
        if not room:
            return
        for ws, info in list(room.items()):
            if info["role"] != "student":
                continue
            try:
                await ws.send_text(message)
            except Exception:
                # 断连 ws 原地 cleanup，不触发 leave_room 避免递归广播
                room.pop(ws, None)
                self._ws_room_map.pop(ws, None)

    async def broadcast_to_all(self, conv_id: str, event: str, payload: dict, exclude: Optional[WebSocket] = None):
        """向 Room 内所有成员广播"""
        if conv_id not in self._rooms:
            return
        message = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
        room = self._rooms.get(conv_id)
        if not room:
            return
        for ws in list(room.keys()):
            if ws == exclude:
                continue
            try:
                await ws.send_text(message)
            except Exception:
                # 断连 ws 原地 cleanup，不触发 leave_room 避免递归广播
                room.pop(ws, None)
                self._ws_room_map.pop(ws, None)

    @staticmethod
    async def _send(websocket: WebSocket, event: str, payload: dict):
        """向指定客户端发送单条消息"""
        try:
            await websocket.send_text(json.dumps({"event": event, "payload": payload}, ensure_ascii=False))
        except Exception as e:
            logger.error(f"room send failed: {e}")

    # ─── Redis Pub/Sub ─────────────────────────────────────

    async def publish_teacher_action(self, conv_id: str, event: str, payload: dict):
        """教师操作 → Redis Pub/Sub 发布（跨进程广播），由监听器分发到本地学生

        Redis 不可用时降级为直接本地广播。
        """
        try:
            client = await redis_cache.get_client()
            if client is None:
                logger.warning("Redis 不可用，降级为本地广播")
                await self.broadcast_to_students(conv_id, event, payload)
                return
            channel = f"pub/sub:room:{conv_id}"
            msg = json.dumps({"event": event, "payload": payload}, ensure_ascii=False)
            await client.publish(channel, msg)
            logger.info(f"Teacher action published: channel={channel}, event={event}")
        except Exception as e:
            logger.error(f"publish_teacher_action failed: {e}")
            await self.broadcast_to_students(conv_id, event, payload)

    async def _pubsub_listen_loop(self):
        """Redis Pub/Sub 监听循环——收到广播后向本进程学生分发，断线自动重连"""
        while True:
            try:
                client = await redis_cache.get_client()
                if client is None:
                    logger.warning("Redis 不可用，Pub/Sub 监听器 5s 后重试")
                    await asyncio.sleep(5)
                    continue
                pubsub = client.pubsub()
                await pubsub.psubscribe("pub/sub:room:*")
                logger.info("Redis Pub/Sub 监听器已启动 (pattern: pub/sub:room:*)")
                async for message in pubsub.listen():
                    if message["type"] == "pmessage":
                        channel = message["channel"]
                        data = message["data"]
                        # channel: "pub/sub:room:{conv_id}"
                        parts = channel.split(":", 2)
                        if len(parts) >= 3 and data:
                            conv_id = parts[2]
                            try:
                                msg = json.loads(data)
                                await self.broadcast_to_students(
                                    conv_id,
                                    msg.get("event", ""),
                                    msg.get("payload", {}),
                                )
                            except json.JSONDecodeError:
                                pass
            except asyncio.CancelledError:
                logger.info("Redis Pub/Sub 监听器已停止")
                return
            except Exception as e:
                logger.error(f"Pub/Sub listener error, reconnecting in 5s: {e}")
                await asyncio.sleep(5)
                redis_cache.reset_client()

    def start_listener(self):
        """在后台启动 Pub/Sub 监听器"""
        self._pubsub_listener_task = asyncio.create_task(self._pubsub_listen_loop())

    async def stop_listener(self):
        """停止 Pub/Sub 监听器"""
        if self._pubsub_listener_task and not self._pubsub_listener_task.done():
            self._pubsub_listener_task.cancel()
            try:
                await self._pubsub_listener_task
            except asyncio.CancelledError:
                pass
            self._pubsub_listener_task = None
            logger.info("Redis Pub/Sub 监听器已停止")


# 全局单例
room_manager = RoomManager()
