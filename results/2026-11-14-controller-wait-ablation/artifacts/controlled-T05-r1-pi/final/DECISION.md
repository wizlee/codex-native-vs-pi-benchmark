# Queue decision

Choose QueueNorth conditionally. Packet supports hard constraints, but production latency remains unverified. [N1, N2, N3]

At 30,000 jobs/month, QueueNorth costs $10 base plus two additional started 10,000-job blocks at $1 each, totaling **$12/month**. Seven-day retention included. No other required charges apply in this scenario. Budget headroom is $2. [N2]

QueueSouth costs $15 base plus one additional started 10,000-job block at $2, plus $4 for seven-day retention, totaling **$21/month**. Default three-day retention fails requirement. Seven-day configuration exceeds $14 budget by $7. No other required charges apply here. [S1]

Both offer EU-only residency. Select EU-only configuration. QueueNorth includes required seven-day retention. [N1, S1]

Both provide at-least-once delivery, so duplicates are possible. QueueNorth requires client deduplication with stable job ID. Do not assume QueueSouth provides exactly-once processing either. [N1, S1]

QueueNorth v2 contract explicitly supersedes v1 delivery claims. Its at-least-once contract controls over M1's exactly-once marketing. M1's broad speed claim supplies no production latency proof. [N1, M1]

QueueNorth measured 180 ms enqueue-to-delivery p95 at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, no induced failures. Sample falls below desired 250 ms, but is no service guarantee. Contract specifies no production latency SLA. Packet provides no QueueSouth latency evidence. [N1, N3, S1]

Unknowns include actual peak traffic, payload sizes, tenant contention, and latency during failures or retries. Monthly volume alone does not establish peak load.

Smallest next validation step: bounded QueueNorth trial in EU-only configuration with representative payloads and peak traffic. Measure enqueue-to-delivery p95 against 250 ms. Include controlled retry to check stable-ID deduplication. Passing trial supports tested workload, not contractual guarantee.

Commitment remains conditional on acceptable production-representative latency evidence and working deduplication. QueueNorth justifies evaluation now. Unconditional production commitment is not justified by packet alone.
