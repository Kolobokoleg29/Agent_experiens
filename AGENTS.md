# AGENTS.md — Agent_experiens

## Mission
This repository is the reference implementation and source of truth for our AI-assisted game-development workflow. It combines agent orchestration, Phaser/Yandex Games production practices, GitHub CI, runtime QA, and evidence-driven review.

## Non-negotiables
- One active implementation task per agent/worktree unless tasks are explicitly independent.
- Do not skip directly from a vague goal to implementation for medium/high-risk work.
- Research facts separately from design decisions; avoid feeding the preferred solution into factual research.
- Prefer deterministic verification before LLM review.
- User-facing changes require runtime QA; visual/game-feel changes require human judgment.
- High-risk areas (save/cloud, economy, ads/rewards, SDK lifecycle, analytics semantics, migrations, secrets/security) require enhanced review.
- Do not claim DONE without evidence.
- Never store secrets or credentials in repository docs, prompts, fixtures, screenshots, or evidence.

## Source of truth
- Operating standard: docs/AI_GAMEDEV_OPERATING_SYSTEM.md
- Current adoption state: docs/PROJECT_STATE.md
- GitHub/runner architecture: docs/GITHUB_RUNNER_ARCHITECTURE.md
- Human/AI chat protocol: docs/CHAT_OPERATING_PROTOCOL.md
- Research provenance: docs/RESEARCH_EVIDENCE.md
- Adoption roadmap: docs/ADOPTION_ROADMAP.md

## Default workflow
For substantial work:
Problem -> Questions -> Factual Research -> Alternatives -> Prototype (if needed) -> Design + Stress Test -> Vertical Structure -> Spec Gate -> Ticket -> Isolated Implementation -> Deterministic Verification -> Runtime QA -> Independent Review -> Human Risk/Taste Gate -> Integration -> Knowledge Capture

Small low-risk changes may use:
Task -> Implement -> Focused Verification -> Review.

## Work policy
- Prefer vertical slices over horizontal backend/frontend/tests splits.
- Use a fresh branch/worktree for substantial independent implementation.
- Parallelize only after interfaces, dependencies, ownership and acceptance criteria are stable.
- Temporary plans/specs must not masquerade as current project truth after completion.
- Repeated review findings should become tests, lint/static rules, Skills, or automated gates.

## Verification order
1. formatter/lint/typecheck/build
2. unit/integration/property/invariant tests
3. deterministic project audits
4. runtime/browser/engine checks
5. screenshots/video/logs/evidence where relevant
6. fresh-context AI review
7. human product/taste/risk gate where objective verification is weak

## Tool hierarchy
Prefer the most deterministic interface available:
native tests/code -> API/connector -> MCP/tool -> CLI/headless -> browser -> computer use.

## Skills policy
- One Skill should solve one repeatable class of work.
- Skills define workflow/judgment; APIs/MCP/CLI provide capabilities.
- Every Skill should define trigger, inputs, outcome, freedom level, verification, evidence, failure policy, and learning loop.
- Keep detailed procedures out of this file; load them only when relevant.
