import { useEffect, useState } from "react";
import type { Conversation } from "../types";

/**
 * 对话管理 Hook（调用 REST API）
 */
export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchList = async (q = "", page = 1, limit = 50) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/v5/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("获取对话列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const search = async (q: string) => {
    setLoading(true);
    await fetchList(q);
  };

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

  const copy = async (id: string, title?: string, modifications?: string) => {
    const res = await fetch(`/api/v5/demos/${id}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || "", modifications: modifications || "" }),
    });
    const data = await res.json();
    if (data.conversation) {
      setConversations((prev) => [data.conversation, ...prev]);
    }
    return data.conversation;
  };

  return { conversations, total, loading, search, create, remove, rename, copy };
}
