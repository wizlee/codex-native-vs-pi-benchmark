export function summarize(events) {
  const winners = new Map();
  for (const e of events) {
    if (e === null || typeof e !== 'object' ||
        typeof e.id !== 'string' || e.id.length === 0 ||
        typeof e.customer !== 'string' || e.customer.length === 0 ||
        !Number.isSafeInteger(e.sequence) || e.sequence < 0 ||
        !Number.isSafeInteger(e.cents) ||
        (e.state !== 'posted' && e.state !== 'void')) continue;
    const previous = winners.get(e.id);
    if (!previous || e.sequence >= previous.sequence) winners.set(e.id, e);
  }

  const totals = new Map();
  for (const e of winners.values()) {
    if (e.state !== 'posted') continue;
    let row = totals.get(e.customer);
    if (!row) {
      row = { customer: e.customer, cents: 0n, count: 0 };
      totals.set(e.customer, row);
    }
    row.cents += BigInt(e.cents);
    row.count++;
  }
  return [...totals.values()]
    .map(({ customer, cents, count }) => ({ customer, cents: Number(cents), count }))
    .sort((a, b) => a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : 0);
}
