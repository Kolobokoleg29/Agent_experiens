---
name: project-audit
description: Recover exact current project state with minimum context. Use for status, resume, "continue from last step", checkpoint and next-slice questions.
---

# Project Audit — Lean v1

## Trigger
Use for:
- current stage/status;
- resume after interruption;
- "continue from the last completed step";
- exact checkpoint;
- next one development slice.

Do not use for implementation, broad architecture design or deep product research.

## Outcome
Return:
1. current repository/main state;
2. active branch/PR if any;
3. last exact VERIFIED checkpoint;
4. open debts that affect execution order;
5. exactly one next development slice;
6. explicit mismatches/unknowns.

## Context budget

Start in FAST mode. Escalate only when evidence requires it.

### FAST
Read/use only:
1. local AGENTS/router;
2. CURRENT_STATUS if present;
3. this Skill;
4. live repository HEAD / active PR / exact-head checks.

Open no other document unless one of these is missing, stale, contradictory or insufficient.

### NORMAL
Escalate from FAST when status or next-slice intent cannot be resolved.
Add:
- PROJECT_STATE;
- one relevant domain evidence document.

### DEEP
Escalate only for material policy/architecture/risk ambiguity.
Add only what is needed from:
- DECISIONS;
- ROADMAP;
- debt register;
- global operating standard;
- research.

Do not preload DEEP material.

## Workflow

1. Read local AGENTS and CURRENT_STATUS if available.
2. Verify current default-branch HEAD directly.
3. If CURRENT_STATUS names an active PR/branch, verify its exact head.
4. Verify current checks on that exact head. Do not infer step-level PASS from workflow names when the step composition matters.
5. Compare live state with CURRENT_STATUS.
6. If they agree and next slice is explicit, stop reading.
7. If they disagree, mark STALE/MISMATCH and open PROJECT_STATE or the minimum domain evidence needed.
8. Distinguish:
   - merged main checkpoint;
   - active unmerged verified checkpoint;
   - historical checkpoint.
9. Report only debts that constrain the active sequence.
10. Choose exactly one next development slice from verified project truth.

## Verification semantics

- PASS = required gate actually executed successfully on the exact relevant revision.
- OPEN = not executed, unresolved or still awaiting integration.
- READY / NOT EXECUTED is not PASS.
- Historical green evidence is not current evidence after material change.
- Open/unmerged is not merged.
- Documentation is evidence, but live repository/check state outranks stale status text.

## Stop-reading rule

Stop loading context when all are known with high confidence:
- current main HEAD;
- active work item/head;
- exact verified checkpoint;
- execution-constraining debts;
- next one slice.

Reading additional governance or research after this point counts as benchmark overhead unless a contradiction is being resolved.

## Evidence
Record:
- repository/ref/SHA;
- PR number/head if relevant;
- check/workflow evidence used;
- documents read;
- tool calls;
- failed/empty searches;
- assumptions;
- escalation mode used.

## Failure policy
If live state cannot be verified, say UNKNOWN or BLOCKED. Do not upgrade documentation claims to PASS.

## Learning loop
When a repeated status question requires extra documents, prefer improving CURRENT_STATUS/router metadata instead of making this Skill larger.
