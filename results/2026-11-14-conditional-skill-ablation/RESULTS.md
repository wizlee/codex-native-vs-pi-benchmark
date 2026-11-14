# Native versus Pi pilot results

Observed result for these current configurations: native used 8.5% more processed tokens, 55.4% less agent work time per accepted artifact, and 8.4% lower standard API-equivalent cost, including allowed repairs. This is a small pilot, not a universal backend verdict.

4 fresh Codex root chats. 2 task types, 1 repetitions per task and arm. No root was forked from previous trial. Sequential execution in frozen balanced order.

Scope: matched worker model, reasoning and role-scoped skills. Actual session logs: roots gpt-6.1-sol/low; native readers high; Pi readers high. Both readers can read actual source/skill files. Native may use read-only shell; Pi uses read/grep/find/ls. No manually recopied skill bodies. Host instructions/tool definitions still differ, so this is not a fully isolated backend causal test.

Quality scores below come from fresh-session AI review with arm labels withheld, using same configured model family as solvers. No independent human review or human time-to-acceptance measured. Success means functional/evidence checks plus provisional AI rubric pass. Final 100/100 ratings are a scoring ceiling, not proof of quality equivalence. Objective first-pass defects are more informative here.

| Measure | Native | Pi |
|---|---:|---:|
| Provisional successes | 2/2 | 1/2 |
| First-pass contract success | 2/2 | 1/2 |
| Fully completed delegation workflow | 2/2 | 1/2 |
| Repair rounds | 0 | 0 |
| Mean first-pass AI quality /100 | 100.0 | 65.9 |
| Mean AI quality /100 | 100.0 | 65.9 |
| Mean agent work to final submission | 2m 57s | 3m 18s |
| Mean agent work to first submission | 2m 57s | 3m 18s |
| Total agent work | 5m 53s | 6m 36s |
| Total processed tokens | 1,166,133 | 1,074,302 |
| Parent/root processed tokens | 842,414 | 987,808 |
| Worker processed tokens | 323,719 | 86,494 |
| Tokens per provisional success | 583,067 | 1,074,302 |
| Observed uncached input | 102,401 | 132,096 |
| Observed cached input | 1,049,344 | 928,384 |
| Observed output including reasoning | 14,388 | 13,822 |
| Standard API-equivalent total | $0.454 | $0.495 |

Recorded model calls: native 36, comprising 24 root and 12 worker calls; Pi 37, comprising 25 root and 12 worker calls. Counts include setup, skill loading, waits, implementation, and any repairs. They describe observed workflows rather than isolate backend causality.

API-equivalent estimates use standard short-context rates from [official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol), retrieved 2026-11-13: $2/M uncached input, $0.10/M cached input, $10/M output. Actual subscription charges and quota attribution unknown. Every observed request stayed below 272K input tokens.

Root and worker usage, retries, skill-loading calls, source materialization, and final packaging are included. Calibration, study orchestration, independent checks, and AI judging are separate study overhead, excluded from arm submission metrics.

Precision cancellation was predeclared before this batch: [MAX_SAFE_INTEGER, 2, -MAX_SAFE_INTEGER] must total 2. All inputs and final mathematical total are safe integers. Combined contract review rejected 1 initial artifacts; 0 repair rounds were used. First-pass evidence is retained.

Both backends had identical role-scoped reviewer skills. Diagnosis/reproduction/execution stayed with roots. Worker-state audits found 1 incomplete delegation workflows. Runtime configuration was checked against the manifest from actual logs before advancing each trial.

Submission times sum actual initial and repair work segments. Study/evaluator queue delays and AI judging are excluded, not claimed as zero human review time. No solver repairs occurred in this batch.

## Every scheduled trial

| Task | Repeat | Arm | Final agent time | Final processed tokens | API equivalent | First pass | Repairs | Final contract pass |
|---|---:|---|---:|---:|---:|---|---:|---|
| T02 | 1 | pi | 3m 19s | 601,707 | $0.268 | fail | 0 | fail |
| T02 | 1 | native | 2m 37s | 494,202 | $0.224 | pass | 0 | pass |
| T05 | 1 | native | 3m 16s | 671,931 | $0.229 | pass | 0 | pass |
| T05 | 1 | pi | 3m 16s | 472,595 | $0.227 | pass | 0 | pass |

Recorded interruption in controlled-T02-r1-pi: 131.766 s failed work and 67.288 s resumed work are included. Capacity gap 32048 s is outside agent-work metrics. Wall-clock submission span 32248 s includes that gap. User resumed the same root; no failed worker was rerun. This service interruption and changed warmness limit paired latency interpretation.

## Interpretation limits

- T02 tests small stateful debugging; T05 tests frozen-document evidence synthesis. Live web research, multi-file features, architecture, long context, recovery, and write-capable workers remain untested.
- 2 task types and 1 repetitions are too small for broad superiority or quality-equivalence claims. Conditional bootstrap intervals in comparison.json do not establish non-inferiority, especially when scores or success differences have no observed variation.
- Server cache coldness and model-service latency cannot be forced. Both were handled with fresh chats, balanced order, and recorded cache counts.
- Read isolation was enforced by instructions and separate folders, not a proved OS-level prohibition on reading evaluator files. No evaluator or prior outputs were supplied to solvers.
- Model/effort and role skills are matched; host instructions, tool definitions, read mechanisms and service scheduling still differ. Prior studies are separate and excluded.
- AI quality and verifiability ratings are provisional. Human review time and final human acceptance are unknown.
- Actual worker reasoning was high for native versus high for Pi. Reviewer skill names were fixed equally; root-only execution skills were not delegated. Attribute differences only within the declared experiment scope.

## Reproduce public evidence

`node scripts/check-precision.mjs results/2026-11-14-conditional-skill-ablation --public --first-pass` reproduces first-pass precision results.

`node scripts/check-precision.mjs results/2026-11-14-conditional-skill-ablation --public` verifies final implementations.

`node scripts/benchmark.mjs analyze results/2026-11-14-conditional-skill-ablation/schedule.json results/2026-11-14-conditional-skill-ablation/results.jsonl results/2026-11-14-conditional-skill-ablation/rates.json` reproduces resource arithmetic. Published call/agent IDs are anonymized; local original lineage retained privately.

Public evidence includes anonymized exclusive-call ledgers, primary synthetic artifacts, first/final scores, checks, and failure reproductions. Full local lineage and supplementary orchestration proof remain private in ignored runs/. Raw session logs are not published. The live collection helper can rebuild owner-local reports from those selected private exports.
