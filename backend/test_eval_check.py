import sys, re

sys.path.insert(0, r"C:\AI Projects\role-agents\backend")

# 1. Check QUALITY_DIRECTIVE source has zero internal evaluation narrative.
with open(r"C:\AI Projects\role-agents\backend\agents\base.py", encoding="utf-8") as f:
    base_src = f.read()

# The leaked meta-narrative phrases the user reported must NOT appear in the directive.
forbidden = [
    "Strengthened Query Term Coverage",
    "push the self-evaluation score past 0.87",
    "Domain keywords addressed",
    "exceed the 0.87 threshold",
    "self-evaluation score exceeds",
    "keyword coverage",
]
for phrase in forbidden:
    assert phrase.lower() not in base_src.lower(), f"FORBIDDEN narrative in base.py: {phrase}"

# The strict thumb rule must be present.
assert "Answer ONLY what the user asked" in base_src
assert "Never mention evaluation scores" in base_src
print("QUALITY_DIRECTIVE clean: no internal eval narrative; strict thumb rule present")

# 2. SelfEvaluator unit test on a clean query-only response.
from core.evaluation import SelfEvaluator

evaluator = SelfEvaluator()
query = "How does an enterprise agile coach improve team delivery predictability?"
context = ("enterprise agile coaching delivery predictability sprint forecast velocity "
           "team topologies scrum guide kanban sustainable pace")
response = """## Observation
Teams commit to sprint goals but often miss them, eroding stakeholder confidence and delivery predictability.

## Agile Principle
Agile promotes sustainable pace and predictable delivery through iterative feedback. The Scrum Guide emphasizes transparency, inspection, and adaptation so teams improve predictability over time. Team Topologies and Kanban also support flow-based predictability.

## Coaching Questions
- What patterns do you see in missed commitments?
- How might the team forecast capacity more realistically?
- What small experiment could improve predictability next sprint?

- Bullet: use historical throughput to set realistic sprint forecasts
- Bullet: make impediments visible and act on them quickly
- Bullet: coach the team on sustainable pace rather than heroic overtime

1. Numbered step: collect the last 6 sprints of actual velocity data
2. Numbered step: run a forecasting workshop with the team
3. Numbered step: review the forecast every sprint and adjust

[Reference #1]
[Scrum Guide](https://www.scrumguides.org/scrum-guide.html) describes empiricism as the foundation for predictable delivery.
[Team Topologies](https://teamtopologies.com/) describes how team structure affects flow.
Kanban limits work in progress to smooth delivery.

```mermaid
flowchart TD
    A[Plan] --> B[Build]
    B --> C[Measure]
    C --> D[Learn]
    D --> A
```

## 💡 Suggested Next Steps & Follow-Up Questions
- What is one metric you will track to improve predictability?
- How will you coach the team to set realistic commitments?
"""

result = evaluator.evaluate("enterprise_agile_coach", query, context, response)
print("score:", result.score, "passed:", result.passed)
print("stage_scores:", result.stage_scores)
assert result.score >= 0.90, f"Score {result.score} below 0.90"
assert result.passed is True
print("ALL TESTS PASSED")
