import type { WsMessage } from "../types";

/** 不在聊天区展示的系统/心跳事件 */
export const CHAT_HIDDEN_EVENTS = new Set([
  "ping",
  "pong",
  "conv:loaded",
  "conv:list",
  "conv:switched",
  "room:members",
  "room:member_count",
  "agent:tool_call",
]);

export interface StepPreviewSummary {
  stepIndex: number;
  title: string;
  stage?: string;
}

export type ChatDisplayItem =
  | { kind: "message"; msg: WsMessage }
  | {
      kind: "generation";
      steps: StepPreviewSummary[];
      thinkingMessage?: string;
      interrupted?: boolean;
    };

function extractStepPreview(msg: WsMessage): StepPreviewSummary | null {
  const p = msg.payload as Record<string, unknown>;
  const title = typeof p.title === "string" ? p.title : "";
  if (!title) return null;
  const stepIndex =
    typeof p.stepIndex === "number" && p.stepIndex > 0 ? p.stepIndex : 0;
  const stage = typeof p.stage === "string" ? p.stage : undefined;
  return { stepIndex, title, stage };
}

export function buildChatDisplayItems(messages: WsMessage[]): ChatDisplayItem[] {
  const items: ChatDisplayItem[] = [];
  let pendingSteps: StepPreviewSummary[] = [];
  let pendingThinking: string | undefined;
  let pendingInterrupted = false;

  const flushGeneration = () => {
    if (
      pendingSteps.length === 0 &&
      !pendingThinking &&
      !pendingInterrupted
    ) {
      return;
    }
    items.push({
      kind: "generation",
      steps: [...pendingSteps],
      thinkingMessage: pendingThinking,
      interrupted: pendingInterrupted || undefined,
    });
    pendingSteps = [];
    pendingThinking = undefined;
    pendingInterrupted = false;
  };

  for (const msg of messages) {
    if (CHAT_HIDDEN_EVENTS.has(msg.event)) continue;

    if (msg.event === "step:preview") {
      const step = extractStepPreview(msg);
      if (step) {
        const existing = pendingSteps.findIndex(
          (s) => s.stepIndex === step.stepIndex,
        );
        if (existing >= 0) {
          pendingSteps[existing] = step;
        } else {
          pendingSteps.push(step);
        }
      }
      continue;
    }

    if (msg.event === "agent:thinking") {
      const p = msg.payload as Record<string, unknown>;
      const step = p.step as string | undefined;
      const message = p.message as string | undefined;
      if (step === "interrupted") {
        pendingInterrupted = true;
        pendingThinking = message || "生成已停止";
      } else {
        pendingThinking = message || pendingThinking;
      }
      continue;
    }

    if (msg.event === "demo:complete") {
      const hasLaterComplete = messages
        .slice(messages.indexOf(msg) + 1)
        .some((m) => m.event === "demo:complete");
      if (hasLaterComplete) continue;
    }

    flushGeneration();
    items.push({ kind: "message", msg });
  }

  flushGeneration();
  return items;
}
