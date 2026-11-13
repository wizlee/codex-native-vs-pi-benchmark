export function summarize(events) {
  const latest = new Map();
  for (const e of events) {
    if (e === null || typeof e !== 'object' ||
        typeof e.id !== 'string' || e.id.length === 0 ||
        typeof e.customer !== 'string' || e.customer.length === 0 ||
        !Number.isSafeInteger(e.sequence) || e.sequence < 0 ||
        !Number.isSafeInteger(e.cents) ||
        (e.state !== 'posted' && e.state !== 'void')) continue;
    const previous = latest.get(e.id);
    if (!previous || e.sequence >= previous.sequence) latest.set(e.id, e);
  }

  const totals = new Map();
  for (const e of latest.values()) {
    if (e.state === 'void') continue;
    if (!totals.has(e.customer)) {
      totals.set(e.customer, { customer: e.customer, cents: 0n, count: 0 });
    }
    const total = totals.get(e.customer);
    total.cents += BigInt(e.cents);
    total.count++;
  }
  // Intermediate sums can exceed safe Number precision before refunds cancel.
  return [...totals.values()].map(row => ({ ...row, cents: Number(row.cents) })).sort((a, b) =>
    a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : 0);
}
