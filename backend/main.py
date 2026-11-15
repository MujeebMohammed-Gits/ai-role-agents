"""Main orchestration script.

Spins up all 12 role agents concurrently as an always-on mesh and
serves the FastAPI API (REST + WebSocket log streaming).

Run:
    python main.py
"""

from __future__ import annotations

import asyncio
import uvicorn

from agents.orchestrator import Orchestrator
from api.app import create_app
from api.routes import _bind
from config.logging import setup_logging, get_logger
from config.settings import settings

logger = get_logger("main")

# ---------------------------------------------------------------------------
# Shared, always-on mesh (started once at import so uvicorn workers see it).
# ---------------------------------------------------------------------------

orchestrator: Orchestrator | None = None


async def start_mesh() -> None:
    global orchestrator
    if orchestrator is not None:
        return
    try:
        orchestrator = Orchestrator()
        orchestrator.register_roles()
        await orchestrator.start()
        _bind(orchestrator)
        logger.info("Multi-agent mesh is always-on with %d agents", len(orchestrator.agents))
    except Exception as exc:
        logger.exception("Failed to start agent mesh: %s", exc)
        orchestrator = None


async def stop_mesh() -> None:
    global orchestrator
    if orchestrator is not None:
        await orchestrator.stop()
        orchestrator = None


# Build the FastAPI app with lifespan hooks that start/stop the mesh.
app = create_app(start_mesh, stop_mesh)

if __name__ == "__main__":
    setup_logging("DEBUG" if settings.debug else "INFO")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info",
    )
