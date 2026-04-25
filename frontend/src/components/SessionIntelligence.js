import React from 'react';
import { Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function SessionIntelligence({ session }) {
  if (!session) return null;

  const riskColor = session.cumulative_risk > 5 ? '#FF3B30' : session.cumulative_risk > 2 ? '#F59E0B' : '#10B981';
  const distressColor = session.distress_score > 0.7 ? '#FF3B30' : session.distress_score > 0.3 ? '#F59E0B' : '#10B981';

  return (
    <div data-testid="session-intelligence" className="widget p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-neutral-500" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Session Intelligence</span>
        </div>
        <div className="flex items-center gap-2">
          {session.escalation_flag && (
            <span className="text-[10px] font-mono text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 border border-[#FF3B30]/30">
              ESCALATED
            </span>
          )}
          <span className="text-[10px] font-mono text-neutral-500">Turn {session.turn_count}</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-black/40 border border-white/5 p-3">
          <div className="text-[10px] font-mono text-neutral-600">CUMULATIVE RISK</div>
          <div className="text-xl font-black font-mono" style={{ color: riskColor }}>
            {session.cumulative_risk.toFixed(2)}
          </div>
          <div className="h-1 bg-white/5 mt-2 overflow-hidden">
            <div className="h-full" style={{ width: `${(session.cumulative_risk / 10) * 100}%`, backgroundColor: riskColor }} />
          </div>
          <div className="text-[9px] font-mono text-neutral-600 mt-1">/ 10.0</div>
        </div>
        <div className="bg-black/40 border border-white/5 p-3">
          <div className="text-[10px] font-mono text-neutral-600">DISTRESS SCORE</div>
          <div className="text-xl font-black font-mono" style={{ color: distressColor }}>
            {session.distress_score.toFixed(3)}
          </div>
          <div className="h-1 bg-white/5 mt-2 overflow-hidden">
            <div className="h-full" style={{ width: `${session.distress_score * 100}%`, backgroundColor: distressColor }} />
          </div>
          <div className="text-[9px] font-mono text-neutral-600 mt-1">/ 1.0</div>
        </div>
      </div>

      {/* Chart */}
      {session.risk_history && session.risk_history.length > 1 && (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={session.risk_history}>
              <XAxis dataKey="turn" tick={{ fontSize: 9, fill: '#525252' }} axisLine={{ stroke: '#262626' }} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#525252' }} axisLine={false} tickLine={false} width={25} />
              <Tooltip
                contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                labelStyle={{ color: '#737373' }}
              />
              <Line type="monotone" dataKey="risk" stroke="#FF3B30" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="distress" stroke="#3B82F6" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
