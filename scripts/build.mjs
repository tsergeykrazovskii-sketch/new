// Сборка «Слота». Запуск: node scripts/build.mjs
//
//   dist/ — уходит на Vercel:
//     <ниша>.html, demo-<ниша>.html     — сайт ниши и демо со всеми стилями (demo-* — для предпросмотра в Claude)
//     <клиент>/index.html               — персональное демо клиента (закрыто от индексации)
//     <клиент>/admin/index.html         — демо админки: правки хранятся в браузере и видны на демо-сайте
//     <клиент>/preview.html, admin-preview.html — то же для предпросмотра в Claude
//
//   release/<клиент>/ — комплект для хостинга клиента (PHP): сайт, data.json и рабочая админка
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

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
  niche: Object.fromEntries(nicheFiles.map((f) => [f.replace(/\.js$/, ''), read('niches/' + f)])),
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

const siteSrc = (scripts) => ({ css: src.css, render: src.render, app: src.app, scripts });

// Страница админки. mode: 'full' — отдельный HTML-файл, 'artifact' — предпросмотр в Claude.
function adminPage(slug, nicheId, data, mode, siteUrl) {
  const payload = { slug, nicheId, data, siteUrl, src: { css: src.css, render: src.render, app: src.app, niche: src.niche[nicheId] } };
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
<p class="mode" data-mode hidden>Демо админки: изменения сохраняются только в этом браузере. В рабочей версии «Сохранить» сразу обновляет сайт.</p>
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
  const head = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap">
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

// 1. Ниши: боевой файл и демо со всеми стилями
for (const id of Object.keys(Slot.niches)) {
  const c = Slot.niches[id];
  write(dist, `${id}.html`, Slot.page(c, id, 'site', siteSrc([src.niche[id]])));
  write(dist, `demo-${id}.html`, Slot.page(c, id, 'artifact', siteSrc([src.niche[id]])));
  const n = copyDir(`assets/img/${id}`, path.join(dist, 'assets', 'img', id));
  if (n) console.log(`dist/assets/img/${id}/ — фото: ${n}`);
}

// 2. Клиенты: данные клиента поверх шаблона ниши
for (const f of clientFiles) {
  const data = JSON.parse(read('clients/' + f));
  const { slug, niche: nicheId } = data;
  if (!Slot.niches[nicheId]) throw new Error(`clients/${f}: неизвестная ниша «${nicheId}»`);
  const scripts = (d) => [src.niche[nicheId], Slot.clientScript(slug, nicheId, d)];

  // демо на Vercel и для предпросмотра
  const c = Slot.compose(Slot.niches[nicheId], data);
  write(dist, `${slug}/index.html`, Slot.page(c, slug, 'demo', siteSrc(scripts(data))));
  write(dist, `${slug}/preview.html`, Slot.page(c, slug, 'artifact', siteSrc(scripts(data))));
  write(dist, `${slug}/admin/index.html`, adminPage(slug, nicheId, data, 'full', '../'));
  write(dist, `${slug}/admin-preview.html`, adminPage(slug, nicheId, data, 'artifact', null));

  // комплект для хостинга клиента: служебные поля демо убираем, заявки уходят в admin/api.php
  const clean = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_') && k !== 'demoLabel'));
  const live = Object.assign({}, clean, { booking: Object.assign({}, clean.booking, { endpoint: 'admin/api.php?action=book' }) });
  const base = path.join(release, slug);
  write(base, 'index.html', Slot.page(Slot.compose(Slot.niches[nicheId], live), slug, 'site', siteSrc(scripts(live))));
  write(base, 'data.json', JSON.stringify(clean, null, 2));
  write(base, 'admin/index.html', adminPage(slug, nicheId, clean, 'full', '../'));
  for (const file of ['api.php', 'config.example.php', '.htaccess', 'private/.htaccess']) {
    write(base, 'admin/' + file, read('admin/' + file));
  }
  const n = copyDir(`clients/${slug}/img`, path.join(dist, slug, 'img'));
  copyDir(`clients/${slug}/img`, path.join(base, 'img'));
  if (n) console.log(`${slug}/img/ — фото: ${n}`);
}
