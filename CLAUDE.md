# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

Forge is a skill-driven dev workflow plugin for Claude Code (and opencode). It ships skills and agents — no compiled code, no package.json, no build step. All content is Markdown.

## No Build / Test / Lint Commands

There are no build, test, or lint scripts. Changes are made directly to `.md` and `.json` files.

## Repository Structure

```
skills/          # 5 skills, each with SKILL.md
agents/          # 3 sub-agent definitions
.claude-plugin/  # Plugin metadata (plugin.json, marketplace.json)
README.md
```

## Core Skill Chain

Skills chain themselves — there is no orchestrator.

1. **using-forge** — Entry gate. Routes code tasks to the planning skill.
2. **writing-plans** — Gathers context via sub-agents, drafts `.claude/plan/{slug}.md` in the user's project, then presents a handoff block.
3. User picks **[1] executing-plans** (in-session, high feedback, ≤5 steps) or **[2] subagent-execution** (one fresh subagent per step, for large plans).
4. **debugger** — On-demand diagnosis. Any executor loads it when stuck.

## Plan Artifact

Plans are written to `.claude/plan/{slug}.md` in the **user's project**, not this repo. Slug is the Linear ticket ID (e.g. `eng-123`) or a kebab-case description ≤40 chars.

Required plan sections: GOAL, APPROACH, SKILLS TO APPLY, FILES TO CHANGE, STEPS (checklist), TESTS TO UPDATE/ADD, RISKS, OUT OF SCOPE.

Every STEP line must start with `- [ ]` — executors build todos from these.

## Sub-Agents

| Agent | Purpose |
|---|---|
| `ticket-fetcher` | Fetches a Linear ticket and returns a ≤200-word summary |
| `codebase-explorer` | Maps the repo via GitNexus knowledge graph before planning |
| `test-runner` | Runs typecheck (backend) and chrome-devtools visual checks (frontend) after execution |
