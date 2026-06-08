import { useState } from "react";
import type { DemoComplete } from "../../types";

interface Props {
  demo: DemoComplete | null;
}

type Tab = "flow" | "execution" | "animation";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "flow", label: "步骤编辑", icon: "⊞" },
  { key: "execution", label: "执行播放", icon: "▶" },
  { key: "animation", label: "动画引擎", icon: "✦" },
];

/** 六阶段 */
const SIX_STAGES = [
  { i: 1, key: "lex", label: "词法分析" },
  { i: 2, key: "parse", label: "语法解析" },
  { i: 3, key: "optimize", label: "查询优化" },
  { i: 4, key: "plan", label: "执行计划" },
  { i: 5, key: "execute", label: "执行过程" },
  { i: 6, key: "result", label: "结果分析" },
];

export default function DemoPreview({ demo }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("flow");
  const [activeStage, setActiveStage] = useState(1);

  if (!demo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7aa2f7]/10 to-[#bb9af7]/10
                        border border-[#292e42] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#7aa2f7]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#a9b1d6]">等待演示内容</p>
          <p className="text-[11px] text-[#565f89] mt-1 leading-relaxed">
            在聊天中输入 SQL 或知识点 <br />
            AI 生成的演示将在此处展示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 毛玻璃 Tab 栏 */}
      <div className="flex items-center gap-0.5 px-2 py-2 border-b border-[#292e42]
                      bg-[#1a1b26]/90 backdrop-blur-md">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all duration-150
              ${activeTab === t.key
                ? "bg-[#7aa2f7]/15 text-[#7aa2f7] border border-[#7aa2f7]/30"
                : "text-[#565f89] border border-transparent hover:text-[#a9b1d6]"}`}
          >
            <span className="text-[11px]">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* 演示标题 */}
      <div className="px-4 py-3 border-b border-[#292e42] bg-gradient-to-r from-[#1a1b26] to-[#1e1f2b]">
        <h3 className="text-sm font-semibold text-[#c0caf5]">{demo.title}</h3>
        <p className="text-[10px] text-[#3b4261] mt-0.5 font-mono">{demo.demoId}</p>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "flow" && (
          <FlowEditor demo={demo} activeStage={activeStage} onStageClick={setActiveStage} />
        )}
        {activeTab === "execution" && (
          <ExecutionPlayer demo={demo} activeStage={activeStage} />
        )}
        {activeTab === "animation" && (
          <AnimationEngine demo={demo} />
        )}
      </div>

      {/* 底部状态 */}
      <div className="px-4 py-2.5 border-t border-[#292e42] bg-[#0f1117]/50">
        <div className="flex items-center justify-between text-[10px] text-[#565f89]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9ece6a] shadow-[0_0_4px_#9ece6a]" />
            {demo.steps.length} 个步骤 · 演示就绪
          </div>
          <span className="text-[#3b4261] font-mono">v1.0</span>
        </div>
      </div>
    </div>
  );
}

/* ───── FlowEditor ───── */
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
    <div className="px-4 py-3 space-y-3">
      {/* 六步进度条 */}
      <div className="relative">
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-[#292e42]" />
        <div className="flex justify-between relative">
          {SIX_STAGES.map((s) => (
            <button
              key={s.key}
              onClick={() => onStageClick(s.i)}
              className="flex flex-col items-center gap-1.5 group"
            >
              <span
                className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center
                            text-[10px] font-bold border-2 transition-all duration-200
                            ${activeStage >= s.i
                      ? "bg-[#7aa2f7] border-[#7aa2f7] text-[#0f1117] shadow-[0_0_10px_rgba(122,162,247,0.5)]"
                      : "bg-[#1a1b26] border-[#292e42] text-[#565f89] group-hover:border-[#3b4261]"}`}
              >
                {activeStage >= s.i ? "✓" : s.i}
              </span>
              <span
                className={`text-[9px] font-medium whitespace-nowrap transition-colors
                  ${activeStage >= s.i ? "text-[#7aa2f7]" : "text-[#3b4261]"}`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 当前步骤详情 */}
      {demo.steps.map((step) => (
        <div
          key={step.index}
          className={`p-4 rounded-xl border transition-all duration-200
            ${activeStage === step.index
              ? "bg-[#7aa2f7]/5 border-[#7aa2f7]/30"
              : "bg-[#1e1f2b]/50 border-[#292e42] hover:border-[#333952]"}`}
          onClick={() => onStageClick(step.index)}
        >
          <div className="flex items-start gap-3">
            <span
              className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold
                ${activeStage === step.index
                  ? "bg-[#7aa2f7] text-[#0f1117]"
                  : "bg-[#292e42] text-[#565f89]"}`}
            >
              {step.index}
            </span>
            <div className="flex-1 min-w-0">
              <h4
                className={`text-xs font-semibold mb-1 ${activeStage === step.index ? "text-[#7aa2f7]" : "text-[#a9b1d6]"}`}
              >
                {step.title}
              </h4>
              <p className="text-[11px] text-[#565f89] leading-relaxed">{step.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───── ExecutionPlayer ───── */
function ExecutionPlayer({
  demo,
  activeStage,
}: {
  demo: DemoComplete;
  activeStage: number;
}) {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* 双会话分屏（事务隔离模拟器预置 UI） */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#0f1117] rounded-xl border border-[#292e42] p-3">
          <p className="text-[10px] font-semibold text-[#7aa2f7] mb-2">会话 A</p>
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-[#9ece6a]">BEGIN;</p>
            <p className="text-[10px] font-mono text-[#c0caf5]">SELECT * FROM students;</p>
            <p className="text-[10px] font-mono text-[#e0af68]">-- 等待 UPDATE…</p>
          </div>
        </div>
        <div className="bg-[#0f1117] rounded-xl border border-[#292e42] p-3">
          <p className="text-[10px] font-semibold text-[#bb9af7] mb-2">会话 B</p>
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-[#9ece6a]">BEGIN;</p>
            <p className="text-[10px] font-mono text-[#c0caf5]">UPDATE students SET…</p>
            <p className="text-[10px] font-mono text-[#e0af68]">-- 等待锁释放…</p>
          </div>
        </div>
      </div>

      {/* 时间线滑块 */}
      <div className="bg-[#0f1117] rounded-xl border border-[#292e42] p-4">
        <p className="text-[10px] font-semibold text-[#565f89] mb-3">操作时间线</p>
        <div className="relative">
          <input
            type="range"
            min="1"
            max={demo.steps.length}
            value={activeStage}
            className="w-full appearance-none h-1.5 rounded-full bg-[#292e42] accent-[#7aa2f7] outline-none"
            readOnly
          />
          <div className="flex justify-between mt-1.5">
            {demo.steps.map((s) => (
              <span key={s.index} className="text-[9px] text-[#3b4261] font-mono">
                T{s.index}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── AnimationEngine ───── */
function AnimationEngine({ demo: _demo }: { demo: DemoComplete }) {
  return (
    <div className="px-4 py-4">
      <div className="bg-[#0f1117] rounded-xl border border-[#292e42] p-6 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#7aa2f7]/10 to-[#bb9af7]/10
                        border-2 border-[#292e42] flex items-center justify-center">
          <svg className="w-10 h-10 text-[#7aa2f7]/40 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-[#a9b1d6]">动画引擎就绪</p>
        <p className="text-[10px] text-[#565f89] text-center leading-relaxed">
          B+ 树 · 事务隔离 · SQL 执行模拟器 <br />
          对话中发送指令即可生成动画
        </p>
      </div>
    </div>
  );
}
