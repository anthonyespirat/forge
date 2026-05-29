---
name: brainstorm
description: "Use when the user explicitly asks to brainstorm, grill, challenge, compare approaches, clarify domain language, or stress-test a dev idea."
---

# Brainstorm

Turn an explicitly requested brainstorming session into an approved decision brief. Do not write code, create a plan artifact, or modify project files unless the user explicitly approves a documentation update.

**Announce at start:** "Using `brainstorm` to shape the approach before planning."

## When To Use

Use only when the user explicitly asks to:

- brainstorm, grill, challenge, stress-test, or compare approaches
- run `brainstorm` before planning
- resolve overloaded domain language before planning, such as `tenant` vs `org` vs `customer`

Do not trigger this skill automatically just because a task is vague. If the user describes normal dev work, keep the main Forge flow light and go to `writing-plans`.

## Process

1. **Gather context first.** Read relevant repo docs, recent project guidance, and existing code/docs vocabulary. If a question can be answered by exploration, explore instead of asking.
2. **Grill one branch at a time.** Ask one question per message. Include your recommended answer and why. Challenge fuzzy terms, hidden assumptions, contradictions, and scope creep.
3. **Use existing language.** If docs or code use a term differently from the user, call it out immediately and ask which meaning should win.
4. **Stress-test with scenarios.** Use concrete edge cases to expose unclear boundaries, especially around product flows, permissions, state transitions, data ownership, and failure modes.
5. **Explore approaches when ready.** Continue gathering knowledge and asking one question at a time until the remaining uncertainty is small enough to compare options. Then propose the useful approaches, lead with your recommendation, and show trade-offs. Keep options focused; do not invent future roadmap work.
6. **Write a decision brief in chat.** Include goal, chosen approach, canonical terms, key risks, out of scope, and planning notes. Ask for approval.
7. **Hand off after approval.** Once approved, invoke `writing-plans` and pass the decision brief as context.

## Documentation Updates

Do not update documentation by default during brainstorming.

Offer a docs update only when it would preserve a durable decision:

- `CONTEXT.md` for resolved project-specific vocabulary, not implementation details
- ADR for decisions that are hard to reverse, surprising without context, and selected from real alternatives

If the user approves a docs update, keep it minimal and continue the brainstorming loop afterward.

## Decision Brief Format

```markdown
## Decision Brief

**Goal:** <what success means>

**Recommended Approach:** <the chosen approach and why>

**Canonical Terms:**
- `<term>`: <meaning>

**Key Risks:**
- <risk>: <mitigation or planning note>

**Out Of Scope:**
- <explicit no>

**Planning Notes:**
- <what writing-plans must preserve>

Approve this brief so I can move to `writing-plans`, or tell me what to change.
```

## Common Mistakes

| Mistake | Fix |
|---|---|
| Routing every vague idea here automatically | Only use this skill when the user explicitly asks for brainstorming or a grill. |
| Asking a stack of questions | Ask one question at a time, with your recommendation. |
| Treating plan self-review as brainstorming | Brainstorming happens before the plan exists. |
| Accepting overloaded words "for now" | Resolve canonical language or record the ambiguity as a planning risk. |
| Writing docs automatically | Offer docs updates only for durable decisions and wait for approval. |

## Red Flags

- "The idea is fuzzy, so I must run brainstorm automatically."
- "The user said the terms are the same, so no need to challenge them."
- "One clarification question is enough for a design problem."
- "The plan review can serve as the grill."

All of these mean: respect the user's requested mode. Use `brainstorm` only on demand; otherwise keep the normal Forge flow light.
