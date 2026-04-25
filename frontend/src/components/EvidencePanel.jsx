// Reads evidence_spans from result root — confirmed field in backend response
export default function EvidencePanel({ result }) {
  if (!result?.evidence_spans?.length) return null;

  return (
    <div className="card-inner p-3 mt-2">
      <div className="font-data text-[9px] text-neutral-600 tracking-widest mb-2">EVIDENCE SIGNALS</div>
      <div className="space-y-1.5">
        {result.evidence_spans.map((e, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
              <span className="font-data text-[10px] text-red-400 truncate">"{e.phrase}"</span>
            </div>
            <span className="font-data text-[10px] text-neutral-500 shrink-0">{e.matched_to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
