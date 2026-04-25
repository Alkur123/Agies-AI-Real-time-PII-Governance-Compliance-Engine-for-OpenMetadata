import React from 'react';
import { Grid3x3 } from 'lucide-react';

const CATEGORY_COLORS = {
  SELF_HARM: '#FF3B30', SELF_HARM_PASSIVE: '#FF6B6B', VIOLENCE: '#FF4500',
  ILLEGAL: '#FF6347', SEXUAL: '#DC143C', PROMPT_INJECTION: '#FF8C00',
  SYSTEM_EXFILTRATION: '#FF7F50', MEDICAL: '#F59E0B', FINANCIAL: '#E5A100',
  LEGAL: '#D4A017', PII: '#FF69B4', SAFE: '#10B981',
  SESSION_RISK_BLOCK: '#FF0000',
};

export default function PolicyHeatmap({ heatmap }) {
  const entries = Object.entries(heatmap || {});
  if (entries.length === 0) {
    return (
      <div data-testid="policy-heatmap" className="widget p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <Grid3x3 className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Policy Heatmap</span>
        </div>
        <p className="text-xs text-neutral-600 font-mono">No policy triggers yet. Analyze queries to populate.</p>
      </div>
    );
  }

  return (
    <div data-testid="policy-heatmap" className="widget p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Grid3x3 className="w-4 h-4 text-neutral-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Policy Heatmap</span>
      </div>
      <div className="space-y-3">
        {entries.map(([category, subs]) => {
          const total = Object.values(subs).reduce((a, b) => a + b, 0);
          const color = CATEGORY_COLORS[category] || '#6B7280';
          return (
            <div key={category}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-mono text-neutral-400">{category}</span>
                <span className="text-[11px] font-mono font-medium" style={{ color }}>{total}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(subs).map(([sub, count]) => (
                  <div
                    key={sub}
                    className="text-[9px] font-mono px-1.5 py-0.5 border"
                    style={{
                      borderColor: `${color}30`,
                      backgroundColor: `${color}15`,
                      color: color,
                    }}
                    title={`${sub}: ${count}`}
                  >
                    {sub}: {count}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
