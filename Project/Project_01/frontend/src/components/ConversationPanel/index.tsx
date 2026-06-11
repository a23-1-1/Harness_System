import { useState, useMemo } from "react";
import {
  Archive,
  ChevronRight,
  Copy,
  MessageSquare,
  PanelLeftClose,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { Conversation } from "../../types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  loading?: boolean;
  onSelect: (id: string) => void;
  onCreate: (title?: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onCollapse?: () => void;
  onSearch?: (q: string) => void;
  onCopy?: (id: string, title?: string) => void;
}

const CATEGORIES: { key: Conversation["status"] | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "draft", label: "草稿" },
  { key: "finalized", label: "已定稿" },
  { key: "archived", label: "归档" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: {
    label: "进行中",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
  },
  draft: {
    label: "草稿",
    className: "bg-amber-50 text-amber-700 border border-amber-200/50",
  },
  finalized: {
    label: "已定稿",
    className: "bg-blue-50 text-blue-700 border border-blue-200/50",
  },
  archived: {
    label: "归档",
    className: "bg-slate-50 text-slate-500 border border-slate-200/50",
  },
};

export default function ConversationPanel({
  conversations,
  activeId,
  loading = false,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onCollapse,
  onSearch,
  onCopy,
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
  const activeCount = conversations.filter((c) => c.status === "active").length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50/80">
      {/* ─── 顶部操作区 ─── */}
      <div className="space-y-3 border-b border-slate-200/60 bg-gradient-to-br from-white to-slate-50 px-3 pb-3 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </p>
            <h2 className="mt-1 text-base font-semibold tracking-tight text-slate-900">
              演示项目
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              {activeCount} active
            </span>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                title="折叠左侧栏"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="搜索演示项目…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              onSearch?.(e.target.value);
            }}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200/70
                       rounded-xl placeholder:text-slate-400 text-slate-700
                       transition-all duration-200
                       focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/15"
          />
        </div>

        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 py-2.5
                     bg-slate-950 text-white font-medium text-xs tracking-wide
                     rounded-xl shadow-lg shadow-slate-950/10
                     hover:bg-slate-800 active:scale-[0.98]
                     transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          新建演示对话
        </button>
      </div>

      {/* ─── 分类标签 ─── */}
      <div className="flex gap-1.5 px-3 pb-3 overflow-x-auto border-b border-slate-200/50">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150
              ${filter === cat.key
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/80"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ─── 对话列表 ─── */}
      <div className="scroll-area flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
        {loading ? (
          <div className="space-y-3 p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-slate-200/70 bg-white/70"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/50 flex items-center justify-center shadow-sm">
              {search || filter !== "all" ? (
                <Archive className="w-6 h-6 text-slate-300" />
              ) : (
                <MessageSquare className="w-6 h-6 text-slate-300" />
              )}
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
          (["active", "draft", "finalized", "archived"] as const).map((status) => {
            const items = grouped[status];
            if (!items?.length) return null;
            return (
              <div key={status} className="mb-2">
                <div className="flex items-center gap-2 px-1 py-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    {CATEGORIES.find((c) => c.key === status)?.label}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">{items.length}</span>
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
 * ConversationCard — Linear 级极简卡片
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
  onCopy,
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
  onCopy?: (id: string, title?: string) => void;
}) {
  const badge = STATUS_BADGE[c.status] || STATUS_BADGE.active;

  return (
    <div
      onClick={onSelect}
      className={`group relative p-3 mb-2.5 rounded-xl border cursor-pointer transition-all duration-200
        shadow-[0_1px_2px_rgba(15,23,42,0.03)]
        ${
          active
            ? "bg-white border-blue-200/90 shadow-[0_12px_28px_-18px_rgba(37,99,235,0.55)]"
            : "bg-white/80 border-slate-200/60 hover:border-slate-300 hover:bg-white hover:shadow-md"
        }`}
    >
      {/* 激活指示器 */}
      {active && (
        <span className="absolute left-0 top-5 bottom-5 w-1 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.38)]" />
      )}

      <div className="flex items-start justify-between gap-3 pl-1">
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
            <div className="flex items-center gap-1.5">
              <p
                onDoubleClick={onStartRename}
                className="text-sm font-semibold text-slate-800 tracking-tight truncate"
              >
                {c.title}
              </p>
              {active && <ChevronRight className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
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
          {c.summary && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">
              {c.summary}
            </p>
          )}
        </div>

        {/* 右侧操作区 */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full shadow-sm ${badge.className}`}
          >
            {badge.label}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-150">
            {onCopy && c.snapshot_count > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); onCopy(c.id, `${c.title} (改编)`); }}
                className="flex items-center justify-center w-7 h-7 rounded-lg
                           text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                title="基于此演示改编"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="flex items-center justify-center w-7 h-7 rounded-lg
                         text-slate-300 hover:text-red-500 hover:bg-red-50
                         transition-all duration-150"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
