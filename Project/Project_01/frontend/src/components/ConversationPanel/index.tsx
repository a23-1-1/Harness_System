import { useState, useMemo } from "react";
import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

const CATEGORIES: { key: Conversation["status"] | "all"; label: string; icon: string }[] = [
  { key: "all", label: "全部", icon: "⊡" },
  { key: "active", label: "进行中", icon: "●" },
  { key: "draft", label: "草稿", icon: "◐" },
  { key: "finalized", label: "已定稿", icon: "✓" },
  { key: "archived", label: "归档", icon: "⊟" },
];

const STATUS_COLOR: Record<string, string> = {
  active: "text-[#9ece6a]",
  draft: "text-[#e0af68]",
  finalized: "text-[#7dcfff]",
  archived: "text-[#565f89]",
};

export default function ConversationPanel({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Conversation["status"] | "all">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        !search || c.title.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [conversations, search, filter]);

  const grouped = useMemo(() => {
    const g: Record<string, Conversation[]> = {
      active: [],
      draft: [],
      finalized: [],
      archived: [],
    };
    for (const c of filtered) g[c.status]?.push(c);
    return g;
  }, [filtered]);

  const handleCreate = () => onCreate(`新演示 ${conversations.length + 1}`);
  const handleStartRename = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };
  const handleConfirmRename = () => {
    if (editingId && editTitle.trim()) onRename(editingId, editTitle.trim());
    setEditingId(null);
  };

  return (
    <>
      {/* 顶栏：搜索 + 新建 */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#565f89]"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="搜索演示项目…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0f1117] border border-[#292e42] rounded-lg
                       placeholder:text-[#3b4261] text-[#c0caf5]
                       focus:outline-none focus:border-[#7aa2f7]/50 focus:ring-1 focus:ring-[#7aa2f7]/20
                       transition-all duration-200"
          />
        </div>

        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold
                     text-[#7aa2f7] bg-[#7aa2f7]/10 border border-[#7aa2f7]/20 rounded-lg
                     hover:bg-[#7aa2f7]/20 hover:border-[#7aa2f7]/40
                     active:scale-[0.98] transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          + 新建演示对话
        </button>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-1 px-3 pb-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-md whitespace-nowrap transition-all duration-150
              ${filter === cat.key
                ? "bg-[#7aa2f7]/15 text-[#7aa2f7] border border-[#7aa2f7]/30"
                : "text-[#565f89] border border-transparent hover:text-[#c0caf5] hover:bg-[#1e1f2b]"}`}
          >
            <span className="text-[9px]">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* 分组列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[10px] text-[#3b4261] gap-2">
            <span className="text-2xl opacity-40">☕</span>
            {search || filter !== "all" ? "没有匹配的对话" : "新建一个演示对话开始吧"}
          </div>
        ) : filter === "all" ? (
          /* 分组视图 */
          (["active", "draft", "finalized", "archived"] as const).map((status) => {
            const items = grouped[status];
            if (!items?.length) return null;
            return (
              <div key={status} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-semibold text-[#565f89] uppercase tracking-wider">
                  <span className={`text-[9px] ${STATUS_COLOR[status]}`}>
                    {CATEGORIES.find((c) => c.key === status)?.icon}
                  </span>
                  {CATEGORIES.find((c) => c.key === status)?.label}
                  <span className="ml-auto text-[#3b4261]">{items.length}</span>
                </div>
                {items.map((c) => (
                  <ConversationItem
                    key={c.id}
                    conversation={c}
                    active={activeId === c.id}
                    editing={editingId === c.id}
                    editTitle={editTitle}
                    onSelect={() => onSelect(c.id)}
                    onStartRename={() => handleStartRename(c)}
                    onChangeEditTitle={setEditTitle}
                    onConfirmRename={handleConfirmRename}
                    onDelete={() => { if (confirm("确认删除？")) onDelete(c.id); }}
                  />
                ))}
              </div>
            );
          })
        ) : (
          filtered.map((c) => (
            <ConversationItem
              key={c.id}
              conversation={c}
              active={activeId === c.id}
              editing={editingId === c.id}
              editTitle={editTitle}
              onSelect={() => onSelect(c.id)}
              onStartRename={() => handleStartRename(c)}
              onChangeEditTitle={setEditTitle}
              onConfirmRename={handleConfirmRename}
              onDelete={() => { if (confirm("确认删除？")) onDelete(c.id); }}
            />
          ))
        )}
      </div>
    </>
  );
}

/* ───── 对话卡片子组件 ───── */
function ConversationItem({
  conversation: c,
  active,
  editing,
  editTitle,
  onSelect,
  onStartRename,
  onChangeEditTitle,
  onConfirmRename,
  onDelete,
}: {
  conversation: Conversation;
  active: boolean;
  editing: boolean;
  editTitle: string;
  onSelect: () => void;
  onStartRename: () => void;
  onChangeEditTitle: (v: string) => void;
  onConfirmRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`group relative mx-1 mb-0.5 px-3 py-2 rounded-lg cursor-pointer border transition-all duration-150
        ${active
          ? "bg-[#7aa2f7]/8 border-[#7aa2f7]/30"
          : "border-transparent hover:bg-[#1e1f2b] hover:border-[#292e42]"}`}
    >
      <div className="flex items-start gap-2">
        {/* 状态色点 */}
        <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0
          ${c.status === "active" ? "bg-[#9ece6a] shadow-[0_0_6px_#9ece6a]" : ""}
          ${c.status === "draft" ? "bg-[#e0af68]" : ""}
          ${c.status === "finalized" ? "bg-[#7dcfff]" : ""}
          ${c.status === "archived" ? "bg-[#3b4261]" : ""}`}
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onChangeEditTitle(e.target.value)}
              onBlur={onConfirmRename}
              onKeyDown={(e) => e.key === "Enter" && onConfirmRename()}
              className="w-full px-1 py-0.5 text-xs bg-[#0f1117] border border-[#7aa2f7]/50 rounded text-[#c0caf5] outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              onDoubleClick={onStartRename}
              className={`text-xs truncate leading-tight ${active ? "text-[#c0caf5] font-medium" : "text-[#a9b1d6]"}`}
            >
              {c.title}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-[#565f89]">
              {c.message_count} 轮 · {c.snapshot_count} 演示
            </span>
            {c.tags?.slice(0, 2).map((t) => (
              <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-[#292e42] text-[#7aa2f7]/80 font-mono">
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* 删除按钮 */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded
                     text-[#565f89] hover:text-[#f7768e] hover:bg-[#f7768e]/10 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
