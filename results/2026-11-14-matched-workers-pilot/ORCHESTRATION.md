# Why Pi used more parent orchestration

The main cause in this pilot was the coordination path between Codex and the installed Pi bridge. Pi roots repeatedly returned to the model to poll or schedule sleep. Longer reader workflows kept that loop active. Larger accumulated context added a smaller second effect.

This investigation replays the same eight recorded trials. It does not run new model trials, change Pi, or claim that a proposed fix has already recovered the measured gap.

## Where the extra tokens went

| Root measure, all four trials per arm | Native | Pi |
|---|---:|---:|
| Model responses | 41 | 59 |
| Processed tokens | 1,424,846 | 2,299,410 |
| Input tokens, including cached input | 1,404,849 | 2,279,971 |
| Output tokens, including reasoning | 19,997 | 19,439 |
| Mean processed tokens per response | 34,752 | 38,973 |
| Coordination-only model responses | 5 | 25 |
| Tokens in coordination-only responses | 181,197 | 1,006,003 |
| All other responses, including mixed work/coordination | 36 | 34 |
| Tokens in all other responses | 1,243,649 | 1,293,407 |

The parent gap is 874,564 tokens. The coordination-only category differs by 824,806 tokens, 94.3% of that gap. Other categories net to 49,758 tokens. This is a descriptive accounting split, not a causal savings estimate. Mixed responses retain their full cost in the other category; they are not assigned fractional token costs.

Pi did not produce more parent output. Its extra 875,122 input tokens, offset by 558 fewer output tokens, explain the entire net parent difference. Initial root inputs were almost identical: mean 25,066 native versus 25,027 Pi.

The identity `total tokens = response count × mean tokens per response` also permits a symmetric decomposition. Averaging the two possible substitution orders assigns 663,529 tokens, 75.9%, to response count and 211,035, 24.1%, to mean response size. These are arithmetic contributions, not independently identified mechanisms. Extra late-stage polls also increase the average response size.

## Polling wakes on stream activity

The installed bridge has this control flow:

```text
Pi RPC record arrives
  -> onRecord updates any applicable state
  -> change(worker) emits "change" for every record
  -> pi_status waits once for "change" or timeout
  -> returns snapshot, even when still running with no visible text
```

In `pi-bridge/src/bridge.mjs`, `onRecord` ends with `this.change(worker)` at line 186. `status` subscribes once to the same event at lines 208–213. Streaming text/thinking deltas therefore wake the wait. Visible `worker.text` is updated only on completed assistant messages at lines 175–178. Many stream wakeups return no new review content.

Observed worker-status calls:

- 39 calls, each requesting `waitMs: 10000`.
- 31 returned an active worker. All 31 had empty visible text.
- 19 of those 31 returned in less than one second. Median active-call duration was 0.658 seconds.
- All observed status snapshots had zero pending dialogs.

These are individual MCP tool durations, not the duration of an enclosing JavaScript batch. Discovery status calls are excluded from these counts.

A no-model probe instantiated the installed Bridge class with synthetic workers. A stream delta after roughly 30 ms woke a requested 1,000 ms wait while the worker remained `running` with empty text. Separate completion and pending-dialog probes returned the expected states. No real worker, permission answer, or configuration change was involved. See [status-probe.json](status-probe.json).

Native traces contain eight completion activity events. Native roots used one `list_agents` response and four `wait_agent` responses across the batch. Pi has no equivalent automatic completion delivery in this bridge; its documented contract requires status polling, which also forwards real approval dialogs.

Pi's 25 coordination-only responses comprised:

| Action chosen by root model | Responses | Processed tokens |
|---|---:|---:|
| Status-only JavaScript batch | 16 | 639,619 |
| Explicit sleep | 9 | 366,384 |

Some batches polled both workers; 16 model responses do not mean 16 individual MCP calls. Nine further root responses mixed status with useful work and are excluded from this table. Sleep itself generates no model tokens. The model response that schedules it carries the current input context and contributes usage.

## Readers kept the loop active longer

| Reader measure, eight workers per arm | Native | Pi |
|---|---:|---:|
| Model responses | 27 | 81 |
| Shell batches / individual Pi tool calls | 17 batches | 73 calls |
| Mean worker session span | 31.2 s | 65.6 s |
| Mean first input | 23,812 tokens | 4,410 tokens |
| Total processed worker tokens | 735,776 | 608,291 |

Native shell batches could read multiple skills and source files in one model round. Every observed Pi tool-use response called exactly one tool: 68 reads, four directory listings, and one find. Eight final answers bring the Pi response count to 81. The installed OpenAI Codex provider sets `parallel_tool_calls: true`, so serial issuance was observed behavior, not a provider prohibition on multiple tool calls.

Pi reports 0.544 seconds of aggregate tool execution duration for those 73 calls. That field does not measure the complete network/model/startup path and may omit extension-hook work. File reads themselves were fast; many model round trips matter more than filesystem throughput. Worker spans include startup and overlap root work, so they cannot be added directly to root elapsed time.

Three avoidable read patterns appeared:

1. Caveman was already expanded into the initial Pi user message in all eight workers. All eight reread its file. That duplicated a skill load and consumed eight tool/model rounds.
2. Two unbounded `unslop/SKILL.md` reads were replaced by context-mode snippets. The snippets directed readers to `ctx_search`, while these workers exposed only `read/grep/find/ls`. Neither worker invoked the unavailable search tool or reported a tool error. Both recovered by rereading pages.
3. Paginated reads accumulated to 19 continuation reads across the Pi batch. The long readers took 15 and 19 model responses. The 19-response reader used 14 tool calls on skill files before reading task sources. Native readers took 2–5 responses.

The currently installed context-mode source exempts explicitly bounded reads from output replacement. This matches the traces: the two compressed reads had null offset/limit; other readers used explicit bounds. Its fallback branch also distinguishes recognized subagents with restricted tools. The observed snippet offered the normal `ctx_search` hint despite this bridge's restricted tool set. The traces establish that mismatch; they do not establish how much an extension change alone would save.

## Context growth multiplies round cost

Each additional model response references the accumulated prompt, tool definitions, history, and results. Cached prefixes can reuse computation and receive discounted pricing; they still appear in recorded input usage. This is why a tiny status reply can accompany a roughly 40K-token model response. See [official OpenAI prompt-caching documentation](https://developers.openai.com/api/docs/guides/prompt-caching).

Pi discovery returned 20 installed skills, including descriptions and paths, per trial. The four completed inventory snapshots totalled 29,592 characters. Including the initial discovery snapshots gives 31,948 characters. Worker status snapshots contributed another 40,125 characters, including repeated metadata. These are character counts, not token estimates. They establish payload growth, but do not isolate its exact token contribution from other history or tool definitions.

795,520 of the 875,122 extra root input tokens were cached. Thus the token gap is not equivalent to the same amount of extra uncached inference or dollars.

## Token savings and dollar savings differ

Using the study's frozen standard API rates:

| API-equivalent cost | Native | Pi | Pi minus native |
|---|---:|---:|---:|
| Roots | $0.541 | $0.774 | $0.233 |
| Workers | $0.312 | $0.427 | $0.114 |
| Total | $0.853 | $1.201 | $0.348 |

Pi workers used fewer tokens, yet higher API-equivalent dollars. Their observed cached share of input was 76.4%, versus native's 88.8%. Pi also emitted more worker output. The cause of the cache difference was not isolated. No routing, subscription billing, or quota claim follows from these estimates.

## What the evidence supports

The higher parent usage is strongly supported as a property of this bridge and workflow: frequent low-information returns to the root model, amplified by serial reader steps. It does not establish an inherent Pi model disadvantage.

The accounting-error hypothesis did not survive reconciliation: all eight root ledgers match source usage, and root/worker calls are exclusive. More implementation output did not explain the gap. No worker tool errors or observed pending approval dialogs explained it either. Permission handling still must be preserved in any optimization.

The next changes to test, one at a time:

1. Wake status waits on meaningful public state changes, completion, errors, or pending UI. Avoid waking the root for every stream delta. Verify dialogs still reach native human forms promptly.
2. Add a controller-side multi-worker wait that polls/forwards dialogs internally and returns compact completion or attention results. Keep routine scheduling out of model responses. Use bounded waits rather than model-generated sleep/status alternation.
3. Load selected skills once, use complete bounded reads, and request independent Pi reads in one tool-use response where supported. Make compression recovery hints agree with the actual exposed tools.
4. Return compact status deltas and only the requested discovery inventory. Preserve full diagnostic information outside the model context.

These are proposed optimizations, not validated production fixes. No bridge, standalone Pi, trust rule, approval gate, or global configuration was changed. A fresh paired ablation is still needed to quantify savings and check quality after each change. The existing two-task pilot cannot tell us whether the same pattern dominates larger workloads.

## Reproduce the investigation

Public arithmetic and parser tests need no model calls:

```powershell
node --test scripts/analyze-orchestration.test.mjs
node scripts/analyze-orchestration.mjs --summarize results/2026-11-14-matched-workers-pilot/orchestration.json
```

Owner-local replay and optional installed-bridge probe:

```powershell
node scripts/analyze-orchestration.mjs runs/2026-11-14-matched-workers-pilot runs/2026-11-14-matched-workers-pilot/orchestration.local.json
node scripts/probe-pi-status.mjs "$env:USERPROFILE/.codex/pi-bridge/src/bridge.mjs"
```

[orchestration.json](orchestration.json) contains anonymized per-response usage, categories, individual status durations, and worker read-step metadata. It omits raw prompts, source contents, local paths, original session IDs, and absolute timestamps. [source-inspection.json](source-inspection.json) fingerprints the installed source inspected for this explanation. Logs establish trial behavior; source fingerprints identify the current mechanism, not a fully pinned historical runtime image.
