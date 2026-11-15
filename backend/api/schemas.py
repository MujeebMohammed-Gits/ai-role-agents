"""Request/response schemas for the multi-agent API."""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class AgentSummary(BaseModel):
    role: str
    title: str
    subtitle: str
    description: str


class QueryRequest(BaseModel):
    role: str = Field(..., description="Role key, e.g. 'scrum_master'")
    query: str = Field(..., min_length=1, description="User query for the agent")
    session_id: Optional[str] = Field(None, description="Conversation session id (auto-created if omitted)")
    user_id: str = Field("user", description="User id for the conversation")


class ContextDoc(BaseModel):
    id: str
    text: str
    source: str
    score: float


class Evaluation(BaseModel):
    passed: bool
    score: float
    feedback: str
    needs_revision: bool
    suggestions: list[str] = []
    guardrail_violations: list[str] = []
    critique: Optional[str] = None
    stage_scores: dict[str, float] = {}
    meta: dict[str, Any] = {}


class LogEntry(BaseModel):
    level: str
    message: str
    agent: str
    session_id: str
    ts: float
    meta: dict[str, Any] = {}


class TraceEventSchema(BaseModel):
    type: str
    phase: str
    stage: str
    agent_role: str
    session_id: str
    query_id: str
    score: Optional[float] = None
    data: dict[str, Any] = {}
    timestamp: str
    id: str


class GuardrailSchema(BaseModel):
    passed: bool
    violations: list[str] = []
    meta: dict[str, Any] = {}


class QueryResponse(BaseModel):
    role: str
    session_id: str
    query_id: str
    query: str
    response: str
    evaluation: Evaluation
    guardrail: GuardrailSchema
    validation_state: str
    context: list[ContextDoc] = []
    logs: list[LogEntry] = []
    trace_events: list[TraceEventSchema] = []
    duration_ms: float


class MemoryResponse(BaseModel):
    session_id: str
    messages: list[dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    agents: int
    roles: list[str]