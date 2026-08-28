---
name: git-stash-shared-across-worktrees
description: git stash is one stack per repository, shared by every worktree, so parallel agents silently pop each other's entries. Use when coordinating concurrent work in git worktrees, or when edits vanish and are replaced by someone else's.
kind: constraint
domains: [git, worktrees, concurrency]
requires: []
origin:
  authored: 2026-08-16
  discovered_in: profullstack/threatcrush
  evidence: "A stash push/pop around a baseline measurement popped a concurrent job's stash instead."
assurance:
  verified_against: "git 2.43+"
  stale_after_days: 1095
---

## Trigger

Any agent about to run `git stash` in a repository where another session, job or
worktree might be active. With background agents, that is most of the time.

## The rule

`git stash` writes to `.git/refs/stash`. Worktrees isolate the working tree and
HEAD; they do not isolate refs. The stash is a ref, so every worktree of a
repository pushes onto and pops from **one shared stack**.

Two sessions stashing concurrently will restore each other's changes. Both lose
work and neither gets an error, because from git's point of view nothing went
wrong.

## How to apply

Do not use `git stash` for agent work. To A/B test a change, commit first and
swap files with `git checkout <sha> -- <paths>`, which touches no shared ref.

If a pop has already clobbered you, the dropped stash commit is still in the
object database. `git stash` prints the dropped SHA on the way out:

```sh
git checkout <dropped-sha> -- <paths>              # recover your files
git stash store -m "restored for other job" <sha>  # put theirs back
```

## Evidence

Reproducible offline with two worktrees of a scratch repository and no network:
`eval/two-worktrees.sh` asserts that a stash pushed in worktree A is visible to
`git stash list` in worktree B, and that B's pop consumes A's entry.
