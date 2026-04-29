# Handling subagent status

Every subagent returns one of four statuses. Handle each precisely — never silently ignore a non-DONE status, and never retry the same dispatch unchanged.

## DONE

Step is complete, self-review clean.

1. Verify the report against reality:
   - Did it stay within RELEVANT FILES? If it edited others, is the reason justified in NOTES? If not, re-dispatch with tighter constraints.
   - Did it actually apply the listed GUIDELINE SKILLS? If a skill rule was ignored, re-dispatch with "Must follow <skill> — specifically <rule>".
   - Any forbidden action (commit, push, PR)? → escalate to user immediately.
2. If all checks pass, mark the step `completed` and move on.

## DONE_WITH_CONCERNS

Step is implemented but the subagent flagged doubts.

- **Correctness or scope concern** (e.g. "I'm not sure this handles the null case", "I had to edit a file outside RELEVANT FILES") → address before moving on: re-dispatch with targeted feedback, or escalate to the user if the concern points at a plan gap.
- **Observation** (e.g. "this file is getting large", "this pattern feels brittle") → note it, don't block. Proceed.

## NEEDS_CONTEXT

The subagent needed information that wasn't in its prompt.

1. Figure out what's missing (the report tells you).
2. Gather it: read an additional file, pull from the plan's APPROACH, fetch from explorer context, or ask the user.
3. Re-dispatch the **same step with the same model** (Claude) or just re-dispatch (OpenCode), adding the missing context. Do not change the STEP text; change the surrounding context.

## BLOCKED

The subagent cannot complete the step. Assess the nature:

- **Context gap** ("I don't have enough info about X") → provide context and re-dispatch.
- **Reasoning gap** (step requires architectural judgment the subagent didn't make) → re-dispatch with a more capable model (on platforms that support model selection), or break the step into smaller pieces.
- **Step too large** (subagent reads file after file without progress) → split into 2–3 tighter steps, dispatch each, update your todo.
- **Plan is wrong** (subagent surfaces a contradiction or missing dependency) → STOP. Escalate to the user. The plan needs revision.

**Never** ignore a BLOCKED or NEEDS_CONTEXT and mark the step `completed`. **Never** retry with the same prompt and same model — something has to change (context, model, or step size).

## Escalation budget

If the same step hits a non-DONE status twice after adjustments, STOP and escalate to the user. Two failed dispatches signals that the step framing or the plan itself is the problem.
