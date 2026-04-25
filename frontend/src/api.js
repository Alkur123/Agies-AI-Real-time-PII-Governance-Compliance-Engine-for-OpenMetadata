// Single source of truth for the API base URL.
// Set VITE_API_BASE in your .env file — never hardcode URLs in components.
const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

// POST /analyze  — backend expects { query, session_id }
export const analyze = (query, session_id) =>
  req('/analyze', { method: 'POST', body: JSON.stringify({ query, session_id }) });

// POST /reset-session
export const resetSession = (session_id) =>
  req('/reset-session', { method: 'POST', body: JSON.stringify({ session_id }) });

// GET endpoints
export const getMetrics   = () => req('/metrics');
export const getAuditLogs = () => req('/audit');
export const getHeatmap   = () => req('/heatmap');
export const getStats     = () => req('/stats');
export const getHealth    = () => req('/health');
