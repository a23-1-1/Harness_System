import { useState } from "react";
import type { WsMessage } from "../../types";

interface Props {
  messages: WsMessage[];
  onSend: (text: string) => void;
  connected: boolean;
  activeConv: string | null;
}

export default function ChatPanel({ messages, onSend, connected, activeConv }: Props) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="text-xs text-gray-500">
            {connected ? "已连接" : "未连接"}
            {activeConv ? ` · ${activeConv.slice(0, 8)}...` : ""}
          </span>
        </div>
        <span className="text-xs text-gray-400">DB Demo Studio</span>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-400">
            <p>在下方输入 SQL 或知识点，开始协作生成演示</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`text-sm ${
                msg.event === "step:preview"
                  ? "bg-blue-50 rounded-lg p-3"
                  : msg.event === "agent:thinking"
                  ? "bg-yellow-50 rounded-lg p-2"
                  : msg.event === "demo:complete"
                  ? "bg-green-50 rounded-lg p-3"
                  : "bg-white rounded-lg p-3 shadow-sm"
              }`}
            >
              <p className="text-xs text-gray-400 mb-1">{msg.event}</p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {JSON.stringify(msg.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>

      {/* 输入框 */}
      <form onSubmit={handleSubmit} className="p-3 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入 SQL、知识点或修改指令..."
            disabled={!connected}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-400 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
}
