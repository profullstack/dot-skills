# Case: pgArray round-trips where a bare JS array does not

**Runnable:** yes, with `@electric-sql/pglite` (no server, no Docker). Not
installed here, so unverified.

## Assertions
1. `pgArray(['a','b'])` === `{"a","b"}`.
2. `pgArray(['60','1'])` cast `::int[]` round-trips to `[60,1]` — quoting
   numbers is safe.
3. A value containing `"` or `\` round-trips byte-identical (escaping holds).
4. `pgArray([])` cast `::text[]` yields an empty array, not null.
5. `pgArray(null)` and `pgArray(undefined)` both yield `{}` rather than throwing.
6. Binding a bare JS array through Bun's `SQL` raises `22P02`. (Bun-only; skip
   under PGlite and assert in a Bun-tagged test.)

## Passes when
1-5 hold under PGlite. 6 is the claim that decays: if a Bun release fixes the
encoder, this assertion flips and the skill should be retired, not edited.
