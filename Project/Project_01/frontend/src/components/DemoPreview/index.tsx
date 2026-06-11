import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RefreshCw,
  Route,
  Sparkles,
  Square,
} from "lucide-react";
import type { DemoComplete, DemoStep } from "../../types";
import { normalizeDemoSteps } from "../../utils/demoNormalize";

// Mermaid 模块级单例——避免每渲染动态 import 和重新初始化（#7）
let mermaidPromise: Promise<any> | null = null;
function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => {
      mod.default.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "system-ui, sans-serif",
      });
      return mod.default;
    });
  }
  return mermaidPromise;
}

import SimulatorPreview from "./SimulatorPreview";

type PanelSize = 0 | 1 | 2;

interface Props {
  demo: DemoComplete | null;
  panelSize?: PanelSize;
  isWide?: boolean;
  onToggleWide?: () => void;
  onCollapse?: () => void;
  onExport?: (format?: string) => void;
  onRegenerate?: (stepIndex: number, instructions: string) => void;
  onSimulatorUpdate?: (simulatorType: string, params: Record<string, unknown>) => void;
}

type Tab = "flow" | "play" | "page" | "assets" | "simulator";

const TABS: { key: Tab; label: string; icon: typeof Layers }[] = [
  { key: "flow", label: "流程", icon: Route },
  { key: "play", label: "播放", icon: Play },
  { key: "page", label: "页面", icon: FileText },
  { key: "simulator", label: "模拟", icon: Layers },
  { key: "assets", label: "素材", icon: Boxes },
];

const STAGE_LABELS = ["词法分析", "语法解析", "查询优化", "执行计划", "执行过程", "结果分析"];
const STAGE_KEYS = ["lex", "parse", "optimize", "plan", "execute", "result"];

export default function DemoPreview({
  demo,
  isWide = false,
  panelSize = isWide ? 1 : 0,
  onToggleWide,
  onCollapse,
  onExport,
  onRegenerate,
  onSimulatorUpdate,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("flow");
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showExportNotif, setShowExportNotif] = useState(false);
  const [exportFormat, setExportFormat] = useState("html");
  const previewWidthLabel = panelSize >= 2 ? "720px" : panelSize === 1 ? "560px" : "380px";
  const toggleWideLabel = panelSize >= 2 ? "还原" : panelSize === 1 ? "更宽" : "加宽";
  const toggleWideTitle =
    panelSize >= 2
      ? "恢复标准预览宽度"
      : panelSize === 1
        ? "继续向左展开预览栏"
        : "向左展开预览栏";

  // 重置状态当 demo ID 变化时（跳过模拟器参数调整个 demoId=undefined 的情况）
  const prevDemoIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const currentId = demo?.demoId;
    if (!currentId && prevDemoIdRef.current) return; // demo:updated → 不重置
    prevDemoIdRef.current = currentId;
    setActiveIndex(0);
    setActiveTab("flow");
    setAutoPlay(false);
  }, [demo?.demoId]);

  const safeSteps = useMemo(() => normalizeDemoSteps(demo?.steps), [demo?.steps]);
  const safeDemo = useMemo(
    () => (demo ? { ...demo, steps: safeSteps } : null),
    [demo, safeSteps],
  );

  // 自动播放逻辑
  useEffect(() => {
    if (autoPlay) {
      autoPlayRef.current = setInterval(() => {
        setActiveIndex((i) => {
          if (safeSteps.length > 0 && i >= safeSteps.length - 1) {
            setAutoPlay(false);
            return i;
          }
          return i + 1;
        });
      }, 3000);
    }
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [autoPlay, safeSteps.length]);

  const handleExport = useCallback((fmt?: string) => {
    if (onExport) {
      onExport(fmt || exportFormat);
      setShowExportNotif(true);
      setTimeout(() => setShowExportNotif(false), 2000);
    }
  }, [onExport, exportFormat]);

  const wrapStep = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const activeStep = safeSteps[activeIndex] || null;
  const progress = safeSteps.length
    ? Math.round(((activeIndex + 1) / safeSteps.length) * 100)
    : 0;

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setActiveIndex((i) => Math.min((safeSteps.length || 1) - 1, i + 1));

  const toggleAutoPlay = () => {
    if (autoPlay) {
      setAutoPlay(false);
    } else {
      // 重新开始自动播放时重置到第 1 步
      setActiveIndex(0);
      setAutoPlay(true);
    }
  };

  if (!safeDemo) {
    return (
      <EmptyState
        panelSize={panelSize}
        isWide={isWide}
        onToggleWide={onToggleWide}
        onCollapse={onCollapse}
      />
    );
  }

  return (
    <div className="flex h-full flex-col bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 px-6 py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Preview
            </p>
            <p className="text-sm font-semibold text-slate-900">演示预览</p>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleWide && (
              <button
                type="button"
                onClick={onToggleWide}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                title={toggleWideTitle}
              >
                {panelSize >= 2 ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span>{toggleWideLabel}</span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-600">
                  {previewWidthLabel}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleExport()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              title="导出演示"
            >
              <Download className="h-4 w-4" />
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                title="折叠右侧栏"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        {showExportNotif && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            导出请求已发送，检查消息列表查看结果
          </div>
        )}
        <div className="flex overflow-x-auto rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-shrink-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold transition sm:px-3 ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-7 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              Live Demo Console
            </p>
            <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight">
              {safeDemo.title}
            </h2>
            <p className="mt-2 font-mono text-[10px] text-slate-500">{safeDemo.demoId}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Step {activeIndex + 1}/{safeSteps.length}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="scroll-area min-h-0 flex-1 overflow-y-auto bg-slate-50">
        {activeTab === "flow" && (
          <FlowView
            steps={safeSteps}
            activeIndex={activeIndex}
            onSelect={wrapStep}
            onRegenerate={onRegenerate}
          />
        )}
        {activeTab === "play" && (
          <PlayView step={activeStep} activeIndex={activeIndex} total={safeSteps.length} />
        )}
        {activeTab === "page" && (
          <PagePreview
            demo={safeDemo}
            activeIndex={activeIndex}
            onSelect={wrapStep}
            isWide={isWide}
          />
        )}
        {activeTab === "simulator" && (
          <SimulatorPreview demo={safeDemo} onSimulatorUpdate={onSimulatorUpdate} />
        )}
        {activeTab === "assets" && <AssetsView stepCount={safeSteps.length} />}
      </div>

      <div className="border-t border-slate-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            上一步
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAutoPlay}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                autoPlay
                  ? "bg-red-500 text-white shadow-sm hover:bg-red-600"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title={autoPlay ? "停止自动播放" : "自动播放"}
            >
              {autoPlay ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {autoPlay ? "停止" : "自动"}
            </button>

            <div className="flex items-center gap-1.5">
              {safeSteps.map((step, index) => (
                <button
                  key={`step-dot-${step.index}-${index}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === activeIndex
                      ? "w-6 bg-blue-600"
                      : index < activeIndex
                        ? "w-2 bg-emerald-500"
                        : "w-2 bg-slate-300"
                  }`}
                  aria-label={`跳转到第 ${index + 1} 步`}
                />
              ))}
            </div>
          </div>

          <button
            onClick={goNext}
            disabled={activeIndex >= safeSteps.length - 1}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100 disabled:shadow-none"
          >
            下一步
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  isWide = false,
  panelSize = isWide ? 1 : 0,
  onToggleWide,
  onCollapse,
}: {
  panelSize?: PanelSize;
  isWide?: boolean;
  onToggleWide?: () => void;
  onCollapse?: () => void;
}) {
  const previewWidthLabel = panelSize >= 2 ? "720px" : panelSize === 1 ? "560px" : "380px";
  const toggleWideLabel = panelSize >= 2 ? "还原" : panelSize === 1 ? "更宽" : "加宽";
  const toggleWideTitle =
    panelSize >= 2
      ? "恢复标准预览宽度"
      : panelSize === 1
        ? "继续向左展开预览栏"
        : "向左展开预览栏";

  return (
    <div className="flex h-full flex-col bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 px-6 py-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Preview
            </p>
            <p className="text-sm font-semibold text-slate-900">演示预览</p>
          </div>
          <div className="flex items-center gap-1.5">
            {onToggleWide && (
              <button
                type="button"
                onClick={onToggleWide}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                title={toggleWideTitle}
              >
                {panelSize >= 2 ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span>{toggleWideLabel}</span>
                <span className="rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-600">
                  {previewWidthLabel}
                </span>
              </button>
            )}
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                title="折叠右侧栏"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <span
                key={tab.key}
                className="flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-slate-400"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
        <div className="max-w-xs text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white">
            <PanelRightOpen className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="mt-5 text-base font-semibold">等待生成演示</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            中间输入教学目标后，这里会显示流程、播放控制和页面预览。
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 text-left">
            {STAGE_LABELS.map((label, index) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                <span className="font-mono text-[10px] text-blue-600">
                  0{index + 1}
                </span>
                <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowView({
  steps,
  activeIndex,
  onSelect,
  onRegenerate,
}: {
  steps: DemoStep[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onRegenerate?: (stepIndex: number, instructions: string) => void;
}) {
  const [rewritingStep, setRewritingStep] = useState<number | null>(null);
  const [rewriteInput, setRewriteInput] = useState("");

  return (
    <div className="space-y-3 p-4">
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        const stage = step.stage || "";
        const stageColor = STAGE_KEYS.includes(stage)
          ? "bg-blue-100 text-blue-700 border-blue-200"
          : "bg-slate-100 text-slate-600 border-slate-200";
        const isRewriting = rewritingStep === index;
        return (
          <div key={`flow-step-${step.index}-${index}`} className="flex flex-col gap-2">
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelect(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(index);
                }
              }}
              className={`group flex w-full cursor-pointer gap-3 rounded-lg border p-4 text-left transition ${
                active
                  ? "border-blue-200 bg-blue-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40"
              }`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${
                  active
                    ? "bg-blue-600 text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : step.index}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
                  {stage && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${stageColor}`}>
                      {stage}
                    </span>
                  )}
                </span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">
                  {step.content}
                </span>
              </span>
              <div className="flex flex-col items-center gap-1">
                {active && <ChevronRight className="mt-1 h-4 w-4 text-blue-600" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRewritingStep(index);
                    setRewriteInput("");
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
                  title="重写该步"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              </div>
            </div>
            {isRewriting && (
              <div className="ml-11 flex gap-2">
                <input
                  type="text"
                  value={rewriteInput}
                  onChange={(e) => setRewriteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = rewriteInput.trim();
                      if (val.length < 2) return;
                      if (onRegenerate) {
                        onRegenerate(index, val);
                      }
                      setRewritingStep(null);
                      setRewriteInput("");
                    }
                  }}
                  placeholder="输入修改要求，如：改得更通俗..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  autoFocus
                />
                <button
                  onClick={() => setRewritingStep(null)}
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PagePreview({
  demo,
  activeIndex,
  onSelect,
  isWide = false,
}: {
  demo: DemoComplete;
  activeIndex: number;
  onSelect: (index: number) => void;
  isWide?: boolean;
}) {
  const activeStep = demo.steps[activeIndex] || demo.steps[0] || null;

  return (
    <div className="bg-slate-100 px-4 py-6 sm:px-6">
      <article className={`mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${
        isWide ? "max-w-5xl" : "max-w-3xl"
      }`}>
        <section className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-7 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-100/80">
            Page Preview
          </p>
          <h3 className="mt-3 text-2xl font-semibold leading-tight">
            {demo.title}
          </h3>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-white/15 px-3 py-1 text-blue-50 ring-1 ring-white/20">
              {demo.steps.length} 个讲解步骤
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-blue-50 ring-1 ring-white/20">
              {demo.demo_type || demo.simulator_type || "interactive demo"}
            </span>
          </div>
        </section>

        {activeStep && (
          <section className="border-b border-slate-200 bg-blue-50 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                当前讲解 Step {activeIndex + 1}
              </span>
              {activeStep.stage && (
                <span className="text-xs font-semibold text-blue-700">
                  {STAGE_LABELS[STAGE_KEYS.indexOf(activeStep.stage)] || activeStep.stage}
                </span>
              )}
            </div>
            <h4 className="mt-4 text-xl font-semibold text-slate-950">{activeStep.title}</h4>
            <p className="mt-3 text-sm leading-7 text-slate-700">{activeStep.content}</p>
            {activeStep.mermaid && (
              <div className="mt-4 rounded-xl border border-blue-100 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">课堂图示</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {activeStep.mermaid_type || "mermaid"}
                  </span>
                </div>
                <MermaidRenderer code={activeStep.mermaid} />
              </div>
            )}
            {activeStep.interactive_hint && (
              <p className="mt-4 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-medium text-blue-700">
                课堂互动：{activeStep.interactive_hint}
              </p>
            )}
          </section>
        )}

        <section className="space-y-4 px-6 py-6">
          {demo.steps.map((step, index) => {
            const active = index === activeIndex;
            const stageLabel = step.stage
              ? STAGE_LABELS[STAGE_KEYS.indexOf(step.stage)] || step.stage
              : `步骤 ${index + 1}`;

            return (
              <button
                key={`page-step-${step.index}-${index}`}
                type="button"
                onClick={() => onSelect(index)}
                className={`block w-full rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-blue-300 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      active ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-slate-950">{step.title}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                        {stageLabel}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm leading-7 text-slate-600">
                      {step.content}
                    </span>
                    {step.mermaid && (
                      <span className="mt-3 block rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <span className="mb-3 flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-slate-700">步骤图示</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {step.mermaid_type || "mermaid"}
                          </span>
                        </span>
                        <MermaidRenderer code={step.mermaid} />
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </section>
      </article>
    </div>
  );
}

function PlayView({
  step,
  activeIndex,
  total,
}: {
  step: DemoStep | null;
  activeIndex: number;
  total: number;
}) {
  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            <Film className="h-3.5 w-3.5" />
            播放帧 {activeIndex + 1}/{total}
          </span>
          {step?.stage && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
              {STAGE_LABELS[STAGE_KEYS.indexOf(step.stage)] || step.stage}
            </span>
          )}
        </div>
        <h3 className="mt-4 text-lg font-semibold">{step?.title || "暂无步骤"}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {step?.content || "生成演示后会显示当前播放帧的讲解内容。"}
        </p>
        {step?.interactive_hint && (
          <p className="mt-3 text-xs font-medium text-blue-600">
            💡 {step.interactive_hint}
          </p>
        )}
      </div>

      {step?.mermaid && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">可视化</span>
            <span className="font-mono text-[10px] text-slate-500">{step.mermaid_type || "mermaid"}</span>
          </div>
          <MermaidRenderer code={step.mermaid} />
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">步骤信息</span>
          <span className="font-mono text-[10px] text-slate-500">{step?.stage || "N/A"}</span>
        </div>
        {step?.stage && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            {step.stage === "lex" && "词法分析阶段：数据库引擎将 SQL 文本拆解成 token 序列，识别关键字、标识符、运算符等语法元素。"}
            {step.stage === "parse" && "语法解析阶段：根据 SQL 语法规则构建语法树，检查语句合法性，确定表名、列名的引用关系。"}
            {step.stage === "optimize" && "查询优化阶段：优化器分析多种执行策略的代价，选择最优的执行路径。"}
            {step.stage === "plan" && "执行计划阶段：生成最终的算子执行计划树，每个算子有明确的输入输出和代价估算。"}
            {step.stage === "execute" && "执行阶段：存储引擎按照计划逐算子执行，扫描数据页、应用过滤条件、返回结果行。"}
            {step.stage === "result" && "结果分析阶段：收集执行结果，对比估计与实际的差异，总结查询执行的关键问题。"}
          </div>
        )}
      </div>
    </div>
  );
}

function MermaidRenderer({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const renderId = useRef(`mermaid-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current || !code) return;
      try {
        const mermaid = await getMermaid();
        if (cancelled) return;
        ref.current.innerHTML = "";
        const { svg } = await mermaid.render(renderId, code);
        if (cancelled) return;
        if (ref.current) ref.current.innerHTML = svg;
        setError(null);
      } catch (e) {
        setError(`渲染失败: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [code, renderId]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
        {error}
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] text-red-500">{code}</pre>
      </div>
    );
  }

  return (
    <div className="flex justify-center overflow-x-auto">
      <div ref={ref} className="max-w-full" />
    </div>
  );
}

function AssetsView({ stepCount }: { stepCount: number }) {
  const assets = [
    { label: "流程节点", value: `${stepCount}` },
    { label: "讲解卡片", value: `${Math.max(stepCount, 1) * 2}` },
    { label: "动画状态", value: "Ready" },
    { label: "课堂问题", value: "Auto" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      {assets.map((asset) => (
        <div key={asset.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] text-slate-500">{asset.label}</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{asset.value}</p>
        </div>
      ))}
      <div className="col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          <Sparkles className="h-4 w-4" />
          演示资源已准备
        </div>
        <p className="mt-2 text-xs leading-relaxed text-blue-700/80">
          可继续在中间输入修改指令，例如"增加课堂提问""把动画放慢""改成事务隔离案例"。
        </p>
      </div>
    </div>
  );
}
