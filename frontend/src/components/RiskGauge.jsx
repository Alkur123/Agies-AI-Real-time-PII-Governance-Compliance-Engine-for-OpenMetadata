// result.decision_trace.session_influence contains the exact session contribution
// that the backend computed: { cumulative_risk, distress_score, escalation }
// result.decision_trace is the rich object from build_decision_trace()

export default function RiskGauge({ result }) {
  if (!result) return null;

  const pct        = Math.min((result.risk_score || 0) * 100, 100);
  const conf       = (result.confidence || 0) * 100;

  // Use session_influence from decision_trace — the exact values used in scoring
  const sessInfl   = result.decision_trace?.session_influence || result.session || {};
  const sessRisk   = ((sessInfl.cumulative_risk || 0) / 10) * 20; // x0.2 weight
  const policyContrib = Math.max(0, pct - conf * 0.6 - sessRisk);

  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
  const label = pct > 70 ? 'HIGH RISK' : pct > 40 ? 'MEDIUM' : 'SAFE';

  // SVG semicircle arc
  const r = 52, cx = 70, cy = 70;
  const toRad = d => (d * Math.PI) / 180;
  const sweep = (pct / 100) * 180;
  const x1 = cx + r * Math.cos(toRad(-180));
  const y1 = cy + r * Math.sin(toRad(-180));
  const x2 = cx + r * Math.cos(toRad(-180 + sweep));
  const y2 = cy + r * Math.sin(toRad(-180 + sweep));
  const large = sweep > 180 ? 1 : 0;

  return (
    <div className="space-y-3">
      {/* Arc gauge */}
      <div className="flex flex-col items-center">
        <svg width="140" height="80" viewBox="0 0 140 80">
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" strokeLinecap="round"
          />
          {pct > 0 && (
            <path
              d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
              fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${color}60)` }}
            />
          )}
        </svg>
        <div className="font-data font-black text-2xl -mt-4" style={{ color }}>{pct.toFixed(1)}</div>
        <div className="font-data text-[9px] tracking-[0.25em] text-neutral-500 mt-0.5">{label}</div>
      </div>

      {/* Score composition */}
      <div className="card-inner p-2.5 space-y-1.5">
        <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1">SCORE COMPOSITION</div>
        {[
          { label: 'SEMANTIC ×0.6', val: conf * 0.6 },
          { label: 'SESSION ×0.2',  val: sessRisk },
          { label: 'POLICY ×0.2',   val: policyContrib },
        ].map(({ label, val }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="font-data text-[9px] text-neutral-500">{label}</span>
            <span className="font-data text-[10px] text-neutral-300">{val.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
