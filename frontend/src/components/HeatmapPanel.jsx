import { useEffect, useState } from 'react';
import { getHeatmap } from '../api';

const CAT_COLORS = {
  SAFE:'#10b981', SELF_HARM:'#ef4444', VIOLENCE:'#ef4444', ILLEGAL:'#f97316',
  SEXUAL:'#ec4899', PROMPT_INJECTION:'#a855f7', SYSTEM_EXFILTRATION:'#a855f7',
  MEDICAL:'#3b82f6', FINANCIAL:'#eab308', LEGAL:'#06b6d4',
  PII:'#14b8a6', SELF_HARM_PASSIVE:'#f59e0b',
};

export default function HeatmapPanel({ refreshTick }) {
  const [data, setData] = useState({});

  useEffect(() => {
    getHeatmap().then(setData).catch(() => {});
  }, [refreshTick]);

  const entries = Object.entries(data);

  return (
    <div className="space-y-2">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest">POLICY HEATMAP</div>

      {entries.length === 0 ? (
        <div className="font-data text-[10px] text-neutral-600 text-center py-4">No policy triggers yet</div>
      ) : (
        <div className="space-y-2">
          {entries.map(([category, sub]) => {
            const color = CAT_COLORS[category] || '#6366f1';
            const total = Object.values(sub).reduce((a, b) => a + b, 0);
            return (
              <div key={category} className="card-inner p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-data text-[10px] font-semibold" style={{ color }}>{category}</span>
                  <span className="font-data text-[9px] text-neutral-600">{total} hits</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(sub).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="font-data text-[9px] text-neutral-500">{type}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-[2px] bg-white/[0.04] rounded overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{ width: `${(count / total) * 100}%`, backgroundColor: color, opacity: 0.7 }}
                          />
                        </div>
                        <span className="font-data text-[9px] text-neutral-400 w-4 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
