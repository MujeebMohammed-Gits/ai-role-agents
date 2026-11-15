# Backend — Role Agents Mesh

Always-on, live multi-agent system (12 roles) built with Python, FastAPI, and asyncio.

## Structure
```
backend/
  main.py            # Orchestrator entry point; spins up all agents + FastAPI
  config/            # settings, logging
  core/              # event bus, blackboard, memory, RAG, hooks, evaluation, validation, LLM client
  agents/            # base agent, orchestrator, registry, role prompts
  agents/prompts/    # one system-prompt .md per role
  api/               # FastAPI routes (REST + WebSocket logs)
  requirements.txt
```

## Run

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # optional; mock mode runs out of the box
python main.py
```

API docs: http://localhost:8000/docs

The mesh runs in **mock LLM mode** by default — no API keys required. To use a real provider,
set `LLM_PROVIDER=openai` or `LLM_PROVIDER=anthropic` plus the corresponding API key in `.env`.

## Roles
delivery_management, enterprise_agile_coach, scrum_master, product_manager,
product_owner, business_analyst, user_research, devops_engineer, sre,
platform_engineering, programme_manager, management_consultant

Each role loads its own system prompt from `agents/prompts/<role>.md`.
