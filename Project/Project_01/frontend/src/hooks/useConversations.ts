import { useEffect, useState } from "react";
import type { Conversation } from "../types";

/**
 * 对话管理 Hook（调用 REST API）
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchList = async () => {
    try {
      const res = await fetch("/api/v5/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("获取对话列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const create = async (title?: string) => {
    const res = await fetch("/api/v5/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const conv = await res.json();
    setConversations((prev) => [conv, ...prev]);
    return conv;
  };

  const remove = async (id: string) => {
    await fetch(`/api/v5/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const rename = async (id: string, title: string) => {
    const res = await fetch(`/api/v5/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const updated = await res.json();
    setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  return { conversations, loading, create, remove, rename };
}
