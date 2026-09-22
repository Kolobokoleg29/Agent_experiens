# GitHub Fast Path — Lean v2

Status: LAB ONLY

Purpose: minimize connector-schema overhead and project-evidence payload without weakening exact-head verification.

## Discovery rule

Never enumerate the GitHub namespace or print broad schema catalogs.

If a tool signature is unknown:
1. query the exact tool name only;
2. emit only compact metadata for that tool;
3. count it under TOOL_DISCOVERY_CALLS.

Do not preload tools that may be useful later.

## Project-evidence rule

Prefer the narrowest response that proves the fact.

Needed fact -> desired payload:
- default branch head -> SHA only;
- PR identity -> number/state/draft/head/base only;
- exact-head checks -> run/job name + status/conclusion only;
- step proof -> only the relevant job's step summaries;
- review gate -> review state/count only.

Avoid:
- generic commit endpoints that include full diff/files;
- broad pull-list bodies when only PR identity is needed;
- fetching the same PR body twice;
- PR-only workflow actions on merge commits when their semantics exclude push/merge runs.

## Branch-specific docs

When a current work item is a PR and its domain/evidence doc was introduced on that branch:
1. read it at the active exact head first;
2. do not probe main first merely out of habit.

## Active-lane discovery

If CURRENT_STATUS is absent:
- zero plausible implementation PRs -> NONE;
- one plausible implementation PR -> verify it;
- multiple plausible implementation PRs -> AMBIGUOUS_ACTIVE_LANE.

Do not use "most recently updated" as canonical truth.

Escalate to at most PROJECT_STATE + one domain doc before reporting unresolved ambiguity.

## Accounting

Keep separate:
- TASK_EVIDENCE_REQUESTS
- TOOL_DISCOVERY_CALLS
- TOOL_DISCOVERY_CONTEXT
- PROJECT_EVIDENCE_CONTEXT

A request can be cheap in count but expensive in payload; report both.

## Budget target

Status/resume benchmark target:
- <= 13 project-evidence requests;
- no broad schema dump;
- no generic commit-diff payload;
- no repeated file reads;
- no avoidable 404 probes.

Correctness outranks the budget.
