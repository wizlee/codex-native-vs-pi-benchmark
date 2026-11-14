# QueueNorth v2, conditional choice

Choose QueueNorth v2 with EU-only residency configured. Documented price and retention meet hard constraints. Production commitment remains conditional because desired p95 <=250 ms lacks production evidence. [N1, N2, N3]

At 30,000 jobs/month, QueueNorth costs $10 + ceil(20,000 / 10,000) x $1 = $12/month. Seven-day retention included. Budget headroom is $2. No other required charges apply here. [N2]

QueueSouth costs $15 + ceil(10,000 / 10,000) x $2 + $4 = $21/month with seven-day retention. Default three-day retention fails requirement. EU-only region is available, but compliant retention configuration exceeds $14 budget by $7. [S1]

Both services provide at-least-once delivery. Duplicate deliveries remain possible. QueueNorth requires client deduplication using stable job IDs. Do not assume exactly-once processing. [N1, S1]

QueueNorth v1 marketing promises exactly-once delivery. V2 contract explicitly supersedes v1 delivery claims. Use v2 semantics. Marketing's universal speed claim supplies no measured production evidence. [N1, M1]

QueueNorth's observed p95 enqueue-to-delivery latency was 180 ms at 20 jobs/second in EU lab, with 1 KB payloads, single tenant, and no induced failures. That sample falls below 250 ms under those conditions. It does not establish production performance or guarantee future latency. V2 contract specifies no production latency SLA. Packet supplies no QueueSouth latency evidence. [N1, N3, S1]

Unknowns include intended payload sizes, peak traffic, concurrency, and latency during failures. Monthly volume alone cannot establish peak load. Actual EU-only configuration and stable-ID deduplication also need validation. [N1, N3]

Smallest next step: run bounded QueueNorth pilot in EU-only configuration using representative payloads and expected peak traffic. Measure enqueue-to-delivery p95 against <=250 ms. Include controlled retries to check deduplication. Pilot provides workload-specific evidence, not ongoing guarantee. [N1, N3]

North is justified as validation candidate. Commit to production only after pilot review and explicit acceptance of remaining latency risk. South remains excluded by hard budget. [N2, S1]
