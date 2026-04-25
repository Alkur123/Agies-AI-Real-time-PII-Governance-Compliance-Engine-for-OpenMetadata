import { useState, useRef, useEffect } from 'react';
import { analyze, resetSession } from './api';

import DecisionBanner  from './components/DecisionBanner';
import RiskBar         from './components/RiskBar';
import ExplainPanel    from './components/ExplainPanel';
import RiskGauge       from './components/RiskGauge';
import DecisionComparator from './components/DecisionComparator';
import SessionPanel    from './components/SessionPanel';
import RiskGraph       from './components/RiskGraph';
import SignalBreakdown from './components/SignalBreakdown';
import EvidencePanel   from './components/EvidencePanel';
import Timeline        from './components/Timeline';
import AuditLogs       from './components/AuditLogs';
import MetricsPanel    from './components/MetricsPanel';
import HeatmapPanel    from './components/HeatmapPanel';
import CatalogPanel    from './components/CatalogPanel';

// ── Decision color tokens ────────────────────────────────────────
const D = {
  BLOCK:   { border: 'border-l-red-500',    bg: 'bg-red-500/5',     text: 'text-red-400',     badge: 'bg-red-500/15 border-red-500/40' },
  SUPPORT: { border: 'border-l-amber-500',  bg: 'bg-amber-500/5',   text: 'text-amber-400',   badge: 'bg-amber-500/15 border-amber-500/40' },
  ALLOW:   { border: 'border-l-emerald-500',bg: 'bg-emerald-500/5', text: 'text-emerald-400', badge: 'bg-emerald-500/15 border-emerald-500/40' },
};

// ── Example starter prompts ──────────────────────────────────────
const EXAMPLES = [
  'What is the legal right to remain silent?',
  'Explain how machine learning works',
  'How do I invest in index funds safely?',
  'What are the symptoms of appendicitis?',
];

// ── Loading indicator ────────────────────────────────────────────
function LoadingBubble() {
  return (
    <div className="flex gap-3 animate-message-in">
      <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
        <span className="text-[10px] text-indigo-400">A</span>
      </div>
      <div className="card px-4 py-3 flex items-center gap-2">
        <div className="loading-dot" />
        <div className="loading-dot" />
        <div className="loading-dot" />
      </div>
    </div>
  );
}

// ── Right panel tab definitions ──────────────────────────────────
const TABS = [
  { id: 'risk',       label: 'Risk' },
  { id: 'evidence',   label: 'Evidence' },
  { id: 'monitor',    label: 'Monitor' },
  { id: 'catalog',    label: 'Catalog' },
];

export default function App() {
  // Unique session ID per browser tab — never shared between users
  const sessionId    = useRef(`s_${Date.now().toString(36)}`);
  const messagesEnd  = useRef(null);

  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [latestResult, setLatestResult] = useState(null);
  const [activeTab,    setActiveTab]    = useState('risk');
  const [refreshTick,  setRefreshTick]  = useState(0);
  const [resetMsg,     setResetMsg]     = useState(null);
  const [showPanel,    setShowPanel]    = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput('');
    setError(null);
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', text: query }]);

    try {
      const data = await analyze(query, sessionId.current);
      setLatestResult(data);
      setRefreshTick(t => t + 1);
      setMessages(prev => [...prev, { role: 'ai', data }]);
      // Auto-switch to evidence tab on BLOCK for immediate explanation
      if (data.decision === 'BLOCK') { setActiveTab('evidence'); setShowPanel(true); }
    } catch (err) {
      setError(err.message || 'Request failed. Check backend connection.');
      setMessages(prev => prev.slice(0, -1)); // remove optimistic user message
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetSession(sessionId.current);
      setMessages([]);
      setInput('');
      setLatestResult(null);
      setResetMsg('Session cleared');
      setTimeout(() => setResetMsg(null), 2500);
    } catch {
      setResetMsg('Reset failed — backend unreachable');
      setTimeout(() => setResetMsg(null), 3000);
    }
  };

  const latestDecision = messages.filter(m => m.role === 'ai').at(-1)?.data?.decision;

  return (
    <div className="h-screen flex flex-col bg-[#07070f] text-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 h-14 flex items-center justify-between px-5 border-b border-white/[0.06] bg-[#07070f]/95 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path d="M8 1.5L2 4.5v4c0 3 2.5 5.5 6 6 3.5-.5 6-3 6-6v-4L8 1.5z" stroke="#818cf8" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M5.5 8l2 2 3-3" stroke="#818cf8" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight gradient-text">Aegis AI</div>
            <div className="font-data text-[9px] text-neutral-600 tracking-widest -mt-0.5">GOVERNANCE ENGINE</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live status */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" />
            <span className="font-data text-[9px] text-neutral-500 tracking-widest">LIVE</span>
          </div>

          {/* Session ID */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.03] border border-white/[0.06]">
            <span className="font-data text-[9px] text-neutral-600">SID</span>
            <span className="font-data text-[9px] text-neutral-400">{sessionId.current}</span>
          </div>

          {/* Panel toggle — mobile only */}
          <button
            onClick={() => setShowPanel(v => !v)}
            className="md:hidden px-3 py-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-data hover:bg-indigo-500/10 hover:border-indigo-500/40 transition-all"
          >
            {showPanel ? '← Chat' : 'Intel ›'}
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-data hover:bg-red-500/10 hover:border-red-500/40 transition-all"
          >
            Reset Session
          </button>
        </div>
      </header>

      {/* ── Decision banner ─────────────────────────────────────── */}
      <DecisionBanner
        decision={latestDecision}
        category={latestResult?.category}
        ruleId={latestResult?.rule_id}
      />

      {/* ── Toast messages ──────────────────────────────────────── */}
      {resetMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 card border border-white/10 font-data text-xs text-neutral-300 animate-fade-up">
          {resetMsg}
        </div>
      )}

      {/* ── Catalog full-page overlay ───────────────────────────── */}
      {activeTab === 'catalog' && (
        <div className="flex-1 overflow-y-auto bg-[#09090f] p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setActiveTab('risk')}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 text-xs font-data hover:text-white transition-all"
            >
              ← Back to Chat
            </button>
          </div>
          <CatalogPanel />
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div className={`flex-1 flex overflow-hidden ${activeTab === 'catalog' ? 'hidden' : ''}`}>

        {/* ── Left: Chat ─────────────────────────────────────────── */}
        <div className={`flex-col min-w-0 border-r border-white/[0.06] ${showPanel ? 'hidden md:flex' : 'flex'} flex-1`}>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
            <div className="max-w-2xl mx-auto space-y-5">

              {/* Empty state */}
              {messages.length === 0 && (
                <div className="text-center pt-16 animate-fade-up">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-5">
                    <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                      <path d="M12 3L4 7v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V7L12 3z" stroke="#818cf8" strokeWidth="1.5" strokeLinejoin="round" />
                      <path d="M9 12l2 2 4-4" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white mb-1">Aegis AI Governance Engine</h2>
                  <p className="text-sm text-neutral-500 mb-8 max-w-sm mx-auto leading-relaxed">
                    Every query is analyzed in real-time across semantic, session, and policy signals.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                    {EXAMPLES.map(ex => (
                      <button
                        key={ex}
                        onClick={() => handleSend(ex)}
                        className="text-left px-3 py-2.5 rounded-xl card hover:bg-white/[0.04] border-white/[0.06] hover:border-white/[0.1] transition-all text-xs text-neutral-400 hover:text-neutral-200"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              {messages.map((msg, i) => (
                <div key={i} className="animate-message-in" style={{ animationDelay: `${Math.min(i * 20, 100)}ms` }}>

                  {/* User message */}
                  {msg.role === 'user' && (
                    <div className="flex justify-end">
                      <div className="max-w-lg bg-indigo-600/80 border border-indigo-500/30 px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white leading-relaxed">
                        {msg.text}
                      </div>
                    </div>
                  )}

                  {/* AI message */}
                  {msg.role === 'ai' && (() => {
                    const d = msg.data;
                    const dc = D[d.decision] || D.ALLOW;
                    return (
                      <div className="flex gap-3">
                        {/* Avatar */}
                        <div className="w-7 h-7 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-1">
                          <span className="text-[10px] text-indigo-400 font-bold">A</span>
                        </div>

                        {/* Bubble */}
                        <div className={`flex-1 card border-l-2 ${dc.border} ${dc.bg} px-4 py-3`}>
                          {/* Header row */}
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-data text-[9px] font-bold px-1.5 py-0.5 rounded border ${dc.badge} ${dc.text}`}>
                              {d.decision}
                            </span>
                            <span className="font-data text-[9px] text-neutral-600">{d.category}</span>
                            {d.confidence != null && (
                              <span className="font-data text-[9px] text-neutral-600 ml-auto">
                                conf {(d.confidence * 100).toFixed(0)}%
                              </span>
                            )}
                          </div>

                          {/* Response text */}
                          <p className="text-sm text-neutral-300 leading-relaxed">{d.llm_response}</p>

                          {/* Risk bar */}
                          <RiskBar score={(d.risk_score || 0) * 100} />

                          {/* Expandable details */}
                          <ExplainPanel data={d} />
                        </div>
                      </div>
                    );
                  })()}

                </div>
              ))}

              {loading && <LoadingBubble />}

              {/* Error message */}
              {error && (
                <div className="card border border-red-500/30 bg-red-500/5 px-4 py-3 animate-message-in">
                  <div className="font-data text-[9px] text-red-400 tracking-widest mb-1">ERROR</div>
                  <p className="text-xs text-red-300">{error}</p>
                </div>
              )}

              <div ref={messagesEnd} />
            </div>
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#07070f]/80 px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <textarea
                    className="w-full bg-[#0e0e1a] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-[inherit] min-h-[48px] max-h-32"
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="Send a query to the governance engine…"
                  />
                  {input.length > 0 && (
                    <div className="absolute bottom-2.5 right-3 font-data text-[9px] text-neutral-700">
                      {input.length}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="h-12 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all flex items-center gap-2 shrink-0"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                      <path d="M2 8l10-5-3 5 3 5z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="font-data text-[9px] text-neutral-700">Enter to send · Shift+Enter for newline</span>
                <span className="font-data text-[9px] text-neutral-700">98.1% accuracy · 100% recall</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Intelligence Panel ───────────────────────────── */}
        <div className={`shrink-0 flex-col bg-[#09090f] md:w-[360px] md:flex ${showPanel ? 'flex w-full' : 'hidden md:flex'}`}>

          {/* Tabs */}
          <div className="shrink-0 flex border-b border-white/[0.06] px-3 pt-2 gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-t text-[11px] font-data tracking-wider border border-transparent transition-all ${activeTab === tab.id ? 'tab-active' : 'text-neutral-600 hover:text-neutral-400'}`}
              >
                {tab.label.toUpperCase()}
              </button>
            ))}

            {/* Refresh indicator */}
            {latestResult && (
              <div className="ml-auto self-center flex items-center gap-1.5 pr-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse-dot" />
                <span className="font-data text-[8px] text-neutral-600">LIVE</span>
              </div>
            )}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* ── Tab: Risk ──────────────────────────────────────── */}
            {activeTab === 'risk' && (
              <div className="space-y-4 animate-fade-up">
                {latestResult ? (
                  <>
                    <div className="card p-4">
                      <div className="font-data text-[9px] text-neutral-600 tracking-widest mb-3">RISK SCORE</div>
                      <RiskGauge result={latestResult} />
                    </div>

                    <div className="card p-4">
                      <DecisionComparator result={latestResult} />
                    </div>

                    <div className="card p-4">
                      <div className="font-data text-[9px] text-neutral-600 tracking-widest mb-3">SESSION INTELLIGENCE</div>
                      <SessionPanel result={latestResult} />
                    </div>

                    <div className="card p-4">
                      <RiskGraph result={latestResult} />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="font-data text-[10px] text-neutral-700 tracking-widest">AWAITING FIRST QUERY</div>
                    <p className="text-[11px] text-neutral-700 mt-2">Risk analysis will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Evidence ───────────────────────────────────── */}
            {activeTab === 'evidence' && (
              <div className="space-y-4 animate-fade-up">
                {latestResult ? (
                  <>
                    {/* Reason / explanation */}
                    {(latestResult.reason || latestResult.explanation) && (
                      <div className="card p-4">
                        <div className="font-data text-[9px] text-neutral-600 tracking-widest mb-2">DECISION REASON</div>
                        <p className="text-xs text-neutral-400 leading-relaxed">
                          {latestResult.reason || latestResult.explanation}
                        </p>
                      </div>
                    )}

                    <div className="card p-4">
                      <SignalBreakdown result={latestResult} />
                    </div>

                    {latestResult.evidence_spans?.length > 0 && (
                      <div className="card p-4">
                        <div className="font-data text-[9px] text-neutral-600 tracking-widest mb-2">EVIDENCE SPANS</div>
                        <EvidencePanel result={latestResult} />
                      </div>
                    )}

                    <div className="card p-4">
                      <Timeline result={latestResult} />
                    </div>
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="font-data text-[10px] text-neutral-700 tracking-widest">AWAITING FIRST QUERY</div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab: Monitor ────────────────────────────────────── */}
            {activeTab === 'monitor' && (
              <div className="space-y-4 animate-fade-up">
                <div className="card p-4">
                  <MetricsPanel refreshTick={refreshTick} />
                </div>

                <div className="card p-4">
                  <HeatmapPanel refreshTick={refreshTick} />
                </div>

                <div className="card p-4">
                  <AuditLogs refreshTick={refreshTick} />
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
