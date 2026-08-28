---
name: libsql-undefined-unbindable-remote-only
description: libSQL binding `undefined` throws on the remote client but binds as null on a local file DB, so local tests never catch it. Use when a libSQL/Turso app fails only in production, or when "Unsupported type of value" appears with no column name.
kind: diagnostic
domains: [libsql, turso, sqlite, testing]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: profullstack/rssamplifier
  evidence: "PR #141; crawl-log error rate 71% -> 5.6% on deploy"
assurance:
  verified_against: "@libsql/hrana-client, remote https:// URL"
  stale_after_days: 730
---

## Trigger

A libSQL app that passes every local test and fails on the wire. Or the message
`TypeError: Unsupported type of value` with no column, no row and no constraint
named.

## The rule

`undefined` is the only ordinary JS value the remote libSQL client cannot bind.
`valueToProto` accepts null, string, finite number, bigint, boolean,
ArrayBuffer, Uint8Array and Date — and **stringifies any other object**. So
objects and arrays do not throw. Only `undefined`, symbols and functions do.

A `file:` URL uses a different driver that binds `undefined` as null without
complaint. The failure exists only on the wire, so local runs cannot surface it.

## Why it misleads

The throw happens while the statement is being *serialized*, before any SQL
runs. There is no column name in the message to point at the offending field.

In rssamplifier it surfaced as `could not be crawled — Unsupported type of
value`, which reads like a publisher being down. Because the write queue was
serialized, each failure logged with 30-100s of wall clock, which reads like a
slow database. It was neither: a `not null` column was receiving `undefined`
from an object that omitted the key, and 985 of 1,385 crawls in an hour failed.

Each failure also cost two write slots — the failed transaction, then the
failure marker — and stored nothing, which is why a pure bind bug presented as
a throughput collapse.

## How to apply

Assert bindability in a unit test against a **remote** client; a local write
proves nothing. Coerce at the boundary (`value ?? null`) for every optional
field that reaches a bound parameter.

Diagnostic order for "the crawler is slow" on this stack: read the error ratio
(errors vs fetches in the last hour) **first**. A high ratio is a code bug.
Only if errors are low is it write saturation.

## Evidence

`eval/case.md`. Needs credentials for a remote libSQL database, so it cannot
run unattended here — the discriminating assertion is that the *same* statement
binds under `file:` and throws under `https:`.
