# Case: first-publish read/write split

**Runnable:** no, and not merely for want of a harness. Verifying it requires
publishing a brand-new scoped name, which can only ever be done once per name.
The skill is therefore permanently capped at `field-observed`.

## What was observed (2026-08-19, @profullstack/bufferoverride@0.1.0)
- `npm publish` printed `+ @profullstack/bufferoverride@0.1.0`.
- `npm view`, `npm install` and an unauthenticated registry GET returned 404 for
  roughly 10 minutes.
- `npm access get status` reported `public` throughout.
- The package then appeared and installed normally with no further action.

## Falsifiable half (runnable)
The *negative* claim is testable at no cost: publishing a **new version of an
existing** package must be readable within seconds. If that ever shows the same
window, the mechanism in this skill is wrong.
