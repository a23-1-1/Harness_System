/** 清洗 LLM/后端生成的 Mermaid，降低 sequenceDiagram 解析失败概率。 */

const MERMAID_HEADER =
  /^\s*(flowchart|graph|sequenceDiagram|erDiagram|classDiagram|stateDiagram-v2|stateDiagram|gantt|pie|gitGraph|mindmap|timeline|C4Context|block-beta|xychart-beta)/i;

export function isRenderableMermaidCode(raw: string | undefined | null): boolean {
  if (!raw?.trim()) return false;
  const first =
    raw
      .replace(/\r\n/g, "\n")
      .split("\n")
      .find((line) => line.trim())?.trim() ?? "";
  return MERMAID_HEADER.test(first);
}

/** 移除 Mermaid render 遗留在 body 上的临时节点（v11 默认错误 SVG 会污染 DOM）。 */
export function cleanupMermaidOrphanNodes(): void {
  const root = document.getElementById("root");
  document.querySelectorAll('body > div[id^="d"], body > div[id^="dmermaid"]').forEach((el) => {
    if (!root?.contains(el)) el.remove();
  });
  document.querySelectorAll('body > svg[id*="error"]').forEach((el) => {
    if (!root?.contains(el)) el.remove();
  });
}

function isSequenceDiagram(code: string): boolean {
  return /^\s*sequenceDiagram/m.test(code);
}

function isFlowchart(code: string): boolean {
  return /^\s*(flowchart|graph)\s/m.test(code);
}

/** 方括号/圆括号节点内的标签若含 : > ( ) 等，必须用引号包裹。 */
function quoteNodeLabel(label: string): string {
  const inner = label.trim();
  if (!inner) return '""';
  if (/^".*"$/.test(inner)) return inner;
  if (/[:<>()[\]{}|]/.test(inner) || /\s/.test(inner)) {
    return `"${inner.replace(/"/g, "'")}"`;
  }
  return inner;
}

function sanitizeBracketNodes(line: string): string {
  return line
    .replace(/(\b[\w-]+)\[([^\]"\n]+)\]/g, (_, id: string, label: string) => {
      return `${id}[${quoteNodeLabel(label)}]`;
    })
    .replace(/(\b[\w-]+)\(([^)"\n]+)\)/g, (_, id: string, label: string) => {
      return `${id}(${quoteNodeLabel(label)})`;
    })
    .replace(/\[\[([^\]"\n]+)\]\]/g, (_, label: string) => {
      return `[["${label.trim().replace(/"/g, "'")}"]]`;
    });
}

function sanitizeFlowchartLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("%%")) return trimmed;
  if (/^(subgraph|end|classDef|class|style|linkStyle|click)\b/i.test(trimmed)) {
    return sanitizeBracketNodes(trimmed);
  }
  if (/(-->|---|-\.->|==>|---o|--o|x--|o--)/.test(trimmed)) {
    return sanitizeBracketNodes(trimmed);
  }
  // 裸文本行如 "Table Scan: students" → 转为可渲染节点
  if (/^[\w\s.:><=+-]+$/.test(trimmed) && /:/.test(trimmed)) {
    const safe = trimmed.replace(/"/g, "'");
    const id = `N${Math.abs(safe.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 10000}`;
    return `${id}["${safe}"]`;
  }
  return sanitizeBracketNodes(trimmed);
}

function linkOrphanFlowchartNodes(lines: string[]): string[] {
  const result: string[] = [];
  const orphanIds: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const nodeOnly = trimmed.match(/^([\w-]+)\[/);
    if (nodeOnly && !/-->|---/.test(trimmed)) {
      orphanIds.push(nodeOnly[1]);
      result.push(trimmed);
      continue;
    }
    result.push(trimmed);
  }
  if (orphanIds.length >= 2) {
    for (let i = 0; i < orphanIds.length - 1; i += 1) {
      const edge = `${orphanIds[i]} --> ${orphanIds[i + 1]}`;
      if (!result.some((l) => l.includes(edge))) {
        result.push(edge);
      }
    }
  }
  return result;
}

function sanitizeParticipantName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "Node";
  if (/^[\w]+$/.test(trimmed)) return trimmed;
  const alias = trimmed.replace(/[^\w]/g, "").slice(0, 12) || "Node";
  return alias;
}

function sanitizeSequenceLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("%%")) return trimmed || null;
  if (/^-{3,}$/.test(trimmed)) return null;

  const participantMatch = trimmed.match(/^participant\s+(\S+)(?:\s+as\s+(.+))?$/i);
  if (participantMatch) {
    const alias = sanitizeParticipantName(participantMatch[1]);
    const label = participantMatch[2]?.trim();
    return label ? `participant ${alias} as ${label}` : `participant ${alias}`;
  }

  const arrowMatch = trimmed.match(
    /^([\w\s]+?)(->>|-->>|->|-->|-x|-x)([\w\s]+?)\s*:\s*(.+)$/,
  );
  if (arrowMatch) {
    const from = sanitizeParticipantName(arrowMatch[1]);
    const arrow = arrowMatch[2];
    const to = sanitizeParticipantName(arrowMatch[3]);
    let message = arrowMatch[4].trim();
    if (/[\[\]{}()]/.test(message) && !/^".*"$/.test(message)) {
      message = `"${message.replace(/"/g, "'")}"`;
    }
    return `${from}${arrow}${to}: ${message}`;
  }

  if (/->>|-->>|->|-->/.test(trimmed) && !trimmed.includes(":")) {
    return null;
  }

  return trimmed;
}

export function sanitizeMermaidCode(raw: string): string {
  if (!raw?.trim()) return "";

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const firstLine = lines.find((l) => l.trim())?.trim() ?? "";
  const header = firstLine.startsWith("sequenceDiagram")
    ? "sequenceDiagram"
    : firstLine.startsWith("flowchart") || firstLine.startsWith("graph")
      ? firstLine
      : firstLine.startsWith("erDiagram")
        ? "erDiagram"
        : firstLine;

  const bodyStart = lines.findIndex((l) => l.trim() === header.trim());
  const bodyLines = bodyStart >= 0 ? lines.slice(bodyStart + 1) : lines.slice(1);

  if (isSequenceDiagram(raw) || header === "sequenceDiagram") {
    const sanitized = bodyLines
      .map(sanitizeSequenceLine)
      .filter((l): l is string => Boolean(l));
    return ["sequenceDiagram", ...sanitized].join("\n");
  }

  if (isFlowchart(raw) || /^flowchart|^graph/i.test(header)) {
    const sanitized = linkOrphanFlowchartNodes(
      bodyLines.map(sanitizeFlowchartLine).filter(Boolean),
    );
    return [header, ...sanitized].join("\n");
  }

  return [header, ...bodyLines.map((l) => sanitizeBracketNodes(l.trim())).filter(Boolean)].join("\n");
}

export function mermaidFallbackFlowchart(title: string): string {
  const safe = title.replace(/"/g, "'").slice(0, 40) || "演示步骤";
  return `flowchart TD\n  A["${safe}"] --> B["详细流程请在右侧播放/页面预览查看"]`;
}
