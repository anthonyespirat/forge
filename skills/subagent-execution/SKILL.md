---
name: subagent-execution
description: "Executes a plan by dispatching one fresh subagent per STEP. The controller owns the todo and review; subagents own the edits. Keeps the main conversation light."
---

# Subagent-driven execution

Execute a plan by dispatching a fresh subagent per STEP. You (the controller) own the todo and the review; the subagents own the edits.

**Announce at start:** "Using `subagent-execution` to implement `<plan path>` — one subagent per step."

## Why subagents

Each subagent gets exactly the context it needs for its step — no more, no less. They don't inherit this conversation's history. You curate their inputs and review their summaries.

## Tool differences

| Action | Claude | OpenCode |
|--------|--------|----------|
| Dispatch subagent | `Agent` tool | `Task` tool with `subagent_type` |
| Invoke skill | `Skill` tool | `skill` tool |

## Model selection

Use the least powerful model that can handle the step. Match capability to complexity.

| Capability tier | When to use |
|-----------------|-------------|
| Fast / cheap | Mechanical, fully-specified edit in 1–2 files (rename, add field, isolated pure function). Also `[mechanical]`-tagged steps. |
| Standard | *Default*: known-shape multi-file edit, integrating existing patterns, debugging. |
| Most capable | Upgrade only: design judgment, cross-cutting refactor, unfamiliar code, or `BLOCKED` re-dispatch on a reasoning gap. |

**Upgrade signals** (standard → most capable): 3+ files crossing a module boundary, step says "decide/design/choose", architectural judgment required, or prior dispatch on same step failed for reasoning.

**Downgrade signals** (standard → fast): exact edit specified, prior similar step succeeded on fast model, step tagged `[mechanical]`.

On platforms that support per-dispatch model selection (e.g. Claude Code), set it explicitly. On platforms that don't (e.g. OpenCode), the platform chooses — you still signal complexity via the prompt and step scope.

## Mechanical steps — skip dispatch

If a STEP is fully specified with zero judgment calls, the controller MAY execute it directly. See [references/dispatch-loop.md](./references/dispatch-loop.md) for indicators and reporting.

## Input

- Path to the validated plan file (e.g. `.forge/plan/eng-123.md`). If not given, use the most recent file in `.forge/plan/`.

## Process

### Step 1 — Read and critically review the plan

`Read` the plan file. Parse `SKILLS TO APPLY`, `FILES TO CHANGE`, `STEPS`, `RISKS`, `OUT OF SCOPE`.

Review critically before dispatching. Look for ambiguous steps, missing setup, contradictions, or `QUESTIONS FOR USER` → STOP and report if found.

### Step 2 — Extract step contexts

For each STEP, note: step text, relevant files, applicable guideline skills, and prior-step outputs (if dependent). Keep in working memory; do NOT write a new file.

### Step 3 — Build the todo

Call `TodoWrite` once with one task per STEP (`content`, `activeForm`, `status: pending`).

### Step 4 — Dispatch loop

Group steps into parallel batches (disjoint files + no dependency). For each batch:

1. `TodoWrite` → mark batch `in_progress`.
2. **In a single message**, emit one dispatch per step:
   - **Claude:** `Agent` tool, `subagent_type: general-purpose`, `model` per capability tier above.
   - **OpenCode:** `Task` tool, `subagent_type: general`.
   - Prompt from `./implementer-prompt.md` filled with STEP, SCENE, RELEVANT FILES, GUIDELINE SKILLS, PRIOR-STEP OUTPUTS.
3. Wait for all reports.
4. Handle each status per [references/handling-status.md](./references/handling-status.md).
5. If BLOCKED reveals a plan-level error, STOP before the next batch.

See [references/dispatch-loop.md](./references/dispatch-loop.md) for full batching rules and concurrency details.

### Step 5 — Final report

After all steps are `completed`:

```
STATUS: done | blocked | partial

PLAN: <path>

FILES CHANGED (aggregated across subagents):
- path/to/file.ts — <what changed>

STEPS COMPLETED: <N of M>

SUBAGENT DISPATCHES: <count> (<re-dispatches if any>)

DIRECT EXECUTIONS: <count of mechanical steps executed without dispatch>

NOTES:
- <anything notable from subagent reports>
```

### Step 6 — Offer tests

End with:

> "Implementation done. Run the `test-runner` subagent? (scope: backend / frontend / fullstack)"

Dispatch `test-runner` on failure. Max 2 fix iterations before escalating.

## Rules

- **You are the controller.** Don't edit files yourself. If you reach for `Edit`, stop — dispatch instead.
- **One subagent per step** — except `[mechanical]` steps executed directly.
- **Fresh context per dispatch.** Never chain subagents by forwarding raw output.
- **Cap the final report at ~400 words.**
- **Escalate instead of looping.** Two failed dispatches on the same step → stop and ask the user.

## Red flags — STOP

- Subagent reports it committed or pushed → escalate immediately.
- Subagent edited files outside its scope without justification → re-dispatch or escalate.
- Same step fails twice → stop; the plan or framing is probably wrong.
- You feel tempted to "just do this one quickly" yourself → don't.
