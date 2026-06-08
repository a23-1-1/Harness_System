import { useState } from "react";
import {
  Layers,
  Play,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  PanelRightOpen,
} from "lucide-react";
import type { DemoComplete } from "../../types";

interface Props {
  demo: DemoComplete | null;
}

type Tab = "flow" | "execution" | "animation";

const TABS: { key: Tab; label: string; icon: typeof Layers }[] = [
  { key: "flow", label: "步骤编辑", icon: Layers },
  { key: "execution", label: "执行播放", icon: Play },
  { key: "animation", label: "动画引擎", icon: Sparkles },
];

const SIX_STAGES = [
  { i: 1, key: "lex", label: "词法分析" },
  { i: 2, key: "parse", label: "语法解析" },
  { i: 3, key: "optimize", label: "查询优化" },
  { i: 4, key: "plan", label: "执行计划" },
  { i: 5, key: "execute", label: "执行过程" },
  { i: 6, key: "result", label: "结果分析" },
];

/* ─── 空状态（无演示时） ─── */
function EmptyState() {
  return (
    <div className="flex flex-col h-full">
      {/* Tab 栏占位 */}
      <div className="border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-sm p-2 flex items-center gap-1.5 rounded-t-2xl">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <span
              key={t.key}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 text-slate-300 cursor-default"
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </span>
          );
        })}
      </div>

      {/* 网格主画布 */}
      <div className="flex-1 bg-grid-pattern flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 px-8 text-center">
          <div className="border border-dashed border-slate-300 p-4 rounded-xl">
            <PanelRightOpen className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-medium text-slate-400">
            等待演示内容
          </p>
          <p className="text-xs text-slate-300/70 leading-relaxed max-w-[200px]">
            在中间对话区输入 SQL 或知识点
            <br />
            AI 生成的演示将在此处展示
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── 有演示数据 ─── */
function ActiveView({
  demo,
  activeTab,
  activeStage,
  onTabChange,
  onStageClick,
}: {
  demo: DemoComplete;
  activeTab: Tab;
  activeStage: number;
  onTabChange: (t: Tab) => void;
  onStageClick: (i: number) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部 Tab 导航 */}
      <div className="border-b border-slate-200/60 bg-slate-50/80 backdrop-blur-sm p-2 flex items-center gap-1.5 rounded-t-2xl">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg transition-all duration-150
                ${
                  isActive
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/60"
                    : "text-slate-400 hover:text-slate-600 px-3 py-1.5"
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 演示标题区 */}
      <div className="px-4 py-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
          {demo.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] font-mono text-slate-400">
            {demo.demoId}
          </span>
          <span className="text-[10px] text-slate-300">·</span>
          <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {demo.steps.length} 个阶段
          </span>
        </div>
      </div>

      {/* 网格主画布 */}
      <div className="flex-1 overflow-y-auto bg-grid-pattern">
        {activeTab === "flow" && (
          <FlowEditor demo={demo} activeStage={activeStage} onStageClick={onStageClick} />
        )}
        {activeTab === "execution" && (
          <ExecutionPlayer demo={demo} activeStage={activeStage} />
        )}
        {activeTab === "animation" && <AnimationEngine />}
      </div>

      {/* 底部状态 */}
      <div className="px-4 py-2.5 border-t border-slate-200/60 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {demo.steps.length} 个步骤 · 演示就绪
        </div>
        <span className="text-[10px] font-mono text-slate-300">v1.0</span>
      </div>
    </div>
  );
}

/* ─── 根组件 ─── */
export default function DemoPreview({ demo }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("flow");
  const [activeStage, setActiveStage] = useState(1);

  if (!demo) return <EmptyState />;

  return (
    <ActiveView
      demo={demo}
      activeTab={activeTab}
      activeStage={activeStage}
      onTabChange={setActiveTab}
      onStageClick={setActiveStage}
    />
  );
}

/* ──────────────────────────────────────────────
 * FlowEditor — 步骤编辑视图
 * ────────────────────────────────────────────── */
function FlowEditor({
  demo,
  activeStage,
  onStageClick,
}: {
  demo: DemoComplete;
  activeStage: number;
  onStageClick: (i: number) => void;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* 六阶段进度条 */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <div className="relative">
          <div className="absolute top-3 left-4 right-4 h-0.5 bg-slate-100" />
          <div className="flex justify-between relative">
            {SIX_STAGES.map((s) => (
              <button
                key={s.key}
                onClick={() => onStageClick(s.i)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span
                  className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all duration-200
                    ${
                      activeStage >= s.i
                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                        : "bg-white border-slate-200 text-slate-400 group-hover:border-slate-300"
                    }`}
                >
                  {activeStage >= s.i ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    s.i
                  )}
                </span>
                <span
                  className={`text-[9px] font-medium whitespace-nowrap transition-colors ${
                    activeStage >= s.i ? "text-blue-600" : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 步骤详解卡片列表 */}
      {demo.steps.map((step) => (
        <div
          key={step.index}
          onClick={() => onStageClick(step.index)}
          className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200
            ${
              activeStage === step.index
                ? "bg-white border-blue-200 shadow-sm"
                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
            }`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold flex-shrink-0 transition-colors
                ${
                  activeStage === step.index
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
            >
              {step.index}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h4
                  className={`text-sm font-semibold ${
                    activeStage === step.index ? "text-blue-600" : "text-slate-800"
                  }`}
                >
                  {step.title}
                </h4>
                {activeStage === step.index && (
                  <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                {step.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
 * ExecutionPlayer — 执行播放视图
 * ────────────────────────────────────────────── */
function ExecutionPlayer({
  demo,
  activeStage,
}: {
  demo: DemoComplete;
  activeStage: number;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* 双会话分屏 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[11px] font-semibold text-slate-700">会话 A</span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
            <p className="text-emerald-600 font-medium">BEGIN;</p>
            <p className="text-slate-700">SELECT * FROM students;</p>
            <p className="text-amber-500">-- 等待 UPDATE…</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-[11px] font-semibold text-slate-700">会话 B</span>
          </div>
          <div className="space-y-1.5 font-mono text-[11px] leading-relaxed">
            <p className="text-emerald-600 font-medium">BEGIN;</p>
            <p className="text-slate-700">UPDATE students SET …</p>
            <p className="text-amber-500">-- 等待锁释放…</p>
          </div>
        </div>
      </div>

      {/* 时间线滑块 */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-500">操作时间线</span>
          <span className="text-[10px] text-slate-400 font-mono">
            T{activeStage}/{demo.steps.length}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={demo.steps.length}
          value={activeStage}
          className="w-full appearance-none h-1.5 rounded-full bg-slate-200 accent-blue-600 outline-none"
          readOnly
        />
        <div className="flex justify-between mt-2">
          {demo.steps.map((s) => (
            <span
              key={s.index}
              className={`text-[9px] font-mono ${
                s.index <= activeStage ? "text-blue-500" : "text-slate-300"
              }`}
            >
              T{s.index}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 * AnimationEngine — 动画引擎视图
 * ────────────────────────────────────────────── */
function AnimationEngine() {
  return (
    <div className="p-4">
      <div className="bg-white rounded-xl border border-slate-100 p-8 flex flex-col items-center gap-4 shadow-sm">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-slate-100" />
          <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-slate-300 animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-700">动画引擎就绪</p>
        <p className="text-xs text-slate-400 text-center leading-relaxed max-w-[200px]">
          B+ 树 · 事务隔离 · SQL 执行模拟器
          <br />
          在对话中发送指令即可生成动画演示
        </p>
      </div>
    </div>
  );
}
