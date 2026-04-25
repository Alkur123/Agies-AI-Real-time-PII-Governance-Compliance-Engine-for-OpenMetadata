import { useEffect, useState } from 'react';
import { getMetrics } from '../api';

export default function MetricsPanel({ refreshTick }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getMetrics()
      .then(setMetrics)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshTick]);

  if (loading && !metrics) return (
    <div className="font-data text-[10px] text-neutral-600 text-center py-4">Loading metrics…</div>
  );
  if (!metrics) return null;

  // avg_latency is in SECONDS from backend (time.time() diff) — convert to ms
  const latencyMs = ((metrics.avg_latency || 0) * 1000).toFixed(1);

  const items = [
    { label: 'TOTAL REQUESTS', value: metrics.total_requests,  color: 'text-white' },
    { label: 'ERRORS',         value: metrics.total_errors,     color: 'text-red-400' },
    { label: 'AVG LATENCY',    value: `${latencyMs}ms`,         color: 'text-indigo-400' },
  ];

  return (
    <div className="space-y-2">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest">SYSTEM METRICS</div>
      <div className="grid grid-cols-3 gap-1.5">
        {items.map(({ label, value, color }) => (
          <div key={label} className="card-inner px-2.5 py-2 text-center">
            <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1">{label}</div>
            <div className={`font-data text-sm font-bold ${color}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
