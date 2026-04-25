# Agies AI — System Architecture

[![OpenMetadata](https://img.shields.io/badge/Powered_by-OpenMetadata-FF6B6B?style=flat-square)](https://open-metadata.org)
[![AWS](https://img.shields.io/badge/Deployed-AWS_us--east--1-FF9900?style=flat-square&logo=amazonaws)](https://aws.amazon.com)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![FAISS](https://img.shields.io/badge/AI-FAISS_Semantic_Search-blue?style=flat-square)](https://github.com/facebookresearch/faiss)

> Full architecture reference for Agies AI — the AI-powered PII governance engine built on OpenMetadata.
> Part of the **WeMakeDevs × OpenMetadata OUTATIME Hackathon 2026** submission.

---

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [AWS Deployment Architecture](#aws-deployment-architecture)
- [Backend Engine Architecture](#backend-engine-architecture)
- [3-Layer PII Scanner](#3-layer-pii-scanner)
- [11-Ring Governance Pipeline](#11-ring-governance-pipeline)
- [OpenMetadata Integration Layer](#openmetadata-integration-layer)
- [MCP Server Architecture](#mcp-server-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Database Schema](#database-schema)
- [Security Architecture](#security-architecture)

---

## System Overview

Agies AI is a three-tier system:

```mermaid
flowchart TD
    subgraph T1["TIER 1 — FRONTEND"]
        F1["<b>React 18 SPA</b><br/>TailwindCSS · 21 components · Vite build<br/>Hosted: AWS S3 + CloudFront CDN (HTTPS, global edge)"]
    end
    
    subgraph T2["TIER 2 — API ENGINE"]
        A1["<b>FastAPI 0.110 · Gunicorn · Docker · AWS EC2 (t3-class)</b><br/>11-Ring Governance Pipeline · 3-Layer PII Scanner<br/>MCP Server · FAISS Semantic Engine · ONNX Runtime"]
    end
    
    subgraph T3["TIER 3 — DATA & STATE"]
        direction LR
        D1[("<b>TIER 3A</b><br/>MongoDB Atlas<br/>Audit Logs<br/>Scan History")]
        D2[("<b>TIER 3B</b><br/>OpenMetadata<br/>Metadata Store<br/>Tag Writeback")]
        D3[("<b>TIER 3C</b><br/>Redis 7<br/>Session Cache<br/>Rate Limiting")]
    end
    
    T1 -- "HTTPS REST" --> T2
    T2 --> D1
    T2 --> D2
    T2 --> D3
    
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef engine fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef database fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
    
    class F1 frontend;
    class A1 engine;
    class D1,D2,D3 database;
```

---

## High-Level Architecture

```mermaid
flowchart TD
    subgraph Platform["AGIES AI PLATFORM"]
        direction TB
        
        subgraph UI["Frontend Layer"]
            F1["Governance Chat UI<br/>(React Frontend)"]
            F2["CatalogPanel UI"]
        end
        
        subgraph Pipeline["11-Ring Governance Pipeline"]
            P1["<b>Ring 1-4:</b><br/>Intent + Entity + Policy Match"]
            P2["<b>Ring 5-8:</b><br/>Risk Score + Regulation + Explanation"]
            P3["<b>Ring 9-11:</b><br/>LLM Analysis + Decision + Audit Log"]
            P1 --> P2 --> P3
        end
        
        subgraph Ext["External Integration"]
            direction LR
            DB1[("MongoDB Atlas<br/>(Audit + Scans)")]
            LLM["Groq LLM API<br/>(LLaMA 4 Scout)"]
            Cache[("Redis Cache<br/>(Session Data)")]
        end
        
        subgraph Catalog["Catalog Governance Flow"]
            OM["OpenMetadata REST API<br/>/api/v1/tables"]
            S1["3-Layer PII Scanner"]
            FAISS["FAISS Semantic Engine<br/>(ONNX all-MiniLM-L6-v2)"]
            T1["om_tagger"]
            C1["om_compliance<br/>report generator"]
        end
    end
    
    U1["Data Analyst<br/>/ Developer<br/>/ AI Agent"]
    
    U1 -- '"Show Aadhaar numbers"' --> F1
    F1 -- 'BLOCKED · Risk: 90' --> U1
    
    F1 -- "POST /api/analyze" --> Pipeline
    P3 --> DB1
    P3 --> LLM
    P3 --> Cache
    
    F2 -- "GET /api/om/catalog" --> OM
    F2 -- "POST /api/om/scan/all" --> S1
    S1 -- "Embeddings" --> FAISS
    S1 -- "Scan Results" --> T1
    T1 -- "OpenMetadata PATCH tags" --> OM
    F2 -- "GET /api/om/compliance" --> C1
    
    classDef user fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#fff;
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef pipeline fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef ext fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
    classDef module fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef platform fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    
    class U1 user;
    class F1,F2 frontend;
    class P1,P2,P3 pipeline;
    class DB1,LLM,Cache ext;
    class OM,S1,FAISS,T1,C1 module;
    class Platform platform;
```

---

## AWS Deployment Architecture

```mermaid
flowchart TD
    subgraph AWS["AWS us-east-1"]
        subgraph CF["CloudFront Edge Network"]
            CF_F["<b>Distribution:</b> E51JSAKEC4QL9<br/>(Frontend)"]
            CF_A["<b>Distribution:</b> E8DVT0NN727K6<br/>(API)"]
        end
        
        subgraph S3["S3 Bucket"]
            S3_B["ages-ai-frontend<br/><i>(React SPA Static hosting)</i>"]
        end
        
        subgraph EC2["EC2 Instance: 52.5.166.248"]
            subgraph Docker1["Container: chakra-backend (Port 8000)"]
                API["<b>FastAPI + Gunicorn</b><br/>├── /api/analyze<br/>├── /api/om/catalog<br/>├── /api/om/scan/*<br/>└── /docs"]
            end
            subgraph Docker2["Container: chakra-redis (Port 6379)"]
                Redis["<b>redis:7-alpine</b>"]
            end
            Docker1 -.- Docker2
        end
        
        ECR["<b>ECR Repository</b><br/>agies-open-meta-data<br/><i>(Docker registry)</i>"]
    end
    
    subgraph Ext["External Cloud Services"]
        Mongo[("<b>MongoDB Atlas</b><br/>Audit logs · Scan hist")]
        Groq["<b>Groq API</b><br/>LLaMA 4 Scout 17B"]
    end
    
    CF_F -->|"HTTPS"| S3_B
    CF_A -->|"HTTPS"| API
    API -->|"TLS"| Mongo
    API -->|"HTTPS"| Groq
    EC2 -. "Pulls image" .-> ECR
    
    classDef aws fill:#ff9900,stroke:#e68a00,stroke-width:2px,color:#fff;
    classDef cloud fill:#00a4e4,stroke:#008ac2,stroke-width:2px,color:#fff;
    classDef docker fill:#2496ed,stroke:#1e7bba,stroke-width:2px,color:#fff;
    
    class CF,S3,EC2,ECR aws;
    class Mongo,Groq cloud;
    class Docker1,Docker2 docker;
```

### Deployment Pipeline

```mermaid
flowchart TD
    subgraph Dev["Developer Machine"]
        direction TB
        subgraph BackendBuild["Backend Deploy"]
            B1["docker build -t chakravyuha-backend ./backend"]
            B2["docker tag"]
            B3["docker push"]
            B1 --> B2 --> B3
        end
        
        subgraph FrontendBuild["Frontend Deploy"]
            F1["npm run build (Vite → dist/)"]
            F2["aws s3 sync dist/ s3://ages-ai-frontend --delete"]
            F3["aws cloudfront create-invalidation"]
            F1 --> F2 --> F3
        end
    end
    
    subgraph AWS["AWS Environment"]
        ECR["ECR Registry<br/>(agies-open-meta-data:latest)"]
        
        subgraph EC2Deploy["EC2 Instance (via Instance Connect)"]
            E1["docker pull ECR image"]
            E2["docker stop chakra-backend"]
            E3["docker run chakra-backend (port 8000)"]
            E1 --> E2 --> E3
        end
        
        S3["S3 Bucket<br/>(ages-ai-frontend)"]
        CF["CloudFront Edge"]
    end
    
    B3 --> ECR
    ECR -. "pull" .-> E1
    
    F2 --> S3
    F3 --> CF
    
    classDef cmd fill:#334155,stroke:#475569,stroke-width:1px,color:#fff;
    classDef aws fill:#ff9900,stroke:#e68a00,stroke-width:2px,color:#fff;
    
    class B1,B2,B3,F1,F2,F3,E1,E2,E3 cmd;
    class ECR,S3,CF aws;
```

---

## Backend Engine Architecture

```mermaid
flowchart LR
    subgraph Backend["backend/"]
        direction TB
        S["<b>server.py</b><br/>FastAPI app + route definitions<br/>├── api_router (/api/*)<br/>└── om_router (/api/om/*)"]
        
        subgraph Engine["engine/"]
            direction TB
            P["<b>pipeline.py</b><br/>11-ring governance orchestrator"]
            SE["<b>semantic_engine.py</b><br/>FAISS + ONNX inference"]
            OS["<b>om_scanner.py</b><br/>3-layer PII scanner"]
            OT["<b>om_tagger.py</b><br/>OpenMetadata tag writeback"]
            OC["<b>om_client.py</b><br/>OpenMetadata REST API client"]
            OComp["<b>om_compliance.py</b><br/>Compliance report builder"]
            MCP["<b>mcp_server.py</b><br/>MCP tool registry"]
            LLM["<b>llm_service.py</b><br/>Groq API wrapper"]
            Pol["<b>policy.py</b><br/>Regulation rule engine"]
            Red["<b>redactor.py</b><br/>Regex patterns"]
            Mem["<b>memory_engine.py</b><br/>Redis session manager"]
            Exp["<b>explainability.py</b><br/>Causal explanation generator"]
        end
    end
    
    S -->|"Calls into"| Engine
    P --> SE
    P --> Pol
    P --> LLM
    P --> Mem
    OS --> SE
    OS --> Red
    
    classDef folder fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    classDef file fill:#1e293b,stroke:#475569,stroke-width:1px,color:#fff;
    classDef orchestrator fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff;
    
    class Backend,Engine folder;
    class S,SE,OS,OT,OC,OComp,MCP,LLM,Pol,Red,Mem,Exp file;
    class P orchestrator;
```

---

## 3-Layer PII Scanner

```mermaid
flowchart TD
    In["<b>INPUT:</b> OpenMetadata Table Object<br/>{ name, fullyQualifiedName, columns: [...] }"]
    
    subgraph Scanner["3-LAYER PII SCANNER (engine/om_scanner.py)"]
        direction TB
        L1["<b>LAYER 1 — Column Name Pattern Matching</b><br/>O(n) · Catches ~70% of obvious PII<br/><i>Patterns: aadhaar*, pan_*, email*, phone*, etc.</i>"]
        L2["<b>LAYER 2 — Regulatory Regex Engine</b><br/>Catches renamed columns with real data samples<br/><i>Regex: Aadhaar, PAN, IFSC, UPI, CC, etc.</i>"]
        L3["<b>LAYER 3 — FAISS Semantic Search</b><br/>Catches obfuscated/aliased columns<br/><i>Model: ONNX all-MiniLM-L6-v2<br/>Threshold: ≥ 0.82</i>"]
        
        L1 --> L2 --> L3
    end
    
    Out["<b>OUTPUT:</b> ScanResult per column<br/>{ column: 'aadhaar_number', pii_found: true, highest_severity_tag: 'DPDP_CRITICAL', ... }"]
    
    In --> Scanner --> Out
    
    classDef input fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef layer fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef output fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef container fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    
    class In input;
    class L1,L2,L3 layer;
    class Out output;
    class Scanner container;
```

---

## 11-Ring Governance Pipeline

```mermaid
flowchart TD
    In["<b>INPUT:</b> { query: str, session_id: str }"]
    
    subgraph Pipeline["11-RING GOVERNANCE PIPELINE (engine/pipeline.py)"]
        direction TB
        R1["<b>R1: Session Context Analysis</b><br/>Load session history from Redis"]
        R2["<b>R2: Semantic Intent Classification</b><br/>FAISS vector search on query"]
        R3["<b>R3: Entity Extraction</b><br/>Extract AADHAAR, PAN, EMAIL, PHONE..."]
        R4["<b>R4: Policy Rule Matching</b><br/>Match against DPDP, GDPR, HIPAA..."]
        R5["<b>R5: Risk Score Computation</b><br/>Weighted score 0-100"]
        R6["<b>R6: Regulation Citation</b><br/>Map to exact regulation sections"]
        R7["<b>R7: Causal Explanation Generation</b><br/>Template-based reasoning"]
        R8["<b>R8: Redaction Candidate ID</b><br/>Which columns can be masked"]
        R9["<b>R9: LLM Contextual Analysis</b><br/>Groq/LLaMA 4 enriched narrative"]
        R10["<b>R10: Final Decision</b><br/>BLOCK · ALLOW · REDACT · REVIEW"]
        R11["<b>R11: Audit Log Persistence</b><br/>Write to MongoDB Atlas"]
        
        R1 --> R2 --> R3 --> R4 --> R5 --> R6 --> R7 --> R8 --> R9 --> R10 --> R11
    end
    
    Out["<b>OUTPUT:</b> GovernanceDecision<br/>{ decision, risk_score, confidence, regulations_triggered, ... }"]
    
    In --> Pipeline --> Out
    
    classDef input fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef ring fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#fff;
    classDef output fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef container fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    
    class In input;
    class R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11 ring;
    class Out output;
    class Pipeline container;
```

---

## OpenMetadata Integration Layer

```mermaid
sequenceDiagram
    participant B as Agies AI Backend
    participant OM as OpenMetadata Server
    
    note over B,OM: om_client.py
    B->>OM: POST /api/v1/users/login
    OM-->>B: JWT token
    
    B->>OM: GET /api/v1/tables?limit=100
    OM-->>B: {tables: [{name, fqn, columns}]}
    
    note over B: om_scanner.py
    B->>B: scan_table(table)<br/>(3-layer PII detection)
    
    note over B,OM: om_tagger.py
    B->>OM: PATCH /api/v1/tables/{id}<br/>body: { columns: [{tags: [...]}] }
    OM-->>B: 200 OK
    
    note over B: om_compliance.py
    B->>B: generate_report()<br/>aggregates scan results
    
    note over B,OM: FALLBACK MODE<br/>If OM unreachable, uses _DEMO_OM_TABLES<br/>Runs real scanner, skips OM PATCH
```

---

## MCP Server Architecture

```mermaid
flowchart TD
    Agent["<b>AI Agent</b><br/>(Claude / GPT / Gemini)"]
    
    subgraph FastMCP["MCP SERVER (engine/mcp_server.py)"]
        direction TB
        Proto["MCP Protocol<br/>(JSON-RPC over HTTP)"]
        
        subgraph Registry["MCP TOOL REGISTRY"]
            T1["<b>scan_table</b>(table_fqn: str)<br/>└──► om_scanner.scan_table()"]
            T2["<b>scan_catalog</b>(limit: int = 100)<br/>└──► om_client.get_tables() + scan_table() × N"]
            T3["<b>get_compliance_report</b>(org_name: str)<br/>└──► om_compliance.generate_report()"]
            T4["<b>get_column_analysis</b>(table_fqn: str)<br/>└──► scan_table() → per-column mapping"]
            T5["<b>check_query_governance</b>(query: str)<br/>└──► pipeline.analyze() → GovernanceDecision"]
            T6["<b>get_audit_history</b>(limit: int = 50)<br/>└──► MongoDB.find(scans)"]
        end
        
        Proto --> Registry
    end
    
    Agent <-->|"JSON-RPC over HTTP"| Proto
    
    classDef agent fill:#ec4899,stroke:#be185d,stroke-width:2px,color:#fff;
    classDef tool fill:#6366f1,stroke:#4338ca,stroke-width:2px,color:#fff;
    classDef server fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    classDef proto fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff;
    
    class Agent agent;
    class T1,T2,T3,T4,T5,T6 tool;
    class FastMCP server;
    class Proto proto;
```

---

## Frontend Architecture

```mermaid
flowchart LR
    subgraph Frontend["frontend/src/"]
        direction TB
        App["<b>App.jsx</b><br/>Root shell, tab routing"]
        
        subgraph Tabs["Tab Components"]
            direction TB
            Chat["<b>ChatWindow.jsx</b><br/>├── ChatMessage, InputBox<br/>├── DecisionBanner, EvidencePanel<br/>└── RiskGauge, RiskBar, SignalBreakdown"]
            Catalog["<b>CatalogPanel.jsx</b><br/>├── HealthBanner, TableRow × 6<br/>└── ColumnDetail, ComplianceReport"]
            Analytics["<b>HeatmapPanel.jsx</b><br/>└── RiskGraph.jsx"]
            Sessions["<b>SessionPanel.jsx</b><br/>└── Timeline.jsx"]
            Audit["<b>AuditLogs.jsx</b>"]
        end
        
        API["<b>api.js</b><br/>Axios client → EC2 backend"]
        
        App -->|"Tab: Chat"| Chat
        App -->|"Tab: Catalog"| Catalog
        App -->|"Tab: Analytics"| Analytics
        App -->|"Tab: Sessions"| Sessions
        App -->|"Tab: Audit"| Audit
        
        Tabs -.-> API
    end
    
    classDef root fill:#f43f5e,stroke:#e11d48,stroke-width:2px,color:#fff;
    classDef component fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#fff;
    classDef util fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef container fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    
    class App root;
    class Chat,Catalog,Analytics,Sessions,Audit component;
    class API util;
    class Frontend container;
```

---

## Data Flow Diagrams

### Query Governance Flow

```mermaid
flowchart TD
    User["User types query"] --> API["POST /api/analyze"]
    API --> Rings1_4["Ring 1-4: Context + Intent + Entities + Policy"]
    
    Rings1_4 --> Cond{"Risk ≥ 80?"}
    
    Cond -- "YES" --> Rings5_11["Ring 5-11: Score + Cite + Explain + BLOCK"]
    Rings5_11 --> Block["<b>Response:</b><br/>{ decision: 'BLOCK', risk_score: 90, regulations: [...] }"]
    
    Cond -- "NO (Risk < 40?)" --> Skip["Skip LLM (Ring 9) → ALLOW fast path"]
    Skip --> Allow["<b>Response:</b><br/>{ decision: 'ALLOW', risk_score: 12 }"]
    
    classDef user fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#fff;
    classDef api fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef decision fill:#eab308,stroke:#ca8a04,stroke-width:2px,color:#000;
    classDef block fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff;
    classDef allow fill:#22c55e,stroke:#16a34a,stroke-width:2px,color:#fff;
    classDef process fill:#4f46e5,stroke:#3730a3,stroke-width:2px,color:#fff;
    
    class User user;
    class API api;
    class Cond decision;
    class Block block;
    class Allow allow;
    class Rings1_4,Rings5_11,Skip process;
```

### Catalog Scan Flow

```mermaid
flowchart TD
    Start["Click 'Scan Catalog'"] --> API["POST /api/om/scan/all"]
    
    API --> TryOM{"Try OpenMetadata API"}
    TryOM -- "Success" --> Tables["Real table metadata"]
    TryOM -- "Fail" --> DemoTables["_DEMO_OM_TABLES fallback"]
    
    Tables --> Loop
    DemoTables --> Loop
    
    subgraph Loop["For each table: scan_table(table)"]
        direction TB
        L1["Layer 1: column name patterns"]
        L2["Layer 2: regex classifiers"]
        L3["Layer 3: FAISS semantic search"]
        L1 --> L2 --> L3
    end
    
    Loop --> Res["ScanResult {risk_level, pii_columns, critical_columns}"]
    
    Res --> BG["Background: apply_tags_background()<br/>└── om_tagger.apply_scan_results() → OM PATCH"]
    Res --> Frontend["Response: scan_summaries[] → Frontend catalog table"]
    
    classDef action fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff;
    classDef api fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff;
    classDef process fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff;
    classDef state fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;
    classDef decision fill:#eab308,stroke:#ca8a04,stroke-width:2px,color:#000;
    
    class Start action;
    class API api;
    class TryOM decision;
    class Tables,DemoTables state;
    class Loop,L1,L2,L3,Res,BG,Frontend process;
```

---

## Database Schema

### MongoDB — `governance_logs` database

**Collection: `audit_logs`**
```json
{
  "_id": "ObjectId",
  "query": "Show me all Aadhaar numbers...",
  "session_id": "default",
  "decision": "BLOCK",
  "risk_score": 90,
  "confidence": 0.94,
  "regulations_triggered": ["DPDP_2023"],
  "pii_entities": ["AADHAAR"],
  "explanation": "...",
  "timestamp": "2026-04-25T10:30:00Z",
  "processing_time_ms": 234
}
```

**Collection: `scan_history`**
```json
{
  "_id": "ObjectId",
  "table_fqn": "fintech_demo_db.fintech_prod.public.users",
  "table_name": "users",
  "risk_level": "CRITICAL",
  "pii_columns": 5,
  "critical_columns": 2,
  "regulations_triggered": ["DPDP_2023", "GDPR", "HIPAA"],
  "column_results": [...],
  "scanned_at": "2026-04-25T10:30:00Z",
  "tagged_at": "2026-04-25T10:30:01Z"
}
```

---

## Security Architecture

```mermaid
flowchart TD
    subgraph Security["SECURITY LAYERS"]
        direction TB
        L1["<b>Layer 1 — Transport Security</b><br/>CloudFront enforces HTTPS (TLS 1.2+)<br/>HTTP → HTTPS redirect at edge"]
        L2["<b>Layer 2 — Rate Limiting (slowapi)</b><br/>60 requests/minute per IP<br/>Returns 429 on breach"]
        L3["<b>Layer 3 — API Key Authentication (optional)</b><br/>X-API-Key header on all /api/* endpoints<br/>Configurable via API_KEY env var"]
        L4["<b>Layer 4 — CORS Policy</b><br/>Allowed origins via CORS_ORIGINS env var<br/>Production: CloudFront domain only"]
        L5["<b>Layer 5 — No Secrets in Code</b><br/>All secrets via .env (not committed)<br/>.gitignore: .env, *.pem, *.key"]
        L6["<b>Layer 6 — Container Isolation</b><br/>Backend + Redis in separate Docker containers<br/>Redis not exposed to public internet"]
        
        L1 --> L2 --> L3 --> L4 --> L5 --> L6
    end
    
    classDef layer fill:#1e293b,stroke:#cbd5e1,stroke-width:2px,color:#fff;
    classDef container fill:#0f172a,stroke:#334155,stroke-width:2px,color:#fff;
    class L1,L2,L3,L4,L5,L6 layer;
    class Security container;
```

---

*Agies AI Architecture v3 · WeMakeDevs × OpenMetadata OUTATIME 2026 · [Back to README](../README.md)*
