# Choose QueueNorth conditionally

Choose QueueNorth v2 for validation. It meets budget, residency, and retention requirements. Production commitment remains conditional on latency validation and working client deduplication. Packet does not establish production p95 <=250 ms. [N1, N2, N3]

| Queue | Complete monthly price at 30,000 jobs | Required configuration |
| --- | --- | --- |
| QueueNorth | $10 + 2 x $1 = $12 | EU-only residency; seven-day retention included. $2 below $14 cap. [N1, N2] |
| QueueSouth | $15 + 1 x $2 + $4 = $21 | EU-only region; seven-day option required. $7 above cap. [S1] |

Prices count each additional started 10,000-job block. North needs two blocks beyond included 10,000. South needs one beyond included 20,000. South's default three days fails retention requirement; its $4 option belongs in total. Packet specifies no other required charges. South cannot qualify under hard budget. [N2, S1]

Both current contracts specify at-least-once delivery, so duplicate deliveries must be handled. North explicitly requires client deduplication using stable job IDs. North v2 contract supersedes v1 exactly-once marketing. Older claim cannot justify exactly-once assumptions. Marketing's universal speed claim also provides no workload-specific production evidence. [N1, S1, M1]

North's observed p95 enqueue-to-delivery latency was 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures. That sample falls below desired 250 ms, but cannot establish production performance. North contract specifies no production latency SLA. Packet provides no South latency measurement or guarantee. [N1, N3, S1]

Unknowns include actual peak rate, payload sizes, concurrency, tenant conditions, retry behavior, and production latency distribution. Monthly job count alone does not define peak workload. [N3]

Smallest next validation: run limited QueueNorth EU pilot using representative peak load, payloads, and concurrency. Measure enqueue-to-delivery p95 against <=250 ms. Include retry/failure cases and verify stable-ID deduplication prevents duplicate effects. Confirm EU-only configuration and seven-day retention before production use. Passing pilot supports conditional adoption for tested conditions; it supplies no contractual latency guarantee. If guaranteed production latency is required, obtain contractual evidence before commitment. [N1, N3]
