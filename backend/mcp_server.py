"""
MCP Server — exposes OpenMetadata through Chakravyuha's AI governance layer.
Natural language metadata queries are governed before reaching OM.
Covers: search_metadata, classify_table, get_pii_inventory,
        get_compliance_report, govern_query.

Run standalone: python -m engine.mcp_server
"""
import asyncio
import logging
import os

logger = logging.getLogger(__name__)

try:
    from fastmcp import FastMCP
    HAS_MCP = True
except ImportError:
    HAS_MCP = False
    logger.warning("fastmcp not installed. Run: pip install fastmcp")

from engine.om_client import OpenMetadataClient
from engine.om_scanner import MetadataScanner
from engine.om_tagger import ComplianceTagger
from engine.om_compliance import generate_compliance_report
from engine.pipeline import analyze_query


def _make_server():
    if not HAS_MCP:
        return None

    mcp = FastMCP(
        "Chakravyuha-OM Governance Server",
        description=(
            "AI governance layer for OpenMetadata. "
            "Governs metadata queries, auto-detects PII (Aadhaar, PAN, GDPR, HIPAA), "
            "and enforces DPDP 2023 / GDPR / HIPAA compliance. "
            "Powered by Chakravyuha v3 — 99.30% accuracy."
        ),
    )

    _client = OpenMetadataClient()
    _scanner = MetadataScanner()
    _tagger = ComplianceTagger(_client)

    # ── Tool 1: Governed metadata search ────────────────────────

    @mcp.tool()
    async def search_metadata(query: str) -> dict:
        """
        Search OpenMetadata catalog with AI governance.
        Harmful, data-exfiltration, or PII-seeking queries are blocked
        before reaching the catalog. Safe queries return matching assets.
        """
        governance = await analyze_query(query, session_id="mcp_search")
        if governance["decision"] in ("BLOCK",):
            return {
                "governed": True,
                "decision": "BLOCKED",
                "reason": governance["explanation"],
                "regulation": governance.get("regulation", ""),
                "rule_id": governance.get("rule_id", ""),
                "category": governance.get("category", ""),
            }

        # Safe — forward to OpenMetadata
        try:
            tables = _client.list_tables(limit=50)
            q_lower = query.lower()
            matching = [
                t for t in tables
                if q_lower in t.get("name", "").lower()
                or q_lower in (t.get("description") or "").lower()
            ]
            return {
                "governed": True,
                "decision": "ALLOWED",
                "results": [
                    {
                        "name": t["name"],
                        "fqn": t.get("fullyQualifiedName", ""),
                        "description": t.get("description", ""),
                        "database": t.get("database", {}).get("name", ""),
                    }
                    for t in matching[:10]
                ],
                "total_found": len(matching),
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Tool 2: Classify a table ─────────────────────────────────

    @mcp.tool()
    async def classify_table(table_fqn: str) -> dict:
        """
        Scan a table in OpenMetadata for PII and return compliance classification.
        Detects: Aadhaar, PAN, IFSC (India-specific) + GDPR, HIPAA, PCI DSS globally.
        Powered by Chakravyuha's FAISS semantic engine (99.30% accuracy).
        """
        try:
            table = _client.get_table_by_fqn(table_fqn, fields="columns,tags")
            scan = _scanner.scan_table(table)
            return {
                "table": table_fqn,
                "risk_level": scan["risk_level"],
                "total_columns": scan["total_columns"],
                "pii_columns": scan["pii_columns"],
                "critical_columns": scan["critical_columns"],
                "regulations": scan["regulations_triggered"],
                "requires_dpo_review": scan["requires_dpo_review"],
                "summary": scan["governance_summary"],
                "column_detail": [
                    {
                        "column": c["column"],
                        "pii_found": c["pii_found"],
                        "tag": c.get("highest_severity_tag"),
                        "regulation": c.get("regulations", []),
                        "penalty": c.get("max_penalty"),
                    }
                    for c in scan["column_results"]
                    if c["pii_found"]
                ],
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Tool 3: PII inventory across full catalog ────────────────

    @mcp.tool()
    async def get_pii_inventory() -> dict:
        """
        List every table and column with detected PII across your OpenMetadata catalog.
        Covers DPDP (Aadhaar/PAN), GDPR (email/name), HIPAA (health), PCI DSS (cards).
        Use this to understand your full regulatory exposure.
        """
        try:
            tables = _client.list_tables(limit=100)
            inventory = []
            for t in tables:
                full_table = _client.get_table(t["id"], fields="columns,tags")
                scan = _scanner.scan_table(full_table)
                if scan["pii_columns"] > 0:
                    inventory.append({
                        "table": scan["table_fqn"],
                        "risk_level": scan["risk_level"],
                        "pii_columns": [
                            {
                                "column": c["column"],
                                "tag": c["highest_severity_tag"],
                                "regulations": c["regulations"],
                                "penalty": c["max_penalty"],
                            }
                            for c in scan["column_results"]
                            if c["pii_found"]
                        ],
                    })
            return {
                "total_tables_scanned": len(tables),
                "tables_with_pii": len(inventory),
                "inventory": inventory,
                "powered_by": "Chakravyuha v3 (99.30% accuracy, 0 false positives)",
            }
        except Exception as e:
            return {"error": str(e)}

    # ── Tool 4: Full compliance report ──────────────────────────

    @mcp.tool()
    async def get_compliance_report(org_name: str = "My Organization") -> dict:
        """
        Generate a board-ready DPDP/GDPR/HIPAA compliance report for the
        full OpenMetadata catalog. Shows penalty exposure, risk inventory,
        and prioritized remediation recommendations.
        """
        try:
            tables = _client.list_tables(limit=100)
            scan_results = []
            for t in tables:
                full_table = _client.get_table(t["id"], fields="columns,tags")
                scan_results.append(_scanner.scan_table(full_table))
            return generate_compliance_report(scan_results, org_name)
        except Exception as e:
            return {"error": str(e)}

    # ── Tool 5: Govern any query ──────────────────────────────────

    @mcp.tool()
    async def govern_query(query: str, session_id: str = "mcp_default") -> dict:
        """
        Run any text through Chakravyuha's full 11-ring governance pipeline.
        Returns ALLOW/BLOCK/SUPPORT with causal explanation and regulation citation.
        Use this to check if a data access request or SQL query should be permitted.
        """
        result = await analyze_query(query, session_id=session_id)
        return {
            "decision": result["decision"],
            "category": result["category"],
            "confidence": result["confidence"],
            "risk_score": result["risk_score"],
            "explanation": result["explanation"],
            "regulation": result.get("regulation", ""),
            "rule_id": result.get("rule_id", ""),
            "trace_id": result.get("trace_id", ""),
        }

    # ── Tool 6: Apply governance tags to catalog ─────────────────

    @mcp.tool()
    async def apply_governance_tags(table_fqn: str) -> dict:
        """
        Scan a table and write governance tags back into OpenMetadata.
        Tags: DPDP_CRITICAL, DPDP_SENSITIVE, GDPR_PERSONAL, HIPAA_PHI, etc.
        """
        try:
            _tagger.initialize()
            table = _client.get_table_by_fqn(table_fqn, fields="columns,tags")
            scan = _scanner.scan_table(table)
            tag_result = _tagger.apply_scan_results(scan)
            return {
                "table": table_fqn,
                "risk_level": scan["risk_level"],
                "columns_tagged": tag_result["columns_tagged"],
                "columns_clean": tag_result["columns_clean"],
                "tagged_columns": tag_result["tagged_columns"],
                "regulations": tag_result["regulations"],
            }
        except Exception as e:
            return {"error": str(e)}

    return mcp


# ── Entry point ──────────────────────────────────────────────────

_server = _make_server()


def run_mcp_server():
    if not _server:
        print("fastmcp not installed. Run: pip install fastmcp")
        return
    _server.run()


if __name__ == "__main__":
    run_mcp_server()
