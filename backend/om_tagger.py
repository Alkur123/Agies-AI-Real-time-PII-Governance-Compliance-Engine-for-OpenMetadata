"""
Compliance Tagger — writes Chakravyuha governance findings back into OpenMetadata
as classification tags under the "Chakravyuha_Governance" classification.
Creates all required tags on first run (idempotent).
"""
import logging
from engine.om_client import OpenMetadataClient, CHAKRAVYUHA_CLASSIFICATION

logger = logging.getLogger(__name__)

# All governance tags created in OpenMetadata under Chakravyuha_Governance
GOVERNANCE_TAGS = {
    "DPDP_CRITICAL": (
        "DPDP 2023 — Aadhaar/biometric data. Highest protection class. "
        "Unauthorised processing: penalty up to ₹250 Crore per violation."
    ),
    "DPDP_SENSITIVE": (
        "DPDP 2023 — Sensitive personal data (PAN, phone, address, financial). "
        "Penalty up to ₹200 Crore per violation."
    ),
    "GDPR_PERSONAL": (
        "GDPR Article 4(1) — Personal data of EU/UK data subjects. "
        "Penalty up to €20M or 4% of global annual revenue."
    ),
    "GDPR_SPECIAL_CATEGORY": (
        "GDPR Article 9 — Special category data (health, biometric, political). "
        "Strictest GDPR protection — processing requires explicit consent."
    ),
    "HIPAA_PHI": (
        "HIPAA — Protected Health Information. US federal compliance mandatory. "
        "Penalty up to $1.9M per category per year."
    ),
    "PCI_DSS_RESTRICTED": (
        "PCI DSS v4.0 — Payment card data (PANs, CVVs, expiry dates). "
        "Restricted access mandatory. Penalty $5,000–$100,000/month."
    ),
    "SEBI_REGULATED": (
        "SEBI Regulations — Financial market / investment data. "
        "Insider trading risk. Mandatory audit trail required."
    ),
    "COMPLIANCE_REVIEW": (
        "Chakravyuha flagged for manual review. "
        "Consult Data Protection Officer before granting access."
    ),
    "PII_DETECTED": (
        "Personal data detected. Verify compliance with DPDP 2023, GDPR, "
        "and applicable jurisdiction regulations before processing."
    ),
    "GOVERNANCE_APPROVED": (
        "Reviewed and approved by Chakravyuha governance pipeline. "
        "Access permitted under documented legal basis."
    ),
}


class ComplianceTagger:
    def __init__(self, client: OpenMetadataClient = None):
        self.client = client or OpenMetadataClient()
        self._initialized = False

    def initialize(self) -> dict:
        """
        Create Chakravyuha_Governance classification and all tags in OpenMetadata.
        Idempotent — safe to call multiple times.
        """
        if self._initialized:
            return {"status": "already_initialized"}

        logger.info("Initialising Chakravyuha governance classification in OpenMetadata…")
        self.client.create_classification(
            CHAKRAVYUHA_CLASSIFICATION,
            (
                "AI Governance tags auto-applied by Chakravyuha v3 — "
                "covering DPDP 2023, GDPR, HIPAA, PCI DSS, SEBI regulations. "
                "Accuracy: 99.30% (1,001-sample adversarial benchmark)."
            ),
        )

        results = {}
        for tag_name, description in GOVERNANCE_TAGS.items():
            result = self.client.create_tag(CHAKRAVYUHA_CLASSIFICATION, tag_name, description)
            results[tag_name] = "exists" if result.get("existing") else "created"
            logger.info(f"  Tag {tag_name}: {results[tag_name]}")

        self._initialized = True
        logger.info("Chakravyuha classification initialised.")
        return {"status": "initialized", "tags": results}

    # ── Apply tags ───────────────────────────────────────────────

    def _build_om_tags(self, tag_names: list) -> list:
        return [
            {
                "tagFQN": f"{CHAKRAVYUHA_CLASSIFICATION}.{t}",
                "source": "Classification",
                "labelType": "Automated",
            }
            for t in tag_names
            if t in GOVERNANCE_TAGS
        ]

    def tag_column(self, table_id: str, column_name: str, col_scan: dict) -> dict:
        """Write compliance tags to a column in OpenMetadata."""
        if not col_scan.get("pii_found"):
            return {"tagged": False, "reason": "No PII detected in column"}

        om_tags = self._build_om_tags(col_scan.get("all_tags", []))
        if not om_tags:
            return {"tagged": False, "reason": "No matching governance tags"}

        self.client.add_column_tags(table_id, column_name, om_tags)
        logger.info(f"  Column '{column_name}' → {[t['tagFQN'] for t in om_tags]}")
        return {
            "tagged": True,
            "column": column_name,
            "tags_applied": [t["tagFQN"] for t in om_tags],
        }

    def tag_table(self, table_id: str, scan_result: dict) -> dict:
        """Add risk-level summary tag to the table itself."""
        risk_map = {
            "CRITICAL": "DPDP_CRITICAL",
            "HIGH":     "DPDP_SENSITIVE",
            "MEDIUM":   "COMPLIANCE_REVIEW",
        }
        tag_name = risk_map.get(scan_result.get("risk_level", "NONE"))
        if not tag_name:
            return {"tagged": False}

        om_tags = self._build_om_tags([tag_name])
        self.client.add_table_tags(table_id, om_tags)
        return {"tagged": True, "risk_level": scan_result["risk_level"], "tag": tag_name}

    def apply_scan_results(self, scan_result: dict) -> dict:
        """Full tag application from a MetadataScanner.scan_table() result."""
        self.initialize()
        table_id = scan_result["table_id"]
        tagged_columns = []
        clean_columns = []

        for col_result in scan_result.get("column_results", []):
            col_name = col_result["column"]
            if col_result["pii_found"]:
                tag_result = self.tag_column(table_id, col_name, col_result)
                tagged_columns.append({
                    "column": col_name,
                    "tags": tag_result.get("tags_applied", []),
                    "highest": col_result["highest_severity_tag"],
                })
            else:
                clean_columns.append(col_name)

        table_tag = self.tag_table(table_id, scan_result)

        return {
            "table": scan_result["table_name"],
            "table_id": table_id,
            "risk_level": scan_result["risk_level"],
            "columns_tagged": len(tagged_columns),
            "columns_clean": len(clean_columns),
            "tagged_columns": tagged_columns,
            "table_risk_tag": table_tag.get("tag"),
            "regulations": scan_result.get("regulations_triggered", []),
        }
