# PASS F — Lean v2.1 stability benchmark

Goal: verify that standardizing compact PR discovery creates real headroom below PASS E's 13 evidence-request ceiling.

READ ONLY for FILIK2.

## Inputs
Read only from Agent_experiens branch `lab/lean-bootstrap-evals`:
1. `lab/LEAN_BOOTSTRAP.md`
2. `.agents/skills/project-audit/SKILL.md`
3. `lab/GITHUB_FAST_PATH.md`
4. this file

Do not load the global Operating System.

## Critical rule
For open PR discovery, use exactly:
`mcp__GitHub__search_prs`

with:
- repository_full_name = Kolobokoleg29/FILIK2
- state = open
- query = ""
- topn = smallest sufficient cap (normally 20)

Project immediately to minimal fields.
Do not try search_issues.
Do not discover an alternative PR-search tool first.

## Task
Recover:
- current main head/state;
- active lane or AMBIGUOUS_ACTIVE_LANE;
- active exact head if lane is known;
- last exact VERIFIED checkpoint;
- blocking gate;
- exactly one next slice only if evidence supports it.

## Metrics
Record:
- TASK_EVIDENCE_REQUESTS
- TOOL_DISCOVERY_CALLS
- failed/empty calls
- repeated reads
- NORMAL/DEEP escalation
- largest project payload
- unsupported assumptions
- correctness/recoverability

## Success target
Correctness:
- PASS semantics identical to PASS E;
- no guessed lane;
- no SHA transfer.

Efficiency:
- target <=11 FILIK2 evidence requests;
- hard ceiling 13;
- 0 issue-search attempts for PR discovery;
- 0 repeated AGENTS/doc reads caused by orchestration failure;
- 0 broad commit-diff fetches;
- <=1 NORMAL escalation;
- 0 DEEP.

## Verdict
Report:
- Correctness PASS/PARTIAL/FAIL
- Efficiency PASS/PARTIAL/FAIL
- Recoverability PASS/PARTIAL/FAIL
- whether v2.1 is stable enough to promote from lab candidate to proposed canonical bootstrap.

Do not modify any repository during the benchmark.
