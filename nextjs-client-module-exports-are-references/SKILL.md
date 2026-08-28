---
name: nextjs-client-module-exports-are-references
description: Every export of a 'use client' module becomes a client reference when a server component imports it, so a constant compares as a proxy and the comparison silently fails. Use when a conditionally-rendered client component never appears and throws no error.
kind: constraint
domains: [nextjs, react, app-router]
requires: [nextjs-inlines-process-env]
origin:
  authored: 2026-08-19
  discovered_in: profullstack/rssamplifier
  evidence: "PR #124, Next 16.3 / React 19"
assurance:
  verified_against: "Next 16.3, React 19"
  stale_after_days: 365
---

## Trigger

A server component imports anything besides the default component from a
`'use client'` module. Or: a client component never renders, with no error, no
warning and no hydration mismatch.

## The rule

In the App Router, **every** export of a `'use client'` module becomes a client
reference when a server component imports it — not just the component. A plain
constant comes back as a proxy object:

```js
import ListFilter, { FILTER_FROM } from './ListFilter.jsx'; // 'use client'
{rows.length >= FILTER_FROM && <ListFilter … />}            // always false
```

`number >= proxy` is false, so this renders nothing. Silently. It looks exactly
like the component being broken, which sends the debugging to the wrong file.

Verified on the rssamplifier `<ListFilter>`: the page hydrated
(`__reactFiber$` present) yet `document.querySelectorAll('.list-filter')` was
empty.

## How to apply

Put any constant or pure helper a server component needs in a **plain module**
(`src/lib/*.js`) and import it from both sides.

A cheap regression guard is a unit test asserting `typeof CONST === 'number'`,
which also forces the helper to be testable — `node --test` cannot import a
`.jsx` file at all, so the test only compiles if the constant has been moved.

## Evidence

`eval/case.md`. The typeof guard runs anywhere; the rendering assertion needs a
Next build plus a browser.
