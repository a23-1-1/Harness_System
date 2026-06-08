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

  const panelClass =
    "h-full bg-white rounded-2xl border border-slate-200/60 overflow-hidden flex flex-col " +
    "shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_24px_-4px_rgba(0,0,0,0.04)]";

  return (
    <div className="h-[calc(100vh-2.5rem)] flex p-5 gap-5 bg-[#f8fafc]">
      {/* 左栏：对话列表 */}
      <div className="w-64 flex-shrink-0">
        <div className={panelClass}>
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
        <div className={panelClass}>
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
        <div className={panelClass}>
          <DemoPreview demo={lastDemo} />
        </div>
      </div>
    </div>
  );
}
