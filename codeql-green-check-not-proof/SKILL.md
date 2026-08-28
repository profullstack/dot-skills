---
name: codeql-green-check-not-proof
description: A green CodeQL PR check only means no NEW alerts versus base; it never proves an existing alert was fixed. Use before reporting a security alert as resolved on the strength of a passing check.
kind: procedure
domains: [codeql, github, security]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: profullstack/threatcrush
  evidence: "A truncated alert list produced a false '1 to 5 regression' claim; master already had 5"
assurance:
  verified_against: "GitHub code-scanning API"
  stale_after_days: 365
---

## Trigger

About to say an alert is fixed, or a PR introduced a regression, based on the
CodeQL check's colour.

## The rule

A passing CodeQL check proves only that the PR introduced no *new* alerts
relative to base. Alerts already open stay open and the check stays green.

To prove an alert is resolved, query it per-ref:

```sh
gh api '/repos/OWNER/REPO/code-scanning/alerts?ref=refs/pull/N/merge&state=open&per_page=100' \
  --jq '[.[] | select(.rule.id=="js/request-forgery")] | length'
```

Before trusting a *default-branch* listing, confirm the analysis is current — a
stale analysis makes fixed alerts look open and vice versa:

```sh
gh api '/repos/OWNER/REPO/code-scanning/analyses?ref=refs/heads/master&per_page=3' \
  --jq '.[] | "\(.created_at)\t\(.commit_sha)"'
```

## Two traps

**Never truncate the alert list** before counting. Piping through `head -40`
produced a false claim that a PR took log-injection from 1 to 5; master already
had 5. Always `per_page=100` and count the whole set.

**Alerts from an uploaded SARIF** (tool name is your scanner, not `CodeQL`) have
`state: null` and appear only on the PR ref, never in the default-branch
listing. They are not regressions.

## Evidence

`eval/case.md`. Needs an authenticated `gh` against a repo with code scanning.
