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

## Install

```sh
npx github:profullstack/dot-skills install
```

Not yet on npm, so install from the repository. Verified working end to end,
including the `/skills` command.

That copies each skill into every engine skills directory present on the
machine (`~/.claude/skills`, `$KIMI_CODE_HOME/skills`) and installs a `/skills`
slash command for Claude Code. `install` never overwrites a directory it did not
create, and `uninstall` removes only what it installed.

**Why not `moshcode skill install`?** That clones one repository into one skill
directory, which is right for a single skill and wrong for a collection: every
engine scans `<skills-dir>/<name>/SKILL.md` at exactly one level, so cloning
this repo whole buries thirteen skills one level too deep and installs nothing
discoverable. Same reason a plain `git clone` into `~/.claude/skills` does not
work. The skills have to be fanned out individually, which is what this does.

## Usage

```sh
skills list                     # every skill with its assurance level
skills show <name>              # print one SKILL.md
skills new <name> [--kind K]    # scaffold (diagnostic|constraint|procedure|recipe)
skills rm <name> --force        # delete a skill and its receipts
skills verify [name]            # run evals, write receipts, rebuild
skills build                    # regenerate skills.json and profile.html
skills install [--dry-run]      # fan out into engine skills dirs
skills uninstall [--dry-run]    # remove only what skills installed
```

In Claude Code the same verbs are available as `/skills <verb>`.

A scaffolded skill starts at `asserted`, and nothing in the frontmatter can
raise that: the level is derived from whether an eval actually ran.

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
