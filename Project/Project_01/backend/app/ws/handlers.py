"""
DB Demo Studio — WebSocket 事件处理器

注册 WebSocket 路由，处理连接 / 断连 / 消息循环。
"""
from fastapi import APIRouter, WebSocket, Query
from app.ws.manager import ws_manager
from app.ws.rooms import room_manager
from app.ws.history import load_conv_ws_messages
from app.ws.history import load_conv_ws_messages

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    teacher_id: str = Query(default="anonymous"),
    conv_id: str = Query(default="default"),
    role: str = Query(default="teacher"),
    student_id: str = Query(default="", alias="studentId"),
):
    """WebSocket 连接端点

    连接: ws://localhost:8000/ws?teacherId={id}&convId={convId}&role=teacher&studentId=stu001

    参数:
        role: teacher | student
        studentId: 学生标识（role=student 时必填）
    """
    # 参数校验
    if role not in ("teacher", "student"):
        await websocket.close(code=4001, reason="role must be 'teacher' or 'student'")
        return
    if role == "student" and not student_id:
        await websocket.close(code=4001, reason="student_id is required when role=student")
        return
    await ws_manager.connect(websocket, conv_id, teacher_id)
    # 加入课堂 Room（教师/学生均可）
    await room_manager.join_room(websocket, conv_id, role, student_id, teacher_id)
    # 发送连接确认（含 PG 历史，demo_snapshot → demo:complete）
    history = await load_conv_ws_messages(conv_id)
    await ws_manager.send_personal(websocket, "conv:loaded", {
        "convId": conv_id,
        "messages": history,
    })
    try:
        # 进入消息处理循环
        await ws_manager.handle_messages(websocket, conv_id)
    finally:
        # 断连时离开 Room
        await room_manager.leave_room(websocket)
