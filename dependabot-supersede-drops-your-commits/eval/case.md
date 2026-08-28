# Case: recognising a superseded PR

**Runnable:** partially. The state-discrimination assertions run against any
repo with Dependabot history. Forcing a supersede on demand is not possible, so
the causal claim stays field-observed.

## Assertions (runnable)
1. For a known superseded PR, `gh api ... --jq '{state,merged}'` returns
   `state: "closed"`, `merged: false` — distinguishable from a merged PR, which
   returns `merged: true`.
2. Its head branch 404s on `gh api repos/O/R/branches/<head>` — deleted, not
   merely closed.
3. The replacement PR's diff touches only manifest and lockfile paths. This is
   the assertion that captures the damage: any non-manifest file present in the
   original and absent from the replacement is a dropped commit.

## Not runnable
That Dependabot *will* supersede on a base change. Observed once, cannot be
triggered.
