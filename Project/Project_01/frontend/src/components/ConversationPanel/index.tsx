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
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">对话列表</h2>
        <button
          onClick={handleCreate}
          className="px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          + 新建
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="搜索对话..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:border-blue-400"
        />
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-xs text-gray-400">
            {search ? "无匹配结果" : "暂无对话，点击「+ 新建」开始"}
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between px-4 py-2.5 cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                activeId === c.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
              }`}
              onClick={() => onSelect(c.id)}
            >
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
                    className="text-sm text-gray-800 truncate"
                    onDoubleClick={() => handleStartRename(c)}
                  >
                    {c.title}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.message_count} 条消息 · {c.status}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("确认删除此对话？")) onDelete(c.id);
                }}
                className="hidden group-hover:block px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded"
              >
                删除
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
