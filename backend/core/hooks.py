"""Execution hooks.

Plugins that run around key execution points (before/after LLM calls,
before/after tool calls). Agents and the orchestrator register hooks so
cross-cutting concerns (logging, metrics, validation, audit) stay out of
the agent core.
"""

from __future__ import annotations

from typing import Any, Callable


class Hooks:
    def __init__(self) -> None:
        self.before_llm: list[Callable] = []
        self.after_llm: list[Callable] = []
        self.before_tool: list[Callable] = []
        self.after_tool: list[Callable] = []
        self.before_response: list[Callable] = []
        self.after_response: list[Callable] = []

    def register(self, hook_type: str, fn: Callable) -> None:
        target = getattr(self, hook_type, None)
        if target is None:
            raise ValueError(f"Unknown hook type: {hook_type}")
        target.append(fn)

    async def run(self, hook_type: str, *args: Any, **kwargs: Any) -> None:
        for fn in getattr(self, hook_type, []):
            if asyncio.iscoroutinefunction(fn):
                await fn(*args, **kwargs)
            else:
                fn(*args, **kwargs)


import asyncio  # noqa: E402  (kept at bottom to avoid import-order lint noise)
