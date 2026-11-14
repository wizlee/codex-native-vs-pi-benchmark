# Pi orchestration and skill-loading fixes

Deployed meaningful status waits, multi-worker controller waits, conditional native-skill loading, and recovered-error handling. Final live workers made **zero injected-skill rereads**, with qualified instructions on **all 12 recorded logical payloads**. This is not an overall performance-win claim: one quota-interrupted final trial lost worker delivery and failed.

## What changed

- Invisible RPC stream deltas no longer wake status waits. A requested 1,000 ms synthetic wait changed from about 42 ms to 1,008 ms; completion and pending human input still woke in about 32 ms.
- `pi_wait` waits for any selected worker to settle or need human input, forwards dialogs through the existing native adapter, and returns compact results. Parent guidance prefers bounded waits over sleep/status loops.
- The worker-only `before_provider_request` extension matches a complete native skill body against the actual request's skill catalog. It replaces the unconditional read instruction entirely. Ordinary skill-loading requests are already satisfied by that native body. Supporting files and tasks requiring current-file inspection or refresh retain normal gated reads.
- The parent tool contract explains that Pi natively activates the first selected skill. It discourages contradictory handoff requests to reload it.
- A successful Pi-managed retry clears an earlier provisional assistant error. Fatal bridge errors remain terminal. No retry or transport setting was changed.
- Optional request-shape telemetry records structural metadata, hashes, and a qualification boolean. It records no credentials, headers, raw prompts, assistant bodies, or hidden reasoning. Published summaries omit request and session-key hashes.

No read tool is blocked or replaced. The first skill still uses Pi's native activation gate; additional skills use complete bounded gated reads. Bare names, paths, summaries, quotes, inventory entries, and truncated blocks do not establish loading. There is no persistent path-only loaded flag. Other provider payload shapes pass through unchanged.

Standalone Pi, project trust, required-skill checks, read-only tool restrictions, write gate, human approval adapter, and fallback policy remain intact. Caveman preference stays active. No failed worker was rerun and no backend fallback occurred. Native comparison arms were explicitly approved.

## Final matched cohort

Four fresh roots, two tasks, one repetition per task and arm. Two fresh read-only workers per root. Actual logs verify gpt-6.1-sol/low roots and gpt-6.1-sol/high workers, with matching role skills. All 14 recorded runtime fingerprints stayed unchanged across the final cohort.

| Measure | Native | Pi |
|---|---:|---:|
| Provisionally accepted workflows | 2/2 | 1/2 |
| Recorded root responses | 24 | 25 |
| Recorded worker responses | 12 | 12 |
| Root processed tokens | 842,414 | 987,808 |
| Worker processed tokens | 323,719 | 86,494 |
| Worker uncached input | 54,940 | 42,055 |
| Worker cached-input share | 82.8% | 48.5% |
| Worker API equivalent | $0.180902 | $0.136935 |
| All solver-turn elapsed segments | 353.161 s | 395.548 s |
| Full API-equivalent total | $0.453616 | $0.495250 |
| API equivalent per accepted workflow | $0.226808 | $0.495250 |

The Pi T02 root hit an automatic approval-review usage-limit failure while waiting for existing workers. The user resumed the same root. MCP then returned `UNKNOWN_WORKER`; the root correctly stopped with `RUN_BLOCKED`, without rerunning workers or implementing from incomplete delivered reviews. Both saved worker reviews completed, but saved output is not a delivered workflow.

Recorded work includes 131.766 s before interruption and 67.288 s after resume. Capacity gap was 32,048 s; wall-clock submission span was 32,248 s. That gap is disclosed separately, not disguised as zero latency. Worker IDs are process-local and completed workers expire after 30 minutes; retained evidence cannot distinguish reaping from a bridge-process restart.

This asymmetric interruption prevents a clean backend latency or reliability attribution. Keeping the failed trial makes Pi's observed accepted-workflow cost 2.18 times native in this cohort. It would be misleading to discard it and report lower total tokens as a win. The blocked artifact retained the seeded broken implementation; its low quality score is not evidence that Pi attempted a bad repair.

The uninterrupted T05 pair cost $0.227147 Pi versus $0.229440 native, with 196.494 s versus 195.825 s of solver-turn elapsed time. Both received provisional AI quality 100. One near-parity pair cannot establish superiority.

See the [complete final cohort](../2026-11-14-conditional-skill-ablation/RESULTS.md), anonymized exclusive-call ledgers, first/final artifacts, configuration checks, worker-state audits, request summaries, and interruption manifest. Human acceptance and review time remain unknown. Prices are frozen standard API equivalents, not subscription bills.

## Cache percentage was not the objective

| Pi cohort, four workers each | Controller only | Content-only hook | Final conditional rule |
|---|---:|---:|---:|
| Worker responses | 27 | 26 | 12 |
| Injected-skill rereads | 4 | 4 | 0 |
| Worker input tokens | 201,882 | 204,792 | 81,607 |
| Cached input | 166,144 | 159,104 | 39,552 |
| Uncached input | 35,738 | 45,688 | 42,055 |
| Output tokens | 4,162 | 4,787 | 4,887 |
| Cached share | 82.3% | 77.7% | 48.5% |
| Worker API equivalent | $0.129710 | $0.155156 | $0.136935 |

Against the content-only cohort, the final rule used 53.8% fewer worker responses and about 58.7% fewer worker processed tokens. Worker API equivalent fell 11.7%, while cached share fell sharply. Most removed input was cheap cached input. Against controller-only workers, final worker cost was higher, illustrating warmness and sampling uncertainty. These are descriptive cross-cohort differences, not isolated causal savings estimates.

Historical matched-worker input also shows the denominator issue:

| Arm and request position | Input | Cached | Uncached | Cached share |
|---|---:|---:|---:|---:|
| Native first requests | 190,497 | 144,384 | 46,113 | 75.8% |
| Pi first requests | 35,281 | 0 | 35,281 | 0.0% |
| Native later requests | 536,738 | 501,632 | 35,106 | 93.5% |
| Pi later requests | 563,192 | 456,960 | 106,232 | 81.1% |

"First" does not mean controlled cold cache. Native began with much larger shared context and already cached input. Historical Pi workers used fewer uncached tokens per recorded response overall, about 1,747 versus 3,008, but took 81 responses versus 27. That arithmetic explains why cached percentage alone is inadequate; it does not isolate server routing.

Request traces showed stable instructions, schemas, tool order, and cache key within workers. Paired workers shared first-request instructions and schemas while keeping distinct session keys. No schema churn was observed. Current [OpenAI caching guidance](https://developers.openai.com/api/docs/guides/prompt-caching) says newer models handle routing automatically; this does not establish the Codex endpoint's private cache placement, eviction, or billing behavior.

No shared conversation history, shared worker identity, synthetic warming calls, or extra boilerplate was introduced. Logical payload hooks cannot expose every possible internal wire retry.

## Caveman decision

| Option | Assessment |
|---|---|
| Disable caveman behavior in workers | Would change the always-caveman preference. Not adopted. |
| Make only the Pi-caveman extension injection interactive | Could trim a redundant block while retaining style through the required skill and global rule. Not tested or changed. It would not fix generic duplicate skill loading or parent polling. |
| Append an idempotence policy | Tested; both workers still reread the injected body. Insufficient. |
| Conditional loading from actual native body and catalog evidence | Adopted. Preserves style and gates; zero injected-skill rereads in the final four workers. |
| Invocation-specific skills and short reply contract | Useful role scoping held equal in both arms. Complements conditional loading. |

## Every candidate remains visible

Seventeen new solver trials were observed across six separate phases. Seven planned trials were never started after candidates were falsified. Historical baseline artifacts remain unchanged; cohorts are not pooled.

| Phase | Observed/planned | Outcome |
|---|---:|---|
| [Controller waits](../2026-11-14-controller-wait-ablation/RESULTS.md) | 4/4 | All final workflows accepted; one repair per arm. One pre-worker quota pause disclosed. |
| [Prompt-only skill policy](../2026-11-14-worker-skills-ablation/RESULTS.md) | 2/4 | Rereads persisted. A Pi-managed recovery exposed stale-error reporting; full usage coverage conservative. |
| [Content-only context hook](../2026-11-14-corrected-skill-ablation/RESULTS.md) | 4/4 | All contracts passed; four rereads persisted. |
| [Structured-context hook](../2026-11-14-final-skill-ablation/RESULTS.md) | 2/4 | Renderer replay passed, but live provider flag stayed false. Remaining tasks never started. |
| [Provider hook with weak wording](../2026-11-14-provider-skill-ablation/RESULTS.md) | 1/4 | Wire qualification worked, but original unconditional read sentence remained and rereads persisted. |
| [Conditional provider rule](../2026-11-14-conditional-skill-ablation/RESULTS.md) | 4/4 | Zero rereads on all 12 payloads; one interrupted root lost worker delivery. |

The first implementation test missed Pi's structured message representation. A later renderer test still missed the actual runtime boundary. The final fix is tested through the installed extension runner and live payload observer. The weak provider wording also retained the very unconditional sentence it intended to qualify; the final rule removes that contradiction.

The separate controller cohort cost $0.461479 Pi versus $0.448874 native, with 377.758 s versus 321.365 s of solver-turn elapsed segments. All four final artifacts were provisionally accepted after one root-only precision repair per arm. Its quota gap was 11,717 s, explicitly retained in the manifest. The older historical pilot had a larger gap, but repetitions, repairs, service conditions, and interruptions prevent a causal before/after savings claim.

Fresh blinded AI review assessed all 13 unique artifact bodies from the later five phases, including failed observations. Seven implemented APIs passed independent checks; four decisions met their contracts; two APIs failed. The earlier controller review assessed six bodies, including initial precision failures and repairs. Review labels, timings, costs, and phase order were withheld. AI ratings are provisional, not human acceptance or a quality-equivalence proof.

## Verification and remaining limit

- 39 bridge protocol/regression checks pass, including native-dialog adapter tests using synthetic decisions, denial handling, timeout/cancellation, multi-worker waits, provisional-error recovery, native-body evidence, compaction absence, and payload preservation.
- 33 benchmark/telemetry checks pass, including failed-wait export, incomplete-cost propagation, frozen schedules, blind-review coverage, and workflow failure accounting.
- Installed-Pi discovery verifies standalone configuration preservation. Previous real human approval verification from 2026-11-12 remains in force; no new human decision is fabricated.
- Actual installed extension-runner replay verifies raw-payload forwarding, untouched input/tools/session key, and observer ordering. See [provider replay](provider-hook-conditional-replay.json).
- [Recovery before](recovery-before.json) and [after](recovery-after.json) preserve fatal errors while clearing successfully recovered provisional errors.

The observed operational limit is durable result delivery across long quota pauses or process loss. This change does not add persistent terminal receipts or revive expired workers. Such receipts could be separate future work without automatic reruns; the failed trial is not retrospectively relabeled successful.

Source patches preserve each candidate: [prompt-only](bridge.patch), [content-only](bridge-corrected.patch), [structured-context](bridge-final.patch), [weak provider rule](bridge-provider.patch), and [deployed conditional rule](bridge-conditional.patch). No generated npm bundle was edited.

## Reproduce without model calls

```powershell
node --test scripts/*.test.mjs
node scripts/benchmark.mjs analyze results/2026-11-14-conditional-skill-ablation/schedule.json results/2026-11-14-conditional-skill-ablation/results.jsonl results/2026-11-14-conditional-skill-ablation/rates.json
node scripts/check-precision.mjs results/2026-11-14-conditional-skill-ablation --public
node scripts/analyze-orchestration.mjs --summarize results/2026-11-14-conditional-skill-ablation/orchestration.json
```

Only privacy-safe evidence is published. Raw sessions, local session identifiers, credentials, private absolute paths, and unrelated integration files remain excluded. Study preparation, coordinator work, diagnosis, and judging are separate overhead, excluded from arm metrics rather than claimed free. All recorded arm-root/worker usage, skill loads, waits, setup, failed work, and allowed repairs remain included.

