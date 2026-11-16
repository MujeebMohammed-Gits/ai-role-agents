<div align="center">

# AI Role Agents

**An Enterprise Multi-Agent AI Advisory Platform with Grounded RAG, Real-Time Glass-Box Observability, Automated Evals, and Interactive Workflow Diagrams**

[![Live Demo](https://shields.io)](https://vercel.app)
[![Backend API](https://shields.io)](https://onrender.com)
[![Vector DB](https://shields.io)](https://qdrant.io)
[![License: MIT](https://shields.io)](LICENSE)

Built by **Mujeeb Mohammed** • [Try the Live Platform](https://vercel.app) • [GitHub Repository](https://github.com)

</div>

---

## Why AI Role Agents?

Generic AI assistants rely on one-size-fits-all system prompts that lack domain boundaries, verifiable citations, or quality controls. **AI Role Agents** solves this by orchestrating **12 specialized enterprise personas**—each grounded in **19,712 indexed domain knowledge chunks**, governed by automated guardrails and self-critique evaluations, and streamed live with full event-level telemetry.

> **Live Production Deployment:** Experience all 12 specialist agents instantly at **[ai-role-agents.vercel.app](https://vercel.app)**.

---

## The 12 Domain-Specialist Agents

| Domain Pillar | Specialist Role Agent | Core Accountability & Focus Areas |
| :--- | :--- | :--- |
| **Delivery & Strategy** | **Delivery Management** | End-to-end delivery roadmaps, milestone governance, dependency & risk mitigation |
| **Delivery & Strategy** | **Programme Manager** | Multi-workstream alignment, executive reporting, benefits realization |
| **Delivery & Strategy** | **Management Consultant** | Operating model design, strategic transformation, executive advisory |
| **Agile & Scrum** | **Enterprise Agile Coach** | Scaled agile adoption, organizational agility, leadership coaching |
| **Agile & Scrum** | **Scrum Master** | Sprint ceremonies, empirical flow, team self-organization, impediment removal |
| **Product & Discovery** | **Product Manager** | Product vision, outcome metrics, go-to-market strategy, prioritization |
| **Product & Discovery** | **Product Owner** | Backlog refinement, user story slicing, value maximization, acceptance criteria |
| **Product & Discovery** | **Business Analyst** | Requirements engineering, process modelling, gap & impact analysis |
| **Product & Discovery** | **User Research** | Discovery interviews, usability synthesis, evidence-based user insights |
| **Cloud & Platform** | **DevOps Engineer** | CI/CD pipelines, infrastructure-as-code, release automation |
| **Cloud & Platform** | **Site Reliability Engineer (SRE)** | SLIs/SLOs, error budgets, incident response, chaos & resilience engineering |
| **Cloud & Platform** | **Platform Engineering** | Internal developer platforms (IDPs), golden paths, developer experience |

---

## Key Platform Capabilities

- **Dual-Mode Production RAG (19,712+ Knowledge Chunks):**
  - **Cloud Mode:** Queries a **Qdrant Cloud** vector cluster (`384-dim` cosine similarity) paired with serverless **Hugging Face Inference** (`sentence-transformers/all-MiniLM-L6-v2`) for sub-second retrieval under 80 MB RAM.
  - **Local Mode:** Seamless fallback to persistent **ChromaDB** + local `SentenceTransformers` for offline development.
  - **Privacy-Safe Citations:** Grounds every response with numbered context references (`Reference #1`, `Reference #2`) and framework attributions.
- **Glass-Box Real-Time Observability:**
  - **Server-Sent Events (SSE):** Progressive token-by-token streaming from FastAPI to the React Light Studio UI.
  - **Live Processing Log & Trace Events Drawers:** Real-time WebSocket + SSE telemetry tracking `trace.rag.retrieve`, `trace.agent.thought`, `trace.guardrail.evaluate`, `trace.critique.generate`, and `trace.validation.final`.
- **Automated Guardrails, Self-Critique & Live Evals:**
  - Every generated response is scored against configurable quality thresholds (`EVALUATION_THRESHOLD`), triggering self-correction loops when needed and displaying live `Eval` validation badges.
- **Interactive Mermaid.js Workflow Diagrams:**
  - Automatic syntax sanitization and rendering of `flowchart`, `sequenceDiagram`, `gantt`, and `stateDiagram` blocks inside a scrollable viewport with **`-` / `100%` / `+` / `Reset`** zoom controls.
- **Multi-Model Inference Routing:**
  - Supports **NVIDIA NIM** (`nvidia/nemotron-3.5-lightning-30b-a3b`, `meta/llama-3.3-70b-instruct`), **OpenAI-compatible**, and **Anthropic-compatible** endpoints, plus a deterministic key-free mock mode.

---

## Cloud & Local System Architecture

```mermaid
flowchart LR
    UI["React + Vite Light Studio UI\n(Vercel Global CDN)"] -->|POST /api/query/stream (SSE)| API["FastAPI Backend\n(Render Cloud)"]
    UI <-->|WSS /api/ws/logs & /trace| API
    API --> ORCH["Agent Orchestrator\n(12 Personas + Session Memory)"]
    ORCH --> RAG["Hybrid RAG Retriever\n(Qdrant Cloud / Local ChromaDB)"]
    RAG --> EMB["HF Inference API\n(all-MiniLM-L6-v2)"]
    ORCH --> LLM["Multi-Model LLM Client\n(NVIDIA NIM / OpenAI / Anthropic)"]
    ORCH --> EVAL["Guardrail, Critique &\nEval Validation Engine"]
```

---

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Marked, DOMPurify, Mermaid.js, Lucide Icons *(Deployed on **Vercel**)*
- **Backend:** Python 3.11+, FastAPI, Uvicorn, AsyncIO, HTTPX, Pydantic *(Deployed on **Render** with 24/7 **UptimeRobot** monitoring)*
- **AI & Vector Layer:** NVIDIA NIM, Hugging Face Inference API, Qdrant Cloud, ChromaDB, SentenceTransformers

---

## Project Structure

```text
ai-role-agents/
├── backend/
│   ├── agents/                 # BaseAgent, Orchestrator, and 12 specialist role definitions
│   ├── api/                    # FastAPI routes, SSE streaming, WebSocket trace/log bridges, memory
│   ├── config/                 # Environment-driven configuration & evaluation thresholds
│   ├── core/                   # Multi-provider LLM client, hybrid Qdrant/Chroma RAG, guardrails, evaluator
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Full local dependencies (includes ChromaDB & SentenceTransformers)
│   └── requirements-cloud.txt  # Lightweight cloud dependencies (< 80 MB RAM footprint)
├── frontend/
│   ├── src/
│   │   ├── hooks/              # Auto-reconnecting WebSocket hook for live logs & trace events
│   │   ├── services/           # REST & streaming API client
│   │   ├── utils/              # Markdown + Mermaid sanitizer, zoom toolbar, and log formatters
│   │   └── App.jsx             # Light Studio interface, Agent Gallery, and Conversation Thread
│   └── vite.config.js          # Dev server & non-buffering SSE proxy configuration
├── source-docs/                # Local domain reference documents (excluded from Git)
├── Dockerfile                  # Multi-stage production container build
├── start.sh                    # Container startup hydration script
└── README.md
```

---

## Quick Start (Local Development)

### Prerequisites
- **Python 3.11+**
- **Node.js 18+**
- An **NVIDIA NIM**, **OpenAI**, or **Anthropic**-compatible API key (or run with `LLM_PROVIDER=mock` for zero-key testing)

### 1. Configure Environment Variables

```bash
LLM_PROVIDER=openai
OPENAI_BASE_URL=https://nvidia.com
OPENAI_API_KEY=your_nvapi_key
LLM_MODEL=nvidia/nemotron-3.5-lightning-30b-a3b

# Optional: Enable Qdrant Cloud RAG in place of local ChromaDB
EMBEDDING_PROVIDER=nvidia_nim
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_api_key
HF_TOKEN=your_huggingface_read_token
```

### 2. Start the Backend (`http://localhost:8000`)

```bash
cd backend
pip install -r requirements.txt
python -X utf8 main.py
```

### 3. Start the Frontend (`http://localhost:5173`)

```bash
cd frontend
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser to interact with all 12 AI Role Agents.

---

## Extending the Platform

- **Ingest New Domain Knowledge:** Place `.pdf`, `.md`, `.txt`, or `.docx` documents into `source-docs/<role_key>/` and run the ingestion pipeline to index new chunks into ChromaDB or Qdrant Cloud.
- **Register a New Specialist Role Agent:**
  1. Add domain reference files under `source-docs/<new_role_key>/`.
  2. Define the persona's system prompt, boundaries, and metadata in `backend/agents/roles.py`.
  3. Register the icon, accent colour, and display title in `AGENT_META` inside `frontend/src/App.jsx`.

---

## License

MIT License — Copyright (c) 2026 **Mujeeb Mohammed**
