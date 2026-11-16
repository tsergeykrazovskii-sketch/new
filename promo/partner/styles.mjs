// Снимки одного шаблона в разных стилях и в «Своей» теме — для слайда «Оформление под бренд».
// Стиль меняется так же, как у владельца: вкладка «Оформление» демо-админки → «Сохранить»,
// затем страница шаблона показывает сохранённые правки (шаблоны ниш читают их из этого браузера).
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
const { chromium } = await import(process.env.PLAYWRIGHT ? (await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
const here = new URL('.', import.meta.url).pathname;
const dist = path.resolve(here, '../../dist');
process.chdir(here);
fs.mkdirSync('shots', { recursive: true });
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { let p = path.join(dist, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) return r.writeHead(404).end(); r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p)); });
await new Promise((r) => srv.listen(8803, '127.0.0.1', r));
const B = 'http://127.0.0.1:8803/';
const br = await chromium.launch();
const hide = '.demo,[data-cookie]{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important}';

// niche, имя файла, стиль или своя тема { bg, fg, accent, display, body, radius }
const VARIANTS = [
  ['barber', 'classic'], ['barber', 'american'], ['barber', 'tabak'], ['barber', 'sever'],
  ['nails', 'pudra'], ['nails', 'shalfey'], ['nails', 'moloko'],
  ['nails', 'own', { bg: '#F4F1FB', fg: '#2A2140', accent: '#6E4BD8', display: 'unbounded', body: 'manrope' }],
  ['barber', 'own', { bg: '#0F1E2E', fg: '#EEF2F5', accent: '#3FB5A6', display: 'oswald', body: 'inter' }],
];

for (const [niche, name, own] of VARIANTS) {
  const ctx = await br.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'ru-RU' });
  await ctx.addInitScript(() => { try { localStorage.setItem('slot-cookie', '1'); } catch (e) {} });
  const a = await ctx.newPage();
  a.on('pageerror', (e) => console.log('ERR admin', e.message));
  await a.goto(B + niche + '/admin/', { waitUntil: 'networkidle' });
  await a.addStyleTag({ content: hide });
  await a.click('[data-tab="style"]');
  await a.waitForTimeout(500);
  if (!own) {
    await a.locator(`input[name="style"][value="${name}"]`).check({ force: true });
  } else {
    for (const k of ['bg', 'fg', 'accent']) {
      await a.evaluate(([k, v]) => { const i = document.querySelector(`input[data-path="customTheme.${k}"]`); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }, [k, own[k]]);
    }
    await a.selectOption('#f-own-display', own.display);
    await a.selectOption('#f-own-body', own.body);
    await a.waitForTimeout(800);
    await a.evaluate(() => document.querySelector('h3.sub') && [...document.querySelectorAll('h3.sub')].find((h) => h.textContent.includes('Своя')).scrollIntoView());
    await a.waitForTimeout(800);
    await a.screenshot({ path: `shots/style-${niche}-${name}-admin.png` });
  }
  await a.waitForTimeout(600);
  // стиль по умолчанию — сохранять нечего, кнопка выключена
  if (await a.locator('[data-save]').isEnabled()) {
    await a.click('[data-save]');
    await a.waitForTimeout(1500);
  }
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  p.on('pageerror', (e) => console.log('ERR site', e.message));
  await p.goto(B + niche + '/', { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: hide });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const st = await p.evaluate(() => document.querySelector('#app').dataset.style);
  await p.screenshot({ path: `shots/style-${niche}-${name}.png` });
  // второй экран: виджет первого экрана и начало прайса — там стиль виден лучше, чем на фото
  await p.evaluate(() => { const el = document.querySelector('.qw'); if (el) scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `shots/style-${niche}-${name}-2.png` });
  console.log(niche, name, '→', st);
  await ctx.close();
}
await br.close(); srv.close();
