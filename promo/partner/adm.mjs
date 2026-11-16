import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
const { chromium } = await import(process.env.PLAYWRIGHT ? (await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
const here = new URL('.', import.meta.url).pathname;
const dist = path.resolve(here, '../../dist');
process.chdir(here);
fs.mkdirSync('shots', { recursive: true });
const T = { '.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml' };
const srv = http.createServer((q, r) => { let p = path.join(dist, decodeURIComponent(q.url.split('?')[0])); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); if (!fs.existsSync(p)) return r.writeHead(404).end(); r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p)); });
await new Promise((r) => srv.listen(8802, '127.0.0.1', r));
const B = 'http://127.0.0.1:8802/';
const br = await chromium.launch();
const pad = (n) => String(n).padStart(2, '0');
const day = (k) => { const d = new Date(); d.setDate(d.getDate() + k); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const now = new Date(); const at = (m) => { const d = new Date(now - m * 60000); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const bk = [
  { id: 'a1', at: at(4), status: 'new', service: 'Маникюр с покрытием гель-лаком + снятие', staff: 'Алина Соколова', staffId: 'alina', date: day(1), time: '11:00', dur: 135, name: 'Ольга', phone: '+79215550142', comment: 'Хочу нюд, как на фото в галерее', contact: 'Telegram', extra: { 'Стоимость': '2 900 ₽' } },
  { id: 'a2', at: at(38), status: 'new', service: 'Педикюр с покрытием гель-лаком', staff: 'Вероника Лебедева', staffId: 'veronika', date: day(1), time: '15:30', dur: 120, name: 'Анна', phone: '+79115550377', comment: '', contact: 'Звонок', extra: {} },
  { id: 'a3', at: at(130), status: 'new', service: 'Маникюр без покрытия', staff: 'Любой свободный', staffId: '', date: day(2), time: '19:00', dur: 45, name: 'Мария', phone: '+79625550918', comment: '', contact: 'MAX', extra: {} },
  { id: 'a4', at: at(600), status: 'confirmed', service: 'Маникюр с покрытием гель-лаком', staff: 'Алина Соколова', staffId: 'alina', date: day(1), time: '14:00', dur: 120, name: 'Екатерина', phone: '+79215550611', comment: '', contact: 'Telegram', extra: {} },
  { id: 'a5', at: at(900), status: 'confirmed', service: 'Экспресс-педикюр', staff: 'Дарья Климова', staffId: 'darya', date: day(1), time: '10:00', dur: 60, name: 'Ирина', phone: '+79815550203', comment: '', contact: 'Звонок', extra: {} },
  { id: 'a6', at: at(1000), status: 'confirmed', service: 'Мужской маникюр', staff: 'Камила Хасанова', staffId: 'kamila', date: day(1), time: '17:00', dur: 60, name: 'Дмитрий', phone: '+79535550480', comment: '', contact: 'Звонок', extra: {} },
];
const hide = '*,*::before,*::after{animation:none!important;transition:none!important}';
async function shot(vp, scale, tab, file, extra) {
  const ctx = await br.newContext({ viewport: vp, deviceScaleFactor: scale, locale: 'ru-RU' });
  await ctx.addInitScript((v) => { try { localStorage.setItem('slot-bookings-nails', v); localStorage.setItem('slot-cookie', '1'); } catch (e) {} }, JSON.stringify(bk));
  const p = await ctx.newPage(); p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto(B + 'nails/admin/', { waitUntil: 'networkidle' }); await p.addStyleTag({ content: hide });
  await p.waitForTimeout(800);
  if (tab) { const t = await p.$(`[data-tab="${tab}"]`); if (t) { await t.click(); await p.waitForTimeout(800); } else console.log('no tab', tab); }
  if (extra) await extra(p);
  await p.screenshot({ path: 'shots/' + file });
  await ctx.close();
}
await shot({ width: 1440, height: 900 }, 1.5, null, 'adm-d-main.png');
await shot({ width: 1440, height: 900 }, 1.5, 'services', 'adm-d-services.png');
await shot({ width: 1440, height: 900 }, 1.5, 'schedule', 'adm-d-schedule.png', async (p) => {
  const g = await p.$$('.gday'); if (g[1]) { await g[1].click(); await p.waitForTimeout(500); }
  await p.evaluate(() => { const el = [...document.querySelectorAll('h3.sub')].find((h) => h.textContent.includes('Сетка')); el && el.scrollIntoView(); });
  await p.waitForTimeout(400);
});
await shot({ width: 1440, height: 900 }, 1.5, 'bookings', 'adm-d-bookings.png');
await shot({ width: 390, height: 844 }, 2, 'bookings', 'adm-m-bookings.png');
await shot({ width: 390, height: 844 }, 2, 'services', 'adm-m-services.png');
await br.close(); srv.close();
