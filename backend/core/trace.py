"""Production trace event models and emitter.

Every phase of the deterministic cognitive cycle is emitted as a structured
trace event on the shared event bus, so it streams live over WebSocket to
the frontend tracking panel.

Event types:
  trace.rag.retrieve      - vector search with distance/similarity scores
  trace.agent.thought     - agent thought / reasoning step
  trace.guardrail.evaluate - system guardrail evaluation
  trace.critique.generate  - internal critique generation
  trace.self_correct.loop  - self-correction iteration
  trace.validation.final   - final JSON validation result
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


@dataclass
class TraceEvent:
    type: str
    phase: str
    stage: str
    agent_role: str
    session_id: str
    query_id: str
    score: Optional[float] = None
    data: dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


class TraceEmitter:
    """Emits structured trace events onto the shared event bus."""

    def __init__(self, event_bus, agent_role: str, session_id: str,
                 query_id: str) -> None:
        self._bus = event_bus
        self._agent_role = agent_role
        self._session_id = session_id
        self._query_id = query_id

    async def emit(self, type: str, phase: str, stage: str,
                   score: Optional[float] = None,
                   data: dict[str, Any] | None = None) -> None:
        event = TraceEvent(
            type=type,
            phase=phase,
            stage=stage,
            agent_role=self._agent_role,
            session_id=self._session_id,
            query_id=self._query_id,
            score=score,
            data=data or {},
        )
        await self._bus.publish(event)

    # ------------------------------------------------------------------ phase emitters

    async def rag_retrieve(self, score: Optional[float],
                           data: dict[str, Any]) -> None:
        await self.emit("trace.rag.retrieve", "rag", "fetch",
                        score=score, data=data)

    async def agent_thought(self, data: dict[str, Any]) -> None:
        await self.emit("trace.agent.thought", "agent_thought", "reasoning",
                        data=data)

    async def guardrail_evaluate(self, score: float,
                                 data: dict[str, Any]) -> None:
        await self.emit("trace.guardrail.evaluate", "guardrail", "evaluate",
                        score=score, data=data)

    async def critique_generate(self, data: dict[str, Any]) -> None:
        await self.emit("trace.critique.generate", "critique", "generate",
                        data=data)

    async def self_correct(self, iteration: int,
                           data: dict[str, Any]) -> None:
        await self.emit("trace.self_correct.loop", "self_correct",
                        f"iterate_{iteration}", data=data)

    async def validation_final(self, score: float, passed: bool,
                               data: dict[str, Any]) -> None:
        await self.emit("trace.validation.final", "validation", "validate",
                        score=score, data={**data, "passed": passed})
