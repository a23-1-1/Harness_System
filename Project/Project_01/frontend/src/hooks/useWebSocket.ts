import { useState, useCallback, useEffect, useRef } from "react";
import type { WsMessage } from "../types";

/**
 * WebSocket 连接/重连/心跳 Hook
 */
export function useWebSocket(teacherId = "default", convId = "default") {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WsMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = import.meta.env.DEV ? "localhost:8000" : window.location.host;
    const url = `${protocol}//${host}/ws?teacherId=${teacherId}&convId=${convId}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setConnected(true);
      console.log("[WS] 已连接");
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        setMessages((prev) => [...prev, msg]);
      } catch {
        console.warn("[WS] 消息解析失败:", event.data);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("[WS] 已断开，5 秒后重连...");
      reconnectTimer.current = setTimeout(connect, 5000);
    };

    ws.onerror = (err) => {
      console.error("[WS] 连接错误:", err);
      ws.close();
    };

    wsRef.current = ws;
  }, [teacherId, convId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, payload }));
    } else {
      console.warn("[WS] 未连接，无法发送消息");
    }
  }, []);

  return { connected, messages, send };
}
