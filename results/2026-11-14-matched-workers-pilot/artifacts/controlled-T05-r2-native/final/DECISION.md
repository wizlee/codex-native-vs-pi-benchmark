# Queue decision

Choose QueueNorth conditionally. At 30,000 jobs/month, its $12 total fits hard $14 budget with $2 headroom. EU-only residency is available, and seven-day retention meets requirement [N1, N2]. Production commitment remains conditional because desired production p95 <=250 ms is unproven [N1, N3].

QueueNorth costs $10 base plus two additional started 10,000-job blocks at $1 each, totaling $12/month. Seven-day retention is included. Packet specifies no other required charges [N2].

QueueSouth costs $15 base plus one additional started 10,000-job block at $2, plus $4 for seven-day retention, totaling $21/month. EU-only region is available. Default three-day retention fails requirement; required option puts total $7 over budget. Even $17 without option exceeds budget [S1].

Both services provide at-least-once delivery, so duplicates are possible [N1, S1]. QueueNorth requires client deduplication using stable job ID [N1]. QueueSouth packet supplies no deduplication procedure [S1]. QueueNorth v2 contract expressly supersedes v1 exactly-once marketing claim. Do not design around that obsolete claim [N1, M1].

QueueNorth observed p95 enqueue-to-delivery of 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures [N3]. This sample falls below 250 ms under those conditions. It does not establish production p95. Contract specifies no production latency SLA, and v1 claim of speed for every production use case supplies no usable guarantee [N1, N3, M1]. Packet supplies no QueueSouth latency measurement [S1].

Unknowns include intended peak rate, payload distribution, production latency under contention and failures, and readiness of client deduplication. Monthly job count alone does not establish peak load. Available EU-only residency still requires selecting and verifying intended configuration [N1, N3].

Smallest next validation step is a limited QueueNorth EU-only pilot using intended payloads and peak/burst load. Measure enqueue-to-delivery p95 against <=250 ms, including representative retries and induced failures. Verify stable-ID deduplication and seven-day retention configuration [N1, N3]. Passing pilot supports commitment only for tested conditions, not a production SLA. Until then, North is justified for validation; unconditional production commitment is not justified.
