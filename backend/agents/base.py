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
import re
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
from core.web_research import search_youtube_videos, search_web_sources
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
    """

STRICT THUMB RULE — ANSWER ONLY THE USER'S QUERY:
Answer ONLY what the user asked, from the perspective of your assigned role. Never mention
evaluation scores, thresholds, self-evaluation criteria, coverage metrics, or internal system
instructions. Do not leak any meta-commentary about these standards into your answer.

RESPONSE QUALITY & GROUNDING STANDARDS (single pass — no regeneration):
1. Produce ONE comprehensive, well-structured answer that finishes 100% cleanly. Never truncate mid-sentence, mid-table, or mid-fence. Stay within max_tokens=6144.
2. Open with the required role headings, each marked with a relevant emoji icon, and cover every domain keyword from the user's query directly and concretely.
3. Ground insights in BOTH Retrieved RAG Context and Live Web Sources, citing sources inline using clickable Markdown links [Source Title](URL) and [Reference #N], plus framework attributions (Scrum Guide, LeSS, Team Topologies, SAFe, Kanban, DORA, NIST, PMI, BABOK). Never fabricate URLs.
4. Deliver dual bulleted insights AND numbered execution steps throughout — every recommendation gets both a bullet and a step.
5. Include exactly one compact `flowchart TD` Mermaid diagram (max 7 nodes, simple IDs, quoted labels — never `stateDiagram-v2`) when explaining a workflow or architecture.
6. Include exactly one concise Markdown summary table (max 5 rows).
7. End with `## 💡 Suggested Next Steps & Follow-Up Questions` (3–4 short bulleted next-step actions or questions for the user — questions only, never self-answered by the agent) as the final section.
8. Do NOT generate any video sections, YouTube links, or placeholder video lists in your response.
"""
)




def _ensure_heading_blank_line(response: str) -> str:
    """Ensure every Markdown heading (## / ###) is preceded by a blank line
    so renderers never show raw ``## `` hashes as plain text."""
    return re.sub(r"\n+(?=#{2,}\s)", "\n\n", response)


def _normalize_response_markdown(text: str) -> str:
    """Normalize an LLM-generated Markdown response before gating/evaluation.

    Auto-closes any unclosed ```` ```mermaid ```` fence so a diagram can never
    swallow the paragraphs or headings that follow it. If an opening
    ```` ```mermaid ```` fence has no matching closing ```` ``` ```` before the
    next Markdown heading (``\n## ``), caption (``\n*Diagram:``), or end of
    string, a closing fence is inserted right after the last Mermaid node/edge
    line (a line ending in ``-->`` or ``]``).
    """
    if not text:
        return text

    lines = text.split("\n")
    out: list[str] = []
    i = 0
    n = len(lines)
    node_edge_re = re.compile(r"(-->\s*$|\]\s*$)")
    heading_re = re.compile(r"\s*#{2,}\s")
    caption_re = re.compile(r"\s*\*Diagram:")

    while i < n:
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```mermaid"):
            out.append(line)
            i += 1
            closed = False
            last_node_edge = -1
            block_end = i
            while i < n:
                cur = lines[i]
                cstripped = cur.strip()
                if cstripped == "```":
                    out.append(cur)
                    closed = True
                    i += 1
                    block_end = i
                    break
                out.append(cur)
                if node_edge_re.search(cstripped):
                    last_node_edge = len(out) - 1
                if (
                    i + 1 < n
                    and (
                        heading_re.match(lines[i + 1])
                        or caption_re.match(lines[i + 1])
                    )
                ):
                    block_end = i + 1
                    break
                i += 1
            else:
                block_end = n

            if not closed:
                if last_node_edge != -1:
                    out.insert(last_node_edge + 1, "```")
                    out.insert(last_node_edge + 2, "")
                else:
                    out.append("```")
                    out.append("")
            i = block_end
            continue

        out.append(line)
        i += 1

    return "\n".join(out)

# Conversational filler stripped before extracting domain keywords.
_KEYWORD_STOPWORDS: set[str] = {
    "about", "start", "give", "fully", "detailed", "plan", "how", "get",
    "started", "clear", "related", "where", "applicable", "with", "and",
    "for", "the", "to", "in", "a", "an", "of",
    "i", "im", "me", "my", "please", "can", "could", "would", "should",
    "what", "when", "which", "who", "whom", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did",
    "will", "just", "also", "even", "still", "already", "yet",
}


def _extract_domain_keywords(query: str) -> list[str]:
    """Extract substantive domain keywords from the user's query.

    Conversational filler (``"give me"``, ``"how to get started"``,
    ``"where applicable"`` and the like) is stripped so only meaningful
    domain terms remain. These keywords drive RAG / web retrieval and
    self-evaluation so every agent grounds its answer in the most relevant
    Qdrant, OpenAlex Journal and Organizational Article sources.
    """
    tokens = re.findall(r"\w+", (query or "").lower())
    keywords: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        if len(token) > 3 and token not in _KEYWORD_STOPWORDS and token not in seen:
            seen.add(token)
            keywords.append(token)
    return keywords


def _gate_passed(evaluation, response: str, role: str, evaluator, query: str) -> tuple[bool, list[str]]:
    """Completion & Eval gate: the agent may not stop mid-way until every
    structural requirement passes and all structural requirements pass. Returns (passed, missing_components)."""
    response_lower = (response or "").lower()
    query_lower = (query or "").lower()
    missing: list[str] = []

    # 1. Every required role heading present.
    for section in evaluator.required_sections_for(role):
        if not evaluator._section_present(section, response_lower):
            missing.append(f"required section: {section}")

    # 2. Valid ```mermaid workflow diagram and structured Markdown table.
    wants_diagram = any(
        kw in query_lower
        for kw in ("workflow", "diagram", "architecture", "pipeline", "process", "plan")
    )
    if wants_diagram and "```mermaid" not in response_lower:
        missing.append("```mermaid workflow diagram")
    if re.search(r"^\s*\|.*\|\s*$", response or "", re.MULTILINE) is None:
        missing.append("Markdown comparison/metrics table (| ... |)")

    # 3. Closing next-steps section present and clean terminal ending.
    if "## 💡 suggested next steps & follow-up questions" not in response_lower:
        # If a "Suggested Next Steps" section already exists anywhere in the
        # response (case-insensitive), never append a duplicate section.
        if "suggested next steps" not in response_lower:
            missing.append("## 💡 Suggested Next Steps & Follow-Up Questions section")
    stripped = (response or "").rstrip()
    if stripped and stripped[-1] not in ".!?)]\`":
        missing.append("terminal punctuation (response ends mid-sentence)")

    return (len(missing) == 0, missing)


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
        req_secs = ", ".join(f"## {s}" for s in evaluator.required_sections_for(role))
        role_contract = (
            f"\n9. MANDATORY STRUCTURE FOR {self.name.upper()}: Include clear Markdown headings covering: {req_secs}.\n"
            "10. Always combine BOTH numbered action steps (1. 2. 3.) AND bulleted insights (- ) in every response, and cite retrieved RAG/Web sources inline."
        )
        self.system_prompt = system_prompt + QUALITY_DIRECTIVE + role_contract
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

    def _response_is_incomplete(self, response: str) -> bool:
        """Return True if the LLM response appears to have been cut off
        mid-sentence (no terminal punctuation). Unclosed fences are closed
        separately at the end of processing."""
        stripped = response.rstrip()
        if not stripped:
            return False
        return stripped[-1] not in ".!?)]`"




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

        # Phase 0: Query keyword analysis — extract the substantive domain
        # keywords from the user's query (stripping conversational filler)
        # so every retrieval and evaluation step is grounded in the right
        # domain terms.
        keywords = _extract_domain_keywords(query)
        if trace:
            await trace_record("trace.agent.thought", "agent_thought",
                               "keyword_analysis",
                               data={"keywords": keywords, "role": self.role,
                                     "query": query})

        # Phase 1: RAG Context Fetch.
        emit_log("info", "Retrieving context via RAG",
                 {"top_k": settings.rag_top_k, "keywords": keywords})
        top_k = 6
        try:
            rag_res, web_res = await asyncio.wait_for(
                asyncio.gather(
                    self.rag.retrieve(query, top_k=top_k, emitter=trace,
                                      keywords=keywords),
                    search_web_sources(f"{self.name} {query}", max_results=4,
                                       emitter=trace, keywords=keywords),
                    return_exceptions=True,
                ),
                timeout=3.5,
            )
        except Exception:  # noqa: BLE001 — never abort streaming on context fetch
            rag_res, web_res = [], []
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
        # Pre-generation context evaluation: rank & filter before building context_text.
        context, ctx_eval = self.evaluator.filter_and_rank_context(query, context, keywords=keywords)
        emit_log("info", "Context evaluation complete", ctx_eval)
        if trace:
            await trace.emit("trace.rag.retrieve", "rag", "retrieve",
                             score=None, data={"query": query, "context_evaluation": ctx_eval})
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
        if self._response_is_incomplete(response):
            cont_chunks: list[str] = []
            async for chunk in self.llm.stream_complete(
                self.system_prompt,
                messages + [
                    {"role": "assistant", "content": response},
                    {
                        "role": "user",
                        "content": "Continue ONLY the final unfinished sentence/section in <= 150 words without repeating any earlier heading.",
                    },
                ],
            ):
                cont_chunks.append(chunk)
            response = response + "".join(cont_chunks)

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

        # Normalize the assembled response before gating/evaluation: close any
        # unclosed ```mermaid fence so a diagram cannot swallow the following
        # sections, and keep structural fences balanced.
        response = _normalize_response_markdown(response)

        # Phase 5/6: Evaluation (single pass — no response regeneration).
        try:
            evaluation = self.evaluator.evaluate(self.role, query, context_text, response)
        except Exception as exc:  # noqa: BLE001: never abort on evaluation failure
            logger.exception("Agent %s evaluation failed: %s", self.name, exc)
            evaluation = EvaluationResult(
                passed=False,
                score=0.0,
                feedback=f"Evaluation unavailable: {exc}",
                needs_revision=False,
                suggestions=[],
                stage_scores={},
                meta={"error": str(exc)},
            )
        # --- Completion & Eval Gate Loop: refuses to let the agent stop mid-way ---
        loop = 0
        gate_attempt = 0
        while gate_attempt < 3:
            gate_ok, missing = _gate_passed(evaluation, response, self.role, self.evaluator, query)
            if gate_ok:
                break
            gate_attempt += 1
            await trace_record("trace.self_correct.loop", "self_correct", "loop",
                               data={"attempt": gate_attempt, "missing": missing,
                                     "score": evaluation.score, "passed": evaluation.passed})
            emit_log("info", f"Gate checkpoint {gate_attempt}: completing missing component(s): {', '.join(missing)}")

            # Stream ONLY the missing structural component(s). Never repeat earlier
            # sections; strictly forbid parenthetical word-count notes.
            instruction_parts: list[str] = []
            if any("required section" in m for m in missing):
                instruction_parts.append("Write ONLY the missing required role section headings with concise content under each.")
            if any("mermaid" in m for m in missing):
                instruction_parts.append("Add ONE ```mermaid workflow diagram (flowchart TD, max 7 nodes) explaining the workflow.")
            if any("table" in m for m in missing):
                instruction_parts.append("Add ONE structured Markdown comparison/metrics table using | ... | syntax.")
            if any("Next Steps" in m for m in missing):
                instruction_parts.append("Add the closing '## 💡 Suggested Next Steps & Follow-Up Questions' section with 3-4 bulleted next-step items.")
            if any("terminal punctuation" in m for m in missing):
                instruction_parts.append("End the response with a clean sentence ending in terminal punctuation (. ! ?). Do not stop mid-sentence.")
            instruction = (
                "You are continuing a response that stopped mid-way. Write ONLY the missing component(s) listed below.\n"
                "Each missing block must be 120 words or fewer. Do NOT repeat any earlier section or heading.\n"
                "Do NOT include parenthetical word-count notes, evaluation commentary, score talk, threshold "
                "talk, keyword-coverage talk, or any meta-explanation. Output ONLY the missing block(s).\n\n"
                "Missing component(s):\n- " + "\n- ".join(instruction_parts)
            )
            refinement_messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "assistant", "content": response},
                {"role": "user", "content": instruction},
            ]
            delta_chunks: list[str] = []
            async for chunk in self.llm.stream_complete(self.system_prompt, refinement_messages):
                delta_chunks.append(chunk)
            delta = "".join(delta_chunks)
            if delta.strip():
                response = response.rstrip() + "\n\n" + delta.strip()
            evaluation = self.evaluator.evaluate(self.role, query, context_text, response)

        # Close any unclosed code fence and strip markers from the final response.
        if response.count("```") % 2 != 0:
            response += "\n```"
        response = re.sub("「[^」]*」", "", response)
        response = _ensure_heading_blank_line(response)

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

        # Phase 0: Query keyword analysis — extract the substantive domain
        # keywords from the user's query (stripping conversational filler)
        # so every retrieval and evaluation step is grounded in the right
        # domain terms.
        keywords = _extract_domain_keywords(query)
        if trace:
            await trace_record("trace.agent.thought", "agent_thought",
                               "keyword_analysis",
                               data={"keywords": keywords, "role": self.role,
                                     "query": query})

        # Phase 1: RAG Context Fetch.
        yield {"event": "phase", "data": {"phase": "rag_retrieve", "status": "start"}}
        emit_log("info", "Retrieving context via RAG",
                 {"top_k": settings.rag_top_k, "keywords": keywords})
        top_k = 6
        try:
            rag_res, web_res = await asyncio.wait_for(
                asyncio.gather(
                    self.rag.retrieve(query, top_k=top_k, emitter=trace,
                                      keywords=keywords),
                    search_web_sources(f"{self.name} {query}", max_results=4,
                                       emitter=trace, keywords=keywords),
                    return_exceptions=True,
                ),
                timeout=3.5,
            )
        except Exception:  # noqa: BLE001 — never abort streaming on context fetch
            rag_res, web_res = [], []
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
        # Pre-generation context evaluation: rank & filter before building context_text.
        context, ctx_eval = self.evaluator.filter_and_rank_context(query, context, keywords=keywords)
        emit_log("info", "Context evaluation complete", ctx_eval)
        if trace:
            await trace.emit("trace.rag.retrieve", "rag", "retrieve",
                             score=None, data={"query": query, "context_evaluation": ctx_eval})
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
            clean_chunk = re.sub("「[^」]*」", "", chunk)
            response_chunks.append(clean_chunk)
            yield {"event": "token", "data": clean_chunk}
        response = "".join(response_chunks)
        if self._response_is_incomplete(response):
            cont_chunks: list[str] = []
            async for chunk in self.llm.stream_complete(
                self.system_prompt,
                messages + [
                    {"role": "assistant", "content": response},
                    {
                        "role": "user",
                        "content": "Continue ONLY the final unfinished sentence/section in <= 150 words without repeating any earlier heading.",
                    },
                ],
            ):
                cont_chunks.append(chunk)
                yield {"event": "token", "data": chunk}
            response = response + "".join(cont_chunks)

        await self.hooks.run("after_llm", self.role, response)
        emit_log("info", "LLM response received", {"chars": len(response)})
        yield {"event": "phase", "data": {"phase": "llm_generate", "status": "complete"}}

        # Phase 4: System Guardrail Evaluation.
        yield {"event": "phase", "data": {"phase": "guardrail", "status": "start"}}
        try:
            gr = self.evaluator.apply_guardrails(response)
            response = gr.sanitized_response
        except Exception as exc:  # noqa: BLE001: never abort streaming on guardrail failure
            logger.exception("Agent %s guardrail failed: %s", self.name, exc)
            gr = GuardrailResult(
                passed=True,
                violations=[],
                sanitized_response=response,
                meta={"error": str(exc)},
            )
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

        # Normalize the assembled response before gating/evaluation: close any
        # unclosed ```mermaid fence so a diagram cannot swallow the following
        # sections, and keep structural fences balanced.
        response = _normalize_response_markdown(response)

        # Phase 5/6: Evaluation (single pass — no response regeneration).
        yield {"event": "phase", "data": {"phase": "evaluation", "status": "start"}}
        try:
            evaluation = self.evaluator.evaluate(self.role, query, context_text, response)
            loop = 0
            yield {"event": "phase", "data": {"phase": "evaluation", "status": "complete",
                                              "score": evaluation.score, "passed": evaluation.passed}}

            # --- Completion & Eval Gate Loop: refuses to let the agent stop mid-way ---
            gate_attempt = 0
            while gate_attempt < 3:
                gate_ok, missing = _gate_passed(evaluation, response, self.role, self.evaluator, query)
                if gate_ok:
                    break
                gate_attempt += 1
                entry = await trace_record("trace.self_correct.loop", "self_correct", "loop",
                                           data={"attempt": gate_attempt, "missing": missing,
                                                 "score": evaluation.score, "passed": evaluation.passed})
                yield {"event": "trace", "data": entry}
                emit_log("info", f"Gate checkpoint {gate_attempt}: completing missing component(s): {', '.join(missing)}")

                # Stream ONLY the missing structural component(s). Never repeat earlier
                # sections; strictly forbid parenthetical word-count notes.
                instruction_parts: list[str] = []
                if any("required section" in m for m in missing):
                    instruction_parts.append("Write ONLY the missing required role section headings with concise content under each.")
                if any("mermaid" in m for m in missing):
                    instruction_parts.append("Add ONE ```mermaid workflow diagram (flowchart TD, max 7 nodes) explaining the workflow.")
                if any("table" in m for m in missing):
                    instruction_parts.append("Add ONE structured Markdown comparison/metrics table using | ... | syntax.")
                if any("Next Steps" in m for m in missing):
                    instruction_parts.append("Add the closing '## 💡 Suggested Next Steps & Follow-Up Questions' section with 3-4 bulleted next-step items.")
                if any("terminal punctuation" in m for m in missing):
                    instruction_parts.append("End the response with a clean sentence ending in terminal punctuation (. ! ?). Do not stop mid-sentence.")
                instruction = (
                    "You are continuing a response that stopped mid-way. Write ONLY the missing component(s) listed below.\n"
                    "Each missing block must be 120 words or fewer. Do NOT repeat any earlier section or heading.\n"
                    "Do NOT include parenthetical word-count notes, evaluation commentary, score talk, threshold "
                    "talk, keyword-coverage talk, or any meta-explanation. Output ONLY the missing block(s).\n\n"
                    "Missing component(s):\n- " + "\n- ".join(instruction_parts)
                )
                refinement_messages = [
                    {"role": "system", "content": self.system_prompt},
                    {"role": "assistant", "content": response},
                    {"role": "user", "content": instruction},
                ]
                delta_chunks: list[str] = []
                async for chunk in self.llm.stream_complete(self.system_prompt, refinement_messages):
                    delta_chunks.append(chunk)
                    yield {"event": "token", "data": chunk}
                delta = "".join(delta_chunks)
                if delta.strip():
                    response = response.rstrip() + "\n\n" + delta.strip()
                evaluation = self.evaluator.evaluate(self.role, query, context_text, response)
        except Exception as exc:  # noqa: BLE001 — never abort streaming on evaluation failure
            logger.exception("Agent %s evaluation failed: %s", self.name, exc)
            evaluation = EvaluationResult(
                passed=False,
                score=0.0,
                feedback=f"Evaluation unavailable: {exc}",
                needs_revision=False,
                suggestions=[],
                stage_scores={},
                meta={"error": str(exc)},
            )
            loop = 0
            yield {"event": "phase", "data": {"phase": "evaluation", "status": "complete",
                                              "score": evaluation.score, "passed": evaluation.passed}}

        # Close any unclosed code fence, strip markers, append official videos.
        if response.count("```") % 2 != 0:
            response += "\n```"
        response = re.sub("「[^」]*」", "", response)
        response = _ensure_heading_blank_line(response)
        if "### Official Organizational Video Briefings" not in response:
            try:
                missing_vids = await search_youtube_videos(query=query, max_videos=2)
                if missing_vids:
                    video_lines = "\n".join(
                        f"- [{v['title']}]({v['url']})" for v in missing_vids[:2]
                    )
                    response += f"\n\n### Official Organizational Video Briefings\n\n{video_lines}"
            except Exception:  # noqa: BLE001 — videos are best-effort
                pass

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
