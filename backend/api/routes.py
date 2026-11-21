"""FastAPI routes: agent roster, query submission, memory, WebSocket logs & traces."""

from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncIterator

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import StreamingResponse

from agents.registry import ROLES, ALL_ROLES
from api.schemas import (
    AgentSummary,
    QueryRequest,
    QueryResponse,
    MemoryResponse,
    HealthResponse,
    LogEntry,
    Evaluation,
    ContextDoc,
    GuardrailSchema,
    TraceEventSchema,
)

router = APIRouter()

orchestrator = None  # type: ignore
connected_ws: list[WebSocket] = []
connected_trace_ws: list[WebSocket] = []


def _bind(orch) -> None:
    global orchestrator
    orchestrator = orch


async def _broadcast(connections: list[WebSocket], message: dict) -> None:
    if not connections:
        return
    payload = json.dumps(message)
    dead = []
    for ws in list(connections):
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        connections.remove(ws)


TRACE_EVENT_TYPES = [
    "trace.rag.retrieve",
    "trace.agent.thought",
    "trace.guardrail.evaluate",
    "trace.critique.generate",
    "trace.self_correct.loop",
    "trace.validation.final",
    "trace.web.search",
]


@router.on_event("startup")
async def _startup_bus_bridges() -> None:
    if orchestrator is None:
        return
    bus = orchestrator.event_bus

    async def log_bridge() -> None:
        queue = await bus.subscribe("agent.log")
        while True:
            event = await queue.get()
            await _broadcast(connected_ws, event.payload)

    async def trace_bridge() -> None:
        queues = [await bus.subscribe(etype) for etype in TRACE_EVENT_TYPES]
        getters = {asyncio.create_task(q.get()): q for q in queues}
        while True:
            done, _ = await asyncio.wait(
                getters.keys(), return_when=asyncio.FIRST_COMPLETED
            )
            for task in done:
                event = task.result()
                await _broadcast(connected_trace_ws, event.to_dict() if hasattr(event, 'to_dict') else vars(event))
                q = getters.pop(task)
                new_task = asyncio.create_task(q.get())
                getters[new_task] = q

    asyncio.create_task(log_bridge())
    asyncio.create_task(trace_bridge())


@router.get("/api/agents", response_model=list[AgentSummary])
async def list_agents() -> list[AgentSummary]:
    return [
        AgentSummary(
            role=role,
            title=info["title"],
            subtitle=info["subtitle"],
            description=info["description"],
        )
        for role, info in ROLES.items()
    ]


async def _ensure_orchestrator():
    global orchestrator
    if orchestrator is None:
        from agents.orchestrator import Orchestrator
        orch = Orchestrator()
        orch.register_roles()
        await orch.start()
        _bind(orch)
    return orchestrator


@router.post("/api/query", response_model=QueryResponse)

async def submit_query(request: QueryRequest) -> QueryResponse:
    if orchestrator is None:
        await _ensure_orchestrator()
    session_id = request.session_id or f"sess_{request.role}_{abs(hash(request.query)) % 100000}"
    result = await orchestrator.route_query(
        role=request.role,
        query=request.query,
        session_id=session_id,
        user_id=request.user_id,
    )
    return QueryResponse(
        role=result["role"],
        session_id=result["session_id"],
        query_id=result.get("query_id", ""),
        query=result["query"],
        response=result["response"],
        evaluation=Evaluation(**result["evaluation"]),
        guardrail=GuardrailSchema(**result.get("guardrail", {})),
        validation_state=result["validation_state"],
        context=[ContextDoc(**c) for c in result.get("context", [])],
        logs=[LogEntry(**l) for l in result.get("logs", [])],
        trace_events=[TraceEventSchema(id=t.get("id", f"tr_{i}"), agent_role=t.get("agent_role", request.role), session_id=t.get("session_id", session_id), query_id=t.get("query_id", result.get("query_id", "")), timestamp=t.get("timestamp", ""), **{k: v for k, v in t.items() if k not in {"id", "agent_role", "session_id", "query_id", "timestamp"}}) for i, t in enumerate(result.get("trace_events", []))], 
        duration_ms=result.get("duration_ms", 0.0),
    )


@router.post("/api/query/stream")
async def stream_query(request: QueryRequest) -> StreamingResponse:
    if orchestrator is None:
        await _ensure_orchestrator()
    agent = orchestrator.get_agent(request.role)
    if agent is None:
        raise HTTPException(status_code=404, detail=f"Unknown agent role: {request.role}")
    session_id = request.session_id or f"sess_{request.role}_{abs(hash(request.query)) % 100000}"

    async def event_generator() -> AsyncIterator[str]:
        try:
            stream = await agent.handle_query_stream(
                request.query, session_id, user_id=request.user_id
            )
            async for ev in stream:
                kind = ev.get("event", "status")
                data = ev.get("data", {})
                if kind == "final":
                    yield f"event: done\ndata: {json.dumps(data)}\n\n"
                elif kind == "token":
                    yield f"event: token\ndata: {json.dumps(data)}\n\n"
                else:
                    yield f"event: status\ndata: {json.dumps(data)}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


@router.get("/api/memory/{session_id}", response_model=MemoryResponse)
async def get_memory(session_id: str, limit: int = Query(50, ge=1, le=500)) -> MemoryResponse:
    if orchestrator is None:
        await _ensure_orchestrator()
    messages = orchestrator.memory.get(session_id, limit=limit)
    return MemoryResponse(session_id=session_id, messages=messages)


@router.delete("/api/memory/{session_id}")
async def clear_memory(session_id: str) -> dict[str, str]:
    if orchestrator is None:
        await _ensure_orchestrator()
    orchestrator.memory.clear(session_id)
    return {"status": "cleared", "session_id": session_id}


@router.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    if orchestrator is None:
        await _ensure_orchestrator()
    return HealthResponse(
        status="ok",
        agents=len(orchestrator.agents),
        roles=list(orchestrator.agents.keys()),
    )


@router.websocket("/api/ws/logs")
async def ws_logs(websocket: WebSocket) -> None:
    await websocket.accept()
    connected_ws.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in connected_ws:
            connected_ws.remove(websocket)


@router.websocket("/api/ws/trace")
async def ws_trace(websocket: WebSocket) -> None:
    await websocket.accept()
    connected_trace_ws.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        if websocket in connected_trace_ws:
            connected_trace_ws.remove(websocket)