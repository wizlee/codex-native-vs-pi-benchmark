# Fictional primary-source packet
These vendors are invented for this test. No web research required.

## N1: QueueNorth v2 service contract, 2026-10-20
EU-only data residency available. Job retention seven days. Delivery at least
once. Client must deduplicate with stable job ID. No production latency SLA
specified in this contract. Supersedes v1 delivery claims.

## N2: QueueNorth v2 pricing, 2026-11-01
$10/month includes 10,000 jobs. Each additional started block of 10,000 costs
$1. Seven-day retention included. No other required charges in this scenario.

## N3: QueueNorth benchmark, 2026-10-22
p95 enqueue-to-delivery 180 ms at 20 jobs/second in EU lab, 1 KB payloads,
single tenant, no induced failures. Observed sample, not service guarantee.

## S1: QueueSouth pricing and contract, 2026-11-03
EU-only region available. At-least-once delivery. $15/month includes 20,000
jobs. Each additional started block of 10,000 costs $2. Default retention
three days; seven-day option adds $4/month. No other required charges here.

## M1: QueueNorth v1 marketing, 2025-03-01
Exactly-once delivery. Fast enough for every production use case.
