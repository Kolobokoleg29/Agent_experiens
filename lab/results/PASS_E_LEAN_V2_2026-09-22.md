# PASS E — Lean v2 live recovery benchmark

Date: 2026-09-22
Verdict: correctness PASS, efficiency PARTIAL, recoverability PASS.

## Recovered FILIK2 state
- main HEAD: 51becadf7da25154ccacafc836d21a1162f025f2
- main HEAD: merge of PR #98 (UI reference / Golden Screen / Figma infrastructure)
- CURRENT_STATUS.yaml: STATUS_MISSING
- open implementation PRs observed: #95 and #96
- canonical active lane: AMBIGUOUS_ACTIVE_LANE
- PR #95: first8-runtime-adaptive-discovery-v1 @ b0187161..., OPEN, non-draft
- PR #96: localization/i18n-sdk-language @ bf879a93..., OPEN, draft
- last provable exact VERIFIED checkpoint: PR #98 head 8f040b4c... with PR Validation success
- merge SHA 51becadf... had 0 Actions runs observed
- PR-head PASS was not transferred to merge SHA
- blocking gate: canonical active-lane ambiguity
- next development slice: intentionally not invented

## Cost
- TASK_EVIDENCE_REQUESTS: 13
- TOOL_DISCOVERY_CALLS: 5
- combined: 18
- successful GitHub requests: 12
- failed: 1
- meaningful empty: 1
- NORMAL escalation: 1
- DEEP: 0
- repeated document reads: 1
- CURRENT_STATUS probes: 1
- unsupported material assumptions: 0

## Payload
Largest raw GitHub response:
- open PR collection: 36,647 chars (~9.2k tokens estimate)

Other notable raw payloads:
- specific PR #98: ~19.9k chars
- mistaken issue search: ~16.6k chars
- PROJECT_STATE: ~12.9k chars
- PR-head workflow raw: ~12.4k chars

Projection reduced practical model context, but raw connector payload remains wider than necessary.

## What PASS E proved
1. Lean v2 fixed dangerous active-lane guessing. Multiple plausible PRs now yield AMBIGUOUS_ACTIVE_LANE.
2. Exact-head semantics remained correct.
3. Project-evidence requests met the <=13 target, but with no margin.
4. Tool discovery and incorrect PR discovery still consumed avoidable budget.
5. The remaining bottleneck is compact open-PR identity discovery.

## Lean v2.1 decision
Do not add new routing layers or documents.
Standardize one verified PR discovery path:
`mcp__GitHub__search_prs(repository_full_name, state=open, query="", topn)`
then immediately project to minimal PR identity fields.

This change is implemented in the lab Fast Path and project-audit Skill.
