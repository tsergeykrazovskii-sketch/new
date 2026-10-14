/*
 * Слот — рендер страницы из конфига ниши.
 * Чистые функции: конфиг → HTML-строка. Работает и в браузере, и в Node
 * (scripts/build.mjs использует его для статической сборки под SEO).
 */
(function (g) {
  'use strict';
  const Slot = (g.Slot = g.Slot || {});

  /* ---------- утилиты ---------- */

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const NBSP = ' ';
  const NNBSP = ' ';

  const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NNBSP);
  const price = (p) => (!p || p.value == null ? 'по' + NBSP + 'запросу' : (p.from ? 'от' + NBSP : '') + num(p.value) + NBSP + '₽');

  function duration(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (!h) return m + NBSP + 'мин';
    return h + NBSP + 'ч' + (m ? NBSP + m + NBSP + 'мин' : '');
  }

  // Русская множественная форма: plural(5, ['отзыв', 'отзыва', 'отзывов'])
  function plural(n, forms) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  const toMin = (s) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };

  const initials = (name) =>
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('');

  /* ---------- иконки (контурные, 24×24, в духе Lucide) ---------- */

  const ICONS = {
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor" stroke="none"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    right: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    left: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    shield:
      '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    wrench:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
    doc: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M16 13H8M16 17H8M10 9H8"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/>',
    gamepad:
      '<path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><path d="M17.32 5H6.68a4 4 0 0 0-3.98 3.59C2.6 9.42 2 14.46 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.41-1.41A2 2 0 0 1 9.83 16h4.34a2 2 0 0 1 1.41.59L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.55-.6-6.58-.69-7.26A4 4 0 0 0 17.32 5z"/>',
    parking: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
    card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
    scissors:
      '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
    tire: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
  };

  Slot.sprite = () =>
    '<svg class="sprite" aria-hidden="true" focusable="false"><defs>' +
    Object.keys(ICONS)
      .map(
        (k) =>
          `<symbol id="i-${k}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</symbol>`
      )
      .join('') +
    '</defs></svg>';

  const ic = (name, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  /* ---------- тема ---------- */

  const TOKEN_MAP = {
    bg: '--bg',
    surface: '--surface',
    raised: '--raised',
    line: '--line',
    fg: '--fg',
    muted: '--muted',
    accent: '--accent',
    onAccent: '--on-accent',
    accentText: '--accent-text',
    accentSoft: '--accent-soft',
    stripeA: '--stripe-a',
    stripeB: '--stripe-b',
    display: '--font-display',
    body: '--font-body',
    displayWeight: '--display-weight',
    displayScale: '--display-scale',
    displayTracking: '--display-tracking',
    radius: '--radius',
    radiusLg: '--radius-lg',
    err: '--err',
    radiusBtn: '--radius-btn',
    displayCase: '--display-case',
    num: '--font-num',
    price: '--font-price',
    stripeC: '--stripe-c',
    photoCtaBg: '--photo-cta-bg',
    photoCtaFg: '--photo-cta-fg',
  };

  const tokensToCss = (t) =>
    Object.keys(t)
      .filter((k) => TOKEN_MAP[k])
      .map((k) => `${TOKEN_MAP[k]}:${t[k]}`)
      .join(';');

  // Стиль ниши: шрифты, цвета, скругления и характер анимации
  Slot.getStyle = (cfg, id) => cfg.styles.find((s) => s.id === id) || cfg.styles.find((s) => s.id === cfg.defaultStyle) || cfg.styles[0];

  Slot.themeCss = (cfg, id) => {
    const st = Slot.getStyle(cfg, id);
    // html:root сильнее :root из slot.css, поэтому порядок подключения стилей не важен
    return `html:root{${tokensToCss(st.tokens)};color-scheme:${st.scheme}}html .invert{${tokensToCss(st.invert || {})}}`;
  };

  /* ---------- секции ---------- */

  const R = {};

  R.header = (c) => {
    const links = c.nav.map((n) => `<a href="#${esc(n.id)}">${esc(n.label)}</a>`).join('');
    return `
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="logo" href="#top" aria-label="${esc(c.brand.kind)} «${esc(c.brand.name)}», наверх">
      <span class="logo__name">${esc(c.brand.name)}</span>
      <span class="logo__kind">${esc(c.brand.kind)}</span>
    </a>
    <nav class="hdr__nav" aria-label="Разделы">${links}</nav>
    <div class="hdr__aside">
      <span class="status" data-status><span class="status__dot"></span><span data-status-text>${esc(c.contacts.hoursShort)}</span></span>
      <a class="hdr__phone" href="tel:${esc(c.contacts.phoneHref)}">${esc(c.contacts.phone)}</a>
      <button class="btn btn--accent btn--sm hdr__book" type="button" data-book>Записаться</button>
      <button class="hdr__menu" type="button" data-menu aria-expanded="false" aria-controls="menu" aria-label="Открыть меню">${ic('menu')}</button>
    </div>
  </div>
  <div class="menu" id="menu" hidden>
    <nav class="wrap menu__in" aria-label="Меню">${links}
      <a class="menu__phone" href="tel:${esc(c.contacts.phoneHref)}">${ic('phone')}${esc(c.contacts.phone)}</a>
    </nav>
  </div>
</header>`;
  };

  function widgetSlots(c, w) {
    const rows = c.staff
      .slice(0, w.limit || 4)
      .map(
        (s, i) => `
      <li class="qw__row" style="--i:${i}">
        <span class="ava" aria-hidden="true">${esc(initials(s.name))}</span>
        <span class="qw__who"><b>${esc(s.name)}</b><span>${esc(s.role)}</span></span>
        <span class="qw__slots" data-qw-slots="${esc(s.id)}">${(s.demoSlots || [])
          .map((t) => `<button class="chip" type="button" data-book data-staff="${esc(s.id)}" data-time="${toMin(t)}">${t}</button>`)
          .join('')}</span>
      </li>`
      )
      .join('');
    return `
    <div class="qw" data-widget="slots">
      <div class="qw__head">
        <h2 class="qw__title">${esc(w.title)}</h2>
        <span class="qw__date" data-qw-date>${esc(w.dateLabel || 'сегодня')}</span>
      </div>
      <ul class="qw__list">${rows}</ul>
      <button class="qw__more" type="button" data-book>${esc(w.more)}${ic('right')}</button>
    </div>`;
  }

  function widgetEstimate(c, w) {
    const brands = w.brands
      .map(
        (b, i) =>
          `<label class="chip chip--radio"><input type="radio" name="qw-brand" value="${i}"${i === w.defaultBrand ? ' checked' : ''}><span>${esc(b.name)}</span></label>`
      )
      .join('');
    const svcs = w.services
      .map((id) => {
        const s = Slot.findService(c, id);
        return `<option value="${esc(id)}">${esc(s.name)}</option>`;
      })
      .join('');
    const first = Slot.findService(c, w.services[0]);
    const k = w.brands[w.defaultBrand].k;
    return `
    <div class="qw" data-widget="estimate">
      <div class="qw__head"><h2 class="qw__title">${esc(w.title)}</h2></div>
      <fieldset class="qw__field">
        <legend>Марка автомобиля</legend>
        <div class="chips" data-est-brands>${brands}</div>
      </fieldset>
      <label class="qw__field" for="qw-service"><span>Работа</span>
        <span class="select"><select id="qw-service" data-est-service>${svcs}</select>${ic('down')}</span>
      </label>
      <div class="qw__result" aria-live="polite">
        <span class="qw__price" data-est-price>${price({ from: true, value: Slot.roundPrice(first.price.value * k) })}</span>
        <span class="qw__dur" data-est-dur>${ic('clock')}около ${duration(first.duration)}</span>
      </div>
      <p class="qw__note">${esc(w.note)}</p>
      <p class="qw__slot">${ic('calendar')}Ближайшее окно: <b data-est-slot>${esc(w.slotLabel || 'завтра, 09:00')}</b></p>
      <button class="btn btn--accent btn--block" type="button" data-book data-from-estimate>${esc(w.cta)}</button>
    </div>`;
  }

  const countText = (p) => (p.countText ? esc(p.countText) : num(p.count) + NBSP + plural(p.count, ['отзыв', 'отзыва', 'отзывов']));

  R.hero = (c) => {
    const h = c.hero;
    const proof = h.proof
      .map(
        (p) => `
        <li class="proof__item">
          <span class="proof__rate">${p.rating ? ic('star') + esc(p.rating) : esc(p.big)}</span>
          <span class="proof__src">${esc(p.source)}<br>${countText(p)}</span>
        </li>`
      )
      .join('');
    const widget = h.widget.type === 'estimate' ? widgetEstimate(c, h.widget) : widgetSlots(c, h.widget);
    const words = h.title.split(/\s+/);
    const title = words.map((w, i) => `<span class="w"><span style="--i:${i + 1}">${esc(w)}</span></span>`).join(' ');
    const k = Math.min(words.length, 6) + 1; // дальше заголовка задержка не растёт
    return `
<section class="hero${h.image ? ' hero--photo' : ''}" aria-labelledby="hero-title">
  ${h.image ? `<div class="hero__bg"><img src="${esc(h.image)}" alt="${esc(h.imageAlt || '')}" fetchpriority="high"></div>` : ''}
  <div class="wrap hero__in">
    <div class="hero__copy">
      <p class="hero__where rise" style="--i:0">${ic('pin')}${esc(c.contacts.city)}, ${esc(c.contacts.address)}${c.contacts.metro ? ' · ' + esc(c.contacts.metro) : ''}</p>
      <h1 class="hero__title" id="hero-title" aria-label="${esc(h.title)}">${title}</h1>
      <p class="hero__lead rise" style="--i:${k}">${esc(h.lead)}</p>
      <div class="hero__actions rise" style="--i:${k + 1}">
        <button class="btn btn--accent btn--lg" type="button" data-book>${esc(h.cta)}</button>
        <a class="btn btn--ghost btn--lg" href="#services">${esc(h.secondary)}</a>
      </div>
      <ul class="proof rise" style="--i:${k + 2}">${proof}</ul>
    </div>
    <aside class="hero__widget card card--stripe" aria-label="${esc(h.widget.title)}">${widget}</aside>
  </div>
</section>`;
  };

  R.perks = (c, s) => `
<section class="perks" aria-label="${esc(s.label)}">
  <div class="wrap">
    <ul class="perks__list">${s.items
      .map((p) => `<li class="perk">${ic(p.icon, 'perk__ic')}<span><b>${esc(p.title)}</b><span>${esc(p.text)}</span></span></li>`)
      .join('')}</ul>
  </div>
</section>`;

  const secCls = (s) => 'sec' + (s.invert ? ' invert' : '');

  const secHead = (id, s) => `
    <div class="sec__head">
      <h2 class="sec__title" id="${id}-title">${esc(s.title)}</h2>
      ${s.lead ? `<p class="sec__lead">${esc(s.lead)}</p>` : ''}
    </div>`;

  R.services = (c, s) => {
    const tabs = c.services
      .map(
        (cat, i) =>
          `<button class="tab" type="button" role="tab" id="svc-t-${i}" aria-controls="svc-p-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${esc(cat.category)}</button>`
      )
      .join('');
    const panels = c.services
      .map(
        (cat, i) => `
      <div class="svc-panel"${c.services.length > 1 ? ` role="tabpanel" id="svc-p-${i}" aria-labelledby="svc-t-${i}"` : ''}${i ? ' hidden' : ''}>
        <ul class="svc">${cat.items
          .map(
            (it, j) => `
          <li class="svc__row" style="--i:${j}">
            <div class="svc__main">
              <h3 class="svc__name">${esc(it.name)}</h3>
              ${it.desc ? `<p class="svc__desc">${esc(it.desc)}</p>` : ''}
            </div>
            <span class="svc__dur">${it.duration ? ic('clock') + duration(it.duration) : ''}</span>
            <span class="svc__price">${price(it.price)}</span>
            <button class="svc__book" type="button" data-book data-service="${esc(it.id)}" aria-label="Записаться: ${esc(it.name)}"><span>Записаться</span>${ic('right')}</button>
          </li>`
          )
          .join('')}</ul>
      </div>`
      )
      .join('');
    return `
<section class="${secCls(s)}" id="services" aria-labelledby="services-title">
  <div class="wrap">
    ${secHead('services', s)}
    ${c.services.length > 1 ? `<div class="tabs" role="tablist" aria-label="Категории услуг">${tabs}<span class="tabs__ind" aria-hidden="true"></span></div>` : ''}
    ${panels}
  </div>
</section>`;
  };

  const photo = (item, cls) =>
    item.img
      ? `<img class="photo ${cls || ''}" src="${esc(item.img)}" alt="${esc(item.alt || item.caption || '')}" loading="lazy">`
      : `<div class="photo ${cls || ''}" role="img" aria-label="Место для фото: ${esc(item.caption || item.name)}"><span class="photo__mark">${esc(item.mark || '')}</span><span class="photo__hint">${ic('camera')}фото</span></div>`;

  R.staff = (c, s) => `
<section class="${secCls(s)}" id="staff" aria-labelledby="staff-title">
  <div class="wrap">
    ${secHead('staff', s)}
    <ul class="staff">${c.staff
      .map(
        (m) => `
      <li class="staff__card">
        ${
          m.img
            ? photo({ img: m.img, alt: m.name }, 'photo--portrait')
            : `<div class="photo photo--portrait photo--mono" aria-hidden="true"><span class="photo__mark">${esc(initials(m.name))}</span></div>`
        }
        <div class="staff__body">
          <h3 class="staff__name">${esc(m.name)}</h3>
          <p class="staff__role">${esc(m.role)}${m.years ? ` · стаж ${m.years}${NBSP}${plural(m.years, ['год', 'года', 'лет'])}` : ''}</p>
          <p class="staff__note">${esc(m.note || '')}</p>
          <button class="btn btn--line btn--block" type="button" data-book data-staff="${esc(m.id)}">${m.dative ? `Записаться к${NBSP}${esc(m.dative)}` : 'Записаться'}</button>
        </div>
      </li>`
      )
      .join('')}</ul>
  </div>
</section>`;

  // Уровни мастеров: одна карточка на уровень, в ней цены ключевых услуг
  R.levels = (c, s) => `
<section class="${secCls(s)}" id="levels" aria-labelledby="levels-title">
  <div class="wrap">
    ${secHead('levels', s)}
    <ul class="levels">${s.levels
      .map(
        (lv, i) => `
      <li class="level">
        <h3 class="level__name">${esc(lv.name)}</h3>
        ${lv.note ? `<p class="level__note">${esc(lv.note)}</p>` : ''}
        <ul class="level__prices">${s.rows
          .map((r) => `<li><span>${esc(r.service)}</span><b>${r.values[i] == null ? '—' : price({ value: r.values[i] })}</b></li>`)
          .join('')}</ul>
        <button class="btn btn--line btn--block" type="button" data-book${c.staff.some((m) => m.id === lv.id) ? ` data-staff="${esc(lv.id)}"` : ''}>Записаться</button>
      </li>`
      )
      .join('')}</ul>
  </div>
</section>`;

  R.steps = (c, s) => `
<section class="sec${s.invert ? ' invert' : ''}" id="steps" aria-labelledby="steps-title">
  <div class="wrap">
    ${secHead('steps', s)}
    <ol class="steps">${s.items
      .map((st) => `<li class="step"><h3 class="step__title">${esc(st.title)}</h3><p>${esc(st.text)}</p></li>`)
      .join('')}</ol>
  </div>
</section>`;

  R.offers = (c, s) => `
<section class="sec${s.invert ? ' invert' : ''}" id="offers" aria-labelledby="offers-title">
  <div class="wrap">
    ${secHead('offers', s)}
    <ul class="offers">${s.items
      .map(
        (o) => `
      <li class="offer">
        ${ic(o.icon, 'offer__ic')}
        <h3 class="offer__title">${esc(o.title)}</h3>
        <p>${esc(o.text)}</p>
        ${
          o.service
            ? `<button class="link-btn" type="button" data-book data-service="${esc(o.service)}">${esc(o.cta)}${ic('right')}</button>`
            : `<a class="link-btn" href="#contacts">${esc(o.cta)}${ic('right')}</a>`
        }
      </li>`
      )
      .join('')}</ul>
  </div>
</section>`;

  const photos = (s) => (s.items || []).filter((it) => it.img);

  R.gallery = (c, s) => {
    const real = photos(s);
    // С фото — плитка разного размера и просмотр по нажатию, без фото — места под фото
    const list = real.length
      ? `<ul class="gallery gallery--bento">${real
          .map(
            (it, i) => `<li class="bento__item">
          <button class="bento__btn" type="button" data-lb="${i}" aria-label="Открыть фото: ${esc(it.caption || 'фото ' + (i + 1))}">
            <img src="${esc(it.img)}" alt="${esc(it.alt || it.caption || '')}" loading="lazy">
            ${it.caption ? `<span class="bento__cap">${esc(it.caption)}</span>` : ''}
          </button></li>`
          )
          .join('')}</ul>`
      : `<ul class="gallery">${s.items
          .map((it) => `<li><figure class="tile">${photo(it)}<figcaption>${esc(it.caption)}</figcaption></figure></li>`)
          .join('')}</ul>`;
    return `
<section class="${secCls(s)}" id="gallery" aria-labelledby="gallery-title">
  <div class="wrap">
    ${secHead('gallery', s)}
    ${list}
  </div>
</section>`;
  };

  // Бегущая лента атмосферы: фото из галереи медленно плывут по экрану
  R.strip = (c) => {
    const g = c.sections.find((x) => x.type === 'gallery');
    const real = g ? photos(g) : [];
    if (real.length < 3) return '';
    const row = real.map((it) => `<li><img src="${esc(it.img)}" alt="" loading="lazy"></li>`).join('');
    return `
<section class="strip" aria-hidden="true">
  <ul class="strip__track">${row}${row}</ul>
</section>`;
  };

  R.reviews = (c, s) => {
    const sum = c.hero.proof
      .map(
        (p) =>
          `<a class="rsum" href="${esc(p.url)}" target="_blank" rel="noopener"><span class="rsum__rate">${p.rating ? ic('star') + esc(p.rating) : esc(p.big)}</span><span>${esc(p.source)} · ${countText(p)}</span></a>`
      )
      .join('');
    const cards = (s.items || [])
      .map(
        (r) => `
      <li class="review">
        ${r.rating ? `<div class="review__stars" aria-label="Оценка ${r.rating} из 5">${Array.from({ length: 5 }, (_, i) => ic('star', i < r.rating ? 'on' : 'off')).join('')}</div>` : `<span class="review__quote" aria-hidden="true">«</span>`}
        <p class="review__text">${esc(r.text)}</p>
        <p class="review__meta">${r.name ? `<b>${esc(r.name)}</b>` : ''}<span>${[r.source, r.date].filter(Boolean).map(esc).join(' · ')}</span></p>
      </li>`
      )
      .join('');
    return `
<section class="${secCls(s)}" id="reviews" aria-labelledby="reviews-title">
  <div class="wrap">
    ${secHead('reviews', s)}
    <div class="rsums">${sum}</div>
    ${s.items && s.items.length ? `<ul class="reviews">${cards}</ul>` : ''}
  </div>
</section>`;
  };

  R.faq = (c, s) => `
<section class="${secCls(s)}" id="faq" aria-labelledby="faq-title">
  <div class="wrap faq__in">
    ${secHead('faq', s)}
    <div class="faq">${s.items
      .map((q) => `<details class="faq__item"><summary>${esc(q.q)}${ic('down')}</summary><p>${esc(q.a)}</p></details>`)
      .join('')}</div>
  </div>
</section>`;

  const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Сворачивает одинаковые дни подряд: «Пн–Пт 10:00–22:00»
  function hoursRows(hours) {
    const rows = [];
    hours.forEach((h, i) => {
      const key = h ? h.join('–') : 'выходной';
      const last = rows[rows.length - 1];
      if (last && last.key === key) last.to = i;
      else rows.push({ key, from: i, to: i });
    });
    return rows.map((r) => ({
      days: r.from === r.to ? DAYS[r.from] : DAYS[r.from] + '–' + DAYS[r.to],
      time: r.key,
      from: r.from,
      to: r.to,
    }));
  }
  Slot.hoursRows = hoursRows;

  R.contacts = (c, s) => {
    const k = c.contacts;
    const msgs = k.messengers
      .map((m) => `<a class="btn btn--line" href="${esc(m.url)}" target="_blank" rel="noopener">${ic(m.icon)}${esc(m.label)}</a>`)
      .join('');
    const hours = hoursRows(c.hours)
      .map((r) => `<li data-days="${r.from}-${r.to}"><span>${r.days}</span><span>${r.time}</span></li>`)
      .join('');
    return `
<section class="${secCls(s)}" id="contacts" aria-labelledby="contacts-title">
  <div class="wrap contacts">
    <div class="contacts__info">
      ${secHead('contacts', s)}
      <p class="contacts__addr">${ic('pin')}<span><b>${esc(k.city)}, ${esc(k.address)}</b>${k.addressNote ? `<br>${esc(k.addressNote)}` : ''}${k.metro ? `<br>${esc(k.metro)}` : ''}</span></p>
      <ul class="hours" aria-label="Часы работы">${hours}</ul>
      <p class="contacts__phone"><a href="tel:${esc(k.phoneHref)}">${esc(k.phone)}</a></p>
      ${msgs ? `<div class="contacts__msg">${msgs}</div>` : ''}
    </div>
    <div class="map" role="img" aria-label="Схема проезда: ${esc(k.address)}">
      <span class="map__road map__road--a"></span><span class="map__road map__road--b"></span>
      <span class="map__pin"><span class="map__dot">${ic('pin')}</span><b>${esc(c.brand.name)}</b></span>
      <div class="map__links">
        <a class="btn btn--surface btn--sm" href="${esc(k.yandexMaps)}" target="_blank" rel="noopener">Яндекс Карты</a>
        <a class="btn btn--surface btn--sm" href="${esc(k.twoGis)}" target="_blank" rel="noopener">2ГИС</a>
      </div>
    </div>
  </div>
</section>`;
  };

  R.footer = (c) => `
<footer class="ftr">
  <div class="wrap ftr__in">
    <div class="ftr__brand"><span class="logo__name">${esc(c.brand.name)}</span>${c.legal && c.legal.entity ? `<span>${esc(c.legal.entity)}</span>` : ''}</div>
    <nav class="ftr__links" aria-label="Документы">
      <a href="#privacy">Политика обработки персональных данных</a>
      <a href="#consent">Согласие на обработку персональных данных</a>
    </nav>
    <p class="ftr__made">© ${esc((c.legal && c.legal.year) || '2026')} · Сайт на шаблоне «Слот»</p>
  </div>
</footer>`;

  R.mbar = (c) => `
<div class="mbar" aria-label="Быстрые действия">
  <a class="mbar__btn" href="tel:${esc(c.contacts.phoneHref)}">${ic('phone')}<span>Позвонить</span></a>
  ${
    c.contacts.messengers.length
      ? `<a class="mbar__btn" href="${esc(c.contacts.messengers[0].url)}" target="_blank" rel="noopener">${ic('send')}<span>Написать</span></a>`
      : `<a class="mbar__btn" href="${esc(c.contacts.yandexMaps)}" target="_blank" rel="noopener">${ic('pin')}<span>Маршрут</span></a>`
  }
  <button class="mbar__btn mbar__btn--accent" type="button" data-book>${ic('calendar')}<span>Записаться</span></button>
</div>`;

  R.booking = () => `
<dialog class="book" id="book" aria-labelledby="book-title">
  <form class="book__form" method="dialog" novalidate>
    <div class="book__head">
      <button class="icon-btn" type="button" data-book-back aria-label="Назад">${ic('left')}</button>
      <div class="book__titles">
        <h2 class="book__title" id="book-title">Запись</h2>
        <p class="book__step" data-book-step></p>
      </div>
      <button class="icon-btn" type="button" data-book-close aria-label="Закрыть">${ic('x')}</button>
    </div>
    <div class="book__sum" data-book-sum></div>
    <div class="book__body" data-book-body></div>
    <div class="book__foot" data-book-foot>
      <button class="btn btn--accent btn--block btn--lg" type="submit" data-book-next>Далее</button>
    </div>
  </form>
</dialog>`;

  R.cookie = () => `
<div class="cookie" data-cookie hidden>
  <p>Сайт использует cookie и Яндекс Метрику, чтобы считать посещения. <a href="#privacy">Подробнее</a></p>
  <button class="btn btn--line btn--sm" type="button" data-cookie-ok>Понятно</button>
</div>`;

  /* ---------- данные ---------- */

  Slot.findService = (c, id) => {
    for (const cat of c.services) for (const it of cat.items) if (it.id === id) return Object.assign({ category: cat.category }, it);
    return null;
  };

  Slot.roundPrice = (v) => Math.round(v / 100) * 100;

  // Сайт клиента = шаблон ниши + данные клиента (clients/<slug>.json).
  // Секция из списка клиента берёт настройки одноимённой секции ниши и перекрывает их своими.
  Slot.compose = (niche, client) => {
    const c = Object.assign({}, niche, client);
    c.id = client.slug;
    c.styles = (client.styles || []).concat(niche.styles); // фирменный стиль клиента — первым
    c.defaultStyle = client.style || niche.defaultStyle;
    c.booking = Object.assign({}, niche.booking, client.booking);
    c.hero = Object.assign({}, niche.hero, client.hero);
    c.hero.widget = Object.assign({}, niche.hero.widget, client.hero && client.hero.widget);
    if (client.sections) {
      c.sections = client.sections.map((sec) => {
        const o = typeof sec === 'string' ? { type: sec } : sec;
        return Object.assign({}, niche.sections.find((n) => n.type === o.type), o);
      });
    }
    return c;
  };

  Slot.util = { esc, num, price, duration, plural, initials, ic, DAYS };

  /* ---------- страница ---------- */

  Slot.render = (c) => {
    const body = c.sections.map((s) => (R[s.type] ? R[s.type](c, s) : '')).join('');
    return (
      Slot.sprite() +
      R.header(c) +
      `<main id="top">${body}</main>` +
      R.footer(c) +
      R.mbar(c) +
      R.booking() +
      R.cookie()
    );
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
