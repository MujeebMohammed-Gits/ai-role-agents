"""API dependencies (placeholder for future auth/db injection)."""

from __future__ import annotations


def get_orchestrator():
    """Reserved dependency injection point. Routes currently read the
    module-level orchestrator from api.routes for simplicity."""
    from api.routes import orchestrator
    return orchestrator
