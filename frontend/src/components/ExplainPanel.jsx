import { useState } from 'react';

export default function ExplainPanel({ data }) {
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const conf = data.confidence != null ? (data.confidence * 100).toFixed(1) + '%' : '—';

  return (
    <div className="mt-3 border-t border-white/[0.05] pt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-data text-neutral-500 hover:text-indigo-400 transition-colors tracking-widest uppercase"
      >
        <span className="text-[8px]">{open ? '▾' : '▸'}</span>
        {open ? 'Hide Details' : 'Explainability'}
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-fade-up">
          <div className="flex gap-2">
            {[
              { label: 'CATEGORY', value: data.category, color: 'text-indigo-400' },
              { label: 'CONFIDENCE', value: conf, color: 'text-white' },
              { label: 'RULE', value: data.rule_id, color: 'text-amber-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card-inner px-2.5 py-1.5 flex-1">
                <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-0.5">{label}</div>
                <div className={`font-data text-[11px] font-semibold ${color}`}>{value || '—'}</div>
              </div>
            ))}
          </div>

          {data.reason && (
            <div className="card-inner px-3 py-2">
              <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1">REASON</div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">{data.reason}</p>
            </div>
          )}

          {data.explanation && (
            <div className="card-inner px-3 py-2">
              <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1">EXPLANATION</div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">{data.explanation}</p>
            </div>
          )}

          {data.evidence_spans?.length > 0 && (
            <div className="card-inner px-3 py-2">
              <div className="font-data text-[8px] text-neutral-600 tracking-widest mb-1.5">EVIDENCE</div>
              <div className="space-y-1">
                {data.evidence_spans.map((e, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-data text-[10px] text-red-400">"{e.phrase}"</span>
                    <span className="text-neutral-600 text-[9px]">→</span>
                    <span className="font-data text-[10px] text-neutral-400">{e.matched_to}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
