# AI GameDev Operating System v2

**Status:** canonical working standard
**Date:** 2026-09-21
**Scope:** AI-assisted game development, Codex/agent workflows, GitHub, CI/runners, Phaser/web, Unity/Godot patterns, Yandex Games production.

## 1. Executive standard

The core asset is not a prompt or a model. A reliable AI-development system has seven layers:

1. **Context** — the repository explains itself.
2. **Control flow** — complex work is split into explicit stages instead of hidden inside one mega-prompt.
3. **Skills** — repeatable procedures are codified and loaded only when needed.
4. **Verification** — every meaningful change has observable evidence.
5. **Isolation** — substantial work happens in a branch/worktree and integrates only after gates pass.
6. **Runtime observability** — the game exposes enough state for automated QA instead of forcing an agent to infer behavior from pixels/code alone.
7. **Knowledge capture** — recurring failures become automated guardrails.

Governing principle:

> Increase agent autonomy only when verifiability and rollback safety increase with it.

## 2. Canonical lifecycle

### Stage 0 — Problem / Goal
Record the observable problem/outcome, constraints and top-level definition of done. Do not encode a preferred solution prematurely.

### Stage 1 — Neutral Questions
Convert ambiguity into factual questions. Ask the human only for genuine product/trade-off decisions; let the agent discover repository facts itself.

### Stage 2 — Factual Research
A fresh research context receives the problem/questions and access to code/sources, but not the preferred solution. Output: current behavior, evidence, constraints, relevant files/systems and unknowns.

### Stage 3 — Alternatives
For material decisions, generate genuinely different options rather than cosmetic variants.

### Stage 4 — Prototype / Greybox when uncertainty is experiential
Use a prototype when the unknown is feel, composition, input, timing, animation, navigation or spatial design. Use research/design first when the unknown is safety, migration, economy, SDK or architecture.

### Stage 5 — Design + Stress Test
Compare alternatives on correctness, player impact, complexity, regression risk, maintainability, performance, mobile/desktop, accessibility, platform constraints, analytics, monetization and testability.

### Stage 6 — Vertical Structure
Slice the chosen design into tracer-bullet/vertical units that cross the layers required for an observable result. Each slice must fit in a bounded context and declare blockers/dependencies.

### Stage 7 — Spec Consistency Gate
A fresh reviewer checks Research -> Design -> Structure, acceptance criteria, out-of-scope boundaries, platform implications and contradictions. High-risk work does not implement before this gate.

### Stage 8 — Ticket
Each ticket defines outcome, context links, acceptance criteria, verification method, dependencies, forbidden scope and expected evidence. Avoid kilometre-long line-by-line implementation recipes.

### Stage 9 — Isolated Implementation
Use a fresh context and branch/worktree for substantial work. Commit at logical checkpoints, especially before risky refactors/fix loops.

### Stage 10 — Deterministic Verification
Run objective checks first: formatter, lint, typecheck, build, unit/integration/property tests, invariant audits, deterministic content checks and performance/bundle budgets.

### Stage 11 — Runtime / Product QA
For user-facing work run the actual game and try to break it: pointer/keyboard, invalid actions, reload/restart, save/load, navigation, resize/orientation, desktop/mobile, console/logs, SDK lifecycle and ads/analytics where relevant.

### Stage 12 — Independent AI Review
Use a fresh context. Review independently for spec compliance, architecture/standards and risk/regressions. Multiple reviewers are useful for material risk or disagreement, not as a default swarm.

### Stage 13 — Human Taste / Risk Gate
Human judgment remains mandatory where objective evaluation is weak: game feel, UX comprehension, visual quality, pacing, difficulty, monetization irritation and high-risk product trade-offs.

### Stage 14 — Integration
Merge only with evidence. Run integration/smoke checks after merge where appropriate.

### Stage 15 — Knowledge Capture
Update durable truth, archive temporary plans and convert repeated failures into tests, static rules, Skills, QA scenarios or pre-merge gates.

## 3. Task sizing and ceremony

### S / Low risk
Copy, docs, isolated style or obvious local fix:
Task -> Implement -> Focused Verification -> Review.

### M
Screen, bounded flow, small gameplay feature:
Research -> Design -> Vertical Plan -> Implement -> Verification -> Runtime QA.

### L
Localization platform, progression, economy, onboarding, major architecture:
use the full lifecycle.

### Critical regardless of size
Save/cloud, rewarded ads, economy/payments, platform SDK lifecycle, analytics semantics, migrations, secrets/security:
use enhanced review and a human gate.

The process must not cost more than the change itself.

## 4. Agent roles

Roles are fresh contexts, not necessarily permanent autonomous agents:

- **Orchestrator:** stage/dependency/status control.
- **Researcher:** factual evidence only.
- **Designer/Architect:** alternatives and design.
- **Critic/Stress Tester:** attacks assumptions before implementation.
- **Structure/Ticket Planner:** vertical slicing.
- **Implementer:** bounded code/content change.
- **Reviewer:** fresh spec/standards/risk review.
- **QA Agent:** runs the product and seeks failure modes.
- **Integrator:** validates cross-slice compatibility.
- **Knowledge Curator:** updates durable docs, Skills and guardrails.

## 5. Game-specific engineering surfaces

### Asset Manifest
Asset-heavy projects should expose a machine-readable asset index: id, type, path, dimensions, sprite grid/frames/FPS, anchors, tags and, for 3D, scale/pivot/clips/materials. Audio can include duration, looping and category.

Purpose:
- avoid repeated rediscovery;
- shorten agent context;
- allow deterministic missing/broken-asset validation;
- make animation/layout setup reproducible.

### Character Gym
Complex actors should have an isolated debug scene for animation, scale, origins, hit/hurt boxes, attack frames and state transitions.

### Gameplay Playground
Game-feel variables should be tunable in an isolated runtime surface and persisted to configuration rather than scattered magic numbers: speed, startup/active/recovery frames, knockback, camera damping, spawn timing and similar values.

### Runtime Observatory
Where feasible expose structured debug state:
- scene / level;
- player state;
- save revision;
- locale;
- SDK state;
- FPS;
- active entities;
- RNG seed;
- modal/ad state;
- errors.

Safe test commands may support restart, level/locale selection, opening screens, sandbox callbacks and state dumps.

### Greybox-first
Validate gameplay space, navigation, input and state flow before expensive art/polish. For UI, validate state/layout/responsiveness before final assets.

### Evidence-driven QA
A meaningful PR should carry behavior evidence appropriate to risk: screenshots, video for motion/drag/combat/resize, logs, test summaries, deterministic seeds, before/after metrics or audit reports.

## 6. Verification pyramid

1. **Deterministic:** types, lint, unit, integration, property tests, schemas, invariants, asset existence, deterministic seeds.
2. **Build/runtime instrumentation:** startup, console errors, FPS, bundle size, state logs, SDK events.
3. **Scripted interaction:** Playwright/engine automation, input, navigation, resize, reload, save/load.
4. **Visual evaluation:** screenshots, visual diffs, layout constraints, independent AI visual critique where appropriate.
5. **Human judgment:** fun, clarity, art direction, pacing, difficulty, monetization annoyance.

An LLM judge must not replace deterministic verification for security/correctness invariants.

## 7. Advanced verification

### Property / fuzz testing
Use generated inputs for saves, economy, progression, content factories, reward state and SDK lifecycle. Preserve minimal counterexamples for reproducibility.

### Mutation testing
For critical subsystems deliberately invert conditions, alter boundaries, remove guards/side effects or swap arguments. If tests remain green, the suite has a gap. Use selectively for critical systems and releases.

### Pre-mortem
Before high-risk merge, model plausible incidents: ordering races, duplicate callbacks, partial save writes, shared mutable state, string contracts, non-atomic operations, invisible invariants, resource lifecycle and load-bearing defaults.

### Deterministic replay
For gameplay/SDK failures, preserve seed + input sequence + state transitions + timestamps/logs so the failing session can be replayed.

## 8. Parallelism and worktrees

Parallelism is an optimization after decomposition, not a starting strategy.

Parallelize only when:
- blockers are resolved;
- the interface/contract is stable;
- mutable files do not materially conflict;
- acceptance criteria are independently verifiable;
- an integration gate exists.

Good uses:
- independent research questions;
- competing designs;
- best-of-N review;
- bug hunting;
- proven independent vertical slices.

Poor default:
agent A = backend, agent B = frontend, agent C = tests for a new uncertain feature.

## 9. Skills architecture

AGENTS.md is a compact router. Detailed repeatable procedures belong in Skills.

### P0 Skills
- factual-research
- design-stress-test
- vertical-slice
- implement-ticket
- independent-review
- runtime-qa
- docs-closeout

### Game/risk Skills
- gameplay-feel-prototype
- responsive-game-qa
- save-progression-audit
- content-factory-audit
- localization-qa
- yandex-sdk-qa
- analytics-contract-audit
- mutation-audit
- premortem

Each Skill defines:
1. trigger;
2. inputs;
3. outcome;
4. freedom level;
5. workflow;
6. verification;
7. evidence;
8. failure/escalation policy;
9. learning loop.

Use progressive disclosure: short trigger/overview first, details/references/scripts only when needed.

## 10. Tool hierarchy

Prefer the most deterministic surface available:

native code/tests -> API/connector -> MCP/tool -> CLI/headless -> browser -> computer use.

Browser/computer use is valuable for visual/runtime QA and systems without better interfaces, but should not replace stable APIs/CLI for routine automation.

## 11. GitHub as control plane

GitHub should contain:
- current truth and decisions;
- Issues/tickets;
- branches/worktrees;
- CI checks;
- runtime evidence/artifacts;
- independent review;
- release artifacts and traceability.

Recommended workflow families:

### fast-check
On relevant PRs:
install/cache -> lint/typecheck -> unit/integration -> deterministic audits -> production build.

### runtime-qa
On a self-hosted/game-capable runner when needed:
production build -> launch -> scripted desktop/mobile QA -> screenshots/video/logs -> artifact upload.

### codex-review
Prefer GitHub-hosted Linux for automated Codex review, minimal permissions, no production secrets and read-only access where possible. Publish feedback from a separate job after agent execution.

### release
On protected main/tag/manual trigger:
full verification -> build/package -> manifest/checksum -> artifact. Deployment remains a separately protected stage.

## 12. Windows self-hosted runner policy

Use Windows self-hosted runners for deterministic game work that benefits from local engines/assets/browser/GPU/caches:
- builds;
- engine tests;
- browser/runtime QA;
- screenshots/video;
- packaging;
- platform-specific checks.

Do not treat a long-lived Windows runner with broad machine/secrets access as the default unrestricted environment for untrusted agent code. Separate AI review from trusted build infrastructure where practical.

## 13. AI CI security

When running coding agents from CI:
- treat PR text, commit messages, repository files, screenshots and AGENTS instructions from an untrusted PR as potential prompt-injection surfaces;
- grant minimum permissions;
- avoid persisted Git credentials for AI review;
- isolate secrets from review jobs;
- do not interpolate untrusted data unsafely into shell;
- prefer agent execution as the final step in its job and publish/report in a separate job;
- do not allow unrestricted auto-merge for high-risk changes.

## 14. Agent Eval Suite

The next maturity layer is to benchmark the workflow itself.

Maintain representative Golden Tasks from real game-development work:
- responsive regression;
- save bug;
- SDK lifecycle issue;
- generator bug;
- localization fallback;
- analytics contract;
- economy invariant;
- gameplay state bug.

Compare configurations on:
- success rate;
- regressions;
- implementation/review iterations;
- human corrections;
- diff scope;
- verification pass rate;
- runtime evidence quality;
- cost/token/tool usage where observable.

Benchmark quality must itself be audited. Do not optimize blindly to noisy evals.

## 15. Agent observability

Where tools permit, record enough telemetry to diagnose bad workflows rather than blaming the model:
- task class;
- model/tool calls;
- file reads;
- edits;
- checks;
- review cycles;
- failures;
- time/cost proxies.

A task that repeatedly requires excessive reads/retries may indicate poor repository structure, missing repo maps, weak tickets or insufficient verification surfaces.

## 16. Semantic repo maps

Large codebases benefit from AST/compiler/semantic maps. Agents should use repo maps before broad changes when they reduce repeated grep/read exploration. Treat maps as navigation aids, not authoritative substitutes for current source/tests.

## 17. Failure knowledge base

Recurring failures should be recorded only if they end with prevention:

symptom -> root cause -> detection -> permanent guardrail.

The target is not a large bug archive. It is a shrinking set of repeatable failure classes because tests, Skills and static rules now catch them automatically.

## 18. Human + AI working protocol

For long-running work:
- one active implementation task at a time;
- repository = source of truth, chat = control interface;
- do not ask the human to repeat discoverable facts;
- end substantial stages with an explicit checkpoint;
- do not say DONE without evidence.

Useful chat controls:
- СТАТУС — exact current stage/evidence/remaining/blocker;
- ПРОДОЛЖАЙ — continue current stage without changing direction;
- ИССЛЕДОВАНИЕ — research/read only;
- РЕАЛИЗАЦИЯ — implementation allowed inside agreed scope;
- AUDIT — independently attack/check completed work;
- ЗАКРЫТЬ — verify, update docs/debt/status;
- STOP — record checkpoint and stop.

These commands are conveniences; repository state and acceptance criteria remain authoritative.

## 19. What not to do

- mega AGENTS.md;
- one mega-prompt controlling the whole lifecycle;
- factual research seeded with the desired answer;
- swarm/multi-agent for its own sake;
- horizontal frontend/backend/tests split as default;
- merge because an agent says “done”;
- browser-first automation where API/CLI exists;
- secrets in docs/prompts/evidence;
- LLM-only security/correctness gates;
- full QRSPI ceremony for trivial changes;
- TDD forced onto visual/game-feel work;
- production art before core interaction/greybox is validated;
- AI-generated tuning values treated as final game feel without human validation.

## 20. Ten operating rules

1. Separate facts from decisions.
2. Research does not receive the preferred answer.
3. A prompt is not a workflow engine.
4. Large features are sliced vertically.
5. Every slice has an observable verifier.
6. The implementer is not the sole reviewer.
7. Repeated review comments become automation.
8. Parallel work follows proven decomposition.
9. AGENTS.md routes, Skills define procedures, docs store durable truth.
10. The weaker the verifiability, the stronger the human judgment gate.
