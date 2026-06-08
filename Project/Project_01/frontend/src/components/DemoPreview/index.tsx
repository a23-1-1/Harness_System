import { useState } from "react";
import type { DemoComplete } from "../../types";

interface Props { demo: DemoComplete | null }
type Tab = "flow" | "execution" | "animation";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "flow", label: "步骤编辑", icon: "⊞" },
  { key: "execution", label: "执行播放", icon: "▶" },
  { key: "animation", label: "动画引擎", icon: "✦" },
];

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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-gray-50 border border-gray-200 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-400/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-700">等待演示内容</p>
          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">在聊天中输入 SQL 或知识点<br />AI 生成的演示将在此处展示</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab 栏 */}
      <div className="flex items-center gap-0.5 px-2 py-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold rounded-lg transition-all duration-150
              ${activeTab === t.key ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-500 border border-transparent hover:text-gray-700"}`}>
            <span className="text-[11px]">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* 标题 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <h3 className="text-sm font-semibold text-gray-800">{demo.title}</h3>
        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{demo.demoId}</p>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "flow" && <FlowEditor demo={demo} activeStage={activeStage} onStageClick={setActiveStage} />}
        {activeTab === "execution" && <ExecutionPlayer demo={demo} activeStage={activeStage} />}
        {activeTab === "animation" && <AnimationEngine />}
      </div>

      {/* 底部状态 */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            {demo.steps.length} 个步骤 · 演示就绪
          </div>
          <span className="text-gray-300 font-mono">v1.0</span>
        </div>
      </div>
    </div>
  );
}

function FlowEditor({ demo, activeStage, onStageClick }: { demo: DemoComplete; activeStage: number; onStageClick: (i: number) => void }) {
  return (
    <div className="px-4 py-3 space-y-3">
      {/* 六步进度条 */}
      <div className="relative">
        <div className="absolute top-3 left-3 right-3 h-0.5 bg-gray-200" />
        <div className="flex justify-between relative">
          {SIX_STAGES.map((s) => (
            <button key={s.key} onClick={() => onStageClick(s.i)} className="flex flex-col items-center gap-1.5 group">
              <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-200
                ${activeStage >= s.i ? "bg-blue-500 border-blue-500 text-white shadow-sm" : "bg-white border-gray-300 text-gray-400 group-hover:border-gray-400"}`}>
                {activeStage >= s.i ? "✓" : s.i}
              </span>
              <span className={`text-[9px] font-medium whitespace-nowrap ${activeStage >= s.i ? "text-blue-600" : "text-gray-400"}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 步骤详情 */}
      {demo.steps.map((step) => (
        <div key={step.index} onClick={() => onStageClick(step.index)}
          className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer
            ${activeStage === step.index ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-200 hover:border-gray-300"}`}>
          <div className="flex items-start gap-3">
            <span className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold flex-shrink-0
              ${activeStage === step.index ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"}`}>{step.index}</span>
            <div className="flex-1 min-w-0">
              <h4 className={`text-xs font-semibold mb-1 ${activeStage === step.index ? "text-blue-600" : "text-gray-700"}`}>{step.title}</h4>
              <p className="text-[11px] text-gray-500 leading-relaxed">{step.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecutionPlayer({ demo, activeStage }: { demo: DemoComplete; activeStage: number }) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
          <p className="text-[10px] font-semibold text-blue-600 mb-2">会话 A</p>
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-green-600">BEGIN;</p>
            <p className="text-[10px] font-mono text-gray-700">SELECT * FROM students;</p>
            <p className="text-[10px] font-mono text-amber-600">-- 等待 UPDATE…</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
          <p className="text-[10px] font-semibold text-purple-600 mb-2">会话 B</p>
          <div className="space-y-1">
            <p className="text-[10px] font-mono text-green-600">BEGIN;</p>
            <p className="text-[10px] font-mono text-gray-700">UPDATE students SET…</p>
            <p className="text-[10px] font-mono text-amber-600">-- 等待锁释放…</p>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-[10px] font-semibold text-gray-500 mb-3">操作时间线</p>
        <input type="range" min="1" max={demo.steps.length} value={activeStage}
          className="w-full appearance-none h-1.5 rounded-full bg-gray-200 accent-blue-500 outline-none" readOnly />
        <div className="flex justify-between mt-1.5">
          {demo.steps.map((s) => <span key={s.index} className="text-[9px] text-gray-400 font-mono">T{s.index}</span>)}
        </div>
      </div>
    </div>
  );
}

function AnimationEngine() {
  return (
    <div className="px-4 py-4">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-gray-100 border-2 border-gray-200 flex items-center justify-center">
          <svg className="w-10 h-10 text-blue-400/60 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="40 60" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-gray-700">动画引擎就绪</p>
        <p className="text-[10px] text-gray-400 text-center leading-relaxed">
          B+ 树 · 事务隔离 · SQL 执行模拟器<br />对话中发送指令即可生成动画
        </p>
      </div>
    </div>
  );
}
