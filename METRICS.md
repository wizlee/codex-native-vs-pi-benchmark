# Record usage, time, and outcomes

One JSON object per scheduled run in `results.jsonl`. Schema example in `record.example.json` is synthetic, not measured performance. Preserve all scheduled records, including failures. Analyzer requires schedule manifest and refuses missing, duplicate, or mismatched runs.

```powershell
node scripts/benchmark.mjs analyze pilot-schedule.json results.jsonl rates.json --out comparison.json
```

## Quality and acceptance

`scores` contains reconciled human scores from 0 to 4. Keep reviewer notes outside score object. `mandatory_pass` includes functional checks and task-specific human requirements, not just script exit code. `critical_defect` forces rejection.

`first_pass_accepted` is judged before feedback. Final acceptance derived from protocol. Both rates use all scheduled runs. A repair does not create new statistical trial. `repair_rounds` is 0 or 1.

Record `status`: completed, timeout, blocked, error, or cancelled. Finished but wrong answer is `completed` with failed mandatory checks. Unsupported controlled configuration stays rejected/blocked in primary assigned-arm report; explain reason. Analyze compatible subset only as labeled sensitivity result.

## Token ledger

Record every root/delegate model call, retries, and follow-ups. Include child descendants if allowed in later protocol. Include summarization/compaction calls when attributable. Count instructions, schema, conversation forks, file reads, and tool output through measured model input, not manual word counts. Root re-reading worker summary costs input tokens again; that repeated processing is real usage.

Each `usage` entry is **exclusive per-call usage**, never session/tree aggregate. Fields:

| Field | Meaning |
|---|---|
| event_id | Unique namespaced source event/call ID |
| agent_id | Root or specific worker session ID |
| role | root or worker |
| model | Exact provider/model key matching rate table |
| source | Trace filename/event pointer, no credentials |
| scope | Must be `exclusive_call` |
| input_tokens | All input, including cached reads and cache writes |
| cached_input_tokens | Input subset read from cache; null if unknown |
| cache_write_tokens | Separate input subset written to cache; null if unknown |
| output_tokens | All output, including reasoning |
| reasoning_tokens | Output subset; null if unavailable |

Normalized processed tokens = input_tokens + output_tokens. Do not add cached or reasoning subsets again. Do not count cache reads as free. Preserve raw source counters alongside normalized ledger for audit.

Across different models, token counts can use different tokenizers and pricing. Raw tokens are not standardized compute or dollars. Matched configuration addresses this; usual-setup comparison also needs model-specific rates and actual quota evidence.

Some providers include cache reads inside input; others expose separate buckets. Convert only after checking installed schema semantics. Pi sampled local assistant-event schema exposes `input`, `output`, `cacheRead`, `cacheWrite`, `totalTokens`, and `cost`. Key names alone do not establish subset semantics. Verify against installed provider implementation and session totals during calibration. If disjoint, canonical input = input + cacheRead + cacheWrite. If inclusive, use input unchanged. Do not guess from field names.

Native session traces may show cumulative counters, per-turn counters, or parent totals including children. Check scope first. For cumulative counter, take final minus initial counter within exact run, account for resets, and do not also sum snapshots. For exclusive per-call events, sum once. Never combine parent tree total with descendants. If native interface only exposes aggregate all-agent total, preserve aggregate in raw evidence; current analyzer requires normalized exclusive calls. Extend adapter transparently or mark canonical usage incomplete. Do not fabricate call attribution.

Pi `pi_status` is not billing meter. Preserve `sessionFile` for every worker and follow-up. Record root Codex session too. Terminal/output text lengths cannot substitute for usage. Do not recursively scan unrelated user session history; select exact run IDs/files.

Before main run, calibration:

1. Save initial root counter, launch one tiny worker, request one follow-up, stop.
2. Collect raw root and worker usage sources. Establish whether root includes descendants and whether snapshots cumulative.
3. Normalize independently, reconcile against available provider/client totals, and check cache/reasoning treatment. Explain discrepancies.
4. Save parser version and source schema example with sensitive content removed.
5. If coverage unavailable, report observed lower bound and `usage_complete:false`. Time/quality comparison can continue; total-token claim cannot.

`expected_agent_ids` lists every agent that made model calls. `usage_complete:true` attests ledger covers every call, not merely every agent. Analyzer checks agent coverage and duplicate event IDs, but cannot prove exporter captured missing calls. Model-free blocked run uses empty list/ledger and `zero_model_calls:true` only when verified. Never use zero for unknown usage.

Source logs must not be edited. Hash exports, save extraction method, review worker count against delegation trace, and cross-check totals. This kit validates normalized records; it intentionally does not assume one undocumented log parser fits both clients.

## Dollars and quota

Set rates from actual provider contract and model version at run date. `rates.example.json` uses null values deliberately. No current prices assumed.

For known nonoverlapping cache buckets:

```text
model estimate = sum over calls:
  ((input - cached_read - cache_write) * uncached_input_rate
   + cached_read * cached_input_rate
   + cache_write * cache_write_rate
   + output * output_rate) / 1,000,000
task estimate = model estimate + other_cost_usd
```

Unknown relevant rate, bucket, call, or tool cost makes estimate unknown. Set explicit zero for verified absence of third-party charges. Preserve actual invoice charges separately when available. API-equivalent estimate is not money paid under subscription. Record subscription quota/credit change separately when exposed, along with reset window; absence is unknown.

Tokens per accepted outcome = sum tokens for **all** arm trials / count accepted trials. Same rule for dollar estimates and cumulative elapsed seconds per acceptance. No acceptances means undefined. Do not report successful-run-only average as total cost of achieving outcome.

## Timing

Use monotonic stopwatch for durations; UTC timestamps for audit. Unit seconds.

- `elapsed_s`: root receives initial prompt through human accepts final artifact, or run stops at failure/cap. Includes worker startup, model/tool wait, permission waits, initial review, repair, and final review. Record review scheduling delays separately if present.
- `delivery_s`: sum initial and repair work segments from prompt receipt through submission. Excludes evaluator review segments. Captures agent-side turnaround with task-time approvals.
- `review_s`: active human verification across initial/final artifacts. Pause timer for interruptions. Human must reach reproducible verdict within review allowance.
- `intervention_s`: active approvals, clarification, and operational recovery help. Excludes review. Usually overlaps delivery elapsed; do not add again to elapsed.

Review and delivery segments sequential in this protocol. Their sum cannot exceed elapsed beyond timing rounding. `human_s = review_s + intervention_s` measures labor, not extra wall time. Keep first-delivery timestamp and segment log as evidence.

If human effort was not measured, set `human_effort_measured: false`. Numeric review/intervention placeholders then do not count as measured zero: aggregate human labor and review time remain `null`. Published AI-reviewed pilots use this flag and report agent submission time separately from human acceptance.

Parallel workers' runtimes overlap. Do not sum them to estimate task wall time. Sum their tokens/costs. Optional detailed counters go under `diagnostics`.

## Additional diagnostics

Record when useful: worker startup seconds; permission wait seconds; root/worker token split; handoff bytes and measured tokens; duplicate exploration; missed constraints; unsupported decisive claims; source audit pass rate; review precision/recall; files changed; dependency additions; unrelated diff; repair rounds; worker/tool failures; merge conflicts; peak concurrency; skill load failures; context truncation; and permission outcomes.

Keep output size and diff size descriptive. Neither proves simplicity. Link every important defect to artifact or trace evidence. One-time installation/auth/trust effort belongs to setup report, separate from steady-state trial totals.
