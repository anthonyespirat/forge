# Dispatch loop details

## Parallel batching

Group steps into parallel batches before dispatching.

**Two steps share a batch iff both hold:**
- **Disjoint files.** Their RELEVANT FILES don't overlap. Treat directory specs (`src/foo/**`) as covering the whole subtree. If a step's file set is vague, it is its own batch.
- **No dependency.** Neither step's PRIOR-STEP OUTPUTS names the other; neither references a symbol/file the other creates, renames, or deletes; neither needs to observe the other's effect to make a decision.

Walk steps top-to-bottom. Open a new batch the moment the next step overlaps files with — or depends on — anyone already in the current batch. **When in doubt, sequentialize.** A wasted-parallel batch costs nothing; a conflicting one costs a re-dispatch and risks silent corruption.

## Per batch

1. `TodoWrite` → mark every step in the batch `in_progress`.
2. **In a single assistant message**, emit one dispatch per step. One message with N tool calls is the only way they run concurrently — separate messages serialize them.
3. Wait for **all** reports before reacting.
4. Handle each step's status independently. A BLOCKED step does **not** invalidate its batch-mates — mark successful siblings `completed`, then resolve the failed step before opening the next batch.
5. If any BLOCKED report reveals a plan-level error (contradiction, missing dependency), STOP before the next batch.

A batch of one degenerates to the sequential case.

## Mechanical steps — skip dispatch

If a STEP is fully specified with zero judgment calls, the controller MAY execute it directly instead of dispatching a subagent.

Indicators:
- Tagged `[mechanical]` in the plan.
- Entire content is a shell command, dependency install, or file-copy recipe.
- Zero branches / alternative outcomes; no files need reading beyond the single target.

When skipped, note it in the final report (`DIRECT EXECUTIONS:`). When unsure, dispatch.
