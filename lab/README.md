# Lean Bootstrap / Agent Workflow Lab

This branch is an isolated laboratory for testing the AI/GameDev operating system.

## Safety boundary

This branch MUST NOT:
- change FILIK2, Tavern, Time, PinLogic, Smithy, or other game repositories;
- change production game code;
- merge experimental workflow changes into game repositories automatically;
- require real project secrets;
- treat benchmark hypotheses as adopted policy.

It MAY:
- prototype AGENTS routing;
- prototype compact Skills;
- prototype CURRENT_STATUS schemas;
- test FAST / NORMAL / DEEP bootstrap modes;
- run synthetic or read-only benchmarks against project repositories;
- record tool-call, document-read, context-proxy and correction metrics;
- compare Legacy vs New OS vs Lean OS workflows;
- refine evidence/checkpoint formats.

## Current hypothesis

The new operating system improves correctness, grounding and recoverability, but current bootstrap cost is too high for narrow tasks.

Primary optimization target:

AGENTS -> CURRENT_STATUS -> task Skill -> live evidence -> only necessary domain docs

Full global operating documentation should be loaded only when the local instructions are insufficient.

## Promotion rule

Nothing from this lab becomes canonical until:
1. it is benchmarked;
2. regressions are reviewed;
3. the user explicitly approves promotion;
4. it is merged through a normal PR into master.
