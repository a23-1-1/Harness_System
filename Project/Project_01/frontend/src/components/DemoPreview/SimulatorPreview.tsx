import { useState, useRef, useCallback } from "react";
import { ArrowRight, BarChart3, Database, GitBranch, Layers, Plus, Minus } from "lucide-react";
import type { DemoStep } from "../../types";
import { useBPlusTreeD3 } from "../../hooks/useBPlusTreeD3";
import type { BTreeNode } from "../../hooks/useBPlusTreeD3";
import { useTransactionTimelineD3 } from "../../hooks/useTransactionTimelineD3";

interface StrategyData {
  name: string;
  cost: number;
  cost_formula: string;
  rows_in: number;
  rows_out: number;
  best_for: string;
  principle: string;
  optimal?: boolean;
}

interface Props {
  demo: {
    simulator_type?: string;
    steps: DemoStep[];
    sessions?: Array<{ id: string; color: string }>;
    simulator_config?: Record<string, unknown>;
  };
  onSimulatorUpdate?: (simulatorType: string, params: Record<string, unknown>) => void;
}

export default function SimulatorPreview({ demo, onSimulatorUpdate }: Props) {
  const simType = demo.simulator_type || "";
  const simConfig = demo.simulator_config || {};

  if (simType === "bplus_tree") {
    return <BPlusTreeSimulator steps={demo.steps} simConfig={simConfig} onSimulatorUpdate={onSimulatorUpdate} />;
  }
  if (simType === "transaction") {
    return <TransactionSimulator steps={demo.steps} simConfig={simConfig} onSimulatorUpdate={onSimulatorUpdate} />;
  }
  if (simType === "sql_execution") {
    return <SqlExecutionSimulator steps={demo.steps} />;
  }
  if (simType === "strategy_compare") {
    return <StrategyCompareView steps={demo.steps} />;
  }

  return (
    <div className="flex h-full items-center justify-center bg-slate-50 p-8 text-center">
      <div className="max-w-xs">
        <GitBranch className="mx-auto h-12 w-12 text-slate-300" />
        <h3 className="mt-4 text-base font-semibold">模拟器</h3>
        <p className="mt-2 text-sm text-slate-500">
          输入"演示 B+树插入 42"或"模拟 RR 级别幻读"来启动模拟器
        </p>
      </div>
    </div>
  );
}

function StepNav({ active, total, onPrev, onNext }: {
  active: number; total: number; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <button onClick={onPrev} disabled={active === 0}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-30">
          上一步
        </button>
        <span className="text-[11px] text-slate-500">{active + 1} / {total}</span>
        <button onClick={onNext} disabled={active >= total - 1}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-30">
          下一步
        </button>
      </div>
    </div>
  );
}

function SimDesc({ step }: { step: DemoStep | null }) {
  if (!step) return null;
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-xs font-bold text-white">
          {step.index ?? "?"}
        </span>
        <span className="text-sm font-semibold text-blue-900">{step.title}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-blue-800">{step.content}</p>
    </div>
  );
}

// ── B+树 ─────────────────────────────────────────────────────

function BPlusTreeSimulator({ steps, simConfig, onSimulatorUpdate }: {
  steps: DemoStep[];
  simConfig: Record<string, unknown>;
  onSimulatorUpdate?: (simType: string, params: Record<string, unknown>) => void;
}) {
  const [active, setActive] = useState(0);
  const [paramKey, setParamKey] = useState((simConfig?.key as number) ?? 42);
  const cur = steps[active];
  const cfg = cur?.simConfig as Record<string, unknown> | undefined;
  const action = (cfg?.action as string) || "";
  const nodes = cfg?.nodes as Array<Record<string, unknown>> | undefined;
  const svgRef = useRef<SVGSVGElement | null>(null);

  useBPlusTreeD3(svgRef, nodes as BTreeNode[] | undefined, action);

  const handleUpdate = useCallback((operation: string) => {
    if (onSimulatorUpdate) {
      onSimulatorUpdate("bplus_tree", { operation, key: paramKey, order: simConfig?.order || 4 });
    }
  }, [onSimulatorUpdate, paramKey, simConfig]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">B+树模拟器</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 参数控制 */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold text-slate-600">键值:</span>
          <input type="number" value={paramKey}
            onChange={(e) => setParamKey(e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
            className="w-16 rounded-md border border-slate-200 px-2 py-1 text-xs font-mono text-center outline-none focus:border-blue-300" />
          <div className="ml-auto flex gap-1.5">
            {["insert", "delete", "search"].map((op) => (
              <button key={op} onClick={() => handleUpdate(op)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                {op === "insert" ? "插入" : op === "delete" ? "删除" : "查找"}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">B+树节点状态</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">{action}</span>
          </div>
          <svg ref={svgRef} className="w-full" style={{ minHeight: 160 }} />
        </div>
        <SimDesc step={cur} />
      </div>
      <StepNav active={active} total={steps.length} onPrev={() => setActive(Math.max(0, active - 1))} onNext={() => setActive(Math.min(steps.length - 1, active + 1))} />
    </div>
  );
}

// ── 事务 ──────────────────────────────────────────────────────

function TransactionSimulator({ steps, onSimulatorUpdate, simConfig }: {
  steps: DemoStep[];
  onSimulatorUpdate?: (simType: string, params: Record<string, unknown>) => void;
  simConfig?: Record<string, unknown>;
}) {
  const [active, setActive] = useState(0);
  const [isoLevel, setIsoLevel] = useState((simConfig?.isolation_level as string) || "READ COMMITTED");
  const [scenario, setScenario] = useState((simConfig?.scenario as string) || "phantom_read");
  const cur = steps[active];
  const cfg = cur?.simConfig as Record<string, unknown> | undefined;
  const action = (cfg?.action as string) || "";
  const activeSqls = cfg?.activeSqls as Array<{ session: number; sql: string; result?: string; highlight?: boolean }> | undefined;
  const sessions = cfg?.sessions as Array<{ id: string; color: string }> | undefined;

  const timelineSteps = steps.map((s, i) => ({
    step: i + 1, title: s.title, description: s.content,
  }));
  const timelineRef = useRef<SVGSVGElement | null>(null);
  useTransactionTimelineD3(timelineRef, timelineSteps, active);

  const handleUpdate = useCallback(() => {
    if (onSimulatorUpdate) {
      onSimulatorUpdate("transaction", { isolation_level: isoLevel, scenario });
    }
  }, [onSimulatorUpdate, isoLevel, scenario]);

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">事务模拟器</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <span className="text-xs font-semibold text-slate-600">隔离级别:</span>
          <select value={isoLevel} onChange={(e) => setIsoLevel(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-mono outline-none focus:border-blue-300">
            {["READ UNCOMMITTED", "READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"].map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <span className="text-xs font-semibold text-slate-600 ml-2">场景:</span>
          <select value={scenario} onChange={(e) => setScenario(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] font-mono outline-none focus:border-blue-300">
            <option value="phantom_read">幻读</option>
            <option value="dirty_read">脏读</option>
          </select>
          <button onClick={handleUpdate}
            className="ml-auto rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-blue-700">
            更新
          </button>
        </div>
        <svg ref={timelineRef} className="w-full" style={{ minHeight: 80 }} />
        <div className="flex gap-3">
          {sessions?.map((s, i) => (
            <div key={i} className="flex-1 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-xs font-semibold">{s.id}</span>
              </div>
              {activeSqls?.filter(a => a.session === i).map((a, qi) => (
                <div key={qi} className={`mb-1.5 rounded-lg border p-2 text-[11px] font-mono ${a.highlight ? "border-red-200 bg-red-50" : "border-slate-100 bg-slate-50"}`}>
                  <div className="text-slate-800">{a.sql}</div>
                  {a.result && <div className="mt-0.5 text-slate-500">→ {a.result}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
        <SimDesc step={cur} />
      </div>
      <StepNav active={active} total={steps.length} onPrev={() => setActive(Math.max(0, active - 1))} onNext={() => setActive(Math.min(steps.length - 1, active + 1))} />
    </div>
  );
}

// ── SQL 执行 ───────────────────────────────────────────────────

function SqlExecutionSimulator({ steps }: { steps: DemoStep[] }) {
  const [active, setActive] = useState(0);
  const cur = steps[active];
  const cfg = cur?.simConfig as Record<string, unknown> | undefined;
  const action = (cfg?.action as string) || "";
  const rowsIn = (cfg?.rows_in as number) ?? undefined;
  const rowsOut = (cfg?.rows_out as number) ?? undefined;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">SQL 分步执行</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">执行流水线</span>
            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-700">{action}</span>
          </div>
          <div className="flex items-center justify-center gap-1 py-2">
            {steps.map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                  i === active ? "bg-blue-600 text-white shadow-md" : i < active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                }`}>{i + 1}</div>
                {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">输入行</span>
            <p className="mt-1 text-2xl font-bold text-slate-900">{rowsIn ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">输出行</span>
            <p className="mt-1 text-2xl font-bold text-blue-600">{rowsOut ?? "-"}</p>
          </div>
        </div>
        <SimDesc step={cur} />
      </div>
      <StepNav active={active} total={steps.length} onPrev={() => setActive(Math.max(0, active - 1))} onNext={() => setActive(Math.min(steps.length - 1, active + 1))} />
    </div>
  );
}


// ── 策略对比 ──────────────────────────────────────────────────

function StrategyCompareView({ steps }: { steps: DemoStep[] }) {
  const [active, setActive] = useState(0);
  const cur = steps[active];
  const cfg = cur?.simConfig as Record<string, unknown> | undefined;
  const action = (cfg?.action as string) || "";
  const strategies = cfg?.strategies as StrategyData[] | undefined;
  const strategy = cfg?.strategy as StrategyData | undefined; // detail 步骤用 strategy（单数）
  const displayStrategy = action === "detail" ? (strategy ?? strategies?.[0]) : undefined;
  const optimalName = cfg?.optimal as string | undefined;
  const maxCost = strategies ? Math.max(...strategies.map((s) => s.cost), 1) : 1;

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">JOIN 策略对比</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {action === "overview" && strategies && (
          <div className="grid grid-cols-3 gap-3">
            {strategies.map((s) => (
              <div key={s.name} className={`rounded-xl border-2 p-4 shadow-sm ${s.optimal ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-slate-900">{s.name}</span>
                  {s.optimal && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">最优</span>}
                </div>
                <div className="mb-2 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(s.cost / maxCost) * 100}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                  <span>代价</span>
                  <span className="font-mono font-bold text-slate-700">{s.cost.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed">{s.best_for}</p>
              </div>
            ))}
          </div>
        )}
        {action === "detail" && displayStrategy && (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-900">{displayStrategy.name}</span>
                {displayStrategy.optimal && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white">最优</span>}
              </div>
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex justify-between"><span>代价</span><span className="font-mono font-bold">{displayStrategy.cost.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>扫描行</span><span className="font-mono font-bold">{displayStrategy.rows_in.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>结果行</span><span className="font-mono font-bold">{displayStrategy.rows_out.toLocaleString()}</span></div>
              </div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">算法原理</span>
              <p className="mt-1 text-xs leading-relaxed text-blue-800">{displayStrategy.principle}</p>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-blue-600">适用场景</span>
              <p className="mt-1 text-xs leading-relaxed text-blue-800">{displayStrategy.best_for}</p>
            </div>
          </div>
        )}
        {action === "conclusion" && strategies && optimalName && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">推荐策略</span>
            <h3 className="mt-2 text-lg font-bold text-emerald-900">{optimalName}</h3>
            <p className="mt-2 text-sm leading-relaxed text-emerald-800">
              {strategies.find((s) => s.name === optimalName)?.best_for || ""}
            </p>
          </div>
        )}
        <SimDesc step={cur} />
      </div>
      <StepNav active={active} total={steps.length} onPrev={() => setActive(Math.max(0, active - 1))} onNext={() => setActive(Math.min(steps.length - 1, active + 1))} />
    </div>
  );
}
