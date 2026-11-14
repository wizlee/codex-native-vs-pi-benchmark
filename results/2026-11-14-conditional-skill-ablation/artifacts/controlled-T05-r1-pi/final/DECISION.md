# QueueNorth, conditional on production validation

Choose QueueNorth provisionally for 30,000 jobs per month. Complete price is $12/month: $10 includes 10,000 jobs, plus two started blocks of 10,000 at $1 each. Seven-day retention included. No other required charges apply here. Budget headroom is $2. [N2]

QueueNorth offers EU-only residency and seven-day retention. Select EU-only configuration. Delivery is at least once. Client must deduplicate with stable job IDs. [N1]

QueueSouth costs $21/month: $15 includes 20,000 jobs, one additional started block costs $2, and seven-day retention adds $4. EU-only region available, delivery at least once. Its $17 configuration without retention upgrade retains jobs only three days. Compliant configuration exceeds hard $14 budget by $7. [S1]

QueueNorth v1 marketing claims exactly-once delivery. Newer v2 contract explicitly supersedes v1 delivery claims, so use at-least-once semantics. M1's claim of suitability for every production use case supplies no measured production latency evidence. [N1, M1]

QueueNorth observed 180 ms p95 enqueue-to-delivery at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures. This sample falls below desired 250 ms, but provides no production guarantee. Contract specifies no production latency SLA. Packet supplies no QueueSouth latency measurement or guarantee. [N3, N1, S1]

Unknowns include our peak traffic, payload sizes, concurrency, and production p95 during normal operation and failures. Monthly job count alone cannot establish peak load. Duplicate frequency and operational deduplication behavior remain untested for our application.

Smallest next validation step: bounded QueueNorth trial in intended EU-only configuration, using representative payloads and peak traffic. Measure enqueue-to-delivery p95 against 250 ms. Include retry case to verify stable-ID deduplication prevents duplicate effects. Passing supports tested conditions only.

Commitment remains conditional on representative validation. QueueNorth meets stated hard cost, residency, and retention constraints on paper. Production latency remains unproven. If latency evidence fails, packet establishes no alternative within budget.
