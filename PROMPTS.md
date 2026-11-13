# Prompts for benchmark runs

Replace placeholders before run. Supply common prompt, one backend wrapper, then task's generated PROMPT.md. Do not give agents reviewer files or opposite arm's outputs.

## Common prompt

```text
Execute benchmark run {RUN_ID} in {ABSOLUTE_TRIAL_DIRECTORY}.
Task specification follows. Complete its requested artifact.
Use caveman style. Preserve existing unrelated files. No external messages.
Follow current permissions, project trust, and required skill gates.
Return artifact, changed files, reproducible checks, remaining limits.
Do not claim a check ran unless it ran. State unknowns.

Profile: controlled.
Use exactly two read-only workers. No worker descendants.
Worker 1: inspect implementation/evidence; propose smallest complete solution.
Worker 2: independently inspect requirements, edge cases, and verification gaps.
Start both before implementation. Root alone edits and runs commands.
Workers cannot use shell, web, MCP, or write tools. Root can retrieve needed
evidence and provide same relevant packet to workers.
Give both workers complete task text, file scope, constraints, source packet,
and expected reply shape. Forward corrections to both before final integration.
Workers reply with findings, evidence paths, proposed change, verification gaps.
Use same named portable skills from approved batch manifest. Load required
skills through each host's supported workflow. Report unavailable skill/tool.
Do not silently omit required skill or substitute delegation backend.
Use batch model/reasoning configuration. Report actual resolved models.
Limits: 20 minutes initial work. Evaluator may allow one repair, <=5 minutes.
Keep all repairs in same run. Stop on deadline and report partial artifact.
T07 requires checkpoint before final implementation; follow its prompt.
```

For usual setup profile, replace two-worker block with:

```text
Profile: usual.
Use normal delegation strategy for assigned backend. At most two concurrent
workers and four worker sessions total. No worker descendants.
Keep configured model/thinking defaults. Use normal context and extensions.
Respect existing checkout write coordination. Report delegates, handoffs,
tools/skills used, and any compatibility limits.
```

## Native wrapper

```text
For this benchmark run only, I explicitly override Pi-default delegation policy.
Use Codex native subagents. Do not delegate through Pi.
For controlled profile, start fresh workers without conversation inheritance
when supported. Pass same explicit self-contained task packet.
Record unavoidable inheritance or tool/model differences.
This scoped instruction does not change user-wide policy or configuration.
```

## Pi wrapper

```text
Use Pi MCP workers for delegation. Do not use native subagents for this run.
Discover resources using absolute trial directory; poll status.
Provide selected portable skill names and absolute skillPaths when needed.
Root retains integration and final verification. Keep workers read-only in
controlled profile. Poll while active so human receives native approval forms.
Do not answer approval dialogs, change trust/write gates, auto-retry failed
workers, or fall back to native delegation. Record blocked work faithfully.
```

## Repair prompt

```text
Same run {RUN_ID}. First submission failed following requirement/check:
{REQUIREMENT_AND_REPRODUCIBLE_SYMPTOM}
One repair allowed. Preserve scope, backend, model, worker budget, and rules.
Return corrected artifact and verification within five minutes.
```

## Reviewer prompt

```text
Evaluate artifact {BLIND_ID} against supplied task and frozen rubric.
Do not infer backend from writing style. Do not use length as quality proxy.
Run held-out functional checks where supplied. Verify decisive claims against
actual cited sources. Record must-pass results and critical defects first.
Score correctness, verification, simplicity, research, instructions from 0 to 4.
For each score, cite concrete artifact evidence. Time active review.
Decide first-pass/final acceptance using protocol, not personal preference.
If comparing pair, judge A/B then reverse presentation order as bias check.
```
