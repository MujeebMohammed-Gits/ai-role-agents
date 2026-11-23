"""Production self-evaluation, guardrails, and self-improvement loops.

Deterministic cognitive cycle:

  User Query -> RAG Context Fetch -> Agent Thought Loop ->
  System Guardrail Evaluation -> Critique/Self-Correction Loop ->
  Final JSON Validation.

An automated grader scores each agent response on industry-standard
formatting, correctness, and constraint compliance. When the score falls
below the configured threshold (default 0.85), an internal critique is
generated and the agent is invoked again for self-improvement, up to a
configured maximum number of correction loops.

Structural guardrails block unhandled backend exceptions from leaking into
the UI, strip incomplete code strings, and enforce output structures that
align with the frontend Markdown/Media rendering contract.
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Optional

from config.logging import get_logger
from config.settings import settings

logger = get_logger("core.evaluation")


@dataclass
class GuardrailResult:
    passed: bool
    violations: list[str] = field(default_factory=list)
    sanitized_response: str = ""
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class EvaluationResult:
    passed: bool
    score: float  # 0.0 - 1.0
    feedback: str
    needs_revision: bool = False
    suggestions: list[str] = field(default_factory=list)
    guardrail_violations: list[str] = field(default_factory=list)
    critique: Optional[str] = None
    stage_scores: dict[str, float] = field(default_factory=dict)
    meta: dict[str, Any] = field(default_factory=dict)


class SelfEvaluator:
    def __init__(self) -> None:
        self.threshold = settings.evaluation_threshold
        self.max_loops = settings.max_self_correction_loops
        self._criteria: dict[str, list[str]] = {
            "delivery_management": [
                "delivery milestones and dates are realistic",
                "risks and blockers are identified with mitigation",
                "stakeholder impact is addressed",
                "release go/no-go recommendation is provided",
            ],
            "enterprise_agile_coach": [
                "agile values and principles are honored",
                "coaching stance (not directive) is maintained",
                "organizational impediments are surfaced",
                "sustainable pace is promoted",
            ],
            "scrum_master": [
                "scrum events and artifacts are respected",
                "impediment removal is prioritized",
                "team self-organization is supported",
                "sprint goal protection is addressed",
            ],
            "product_manager": [
                "customer and business value are clear",
                "prioritization rationale is provided (RICE / MoSCoW)",
                "success metrics and OKRs are defined",
                "product vision alignment is addressed",
            ],
            "product_owner": [
                "backlog items are well-formed and ordered",
                "acceptance criteria are present and testable",
                "stakeholder needs are translated into user stories",
                "definition of ready is enforced",
            ],
            "business_analyst": [
                "requirements are complete and unambiguous",
                "BDD Given / When / Then criteria are formulated",
                "as-is / to-be processes are considered",
                "stakeholder impact analysis is included",
            ],
            "user_research": [
                "research method is appropriate to the question",
                "participant and ethics considerations are noted",
                "findings are actionable and evidence-backed",
                "informed consent and anonymization are addressed",
            ],
            "devops_engineer": [
                "CI/CD and deployment concerns are addressed",
                "infrastructure as code is mentioned where relevant",
                "rollback and observability are covered",
                "deployment strategy (blue-green / canary / rolling) is defined",
            ],
            "sre": [
                "SLOs / SLIs and error budgets are considered",
                "Four Golden Signals are evaluated",
                "incident response and postmortems are addressed",
                "reliability and capacity planning are covered",
            ],
            "platform_engineering": [
                "developer experience and internal platform are centered",
                "golden paths and self-service are described",
                "platform guardrails and compliance are noted",
                "developer-experience metrics are defined",
            ],
            "programme_manager": [
                "cross-project dependencies are mapped",
                "program-level risks and benefits are tracked",
                "governance and reporting cadence are defined",
                "benefits realization is addressed",
            ],
            "management_consultant": [
                "executive-level framing and recommendations",
                "structured problem decomposition (issue tree)",
                "implementation roadmap with owners and timing",
                "success measures and ROI are defined",
            ],
        }

    # ------------------------------------------------------------------ criteria

    def criteria_for(self, role: str) -> list[str]:
        return self._criteria.get(role, ["response is relevant and complete"])

    def required_sections_for(self, role: str) -> list[str]:
        mapping = {
            "delivery_management": ["Delivery Objective", "Risks & Blockers", "Proposed Timeline"],
            "enterprise_agile_coach": ["Observation", "Agile Principle", "Coaching Questions"],
            "scrum_master": ["Current Sprint State", "Impediment Log", "Scrum Event Guidance"],
            "product_manager": ["Customer Problem", "Prioritization Rationale", "Success Metrics"],
            "product_owner": ["Backlog Items", "Acceptance Criteria", "Definition of Ready"],
            "business_analyst": ["Requirements Elicited", "As-Is Process", "To-Be Process"],
            "user_research": ["Research Question", "Recommended Method", "Ethics"],
            "devops_engineer": ["Pipeline Stages", "Deployment Strategy", "Rollback"],
            "sre": ["SLOs & Error Budget", "Incident Response", "Postmortem"],
            "platform_engineering": ["Golden Path", "Self-Service", "Guardrails"],
            "programme_manager": ["Cross-Project Dependencies", "Program Risks", "Benefits Realization"],
            "management_consultant": ["Problem Frame", "Issue Tree", "Implementation Roadmap"],
        }
        return mapping.get(role, ["Executive Summary", "Key Recommendations", "Next Steps"])

    # ------------------------------------------------------------------ guardrails

    def apply_guardrails(self, response: str) -> GuardrailResult:
        """Sanitize the agent response so no backend internals leak to the UI.

        - Blocks traceback / exception / internal-path leakage.
        - Strips unterminated (incomplete) code fences.
        - Ensures Markdown structure is well-formed for rendering.
        """
        violations: list[str] = []
        sanitized = response or ""

        # 1. Block backend internals from leaking into the UI.
        internal_patterns = [
            r"Traceback \(most recent call last\)",
            r"File \".*\.py\", line",
            r"raise \w+(?:Error|Exception)",
            r"\b(Exception|RuntimeError|ValueError|TypeError|ImportError)\b:",
            r"/(?:AI Projects|Users|home|root|tmp)/[^\s]*",
            r"__pycache__",
            r"\.py[cod]",
        ]
        for pat in internal_patterns:
            if re.search(pat, sanitized, re.IGNORECASE):
                violations.append(f"internal_leak:{pat}")
                sanitized = re.sub(pat, "[REDACTED INTERNAL]", sanitized,
                                   flags=re.IGNORECASE)

        # 2. Strip unterminated / incomplete code fences.
        open_fences = sanitized.count("```")
        if open_fences % 2 != 0:
            violations.append("unterminated_code_fence")
            last = sanitized.rfind("```")
            if last != -1:
                sanitized = sanitized[:last].rstrip() + "\n"

        # 3. Ensure the response ends cleanly.
        sanitized = sanitized.strip()

        passed = len(violations) == 0
        return GuardrailResult(
            passed=passed,
            violations=violations,
            sanitized_response=sanitized,
            meta={"original_length": len(response or ""),
                  "sanitized_length": len(sanitized)},
        )

    # ------------------------------------------------------------------ grading

    def _section_present(self, section_name: str, response_lower: str) -> bool:
        """Case-insensitive, emoji-tolerant check that a required section appears.

        A section such as ``Coaching Questions`` matches headings like
        ``## 🔍 Observation`` / ``## Coaching Questions`` because the whole
        response is lower-cased before the keyword substring test.
        """
        keywords = [w for w in re.findall(r"\w+", section_name.lower()) if len(w) > 3]
        return any(w in response_lower for w in keywords)

    def _grounding_score(self, response: str, response_lower: str) -> float:
        """Score grounding by the citation forms the agent is expected to emit.

        Recognizes ``[Reference #N]``, Markdown URL citations
        ``[Title](URL)`` and known framework attributions (Scrum Guide, Team
        Topologies, DORA, OKRs, RICE, MoSCoW).
        """
        score = 0.0
        if re.search(r"\[Reference\s*#\d+\]", response):
            score += 0.5
        if re.search(r"\[[^\]]+\]\(https?://[^)]+\)", response):
            score += 0.5
        frameworks = ("scrum guide", "team topologies", "dora", "okr", "rice", "moscow")
        if any(fw in response_lower for fw in frameworks):
            score += 0.2
        return min(1.0, score)

    def evaluate(self, role: str, query: str, context: str,
                 response: str) -> EvaluationResult:
        criteria = self.criteria_for(role)
        required_sections = self.required_sections_for(role)
        response_lower = (response or "").lower()
        query_lower = (query or "").lower()

        # --- Stage 1: Relevance (query term coverage) ---
        query_terms = [t for t in re.findall(r"\w+", query_lower) if len(t) > 3]
        matched = sum(1 for t in query_terms if t in response_lower)
        relevance = min(1.0, matched / max(len(query_terms), 1))

        # --- Stage 2: Grounding (citations & framework attributions) ---
        grounding = self._grounding_score(response, response_lower)

        # --- Stage 3: Completeness (length + structure) ---
        length_score = min(1.0, len(response or "") / 400.0)
        has_structure = bool(re.search(r"^#{1,6}\s", response or "", re.MULTILINE))
        completeness = 0.6 * length_score + 0.4 * (1.0 if has_structure else 0.0)

        # --- Stage 4: Formatting (bulleted lists / numbered steps) ---
        has_bullets = bool(re.search(r"^\s*[-*•]\s", response or "", re.MULTILINE))
        has_numbered = bool(re.search(r"^\s*\d+\.\s", response or "", re.MULTILINE))
        formatting = 0.5 * (1.0 if has_bullets else 0.0) + 0.5 * (1.0 if has_numbered else 0.0)

        # --- Stage 5: Role compliance (required sections, case-insensitive, emoji-aware) ---
        sections_found = sum(
            1 for section in required_sections
            if self._section_present(section, response_lower)
        )
        role_compliance = sections_found / max(len(required_sections), 1)

        stage_scores = {
            "relevance": round(relevance, 3),
            "grounding": round(grounding, 3),
            "completeness": round(completeness, 3),
            "formatting": round(formatting, 3),
            "role_compliance": round(role_compliance, 3),
        }

        # Weighted overall score.
        weights = {
            "relevance": 0.20,
            "grounding": 0.25,
            "completeness": 0.15,
            "formatting": 0.15,
            "role_compliance": 0.25,
        }
        score = round(sum(stage_scores[k] * w for k, w in weights.items()), 3)

        passed = score >= self.threshold
        needs_revision = score < self.threshold

        suggestions: list[str] = []
        if relevance < 0.4:
            suggestions.append("Address the specific terms of the user's query more directly.")
        for section in required_sections:
            if not self._section_present(section, response_lower):
                suggestions.append(f"Missing required section: {section}")
        if not has_numbered:
            suggestions.append("Add numbered action steps")
        if not has_bullets:
            suggestions.append("Add bulleted insights")
        has_ref = bool(re.search(r"\[Reference\s*#\d+\]", response))
        has_md_cite = bool(re.search(r"\[[^\]]+\]\(https?://[^)]+\)", response))
        if not has_ref and not has_md_cite:
            suggestions.append("Include inline source citations")

        feedback = (
            f"Scored {score:.2f} against {len(required_sections)} required sections "
            f"(threshold {self.threshold:.2f}). "
            f"Relevance {relevance:.0%}, grounding {grounding:.0%}, "
            f"completeness {completeness:.0%}, formatting {formatting:.0%}, "
            f"role compliance {role_compliance:.0%}."
        )

        return EvaluationResult(
            passed=passed,
            score=score,
            feedback=feedback,
            needs_revision=needs_revision,
            suggestions=suggestions,
            stage_scores=stage_scores,
            meta={"criteria": criteria, "required_sections": required_sections},
        )

    # ------------------------------------------------------------------ critique

    def generate_critique(self, role: str, query: str, context: str,
                          response: str, evaluation: EvaluationResult) -> str:
        weakest = min(evaluation.stage_scores.items(), key=lambda kv: kv[1])
        lines = [
            f"Internal critique for {role.replace('_', ' ')} response:",
            f"Overall score: {evaluation.score:.2f} (threshold {self.threshold:.2f}) - REVISION REQUIRED.",
            "",
            "Weakest dimension:",
            f"- {weakest[0]}: {weakest[1]:.2f}",
            "",
            "Specific issues:",
        ]
        for s in evaluation.suggestions:
            lines.append(f"- {s}")
        lines += [
            "",
            "Required corrections:",
            "- Re-read the user's query and answer it directly.",
            "- Address every role-specific criterion listed above.",
            "- Use clear headings, bulleted lists, and numbered steps.",
            "- Include all expected sections for this role.",
            "- Do not leak internal system details or incomplete code.",
        ]
        return "\n".join(lines)

    def should_revise(self, evaluation: EvaluationResult) -> bool:
        return evaluation.needs_revision and not evaluation.passed

    def filter_and_rank_context(self, query: str, context_docs: list[dict], min_score: float = 0.25) -> tuple[list[dict], dict]:
        """Score, deduplicate, and filter retrieved context chunks before generation.

        Scores each chunk on query-term relevance plus source-authority weight
        (peer-reviewed journal / RAG > article), collapses near-identical
        snippets, drops conflicting duplicate claims (keeping the highest-scored
        copy), and removes low-relevance noise below ``min_score``.

        Returns ``(kept_docs, telemetry)`` where telemetry is
        ``{"kept": int, "filtered_out": int, "sources": {source_type: count}}``.
        """
        if not context_docs:
            return [], {"kept": 0, "filtered_out": 0, "sources": {}}

        query_terms = [t for t in re.findall(r"\w+", (query or "").lower()) if len(t) > 2]
        authority_weight = {
            "openalex": 1.00,   # peer-reviewed journal
            "rag": 0.90,        # vector-store retrieval
            "youtube": 0.85,    # official organizational video
            "duckduckgo": 0.60, # organizational article
            "article": 0.60,
        }

        def _score(doc: dict) -> float:
            text = (doc.get("text", "") or "") + " " + (doc.get("title", "") or "")
            if not query_terms:
                relevance = 0.0
            else:
                lowered = text.lower()
                matched = sum(1 for t in query_terms if t in lowered)
                relevance = matched / len(query_terms)
            source_type = str(doc.get("source_type") or doc.get("source", "rag")).lower()
            weight = authority_weight.get(source_type, 0.5)
            if doc.get("official"):
                weight = min(1.0, weight + 0.1)
            return round(relevance * 0.6 + weight * 0.4, 4)

        # Collapse near-identical snippets (same normalized text).
        seen: set[str] = set()
        unique: list[tuple[float, dict]] = []
        for doc in context_docs:
            snippet = re.sub(r"\s+", " ", (doc.get("text") or doc.get("title") or "")).lower().strip()
            sig = hashlib.sha256(snippet.encode()).hexdigest()[:16]
            if sig in seen:
                continue
            seen.add(sig)
            unique.append((_score(doc), doc))

        # Collapse conflicting duplicate claims: same source + title, keep highest score.
        best_by_claim: dict[tuple[str, str], tuple[float, dict]] = {}
        for score, doc in unique:
            claim_key = (
                str(doc.get("source_type") or doc.get("source", "")).lower(),
                (doc.get("title") or doc.get("source") or "").strip().lower(),
            )
            existing = best_by_claim.get(claim_key)
            if existing is None or score > existing[0]:
                best_by_claim[claim_key] = (score, doc)

        ranked = sorted(best_by_claim.values(), key=lambda x: x[0], reverse=True)

        kept: list[dict] = []
        dropped = 0
        sources: dict[str, int] = {}
        for score, doc in ranked:
            if score < min_score:
                dropped += 1
                continue
            kept.append(doc)
            st = str(doc.get("source_type") or doc.get("source", "unknown")).lower()
            sources[st] = sources.get(st, 0) + 1

        telemetry = {"kept": len(kept), "filtered_out": dropped, "sources": sources}
        return kept, telemetry
