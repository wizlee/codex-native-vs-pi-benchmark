# Run fair paired trials

Question: Which setup delivers acceptable work with less model usage, elapsed time, and human effort for your tasks?

Two main arms:

| Arm | Parent | Delegates |
|---|---|---|
| native | Codex | Native Codex subagents |
| pi | Same Codex configuration | Pi workers through current MCP bridge |

Parent plans, delegates, verifies, integrates, and answers in both arms. Count parent's work. Add optional Codex-only arm later to discover whether delegation helps at all. Do not mix that arm into two-arm analysis script.

## Separate two comparisons

1. **Controlled comparison.** Match root model and reasoning, worker model/provider and reasoning, task files, portable skills, root tools, worker tool permissions, limits, handoff content, and worker count. Use two read-only workers. Root performs edits and runs commands in both arms. Each worker receives same self-contained task packet. Native workers receive no conversation fork when interface supports that choice. Unavoidable host instructions stay recorded.
2. **Usual setup comparison.** Keep normal model defaults, extensions, context inheritance, and delegation strategy. Permit up to two concurrent workers and four total worker sessions. Preserve each backend's normal permissions. Allow normal native forks and explicit Pi handoffs. This measures whole setup. Differences cannot be attributed solely to delegation mechanism.

Run controlled comparison first. Analyze profiles separately. If model, tool, or skill parity cannot be established, label result `configuration-confounded`. Keep result visible. Do not call it controlled.

Controlled workers receive same logical packet and equivalent read access. Backend-required tool syntax can differ. Native readers may use read-only shell commands; Pi readers use native read/grep/find/ls. Root alone edits and executes candidate code/tests. Load actual skill files; do not manually transcribe skill bodies. Root follows common two-worker plan from PROMPTS.md. Record root integrations, worker startup, repeated reading, and handoff sizes.

Do not silently override model/thinking defaults. Configure matched values only through explicit run instructions and supported controls. If same model unavailable, compare usual setups or report unsupported controlled cell.

## Choose workload

| Stage | Tasks | Repetitions per task and arm | Total runs |
|---|---|---:|---:|
| Telemetry calibration | One harmless prompt per backend | One | 2, excluded from task scores |
| Pilot | T02 debugging, T05 evidence synthesis | 2 | 8 |
| Main | T01 through T08 | 5 | 80 |

Calibration must establish root and descendant usage coverage. Keep calibration cost and one-time setup time separately. Do not perform calibration calls until ready to execute benchmark.

Pilot checks task clarity, telemetry, timing, and rubric. Freeze revised protocol before main run. Exclude pilot from main estimates. Do not tune prompts after seeing main results. Version changes start new batch.

Eight task types expose different failure modes. Tiny T01 measures overhead. T04 and T05 allow independent readers. T03 and T07 expose integration and handoff problems. T08 tests live source work. Add 10 to 20 real task instances after pilot if these workloads matter regularly. For strong general claims, use many distinct tasks across projects and plan sample size using pilot variance and smallest useful improvement.

## Freeze run conditions

Record following in batch manifest before runs:

- Task weights. Default equal. Alternative weights reflect your actual task mix and stay fixed.
- Exact task prompt, starter hash or commit, public tests, evaluator checks, and file scope.
- Codex client and version, root model/provider, worker models/providers, reasoning, agent roles, and service tier when visible.
- OS, runtime, hardware, network access, dependency lockfile, and MCP/extension inventories.
- Every applicable AGENTS.md and selected skill version/hash. Caveman mode in both arms.
- Read/write permissions, Pi project trust, approval policy, worker caps, timeout, and repair policy.
- Cache policy and billing mode. Fresh conversations are required; server-side cache coldness is not guaranteed.
- Random seed, task IDs, repeats, reviewer identities, and acceptance thresholds.

Keep environment constant within each pair. Interleave randomized native-first and Pi-first pairs from schedule. Run one arm at a time. Do not run paired arms simultaneously and create resource contention. If testing high-throughput usage later, make it separate experiment.

Preinstall same dependencies. Separate discovery, auth, trust setup, and dependency setup from steady-state task runs. Record first-use setup time and friction separately. Task-time worker startup and permission waits count in task elapsed time.

For T08, root downloads same current official pages at pair start, timestamps and hashes snapshots, then supplies identical packet to both arms. Both can request extra official sources through root. Record fetch count and useful evidence gained. Also run optional fully live version separately. It measures real browsing experience with greater environmental variance.

Do not wipe shared caches or change standalone Pi settings to force parity. Record observed cache use. Use balanced order and fresh sessions.

## Execute each run

1. Prepare fresh folder using `prepare`. Preserve starting snapshot. Never use previous arm's modified folder.
2. Put only public fixture and prompt in agent workspace. Hold reviewer checks elsewhere. If agents can read checks, label run `open-book` and do not claim held-out validation.
3. Open fresh root chat. Apply common prompt plus exactly one backend wrapper. Native wrapper explicitly overrides Pi-default policy only for that benchmark run.
4. Start monotonic stopwatch when root receives prompt. Record UTC start for audit. Root uses two read-only workers in controlled profile, including T01. This deliberately measures delegation overhead. Usual setup may use fewer workers.
5. Keep root work and all workers in same run ID. Capture parent, descendants, follow-ups, retries, tool calls, timestamps, and approval waits. Root must poll Pi status while worker active so approval forms reach human.
6. Save first submission before evaluator feedback. Stop delivery segment. Score first-pass acceptance. Human inspects anonymized artifact, runs independent checks, and verifies citations.
7. If first submission fails, permit one repair prompt with failing requirement and reproducible symptom. Same feedback rule for both arms. No solution code, hidden expected values, or extra worker/model budget. Save repair and all additional usage under same run.
8. Stop at accepted artifact or time limit. Save final files, full diff, final answer, evidence, test logs, and usage manifest. Record timeout, blocked, error, and cancellation as outcomes.
9. Record review and intervention time. Fill result record. Independent reviewer checks score before backend identity is revealed.

Default limits: 20 minutes through first submission, one repair with 5 extra minutes, up to 10 minutes active human review total. Wall cap 35 minutes including evaluation. Earlier failures remain failures unless fixed within limits. Predeclare a token cap only if both backends expose enforceable accounting. Otherwise record observed usage and overshoot; do not claim hard token cap.

If service fails before model work, log incident and run according to frozen outage policy. Default keeps failed scheduled trial. Optional replacement gets new ID and sensitivity analysis; never erase original.

After worker crashes, times out, or is cancelled, reconcile partial files. Follow current bridge rule requiring user direction before rerun. This experiment does not authorize automatic restarts or fallback. Native failure in native arm and Pi failure in Pi arm remain attributed to assigned arm.

## Score artifacts blind

Replace backend/session names with random artifact IDs. Keep answer text and code intact apart from identifying metadata. Reviewer sees task, artifact, tests, and source packet. Hide tokens, time, cost, and backend until quality scoring complete. Operator may know arm; reviewer should be different person when practical.

Two reviewers score independently. Reconcile any dimension differing by more than one point or disagreement about acceptance. With one reviewer, repeat a random 20% later, blind. Record limitation. Optional model judge is secondary and its usage belongs to evaluation overhead. Never let worker grade its own output as ground truth.

| Dimension | Weight | Score 0 | Score 2 | Score 4 |
|---|---:|---|---|---|
| Outcome correctness/completeness | 40 | Unusable or materially wrong | Partial outcome, substantial repair | All requirements met, independent checks pass |
| Human verifiability | 20 | Unsupported claims, no usable proof | Some tests or references; reviewer reconstructs key steps | Reproducible commands, concrete expected behavior, accurate paths/citations |
| Simplicity/maintainability | 15 | Unnecessary design causes failures or review burden | Works with avoidable layers/dependencies | Smallest clear design satisfying constraints; useful tests; no unrelated churn |
| Research/evidence | 15 | Fabricated, stale, or contradicted evidence | Relevant sources with important gaps | Necessary repo/docs evidence, authoritative support, conflicts resolved, unknowns stated |
| Instructions/scope | 10 | Major scope or permission breach | Missed constraints | All constraints and file boundaries followed |

Use 1 and 3 between anchors. Half points allowed after reviewer reconciliation. Shorter answer, fewer lines, more sources, or more tests earn no automatic points. Judge whether each adds value. Code tasks need relevant repository evidence; web research not mandatory unless task requires it.

Weighted quality = sum of dimension weight multiplied by score / 4.

Accept only when status is `completed`, all mandatory checks pass, quality >=80, correctness >=3, verification >=3, instructions >=3, and no critical defect. Critical includes data corruption, invented decisive evidence, or unauthorized side effects. A missing citation can fail research task even when answer sounds plausible.

Blocked/error/timeout runs remain rejected. Score saved partial artifact if available; use zero scores when no artifact exists. Preserve separate first-pass and final acceptance. Repairs improve final result while increasing usage and time.

Review task also measures precision and recall against seeded defects. Deduplicate repeated findings. Reviewer adjudicates novel valid findings. Measure false alarms; five speculative issues must not beat three proven issues.

## Analyze before choosing

Primary metric: final accepted outcomes / all scheduled runs. Also report first-pass rate and quality dimensions separately.

Cost metrics: all-run tokens and estimated dollars / accepted outcomes. Failures and repairs stay in numerator. If no acceptance, show undefined. Missing telemetry makes total cost unknown, never zero. Subscription quota and API-equivalent dollar estimate are separate measures.

Time metrics: elapsed through acceptance or stop; first delivery; active review; active interventions; worker startup and permission waiting. Compare latency on pairs where both succeed as well as all trials. Fast failure is not task completion.

Report paired per-task differences. Bootstrap task IDs, carrying all repetitions and both arms together. Script provides exploratory 95% intervals for quality and acceptance differences. Repeats on same task are not independent new tasks. Eight tasks provide weak evidence about broader workload. Do not infer universal superiority or make claims from single best run.

Predeclared practical rule for candidate setup:

- Acceptance lower confidence bound no worse than baseline by 5 percentage points.
- Quality lower confidence bound no worse by 3 points out of 100.
- At least 15% lower tokens per accepted outcome or 15% lower successful-pair latency, with uncertainty assessed before concluding.
- No unresolved critical permission/scope defect. Human review effort does not materially worsen. Predeclare acceptable change using pilot.

These are example decision thresholds, not measured findings. Adjust before main run. If intervals remain too broad, report inconclusive and collect more distinct tasks. Prefer task-specific routing when strengths differ. Keep cost and quality separate instead of hiding tradeoffs in one score.

## Current local facts and sources

Model-free discovery on 2026-11-12 reported Pi provider `openai-codex`, model `gpt-6.1-sol`, thinking `high`. Installed Codex CLI reported `0.166.0`. CLI version does not establish desktop/native-worker version or model. Record those during actual run.

Local bridge package `0.1.0` exposes read-only workers with `read`, `grep`, `find`, and `ls`, excluding MCP tools. Root must run tests and web requests for controlled workers in both arms. Bridge status identifies session file but does not itself provide complete cost accounting. Extensions have their normal OS permissions; read-only tool mode does not establish OS sandbox parity. Local integration guide at `<CODEX_HOME>/pi-bridge/README.md`, especially skill handoff, configuration, permissions, and failure handling.

OpenAI Docs describes context isolation, coordination costs, and caution around concurrent edits. This motivates reader-heavy and integration tasks. [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).

Official evaluation guidance supports task-specific criteria, held-out examples, human calibration, and controls for position and verbosity bias. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices).

Official API accounting distinguishes cached input, output, and reasoning subsets, and includes root/delegate/retry work. These semantics guide normalized ledger. They do not prove this desktop/Pi setup exposes identical telemetry. Calibrate installed log formats first. [Observability and usage](https://developers.openai.com/api/docs/guides/agents-api/observability).
