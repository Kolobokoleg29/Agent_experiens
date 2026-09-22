# PASS G — Lean v2.1 Clean Promotion Benchmark

Goal: perform one final clean stability run after fixing the compact PR discovery response contract.

This is NOT a new Lean version. It tests Lean v2.1 with a fixed connector/projection contract.

READ ONLY for FILIK2.

## Inputs
Read only from Agent_experiens branch `lab/lean-bootstrap-evals`:
1. `lab/LEAN_BOOTSTRAP.md`
2. `.agents/skills/project-audit/SKILL.md`
3. `lab/GITHUB_FAST_PATH.md`
4. `lab/GITHUB_PR_DISCOVERY_CONTRACT.md`
5. this file

Do not load the global Operating System.

## Known PR discovery contract
Use `mcp__GitHub__search_prs` directly.
Read returned PRs from `result.issues`.

Project locally:
- number
- title
- state
- draft
- head_sha
- updated_at
- optional head_ref
- optional base_ref

Do not rediscover this schema.
Do not use search_issues.
Do not repeat search_prs because optional fields are absent.
Do not rerun successful evidence only to change projection/format.

## Task
Recover current FILIK2:
- main head/state;
- canonical active lane or AMBIGUOUS_ACTIVE_LANE;
- active exact head if known;
- last exact VERIFIED checkpoint;
- blocking gate;
- exactly one next slice when evidence supports it.

## Constraints
- probe CURRENT_STATUS once;
- no generic commit-diff fetch;
- no search_branches if it cannot provide needed SHA;
- at most one NORMAL escalation;
- no DEEP;
- no repeated document reads;
- no repeated open-PR query unless repository state demonstrably changed during the run.

## Metrics
Record:
- TASK_EVIDENCE_REQUESTS
- TOOL_DISCOVERY_CALLS
- repeated evidence requests
- failed/empty calls
- NORMAL/DEEP escalation
- largest project payload
- unsupported assumptions
- correctness/recoverability

## Promotion thresholds
Correctness:
- PASS exact-head semantics;
- no PASS transfer between SHA;
- no guessed active lane;
- 0 unsupported material assumptions.

Efficiency:
- target <=10 FILIK2 evidence requests;
- acceptable <=11;
- hard ceiling 13;
- 0 duplicate search_prs;
- 0 broad schema dumps;
- 0 search_issues PR discovery;
- 0 generic commit-diff fetches;
- 0 repeated docs caused by orchestration.

Recoverability:
- current lane/checkpoint recovered correctly, or ambiguity reported explicitly.

## Promotion verdict
Return:
- Correctness PASS/PARTIAL/FAIL
- Efficiency PASS/PARTIAL/FAIL
- Recoverability PASS/PARTIAL/FAIL
- Lean v2.1 promotion READY / NOT READY

READY requires correctness PASS, recoverability PASS, efficiency PASS and no connector/projection violation.

If READY, do not propose Lean v2.2. The next action becomes controlled canonical adoption, not more micro-optimization.

If NOT READY, name only the single remaining blocker.
