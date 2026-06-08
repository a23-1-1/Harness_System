import type { DemoComplete } from "../../types";

interface Props {
  demo: DemoComplete | null;
}

export default function DemoPreview({ demo }: Props) {
  if (!demo) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-400">在对话中发送消息，演示将在此处显示</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">{demo.title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          ID: {demo.demoId}
        </p>
      </div>

      {/* 步骤列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {demo.steps.map((step) => (
          <div
            key={step.index}
            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-500 rounded-full">
                {step.index}
              </span>
              <span className="text-sm font-medium text-gray-700">
                {step.title}
              </span>
            </div>
            <p className="text-sm text-gray-600 ml-7">{step.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
