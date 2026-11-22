"""Application configuration for the production-grade multi-agent mesh.

Adds vector-store, embedding-pipeline, self-evaluation threshold, guardrail,
and trace-streaming configuration on top of the base settings.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import List


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes", "on")


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, str(default)))
    except (TypeError, ValueError):
        return default


@dataclass
class Settings:
    # Server
    host: str = field(default_factory=lambda: _env("HOST", "0.0.0.0"))
    port: int = field(default_factory=lambda: _env_int("PORT", 8000))
    debug: bool = field(default_factory=lambda: _env_bool("DEBUG", False))

    # Agent roles (the full mesh)
    agent_roles: List[str] = field(default_factory=lambda: [
        "delivery_management",
        "enterprise_agile_coach",
        "scrum_master",
        "product_manager",
        "product_owner",
        "business_analyst",
        "user_research",
        "devops_engineer",
        "sre",
        "platform_engineering",
        "programme_manager",
        "management_consultant",
    ])

    # LLM
    llm_provider: str = field(default_factory=lambda: _env("LLM_PROVIDER", "openai"))
    llm_model: str = field(default_factory=lambda: _env("LLM_MODEL", "mock-agent"))
    openai_api_key: str = field(default_factory=lambda: _env("OPENAI_API_KEY", ""))
    anthropic_api_key: str = field(default_factory=lambda: _env("ANTHROPIC_API_KEY", ""))

    # RAG / vector store
    rag_enabled: bool = field(default_factory=lambda: _env_bool("RAG_ENABLED", True))
    rag_top_k: int = field(default_factory=lambda: _env_int("RAG_TOP_K", 6))
    vector_db_provider: str = field(default_factory=lambda: _env("VECTOR_DB_PROVIDER", "chromadb"))
    chroma_persist_dir: str = field(default_factory=lambda: _env("CHROMA_PERSIST_DIR", "./data/chroma"))
    chroma_collection: str = field(default_factory=lambda: _env("CHROMA_COLLECTION", "role_agents_knowledge"))

    # Embedding pipeline (nvidia_nim | sentence_transformers | mock)
    embedding_provider: str = field(default_factory=lambda: _env("EMBEDDING_PROVIDER", "sentence_transformers"))
    nvidia_nim_base_url: str = field(default_factory=lambda: _env("NVIDIA_NIM_BASE_URL", ""))
    nvidia_nim_api_key: str = field(default_factory=lambda: _env("NVIDIA_NIM_API_KEY", ""))
    nvidia_nim_embedding_model: str = field(default_factory=lambda: _env(
        "NVIDIA_NIM_EMBEDDING_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct"))
    hf_embedding_model: str = field(default_factory=lambda: _env(
        "HF_EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"))

    # Self-evaluation / self-improvement
    evaluation_threshold: float = field(default_factory=lambda: _env_float("EVALUATION_THRESHOLD", 0.88))
    max_self_correction_loops: int = field(default_factory=lambda: _env_int("MAX_SELF_CORRECTION_LOOPS", 1))
    guardrails_enabled: bool = field(default_factory=lambda: _env_bool("GUARDRAILS_ENABLED", True))
    trace_streaming_enabled: bool = field(default_factory=lambda: _env_bool("TRACE_STREAMING_ENABLED", True))

    # Event bus / blackboard
    max_event_history: int = field(default_factory=lambda: _env_int("MAX_EVENT_HISTORY", 10000))

    # Memory
    memory_max_messages: int = field(default_factory=lambda: _env_int("MEMORY_MAX_MESSAGES", 200))

    # Frontend origin (CORS)
    frontend_origin: str = field(default_factory=lambda: _env("FRONTEND_ORIGIN", "*"))

    @classmethod
    def load(cls) -> "Settings":
        return cls()


settings = Settings.load()
