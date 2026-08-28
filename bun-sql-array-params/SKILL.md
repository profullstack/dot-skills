---
name: bun-sql-array-params
description: Bun's built-in Postgres client stringifies a JS array as `a,b` instead of a Postgres array literal, failing with three different unhelpful errors. Use when Bun + Postgres queries touch text[], int[] or uuid[] columns.
kind: recipe
domains: [bun, postgres, sql]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: tipoffwatch
  evidence: "Broke passkey registration, reminder preferences and the fan-out user lookup"
assurance:
  verified_against: "Bun 1.3, import { SQL } from 'bun'"
  stale_after_days: 365
---

## Trigger

Any Bun `SQL` query binding a JS array — `text[]`, `int[]`, `uuid[]`, or
`= any($1)`.

## The rule

Bun 1.3's built-in Postgres client does not encode a JS array as a Postgres
array parameter. It stringifies with `Array.prototype.toString`, so
`['internal','hybrid']` arrives as the text `internal,hybrid`:

```
PostgresError: malformed array literal: "internal,hybrid"
  errno: 22P02   detail: Array value must start with "{" or dimension information.
```

Sometimes it fails far less helpfully — the same root cause produced
`insufficient data left in message` (`errno 08P01`, `pq_copymsgbytes`) on
another query, which reads like a protocol bug rather than a bad parameter.

## Why it misleads

Nothing fails at build, lint or typecheck, and each affected query fails with a
*different* unhelpful error, so they look like three unrelated bugs. In
tipoffwatch this silently broke passkey registration (the password manager saved
the credential, the insert threw, the UI said nothing), saving reminder
preferences, and the fan-out's `= any($1::uuid[])` lookup, which would have
killed delivery the moment anyone followed a team.

## How to apply

Build the literal yourself and cast at the call site — deterministic, and
independent of how the driver decides to encode a parameter:

```js
function pgArray(values) {
  const items = (values ?? []).map((v) => `"${String(v).replace(/(["\\])/g, '\\$1')}"`);
  return `{${items.join(',')}}`;
}
// values (${pgArray(tags)}::text[], ${pgArray(nums)}::int[])
// where id = any(${pgArray(ids)}::uuid[])
```

Quoting every element including numbers is fine — `{"60","1"}::int[]` parses.
The escaping matters: an unescaped `"` or `\` corrupts the whole literal.

Verify with PGlite rather than by reasoning — `@electric-sql/pglite` is a real
Postgres in-process, so a test round-trips `text[]`, `int[]` and `uuid[]` with
no server and no Docker.

## Evidence

`eval/case.md`. Runnable once `@electric-sql/pglite` is installed; not
installed on this machine, so no receipt yet.
