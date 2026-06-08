import { useState, useRef, useEffect } from "react";
import { Sparkles, Database, Loader2, Terminal, SendHorizonal, Code2 } from "lucide-react";
import type { WsMessage } from "../../types";

interface Props {
  messages: WsMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  activeConv: string | null;
}

const QUICK_CARDS = [
  {
    icon: "💡",
    title: "演示 B+ 树节点分裂",
    desc: "可视化索引插入与平衡过程",
  },
  {
    icon: "⚡",
    title: "分析 JOIN 优化器代价",
    desc: "对比 Nested Loop / Hash / Sort Merge",
  },
  {
    icon: "🔒",
    title: "演示 RR 级幻读",
    desc: "双会话事务隔离级别模拟",
  },
];

const EVENT_META: Record<
  string,
  { label: string; bg: string; border: string; text: string }
> = {
  "step:preview": {
    label: "步骤预览",
    bg: "bg-blue-50/20",
    border: "border-blue-100/60",
    text: "text-blue-700",
  },
  "agent:thinking": {
    label: "工具调度",
    bg: "bg-blue-50/20",
    border: "border-blue-100/60",
    text: "text-blue-700",
  },
  "demo:complete": {
    label: "演示就绪",
    bg: "bg-emerald-50/50",
    border: "border-emerald-200/60",
    text: "text-emerald-700",
  },
};

export default function ChatPanel({ messages, onSend, connected, activeConv }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── 顶部状态栏 ─── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="relative flex w-2.5 h-2.5 items-center justify-center">
            <span
              className={`absolute inset-0 rounded-full ${
                connected ? "bg-emerald-400 animate-ping opacity-40" : ""
              }`}
            />
            <span
              className={`relative w-2 h-2 rounded-full ${
                connected ? "bg-emerald-500" : "bg-red-400"
              }`}
            />
          </span>
          <span className="text-xs font-medium text-slate-500">
            {connected ? "已连接" : "未连接"}
            {activeConv && (
              <span className="ml-1.5 text-slate-400 font-mono">
                / {activeConv.slice(0, 10)}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Terminal className="w-3.5 h-3.5 text-slate-400" />
          DB Demo Studio
        </div>
      </div>

      {/* ─── 消息流区域 ─── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 ? (
          <WelcomeView onQuickSelect={onSend} />
        ) : (
          <div className="space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ─── 底部悬浮控制台 ─── */}
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-slate-100 px-4 py-3 bg-white/80 backdrop-blur-md"
      >
        <div className="flex items-end gap-2 bg-slate-50/90 rounded-2xl border border-slate-200 px-3 py-2 transition-all duration-200 focus-within:border-blue-400/70 focus-within:ring-2 focus-within:ring-blue-400/15">
          <button
            type="button"
            title="插入 SQL 代码块"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl
                       text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <Code2 className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 SQL、知识点或修改指令…"
            disabled={!connected}
            className="flex-1 py-1.5 text-sm bg-transparent text-slate-800 placeholder:text-slate-400 outline-none disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl
                       bg-slate-900 text-white
                       hover:bg-slate-800 active:scale-95
                       disabled:bg-slate-200 disabled:text-slate-300 disabled:cursor-not-allowed
                       transition-all duration-150"
          >
            <SendHorizonal className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * WelcomeView — 欢迎空白页
 * ────────────────────────────────────────────── */
function WelcomeView({ onQuickSelect }: { onQuickSelect: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      {/* 发光圆环包裹的图标 */}
      <div className="relative">
        <div className="absolute inset-0 bg-blue-50/60 rounded-full blur-xl scale-150" />
        <div className="relative p-4 rounded-full bg-blue-50/80 border border-blue-100/60">
          <Database className="w-8 h-8 text-blue-500 animate-pulse" />
        </div>
      </div>

      {/* 标题 */}
      <h1 className="text-slate-900 text-2xl font-semibold tracking-tight mt-5">
        DB Demo Studio
      </h1>
      <p className="text-slate-500 text-sm mt-1.5 max-w-md text-center leading-relaxed">
        输入 SQL 查询或课程知识点，AI 将自动生成交互式数据库演示
      </p>

      {/* 快捷功能探查卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 w-full max-w-2xl">
        {QUICK_CARDS.map((card) => (
          <button
            key={card.title}
            onClick={() => onQuickSelect(card.title)}
            className="group flex flex-col items-start p-4 bg-white rounded-xl border border-slate-100
                       text-left cursor-pointer
                       hover:-translate-y-0.5 hover:shadow-md hover:border-slate-300
                       transition-all duration-300"
          >
            <span className="text-lg">{card.icon}</span>
            <span className="text-sm font-semibold text-slate-800 mt-2 group-hover:text-blue-600 transition-colors">
              {card.title}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {card.desc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * MessageBubble — 消息气泡
 * ────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: WsMessage }) {
  const payload = msg.payload as Record<string, unknown>;

  // ─── 用户消息：右对齐 ───
  if (msg.event === "chat:message") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-slate-100 text-slate-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
    );
  }

  // ─── 工具调用轨迹（agent:thinking） ───
  if (msg.event === "agent:thinking") {
    const step = (payload as Record<string, unknown>)?.step as string;
    const message = (payload as Record<string, unknown>)?.message as string;
    const toolLabel =
      step === "analyze"
        ? "正在调用 sql_analyze 分析 SQL…"
        : message || "正在调度 MCP 工具链…";

    return (
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="bg-blue-50/20 border border-blue-100/60 p-3 rounded-xl">
            <div className="flex items-center gap-2.5 text-xs text-blue-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
              <span>{toolLabel}</span>
            </div>
            {/* 进度条 */}
            <div className="mt-2.5 h-1 rounded-full bg-slate-200/60 overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── 其他事件（step:preview / demo:complete / 未知） ───
  const meta = EVENT_META[msg.event];

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        {meta && (
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[11px] font-semibold ${meta.text}`}>{meta.label}</span>
          </div>
        )}
        <div
          className={`rounded-xl px-4 py-3 text-sm leading-relaxed border ${
            msg.event === "demo:complete" && payload.steps
              ? "bg-emerald-50/50 border-emerald-200/60"
              : meta
              ? `${meta.bg} ${meta.border}`
              : "bg-white border-slate-100 text-slate-900"
          }`}
        >
          {msg.event === "demo:complete" && payload.steps ? (
            <div>
              <p className="font-semibold text-slate-800 mb-2.5">
                {(payload as DemoPayload).title}
              </p>
              <div className="flex flex-wrap gap-2">
                {((payload as DemoPayload).steps || []).slice(0, 3).map((s, si) => (
                  <span
                    key={si}
                    className="px-3 py-1 rounded-lg bg-white/70 border border-emerald-100 text-xs text-emerald-700 font-medium shadow-sm"
                  >
                    {s.index}. {s.title}
                  </span>
                ))}
                {((payload as DemoPayload).steps || []).length > 3 && (
                  <span className="px-3 py-1 text-xs text-slate-400">
                    +{((payload as DemoPayload).steps || []).length - 3} 步
                  </span>
                )}
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-slate-800">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

type DemoPayload = {
  title?: string;
  steps?: { index: number; title: string; content: string }[];
};
