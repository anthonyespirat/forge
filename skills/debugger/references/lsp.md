# lsp — Language Server Protocol for symbol resolution

## When to use
- You need to know what a function/type/class actually is before changing or calling it
- A type error mentions a symbol you can't find via grep (aliased, re-exported, generated)
- You're about to edit something and want to see every caller first (to gauge blast radius within the debug scope)
- A fix requires understanding implementation of an interface or abstract method

Use LSP BEFORE editing. It's the fastest way to avoid "I thought this did X" bugs.

## Tools

All operations need `filePath`, `line`, `character` (1-based, as shown in editors).

| Operation | Use for |
|---|---|
| `hover` | Get the resolved type + doc of the symbol at a position. First thing to try. |
| `goToDefinition` | Jump to where a symbol is defined. Use when `hover` isn't enough or a type is aliased. |
| `findReferences` | Every place the symbol is used. Use to gauge impact of a rename or signature change. |
| `goToImplementation` | Find concrete implementations of an interface/abstract. Essential when debugging polymorphic dispatch. |
| `documentSymbol` | All symbols in a file. Use for unfamiliar files to orient yourself. |
| `workspaceSymbol` | Search symbols across the workspace by name. Use when you know the name but not the location. |
| `prepareCallHierarchy` + `incomingCalls` | "Who calls this function?" — better than `findReferences` when you want call relationships specifically. |
| `prepareCallHierarchy` + `outgoingCalls` | "What does this function call?" — trace execution downstream without reading the whole body. |

## Procedure
1. Open the file with `Read` to find the line/character of the symbol you're investigating. Line numbers come from `Read`'s output.
2. Call `hover` first. 80% of the time it answers the question.
3. If the type is opaque (alias, generic), `goToDefinition`.
4. If you're about to change a signature or behavior, `findReferences` to see call sites — but only within the debug scope. Don't use LSP to plan a refactor; that's out of scope for debug.
5. For overridden/implemented methods, `goToImplementation` before assuming behavior.

## Patterns

### "What does this function return?"
`hover` on the function name at its declaration. The signature is in the tooltip.

### "Why does this call fail with `undefined`?"
`hover` on the call, then `goToDefinition` on the function. Check if the return type is `T | undefined` — the caller may be ignoring the undefined branch.

### "Who calls this private method?"
`prepareCallHierarchy` on the method name, then `incomingCalls`. Stays within the class scope naturally.

### "Is this interface method actually implemented somewhere?"
`goToImplementation` on the interface method. If nothing is returned, the dispatch target is missing.

## Rules
- LSP is read-only. Never edit based on LSP alone — always `Read` the file at the resolved location before deciding on a change.
- If LSP returns no results where you'd expect some, the language server may not be attached — fall back to `Grep` for the symbol name, but flag it.
- Positions are 1-based. Off-by-one is the #1 mistake — double-check the line/character against `Read` output.
- Don't use LSP to explore the whole codebase. It's for targeted symbol resolution inside the debug scope.
