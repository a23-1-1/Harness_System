import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface TimelineStepData {
  step: number;
  title: string;
  description: string;
}

/**
 * D3 渲染事务时间线动画。
 * 使用 enter/update/exit 模式，避免全量重绘 (#3)。
 * activeStep 变化时只更新进度线长度和圆点状态，不复用 DOM。
 */
export function useTransactionTimelineD3(
  svgRef: React.RefObject<SVGSVGElement | null>,
  steps: TimelineStepData[],
  activeStep: number,
) {
  const widthRef = useRef(400);

  // ResizeObserver (#1)
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) widthRef.current = e.contentRect.width || 400;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [svgRef]);

  useEffect(() => {
    if (!svgRef.current || !steps.length) return;

    const svg = d3.select(svgRef.current);
    const width = widthRef.current;
    const margin = { left: 40, right: 40 };
    const innerW = Math.max(100, width - margin.left - margin.right);
    const stepSpacing = steps.length > 1 ? innerW / (steps.length - 1) : innerW / 2;
    const lineY = 35;

    // 计算各步骤 x 坐标
    const xs = steps.map((_, i) => margin.left + i * stepSpacing);
    const progressX = xs[Math.min(activeStep, xs.length - 1)];

    // ── 背景线——每次重建（简单，性能可接受） ──
    svg.selectAll("line.bg-line").remove();
    svg.append("line")
      .attr("class", "bg-line")
      .attr("x1", margin.left)
      .attr("y1", lineY)
      .attr("x2", width - margin.right)
      .attr("y2", lineY)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 3);

    // ── 进度线——更新长度 ──
    let progLine = svg.select<SVGLineElement | null>("line.progress-line").node()
      ? svg.select("line.progress-line")
      : svg.append("line").attr("class", "progress-line")
          .attr("y1", lineY).attr("y2", lineY)
          .attr("stroke", "#2563eb").attr("stroke-width", 3)
          .attr("stroke-linecap", "round");

    progLine.transition().duration(350)
      .attr("x1", margin.left)
      .attr("x2", progressX);

    // ── 圆点 —— enter/update/exit ──
    const dots = svg.selectAll<SVGCircleElement, number>("circle.dot")
      .data(xs);

    dots.exit().remove();

    const dotEnter = dots.enter()
      .append("circle")
      .attr("class", "dot")
      .attr("r", 0) // 从 0 放大
      .attr("fill", "#cbd5e1")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    dotEnter.merge(dots)
      .attr("cx", (x) => x)
      .attr("cy", lineY)
      .transition()
      .duration(300)
      .attr("r", (_x, i) => i === activeStep ? 8 : i < activeStep ? 6 : 5)
      .attr("fill", (_x, i) => i === activeStep ? "#2563eb" : i < activeStep ? "#10b981" : "#cbd5e1");

    // ── 编号 —— enter/update/exit ──
    const labels = svg.selectAll<SVGTextElement, number>("text.dot-label")
      .data(xs);

    labels.exit().remove();

    const labelEnter = labels.enter()
      .append("text")
      .attr("class", "dot-label")
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", "monospace");

    labelEnter.merge(labels)
      .attr("x", (x) => x)
      .attr("y", lineY + 22)
      .attr("fill", (_x, i) => i === activeStep ? "#2563eb" : "#94a3b8")
      .text((_x, i) => String(i + 1));
  }, [steps, activeStep]);
}
