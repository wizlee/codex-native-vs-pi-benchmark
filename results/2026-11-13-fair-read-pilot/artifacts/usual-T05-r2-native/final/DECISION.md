# Queue decision

Choose QueueNorth, conditional on production latency validation. At 30,000 jobs/month, EU-only residency and seven-day retention available within $14 hard budget [N1, N2]. Unconditional production commitment not justified by supplied latency evidence.

QueueNorth complete monthly price is $12: $10 includes 10,000 jobs, plus two started blocks of 10,000 at $1 each. Seven-day retention included; no other required charges in scenario. Budget headroom $2 [N2].

QueueSouth complete monthly price is $21: $15 includes 20,000 jobs, plus one started block of 10,000 at $2, plus $4 seven-day retention option. EU-only region available, but total exceeds budget by $7. Default three-day retention fails requirement. Even $17 before retention upgrade exceeds budget [S1].

Both services provide at-least-once delivery [N1, S1]. Duplicates possible. QueueNorth client must deduplicate using stable job ID [N1]. Do not assume queue guarantees exactly-once processing. QueueNorth v2 contract explicitly supersedes v1 delivery claims, so reject M1's exactly-once marketing claim [N1, M1]. M1's broad speed claim establishes no production latency bound [M1].

QueueNorth observed p95 enqueue-to-delivery 180 ms, below desired 250 ms, only in EU lab at 20 jobs/second with 1 KB payloads, single tenant, no induced failures. Sample is not service guarantee [N3]. Contract specifies no production latency SLA [N1]. Packet supplies no QueueSouth latency evidence [S1]. Neither vendor has demonstrated desired production p95 for this workload.

Unknowns include actual peak and burst rates, payload distribution, tenant contention, retry delays, deduplication behavior, and production p95. Monthly volume alone cannot establish peak throughput. EU-only availability requires selecting appropriate configuration [N1, S1].

Smallest next validation step: run one bounded QueueNorth EU staging trial using intended payload mix and expected peak/burst load. Measure enqueue-to-delivery p95 against <=250 ms, then induce retry to check stable-ID deduplication prevents duplicate effects. Confirm EU-only configuration and seven-day retention. Trial can support conditional rollout, not guarantee future latency. If trial fails, pause commitment; packet provides no demonstrated alternative within budget [N1, N2, N3, S1].
