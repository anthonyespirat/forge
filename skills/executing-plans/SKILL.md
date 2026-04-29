---
name: executing-plans
description: "Executes an existing plan in-session. Reads the plan, builds a todo from its STEPS, executes each step in this conversation, and loads the debugger skill on errors."
---

# Executing plans (in-session)

You execute a plan in the current conversation. You do NOT re-plan, re-explore, or expand scope.

**Announce at start:** "Using `executing-plans` to implement `<plan path>`."

## Input

- Path to the validated plan file (e.g. `.forge/plan/eng-123.md`). If the user didn't give it explicitly, use the most recent file in `.forge/plan/`.

## Process

### Step 1 — Read and critically review the plan

`Read` the plan file. Parse:

- `SKILLS TO APPLY`
- `FILES TO CHANGE`
- `STEPS` (the `- [ ]` checklist — this is your work)
- `RISKS` and `OUT OF SCOPE` — stay aware

Then **review it critically** before touching code. Look for:

- Ambiguous steps ("handle errors", "similar to above", bare verbs without a target)
- Steps that reference files/functions/types that don't seem to exist
- Contradictions between steps
- Missing setup (e.g. step 2 imports something step 1 never creates)
- `QUESTIONS FOR USER` section → plan isn't ready, STOP and report `STATUS: blocked`

**If you find concerns, raise them with the user before executing.** One message, bullet points, then wait. Don't silently execute a plan you don't believe in.

If the plan looks solid, continue.

### Step 2 — Build the todo

Call `TodoWrite` once with one task per STEP:

- `content`: the step text (imperative form), e.g. "Add validation to UserService.validate"
- `activeForm`: present continuous, e.g. "Adding validation to UserService.validate"
- `status`: `pending` for all tasks initially

### Step 3 — Load guidelines

For each skill in `SKILLS TO APPLY`, invoke it (via the `Skill` tool on Claude, `skill` tool on OpenCode) or `Read` its SKILL.md if unavailable. These are your constraints — naming, structure, patterns. Respect them.

If no skills are listed, follow the conventions observed in the files touched by the plan.

### Step 4 — Execute step by step

For each task in order:

1. `TodoWrite` to mark it `in_progress` (only ONE `in_progress` at a time)
2. `Read` any file you will edit (always Read before Edit)
3. Make changes with `Edit` (targeted) or `Write` (new files)
4. `TodoWrite` to mark it `completed` — immediately after finishing, don't batch
5. Move to the next task

Do not start the next task before the current one is `completed`.

### Step 5 — When stuck, use the debugger skill

Invoke the `debugger` skill (via `Skill` tool on Claude, `skill` tool on OpenCode, else `Read` the debugger SKILL.md) when you hit ANY of:

- A TypeScript/lint error whose cause isn't obvious after reading the file
- A runtime exception surfaced during the edit (e.g. module-load error)
- A symbol whose real type/shape you need to confirm before editing
- You're about to guess. Guessing costs more than delegating.

Pass to `debugger`: `SYMPTOM` (1 line), `CONTEXT` (file:line, recent change), `TRIED` (if this is a retry).

Fold its fix suggestion back into the current step. Do NOT add new tasks from the diagnosis unless it reveals missing work in a STEP.

For frontend runtime observation (page/UI/network), `debugger` will route you to the `chrome-devtools` skill. Don't drive the browser yourself.

### Step 6 — Final report

When all STEPS are `completed`, print:

```
STATUS: done | blocked | partial

PLAN: <path>

FILES CHANGED:
- path/to/file.ts — <what changed in 1 line>
- path/to/new.ts — <created, purpose>

SKILLS APPLIED:
- <skill-name>: <how it shaped the code>
- (or "none listed")

STEPS COMPLETED: <N of M>

NOTES:
- <anything the user should know: assumption made, edge case punted, etc.>

IF BLOCKED:
- REASON: <why you stopped>
- AT STEP: <which step>
- NEED FROM USER: <what unblocks you>
```

### Step 7 — Offer tests

End with:

> "Implementation done. Run the `test-runner` subagent? (scope: backend / frontend / fullstack)"

If the user says yes, dispatch the `test-runner` subagent with scope + files changed.
- **Claude:** use the `Agent` tool.
- **OpenCode:** use the `Task` tool with `subagent_type: general`.
On failures, loop back into the debugger/fix cycle ONLY if the user asks you to fix. Max 2 fix iterations before escalating.

## Rules

- **Follow the plan.** Don't add features, refactors, or "cleanup" not in STEPS.
- If a step is genuinely ambiguous to execute, STOP and return `STATUS: blocked` with a specific question. Don't improvise architecture.
- Don't edit files outside `FILES TO CHANGE` unless unavoidable — if you must, add a NOTE explaining why.
- **No commits, pushes, or PR creation.** Leave the diff for the user to review.
- Don't run tests yourself — that's the `test-runner`'s job.
- Keep the todo in sync with reality: every started step is `in_progress`, every finished step is `completed`. Never leave a stale `in_progress`.
- Cap the final report at ~400 words. The user will see the diff; don't narrate it.

## Red flags — STOP

- You're 2 steps in and the plan is clearly wrong → stop, report to user, don't power through
- You're editing a file that isn't in `FILES TO CHANGE` and can't justify why → stop, ask
- Same error twice after a "fix" → invoke `debugger`, don't loop
- You're about to commit / push / open a PR → stop, that's the user's call
