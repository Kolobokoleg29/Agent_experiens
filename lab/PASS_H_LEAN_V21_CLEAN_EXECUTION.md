# PASS H — Lean v2.1 Clean Execution Benchmark

Goal: determine whether Lean v2.1 is promotion-ready when the already-known GitHub contracts are executed cleanly.

This is NOT a new Lean version.
Do not modify Lean routing during this benchmark.

READ ONLY for FILIK2.

## Inputs
From Agent_experiens branch `lab/lean-bootstrap-evals`, read only:
1. `lab/LEAN_BOOTSTRAP.md`
2. `.agents/skills/project-audit/SKILL.md`
3. `lab/GITHUB_FAST_PATH.md`
4. `lab/GITHUB_PR_DISCOVERY_CONTRACT.md`
5. this file

Do not open the global Operating System.

## Zero-discovery rule
All actions used by the benchmark are treated as known.

TOOL_DISCOVERY_CALLS must be 0.

Do not inspect:
- ALL_TOOLS;
- namespace listings;
- tool descriptions;
- schemas;
- alternative action names.

If an intended action cannot be called with the known contract, record `EXECUTION_CONTRACT_BLOCKED` instead of discovering another tool.

## Open PR discovery
Use exactly one:
`mcp__GitHub__search_prs`

Known response collection:
`result.issues`

Project locally:
- number
- title
- state
- draft
- head_sha
- updated_at
- optional head_ref
- optional base_ref

Do not repeat the query solely for projection/formatting.

## Heavy-payload ban
Do NOT use `mcp__GitHub__fetch_pr` for checkpoint/identity recovery because it may return a large diff.

Do not use:
- broad commit diff;
- changed-file collections;
- full PR diff;
- broad schema responses.

If a past PR exact SHA is needed, prefer already-authoritative project evidence plus exact-SHA workflow evidence, or a compact PR/search result path.

A historical checkpoint is acceptable only if its full SHA and PASS evidence are both proved without heavyweight diff payload.

## Task
Recover current FILIK2:
- current main head/state;
- canonical active lane or AMBIGUOUS_ACTIVE_LANE;
- active exact head if known;
- last exact VERIFIED checkpoint;
- current blocking gate;
- exactly one next slice when evidence supports it.

## Constraints
- one CURRENT_STATUS probe;
- exactly one open search_prs unless repository state demonstrably changes and a re-read is required for correctness;
- at most one NORMAL escalation;
- no DEEP;
- no repeated docs;
- no heavy PR fetch;
- no schema/tool discovery.

## Exact-head rule
Never transfer PASS:
- PR head -> merge SHA;
- historical SHA -> current SHA;
- previous active head -> moved active head.

If live head changes during the run, mark the old observation historical and verify the new current head separately.

## Metrics
Record:
- TASK_EVIDENCE_REQUESTS
- TOOL_DISCOVERY_CALLS
- heavy-payload violations
- repeated evidence requests
- failed/empty calls
- NORMAL/DEEP escalation
- largest project response chars/tokens
- unsupported assumptions

## Promotion thresholds
Correctness:
- PASS exact-head semantics;
- no guessed active lane;
- 0 unsupported material assumptions.

Efficiency:
- target <=10 FILIK2 evidence requests;
- acceptable <=11;
- hard ceiling 13;
- TOOL_DISCOVERY_CALLS = 0;
- heavy-payload violations = 0;
- duplicate search_prs = 0;
- broad schema dumps = 0;
- generic diff fetches = 0;
- repeated docs = 0.

Recoverability:
- current lane/checkpoint recovered correctly, or ambiguity is explicit.

## Final verdict
Return:
- Correctness PASS/PARTIAL/FAIL
- Efficiency PASS/PARTIAL/FAIL
- Recoverability PASS/PARTIAL/FAIL
- Lean v2.1 promotion READY / NOT READY

READY requires all three PASS plus zero execution-contract violations.

If READY:
- stop Lean micro-optimization;
- next phase is CONTROLLED CANONICAL ADOPTION.

If NOT READY:
- name only the single remaining execution blocker;
- do not create Lean v2.2 unless the blocker is actually in Lean logic.
