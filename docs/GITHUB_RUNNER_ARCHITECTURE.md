# GitHub / Runner Architecture

## Target architecture
Issue / Spec
-> Codex / agent worktree
-> Fast deterministic checks
-> GitHub-hosted Linux independent AI review (minimal permissions)
-> Windows self-hosted runner for game build + runtime/browser/engine QA
-> Evidence artifacts
-> Human risk/taste gate
-> Merge
-> Protected release

## Responsibilities

### GitHub-hosted Linux
Use for lightweight deterministic checks and automated AI review where practical. Keep permissions minimal and secrets isolated.

### Windows self-hosted runner
Use for installed engines/toolchains, Windows builds, browser/game runtime QA, screenshots/video, large local caches/assets and packaging. Treat it as trusted infrastructure, not a disposable sandbox for arbitrary untrusted PR code.

## Recommended workflow set
1. fast-check.yml — lint/typecheck/tests/audits/build.
2. runtime-qa.yml — game launch, desktop/mobile, logs/evidence.
3. codex-review.yml — fresh-context independent review, preferably hosted Linux.
4. release.yml — protected full verification and package artifacts.

## Efficiency controls
- use concurrency to cancel obsolete expensive runs on new commits;
- use path/risk/label gating so docs-only changes do not consume game runners;
- cache package/engine/browser dependencies where safe;
- publish logs/screenshots/audit output as artifacts;
- keep runner working directories isolated per repository/trust domain;
- minimize secrets and remove unrelated credentials from long-lived machines.

## PR evidence contract
Every medium/high-risk PR should state:
- outcome;
- scope/out-of-scope;
- risk class;
- checks performed;
- runtime QA performed;
- links to screenshots/video/logs/audit artifacts;
- rollback strategy.
