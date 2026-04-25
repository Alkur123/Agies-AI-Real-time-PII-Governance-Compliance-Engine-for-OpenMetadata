export default function SessionPanel({ result }) {
  const session = result?.session;
  if (!session) return (
    <div className="font-data text-[10px] text-neutral-600 text-center py-4">No session data yet</div>
  );

  const turns    = session.turn_count     || 0;
  const risk     = session.cumulative_risk || 0;
  const distress = session.distress_score  || 0;
  const esc      = session.escalation_flag;

  const riskLevel = risk > 7 ? 'HIGH' : risk > 3 ? 'MED' : 'LOW';
  const riskColor = risk > 7 ? '#ef4444' : risk > 3 ? '#f59e0b' : '#10b981';
  const distressColor = distress > 0.6 ? '#ef4444' : distress > 0.3 ? '#f59e0b' : '#10b981';

  const stats = [
    { label: 'TURNS',         value: turns,            color: 'text-white' },
    { label: 'SESSION RISK',  value: `${risk.toFixed(2)} / 10`, color: '', style: { color: riskColor } },
    { label: 'RISK LEVEL',    value: riskLevel,        color: '', style: { color: riskColor } },
    { label: 'DISTRESS',      value: distress.toFixed(3), color: '', style: { color: distressColor } },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {stats.map(({ label, value, color, style }) => (
          <div key={label} className="card-inner px-2.5 py-2">
            <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-0.5">{label}</div>
            <div className={`font-data text-sm font-bold ${color}`} style={style}>{value}</div>
          </div>
        ))}
      </div>

      {/* Escalation flag */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${esc ? 'bg-red-500/8 border-red-500/30' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${esc ? 'bg-red-500 animate-pulse-dot' : 'bg-emerald-500'}`} />
        <span className={`font-data text-[10px] tracking-widest ${esc ? 'text-red-400' : 'text-emerald-500'}`}>
          {esc ? 'ESCALATION TRIGGERED' : 'SESSION NORMAL'}
        </span>
      </div>

      {/* Risk bar */}
      <div>
        <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full animate-bar"
            style={{ width: `${(risk / 10) * 100}%`, backgroundColor: riskColor }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="font-data text-[8px] text-neutral-700">0</span>
          <span className="font-data text-[8px] text-neutral-700">10</span>
        </div>
      </div>
    </div>
  );
}
