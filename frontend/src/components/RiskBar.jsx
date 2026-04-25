export default function RiskBar({ score }) {
  if (score == null) return null;
  const pct = Math.min(Math.max(score, 0), 100);
  const color = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#10b981';
  const label = pct > 70 ? 'HIGH' : pct > 40 ? 'MED' : 'LOW';
  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between">
        <span className="font-data text-[10px] text-neutral-500 tracking-widest">RISK</span>
        <span className="font-data text-[10px] font-bold" style={{ color }}>{label} {pct.toFixed(1)}%</span>
      </div>
      <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full animate-bar"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}50` }}
        />
      </div>
    </div>
  );
}
