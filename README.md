<div align="center">

# AI Role Agents

**An Enterprise Multi-Agent AI Advisory Platform with Grounded RAG, Real-Time Glass-Box Observability, Automated Evals, and Interactive Workflow Diagrams**

<br/>

[![Live Demo](https://img.shields.io/badge/live%20demo-vercel-black?logo=vercel)](https://ai-role-agents.vercel.app)
[![Backend API](https://img.shields.io/badge/backend-FastAPI-009688)](https://onrender.com)
[![Vector DB](https://img.shields.io/badge/vector%20DB-Qdrant-252945)](https://qdrant.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)]

<br/>

Built by **Mujeeb Mohammed** • [Try the Live Platform](https://ai-role-agents.vercel.app) • [GitHub Repository](https://github.com)

</div>

---

## Portal Preview & End-to-End Walkthrough

<div align="center">

![AI Role Agents Portal — All 12 Specialist Agents & Live Response](assets/portal-snapshot.png)

<br/><br/>

<!--
  assets/ is listed in .gitignore and is NOT committed to GitHub.
  To render these files inline on GitHub, drag and drop
  portal-snapshot.png and ai-role-agents-Coach-journey.mp4 into GitHub's
  web editor for README.md. GitHub replaces the local paths with
  https://github.com/user-attachments/assets/... CDN links, so both
  the snapshot and the walkthrough video render inline without
  committing assets/ to the repository.
-->

<br/>

<a href="assets/ai-role-agents-Coach-journey.mp4">
  <img src="assets/portal-snapshot.png" alt="AI Role Agents — End-to-End Walkthrough Preview" width="460" />
</a>

<p><b>Watch the full AI-narrated walkthrough:</b>
  <a href="assets/ai-role-agents-Coach-journey.mp4">ai-role-agents-Coach-journey.mp4</a> (≈1 min 12 s, edge-tts voiceover)
</p>

</div>

<br />

<div align="center">

| Chapter | Time | Scene |
|:--------|-----:|:------|
| Scene 1 — Portal Overview & 12 Specialist Role Agents | 0:00 | Light Studio gallery, top-bar controls |
| Scene 2 — Enterprise Agile Coach: end-to-end workflow | 0:19 | Healthcare Digital Transformation pilot, SSE streaming, Trace Events & Live Log |
| Scene 3 — Mermaid diagrams & Eval 90+ guardrails | 0:37 | Zoom controls, quality badge, Context drawer, official videos |
| Scene 4 — Vector PDF export & session protection | 0:53 | Download PDF export, save-before-switch confirmation |

</div>

The narrated walkthrough tours the live AI Role Agents portal — the 12 Specialist Role Agents gallery, the top-bar **Download PDF**, **Live Log**, and **Trace Events** drawers — and runs an end-to-end workflow using the **Enterprise Agile Coach** agent with the prompt "Design a 2-week Healthcare Digital Transformation pilot sprint plan with workflows and metrics". It captures real-time SSE token streaming, multi-source RAG context retrieval, interactive Mermaid workflow-diagram zooming, the `Eval 90+ (valid)` quality badge, and a branded vector PDF export.

---

## Why AI Role Agents?

Generic AI assistants rely on one-size-fits-all system prompts that lack domain boundaries, verifiable citations, or quality controls. **AI Role Agents** solves this by orchestrating **12 specialized enterprise personas**—each grounded in **19,712 indexed domain knowledge chunks**, governed by automated guardrails and self-critique evaluations, and streamed live with full event-level telemetry.

> **Live Production Deployment:** Experience all 12 specialist agents instantly at **[ai-role-agents.vercel.app](https://ai-role-agents.vercel.app)**.

---

## Key Platform Capabilities

- **Multi-Source Production RAG & Pre-Generation Context Evaluation:** Combines **Qdrant Cloud** (`19,712+` 384-dim vectors + FastEmbed `all-MiniLM-L6-v2`) / local **ChromaDB**, live **OpenAlex** peer-reviewed academic journals, authoritative organizational articles, and **oEmbed + `playableInEmbed:true` verified Official Organizational Videos** (Scrum.org, Scaled Agile/SAFe, CNCF, USENIX, IIBA, Nielsen Norman Group, Atlassian, Google Cloud Tech, NVIDIA, GOTO, Microsoft Developer), filtered and ranked by `SelfEvaluator.filter_and_rank_context` before generation.
- **Continuous Completion & `Eval > 87` (`valid`) Quality Gate:** Automated 5-stage evaluation (`relevance`, `grounding`, `completeness`, `formatting`, `role_compliance`), query-keyword analysis, raw citation artifact sanitization, and structured next-step follow-up recommendations.
- **Production-Ready Vector PDF Export & Session Guard:** Top-bar **Download PDF** button (enabled whenever an active agent conversation exists) generating 100% selectable native `jsPDF` + `autoTable` vector PDFs with high-DPI Mermaid diagrams, branded header/footer (`AI Role Agents portal`, `Page X of Y`, *`AI Role Agents built by Mujeeb Mohammed`*), soft `"AI Role Agents"` background watermark, and a confirmation prompt before switching agents or refreshing an active chat.
- **Production-Only Multi-Model Inference Routing:** Real-time **NVIDIA NIM** (`https://integrate.api.nvidia.com/v1` with automatic `/v1/models` live model discovery fallback), **OpenAI-compatible**, and **Anthropic-compatible** routing (synthetic mock fallbacks removed in production).
- **Glass-Box Real-Time Observability:** Server-Sent Events (SSE) progressive token-by-token streaming from FastAPI to the React Light Studio UI, plus Live Processing Log & Trace Events drawers tracking `trace.rag.retrieve`, `trace.agent.thought`, `trace.guardrail.evaluate`, `trace.critique.generate`, and `trace.validation.final`.
- **Interactive Mermaid.js Workflow Diagrams:** Automatic syntax sanitization and rendering of `flowchart`, `sequenceDiagram`, `gantt`, and `stateDiagram` blocks inside a scrollable viewport with `-` / `100%` / `+` / `Reset` zoom controls.
- **Privacy-Safe Citations:** Every response is grounded with numbered context references (`Reference #1`, `Reference #2`) and framework attributions.

---

## Cloud & Local System Architecture

```mermaid
flowchart LR
    UI["React + Vite Light Studio UI<br/>(Vercel Global CDN)"] -->|"POST /api/query/stream (SSE)"| API["FastAPI Backend<br/>(Render Cloud)"]
    UI <-->|"WSS /api/ws/logs & /trace"| API
    API --> ORCH["Agent Orchestrator<br/>(12 Personas + Session Memory)"]
    ORCH --> RAG["Hybrid RAG Retriever<br/>(Qdrant Cloud / Local ChromaDB)"]
    RAG --> EMB["HF Inference API<br/>(all-MiniLM-L6-v2)"]
    ORCH --> LLM["Multi-Model LLM Client<br/>(NVIDIA NIM / OpenAI / Anthropic)"]
    ORCH --> EVAL["Guardrail, Critique &<br/>Eval Validation Engine"]
```

---

## Project Structure

```text
ai-role-agents/
├── backend/
│   ├── agents/                 # BaseAgent, Orchestrator, and 12 specialist role definitions
│   ├── api/                    # FastAPI routes, SSE streaming, WebSocket trace/log bridges, memory
│   ├── config/                 # Environment-driven configuration & evaluation thresholds
│   ├── core/                   # Multi-provider LLM client, hybrid Qdrant/Chroma RAG, guardrails, evaluator, web_research.py
│   ├── main.py                 # FastAPI application entry point
│   ├── requirements.txt        # Full local dependencies (includes ChromaDB & SentenceTransformers)
│   └── requirements-cloud.txt  # Lightweight cloud dependencies (< 80 MB RAM footprint)
├── frontend/
│   ├── src/
│   │   ├── hooks/              # Auto-reconnecting WebSocket hook for live logs & trace events
│   │   ├── services/           # REST & streaming API client, exportChatPdf.js vector PDF export
│   │   ├── utils/              # Markdown + Mermaid sanitizer, zoom toolbar, and log formatters
│   │   └── App.jsx             # Light Studio interface, Agent Gallery, and Conversation Thread
│   └── vite.config.js          # Dev server & non-buffering SSE proxy configuration
├── assets/                     # portal-snapshot.png, ai-role-agents-Coach-journey.mp4 (excluded from Git via .gitignore)
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
LLM_PROVIDER=nvidia
OPENAI_BASE_URL=https://integrate.api.nvidia.com/v1
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

MIT License

Copyright (c) 2026 Mujeeb Mohammed

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
