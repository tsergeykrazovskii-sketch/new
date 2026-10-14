// Сборка «Слота»:
//   dist/<ниша>.html      — готовый сайт одним файлом в стиле по умолчанию, разметка отрендерена заранее (для SEO)
//   dist/demo-<ниша>.html — демо ниши с переключателем стилей для предпросмотра в Claude (без <html>/<head>)
// Запуск: node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const nicheFiles = fs.readdirSync(path.join(root, 'niches')).filter((f) => f.endsWith('.js')).sort();
const sources = {
  render: read('assets/js/render.js'),
  app: read('assets/js/app.js'),
  niches: nicheFiles.map((f) => read('niches/' + f)),
  css: read('assets/css/slot.css'),
};

const ctx = vm.createContext({});
vm.runInContext(sources.render, ctx);
sources.niches.forEach((src) => vm.runInContext(src, ctx));
const Slot = ctx.Slot;

const out = path.join(root, 'dist');
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

// 1. Сайт под каждую нишу
for (const id of Object.keys(Slot.niches)) {
  const c = Slot.niches[id];
  const st = Slot.getStyle(c);
  const nicheSrc = sources.niches[nicheFiles.indexOf(id + '.js')];
  const title = `${c.brand.kind} «${c.brand.name}» — ${c.contacts.city}`;
  const html = `<!doctype html>
<html lang="ru" data-niche="${id}" data-style="${st.id}" data-motion="${st.motion}" data-texture="${st.texture || 'none'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${Slot.util.esc(title)}</title>
<meta name="description" content="${Slot.util.esc(c.hero.lead)}">
<meta property="og:title" content="${Slot.util.esc(title)}">
<meta property="og:description" content="${Slot.util.esc(c.hero.lead)}">
<meta property="og:locale" content="ru_RU">
${fontsLinks(st.fonts)}
<style>${sources.css}</style>
<style id="slot-theme">${Slot.themeCss(c, st.id)}</style>
<script type="application/ld+json">${JSON.stringify(schema(c))}</script>
</head>
<body>
<div id="app" data-niche="${id}" data-style="${st.id}">${Slot.render(c)}</div>
${inlineScript(sources.render)}
${inlineScript(nicheSrc)}
${inlineScript(sources.app)}
<script>Slot.boot({ niche: '${id}' });</script>
</body>
</html>
`;
  fs.writeFileSync(path.join(out, `${id}.html`), html);
  console.log('dist/' + id + '.html', (html.length / 1024).toFixed(1) + ' КБ');


  // 2. Демо ниши для предпросмотра (артефакт): обёртку <html>/<head> добавляет площадка
  const demo = `<title>${Slot.util.esc(c.product)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fontsLinks(st.fonts)}
<style>${sources.css}</style>
<style id="slot-theme">${Slot.themeCss(c, st.id)}</style>
<div class="demo" id="demo"></div>
<div id="app" data-niche="${id}" data-style="${st.id}">${Slot.render(c)}</div>
${inlineScript(sources.render)}
${inlineScript(nicheSrc)}
${inlineScript(sources.app)}
<script>Slot.boot({ demo: true, niche: '${id}' });</script>
`;
  fs.writeFileSync(path.join(out, `demo-${id}.html`), demo);
  console.log('dist/demo-' + id + '.html', (demo.length / 1024).toFixed(1) + ' КБ');
}
