# Human + AI Chat Operating Protocol

This document formalizes how long-running work is coordinated through chat without losing project state.

## Core rules
1. One active implementation task at a time. Switch only if blocked, and record the exact checkpoint first.
2. Repository is source of truth; chat is the control interface. Long-lived decisions/status/research must land in GitHub.
3. Do not re-ask discoverable facts. Inspect code/docs/tests first; ask the human only for real product decisions or inaccessible facts.
4. Separate facts from decisions. Research first, then alternatives/stress-test, then selection.
5. Use vertical slices. A large goal may be broad, but implementation proceeds in independently verifiable slices.
6. No DONE without evidence. Written code is not completion.
7. Close each substantial stage with status so interruption/recovery is cheap.

## Standard status checkpoint
Current stage: <stage/ticket>
State: DONE | IN PROGRESS | BLOCKED
Completed: <concrete outputs>
Evidence: <tests/build/runtime/PR/artifacts>
Remaining: <next bounded steps>
Next action: <one action>
Blockers: <none or explicit blocker>

## Chat control vocabulary
- СТАТУС — report exact stage, evidence, remaining work and blocker.
- ПРОДОЛЖАЙ — continue current stage; do not change direction.
- ИССЛЕДОВАНИЕ — read/research only; no implementation changes.
- РЕАЛИЗАЦИЯ — implementation is allowed inside the agreed scope.
- AUDIT — independently critique/test completed work; do not assume it is correct.
- ЗАКРЫТЬ — verification + documentation + remaining debt/status.
- STOP — record checkpoint and stop additional work.

These are conveniences, not magic prompts; repository state and ticket acceptance criteria remain authoritative.

## Interruption recovery
When resuming after an interruption:
1. read current source-of-truth status/ticket;
2. inspect the latest commit/PR/checks;
3. identify the last verified checkpoint;
4. continue from that checkpoint rather than reconstructing from conversational memory alone.
