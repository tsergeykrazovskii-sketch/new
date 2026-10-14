/*
 * Слот — сборка готовой HTML-страницы из конфига.
 * Общий код для scripts/build.mjs (Node) и админки (браузер): админка после
 * «Сохранить» собирает новый index.html тем же способом, что и сборка.
 */
(function (g) {
  'use strict';
  const Slot = (g.Slot = g.Slot || {});

  const inlineScript = (s) => '<script>\n' + s.replace(/<\/script/gi, '<\\/script') + '\n</script>';
  const fontsLinks = (href) =>
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    `<link rel="stylesheet" id="slot-fonts" href="${href}">`;

  Slot.schema = (c) => {
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
  };

  // Скрипт, который регистрирует сайт клиента: шаблон ниши + данные клиента
  Slot.clientScript = (slug, nicheId, data) =>
    `Slot.niches[${JSON.stringify(slug)}] = Slot.compose(Slot.niches[${JSON.stringify(nicheId)}], ${JSON.stringify(data)});\n` +
    `(Slot.clients = Slot.clients || {})[${JSON.stringify(slug)}] = ${JSON.stringify(nicheId)};`;

  /*
   * mode: 'site' — боевой сайт, 'demo' — демо для Vercel (закрыто от индексации),
   *       'artifact' — предпросмотр в Claude (без <html>/<head>, их добавляет площадка).
   * src:  { css, render, app, scripts: [исходники, после которых в Slot.niches[id] лежит конфиг] }
   * opts: { noMotion, base } — для предпросмотра в админке
   */
  Slot.page = (c, id, mode, src, opts) => {
    const o = opts || {};
    const esc = Slot.util.esc;
    const st = Slot.getStyle(c);
    const demo = mode === 'demo' || mode === 'artifact';
    const app =
      `${demo ? '<div class="demo" id="demo"></div>\n' : ''}<div id="app" data-niche="${id}" data-style="${st.id}">${Slot.render(c)}</div>\n` +
      `${inlineScript(src.render)}\n${src.scripts.map(inlineScript).join('\n')}\n${inlineScript(src.app)}\n` +
      `<script>Slot.boot({ ${demo ? 'demo: true, ' : ''}niche: ${JSON.stringify(id)} });</script>`;
    const styles =
      `${fontsLinks(st.fonts)}\n<style>${src.css}</style>\n<style id="slot-theme">${Slot.themeCss(c, st.id)}</style>` +
      (o.noMotion ? '\n<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>' : '');

    if (mode === 'artifact') {
      const name = c.demoLabel ? `${c.brand.kind} «${c.brand.name}»` : c.product;
      return `<title>${esc(name)}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${styles}\n${app}\n`;
    }
    const title = `${c.brand.kind} «${c.brand.name}» — ${c.contacts.city}`;
    return `<!doctype html>
<html lang="ru" data-niche="${id}" data-style="${st.id}" data-motion="${st.motion}" data-texture="${st.texture || 'none'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${o.base ? `<base href="${esc(o.base)}">\n` : ''}<title>${esc(title)}</title>
${mode === 'demo' ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="description" content="${esc(c.hero.lead)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(c.hero.lead)}">
<meta property="og:locale" content="ru_RU">
${styles}
<script type="application/ld+json">${JSON.stringify(Slot.schema(c)).replace(/</g, '\\u003c')}</script>
</head>
<body>
${app}
</body>
</html>
`;
  };

  Slot.inlineScript = inlineScript;
})(typeof globalThis !== 'undefined' ? globalThis : window);
