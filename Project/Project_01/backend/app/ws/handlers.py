"""
DB Demo Studio — WebSocket 事件处理器

注册 WebSocket 路由，处理连接 / 断连 / 消息循环。
"""
from fastapi import APIRouter, WebSocket, Query
from app.ws.manager import ws_manager

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    teacher_id: str = Query(default="anonymous"),
    conv_id: str = Query(default="default"),
):
    """WebSocket 连接端点

    连接: ws://localhost:8000/ws?teacherId={id}&convId={convId}
    """
    await ws_manager.connect(websocket, conv_id, teacher_id)
    # 发送连接确认
    await ws_manager.send_personal(websocket, "conv:loaded", {
        "convId": conv_id,
        "messages": [],
    })
    # 进入消息处理循环
    await ws_manager.handle_messages(websocket, conv_id)
