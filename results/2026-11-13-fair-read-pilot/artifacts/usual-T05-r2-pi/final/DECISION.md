# Queue decision

Choose QueueNorth for validation. Production commitment remains conditional on workload validation, EU-only configuration, and working deduplication.

| Queue | Complete monthly price at 30,000 jobs | Hard constraints |
| --- | --- | --- |
| QueueNorth v2 | $10 base + two started 10,000-job blocks at $1 = $12. Seven-day retention included. No other required charges here [N2]. | EU-only residency available, seven-day retention, $2 below $14 cap [N1] [N2]. |
| QueueSouth | $15 base + one started 10,000-job block at $2 + $4 seven-day option = $21 [S1]. | EU-only available. Default three-day retention fails requirement. Seven-day configuration exceeds cap by $7 [S1]. |

Both provide at-least-once delivery. North explicitly requires client deduplication using stable job IDs [N1] [S1]. Design application effects to tolerate duplicates. North v2 contract supersedes v1 exactly-once marketing claim [N1] [M1]. Older claim cannot justify assuming exactly-once delivery.

North benchmark observed 180 ms p95 enqueue-to-delivery at 20 jobs/second in EU lab, 1 KB payloads, single tenant, no induced failures [N3]. This is below desired 250 ms numerically, but sample gives no production guarantee [N3]. Contract specifies no production latency SLA [N1]. Marketing claim of speed for every production use case supplies no measured production evidence [M1]. Packet provides no South latency evidence [S1], so South cannot be ranked slower.

Unknowns include actual payload sizes, peak arrival rate, tenancy effects, and behavior during retries and failures. Monthly volume alone does not determine peak load. Production p95 remains unverified. Missing latency proof does not erase North's fit to stated hard budget, residency, and retention requirements.

Smallest next validation step: bounded North trial configured EU-only, using representative payloads and expected peak load. Measure enqueue-to-delivery p95 against 250 ms. Include controlled retries to check stable-ID deduplication before production. Trial can reduce workload uncertainty; it cannot create contractual SLA.

North is only supplied option meeting hard constraints at stated volume [N1] [N2] [S1]. Select conditionally for validation. Unconditional production commitment lacks sufficient latency evidence [N1] [N3].
