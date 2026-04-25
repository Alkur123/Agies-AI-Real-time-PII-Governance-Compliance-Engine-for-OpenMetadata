# Agies AI — Requirements Specification

[![WeMakeDevs](https://img.shields.io/badge/Hackathon-WeMakeDevs_×_OpenMetadata-f59e0b?style=flat-square)](https://www.wemakedevs.org/hackathons/openmetadata)
[![DPDP 2023](https://img.shields.io/badge/Regulation-DPDP_2023-10b981?style=flat-square)]()
[![GDPR](https://img.shields.io/badge/Regulation-GDPR-3b82f6?style=flat-square)]()
[![HIPAA](https://img.shields.io/badge/Regulation-HIPAA-8b5cf6?style=flat-square)]()
[![PCI DSS](https://img.shields.io/badge/Regulation-PCI_DSS_v4.0-ef4444?style=flat-square)]()

> Complete functional, non-functional, and regulatory requirements for Agies AI.

---

## Table of Contents

- [Project Scope](#project-scope)
- [Stakeholders](#stakeholders)
- [Functional Requirements](#functional-requirements)
- [Non-Functional Requirements](#non-functional-requirements)
- [Regulatory Requirements](#regulatory-requirements)
- [OpenMetadata Integration Requirements](#openmetadata-integration-requirements)
- [MCP Requirements](#mcp-requirements)
- [API Requirements](#api-requirements)
- [Frontend Requirements](#frontend-requirements)
- [Infrastructure Requirements](#infrastructure-requirements)
- [Security Requirements](#security-requirements)
- [Data Requirements](#data-requirements)
- [Acceptance Criteria](#acceptance-criteria)

---

## Project Scope

**In scope:**
- AI-powered PII detection across OpenMetadata table/column metadata
- Automated compliance tag writeback to OpenMetadata
- Real-time query governance (BLOCK / ALLOW / REDACT decisions)
- Board-level compliance report generation (DPDP 2023, GDPR, HIPAA, PCI DSS)
- MCP server exposing 6 governance tools for AI agent consumption
- React frontend with catalog, chat, analytics, session, and audit views
- Production AWS deployment (CloudFront + EC2 + S3)

**Out of scope:**
- Row-level data scanning (column metadata only in v3)
- Multi-tenant authentication and authorization
- Real-time streaming data governance
- Direct database connector (JDBC/ODBC)
- Mobile native applications

---

## Stakeholders

| Stakeholder | Role | Primary Need |
|-------------|------|-------------|
| **Data Protection Officer (DPO)** | Compliance oversight | Automated DPDP/GDPR compliance status |
| **CISO** | Security leadership | Board-ready compliance reports |
| **Data Engineer** | Catalog management | Zero-manual PII tagging |
| **Data Analyst** | Data access | Know which queries are safe |
| **AI Agent / LLM** | Automated governance | MCP tools for catalog governance |
| **OpenMetadata Admin** | Platform management | Clean, accurate tag taxonomy |

---

## Functional Requirements

### FR-01 — PII Detection

| ID | Requirement | Priority |
|----|-------------|---------|
| FR-01.1 | System SHALL detect Aadhaar numbers via column name patterns | P0 |
| FR-01.2 | System SHALL detect PAN card columns via name and regex | P0 |
| FR-01.3 | System SHALL detect IFSC codes via regex pattern | P0 |
| FR-01.4 | System SHALL detect UPI IDs via regex pattern | P0 |
| FR-01.5 | System SHALL detect email addresses via RFC 5322 regex | P0 |
| FR-01.6 | System SHALL detect credit card numbers via Luhn-adjacent pattern | P0 |
| FR-01.7 | System SHALL detect biometric data indicators | P0 |
| FR-01.8 | System SHALL detect GDPR special category data (health, religion, race) | P1 |
| FR-01.9 | System SHALL detect HIPAA Protected Health Information (PHI) | P1 |
| FR-01.10 | System SHALL use FAISS semantic search to detect obfuscated PII columns | P0 |
| FR-01.11 | System SHALL assign a risk level: CRITICAL / HIGH / MEDIUM / NONE | P0 |
| FR-01.12 | System SHALL return detection method for each finding (layer1/2/3) | P2 |

### FR-02 — OpenMetadata Integration

| ID | Requirement | Priority |
|----|-------------|---------|
| FR-02.1 | System SHALL authenticate with OpenMetadata via username/password | P0 |
| FR-02.2 | System SHALL fetch all tables from OpenMetadata catalog | P0 |
| FR-02.3 | System SHALL create Chakravyuha classification taxonomy in OM if absent | P0 |
| FR-02.4 | System SHALL write PII tags back to OM columns via PATCH API | P0 |
| FR-02.5 | System SHALL fall back to demo tables when OM is unreachable | P0 |
| FR-02.6 | System SHALL display OM health status (connected / demo mode) | P1 |
| FR-02.7 | System SHALL support OM version 1.4.7 or later | P0 |

### FR-03 — Query Governance

| ID | Requirement | Priority |
|----|-------------|---------|
| FR-03.1 | System SHALL accept natural language queries via POST /api/analyze | P0 |
| FR-03.2 | System SHALL return a BLOCK, ALLOW, or REDACT decision | P0 |
| FR-03.3 | System SHALL return a risk score 0–100 for every query | P0 |
| FR-03.4 | System SHALL cite the specific regulation section triggering a BLOCK | P0 |
| FR-03.5 | System SHALL provide a natural language explanation for every decision | P0 |
| FR-03.6 | System SHALL identify PII entities mentioned in the query | P1 |
| FR-03.7 | System SHALL identify redaction candidates where applicable | P1 |
| FR-03.8 | System SHALL log every decision to MongoDB audit collection | P0 |
| FR-03.9 | System SHALL maintain session context across queries | P1 |

### FR-04 — Compliance Reporting

| ID | Requirement | Priority |
|----|-------------|---------|
| FR-04.1 | System SHALL generate a full compliance report on demand | P0 |
| FR-04.2 | Report SHALL include overall compliance score (0–100%) | P0 |
| FR-04.3 | Report SHALL include penalty exposure in ₹ crores and EUR millions | P0 |
| FR-04.4 | Report SHALL break down status per regulation (DPDP, GDPR, HIPAA) | P0 |
| FR-04.5 | Report SHALL flag tables requiring DPO review | P1 |
| FR-04.6 | Report SHALL include prioritized remediation recommendations (P0–P3) | P1 |
| FR-04.7 | Report SHALL include a unique report ID and generation timestamp | P2 |

### FR-05 — MCP Server

| ID | Requirement | Priority |
|----|-------------|---------|
| FR-05.1 | System SHALL expose a FastMCP server with 6 governance tools | P0 |
| FR-05.2 | `scan_table` tool SHALL accept table FQN and return scan result | P0 |
| FR-05.3 | `scan_catalog` tool SHALL scan all tables and return summaries | P0 |
| FR-05.4 | `get_compliance_report` tool SHALL return full compliance report | P0 |
| FR-05.5 | `get_column_analysis` tool SHALL return per-column PII breakdown | P0 |
| FR-05.6 | `check_query_governance` tool SHALL return BLOCK/ALLOW decision | P0 |
| FR-05.7 | `get_audit_history` tool SHALL return scan history from MongoDB | P1 |

### FR-06 — Frontend

| ID | Requirement | Priority |
|----|-------------|---------|
| FR-06.1 | Frontend SHALL provide a chat interface for governance queries | P0 |
| FR-06.2 | Frontend SHALL display BLOCK/ALLOW decision with risk score | P0 |
| FR-06.3 | Frontend SHALL show a catalog view with 6 demo tables | P0 |
| FR-06.4 | Frontend SHALL allow one-click full catalog scan | P0 |
| FR-06.5 | Frontend SHALL show per-column PII breakdown on table click | P0 |
| FR-06.6 | Frontend SHALL display the compliance report in a readable format | P0 |
| FR-06.7 | Frontend SHALL show OM health status banner | P1 |
| FR-06.8 | Frontend SHALL show audit log history | P2 |

---

## Non-Functional Requirements

### NFR-01 — Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01.1 | Query governance response time | < 2 seconds (P95) |
| NFR-01.2 | Single table scan time | < 5 seconds |
| NFR-01.3 | Full catalog scan (6 tables) | < 30 seconds |
| NFR-01.4 | Compliance report generation | < 10 seconds |
| NFR-01.5 | FAISS inference per column | < 5ms on CPU |
| NFR-01.6 | Frontend initial load time | < 3 seconds on 4G |

### NFR-02 — Accuracy

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-02.1 | Overall PII detection F1 score | ≥ 99% |
| NFR-02.2 | Aadhaar/PAN/IFSC detection precision | ≥ 99.5% |
| NFR-02.3 | Obfuscated column detection (FAISS) | ≥ 90% recall |
| NFR-02.4 | False positive rate | ≤ 1% |

### NFR-03 — Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-03.1 | API availability (excluding planned maintenance) | ≥ 99% |
| NFR-03.2 | Graceful degradation when OM offline | Demo mode within 2s |
| NFR-03.3 | Graceful degradation when Groq offline | Template explanation, no error |
| NFR-03.4 | Graceful degradation when Redis offline | Stateless fallback |

### NFR-04 — Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-04.1 | Concurrent governance queries | ≥ 50 concurrent |
| NFR-04.2 | Catalog tables supported | ≥ 1,000 tables |
| NFR-04.3 | Audit log entries (MongoDB) | Unlimited (Atlas free tier: 512MB) |

### NFR-05 — Maintainability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-05.1 | All secrets via environment variables | Mandatory |
| NFR-05.2 | Docker-based deployment | Single `docker-compose up` |
| NFR-05.3 | Backend `.env.example` with all vars documented | Mandatory |
| NFR-05.4 | FastAPI `/docs` endpoint with all routes | Mandatory |

---

## Regulatory Requirements

### RR-01 — DPDP Act 2023 (India)

| ID | Requirement |
|----|-------------|
| RR-01.1 | System SHALL classify Aadhaar numbers as `DPDP_CRITICAL` |
| RR-01.2 | System SHALL classify PAN cards as `DPDP_SENSITIVE` |
| RR-01.3 | System SHALL classify IFSC/bank account data as `DPDP_SENSITIVE` |
| RR-01.4 | System SHALL block queries requesting raw Aadhaar without consent context |
| RR-01.5 | System SHALL cite DPDP Act 2023 §4 for biometric data violations |
| RR-01.6 | System SHALL display ₹250 crore maximum penalty for DPDP_CRITICAL violations |

### RR-02 — GDPR (European Union)

| ID | Requirement |
|----|-------------|
| RR-02.1 | System SHALL classify email addresses as `GDPR_PERSONAL` |
| RR-02.2 | System SHALL classify health/biometric data as `GDPR_SPECIAL_CATEGORY` |
| RR-02.3 | System SHALL cite GDPR Article 4(1) for personal data |
| RR-02.4 | System SHALL cite GDPR Article 9 for special category data |
| RR-02.5 | System SHALL display €20M / 4% revenue penalty for GDPR violations |

### RR-03 — HIPAA (United States)

| ID | Requirement |
|----|-------------|
| RR-03.1 | System SHALL classify biometric hashes as `HIPAA_PHI` |
| RR-03.2 | System SHALL classify health record data as `HIPAA_PHI` |
| RR-03.3 | System SHALL cite HIPAA §164.514 for PHI violations |
| RR-03.4 | System SHALL display $1.9M/year maximum penalty |

### RR-04 — PCI DSS v4.0

| ID | Requirement |
|----|-------------|
| RR-04.1 | System SHALL classify credit card numbers as `PCI_DSS_RESTRICTED` |
| RR-04.2 | System SHALL classify CVV/CVV2 fields as `PCI_DSS_RESTRICTED` |
| RR-04.3 | System SHALL cite PCI DSS v4.0 Requirement 3 |
| RR-04.4 | System SHALL display $100K/month penalty for PCI violations |

---

## OpenMetadata Integration Requirements

### OM-01 — API Integration

| ID | Requirement |
|----|-------------|
| OM-01.1 | MUST use OpenMetadata REST API v1 (`/api/v1/*`) |
| OM-01.2 | MUST authenticate via `/api/v1/users/login` — JWT token |
| OM-01.3 | MUST fetch tables via `/api/v1/tables?limit=N&fields=columns,tags` |
| OM-01.4 | MUST write tags via PATCH `/api/v1/tables/{id}` |
| OM-01.5 | MUST create classification via POST `/api/v1/classifications` |
| OM-01.6 | MUST create tags via POST `/api/v1/tags` |
| OM-01.7 | MUST handle OM 401/404/503 errors gracefully with demo fallback |

### OM-02 — Data Model Compliance

| ID | Requirement |
|----|-------------|
| OM-02.1 | Tags MUST use OpenMetadata's `tagFQN` format: `Chakravyuha.DPDP_CRITICAL` |
| OM-02.2 | Column tags MUST use OM's column tag patch schema |
| OM-02.3 | Classification MUST follow OM's classification object schema |
| OM-02.4 | Table FQN format MUST follow OM convention: `service.database.schema.table` |

---

## MCP Requirements

| ID | Requirement |
|----|-------------|
| MCP-01 | Server MUST implement Model Context Protocol specification |
| MCP-02 | All 6 tools MUST have typed input schemas (pydantic) |
| MCP-03 | All tool responses MUST be JSON-serializable |
| MCP-04 | Server MUST be accessible at `/mcp` on the backend API |
| MCP-05 | Tools MUST handle OM-offline state gracefully (demo fallback) |

---

## API Requirements

| ID | Requirement |
|----|-------------|
| API-01 | All endpoints MUST return JSON |
| API-02 | All endpoints MUST include CORS headers for frontend domain |
| API-03 | `/api/analyze` MUST be rate-limited (default: 60 req/min/IP) |
| API-04 | All endpoints MUST return HTTP 422 for invalid request bodies |
| API-05 | All endpoints MUST return HTTP 429 for rate limit exceeded |
| API-06 | Swagger UI MUST be accessible at `/docs` |
| API-07 | `GET /api/health` MUST return engine readiness status |

---

## Frontend Requirements

| ID | Requirement |
|----|-------------|
| FE-01 | MUST be a single-page application (React 18) |
| FE-02 | MUST use VITE_API_URL environment variable for API base |
| FE-03 | MUST work over HTTPS (no mixed content) |
| FE-04 | MUST display risk scores with color coding (CRITICAL/HIGH/MEDIUM/NONE) |
| FE-05 | MUST show loading state during scan operations |
| FE-06 | MUST show error messages for failed API calls |
| FE-07 | MUST be responsive (usable on 1280px+ desktop screens) |
| FE-08 | Build output MUST be deployable to S3 static hosting |

---

## Infrastructure Requirements

| ID | Requirement |
|----|-------------|
| INF-01 | Backend MUST run as a Docker container |
| INF-02 | Docker image MUST be publishable to AWS ECR |
| INF-03 | Frontend dist MUST be deployable to AWS S3 |
| INF-04 | API MUST be served over HTTPS via CloudFront |
| INF-05 | Redis MUST run as a sidecar container |
| INF-06 | All environment secrets MUST be injected via .env file (not baked into image at build) |
| INF-07 | EC2 instance MUST have internet access for MongoDB Atlas and Groq API |

---

## Security Requirements

| ID | Requirement |
|----|-------------|
| SEC-01 | `.env` file MUST NOT be committed to version control |
| SEC-02 | `.gitignore` MUST exclude `.env`, `*.pem`, `*.key`, `__pycache__` |
| SEC-03 | All API traffic MUST use TLS 1.2+ (enforced by CloudFront) |
| SEC-04 | Rate limiting MUST be enabled on all public endpoints |
| SEC-05 | Redis MUST NOT be exposed on a public port |
| SEC-06 | MongoDB connection string MUST use TLS (`mongodb+srv://`) |
| SEC-07 | CORS MUST be restricted to known frontend origins in production |

---

## Data Requirements

### Demo Tables — fintech_demo_db.fintech_prod.public.*

| Table | Expected Risk | PII Columns | Regulations |
|-------|--------------|-------------|-------------|
| `users` | CRITICAL | aadhaar_number, pan_number, phone, email, biometric_hash | DPDP, GDPR, HIPAA |
| `kyc_data` | CRITICAL | biometric_hash, aadhaar_number, face_image_url | DPDP, HIPAA |
| `transactions` | HIGH | account_number, ifsc_code, upi_id | DPDP, PCI DSS |
| `loan_applications` | HIGH | pan_number, credit_score, salary, credit_card_number | DPDP, PCI DSS |
| `support_tickets` | NONE | ticket_id, message, status | — |
| `product_catalog` | NONE | product_id, name, price, category | — |

---

## Acceptance Criteria

The following scenarios constitute acceptance of Agies AI v3:

### AC-01 — PII Query Blocked
```
GIVEN a user queries "Show me all Aadhaar numbers from the users table"
WHEN the request reaches /api/analyze
THEN the response SHALL contain decision: "BLOCK"
AND risk_score SHALL be ≥ 80
AND regulations_triggered SHALL include "DPDP_2023"
AND explanation SHALL reference DPDP Act 2023
```

### AC-02 — Safe Query Allowed
```
GIVEN a user queries "Explain how our loan approval model works"
WHEN the request reaches /api/analyze
THEN the response SHALL contain decision: "ALLOW"
AND risk_score SHALL be < 40
```

### AC-03 — Catalog Scan Produces Correct Risk Levels
```
GIVEN the catalog contains 6 demo fintech tables
WHEN POST /api/om/scan/all is called
THEN users table SHALL have risk_level: "CRITICAL"
AND kyc_data table SHALL have risk_level: "CRITICAL"
AND transactions table SHALL have risk_level: "HIGH"
AND support_tickets table SHALL have risk_level: "NONE"
```

### AC-04 — Column Analysis — users Table
```
GIVEN a scan of the users table
WHEN column results are returned
THEN aadhaar_number column SHALL have tag: "DPDP_CRITICAL"
AND email column SHALL have tag: "GDPR_PERSONAL"
AND biometric_hash column SHALL have tag: "HIPAA_PHI"
```

### AC-05 — Compliance Report Generated
```
GIVEN 6 tables have been scanned
WHEN GET /api/om/compliance is called
THEN response SHALL include compliance_score (0–100)
AND penalty_exposure SHALL list DPDP, GDPR, HIPAA entries
AND recommendations SHALL include at least one P0 item
```

### AC-06 — MCP Tools Callable
```
GIVEN the MCP server is running
WHEN scan_table is called with a valid table FQN
THEN the response SHALL include risk_level, pii_columns, column_results
```

---

*Agies AI Requirements v3 · WeMakeDevs × OpenMetadata OUTATIME 2026 · [Back to README](../README.md)*
