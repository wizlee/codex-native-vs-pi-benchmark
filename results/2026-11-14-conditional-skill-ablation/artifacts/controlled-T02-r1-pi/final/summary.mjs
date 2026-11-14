export function summarize(events) {
  const totals = {};
  for (const e of events) {
    if (e.state !== 'posted') continue;
    totals[e.customer] ??= { customer: e.customer, cents: 0, count: 0 };
    totals[e.customer].cents += e.cents;
    totals[e.customer].count++;
  }
  return Object.values(totals);
}
