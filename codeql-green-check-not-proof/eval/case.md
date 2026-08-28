# Case: green check versus per-ref alert count

**Runnable:** yes, with authenticated `gh` and a repo that has code scanning and
at least one open alert. No such fixture is pinned here, so unverified.

## Assertions
1. A PR whose check is green has a non-zero open-alert count on
   `refs/pull/N/merge`. (Green does not mean clean.)
2. Counting with `per_page=100` and no truncation yields the same number twice
   in a row; counting after `head -40` yields a different number when the repo
   has more than 40 alerts. This is the trap that produced a false regression
   report, so assert it rather than trusting discipline.
3. An alert whose `tool.name` is an uploaded SARIF scanner has `state: null` and
   is absent from the default-branch listing.
4. The newest analysis timestamp for the default branch is within the expected
   scan interval — otherwise every count below is stale and assertions 1-3 mean
   nothing.

Assertion 4 gates the rest. Run it first.
