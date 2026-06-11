import { useEffect, useState, useCallback } from "react";
import type { Conversation } from "../types";

/**
 * 对话管理 Hook（按 teacher_id 隔离）
 */
export function useConversations(teacherId = "default") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchList = useCallback(async (q = "", page = 1, limit = 50) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        teacher_id: teacherId,
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/v5/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("获取对话列表失败:", err);
      setConversations([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const search = async (q: string) => {
    await fetchList(q);
  };

  const create = async (title?: string) => {
    const res = await fetch("/api/v5/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, teacher_id: teacherId }),
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

  return {
    conversations,
    total,
    loading,
    search,
    create,
    remove,
    rename,
    copy,
    refresh: () => fetchList(),
  };
}
