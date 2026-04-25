import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-[10px] font-data space-y-1">
      <div className="text-neutral-500">Turn {label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.stroke }}>
          {p.dataKey.toUpperCase()}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function RiskGraph({ result }) {
  const history = result?.session?.risk_history;
  if (!history || history.length === 0) return null;

  const data = history.map(h => ({
    turn:    h.turn,
    risk:    Number((h.risk    || 0).toFixed(2)),
    distress: Number((h.distress || 0).toFixed(3)),
  }));

  return (
    <div className="mt-3">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest mb-2">SESSION RISK TREND</div>
      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="turn" stroke="#333" tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#555' }} />
            <YAxis domain={[0, 10]} stroke="#333" tick={{ fontSize: 9, fontFamily: 'monospace', fill: '#555' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="risk"    stroke="#ef4444" strokeWidth={2} dot={false} name="Risk" />
            <Line type="monotone" dataKey="distress" stroke="#f59e0b" strokeWidth={2} dot={false} name="Distress" strokeDasharray="4 2" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-1 justify-center">
        <div className="flex items-center gap-1.5"><span className="w-3 h-px bg-red-500 inline-block" /><span className="font-data text-[9px] text-neutral-500">Risk</span></div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-px bg-amber-500 inline-block border-dashed" /><span className="font-data text-[9px] text-neutral-500">Distress</span></div>
      </div>
    </div>
  );
}
