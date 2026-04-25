"""
Chakravyuha-OpenMetadata Server
Original Aegis AI governance API + OpenMetadata integration endpoints.
New endpoints are under /api/om/* — all existing endpoints unchanged.
"""
from fastapi import FastAPI, APIRouter, Body, Request, Security, HTTPException, BackgroundTasks
from fastapi.security.api_key import APIKeyHeader
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import time
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME", "test")

if not mongo_url:
    raise ValueError("MONGO_URL not set in .env")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

app = FastAPI(
    title="Chakravyuha-OpenMetadata Governance Engine",
    description=(
        "AI governance + OpenMetadata integration. "
        "Auto-detects PII (Aadhaar, PAN, GDPR, HIPAA) across your data catalog "
        "and enforces DPDP 2023 / GDPR / HIPAA compliance policies."
    ),
    version="3.0.0",
)

# ── API Key Auth ─────────────────────────────────────────────────
_API_KEY = os.environ.get("API_KEY", "")
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(key: str = Security(_api_key_header)):
    if _API_KEY and key != _API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


@app.get("/")
async def render_root():
    return {"status": "Chakravyuha-OM Backend running", "version": "3.0.0"}


api_router = APIRouter(prefix="/api")

_rate_limit = os.environ.get("RATE_LIMIT", "60/minute")
limiter = Limiter(key_func=lambda request: request.client.host if request.client else "unknown")
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(status_code=429, content={"error": "Too many requests. Slow down."})


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

_pipeline_ready = False


def ensure_engine():
    global _pipeline_ready
    if not _pipeline_ready:
        from engine.semantic_engine import get_engine
        get_engine()
        _pipeline_ready = True


# ── Request Models ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"


class ResetRequest(BaseModel):
    session_id: Optional[str] = "default"


class ScanTableRequest(BaseModel):
    table_fqn: str


class ScanAllRequest(BaseModel):
    org_name: Optional[str] = "My Organization"
    limit: Optional[int] = 100


class WebhookRegisterRequest(BaseModel):
    callback_url: Optional[str] = None


# ── Existing Aegis API (unchanged) ───────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Chakravyuha-OM Governance API", "status": "operational"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "engine_ready": _pipeline_ready}


@api_router.post("/analyze")
@limiter.limit(_rate_limit)
async def analyze(request: Request, req: AnalyzeRequest, _auth=Security(require_api_key)):
    """Main governance endpoint — analyze a query through the full pipeline."""
    ensure_engine()
    from engine.pipeline import analyze_query

    result = await analyze_query(req.query, req.session_id)

    audit_doc = {
        "trace_id": result["trace_id"],
        "query": result["query"],
        "decision": result["decision"],
        "category": result["category"],
        "risk_score": result["risk_score"],
        "confidence": result["confidence"],
        "rule_id": result["rule_id"],
        "session_id": req.session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "api",
    }
    await db.audit_logs.insert_one(audit_doc)
    return result


@api_router.get("/stats")
async def get_stats():
    ensure_engine()
    from engine.semantic_engine import get_engine
    return get_engine().get_stats()


from engine.pipeline import metrics


@api_router.get("/metrics")
async def get_metrics():
    return metrics


@api_router.get("/session/{session_id}")
async def get_session_state(session_id: str):
    from engine.session import get_session
    return get_session(session_id)


@api_router.post("/reset-session")
async def reset_session(req: ResetRequest):
    from engine.session import clear_session
    clear_session(req.session_id)
    return {"status": "cleared", "session_id": req.session_id}


@api_router.get("/audit")
async def get_audit_logs():
    logs = (
        await db.audit_logs.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .limit(50)
        .to_list(None)
    )
    return {"logs": logs, "count": len(logs)}


@api_router.get("/heatmap")
async def get_heatmap():
    from engine.session import get_policy_heatmap
    return get_policy_heatmap()


@api_router.post("/override")
@limiter.limit(_rate_limit)
async def override_decision(
    request: Request, data: dict = Body(...), _auth=Security(require_api_key)
):
    query = data.get("query", "")
    if not query:
        return JSONResponse(status_code=400, content={"error": "query is required"})
    return JSONResponse(
        status_code=403,
        content={
            "status": "override_denied",
            "message": "Manual overrides require human-in-the-loop review.",
        },
    )


# ── Demo fallback tables (used when OM is unreachable) ───────────

_DEMO_TABLES_RAW = [
    {
        "name": "users",
        "description": "Customer master table for the neobank platform.",
        "columns": [
            {"name": "user_id",        "dataType": "VARCHAR",   "description": "Internal UUID"},
            {"name": "full_name",      "dataType": "VARCHAR",   "description": "Customer full name"},
            {"name": "aadhaar_number", "dataType": "VARCHAR",   "description": "12-digit Aadhaar UID"},
            {"name": "pan_card",       "dataType": "VARCHAR",   "description": "Permanent Account Number"},
            {"name": "phone",          "dataType": "VARCHAR",   "description": "Mobile number (+91)"},
            {"name": "email",          "dataType": "VARCHAR",   "description": "Email address"},
            {"name": "date_of_birth",  "dataType": "DATE",      "description": "Customer date of birth"},
            {"name": "address",        "dataType": "TEXT",      "description": "Residential address"},
            {"name": "created_at",     "dataType": "TIMESTAMP", "description": "Account creation time"},
            {"name": "kyc_verified",   "dataType": "BOOLEAN",   "description": "KYC status flag"},
        ],
    },
    {
        "name": "kyc_data",
        "description": "Know Your Customer verification records. Contains sensitive biometric hashes.",
        "columns": [
            {"name": "kyc_id",            "dataType": "VARCHAR",   "description": "KYC record ID"},
            {"name": "user_id",           "dataType": "VARCHAR",   "description": "References users.user_id"},
            {"name": "aadhaar_number",    "dataType": "VARCHAR",   "description": "Linked Aadhaar number"},
            {"name": "biometric_hash",    "dataType": "VARCHAR",   "description": "SHA-256 hash of fingerprint biometric"},
            {"name": "pan_card",          "dataType": "VARCHAR",   "description": "PAN for income verification"},
            {"name": "voter_id",          "dataType": "VARCHAR",   "description": "Voter card for address proof"},
            {"name": "verified_at",       "dataType": "TIMESTAMP", "description": "Verification timestamp"},
            {"name": "verification_mode", "dataType": "VARCHAR",   "description": "video_kyc | in_person | digital"},
        ],
    },
    {
        "name": "transactions",
        "description": "UPI and NEFT transaction ledger.",
        "columns": [
            {"name": "txn_id",           "dataType": "VARCHAR",   "description": "Transaction UUID"},
            {"name": "sender_user_id",   "dataType": "VARCHAR",   "description": "Sending user"},
            {"name": "receiver_user_id", "dataType": "VARCHAR",   "description": "Receiving user"},
            {"name": "amount",           "dataType": "DECIMAL",   "description": "Transaction amount in INR"},
            {"name": "ifsc",             "dataType": "VARCHAR",   "description": "Destination IFSC code"},
            {"name": "account_number",   "dataType": "VARCHAR",   "description": "Destination bank account"},
            {"name": "upi_id",           "dataType": "VARCHAR",   "description": "UPI Virtual Payment Address"},
            {"name": "status",           "dataType": "VARCHAR",   "description": "pending | success | failed"},
            {"name": "created_at",       "dataType": "TIMESTAMP", "description": "Transaction time"},
        ],
    },
    {
        "name": "loan_applications",
        "description": "Personal and business loan applications.",
        "columns": [
            {"name": "application_id", "dataType": "VARCHAR",   "description": "Loan application ID"},
            {"name": "user_id",        "dataType": "VARCHAR",   "description": "Applicant user ID"},
            {"name": "full_name",      "dataType": "VARCHAR",   "description": "Applicant name"},
            {"name": "email",          "dataType": "VARCHAR",   "description": "Contact email"},
            {"name": "phone",          "dataType": "VARCHAR",   "description": "Contact mobile"},
            {"name": "pan_card",       "dataType": "VARCHAR",   "description": "PAN for CIBIL check"},
            {"name": "salary",         "dataType": "DECIMAL",   "description": "Monthly gross salary"},
            {"name": "annual_income",  "dataType": "DECIMAL",   "description": "Annual income declared"},
            {"name": "loan_amount",    "dataType": "DECIMAL",   "description": "Requested loan amount"},
            {"name": "credit_card",    "dataType": "VARCHAR",   "description": "Credit card on file"},
            {"name": "submitted_at",   "dataType": "TIMESTAMP", "description": "Application submission time"},
            {"name": "status",         "dataType": "VARCHAR",   "description": "pending | approved | rejected"},
        ],
    },
    {
        "name": "support_tickets",
        "description": "Customer support interactions — intentionally minimal PII.",
        "columns": [
            {"name": "ticket_id",   "dataType": "VARCHAR",   "description": "Support ticket ID"},
            {"name": "user_id",     "dataType": "VARCHAR",   "description": "User reference"},
            {"name": "subject",     "dataType": "VARCHAR",   "description": "Ticket subject"},
            {"name": "status",      "dataType": "VARCHAR",   "description": "open | closed | escalated"},
            {"name": "created_at",  "dataType": "TIMESTAMP", "description": "Ticket creation time"},
            {"name": "resolved_at", "dataType": "TIMESTAMP", "description": "Resolution time"},
        ],
    },
    {
        "name": "product_catalog",
        "description": "Financial products offered by the platform. No PII.",
        "columns": [
            {"name": "product_id",    "dataType": "VARCHAR", "description": "Product ID"},
            {"name": "name",          "dataType": "VARCHAR", "description": "Product name"},
            {"name": "category",      "dataType": "VARCHAR", "description": "savings | loan | insurance"},
            {"name": "interest_rate", "dataType": "DECIMAL", "description": "Annual interest rate"},
            {"name": "min_amount",    "dataType": "DECIMAL", "description": "Minimum investment"},
            {"name": "active",        "dataType": "BOOLEAN", "description": "Is product live"},
        ],
    },
]

def _as_om_table(t: dict, idx: int) -> dict:
    """Convert seed-format table dict to a minimal OM API table object."""
    name = t["name"]
    return {
        "id": f"demo-{idx:04d}-{name}",
        "name": name,
        "fullyQualifiedName": f"fintech_demo_db.fintech_prod.public.{name}",
        "description": t["description"],
        "columns": t["columns"],
        "tags": [],
        "database": {"name": "fintech_prod"},
    }

_DEMO_OM_TABLES = [_as_om_table(t, i) for i, t in enumerate(_DEMO_TABLES_RAW)]


# ── OpenMetadata Integration API (/api/om/*) ─────────────────────

om_router = APIRouter(prefix="/om")

# Lazy singletons — instantiated on first OM call
_om_client = None
_om_scanner = None
_om_tagger = None


def _get_om_client():
    global _om_client
    if _om_client is None:
        from engine.om_client import OpenMetadataClient
        _om_client = OpenMetadataClient()
    return _om_client


def _get_scanner():
    global _om_scanner
    if _om_scanner is None:
        ensure_engine()
        from engine.om_scanner import MetadataScanner
        _om_scanner = MetadataScanner()
    return _om_scanner


def _get_tagger():
    global _om_tagger
    if _om_tagger is None:
        from engine.om_tagger import ComplianceTagger
        _om_tagger = ComplianceTagger(_get_om_client())
    return _om_tagger


@om_router.get("/health")
async def om_health():
    """Check OpenMetadata connectivity."""
    client = _get_om_client()
    ok = client.health_check()
    return {
        "openmetadata_reachable": ok,
        "om_host": os.environ.get("OM_HOST", "http://localhost:8585"),
        "chakravyuha_engine": "ready",
        "demo_mode": not ok,
    }


@om_router.post("/init")
async def om_init():
    """
    Create the Chakravyuha_Governance classification and all tags in OpenMetadata.
    Safe to call multiple times (idempotent).
    """
    tagger = _get_tagger()
    result = tagger.initialize()
    return result


@om_router.post("/scan/table")
async def scan_table(req: ScanTableRequest):
    """
    Scan a single table by fully-qualified name and return column-level
    PII classification with DPDP/GDPR/HIPAA regulation mapping.
    """
    ensure_engine()
    client = _get_om_client()
    scanner = _get_scanner()

    try:
        table = client.get_table_by_fqn(req.table_fqn, fields="columns,tags")
    except Exception:
        table = next(
            (t for t in _DEMO_OM_TABLES
             if t["fullyQualifiedName"] == req.table_fqn
             or t["name"] == req.table_fqn.split(".")[-1]),
            None,
        )
        if not table:
            raise HTTPException(status_code=404, detail=f"Table '{req.table_fqn}' not found")

    scan_result = scanner.scan_table(table)

    # Store scan in MongoDB
    await db.om_scans.insert_one({
        **scan_result,
        "scan_type": "single_table",
        "scanned_at": datetime.now(timezone.utc).isoformat(),
        "column_results": scan_result["column_results"],  # full detail
    })

    return scan_result


@om_router.post("/scan/all")
async def scan_all_tables(req: ScanAllRequest, background_tasks: BackgroundTasks):
    """
    Scan all tables in the OpenMetadata catalog and write governance tags back.
    Runs the full PII detection pipeline (Aadhaar, PAN, GDPR, HIPAA, PCI DSS).
    Returns summary immediately; full tagging runs in background.
    """
    ensure_engine()
    client = _get_om_client()
    scanner = _get_scanner()

    try:
        tables = client.list_tables(limit=req.limit)
        full_tables = []
        for t in tables:
            try:
                full_tables.append(client.get_table(t["id"], fields="columns,tags"))
            except Exception as e:
                logger.warning(f"Failed to fetch table {t.get('name', '?')}: {e}")
    except Exception:
        logger.info("OM unreachable — using demo tables for scan")
        full_tables = _DEMO_OM_TABLES

    scan_results = []
    for full_table in full_tables:
        try:
            scan_result = scanner.scan_table(full_table)
            scan_results.append(scan_result)
        except Exception as e:
            logger.warning(f"Failed to scan table {full_table.get('name', '?')}: {e}")

    # Background: write tags back to OM
    background_tasks.add_task(_apply_tags_background, scan_results)

    # Immediate response: summary
    total_pii = sum(r["pii_columns"] for r in scan_results)
    critical = sum(1 for r in scan_results if r["risk_level"] == "CRITICAL")

    return {
        "tables_scanned": len(scan_results),
        "tables_with_pii": sum(1 for r in scan_results if r["pii_columns"] > 0),
        "total_pii_columns": total_pii,
        "critical_risk_tables": critical,
        "tagging_status": "running_in_background",
        "scan_summaries": [
            {
                "table": r["table_fqn"],
                "risk_level": r["risk_level"],
                "pii_columns": r["pii_columns"],
                "critical_columns": r["critical_columns"],
                "regulations": r["regulations_triggered"],
                "requires_dpo_review": r["requires_dpo_review"],
                "governance_summary": r["governance_summary"],
            }
            for r in scan_results
        ],
    }


async def _apply_tags_background(scan_results: list):
    tagger = _get_tagger()
    tagger.initialize()
    for scan in scan_results:
        if scan["pii_columns"] > 0:
            try:
                result = tagger.apply_scan_results(scan)
                await db.om_tag_results.insert_one({
                    **result,
                    "tagged_at": datetime.now(timezone.utc).isoformat(),
                })
                logger.info(f"Tagged '{scan['table_name']}': {result['columns_tagged']} columns")
            except Exception as e:
                logger.warning(f"Tagging failed for '{scan['table_name']}': {e}")


@om_router.get("/compliance")
async def get_compliance_report(org_name: str = "My Organization", limit: int = 100):
    """
    Generate a board-ready DPDP/GDPR/HIPAA compliance report for the full catalog.
    Shows penalty exposure, risk inventory, and prioritized recommendations.
    """
    ensure_engine()
    from engine.om_compliance import generate_compliance_report

    client = _get_om_client()
    scanner = _get_scanner()

    try:
        tables = client.list_tables(limit=limit)
        raw_tables = []
        for t in tables:
            try:
                raw_tables.append(client.get_table(t["id"], fields="columns,tags"))
            except Exception as e:
                logger.warning(f"Fetch failed for {t.get('name', '?')}: {e}")
    except Exception:
        logger.info("OM unreachable — using demo tables for compliance report")
        raw_tables = _DEMO_OM_TABLES

    scan_results = []
    for full_table in raw_tables:
        try:
            scan_results.append(scanner.scan_table(full_table))
        except Exception as e:
            logger.warning(f"Scan failed for {full_table.get('name', '?')}: {e}")

    report = generate_compliance_report(scan_results, org_name)

    # Store report in MongoDB
    await db.compliance_reports.insert_one({
        **report,
        "stored_at": datetime.now(timezone.utc).isoformat(),
    })

    return report


@om_router.post("/webhook")
async def om_event_webhook(event: dict, background_tasks: BackgroundTasks):
    """
    OpenMetadata fires this webhook when new tables are ingested or updated.
    Triggers automatic governance scan + tagging of the new asset.
    Register this URL in OM: POST /api/v1/events/subscriptions
    """
    entity_type = event.get("entityType", "")
    event_type = event.get("eventType", "")
    entity = event.get("entity", {})

    logger.info(f"OM webhook: {event_type} {entity_type} — {entity.get('name', '?')}")

    if entity_type == "table" and event_type in ("entityCreated", "entityUpdated"):
        table_id = entity.get("id")
        if table_id:
            background_tasks.add_task(_auto_scan_table, table_id)
            return {"status": "scan_queued", "table_id": table_id}

    return {"status": "ignored", "event_type": event_type, "entity_type": entity_type}


async def _auto_scan_table(table_id: str):
    client = _get_om_client()
    scanner = _get_scanner()
    tagger = _get_tagger()
    tagger.initialize()
    try:
        table = client.get_table(table_id, fields="columns,tags")
        scan = scanner.scan_table(table)
        if scan["pii_columns"] > 0:
            tag_result = tagger.apply_scan_results(scan)
            await db.om_scans.insert_one({
                **scan,
                "scan_type": "webhook_triggered",
                "scanned_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(
                f"Auto-scan: '{scan['table_name']}' — {scan['pii_columns']} PII columns tagged"
            )
    except Exception as e:
        logger.error(f"Auto-scan failed for table {table_id}: {e}")


@om_router.post("/register-webhook")
async def register_webhook(req: WebhookRegisterRequest):
    """
    Register Chakravyuha as a webhook consumer in OpenMetadata.
    OM will call /api/om/webhook on every new table ingestion.
    """
    client = _get_om_client()
    callback = req.callback_url or f"{os.environ.get('SELF_URL', 'http://localhost:8000')}/api/om/webhook"
    result = client.register_webhook("chakravyuha-auto-governance", callback)
    return {"registered": True, "endpoint": callback, "result": result}


@om_router.get("/catalog")
async def list_catalog(limit: int = 50):
    """List all tables in OpenMetadata with their current governance tags."""
    client = _get_om_client()
    try:
        tables = client.list_tables(limit=limit)
        source = "openmetadata"
    except Exception:
        tables = _DEMO_OM_TABLES
        source = "demo"
    return {
        "total": len(tables),
        "source": source,
        "tables": [
            {
                "id": t.get("id"),
                "name": t.get("name"),
                "fqn": t.get("fullyQualifiedName"),
                "description": t.get("description", ""),
                "columns": len(t.get("columns", [])),
                "tags": [tag.get("tagFQN") for tag in t.get("tags", [])],
                "database": t.get("database", {}).get("name", ""),
            }
            for t in tables
        ],
    }


@om_router.get("/scans")
async def get_scan_history(limit: int = 20):
    """Get historical scan results stored in MongoDB."""
    scans = (
        await db.om_scans.find({}, {"_id": 0, "column_results": 0})
        .sort("scanned_at", -1)
        .limit(limit)
        .to_list(None)
    )
    return {"scans": scans, "count": len(scans)}


# ── Register routers ──────────────────────────────────────────────
api_router.include_router(om_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    logger.info("Starting Chakravyuha-OM — preloading models…")
    from engine.semantic_engine import get_engine
    get_engine()
    from engine.memory_engine import get_memory_engine
    get_memory_engine()
    global _pipeline_ready
    _pipeline_ready = True
    logger.info("All models loaded. Chakravyuha-OM ready.")


@app.on_event("shutdown")
async def shutdown_db_client():
    logger.info("Shutting down — closing MongoDB connection.")
    client.close()
