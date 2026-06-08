import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Bot,
  CheckCircle2,
  Code2,
  Database,
  Loader2,
  SendHorizonal,
  Sparkles,
  Terminal,
} from "lucide-react";
import type { Conversation, WsMessage } from "../../types";

interface Props {
  messages: WsMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  activeConv: string | null;
  activeConversation: Conversation | null;
  onCreateConversation: (title?: string) => void;
}

const QUICK_CARDS = [
  {
    icon: "B+",
    title: "演示 B+ 树节点分裂",
    desc: "生成索引插入、节点分裂、父节点回填的逐步动画",
    prompt:
      "请生成一个 B+ 树插入导致叶子节点分裂的教学演示，包含每一步的节点变化、关键概念解释和课堂提问。",
  },
  {
    icon: "JOIN",
    title: "分析 JOIN 优化器代价",
    desc: "对比 Nested Loop、Hash Join、Sort Merge 的代价选择",
    prompt:
      "请用 students 和 scores 表的 JOIN 查询，演示优化器如何在 Nested Loop、Hash Join 和 Sort Merge Join 之间选择执行计划。",
  },
  {
    icon: "TX",
    title: "演示 RR 级幻读",
    desc: "用双会话时间线解释隔离级别与锁行为",
    prompt:
      "请用两个事务会话演示 Repeatable Read 隔离级别下的幻读问题，展示时间线、SQL、锁等待和最终结果。",
  },
];

const EVENT_META: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  "step:preview": {
    label: "步骤预览",
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
  },
  "step:regenerated": {
    label: "步骤已重写",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
  },
  "agent:thinking": {
    label: "工具调度",
    bg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-700",
  },
  "demo:complete": {
    label: "演示就绪",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
};

export default function ChatPanel({
  messages,
  onSend,
  connected,
  activeConv,
  activeConversation,
  onCreateConversation,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendCurrentInput = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendCurrentInput();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      sendCurrentInput();
    }
  };

  const insertSqlTemplate = () => {
    setInput((current) =>
      current.trim()
        ? `${current}\n\nSQL:\nSELECT * FROM students WHERE score > 80;`
        : "请基于下面 SQL 生成一个可视化教学演示：\n\nSELECT * FROM students WHERE score > 80;",
    );
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_42%,#eef6ff_100%)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-8 py-5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-tight text-slate-900">
              {activeConversation?.title || "AI 演示编排器"}
            </p>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-500">
              <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                <span
                  className={`absolute inset-0 rounded-full ${
                    connected ? "animate-ping bg-emerald-400 opacity-40" : ""
                  }`}
                />
                <span
                  className={`relative h-2 w-2 rounded-full ${
                    connected ? "bg-emerald-500" : "bg-red-400"
                  }`}
                />
              </span>
              {connected ? "已连接" : "未连接"}
              {activeConv && (
                <span className="hidden font-mono text-slate-400 sm:inline">
                  / {activeConv.slice(0, 10)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 sm:flex">
          <Terminal className="h-4 w-4 text-slate-400" />
          Ctrl + Enter 发送
        </div>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-10 pb-52 pt-8">
        {messages.length === 0 ? (
          <WelcomeView
            onQuickSelect={setInput}
            onCreateConversation={onCreateConversation}
            hasActiveConversation={Boolean(activeConv)}
          />
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={`${msg.event}-${i}`} msg={msg} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/95 to-transparent px-10 pb-7 pt-16"
      >
        <div className="pointer-events-auto w-full max-w-[820px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 SQL、知识点或教学目标，例如：用动画解释 Hash Join 为什么适合大表等值连接"
            rows={3}
            className="block max-h-40 min-h-24 w-full resize-none bg-white px-6 py-4 text-base leading-7 text-slate-800 outline-none placeholder:text-slate-400"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={insertSqlTemplate}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200"
              >
                <Code2 className="h-4 w-4" />
                SQL 模板
              </button>
              <button
                type="button"
                onClick={() =>
                  setInput(
                    "请把当前演示改成适合 10 分钟课堂讲解的版本，增加提问点和关键总结。",
                  )
                }
                className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-violet-50 hover:text-violet-700 hover:ring-violet-200"
              >
                优化讲稿
              </button>
            </div>
            <button
              type="submit"
              disabled={!connected || !input.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              title={!connected ? "实时通道未连接，暂时无法发送" : "发送消息"}
            >
              {connected ? "生成演示" : "未连接"}
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function WelcomeView({
  onQuickSelect,
  onCreateConversation,
  hasActiveConversation,
}: {
  onQuickSelect: (text: string) => void;
  onCreateConversation: (title?: string) => void;
  hasActiveConversation: boolean;
}) {
  return (
    <div className="flex min-h-full items-center justify-center px-10 py-10">
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Database className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
            先选一个教学任务
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-slate-500">
            选择模板后可以继续修改提示词，或直接在下方输入 SQL 和知识点生成演示。
          </p>
          {!hasActiveConversation && (
            <button
              onClick={() => onCreateConversation()}
              className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-blue-700"
            >
              新建并保存对话
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {QUICK_CARDS.map((card) => (
            <button
              key={card.title}
              onClick={() => onQuickSelect(card.prompt)}
              className="group flex min-h-44 flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/80"
            >
              <span className="rounded-full bg-blue-50 px-3 py-1.5 font-mono text-xs font-bold text-blue-700 ring-1 ring-blue-100">
                {card.icon}
              </span>
              <span className="mt-4 text-base font-semibold text-slate-900 group-hover:text-blue-700">
                {card.title}
              </span>
              <span className="mt-2 text-sm leading-relaxed text-slate-500">
                {card.desc}
              </span>
              <span className="mt-auto pt-4 text-sm font-semibold text-blue-600">
                填入提示词
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: WsMessage }) {
  const payload = msg.payload as Record<string, unknown>;
  const content =
    typeof payload.content === "string"
      ? payload.content
      : typeof payload.message === "string"
        ? payload.message
        : "";

  if (msg.event === "chat:message") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] rounded-3xl rounded-tr-md bg-blue-600 px-4 py-3 text-base leading-relaxed text-white shadow-lg shadow-blue-600/15">
          <pre className="whitespace-pre-wrap font-sans">
            {content || JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (msg.event === "agent:thinking") {
    const step = payload.step as string;
    const message = payload.message as string;
    const toolLabel =
      step === "analyze"
        ? "正在调用 sql_analyze 分析 SQL..."
        : message || "正在调度演示生成工具链...";

    return (
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="rounded-3xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-center gap-2.5 text-sm font-medium text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span>{toolLabel}</span>
            </div>
            <div className="mt-3 h-1 rounded-full bg-blue-100">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const meta = EVENT_META[msg.event];

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        {meta && (
          <div className="mb-1.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 text-sm font-semibold ${meta.text}`}
            >
              {msg.event === "demo:complete" && <CheckCircle2 className="h-3 w-3" />}
              {meta.label}
            </span>
          </div>
        )}
        <div
          className={`rounded-3xl border px-4 py-3 text-base leading-relaxed ${
            msg.event === "demo:complete" && payload.steps
              ? "border-emerald-200 bg-emerald-50"
              : meta
                ? `${meta.bg} ${meta.border}`
                : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          {msg.event === "demo:complete" && payload.steps ? (
            <DemoCompleteMessage payload={payload as DemoPayload} />
          ) : (msg.event === "step:preview" || msg.event === "step:regenerated") && payload.title ? (
            <StepPreviewMessage event={msg.event} payload={payload as Record<string, unknown>} />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-slate-800">
              {content || JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function DemoCompleteMessage({ payload }: { payload: DemoPayload }) {
  const steps = payload.steps || [];

  return (
    <div>
      <p className="font-semibold text-slate-800">{payload.title || "演示已生成"}</p>
      <p className="mt-1 text-sm text-emerald-700">
        已生成 {steps.length} 个步骤，右侧控制台可查看和播放。
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {steps.slice(0, 4).map((step) => (
          <span
            key={step.index}
            className="rounded-xl border border-emerald-100 bg-white px-3 py-1 text-sm font-medium text-emerald-700 shadow-sm"
          >
            {step.index}. {step.title}
          </span>
        ))}
        {steps.length > 4 && (
          <span className="px-2 py-1 text-xs text-slate-400">
            +{steps.length - 4} 步
          </span>
        )}
      </div>
    </div>
  );
}

function StepPreviewMessage({ event, payload }: { event: string; payload: Record<string, unknown> }) {
  const title = payload.title as string;
  const content = payload.content as string;
  const stage = payload.stage as string;
  const stageLabel = payload.stageLabel as string;
  const isRegenerated = event === "step:regenerated";

  const stageBadge = stageLabel
    ? stageLabel
    : stage
      ? stage
      : "";

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-semibold ${isRegenerated ? "text-amber-800" : "text-blue-800"}`}>
          {isRegenerated ? "🔄 " : ""}
          {title}
        </p>
        {stageBadge && (
          <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            {stageBadge}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{content}</p>
    </div>
  );
}

type DemoPayload = {
  title?: string;
  steps?: { index: number; title: string; content: string; stage?: string }[];
};
