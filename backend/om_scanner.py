"""
Metadata Scanner — runs Chakravyuha's governance engine over OpenMetadata catalog assets.
Uses existing redactor + FAISS semantic engine to detect PII at column level.
Covers: Aadhaar, PAN, IFSC (India-specific) + GDPR, HIPAA, PCI DSS globally.
"""
import logging
from engine.redactor import redact_pii
from engine.semantic_engine import get_engine

logger = logging.getLogger(__name__)

# Regulation metadata per detected PII type
REGULATION_MAP = {
    "AADHAAR": {
        "tag": "DPDP_CRITICAL",
        "regulation": "DPDP 2023 Section 4",
        "penalty": "Up to ₹250 Crore per violation",
        "jurisdiction": "India",
        "description": "Aadhaar UID — highest protection class under DPDP 2023",
    },
    "PAN": {
        "tag": "DPDP_SENSITIVE",
        "regulation": "DPDP 2023 Section 4",
        "penalty": "Up to ₹200 Crore per violation",
        "jurisdiction": "India",
        "description": "PAN card — financial identifier, DPDP regulated",
    },
    "PHONE": {
        "tag": "DPDP_SENSITIVE",
        "regulation": "DPDP 2023 Section 6",
        "penalty": "Up to ₹50 Crore per violation",
        "jurisdiction": "India",
        "description": "Phone number — personal contact data under DPDP 2023",
    },
    "EMAIL": {
        "tag": "GDPR_PERSONAL",
        "regulation": "GDPR Article 4(1)",
        "penalty": "Up to €20M or 4% global revenue",
        "jurisdiction": "EU/Global",
        "description": "Email address — personal data identifier under GDPR",
    },
    "CREDIT_CARD": {
        "tag": "PCI_DSS_RESTRICTED",
        "regulation": "PCI DSS v4.0",
        "penalty": "$5,000–$100,000/month",
        "jurisdiction": "Global",
        "description": "Payment card number — PCI DSS restricted data",
    },
    "IFSC": {
        "tag": "DPDP_SENSITIVE",
        "regulation": "DPDP 2023 / RBI Guidelines",
        "penalty": "Up to ₹50 Crore per violation",
        "jurisdiction": "India",
        "description": "IFSC code — bank routing identifier, India-specific",
    },
}

# Column-name keyword patterns → PII type (India-first signals)
COLUMN_NAME_SIGNALS = {
    "AADHAAR":          ["aadhaar", "aadhar", "uid_number", "uidai", "aadhaar_no",
                         "uid_no", "aadhaar_id", "aadhaar_number", "adhaar"],
    "PAN":              ["pan_number", "pan_card", "pan_no", "permanent_account",
                         "income_tax_id", "pan_id"],
    "PHONE":            ["phone", "mobile", "contact_number", "cell_number",
                         "phone_no", "mobile_no", "contact_no", "ph_no"],
    "EMAIL":            ["email", "email_address", "mail", "e_mail",
                         "user_email", "contact_email", "email_id"],
    "CREDIT_CARD":      ["card_number", "credit_card", "debit_card", "card_no",
                         "cc_number", "cvv", "card_expiry", "card_cvv"],
    "IFSC":             ["ifsc", "ifsc_code", "bank_ifsc", "routing_code"],
    "BIOMETRIC":        ["fingerprint", "biometric", "iris_scan", "face_id",
                         "retina", "face_hash", "biometric_hash", "thumbprint"],
    "ADDRESS":          ["address", "home_address", "residential_address",
                         "street_address", "pincode", "zip_code", "locality"],
    "DOB":              ["date_of_birth", "dob", "birth_date", "birthdate",
                         "birth_year", "age"],
    "PASSPORT":         ["passport_number", "passport_no", "passport_id"],
    "VOTER_ID":         ["voter_id", "voter_card", "epic_number", "voter_no"],
    "DRIVING_LICENCE":  ["driving_licence", "driving_license", "dl_number",
                         "license_number", "dl_no"],
    "NAME":             ["full_name", "first_name", "last_name", "customer_name",
                         "user_name", "patient_name", "employee_name", "name"],
    "SALARY":           ["salary", "income", "annual_income", "ctc",
                         "compensation", "pay", "wages"],
    "HEALTH":           ["diagnosis", "disease", "medical_condition",
                         "prescription", "health_status", "patient_id",
                         "icd_code", "treatment", "medication"],
    "BANK_ACCOUNT":     ["account_number", "bank_account", "account_no",
                         "savings_account", "current_account"],
}

# PII type → highest applicable governance tag
COLUMN_TAG_MAP = {
    "AADHAAR":          "DPDP_CRITICAL",
    "PAN":              "DPDP_SENSITIVE",
    "PHONE":            "DPDP_SENSITIVE",
    "EMAIL":            "GDPR_PERSONAL",
    "CREDIT_CARD":      "PCI_DSS_RESTRICTED",
    "IFSC":             "DPDP_SENSITIVE",
    "BIOMETRIC":        "DPDP_CRITICAL",
    "ADDRESS":          "DPDP_SENSITIVE",
    "DOB":              "DPDP_SENSITIVE",
    "PASSPORT":         "DPDP_SENSITIVE",
    "VOTER_ID":         "DPDP_SENSITIVE",
    "DRIVING_LICENCE":  "DPDP_SENSITIVE",
    "NAME":             "GDPR_PERSONAL",
    "SALARY":           "GDPR_SPECIAL_CATEGORY",
    "HEALTH":           "HIPAA_PHI",
    "BANK_ACCOUNT":     "DPDP_SENSITIVE",
}

# Tag severity ordering (highest first)
TAG_PRIORITY = [
    "DPDP_CRITICAL",
    "HIPAA_PHI",
    "PCI_DSS_RESTRICTED",
    "GDPR_SPECIAL_CATEGORY",
    "DPDP_SENSITIVE",
    "GDPR_PERSONAL",
    "SEBI_REGULATED",
    "COMPLIANCE_REVIEW",
    "PII_DETECTED",
]


class MetadataScanner:
    def __init__(self):
        self._engine = None

    @property
    def engine(self):
        if self._engine is None:
            self._engine = get_engine()
        return self._engine

    # ── Column-level scan ────────────────────────────────────────

    def scan_column(
        self,
        col_name: str,
        col_description: str = "",
        col_data_type: str = "",
    ) -> dict:
        """
        Scan a single column through three detection layers:
          Layer 1 — column name keyword matching (India-specific signals)
          Layer 2 — PII redactor on description text
          Layer 3 — FAISS semantic engine on full context string
        Returns full finding dict with tags, regulations, penalty exposure.
        """
        findings = []
        seen_types = set()
        col_lower = col_name.lower().replace(" ", "_").replace("-", "_")

        # ── Layer 1: Column name pattern matching ──
        for pii_type, patterns in COLUMN_NAME_SIGNALS.items():
            if any(p in col_lower for p in patterns) and pii_type not in seen_types:
                seen_types.add(pii_type)
                tag = COLUMN_TAG_MAP.get(pii_type, "COMPLIANCE_REVIEW")
                reg_info = REGULATION_MAP.get(pii_type, {
                    "tag": tag,
                    "regulation": "DPDP 2023 / GDPR",
                    "penalty": "Variable",
                    "jurisdiction": "India/Global",
                    "description": f"{pii_type} identifier detected",
                })
                findings.append({
                    "pii_type": pii_type,
                    "detection_method": "column_name_pattern",
                    "confidence": 0.92,
                    "tag": reg_info["tag"],
                    "regulation": reg_info["regulation"],
                    "penalty": reg_info["penalty"],
                    "jurisdiction": reg_info.get("jurisdiction", "India/Global"),
                    "explanation": f"Column name '{col_name}' matches known {pii_type} identifier pattern",
                })

        # ── Layer 2: Redactor on description text ──
        if col_description:
            _, redactions = redact_pii(col_description)
            for r in redactions:
                pii_type = r.get("type", "UNKNOWN")
                if pii_type not in seen_types:
                    seen_types.add(pii_type)
                    reg_info = REGULATION_MAP.get(pii_type, {
                        "tag": "PII_DETECTED",
                        "regulation": "DPDP 2023",
                        "penalty": "Variable",
                        "jurisdiction": "India",
                        "description": "PII found in column description",
                    })
                    findings.append({
                        "pii_type": pii_type,
                        "detection_method": "description_redactor",
                        "confidence": 0.97,
                        "tag": reg_info["tag"],
                        "regulation": reg_info["regulation"],
                        "penalty": reg_info["penalty"],
                        "jurisdiction": reg_info.get("jurisdiction", "India"),
                        "explanation": f"PII pattern detected in column description via regex redactor",
                    })

        # ── Layer 3: Semantic FAISS engine on context ──
        context = f"column {col_name} {col_description} {col_data_type}".strip()
        sem = self.engine.classify(context, k=5)
        if sem["category"] == "PII" and sem["confidence"] > 0.45 and "PII_SEMANTIC" not in seen_types:
            seen_types.add("PII_SEMANTIC")
            findings.append({
                "pii_type": "PII_SEMANTIC",
                "detection_method": "semantic_engine_faiss",
                "confidence": round(sem["confidence"], 4),
                "tag": "COMPLIANCE_REVIEW",
                "regulation": "DPDP 2023 / GDPR",
                "penalty": "Variable",
                "jurisdiction": "India/Global",
                "explanation": (
                    f"Semantic engine (FAISS) classified column context as PII "
                    f"with {sem['confidence']:.1%} confidence"
                ),
            })

        # Sort highest confidence first
        findings.sort(key=lambda x: -x["confidence"])

        # Determine highest severity tag
        all_tags = list({f["tag"] for f in findings})
        highest_tag = None
        for tp in TAG_PRIORITY:
            if tp in all_tags:
                highest_tag = tp
                break

        return {
            "column": col_name,
            "data_type": col_data_type,
            "pii_found": len(findings) > 0,
            "findings": findings,
            "highest_severity_tag": highest_tag,
            "all_tags": all_tags,
            "regulations": list({f["regulation"] for f in findings}),
            "jurisdictions": list({f["jurisdiction"] for f in findings}),
            "max_penalty": findings[0]["penalty"] if findings else None,
            "confidence": findings[0]["confidence"] if findings else 0.0,
        }

    # ── Table-level scan ─────────────────────────────────────────

    def scan_table(self, table: dict) -> dict:
        """
        Scan all columns of an OpenMetadata table object.
        Returns full compliance report with risk level, per-column findings,
        aggregated regulations, and governance summary.
        """
        table_name = table.get("name", "unknown")
        table_fqn = table.get("fullyQualifiedName", table_name)
        columns = table.get("columns", [])

        column_results = []
        pii_column_count = 0
        critical_count = 0
        all_regulations: set = set()
        all_jurisdictions: set = set()
        penalty_exposure: set = set()

        for col in columns:
            col_name = col.get("name", "")
            col_desc = col.get("description", "") or ""
            col_type = col.get("dataType", "") or ""

            result = self.scan_column(col_name, col_desc, col_type)
            column_results.append(result)

            if result["pii_found"]:
                pii_column_count += 1
                all_regulations.update(result["regulations"])
                all_jurisdictions.update(result["jurisdictions"])
                for f in result["findings"]:
                    penalty_exposure.add(f["penalty"])
                if result["highest_severity_tag"] in ("DPDP_CRITICAL", "HIPAA_PHI"):
                    critical_count += 1

        # Overall table risk level
        if critical_count > 0:
            risk_level = "CRITICAL"
        elif pii_column_count > 3:
            risk_level = "HIGH"
        elif pii_column_count > 0:
            risk_level = "MEDIUM"
        else:
            risk_level = "NONE"

        return {
            "table_id": table.get("id", ""),
            "table_name": table_name,
            "table_fqn": table_fqn,
            "total_columns": len(columns),
            "pii_columns": pii_column_count,
            "critical_columns": critical_count,
            "risk_level": risk_level,
            "column_results": column_results,
            "regulations_triggered": list(all_regulations),
            "jurisdictions": list(all_jurisdictions),
            "max_penalty_exposure": list(penalty_exposure),
            "requires_dpo_review": critical_count > 0,
            "governance_summary": self._build_summary(
                table_name, pii_column_count, critical_count, list(all_regulations)
            ),
        }

    def _build_summary(
        self, table: str, pii_cols: int, critical: int, regs: list
    ) -> str:
        if not pii_cols:
            return f"Table '{table}': No PII detected. No governance action required."
        parts = [f"Table '{table}': {pii_cols} PII column(s) detected."]
        if critical:
            parts.append(
                f"{critical} column(s) require DPDP-critical protection "
                f"(Aadhaar/biometric — penalty up to ₹250 Crore per violation)."
            )
        if regs:
            parts.append(f"Active regulations: {', '.join(regs)}.")
        return " ".join(parts)
