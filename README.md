# Compare Codex native subagents with Pi subagents

Use paired trials. Same task, same starting files, same acceptance checks. Change delegation backend. Measure completed outcomes, all model usage, elapsed time, and human effort.

Kit prepared 2026-11-12. No model benchmark runs performed. No winner measured.

Start with 8-run pilot. Expand only after prompts, scoring, and telemetry work.

```powershell
node --test scripts/benchmark.test.mjs
node scripts/benchmark.mjs prepare T02 .\trial-T02
node scripts/check.mjs T02 .\trial-T02
```

Last command intentionally fails against starter code. Follow generated `PROMPT.md` in fresh Codex chat. Use matching backend wrapper from [PROMPTS.md](PROMPTS.md). Keep this kit and reviewer files outside tested agent's readable workspace when using held-out checks.

[PROTOCOL.md](PROTOCOL.md) defines experiment. [TASKS.md](TASKS.md) defines eight tasks. [METRICS.md](METRICS.md) defines records and accounting. Analysis command:

```powershell
node scripts/benchmark.mjs analyze pilot-schedule.json pilot-results.jsonl --out comparison.json
```

Included `pilot-results.jsonl` starts with eight pending templates. Fill one outcome per scheduled run using [record.example.json](record.example.json). Pending templates cannot produce benchmark findings. Copy [batch.example.json](batch.example.json) to freeze actual configuration. Optional rates file goes after results filename. Without verified rates, dollar estimates stay unknown. Kit scripts use no external packages and make no model/provider calls. Actual benchmark chats consume normal model usage. Node 22+.

Prepared pilot/main schedules already included. Reuse them or choose new output filenames. Scripts refuse to overwrite output files or existing trial folders. Generate another schedule/record set when needed:

```powershell
node scripts/benchmark.mjs schedule pilot 43 usual --out usual-pilot-schedule.json
node scripts/benchmark.mjs records usual-pilot-schedule.json --out usual-pilot-results.jsonl
```

Use [REPORT_TEMPLATE.md](REPORT_TEMPLATE.md) to report strengths and weaknesses after runs.

Included scripts prepare independent starter folders, randomize paired schedules, check functional cases, validate records, calculate weighted quality, and summarize paired differences with task-cluster bootstrap intervals. Human still runs chats, captures telemetry, and scores artifacts.

Fixtures are small synthetic examples. After pilot, replace or supplement them with held-out tasks from your real projects. More repetitions on same fixture measure repeatability, not breadth.
