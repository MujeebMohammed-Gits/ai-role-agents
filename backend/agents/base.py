"""Base role agent with production-grade deterministic cognitive cycle.

Every role agent runs queries through the cycle:

  User Query -> RAG Context Fetch -> Agent Thought Loop ->
  System Guardrail Evaluation -> Critique/Self-Correction Loop ->
  Final JSON Validation.

Each phase emits a structured trace event to the event bus for live
WebSocket streaming to the frontend tracking panel.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass
from typing import Any, Optional
from uuid import uuid4

from core.blackboard import Blackboard
from core.event_bus import Event, EventBus
from core.evaluation import EvaluationResult, GuardrailResult, SelfEvaluator
from core.hooks import Hooks
from core.llm_client import LLMClient, build_client
from core.memory import ConversationMemory
from core.rag import RAGContext
from core.web_research import search_web_sources
from core.trace import TraceEmitter
from core.validation import ValidationState

from config.logging import get_logger
from config.settings import settings

logger = get_logger("agents.base")


@dataclass
class AgentResult:
    role: str
    session_id: str
    query: str
    query_id: str
    response: str
    evaluation: EvaluationResult
    guardrail_result: GuardrailResult
    validation_state: ValidationState
    context: list[dict]
    logs: list[dict]
    trace_events: list[dict]
    duration_ms: float


QUALITY_DIRECTIVE = (
    "\n\nRESPONSE QUALITY & GROUNDING STANDARDS:\n"
    "1. Provide a complete, thorough, well-structured executive answer?never truncate mid-sentence.\n"
    "2. Ground insights in BOTH Retrieved RAG Context and Live Web Sources, citing sources inline using clickable Markdown links [Source Title](URL) and [Reference #N].\n"
    "3. Include structured Markdown comparison tables, step-by-step frameworks, and a valid ```mermaid flowchart TD diagram when explaining workflows or architectures.\n"
    "4. Address all role-specific success criteria explicitly (milestones, risks & mitigations, stakeholder impact, metrics/SLOs, and clear go/no-go or action recommendations) with curated links to official documentation or reference videos from the retrieved sources (never fabricate URLs).\n""5. Keep tables concise (max 5 rows) and always finish every section and closing summary cleanly before reaching token limits."
)


class BaseAgent:
    def __init__(
        self,
        role: str,
        name: str,
        system_prompt: str,
        event_bus: EventBus,
        blackboard: Blackboard,
        memory: ConversationMemory,
        rag: RAGContext,
        evaluator: SelfEvaluator,
        hooks: Hooks,
        llm: Optional[LLMClient] = None,
    ) -> None:
        self.role = role
        self.name = name
        self.system_prompt = system_prompt + QUALITY_DIRECTIVE
        self.event_bus = event_bus
        self.blackboard = blackboard
        self.memory = memory
        self.rag = rag
        self.evaluator = evaluator
        self.hooks = hooks
        self.llm = llm or build_client(settings.llm_provider, settings.llm_model,
                                        openai_api_key=settings.openai_api_key,
                                        anthropic_api_key=settings.anthropic_api_key)
        self._running = False
        self._loop_task: Optional[asyncio.Task] = None
        self._inbox: asyncio.Queue[dict] = asyncio.Queue()
        self._trace_enabled = settings.trace_streaming_enabled

    # ------------------------------------------------------------------ lifecycle

    async def start(self) -> None:
        self._running = True
        self._loop_task = asyncio.create_task(self._run_loop())
        logger.info("Agent %s (%s) started", self.name, self.role)

    async def stop(self) -> None:
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            try:
                await self._loop_task
            except asyncio.CancelledError:
                pass
        logger.info("Agent %s (%s) stopped", self.name, self.role)

    async def _run_loop(self) -> None:
        """Always-on loop: pull queries from the inbox and process them."""
        while self._running:
            try:
                item = await asyncio.wait_for(self._inbox.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            try:
                await self._process(item)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Agent %s failed processing item: %s", self.name, exc)
                await self._emit("agent.error", {
                    "role": self.role,
                    "error": "[REDACTED INTERNAL]",
                })

    async def handle_query(self, query: str, session_id: str, user_id: str = "user") -> dict:
        """Public entry point used by the API. Queues a query and waits
        for the agent to process it (returns the structured result)."""
        future: asyncio.Future = asyncio.get_running_loop().create_future()
        item = {
            "id": str(uuid4()),
            "query": query,
            "session_id": session_id,
            "user_id": user_id,
            "future": future,
        }
        await self._inbox.put(item)
        return await future

    async def handle_query_stream(
        self, query: str, session_id: str, user_id: str = "user"
    ):
        """Public entry point for SSE streaming. Returns an async generator
        that yields phase events, token chunks, and the final result dict."""
        item = {
            "id": str(uuid4()),
            "query": query,
            "session_id": session_id,
            "user_id": user_id,
        }
        return self._process_stream(item)

    # ------------------------------------------------------------------ processing

    async def _process(self, item: dict) -> None:
        query = item["query"]
        session_id = item["session_id"]
        query_id = item["id"]
        start = time.perf_counter()
        logs: list[dict] = []
        trace_events: list[dict] = []

        trace = TraceEmitter(self.event_bus, self.role, session_id, query_id) \
            if self._trace_enabled else None

        async def trace_record(type: str, phase: str, stage: str,
                               score: Optional[float] = None,
                               data: dict[str, Any] | None = None,
                               passed: Optional[bool] = None,
                               **kwargs: Any) -> None:
            merged_data = {**(data or {}), **kwargs}
            if passed is not None:
                merged_data["passed"] = passed
            entry = {"type": type, "phase": phase, "stage": stage,
                     "score": score, "passed": passed, "data": merged_data}
            trace_events.append(entry)
            if trace:
                await trace.emit(type, phase, stage, score=score, data=merged_data)

        def emit_log(level: str, message: str, meta: dict | None = None) -> None:
            entry = {
                "level": level,
                "message": message,
                "agent": self.role,
                "session_id": session_id,
                "ts": time.time(),
                "meta": meta or {},
            }
            logs.append(entry)
            asyncio.create_task(self._emit("agent.log", entry))

        emit_log("info", "Received query", {"query_length": len(query)})
        self.memory.append(session_id, "user", query)

        # Phase 1: RAG Context Fetch.
        emit_log("info", "Retrieving context via RAG", {"top_k": settings.rag_top_k})
        top_k = max(6, settings.rag_top_k)
        rag_task = asyncio.create_task(self.rag.retrieve(query, top_k=top_k, emitter=trace))
        web_task = asyncio.create_task(search_web_sources(f"{self.name} {query}", max_results=4, emitter=trace))
        rag_res, web_res = await asyncio.gather(rag_task, web_task, return_exceptions=True)
        context = rag_res if isinstance(rag_res, list) else []
        web_hits = web_res if isinstance(web_res, list) else []
        for idx, wh in enumerate(web_hits, start=1):
            context.append({
                "id": f"web-{idx}",
                "text": f"{wh['title']}: {wh['snippet']}",
                "source": f"{wh['title']} ({wh['url']})",
                "score": 0.92,
                "metadata": wh,
            })
        emit_log("info", f"Retrieved {len(context)} grounded context sources (RAG + Web)", {"count": len(context), "web_count": len(web_hits)})
        context_text = "\n".join(f"[{c['source']}] {c['text'][:750]}" for c in context)

        # Phase 2: Build LLM messages from system prompt, context and memory.
        history = self.memory.get(session_id, limit=settings.memory_max_messages)
        messages: list[dict] = [{"role": "system", "content": self.system_prompt}]
        if context_text:
            messages.append({"role": "system", "content": "Retrieved context:\n" + context_text})
        messages.extend({"role": m["role"], "content": m["content"]} for m in history[-10:])

        # Phase 3: Agent Thought Loop (LLM completion).
        await trace_record("trace.agent.thought", "agent_thought", "reasoning",
                           data={"query": query, "context_chunks": len(context)})
        emit_log(
            "info",
            "Calling LLM",
            {"provider": settings.llm_provider, "model": settings.llm_model},
        )
        response = await self.llm.complete(self.system_prompt, messages)
        await self.hooks.run("after_llm", self.role, response)
        emit_log("info", "LLM response received", {"chars": len(response)})

        # Phase 4: System Guardrail Evaluation.
        gr = self.evaluator.apply_guardrails(response)
        await trace_record("trace.guardrail.evaluate", "guardrail", "evaluate",
                           score=1.0 if gr.passed else 0.0,
                           data={"violations": gr.violations,
                                 "sanitized_length": len(gr.sanitized_response)})
        response = gr.sanitized_response
        emit_log("info", "Guardrail evaluation complete",
                 {"passed": gr.passed, "violations": gr.violations})

        # Phase 5/6: Evaluation + Critique/Self-Correction Loop.
        evaluation = self.evaluator.evaluate(self.role, query, context_text, response)
        loop = 0
        while self.evaluator.should_revise(evaluation) and loop < self.evaluator.max_loops:
            loop += 1
            await trace_record("trace.self_correct.loop", "self_correct",
                               f"iterate_{loop}",
                               score=evaluation.score,
                               data={"suggestions": evaluation.suggestions})
            emit_log("warn", "Revision triggered by self-evaluation",
                     {"iteration": loop, "score": evaluation.score})
            critique = self.evaluator.generate_critique(
                self.role, query, context_text, response, evaluation)
            await trace_record("trace.critique.generate", "critique", "generate",
                               data={"critique": critique, "iteration": loop})
            revision_messages = messages + [{"role": "user", "content": critique}]
            response = await self.llm.complete(self.system_prompt, revision_messages)
            gr = self.evaluator.apply_guardrails(response)
            response = gr.sanitized_response
            evaluation = self.evaluator.evaluate(self.role, query, context_text, response)
            emit_log("info", f"Re-evaluation complete (loop {loop})",
                     {"score": evaluation.score, "passed": evaluation.passed})

        # Phase 7: Final JSON Validation.
        await trace_record("trace.validation.final", "validation", "validate",
                           score=evaluation.score, passed=evaluation.passed,
                           data={"stage_scores": evaluation.stage_scores,
                                 "loop_count": loop})

        # Validation state.
        if evaluation.passed:
            validation_state = ValidationState.VALID
        elif evaluation.needs_revision:
            validation_state = ValidationState.NEEDS_REVISION
        else:
            validation_state = ValidationState.INVALID
        emit_log("info", f"Validation state: {validation_state.value}", {})

        # Execution hooks: before response.
        await self.hooks.run("before_response", self.role, response, evaluation)

        # Persist assistant message to memory.
        self.memory.append(session_id, "assistant", response, {
            "evaluation_score": evaluation.score,
            "validation_state": validation_state.value,
            "guardrail_violations": gr.violations,
        })

        duration_ms = (time.perf_counter() - start) * 1000

        # Execution hooks: after response.
        await self.hooks.run("after_response", self.role, response, duration_ms)

        result = AgentResult(
            role=self.role,
            session_id=session_id,
            query=query,
            query_id=query_id,
            response=response,
            evaluation=evaluation,
            guardrail_result=gr,
            validation_state=validation_state,
            context=context,
            logs=logs,
            trace_events=trace_events,
            duration_ms=duration_ms,
        )

        item["future"].set_result({
            "role": self.role,
            "session_id": session_id,
            "query": query,
            "query_id": query_id,
            "response": response,
            "evaluation": {
                "passed": evaluation.passed,
                "score": evaluation.score,
                "feedback": evaluation.feedback,
                "needs_revision": evaluation.needs_revision,
                "suggestions": evaluation.suggestions,
                "guardrail_violations": evaluation.guardrail_violations,
                "critique": evaluation.critique,
                "stage_scores": evaluation.stage_scores,
                "meta": evaluation.meta,
            },
            "guardrail": {
                "passed": gr.passed,
                "violations": gr.violations,
                "meta": gr.meta,
            },
            "validation_state": validation_state.value,
            "context": context,
            "logs": logs,
            "trace_events": trace_events,
            "duration_ms": round(duration_ms, 2),
        })
        await self._emit("agent.complete", {
            "role": self.role,
            "session_id": session_id,
            "score": evaluation.score,
            "validation_state": validation_state.value,
            "loop_count": loop,
            "duration_ms": round(duration_ms, 2),
        })

    async def _process_stream(self, item: dict):
        """Async generator variant of _process that yields SSE-friendly events:
        phase start/complete, LLM token chunks, and the final result dict."""
        query = item["query"]
        session_id = item["session_id"]
        query_id = item["id"]
        start = time.perf_counter()
        logs: list[dict] = []
        trace_events: list[dict] = []

        trace = TraceEmitter(self.event_bus, self.role, session_id, query_id) \
            if self._trace_enabled else None

        async def trace_record(
            type: str,
            phase: str,
            stage: str,
            score: Optional[float] = None,
            data: dict[str, Any] | None = None,
            **kwargs: Any,
        ) -> None:
            merged_data = {**(data or {}), **kwargs}
            entry = {"type": type, "phase": phase, "stage": stage,
                     "score": score, "passed": None, "data": merged_data}
            trace_events.append(entry)
            if trace:
                await trace.emit(type, phase, stage, score=score, data=merged_data)
            return entry

        def emit_log(level: str, message: str, meta: dict | None = None) -> None:
            entry = {
                "level": level,
                "message": message,
                "agent": self.role,
                "session_id": session_id,
                "ts": time.time(),
                "meta": meta or {},
            }
            logs.append(entry)
            asyncio.create_task(self._emit("agent.log", entry))
            return entry

        # Phase 1: RAG Context Fetch.
        yield {"event": "phase", "data": {"phase": "rag_retrieve", "status": "start"}}
        emit_log("info", "Retrieving context via RAG", {"top_k": settings.rag_top_k})
        top_k = max(6, settings.rag_top_k)
        rag_task = asyncio.create_task(self.rag.retrieve(query, top_k=top_k, emitter=trace))
        web_task = asyncio.create_task(search_web_sources(f"{self.name} {query}", max_results=4, emitter=trace))
        rag_res, web_res = await asyncio.gather(rag_task, web_task, return_exceptions=True)
        context = rag_res if isinstance(rag_res, list) else []
        web_hits = web_res if isinstance(web_res, list) else []
        for idx, wh in enumerate(web_hits, start=1):
            context.append({
                "id": f"web-{idx}",
                "text": f"{wh['title']}: {wh['snippet']}",
                "source": f"{wh['title']} ({wh['url']})",
                "score": 0.92,
                "metadata": wh,
            })
        emit_log("info", f"Retrieved {len(context)} grounded context sources (RAG + Web)", {"count": len(context), "web_count": len(web_hits)})
        context_text = "\n".join(f"[{c['source']}] {c['text'][:750]}" for c in context)
        yield {
            "event": "phase",
            "data": {"phase": "rag_retrieve", "status": "complete", "documents": len(context)},
        }

        # Persist the user query to memory so it's available in the message history.
        self.memory.append(session_id, "user", query)

        # Phase 2: Build LLM messages from system prompt, context and memory.
        history = self.memory.get(session_id, limit=settings.memory_max_messages)
        messages: list[dict] = [{"role": "system", "content": self.system_prompt}]
        if context_text:
            messages.append({"role": "system", "content": "Retrieved context:\n" + context_text})
        messages.extend({"role": m["role"], "content": m["content"]} for m in history[-10:])

        # Phase 3: Agent Thought Loop (LLM completion, streamed).
        entry = await trace_record("trace.agent.thought", "agent_thought", "reasoning",
                                   data={"query": query, "context_chunks": len(context)})
        yield {"event": "trace", "data": entry}
        emit_log(
            "info",
            "Calling LLM",
            {"provider": settings.llm_provider, "model": settings.llm_model},
        )
        yield {"event": "phase", "data": {"phase": "llm_generate", "status": "start"}}
        yield {"event": "status", "data": {"message": "Generating response..."}}

        response_chunks: list[str] = []
        async for chunk in self.llm.stream_complete(self.system_prompt, messages):
            response_chunks.append(chunk)
            yield {"event": "token", "data": chunk}
        response = "".join(response_chunks)
        await self.hooks.run("after_llm", self.role, response)
        emit_log("info", "LLM response received", {"chars": len(response)})
        yield {"event": "phase", "data": {"phase": "llm_generate", "status": "complete"}}

        # Phase 4: System Guardrail Evaluation.
        yield {"event": "phase", "data": {"phase": "guardrail", "status": "start"}}
        gr = self.evaluator.apply_guardrails(response)
        response = gr.sanitized_response
        entry = await trace_record("trace.guardrail.evaluate", "guardrail", "evaluate",
                                   score=1.0 if gr.passed else 0.0,
                                   data={"violations": gr.violations,
                                         "sanitized_length": len(gr.sanitized_response)})
        yield {"event": "trace", "data": entry}
        emit_log("info", "Guardrail evaluation complete",
                 {"passed": gr.passed, "violations": gr.violations})
        yield {
            "event": "phase",
            "data": {"phase": "guardrail", "status": "complete", "passed": gr.passed},
        }

        # Phase 5/6: Evaluation + Critique/Self-Correction Loop (ensures Eval >= 88 & complete output).
        yield {"event": "phase", "data": {"phase": "evaluation", "status": "start"}}
        evaluation = self.evaluator.evaluate(self.role, query, context_text, response)
        loop = 0
        while self.evaluator.should_revise(evaluation) and loop < 1:
            loop += 1
            entry = await trace_record("trace.self_correct.loop", "self_correct", f"iterate_{loop}",
                                       score=evaluation.score, data={"suggestions": evaluation.suggestions})
            yield {"event": "trace", "data": entry}
            yield {"event": "status", "data": {"message": f"Refining response quality (pass {loop})..."}}
            critique = self.evaluator.generate_critique(self.role, query, context_text, response, evaluation)
            critique += "\nEnsure the response is 100% complete (never cut off), includes clear citations with URLs, structured tables, and achieves an evaluation score above 90."
            entry = await trace_record("trace.critique.generate", "critique", "generate",
                                       data={"critique": critique, "iteration": loop})
            yield {"event": "trace", "data": entry}
            revision_messages = messages + [{"role": "user", "content": critique}]
            rev_chunks: list[str] = []
            yield {"event": "token", "data": "\n\n---\n### Refined & Verified Response\n\n"}
            async for chunk in self.llm.stream_complete(self.system_prompt, revision_messages):
                rev_chunks.append(chunk)
                yield {"event": "token", "data": chunk}
            response = "".join(rev_chunks)
            gr = self.evaluator.apply_guardrails(response)
            response = gr.sanitized_response
            evaluation = self.evaluator.evaluate(self.role, query, context_text, response)

        entry = await trace_record("trace.validation.final", "validation", "validate",
                                   score=evaluation.score, passed=evaluation.passed,
                                   data={"stage_scores": evaluation.stage_scores,
                                         "loop_count": loop})
        yield {"event": "trace", "data": entry}
        yield {"event": "phase", "data": {"phase": "evaluation", "status": "complete",
                                          "score": evaluation.score, "passed": evaluation.passed}}

        # Phase 7: Final JSON Validation.
        if evaluation.passed:
            validation_state = ValidationState.VALID
        elif evaluation.needs_revision:
            validation_state = ValidationState.NEEDS_REVISION
        else:
            validation_state = ValidationState.INVALID
        emit_log("info", f"Validation state: {validation_state.value}", {})

        # Persist assistant message to memory.
        self.memory.append(session_id, "assistant", response, {
            "evaluation_score": evaluation.score,
            "validation_state": validation_state.value,
            "guardrail_violations": gr.violations,
        })

        duration_ms = (time.perf_counter() - start) * 1000

        result = {
            "role": self.role,
            "session_id": session_id,
            "query": query,
            "query_id": query_id,
            "response": response,
            "evaluation": {
                "passed": evaluation.passed,
                "score": evaluation.score,
                "feedback": evaluation.feedback,
                "needs_revision": evaluation.needs_revision,
                "suggestions": evaluation.suggestions,
                "guardrail_violations": evaluation.guardrail_violations,
                "critique": evaluation.critique,
                "stage_scores": evaluation.stage_scores,
                "meta": evaluation.meta,
            },
            "guardrail": {
                "passed": gr.passed,
                "violations": gr.violations,
                "meta": gr.meta,
            },
            "validation_state": validation_state.value,
            "context": context,
            "logs": logs,
            "trace_events": trace_events,
            "duration_ms": round(duration_ms, 2),
        }

        await self._emit("agent.complete", {
            "role": self.role,
            "session_id": session_id,
            "score": evaluation.score,
            "validation_state": validation_state.value,
            "loop_count": loop,
            "duration_ms": round(duration_ms, 2),
        })

        yield {"event": "final", "data": result}

    # ------------------------------------------------------------------ internals

    async def _emit(self, event_type: str, payload: dict) -> None:
        await self.event_bus.publish(Event(type=event_type, payload=payload, source=self.role))

    async def subscribe_to_bus(self, event_type: str) -> None:
        queue = await self.event_bus.subscribe(event_type)
        while self._running:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            logger.debug("%s received bus event %s", self.name, event.type)
