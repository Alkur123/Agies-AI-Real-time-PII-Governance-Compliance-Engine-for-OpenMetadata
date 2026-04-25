"""
Demo Data Seeder for OpenMetadata.
Creates a realistic Indian fintech database with PII columns so the
Chakravyuha scan demo shows meaningful governance findings.

Run: python scripts/seed_om_demo.py
Requires: OM_HOST, OM_USERNAME, OM_PASSWORD in env / .env
"""
import sys
import os
import time
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from engine.om_client import OpenMetadataClient, CHAKRAVYUHA_CLASSIFICATION

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("seeder")

# ── Demo database schema: Indian fintech ────────────────────────────
DEMO_TABLES = [
    {
        "name": "users",
        "description": "Customer master table for the neobank platform.",
        "columns": [
            {"name": "user_id",           "dataType": "VARCHAR",  "description": "Internal UUID"},
            {"name": "full_name",          "dataType": "VARCHAR",  "description": "Customer full name"},
            {"name": "aadhaar_number",     "dataType": "VARCHAR",  "description": "12-digit Aadhaar UID"},
            {"name": "pan_card",           "dataType": "VARCHAR",  "description": "Permanent Account Number"},
            {"name": "phone",              "dataType": "VARCHAR",  "description": "Mobile number (+91)"},
            {"name": "email",              "dataType": "VARCHAR",  "description": "Email address"},
            {"name": "date_of_birth",      "dataType": "DATE",     "description": "Customer date of birth"},
            {"name": "address",            "dataType": "TEXT",     "description": "Residential address"},
            {"name": "created_at",         "dataType": "TIMESTAMP","description": "Account creation time"},
            {"name": "kyc_verified",       "dataType": "BOOLEAN",  "description": "KYC status flag"},
        ],
    },
    {
        "name": "kyc_data",
        "description": "Know Your Customer verification records. Contains sensitive biometric hashes.",
        "columns": [
            {"name": "kyc_id",            "dataType": "VARCHAR",  "description": "KYC record ID"},
            {"name": "user_id",           "dataType": "VARCHAR",  "description": "References users.user_id"},
            {"name": "aadhaar_number",    "dataType": "VARCHAR",  "description": "Linked Aadhaar number"},
            {"name": "biometric_hash",    "dataType": "VARCHAR",  "description": "SHA-256 hash of fingerprint biometric"},
            {"name": "pan_card",          "dataType": "VARCHAR",  "description": "PAN for income verification"},
            {"name": "voter_id",          "dataType": "VARCHAR",  "description": "Voter card for address proof"},
            {"name": "verified_at",       "dataType": "TIMESTAMP","description": "Verification timestamp"},
            {"name": "verification_mode", "dataType": "VARCHAR",  "description": "video_kyc | in_person | digital"},
        ],
    },
    {
        "name": "transactions",
        "description": "UPI and NEFT transaction ledger.",
        "columns": [
            {"name": "txn_id",            "dataType": "VARCHAR",  "description": "Transaction UUID"},
            {"name": "sender_user_id",    "dataType": "VARCHAR",  "description": "Sending user"},
            {"name": "receiver_user_id",  "dataType": "VARCHAR",  "description": "Receiving user"},
            {"name": "amount",            "dataType": "DECIMAL",  "description": "Transaction amount in INR"},
            {"name": "ifsc",              "dataType": "VARCHAR",  "description": "Destination IFSC code"},
            {"name": "account_number",    "dataType": "VARCHAR",  "description": "Destination bank account"},
            {"name": "upi_id",            "dataType": "VARCHAR",  "description": "UPI Virtual Payment Address"},
            {"name": "status",            "dataType": "VARCHAR",  "description": "pending | success | failed"},
            {"name": "created_at",        "dataType": "TIMESTAMP","description": "Transaction time"},
        ],
    },
    {
        "name": "loan_applications",
        "description": "Personal and business loan applications.",
        "columns": [
            {"name": "application_id",    "dataType": "VARCHAR",  "description": "Loan application ID"},
            {"name": "user_id",           "dataType": "VARCHAR",  "description": "Applicant user ID"},
            {"name": "full_name",         "dataType": "VARCHAR",  "description": "Applicant name"},
            {"name": "email",             "dataType": "VARCHAR",  "description": "Contact email"},
            {"name": "phone",             "dataType": "VARCHAR",  "description": "Contact mobile"},
            {"name": "pan_card",          "dataType": "VARCHAR",  "description": "PAN for CIBIL check"},
            {"name": "salary",            "dataType": "DECIMAL",  "description": "Monthly gross salary"},
            {"name": "annual_income",     "dataType": "DECIMAL",  "description": "Annual income declared"},
            {"name": "loan_amount",       "dataType": "DECIMAL",  "description": "Requested loan amount"},
            {"name": "credit_card",       "dataType": "VARCHAR",  "description": "Credit card on file"},
            {"name": "submitted_at",      "dataType": "TIMESTAMP","description": "Application submission time"},
            {"name": "status",            "dataType": "VARCHAR",  "description": "pending | approved | rejected"},
        ],
    },
    {
        "name": "support_tickets",
        "description": "Customer support interactions — intentionally minimal PII.",
        "columns": [
            {"name": "ticket_id",         "dataType": "VARCHAR",  "description": "Support ticket ID"},
            {"name": "user_id",           "dataType": "VARCHAR",  "description": "User reference"},
            {"name": "subject",           "dataType": "VARCHAR",  "description": "Ticket subject"},
            {"name": "status",            "dataType": "VARCHAR",  "description": "open | closed | escalated"},
            {"name": "created_at",        "dataType": "TIMESTAMP","description": "Ticket creation time"},
            {"name": "resolved_at",       "dataType": "TIMESTAMP","description": "Resolution time"},
        ],
    },
    {
        "name": "product_catalog",
        "description": "Financial products offered by the platform. No PII.",
        "columns": [
            {"name": "product_id",        "dataType": "VARCHAR",  "description": "Product ID"},
            {"name": "name",              "dataType": "VARCHAR",  "description": "Product name"},
            {"name": "category",          "dataType": "VARCHAR",  "description": "savings | loan | insurance"},
            {"name": "interest_rate",     "dataType": "DECIMAL",  "description": "Annual interest rate"},
            {"name": "min_amount",        "dataType": "DECIMAL",  "description": "Minimum investment"},
            {"name": "active",            "dataType": "BOOLEAN",  "description": "Is product live"},
        ],
    },
]


def wait_for_om(client: OpenMetadataClient, max_retries: int = 20):
    logger.info("Waiting for OpenMetadata to be ready…")
    for i in range(max_retries):
        if client.health_check():
            logger.info("OpenMetadata is ready.")
            return True
        logger.info(f"  Attempt {i+1}/{max_retries} — retrying in 15s…")
        time.sleep(15)
    logger.error("OpenMetadata did not become ready in time.")
    return False


def create_database_service(client: OpenMetadataClient) -> dict:
    """Create a MySQL database service in OM to host our demo tables."""
    headers = client._get_headers()
    import httpx

    # Check if service already exists
    resp = httpx.get(
        f"{client.base}/services/databaseServices/name/fintech_demo_db",
        headers=headers, timeout=10
    )
    if resp.status_code == 200:
        logger.info("Database service 'fintech_demo_db' already exists.")
        return resp.json()

    resp = httpx.post(
        f"{client.base}/services/databaseServices",
        json={
            "name": "fintech_demo_db",
            "serviceType": "CustomDatabase",
            "description": "Demo Indian fintech database for Chakravyuha governance showcase.",
            "connection": {
                "config": {
                    "type": "CustomDatabase",
                    "sourcePythonClass": "metadata.ingestion.source.database.customdatabase.CustomDatabaseSource",
                }
            },
        },
        headers=headers, timeout=10
    )
    if resp.status_code in (200, 201):
        logger.info("Created database service 'fintech_demo_db'.")
        return resp.json()
    logger.warning(f"Service creation: {resp.status_code} — {resp.text[:200]}")
    return {}


def create_database(client: OpenMetadataClient, service_fqn: str) -> dict:
    import httpx
    headers = client._get_headers()

    resp = httpx.get(
        f"{client.base}/databases/name/fintech_demo_db.fintech_prod",
        headers=headers, timeout=10
    )
    if resp.status_code == 200:
        logger.info("Database 'fintech_prod' already exists.")
        return resp.json()

    resp = httpx.post(
        f"{client.base}/databases",
        json={
            "name": "fintech_prod",
            "description": "Production database for Aegis demo fintech platform.",
            "service": service_fqn,
        },
        headers=headers, timeout=10
    )
    if resp.status_code in (200, 201):
        logger.info("Created database 'fintech_prod'.")
        return resp.json()
    logger.warning(f"Database creation: {resp.status_code} — {resp.text[:200]}")
    return {}


def create_schema(client: OpenMetadataClient, database_fqn: str) -> dict:
    import httpx
    headers = client._get_headers()

    resp = httpx.get(
        f"{client.base}/databaseSchemas/name/fintech_demo_db.fintech_prod.public",
        headers=headers, timeout=10
    )
    if resp.status_code == 200:
        return resp.json()

    resp = httpx.post(
        f"{client.base}/databaseSchemas",
        json={
            "name": "public",
            "description": "Default schema",
            "database": database_fqn,
        },
        headers=headers, timeout=10
    )
    if resp.status_code in (200, 201):
        logger.info("Created schema 'public'.")
        return resp.json()
    logger.warning(f"Schema creation: {resp.status_code} — {resp.text[:200]}")
    return {}


def create_table(client: OpenMetadataClient, schema_fqn: str, table_def: dict) -> dict:
    import httpx
    headers = client._get_headers()
    table_name = table_def["name"]

    fqn = f"fintech_demo_db.fintech_prod.public.{table_name}"
    resp = httpx.get(f"{client.base}/tables/name/{fqn}", headers=headers, timeout=10)
    if resp.status_code == 200:
        logger.info(f"  Table '{table_name}' already exists.")
        return resp.json()

    resp = httpx.post(
        f"{client.base}/tables",
        json={
            "name": table_name,
            "description": table_def["description"],
            "tableType": "Regular",
            "databaseSchema": schema_fqn,
            "columns": [
                {
                    "name": c["name"],
                    "dataType": c["dataType"],
                    "description": c["description"],
                    "dataLength": 255 if c["dataType"] in ("VARCHAR", "TEXT") else None,
                }
                for c in table_def["columns"]
            ],
        },
        headers=headers, timeout=10
    )
    if resp.status_code in (200, 201):
        logger.info(f"  Created table '{table_name}' ({len(table_def['columns'])} columns).")
        return resp.json()
    logger.warning(f"  Table '{table_name}': {resp.status_code} — {resp.text[:200]}")
    return {}


def main():
    logger.info("=" * 60)
    logger.info("Chakravyuha-OpenMetadata Demo Data Seeder")
    logger.info("=" * 60)

    client = OpenMetadataClient()

    if not wait_for_om(client):
        sys.exit(1)

    logger.info("\n[1/4] Creating database service…")
    service = create_database_service(client)
    if not service:
        logger.error("Failed to create service. Check OM is running.")
        sys.exit(1)

    logger.info("\n[2/4] Creating database…")
    database = create_database(client, service["fullyQualifiedName"])
    if not database:
        sys.exit(1)

    logger.info("\n[3/4] Creating schema…")
    schema = create_schema(client, database["fullyQualifiedName"])
    if not schema:
        sys.exit(1)

    logger.info("\n[4/4] Creating tables…")
    created = 0
    for table_def in DEMO_TABLES:
        t = create_table(client, schema["fullyQualifiedName"], table_def)
        if t:
            created += 1

    logger.info(f"\n✓ Seeding complete: {created}/{len(DEMO_TABLES)} tables created.")
    logger.info("  OM UI: http://localhost:8585")
    logger.info("  Now run: POST http://localhost:8000/api/om/scan/all")
    logger.info("  to trigger Chakravyuha governance scan.\n")


if __name__ == "__main__":
    main()
