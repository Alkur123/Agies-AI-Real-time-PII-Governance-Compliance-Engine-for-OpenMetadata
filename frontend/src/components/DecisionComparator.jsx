// result.decision_trace is the rich object from build_decision_trace():
// { comparator: {blocked_score, allowed_score, margin},
//   winning_signal: {category, strength},
//   runner_up_signal: {category, strength},
//   named_signals, rationale, session_influence, ... }

export default function DecisionComparator({ result }) {
  const trace = result?.decision_trace;
  if (!trace?.comparator) return null;

  const { comparator, winning_signal, runner_up_signal } = trace;

  const blockedPct = (comparator.blocked_score * 100).toFixed(1);
  const allowedPct = (comparator.allowed_score * 100).toFixed(1);
  const marginPct  = (comparator.margin * 100).toFixed(1);

  return (
    <div className="space-y-3 mt-3">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest">DECISION BALANCE</div>

      {/* Stacked bar */}
      <div>
        <div className="flex h-5 rounded overflow-hidden">
          <div
            className="flex items-center justify-center text-[9px] font-data font-bold text-white transition-all duration-700"
            style={{ width: `${blockedPct}%`, background: 'rgba(239,68,68,0.75)' }}
          >
            {comparator.blocked_score > 0.12 && `${blockedPct}%`}
          </div>
          <div
            className="flex items-center justify-center text-[9px] font-data font-bold text-white transition-all duration-700"
            style={{ width: `${allowedPct}%`, background: 'rgba(16,185,129,0.75)' }}
          >
            {comparator.allowed_score > 0.12 && `${allowedPct}%`}
          </div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-data text-[9px] text-red-400">BLOCK {blockedPct}%</span>
          <span className="font-data text-[9px] text-emerald-400">ALLOW {allowedPct}%</span>
        </div>
      </div>

      {/* Margin */}
      <div className="card-inner p-2.5">
        <div className="font-data text-[8px] text-neutral-600 tracking-widest">DECISION MARGIN</div>
        <div className="font-data text-xl font-black text-white">{marginPct}%</div>
      </div>

      {/* Competing signals */}
      <div className="space-y-1.5">
        {winning_signal && (
          <div className="flex items-center justify-between">
            <span className="font-data text-[9px] text-neutral-600">WINNER</span>
            <span className="font-data text-[10px] text-white">
              {winning_signal.category}{' '}
              <span className="text-neutral-600">({(winning_signal.strength * 100).toFixed(1)}%)</span>
            </span>
          </div>
        )}
        {runner_up_signal && runner_up_signal.category !== 'NONE' && (
          <div className="flex items-center justify-between">
            <span className="font-data text-[9px] text-neutral-600">RUNNER-UP</span>
            <span className="font-data text-[10px] text-neutral-400">
              {runner_up_signal.category}{' '}
              <span className="text-neutral-600">({(runner_up_signal.strength * 100).toFixed(1)}%)</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
