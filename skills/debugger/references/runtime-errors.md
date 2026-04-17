# runtime-errors — exceptions and stack traces

## When to use
- The program throws at runtime (uncaught exception, rejected promise, crash)
- Unit/integration test failed with a stack trace
- "Works on my machine" — the error is environmental or async-timing related

## Tools
- `Bash`: reproduce the failure (re-run the failing command, script, or test)
- `Read`: the files mentioned in the stack trace
- `LSP` (`goToDefinition`, `hover`): resolve the real type at the crash site
- `Grep`: find the error message literal in source (if the message is custom, this often jumps straight to the throw site)

## Procedure
1. **Reproduce deterministically.** If you can't reproduce, you can't debug. Find the command/input that triggers the error.
2. **Read the stack trace bottom-up for root, top-down for context.** The bottom frame is where the error was thrown; frames above show how you got there.
3. **Pin the faulting line.** Open that file at the reported line number. Read ±5 lines.
4. **State the immediate cause** (what value was wrong at that line) vs. **the root cause** (why that value was wrong). Fix the root cause, not the symptom.
5. **Verify the fix reproduces a pass**, not just silence. A swallowed error is worse than the original.

## Common patterns

### `TypeError: Cannot read properties of undefined (reading 'X')`
- A value you expected to be an object was `undefined`.
- Work backward: where did that value come from? Async that didn't resolve? Array index out of range? Optional chain missing upstream?
- Fix: narrow at the source, not with `?.` at the crash site (that hides the real issue).

### `UnhandledPromiseRejection`
- A promise rejected with no `.catch` and no surrounding `try/await`.
- Find the call via the stack. Decide: is the caller supposed to handle it? If yes, `await` it. If it's fire-and-forget, attach a handler.

### `ReferenceError: X is not defined`
- Import missing, TDZ (using `let`/`const` before declaration), or scope issue.
- Check imports first, then scope.

### Timeout in async test
- Usually a promise that never resolves. Add logging at every `await` in the chain to find where it hangs. See `console-logging.md`.

### Stack trace lands in `node_modules`
- The library isn't the bug; your call into it is. Look at the frame just above the library entry — that's your caller, that's where the bad input originated.

## Reproduction strategies
- **Minimal repro**: strip inputs/setup to the smallest case that still fails.
- **Binary search the changed lines**: if the crash is regression, `git diff` and comment out half the change to bisect.
- **Flaky tests**: run the test in a tight loop (`for i in {1..20}; do npm test -- <name>; done`) to see if it's timing/order dependent.

## Rules
- Never catch-and-swallow to make an error go away. Every `catch` must either handle or rethrow with context.
- Never widen types to avoid a runtime check. Runtime safety lives in code, not types.
- If the stack trace points to framework/library internals and you can't reproduce in userland, STOP — escalate with the repro command and full trace.
- One bug at a time. If reproducing reveals a second unrelated error, note it and stay focused on the reported symptom.
