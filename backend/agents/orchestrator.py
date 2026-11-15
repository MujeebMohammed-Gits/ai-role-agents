"""Orchestrator.

Creates one agent per role, loads each role's system prompt, builds the
shared infrastructure (event bus, blackboard, memory, RAG, hooks,
evaluation), and runs all agents concurrently as an always-on mesh.

Wires the production-grade ingestion worker and seeds the RAG index with
foundational industry frameworks on startup.
"""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

from agents.base import BaseAgent
from agents.ingestion.ingest_frameworks import ingest_foundational_frameworks
from agents.roles import BASE_SYSTEM_PROMPT
from core.blackboard import Blackboard
from core.event_bus import EventBus
from core.evaluation import SelfEvaluator
from core.hooks import Hooks
from core.llm_client import build_client
from core.memory import ConversationMemory
from core.rag import RAGContext

from config.logging import get_logger
from config.settings import settings

logger = get_logger("orchestrator")

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "agents" / "prompts"


def _load_prompt(role: str) -> str:
    path = PROMPTS_DIR / f"{role}.md"
    if path.exists():
        role_prompt = path.read_text(encoding="utf-8")
    else:
        fallback = Path(__file__).resolve().parent / "prompts" / f"{role}.md"
        if fallback.exists():
            role_prompt = fallback.read_text(encoding="utf-8")
        else:
            role_prompt = f"You are a helpful {role.replace('_', ' ')} agent."
    return BASE_SYSTEM_PROMPT + "\n\n---\n\n" + role_prompt


class Orchestrator:
    def __init__(self) -> None:
        self.event_bus = EventBus(max_history=settings.max_event_history)
        self.blackboard = Blackboard()
        self.memory = ConversationMemory(max_messages=settings.memory_max_messages)
        self.rag = RAGContext(enabled=settings.rag_enabled, top_k=settings.rag_top_k)
        self.evaluator = SelfEvaluator()
        self.hooks = Hooks()
        self.llm = build_client(
            settings.llm_provider,
            settings.llm_model,
            openai_api_key=settings.openai_api_key,
            anthropic_api_key=settings.anthropic_api_key,
        )
        self._agents: dict[str, BaseAgent] = {}
        self._tasks: list[asyncio.Task] = []
        self._running = False

    # ------------------------------------------------------------------ setup

    def register_roles(self, roles: list[str] | None = None) -> None:
        roles = roles or settings.agent_roles
        for role in roles:
            name = role.replace("_", " ").title()
            prompt = _load_prompt(role)
            agent = BaseAgent(
                role=role,
                name=name,
                system_prompt=prompt,
                event_bus=self.event_bus,
                blackboard=self.blackboard,
                memory=self.memory,
                rag=self.rag,
                evaluator=self.evaluator,
                hooks=self.hooks,
                llm=self.llm,
            )
            self._agents[role] = agent
            logger.info("Registered agent: %s (%s)", name, role)

    def register_agent(self, role: str, agent: BaseAgent) -> None:
        self._agents[role] = agent

    def get_agent(self, role: str) -> Optional[BaseAgent]:
        return self._agents.get(role)

    @property
    def agents(self) -> dict[str, BaseAgent]:
        return dict(self._agents)

    async def seed_rag(self) -> None:
    import os
    if os.environ.get("QDRANT_URL"):
        return 0
        """Seed the RAG index only if ChromaDB has not been populated on disk yet."""
        import os
        if os.path.exists("./data/chroma/chroma.sqlite3"):
            logger.info("ChromaDB already exists at ./data/chroma/chroma.sqlite3 ? skipping startup PDF re-ingestion")
            return
        docs = await asyncio.to_thread(ingest_foundational_frameworks)
        await self.rag.add_texts(docs)
        logger.info("Seeded RAG with %d foundational framework documents", len(docs))

    # ------------------------------------------------------------------ lifecycle

    async def start(self) -> None:
        self._running = True
        for agent in self._agents.values():
            await agent.start()
        # Pre-warm RAG (embedding model + ChromaDB client) off the event loop
        # so the first query does not pay the cold-start cost.
        await self.rag.warm_up()
        # Seed RAG as a background task so the lifespan completes quickly and
        # Uvicorn can bind to port 8000 and accept connections without waiting
        # for document ingestion. /api/agents does not depend on RAG.
        asyncio.create_task(self.seed_rag())
        logger.info("Orchestrator started %d agents (RAG pre-warmed, seeding in background)", len(self._agents))

    async def stop(self) -> None:
        for agent in list(self._agents.values()):
            await agent.stop()
        self._running = False
        logger.info("Orchestrator stopped")

    @property
    def is_running(self) -> bool:
        return self._running

    # ------------------------------------------------------------------ query routing

    async def route_query(self, role: str, query: str, session_id: str,
                          user_id: str = "user") -> dict:
        agent = self._agents.get(role)
        if not agent:
            raise ValueError(f"Unknown agent role: {role}")
        return await agent.handle_query(query, session_id, user_id=user_id)

    async def broadcast(self, query: str, session_id: str,
                        user_id: str = "user") -> dict[str, dict]:
        """Send the same query to every agent and collect results."""
        results: dict[str, dict] = {}
        for role, agent in self._agents.items():
            try:
                results[role] = await agent.handle_query(query, session_id, user_id=user_id)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Broadcast to %s failed: %s", role, exc)
                results[role] = {"role": role, "error": str(exc)}
        return results