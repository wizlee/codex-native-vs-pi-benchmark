Choose QueueNorth conditionally. Its EU-only option and included seven-day retention meet residency and retention requirements when configured accordingly [N1, N2]. Production commitment remains conditional on workload validation.

| Queue | Complete monthly price at 30,000 jobs | Budget result |
| --- | --- | --- |
| QueueNorth | $10 base + 2 started overage blocks x $1 = $12 | $2 below $14 [N2] |
| QueueSouth | $15 base + 1 started overage block x $2 + $4 retention = $21 | $7 above $14 [S1] |

North includes 10,000 jobs; remaining 20,000 consumes two blocks. South includes 20,000 jobs; remaining 10,000 consumes one block. South's default three-day retention fails requirements. Seven-day option adds $4. Both offer EU-only residency; packet specifies no other required charges for this scenario [N1, N2, S1]. North is only documented option meeting all hard constraints.

Both provide at-least-once delivery, so duplicates must be expected. North requires client deduplication with stable job IDs [N1, S1]. North v2 contract explicitly supersedes v1 marketing's exactly-once claim. Use current contract; M1's broad speed claim cannot establish production performance [N1, M1].

North's observed enqueue-to-delivery p95 was 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures [N3]. That sample is below desired 250 ms, but does not establish production p95 <=250 ms. N1 specifies no production latency SLA. Packet supplies no South latency measurements or production guarantee [N1, N3, S1].

Unknowns include actual peak rate, bursts, payload distribution, concurrency, and latency during failures or retries. Monthly volume alone cannot establish those conditions. Client deduplication behavior also needs validation.

Smallest next step: one QueueNorth pilot in intended EU-only configuration with seven-day retention. Measure enqueue-to-delivery p95 using representative payloads and peak bursts; include retry/failure cases and verify stable-ID deduplication. Set sample size and duration before running. Use results to assess desired <=250 ms target; pilot cannot create contractual SLA. Hard-constraint choice is justified by packet. Production commitment remains conditional on acceptable latency and duplicate handling.
