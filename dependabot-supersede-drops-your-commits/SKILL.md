---
name: dependabot-supersede-drops-your-commits
description: Dependabot deletes and replaces its own branch when base changes, silently dropping any fix you pushed onto it. Use when a Dependabot bump needs an accompanying code change to go green.
kind: procedure
domains: [dependabot, github, ci]
requires: [pnpm-override-floors-go-stale]
origin:
  authored: 2026-08-19
  discovered_in: media-streamer
  evidence: "#184 superseded by #186; master left failing typecheck with 53 errors"
assurance:
  verified_against: "GitHub Dependabot"
  stale_after_days: 365
---

## Trigger

A Dependabot PR that will not go green without a code change — most often a
bump that requires regenerated types or a call-site update.

## The rule

Do not push the fix onto the Dependabot branch. Push it to a branch you own and
open your own PR.

If base changes while the PR is open, Dependabot closes it ("Looks like these
dependencies are updatable in another way, so this is no longer needed"),
**deletes the branch**, and opens a replacement built from the new base. The
replacement carries only the dependency change. Every commit you added is gone.

Confirmed on media-streamer: #184 (a supabase-js bump plus the `types.ts` sync
that bump requires) was superseded by #186 after an unrelated PR merged. #186
shipped the bump without the type fix and left master failing `pnpm typecheck`
with 53 errors.

The danger is specific to bumps that *require* an accompanying change. Splitting
those two halves across PRs is what breaks the default branch.

## How to apply

```sh
gh api repos/O/R/pulls/N --jq '{state,merged,mergeable,mergeable_state}'
```

- `mergeable_state: "dirty"` means a merge conflict — that, not a red check, is
  usually why the merge button did nothing.
- `merged: false` with `state: "closed"` means superseded, not merged.
- A `git push` printing `* [new branch]` for an existing PR branch means the
  branch was deleted underneath you; the PR is already closed.

Resolving a deps conflict: take the **higher version of every package** — the
union of both upgrade sets, not one side — then regenerate the lockfile with
`pnpm install` rather than hand-merging it.

Dependabot re-proposes majors that cannot land until the ecosystem catches up.
Add an `ignore` block in `dependabot.yml` with the reason, or the grouped major
PR is red forever.

## Evidence

`eval/case.md`. The state-reading half is runnable against any repo; the
supersede itself cannot be forced on demand.
