# Queue choice

Choose QueueNorth v2 conditionally. At 30,000 jobs/month, North meets $14 hard budget, EU-only residency, and seven-day retention when EU-only deployment is selected [N1, N2]. Production commitment remains conditional because desired p95 <=250 ms is unverified [N1, N3].

| Queue | Complete monthly price | Hard constraints |
| --- | --- | --- |
| North v2 | $10 base + 2 started blocks of 10,000 extra jobs at $1 = $12. Seven-day retention included [N2]. | EU-only available, seven days, $2 below budget [N1, N2]. |
| South | $15 base + 1 started block of 10,000 extra jobs at $2 + $4 seven-day option = $21 [S1]. | EU-only available; seven-day option required because default is three days. Exceeds budget by $7 [S1]. |

Packet specifies no other required charges for this scenario [N2, S1].

Both services deliver at least once [N1, S1]. North clients must deduplicate using stable job ID [N1]. Do not assume exactly-once processing. North v2 contract explicitly supersedes v1 delivery claims, so M1's exactly-once marketing does not describe current service [N1, M1]. M1's broad speed claim supplies no production p95 evidence [M1].

North observed p95 enqueue-to-delivery of 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures [N3]. That sample falls below 250 ms, but guarantees no production result. North contract specifies no production latency SLA [N1]. South packet supplies no latency measurement or latency guarantee [S1].

Unknowns include actual payload sizes, peak and burst traffic, concurrency, tenancy effects, network path, retries, and failure behavior. Monthly volume alone does not establish these conditions. Production p95 and effective deduplication remain unverified [N1, N3].

Smallest next validation: run bounded North pilot in EU-only configuration using representative payloads and expected peak traffic. Measure enqueue-to-delivery p95 against <=250 ms. Include retry or induced-failure cases and verify stable-ID deduplication during redelivery. Define representative workload first if unknown. Passing pilot supports only tested conditions, creates no contractual latency SLA [N1, N3].
