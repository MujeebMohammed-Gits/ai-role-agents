import sys; sys.path.insert(0, 'backend')
from core.evaluation import SelfEvaluator
ev = SelfEvaluator().evaluate('enterprise_agile_coach', 'Agile transformation pilot in healthcare', 'Scrum Guide LeSS Team Topologies', '## Observation\nPilot context.\n## Agile Principle(s) at Play\n- Autonomy [Reference #1]\n## Coaching Questions\n1. What outcome?\n## Recommended Pilot Experiment\n1. Start small\n```mermaid\nflowchart TD\nA["Start"] --> B["Pilot"]\n```\n| Phase | Goal |\n|---|---|\n| S1 | MVP |\n## 💡 Suggested Next Steps & Follow-Up Questions\n- Next step?')
print('EVAL_SCORE:', ev.score, 'PASSED:', ev.passed)
assert ev.score >= 0.90 and ev.passed
