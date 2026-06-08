import { useState, useRef, useEffect } from "react";
import type { WsMessage } from "../../types";

interface Props {
  messages: WsMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  activeConv: string | null;
}

export default function ChatPanel({ messages, onSend, connected, activeConv }: Props) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新消息自动滚到底部
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {/* 连接指示灯 */}
          <span className="relative flex items-center justify-center w-2.5 h-2.5">
            <span className={`absolute inset-0 rounded-full ${connected ? "bg-green-500 animate-ping opacity-40" : ""}`} />
            <span className={`relative w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-400"}`} />
          </span>
          <span className="text-xs font-medium text-slate-500">
            {connected ? "已连接" : "未连接"}
            {activeConv ? (
              <span className="ml-1 text-slate-400">· 对话 {activeConv.slice(0, 8)}</span>
            ) : null}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="text-xs font-medium text-slate-400">DB Demo Studio</span>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            {/* 空状态大图标 */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 flex items-center justify-center border border-slate-200">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">开始协作</p>
              <p className="text-xs text-slate-400 mt-1">在下方输入 SQL 或知识点，AI 将自动生成演示</p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm rounded-xl p-4 border transition-all ${
                msg.event === "step:preview"
                  ? "bg-blue-50/60 border-blue-100"
                  : msg.event === "agent:thinking"
                  ? "bg-amber-50/60 border-amber-100"
                  : msg.event === "demo:complete"
                  ? "bg-emerald-50/60 border-emerald-100"
                  : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              {/* 事件标签 */}
              <div className="flex items-center gap-1.5 mb-2">
                {msg.event === "agent:thinking" && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                )}
                <span className={`text-xs font-medium ${
                  msg.event === "step:preview" ? "text-blue-500" :
                  msg.event === "agent:thinking" ? "text-amber-500" :
                  msg.event === "demo:complete" ? "text-emerald-500" :
                  "text-slate-400"
                }`}>
                  {msg.event === "step:preview" && "📋 步骤预览"}
                  {msg.event === "agent:thinking" && "🤔 AI 思考中"}
                  {msg.event === "demo:complete" && "✅ 演示就绪"}
                  {msg.event !== "step:preview" && msg.event !== "agent:thinking" && msg.event !== "demo:complete" && msg.event}
                </span>
              </div>
              <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                {JSON.stringify(msg.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
        {/* 自动滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-slate-100">
        <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 p-2 transition-all duration-150 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20 focus-within:bg-white">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 SQL、知识点或修改指令..."
            disabled={!connected}
            className="flex-1 px-2 py-1.5 text-sm bg-transparent text-slate-700 placeholder:text-slate-400 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg transition-all duration-150 hover:bg-blue-600 active:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
