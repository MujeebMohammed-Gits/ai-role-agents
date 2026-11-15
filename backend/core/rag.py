"""Production RAG-enabled context lookup.

Vector store backed by ChromaDB (local persistent, Docker-ready) with an
embedding pipeline that supports NVIDIA NIM, HuggingFace sentence-transformers,
or a deterministic mock fallback so the mesh runs without API keys.

Every retrieval emits a ``trace.rag.retrieve`` event carrying the vector
search distance/similarity score for live frontend tracking.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import re
import uuid
from dataclasses import dataclass, field
from typing import Optional

from config.logging import get_logger
from config.settings import settings
from core.trace import TraceEmitter

logger = get_logger("core.rag")


@dataclass
class Document:
    id: str
    text: str
    source: str
    metadata: dict = field(default_factory=dict)


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(x * x for x in b)) or 1.0
    return dot / (na * nb)


class EmbeddingProvider:
    """Abstract embedding provider."""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError


class NVIDIANIMEmbeddingProvider(EmbeddingProvider):
    """Embeddings via NVIDIA NIM embedding endpoint."""

    def __init__(self, base_url: str, api_key: str, model: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        import httpx  # type: ignore

        vectors: list[list[float]] = []
        async with httpx.AsyncClient(timeout=60.0) as client:
            for text in texts:
                resp = await client.post(
                    f"{self._base_url}/embeddings",
                    headers={"Authorization": f"Bearer {self._api_key}",
                             "Content-Type": "application/json"},
                    json={"input": text, "model": self._model},
                )
                resp.raise_for_status()
                data = resp.json().get("data", [])
                if not data or "embedding" not in data[0]:
                    raise ValueError("NVIDIA NIM embedding response missing embedding vector")
                vectors.append([float(v) for v in data[0]["embedding"]])
        return vectors


class SentenceTransformersEmbeddingProvider(EmbeddingProvider):
    """Local HuggingFace sentence-transformers embeddings."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model: Optional[object] = None

    def _load(self) -> object:
        if self._model is None:
            from sentence_transformers import SentenceTransformer  # type: ignore
            self._model = SentenceTransformer(self._model_name)
        return self._model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        model = self._load()
        loop = asyncio.get_running_loop()
        embeddings = await loop.run_in_executor(None, model.encode, texts)
        return [[float(v) for v in vec] for vec in embeddings]


class MockEmbeddingProvider(EmbeddingProvider):
    """Deterministic, key-free embedding fallback."""

    async def embed(self, texts: list[str]) -> list[list[float]]:
        import random
        vectors: list[list[float]] = []
        for text in texts:
            seed = int(hashlib.sha256(text.encode()).hexdigest()[:8], 16)
            rng = random.Random(seed)
            vectors.append([rng.uniform(-1.0, 1.0) for _ in range(384)])
        return vectors


def build_embedding_provider() -> EmbeddingProvider:
    provider = (settings.embedding_provider or "sentence_transformers").lower()
    if provider == "nvidia_nim":
        if not settings.nvidia_nim_api_key or not settings.nvidia_nim_base_url:
            logger.warning(
                "NVIDIA NIM embedding requested but API key/base URL missing; "
                "falling back to sentence-transformers"
            )
            return SentenceTransformersEmbeddingProvider(settings.hf_embedding_model)
        return NVIDIANIMEmbeddingProvider(
            settings.nvidia_nim_base_url,
            settings.nvidia_nim_api_key,
            settings.nvidia_nim_embedding_model,
        )
    if provider == "sentence_transformers":
        return SentenceTransformersEmbeddingProvider(settings.hf_embedding_model)
    return MockEmbeddingProvider()


class RAGContext:
    def __init__(self, enabled: bool = True, top_k: int = 5,
                 collection: Optional[str] = None) -> None:
        self.enabled = enabled
        self.top_k = top_k
        self.collection_name = collection or settings.chroma_collection
        self._provider: Optional[EmbeddingProvider] = None
        self._client: Optional[object] = None
        self._collection: Optional[object] = None
        self._initialized = False

    def _provider_instance(self) -> EmbeddingProvider:
        if self._provider is None:
            self._provider = build_embedding_provider()
        return self._provider

    def _lazy_init(self) -> None:
        if self._initialized:
            return
        self._initialized = True
        if not self.enabled:
            return
        try:
            import chromadb  # type: ignore
        except Exception as exc:  # noqa: BLE001
            logger.warning("chromadb not installed (%s); RAG disabled", exc)
            self.enabled = False
            return
        try:
            self._client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
            self._collection = self._client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info("ChromaDB collection '%s' ready at %s",
                        self.collection_name, settings.chroma_persist_dir)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to initialize ChromaDB: %s", exc)
            self.enabled = False

    async def _embed_texts(self, texts: list[str]) -> list[list[float]]:
        return await self._provider_instance().embed(texts)

    # ------------------------------------------------------------------ warm-up

    async def warm_up(self) -> None:
        """Pre-warm the embedding model and ChromaDB client during startup
        so the first user query does not pay the cold-start cost."""
        if not self.enabled:
            return
        # Pre-load the embedding model (heavy I/O, run off the event loop).
        try:
            provider = self._provider_instance()
            if hasattr(provider, "_load"):
                await asyncio.to_thread(provider._load)
                logger.info("Embedding model pre-warmed during startup")
        except Exception:  # noqa: BLE001
            logger.exception("Failed to pre-warm embedding model")
        # Pre-initialize ChromaDB client + collection only if the store
        # already exists; otherwise let seed_rag() create it on first run.
        import os
        if not os.path.exists(settings.chroma_persist_dir):
            logger.info("ChromaDB store not yet present; deferring initialization to seed_rag()")
        else:
            try:
                await asyncio.to_thread(self._lazy_init)
            except Exception:  # noqa: BLE001
                logger.exception("Failed to pre-warm ChromaDB client")

    # ------------------------------------------------------------------ writes

    async def add(self, text: str, source: str, doc_id: Optional[str] = None,
                  metadata: dict | None = None) -> str:
        did = doc_id or str(uuid.uuid4())
        self._lazy_init()
        embedding: Optional[list[float]] = None
        if self.enabled and self._collection is not None:
            try:
                embedding = (await self._embed_texts([text]))[0]
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed to embed document: %s", exc)
            try:
                self._collection.add(
                    documents=[text],
                    metadatas=[{**(metadata or {}), "source": source}],
                    ids=[did],
                    embeddings=[embedding] if embedding is not None else None,
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed to add document to ChromaDB: %s", exc)
        return did

    async def add_texts(self, texts: list[tuple[str, str]],
                        metadata: dict | None = None) -> list[str]:
        ids: list[str] = []
        for source, text in texts:
            ids.append(await self.add(text, source, metadata=metadata))
        return ids

    # ------------------------------------------------------------------ reads

    async def retrieve(self, query: str, top_k: Optional[int] = None,
                       emitter: Optional[TraceEmitter] = None) -> list[dict]:
        if not self.enabled:
            return []
        self._lazy_init()
        k = top_k or self.top_k
        if self._collection is None:
            return []
        try:
            query_embedding = (await self._embed_texts([query]))[0]
            count = self._collection.count()
            n_results = min(k, count) if count else k
            if n_results <= 0:
                return []
            results = self._collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
            )
            docs: list[dict] = []
            ids = results.get("ids", [[]])[0] if results.get("ids") else []
            distances = results.get("distances", [[]])[0] if results.get("distances") else []
            metadatas = results.get("metadatas", [[]])[0] if results.get("metadatas") else []
            documents = results.get("documents", [[]])[0] if results.get("documents") else []
            best_distance = None
            for i, doc_id in enumerate(ids):
                dist = float(distances[i]) if i < len(distances) else 1.0
                if best_distance is None or dist < best_distance:
                    best_distance = dist
                # ChromaDB cosine distance: 0 = identical, 2 = opposite.
                similarity = max(0.0, min(1.0, 1.0 - dist / 2.0))
                docs.append({
                    "id": doc_id,
                    "text": documents[i] if i < len(documents) else "",
                    "source": (metadatas[i] or {}).get("source", "") if i < len(metadatas) else "",
                    "score": round(similarity, 4),
                    "distance": round(dist, 4),
                    "metadata": metadatas[i] if i < len(metadatas) else {},
                })
            docs.sort(key=lambda d: d["score"], reverse=True)
            if emitter is not None:
                await emitter.rag_retrieve(
                    score=(1.0 - (best_distance or 0.0) / 2.0) if best_distance is not None else None,
                    data={"query": query, "top_k": k, "returned": len(docs)},
                )
            return docs[:k]
        except Exception as exc:  # noqa: BLE001
            logger.exception("RAG retrieve failed: %s", exc)
            if emitter is not None:
                await emitter.rag_retrieve(score=None, data={"query": query, "error": str(exc)})
            return []
