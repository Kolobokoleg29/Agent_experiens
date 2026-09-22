# GitHub Open-PR Discovery Contract

Status: LAB VERIFIED CONTRACT
Lean version: v2.1

Purpose: prevent duplicate PR discovery and schema/tooling overhead caused by assuming the wrong connector response shape.

## Canonical action

Use `mcp__GitHub__search_prs` with:
- `repository_full_name=<owner/repo>`
- `state="open"`
- `query=""`
- `topn=<small sufficient cap>`

This action is considered known. Do not perform schema discovery before using it.

## Verified response shape

Read PR search results from:

`result.issues`

Project each element to:
- `number`
- `title`
- `state`
- `draft`
- `head_sha`
- `updated_at`
- `head_ref` only if present
- `base_ref` only if present

`head_ref` and `base_ref` are optional. Their absence is not a projection failure.

Do not expect `result.items` or a top-level array.

## No-repeat rule

If `search_prs` succeeds, never rerun the identical query solely because local projection expected the wrong wrapper or an optional field was absent.

Use the already-returned result and correct the local projection.

A second identical evidence request is allowed only when there is evidence repository state changed during the run.

## Fallback

Fetch a specific PR only when a fact required for correctness is genuinely absent from search results.

## Main-head rule

Do not use `search_branches` only to obtain SHA when it does not expose the required SHA compactly.

## Contract mismatch

If `result.issues` is no longer present:
1. mark `CONNECTOR_CONTRACT_MISMATCH`;
2. inspect only exact `search_prs` metadata;
3. do not try alternative PR-discovery paths first;
4. update this lab contract after verification.

## Accounting

A successful `search_prs` call counts once under TASK_EVIDENCE_REQUESTS.
Local projection is not an evidence request.
Schema discovery for this known action should be zero.
