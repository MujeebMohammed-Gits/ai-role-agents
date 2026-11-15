"""Shared memory blackboard.

A scratchpad all agents can read/write to coordinate state without
passing every message through the event bus.
"""

from __future__ import annotations

import asyncio
from typing import Any


class Blackboard:
    def __init__(self) -> None:
        self._store: dict[str, Any] = {}
        self._lock = asyncio.Lock()

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            self._store[key] = value

    async def get(self, key: str, default: Any = None) -> Any:
        async with self._lock:
            return self._store.get(key, default)

    async def get_many(self, keys: list[str]) -> dict[str, Any]:
        async with self._lock:
            return {k: self._store.get(k) for k in keys}

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    async def snapshot(self) -> dict[str, Any]:
        async with self._lock:
            return dict(self._store)
