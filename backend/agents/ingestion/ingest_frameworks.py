"""Ingestion worker: loads documents from backend/data/source_docs/.

Supports .pdf, .md, .txt files. Uses recursive character text splitting
(chunk size: 1000 chars, overlap: 200 chars) to preserve contextual
boundaries, then embeds chunks into ChromaDB with rich metadata
(source filename, timestamp, and target role mapping).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from config.logging import get_logger
from config.settings import settings
from core.rag import RAGContext

logger = get_logger("ingestion.frameworks")

SOURCE_DOCS_DIR = Path(__file__).resolve().parents[2] / "data" / "source_docs"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Map source filename keywords to target roles for metadata enrichment.
_ROLE_KEYWORDS: dict[str, list[str]] = {
    "product_owner": [
        "product owner", "user stories", "product management", "product manager",
        "inspired", "lean startup", "hooked", "product manager interview",
    ],
    "business_analyst": [
        "babok", "business analyst", "requirements", "bdd", "gherkin",
    ],
    "user_research": [
        "user research", "continuous discovery", "opportunity solution",
    ],
    "devops_engineer": [
        "devops", "dora", "platform eng", "platform engineering",
    ],
    "sre": [
        "site reliability", "sre", "error budget", "google sre",
    ],
    "scrum_master": [
        "scrum master", "scrum", "agile coaching",
    ],
    "product_manager": [
        "product manager", "product management", "inspired", "hook", "lean startup",
    ],
    "delivery_management": [
        "delivery", "program", "portfolio", "agile portfolio",
    ],
    "enterprise_agile_coach": [
        "enterprise", "agile coaching", "coaching",
    ],
    "platform_engineering": [
        "platform", "dora", "team topology",
    ],
    "programme_manager": [
        "programme", "program", "agile portfolio",
    ],
    "management_consultant": [
        "management consultant", "mece", "mckinsey", "wardley", "porter",
    ],
}


def _extract_pdf_text(file_path: Path) -> str:
    """Extract text from a PDF file using pypdf."""
    try:
        from pypdf import PdfReader  # type: ignore
    except ImportError as exc:
        raise ImportError(
            "pypdf is required to ingest PDF files. Install it with: pip install pypdf"
        ) from exc

    reader = PdfReader(str(file_path))
    text_parts: list[str] = []
    for page in reader.pages:
        try:
            extracted = page.extract_text() or ""
            text_parts.append(extracted)
        except Exception:
            continue
    return "\n".join(text_parts)


def _extract_text_file(file_path: Path) -> str:
    """Extract text from a .md or .txt file."""
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return file_path.read_text(encoding="latin-1")


def _extract_text(file_path: Path) -> str:
    """Extract text from a supported file type (.pdf, .md, .txt)."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_text(file_path)
    if suffix in (".md", ".txt"):
        return _extract_text_file(file_path)
    logger.warning("Unsupported file type: %s", file_path)
    return ""


def _recursive_split(
    text: str, chunk_size: int = CHUNK_SIZE, chunk_overlap: int = CHUNK_OVERLAP
) -> list[str]:
    """Split text into overlapping chunks using recursive character splitting.

    Tries paragraph, sentence, word, and character boundaries in order
    to preserve contextual boundaries.
    """
    if not text or not text.strip():
        return []

    separators = ["\n\n", "\n", ". ", "? ", "! ", " ", ""]

    def _split_recursive(txt: str, seps: list[str]) -> list[str]:
        if not seps:
            return [txt]

        sep = seps[0]
        remaining = seps[1:]

        if sep == "":
            # Character-level split
            chunks: list[str] = []
            step = max(chunk_size - chunk_overlap, 1)
            for i in range(0, len(txt), step):
                chunk = txt[i : i + chunk_size]
                if chunk:
                    chunks.append(chunk)
            return chunks

        parts = txt.split(sep)
        chunks: list[str] = []
        current = ""

        for part in parts:
            candidate = current + sep + part if current else part
            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                if len(part) > chunk_size:
                    chunks.extend(_split_recursive(part, remaining))
                current = part

        if current:
            chunks.append(current)

        return chunks

    return _split_recursive(text, separators)


def _map_role(source_name: str) -> str:
    """Map a source filename to a target role based on keyword matching."""
    name_lower = source_name.lower()
    for role, keywords in _ROLE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in name_lower:
                return role
    return "general"


def ingest_foundational_frameworks() -> list[tuple[str, str]]:
    """Load all supported documents from backend/data/source_docs/.

    Returns a list of (source, text) document tuples for backward
    compatibility with the orchestrator's seed_rag() method.
    """
    documents: list[tuple[str, str]] = []

    if not SOURCE_DOCS_DIR.exists():
        logger.warning("Source docs directory not found: %s", SOURCE_DOCS_DIR)
        return documents

    for file_path in sorted(SOURCE_DOCS_DIR.iterdir()):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in (".pdf", ".md", ".txt"):
            continue

        try:
            text = _extract_text(file_path)
            if text and text.strip():
                documents.append((file_path.name, text))
                logger.info("Loaded %s (%d chars)", file_path.name, len(text))
            else:
                logger.warning("No text extracted from %s", file_path.name)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to load %s: %s", file_path.name, exc)

    return documents


async def ingest_and_embed() -> dict:
    """Load documents from source_docs, chunk them, and embed into ChromaDB.

    Uses recursive character text splitting (1000 chars, 200 overlap) and
    stores each chunk with rich metadata: source filename, timestamp,
    and target role mapping.

    Returns a summary dict with files_processed, total_chunks,
    chunks_embedded, and errors.
    """
    rag = RAGContext(
        enabled=settings.rag_enabled,
        top_k=settings.rag_top_k,
    )

    documents = ingest_foundational_frameworks()

    total_files = len(documents)
    total_chunks = 0
    total_embedded = 0
    errors: list[str] = []

    for source, text in documents:
        try:
            chunks = _recursive_split(text, CHUNK_SIZE, CHUNK_OVERLAP)
            total_chunks += len(chunks)

            timestamp = datetime.now(timezone.utc).isoformat()
            role = _map_role(source)

            for i, chunk in enumerate(chunks):
                chunk_id = (
                    f"{source}::{i}::"
                    f"{hashlib.sha256(chunk.encode()).hexdigest()[:8]}"
                )
                metadata = {
                    "source": source,
                    "source_file": source,
                    "timestamp": timestamp,
                    "target_role": role,
                    "chunk_index": i,
                    "total_chunks": len(chunks),
                }

                try:
                    did = await rag.add(
                        text=chunk,
                        source=source,
                        doc_id=chunk_id,
                        metadata=metadata,
                    )
                    total_embedded += 1
                    logger.debug("Embedded chunk %d of %s as %s", i, source, did)
                except Exception as exc:  # noqa: BLE001
                    logger.exception(
                        "Failed to embed chunk %d of %s: %s", i, source, exc
                    )
                    errors.append(f"{source} chunk {i}: {exc}")

        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to process %s: %s", source, exc)
            errors.append(f"{source}: {exc}")

    return {
        "files_processed": total_files,
        "total_chunks": total_chunks,
        "chunks_embedded": total_embedded,
        "errors": errors,
    }
