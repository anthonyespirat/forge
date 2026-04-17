# typecheck — TypeScript compile errors

## When to use
- `tsc --noEmit` or `npm run typecheck` reports errors
- IDE shows red squigglies you want to resolve before testing
- Generic constraint or inference error you can't parse at a glance

## Tools
- `Bash`: run `npx tsc --noEmit` or the project's typecheck script
- `Read`: the failing file + nearby types (adjacent `.d.ts`, imported modules)
- `LSP` (`hover`, `goToDefinition`, `findReferences`): resolve what a type actually is at a position — more reliable than reading source

## Procedure
1. Run the exact typecheck command and capture full output.
2. Filter to errors referencing files in the current change set. Ignore pre-existing errors in untouched files.
3. For each error, in order:
   - Read the file at the reported line
   - If the error mentions a type name you don't recognize, use `LSP goToDefinition` or `hover` at the symbol's position to see its real shape
   - If the error is about generics / inference: check the call site AND the generic constraint — both must agree
4. State the root cause in one sentence before suggesting a fix.

## Common error patterns

### `TS2322` "Type X is not assignable to type Y"
- Structural mismatch. Compare the two shapes field by field.
- Often: optional vs required, `null` vs `undefined`, extra properties on excess-property check.

### `TS2345` "Argument of type X is not assignable to parameter of type Y"
- Same as 2322 but at a call boundary. The callee's signature is truth — don't widen it, narrow the caller.

### `TS2339` "Property X does not exist on type Y"
- Type Y doesn't have X. Either (a) Y is narrower than you thought (union not narrowed), or (b) X was renamed.
- Use `LSP hover` on Y's variable to see the actual type; use `findReferences` on X to see if it moved.

### `TS2589` "Type instantiation is excessively deep"
- Recursive generic blew up. Don't try to "fix" the recursion — suggest simplifying the type or using `unknown` at the boundary, and escalate.

### `TS2571` "Object is of type 'unknown'"
- Needs a type guard or `as` cast. Prefer the guard.

### `TS7006` "Parameter X implicitly has 'any' type"
- Missing annotation in strict mode. Add the type based on how the param is used inside the function — don't default to `any`.

### `TS2304` "Cannot find name X"
- Missing import, typo, or a declaration file is not being picked up.
- `LSP goToDefinition` if the symbol exists somewhere in the workspace.

## Fix rules
- Fix types at the narrowest scope that makes the error disappear. Don't widen public API signatures to silence a local error.
- Never use `@ts-ignore` or `@ts-expect-error` without a NOTE explaining why, and only if the fix would be structural.
- Never cast with `as any` — use the real type or a proper guard.

## Escalation
If the error reveals a design flaw (public API typed wrong, schema shape disagreement between layers), STOP and report as `IF STILL BLOCKED` — that's a planning decision, not a debug fix.
