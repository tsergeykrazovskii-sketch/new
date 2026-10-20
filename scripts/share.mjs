// Картинки для превью ссылок на демо (WhatsApp, Telegram, ВКонтакте): снимок первого экрана сайта 1200×630.
// Владелец получает ссылку и сразу видит в превью свой сайт — название, фото, кнопку записи.
// Запуск (после node scripts/build.mjs, нужен Playwright с Chromium):
//   node scripts/share.mjs              — все шаблоны и клиенты
//   node scripts/share.mjs drug svoi    — только эти
// Пути можно задать: PLAYWRIGHT=/путь/к/playwright/index.mjs CHROME=/путь/к/chrome.
// Результат — assets/share/<сайт>.jpg (в git); сборка кладёт его рядом со страницей и прописывает в og:image.
// Переснимать, когда у демо поменялись первый экран, название или стиль.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'assets', 'share');
const pw = process.env.PLAYWRIGHT ? pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright';
const { chromium } = await import(pw);

if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Сначала соберите сайт: node scripts/build.mjs');
const slugs = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(dist).filter((d) => fs.existsSync(path.join(dist, d, 'index.html')) && fs.existsSync(path.join(dist, d, 'admin')));

// dist — по http, как на Pages (адреса со слешем на конце)
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = path.join(dist, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(dist) || !fs.existsSync(p)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
// Фото по полному адресу выкладки (https://demo.top-in.ru/assets/img/…) берём из этой же сборки:
// сайт может быть ещё не выложен или недоступен с этой машины
await page.route(/^https?:\/\//, (route) => {
  const u = new URL(route.request().url());
  const local = path.join(dist, decodeURIComponent(u.pathname));
  if (u.hostname !== '127.0.0.1' && local.startsWith(dist) && fs.existsSync(local) && fs.statSync(local).isFile()) {
    return route.fulfill({ contentType: TYPES[path.extname(local)] || 'application/octet-stream', body: fs.readFileSync(local) });
  }
  return route.continue();
});
fs.mkdirSync(out, { recursive: true });
let bad = 0;
for (const slug of slugs) {
  await page.goto(base + slug + '/', { waitUntil: 'networkidle' });
  // плашка «Демо сайта…», анимации появления и дата у окон и статус «Открыто до…» (через неделю устареют) в снимок не нужны
  await page.addStyleTag({ content: '.demo,.qw__date,.hdr .status{display:none!important}*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.evaluate(() => document.fonts.ready);
  const hero = await page.evaluate(() => {
    const img = document.querySelector('.hero__bg img');
    return !img || (img.complete && img.naturalWidth > 0);
  });
  if (!hero) {
    bad++;
    console.log(`${slug}: фото первого экрана не загрузилось — снимок пропущен`);
    continue;
  }
  await page.waitForTimeout(300);
  const file = path.join(out, slug + '.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  console.log(`${slug}: ${(fs.statSync(file).size / 1024).toFixed(0)} КБ`);
}
await browser.close();
server.close();
if (bad) process.exitCode = 1;
