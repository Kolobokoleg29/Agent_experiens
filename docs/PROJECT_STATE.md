# Project State — Agent_experiens Standards Track

**Updated:** 2026-09-21

## Current state
The repository already contains an agent pipeline for Phaser/Yandex Games with staged market/concept/design/code/review flow, deterministic TypeScript checks, supervisor gates, retries/checkpoints and project materialization.

A standards track is now being added so this repository also becomes the source of truth for the broader AI-assisted GameDev workflow researched in September 2026.

## Research consolidated
- 7 foundational AI coding / Codex / Claude Code / agentic engineering videos and companion materials.
- 18 GameDev + GitHub + Codex / CI videos and official sources.
- The second corpus included about 19h21m of video, ~178k transcript words, 36 Skills, AGENTS examples, GitHub Actions, GameCI, godot-ci, Git LFS and Codex Action materials.
- Dedicated detailed analyses were completed for the Matt Pocock workflow and Dexter Horthy RPI/QRSPI critique.

## Decisions now canonical
- GitHub is the control plane/source of truth.
- AGENTS.md is a compact router, not an encyclopedia.
- Complex work uses explicit staged control flow and vertical tickets.
- Deterministic verification precedes AI review.
- User-facing game changes require runtime QA/evidence.
- Windows self-hosted runners are trusted build/runtime infrastructure, not the default unrestricted agent sandbox.
- Parallel work uses worktrees only after dependencies/interfaces are stable.
- Repeated failures become tests/Skills/static gates.

## Not implemented yet
This documentation change does not claim the existing codebase already implements the full v2 standard. Major future implementation areas are tracked in ADOPTION_ROADMAP.md.
