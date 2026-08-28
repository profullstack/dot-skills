---
description: CRUD and distribution for a .skills directory of verifiable agent skills
argument-hint: list | show <name> | new <name> | rm <name> --force | verify [name] | build | install | uninstall
allowed-tools: Bash(skills:*), Bash(node:*), Read, Write, Edit
---

Run the `skills` CLI with the arguments below and report what it printed.

```
$ARGUMENTS
```

If no arguments were given, run `skills list`.

## What the verbs do

- `list` — every skill with its assurance level and freshness
- `show <name>` — print one SKILL.md
- `new <name> [--kind diagnostic|constraint|procedure|recipe]` — scaffold a skill
- `rm <name> --force` — delete a skill and its receipts
- `verify [name]` — run executable evals, write receipts, rebuild the index
- `build` — regenerate skills.json and profile.html
- `install [names…] [--engine claude|kimi|all] [--dry-run]` — copy into engine skill dirs
- `uninstall [--dry-run]` — remove only what this tool installed

## Rules that matter

**Never hand-edit `skills.json`, `profile.html`, or anything in `receipts/`.**
They are generated. Edit a `SKILL.md`, then run `skills build`.

**A receipt is bound to the SKILL.md's sha256.** Editing a skill invalidates its
receipts and drops it back to `field-observed` until `skills verify` passes
again. That is correct behaviour, not a bug — if you edit a verified skill,
re-run the eval rather than restoring the old receipt.

**Do not raise an assurance level by hand.** The level is derived: it comes from
whether an eval actually ran, never from what the frontmatter claims. If a skill
should be `self-verified`, write an executable eval under its `eval/` directory
(`.sh` or `.mjs`, exit 0 on pass, exit 77 when preconditions like credentials are
absent) and run `skills verify`.

**When writing a new skill**, the eval is the point, not the prose. Prefer an
assertion that can fail over a paragraph that sounds right — one skill here was
carrying a wrong claim for four months and its own eval caught it in one run.
If the claim genuinely cannot be reproduced, say so in `eval/case.md` and let it
sit at `field-observed`. An honest rung beats an inflated one.
