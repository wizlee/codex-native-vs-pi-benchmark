Complete task in this folder. No external messages. Keep KEEP.txt unchanged.
No new dependencies. Add useful regression checks when needed.
Return changed artifact, proof that can be rerun, and known limits.

Fix summarize(events) in summary.mjs. Valid event has nonempty string
id/customer, nonnegative safe-integer sequence, safe-integer cents, state
'posted' or 'void'. Ignore invalid entries. Latest valid event per id wins
by sequence; later array position breaks ties. Latest void removes id.
Posted signed cents permit refunds. Group winners by winning customer.
Return {customer,cents,count} rows sorted by code-unit customer order.
Input totals fit safe integers. Empty returns []. Do not mutate input.
Find root cause, fix smallest clear design, show regression proof.
