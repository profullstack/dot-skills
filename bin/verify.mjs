#!/usr/bin/env node
// Runs every executable eval case and writes a receipt bound to the SKILL.md
// digest at the time of the run. Editing a skill invalidates its receipts,
// which is the property that makes a receipt worth anything.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPTS = join(ROOT, 'receipts');
mkdirSync(RECEIPTS, { recursive: true });

const MODEL = process.env.SKILLS_RUNNER || `node ${process.version} / ${process.platform}`;
const RAN_AT = process.env.SOURCE_DATE || new Date().toISOString();
const only = process.argv[2];

const dirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !['schema', 'bin', 'receipts', 'node_modules'].includes(d.name))
  .map((d) => d.name).sort()
  .filter((n) => !only || n === only);

let ran = 0, passed = 0, skipped = 0;
for (const name of dirs) {
  const evalDir = join(ROOT, name, 'eval');
  if (!existsSync(evalDir)) continue;
  const cases = readdirSync(evalDir).filter((f) => /\.(sh|mjs)$/.test(f));
  if (!cases.length) { skipped++; continue; }

  const digest = 'sha256:' + createHash('sha256').update(readFileSync(join(ROOT, name, 'SKILL.md'))).digest('hex');
  let ok = 0, total = 0, note = '';
  for (const c of cases) {
    total++;
    const file = join(evalDir, c);
    try {
      const out = execFileSync(c.endsWith('.sh') ? 'bash' : process.execPath, [file], {
        encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'],
      });
      ok++;
      console.log(`PASS ${name}/${c}: ${out.trim().split('\n').pop()}`);
    } catch (e) {
      // Exit 77 is the conventional "skip": the case is real but its
      // preconditions (creds, a server) are absent. Not a failure, and it must
      // not mint a receipt either.
      if (e.status === 77) {
        total--; note = 'preconditions absent';
        console.log(`SKIP ${name}/${c}: ${(e.stderr || '').trim() || 'preconditions absent'}`);
      } else {
        console.log(`FAIL ${name}/${c}: ${(e.stdout || e.stderr || e.message).trim().split('\n').slice(-3).join(' | ')}`);
      }
    }
  }
  if (total === 0) { skipped++; continue; }
  ran++; if (ok === total) passed++;

  const rPath = join(RECEIPTS, `${name}.json`);
  const prior = existsSync(rPath) ? JSON.parse(readFileSync(rPath, 'utf8')) : [];
  prior.push({ digest, ran_at: RAN_AT, model: MODEL, passed: ok, total, ...(note ? { note } : {}) });
  writeFileSync(rPath, JSON.stringify(prior, null, 2) + '\n');
}
console.log(`\n${ran} skill(s) executed, ${passed} fully passing, ${skipped} declarative-only`);
