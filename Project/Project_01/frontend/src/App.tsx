import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  DatabaseZap,
  PanelLeft,
  PanelRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useConversations } from "./hooks/useConversations";
import ConversationPanel from "./components/ConversationPanel";
import ChatPanel from "./components/ChatPanel";
import DemoPreview from "./components/DemoPreview";
import type { DemoComplete } from "./types";

export default function App() {
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const { connected, messages: wsMessages, send } = useWebSocket(
    "default",
    activeConv || "default",
  );
  const { conversations, loading, create, remove, rename } = useConversations();
  const [lastDemo, setLastDemo] = useState<DemoComplete | null>(null);
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConv) || null,
    [activeConv, conversations],
  );

  const latestDemoMsg = useMemo(
    () => [...wsMessages].reverse().find((m) => m.event === "demo:complete"),
    [wsMessages],
  );

  useEffect(() => {
    if (latestDemoMsg) {
      setLastDemo(latestDemoMsg.payload as unknown as DemoComplete);
    }
  }, [latestDemoMsg]);

  const handleSend = (text: string) => {
    send("chat:message", { type: "text", content: text });
  };
  const handleCreateConv = async (title?: string) => {
    const conv = await create(title);
    setActiveConv(conv.id);
  };

  const panelClass =
    "h-full min-h-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35),0_1px_2px_rgba(15,23,42,0.04)]";
  const desktopGridColumns = `${leftCollapsed ? 64 : 248}px minmax(0, 1fr) ${
    rightCollapsed ? 64 : 340
  }px`;

  return (
    <div className="h-screen overflow-hidden bg-[#f1f5f9] text-slate-900">
      <div className="mx-auto flex h-full max-w-[1800px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="mb-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/95 px-5 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-slate-950">
                  DB Demo Studio
                </h1>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  AI Harness
                </span>
              </div>
              <p className="text-sm text-slate-500">
                从 SQL 或知识点生成可播放、可讲解、可复用的数据库教学演示
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <button
              onClick={() => handleCreateConv()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              新建演示
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <PanelLeft className="h-3.5 w-3.5 text-slate-400" />
              {loading ? "加载对话中" : `${conversations.length} 个对话`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              {connected ? "实时通道已连接" : "实时通道未连接"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              {lastDemo ? "演示已生成" : "等待生成演示"}
            </span>
          </div>
        </header>

        <div
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[var(--desktop-grid-columns)]"
          style={
            {
              "--desktop-grid-columns": desktopGridColumns,
            } as CSSProperties
          }
        >
          {/* 左栏：对话列表 */}
          <div className="min-h-[340px] lg:min-h-0">
            <div className={panelClass}>
              {leftCollapsed ? (
                <CollapsedRail
                  side="left"
                  label="对话"
                  count={conversations.length}
                  onToggle={() => setLeftCollapsed(false)}
                />
              ) : (
                <ConversationPanel
                  conversations={conversations}
                  activeId={activeConv}
                  onSelect={setActiveConv}
                  onCreate={handleCreateConv}
                  onDelete={remove}
                  onRename={rename}
                  loading={loading}
                  onCollapse={() => setLeftCollapsed(true)}
                />
              )}
            </div>
          </div>

          {/* 中栏：核心对话工作区 */}
          <div className="min-h-[520px] min-w-0 lg:min-h-0">
            <div className={panelClass}>
              <ChatPanel
                messages={wsMessages}
                onSend={handleSend}
                connected={connected}
                activeConv={activeConv}
                activeConversation={activeConversation}
                onCreateConversation={handleCreateConv}
              />
            </div>
          </div>

          {/* 右栏：动态演示预览 */}
          <div className="min-h-[420px] min-w-0 lg:min-h-0">
            <div className={panelClass}>
              {rightCollapsed ? (
                <CollapsedRail
                  side="right"
                  label="演示"
                  count={lastDemo?.steps.length}
                  onToggle={() => setRightCollapsed(false)}
                />
              ) : (
                <DemoPreview demo={lastDemo} onCollapse={() => setRightCollapsed(true)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CollapsedRail({
  side,
  label,
  count,
  onToggle,
}: {
  side: "left" | "right";
  label: string;
  count?: number;
  onToggle: () => void;
}) {
  const Icon = side === "left" ? PanelLeft : PanelRight;
  const Arrow = side === "left" ? ChevronRight : ChevronLeft;

  return (
    <button
      onClick={onToggle}
      className="flex h-full w-full flex-col items-center justify-between bg-slate-50 px-3 py-4 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
      title={`展开${label}栏`}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex flex-col items-center gap-2">
        <span className="vertical-rl text-sm font-semibold tracking-widest">{label}</span>
        {typeof count === "number" && (
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
            {count}
          </span>
        )}
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
        <Arrow className="h-4 w-4" />
      </span>
    </button>
  );
}
