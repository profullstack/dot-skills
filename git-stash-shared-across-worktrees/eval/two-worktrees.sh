#!/usr/bin/env bash
# Asserts the shared-stash claim. Pure git, no network, no deps.
# Exit 0 = claim holds.
set -euo pipefail
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
git init -q repo && cd repo
git config user.email t@t.t && git config user.name t
echo base > file.txt && git add . && git commit -qm base
git worktree add -q ../wtB -b sideB >/dev/null 2>&1

# A stashes a change
echo "change-from-A" > file.txt
git stash push -qm "A-entry"

# B must see A's entry on the shared stack
cd "$tmp/wtB"
if ! git stash list | grep -q "A-entry"; then
  echo "FAIL: worktree B cannot see worktree A's stash - stacks are isolated"; exit 1
fi

# B pops, consuming A's entry
git stash pop -q 2>/dev/null || true
if git stash list | grep -q "A-entry"; then
  echo "FAIL: B's pop did not consume A's entry"; exit 1
fi
echo "PASS: stash stack is shared across worktrees; B consumed A's entry"
