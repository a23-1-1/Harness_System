import { useState, useRef, useEffect } from "react";
import type { WsMessage } from "../../types";

interface Props {
  messages: WsMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  activeConv: string | null;
}

const EVENT_META: Record<string, { label: string; bg: string; border: string; text: string }> = {
  "step:preview": {
    label: "📋 步骤预览",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
  },
  "agent:thinking": {
    label: "🤔 AI 思考中",
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-600",
  },
  "demo:complete": {
    label: "✅ 演示就绪",
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-600",
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
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="relative flex w-2.5 h-2.5 items-center justify-center">
            <span className={`absolute inset-0 rounded-full ${connected ? "bg-green-500 animate-ping opacity-30" : ""}`} />
            <span className={`relative w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`} />
          </span>
          <span className="text-[11px] font-medium text-gray-500">
            {connected ? "已连接" : "未连接"}
            {activeConv ? <span className="ml-1 text-gray-400 font-mono">· {activeConv.slice(0, 10)}</span> : null}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          DB Demo Studio
        </div>
      </div>

      {/* 消息流 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-gray-50 border border-gray-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">开始 AI 协作</p>
              <p className="text-[11px] text-gray-400 mt-1">输入 SQL 或课程知识点，AI 将自动生成交互式演示</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 底部输入区 */}
      <form onSubmit={handleSubmit} className="px-3 pb-3 pt-1 border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-2 py-1.5
                        transition-all duration-200 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/30">
          <button type="button" title="插入 SQL 代码块"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                       text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 SQL、知识点或修改指令…"
            disabled={!connected}
            className="flex-1 py-1.5 text-xs bg-transparent text-gray-700 placeholder:text-gray-400 outline-none disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold
                       text-white bg-blue-500 rounded-lg
                       hover:bg-blue-600 active:scale-[0.97]
                       disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                       transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            发送
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ msg }: { msg: WsMessage }) {
  const meta = EVENT_META[msg.event];
  const payload = msg.payload as Record<string, unknown>;

  // 用户消息：右对齐蓝色气泡
  if (msg.event === "chat:message" || !meta) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-500/10 border border-blue-200 text-gray-700 text-xs leading-relaxed">
          <pre className="whitespace-pre-wrap font-sans">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      </div>
    );
  }

  // AI 回复
  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-[10px] font-bold text-white">AI</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`flex items-center gap-1.5 mb-1.5 ${meta.text}`}>
          {msg.event === "agent:thinking" && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          )}
          {msg.event === "agent:thinking" && (
            <span className="text-[10px] text-gray-500">
              {(payload as Record<string, unknown>)?.step === "analyze"
                ? "🔍 正在调用 sql_analyze…"
                : (payload as Record<string, unknown>)?.message || "正在思考…"}
            </span>
          )}
          <span className={`text-[10px] font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
        <div className={`rounded-xl p-3 border ${meta.bg} ${meta.border} text-xs text-gray-600`}>
          {msg.event === "agent:thinking" ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <span className="text-[10px] text-gray-400">67%</span>
            </div>
          ) : msg.event === "demo:complete" && payload.steps ? (
            <div>
              <p className="font-semibold text-gray-700 mb-2">{(payload as DemoPayload).title}</p>
              <div className="flex gap-2 flex-wrap">
                {((payload as DemoPayload).steps || []).slice(0, 3).map((s, si) => (
                  <span key={si} className="px-2 py-1 rounded-md bg-gray-100 text-[10px] text-gray-600">{s.index}. {s.title}</span>
                ))}
                {((payload as DemoPayload).steps || []).length > 3 && (
                  <span className="px-2 py-1 text-[10px] text-gray-400">+{((payload as DemoPayload).steps || []).length - 3} 步</span>
                )}
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-600 leading-relaxed">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

type DemoPayload = { title?: string; steps?: { index: number; title: string; content: string }[] };
