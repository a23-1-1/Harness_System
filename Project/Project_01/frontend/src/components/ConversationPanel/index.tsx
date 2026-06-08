import { useState, useMemo } from "react";
import { Search, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import type { Conversation } from "../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

/** 分类过滤器定义 */
const CATEGORIES: { key: Conversation["status"] | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "draft", label: "草稿" },
  { key: "finalized", label: "已定稿" },
  { key: "archived", label: "归档" },
];

/** 状态对应的 Badge 样式 */
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: {
    label: "进行中",
    className: "bg-green-50 text-green-700 border border-green-200/60",
  },
  draft: {
    label: "草稿",
    className: "bg-amber-50 text-amber-700 border border-amber-200/60",
  },
  finalized: {
    label: "已定稿",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  },
  archived: {
    label: "归档",
    className: "bg-slate-50 text-slate-500 border border-slate-200/60",
  },
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
    <div className="flex flex-col h-full">
      {/* ─── 顶部操作区 ─── */}
      <div className="px-4 pt-4 pb-2 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索演示项目…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50/80 border border-slate-200
                       rounded-xl placeholder:text-slate-400 text-slate-700
                       transition-all duration-200
                       focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        {/* 新建按钮 */}
        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 py-2.5
                     bg-slate-900 text-white font-medium text-sm
                     rounded-xl shadow-sm
                     hover:bg-slate-800 active:scale-[0.98]
                     transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          新建演示对话
        </button>
      </div>

      {/* ─── 分类标签 ─── */}
      <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto border-b border-slate-100">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150
              ${filter === cat.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ─── 对话列表 ─── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">
              {search || filter !== "all" ? "没有匹配的对话" : "暂无对话"}
            </p>
            {!search && filter === "all" && (
              <button
                onClick={handleCreate}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                创建第一个演示对话
              </button>
            )}
          </div>
        ) : filter === "all" ? (
          /* ─── 分组视图（全部标签下） ─── */
          (["active", "draft", "finalized", "archived"] as const).map((status) => {
            const items = grouped[status];
            if (!items?.length) return null;
            return (
              <div key={status} className="mb-2">
                {/* 组标题 */}
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    {CATEGORIES.find((c) => c.key === status)?.label}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">
                    {items.length}
                  </span>
                </div>
                {items.map((c) => (
                  <ConversationCard
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
          /* ─── 单分类扁平视图 ─── */
          filtered.map((c) => (
            <ConversationCard
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
    </div>
  );
}

/* ──────────────────────────────────────────────
 * ConversationCard — 对话卡片子组件
 * ────────────────────────────────────────────── */
function ConversationCard({
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
  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;

  return (
    <div
      onClick={onSelect}
      className={`group relative p-4 mb-2 rounded-xl border cursor-pointer transition-all duration-150
        ${active
          ? "bg-blue-50/40 border-blue-100"
          : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"}`}
    >
      {/* 激活状态左侧指示条 */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-blue-600" />
      )}

      <div className="flex items-start justify-between gap-3 pl-1">
        {/* 文本区 */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onChangeEditTitle(e.target.value)}
              onBlur={onConfirmRename}
              onKeyDown={(e) => e.key === "Enter" && onConfirmRename()}
              className="w-full px-2 py-1 text-sm bg-white border border-blue-400 rounded-lg text-slate-800 outline-none ring-2 ring-blue-400/20"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <p
              onDoubleClick={onStartRename}
              className={`text-sm tracking-tight truncate ${
                active ? "text-slate-800 font-semibold" : "text-slate-800 font-semibold"
              }`}
            >
              {c.title}
            </p>
          )}

          {/* 元信息 */}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-400 font-normal">
              {c.message_count} 轮 · {c.snapshot_count} 个演示
            </span>
            {c.tags?.slice(0, 2).map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>

        {/* 右侧操作区 */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* 状态 Badge */}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${badge.className}`}>
            {badge.label}
          </span>

          {/* 删除按钮 */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex items-center justify-center w-7 h-7 rounded-lg
                       text-slate-300 opacity-0 group-hover:opacity-100
                       hover:text-red-500 hover:bg-red-50
                       transition-all duration-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
