// Проверка демо перед выкладкой (после node scripts/build.mjs): если что-то сломано — выкладка не идёт.
//   1. Каждый сайт в dist/ открывается на телефоне (390 px): без ошибок скриптов и без горизонтальной прокрутки.
//   2. Запись проходит до конца в шаблонах ниш и у одного клиента каждой ниши — на телефоне и на компьютере.
// Движки: Chromium (Chrome, Android, Яндекс Браузер) и WebKit (Safari на iPhone и Mac), если он установлен.
// Запуск: node scripts/smoke.mjs
//   PLAYWRIGHT=/путь/к/playwright/index.mjs CHROME=/путь/к/chrome — свои пути (как у scripts/share.mjs)
//   SMOKE_WEBKIT=0 — без Safari; SMOKE_ONLY=barber,tor — только эти сайты
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pw = process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright';
const { chromium, webkit } = await import(pw);

if (!fs.existsSync(path.join(dist, '404.html'))) throw new Error('Сначала соберите сайт: node scripts/build.mjs');
const only = (process.env.SMOKE_ONLY || '').split(',').filter(Boolean);
const isSite = (d) => {
  const f = path.join(dist, d, 'index.html');
  return fs.existsSync(f) && /data-niche=/.test(fs.readFileSync(f, 'utf8').slice(0, 4000));
};
const sites = fs.readdirSync(dist).filter((d) => (!only.length || only.includes(d)) && isSite(d)).sort();
const niches = fs.readdirSync(path.join(root, 'niches')).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''));
// для записи: шаблоны ниш и первый по алфавиту клиент каждой ниши
const clientOf = {};
for (const f of fs.readdirSync(path.join(root, 'clients')).filter((f) => f.endsWith('.json')).sort()) {
  const slug = f.replace(/\.json$/, '');
  const { niche } = JSON.parse(fs.readFileSync(path.join(root, 'clients', f), 'utf8'));
  if (niche && !clientOf[niche] && sites.includes(slug)) clientOf[niche] = slug;
}
const bookSites = [...niches, ...Object.values(clientOf)].filter((s) => sites.includes(s));

// dist — по http, как на Pages (адреса со слешем на конце)
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(dist) || !fs.existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const engines = [['Chromium', chromium, process.env.CHROME ? { executablePath: process.env.CHROME } : {}]];
if (process.env.SMOKE_WEBKIT !== '0') engines.push(['WebKit', webkit, {}]);

if (!sites.length) throw new Error('В dist/ не нашлось ни одного сайта для проверки');
const fails = [];
const fail = (eng, site, what) => {
  fails.push(`${eng} · ${site}: ${what}`);
  console.log(`  ✗ ${site}: ${what}`);
};

// Страница без внешней сети: карты, Метрика и фото Ozon в проверке не нужны, а сеть в CI бывает нестабильной
async function openPage(browser, width, url) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, serviceWorkers: 'block' });
  await ctx.route(/^https?:\/\//, (route) => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !/net::|Failed to load resource|ERR_|blocked/i.test(m.text()) && errs.push(m.text()));
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('[data-cookie-ok]')?.click());
  return { ctx, page, errs };
}

const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// Запись: на каждом шаге выбираем первый вариант, на контактах заполняем поля
async function book(page, width) {
  const open = width < 768 ? page.locator('.mbar__btn--accent') : page.locator('.hdr [data-book], [data-book]').first();
  if (!(await open.count())) return 'нет кнопки записи';
  await open.first().click();
  await page.waitForTimeout(400);
  if (!(await page.locator('#book').isVisible())) return 'окно записи не открылось';
  for (let k = 0; k < 8; k++) {
    if (await page.locator('.done__title').count()) break;
    if (await page.isVisible('#b-name').catch(() => false)) {
      await page.fill('#b-name', 'Проверка');
      await page.fill('#b-phone', '');
      await page.type('#b-phone', '89991234567');
      for (const f of await page.locator('#book input[type=text]:not(#b-name):not(#b-phone)').all()) if (!(await f.inputValue())) await f.fill('Проверка 123');
      await page.check('#b-consent');
      await page.click('[data-book-next]');
      await page.waitForTimeout(1200);
      break;
    }
    const slot = page.locator('#book [data-slot]:not([disabled])');
    if (await slot.count()) await slot.first().click();
    else if (await page.locator('#book .opt').count()) await page.locator('#book .opt').first().click();
    await page.click('[data-book-next]').catch(() => {});
    await page.waitForTimeout(350);
  }
  const done = (await page.locator('.done__title').textContent().catch(() => '')) || '';
  return /Заявка отправлена|Вы записаны/.test(done) ? '' : `запись не дошла до конца (${done || 'нет экрана «готово»'})`;
}

const t0 = Date.now();
for (const [name, engine, opts] of engines) {
  let browser;
  try {
    browser = await engine.launch(opts);
  } catch (e) {
    if (name === 'WebKit') {
      console.log(`WebKit не установлен — проверка Safari пропущена (npx playwright install webkit)`);
      continue;
    }
    throw e;
  }
  // В Safari — шаблоны и клиенты для записи: этого хватает, чтобы поймать особенности движка
  const list = name === 'WebKit' ? sites.filter((s) => bookSites.includes(s)) : sites;
  console.log(`\n${name}: ${list.length} сайтов на телефоне, запись — ${bookSites.join(', ')}`);

  for (const site of list) {
    try {
      const { ctx, page, errs } = await openPage(browser, 390, base + site + '/');
      const o = await overflow(page);
      if (o > 1) fail(name, site, `горизонтальная прокрутка на телефоне (+${o} px)`);
      if (bookSites.includes(site)) {
        const r = await book(page, 390);
        if (r) fail(name, site, 'телефон: ' + r);
      }
      if (errs.length) fail(name, site, 'ошибка скрипта: ' + errs[0]);
      await ctx.close();
      if (bookSites.includes(site)) {
        const d = await openPage(browser, 1440, base + site + '/');
        const r = await book(d.page, 1440);
        if (r) fail(name, site, 'компьютер: ' + r);
        if (d.errs.length) fail(name, site, 'ошибка скрипта на компьютере: ' + d.errs[0]);
        await d.ctx.close();
      }
    } catch (e) {
      fail(name, site, 'не открылся: ' + String(e.message).split('\n')[0]);
    }
  }
  await browser.close();
}
server.close();

console.log(`\nПроверено за ${Math.round((Date.now() - t0) / 1000)} с. ${fails.length ? `Ошибок: ${fails.length}` : 'Всё в порядке.'}`);
if (fails.length) {
  console.log(fails.map((f) => '  ' + f).join('\n'));
  process.exit(1);
}
