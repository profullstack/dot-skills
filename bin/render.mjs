#!/usr/bin/env node
// Renders profile.html from skills.json. The page is derived, so it cannot
// claim anything the index does not already carry.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(ROOT, 'skills.json'), 'utf8'));
const e = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const LEVELS = [
  { id: 'notarised',      label: 'Notarised',      blurb: 'A third party ran the eval and signed the result. The only tier that is a credential.' },
  { id: 'self-verified',  label: 'Self-verified',  blurb: 'An eval case runs and passes here, bound to this exact file.' },
  { id: 'field-observed', label: 'Field-observed', blurb: 'The fix was seen to work in production. Real, but not reproducible on demand.' },
  { id: 'asserted',       label: 'Asserted',       blurb: 'Written down and nothing more. This is what a LinkedIn skill is.' },
];
const order = Object.fromEntries(LEVELS.map((l, i) => [l.id, i]));
const skills = [...doc.skills].sort((a, b) =>
  order[a.assurance.level] - order[b.assurance.level] || a.name.localeCompare(b.name));
const count = (id) => doc.skills.filter((s) => s.assurance.level === id).length;
const total = doc.skills.length;

const bar = LEVELS.filter((l) => count(l.id)).map((l) =>
  `<span class="seg" data-level="${l.id}" style="flex:${count(l.id)}"><span class="sr">${count(l.id)} ${l.label}</span></span>`).join('');

const legend = LEVELS.map((l) => `
      <li data-level="${l.id}">
        <span class="dot"></span>
        <div>
          <p class="lv-name">${l.label} <b>${count(l.id)}</b></p>
          <p class="lv-blurb">${e(l.blurb)}</p>
        </div>
      </li>`).join('');

const row = (s) => {
  const a = s.assurance;
  const r = [...(a.receipts || [])].sort((x, y) => new Date(y.ran_at) - new Date(x.ran_at))[0];
  const meta = [
    a.verified_against && ['Verified against', e(a.verified_against)],
    ['Digest', `<code>${e(s.digest.slice(7, 19))}…</code>`],
    a.eval && ['Eval', `${a.eval.cases} case${a.eval.cases > 1 ? 's' : ''} · ${a.eval.runnable ? 'executable' : 'declarative'}`],
    s.origin?.discovered_in && ['Paid for in', e(s.origin.discovered_in)],
    r && ['Last run', `${e(r.ran_at.slice(0, 10))} · ${r.passed}/${r.total} · ${e(r.model)}`],
  ].filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');

  return `
      <article class="skill" data-level="${a.level}">
        <div class="stripe" aria-hidden="true"></div>
        <div class="card">
          <header>
            <h3>${e(s.name)}</h3>
            <span class="chip">${e(s.kind)}</span>
            <span class="fresh" data-f="${s.freshness}">${s.freshness}</span>
          </header>
          <p class="desc">${e(s.description)}</p>
          <dl class="meta">${meta}</dl>
          ${(s.domains || []).length ? `<p class="domains">${s.domains.map((d) => `<span>${e(d)}</span>`).join('')}</p>` : ''}
          ${(s.requires || []).length ? `<p class="edge">composes with <b>${s.requires.map(e).join('</b>, <b>')}</b></p>` : ''}
        </div>
      </article>`;
};

const html = `<title>Proof of Skill</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{
  --ground:#F5F7FA; --surface:#FFFFFF; --sunken:#EDF0F5;
  --ink:#171A21; --muted:#5C6676; --faint:#8B94A3; --rule:#DDE2EA;
  --accent:#2B4B8C; --accent-soft:#E7EDF9;
  --lv-notarised:#2B4B8C; --lv-self:#1F7A5C; --lv-field:#8A6A1F; --lv-asserted:#7A8290;
  --shadow:0 1px 2px rgba(23,26,33,.05), 0 8px 24px -16px rgba(23,26,33,.25);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
  --ground:#0E1116; --surface:#161A21; --sunken:#1D222B;
  --ink:#E7EAF0; --muted:#9BA5B4; --faint:#6E7889; --rule:#262D38;
  --accent:#89A9EC; --accent-soft:#1B2537;
  --lv-notarised:#89A9EC; --lv-self:#4FBF95; --lv-field:#D6A94A; --lv-asserted:#8B94A3;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.7);
}
}
:root[data-theme="dark"]{
  --ground:#0E1116; --surface:#161A21; --sunken:#1D222B;
  --ink:#E7EAF0; --muted:#9BA5B4; --faint:#6E7889; --rule:#262D38;
  --accent:#89A9EC; --accent-soft:#1B2537;
  --lv-notarised:#89A9EC; --lv-self:#4FBF95; --lv-field:#D6A94A; --lv-asserted:#8B94A3;
  --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px -16px rgba(0,0,0,.7);
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
  font:400 16px/1.6 "IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  -webkit-font-smoothing:antialiased}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.wrap{max-width:1180px;margin:0 auto;padding:clamp(28px,5vw,64px) clamp(20px,4vw,40px) 96px}

.masthead{border-bottom:1px solid var(--rule);padding-bottom:28px;margin-bottom:36px}
.eyebrow{font:500 11px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;
  color:var(--accent);margin:0 0 18px}
.masthead h1{font:600 clamp(34px,5.2vw,52px)/1.05 Newsreader,Georgia,serif;letter-spacing:-.015em;
  margin:0 0 10px;text-wrap:balance}
.headline{font:italic 400 clamp(17px,2.2vw,20px)/1.45 Newsreader,Georgia,serif;
  color:var(--muted);margin:0 0 22px;max-width:52ch}
.ident{display:flex;flex-wrap:wrap;gap:8px 22px;font:400 13px/1.5 "IBM Plex Mono",monospace;color:var(--faint)}
.ident b{color:var(--muted);font-weight:500}

.thesis{background:var(--surface);border:1px solid var(--rule);border-radius:3px;
  padding:clamp(20px,3vw,30px);margin-bottom:40px;box-shadow:var(--shadow)}
.thesis h2{font:600 20px/1.3 Newsreader,Georgia,serif;margin:0 0 8px}
.thesis > p{color:var(--muted);margin:0 0 22px;max-width:66ch;font-size:15px}
.bar{display:flex;height:9px;border-radius:2px;overflow:hidden;gap:2px;margin-bottom:22px}
.seg{display:block}
.seg[data-level="notarised"]{background:var(--lv-notarised)}
.seg[data-level="self-verified"]{background:var(--lv-self)}
.seg[data-level="field-observed"]{background:var(--lv-field)}
.seg[data-level="asserted"]{background:var(--lv-asserted)}
.ladder{list-style:none;margin:0;padding:0;display:grid;gap:14px;
  grid-template-columns:repeat(auto-fit,minmax(215px,1fr))}
.ladder li{display:flex;gap:10px;align-items:flex-start}
.dot{width:9px;height:9px;border-radius:50%;margin-top:6px;flex:none;background:var(--lv-asserted)}
li[data-level="notarised"] .dot{background:var(--lv-notarised)}
li[data-level="self-verified"] .dot{background:var(--lv-self)}
li[data-level="field-observed"] .dot{background:var(--lv-field)}
.lv-name{margin:0 0 3px;font-weight:600;font-size:14px}
.lv-name b{font:500 12px/1 "IBM Plex Mono",monospace;color:var(--faint);margin-left:4px}
.lv-blurb{margin:0;font-size:13px;line-height:1.5;color:var(--muted)}

.sect{font:500 11px/1 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;
  color:var(--faint);margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid var(--rule)}
.list{display:grid;gap:14px}
.skill{display:flex;background:var(--surface);border:1px solid var(--rule);border-radius:3px;
  overflow:hidden;box-shadow:var(--shadow)}
.stripe{width:3px;flex:none;background:var(--lv-asserted)}
.skill[data-level="notarised"] .stripe{background:var(--lv-notarised)}
.skill[data-level="self-verified"] .stripe{background:var(--lv-self)}
.skill[data-level="field-observed"] .stripe{background:var(--lv-field)}
.card{padding:18px 22px 20px;flex:1;min-width:0}
.card header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;margin-bottom:7px}
.card h3{font:500 17px/1.3 "IBM Plex Mono",monospace;margin:0;letter-spacing:-.01em;word-break:break-word}
.chip{font:500 10px/1 "IBM Plex Mono",monospace;letter-spacing:.09em;text-transform:uppercase;
  color:var(--accent);background:var(--accent-soft);padding:4px 7px;border-radius:2px}
.fresh{margin-left:auto;font:500 10px/1 "IBM Plex Mono",monospace;letter-spacing:.09em;
  text-transform:uppercase;color:var(--faint);border:1px solid var(--rule);padding:4px 7px;border-radius:2px}
.fresh[data-f="live"]{color:var(--lv-self);border-color:var(--lv-self)}
.fresh[data-f="dormant"]{color:var(--lv-field);border-color:var(--lv-field)}
.desc{margin:0 0 14px;color:var(--muted);font-size:14.5px;max-width:74ch}
.meta{display:grid;gap:6px 26px;grid-template-columns:repeat(auto-fit,minmax(190px,auto));
  margin:0 0 12px;justify-content:start}
.meta div{display:flex;gap:8px;font-size:12.5px;min-width:0}
.meta dt{color:var(--faint);flex:none}
.meta dd{margin:0;color:var(--muted);font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.meta code{font:400 12px/1 "IBM Plex Mono",monospace;background:var(--sunken);padding:2px 5px;border-radius:2px}
.domains{display:flex;flex-wrap:wrap;gap:6px;margin:0}
.domains span{font:400 11px/1 "IBM Plex Mono",monospace;color:var(--faint);
  border:1px solid var(--rule);padding:4px 7px;border-radius:2px}
.edge{margin:11px 0 0;font-size:12.5px;color:var(--faint)}
.edge b{font:500 12.5px/1 "IBM Plex Mono",monospace;color:var(--muted);font-weight:500}

.note{margin-top:40px;padding:22px 24px;border:1px solid var(--rule);border-left:3px solid var(--accent);
  border-radius:3px;background:var(--surface)}
.note h2{font:600 17px/1.3 Newsreader,Georgia,serif;margin:0 0 8px}
.note p{margin:0 0 10px;color:var(--muted);font-size:14.5px;max-width:70ch}
.note p:last-child{margin-bottom:0}
.note code{font:400 13px/1 "IBM Plex Mono",monospace;background:var(--sunken);padding:2px 5px;border-radius:2px}
footer{margin-top:44px;padding-top:20px;border-top:1px solid var(--rule);
  font:400 12px/1.6 "IBM Plex Mono",monospace;color:var(--faint)}
@media (max-width:620px){ .fresh{margin-left:0} }
</style>

<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">skills.json · v${e(doc.version)}</p>
    <h1>${e(doc.profile.name)}</h1>
    <p class="headline">${e(doc.profile.headline)}</p>
    <div class="ident">
      <span><b>${total}</b> skills</span>
      <span><b>${e(doc.profile.kind)}</b> profile</span>
      <span>${e(doc.profile.links[0].href)}</span>
      <span>generated ${e(doc.generated_at.slice(0, 10))}</span>
    </div>
  </header>

  <section class="thesis">
    <h2>Every skill states how much it has actually been proven</h2>
    <p>A skill file is executable, so a claim about it can be run rather than endorsed.
       Each entry below sits on one of four rungs. Most of this profile is on the third:
       these failure modes were paid for in production, but only two can be reproduced on
       demand today. Saying so is the point — a profile where everything looked verified
       would be the untrustworthy one.</p>
    <div class="bar" role="img" aria-label="Distribution of skills across assurance levels">${bar}</div>
    <ul class="ladder">${legend}</ul>
  </section>

  <h2 class="sect">Skills · strongest assurance first</h2>
  <div class="list">${skills.map(row).join('')}</div>

  <section class="note">
    <h2>Why a receipt is bound to a hash</h2>
    <p>Each receipt records the <code>SKILL.md</code> digest it attests to. Edit a skill and its
       receipts stop matching, so the entry drops from self-verified back to field-observed
       until the eval is run again. Verified content cannot be quietly swapped for different
       content — the property that makes the ladder worth reading.</p>
    <p>One entry earned its rung the hard way. <code>fts5-raw-input-is-a-query</code> claimed for
       four months that a hyphen made SQLite parse <code>catch-all</code> as <code>catch NOT all</code>.
       Running the case showed it raises <code>no such column: all</code> instead. The prose was
       wrong, the eval caught it in one run, and the skill now documents measured behaviour.</p>
    <p>No entry is notarised, because nothing here has been run by anyone but its author.
       Self-reported receipts are still self-reported. That rung stays empty until someone
       else's runner signs a result.</p>
  </section>

  <footer>Rendered from skills.json · discoverable at /.well-known/skills.json · rebuild with bin/build.mjs, verify with bin/verify.mjs</footer>
</div>
`;
writeFileSync(join(ROOT, 'profile.html'), html);
console.log(`profile.html: ${total} skills, ${(html.length / 1024).toFixed(1)} KB`);
