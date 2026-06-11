import type { DemoComplete, WsMessage } from "../types";
import { normalizeDemoPayload } from "./demoNormalize";

const ACTIVE_CONV_KEY = "dbdemo_active_conv";

export function readStoredActiveConv(): string | null {
  try {
    const id = localStorage.getItem(ACTIVE_CONV_KEY);
    return id?.trim() || null;
  } catch {
    return null;
  }
}

export function writeStoredActiveConv(convId: string | null): void {
  try {
    if (convId) {
      localStorage.setItem(ACTIVE_CONV_KEY, convId);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function extractLatestDemoFromMessages(messages: WsMessage[]): DemoComplete | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.event !== "demo:complete" && msg.event !== "demo:updated") continue;
    const normalized = normalizeDemoPayload(msg.payload);
    if (normalized && normalized.steps.length > 0) return normalized;
  }
  return null;
}

interface PersistedMessage {
  id: string;
  type: string;
  content?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export async function fetchConversationDemo(convId: string): Promise<DemoComplete | null> {
  if (!convId || convId === "default") return null;

  try {
    const res = await fetch(`/api/v5/conversations/${convId}/messages?limit=200`);
    if (!res.ok) return null;
    const data = (await res.json()) as { messages?: PersistedMessage[] };
    const rows = data.messages ?? [];

    for (let i = rows.length - 1; i >= 0; i -= 1) {
      const row = rows[i];
      if (row.type !== "demo_snapshot") continue;
      const content = row.content ?? {};
      const steps = content.steps;
      if (!Array.isArray(steps) || steps.length === 0) continue;
      const meta = row.metadata ?? {};
      return normalizeDemoPayload({
        demoId: typeof meta.demoId === "string" ? meta.demoId : row.id,
        title: typeof content.title === "string" ? content.title : "演示",
        steps,
        demo_type: typeof content.demo_type === "string" ? content.demo_type : undefined,
      });
    }

    const snapRes = await fetch(`/api/v5/conversations/${convId}/snapshots?limit=1`);
    if (!snapRes.ok) return null;
    const snapData = (await snapRes.json()) as {
      snapshots?: Array<{ id: string; title?: unknown; demo_type?: string }>;
    };
    const latest = snapData.snapshots?.[0];
    if (!latest?.id) return null;

    const demoRes = await fetch(`/api/v5/demos/${latest.id}`);
    if (!demoRes.ok) return null;
    const demo = (await demoRes.json()) as {
      id: string;
      title?: { zh?: string } | string;
      demo_type?: string;
      content?: { steps?: unknown[] };
    };
    const title =
      typeof demo.title === "object" && demo.title !== null
        ? demo.title.zh
        : typeof demo.title === "string"
          ? demo.title
          : "演示";

    return normalizeDemoPayload({
      demoId: demo.id,
      title: title || "演示",
      steps: demo.content?.steps,
      demo_type: demo.demo_type,
    });
  } catch (err) {
    console.warn("[DemoRestore] 加载演示失败:", err);
    return null;
  }
}
