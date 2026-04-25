import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const RISK_COLOR = {
  CRITICAL: { bg: "bg-red-900/40",    border: "border-red-500",   text: "text-red-400",   dot: "bg-red-500"   },
  HIGH:     { bg: "bg-orange-900/40", border: "border-orange-500",text: "text-orange-400",dot: "bg-orange-500"},
  MEDIUM:   { bg: "bg-yellow-900/40", border: "border-yellow-500",text: "text-yellow-400",dot: "bg-yellow-500"},
  NONE:     { bg: "bg-green-900/20",  border: "border-green-600", text: "text-green-400", dot: "bg-green-500" },
};

const TAG_COLOR = {
  DPDP_CRITICAL:        "bg-red-700 text-red-100",
  DPDP_SENSITIVE:       "bg-orange-700 text-orange-100",
  GDPR_PERSONAL:        "bg-blue-700 text-blue-100",
  GDPR_SPECIAL_CATEGORY:"bg-purple-700 text-purple-100",
  HIPAA_PHI:            "bg-pink-700 text-pink-100",
  PCI_DSS_RESTRICTED:   "bg-yellow-700 text-yellow-100",
  SEBI_REGULATED:       "bg-teal-700 text-teal-100",
  COMPLIANCE_REVIEW:    "bg-gray-600 text-gray-100",
  PII_DETECTED:         "bg-indigo-700 text-indigo-100",
  GOVERNANCE_APPROVED:  "bg-green-700 text-green-100",
};

function Tag({ name }) {
  const cls = TAG_COLOR[name] || "bg-gray-700 text-gray-100";
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>
      {name}
    </span>
  );
}

function RiskBadge({ level }) {
  const c = RISK_COLOR[level] || RISK_COLOR.NONE;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${c.border} ${c.text} ${c.bg}`}>
      {level}
    </span>
  );
}

function StatusDot({ level }) {
  const c = RISK_COLOR[level] || RISK_COLOR.NONE;
  return <span className={`inline-block w-2 h-2 rounded-full ${c.dot}`} />;
}

// ── OM Health Banner ─────────────────────────────────────────────
function HealthBanner({ health }) {
  if (!health) return null;
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm mb-4 ${
      health.openmetadata_reachable
        ? "bg-green-900/30 border border-green-700 text-green-300"
        : "bg-yellow-900/30 border border-yellow-700 text-yellow-300"
    }`}>
      <StatusDot level={health.openmetadata_reachable ? "NONE" : "MEDIUM"} />
      <span>
        {health.demo_mode
          ? <><strong>Demo Mode</strong>{" · 6 fintech tables (Aadhaar · PAN · GDPR · HIPAA)"}</>
          : <>OpenMetadata: <strong>Connected</strong>{" · "}{health.om_host}</>
        }
      </span>
      <span className="ml-auto text-xs opacity-60">Chakravyuha Engine: {health.chakravyuha_engine}</span>
    </div>
  );
}

// ── Compliance Summary Cards ─────────────────────────────────────
function SummaryCards({ report }) {
  if (!report) return null;
  const s = report.executive_summary;
  const cards = [
    { label: "Tables Scanned",    value: s.total_tables_scanned,  color: "text-blue-400"  },
    { label: "PII Tables",        value: s.tables_with_pii,       color: "text-orange-400"},
    { label: "Critical Tables",   value: s.critical_risk_tables,  color: "text-red-400"   },
    { label: "PII Columns Total", value: s.total_pii_columns,     color: "text-yellow-400"},
    { label: "Compliance Score",  value: `${s.compliance_score_pct}%`, color: s.compliance_score_pct > 80 ? "text-green-400" : "text-red-400"},
    { label: "Overall Status",    value: s.overall_status,        color: s.overall_status === "MONITORED" ? "text-green-400" : "text-red-400"},
  ];
  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {cards.map((c) => (
        <div key={c.label} className="bg-gray-800/60 border border-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-1">{c.label}</p>
          <p className={`text-xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Table Row ────────────────────────────────────────────────────
function TableRow({ table, onSelect, selected }) {
  const c = RISK_COLOR[table.risk_level] || RISK_COLOR.NONE;
  return (
    <tr
      onClick={() => onSelect(table)}
      className={`cursor-pointer border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
        selected?.table === table.table ? "bg-gray-700/40" : ""
      }`}
    >
      <td className="px-3 py-2 font-mono text-sm text-gray-200">{table.table}</td>
      <td className="px-3 py-2 text-center">
        <RiskBadge level={table.risk_level} />
      </td>
      <td className="px-3 py-2 text-center text-sm text-gray-300">{table.pii_columns}</td>
      <td className="px-3 py-2 text-center text-sm text-red-400 font-bold">{table.critical_columns}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {(table.regulations || []).map((r) => (
            <span key={r} className="text-xs text-gray-400 bg-gray-700/50 px-1.5 rounded">{r.split(" ")[0]}</span>
          ))}
        </div>
      </td>
    </tr>
  );
}

// ── Column Detail Panel ──────────────────────────────────────────
function ColumnDetail({ table }) {
  if (!table) return (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      Select a table to inspect columns
    </div>
  );

  const piCols = (table.column_detail || table.pii_columns_detail || []);

  return (
    <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
      <div className="flex items-center gap-3 mb-1">
        <span className="font-mono text-blue-300 text-sm font-semibold">{table.table}</span>
        <RiskBadge level={table.risk_level} />
        {table.requires_dpo_review && (
          <span className="text-xs bg-red-800/50 text-red-300 border border-red-700 px-2 py-0.5 rounded">
            DPO Review Required
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400">{table.summary || table.governance_summary}</p>

      {piCols.length === 0 ? (
        <p className="text-green-400 text-sm">No PII columns — table is clean.</p>
      ) : (
        piCols.map((col) => (
          <div
            key={col.column}
            className={`border rounded-lg p-3 ${RISK_COLOR[col.tag === "DPDP_CRITICAL" ? "CRITICAL" : col.tag === "DPDP_SENSITIVE" ? "HIGH" : "MEDIUM"].border} bg-gray-800/40`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-white text-sm font-bold">{col.column}</span>
              {col.tag && <Tag name={col.tag} />}
            </div>
            {col.regulation && (
              <div className="flex flex-wrap gap-2 text-xs">
                {(Array.isArray(col.regulation) ? col.regulation : [col.regulation]).map((r) => (
                  <span key={r} className="text-gray-400">📋 {r}</span>
                ))}
              </div>
            )}
            {col.penalty && (
              <p className="text-xs text-red-400 mt-1">⚠ Max penalty: {col.penalty}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── Penalty Exposure Section ─────────────────────────────────────
function PenaltyExposure({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Penalty Exposure</h3>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.regulation} className={`flex items-start gap-3 p-3 rounded-lg border ${
            p.status?.includes("EXPOSED") ? "border-red-700 bg-red-900/20" : "border-green-700 bg-green-900/10"
          }`}>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-200">{p.regulation}</p>
              <p className="text-xs text-gray-400 mt-0.5">Max: {p.max_penalty_per_violation}</p>
            </div>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
              p.status?.includes("EXPOSED") ? "bg-red-700 text-red-100" : "bg-green-700 text-green-100"
            }`}>
              {p.status?.split(" — ")[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main CatalogPanel ────────────────────────────────────────────
export default function CatalogPanel() {
  const [health, setHealth] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [scanResultsMap, setScanResultsMap] = useState({});
  const [report, setReport] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [activeTab, setActiveTab] = useState("catalog");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchHealth();
    fetchCatalog();
  }, []);

  async function fetchHealth() {
    try {
      const r = await fetch(`${API}/api/om/health`);
      setHealth(await r.json());
    } catch {
      setHealth({ openmetadata_reachable: false, om_host: "unreachable", chakravyuha_engine: "ready" });
    }
  }

  async function fetchCatalog() {
    setError("");
    try {
      const r = await fetch(`${API}/api/om/catalog?limit=100`);
      const data = await r.json();
      if (!r.ok) {
        setError(`Catalog fetch failed (${r.status}): ${data.detail || r.statusText}`);
        return;
      }
      if (!Array.isArray(data.tables)) {
        setError(`Unexpected response: ${JSON.stringify(data).slice(0, 120)}`);
        return;
      }
      setCatalog(data.tables);
    } catch (e) {
      setError("Could not fetch catalog: " + e.message);
    }
  }

  async function initGovernance() {
    setInitializing(true);
    setScanStatus("Initialising Chakravyuha classification in OpenMetadata…");
    try {
      const r = await fetch(`${API}/api/om/init`, { method: "POST" });
      const data = await r.json();
      if (data.status === "already_initialized") {
        setScanStatus("✓ Chakravyuha classification tags already active in OpenMetadata.");
      } else {
        setScanStatus(`✓ Classification initialised. Tags: ${Object.keys(data.tags || {}).length} created.`);
      }
    } catch (e) {
      setScanStatus("Init failed: " + e.message);
    } finally {
      setInitializing(false);
    }
  }

  async function scanAll() {
    setScanning(true);
    setError("");
    setScanStatus("Scanning catalog for PII — Aadhaar, PAN, GDPR, HIPAA…");
    try {
      const r = await fetch(`${API}/api/om/scan/all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_name: "Demo Org", limit: 100 }),
      });
      const data = await r.json();
      // Build a map of fqn → scan result for the catalog view
      const map = {};
      for (const s of (data.scan_summaries || [])) {
        map[s.table] = s;
      }
      setScanResultsMap(map);
      setScanStatus(
        `✓ Scan complete: ${data.tables_scanned} tables scanned, ` +
        `${data.tables_with_pii} with PII, ${data.critical_risk_tables} critical.`
      );
      await fetchCatalog();
    } catch (e) {
      setError("Scan failed: " + e.message);
      setScanStatus("");
    } finally {
      setScanning(false);
    }
  }

  async function fetchReport() {
    setScanStatus("Generating compliance report…");
    try {
      const r = await fetch(`${API}/api/om/compliance?org_name=Demo+Organization`);
      const data = await r.json();
      setReport(data);
      setScanStatus("✓ Compliance report generated.");
      setActiveTab("report");
    } catch (e) {
      setError("Report failed: " + e.message);
    }
  }

  async function scanSingleTable(fqn) {
    setScanStatus(`Scanning table '${fqn.split(".").pop()}'…`);
    try {
      const r = await fetch(`${API}/api/om/scan/table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_fqn: fqn }),
      });
      const data = await r.json();
      if (!r.ok) {
        setScanStatus(`Scan error: ${data.detail || r.statusText}`);
        return;
      }
      setSelectedTable({
        table: data.table_name,
        risk_level: data.risk_level,
        pii_columns: data.pii_columns,
        critical_columns: data.critical_columns,
        requires_dpo_review: data.requires_dpo_review,
        summary: data.governance_summary,
        regulations: data.regulations_triggered,
        column_detail: (data.column_results || [])
          .filter((c) => c.pii_found)
          .map((c) => ({
            column: c.column,
            tag: c.highest_severity_tag,
            regulation: c.regulations,
            penalty: c.max_penalty,
          })),
      });
      setScanStatus(`✓ '${data.table_name}' scanned: ${data.pii_columns} PII columns, risk: ${data.risk_level}`);
    } catch (e) {
      setScanStatus("Scan failed: " + e.message);
    }
  }

  return (
    <div className="h-full flex flex-col gap-4 text-gray-100">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">
            Governance Catalog
            <span className="ml-2 text-xs font-normal text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded border border-blue-700">
              OpenMetadata
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            AI-powered PII detection · DPDP 2023 · GDPR · HIPAA · Chakravyuha v3
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={initGovernance}
            disabled={initializing}
            className="px-3 py-1.5 text-xs bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 rounded transition-colors"
          >
            {initializing ? "Initialising…" : "Init Tags"}
          </button>
          <button
            onClick={scanAll}
            disabled={scanning}
            className="px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 rounded transition-colors font-semibold"
          >
            {scanning ? "Scanning…" : "Scan Catalog"}
          </button>
          <button
            onClick={fetchReport}
            className="px-3 py-1.5 text-xs bg-purple-700 hover:bg-purple-600 rounded transition-colors"
          >
            Compliance Report
          </button>
          <button
            onClick={fetchCatalog}
            className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Health Banner */}
      <HealthBanner health={health} />

      {/* Status bar */}
      {scanStatus && (
        <div className="text-xs text-emerald-300 bg-emerald-900/20 border border-emerald-700 px-3 py-1.5 rounded">
          {scanStatus}
        </div>
      )}
      {error && (
        <div className="text-xs text-red-300 bg-red-900/20 border border-red-700 px-3 py-1.5 rounded">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700 pb-0">
        {["catalog", "report"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm capitalize rounded-t transition-colors ${
              activeTab === tab
                ? "bg-gray-700 text-white font-semibold border-b-2 border-blue-500"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab === "catalog" ? "Data Catalog" : "Compliance Report"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "catalog" && (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* Table list */}
          <div className="flex-1 overflow-auto">
            {catalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-2">
                <p>No catalog data loaded.</p>
                <button onClick={fetchCatalog} className="text-blue-400 hover:underline text-xs">
                  Load catalog →
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-600 text-gray-400 text-xs uppercase">
                    <th className="text-left px-3 py-2">Table</th>
                    <th className="px-3 py-2">Risk</th>
                    <th className="px-3 py-2">PII Cols</th>
                    <th className="px-3 py-2">Critical</th>
                    <th className="text-left px-3 py-2">Regulations</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((t) => {
                    const sr = scanResultsMap[t.fqn] || {};
                    return (
                      <TableRow
                        key={t.fqn || t.name}
                        table={{
                          table: t.name,
                          table_fqn: t.fqn,
                          risk_level: sr.risk_level || "NONE",
                          pii_columns: sr.pii_columns ?? 0,
                          critical_columns: sr.critical_columns ?? 0,
                          regulations: sr.regulations || [],
                        }}
                        onSelect={() => scanSingleTable(t.fqn)}
                        selected={selectedTable}
                      />
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Column detail */}
          <div className="w-80 bg-gray-800/40 border border-gray-700 rounded-lg p-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-3">Column Analysis</h3>
            <ColumnDetail table={selectedTable} />
          </div>
        </div>
      )}

      {activeTab === "report" && report && (
        <div className="overflow-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">
                Report ID: <span className="font-mono text-gray-300">{report.report_id}</span>
                {" · "}{new Date(report.generated_at).toLocaleString()}
              </p>
              <p className="text-xs text-blue-400 mt-0.5">{report.engine_accuracy}</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded border ${
              report.executive_summary.overall_status === "CRITICAL"
                ? "bg-red-900/40 border-red-500 text-red-400"
                : report.executive_summary.overall_status === "AT_RISK"
                ? "bg-orange-900/40 border-orange-500 text-orange-400"
                : "bg-green-900/40 border-green-500 text-green-400"
            }`}>
              {report.executive_summary.overall_status}
            </span>
          </div>

          <SummaryCards report={report} />
          <PenaltyExposure items={report.penalty_exposure} />

          {/* Recommendations */}
          {report.recommendations?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Recommendations</h3>
              <div className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-xs ${
                    r.priority.startsWith("P0") ? "border-red-700 bg-red-900/20"
                    : r.priority.startsWith("P1") ? "border-orange-700 bg-orange-900/20"
                    : "border-gray-700 bg-gray-800/30"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-200">{r.priority}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-400">{r.regulation}</span>
                      <span className="ml-auto text-gray-500">{r.deadline}</span>
                    </div>
                    <p className="text-gray-300">{r.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "report" && !report && (
        <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-2">
          <p>No report generated yet.</p>
          <button onClick={fetchReport} className="text-purple-400 hover:underline text-xs">
            Generate compliance report →
          </button>
        </div>
      )}
    </div>
  );
}
