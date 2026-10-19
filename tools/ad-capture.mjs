// Deterministic capture of landing/ad/index.html: steps window.__ad.render(t) per frame.
// usage: PLAYWRIGHT=/path/to/playwright node tools/ad-capture.mjs OUT_DIR [workers] [stills-csv]
// ponytail: Playwright is not a dependency of this repo; point PLAYWRIGHT at any install (and
// CHROMIUM at a headless shell if its bundled browser is missing). The ad renders a few times a year.
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const root = resolve(new URL('..', import.meta.url).pathname);
const [out = 'frames', workers = '2', stillsCsv] = process.argv.slice(2);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = createServer((q, r) => {
  const p = join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!existsSync(p) || statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); r.end(readFileSync(p));
});
await new Promise(r => srv.listen(0, r));
const url = `http://localhost:${srv.address().port}/landing/ad/index.html?capture`;
mkdirSync(out, { recursive: true });

async function worker(frames) {
  const b = await chromium.launch({ headless: true, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await pg.goto(url); await pg.evaluate(() => window.__ad.ready);
  for (const [i, t] of frames) {
    await pg.evaluate(t => window.__ad.render(t), t);
    await pg.screenshot({ path: join(out, stillsCsv ? `still-${t}.png` : `f${String(i).padStart(4, '0')}.jpg`), ...(stillsCsv ? {} : { type: 'jpeg', quality: 92 }) });
  }
  await b.close();
}

const fps = 30, dur = 30;
const all = stillsCsv ? stillsCsv.split(',').map((t, i) => [i, +t]) : Array.from({ length: fps * dur }, (_, i) => [i, i / fps]);
const buckets = Array.from({ length: +workers }, () => []);
all.forEach((f, i) => buckets[i % buckets.length].push(f));
await Promise.all(buckets.map(worker));
srv.close();
console.log('frames', all.length);
