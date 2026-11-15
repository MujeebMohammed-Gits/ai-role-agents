"""FastAPI application factory with CORS and lifespan hooks."""

from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Callable, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, _bind
from config.settings import settings


def create_app(
    on_startup: Optional[Callable] = None,
    on_shutdown: Optional[Callable] = None,
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if on_startup:
            result = on_startup()
            if asyncio.iscoroutine(result):
                await result
        yield
        if on_shutdown:
            result = on_shutdown()
            if asyncio.iscoroutine(result):
                await result

    import asyncio  # noqa: WPS433

    app = FastAPI(
        title="Role Agents Mesh",
        version="1.0.0",
        description="Always-on, live multi-agent system: 12 roles, event bus, RAG, self-evaluation.",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.frontend_origin] if settings.frontend_origin != "*" else ["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(router)

    # Bind the orchestrator instance into routes once it's created.
    original_start = on_startup

    async def _bound_start():
        if original_start:
            result = original_start()
            if asyncio.iscoroutine(result):
                await result
        # Routes reference the module-level orchestrator set in main.py.

    return app


# Keep `_bind` importable for main.py.
__all__ = ["create_app", "_bind"]
