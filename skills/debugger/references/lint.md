# lint — ESLint / Prettier failures

## When to use
- ESLint reports errors or warnings that block CI or were flagged by the caller
- Prettier formatting mismatch
- A custom rule (project-specific) is failing and you need to understand the intent

## Tools
- `Bash`: run `npm run lint`, `npx eslint <file>`, `npx prettier --check <file>`
- `Read`: `.eslintrc*`, `eslint.config.*`, `.prettierrc*` — the config tells you WHAT is being enforced
- `LSP` (`hover`): for type-aware rules (`@typescript-eslint/*`), the underlying type may be part of the issue

## Procedure
1. Run lint scoped to the changed files: `npx eslint <file1> <file2>` — don't run on the whole repo, you'll drown in unrelated warnings
2. Group errors by rule (not by line). One rule violated many times usually means one root cause.
3. For each rule:
   - If the rule name is unfamiliar, read the config to confirm the rule is actually enabled with the reported severity
   - Look up the rule's intent (it's in the config or a one-line lookup). Don't silence a rule without knowing why it exists.
4. Prefer auto-fix when safe: `npx eslint --fix <file>`. Then re-read the file to confirm what changed — auto-fix is not magic.

## Common patterns

### `no-unused-vars` / `@typescript-eslint/no-unused-vars`
- Delete the var. Don't prefix with `_` unless the project's config explicitly ignores `^_`.

### `no-explicit-any` / `@typescript-eslint/no-explicit-any`
- Replace `any` with `unknown` + narrowing, or with the real type. See `typecheck.md` for finding the real type.

### `prefer-const`
- Straightforward auto-fix. Safe.

### `no-floating-promises`
- A Promise was created without being awaited or caught. Either `await` it, `void` it (if intentional fire-and-forget), or chain `.catch()`. Choice depends on caller context — check if this is in a handler, a loop, or startup code.

### Import order rules (`import/order`, `simple-import-sort`)
- Always auto-fixable. Just run `--fix`.

### Prettier conflicts
- If ESLint and Prettier disagree, check if `eslint-config-prettier` is applied last in the extends chain. If not, that's the root cause — escalate.

## Fix rules
- Fix at source. Don't add `// eslint-disable-next-line` unless (a) the rule is genuinely wrong here AND (b) you leave a one-line comment explaining why.
- Never disable a rule globally to pass a local error.
- If the rule conflict reveals a design issue (e.g. floating promise in a loop that should be awaited), STOP — that's a runtime concern, escalate or switch to `runtime-errors.md`.

## Escalation
- Config itself is broken (rule not recognized, plugin missing) → escalate to user, don't touch the config as part of debug
- A custom project rule is failing with no clear fix → ask the user for intent
