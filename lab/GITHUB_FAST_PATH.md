# GitHub Fast Path for Lean Benchmarks

Status: LAB ONLY

Purpose: prevent broad tool-schema discovery from dominating context measurements.

## Rule
Do not enumerate or print the full GitHub connector schema catalog.

When GitHub actions are needed:
1. reference exact action names;
2. inspect metadata only for the exact action whose schema is unknown;
3. emit only the minimum fields needed to invoke it;
4. do not dump descriptions for unrelated actions.

## Preferred read-only actions
Use the smallest applicable surface:
- `mcp__GitHub__fetch_file` — known repository file at known path/ref;
- `mcp__GitHub__fetch` — repository/branch/REST GET when exact endpoint is known;
- `mcp__GitHub__search_prs` — discover an active PR only when status metadata does not already name it;
- `mcp__GitHub__fetch_pr` — normalized PR details when needed;
- `mcp__GitHub__fetch_commit_workflow_runs` — exact commit workflow runs;
- `mcp__GitHub__fetch_workflow_job_steps` — step-level proof only when workflow-level success is insufficient;
- `mcp__GitHub__list_pull_request_reviews` — only when an independent-review gate is relevant.

## Discovery discipline
If a tool signature is not already available:
- query `ALL_TOOLS` by the exact tool name;
- output only that one tool's compact metadata;
- never filter broadly by namespace and print dozens of schemas.

## Accounting
Keep separate counters:
- TASK_EVIDENCE_REQUESTS: GitHub/project evidence calls;
- TOOL_DISCOVERY_CALLS: calls used only to learn connector schemas;
- TOOL_DISCOVERY_CONTEXT: approximate text/tokens emitted by discovery when measurable.

Do not mix the two into one number.

## Interpretation
A workflow optimization is successful only if task-evidence cost falls without correctness loss.
Harness/tool-discovery overhead is reported separately and must not be hidden.
