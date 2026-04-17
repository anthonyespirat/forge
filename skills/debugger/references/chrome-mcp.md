# chrome-mcp — pointer

For frontend debugging via Chrome, use the **`chrome-devtools` skill** already installed in this workspace. It covers browser automation, DOM inspection, network analysis, console capture, and performance profiling.

Invocation (from the caller's context, not from this reference):
- Via the `Skill` tool: `Skill(skill="chrome-devtools", args="<one-line symptom>")`
- Or load its `SKILL.md` directly if `Skill` isn't available in scope.

Minimum to pass when delegating:
- SYMPTOM (one line)
- URL of the page under test
- What you expected vs. observed
- Any recent frontend file changes

## When to stay in `debugger` instead of delegating
- The bug is in frontend code but reproducible purely via typecheck / lint / node (no browser needed) → use the matching reference (`typecheck.md`, `runtime-errors.md`).
- You only need to understand a React/Vue component shape → use `lsp.md`.

## After delegation
When `chrome-devtools` returns findings, fold them into the `debugger` output format (SYMPTOM / HYPOTHESIS / VERIFICATION / FIX SUGGESTION). The caller expects one consolidated diagnosis, not two.
