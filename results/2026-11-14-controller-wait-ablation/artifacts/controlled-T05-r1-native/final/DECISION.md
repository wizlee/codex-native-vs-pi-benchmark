# Queue choice

Choose QueueNorth conditionally. At 30,000 jobs/month, documented price, residency availability, and retention meet hard constraints. Production latency remains unverified. [N1, N2, N3]

QueueNorth costs $10 + ceil[20,000 / 10,000] x $1 = $12/month. Seven-day retention included, with no other required scenario charges. Budget headroom is $2/month. Configure EU-only residency. [N1, N2]

QueueSouth costs $15 + ceil[10,000 / 10,000] x $2 + $4 = $21/month, $7 above hard budget. Seven-day option is necessary because default retention is three days. EU-only region available. No other required scenario charges. [S1]

Both provide at-least-once delivery, so duplicate delivery is possible. QueueNorth explicitly requires client deduplication using stable job ID. Its v2 contract supersedes v1 exactly-once marketing. Do not rely on M1's delivery or broad production-speed claims. [N1, S1, M1]

QueueNorth observed 180 ms enqueue-to-delivery p95 at 20 jobs/second in EU lab, using 1 KB payloads, single tenant, no induced failures. This sample falls below desired 250 ms, but proves no production guarantee. Contract supplies no production latency SLA. Packet supplies no QueueSouth latency measurement or SLA. [N1, N3, S1]

Unknowns include production peaks, payload sizes, concurrency, retry frequency, and latency under failures. Monthly volume alone cannot establish peak throughput or production p95. [N3]

Smallest next validation step: run one limited QueueNorth EU-only pilot with representative payloads and peak arrival pattern. Measure enqueue-to-delivery p95 against <=250 ms. Exercise retry/redelivery and verify stable-ID deduplication. Confirm EU-only and seven-day retention configuration. Pilot supplies workload evidence, not contractual SLA. [N1, N3]

QueueNorth is justified as candidate under documented hard constraints. Production commitment remains conditional on configuration, working deduplication, and acceptable representative latency evidence. If guaranteed production latency becomes mandatory, packet supports no unconditional commitment. [N1, N2, N3]
