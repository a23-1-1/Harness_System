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
import { readStoredTeacherId, writeStoredTeacherId } from "./hooks/useTeacherProfile";
import ConversationPanel from "./components/ConversationPanel";
import ChatPanel from "./components/ChatPanel";
import DemoPreview from "./components/DemoPreview";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { DemoComplete } from "./types";
import {
  normalizeDemoPayload,
  normalizeDemoStep,
  upsertDemoStep,
} from "./utils/demoNormalize";

type RightPreviewSize = 0 | 1 | 2;

const RIGHT_PREVIEW_WIDTHS: Record<RightPreviewSize, number> = {
  0: 420,
  1: 640,
  2: 800,
};

export default function App() {
  const [teacherId, setTeacherId] = useState(readStoredTeacherId);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightPreviewSize, setRightPreviewSize] = useState<RightPreviewSize>(0);
  const { connected, messages: wsMessages, send } = useWebSocket(
    teacherId,
    activeConv || "default",
    "teacher",
    "",
  );
  const { conversations, loading, total, search, create, remove, rename, copy } =
    useConversations(teacherId);
  const [lastDemo, setLastDemo] = useState<DemoComplete | null>(null);
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConv) || null,
    [activeConv, conversations],
  );

  // 切换教师账户时清空当前会话与预览
  useEffect(() => {
    setActiveConv(null);
    setLastDemo(null);
  }, [teacherId]);

  // 切换/新建对话时清空预览，避免旧演示的 Mermaid 在空会话中继续渲染
  useEffect(() => {
    setLastDemo(null);
  }, [activeConv]);

  const handleTeacherIdChange = (id: string) => {
    writeStoredTeacherId(id);
    setTeacherId(id);
  };

  const latestDemoMsg = useMemo(
    () => [...wsMessages].reverse().find((m) => m.event === "demo:complete"),
    [wsMessages],
  );

  const isGenerating = useMemo(() => {
    for (let i = wsMessages.length - 1; i >= 0; i--) {
      const m = wsMessages[i];
      if (m.event === "demo:complete") return false;
      if (m.event === "step:preview") return true;
      if (m.event === "agent:thinking") {
        const step = (m.payload as Record<string, unknown>)?.step;
        if (step === "interrupted") return false; // 中断标记：生成已终止
        return true; // analyze 等：正在生成
      }
      // ping, chat:message 等忽略，继续向前扫描
    }
    return false;
  }, [wsMessages]);

  // demo:complete → 仅在最近没有 demo:updated 时才设置 lastDemo
  // 防止 demo:complete 覆盖模拟器参数调整的结果（#1）
  const latestDemoMsgIndex = latestDemoMsg ? wsMessages.indexOf(latestDemoMsg) : -1;
  const hasNewerUpdated = useMemo(() => {
    return wsMessages.some(
      (m) => m.event === "demo:updated" && wsMessages.indexOf(m) > latestDemoMsgIndex,
    );
  }, [wsMessages, latestDemoMsgIndex]);

  useEffect(() => {
    if (latestDemoMsg && !hasNewerUpdated) {
      const normalized = normalizeDemoPayload(latestDemoMsg.payload);
      if (normalized) setLastDemo(normalized);
    }
  }, [latestDemoMsg, hasNewerUpdated]);

  // step:preview → 右侧预览实时累积草稿，聊天区只保留简短状态卡
  useEffect(() => {
    const last = wsMessages.length > 0 ? wsMessages[wsMessages.length - 1] : null;
    if (!last || last.event !== "step:preview") return;

    const p = last.payload as Record<string, unknown>;
    const rawIndex = typeof p.stepIndex === "number" ? p.stepIndex : 1;
    const stepIndex = rawIndex > 0 ? rawIndex : 1;
    const step = normalizeDemoStep(
      {
        index: stepIndex,
        title: p.title,
        content: p.content ?? "步骤内容正在生成中。",
        stage: p.stage,
        interactiveHint: p.interactiveHint,
        mermaid: p.mermaid,
        mermaidType: p.mermaidType,
        simConfig: p.simConfig,
      },
      stepIndex,
    );

    const draftId = `draft_${activeConv || "default"}`;
    setLastDemo((prev) => {
      const base: DemoComplete =
        prev?.demoId === draftId
          ? prev
          : { demoId: draftId, title: "正在生成演示", steps: [] };
      return { ...base, steps: upsertDemoStep(base.steps, step) };
    });
  }, [wsMessages, activeConv]);

  // demo:updated → 替换 lastDemo（模拟器参数调整后更新，保留 demoId 避免预览重置）
  useEffect(() => {
    const last = wsMessages.length > 0 ? wsMessages[wsMessages.length - 1] : null;
    if (!last || last.event !== "demo:updated") return;
    const normalized = normalizeDemoPayload(last.payload);
    if (normalized) {
      setLastDemo((prev) => ({
        ...normalized,
        demoId: prev?.demoId ?? normalized.demoId,
      }));
    }
  }, [wsMessages]);

  // step:regenerated → 原地更新 lastDemo 中对应步骤的内容
  useEffect(() => {
    const last = wsMessages.length > 0 ? wsMessages[wsMessages.length - 1] : null;
    if (!last || last.event !== "step:regenerated") return;
    const p = last.payload as Record<string, unknown>;
    const rawIndex = typeof p.stepIndex === "number" ? p.stepIndex : -1;
    if (rawIndex < 0) return;
    setLastDemo((prev) => {
      if (!prev || rawIndex >= prev.steps.length || !prev.steps[rawIndex]) return prev;
      const slot = rawIndex;
      const newSteps = [...prev.steps];
      newSteps[slot] = {
        ...newSteps[slot],
        title: (p.title as string) || newSteps[slot].title,
        content: (p.content as string) || newSteps[slot].content,
      };
      return { ...prev, steps: newSteps };
    });
  }, [wsMessages]);

  // error → console 告警
  useEffect(() => {
    const last = wsMessages.length > 0 ? wsMessages[wsMessages.length - 1] : null;
    if (!last || last.event !== "error") return;
    const p = last.payload as Record<string, unknown>;
    const code = p.code as string;
    const msg = p.message as string;
    console.warn(`[WS Error] ${code}: ${msg}`);
  }, [wsMessages]);

  const handleSend = (text: string) => {
    send("chat:message", { type: "text", content: text });
  };
  const handleQuizAnswer = (questionId: string, answer: string, question: Record<string, unknown>) => {
    send("quiz:answer", { questionId, answer, question, studentId: "local-student" });
  };
  const handleSearch = async (q: string) => {
    await search(q);
  };
  const handleCopy = async (id: string, title?: string) => {
    const conv = await copy(id, title);
    if (conv) setActiveConv(conv.id);
  };
  const handleCreateConv = async (title?: string) => {
    const conv = await create(title);
    setActiveConv(conv.id);
  };
  const cycleRightPreviewSize = () => {
    setRightPreviewSize((size) => ((size + 1) % 3) as RightPreviewSize);
  };

  const panelClass =
    "h-full min-h-0 overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_18px_45px_-34px_rgba(15,23,42,0.45),0_1px_2px_rgba(15,23,42,0.04)]";
  const rightColumnWidth = rightCollapsed ? 64 : RIGHT_PREVIEW_WIDTHS[rightPreviewSize];
  const desktopGridColumns = `${leftCollapsed ? 64 : 232}px minmax(460px, 1fr) ${
    rightColumnWidth
  }px`;

  return (
    <div className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_30%,#eef2f7_100%)] text-slate-900">
      <div className="mx-auto flex h-full max-w-[1840px] flex-col px-3 py-3 sm:px-5 lg:px-6">
        <header className="mb-3 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-slate-950 sm:text-lg">
                  DB Demo Studio
                </h1>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  AI Harness
                </span>
              </div>
              <p className="truncate text-xs text-slate-500 sm:text-sm">
                从 SQL 或知识点生成可播放、可讲解、可复用的数据库教学演示
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 sm:text-sm">
            <button
              onClick={() => handleCreateConv()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3.5 py-2 font-semibold text-white shadow-sm shadow-blue-600/15 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 active:translate-y-0"
            >
              <Plus className="h-3.5 w-3.5" />
              新建演示
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <PanelLeft className="h-3.5 w-3.5 text-slate-400" />
              {loading ? "加载对话中" : `${conversations.length} 个对话`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              {connected ? "实时通道已连接" : "实时通道未连接"}
            </span>
            <button
              type="button"
              onClick={() => {
                if (rightCollapsed) setRightCollapsed(false);
                setRightPreviewSize(2);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-100 focus:outline-none focus:ring-4 focus:ring-blue-100 active:translate-y-0"
              title="打开最大预览栏"
            >
              <Sparkles className="h-3.5 w-3.5 text-violet-500" />
              {lastDemo ? "打开大预览" : "等待生成演示"}
            </button>
          </div>
        </header>

        <div
          className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[var(--desktop-grid-columns)]"
          style={
            {
              "--desktop-grid-columns": desktopGridColumns,
            } as CSSProperties
          }
        >
          {/* 左栏：对话列表 */}
          <div className="min-h-[300px] xl:min-h-0">
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
                  teacherId={teacherId}
                  connected={connected}
                  onTeacherIdChange={handleTeacherIdChange}
                  onSelect={setActiveConv}
                  onCreate={handleCreateConv}
                  onDelete={remove}
                  onRename={rename}
                  loading={loading}
                  onCollapse={() => setLeftCollapsed(true)}
                  onSearch={handleSearch}
                  onCopy={handleCopy}
                />
              )}
            </div>
          </div>

          {/* 中栏：核心对话工作区 */}
          <div className="min-h-[520px] min-w-0 xl:min-h-0">
            <div className={panelClass}>
              <ChatPanel
                messages={wsMessages}
                onSend={handleSend}
                connected={connected}
                activeConv={activeConv}
                activeConversation={activeConversation}
                onCreateConversation={handleCreateConv}
                isGenerating={isGenerating}
                onInterrupt={() => send("chat:interrupt", {})}
                onQuizAnswer={handleQuizAnswer}
              />
            </div>
          </div>

          {/* 右栏：动态演示预览 */}
          <div className="min-h-[520px] min-w-0 xl:min-h-0">
            <div className={panelClass}>
              {rightCollapsed ? (
                <CollapsedRail
                  side="right"
                  label="演示"
                  count={lastDemo?.steps.length}
                  onToggle={() => setRightCollapsed(false)}
                />
              ) : (
                <ErrorBoundary compact label="演示预览">
                  <DemoPreview
                    demo={lastDemo}
                    panelSize={rightPreviewSize}
                    isWide={rightPreviewSize > 0}
                    onToggleWide={cycleRightPreviewSize}
                    onCollapse={() => setRightCollapsed(true)}
                    onExport={(fmt) => send("demo:export", { format: fmt || "html" })}
                    onRegenerate={(stepIndex, instructions) =>
                      send("step:regenerate", { stepIndex, instructions })
                    }
                    onSimulatorUpdate={(simulatorType, params) =>
                      send("simulator:update", { simulator_type: simulatorType, params })
                    }
                  />
                </ErrorBoundary>
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
      className="flex h-full w-full flex-col items-center justify-between bg-slate-50 px-3 py-4 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-blue-100"
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
