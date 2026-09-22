# GitHub Fast Path — Lean v2.1

Status: LAB ONLY

Purpose: minimize connector-schema overhead and project-evidence payload without weakening exact-head verification.

## Canonical open-PR discovery primitive

For repository-scoped open PR identity, use this path first:

`mcp__GitHub__search_prs`

Arguments:
- `repository_full_name=<owner/repo>`
- `state="open"`
- `query=""`
- `topn=20` (or the smallest sufficient cap)

Immediately project each result down to:
- number
- title
- state
- draft
- head_ref when available
- head_sha
- base_ref when available
- updated_at

Do NOT use `search_issues` for PR discovery.
Do NOT fetch individual PR bodies merely to discover open PR identity.
Do NOT enumerate tool schemas when this action is already known.

Validated in lab against FILIK2 on 2026-09-22: one call returned open PRs #95, #96 and #99.

## Discovery rule

Never enumerate the GitHub namespace or print broad schema catalogs.

If a genuinely unknown tool signature is needed:
1. query the exact tool name only;
2. emit only compact metadata for that tool;
3. count it under TOOL_DISCOVERY_CALLS.

Do not preload tools that may be useful later.

## Project-evidence rule

Prefer the narrowest response that proves the fact.

Needed fact -> desired payload:
- default branch head -> SHA only;
- open PR identity -> canonical `search_prs` path above;
- specific PR state -> number/state/draft/head/base only;
- exact-head checks -> run/job name + status/conclusion only;
- step proof -> only relevant job step summaries;
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
- preferably <= 11 after canonical PR discovery is available;
- no broad schema dump;
- no generic commit-diff payload;
- no repeated file reads;
- no avoidable 404 probes.

Correctness outranks the budget.
