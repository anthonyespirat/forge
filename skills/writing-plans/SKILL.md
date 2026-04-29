---
name: writing-plans
description: "Turns a free-form dev task into a concrete plan on disk. Gathers repo and ticket context, writes a structured plan to .forge/plan/{slug}.md, self-reviews it, then hands off execution."
---

# Writing plans

Turn a free-form dev task into a concrete plan on disk. Do NOT write code here.

**Announce at start:** "Using `writing-plans` to draft the plan."

## Output artifact

A single markdown file at `.forge/plan/{slug}.md` in the project's working directory.

- `{slug}` = lowercased Linear ticket id (e.g. `eng-123`) if present, else a short kebab-case slug from the task goal (≤ 40 chars, no dates).
- Write with the `Write` tool — it creates parent directories.
- On re-invocation with change requests, **overwrite** the same file. No stale versions.

## Process

### Step 1 — Gather context

Before drafting, make sure you have enough to plan against:

1. **Ticket context (if referenced).** If the user message contains a Linear ref (`ENG-123` or URL), dispatch the `ticket-fetcher` subagent to pull the ticket summary.
   - **Claude:** use the `Agent` tool.
   - **OpenCode:** use the `Task` tool with `subagent_type: general`.
2. **Repo context.** Dispatch the `codebase-explorer` subagent with the task description (+ ticket summary if any). It returns: relevant symbols/files, patterns, gotchas, applicable guideline skills, scope (backend / frontend / fullstack).
   - **Claude:** use the `Agent` tool.
   - **OpenCode:** use the `Task` tool with `subagent_type: explore`.
   - Skip ONLY if the task is trivially isolated (e.g. "add this constant to this file") or if rich repo context is already in this conversation.
3. **Clarify if ambiguous.** If intent is unclear after both, ask ONE targeted question before writing the plan. Don't ask about preferences the user hasn't signaled — just resolve blockers.

### Step 2 — Draft the plan

Write the plan file using the format below. Lead with the minimal change set that satisfies the goal; don't stage theoretical future work.

**Every STEP must start with `- [ ]`** — the executor will build its todo from these.

**Tag mechanical steps `[mechanical]`.** If a step is a scripted recipe — a shell command, a dependency install, deterministic scaffolding, zero judgment — append `[mechanical]` to the step text. `subagent-execution` treats tagged steps as a signal that the controller may execute them directly instead of dispatching, saving an entire round-trip.

**Attach `EXCERPTS` where they save re-reads.** If a step's implementer will need a specific type signature, config block, or snippet that already exists in the repo, paste it under a nested `EXCERPTS:` block right below the step. The executor pastes these verbatim into the dispatch prompt — no re-reads, no drift. Ad-hoc inlining works; codifying it keeps it consistent.

### Step 3 — Self-review

After writing the file, read it again with fresh eyes and fix inline:

1. **Spec coverage.** Does every requirement / acceptance criterion map to a STEP? List gaps.
2. **Placeholder scan.** Any of these = plan failure — fix them:
   - `TBD`, `TODO`, `implement later`, `fill in details`
   - `add appropriate error handling`, `handle edge cases` without saying which
   - `similar to step N` (repeat the detail — the executor may read steps out of order)
   - references to types/functions/files not defined anywhere in the plan or the repo
3. **Mechanical audit.** For each step, ask: "Is the entire content a shell command, a dependency install, or a deterministic recipe with zero branches?" If yes and the step isn't already tagged, append `[mechanical]` so the executor can skip dispatch.
4. **File-count budget.** No single STEP touches more than 6 new files. If a step does — especially if it bundles unrelated surfaces (e.g. admin + wishlist + settings) — split it. Large bundled steps are the most common cause of over-scoped subagent runs.
5. **Consistency.** Names used in later steps match names defined in earlier ones. A function called `clearLayers()` in step 2 but `clearFullLayers()` in step 5 is a bug.
6. **Scope.** Are any STEPS outside what the user asked for? Move to `OUT OF SCOPE` or delete.

Fix issues inline. No need to re-review — just fix and move on.

### Step 4 — Hand off

Print exactly this block and stop. Do NOT start executing.

```
PLAN: .forge/plan/{slug}.md

<3-5 line summary — goal + step count + key risks>

Pick an execution mode:

  [1] In-session     — I execute the plan in this conversation.
                       Best for small/cohesive plans (≤ ~5 steps).
                       You watch every edit happen.

  [2] Subagent-driven — I dispatch a fresh subagent per STEP, review
                       its summary, then move on. Best for larger
                       plans, keeps this chat light, closer to
                       autonomous.

Which mode? (or: request plan changes / skip execution)
```

Then wait for the user's answer.

- User says **1 / in-session / "go" with no preference** → invoke the `executing-plans` skill (`Skill` tool on Claude, `skill` tool on OpenCode).
- User says **2 / subagent / "dispatch"** → invoke the `subagent-execution` skill.
- User requests **plan changes** → revise the plan file (overwrite the same path), self-review again, reprint the handoff.
- User says **skip / cancel** → stop.

## Plan file format

```markdown
# Plan — {short title}

## GOAL
<1-2 sentences — what success looks like>

## APPROACH
<3-5 sentences — the strategy. Why this approach vs alternatives, if non-obvious.>

## SKILLS TO APPLY
- <skill-name>: <how it constrains the implementation>
- (or "none — no project guidelines apply")

## FILES TO CHANGE
- path/to/file.ts — <what changes>
- path/to/new-file.ts — <new, purpose>

## STEPS
- [ ] 1. <step — specific enough to review, code-block only if a signature/assertion is non-obvious>
- [ ] 2. <step> [mechanical]    <!-- append tag when the step is a scripted recipe with zero judgment -->
- [ ] 3. <step>
  EXCERPTS:
    <optional nested block — paste type signatures, snippets, or configs verbatim.
     The subagent-execution controller pastes this into the dispatch prompt so the
     implementer doesn't need to Read to confirm shapes.>
(typically 3–7 steps; no single step should touch more than 6 new files)

## TESTS TO UPDATE/ADD
- <test file or scenario>

## RISKS
- <risk>: <mitigation>

## OUT OF SCOPE
- <thing intentionally not done — to prevent scope creep>
```

## Rules

- **Intent over implementation.** Describe what changes and why. Code snippets allowed ONLY when a specific type signature, assertion, or interface shape is genuinely ambiguous without them. Not mandatory. Not per step.
- **No placeholders.** See self-review. This is non-negotiable.
- **File budget per step.** No single STEP touches more than 6 new files. Split unrelated surfaces into separate steps rather than bundling them.
- **Mechanical tagging.** Tag pure-recipe steps `[mechanical]` — the executor can skip subagent dispatch for those, saving a full round-trip.
- Every `FILES TO CHANGE` entry traces back to at least one STEP.
- If the explorer flagged a gotcha, it MUST appear in `RISKS` or be addressed by a STEP.
- If the task is ambiguous or the explorer surfaced missing info you can't resolve, write a `## QUESTIONS FOR USER` section INSTEAD OF `STEPS`, print the path, and stop. Don't leave unchecked steps that look actionable.
- Cap plan content at ~500 words.
- Don't propose changes to files the explorer didn't identify unless you flag it and explain why.
- Overwrite on re-invocation — no `v2` files.

## When you're done

The plan file exists, the self-review pass is clean, and the handoff block is printed. The user's choice triggers the next skill. Don't start editing code yourself.
