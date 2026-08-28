---
name: npm-first-publish-404-window
description: A brand-new scoped npm package 404s on every read path for minutes after a successful publish. Use before re-publishing, bumping a version, or concluding a token is broken.
kind: diagnostic
domains: [npm, registry, release]
requires: []
origin:
  authored: 2026-08-19
  discovered_in: "@profullstack/bufferoverride@0.1.0"
  evidence: "~10 minutes of 404s, then it appeared and installed normally"
assurance:
  verified_against: "registry.npmjs.org, first publish of a new scoped name"
  stale_after_days: 365
---

## Trigger

`npm publish` printed `+ pkg@version`, and `npm view` / `npm install` / a plain
registry GET all return 404.

## The rule

The **first** publish of a name that has never existed succeeds while every
read path keeps 404ing for several minutes — authenticated or not, with
cache-busting query strings, across `npm view`, `npm install` and
`GET https://registry.npmjs.org/<pkg>`.

The write path and the public read/CDN path are provisioned separately for a
new name. This does **not** happen for a new version of an existing package,
which is why it only ever bites once per package and always looks like a broken
token.

## How to apply

Do not re-publish, bump the version, or rotate the token. Confirm the publish
landed by reading the authoritative side:

```sh
npm publish                                  # E403 "cannot publish over ... X" proves X is there
npm access list packages <scope> | grep <name>
npm access get status <scope>/<name>          # reports public
```

Then poll `GET https://registry.npmjs.org/<pkg>` until 200 and verify with a
real `npm install -g` into a scratch `--prefix`. Only after that is it
installable for anyone else.

## Evidence

`eval/case.md`. Unrepeatable by construction — verifying it costs a permanently
burned package name — so this skill is capped at field-observed and should
never claim more.
