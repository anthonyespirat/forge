# console-logging — diagnostic instrumentation

## When to use
- You have a hypothesis but can't confirm it from reading code (async ordering, conditional branch, value transformation)
- You need to observe what a value IS at runtime, not what you think it is
- Stack trace alone isn't enough — you need to trace execution path leading to the bug

Logging is a DIAGNOSTIC tool, not a fix. Every log you add must be removed before reporting the debug as done.

## Tools
- `Edit`: add `console.log` / `console.error` / `console.table` / `console.trace` at the instrumentation point
- `Bash`: re-run the failing command to capture the new output
- For frontend: logs appear via `chrome-mcp` → `read_console_messages`

## Procedure
1. **State your hypothesis first, in one sentence.** "I believe `x` is `undefined` here because the upstream fetch hasn't resolved."
2. **Pick the narrowest instrumentation point** that will prove or disprove it. Usually 1-3 logs. More = noise.
3. **Make logs identifiable.** Prefix with a unique tag so you can grep/filter: `[DEBUG:auth-flow]`, `[DBG-42]`. Never plain `console.log(x)`.
4. **Log enough context.** A value alone is useless — also log what it means.
   ```ts
   console.log('[DEBUG:order]', { orderId, status, userId, ts: Date.now() });
   ```
5. **Re-run. Read the output.** If the hypothesis is confirmed, proceed to fix. If disproved, revise the hypothesis — don't keep adding logs blindly.
6. **Remove every diagnostic log before returning.** No `// TODO: remove` commented logs. No left-behind tags.

## Log placement patterns

### Async ordering
```ts
console.log('[DBG-A] before await', { input });
const result = await fetchThing(input);
console.log('[DBG-A] after await', { result });
```
Confirms the await resolved AND what it resolved to.

### Branch selection
```ts
if (condition) {
  console.log('[DBG-B] took branch A', { condition });
  // ...
} else {
  console.log('[DBG-B] took branch B', { condition });
  // ...
}
```
Confirms which branch actually ran.

### Value transformation
```ts
console.log('[DBG-C] input', input);
const out = transform(input);
console.log('[DBG-C] output', out);
```
Confirms the transform is the culprit vs a downstream consumer.

### Call entry/exit
```ts
function handler(req) {
  console.log('[DBG-D] handler entered', { path: req.path, method: req.method });
  // ...
  console.log('[DBG-D] handler exit', { status });
}
```
Confirms the function is even being called.

## Rules
- NEVER commit diagnostic logs. They must be removed before the debug loop returns.
- NEVER `console.log` a secret, token, password, or full user PII. Mask or omit.
- NEVER add logs to production/shared-library code in node_modules. If the info you need is in a library, find a wrapper point in your own code.
- NEVER use `console.log` where a structured logger already exists in the project — use the project's logger so it respects log levels and redaction.
- Don't log inside tight loops without a counter/sampling. You'll flood the output and hide the real signal.
- If 3 rounds of logging don't confirm a hypothesis, the hypothesis is probably wrong. Step back, don't escalate log count.

## Removal discipline
Before returning `FIX SUGGESTION`:
- `Grep` for your unique tag (`[DEBUG:...]` / `[DBG-...]`) across the edited files.
- Remove every hit.
- Re-run typecheck/lint to ensure removal didn't leave stray syntax.

If you suggest the caller implement the fix, include in your output: `DIAGNOSTIC LOGS TO REMOVE: file:line x N`. Better: remove them yourself as part of the debug pass.
