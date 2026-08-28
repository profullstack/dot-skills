#!/usr/bin/env node
// skills - CRUD and distribution for a .skills/ directory.
//
// moshcode's `skill install <url>` clones one repo into one skill directory,
// which is the right model for a single skill and the wrong one for a
// collection: the SKILL.md files here sit one level deeper than any engine
// scans. This installs each skill individually instead.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, cpSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MARKER = '.installed-by-skills';
const RESERVED = ['schema', 'bin', 'receipts', 'commands', 'node_modules', '.github'];

const engines = () => ({
  claude: join(homedir(), '.claude', 'skills'),
  kimi: join(process.env.KIMI_CODE_HOME || join(homedir(), '.kimi-code'), 'skills'),
});

const list = () => readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !RESERVED.includes(d.name))
  .map((d) => d.name).sort();

const index = () => existsSync(join(ROOT, 'skills.json'))
  ? JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8')) : { skills: [] };

const run = (script) => execFileSync(process.execPath, [join(ROOT, 'bin', script)], { stdio: 'inherit' });
const die = (msg) => { console.error(`skills: ${msg}`); process.exit(1); };
const has = (n) => existsSync(join(ROOT, n, 'SKILL.md'));

const MARK = {
  notarised: '◆', 'self-verified': '●', 'field-observed': '◐', asserted: '○',
};

/* ---------------------------------------------------------------- read --- */

function cmdList() {
  const doc = index();
  const width = Math.max(...doc.skills.map((s) => s.name.length), 4);
  for (const s of doc.skills) {
    const a = s.assurance;
    console.log(`${MARK[a.level] || '?'} ${s.name.padEnd(width)}  ${a.level.padEnd(14)} ${String(s.freshness).padEnd(9)} ${s.kind}`);
  }
  const by = (l) => doc.skills.filter((s) => s.assurance.level === l).length;
  console.log(`\n${doc.skills.length} skills — ${by('notarised')} notarised, ${by('self-verified')} self-verified, ${by('field-observed')} field-observed, ${by('asserted')} asserted`);
}

function cmdShow(name) {
  if (!name) die('show needs a skill name');
  if (!has(name)) die(`no such skill: ${name}`);
  process.stdout.write(readFileSync(join(ROOT, name, 'SKILL.md'), 'utf8'));
  const s = index().skills.find((x) => x.name === name);
  if (s) console.log(`\n--- ${s.assurance.level} / ${s.freshness} · digest ${s.digest.slice(7, 19)}…`);
}

/* -------------------------------------------------------------- create --- */

const TEMPLATE = (name, kind) => `---
name: ${name}
description: ONE sentence naming the failure mode, then "Use when ..." so an agent knows the trigger.
kind: ${kind}
domains: []
requires: []
origin:
  authored: ${new Date().toISOString().slice(0, 10)}
  discovered_in: ""
  evidence: ""
assurance:
  verified_against: ""
  stale_after_days: 365
---

## Trigger

When an agent should reach for this. Be concrete about the symptom.

## The rule

What is actually true. Measured behaviour beats remembered behaviour.

## Why it misleads

Optional, and usually the most valuable section: what the symptom looks like
before you know the cause.

## How to apply

The fix, with the shortest code or command that carries it.

## Evidence

Point at eval/. Say plainly what can and cannot be reproduced.
`;

const CASE = (name) => `# Case: ${name}

**Runnable:** no — say what is missing (credentials, a server, a browser).

## Assertions
1. The claim, stated so it can fail.
2. A guard against the over-broad reading of the skill.

## Passes when
All assertions hold. Name the one most likely to drift as its ecosystem moves.
`;

function cmdNew(name, argv) {
  if (!name) die('new needs a skill name');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) die(`name must be kebab-case: ${name}`);
  if (existsSync(join(ROOT, name))) die(`already exists: ${name}`);
  const kind = argv.kind || 'diagnostic';
  if (!['diagnostic', 'constraint', 'procedure', 'recipe'].includes(kind)) die(`kind must be diagnostic|constraint|procedure|recipe`);
  mkdirSync(join(ROOT, name, 'eval'), { recursive: true });
  writeFileSync(join(ROOT, name, 'SKILL.md'), TEMPLATE(name, kind));
  writeFileSync(join(ROOT, name, 'eval', 'case.md'), CASE(name));
  console.log(`created ${name}/SKILL.md and ${name}/eval/case.md`);
  console.log(`it will index as "asserted" until origin.evidence or a passing eval exists`);
  run('build.mjs');
}

/* -------------------------------------------------------------- delete --- */

function cmdRm(name, argv) {
  if (!name) die('rm needs a skill name');
  if (!has(name)) die(`no such skill: ${name}`);
  if (!argv.force) die(`refusing to delete ${name} without --force`);
  rmSync(join(ROOT, name), { recursive: true, force: true });
  rmSync(join(ROOT, 'receipts', `${name}.json`), { force: true });
  console.log(`removed ${name} and its receipts`);
  run('build.mjs'); run('render.mjs');
}

/* ---------------------------------------------------------- distribute --- */

function cmdInstall(argv) {
  const targets = engines();
  const want = argv.engine && argv.engine !== 'all' ? { [argv.engine]: targets[argv.engine] } : targets;
  if (Object.values(want).some((v) => !v)) die(`unknown engine: ${argv.engine}`);

  const names = argv._.length ? argv._ : list();
  for (const n of names) if (!has(n)) die(`no such skill: ${n}`);

  for (const [engine, dir] of Object.entries(want)) {
    // Only install where the engine actually lives. Creating ~/.kimi-code for
    // someone who does not use Kimi is litter, not helpfulness.
    if (!existsSync(dirname(dir))) { console.log(`skip ${engine}: ${dirname(dir)} not present`); continue; }
    let done = 0, kept = 0;
    for (const n of names) {
      const dest = join(dir, n);
      // Never overwrite a directory this tool did not create: a name collision
      // with someone's own skill must not silently eat it.
      if (existsSync(dest) && !existsSync(join(dest, MARKER))) { console.log(`  keep ${n}: exists and was not installed by skills`); kept++; continue; }
      if (argv['dry-run']) { console.log(`  would install ${n} -> ${dest}`); done++; continue; }
      rmSync(dest, { recursive: true, force: true });
      mkdirSync(dest, { recursive: true });
      cpSync(join(ROOT, n, 'SKILL.md'), join(dest, 'SKILL.md'));
      if (existsSync(join(ROOT, n, 'eval'))) cpSync(join(ROOT, n, 'eval'), join(dest, 'eval'), { recursive: true });
      writeFileSync(join(dest, MARKER), `${new Date().toISOString()}\n`);
      done++;
    }
    console.log(`${engine}: ${done} skill(s) ${argv['dry-run'] ? 'would be installed' : 'installed'} to ${dir}${kept ? `, ${kept} left alone` : ''}`);
  }

  // The slash command is Claude-only; other engines have no equivalent surface.
  const cmdSrc = join(ROOT, 'commands', 'skills.md');
  if (want.claude && existsSync(cmdSrc) && existsSync(dirname(want.claude))) {
    const cmdDir = join(dirname(want.claude), 'commands');
    const dest = join(cmdDir, 'skills.md');
    if (argv['dry-run']) console.log(`  would install /skills -> ${dest}`);
    else { mkdirSync(cmdDir, { recursive: true }); cpSync(cmdSrc, dest); console.log(`claude: /skills command installed to ${dest}`); }
  }
}

function cmdUninstall(argv) {
  for (const [engine, dir] of Object.entries(engines())) {
    if (!existsSync(dir)) continue;
    let n = 0;
    for (const d of readdirSync(dir)) {
      const p = join(dir, d);
      if (!statSync(p).isDirectory() || !existsSync(join(p, MARKER))) continue;
      if (argv['dry-run']) console.log(`  would remove ${p}`); else rmSync(p, { recursive: true, force: true });
      n++;
    }
    console.log(`${engine}: ${n} skill(s) ${argv['dry-run'] ? 'would be removed' : 'removed'}`);
  }
}

/* ---------------------------------------------------------------- main --- */

const HELP = `skills — CRUD and distribution for a .skills/ directory

  skills list                     every skill with its assurance level
  skills show <name>              print one SKILL.md
  skills new <name> [--kind K]    scaffold a skill (K: diagnostic|constraint|procedure|recipe)
  skills rm <name> --force        delete a skill and its receipts
  skills verify [name]            run evals, write receipts, rebuild
  skills build                    regenerate skills.json and profile.html
  skills install [names…]         copy skills into each engine's skills dir
    --engine claude|kimi|all      default all present
    --dry-run                     show what would happen
  skills uninstall [--dry-run]    remove only what skills installed

Assurance: ${MARK.notarised} notarised  ${MARK['self-verified']} self-verified  ${MARK['field-observed']} field-observed  ${MARK.asserted} asserted`;

const raw = process.argv.slice(2);
const argv = { _: [] };
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    argv[k] = v ?? (raw[i + 1] && !raw[i + 1].startsWith('-') && k !== 'dry-run' && k !== 'force' ? raw[++i] : true);
  } else argv._.push(a);
}
const [verb, ...rest] = argv._;
argv._ = rest;

switch (verb) {
  case 'list': case 'ls': cmdList(); break;
  case 'show': case 'cat': cmdShow(rest[0]); break;
  case 'new': case 'create': cmdNew(rest[0], argv); break;
  case 'rm': case 'delete': cmdRm(rest[0], argv); break;
  case 'verify': rest[0] ? execFileSync(process.execPath, [join(ROOT, 'bin', 'verify.mjs'), rest[0]], { stdio: 'inherit' }) : run('verify.mjs'); break;
  case 'build': run('build.mjs'); run('render.mjs'); break;
  case 'install': cmdInstall(argv); break;
  case 'uninstall': cmdUninstall(argv); break;
  case undefined: case 'help': case '--help': case '-h': console.log(HELP); break;
  default: die(`unknown command: ${verb}\n\n${HELP}`);
}
