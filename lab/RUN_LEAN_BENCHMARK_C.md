# Fresh-Context Lean Benchmark C

Run this in a NEW chat/context that has not seen the prior A/B benchmark result.

## Safety
READ ONLY for FILIK2.
Do not modify or merge anything in FILIK2.
Do not use prior-chat memory as evidence.

## Candidate under test
Repository: `Kolobokoleg29/Agent_experiens`
Branch: `lab/lean-bootstrap-evals`

Read only:
1. `lab/LEAN_BOOTSTRAP.md`
2. `.agents/skills/project-audit/SKILL.md`

Then execute Lean FAST against FILIK2.

## Task
Determine:
- exact current FILIK2 stage;
- current main HEAD;
- active work item/head if any;
- last exact VERIFIED checkpoint;
- only debts that affect execution order;
- exactly one next development slice.

## Lean FAST constraints
Start with:
1. FILIK2 local `AGENTS.md`;
2. FILIK2 `CURRENT_STATUS.yaml` if it exists;
3. Lean `project-audit` Skill;
4. live GitHub HEAD / PR / exact-head check evidence.

Do NOT preload:
- full Agent_experiens Operating System;
- DECISIONS;
- full ROADMAP;
- full debt register;
- unrelated domain docs.

Escalate to PROJECT_STATE / ROADMAP / one domain doc only if current evidence is missing, contradictory or insufficient.

If FILIK2 has no CURRENT_STATUS file, record that fact. Do not create one. Use the minimum fallback evidence required.

## Metrics
Count exactly:
- GitHub/tool requests;
- failed/empty requests;
- file reads;
- unique logical documents;
- repeated reads;
- approximate characters/text loaded where practical;
- unsupported assumptions;
- likely human corrections;
- mode escalation and reason.

## Quality checks
Verify:
- current vs historical separation;
- exact-head PASS semantics;
- open/unmerged != merged;
- one active next slice;
- deferred lanes do not hijack execution order.

## Output
Use `lab/results/RESULT_TEMPLATE.md` structure.

Do not compare against A/B numbers until the Lean pass is fully complete.
After the pass, compare with the recorded baseline:
- Legacy: 18 GitHub requests;
- Current OS: 23 GitHub requests.

Primary question:
Can Lean preserve B-level correctness/recoverability while materially reducing context/tool overhead?
