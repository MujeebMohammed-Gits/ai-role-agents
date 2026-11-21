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

    def evaluate(self, role: str, query: str, context: str,
                 response: str) -> EvaluationResult:
        criteria = self.criteria_for(role)
        response_lower = (response or "").lower()
        query_lower = (query or "").lower()

        # --- Stage 1: Relevance (query term coverage) ---
        query_terms = [t for t in re.findall(r"\w+", query_lower) if len(t) > 3]
        matched = sum(1 for t in query_terms if t in response_lower)
        relevance = min(1.0, matched / max(len(query_terms), 1))

        # --- Stage 2: Criterion coverage (role-specific) ---
        covered = 0
        for criterion in criteria:
            key_words = [w for w in re.findall(r"\w+", criterion) if len(w) > 4]
            if any(w in response_lower for w in key_words):
                covered += 1
        coverage = covered / max(len(criteria), 1)

        # --- Stage 3: Completeness (length + structure) ---
        length_score = min(1.0, len(response or "") / 400.0)
        has_structure = bool(re.search(r"^#{1,6}\s", response or "", re.MULTILINE))
        completeness = 0.6 * length_score + 0.4 * (1.0 if has_structure else 0.0)

        # --- Stage 4: Formatting (bulleted lists / numbered steps) ---
        has_bullets = bool(re.search(r"^\s*[-*•]\s", response or "", re.MULTILINE))
        has_numbered = bool(re.search(r"^\s*\d+\.\s", response or "", re.MULTILINE))
        formatting = 0.5 * (1.0 if has_bullets else 0.0) + 0.5 * (1.0 if has_numbered else 0.0)

        # --- Stage 5: Constraint compliance (sections present) ---
        required_sections = {
            "delivery_management": ["delivery objective", "risks & blockers", "proposed timeline"],
            "enterprise_agile_coach": ["observation", "agile principle", "coaching questions"],
            "scrum_master": ["current sprint state", "impediment log", "scrum event guidance"],
            "product_manager": ["customer problem", "prioritization rationale", "success metrics"],
            "product_owner": ["backlog items", "acceptance criteria", "definition of ready"],
            "business_analyst": ["requirements elicited", "as-is process", "to-be process"],
            "user_research": ["research question", "recommended method", "ethics"],
            "devops_engineer": ["pipeline stages", "deployment strategy", "rollback"],
            "sre": ["slo", "error budget", "incident", "postmortem"],
            "platform_engineering": ["golden path", "self-service", "guardrails"],
            "programme_manager": ["cross-project dependency", "program risks", "benefit"],
            "management_consultant": ["problem frame", "issue tree", "implementation roadmap"],
        }[role]
        sections_found = 0
        for section in required_sections:
            section_keywords = [w for w in re.findall(r"\w+", section) if len(w) > 3]
            if any(w in response_lower for w in section_keywords):
                sections_found += 1
        constraint_compliance = sections_found / max(len(required_sections), 1)

        stage_scores = {
            "relevance": round(relevance, 3),
            "criterion_coverage": round(coverage, 3),
            "completeness": round(completeness, 3),
            "formatting": round(formatting, 3),
            "constraint_compliance": round(constraint_compliance, 3),
        }

        # Weighted overall score.
        weights = {
            "relevance": 0.20,
            "criterion_coverage": 0.25,
            "completeness": 0.15,
            "formatting": 0.15,
            "constraint_compliance": 0.25,
        }
        score = round(sum(stage_scores[k] * w for k, w in weights.items()), 3)

        passed = score >= self.threshold
        needs_revision = score < self.threshold

        suggestions: list[str] = []
        if relevance < 0.4:
            suggestions.append("Address the specific terms of the user's query more directly.")
        if coverage < 0.6:
            suggestions.append(f"Cover more of the role criteria: {', '.join(criteria[:3])}.")
        if completeness < 0.5:
            suggestions.append("Expand the response with more structured detail.")
        if formatting < 0.5:
            suggestions.append("Use bulleted or numbered lists to structure the answer.")
        if constraint_compliance < 0.6:
            suggestions.append(f"Include the expected sections: {', '.join(required_sections[:3])}.")

        feedback = (
            f"Scored {score:.2f} against {len(criteria)} role criteria "
            f"(threshold {self.threshold:.2f}). "
            f"Relevance {relevance:.0%}, coverage {coverage:.0%}, "
            f"completeness {completeness:.0%}, formatting {formatting:.0%}, "
            f"constraint compliance {constraint_compliance:.0%}."
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
