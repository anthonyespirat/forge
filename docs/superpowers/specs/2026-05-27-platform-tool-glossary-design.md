# Platform Tool Glossary Design

## Goal

Remove repeated platform-specific tool mapping blocks from Forge skills, such as separate Claude Code and OpenCode instructions for dispatching subagents. Forge skills should use one canonical tool vocabulary and let `using-forge` define how that vocabulary maps to each supported platform.

## Context

Forge currently repeats platform-specific instructions in several downstream skills, including `writing-plans`, `executing-plans`, `subagent-execution`, and `subagent-execution/implementer-prompt.md`. This creates noisy skill text and makes future platform support harder because every repeated block must be updated.

Claude Code and OpenCode expose similar built-in capabilities with different tool naming conventions. Forge skills already mostly use Claude-style tool names such as `Read`, `Write`, `TodoWrite`, `Skill`, and `Agent`. Those names should become Forge's canonical terms.

## Approach

Add a `Platform Tool Glossary` section to `skills/using-forge/SKILL.md`. This section will define canonical Forge tool terms and map them to Claude Code and OpenCode tool names.

Downstream Forge skills will use the canonical terms instead of repeating per-platform callouts. They should only include platform-specific notes when behavior differs enough to affect the instruction.

## Canonical Terms

Forge skill instructions will use Claude-style canonical tool names:

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

## Skill Changes

Update downstream skills to remove repeated blocks like:

```md
- Claude: use the `Agent` tool.
- OpenCode: use the `Task` tool with `subagent_type: general`.
```

Replace them with platform-neutral instructions like:

```md
Dispatch with `Agent` using the platform mapping from `using-forge`.
```

Where the exact subagent type matters, keep the role-specific detail but not the platform tool explanation. For example, a step may say to dispatch a general implementer or explorer subagent.

## Error Handling

If a platform lacks a direct equivalent for a canonical Forge term, the skill should state the closest supported behavior in the glossary rather than duplicating workarounds across downstream skills.

If a downstream skill needs platform-specific behavior, it may include a short exception, but the default is to reference the glossary.

## Testing

Because this repository is Markdown-only and has no build or test commands, validation is manual:

- Search for duplicated `Claude:` / `OpenCode:` tool mapping blocks after implementation.
- Confirm `using-forge` contains the canonical glossary.
- Confirm downstream skills remain understandable when read directly.

## Risks

The main risk is that a downstream skill invoked directly may not have `using-forge` loaded in context. The central glossary still avoids repeating tool mappings across skills; downstream skills should stay concise and use canonical Forge tool names directly.

## Out Of Scope

This design does not rename Forge roles such as planner, explorer, implementer, tester, or debugger. It only covers platform tool names.

This design does not introduce a top-level glossary file or per-skill glossary tables.
