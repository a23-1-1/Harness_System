import { useState } from "react";
import { useWebSocket } from "./hooks/useWebSocket";
import { useConversations } from "./hooks/useConversations";
import ConversationPanel from "./components/ConversationPanel";
import ChatPanel from "./components/ChatPanel";
import DemoPreview from "./components/DemoPreview";
import type { DemoComplete } from "./types";

export default function App() {
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const { connected, messages: wsMessages, send } = useWebSocket(
    "default",
    activeConv || "default",
  );
  const { conversations, create, remove, rename } = useConversations();
  const [lastDemo, setLastDemo] = useState<DemoComplete | null>(null);

  // 监听 WS 提取最新演示完成事件
  const latestDemoMsg = [...wsMessages]
    .reverse()
    .find((m) => m.event === "demo:complete");
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
    <div className="flex h-screen bg-[#0f1117] p-2 gap-2 select-none">
      {/* 左栏：对话列表 */}
      <div className="w-64 flex-shrink-0">
        <div className="h-full bg-[#1a1b26] rounded-xl border border-[#292e42] overflow-hidden flex flex-col">
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

      {/* 中栏：核心对话工作区 */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 bg-[#1a1b26] rounded-xl border border-[#292e42] overflow-hidden flex flex-col">
          <ChatPanel
            messages={wsMessages}
            onSend={handleSend}
            connected={connected}
            activeConv={activeConv}
          />
        </div>
      </div>

      {/* 右栏：动态演示预览 */}
      <div className="w-[420px] flex-shrink-0">
        <div className="h-full bg-[#1a1b26] rounded-xl border border-[#292e42] overflow-hidden flex flex-col">
          <DemoPreview demo={lastDemo} />
        </div>
      </div>
    </div>
  );
}
