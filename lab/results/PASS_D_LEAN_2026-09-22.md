# PASS D — Lean Bootstrap benchmark

Date: 2026-09-22
Verdict: correctness PASS, efficiency PARTIAL.

## D1 — controlled fixture
- documents: 5
- repeated reads: 0
- loaded lab text: 10,754 chars
- evidence/file requests: 5
- live FILIK2 requests: 0
- failed/empty: 0
- escalation: none
- unsupported assumptions: 0
- correctness: PASS
- scope control: PASS

D1 preserved all checkpoint invariants and selected one exact-head closeout slice.

## D2 — live replay
Observed main:
- 51becadf7da25154ccacafc836d21a1162f025f2
- merge commit of PR #98

PR #98:
- final PR head: 8f040b4c3c0d6882b504d7083e86249b780e1132
- merged
- PR Validation #490 SUCCESS
- PR-head verification was not automatically transferred to merge SHA

Competing work:
- PR #96 localization draft, head 433dcac7…, current checks pending/in progress
- PR #95 adaptive discovery L1-L8, head b0187161…, open with prior successful workflows

Because CURRENT_STATUS was absent and multiple implementation PRs existed, active-lane recovery was not fully deterministic.

## D2 cost
- FILIK2-only evidence requests: 14
- gross including Lean rereads: 17
- successful unique docs: 6
- successful file text: 37,084 chars
- file-read attempts: 8
- failed file reads: 2
- repeated live evidence read: 1
- NORMAL escalation: 1
- DEEP: 0

Avoidable cost observed:
- missing CURRENT_STATUS probe;
- domain doc first attempted on main instead of active branch;
- PR-only workflow lookup on merge SHA;
- repeated open PR evidence;
- broad generic GitHub response with very large payload.

## Context finding
Schema discovery was no longer the dominant live cost.
A generic project-evidence fetch produced a much larger payload than needed, including an approximately 18.6k-token response before truncation.

The bottleneck moved from governance/schema overhead to project-evidence payload design.

## Quality
- correctness: PASS
- exact-head discipline: PASS
- current/historical separation: PASS
- stale evidence detection: PASS
- scope control: PASS
- unsupported factual assumptions: 0
- recoverability: PARTIAL due to competing active PRs and no compact volatile status

## Changes required for Lean v2
1. compact CURRENT_STATUS with explicit active-lane state;
2. AMBIGUOUS_ACTIVE_LANE instead of recency guessing;
3. avoid generic commit/diff payloads;
4. exact-action schema discovery only;
5. read branch-specific domain docs from active exact head first;
6. avoid PR-only workflow actions on merge commits;
7. separate request count from payload/context size.

These findings are implemented in Lean Bootstrap v2 in this lab branch.
