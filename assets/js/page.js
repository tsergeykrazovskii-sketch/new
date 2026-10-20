/*
 * Слот — сборка готовой HTML-страницы из конфига.
 * Общий код для scripts/build.mjs (Node) и админки (браузер): админка после
 * «Сохранить» собирает новый index.html тем же способом, что и сборка.
 */
(function (g) {
  'use strict';
  const Slot = (g.Slot = g.Slot || {});

  const inlineScript = (s) => '<script>\n' + s.replace(/<\/script/gi, '<\\/script') + '\n</script>';
  // base — папка шрифтов в комплекте сайта; null — шрифты с Google (предпросмотр в Claude)
  const fontsLinks = (spec, base) =>
    (base == null
      ? '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
      : '') +
    Slot.fontHrefs(spec, base)
      .map((h) => `<link rel="stylesheet" data-slot-font href="${Slot.util.esc(h)}">`)
      .join('\n');

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

  // Поиск и соцсети (вкладка «Настройки»): адрес сайта нужен, чтобы дать полные ссылки на страницу и картинку
  // share — адрес страницы демо (сборка знает его сама) и готовая картинка для превью ссылки
  Slot.seo = (c, share) => {
    const s = c.seo || {};
    const raw = String((share && share.url) || s.url || '').trim();
    const url = /^https?:\/\/[^\s"'<>]+$/.test(raw) ? raw.replace(/\/?$/, '/') : '';
    const abs = (u) => {
      if (!u || /^data:/.test(u)) return '';
      if (/^https?:\/\//.test(u)) return u;
      if (!url) return '';
      return u[0] === '/' ? url.replace(/^(https?:\/\/[^/]+).*$/, '$1') + u : url + u.replace(/^\.\//, '');
    };
    // код подтверждения Вебмастера: владелец может вставить и сам код, и всю строку <meta …>
    const v = String(s.verify || '').trim();
    const verify = ((/content=["']?([^"'\s>]+)/.exec(v) || [])[1] || v).replace(/[^\w-]/g, '').slice(0, 64);
    return { url, image: abs((share && share.image) || (c.hero && c.hero.image)), verify };
  };

  // Скрипт, который регистрирует сайт клиента: шаблон ниши + данные клиента
  Slot.clientScript = (slug, nicheId, data) =>
    `Slot.niches[${JSON.stringify(slug)}] = Slot.compose(Slot.niches[${JSON.stringify(nicheId)}], ${JSON.stringify(data)});\n` +
    `(Slot.clients = Slot.clients || {})[${JSON.stringify(slug)}] = ${JSON.stringify(nicheId)};`;

  /*
   * mode: 'site' — боевой сайт, 'demo' — демо для Vercel (закрыто от индексации),
   *       'artifact' — предпросмотр в Claude (без <html>/<head>, их добавляет площадка).
   * src:  { css, render, app, scripts: [исходники, после которых в Slot.niches[id] лежит конфиг] }
   * opts: { noMotion, base } — для предпросмотра в админке;
   *       { share: { url, image } } — демо на Pages: адрес страницы и картинка для превью ссылки;
   *       { fontBase } — путь от страницы к папке шрифтов (по умолчанию 'fonts/'; null — с Google);
   *       { edits } — страница показывает правки из демо-админки в этом браузере (шаблоны ниш на Vercel)
   */
  // share: демо на Pages — только превью ссылки (без canonical и Вебмастера: демо закрыто от поиска)
  const seoTags = (c, title, share) => {
    const esc = Slot.util.esc;
    const s = Slot.seo(c, share);
    const card = !!(share && share.image); // своя картинка демо — всегда 1200×630 (scripts/share.mjs)
    return (
      (s.url ? `${share ? '' : `<link rel="canonical" href="${esc(s.url)}">\n`}<meta property="og:url" content="${esc(s.url)}">\n` : '') +
      (s.image
        ? `<meta property="og:image" content="${esc(s.image)}">\n${card ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n' : ''}<meta property="og:image:alt" content="${esc(title)}">\n<meta name="twitter:card" content="summary_large_image">\n`
        : '') +
      (s.verify && !share ? `<meta name="yandex-verification" content="${esc(s.verify)}">\n` : '')
    );
  };

  Slot.page = (c, id, mode, src, opts) => {
    const o = opts || {};
    const esc = Slot.util.esc;
    const st = Slot.getStyle(c);
    const demo = mode === 'demo' || mode === 'artifact';
    const fontBase = mode === 'artifact' ? null : 'fontBase' in o ? o.fontBase : 'fonts/';
    const app =
      `${demo ? '<div class="demo" id="demo"></div>\n' : ''}<div id="app" data-niche="${id}" data-style="${st.id}">${Slot.render(c)}</div>\n` +
      `${inlineScript(src.render)}\n${src.scripts.map(inlineScript).join('\n')}\n${inlineScript(src.app)}\n` +
      `<script>Slot.boot({ ${demo ? 'demo: true, ' : ''}${o.edits ? 'edits: true, ' : ''}niche: ${JSON.stringify(id)} });</script>`;
    const styles =
      `${fontsLinks(st.fonts, fontBase)}\n<style>${src.css}</style>\n<style id="slot-theme">${Slot.themeCss(c, st.id)}</style>` +
      (o.noMotion ? '\n<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>' : '');

    if (mode === 'artifact') {
      const name = c.demoLabel ? `${c.brand.kind} «${c.brand.name}»` : c.product;
      return `<title>${esc(name)}</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n${styles}\n${app}\n`;
    }
    const title = `${c.brand.kind} «${c.brand.name}» — ${c.contacts.city}`;
    return `<!doctype html>
<html lang="ru" data-niche="${id}" data-style="${st.id}" data-motion="${st.motion}" data-texture="${st.texture || 'none'}"${fontBase == null ? '' : ` data-font-base="${esc(fontBase)}"`}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${o.base ? `<base href="${esc(o.base)}">\n` : ''}<title>${esc(title)}</title>
${Slot.favicon(c, st)}
${mode === 'demo' ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<meta name="description" content="${esc(c.hero.lead)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(c.hero.lead)}">
<meta property="og:locale" content="ru_RU">
<meta property="og:type" content="website">
${o.share ? seoTags(c, title, o.share) : mode === 'site' ? seoTags(c, title) : ''}${styles}
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
