"""Role registry.

Maps every role in the mesh to its system-prompt file and a short
description used by the frontend agent gallery.
"""

from __future__ import annotations

ROLES: dict[str, dict[str, str]] = {
    "delivery_management": {
        "title": "Delivery Management",
        "subtitle": "Program delivery & release orchestration",
        "description": "Owns end-to-end delivery: milestones, release trains, stakeholder communication, and risk escalation.",
        "prompt_file": "delivery_management.md",
    },
    "enterprise_agile_coach": {
        "title": "Enterprise Agile Coach",
        "subtitle": "Agile transformation at scale",
        "description": "Coaches teams and leadership on agile values, surfacing organizational impediments and guiding sustainable adoption.",
        "prompt_file": "enterprise_agile_coach.md",
    },
    "scrum_master": {
        "title": "Scrum Master",
        "subtitle": "Scrum facilitation & impediment removal",
        "description": "Facilitates scrum events, protects the team, and removes impediments so the team can self-organize and deliver.",
        "prompt_file": "scrum_master.md",
    },
    "product_manager": {
        "title": "Product Manager",
        "subtitle": "Product strategy & value",
        "description": "Defines the product vision, prioritizes by customer and business value, and owns success metrics.",
        "prompt_file": "product_manager.md",
    },
    "product_owner": {
        "title": "Product Owner",
        "subtitle": "Backlog ownership & story definition",
        "description": "Owns the product backlog, writes well-formed stories with acceptance criteria, and represents stakeholder needs.",
        "prompt_file": "product_owner.md",
    },
    "business_analyst": {
        "title": "Business Analyst",
        "subtitle": "Requirements & process analysis",
        "description": "Elicits, analyzes, and documents requirements; models as-is / to-be processes; assesses stakeholder impact.",
        "prompt_file": "business_analyst.md",
    },
    "user_research": {
        "title": "User Research",
        "subtitle": "Evidence-led product decisions",
        "description": "Plans and runs research, synthesizes findings, and ensures decisions are grounded in user evidence and ethics.",
        "prompt_file": "user_research.md",
    },
    "devops_engineer": {
        "title": "DevOps Engineer",
        "subtitle": "CI/CD & deployment automation",
        "description": "Builds and runs CI/CD pipelines, infrastructure as code, and reliable deployment/rollback practices.",
        "prompt_file": "devops_engineer.md",
    },
    "sre": {
        "title": "Site Reliability Engineering",
        "subtitle": "Reliability, SLOs & incident response",
        "description": "Defines SLOs/SLIs and error budgets, leads incident response and postmortems, and drives reliability improvement.",
        "prompt_file": "sre.md",
    },
    "platform_engineering": {
        "title": "Platform Engineering",
        "subtitle": "Internal developer platform",
        "description": "Designs golden paths, self-service tooling, and platform guardrails that improve developer experience.",
        "prompt_file": "platform_engineering.md",
    },
    "programme_manager": {
        "title": "Programme Manager",
        "subtitle": "Cross-project program governance",
        "description": "Manages interdependencies across projects, tracks program-level risks and benefits, and runs governance reporting.",
        "prompt_file": "programme_manager.md",
    },
    "management_consultant": {
        "title": "Management Consultant",
        "subtitle": "Executive strategy & advisory",
        "description": "Provides executive-level framing, structured problem decomposition, and implementation roadmaps with owners and timing.",
        "prompt_file": "management_consultant.md",
    },
}

ALL_ROLES = list(ROLES.keys())
