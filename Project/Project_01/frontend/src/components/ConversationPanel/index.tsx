import { useState } from "react";
import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export default function ConversationPanel({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: Props) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    const title = `新对话 ${conversations.length + 1}`;
    onCreate(title);
  };

  const handleStartRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleConfirmRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h2 className="text-sm font-semibold text-slate-800">对话列表</h2>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg transition-colors duration-150 hover:bg-blue-600 active:bg-blue-700"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          新建
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索对话..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 placeholder:text-slate-400 transition-colors duration-150 focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-1 focus:ring-blue-400/20"
          />
        </div>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-xs text-slate-400 gap-2">
            <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {search ? "无匹配结果" : "暂无对话，点击「+ 新建」"}
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-3 py-2.5 mt-1 cursor-pointer rounded-lg border transition-all duration-150 ${
                activeId === c.id
                  ? "bg-blue-50 border-blue-200 shadow-sm"
                  : "border-transparent hover:bg-slate-50 hover:border-slate-200"
              }`}
              onClick={() => onSelect(c.id)}
            >
              {/* 对话图标 */}
              <svg className={`w-4 h-4 flex-shrink-0 ${activeId === c.id ? "text-blue-500" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <div className="flex-1 min-w-0">
                {editingId === c.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={handleConfirmRename}
                    onKeyDown={(e) => e.key === "Enter" && handleConfirmRename()}
                    className="w-full px-1 py-0.5 text-xs border border-blue-400 rounded"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p
                    className={`text-sm truncate ${
                      activeId === c.id ? "text-blue-700 font-medium" : "text-slate-700"
                    }`}
                    onDoubleClick={() => handleStartRename(c)}
                  >
                    {c.title}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {c.message_count} 条消息 · {c.status}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("确认删除此对话？")) onDelete(c.id);
                }}
                className="hidden group-hover:flex items-center justify-center w-6 h-6 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors duration-150"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
