"""Async event broker.

Publish/subscribe backbone over asyncio Queues. Every agent and the API
subscribe to the event types they care about, so the mesh stays loosely
coupled and always-on.
"""

from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


@dataclass
class Event:
    type: str
    payload: dict
    source: str
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


class EventBus:
    def __init__(self, max_history: int = 10000) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[Event]]] = defaultdict(list)
        self._history: list[Event] = []
        self._max_history = max_history
        self._lock = asyncio.Lock()

    async def subscribe(self, event_type: str) -> asyncio.Queue[Event]:
        queue: asyncio.Queue[Event] = asyncio.Queue()
        self._subscribers[event_type].append(queue)
        return queue

    async def unsubscribe(self, event_type: str, queue: asyncio.Queue[Event]) -> None:
        queues = self._subscribers.get(event_type, [])
        if queue in queues:
            queues.remove(queue)

    async def publish(self, event: Event) -> None:
        async with self._lock:
            self._history.append(event)
            if len(self._history) > self._max_history:
                self._history = self._history[-self._max_history :]
        for queue in list(self._subscribers.get(event.type, [])):
            await queue.put(event)

    async def publish_many(self, events: list[Event]) -> None:
        for event in events:
            await self.publish(event)

    def history(self, event_type: Optional[str] = None, limit: int = 100) -> list[Event]:
        items = self._history
        if event_type:
            items = [e for e in items if e.type == event_type]
        return items[-limit:]

    def recent(self, limit: int = 200) -> list[Event]:
        return self._history[-limit:]
