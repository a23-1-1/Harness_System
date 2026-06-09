import { useCallback, useState } from "react";
import {
  CheckCircle2,
  HelpCircle,
  XCircle,
} from "lucide-react";

interface QuizQuestion {
  id: string;
  type: "choice" | "true_false";
  question: string;
  options?: string[];
  correct: string;
  explanation: string;
}

interface QuizCardProps {
  questions: QuizQuestion[];
  topic?: string;
  onAnswer: (questionId: string, answer: string, question: QuizQuestion) => void;
}

export default function QuizCard({ questions, topic, onAnswer }: QuizCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    (q: QuizQuestion) => {
      const ans = answers[q.id];
      if (!ans || submitted[q.id]) return;

      // 立即在本地设置对错和讲解，不依赖后端 quiz:result 事件
      const isCorrect = ans === q.correct;
      setSubmitted((prev) => ({ ...prev, [q.id]: true }));
      setResults((prev) => ({ ...prev, [q.id]: isCorrect }));
      setExplanations((prev) => ({ ...prev, [q.id]: q.explanation }));
      onAnswer(q.id, ans, q);
    },
    [answers, submitted, onAnswer],
  );

  const getOptionLabel = (opt: string): string => {
    const m = opt.trim().match(/^([A-D])/);
    return m ? m[1] : opt.charAt(0);
  };

  return (
    <div className="space-y-4">
      {topic && (
        <p className="text-sm font-semibold text-violet-700">
          📝 测验 — {topic}
        </p>
      )}
      {questions.map((q, qi) => {
        const isSubmitted = submitted[q.id];
        const isCorrect = results[q.id];
        const explanation = explanations[q.id];

        return (
          <div
            key={q.id}
            className={`rounded-2xl border p-4 ${
              isSubmitted
                ? isCorrect
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
                : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-sm font-semibold text-slate-800">
              {qi + 1}. {q.question}
            </p>

            {q.type === "choice" && q.options && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === getOptionLabel(opt);
                  const isAnswer = getOptionLabel(opt) === q.correct;
                  const showCorrect = isSubmitted && isAnswer;
                  const showWrong = isSubmitted && isSelected && !isAnswer;

                  return (
                    <button
                      key={opt}
                      disabled={isSubmitted}
                      onClick={() =>
                        !isSubmitted &&
                        setAnswers((prev) => ({ ...prev, [q.id]: getOptionLabel(opt) }))
                      }
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                        showCorrect
                          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                          : showWrong
                            ? "border-red-300 bg-red-100 text-red-800"
                            : isSelected
                              ? "border-blue-300 bg-blue-50 text-blue-800"
                              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {showCorrect ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                      ) : showWrong ? (
                        <XCircle className="h-4 w-4 flex-shrink-0 text-red-600" />
                      ) : (
                        <HelpCircle className="h-4 w-4 flex-shrink-0 text-slate-400" />
                      )}
                      <span className="leading-relaxed">{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {q.type === "true_false" && (
              <div className="mt-3 flex gap-3">
                {["T", "F"].map((val) => {
                  const isSelected = answers[q.id] === val;
                  const isAnswer = val === q.correct;
                  const showCorrect = isSubmitted && isAnswer;
                  const showWrong = isSubmitted && isSelected && !isAnswer;

                  return (
                    <button
                      key={val}
                      disabled={isSubmitted}
                      onClick={() =>
                        !isSubmitted &&
                        setAnswers((prev) => ({ ...prev, [q.id]: val }))
                      }
                      className={`flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                        showCorrect
                          ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                          : showWrong
                            ? "border-red-300 bg-red-100 text-red-800"
                            : isSelected
                              ? "border-blue-300 bg-blue-50 text-blue-800"
                              : "border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {val === "T" ? "✅ 正确" : "❌ 错误"}
                    </button>
                  );
                })}
              </div>
            )}

            {!isSubmitted && answers[q.id] && (
              <button
                onClick={() => handleSubmit(q)}
                className="mt-3 rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700"
              >
                提交答案
              </button>
            )}

            {isSubmitted && explanation && (
              <div
                className={`mt-3 rounded-xl border p-3 text-sm leading-relaxed ${
                  isCorrect
                    ? "border-emerald-200 bg-emerald-100/50 text-emerald-800"
                    : "border-red-200 bg-red-100/50 text-red-800"
                }`}
              >
                {isCorrect
                  ? "✅ 回答正确！"
                  : `❌ 回答错误。正确答案是 ${q.correct}。`}
                <p className="mt-1 text-slate-600">{explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
