import { useEffect, useState } from 'react';
import { getAuditLogs } from '../api';

const DECISION_STYLE = {
  BLOCK:   'text-red-400 bg-red-500/10 border-red-500/30',
  SUPPORT: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  ALLOW:   'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
};

export default function AuditLogs({ refreshTick }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAuditLogs()
      .then(data => setLogs(data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshTick]); // re-fetches after each query

  return (
    <div className="space-y-2">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest">AUDIT LOG</div>

      {loading && logs.length === 0 && (
        <div className="font-data text-[10px] text-neutral-600 text-center py-4">Loading…</div>
      )}

      {!loading && logs.length === 0 && (
        <div className="font-data text-[10px] text-neutral-600 text-center py-4">No audit entries yet</div>
      )}

      <div className="max-h-64 overflow-y-auto space-y-1.5">
        {logs.map((log, i) => {
          const style = DECISION_STYLE[log.decision] || DECISION_STYLE.ALLOW;
          const risk  = ((log.risk_score || 0) * 100).toFixed(1);
          const ts    = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '';
          const query = (log.safe_query || log.query || '').slice(0, 72);

          return (
            <div key={i} className={`card-inner p-2.5 border ${style.split(' ').slice(2).join(' ')}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`font-data text-[9px] font-bold px-1.5 py-0.5 rounded border ${style}`}>
                  {log.decision}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-data text-[9px] text-neutral-600">{log.category}</span>
                  <span className="font-data text-[9px] text-neutral-600">{risk}%</span>
                </div>
              </div>
              <p className="font-data text-[9px] text-neutral-500 leading-relaxed truncate">{query}</p>
              {ts && <div className="font-data text-[8px] text-neutral-700 mt-1">{ts}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
