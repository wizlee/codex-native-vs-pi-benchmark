# Native versus Pi pilot results

Observed result for these current configurations: native used 25.8% fewer processed tokens, 25.4% less agent work time per accepted artifact, and 15.3% lower standard API-equivalent cost, including allowed repairs. This is a small pilot, not a universal backend verdict.

Eight fresh Codex root chats. Two task types, two repetitions, both arms. No root was forked from previous trial. Sequential execution in frozen balanced order.

Scope: task-controlled/default-configuration pilot, not pure backend causal test. Actual session logs: roots gpt-6.1-sol/low; native readers low; Pi readers high. Both readers can read actual source/skill files. Native may use read-only shell; Pi uses read/grep/find/ls. No manually recopied skill bodies. Host instructions/tool definitions differ.

Metadata correction: Earlier report incorrectly labelled roots/native workers xhigh based on pre-run diagnostics. All eight fair-read session logs show low roots, low native workers, high Pi workers. Time, tokens, cost, correctness and rankings unchanged.

Quality scores below come from fresh-session AI review with arm labels withheld, using same configured model family as solvers. No independent human review or human time-to-acceptance measured. Success means functional/evidence checks plus provisional AI rubric pass. Final 100/100 ratings are a scoring ceiling, not proof of quality equivalence. Objective first-pass defects are more informative here.

| Measure | Native | Pi |
|---|---:|---:|
| Provisional successes | 4/4 | 4/4 |
| First-pass contract success | 4/4 | 2/4 |
| Fully completed delegation workflow | 4/4 | 2/4 |
| Repair rounds | 0 | 2 |
| Mean first-pass AI quality /100 | 100.0 | 91.9 |
| Mean AI quality /100 | 100.0 | 100.0 |
| Mean submission time | 2m 32s | 3m 23s |
| Mean first submission time | 2m 32s | 2m 57s |
| Total submission time | 10m 07s | 13m 34s |
| Total processed tokens | 2,179,913 | 2,938,823 |
| Tokens per provisional success | 544,978 | 734,706 |
| Total uncached input | 204,189 | 234,572 |
| Total cached input | 1,947,776 | 2,673,664 |
| Total output including reasoning | 27,948 | 30,587 |
| Standard API-equivalent total | $0.883 | $1.042 |

API-equivalent estimates use standard short-context rates from [official model page](https://developers.openai.com/api/docs/models/gpt-6.1-sol), retrieved 2026-11-13: $2/M uncached input, $0.10/M cached input, $10/M output. Actual subscription charges and quota attribution unknown. Every observed request stayed below 272K input tokens.

Root and worker usage, retries, skill-loading calls, source materialization, and final packaging are included. Calibration, study orchestration, independent checks, and AI judging are separate study overhead, excluded from arm submission metrics.

Independent blinded review found integer-cancellation precision loss in both Pi T02 outputs. Example cents `[9007199254740991, 2, -9007199254740991]` have exact final total 2; both initially returned 1. Every amount and final mathematical total fit safe integers. Native outputs returned 2 initially. This independent edge review extended the predeclared checker, which all eight originally passed. One root-only repair per failed submission was allowed; both repairs passed. Initial scores and outputs retained.

Both Pi T02 handoffs assigned execution-dependent diagnose workflow to read-only readers; all four readers reported incompatibility. Native readers provided reviews. This is a skill-scoping/configuration problem in tested handoffs, not proof of intrinsic Pi model weakness. No blocked worker was retried and no backend fallback occurred.

Submission times sum actual initial and repair work segments. Study/evaluator queue delays and AI judging are excluded, not claimed as zero human review time. Repairs occurred after batch review; observed cache behavior includes that timing.

## Every scheduled trial

| Task | Repeat | Arm | Final agent time | Final processed tokens | API equivalent | First pass | Repairs | Final contract pass |
|---|---:|---|---:|---:|---:|---|---:|---|
| T02 | 1 | pi | 3m 45s | 902,460 | $0.288 | fail | 1 | pass |
| T02 | 1 | native | 2m 21s | 458,697 | $0.186 | pass | 0 | pass |
| T05 | 1 | pi | 3m 31s | 682,061 | $0.253 | pass | 0 | pass |
| T05 | 1 | native | 2m 07s | 600,838 | $0.242 | pass | 0 | pass |
| T02 | 2 | native | 2m 52s | 533,693 | $0.211 | pass | 0 | pass |
| T02 | 2 | pi | 3m 03s | 657,991 | $0.268 | fail | 1 | pass |
| T05 | 2 | native | 2m 47s | 586,685 | $0.245 | pass | 0 | pass |
| T05 | 2 | pi | 3m 15s | 696,311 | $0.234 | pass | 0 | pass |

## Interpretation limits

- T02 tests small stateful debugging; T05 tests frozen-document evidence synthesis. Live web research, multi-file features, architecture, long context, recovery, and write-capable workers remain untested.
- Two task types and two repetitions are too small for broad superiority or quality-equivalence claims. Conditional bootstrap intervals in comparison.json do not establish non-inferiority, especially when scores or success differences have no observed variation.
- Server cache coldness and model-service latency cannot be forced. Both were handled with fresh chats, balanced order, and recorded cache counts.
- Read isolation was enforced by instructions and separate folders, not a proved OS-level prohibition on reading evaluator files. No evaluator or prior outputs were supplied to solvers.
- Different worker reasoning levels and host tool definitions limit backend attribution. Treat results as these default configurations, not universal native-versus-Pi performance. Earlier no-shell diagnostic runs are separate and excluded.
- AI quality and verifiability ratings are provisional. Human review time and final human acceptance are unknown.
- Actual worker reasoning was low for native versus high for Pi. Roots selected different additional skills; backend causality cannot be isolated.

## Reproduce public evidence

`node scripts/check-precision.mjs results/2026-11-13-fair-read-pilot --public --first-pass` reproduces both original Pi precision failures and both native passes.

`node scripts/check-precision.mjs results/2026-11-13-fair-read-pilot --public` verifies all four final implementations.

`node scripts/benchmark.mjs analyze results/2026-11-13-fair-read-pilot/schedule.json results/2026-11-13-fair-read-pilot/results.jsonl results/2026-11-13-fair-read-pilot/rates.json` reproduces resource arithmetic. Published call/agent IDs are anonymized; local original lineage retained privately.

Public evidence includes anonymized exclusive-call ledgers, primary synthetic artifacts, first/final scores, checks, and failure reproductions. Full local lineage and supplementary orchestration proof remain private in ignored runs/. Raw session logs are not published. The live collection helper can rebuild owner-local reports from those selected private exports.
