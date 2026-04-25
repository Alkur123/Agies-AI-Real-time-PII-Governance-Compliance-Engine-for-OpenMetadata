// result.decision_trace.named_signals is richer than result.signal_breakdown:
// it includes top 5 semantic signals + intent signals + attack amplifiers
// Falls back to result.signal_breakdown if decision_trace not present

const CATEGORY_COLORS = {
  SAFE:'#10b981', SELF_HARM:'#ef4444', VIOLENCE:'#ef4444', ILLEGAL:'#f97316',
  SEXUAL:'#ec4899', PROMPT_INJECTION:'#a855f7', SYSTEM_EXFILTRATION:'#a855f7',
  MEDICAL:'#3b82f6', FINANCIAL:'#eab308', LEGAL:'#06b6d4',
  PII:'#14b8a6', SELF_HARM_PASSIVE:'#f59e0b',
};

export default function SignalBreakdown({ result }) {
  // Prefer named_signals (richer: includes intent + attack amplifiers)
  const signals = result?.decision_trace?.named_signals || result?.signal_breakdown;
  if (!signals || Object.keys(signals).length === 0) return null;

  const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  return (
    <div className="space-y-2">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest">SIGNAL BREAKDOWN</div>
      {sorted.map(([cat, val]) => {
        const widthPct = ((val / max) * 100).toFixed(0);
        const color = CATEGORY_COLORS[cat] || '#6366f1';
        const displayVal = val <= 1 ? (val * 100).toFixed(1) + '%' : val.toFixed(2);
        return (
          <div key={cat}>
            <div className="flex justify-between mb-0.5">
              <span className="font-data text-[10px] text-neutral-400">{cat}</span>
              <span className="font-data text-[10px] font-bold" style={{ color }}>{displayVal}</span>
            </div>
            <div className="h-[3px] bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full animate-bar"
                style={{ width: `${widthPct}%`, backgroundColor: color, opacity: 0.85 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
