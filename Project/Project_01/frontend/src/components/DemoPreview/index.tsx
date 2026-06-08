import type { DemoComplete } from "../../types";

interface Props {
  demo: DemoComplete | null;
}

export default function DemoPreview({ demo }: Props) {
  if (!demo) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-slate-50 flex items-center justify-center border border-slate-200">
          <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">等待演示内容</p>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            在聊天中输入 SQL 或知识点<br />
            AI 生成的演示将在此处展示
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h2 className="text-sm font-semibold text-slate-800">结果展示</h2>
          <p className="text-xs text-slate-400 mt-0.5">{demo.demoId}</p>
        </div>
      </div>

      {/* 演示标题 */}
      <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
        <h3 className="text-base font-semibold text-slate-800">{demo.title}</h3>
      </div>

      {/* 步骤列表 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {demo.steps.map((step) => (
          <div
            key={step.index}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors duration-150"
          >
            <div className="flex items-start gap-3">
              {/* 步骤编号圆标 */}
              <span className="flex items-center justify-center w-6 h-6 mt-0.5 text-xs font-semibold text-white bg-blue-500 rounded-full flex-shrink-0">
                {step.index}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-slate-700 mb-1">{step.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{step.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部状态 */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {demo.steps.length} 个步骤 · 演示就绪
        </div>
      </div>
    </div>
  );
}
