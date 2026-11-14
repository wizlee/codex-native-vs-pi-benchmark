export function summarize(events) {
  const winners = new Map();
  for (const event of events) {
    if (event === null || typeof event !== 'object' ||
        typeof event.id !== 'string' || event.id.length === 0 ||
        typeof event.customer !== 'string' || event.customer.length === 0 ||
        !Number.isSafeInteger(event.sequence) || event.sequence < 0 ||
        !Number.isSafeInteger(event.cents) ||
        (event.state !== 'posted' && event.state !== 'void')) continue;

    const previous = winners.get(event.id);
    if (!previous || event.sequence >= previous.sequence) {
      winners.set(event.id, event);
    }
  }

  const totals = new Map();
  for (const event of winners.values()) {
    if (event.state === 'void') continue;
    if (!totals.has(event.customer)) {
      totals.set(event.customer, { customer: event.customer, cents: 0n, count: 0 });
    }
    const row = totals.get(event.customer);
    // Final totals are safe integers; intermediate signed sums may not be.
    row.cents += BigInt(event.cents);
    row.count++;
  }
  return [...totals.values()]
    .sort((a, b) => a.customer < b.customer ? -1 : a.customer > b.customer ? 1 : 0)
    .map(row => ({ ...row, cents: Number(row.cents) }));
}
