// Сборка «Слота». Запуск: node scripts/build.mjs
//
//   dist/ — уходит на Vercel:
//     <ниша>/index.html                 — шаблон ниши (показывает правки из своей демо-админки)
//     <ниша>/admin/index.html           — демо админки шаблона: тот же редактор, что у клиентов
//     demo-<ниша>.html                  — демо со всеми стилями для предпросмотра в Claude
//     <клиент>/index.html               — персональное демо клиента (закрыто от индексации)
//     <клиент>/admin/index.html         — демо админки: правки хранятся в браузере и видны на демо-сайте
//     <клиент>/preview.html, admin-preview.html — то же для предпросмотра в Claude
//
//   release/<клиент>/ — комплект для хостинга клиента (PHP): сайт, data.json и рабочая админка
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// Сайт может жить в подпапке (GitHub Pages: /new/). Фото ниш указаны от корня — добавляем приставку.
// SITE_BASE=/new node scripts/build.mjs; по умолчанию — корень домена (Vercel, свой хостинг)
const BASE = (process.env.SITE_BASE || '').replace(/\/+$/, '');
// Полный адрес выкладки демо (на Pages — base_url из configure-pages, со своим доменом — он) — для превью
// ссылок в мессенджерах: og:url и og:image. Без него превью без картинки.
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');
const withBase = (code) => (BASE ? code.replace(/(['"])\/assets\/img\//g, `$1${BASE}/assets/img/`) : code);

const nicheFiles = fs.readdirSync(path.join(root, 'niches')).filter((f) => f.endsWith('.js')).sort();
const clientFiles = fs.existsSync(path.join(root, 'clients'))
  ? fs.readdirSync(path.join(root, 'clients')).filter((f) => f.endsWith('.json')).sort()
  : [];
const src = {
  render: read('assets/js/render.js'),
  page: read('assets/js/page.js'),
  app: read('assets/js/app.js'),
  css: read('assets/css/slot.css'),
  adminJs: read('admin/admin.js'),
  adminCss: read('admin/admin.css'),
  niche: Object.fromEntries(nicheFiles.map((f) => [f.replace(/\.js$/, ''), withBase(read('niches/' + f))])),
};

const ctx = vm.createContext({});
vm.runInContext(src.render, ctx);
vm.runInContext(src.page, ctx);
Object.values(src.niche).forEach((s) => vm.runInContext(s, ctx));
const Slot = ctx.Slot;
const esc = Slot.util.esc;
const inlineScript = Slot.inlineScript;

const dist = path.join(root, 'dist');
const release = path.join(root, 'release');
fs.rmSync(dist, { recursive: true, force: true });
fs.rmSync(release, { recursive: true, force: true });

// Папка с фото копируется как есть: assets/img/<ниша> → dist/assets/img/<ниша> (тот же путь, что у index.html
// в корне репозитория), clients/<клиент>/img → <клиент>/img
function copyDir(from, to) {
  const src = path.join(root, from);
  if (!fs.existsSync(src)) return 0;
  fs.cpSync(src, to, { recursive: true });
  return fs.readdirSync(src).length;
}

function write(base, rel, content) {
  const file = path.join(base, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  console.log(path.relative(root, file), (content.length / 1024).toFixed(1) + ' КБ');
}

// Код вида K7QM-2XRP-H4TD: без похожих символов (0/O, 1/I/L), чтобы легко продиктовать
const setupCodes = [];
function setupCode() {
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b, i) => (i && i % 4 === 0 ? '-' : '') + abc[b % abc.length]).join('');
}

// Картинка для превью ссылки на демо: assets/share/<сайт>.jpg (снимок первого экрана, scripts/share.mjs)
function share(slug) {
  const src = path.join(root, 'assets', 'share', slug + '.jpg');
  const has = fs.existsSync(src);
  if (has) {
    fs.mkdirSync(path.join(dist, slug), { recursive: true });
    fs.copyFileSync(src, path.join(dist, slug, 'share.jpg'));
  }
  return SITE_URL ? { url: `${SITE_URL}/${slug}/`, image: has ? 'share.jpg' : '' } : undefined;
}

const siteSrc = (scripts) => ({ css: src.css, render: src.render, app: src.app, scripts });

// Страница админки. mode: 'full' — отдельный HTML-файл, 'artifact' — предпросмотр в Claude.
// base — путь от админки к сайту: от него считаются относительные пути фото в предпросмотре.
// demo — админка на Vercel: PHP-сервера там нет, правки только в браузере, api.php не запрашиваем.
// Шрифты: на Vercel/Pages одна папка dist/fonts на все сайты (от сайта — ../fonts/), в комплекте клиента — fonts/
function adminPage(slug, nicheId, data, mode, siteUrl, base, demo) {
  const fontBase = mode === 'artifact' ? null : demo ? '../fonts/' : 'fonts/';
  const payload = { slug, nicheId, data, siteUrl, base, fontBase, demo: !!demo, src: { css: src.css, render: src.render, app: src.app, niche: src.niche[nicheId] } };
  const site = Slot.compose(Slot.niches[nicheId], data);
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const name = `${data.brand.kind} «${data.brand.name}»`;
  const body = `
<div class="top">
  <div class="top__brand"><b>Админка сайта</b><span data-site-name>${esc(name)}</span></div>
  <span class="top__status" data-status role="status"></span>
  <div class="top__acts">
    <a class="btn" data-site-link href="../" target="_blank" rel="noopener">Открыть сайт</a>
    <button class="btn show-sm" type="button" data-preview-open>Предпросмотр</button>
    <button class="btn btn--primary" type="button" data-save disabled>Сохранить</button>
  </div>
</div>
<p class="mode" data-mode hidden>Демо админки: изменения сохраняются только в этом браузере. В рабочей версии «Сохранить» сразу обновляет сайт. <button type="button" class="mode__reset" data-reset>Вернуть исходные данные</button></p>
<div class="layout">
  <nav class="tabs" data-tabs aria-label="Разделы"></nav>
  <main class="panel" data-panel></main>
  <aside class="preview" aria-label="Предпросмотр сайта">
    <div class="preview__bar"><span>Так сайт выглядит на телефоне</span><button type="button" class="tool show-sm" data-preview-close>Закрыть</button></div>
    <div class="phone"><iframe data-frame title="Предпросмотр сайта"></iframe></div>
  </aside>
</div>
<div class="toast" data-toast role="status" hidden></div>
<div class="gate" data-gate hidden>
  <form>
    <h1 data-gate-title>Вход в админку</h1>
    <p data-gate-hint></p>
    <div data-gate-code hidden>
      <label for="gate-code" class="muted">Код первого входа</label>
      <input id="gate-code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false">
    </div>
    <label for="gate-pass" class="muted">Пароль</label>
    <input id="gate-pass" type="password" autocomplete="current-password" required>
    <p class="err" data-gate-err role="alert"></p>
    <button class="btn btn--primary" type="submit">Войти</button>
  </form>
</div>
<script type="application/json" id="slot-admin">${json}</script>
${inlineScript(src.render)}
${inlineScript(src.page)}
${inlineScript(src.niche[nicheId])}
${inlineScript(src.adminJs)}
`;
  const onest = 'https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap';
  const head = `${fontBase == null
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${onest}">`
    : Slot.fontHrefs(onest, base + fontBase).map((h) => `<link rel="stylesheet" href="${h}">`).join('\n')}
${Slot.favicon(site, Slot.getStyle(site, site.defaultStyle))}
<style>${src.adminCss}</style>`;
  if (mode === 'artifact') {
    return `<title>Админка ${esc(data.brand.name)}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${head}\n${body}`;
  }
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Админка — ${esc(name)}</title>
${head}
</head>
<body>${body}</body>
</html>
`;
}

// Шрифты в комплекте: каждое семейство из стилей ниш и «Своей» темы должно быть скачано (node scripts/fonts.mjs)
function checkFonts(c, where) {
  const names = new Set([...(c.styles || []).flatMap((s) => Slot.fontFamilies(s.fonts)), ...[...Slot.FONTS.display, ...Slot.FONTS.body].map((f) => f.name)]);
  const missing = [...names].filter((n) => !fs.existsSync(path.join(root, 'assets', 'fonts', Slot.fontSlug(n) + '.css')));
  if (missing.length) throw new Error(`${where}: нет шрифтов в assets/fonts: ${missing.join(', ')} — запустите node scripts/fonts.mjs`);
}
Object.entries(Slot.niches).forEach(([id, n]) => checkFonts(n, 'niches/' + id));
copyDir('assets/fonts', path.join(dist, 'fonts'));

// 1. Ниши: боевой файл и демо со всеми стилями
for (const id of Object.keys(Slot.niches)) {
  const c = Slot.niches[id];
  write(dist, `${id}/index.html`, Slot.page(c, id, 'site', siteSrc([src.niche[id]]), { edits: true, fontBase: '../fonts/', share: share(id) }));
  write(dist, `${id}/admin/index.html`, adminPage(id, id, Slot.nicheData(id), 'full', '../', '../', true));
  write(dist, `demo-${id}.html`, Slot.page(c, id, 'artifact', siteSrc([src.niche[id]])));
  const n = copyDir(`assets/img/${id}`, path.join(dist, 'assets', 'img', id));
  if (n) console.log(`dist/assets/img/${id}/ — фото: ${n}`);
}

// Стартовая страница со ссылками на шаблоны (закрыта от индексации)
{
  const links = Object.keys(Slot.niches)
    .map((id) => {
      const n = Slot.niches[id];
      return `<li><a href="${id}/">${esc(n.brand.kind)} «${esc(n.brand.name)}»</a> · <a href="${id}/admin/">админка</a></li>`;
    })
    .join('\n');
  write(dist, 'index.html', `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Слот — шаблоны сайтов</title>
<style>body{margin:0;padding:48px 20px;font:17px/1.6 system-ui,sans-serif;color:#16181b;background:#f4f4f2}main{max-width:560px;margin:0 auto}h1{font-size:28px;margin:0 0 8px}p{color:#5b6066;margin:0 0 24px}ul{padding:0;list-style:none}li{padding:14px 0;border-top:1px solid #ddd}a{color:inherit}</style>
</head>
<body><main><h1>Слот</h1><p>Шаблоны сайтов с онлайн-записью.</p><ul>
${links}
</ul></main></body>
</html>
`);
}

// 2. Клиенты: данные клиента поверх шаблона ниши
for (const f of clientFiles) {
  const data = JSON.parse(read('clients/' + f));
  const { slug, niche: nicheId } = data;
  if (!Slot.niches[nicheId]) throw new Error(`clients/${f}: неизвестная ниша «${nicheId}»`);
  const scripts = (d) => [src.niche[nicheId], Slot.clientScript(slug, nicheId, d)];

  // демо на Vercel и для предпросмотра
  const c = Slot.compose(Slot.niches[nicheId], data);
  checkFonts(c, 'clients/' + f);
  write(dist, `${slug}/index.html`, Slot.page(c, slug, 'demo', siteSrc(scripts(data)), { fontBase: '../fonts/', share: share(slug) }));
  write(dist, `${slug}/preview.html`, Slot.page(c, slug, 'artifact', siteSrc(scripts(data))));
  write(dist, `${slug}/admin/index.html`, adminPage(slug, nicheId, data, 'full', '../', '../', true));
  write(dist, `${slug}/admin-preview.html`, adminPage(slug, nicheId, data, 'artifact', null, null, true));

  // комплект для хостинга клиента: служебные поля демо убираем, заявки уходят в admin/api.php
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_') && k !== 'demoLabel'));
  const live = Object.assign({}, clean, { booking: Object.assign({}, clean.booking, { endpoint: 'admin/api.php?action=book' }) });
  const base = path.join(release, slug);
  write(base, 'index.html', Slot.page(Slot.compose(Slot.niches[nicheId], live), slug, 'site', siteSrc(scripts(live))));
  write(base, 'data.json', JSON.stringify(clean, null, 2));
  write(base, 'admin/index.html', adminPage(slug, nicheId, clean, 'full', '../', '../'));
  for (const file of ['api.php', 'config.example.php', '.htaccess', 'private/.htaccess']) {
    write(base, 'admin/' + file, read('admin/' + file));
  }
  // Код первого входа: без него пароль админки не задать. Новый при каждой сборке, в git не попадает.
  const code = setupCode();
  write(base, 'admin/config.php', read('admin/config.example.php').replace("'setup_code' => ''", `'setup_code' => '${code}'`));
  write(base, '.htaccess', read('admin/site.htaccess'));
  copyDir('assets/fonts', path.join(base, 'fonts'));
  write(base, 'uploads/.htaccess', read('admin/uploads.htaccess'));
  setupCodes.push(`${slug}: ${code}`);
  const n = copyDir(`clients/${slug}/img`, path.join(dist, slug, 'img'));
  copyDir(`clients/${slug}/img`, path.join(base, 'img'));
  if (n) console.log(`${slug}/img/ — фото: ${n}`);
}

// 404 на Pages: со своим доменом сайты живут с корня (demo.top-in.ru/svoi/), а по старой привычке пишут
// с именем репозитория (demo.top-in.ru/new/svoi/) — если дальше в адресе известный сайт, переходим на него
{
  const sites = [...Object.keys(Slot.niches), ...clientFiles.map((f) => f.replace(/\.json$/, '')), 'zhar'];
  write(dist, '404.html', `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Страница не найдена</title>
<script>
(function () {
  var sites = ${JSON.stringify(sites)};
  var p = location.pathname.split('/');
  for (var i = 1; i < p.length; i++) {
    if (sites.indexOf(p[i]) >= 0) {
      var to = '${BASE}/' + p.slice(i).join('/');
      if (to !== location.pathname) location.replace(to + location.search + location.hash);
      return;
    }
  }
})();
</script>
<style>body{margin:0;padding:48px 20px;font:17px/1.6 system-ui,sans-serif;color:#16181b;background:#f4f4f2}main{max-width:560px;margin:0 auto}h1{font-size:28px;margin:0 0 8px}p{color:#5b6066}</style>
</head>
<body><main><h1>Страница не найдена</h1><p>Проверьте ссылку — возможно, в ней опечатка.</p></main></body>
</html>
`);
}

// Сторонний проект на демо-домене: сайт бренда «Жар-соус» (zhar/, своя сборка) → dist/zhar/
execFileSync(process.execPath, [path.join(root, 'zhar/build.mjs'), '--out', path.join(dist, 'zhar'), '--demo', ...(SITE_URL ? ['--base-url', `${SITE_URL}/zhar/`] : [])], { stdio: 'inherit' });

if (setupCodes.length) {
  console.log('\nКоды первого входа в админку (release/<клиент>/admin/config.php):\n  ' + setupCodes.join('\n  '));
}
