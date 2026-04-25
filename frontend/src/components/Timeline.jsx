// result.timeline  → array of pipeline stages [{stage, latency_ms, result}, ...]
// result.decision_trace → rich object (named_signals, comparator, rationale, etc.)
// Timeline shows the pipeline stages from result.timeline

export default function Timeline({ result }) {
  const stages = result?.timeline;
  const trace  = result?.decision_trace;

  const hasStages = Array.isArray(stages) && stages.length > 0;
  const rationale = trace?.rationale;
  const narrative = trace?.evidence_narrative;

  if (!hasStages && !rationale) return null;

  return (
    <div className="space-y-3">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest">DECISION PIPELINE</div>

      {/* Stage-by-stage pipeline */}
      {hasStages && (
        <div className="relative">
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.05]" />
          <div className="space-y-2.5">
            {stages.map((step, i) => (
              <div key={i} className="flex gap-3 items-start" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="w-3.5 h-3.5 rounded-full bg-[#0e0e1a] border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5 z-10">
                  <div className="w-1 h-1 rounded-full bg-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-data text-[10px] text-neutral-300 font-medium">{step.stage}</span>
                    <span className="font-data text-[9px] text-neutral-600 shrink-0">{step.latency_ms}ms</span>
                  </div>
                  {step.result && (
                    <p className="font-data text-[9px] text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">
                      {step.result}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Causal rationale from decision_trace */}
      {rationale && (
        <div className="card-inner p-2.5">
          <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1">CAUSAL RATIONALE</div>
          <p className="font-data text-[9px] text-neutral-400 leading-relaxed">{rationale}</p>
        </div>
      )}

      {/* Evidence narrative from decision_trace */}
      {narrative?.length > 0 && (
        <div className="card-inner p-2.5">
          <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1.5">EVIDENCE CHAIN</div>
          <div className="space-y-1">
            {narrative.map((ev, i) => (
              <div key={i} className="font-data text-[9px] text-neutral-500 flex items-center gap-1.5">
                <span className="text-red-500/60">▸</span>
                {ev}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
