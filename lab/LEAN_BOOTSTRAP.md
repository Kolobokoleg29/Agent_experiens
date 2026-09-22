# Lean Bootstrap v1

Status: LAB EXPERIMENT — NOT CANONICAL

## Goal

Preserve the correctness/recoverability gains of the current operating system while reducing single-task context and tool overhead.

Core route:

AGENTS -> CURRENT_STATUS -> task Skill -> live evidence -> only necessary domain docs

The full global operating standard is not a mandatory bootstrap dependency.

## Modes

### FAST
Use for:
- status;
- resume;
- exact checkpoint;
- small bounded bugs;
- narrow verification questions.

Budget:
- local AGENTS;
- CURRENT_STATUS;
- matching Skill;
- live Git/PR/check evidence.

Escalate only on mismatch, missing data or material ambiguity.

### NORMAL
Use for:
- normal development slice;
- bounded UI/UX work;
- localization/content/SDK audits with a known scope.

FAST plus:
- PROJECT_STATE;
- one or a small number of relevant domain documents.

### DEEP
Use for:
- new architecture;
- save/cloud;
- economy;
- migrations;
- major redesign;
- policy conflicts;
- cross-system work.

NORMAL plus only the required:
- DECISIONS;
- ROADMAP;
- debt register;
- global Operating System;
- research.

## Routing rule

Default to the cheapest mode that can prove the answer.

Never choose DEEP merely because a task is important. Choose DEEP because the answer requires broad policy/architecture context.

## Context discipline

1. Do not read a document "just in case".
2. Do not reread unchanged files within one pass.
3. Prefer machine-readable status for volatile facts.
4. Prefer live GitHub state for current SHA/check facts.
5. Use durable docs for intent, policy and sequencing.
6. Stop reading once acceptance information is sufficient.
7. Record every escalation and why it was necessary.

## Expected benchmark effect

The candidate succeeds only if it keeps:
- exact-head verification;
- current/historical separation;
- one-task scope control;
- interruption recovery;

while materially reducing:
- GitHub requests;
- unique documents loaded;
- repeated reads;
- failed searches;
- human corrections.


## Volatile SHA rule

A repository status file cannot make its own current branch SHA authoritative: updating the status file itself creates a newer commit.

Therefore:
- `main_head` / `active_head` in CURRENT_STATUS are last-observed snapshots only;
- `last_verified_head` names the revision whose evidence was actually verified;
- live Git/PR state remains authoritative for the current head;
- a mismatch between stored head and live head is expected after status-only commits and must be classified, not silently treated as a product regression.
