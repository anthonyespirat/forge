---
name: dev-flow
description: Orchestrator for dev tasks starting from a free-form description. Coordinates codebase exploration, planning, implementation, and testing via specialized sub-agents, with human validation at each step. Use when the user describes a dev task (feature, bugfix, refactor) and wants a structured flow with checkpoints. Triggers on explicit invocation ("use dev-flow", "start dev flow") or when a user's request clearly describes a coding task that would benefit from plan-before-code.
---

# dev-flow

Orchestrator for structured dev work. You (the main agent) follow this flow step-by-step. Each heavy step is delegated to a specialized sub-agent so this conversation stays light.

## Core principle

**You orchestrate. Sub-agents execute.** Never do exploration, planning, implementation, or testing yourself when a sub-agent exists for it. Your job: route work, collect summaries, enforce human checkpoints.

## Plan artifact

The plan is a markdown file written by the `planner` to `.claude/plan/{slug}.md` in the project's working directory.

- `{slug}` = Linear ticket id (lowercased, e.g. `eng-123`) if present, otherwise a short kebab-case slug derived from the task description.
- The plan file is the source of truth for intent: planner creates it, you (orchestrator) reference it by path only, human validates it on disk.
- The todo is created by the `implementer` from the plan's STEPS at the start of step 6 — internal to its execution. You (orchestrator) do not read or write the todo.

## Flow overview

```
1. Intake (you)
2. Ticket fetch (sub-agent, optional)
3. Codebase exploration (sub-agent)
4. Planning (sub-agent — writes .claude/plan/{slug}.md)
   ↓ 🛑 HUMAN VALIDATES PLAN
5. Implementation (sub-agent — reads & updates the plan file)
   ↓ 🛑 HUMAN REVIEWS CODE
6. Testing (sub-agent)
   ↓ 🛑 HUMAN DECIDES NEXT
7. PR/push (human-driven)
```

## Step 1 — Intake

Parse the user's description. Detect:
- Linear ticket reference (e.g. `ENG-123`, URL) → step 2 needed
- Scope: backend / frontend / fullstack (keywords: API, endpoint, route, component, page, UI, style, DB, schema…)
- Ambiguity: if description is vague, ask ONE clarifying question before proceeding

Announce briefly: "Flow started. Running: [fetch →] explore → plan → validation → implement → test."

## Step 2 — Ticket fetch (conditional)

If a Linear reference is present, invoke `ticket-fetcher`. Otherwise skip.

## Step 3 — Codebase exploration

Invoke `codebase-explorer` with: user description + ticket summary (if any).

Returns: skills-found, relevant files, patterns, gotchas, scope. Relay a SHORT summary.

## Step 4 — Planning

Invoke `planner` with: description + ticket summary + explorer output.

The planner writes the plan to `.claude/plan/{slug}.md` and returns the file path plus a short summary.

Present the summary to the user and the path so they can open the file.

## Step 5 — 🛑 Human plan validation

Ask: "Validate this plan, request changes, or cancel?"

Do NOT proceed without explicit approval ("go", "ok", "validated"). On change request, re-invoke `planner` with feedback — the planner overwrites the same plan file.

## Step 6 — Implementation

Invoke `implementer` with: path to the validated plan file + explorer context.

The implementer reads `.claude/plan/{slug}.md`, builds a todo from the STEPS section, then executes them in order (marking each task in_progress → completed as it goes). You don't touch the plan file or the todo during this step — just wait for the implementer's final summary.

Returns: files changed, summary.

## Step 7 — 🛑 Human code review

"Implementation done. Review the diff. Proceed to tests?"

Wait for go-ahead.

## Step 8 — Testing

Invoke `test-runner` with: scope + files changed.

- Backend → typecheck (`tsc --noEmit`)
- Frontend → typecheck + Chrome MCP visual/behavior check
- Fullstack → both

On failure: ask user if `implementer` should fix. If yes, loop back to step 6 — the implementer will append FIX STEPS to the plan file and resolve them. Max 2 fix iterations before escalating to the user.

## Step 9 — 🛑 Human decides next

"Tests OK. Open PR? Commit? Something else?"

Follow the user's instruction. Never push or open PRs without explicit go.

## Sub-agent invocation contract

Always pass:
- **Task**: one-sentence goal
- **Context**: only what's needed (prior outputs, not raw dumps)
- **Plan path** (steps 5+): `.claude/plan/{slug}.md`
- **Expected output format**: per agent definition

Relay SHORT summaries to the user — not raw sub-agent output.

## Failure handling

- Sub-agent errors or confused output → report to user, ask how to proceed
- User interrupts mid-step → stop, reconfirm, adjust direction
- Missing skill/tool → report, don't improvise
- Repo not indexed in GitNexus → explorer will flag it; pause and ask user to run `gitnexus analyze`
- `.claude/plan/` missing → planner creates it; if write fails, report and stop
