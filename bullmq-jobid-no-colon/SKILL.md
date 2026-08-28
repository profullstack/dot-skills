---
name: bullmq-jobid-no-colon
description: BullMQ rejects a custom jobId containing ":" unless it splits into exactly 3 parts, and a jobId derived from state the job itself resets silently dedupes the work away. Use when adding or debugging BullMQ jobs with custom ids.
kind: constraint
domains: [bullmq, redis, queues]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: tipoffwatch
  evidence: "validateOptions at job.js:1075, bullmq 5.81.3; cost three deploys"
assurance:
  verified_against: "bullmq 5.81.3"
  stale_after_days: 365
---

## Trigger

Any `queue.add(name, data, { jobId })` with a hand-built id. Also: a trigger
that logs success, no worker log follows, and the data never changes.

## Trap 1 — the colon

BullMQ rejects a custom `jobId` containing `:` unless
`jobId.split(':').length === 3`, throwing `Custom Id cannot contain :`. The
colon is reserved for its own repeatable-job keys; the three-part exception
exists only for backwards compatibility.

There is no type error, no lint, and no failure until that exact `queue.add()`
runs:

- `seed-cat:2026-08-19` (2 parts) threw inside schedule installation, so the
  container **died on boot** and never passed its healthcheck. Loud, at least.
- `bt:<eventId>:<offset>:<cursor>` (4 parts) sat in a fan-out that only runs
  once a real user follows something. It would have thrown **in production at
  kickoff**, and stayed quiet until then purely because the app had no users.

Three-part ids pass, which is the trap: a codebase can hold several
colon-separated ids where only some are legal, and the legal ones make the
convention look fine.

## Trap 2 — an id derived from state the job resets

`queue.add` with a jobId that already exists **returns the existing job and runs
nothing** — including a *completed* job still inside `removeOnComplete.age`. The
queue reports success and the log says it is syncing.

Both attempts collided:

- `seed-all-<hour>` matched a routine sync that had already run that hour,
  before the code creating the new backfill need existed.
- `backfill-<day>-u0-r354`, keyed on outstanding counts, matched the *previous*
  backfill — because each backfill resets the same 354 rows and therefore
  regenerates a byte-identical id.

## How to apply

Never put `:` in a BullMQ jobId; use `-`. Bucket periodic dedupe by **minute**,
which still collapses a boot storm across instances — all the deduplication was
ever for — and can never block a backfill triggered later.

When a jobId encodes idempotency, assert in a test both that no id contains a
colon **and** that the interpolations making each id unique are still present.
"Fixing" the colon by dropping a segment silently collapses every page of a
fan-out onto one job, which looks like it works.

## Evidence

`eval/case.md`. Needs a Redis instance, so it does not run unattended here.
