import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT ? (await import('node:url')).pathToFileURL(process.env.PLAYWRIGHT).href : 'playwright');
const LADY = ['nails', 'grooming', 'massage'];
const OUT = new URL('shots', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const B = 'http://localhost:8791';
const N = process.argv[2];
const STYLES = { barber: ['classic', 'american', 'tabak', 'sever'], auto: ['ceh', 'diag', 'sport'], nails: ['pudra', 'shalfey', 'moloko'], grooming: ['myata', 'biskvit', 'butik'], massage: ['pesok', 'evkalipt', 'tik'] }[N];
const b = await chromium.launch({ args: ['--lang=ru-RU'], env: { ...process.env, LANG: 'ru_RU.UTF-8', LANGUAGE: 'ru' } });
const meta = {};
const init = (ctx) => ctx.addInitScript(() => { try { localStorage.setItem('slot-cookie', '1'); } catch (e) {} if (location.pathname.includes('/admin')) document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = '.mode{display:none!important}'; document.head.appendChild(st); }); });
const settle = async (p, ms = 1200) => { await p.waitForTimeout(ms); };
const loadAll = async (p) => {
  await p.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => (i.loading = 'eager')));
  await p.evaluate(() => Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 8000); }))))); const h = await p.evaluate(() => document.body.scrollHeight); for (let y = 0; y < h; y += 500) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(90); } await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(600); };
const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

/* 1. сайт на десктопе */
const dc = await b.newContext({ locale: 'ru-RU', timezoneId: 'Europe/Moscow', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); await init(dc);
const d = await dc.newPage();
await d.goto(`${B}/${N}/`, { waitUntil: 'networkidle' }); await settle(d, 1800);
await d.screenshot({ path: `${OUT}/${N}-desk-hero.png` });
await loadAll(d);
meta.sections = await d.evaluate(() => Object.fromEntries([...document.querySelectorAll('section[id], .perks, .strip')].map((s) => [s.id || s.className.split(' ')[0], Math.round(s.getBoundingClientRect().top + scrollY)])));
meta.deskH = await d.evaluate(() => document.documentElement.scrollHeight);
meta.mapBox = await d.evaluate(() => { const e = document.querySelector('#contacts .map'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; });
meta.widgetBox = await d.evaluate(() => { const e = document.querySelector('.hero .qw'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; });
await d.screenshot({ path: `${OUT}/${N}-desk-full.jpg`, fullPage: true, quality: 88, type: 'jpeg' });
if (N === 'auto') {
  const w = d.locator('[data-widget="estimate"]');
  await w.screenshot({ path: `${OUT}/auto-est-0.png` });
  for (const [i, brand, svc] of [[1, 'Lada', 1], [2, 'BMW', 1], [3, 'BMW', 3]]) {
    await d.locator('[data-est-brands] label', { hasText: brand }).first().click();
    await d.locator('[data-est-service]').selectOption({ index: svc }); await d.waitForTimeout(700);
    await w.screenshot({ path: `${OUT}/auto-est-${i}.png` });
  }
  meta.estBox = await w.boundingBox();
  const pb = await d.locator('[data-est-price]').boundingBox(); meta.priceBox = { x: pb.x - meta.estBox.x, y: pb.y - meta.estBox.y, w: pb.width, h: pb.height };
}

if (N === 'grooming' || N === 'massage') {
  // калькулятор с вариантами: размер собаки / длительность, потом другая услуга
  const w = d.locator('[data-widget="estimate"]');
  await w.screenshot({ path: `${OUT}/${N}-est-0.png` });
  const steps = N === 'grooming' ? [['Средняя', null], ['Крупная', null], ['Крупная', 2]] : [['90 минут', null], ['120 минут', null], ['120 минут', 2]];
  for (const [i, [v, svc]] of steps.entries()) {
    await w.locator('[data-est-brands] label', { hasText: v }).first().click();
    if (svc != null) await w.locator('[data-est-service]').selectOption({ index: svc });
    await d.waitForTimeout(800);
    await w.screenshot({ path: `${OUT}/${N}-est-${i + 1}.png` });
  }
  meta.estBox = await w.boundingBox();
  const pb = await w.locator('[data-est-price]').boundingBox(); meta.priceBox = { x: pb.x - meta.estBox.x, y: pb.y - meta.estBox.y, w: pb.width, h: pb.height };
}

if (N === 'nails') {
  // конструктор: основа → дополнения → итог и время
  const w = d.locator('[data-widget="combo"]');
  await w.scrollIntoViewIfNeeded(); await d.evaluate(() => scrollTo(0, 0)); await d.waitForTimeout(600);
  await w.screenshot({ path: `${OUT}/nails-est-0.png` });
  await w.locator('label', { hasText: 'Снятие' }).first().click(); await d.waitForTimeout(900);
  await w.screenshot({ path: `${OUT}/nails-est-1.png` });
  await w.locator('label', { hasText: 'Дизайн на все ногти' }).first().click(); await d.waitForTimeout(900);
  await w.screenshot({ path: `${OUT}/nails-est-2.png` });
  await w.locator('label', { hasText: 'Френч' }).first().click(); await d.waitForTimeout(900);
  await w.screenshot({ path: `${OUT}/nails-est-3.png` });
  meta.estBox = await w.boundingBox();
  const pb = await w.locator('.qw__result').boundingBox(); meta.priceBox = { x: pb.x - meta.estBox.x, y: pb.y - meta.estBox.y, w: pb.width, h: pb.height };
}

/* 2. сайт на телефоне + запись */
const mc = await b.newContext({ locale: 'ru-RU', timezoneId: 'Europe/Moscow', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await init(mc);
const m = await mc.newPage();
await m.goto(`${B}/${N}/`, { waitUntil: 'networkidle' }); await settle(m, 1800);
await m.screenshot({ path: `${OUT}/${N}-mob-hero.png` });
await loadAll(m);
await m.screenshot({ path: `${OUT}/${N}-mob-full.jpg`, fullPage: true, quality: 85, type: 'jpeg' });
await m.evaluate(() => scrollTo(0, 0)); await m.waitForTimeout(400);
await m.locator('.hero [data-book]').first().click(); await m.waitForTimeout(700);
let k = 0;
for (let step = 0; step < 8; step++) {
  await m.waitForTimeout(500);
  const body = m.locator('[data-book-body]');
  if (await m.locator('.done__title').count()) { await m.waitForTimeout(600); await m.screenshot({ path: `${OUT}/${N}-book-${k++}.png` }); break; }
  const vars = body.locator('input[name=b-variant]');
  if (await vars.count()) {
    const svcR = body.locator('input[type=radio]:not([name=b-variant])');
    if (!(await body.locator('input[type=radio]:not([name=b-variant]):checked').count())) {
      await m.screenshot({ path: `${OUT}/${N}-book-${k++}.png` });
      await vars.nth(N === 'grooming' ? 2 : 1).check({ force: true }); await m.waitForTimeout(400);
      await svcR.nth(0).check({ force: true }); await m.waitForTimeout(500);
    }
  }
  const radios = body.locator('input[type=radio]');
  if (!(await vars.count()) && await radios.count() && !(await body.locator('input[type=radio]:checked').count())) {
    await m.screenshot({ path: `${OUT}/${N}-book-${k++}.png` });
    await radios.nth(Math.min(1, (await radios.count()) - 1)).check({ force: true }); await m.waitForTimeout(400);
  }
  if (await body.locator('.days').count()) {
    // мало окон сегодня (вечер) — берём следующий день, чтобы сетка времени была полной
    if ((await body.locator('[data-slot]:not([disabled])').count()) < 6) { const nd = body.locator('[data-day]:not([disabled])'); if ((await nd.count()) > 1) { await nd.nth(1).click(); await m.waitForTimeout(500); } }
    const free = body.locator('[data-slot]:not([disabled])');
    if (await free.count()) await free.nth(Math.min(2, (await free.count()) - 1)).click();
    await m.waitForTimeout(400);
  }
  if (await body.locator('#b-name').count()) {
    await body.locator('#b-name').fill(LADY.includes(N) ? 'Ольга' : 'Пётр'); await body.locator('#b-phone').fill('9161234567');
    if (await body.locator('#b-car').count()) await body.locator('#b-car').fill('Kia Rio 2019');
    if (await body.locator('#b-pet').count()) await body.locator('#b-pet').fill('Бусинка, шпиц');
    if (!(await body.locator('#b-consent').isChecked())) await body.locator('#b-consent').check({ force: true });
    await m.waitForTimeout(300);
  }
  await m.screenshot({ path: `${OUT}/${N}-book-${k++}.png` });
  await m.locator('[data-book-next]').click();
}

/* 3. админка на десктопе: заявки и расписание */
const ac = await b.newContext({ locale: 'ru-RU', timezoneId: 'Europe/Moscow', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }); await init(ac);
const a = await ac.newPage();
await a.goto(`${B}/${N}/`, { waitUntil: 'domcontentloaded' });
const t1 = new Date(); t1.setDate(t1.getDate() + 1); while (t1.getDay() === 0) t1.setDate(t1.getDate() + 1);
const staff = { barber: [['timur', 'Тимур Сафин'], ['artem', 'Артём Ковалёв'], ['ilya', 'Илья Ветров']], nails: [['alina', 'Алина Соколова'], ['veronika', 'Вероника Лебедева'], ['kamila', 'Камила Хасанова']], grooming: [['polina', 'Полина Гусева'], ['artem', 'Артём Белов'], ['ksenia', 'Ксения Морозова']], massage: [['sergey', 'Сергей Лаптев'], ['amina', 'Амина Кузина'], ['marina', 'Марина Белова']] }[N] || [['', ''], ['', ''], ['', '']];
const svc = { barber: ['Мужская стрижка', 'Стрижка и борода', 'Стрижка машинкой'], nails: ['Маникюр с покрытием гель-лаком', 'Наращивание ногтей', 'Маникюр с покрытием + снятие, френч'], auto: ['ТО-1 с заменой масла', 'Замена тормозных колодок', 'Компьютерная диагностика'], grooming: ['Гигиенический груминг', 'Комплекс для кошки', 'Комплексный груминг'], massage: ['Спортивный массаж', 'Стоун-терапия', 'Классический массаж'] }[N];
const now = new Date().toLocaleString('ru-RU');
const list = [
  { id: 'd1', status: 'confirmed', date: ymd(t1), time: '11:00', dur: 60, name: LADY.includes(N) ? 'Анна' : 'Алексей', phone: '+79031112233', contact: 'Звонок', service: svc[0], staff: staff[0][1], staffId: staff[0][0], at: now },
  { id: 'd2', status: 'confirmed', date: ymd(t1), time: '13:00', dur: 60, name: LADY.includes(N) ? 'Мария' : 'Максим', phone: '+79264445566', contact: 'Telegram', service: svc[1], staff: staff[1][1], staffId: staff[1][0], at: now },
  // маникюр: та же заявка, что в письме ролика (сегодня 19:00, без покрытия, Алина)
  N === 'nails' ? { id: 'd3', status: 'new', date: ymd(new Date()), time: '19:00', dur: 45, name: 'Ольга', phone: '+79161234567', contact: 'Звонок', service: 'Маникюр без покрытия', staff: 'Алина Соколова', staffId: 'alina', at: now } :
  { id: 'd3', status: 'new', date: process.env.BOOK_DATE || ymd(t1), time: process.env.BOOK_TIME || '15:00', dur: Number(process.env.BOOK_DUR || 60), name: LADY.includes(N) ? 'Ольга' : 'Пётр', extra: process.env.BOOK_EXTRA ? JSON.parse(process.env.BOOK_EXTRA) : undefined, phone: '+79161234567', contact: 'Звонок', service: svc[2], staff: staff[2][1], staffId: staff[2][0], at: now },
];
await a.evaluate(([k, l]) => localStorage.setItem(k, JSON.stringify(l)), [`slot-bookings-${N}`, list]);
await a.goto(`${B}/${N}/admin/`, { waitUntil: 'networkidle' }); await settle(a, 800);
await a.screenshot({ path: `${OUT}/${N}-adm-main.png` });
await a.locator('[data-tabs] button', { hasText: 'Заявки' }).click(); await a.waitForTimeout(600);
await a.screenshot({ path: `${OUT}/${N}-adm-bk.png` });
meta.bkCard = await a.locator('.bk').first().boundingBox();
meta.confirmBox = await a.locator('[data-act="bk-confirm"][data-id="d3"]').boundingBox();
await a.locator('[data-act="bk-confirm"][data-id="d3"]').click(); await a.waitForTimeout(450);
await a.screenshot({ path: `${OUT}/${N}-adm-bk2.png` });
await a.locator('[data-tabs] button', { hasText: 'Расписание' }).click(); await a.waitForTimeout(600);
await a.screenshot({ path: `${OUT}/${N}-adm-sched.png` });
if (N === 'auto') meta.capBox = await a.locator('[data-path="schedule.capacity"]').boundingBox();
await a.locator('[data-act="sched-day"]').filter({ has: a.locator(`b:text-is("${t1.getDate()}")`) }).first().click(); await a.waitForTimeout(400);
await a.locator('[data-grid]').scrollIntoViewIfNeeded(); await a.evaluate(() => scrollBy(0, -120)); await a.waitForTimeout(300);
await a.screenshot({ path: `${OUT}/${N}-adm-grid.png` });
meta.gridBox = await a.locator('.grid-wrap').boundingBox();
if (N === 'auto') {
  await a.locator('[data-act="off-add"]').click(); await a.waitForTimeout(300);
  await a.selectOption('#off-s-0', 'nikita'); await a.locator('#off-f-0').fill(ymd(t1)); await a.locator('#off-t-0').fill(ymd(t1)); await a.waitForTimeout(400);
  await a.locator('.card.off').first().scrollIntoViewIfNeeded(); await a.evaluate(() => scrollBy(0, -200)); await a.waitForTimeout(300);
  await a.screenshot({ path: `${OUT}/auto-adm-off.png` });
  meta.offBox = await a.locator('.card.off').first().boundingBox();
}
/* стили: сохранить и снять первый экран */
const sp = await ac.newPage();
for (const st of STYLES) {
  await a.locator('[data-tabs] button', { hasText: 'Оформление' }).click(); await a.waitForTimeout(400);
  await a.locator(`input[name=style][value="${st}"]`).check({ force: true }); await a.waitForTimeout(500);
  if (st === STYLES[1]) await a.screenshot({ path: `${OUT}/${N}-adm-style.png` });
  if (await a.locator('[data-save]').isEnabled()) { await a.locator('[data-save]').click(); await a.waitForTimeout(500); }
  await sp.goto(`${B}/${N}/`, { waitUntil: 'networkidle' }); await settle(sp, 1500);
  await sp.screenshot({ path: `${OUT}/${N}-style-${st}.png` });
}
// после смены стилей вернуть основной: дальше снимаем админку в нём
await a.locator('[data-tabs] button', { hasText: 'Оформление' }).click(); await a.waitForTimeout(400);
await a.locator(`input[name=style][value="${STYLES[0]}"]`).check({ force: true }); await a.waitForTimeout(400);
if (await a.locator('[data-save]').isEnabled()) { await a.locator('[data-save]').click(); await a.waitForTimeout(500); }

/* 4. админка на телефоне */
const amc = await b.newContext({ locale: 'ru-RU', timezoneId: 'Europe/Moscow', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); await init(amc);
const am = await amc.newPage();
await am.goto(`${B}/${N}/admin/`, { waitUntil: 'networkidle' }); await settle(am, 800);
await am.screenshot({ path: `${OUT}/${N}-madm-main.png` });
meta.saveBox = await am.locator('[data-save]').boundingBox();
for (const [tab, f] of [['Услуги и цены', 'svc'], ['Мастера', 'staff'], ['Оформление', 'style'], ['Фото', 'photo']]) {
  await am.locator('[data-tabs] button', { hasText: tab }).click(); await am.waitForTimeout(600);
  await am.evaluate(() => scrollTo(0, 0)); await am.waitForTimeout(200);
  await am.screenshot({ path: `${OUT}/${N}-madm-${f}.png` });
}
fs.writeFileSync(`${OUT}/${N}-meta.json`, JSON.stringify(meta, null, 1));
console.log(N, 'ok', JSON.stringify(meta).slice(0, 400));
await b.close();

