# Queue choice

Choose QueueNorth conditionally for 30,000 jobs/month. Unconditional production commitment is not justified until latency validation. Configure EU-only residency and stable-job-ID deduplication [N1].

QueueNorth costs $10 base + 2 additional started blocks of 10,000 jobs at $1 = $12/month. Seven-day retention included. Total sits $2 below hard $14 budget [N1, N2].

QueueSouth costs $15 base + 1 additional started block of 10,000 jobs at $2 + $4 seven-day retention option = $21/month. Total exceeds budget by $7. Default three-day retention fails requirement. EU-only region is available, but required seven-day configuration cannot meet budget [S1].

Both provide at-least-once delivery, so duplicates are possible. QueueNorth requires client deduplication using stable job ID [N1, S1]. QueueNorth v2 contract explicitly supersedes v1 delivery claims. Use N1 over M1's exactly-once marketing. M1's broad speed claim supplies no production latency proof [N1, M1].

QueueNorth benchmark observed p95 enqueue-to-delivery of 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures [N3]. That sample is below desired production p95 <=250 ms, but does not establish production compliance. N3 is not a service guarantee. N1 specifies no production latency SLA. Packet supplies no QueueSouth latency measurement or guarantee [N1, N3, S1].

Unknowns include actual payload sizes, peak and burst rates, production contention, and latency during retries or failures. Monthly volume alone does not establish peak workload. Duplicate-handling correctness also needs validation [N1, N3].

Smallest next validation step: bounded QueueNorth trial in EU-only configuration, using representative payloads and expected peak bursts. Measure enqueue-to-delivery p95 against <=250 ms. Include one induced retry case and verify stable-ID deduplication prevents duplicate effects. Proceed only if measured behavior meets needs; successful trial supports adoption but creates no contractual latency guarantee [N1, N3].
