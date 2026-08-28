// Asserts the FTS5 claim end-to-end against a real in-process SQLite.
// Requires Node 24+ (node:sqlite stable; Node 22 needs --experimental-sqlite).
// Exit 0 = claim holds.
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');
db.exec(`CREATE VIRTUAL TABLE docs USING fts5(body);`);
const ins = db.prepare('INSERT INTO docs(body) VALUES (?)');
ins.run('handling a catch-all route in node.js when TypeError is thrown in C# 1.3.14');
ins.run('unrelated document about gardening and compost');

function toFtsQuery(input) {
  return String(input).toLowerCase().split(/[^a-z0-9_.+#]+/).filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"`);
}
const run = (q) => db.prepare('SELECT count(*) c FROM docs WHERE docs MATCH ?').get(q).c;
const err = (q) => { try { run(q); return null; } catch (e) { return e.message; } };

let fails = 0;
const check = (ok, msg) => { if (!ok) { console.error('FAIL:', msg); fails++; } };

// 1. Raw punctuation is an error, with the documented message.
const HOSTILE = {
  'catch-all':       /no such column: all/,
  'TypeError: x':    /no such column: TypeError/,
  'foo(bar':         /syntax error/,
  'node.js':         /syntax error near "\."/,
  '1.3.14':          /syntax error near "\."/,
  'C#':              /syntax error near "#"/,
  'why "this fails': /unterminated string/,
};
for (const [input, pattern] of Object.entries(HOSTILE)) {
  const m = err(input);
  check(m !== null, `raw ${JSON.stringify(input)} should error`);
  check(m && pattern.test(m), `raw ${JSON.stringify(input)} message ${JSON.stringify(m)} !~ ${pattern}`);
}

// 2. Balanced quotes are legal - it is the unbalanced quote that breaks.
check(err('why "this" fails') === null, 'balanced quotes must parse');

// 3. Tokenising makes every hostile input valid.
for (const input of Object.keys(HOSTILE)) {
  const m = err(toFtsQuery(input).join(' AND '));
  check(m === null, `tokenised ${JSON.stringify(input)} still errored: ${m}`);
}

// 4. Quoted dot/hash tokens survive AND still match.
check(toFtsQuery('node.js 1.3.14 C#').join(' ') === '"node.js" "1.3.14" "c#"',
  'dots, plus and hash must stay inside tokens');
for (const q of ['"node.js"', '"1.3.14"', '"c#"', '"catch-all"']) {
  check(run(q) === 1, `${q} should match the seeded document`);
}

// 5. AND-then-OR ladder: a pasted traceback misses under AND, hits under OR.
const paste = 'TypeError: catch-all route exploded at /srv/app/dist/handler.js:1075:22';
const toks = toFtsQuery(paste);
check(run(toks.join(' AND ')) === 0, 'AND alone should miss a long paste');
check(run(toks.join(' OR ')) > 0, 'OR fallback should find the document');

if (fails) { console.error(`${fails} assertion(s) failed`); process.exit(1); }
console.log(`PASS: ${Object.keys(HOSTILE).length} hostile inputs error as documented, all tokenise clean, AND-then-OR ladder resolves a paste`);
