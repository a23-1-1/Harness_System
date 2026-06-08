import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  Layers,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Route,
  Sparkles,
} from "lucide-react";
import type { DemoComplete, DemoStep } from "../../types";

interface Props {
  demo: DemoComplete | null;
  onCollapse?: () => void;
}

type Tab = "flow" | "play" | "assets";

const TABS: { key: Tab; label: string; icon: typeof Layers }[] = [
  { key: "flow", label: "流程", icon: Route },
  { key: "play", label: "播放", icon: Play },
  { key: "assets", label: "素材", icon: Boxes },
];

const STAGE_LABELS = ["理解输入", "构造步骤", "生成画面", "同步讲解"];

export default function DemoPreview({ demo, onCollapse }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("flow");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    setActiveTab("flow");
  }, [demo?.demoId]);

  const activeStep = demo?.steps[activeIndex] || null;
  const progress = demo?.steps.length
    ? Math.round(((activeIndex + 1) / demo.steps.length) * 100)
    : 0;

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setActiveIndex((i) => Math.min((demo?.steps.length || 1) - 1, i + 1));

  if (!demo) return <EmptyState onCollapse={onCollapse} />;

  return (
    <div className="flex h-full flex-col bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Preview
            </p>
            <p className="text-sm font-semibold text-slate-900">演示预览</p>
          </div>
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
        <div className="flex rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold transition ${
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

      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-600">
              Live Demo Console
            </p>
            <h2 className="mt-2 line-clamp-2 text-lg font-semibold tracking-tight">
              {demo.title}
            </h2>
            <p className="mt-2 font-mono text-[10px] text-slate-500">{demo.demoId}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>
              Step {activeIndex + 1}/{demo.steps.length}
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
            steps={demo.steps}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />
        )}
        {activeTab === "play" && (
          <PlayView step={activeStep} activeIndex={activeIndex} total={demo.steps.length} />
        )}
        {activeTab === "assets" && <AssetsView stepCount={demo.steps.length} />}
      </div>

      <div className="border-t border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={activeIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            上一步
          </button>
          <div className="flex items-center gap-1.5">
            {demo.steps.map((step, index) => (
              <button
                key={step.index}
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
          <button
            onClick={goNext}
            disabled={activeIndex >= demo.steps.length - 1}
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

function EmptyState({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-white text-slate-900">
      <div className="border-b border-slate-200 bg-gradient-to-br from-blue-50 to-slate-50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Preview
            </p>
            <p className="text-sm font-semibold text-slate-900">演示预览</p>
          </div>
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
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
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
            中间输入教学目标后，这里会显示流程、播放控制和演示素材。
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
}: {
  steps: DemoStep[];
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="space-y-3 p-4">
      {steps.map((step, index) => {
        const active = index === activeIndex;
        const done = index < activeIndex;
        return (
          <button
            key={step.index}
            onClick={() => onSelect(index)}
            className={`group flex w-full gap-3 rounded-lg border p-4 text-left transition ${
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
              <span className="block text-sm font-semibold text-slate-900">{step.title}</span>
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-slate-500">
                {step.content}
              </span>
            </span>
            {active && <ChevronRight className="mt-1 h-4 w-4 text-blue-600" />}
          </button>
        );
      })}
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
  const codeLines = useMemo(
    () => [
      "BEGIN;",
      "EXPLAIN ANALYZE SELECT ...;",
      "-- visualize operator / lock / index state",
      "COMMIT;",
    ],
    [],
  );

  return (
    <div className="space-y-4 p-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
            <Film className="h-3.5 w-3.5" />
            播放帧 {activeIndex + 1}/{total}
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{step?.title || "暂无步骤"}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {step?.content || "生成演示后会显示当前播放帧的讲解内容。"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">执行片段</span>
          <span className="font-mono text-[10px] text-slate-500">SQL Runtime</span>
        </div>
        <div className="space-y-2 font-mono text-xs">
          {codeLines.map((line, index) => (
            <p key={line} className={index === activeIndex % 4 ? "text-blue-700" : "text-slate-500"}>
              <span className="mr-3 text-slate-300">{index + 1}</span>
              {line}
            </p>
          ))}
        </div>
      </div>
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
          可继续在中间输入修改指令，例如“增加课堂提问”“把动画放慢”“改成事务隔离案例”。
        </p>
      </div>
    </div>
  );
}
