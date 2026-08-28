#!/usr/bin/env node
// Generates skills.json from the SKILL.md files and any receipts on disk.
// The index is derived, never hand-edited: digests and freshness must not be
// assertable by the profile's author.
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date(process.env.SOURCE_DATE || '2026-08-28T00:00:00Z');

/* Minimal YAML-subset parser: scalars, nested maps, inline arrays. */
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error('no frontmatter');
  const lines = m[1].split('\n').filter((l) => l.trim() && !l.trim().startsWith('#'));
  const root = {};
  const stack = [{ indent: -1, node: root }];
  for (const line of lines) {
    const indent = line.length - line.trimStart().length;
    const [, key, rest] = line.trim().match(/^([A-Za-z_][\w-]*):\s*(.*)$/) || [];
    if (!key) continue;
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    if (rest === '') { parent[key] = {}; stack.push({ indent, node: parent[key] }); continue; }
    parent[key] = parseScalar(rest);
  }
  return root;
}
function parseScalar(raw) {
  const s = raw.trim();
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return inner ? inner.split(',').map((v) => parseScalar(v)) : [];
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  if (/^-?\d+$/.test(s)) return Number(s);
  return s;
}

const days = (a, b) => Math.floor((a - b) / 86400000);

const skillDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !['schema', 'bin', 'receipts', 'commands', 'node_modules'].includes(d.name))
  .map((d) => d.name).sort();

const skills = [];
for (const name of skillDirs) {
  const mdPath = join(ROOT, name, 'SKILL.md');
  if (!existsSync(mdPath)) { console.warn(`skip ${name}: no SKILL.md`); continue; }
  const raw = readFileSync(mdPath);
  const fm = parseFrontmatter(raw.toString());
  const digest = 'sha256:' + createHash('sha256').update(raw).digest('hex');

  if (fm.name !== name) throw new Error(`${name}: frontmatter name is "${fm.name}"`);

  // Eval discovery: an executable case is .sh/.mjs; case.md is declarative only.
  const evalDir = join(ROOT, name, 'eval');
  const evalFiles = existsSync(evalDir) ? readdirSync(evalDir) : [];
  const executable = evalFiles.filter((f) => /\.(sh|mjs)$/.test(f));
  const evalMeta = evalFiles.length
    ? { path: `${name}/eval`, cases: evalFiles.length, runnable: executable.length > 0 }
    : undefined;

  // Receipts must bind to the CURRENT digest. A receipt for older content is
  // not evidence about this skill, so it is dropped rather than shown stale.
  const rPath = join(ROOT, 'receipts', `${name}.json`);
  const all = existsSync(rPath) ? JSON.parse(readFileSync(rPath, 'utf8')) : [];
  const receipts = all.filter((r) => r.digest === digest && r.passed === r.total && r.total > 0);
  const orphaned = all.length - receipts.length;
  if (orphaned) console.warn(`  ${name}: ${orphaned} receipt(s) dropped - digest moved or run failed`);

  const a = fm.assurance || {};
  const staleAfter = a.stale_after_days ?? 365;
  const latest = receipts.map((r) => new Date(r.ran_at)).sort((x, y) => y - x)[0];

  let level, freshness, lastVerified;
  if (latest) {
    lastVerified = latest.toISOString().slice(0, 10);
    const notarised = receipts.some((r) => r.notary && r.signature);
    level = notarised ? 'notarised' : 'self-verified';
    freshness = days(NOW, latest) <= staleAfter ? 'live' : 'overdue';
  } else if (fm.origin?.evidence) {
    level = 'field-observed';
    freshness = 'dormant';
    lastVerified = a.last_verified;
  } else {
    level = 'asserted';
    freshness = 'unverified';
  }

  skills.push({
    name: fm.name,
    path: `${name}/SKILL.md`,
    description: fm.description,
    digest,
    kind: fm.kind,
    ...(fm.domains ? { domains: fm.domains } : {}),
    ...(fm.requires?.length ? { requires: fm.requires } : {}),
    ...(fm.origin ? { origin: fm.origin } : {}),
    assurance: {
      level,
      ...(a.verified_against ? { verified_against: a.verified_against } : {}),
      ...(lastVerified ? { last_verified: lastVerified } : {}),
      stale_after_days: staleAfter,
      ...(evalMeta ? { eval: evalMeta } : {}),
      receipts,
    },
    freshness,
  });
}

// Referential integrity: a `requires` edge to a skill that does not exist is a
// broken graph, and this format's whole claim is that the graph is real.
const known = new Set(skills.map((s) => s.name));
for (const s of skills) for (const r of s.requires || []) {
  if (!known.has(r)) throw new Error(`${s.name} requires unknown skill "${r}"`);
}

const doc = {
  version: '0',
  generated_at: NOW.toISOString(),
  profile: {
    id: 'https://profullstack.com',
    name: 'Anthony Ettinger',
    kind: 'human',
    headline: 'Failure modes paid for in production, written down so they run.',
    links: [
      { rel: 'self', href: 'https://profullstack.com/.well-known/skills.json' },
      { rel: 'code', href: 'https://github.com/profullstack' },
    ],
  },
  skills,
};

writeFileSync(join(ROOT, 'skills.json'), JSON.stringify(doc, null, 2) + '\n');

const tally = skills.reduce((m, s) => ({ ...m, [s.assurance.level]: (m[s.assurance.level] || 0) + 1 }), {});
console.log(`skills.json: ${skills.length} skills`);
for (const [k, v] of Object.entries(tally)) console.log(`  ${k.padEnd(15)} ${v}`);
