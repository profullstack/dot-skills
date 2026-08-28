---
name: turso-request-size-ceiling
description: Turso/libSQL accepts at least a 32 MiB bound argument in one execute; the published limits page 404s and web search has no number. Use before sizing a column cap or chunking writes around a guessed HTTP limit.
kind: constraint
domains: [turso, libsql]
requires: [libsql-undefined-unbindable-remote-only]
origin:
  authored: 2026-08-17
  discovered_in: profullstack/rssamplifier
  evidence: "Measured against prod with a read-only `select length(?)`"
assurance:
  verified_against: "Turso hosted, rssamplifier prod database, 2026-08-17"
  stale_after_days: 180
---

## Trigger

About to chunk a write, cap a column, or reject an upload because of an assumed
Turso payload limit.

## The rule

There is no published number. `docs.turso.tech/limits` returns 404 and web
search turns up nothing. Do not guess a 2 MiB HTTP limit and size around it.

Measured with a read-only `select length(?) as n`, which writes nothing and
returns one integer, so the only thing under test is the transport: **0.5, 1, 2,
4, 8, 16 and 32 MiB bound TEXT arguments all succeeded**, each in 0.5-2.2s. The
ceiling is somewhere above 32 MiB, wherever it is.

## How to apply

Re-probe rather than trusting this number for a different database or plan — it
is a measurement of one account on one date, which is exactly why it carries a
short staleness window.

Two mechanical notes for the probe: the script must live *inside* a workspace
package that depends on `@libsql/client`, not at the repo root, because Node
resolves from the file's own directory. And run it read-only, so a probe that
overshoots costs nothing.

## Evidence

`eval/probe.mjs` is the probe itself, written to be re-run. It needs prod
credentials, so it produces no receipt unattended — but re-running it *is* the
verification, and the result should overwrite `verified_against` rather than be
argued with.
