"""
DB Demo Studio — AI 审计日志

记录所有 WS 事件 + REST 请求的结构化 JSON 日志。
使用独立的 audit logger，避免与业务日志格式混淆。
"""
import json
import logging
from datetime import datetime, timezone

# 独立 audit logger
audit_logger = logging.getLogger("audit")
audit_handler = logging.StreamHandler()
audit_handler.setFormatter(logging.Formatter(
    "%(message)s"  # 纯 JSON，不由 root formatter 二次包装
))
audit_logger.addHandler(audit_handler)
audit_logger.propagate = False  # 不向 root logger 传递


def _now():
    return datetime.now(tz=timezone.utc).isoformat()


def log_ws_event(event: str, conv_id: str, teacher_id: str, payload_size: int, duration_ms: float = 0):
    """记录 WebSocket 事件审计日志"""
    audit_logger.info(json.dumps({
        "timestamp": _now(),
        "type": "ws_event",
        "event": event,
        "conv_id": conv_id,
        "teacher_id": teacher_id,
        "payload_size": payload_size,
        "duration_ms": round(duration_ms, 2),
    }, ensure_ascii=False))


def log_llm_call(conv_id: str, provider: str, model: str, tokens: int, duration_ms: float, success: bool):
    """记录 LLM 调用审计日志"""
    audit_logger.info(json.dumps({
        "timestamp": _now(),
        "type": "llm_call",
        "conv_id": conv_id,
        "provider": provider,
        "model": model,
        "tokens": tokens,
        "duration_ms": round(duration_ms, 2),
        "success": success,
    }, ensure_ascii=False))


def log_tool_call(conv_id: str, tool: str, duration_ms: float, success: bool):
    """记录 MCP 工具调用审计日志"""
    audit_logger.info(json.dumps({
        "timestamp": _now(),
        "type": "tool_call",
        "conv_id": conv_id,
        "tool": tool,
        "duration_ms": round(duration_ms, 2),
        "success": success,
    }, ensure_ascii=False))


def log_api_request(method: str, path: str, status: int, duration_ms: float, client_ip: str = ""):
    """记录 REST API 请求审计日志"""
    audit_logger.info(json.dumps({
        "timestamp": _now(),
        "type": "api_request",
        "method": method,
        "path": path,
        "status": status,
        "duration_ms": round(duration_ms, 2),
        "client_ip": client_ip,
    }, ensure_ascii=False))
