import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import {
  Bot,
  CheckCircle2,
  Code2,
  Database,
  Loader2,
  SendHorizonal,
  Sparkles,
  Square,
  Terminal,
} from "lucide-react";
import type { Conversation, WsMessage } from "../../types";
import QuizCard from "./QuizCard";
import {
  buildChatDisplayItems,
  type StepPreviewSummary,
} from "../../utils/chatDisplay";

const CHAT_VISIBLE_MESSAGE_EVENTS = new Set([
  "demo:complete",
  "demo:updated",
  "step:regenerated",
  "quiz:generated",
  "quiz:result",
  "error",
  "simulator:update",
]);

interface Props {
  messages: WsMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  activeConv: string | null;
  activeConversation: Conversation | null;
  onCreateConversation: (title?: string) => void;
  isGenerating?: boolean;
  onInterrupt?: () => void;
  onQuizAnswer?: (questionId: string, answer: string, question: Record<string, unknown>) => void;
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
  "demo:updated": {
    label: "演示已更新",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
  },
  "simulator:update": {
    label: "模拟器更新",
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
  },
  error: {
    label: "操作未完成",
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
  },
};

export default function ChatPanel({
  messages,
  onSend,
  connected,
  activeConv,
  activeConversation,
  onCreateConversation,
  isGenerating,
  onInterrupt,
  onQuizAnswer,
}: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const displayItems = useMemo(() => buildChatDisplayItems(messages), [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayItems]);

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
        ? `${current}\n\nSQL:\n-- 在此粘贴你的 SQL，例如 JOIN、子查询、索引优化等\nSELECT ...`
        : "请基于下面的 SQL 或知识点生成可视化教学演示（6 阶段分步讲解）：\n\n-- 示例可替换为任意 SQL\nSELECT * FROM your_table WHERE your_condition;",
    );
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_42%,#eef6ff_100%)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-slate-900">
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

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-4 pt-5 sm:px-7 lg:px-8 lg:pt-6">
        {messages.length === 0 ? (
          <WelcomeView
            onQuickSelect={setInput}
            onCreateConversation={onCreateConversation}
            hasActiveConversation={Boolean(activeConv)}
          />
        ) : (
          <div className="mx-auto max-w-[920px] space-y-4">
            {displayItems.map((item, i) =>
              item.kind === "generation" ? (
                <GenerationProgressBubble
                  key={`gen-${i}-${item.steps.length}-${item.thinkingMessage ?? ""}`}
                  steps={item.steps}
                  thinkingMessage={item.thinkingMessage}
                  interrupted={item.interrupted}
                />
              ) : (
                <MessageBubble
                  key={`${item.msg.event}-${i}`}
                  msg={item.msg}
                  onQuizAnswer={onQuizAnswer}
                />
              ),
            )}
          </div>
        )}
        <div className="h-[15rem] shrink-0" aria-hidden="true" />
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-[#f8fafc] via-[#f8fafc]/95 to-transparent px-4 pb-4 pt-12 sm:px-7 sm:pb-5 lg:px-8"
      >
        <div className="pointer-events-auto w-full max-w-[860px] rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.16)] transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入 SQL、知识点或教学目标，例如：用动画解释 Hash Join 为什么适合大表等值连接"
            rows={3}
            className="box-border block max-h-40 min-h-20 w-full resize-none rounded-t-[1.35rem] border-0 bg-white py-3.5 pl-[clamp(1.375rem,4vw,1.875rem)] pr-[clamp(1.125rem,3.5vw,1.625rem)] text-base leading-7 text-slate-800 outline-none placeholder:text-slate-400 sm:py-4"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-[1.35rem] border-t border-slate-100 bg-slate-50/70 px-[clamp(1rem,3.5vw,1.5rem)] py-3 sm:py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {isGenerating && (
                <button
                  type="button"
                  onClick={onInterrupt}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 focus:outline-none focus:ring-4 focus:ring-red-100 active:scale-95"
                >
                  <Square className="h-4 w-4" />
                  停止生成
                </button>
              )}
              <button
                type="button"
                onClick={insertSqlTemplate}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
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
                className="rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-violet-50 hover:text-violet-700 hover:ring-violet-200 focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                优化讲稿
              </button>
            </div>
            <button
              type="submit"
              disabled={!connected || !input.trim()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:focus:ring-0 sm:min-h-12 sm:px-6 sm:py-3 sm:text-base"
              title={!connected ? "实时通道未连接，暂时无法发送" : "发送消息"}
            >
              {connected ? "生成演示" : "未连接"}
              <SendHorizonal className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
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
    <div className="flex min-h-full items-center justify-center px-4 py-8 sm:px-8">
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
              className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-slate-200 active:translate-y-0"
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
              className="group flex min-h-40 flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/80 focus:outline-none focus:ring-4 focus:ring-blue-100"
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

function GenerationProgressBubble({
  steps,
  thinkingMessage,
  interrupted,
}: {
  steps: StepPreviewSummary[];
  thinkingMessage?: string;
  interrupted?: boolean;
}) {
  const sortedSteps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);
  const statusText = interrupted
    ? thinkingMessage || "生成已停止"
    : thinkingMessage || "正在生成演示步骤…";

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 shadow-sm">
        <Sparkles className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`rounded-3xl border p-4 ${
            interrupted
              ? "border-amber-200 bg-amber-50"
              : "border-blue-100 bg-blue-50"
          }`}
        >
          <div
            className={`flex items-center gap-2.5 text-sm font-medium ${
              interrupted ? "text-amber-700" : "text-blue-700"
            }`}
          >
            {!interrupted && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            <span>{statusText}</span>
          </div>

          {sortedSteps.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {sortedSteps.map((step) => (
                <li
                  key={`${step.stepIndex}-${step.title}`}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                  <span className="min-w-0 break-words">
                    {step.stepIndex > 0 ? `第 ${step.stepIndex} 步` : "步骤"}
                    「{step.title}」
                    {step.stage ? (
                      <span className="ml-1.5 rounded-full border border-blue-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                        {step.stage}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!interrupted && (
            <div className="mt-3 h-1 rounded-full bg-blue-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ msg, onQuizAnswer }: { msg: WsMessage; onQuizAnswer?: (questionId: string, answer: string, question: Record<string, unknown>) => void }) {
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
        <div className="max-w-[78%] rounded-3xl rounded-tr-md bg-blue-600 px-4 py-3 text-base leading-relaxed text-white shadow-lg shadow-blue-600/15">
          <p className="whitespace-pre-wrap break-words">
            {content || "已发送请求，正在处理。"}
          </p>
        </div>
      </div>
    );
  }

  if (!CHAT_VISIBLE_MESSAGE_EVENTS.has(msg.event)) {
    return null;
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
          className={`rounded-3xl border px-4 py-3 text-base leading-relaxed shadow-sm ${
            msg.event === "demo:complete" && payload.steps
              ? "border-emerald-200 bg-emerald-50"
              : msg.event === "demo:updated"
                ? "border-emerald-200 bg-emerald-50"
              : msg.event === "quiz:generated"
                ? "border-violet-200 bg-violet-50"
                : msg.event === "quiz:result"
                  ? payload.correct
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                  : meta
                    ? `${meta.bg} ${meta.border}`
                    : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          {msg.event === "demo:complete" && Array.isArray(payload.steps) ? (
            <DemoCompleteMessage payload={payload as DemoPayload} />
          ) : msg.event === "demo:updated" ? (
            <SystemEventMessage event={msg.event} payload={payload} content="右侧演示预览已同步最新参数。" />
          ) : msg.event === "quiz:generated" ? (
            <QuizMessage payload={payload as Record<string, unknown>} onQuizAnswer={onQuizAnswer} />
          ) : msg.event === "quiz:result" ? (
            <QuizResultMessage payload={payload as Record<string, unknown>} />
          ) : msg.event === "step:regenerated" && payload.title ? (
            <StepPreviewMessage event={msg.event} payload={payload as Record<string, unknown>} />
          ) : msg.event === "error" ? (
            <SystemEventMessage event={msg.event} payload={payload} content={content} />
          ) : msg.event === "simulator:update" ? (
            <SystemEventMessage
              event={msg.event}
              payload={payload}
              content={content || "模拟器参数已更新，请查看右侧预览。"}
            />
          ) : null}
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
        已生成 {steps.length} 个步骤，完整流程、播放控制和可视化素材已同步到右侧预览。
      </p>
      <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
        请打开右侧大预览查看页面、播放和模拟器
      </p>
    </div>
  );
}

function StepPreviewMessage({ event, payload }: { event: string; payload: Record<string, unknown> }) {
  const title = payload.title as string;
  const stage = payload.stage as string;
  const stageLabel = payload.stageLabel as string;
  const isRegenerated = event === "step:regenerated";
  const stepIndex = typeof payload.stepIndex === "number" ? payload.stepIndex : undefined;

  const stageBadge = stageLabel
    ? stageLabel
    : stage
      ? stage
      : "";

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-semibold ${isRegenerated ? "text-amber-800" : "text-blue-800"}`}>
          {isRegenerated ? "步骤已重写" : "步骤已生成"}
        </p>
        {stageBadge && (
          <span className="rounded-full border border-blue-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-600">
            {stageBadge}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        {stepIndex ? `第 ${stepIndex} 步` : "当前步骤"}「{title}」已同步到右侧预览区。
      </p>
    </div>
  );
}

function SystemEventMessage({
  event,
  payload,
  content,
}: {
  event: string;
  payload: Record<string, unknown>;
  content: string;
}) {
  const code = typeof payload.code === "string" ? payload.code : "";
  const message = typeof payload.message === "string" ? payload.message : content;
  const isError = event === "error";

  return (
    <div>
      <p className={`text-sm font-semibold ${isError ? "text-red-700" : "text-slate-800"}`}>
        {isError ? "操作未完成" : EVENT_META[event]?.label || "系统事件"}
      </p>
      <p className={`mt-1.5 text-sm leading-relaxed ${isError ? "text-red-700" : "text-slate-600"}`}>
        {message || "系统已收到事件并完成同步，详细内容会在对应面板中展示。"}
      </p>
      {code && (
        <span className="mt-2 inline-flex rounded-full border border-red-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-600">
          {code}
        </span>
      )}
    </div>
  );
}

type DemoPayload = {
  title?: string;
  steps?: { index: number; title: string; content: string; stage?: string }[];
};

function QuizMessage({ payload, onQuizAnswer }: { payload: Record<string, unknown>; onQuizAnswer?: (questionId: string, answer: string, question: Record<string, unknown>) => void }) {
  const questions = payload.questions as Array<Record<string, unknown>> || [];
  const topic = payload.topic as string;

  if (!questions.length) return null;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-violet-700">📝 测验</p>
      <QuizCard
        questions={questions.map((q) => ({
          id: q.id as string,
          type: q.type as "choice" | "true_false",
          question: q.question as string,
          options: q.options as string[],
          correct: q.correct as string,
          explanation: q.explanation as string,
        }))}
        topic={topic}
        onAnswer={(questionId: string, answer: string, question) => {
          onQuizAnswer?.(questionId, answer, question as unknown as Record<string, unknown>);
        }}
      />
    </div>
  );
}

function QuizResultMessage({ payload }: { payload: Record<string, unknown> }) {
  const correct = payload.correct as boolean;
  const explanation = payload.explanation as string;
  const correctAnswer = payload.correctAnswer as string;

  return (
    <div>
      <p className={`text-sm font-semibold ${correct ? "text-emerald-700" : "text-red-700"}`}>
        {correct ? "✅ 回答正确！" : `❌ 回答错误（正确答案: ${correctAnswer}）`}
      </p>
      {explanation && (
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{explanation}</p>
      )}
    </div>
  );
}
