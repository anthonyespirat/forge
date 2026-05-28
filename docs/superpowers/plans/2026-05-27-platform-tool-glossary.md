# Platform Tool Glossary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a canonical Forge platform tool glossary to `using-forge` and remove repeated Claude/OpenCode tool mapping blocks from downstream skills.

**Architecture:** `skills/using-forge/SKILL.md` becomes the canonical source for platform tool-name translation. Downstream skills keep their workflow instructions but refer to canonical Forge tool names instead of restating per-platform mappings.

**Tech Stack:** Markdown-only Forge skill and prompt files. No build, test, or lint commands exist in this repository.

---

## File Structure

- Modify: `skills/using-forge/SKILL.md` — add `Platform tool glossary` and authoring rule for canonical Forge tool names.
- Modify: `skills/writing-plans/SKILL.md` — remove repeated Claude/OpenCode dispatch mappings from context gathering steps.
- Modify: `skills/executing-plans/SKILL.md` — remove repeated Claude/OpenCode test-runner dispatch mapping.
- Modify: `skills/subagent-execution/SKILL.md` — replace local tool-difference table and dispatch mapping with canonical glossary references.
- Modify: `skills/subagent-execution/implementer-prompt.md` — replace platform-specific dispatch note with canonical glossary reference.

## Task 1: Add Canonical Glossary To Using Forge

**Files:**
- Modify: `skills/using-forge/SKILL.md`

- [ ] **Step 1: Read the current entry skill**

Run: manually inspect `skills/using-forge/SKILL.md`.
Expected: The file contains `The rule`, `Chain`, `Red flags`, `User instructions override`, and `Announce before acting` sections.

- [ ] **Step 2: Add the glossary after the Chain section**

Insert this section after the paragraph ending with `That's the whole flow.`:

```md
## Platform tool glossary

Forge skills use canonical Claude-style tool names. Translate those names to the current agent platform at runtime.

| Forge canonical term | Claude Code | OpenCode |
|---|---|---|
| `Agent` | `Agent` | `Task` |
| `Skill` | `Skill` | `skill` |
| `TodoWrite` | `TodoWrite` | `todowrite` |
| `Read` | `Read` | `read` |
| `Write` | `Write` | `write` |
| `Edit` | `Edit` | `edit` or `apply_patch` |
| `Bash` | `Bash` | `bash` |
| `Glob` | `Glob` | `glob` |
| `Grep` | `Grep` | `grep` |
| `WebFetch` | `WebFetch` | `webfetch` |
| `AskUserQuestion` | `AskUserQuestion` | `question` |

Downstream Forge skills should use the Forge canonical term. Do not repeat per-platform tool mappings unless a platform has materially different behavior that changes the instruction.
```

- [ ] **Step 3: Verify the insertion point**

Confirm the file order is: `The rule`, `Chain`, `Platform tool glossary`, `Red flags`, `User instructions override`, `Announce before acting`.

## Task 2: Clean Writing Plans Dispatch Text

**Files:**
- Modify: `skills/writing-plans/SKILL.md`

- [ ] **Step 1: Replace ticket-fetcher dispatch mapping**

Replace this block:

```md
1. **Ticket context (if referenced).** If the user message contains a Linear ref (`ENG-123` or URL), dispatch the `ticket-fetcher` subagent to pull the ticket summary.
   - **Claude:** use the `Agent` tool.
   - **OpenCode:** use the `Task` tool with `subagent_type: general`.
```

with:

```md
1. **Ticket context (if referenced).** If the user message contains a Linear ref (`ENG-123` or URL), dispatch the `ticket-fetcher` subagent with `Agent`.
```

- [ ] **Step 2: Replace codebase-explorer dispatch mapping**

Replace this block:

```md
2. **Repo context.** Dispatch the `codebase-explorer` subagent with the task description (+ ticket summary if any). It returns: relevant symbols/files, patterns, gotchas, applicable guideline skills, scope (backend / frontend / fullstack).
   - **Claude:** use the `Agent` tool.
   - **OpenCode:** use the `Task` tool with `subagent_type: explore`.
   - Skip ONLY if the task is trivially isolated (e.g. "add this constant to this file") or if rich repo context is already in this conversation.
```

with:

```md
2. **Repo context.** Dispatch the `codebase-explorer` subagent with `Agent` and the task description (+ ticket summary if any). It returns: relevant symbols/files, patterns, gotchas, applicable guideline skills, scope (backend / frontend / fullstack).
   - Skip ONLY if the task is trivially isolated (e.g. "add this constant to this file") or if rich repo context is already in this conversation.
```

- [ ] **Step 3: Check readability**

Read lines 22-33 of `skills/writing-plans/SKILL.md` and confirm each context-gathering instruction is still clear when the skill is invoked directly.

## Task 3: Clean Executing Plans Test-Runner Text

**Files:**
- Modify: `skills/executing-plans/SKILL.md`

- [ ] **Step 1: Replace test-runner dispatch mapping**

Replace this block:

```md
If the user says yes, dispatch the `test-runner` subagent with scope + files changed.
- **Claude:** use the `Agent` tool.
- **OpenCode:** use the `Task` tool with `subagent_type: general`.
On failures, loop back into the debugger/fix cycle ONLY if the user asks you to fix. Max 2 fix iterations before escalating.
```

with:

```md
If the user says yes, dispatch the `test-runner` subagent with `Agent`, scope, and files changed.
On failures, loop back into the debugger/fix cycle ONLY if the user asks you to fix. Max 2 fix iterations before escalating.
```

- [ ] **Step 2: Check final offer flow**

Read lines 108-117 of `skills/executing-plans/SKILL.md` and confirm the skill still ends by offering `test-runner` and does not imply tests should be run inline.

## Task 4: Clean Subagent Execution Tool Mapping

**Files:**
- Modify: `skills/subagent-execution/SKILL.md`

- [ ] **Step 1: Remove local tool differences table**

Replace this section:

```md
## Tool differences

| Action | Claude | OpenCode |
|--------|--------|----------|
| Dispatch subagent | `Agent` tool | `Task` tool with `subagent_type` |
| Invoke skill | `Skill` tool | `skill` tool |
```

Do not replace it with another local glossary reminder. The next section should be `## Model selection`.

- [ ] **Step 2: Replace dispatch-loop mapping**

Replace this block:

```md
2. **In a single message**, emit one dispatch per step:
   - **Claude:** `Agent` tool, `subagent_type: general-purpose`, `model` per capability tier above.
   - **OpenCode:** `Task` tool, `subagent_type: general`.
   - Prompt from `./implementer-prompt.md` filled with STEP, SCENE, RELEVANT FILES, GUIDELINE SKILLS, PRIOR-STEP OUTPUTS.
```

with:

```md
2. **In a single message**, emit one `Agent` dispatch per step. Use the general implementer subagent and, on platforms that support per-dispatch model selection, set `model` per capability tier above.
   - Prompt from `./implementer-prompt.md` filled with STEP, SCENE, RELEVANT FILES, GUIDELINE SKILLS, PRIOR-STEP OUTPUTS.
```

- [ ] **Step 3: Check model-selection context**

Read lines 23-38 of `skills/subagent-execution/SKILL.md` and confirm the OpenCode note about unavailable per-dispatch model selection remains, because it describes behavior rather than only tool naming.

## Task 5: Clean Implementer Prompt Tool Mapping

**Files:**
- Modify: `skills/subagent-execution/implementer-prompt.md`

- [ ] **Step 1: Replace platform-specific dispatch note**

Replace this block:

```md
You are a fresh implementation subagent. Tool mapping:
- **Claude:** `Agent` tool, `subagent_type: general-purpose`.
- **OpenCode:** `Task` tool, `subagent_type: general`.
```

with:

```md
You are a fresh implementation subagent.
```

- [ ] **Step 2: Confirm prompt still starts with role context**

Read the first 10 lines of `skills/subagent-execution/implementer-prompt.md` and confirm it still identifies the worker as a fresh implementation subagent.

## Task 6: Manual Validation

**Files:**
- Inspect: `skills/**/*.md`

- [ ] **Step 1: Search for repeated platform mapping labels**

Run: `rg "Claude:|OpenCode:|Tool differences|Tool mapping" skills README.md AGENTS.md CLAUDE.md`

Expected: No repeated Claude/OpenCode tool mapping blocks remain in Forge skills. Matches that describe platform support or behavior, such as OpenCode model-selection limitations, are acceptable.

- [ ] **Step 2: Search for glossary references**

Run: `rg "platform glossary|Platform tool glossary|canonical Forge tool" skills`

Expected: `skills/using-forge/SKILL.md` contains the glossary, and edited downstream skills reference it where mappings were removed.

- [ ] **Step 3: Read modified files for direct-invocation clarity**

Read each modified file and confirm downstream skills use canonical Forge tool names directly without repeating platform mapping reminders.

- [ ] **Step 4: Do not run build or tests**

Expected: No build, test, or lint command is run because `AGENTS.md` states this repository has no build/test/lint scripts and all content is Markdown.
