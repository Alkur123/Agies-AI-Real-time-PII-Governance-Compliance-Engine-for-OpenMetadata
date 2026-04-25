import React from 'react';
import { Database } from 'lucide-react';

export default function TopMatches({ matches, category }) {
  if (!matches || matches.length === 0) return null;

  return (
    <div data-testid="top-matches" className="widget p-5 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-neutral-500" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">FAISS Vector Matches</span>
      </div>
      <div className="space-y-2">
        {matches.map((m, i) => {
          const isWinner = m.label === category;
          const simPct = (m.similarity * 100).toFixed(1);
          return (
            <div
              key={i}
              className={`p-2.5 border ${isWinner ? 'border-white/20 bg-white/[0.03]' : 'border-white/5'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-neutral-600">#{m.rank}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${isWinner ? 'text-white border-white/20' : 'text-neutral-500 border-white/5'}`}>
                    {m.label}
                  </span>
                </div>
                <span className={`text-[11px] font-mono font-medium ${parseFloat(simPct) > 60 ? 'text-[#FF3B30]' : parseFloat(simPct) > 40 ? 'text-[#F59E0B]' : 'text-neutral-400'}`}>
                  {simPct}%
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono leading-relaxed truncate">{m.text}</p>
              {/* Similarity bar */}
              <div className="h-0.5 bg-white/5 mt-2 overflow-hidden">
                <div className="h-full bg-white/20 transition-all duration-500" style={{ width: `${simPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
