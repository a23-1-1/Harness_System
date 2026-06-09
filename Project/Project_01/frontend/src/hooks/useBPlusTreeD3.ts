import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { Selection } from "d3";

export interface BTreeNode {
  id: string;
  keys: number[];
  type: "internal" | "leaf";
  highlight?: boolean;
  children?: string[];
}

/**
 * D3 渲染 B+树节点的动画 hook。
 * enter/update/exit 模式，节点增删有过渡动画。
 * 使用 ResizeObserver 感知容器尺寸变化，避免 clientWidth=0 (#1)。
 */
export function useBPlusTreeD3(
  svgRef: React.RefObject<SVGSVGElement | null>,
  nodes: BTreeNode[] | undefined,
  action: string,
) {
  // 用 ref 持有实际可用宽度，ResizeObserver 更新
  const widthRef = useRef(500);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    // ResizeObserver 监听容器宽度 (#1)
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        widthRef.current = entry.contentRect.width || 500;
      }
    });
    ro.observe(el);

    return () => ro.disconnect();
  }, [svgRef]);

  useEffect(() => {
    if (!svgRef.current || !nodes?.length) return;

    const svg = d3.select(svgRef.current);
    const width = widthRef.current;
    const nodeW = 90;
    const nodeH = 36;
    const gapX = 40;

    // 布局：多行排列
    const isMultiRow = nodes.length > 2;
    const perRow = isMultiRow ? Math.ceil(nodes.length / 2) : nodes.length;

    const positions = nodes.map((n, i) => {
      if (isMultiRow && i < perRow) {
        const totalWidth = perRow * (nodeW + gapX) - gapX;
        const startX = Math.max(0, (width - totalWidth) / 2);
        return { x: startX + i * (nodeW + gapX), y: 30 };
      } else {
        const colIdx = isMultiRow ? i - perRow : i;
        const count = isMultiRow ? nodes.length - perRow : nodes.length;
        const totalWidth = count * (nodeW + gapX) - gapX;
        const startX = Math.max(0, (width - totalWidth) / 2);
        return { x: startX + colIdx * (nodeW + gapX), y: isMultiRow ? 110 : 60 };
      }
    });

    // ── 连线 ──
    const links: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
    nodes.forEach((n, i) => {
      if (n.children && positions[i]) {
        n.children.forEach((cid) => {
          const childIdx = nodes.findIndex((c) => c.id === cid);
          if (childIdx >= 0 && positions[childIdx]) {
            links.push({
              x1: positions[i].x + nodeW / 2,
              y1: positions[i].y + nodeH,
              x2: positions[childIdx].x + nodeW / 2,
              y2: positions[childIdx].y,
              key: `${n.id}->${cid}`,
            });
          }
        });
      }
    });

    // ── 连线 enter/update/exit (#2/#8) ──
    const linkLines = svg.selectAll<SVGLineElement, typeof links[0]>("line.tree-link")
      .data(links, (l) => l.key);

    linkLines.exit()
      .transition()
      .duration(200)
      .attr("opacity", 0)
      .remove();

    const linkEnter = linkLines.enter()
      .append("line")
      .attr("class", "tree-link")
      .attr("stroke", "#cbd5e1")
      .attr("stroke-width", 1.5)
      .attr("opacity", 0);

    linkEnter.merge(linkLines)
      .transition()
      .duration(300)
      .attr("opacity", 1)
      .attr("x1", (l) => l.x1)
      .attr("y1", (l) => l.y1)
      .attr("x2", (l) => l.x2)
      .attr("y2", (l) => l.y2);

    // ── 节点 enter/update/exit ──
    const nodeGroup = svg.selectAll<SVGGElement, BTreeNode>("g.bplus-node")
      .data(nodes, (n) => n.id);

    nodeGroup.exit()
      .transition()
      .duration(250)
      .attr("opacity", 0)
      .remove();

    const enter = nodeGroup.enter()
      .append("g")
      .attr("class", "bplus-node")
      .attr("opacity", 0);

    enter.append("rect")
      .attr("rx", 6).attr("ry", 6)
      .attr("width", nodeW).attr("height", nodeH);

    enter.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("font-size", "11px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .attr("fill", "#334155");

    const merge = enter.merge(nodeGroup);

    merge.transition()
      .duration(350)
      .attr("opacity", 1)
      .attr("transform", (d, i) => `translate(${positions[i].x}, ${positions[i].y})`);

    merge.select("rect")
      .transition()
      .duration(250)
      .attr("fill", (d) => d.highlight ? "#eff6ff" : "#fff")
      .attr("stroke", (d) => d.highlight ? "#2563eb" : "#e2e8f0")
      .attr("stroke-width", (d) => d.highlight ? 2.5 : 1.5);

    merge.select("text")
      .text((d) => d.keys.join("  "))
      .attr("x", nodeW / 2)
      .attr("y", nodeH / 2);

    // ── 类型标签 ──
    const labelGroup = svg.selectAll<SVGTextElement, BTreeNode>("text.node-type-label")
      .data(nodes, (n) => n.id);

    labelGroup.exit()
      .transition()
      .duration(200)
      .attr("opacity", 0)
      .remove();

    const labelEnter = labelGroup.enter()
      .append("text")
      .attr("class", "node-type-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("fill", "#94a3b8");

    labelEnter.merge(labelGroup)
      .transition()
      .duration(300)
      .attr("x", (d, i) => (positions[i]?.x ?? 0) + nodeW / 2)
      .attr("y", (d, i) => (positions[i]?.y ?? 0) + nodeH + 14)
      .text((d) => d.type === "leaf" ? "leaf" : "internal");
  }, [nodes, action]);
}
