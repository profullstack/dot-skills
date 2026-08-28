---
name: fts5-raw-input-is-a-query
description: SQLite FTS5 MATCH takes a query language, not a string, so raw user input errors on almost any punctuation. Use when building or debugging full-text search over FTS5, especially where users paste error messages.
kind: recipe
domains: [sqlite, fts5, search]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: profullstack/bufferoverride
  evidence: "packages/core/src/fts.ts (toFtsQuery, ftsAttempts)"
assurance:
  verified_against: "node:sqlite / SQLite 3.50 FTS5, Node 24.18.1"
  stale_after_days: 1095
---

## Trigger

Any `MATCH ?` where the bound value came from a user. Also: a search endpoint
that works in testing and 500s in production, where the passing tests all used
single bare words.

## The rule

FTS5 `MATCH` parses its right-hand side as a query. Measured behaviour, not
folklore — every one of these is an **error**, not a bad result:

| input | outcome |
|---|---|
| `catch-all` | `no such column: all` |
| `TypeError: x` | `no such column: TypeError` |
| `foo(bar` | `fts5: syntax error near ""` |
| `node.js` | `fts5: syntax error near "."` |
| `1.3.14` | `fts5: syntax error near "."` |
| `C#` | `fts5: syntax error near "#"` |
| `why "this fails` | `unterminated string` |

`-` prefixes a **column-exclusion filter**, so a hyphenated word sends the
second half into the column namespace. It is not a NOT operator, and it does
not silently mis-parse — it throws. `:` is the column filter proper, `(`
groups, `*` is a prefix operator, `"` quotes, and `AND`/`OR`/`NOT` are keywords.
Balanced quotes are legal (`why "this" fails` parses fine); it is the
**unbalanced** quote that errors.

This is worst on developer-facing sites, where people paste stack traces, and
stack traces are almost entirely punctuation.

## How to apply

Tokenise, then re-quote every token as a literal. Users lose FTS operators;
every possible input becomes a valid query.

```js
export function toFtsQuery(input) {
  return String(input).toLowerCase()
    .split(/[^a-z0-9_.+#]+/).filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"`);
}
```

Keep `.`, `+` and `#` inside tokens: unquoted they are syntax errors, but
**quoted** they match, so `"node.js"`, `"1.3.14"` and `"c#"` all survive as
single searchable terms rather than being split apart.

**The non-obvious half.** Joining with `AND` is right for short queries and
matches nothing for a pasted traceback, which shares only a few tokens with the
text that answers it. Try `AND`, and fall back to `OR` only when `AND` returns
zero rows — one extra read on a miss, and both a two-word query and a
forty-token traceback behave sensibly.

## Evidence

`eval/tokenise.mjs` builds a real FTS5 table with `node:sqlite` and asserts the
error table above, that quoting makes all of them valid and matching, and that
the AND-then-OR ladder resolves a pasted traceback where AND alone finds
nothing.

**This skill was corrected by its own eval.** It previously claimed `-` was a
NOT operator that mis-parsed silently. Running the case showed it raises
`no such column`. The prose was wrong for four months and the eval caught it in
one run.
