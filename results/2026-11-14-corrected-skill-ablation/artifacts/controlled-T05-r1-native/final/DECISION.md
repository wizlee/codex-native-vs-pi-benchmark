# Choose QueueNorth conditionally

Choose QueueNorth v2 for validation. At 30,000 jobs/month, North costs $12/month: $10 includes 10,000 jobs, plus two started blocks of 10,000 at $1 each. Seven-day retention included, no other required charges here. North leaves $2 under hard $14 budget. Select available EU-only residency. [N1, N2]

QueueSouth costs $21/month: $15 includes 20,000 jobs, plus one $2 block and $4 for seven-day retention. Default three days fails retention requirement. EU-only region available, but complete qualifying price exceeds budget by $7. Reject South under current budget. [S1]

Both provide at-least-once delivery, so duplicates can occur. North explicitly requires client deduplication using stable job ID. North v2 contract supersedes v1 exactly-once marketing. Do not rely on v1's claim that speed suits every production use case. [N1, S1, M1]

North's observed p95 enqueue-to-delivery latency is 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, no induced failures. That sample falls below desired 250 ms, but does not establish production p95. North contract specifies no production latency SLA. Packet provides no South latency measurement or SLA. [N1, N3, S1]

Unknowns include production peak arrival rate, payload sizes, concurrency, failure behavior, and duplicate-handling correctness. Monthly volume alone does not establish these conditions. Production latency remains unverified. [N1, N3]

Smallest next validation: run limited North pilot in EU-only configuration with seven-day retention, representative payloads and arrival pattern. Measure enqueue-to-delivery p95 against <=250 ms. Include retry/failure exercise to verify stable-ID deduplication. Pilot supports only tested conditions; it does not create contractual guarantee. [N1, N3]

North meets stated residency, retention, and price constraints on packet evidence. Production commitment remains conditional on latency validation and working deduplication. No unconditional production commitment justified yet. [N1, N2, N3]
