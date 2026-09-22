# PASS E — Lean v2 live recovery benchmark

Goal: test whether Lean v2 fixes the two PASS D bottlenecks:
1. oversized project-evidence payloads;
2. ambiguous active-lane recovery.

READ ONLY for FILIK2.

## Inputs
From Agent_experiens branch `lab/lean-bootstrap-evals`, read only:
1. `lab/LEAN_BOOTSTRAP.md`
2. `.agents/skills/project-audit/SKILL.md`
3. `lab/GITHUB_FAST_PATH.md`
4. this file

Do not preload the global Operating System.

## Task
For current live FILIK2 determine:
- current main head/state;
- canonical active lane, or explicit AMBIGUOUS_ACTIVE_LANE;
- active exact head when known;
- last exact VERIFIED checkpoint;
- current blocking gate;
- exactly one next slice when evidence supports one.

## Required behavior
- Probe CURRENT_STATUS only once.
- If absent and multiple plausible implementation PRs exist, begin with AMBIGUOUS_ACTIVE_LANE.
- Do not choose by recency.
- Escalate at most to PROJECT_STATE + one domain document.
- If domain evidence belongs to a PR branch, read it from active exact head first.
- Do not fetch full commit diffs/files when only SHA/state is needed.
- Do not use PR-only workflow lookup on a merge SHA when semantics exclude it.
- Do not fetch the same PR body/list twice unless state changed during the run.

## Accounting
Separate:
- TASK_EVIDENCE_REQUESTS
- TOOL_DISCOVERY_CALLS
- PROJECT_EVIDENCE_CONTEXT
- TOOL_DISCOVERY_CONTEXT

Also record:
- failed/empty calls;
- unique docs;
- repeated reads;
- approximate chars/tokens of largest evidence response.

## Success targets
Correctness:
- exact-head semantics preserved;
- merged/open state correct;
- no historical PASS transfer;
- no guessed active lane.

Efficiency:
- <= 13 FILIK2 evidence requests, unless a genuine live ambiguity requires more;
- no broad project response > ~10k tokens unless unavoidable;
- 0 repeated document reads;
- <= 1 avoidable failed probe;
- no DEEP escalation for a normal status/recovery task.

## Verdict
Return:
- PASS / PARTIAL / FAIL for correctness;
- PASS / PARTIAL / FAIL for efficiency;
- exact remaining bottleneck;
- recommended Lean v2.1 change, if any.

Do not modify FILIK2 or Agent_experiens during the benchmark.
