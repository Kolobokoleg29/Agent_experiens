---
name: project-audit
description: Recover exact current project state with minimum context and compact evidence. Use for status, resume, checkpoint and next-slice questions.
---

# Project Audit — Lean v2

## Trigger
Use for:
- current stage/status;
- resume after interruption;
- last completed/verified step;
- exact checkpoint;
- next one development slice.

Do not use for implementation or broad product research.

## Outcome
Return:
1. current main state;
2. canonical active work item, or `AMBIGUOUS_ACTIVE_LANE`;
3. current active head snapshot;
4. last exact VERIFIED checkpoint;
5. only execution-constraining debt/gates;
6. exactly one next slice when the lane is known;
7. explicit mismatches/unknowns.

## FAST inputs
1. local AGENTS;
2. CURRENT_STATUS if present;
3. this Skill;
4. compact live default-branch / PR / exact-head check evidence.

Do not preload PROJECT_STATE, ROADMAP, DECISIONS, debt or global OS.

## Workflow

1. Read local AGENTS.
2. Read CURRENT_STATUS if present. A missing file is not an error condition; record `STATUS_MISSING` and continue.
3. Verify live default-branch HEAD with the smallest response available.
4. Resolve active work:
   - if CURRENT_STATUS says KNOWN, verify that PR/branch;
   - if it says AMBIGUOUS, verify only declared candidates;
   - if status is missing and multiple implementation PRs are plausible, set `AMBIGUOUS_ACTIVE_LANE`; do not choose by recency.
5. Verify the live active head.
6. Verify required checks on that exact head using workflow/job summaries; load step details only when the workflow label is insufficient to establish the required gate.
7. Never use a PR-only workflow lookup on a merge commit when the action semantics are known not to cover it.
8. Compare snapshots vs live state and mark STALE/MISMATCH where appropriate.
9. If active lane/next slice remains ambiguous, escalate once to NORMAL:
   - PROJECT_STATE;
   - one relevant domain document;
   - read branch-specific domain evidence from the active exact head before trying main when the document belongs to that PR.
10. If ambiguity remains, return `AMBIGUOUS_ACTIVE_LANE` rather than guessing.
11. Distinguish merged main checkpoint, unmerged verified checkpoint and historical checkpoint.
12. Stop when current head, active lane, verified checkpoint, constraining gate and next slice are proved.

## Compact-evidence rule

Avoid project evidence that returns:
- full commit diffs;
- changed-file arrays;
- repeated PR bodies;
- large unrelated metadata.

If only SHA/state/draft/head/check conclusion is needed, use a compact action/result path.

## Verification semantics

- PASS = required gate executed successfully on the exact relevant revision.
- OPEN/PENDING/READY_NOT_EXECUTED/SKIPPED != PASS.
- Historical green evidence != current PASS.
- Open/unmerged != merged.
- PR-head PASS != merge-SHA PASS unless the required gate was actually run on the merge SHA.
- live GitHub state outranks stale volatile prose.

## Evidence accounting
Record separately:
- TASK_EVIDENCE_REQUESTS;
- TOOL_DISCOVERY_CALLS;
- failed/empty calls;
- file reads;
- unique docs;
- repeated reads;
- approximate payload/text loaded;
- escalation mode/reason.

## Failure policy
Use explicit states:
- STATUS_MISSING;
- STALE_STATUS;
- AMBIGUOUS_ACTIVE_LANE;
- VERIFICATION_PENDING;
- BLOCKED;
- UNKNOWN.

Never turn ambiguity into a confident execution decision.

## Learning loop
Prefer improving compact status/evidence surfaces over adding more mandatory reading.
