# Adoption Roadmap

The goal is incremental adoption. Do not rewrite the existing agent pipeline all at once.

## P0 — Foundation
1. Keep root AGENTS.md compact and canonical.
2. Adopt PROJECT_STATE.md and durable decisions/source-of-truth conventions.
3. Introduce vertical-ticket and evidence requirements for substantial changes.
4. Add/standardize fast-check CI around current build/typecheck/tests.
5. Define runtime QA evidence contract for generated Phaser games.
6. Add an asset-manifest convention for generated/materialized games.
7. Create initial Skills: factual-research, design-stress-test, vertical-slice, independent-review, runtime-qa, docs-closeout.

## P1 — Game observability and stronger QA
1. Generated projects expose a safe debug/runtime observability surface.
2. Add desktop/mobile Playwright QA for generated Phaser builds.
3. Add evidence artifacts (screenshots/logs/report/manifest).
4. Add gameplay/debug playground templates where relevant.
5. Add property tests for pipeline state, generated configuration and path/schema invariants.
6. Add risk-class policy and pre-mortem/mutation Skills for critical logic.

## P2 — GitHub factory
1. Worktree-per-ticket orchestration for independent tasks.
2. Hosted-Linux independent Codex review with minimal permissions.
3. Windows self-hosted runner reserved for build/runtime/game QA.
4. Reusable workflows across game repositories.
5. Concurrency/path/risk gating to reduce expensive runner work.
6. Automated failure-to-guardrail tracking.

## P3 — Evals and observability
1. Build a Golden Task suite from real game-development tasks.
2. Measure success/regression/review iteration/human correction rates.
3. Track agent/tool/read/edit/check cycles where supported.
4. Evaluate Skills/AGENTS changes against the same task suite before promoting them.
5. Add semantic repo-map usage for large codebases.
6. Add deterministic replay for selected runtime failure classes.

## Explicit non-goals for now
- autonomous swarm for all work;
- unrestricted agent access to Windows runner/secrets;
- AI-only auto-merge of high-risk changes;
- replacing human game-feel/art/product decisions;
- rewriting the entire current pipeline before P0 evidence exists.
