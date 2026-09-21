# Research Evidence and Provenance

## Foundational corpus — 7 sources
1. Nate Herk — Build & Sell with Codex (5+ Hour Course)
2. Telusko — OpenAI Codex Complete Tutorial
3. Matt Pocock — Full Walkthrough: Workflow for AI Coding
4. Dexter Horthy — Everything We Got Wrong About Research-Plan-Implement
5. Andrej Karpathy — From Vibe Coding to Agentic Engineering
6. OpenAI — Codex just got better for developers
7. Boris Cherny — Building Claude Code

Key themes extracted: repository context, Skills, explicit control flow, vertical tracer tickets, fresh-context review, verifiability, worktrees, parallel agents, runtime/browser QA, human judgment, learning loops.

## Specialized corpus — 18 sources

### AI / Codex GameDev
- Phaser 4 + Codex 2D beat-em-up workflow
- AI-built space game / orchestrated game production
- Godogen prompt-to-game system
- Phaser fighting game / Character Gym + Playground
- Unity MCP -> CLI workflow
- Godot + Codex comparison material
- Unity MCP tutorial
- Godot game with Codex baseline

### GitHub / CI / agentic development
- GitHub Actions fundamentals
- GitHub + Unity baseline
- Software Factory / worktree-build-prove-ship workflow
- Codex crash course
- Git LFS for game repositories
- Git worktrees
- self-hosted GitHub Actions runners
- GameCI / Unity builds
- production-scale GitHub Actions material
- Agent Skills / review automation examples

The second corpus contained approximately 19h21m of video and ~178k transcript words, plus official/repository artifacts including AGENTS.md examples, 36 SKILL.md files, GitHub workflows, GameCI, godot-ci, Git LFS and openai/codex-action materials.

## Method
The standard is a synthesis, not a popularity ranking. Practices were retained when they survived comparison across sources and fit game-development verification constraints. Conflicts were resolved explicitly:
- prototype-first for experiential uncertainty vs research/design-first for safety/system uncertainty;
- parallel agents only after decomposition/contracts;
- human code/risk ownership retained despite strong automation;
- objective verifier hierarchy preferred over LLM-only judgment.
