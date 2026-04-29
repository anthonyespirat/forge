# Model selection

Match subagent capability to task complexity. Use the least powerful model that can handle the step.

## Capability tiers

| Tier | Use case |
|------|----------|
| **Fast / cheap** | Mechanical, fully-specified edit in 1–2 files (rename, add field, isolated pure function). Also for `[mechanical]`-tagged steps on rare dispatch occasions. |
| **Standard** | *Default*: known-shape multi-file edit, integrating existing patterns, debugging. |
| **Most capable** | Upgrade only: design judgment, cross-cutting refactor, unfamiliar code, or `BLOCKED` re-dispatch on a reasoning gap. |

## Signals

**Upgrade** (standard → most capable):
- 3+ files crossing a module boundary
- Step says "decide/design/choose"
- Architectural judgment required
- Prior dispatch on same step failed for reasoning

**Downgrade** (standard → fast):
- Exact edit specified
- Prior similar step succeeded on fast model
- Step tagged `[mechanical]`

## Platform notes

**Claude Code:** Set `model` per `Agent` dispatch explicitly. Default to standard tier; upgrade only on explicit signal.

**OpenCode:** Per-`Task` model selection is not supported. The platform chooses. Signal complexity through prompt detail and step scope.

**Reviewer subagents** should match or exceed the implementer's capability tier.
