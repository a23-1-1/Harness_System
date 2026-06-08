import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useConversations } from "./hooks/useConversations";
import ConversationPanel from "./components/ConversationPanel";
import ChatPanel from "./components/ChatPanel";
import DemoPreview from "./components/DemoPreview";
import type { DemoComplete } from "./types";

export default function App() {
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const { connected, messages: wsMessages, send } = useWebSocket("default", activeConv || "default");
  const { conversations, create, remove, rename } = useConversations();
  const [lastDemo, setLastDemo] = useState<DemoComplete | null>(null);

  // 监听 WebSocket 消息，提取最新的演示完成事件
  const latestDemoMsg = [...wsMessages].reverse().find((m) => m.event === "demo:complete");
  if (latestDemoMsg && latestDemoMsg.payload !== lastDemo) {
    setLastDemo(latestDemoMsg.payload as unknown as DemoComplete);
  }

  const handleSend = (text: string) => {
    send("chat:message", { type: "text", content: text });
  };

  const handleCreateConv = async (title?: string) => {
    const conv = await create(title);
    setActiveConv(conv.id);
  };

  return (
    <div className="flex h-screen bg-slate-100 p-3 gap-3">
      {/* 左栏：对话列表 */}
      <div className="w-72 flex-shrink-0">
        <div className="h-full bg-white rounded-xl shadow-sm overflow-hidden">
          <ConversationPanel
            conversations={conversations}
            activeId={activeConv}
            onSelect={setActiveConv}
            onCreate={handleCreateConv}
            onDelete={remove}
            onRename={rename}
          />
        </div>
      </div>

      {/* 中栏：聊天面板 */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-sm overflow-hidden">
        <ChatPanel
          messages={wsMessages}
          onSend={handleSend}
          connected={connected}
          activeConv={activeConv}
        />
      </div>

      {/* 右栏：演示预览 */}
      <div className="w-96 flex-shrink-0 bg-white rounded-xl shadow-sm overflow-hidden">
        <DemoPreview demo={lastDemo} />
      </div>
    </div>
  );
}
