# Benchmark Plan

## Baselines

A. Legacy workflow
B. Current Operating System
C. Lean Bootstrap candidate

## First benchmark task

Determine:
- current project stage;
- last exact verified checkpoint;
- open debts affecting execution order;
- next one development slice.

Use the same repository snapshot for all passes.

## Metrics

Measure:
- correctness;
- current vs historical separation;
- exact-head verification quality;
- tool calls;
- failed/empty searches;
- files read;
- unique documents read;
- repeated reads;
- approximate context loaded;
- answer length;
- assumptions;
- human corrections required;
- scope creep;
- recoverability after interruption.

## Lean bootstrap candidate

FAST:
1. local AGENTS/router
2. machine-readable CURRENT_STATUS
3. matching Skill
4. live repository/PR/check evidence
5. open PROJECT_STATE/ROADMAP/domain docs only on mismatch or decision need

NORMAL:
FAST + PROJECT_STATE + relevant domain document

DEEP:
NORMAL + DECISIONS + ROADMAP + global operating standard + research as required

## Promotion thresholds

A candidate is worth promoting only if it:
- preserves or improves correctness;
- preserves exact-head evidence semantics;
- does not increase human correction rate;
- materially reduces unnecessary reads/tool calls;
- preserves one-task scope control and interruption recovery.

## Planned experiments

1. Status / resume task
2. UI redesign planning
3. Localization audit
4. Content-factory audit
5. Yandex SDK regression
6. Save/cloud high-risk task
7. Interrupted-chat recovery

Results should be recorded under `lab/results/` and must not mutate game repositories.
