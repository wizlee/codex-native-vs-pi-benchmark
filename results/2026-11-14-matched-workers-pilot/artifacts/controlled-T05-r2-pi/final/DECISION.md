# Choose QueueNorth conditionally

Choose QueueNorth with EU-only configuration selected. At 30,000 jobs/month, its $12 total meets $14 hard budget and seven-day retention requirement. Production commitment remains conditional on validating desired p95 <=250 ms. [N1, N2, N3]

QueueNorth costs $10 base for 10,000 jobs plus two started 10,000-job blocks at $1 each: $12/month. Seven-day retention included, leaving $2 budget headroom. No other required charges apply in this scenario. [N2]

QueueSouth costs $15 base for 20,000 jobs plus one started 10,000-job block at $2, plus $4 seven-day retention option: $21/month. This exceeds budget by $7. Default three-day retention fails requirement. EU-only region available. [S1]

Both provide at-least-once delivery, so duplicates possible. North requires client deduplication using stable job ID. North v2 contract supersedes v1 exactly-once delivery claim. Older marketing's universal production-speed assertion supplies no measured production assurance. [N1, S1, M1]

North observed 180 ms enqueue-to-delivery p95 at 20 jobs/second in EU lab with 1 KB payloads, single tenant, no induced failures. This meets desired threshold only under measured conditions. Benchmark is observation, not service guarantee. North contract specifies no production latency SLA. Packet supplies no South latency measurement or guarantee. [N3, N1, S1]

Unknowns include actual peak arrival rate, payload distribution, concurrency, retry behavior, and production latency under failures. Monthly volume alone does not establish peak load or representative benchmark conditions. Client deduplication behavior also needs validation. [N1, N3]

Smallest next step: bounded North pilot in intended EU-only configuration using representative payloads and peak arrival patterns. Measure enqueue-to-delivery p95 against <=250 ms. Include controlled retry to verify stable-ID deduplication. Record workload, sample size, conditions, and results before production commitment. Passing supplies workload-specific evidence, not contractual guarantee.
