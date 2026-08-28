# .skills

A portable, verifiable inventory of agent-executable skills.

A `SKILL.md` file is instructions plus a trigger condition. Because it is
executable, a claim about it can be **run** rather than endorsed — which is the
one thing a LinkedIn skill can never be. This repository is the format for
publishing such an inventory, plus a working example.

## The idea

Self-asserted skills are worthless because nothing about the token can be
checked. So every entry here carries an **assurance level**, and the level is
derived from evidence on disk rather than claimed by the author:

| level | meaning |
|---|---|
| `notarised` | A third party ran the eval and signed the result. The only tier that is a credential. |
| `self-verified` | An eval case runs and passes, bound to this exact file. |
| `field-observed` | The fix was seen to work in production. Real, but not reproducible on demand. |
| `asserted` | Written down and nothing more. This is what a LinkedIn skill is. |

A receipt records the sha256 of the `SKILL.md` it attests to. Edit the skill and
its receipts stop matching, so the entry drops back a rung until the eval is run
again. Verified content cannot be quietly swapped for different content.

Skills also go **stale**. Each declares `stale_after_days` appropriate to its
domain — a git ref constraint ages slowly, a hosted-API measurement ages fast —
and an entry whose verification has aged out renders as `overdue` rather than
staying green forever.

## Layout

```
.skills/
  skills.json                  generated index, never hand-edited
  schema/                      the JSON Schema for skills.json
  bin/build.mjs                SKILL.md files + receipts -> skills.json
  bin/verify.mjs               runs executable evals -> receipts/
  bin/render.mjs               skills.json -> profile.html
  receipts/<skill>.json        digest-bound run records
  <skill-name>/
    SKILL.md                   frontmatter + prose
    eval/                      .sh / .mjs are executable; case.md is declarative
```

`SKILL.md` frontmatter keeps the `name` and `description` fields Claude Code
already reads, so these files are drop-in usable as agent skills. Everything
else is additive.

## Discovery

Publish `skills.json` at a domain you control:

```
GET https://example.com/.well-known/skills.json
```

so the profile is self-hosted rather than platform-held. Humans and agents
publish the same document — `profile.kind` is `human`, `agent` or `team`.

## Usage

```sh
node bin/verify.mjs            # run every executable eval, write receipts
node bin/verify.mjs <skill>    # just one
node bin/build.mjs             # regenerate skills.json
node bin/render.mjs            # regenerate profile.html
```

`build.mjs` fails loudly on a `requires` edge pointing at a skill that does not
exist — the graph is checked, not decorative. `verify.mjs` treats exit code 77
as "preconditions absent" (no credentials, no server): a skip, which mints no
receipt, rather than a failure.

## The example profile

The thirteen skills here are real failure modes paid for in production. The
current tally is 2 self-verified, 11 field-observed, 0 notarised, and that split
is deliberate: a profile where everything looked verified would be the
untrustworthy one.

Nothing is notarised because nothing here has been run by anyone but its author.
Self-reported receipts are still self-reported.

## One entry earned its rung the hard way

`fts5-raw-input-is-a-query` claimed for four months that SQLite parsed
`catch-all` as `catch NOT all` because `-` was a NOT operator. Running the case
showed `-` prefixes a column-exclusion filter and the input raises
`no such column: all`. The prose was wrong, the eval caught it in one run, and
the skill now documents measured behaviour.

That is the argument for the whole format, in one file.

## Status

v0. The schema will change. The open question is who notaries — a receipt signed
by its own author is the problem this format exists to solve, not the solution.
