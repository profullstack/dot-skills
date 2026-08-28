---
name: nextjs-inlines-process-env
description: Next.js statically replaces process.env.NAME at build time, including in server code, so a runtime secret compiles in as undefined permanently. Use when a deployed Next app 401s but the same credentials work by curl.
kind: constraint
domains: [nextjs, docker, secrets]
requires: []
origin:
  authored: 2026-08-11
  discovered_in: outreachgraph
  evidence: "Web image built before its credentials existed; every request went out with no auth header"
assurance:
  verified_against: "Next.js App Router, containerised build"
  stale_after_days: 365
---

## Trigger

A containerised Next.js app that 401s in deployment while identical credentials
return 200 by `curl`. Or any server-side secret set on the host after the image
was built.

## The rule

Next.js statically replaces `process.env.SOME_NAME` during the build, including
in server-side code. A variable absent at build time is compiled in as
`undefined` permanently — setting it on the host and restarting does nothing.

```ts
...(process.env.API_TOKEN ? { authorization: `Bearer ${process.env.API_TOKEN}` } : {}),
```

collapsed to `false`, so every request went out with **no auth header**. Both
services' tokens hashed identically, which is what made it confusing: the
credential was right and was never sent.

## How to apply

Index `process.env` with a non-literal key, which defeats the substitution:

```ts
function runtimeEnv(name: string): string | undefined {
  const key = String(name);
  return process.env[key];
}
```

`NEXT_PUBLIC_*` should stay a direct reference — inlining is the intent there.

Rebuilding with the vars present also "works", but bakes the secret into the
image. Don't.

## Evidence

`eval/case.md`. Needs a real `next build`, so no receipt unattended. The static
half — grepping for direct server-side `process.env.` reads — runs anywhere.
