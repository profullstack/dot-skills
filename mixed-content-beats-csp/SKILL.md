---
name: mixed-content-beats-csp
description: An http:// frame or media source on an https page is blockable mixed content and cannot be allowed back in by loosening CSP. Use when a console CSP error points at an http:// resource and the obvious fix is to widen the policy.
kind: diagnostic
domains: [csp, browsers, security]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: profullstack/rssamplifier
  evidence: "PR #123, the reader's embedded frame"
assurance:
  verified_against: "Chromium, https origin"
  stale_after_days: 1095
---

## Trigger

An `http://` iframe, audio, video or image failing on an https page, with the
console blaming CSP.

## The rule

Loosening CSP will not fix it. A frame is **blockable** mixed content: the
browser refuses it regardless of what `frame-src` permits. Adding `http:` to
the directive changes nothing and downgrades the policy for everything else.

The evaluation order is what makes this hard to read: CSP is checked *before*
the mixed-content check, so a policy listing only `https:` produces a CSP error
that hides the mixed-content one underneath. Fixing the CSP just reveals the
second error — which looks like progress and is not.

## How to apply

Upgrade the scheme, don't permit the old one. Most hosts still printing
`http://` in their markup or feeds have had TLS for years; the template was
written once and never revisited.

Probe the https twin server-side — no mixed-content rule applies to your own
fetch — and fall back to the original only on a connection failure or a >= 400,
on a short clock, so an http-only host pays one fast timeout.

`upgrade-insecure-requests` does the same thing blindly and gives you no
fallback, so prefer an explicit probe wherever you already fetch the URL.

## Evidence

`eval/case.md`. Genuinely runnable with headless Chrome, which this machine
has; not yet run, so no receipt.
