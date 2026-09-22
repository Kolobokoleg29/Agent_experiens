# PASS D — Clean Tooling-Overhead Benchmark

Goal: determine whether Lean reduces total practical context when connector-schema discovery is constrained.

## Two measurements

### D1 — Controlled fixture
Use:
- lab/LEAN_BOOTSTRAP.md
- .agents/skills/project-audit/SKILL.md
- lab/GITHUB_FAST_PATH.md
- lab/fixtures/FILIK2_PASS_C_SNAPSHOT.yaml

Do not access FILIK2 live state for D1.
Return the status answer from the fixture and count only loaded lab text.
Purpose: measure pure routing/bootstrap overhead deterministically.

### D2 — Live field replay
Use a fresh context.
Read the same three Lean files, then perform a read-only live FILIK2 status audit.

Mandatory tool rule:
- do not print or enumerate broad GitHub schemas;
- if a schema is unknown, inspect only the exact required action;
- track tool-discovery overhead separately from task-evidence requests.

## Metrics
For D1 and D2 record separately:
- task evidence requests;
- tool discovery calls;
- tool discovery context;
- file reads;
- unique documents;
- repeated reads;
- failed/empty calls;
- approximate loaded text;
- exact-head correctness;
- unsupported assumptions;
- human corrections likely;
- scope control.

## Success criteria
D1:
- reproduce expected checkpoint/next-slice invariants with minimal context.

D2:
- preserve PASS C correctness properties;
- task-evidence requests <= 13 unless live state genuinely requires escalation;
- no broad schema dump;
- zero unnecessary governance preload.

Do not claim token savings unless actual total context accounting is available or the remaining proxy is clean enough to support the claim.
