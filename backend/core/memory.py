"""Conversational memory.

Per-session, append-only message history so a user can continue a
conversation with an agent across multiple queries.
"""

from __future__ import annotations

from typing import Any


class ConversationMemory:
    def __init__(self, max_messages: int = 200) -> None:
        self._sessions: dict[str, list[dict[str, Any]]] = {}
        self._max_messages = max_messages

    def append(self, session_id: str, role: str, content: str, meta: dict | None = None) -> None:
        entry = {
            "role": role,
            "content": content,
            "meta": meta or {},
        }
        messages = self._sessions.setdefault(session_id, [])
        messages.append(entry)
        if len(messages) > self._max_messages:
            del messages[: len(messages) - self._max_messages]

    def get(self, session_id: str, limit: int | None = None) -> list[dict[str, Any]]:
        messages = self._sessions.get(session_id, [])
        if limit is not None:
            return messages[-limit:]
        return list(messages)

    def clear(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def session_ids(self) -> list[str]:
        return list(self._sessions.keys())
