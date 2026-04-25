import React, { useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import QueryInput from './components/QueryInput';
import DecisionBanner from './components/DecisionBanner';
import SignalBreakdown from './components/SignalBreakdown';
import EvidenceSpans from './components/EvidenceSpans';
import DecisionComparator from './components/DecisionComparator';
import GovernanceTimeline from './components/GovernanceTimeline';
import RiskGauge from './components/RiskGauge';
import PolicyHeatmap from './components/PolicyHeatmap';
import SessionIntelligence from './components/SessionIntelligence';
import AuditLogs from './components/AuditLogs';
import TopMatches from './components/TopMatches';

const API = process.env.REACT_APP_BACKEND_URL;

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [heatmap, setHeatmap] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);

  const analyze = useCallback(async (query) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, session_id: sessionId }),
      });
      const data = await res.json();
      setResult(data);

      // Fetch heatmap and audit
      const [hm, al] = await Promise.all([
        fetch(`${API}/api/heatmap`).then(r => r.json()),
        fetch(`${API}/api/audit`).then(r => r.json()),
      ]);
      setHeatmap(hm);
      setAuditLogs(al.logs || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header />
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 pb-12">
        <QueryInput onAnalyze={analyze} loading={loading} />

        {result && (
          <div className="space-y-4 mt-6">
            {/* Row 1: Decision + Risk */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ animationDelay: '0.05s' }}>
              <div className="lg:col-span-8 animate-fade-up">
                <DecisionBanner result={result} />
              </div>
              <div className="lg:col-span-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <RiskGauge result={result} />
              </div>
            </div>

            {/* Row 2: Signals + Evidence + Comparator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-4 animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <SignalBreakdown signals={result.signal_breakdown} namedSignals={result.decision_trace?.named_signals} />
              </div>
              <div className="lg:col-span-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <EvidenceSpans evidence={result.evidence_spans} query={result.query} />
              </div>
              <div className="lg:col-span-4 animate-fade-up" style={{ animationDelay: '0.25s' }}>
                <DecisionComparator trace={result.decision_trace} />
              </div>
            </div>

            {/* Row 3: Timeline + Top Matches */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <GovernanceTimeline timeline={result.timeline} total={result.total_latency_ms} />
              </div>
              <div className="lg:col-span-6 animate-fade-up" style={{ animationDelay: '0.35s' }}>
                <TopMatches matches={result.top_matches} category={result.category} />
              </div>
            </div>

            {/* Row 4: Session + Heatmap */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-6 animate-fade-up" style={{ animationDelay: '0.4s' }}>
                <SessionIntelligence session={result.session} />
              </div>
              <div className="lg:col-span-6 animate-fade-up" style={{ animationDelay: '0.45s' }}>
                <PolicyHeatmap heatmap={heatmap} />
              </div>
            </div>

            {/* Row 5: Audit Logs */}
            <div className="animate-fade-up" style={{ animationDelay: '0.5s' }}>
              <AuditLogs logs={auditLogs} />
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center mt-32 text-center">
            <div className="text-neutral-600 text-6xl mb-6">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-neutral-500 text-lg font-medium" style={{ fontFamily: 'Chivo, sans-serif' }}>Enter a query to analyze</p>
            <p className="text-neutral-600 text-sm mt-2">The governance engine will classify intent, detect risks, and explain decisions</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
