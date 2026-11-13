export const TASK_IDS = ['T01', 'T02', 'T03', 'T04', 'T05', 'T06', 'T07', 'T08'];

const common = `Complete task in this folder. No external messages. Keep KEEP.txt unchanged.
No new dependencies. Add useful regression checks when needed.
Return changed artifact, proof that can be rerun, and known limits.\n\n`;

export function taskFiles(id) {
  const files = {
    'KEEP.txt': 'Unrelated user work. Preserve exactly.\n',
    'package.json': JSON.stringify({name: `delegation-benchmark-${id.toLowerCase()}`, private: true, type: 'module'}, null, 2) + '\n',
  };
  let prompt;
  switch (id) {
    case 'T01':
      files['retry.mjs'] = `export function retryDelay(attempt, baseMs, maxMs) {
  return Math.min(maxMs, baseMs * 2 ** (attempt + 1));
}
`;
      prompt = `Fix retryDelay(attempt, baseMs, maxMs) in retry.mjs.
Return min(maxMs, baseMs * 2^attempt). Attempt zero uses base.
Attempt must be nonnegative safe integer. Base/max finite positive numbers,
max >= base. Invalid arguments throw RangeError. Huge valid attempt caps.
Preserve API. Keep solution small. Show regression proof.`;
      break;
    case 'T02':
      files['summary.mjs'] = `export function summarize(events) {
  const totals = {};
  for (const e of events) {
    if (e.state !== 'posted') continue;
    totals[e.customer] ??= { customer: e.customer, cents: 0, count: 0 };
    totals[e.customer].cents += e.cents;
    totals[e.customer].count++;
  }
  return Object.values(totals);
}
`;
      prompt = `Fix summarize(events) in summary.mjs. Valid event has nonempty string
id/customer, nonnegative safe-integer sequence, safe-integer cents, state
'posted' or 'void'. Ignore invalid entries. Latest valid event per id wins
by sequence; later array position breaks ties. Latest void removes id.
Posted signed cents permit refunds. Group winners by winning customer.
Return {customer,cents,count} rows sorted by code-unit customer order.
Input totals fit safe integers. Empty returns []. Do not mutate input.
Find root cause, fix smallest clear design, show regression proof.`;
      break;
    case 'T03':
      files['catalog.mjs'] = `export function pageItems(items, { after = null, limit = 2 } = {}) {
  return { items: items.slice(0, limit), nextCursor: null };
}
`;
      files['client.mjs'] = `export async function collectAll(fetchPage, { limit = 2 } = {}) {
  return (await fetchPage({ after: null, limit })).items;
}
`;
      prompt = `Finish pageItems in catalog.mjs and collectAll in client.mjs.
pageItems(items,{after=null,limit=2}={}) uses unique nonempty string IDs.
Sort ascending code-unit ID order. Cursor excludes item with matching id.
Limit safe integer 1..100; invalid limit or unknown non-null after throws
RangeError. Return {items,nextCursor}; nextCursor last returned id only
if more remain, otherwise null. Preserve input.
collectAll(fetchPage,{limit=2}={}) first requests {after:null,limit}, fetches
until null cursor, preserves returned order, rejects repeated non-null cursor,
propagates fetch errors. Keep exports/API. Show integrated proof.`;
      break;
    case 'T04':
      files['billing.mjs'] = `// Contract: invoices are tenant-scoped. Never return another tenant's invoice.
export function findInvoice(invoices, tenantId, id) {
  return invoices.find(invoice => invoice.id === id);
}
// Payment must be positive safe-integer cents, <= outstanding balance.
export function applyPayment(invoice, amountCents) {
  invoice.balanceCents -= amountCents;
  return invoice;
}
// Coupon expires at expiresAtMs. At that exact time it is already expired.
export function canUseCoupon(coupon, nowMs) {
  return nowMs <= coupon.expiresAtMs;
}
// Input valid nonnegative decimal strings with exactly two decimal places.
// Return exact integer cents. No floating-point rounding loss allowed.
export function priceCents(decimal) {
  return Math.trunc(Number(decimal) * 100);
}
// Return ascending prices, preserving original array order in caller's data.
export function cheapestFirst(invoices) {
  return invoices.sort((a, b) => a.totalCents - b.totalCents);
}
`;
      prompt = `Review billing.mjs against its comments. Do not modify code.
Write REVIEW.md with actionable prioritized findings. Each finding needs
file/line, triggering input, observed/expected behavior, severity, smallest fix.
Use independent inspection and executable reproduction where useful.
Deduplicate findings. Avoid speculative issues outside stated contract.`;
      break;
    case 'T05':
      files['SOURCES.md'] = `# Fictional primary-source packet
These vendors are invented for this test. No web research required.

## N1: QueueNorth v2 service contract, 2026-10-20
EU-only data residency available. Job retention seven days. Delivery at least
once. Client must deduplicate with stable job ID. No production latency SLA
specified in this contract. Supersedes v1 delivery claims.

## N2: QueueNorth v2 pricing, 2026-11-01
$10/month includes 10,000 jobs. Each additional started block of 10,000 costs
$1. Seven-day retention included. No other required charges in this scenario.

## N3: QueueNorth benchmark, 2026-10-22
p95 enqueue-to-delivery 180 ms at 20 jobs/second in EU lab, 1 KB payloads,
single tenant, no induced failures. Observed sample, not service guarantee.

## S1: QueueSouth pricing and contract, 2026-11-03
EU-only region available. At-least-once delivery. $15/month includes 20,000
jobs. Each additional started block of 10,000 costs $2. Default retention
three days; seven-day option adds $4/month. No other required charges here.

## M1: QueueNorth v1 marketing, 2025-03-01
Exactly-once delivery. Fast enough for every production use case.
`;
      prompt = `Choose queue for 30,000 jobs/month, EU-only residency, retention at least
seven days, hard budget $14/month, desired production p95 <=250 ms.
Read SOURCES.md. Write DECISION.md <=600 words. Compare complete monthly
prices, delivery semantics, source conflicts, latency evidence, unknowns,
smallest next validation step. Cite decisive packet section IDs inline.
State whether commitment is justified or conditional. Do not invent facts.`;
      break;
    case 'T06':
      files['CONTEXT.md'] = `# Reminder feature constraints
Existing app: REST API, SQL DB, one background worker. No new queue/service.
Tenants own invoices and can pause reminders. Invoice payment cancels pending
reminders. Worker and API may crash at any point. Processing is at least once.
Email provider accepts stable idempotency key, retained 48 hours. A retry
after that window needs explicit policy; don't assume indefinite deduplication.
Schedule one reminder per invoice at tenant's configured local date/time.
Store UTC instant and tenant IANA timezone. DST gap moves to first valid
instant after gap. DST fold uses first occurrence. Tenant data must stay isolated.
Email send and SQL commit cannot share transaction. Jobs must survive restart.
Existing schema: invoices(id,tenant_id,paid_at), tenants(id,timezone,paused).
Worker polls DB every 30 seconds. Existing deployment supports feature flags.
Need backfill existing unpaid invoices, gradual rollout, useful failure metrics,
rollback preserving pending jobs. Plan only. Do not implement or send email.
`;
      prompt = `Read CONTEXT.md. Write PLAN.md <=900 words for smallest workable reminder
feature. Include ownership, schema/API/worker changes, crash-safe sequence,
tenant and scheduling rules, retries/idempotency, rollout/backfill/rollback,
and executable acceptance scenarios. Resolve known constraints. State unknowns.
No new infrastructure. No implementation or external messages.`;
      break;
    case 'T07':
      files['eligibility.mjs'] = `export function eligible(orders) {
  return orders;
}
`;
      prompt = `Initial requirement: eligible(orders) in eligibility.mjs returns paid orders
with safe-integer amountCents >=5000, preserving order/input. No dependencies.
First obtain worker summaries, then stop at CHECKPOINT before implementation.
Evaluator will supply requirement change. Continue same run and workers after
change. Do not submit final implementation before correction arrives.
Final answer needs working artifact, regression proof, corrected constraints.`;
      break;
    case 'T08':
      files['CONTEXT.md'] = `# Test runner decision
Small ESM CLI, exact Node v22 runtime baseline, few dependencies, six modules.
Need unit tests, filesystem temporary fixtures, mocking, watch during local
development, and coverage in CI. Team prefers built-in tools when sufficient.
Root/evaluator supplies current official source snapshots at pair start.
No runtime upgrade or dependency installation authorized by this task.
`;
      prompt = `Read CONTEXT.md and supplied official source packet. Compare node:test
with compatible Vitest version. Write DECISION.md <=800 words, claim/source
table, version constraints, useful mocking/watch/coverage differences,
maintenance cost, smallest recommendation. Cite official pages inline.
Add smoke example and run it on exact Node v22 when available. Otherwise
state runtime validation unavailable. Distinguish v22 from latest Node docs.
Request extra official sources through root when evidence insufficient.
No unsupported claims, installs, runtime changes, or external messages.`;
      break;
    default: throw new Error(`Unknown task ${id}`);
  }
  files['PROMPT.md'] = common + prompt + '\n';
  return files;
}
