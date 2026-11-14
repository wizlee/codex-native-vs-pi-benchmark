# Native versus Pi pilot results

Observed result for these current configurations: native used 25.7% fewer processed tokens, 27.6% less agent work time per accepted artifact, and 28.9% lower standard API-equivalent cost, including allowed repairs. This is a small pilot, not a universal backend verdict.

Eight fresh Codex root chats. Two task types, two repetitions, both arms. No root was forked from previous trial. Sequential execution in frozen balanced order.

Scope: matched worker model, reasoning and role-scoped skills. Actual session logs: roots gpt-6.1-sol/low; native readers high; Pi readers high. Both readers can read actual source/skill files. Native may use read-only shell; Pi uses read/grep/find/ls. No manually recopied skill bodies. Host instructions/tool definitions still differ, so this is not a fully isolated backend causal test.

Quality scores below come from fresh-session AI review with arm labels withheld, using same configured model family as solvers. No independent human review or human time-to-acceptance measured. Success means functional/evidence checks plus provisional AI rubric pass. Final 100/100 ratings are a scoring ceiling, not proof of quality equivalence. Objective first-pass defects are more informative here.

| Measure | Native | Pi |
|---|---:|---:|
| Provisional successes | 4/4 | 4/4 |
| First-pass contract success | 4/4 | 4/4 |
| Fully completed delegation workflow | 4/4 | 4/4 |
| Repair rounds | 0 | 0 |
| Mean first-pass AI quality /100 | 100.0 | 100.0 |
| Mean AI quality /100 | 100.0 | 100.0 |
| Mean submission time | 2m 17s | 3m 09s |
| Mean first submission time | 2m 17s | 3m 09s |
| Total submission time | 9m 08s | 12m 37s |
| Total processed tokens | 2,160,622 | 2,907,701 |
| Parent/root processed tokens | 1,424,846 | 2,299,410 |
| Worker processed tokens | 735,776 | 608,291 |
| Tokens per provisional success | 540,156 | 726,925 |
| Total uncached input | 186,740 | 326,636 |
| Total cached input | 1,945,344 | 2,551,808 |
| Total output including reasoning | 28,538 | 29,257 |
| Standard API-equivalent total | $0.853 | $1.201 |

Recorded model calls: native 68, comprising 41 root and 27 worker calls; Pi 140, comprising 59 root and 81 worker calls. Pi workers used fewer processed tokens in this sample, but larger parent orchestration use outweighed that saving. This identifies where to investigate, not a proof of one causal mechanism.

The [follow-up trace investigation](ORCHESTRATION.md) locates the parent gap in repeated polling/sleep responses and explains the effects of early status wakeups, serial reads, duplicate skill loading, and compressed read recovery. No production optimization or new model trial was performed in that investigation.

Evaluation input note: initial inline delivery truncated one artifact for the reviewer. It explicitly marked the review incomplete. Final assessments read the complete frozen anonymous file. This was an evaluator transport issue, not a solver defect or repair; review overhead is excluded from both arms.

API-equivalent estimates use standard short-context rates from [official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol), retrieved 2026-11-13: $2/M uncached input, $0.10/M cached input, $10/M output. Actual subscription charges and quota attribution unknown. Every observed request stayed below 272K input tokens.

Root and worker usage, retries, skill-loading calls, source materialization, and final packaging are included. Calibration, study orchestration, independent checks, and AI judging are separate study overhead, excluded from arm submission metrics.

Precision cancellation was predeclared before this batch: [MAX_SAFE_INTEGER, 2, -MAX_SAFE_INTEGER] must total 2. All inputs and final mathematical total are safe integers. Combined contract review rejected 0 initial artifacts; 0 repair rounds were used. First-pass evidence is retained.

Both backends had identical role-scoped reviewer skills. Diagnosis/reproduction/execution stayed with roots. Roots reported 0 incomplete delegation workflows. Runtime configuration was checked against the manifest from actual logs before advancing each trial.

Submission times sum actual initial and repair work segments. Study/evaluator queue delays and AI judging are excluded, not claimed as zero human review time. No solver repairs occurred in this batch.

## Every scheduled trial

| Task | Repeat | Arm | Final agent time | Final processed tokens | API equivalent | First pass | Repairs | Final contract pass |
|---|---:|---|---:|---:|---:|---|---:|---|
| T02 | 1 | pi | 2m 52s | 613,838 | $0.287 | pass | 0 | pass |
| T02 | 1 | native | 2m 15s | 549,470 | $0.207 | pass | 0 | pass |
| T05 | 1 | pi | 2m 48s | 677,566 | $0.290 | pass | 0 | pass |
| T05 | 1 | native | 1m 55s | 495,036 | $0.198 | pass | 0 | pass |
| T02 | 2 | native | 2m 23s | 406,782 | $0.193 | pass | 0 | pass |
| T02 | 2 | pi | 3m 23s | 736,470 | $0.265 | pass | 0 | pass |
| T05 | 2 | native | 2m 34s | 709,334 | $0.255 | pass | 0 | pass |
| T05 | 2 | pi | 3m 34s | 879,827 | $0.359 | pass | 0 | pass |

## Interpretation limits

- T02 tests small stateful debugging; T05 tests frozen-document evidence synthesis. Live web research, multi-file features, architecture, long context, recovery, and write-capable workers remain untested.
- Two task types and two repetitions are too small for broad superiority or quality-equivalence claims. Conditional bootstrap intervals in comparison.json do not establish non-inferiority, especially when scores or success differences have no observed variation.
- Server cache coldness and model-service latency cannot be forced. Both were handled with fresh chats, balanced order, and recorded cache counts.
- Read isolation was enforced by instructions and separate folders, not a proved OS-level prohibition on reading evaluator files. No evaluator or prior outputs were supplied to solvers.
- Model/effort and role skills are matched; host instructions, tool definitions, read mechanisms and service scheduling still differ. Prior studies are separate and excluded.
- AI quality and verifiability ratings are provisional. Human review time and final human acceptance are unknown.
- Actual worker reasoning was high for native versus high for Pi. Reviewer skill names were fixed equally; root-only execution skills were not delegated. Changes versus prior study include both model matching and skill scoping, so before/after changes cannot be attributed to reasoning alone.

## Reproduce public evidence

`node scripts/check-precision.mjs results/2026-11-14-matched-workers-pilot --public --first-pass` reproduces first-pass precision results.

`node scripts/check-precision.mjs results/2026-11-14-matched-workers-pilot --public` verifies final implementations.

`node scripts/benchmark.mjs analyze results/2026-11-14-matched-workers-pilot/schedule.json results/2026-11-14-matched-workers-pilot/results.jsonl results/2026-11-14-matched-workers-pilot/rates.json` reproduces resource arithmetic. Published call/agent IDs are anonymized; local original lineage retained privately.

Public evidence includes anonymized exclusive-call ledgers, primary synthetic artifacts, first/final scores, checks, and failure reproductions. Full local lineage and supplementary orchestration proof remain private in ignored runs/. Raw session logs are not published. The live collection helper can rebuild owner-local reports from those selected private exports.
