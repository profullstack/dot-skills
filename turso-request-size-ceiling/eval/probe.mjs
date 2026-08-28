// Re-probe the transport ceiling. Read-only: writes nothing.
// Usage: node --env-file=.env eval/probe.mjs
// Runnable: yes, with TURSO_DATABASE_URL + TURSO_AUTH_TOKEN. No creds here.
const url = process.env.TURSO_DATABASE_URL;
if (!url) { console.error('SKIP: no TURSO_DATABASE_URL'); process.exit(77); }

let createClient;
try { ({ createClient } = await import('@libsql/client')); }
catch { console.error('SKIP: @libsql/client not installed'); process.exit(77); }

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const MIB = 1024 * 1024;
let ceiling = 0;
for (const mib of [0.5, 1, 2, 4, 8, 16, 32, 64]) {
  const payload = 'x'.repeat(Math.floor(mib * MIB));
  const t0 = process.hrtime.bigint();
  try {
    const r = await db.execute({ sql: 'select length(?) as n', args: [payload] });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (Number(r.rows[0].n) !== payload.length) { console.error(`FAIL: ${mib} MiB truncated`); process.exit(1); }
    console.log(`ok  ${String(mib).padStart(4)} MiB  ${ms.toFixed(0)}ms`);
    ceiling = mib;
  } catch (e) {
    console.log(`ceiling reached above ${ceiling} MiB, below ${mib} MiB: ${e.message}`);
    break;
  }
}
console.log(`PASS: bound argument of at least ${ceiling} MiB accepted`);
