# Lean Bootstrap v2

Status: LAB EXPERIMENT — NOT CANONICAL

## Goal

Preserve exact-head correctness, scope control and interruption recovery while minimizing both document load and project-evidence payload.

Core route:

AGENTS -> CURRENT_STATUS -> task Skill -> compact live evidence -> only necessary domain docs

The full global operating standard is never a default bootstrap dependency.

## Modes

### FAST
Use for:
- status;
- resume;
- exact checkpoint;
- narrow verification;
- small bounded bugs.

Budget:
1. local AGENTS;
2. CURRENT_STATUS if present;
3. matching Skill;
4. compact live Git/PR/check evidence.

### NORMAL
Escalate only when FAST cannot establish active lane, next slice or required intent.

Add at most:
- PROJECT_STATE;
- one relevant domain document, preferably from the active exact head when the work exists only on that branch.

### DEEP
Use only for genuine architecture/policy/risk ambiguity.

Add only what is required from:
- DECISIONS;
- ROADMAP;
- relevant debt slice;
- global Operating System;
- research.

## Context rules

1. Read nothing "just in case".
2. Do not reread unchanged files in one pass.
3. Prefer CURRENT_STATUS for volatile routing hints, not truth.
4. Prefer live compact GitHub evidence for current SHA/state/checks.
5. Use prose docs for intent and sequencing.
6. Stop reading when the answer is provable.
7. Record every escalation.
8. Avoid generic REST payloads that include commit diffs/files/body content when only SHA/state/conclusion is needed.
9. Domain docs for an active PR are read from the active exact head first when they are not on main.
10. Never infer the canonical active lane from PR recency alone.

## Active-lane semantics

CURRENT_STATUS may declare:
- KNOWN — one canonical active lane;
- NONE — no active implementation lane;
- AMBIGUOUS — multiple plausible lanes and no canonical routing proof.

If CURRENT_STATUS is absent and multiple open implementation PRs exist:
1. do not guess using recency;
2. enter `AMBIGUOUS_ACTIVE_LANE`;
3. use at most NORMAL evidence to resolve it from canonical project/domain state;
4. if still unresolved, report ambiguity explicitly instead of manufacturing a next feature.

## Volatile SHA semantics

A status file cannot authoritatively store the SHA of the branch commit that contains itself.

Therefore:
- `observed_main_head` and `observed_active_head` are snapshots;
- `last_verified_head` is a verified checkpoint;
- live Git state is authoritative for current head;
- snapshot/head mismatch is classified, not automatically treated as regression.

## Verification semantics

- PASS = required gate executed successfully on the exact relevant revision.
- PENDING / OPEN / READY_NOT_EXECUTED / SKIPPED are not PASS.
- Historical PASS is not current PASS after head movement.
- PR-head verification is not automatically merge-commit verification.
- Open/unmerged is not merged.

## Evidence budget

For status/resume tasks, target:
- <= 13 project-evidence requests;
- 0 broad schema dumps;
- 0 generic commit-diff fetches;
- 0 repeated document reads;
- <= 1 NORMAL escalation.

Exceeding the target is allowed only when live ambiguity genuinely requires it, and the reason must be recorded.

## Promotion condition

Lean v2 is promotable only if repeated live benchmarks preserve correctness and materially reduce:
- task-evidence requests;
- payload size;
- failed probes;
- human correction risk.
