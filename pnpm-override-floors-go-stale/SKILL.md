---
name: pnpm-override-floors-go-stale
description: A '>=X' pnpm override resolves once and the lockfile pins it, so the override protecting you becomes what holds you on a vulnerable version and Dependabot reports security_update_not_possible. Use when a security PR fails to open or an override does not seem to take.
kind: constraint
domains: [pnpm, dependabot, security]
requires: []
origin:
  authored: 2026-08-16
  discovered_in: coinpayportal
  evidence: "PR #258; socket.io-parser, ip-address and dompurify all locked at exactly their floors"
assurance:
  verified_against: "pnpm workspaces, pnpm-lock.yaml"
  stale_after_days: 365
---

## Trigger

A `>=X` entry in `pnpm-workspace.yaml` overrides. Or Dependabot reporting
`security_update_not_possible` where the "latest resolvable version" equals your
own floor.

## The rule

A `>=X` override does not keep itself current. pnpm resolves it once, writes the
result to `pnpm-lock.yaml`, and the lockfile is authoritative from then on. When
an advisory later lands on the exact version that was locked, two things happen
together:

1. the tree stays vulnerable, and
2. Dependabot fails the update job rather than opening a PR.

So the override meant to protect you is what pins you to the vulnerable
version, and the tell is that Dependabot says it *cannot* update.

Fix: raise the floor past the vulnerable range **and** re-run `pnpm install` to
force the re-resolve. Bumping the floor alone is not enough; the lockfile must
be regenerated.

## The selector/replacement trap

In `'nanoid@>=3.0.0 <4.0.0': '>=3.3.18'`, the left side only chooses **which**
dependency ranges the rule applies to. It does not constrain the result — pnpm
still resolved to the highest published match, 6.0.1. The upper bound belongs on
the **right**: `'nanoid@>=3.0.0 <4.0.0': '>=3.3.18 <4.0.0'`.

When a package drops CJS after a major (nanoid after v3, brace-expansion after
v2), crossing that boundary silently breaks postcss, eslint and everything
downstream — so verify with `pnpm build`, not just tests.

## Evidence

`eval/case.md`. Runnable with pnpm and network against a fixture workspace.
