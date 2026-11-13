# Task and reviewer contracts

Generated `PROMPT.md` is public task. This file includes reviewer criteria. Keep it away from tested agents for held-out evaluation. Cases are synthetic; no claim they represent your whole workload.

| ID | Workload | Expected artifact | Functional checker |
|---|---|---|---|
| T01 | Tiny bug, delegation overhead | Fixed retry function and proof | Yes |
| T02 | Debugging stateful aggregation | Fixed summary function and regression proof | Yes |
| T03 | Feature spanning two modules | Pagination plus complete client | Yes |
| T04 | Parallel code review | Prioritized, reproducible findings | Human, seeded oracle below |
| T05 | Evidence synthesis | Decision grounded in conflicting packet | Human, known facts below |
| T06 | Architecture and delivery plan | Small migration/rollout plan | Human checklist below |
| T07 | Follow-up and context fidelity | Corrected eligibility function | Yes, final requirement |
| T08 | Live technical research | Node test runner comparison and runnable proof | Human, current sources |

Starter behavior is deliberately incomplete. Evaluator checks test behavior, not implementation shape. Add real held-out examples after pilot. Do not expose exact assertions through repair feedback.

## T01

`retryDelay(attempt, baseMs, maxMs)` returns `min(maxMs, baseMs * 2^attempt)`. Attempt zero uses base. Attempt must be nonnegative safe integer. Base and max must be finite positive numbers, max >= base. Invalid arguments throw RangeError. Huge valid attempt caps instead of overflowing. No dependencies, no API change.

Must pass zero attempt, cap, invalid values, and huge attempt. Reviewer verifies fix stays small and final answer cites actual check.

## T02

Input events carry `id`, `customer`, `sequence`, `cents`, `state`. Valid event has nonempty string ID/customer, nonnegative safe-integer sequence, safe-integer cents, and state `posted` or `void`. Ignore invalid entries. Latest valid event per ID wins by sequence; later array position breaks ties. Latest void removes ID entirely. Posted signed cents permit refunds.

Return `{customer, cents, count}` rows for remaining posted events. Group by winning event's customer. Sort customer by JavaScript code-unit string order. Do not mutate input. Inputs fit safe-integer totals. Empty input returns empty array.

Must pass invalid high-sequence event followed by valid earlier event, customer change, void, ties, negative amount, special IDs, deterministic order, and immutability. No requirement to browse web.

## T03

Implement `pageItems(items, {after = null, limit = 2} = {})`. IDs unique nonempty strings. Return ascending code-unit ID order, exclusive after cursor. Limit safe integer from 1 through 100. Invalid limit or unknown non-null cursor throws RangeError. Return `{items, nextCursor}`. Cursor is last returned ID only when more items remain, otherwise null. Preserve input.

Implement async `collectAll(fetchPage, {limit = 2} = {})`. First request `{after:null, limit}`. Fetch until cursor null; preserve returned order. Reject repeated non-null cursor instead of looping. Propagate fetch error. No framework/dependencies.

Must pass empty collection, exact page boundary, final cursor, bad limit, unknown cursor, input immutability, client traversal, and repeated cursor. Reviewer checks both exports and final integration, not just isolated functions.

## T04

Public billing contract appears in fixture. Review without modifying code. Every finding needs file/line, triggering input, observed/expected behavior, severity, and smallest fix. Prioritize actionable issues.

Five seeded issue families:

1. `findInvoice` ignores tenant. Same ID across tenants returns wrong tenant's invoice.
2. `applyPayment` accepts negative, non-integer, or excessive payment. Demonstrate one violation. Count validation family once.
3. `canUseCoupon` accepts exact expiry timestamp. Contract says expired at boundary.
4. `priceCents` uses floating conversion plus truncation. `"1.13"` becomes 112 cents. Contract requires 113. Invalid decimal handling can be another valid finding if demonstrated; adjudicate separately.
5. `cheapestFirst` sorts original array. Violates immutability contract.

Record distinct true positives, false positives, missed families, precision, and recall. Mandatory: prove tenant breach and payment validation issue, find at least four families, precision >=0.8, no invented critical allegation. Additional valid issues do not count as false positives.

## T05

Fictional vendor packet tests source handling without network variance. Specs are authored primary sources inside fixture, not real product claims.

Known facts:

- QueueNorth v2 supports EU residency and seven-day retention. Delivery at least once; consumer needs idempotency.
- North cost for 30,000 jobs = $10 + two $1 blocks = $12/month.
- QueueSouth cost with required seven-day retention = $15 + $2 overage + $4 retention option = $21/month. Fails $14 ceiling.
- North's measured p95 180 ms applies to 20 jobs/second lab test. No stated production latency SLA. Production p95 <=250 ms remains unproven.
- Old marketing says exactly once. Current v2 contract supersedes it.

Mandatory: prefer North provisionally, calculate both complete prices, explain at-least-once handling and stale conflict, cite decisive packet sections, distinguish measured latency from guarantee. State production latency remains unverified and propose load test before commitment. A claim that North definitively meets all constraints fails.

Sufficient research means all decisive requirements resolved or explicitly unknown. Extra sources alone do not raise score.

## T06

Planning task only. Existing app, SQL DB, one background worker. No new queue or service permitted. All requirements in fixture `CONTEXT.md`.

Mandatory plan covers:

- Small schema change plus compatible API/worker sequence. Ownership explicit.
- Durable enqueue tied to business transaction. Crash between DB commit and send considered.
- At-least-once processing, provider idempotency key, bounded retry, and failed-job visibility.
- Provider's 48-hour deduplication window. No claim that unchanged key prevents duplicates forever.
- Tenant isolation and pause/cancel checks near send.
- UTC storage, tenant timezone conversion, and specified daylight-saving fold/gap rules.
- Migration/backfill, feature flag rollout, observability, rollback preserving pending jobs.
- Concrete acceptance cases, including crash after provider accepts but before local acknowledgement.
- No new infrastructure; unknown provider behavior flagged rather than invented.

Reviewer must be able to turn plan into issues without inventing core design. More components earn no credit. <=900 words.

## T07

Initial task requires checkpoint after worker summaries and before final implementation. Operator then sends exact steering message below. Trigger based on work stage, not elapsed seconds.

```text
Requirement changed. Final eligible(orders) must return only paid sale orders
with safe-integer amountCents >=7500. Exactly 7500 qualifies. Exclude refunds
even if paid. Preserve original order and input. Do not log order payloads.
Forward this correction to both existing workers and obtain updated advice.
Continue same run and workers. Do not create replacement sessions.
```

In usual setup with one worker, follow up that worker. If none, record delegation absence and apply correction in root. Controlled profile requires two follow-ups. Pi cannot reuse failed/expired worker automatically; record blocked case and follow current user-direction rule.

Must pass corrected threshold and refund rule. Require trace evidence correction reached retained workers. Count missed/stale requirements, repeated context bytes, follow-up latency, and additional model usage.

## T08

Task compares Node built-in `node:test` with Vitest for small ESM CLI on exact runtime Node v22. New dependency only when benefit justifies it. Require official documentation, version-specific caveats, concise decision, runnable smoke example, and claim/source table.

At pair start evaluator/root freezes official Node v22 test-runner docs and official Vitest documentation relevant to version requirements and APIs. Both arms receive same packet. Root may fetch additional official pages on worker request. Save exact URLs, retrieval times, and hashes.

Mandatory: separate Node v22 API behavior from current Node mainline; verify candidate Vitest version supports v22 baseline; compare mocking/watch/coverage and maintenance cost with evidence; run example on actual installed matching runtime or explicitly report unavailable v22 validation. Do not pass runtime compatibility claim based only on source snippet or different installed major. Local kit development ran on different runtime, which does not validate this future task.

Reviewer audits every decisive claim and all cited links. Score unsupported claims and useful unique primary sources. A careful conditional recommendation can pass; no preselected winner.
