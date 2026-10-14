// Сборка «Слота». Запуск: node scripts/build.mjs
//   dist/<ниша>.html          — сайт ниши одним файлом в стиле по умолчанию, разметка отрендерена заранее (для SEO)
//   dist/demo-<ниша>.html     — демо ниши с переключателем стилей для предпросмотра в Claude (без <html>/<head>)
//   dist/<клиент>/index.html  — персональное демо клиента для Vercel (закрыто от индексации)
//   dist/<клиент>/preview.html — то же демо для предпросмотра в Claude
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
const sources = {
  render: read('assets/js/render.js'),
  app: read('assets/js/app.js'),
  css: read('assets/css/slot.css'),
  niche: Object.fromEntries(nicheFiles.map((f) => [f.replace(/\.js$/, ''), read('niches/' + f)])),
};

const ctx = vm.createContext({});
vm.runInContext(sources.render, ctx);
Object.values(sources.niche).forEach((src) => vm.runInContext(src, ctx));
const Slot = ctx.Slot;
const esc = Slot.util.esc;

const out = path.join(root, 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const inlineScript = (s) => `<script>\n${s.replace(/<\/script/gi, '<\\/script')}\n</script>`;
const fontsLinks = (href) =>
  `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" id="slot-fonts" href="${href}">`;

function schema(c) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return {
    '@context': 'https://schema.org',
    '@type': c.schemaType,
    name: `${c.brand.kind} «${c.brand.name}»`,
    telephone: c.contacts.phoneHref,
    address: { '@type': 'PostalAddress', streetAddress: c.contacts.address, addressLocality: c.contacts.city, addressCountry: 'RU' },
    openingHoursSpecification: c.hours
      .map((h, i) => (h ? { '@type': 'OpeningHoursSpecification', dayOfWeek: days[i], opens: h[0], closes: h[1] } : null))
      .filter(Boolean),
  };
}

// Одна страница. mode: 'site' — боевой сайт, 'demo' — демо для Vercel, 'artifact' — предпросмотр в Claude.
// scripts — исходники, после которых в Slot.niches[id] лежит готовый конфиг.
function page(c, id, mode, scripts) {
  const st = Slot.getStyle(c);
  const demo = mode !== 'site';
  const app = `${demo ? '<div class="demo" id="demo"></div>\n' : ''}<div id="app" data-niche="${id}" data-style="${st.id}">${Slot.render(c)}</div>
${inlineScript(sources.render)}
${scripts.map(inlineScript).join('\n')}
${inlineScript(sources.app)}
<script>Slot.boot({ ${demo ? 'demo: true, ' : ''}niche: '${id}' });</script>`;
  const styles = `${fontsLinks(st.fonts)}
<style>${sources.css}</style>
<style id="slot-theme">${Slot.themeCss(c, st.id)}</style>`;

  if (mode === 'artifact') {
    return `<title>${esc(c.demoLabel ? `${c.brand.kind} «${c.brand.name}»` : c.product)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${styles}
${app}
`;
  }
  const title = `${c.brand.kind} «${c.brand.name}» — ${c.contacts.city}`;
  return `<!doctype html>
<html lang="ru" data-niche="${id}" data-style="${st.id}" data-motion="${st.motion}" data-texture="${st.texture || 'none'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
${mode === 'demo' ? '<meta name="robots" content="noindex, nofollow">' : ''}
<meta name="description" content="${esc(c.hero.lead)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(c.hero.lead)}">
<meta property="og:locale" content="ru_RU">
${styles}
<script type="application/ld+json">${JSON.stringify(schema(c))}</script>
</head>
<body>
${app}
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log('dist/' + rel, (html.length / 1024).toFixed(1) + ' КБ');
}

// 1. Ниши: боевой файл и демо со всеми стилями
for (const id of Object.keys(Slot.niches)) {
  const c = Slot.niches[id];
  write(`${id}.html`, page(c, id, 'site', [sources.niche[id]]));
  write(`demo-${id}.html`, page(c, id, 'artifact', [sources.niche[id]]));
}

// 2. Клиенты: данные клиента поверх шаблона ниши
for (const f of clientFiles) {
  const client = JSON.parse(read('clients/' + f));
  const nicheId = client.niche;
  if (!Slot.niches[nicheId]) throw new Error(`clients/${f}: неизвестная ниша «${nicheId}»`);
  const c = Slot.compose(Slot.niches[nicheId], client);
  const slug = client.slug;
  const register = `Slot.niches[${JSON.stringify(slug)}] = Slot.compose(Slot.niches[${JSON.stringify(nicheId)}], ${JSON.stringify(client)});`;
  const scripts = [sources.niche[nicheId], register];
  write(`${slug}/index.html`, page(c, slug, 'demo', scripts));
  write(`${slug}/preview.html`, page(c, slug, 'artifact', scripts));
}
