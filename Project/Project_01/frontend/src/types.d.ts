/// <reference types="vite/client" />

interface Conversation {
  id: string;
  teacher_id: string;
  title: string;
  status: "active" | "draft" | "finalized" | "archived";
  demo_type: "p0" | "p1" | "p2" | null;
  tags: string[];
  message_count: number;
  snapshot_count: number;
  summary: string;
  created_at: string;
  updated_at: string;
}

interface WsMessage {
  event: string;
  payload: Record<string, unknown>;
}

interface DemoStep {
  index: number;
  title: string;
  content: string;
}

interface DemoComplete {
  demoId: string;
  title: string;
  steps: DemoStep[];
}

export type { Conversation, WsMessage, DemoStep, DemoComplete };
