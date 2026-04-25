const CONFIG = {
  BLOCK:   { label:'BLOCKED', bg:'bg-red-500/10',    border:'border-red-500/40',    text:'text-red-400',     dot:'bg-red-500',     icon:'⊗' },
  ALLOW:   { label:'ALLOWED', bg:'bg-emerald-500/10',border:'border-emerald-500/40', text:'text-emerald-400', dot:'bg-emerald-500', icon:'⊕' },
  SUPPORT: { label:'SUPPORT', bg:'bg-amber-500/10',  border:'border-amber-500/40',  text:'text-amber-400',   dot:'bg-amber-500',   icon:'⊙' },
};

export default function DecisionBanner({ decision, category, ruleId }) {
  if (!decision) return null;
  const c = CONFIG[decision] || CONFIG.ALLOW;
  return (
    <div className={`${c.bg} border-b ${c.border} px-6 py-2.5 flex items-center gap-4 animate-fade-up`}>
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} animate-pulse-dot`} />
        <span className={`font-data text-xs font-bold tracking-[0.2em] ${c.text}`}>
          {c.icon} {c.label}
        </span>
      </div>
      {category && (
        <span className="font-data text-[10px] text-neutral-500 tracking-widest uppercase">{category}</span>
      )}
      {ruleId && (
        <span className="font-data text-[10px] text-neutral-600 ml-auto">rule: {ruleId}</span>
      )}
    </div>
  );
}
