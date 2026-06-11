import type { DemoComplete, DemoStep } from "../types";

export function normalizeDemoStep(raw: unknown, fallbackIndex: number): DemoStep {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const index =
    typeof source.index === "number" && source.index > 0
      ? source.index
      : fallbackIndex;

  return {
    index,
    title: typeof source.title === "string" ? source.title : `步骤 ${index}`,
    content: typeof source.content === "string" ? source.content : "",
    stage: typeof source.stage === "string" ? source.stage : undefined,
    interactive_hint:
      typeof source.interactive_hint === "string"
        ? source.interactive_hint
        : typeof source.interactiveHint === "string"
          ? source.interactiveHint
          : undefined,
    mermaid:
      typeof source.mermaid === "string" && source.mermaid
        ? source.mermaid
        : undefined,
    mermaid_type:
      typeof source.mermaid_type === "string"
        ? source.mermaid_type
        : typeof source.mermaidType === "string"
          ? source.mermaidType
          : undefined,
    simConfig:
      (source.simConfig &&
      typeof source.simConfig === "object" &&
      !Array.isArray(source.simConfig)
        ? (source.simConfig as Record<string, unknown>)
        : undefined) ??
      (source.sim_config &&
      typeof source.sim_config === "object" &&
      !Array.isArray(source.sim_config)
        ? (source.sim_config as Record<string, unknown>)
        : undefined),
  };
}

/** 过滤空洞项，保证右侧预览不会因稀疏 steps 崩溃。 */
export function normalizeDemoSteps(raw: unknown): DemoStep[] {
  if (!Array.isArray(raw)) return [];

  const dense: DemoStep[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    if (item == null) continue;
    dense.push(normalizeDemoStep(item, i + 1));
  }
  return dense;
}

export function upsertDemoStep(steps: DemoStep[], step: DemoStep): DemoStep[] {
  const slot = Math.max(0, step.index - 1);
  const next = [...steps];

  while (next.length <= slot) {
    const placeholderIndex = next.length + 1;
    next.push({
      index: placeholderIndex,
      title: `步骤 ${placeholderIndex}`,
      content: "等待生成...",
    });
  }

  next[slot] = {
    ...next[slot],
    ...step,
    index: step.index > 0 ? step.index : slot + 1,
  };
  return next;
}

export function normalizeDemoPayload(payload: unknown): DemoComplete | null {
  if (!payload || typeof payload !== "object") return null;

  const source = payload as Record<string, unknown>;
  return {
    demoId:
      typeof source.demoId === "string"
        ? source.demoId
        : `demo_${Date.now()}`,
    title: typeof source.title === "string" ? source.title : "演示",
    steps: normalizeDemoSteps(source.steps),
    simulator_type:
      typeof source.simulator_type === "string"
        ? source.simulator_type
        : undefined,
    simulator_config:
      source.simulator_config &&
      typeof source.simulator_config === "object" &&
      !Array.isArray(source.simulator_config)
        ? (source.simulator_config as Record<string, unknown>)
        : undefined,
    demo_type:
      typeof source.demo_type === "string" ? source.demo_type : undefined,
  };
}
