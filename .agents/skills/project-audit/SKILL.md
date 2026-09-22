---
name: project-audit
description: Recover exact current project state with minimum context and compact evidence. Use for status, resume, checkpoint and next-slice questions.
---

# Project Audit — Lean v2.1

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
2. Probe CURRENT_STATUS once. If absent, record `STATUS_MISSING`; do not retry.
3. Verify live default-branch HEAD with the smallest response available.
4. If status does not name a canonical lane, discover open PRs with:
   - `mcp__GitHub__search_prs`
   - repository-scoped
   - `state=open`
   - `query=""`
   - read collection from `result.issues`
   - project only number/title/state/draft/head_sha/updated_at and optional head_ref/base_ref.
   Never use issue search for PR discovery.
   Never rerun identical successful search_prs solely to repair local projection.
5. Resolve active work:
   - if CURRENT_STATUS says KNOWN, verify only that PR/branch;
   - if it says AMBIGUOUS, verify only declared candidates;
   - if status is missing and multiple implementation PRs are plausible, set `AMBIGUOUS_ACTIVE_LANE`; do not choose by recency.
6. Verify live active head when lane is known.
7. Verify required checks on that exact head using workflow/job summaries; load step details only when workflow label is insufficient.
8. Never use PR-only workflow lookup on merge commit when semantics exclude it.
9. Compare snapshots vs live state and mark STALE/MISMATCH.
10. If active lane/next slice remains ambiguous, escalate once to NORMAL:
   - PROJECT_STATE;
   - at most one relevant domain document;
   - read branch-specific domain evidence from active exact head first.
11. If ambiguity remains, return `AMBIGUOUS_ACTIVE_LANE`; do not invent next feature.
12. Distinguish merged main checkpoint, unmerged verified checkpoint and historical checkpoint.
13. Stop when current head, lane/ambiguity, verified checkpoint, blocking gate and next slice when provable are established.

## Compact-evidence rule

Avoid:
- full commit diffs;
- changed-file arrays;
- repeated PR bodies;
- broad issue-search payloads;
- large unrelated metadata;
- duplicate evidence requests caused only by local formatting/projection mistakes.

A successful evidence response should be reused locally whenever possible.

## Verification semantics

- PASS = required gate executed successfully on exact relevant revision.
- OPEN/PENDING/READY_NOT_EXECUTED/SKIPPED != PASS.
- Historical green evidence != current PASS.
- Open/unmerged != merged.
- PR-head PASS != merge-SHA PASS unless gate actually ran on merge SHA.
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
- CONNECTOR_CONTRACT_MISMATCH;
- VERIFICATION_PENDING;
- BLOCKED;
- UNKNOWN.

Never turn ambiguity into a confident execution decision.

## Learning loop
Prefer improving compact status/evidence contracts over adding mandatory reading.
