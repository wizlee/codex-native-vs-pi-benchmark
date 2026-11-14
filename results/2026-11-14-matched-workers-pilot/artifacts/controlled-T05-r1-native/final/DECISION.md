# Queue choice

Choose QueueNorth conditionally. At 30,000 jobs/month, QueueNorth meets the $14 hard budget, EU-only residency, and seven-day retention requirements. Production commitment depends on latency validation and client deduplication. [N1, N2]

QueueNorth costs $10 base plus two additional started blocks of 10,000 jobs at $1 each, totaling **$12/month**. Seven-day retention is included, with no other required scenario charges. Budget headroom is $2/month. [N2]

QueueSouth costs $15 base plus one additional started block of 10,000 jobs at $2, plus $4 for seven-day retention, totaling **$21/month**. EU-only region is available, but default three-day retention fails the requirement. With seven days, South exceeds the hard budget by $7. Reject South for this scenario. [S1]

Both queues provide at-least-once delivery, so duplicate delivery is possible. QueueNorth explicitly requires client deduplication with stable job ID. Implement and validate that handling before production. QueueSouth also needs duplicate-safe consumption. QueueNorth v2 contract supersedes v1 marketing's exactly-once claim. Do not rely on that older claim or its blanket production-speed promise. [N1, S1, M1]

QueueNorth's observed p95 enqueue-to-delivery latency is 180 ms, below the desired 250 ms. That result covers only 20 jobs/second, EU lab, 1 KB payloads, single tenant, and no induced failures. It does not establish production p95. The v2 contract specifies no production latency SLA. Packet supplies no QueueSouth latency measurement or guarantee. [N3, N1, S1]

Unknowns include production burst rate, payload sizes, tenant contention, failure and retry behavior, and whether the desired latency measures the same enqueue-to-delivery interval. Monthly job count alone does not establish peak load. Production deduplication correctness also remains unverified. [N1, N3]

Smallest next validation step: run a bounded QueueNorth EU-only trial with seven-day retention configured, representative payloads and peak arrival rate. Measure enqueue-to-delivery p95 against <=250 ms. Include a retry or induced-failure case to check duplicate-safe handling with stable job IDs. Keep the trial within the $14 budget. Passing supports a conditional rollout, not a contractual latency guarantee. If a guaranteed production threshold is required, obtain a suitable commitment before purchase. [N1, N2, N3]
