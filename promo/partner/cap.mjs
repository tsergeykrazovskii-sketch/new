import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
const { chromium } = await import(process.env.PLAYWRIGHT ? (await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
const here = new URL('.', import.meta.url).pathname;
const dist = path.resolve(here, '../../dist');
process.chdir(here);
fs.mkdirSync('shots', { recursive: true });
const T = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml','.json':'application/json' };
const srv = http.createServer((q, r) => { let p = path.join(dist, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) return r.writeHead(404).end(); r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p)); });
await new Promise((r) => srv.listen(8801, '127.0.0.1', r));
const B = 'http://127.0.0.1:8801/';
const br = await chromium.launch();
const errs = [];
const route = async (page) => page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (rt) => { const u = new URL(rt.request().url()); const l = path.join(dist, decodeURIComponent(u.pathname)); if (fs.existsSync(l) && fs.statSync(l).isFile()) return rt.fulfill({ contentType: T[path.extname(l)], body: fs.readFileSync(l) }); return rt.abort(); });
const hide = '.demo,.cookie,[data-cookie]{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important}';
const only = process.argv.slice(2);
for (const n of (only.length ? only : ['auto','barber','nails','grooming','massage'])) {
  // телефон: первый экран и виджет
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); await route(p); p.on('pageerror', (e) => errs.push(n + ': ' + e.message));
  await p.goto(B + n + '/', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: hide }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: `shots/${n}-m-hero.png` });
  const mb = await p.addStyleTag({ content: '.mbar,.hdr{visibility:hidden!important}' });
  const qw = await p.$('.qw'); if (qw) { await qw.scrollIntoViewIfNeeded(); await p.waitForTimeout(200); await qw.screenshot({ path: `shots/${n}-widget.png` }); }
  // запись
  await mb.evaluate((el) => el.remove());
  await p.evaluate(() => scrollTo(0, 0));
  await p.click('.hdr__book, [data-book]'); await p.waitForTimeout(600);
  await p.screenshot({ path: `shots/${n}-m-book.png` });
  await ctx.close();
  // десктоп
  const c2 = await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const d = await c2.newPage(); await route(d);
  await d.goto(B + n + '/', { waitUntil: 'networkidle' }); await d.addStyleTag({ content: hide + '.qw__date,.hdr .status{display:none!important}' }); await d.evaluate(() => document.fonts.ready); await d.waitForTimeout(300);
  await d.screenshot({ path: `shots/${n}-d-hero.png` });
  await c2.close();
}
console.log(errs.join('\n') || 'no errors');
await br.close(); srv.close();
