# GitHub Fast Path — Lean v2.1 (contract-hardened)

Status: LAB ONLY

Purpose: minimize connector-schema overhead and project-evidence payload without weakening exact-head verification.

## Canonical open-PR discovery primitive

Use:
`mcp__GitHub__search_prs`

Arguments:
- `repository_full_name=<owner/repo>`
- `state="open"`
- `query=""`
- `topn=20` (or smaller sufficient cap)

Read the returned collection from:

`result.issues`

Immediately project each PR to:
- number
- title
- state
- draft
- head_sha
- updated_at
- head_ref if present
- base_ref if present

`head_ref` and `base_ref` are optional. Missing optional fields are not projection failure.

See `lab/GITHUB_PR_DISCOVERY_CONTRACT.md`.

Do NOT:
- use search_issues for PR discovery;
- fetch individual PR bodies merely to discover open PR identity;
- enumerate tool schemas for this known action;
- rerun successful search_prs solely because local projection expected the wrong wrapper or optional field.

## Discovery rule

Never enumerate the GitHub namespace or print broad schema catalogs.

If a genuinely unknown tool signature is needed:
1. query the exact tool name only;
2. emit only compact metadata for that tool;
3. count it under TOOL_DISCOVERY_CALLS.

Do not preload tools that may be useful later.

## Project-evidence rule

Needed fact -> desired payload:
- default branch head -> SHA only;
- open PR identity -> canonical search_prs contract above;
- specific PR state -> number/state/draft/head/base only;
- exact-head checks -> run/job name + status/conclusion only;
- step proof -> relevant job step summaries only;
- review gate -> review state/count only.

Avoid:
- generic commit endpoints with full diff/files;
- broad pull-list bodies when only identity is needed;
- fetching the same PR body twice;
- PR-only workflow actions on merge commits when semantics exclude push/merge runs;
- search_branches when it cannot return the required SHA.

## Branch-specific docs

When a current work item is a PR and its domain/evidence doc was introduced on that branch:
1. read it at active exact head first;
2. do not probe main first by habit.

## Active-lane discovery

If CURRENT_STATUS is absent:
- zero plausible implementation PRs -> NONE;
- one plausible implementation PR -> verify it;
- multiple plausible implementation PRs -> AMBIGUOUS_ACTIVE_LANE.

Do not use recency as canonical truth.

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
- target <=10 project-evidence requests;
- acceptable <=11;
- hard ceiling <=13;
- 0 duplicate search_prs;
- 0 broad schema dump;
- 0 generic commit-diff payload;
- 0 repeated file reads.

Correctness outranks the budget.
