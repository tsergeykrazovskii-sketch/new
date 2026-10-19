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
    razor: '<path d="M4 20l6-6"/><path d="M10 14l7.6-7.6a2.1 2.1 0 0 1 3 3L13 17z"/>',
    mustache: '<path d="M12 11.5c-1.6-2.4-5.4-3.4-8.5-1.2.8 3.6 5.6 4.4 8.5 1.6 2.9 2.8 7.7 2 8.5-1.6-3.1-2.2-6.9-1.2-8.5 1.2z"/>',
    clipper: '<rect x="7" y="8" width="10" height="13" rx="3"/><path d="M8 8V4h8v4M10 4V2.5M12 4V2.5M14 4V2.5M12 13v3"/>',
    comb: '<rect x="3" y="7" width="18" height="5" rx="1.5"/><path d="M6 12v5M9 12v5M12 12v5M15 12v5M18 12v5"/>',
    towel: '<path d="M4 9h16v3H4z"/><path d="M6 12v8h12v-8"/><path d="M9 3c0 1.2 1.2 1.2 1.2 2.4M13.5 3c0 1.2 1.2 1.2 1.2 2.4"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
    wifi: '<path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0"/><path d="M12 20h.01"/>',
    award: '<circle cx="12" cy="8.5" r="5.5"/><path d="M8.6 12.9 7 21l5-2.8 5 2.8-1.6-8.1"/>',
    child: '<circle cx="12" cy="6" r="3"/><path d="M8 21v-4l-2-4 6-2 6 2-2 4v4"/>',
    smartphone: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/>',
    car: '<path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3A2.6 2.6 0 0 0 12 7H5a1.6 1.6 0 0 0-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
    droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5S12.5 5.5 12 3c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z"/>',
    disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M15.5 4.2a9 9 0 0 1 4.3 4.3"/><path d="M12 5.5v1M18.5 12h-1M12 18.5v-1M5.5 12h1"/>',
    gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/><path d="M12 14h.01"/>',
    snowflake: '<path d="M2 12h20M12 2v20M20 16l-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/>',
    battery: '<rect x="2" y="7" width="17" height="11" rx="2"/><path d="M22 11v3M6 12.5h4M8 10.5v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
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
    space: '--space',
    textScale: '--text-scale',
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

  /* ---------- расписание ---------- */

  /*
   * Своя запись (schedule есть, mode не 'external'): окна считаются по графику, выходным,
   * закрытому вручную и ПОДТВЕРЖДЁННЫМ заявкам. Неподтверждённая заявка время не занимает.
   * Ресурс записи — мастер (если клиент выбирает мастера) или общий график с числом мест
   * (schedule.capacity — например, постов в автосервисе).
   *   busy:   подтверждённые заявки [{ d: 'ГГГГ-ММ-ДД', m: минуты, dur: минуты, s: id мастера или '' }]
   *   blocks: закрыто вручную в админке [{ d, m, s }] — s пустой: закрыто для всех
   *   off:    выходные и отпуска [{ s, from, to, note }] — s пустой: для всех; в общем графике
 *           отпуск мастера уменьшает число мест, если работающих мастеров меньше, чем мест
   *   staff[].days: график мастера на неделю [[c, по] | null] × 7, без него — часы работы
   */
  const hm = (x) => {
    const [h, m] = String(x).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const wd = (d) => (d.getDay() + 6) % 7;
  const S = {
    ymd,
    own: (c) => !!c.schedule && c.schedule.mode !== 'external',
    externalUrl: (c) => (c.schedule && c.schedule.mode === 'external' && /^https:\/\/[^\s"'<>]+$/.test(c.schedule.url || '') ? c.schedule.url : ''),
    byStaff: (c) => !!(c.booking && c.booking.askStaff && c.staff.length),
    resources: (c) => (S.byStaff(c) ? c.staff.map((m) => m.id) : ['']),
    // мест в общем графике: не больше, чем мастеров на работе в день d (остальные в отпуске или выходной)
    cap(c, rid, d) {
      if (rid) return 1;
      const max = Math.max(1, Number((c.schedule && c.schedule.capacity) || 1));
      if (!d || !c.staff.length) return max;
      const day = wd(new Date(d + 'T00:00:00'));
      const on = c.staff.filter((m) => !(Array.isArray(m.days) && !m.days[day]) && !S.off(c, m.id, d)).length;
      return Math.min(max, on);
    },
    hours(c, rid, date) {
      const m = rid && c.staff.find((x) => x.id === rid);
      const h = m && Array.isArray(m.days) ? m.days[wd(date)] : c.hours[wd(date)];
      return h && h[0] && h[1] ? [hm(h[0]), hm(h[1])] : null;
    },
    off(c, rid, d) {
      return ((c.schedule && c.schedule.off) || []).some((o) => (!o.s || o.s === rid) && o.from && d >= o.from && d <= (o.to || o.from));
    },
    // сколько мест ресурса заняты в минуту m дня d
    used(c, rid, d, m, busy) {
      const blocks = (c.schedule && c.schedule.blocks) || [];
      const step = c.booking.step || 30;
      if (blocks.some((b) => b.d === d && (!b.s || b.s === rid) && m >= b.m && m < b.m + step)) return Infinity;
      return (busy || []).filter((b) => b.d === d && (rid ? b.s === rid : true) && m >= b.m && m < b.m + (b.dur || step)).length;
    },
    free(c, rid, date, m, dur, busy) {
      const h = S.hours(c, rid, date);
      const d = ymd(date);
      if (!h || S.off(c, rid, d) || m < h[0] || m + dur > h[1]) return false;
      const step = c.booking.step || 30;
      for (let t = m; t < m + dur; t += step) if (S.used(c, rid, d, t, busy) >= S.cap(c, rid, d)) return false;
      return true;
    },
    // сетка дня: rid = null — «любой мастер» (свободно, если свободен хоть кто-то)
    daySlots(c, date, rid, dur, busy, cut) {
      const step = c.booking.step || 30;
      const ids = rid ? [rid] : S.resources(c);
      const spans = ids.map((id) => S.hours(c, id, date)).filter(Boolean);
      if (!spans.length) return [];
      const from = Math.min(...spans.map((x) => x[0]));
      const to = Math.max(...spans.map((x) => x[1]));
      const len = Math.max(step, dur || step);
      const out = [];
      for (let m = from; m + step <= to; m += step) {
        out.push({ m, busy: !ids.some((id) => S.free(c, id, date, m, len, busy)), past: cut != null && m < cut });
      }
      return out.filter((x) => ids.some((id) => { const h = S.hours(c, id, date); return h && x.m >= h[0] && x.m + step <= h[1]; }));
    },
  };
  Slot.sched = S;

  /* ---------- тема «Своя» ---------- */

  // Шрифты с кириллицей из Google Fonts. w — начертания, которые у шрифта точно есть
  // (лишнее начертание в запросе ломает загрузку всего файла шрифтов).
  const serif = 'Georgia, "Times New Roman", serif';
  const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  Slot.FONTS = {
    display: [
      { id: 'cormorant', name: 'Cormorant', note: 'изящная антиква', w: [600, 700], weight: 700, scale: 1.1, fb: serif },
      { id: 'playfair', name: 'Playfair Display', note: 'контрастная антиква', w: [600, 700], weight: 700, scale: 1, fb: serif },
      { id: 'prata', name: 'Prata', note: 'классика, вывеска', w: [400], weight: 400, scale: 0.95, fb: serif },
      { id: 'yeseva', name: 'Yeseva One', note: 'мягкая, «салонная»', w: [400], weight: 400, scale: 0.95, fb: serif },
      { id: 'lora', name: 'Lora', note: 'спокойная антиква', w: [400, 500, 600, 700], weight: 700, scale: 1, fb: serif },
      { id: 'oswald', name: 'Oswald', note: 'узкая, плакатная', w: [500, 600], weight: 600, scale: 1, fb: sans },
      { id: 'russo', name: 'Russo One', note: 'техничная, «гаражная»', w: [400], weight: 400, scale: 0.9, fb: sans },
      { id: 'unbounded', name: 'Unbounded', note: 'широкая, современная', w: [500, 600, 700], weight: 600, scale: 0.85, fb: sans },
      { id: 'exo2', name: 'Exo 2', note: 'спортивная', w: [600, 700], weight: 700, scale: 1, fb: sans },
      { id: 'manrope', name: 'Manrope', note: 'строгая гротеск', w: [400, 500, 600, 700, 800], weight: 800, scale: 0.95, fb: sans },
      { id: 'montserrat', name: 'Montserrat', note: 'геометрическая', w: [400, 500, 600, 700, 800], weight: 700, scale: 0.92, fb: sans },
      { id: 'comfortaa', name: 'Comfortaa', note: 'округлая, дружелюбная', w: [600, 700], weight: 700, scale: 0.92, fb: sans },
    ],
    body: [
      { id: 'onest', name: 'Onest', note: 'нейтральный', w: [400, 500, 600, 700], fb: sans },
      { id: 'golos', name: 'Golos Text', note: 'чёткий, для экранов', w: [400, 500, 600, 700], fb: sans },
      { id: 'manrope', name: 'Manrope', note: 'строгий', w: [400, 500, 600, 700, 800], fb: sans },
      { id: 'inter', name: 'Inter', note: 'универсальный', w: [400, 500, 600, 700], fb: sans },
      { id: 'montserrat', name: 'Montserrat', note: 'геометрический', w: [400, 500, 600, 700, 800], fb: sans },
      { id: 'rubik', name: 'Rubik', note: 'мягкий', w: [400, 500, 600, 700], fb: sans },
      { id: 'nunito', name: 'Nunito', note: 'округлый', w: [400, 500, 600, 700], fb: sans },
      { id: 'ptsans', name: 'PT Sans', note: 'привычный', w: [400, 700], fb: sans },
      { id: 'lora', name: 'Lora', note: 'с засечками', w: [400, 500, 600, 700], fb: serif },
    ],
  };
  Slot.RADII = {
    sharp: { label: 'Острые', radius: '3px', radiusLg: '6px', radiusBtn: '3px' },
    soft: { label: 'Мягкие', radius: '10px', radiusLg: '16px', radiusBtn: '10px' },
    round: { label: 'Круглые', radius: '14px', radiusLg: '24px', radiusBtn: '999px' },
  };
  Slot.SPACES = { compact: { label: 'Плотные', k: 0.72 }, normal: { label: 'Обычные', k: 1 }, airy: { label: 'Просторные', k: 1.3 } };
  Slot.MOTIONS = { elegant: 'Плавная', mechanical: 'Чёткая', bold: 'Яркая' };
  Slot.TEXT_SIZES = { s: { label: 'Мелкий', k: 0.93 }, m: { label: 'Обычный', k: 1 }, l: { label: 'Крупный', k: 1.1 } };
  Slot.HEAD_SIZES = { s: { label: 'Сдержанные', k: 0.85 }, m: { label: 'Обычные', k: 1 }, l: { label: 'Крупные', k: 1.15 } };
  Slot.CUSTOM_DEFAULT = {
    display: 'manrope',
    body: 'onest',
    upper: false,
    bg: '#F5F4F0',
    fg: '#1E2125',
    accent: '#C2502E',
    radius: 'soft',
    space: 'normal',
    motion: 'mechanical',
    text: 'm',
    heads: 'm',
  };

  // Цвета: #RGB / #RRGGBB → [r, g, b]
  const rgb = (hex) => {
    let h = String(hex || '').trim().replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  };
  const hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
  const alpha = (a, t) => `rgba(${rgb(a).join(',')},${t})`;
  const lum = (a) => {
    const [r, g, b] = rgb(a).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // Сдвигаем цвет к «читаемому» краю, пока контраст с фоном не станет достаточным
  const readable = (color, bg, toward, min) => {
    let c = color;
    for (let t = 0.1; contrast(c, bg) < min && t <= 1; t += 0.1) c = mix(color, toward, t);
    return c;
  };
  Slot.color = { rgb, mix, contrast };

  // Шрифты лежат в комплекте сайта (assets/fonts → fonts/, см. scripts/fonts.mjs): по адресу Google Fonts
  // из стиля находим семейства и подключаем их файлы. base — путь к папке шрифтов от страницы;
  // без него (предпросмотр в Claude) остаётся ссылка на Google.
  Slot.fontFamilies = (spec) =>
    Array.from(String(spec || '').matchAll(/family=([^&]+)/g), (m) => decodeURIComponent(m[1]).replace(/\+/g, ' ').split(':')[0]);
  Slot.fontSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  Slot.fontHrefs = (spec, base) =>
    !spec ? [] : base == null ? [spec] : Slot.fontFamilies(spec).map((n) => base + Slot.fontSlug(n) + '.css');

  const fontQuery = (fonts) => {
    const fam = {};
    fonts.forEach(({ f, w }) => {
      fam[f.name] = Array.from(new Set((fam[f.name] || []).concat(w))).sort((a, b) => a - b);
    });
    return (
      'https://fonts.googleapis.com/css2?' +
      Object.keys(fam)
        .map((n) => `family=${n.replace(/ /g, '+')}${fam[n].length === 1 && fam[n][0] === 400 ? '' : ':wght@' + fam[n].join(';')}`)
        .join('&') +
      '&display=swap'
    );
  };

  // Владелец задаёт три цвета, шрифты, скругления, отступы и анимацию — остальное выводим сами
  Slot.customStyle = (opts) => {
    const t = Object.assign({}, Slot.CUSTOM_DEFAULT, opts);
    ['bg', 'fg', 'accent'].forEach((k) => {
      if (!rgb(t[k])) t[k] = Slot.CUSTOM_DEFAULT[k];
    });
    const D = Slot.FONTS.display.find((f) => f.id === t.display) || Slot.FONTS.display[0];
    const B = Slot.FONTS.body.find((f) => f.id === t.body) || Slot.FONTS.body[0];
    const r = Slot.RADII[t.radius] || Slot.RADII.soft;
    const sp = Slot.SPACES[t.space] || Slot.SPACES.normal;
    const tx = Slot.TEXT_SIZES[t.text] || Slot.TEXT_SIZES.m;
    const hd = Slot.HEAD_SIZES[t.heads] || Slot.HEAD_SIZES.m;
    const dark = lum(t.bg) < 0.25;
    const fg = readable(t.fg, t.bg, dark ? '#FFFFFF' : '#000000', 7);
    const onAccent = contrast('#FFFFFF', t.accent) >= contrast('#111111', t.accent) ? '#FFFFFF' : '#111111';
    const accentText = readable(t.accent, t.bg, fg, 4.5);
    const muted = readable(mix(fg, t.bg, 0.38), t.bg, fg, 4.6);
    const font = (f) => `"${f.name}", ${f.fb}`;
    return {
      id: 'custom',
      label: 'Своя',
      custom: true,
      spec: `${D.name} + ${B.name} · ${tx.label.toLowerCase()} текст · ${r.label.toLowerCase()} углы · ${sp.label.toLowerCase()} отступы · ${Slot.MOTIONS[t.motion] ? Slot.MOTIONS[t.motion].toLowerCase() : 'чёткая'} анимация`,
      scheme: dark ? 'dark' : 'light',
      motion: Slot.MOTIONS[t.motion] ? t.motion : 'mechanical',
      texture: 'none',
      fonts: fontQuery([
        { f: D, w: [D.weight] },
        { f: B, w: B.w.filter((x) => x >= 400 && x <= 700) },
      ]),
      tokens: {
        bg: t.bg,
        surface: mix(t.bg, fg, dark ? 0.05 : 0.025),
        raised: mix(t.bg, fg, dark ? 0.09 : 0.055),
        line: alpha(fg, dark ? 0.16 : 0.13),
        fg,
        muted,
        accent: t.accent,
        onAccent,
        accentText,
        accentSoft: alpha(t.accent, dark ? 0.16 : 0.11),
        stripeA: t.accent,
        stripeB: fg,
        stripeC: t.bg,
        err: dark ? '#FF9B8F' : '#B42318',
        display: font(D),
        body: font(B),
        displayWeight: String(D.weight),
        displayScale: String(Math.round(D.scale * hd.k * 1000) / 1000),
        displayTracking: t.upper ? '0.02em' : '-0.01em',
        displayCase: t.upper ? 'uppercase' : 'none',
        radius: r.radius,
        radiusLg: r.radiusLg,
        radiusBtn: r.radiusBtn,
        photoCtaBg: t.accent,
        photoCtaFg: onAccent,
        space: String(sp.k),
        textScale: String(tx.k),
      },
      // полоса с акциями — на цвете акцента
      invert: {
        bg: t.accent,
        surface: mix(t.accent, onAccent, 0.08),
        raised: mix(t.accent, onAccent, 0.14),
        line: alpha(onAccent, 0.24),
        fg: onAccent,
        muted: mix(onAccent, t.accent, 0.22),
        accent: onAccent,
        onAccent: t.accent,
        accentText: onAccent,
      },
      // для подсказки в админке: читается ли основной текст на фоне
      contrast: Math.round(contrast(t.fg, t.bg) * 10) / 10,
    };
  };

  // Иконка вкладки: загруженная в админке (PNG 128×128 в данных) или первая буква названия на цвете акцента
  Slot.favicon = (c, st) => {
    const own = c.brand.favicon;
    if (own && /^data:image\/(png|jpeg|webp|svg\+xml)[;,]/.test(own)) {
      const href = own.replace(/"/g, '%22');
      return `<link rel="icon" href="${href}">\n<link rel="apple-touch-icon" href="${href}">`;
    }
    const t = st.tokens || {};
    const letter = (c.brand.name || 'С').trim().charAt(0).toUpperCase().replace(/[<>&"']/g, '');
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${t.accent || '#222'}"/>` +
      `<text x="32" y="44" font-family="Arial,sans-serif" font-size="36" font-weight="700" text-anchor="middle" fill="${t.onAccent || '#fff'}">${letter}</text></svg>`;
    return `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}">`;
  };

  /* ---------- секции ---------- */

  const R = {};

  // Логотип: загруженная в админке картинка (data URL или файл сайта) или название текстом
  const logoSrc = (c) => {
    const src = c.brand && c.brand.logo;
    return src && /^(data:image\/(png|jpeg|webp|svg\+xml)[;,]|(img|uploads)\/|\/assets\/)/.test(src) ? src : '';
  };
  const logoMark = (c, small) => {
    const src = logoSrc(c);
    if (!src) return `<span class="logo__name">${esc(c.brand.name)}</span>${small ? '' : `\n      <span class="logo__kind">${esc(c.brand.kind)}</span>`}`;
    const tone = c.brand.logoTone === 'light' || c.brand.logoTone === 'dark' ? ` logo__img--${c.brand.logoTone}` : '';
    return `<img class="logo__img${tone}" src="${esc(src)}" alt="${esc(c.brand.kind)} «${esc(c.brand.name)}»">`;
  };
  Slot.logoSrc = logoSrc;

  R.header = (c) => {
    const links = c.nav.map((n) => `<a href="#${esc(n.id)}">${esc(n.label)}</a>`).join('');
    return `
<header class="hdr">
  <div class="wrap hdr__in">
    <a class="logo${logoSrc(c) ? ' logo--img' : ''}" href="#top" aria-label="${esc(c.brand.kind)} «${esc(c.brand.name)}», наверх">
      ${logoMark(c)}
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
    // Где мастера при записи не выбирают (автосервис) — одна строка с ближайшим свободным временем
    const general = !!(c.booking && c.booking.askStaff === false);
    const rows = general
      ? `
      <li class="qw__row qw__row--general" style="--i:0">
        <span class="ava" aria-hidden="true">${ic('calendar')}</span>
        <span class="qw__who"><b>Ближайшее время</b><span>Запись на любую работу</span></span>
        <span class="qw__slots" data-qw-slots=""></span>
      </li>`
      : c.staff
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
        <span class="qw__dur" data-est-dur>${first.duration ? ic('clock') + 'около ' + duration(first.duration) : ''}</span>
      </div>
      <p class="qw__note">${esc(w.note)}</p>
      <p class="qw__slot">${ic('calendar')}Ближайшее окно: <b data-est-slot>${esc(w.slotLabel || 'завтра, 09:00')}</b></p>
      <button class="btn btn--accent btn--block" type="button" data-book data-from-estimate>${esc(w.cta)}</button>
    </div>`;
  }

  const countText = (p) => (p.countText ? esc(p.countText) : num(p.count) + NBSP + plural(p.count, ['отзыв', 'отзыва', 'отзывов']));

  R.hero = (c) => {
    const h = c.hero;
    const proof = (h.proof || [])
      .map(
        (p) => `
        <li class="proof__item">
          <span class="proof__rate">${p.rating ? ic('star') + esc(p.rating) : esc(p.big)}</span>
          <span class="proof__src">${esc(p.source)}<br>${countText(p)}</span>
        </li>`
      )
      .join('');
    // при записи через внешнюю систему (YCLIENTS и т. п.) окон у нас нет — блок «Свободные окна» не показываем
    const hw = Slot.heroWidget(c);
    const w = hw && !(hw.type === 'slots' && Slot.sched.externalUrl(c)) ? hw : null;
    const widget = !w ? '' : w.type === 'estimate' ? widgetEstimate(c, w) : widgetSlots(c, w);
    const words = h.title.split(/\s+/);
    const title = words.map((w, i) => `<span class="w"><span style="--i:${i + 1}">${esc(w)}</span></span>`).join(' ');
    const k = Math.min(words.length, 6) + 1; // дальше заголовка задержка не растёт
    return `
<section class="hero${h.image ? ' hero--photo' : ''}${w ? '' : ' hero--solo'}" aria-labelledby="hero-title">
  ${
    h.image
      ? `<div class="hero__bg"><img src="${esc(h.image)}" alt="${esc(h.imageAlt || '')}" fetchpriority="high">${
          h.video ? `<video autoplay muted loop playsinline preload="metadata" poster="${esc(h.image)}" aria-hidden="true"><source src="${esc(h.video)}" type="video/mp4"></video>` : ''
        }</div>`
      : ''
  }
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
    ${widget ? `<aside class="hero__widget card card--stripe" aria-label="${esc(w.title)}">${widget}</aside>` : ''}
  </div>
</section>`;
  };

  R.perks = (c, s) => `
<section class="perks" aria-label="${esc(s.label)}">
  <div class="wrap">
    <ul class="perks__list">${s.items
      .map((p) => `<li class="perk"><span class="ico">${ic(p.icon)}</span><span><b>${esc(p.title)}</b><span>${esc(p.text)}</span></span></li>`)
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
          `<button class="tab" type="button" role="tab" id="svc-t-${i}" aria-controls="svc-p-${i}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}>${cat.icon ? ic(cat.icon) : ''}${esc(cat.category)}</button>`
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

  // Фото мастеров. В шаблонах ниш мастер без фото получает сгенерированный портрет-заглушку из staffPortraits
  // (сначала те, что ещё не стоят у других мастеров). У сайтов клиентов заглушек нет — там инициалы.
  Slot.staffPhotos = (c) => {
    const pool = c.staffPortraits || [];
    const free = pool.filter((p) => !c.staff.some((m) => m.img === p));
    const list = free.length ? free : pool;
    let k = 0;
    return c.staff.map((m) => m.img || (list.length ? list[k++ % list.length] : ''));
  };

  R.staff = (c, s) => {
    const photos = Slot.staffPhotos(c);
    return `
<section class="${secCls(s)}" id="staff" aria-labelledby="staff-title">
  <div class="wrap">
    ${secHead('staff', s)}
    <ul class="staff">${c.staff
      .map(
        (m, i) => `
      <li class="staff__card">
        ${
          photos[i]
            ? photo({ img: photos[i], alt: m.name }, 'photo--portrait')
            : `<div class="photo photo--portrait photo--mono" aria-hidden="true"><span class="photo__mark">${esc(initials(m.name))}</span></div>`
        }
        <div class="staff__body">
          <h3 class="staff__name">${esc(m.name)}</h3>
          <p class="staff__role">${esc(m.role)}${m.years ? ` · стаж ${m.years}${NBSP}${plural(m.years, ['год', 'года', 'лет'])}` : ''}</p>
          <p class="staff__note">${esc(m.note || '')}</p>
          ${
            // запись к мастеру — только там, где при записи выбирают мастера (барбершоп); в автосервисе блок без кнопок
            !c.booking || c.booking.askStaff
              ? `<button class="btn btn--line btn--block" type="button" data-book data-staff="${esc(m.id)}">${m.dative ? `Записаться к${NBSP}${esc(m.dative)}` : 'Записаться'}</button>`
              : ''
          }
        </div>
      </li>`
      )
      .join('')}</ul>
  </div>
</section>`;
  };

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
        <span class="ico ico--lg">${ic(o.icon)}</span>
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
    const sum = (c.hero.proof || [])
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

  // Живая карта Яндекса. Точный адрес виджета — contacts.mapWidget (из Яндекс Карт: «Поделиться» →
  // «Встроить карту»; можно вставить код целиком, возьмём src). Иначе строим по ссылке на организацию.
  // У вымышленных демо-ниш организации нет — у них остаётся схема.
  const MAP_WIDGET = /^https:\/\/yandex\.(ru|com)\/map-widget\//;
  const mapWidget = (k) => {
    if (k.mapWidget) {
      const src = (/src="([^"]+)"/.exec(k.mapWidget) || [null, k.mapWidget])[1].trim().replace(/&amp;/g, '&');
      if (MAP_WIDGET.test(src)) return src;
    }
    const org = /^https:\/\/yandex\.ru\/maps\/(?:\d+\/[^/]+\/)?org\/([^/?#]+)\/(\d+)/.exec(k.yandexMaps || '');
    if (org) return `https://yandex.ru/map-widget/v1/org/${org[1]}/${org[2]}/`;
    // точка по координатам [широта, долгота] — для вымышленных демо-ниш, у которых нет организации
    if (Array.isArray(k.coords) && k.coords.length === 2) {
      const ll = `${Number(k.coords[1])},${Number(k.coords[0])}`;
      return `https://yandex.ru/map-widget/v1/?ll=${ll}&z=16&pt=${ll},pm2rdm`;
    }
    return '';
  };
  Slot.mapWidget = mapWidget;

  R.contacts = (c, s) => {
    const k = c.contacts;
    const msgs = k.messengers
      .map((m) => `<a class="btn btn--line" href="${esc(m.url)}" target="_blank" rel="noopener">${ic(m.icon)}${esc(m.label)}</a>`)
      .join('');
    const widget = mapWidget(k);
    const links = `<div class="map__links">
        <a class="btn btn--surface btn--sm" href="${esc(k.yandexMaps)}" target="_blank" rel="noopener">Яндекс Карты</a>
        <a class="btn btn--surface btn--sm" href="${esc(k.twoGis)}" target="_blank" rel="noopener">2ГИС</a>
      </div>`;
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
    ${
      widget
        ? `<div class="contacts__map">
      <div class="map map--live"><iframe src="${esc(widget)}" title="Карта: ${esc(k.city)}, ${esc(k.address)}" loading="lazy" allowfullscreen></iframe></div>
      ${links}
    </div>`
        : `<div class="map" role="img" aria-label="Схема проезда: ${esc(k.address)}">
      <span class="map__road map__road--a"></span><span class="map__road map__road--b"></span>
      <span class="map__pin"><span class="map__dot">${ic('pin')}</span><b>${esc(c.brand.name)}</b></span>
      ${links}
    </div>`
    }
  </div>
</section>`;
  };

  /* ---------- документы: политика и согласие ---------- */

  // Строка «ИП Иванов И. И. · ИНН 123» для подвала: старое поле entity или оператор + ИНН
  const legalEntity = (l) => (l.entity ? l.entity : [l.operator, l.inn ? 'ИНН ' + l.inn : ''].filter(Boolean).join(' · '));

  /*
   * Текст документа, вставленный владельцем (из Word, от юриста), → безопасная разметка.
   * Каждая строка — абзац. Заголовок — первая строка документа, нумерованный пункт без точки в конце
   * («1. Общие положения») или строка заглавными буквами. Строки с «—», «-» или «•» в начале — список.
   * HTML из текста не исполняется: всё экранируется.
   */
  Slot.legalHtml = (text) => {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
    const out = [];
    let list = [];
    const flush = () => {
      if (list.length) out.push(`<ul>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`);
      list = [];
    };
    lines.forEach((l) => {
      if (!l) return flush();
      const item = /^[-—–•·]\s+(.*)$/.exec(l);
      if (item) return list.push(item[1]);
      flush();
      const short = l.length <= 90 && !/[.;:,…]$/.test(l);
      const caps = /[А-ЯЁA-Z]{4}/.test(l) && l === l.toUpperCase();
      const heading = short && (!out.length || /^\d+(\.\d+)*\.?\s/.test(l) || caps);
      out.push(heading ? `<h2>${esc(l)}</h2>` : `<p>${esc(l)}</p>`);
    });
    flush();
    return out.join('');
  };

  const today = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  // Шаблоны по 152-ФЗ: подставляем данные владельца, чего нет — в квадратных скобках.
  // Это заготовка, а не юридическая консультация: перед публикацией текст проверяет юрист.
  Slot.legalTemplates = (c) => {
    const l = c.legal || {};
    const k = c.contacts || {};
    const v = (x, hint) => (x && String(x).trim()) || `[${hint}]`;
    const op = v(l.operator, 'укажите ИП или ООО');
    const inn = v(l.inn, 'укажите ИНН');
    const addr = v(l.address, 'укажите юридический адрес');
    const mail = v(l.email, 'укажите e-mail для обращений');
    const place = `${c.brand.kind} «${c.brand.name}»${k.city ? `, ${k.city}${k.address ? ', ' + k.address : ''}` : ''}`;
    const date = l.updated || today();
    const ym = !!Slot.metrikaId(c);
    const privacy = `Политика обработки персональных данных
Редакция от ${date}

1. Общие положения
1.1. Настоящая Политика определяет порядок обработки персональных данных посетителей сайта ${place} (далее — Сайт) и меры по их защите в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».
1.2. Оператор персональных данных — ${op}, ИНН ${inn}, адрес: ${addr} (далее — Оператор).
1.3. Политика действует в отношении всех персональных данных, которые Оператор получает через Сайт.

2. Какие данные мы обрабатываем
— имя;
— номер телефона;
— предпочтительный способ связи;
— выбранные услуга, мастер, дата и время записи;
— сведения, которые вы сами указываете в комментарии и дополнительных полях формы записи;
— технические данные: cookie, IP-адрес, сведения о браузере и устройстве.

3. Цели обработки
— запись на услуги и её подтверждение, перенос или отмена;
— связь с вами по вопросам записи и оказания услуг;
— ответы на ваши обращения;
— обеспечение работы Сайта.

4. Правовые основания
4.1. Ваше согласие на обработку персональных данных, которое вы даёте, отправляя заявку на Сайте.
4.2. Заключение и исполнение договора оказания услуг, стороной которого вы являетесь.

5. Порядок и условия обработки
5.1. Оператор собирает, записывает, систематизирует, хранит, уточняет, использует, блокирует, удаляет и уничтожает персональные данные с использованием средств автоматизации и без них.
5.2. Персональные данные хранятся на серверах, расположенных на территории Российской Федерации.
5.3. Оператор не передаёт персональные данные третьим лицам, кроме случаев, предусмотренных законодательством Российской Федерации${ym ? ', и сведений о посещениях, которые собирает сервис «Яндекс Метрика» (раздел 6)' : ''}.
5.4. Персональные данные обрабатываются до достижения целей обработки или до отзыва согласия, если иное не предусмотрено законом.

6. Файлы cookie
6.1. Сайт использует cookie, необходимые для работы онлайн-записи и карты проезда. Карта предоставляется сервисом «Яндекс Карты», который может использовать собственные cookie.${ym ? `
6.2. Для статистики посещений Сайт использует сервис веб-аналитики «Яндекс Метрика» (ООО «ЯНДЕКС», 119021, г. Москва, ул. Льва Толстого, д. 16). С помощью cookie сервис собирает сведения о посещениях: просмотренные страницы, время на сайте, источник перехода, тип устройства и браузера, IP-адрес. Сведения обрабатываются в обобщённом виде, чтобы делать Сайт удобнее. Метрика подключается только после того, как вы нажали «Понятно» в сообщении о cookie. Записи действий на сайте (Вебвизор) не ведутся.` : ''}
6.${ym ? 3 : 2}. Вы можете отключить cookie в настройках браузера, однако часть функций Сайта может перестать работать.

7. Ваши права
Вы вправе:
— получить сведения об обработке ваших персональных данных;
— потребовать уточнения, блокирования или уничтожения данных, если они неполные, устаревшие, неточные или обрабатываются незаконно;
— отозвать согласие на обработку персональных данных;
— обжаловать действия Оператора в Роскомнадзоре или в суде.

8. Защита персональных данных
Оператор принимает правовые, организационные и технические меры для защиты персональных данных: ограничивает доступ к ним, использует пароли и защищённое соединение.

9. Обращения
Запросы и отзыв согласия направляйте на e-mail ${mail} или по адресу: ${addr}. Оператор отвечает на запросы в течение 10 рабочих дней.

10. Изменение Политики
Оператор может изменять Политику. Действующая редакция всегда опубликована на Сайте.`;
    const consent = `Согласие на обработку персональных данных
Редакция от ${date}

Отправляя заявку на сайте ${place}, я свободно, своей волей и в своём интересе даю согласие ${op}, ИНН ${inn}, адрес: ${addr} (далее — Оператор), на обработку моих персональных данных на следующих условиях.

1. Персональные данные
Имя, номер телефона, предпочтительный способ связи, выбранные услуга, мастер, дата и время записи, а также сведения, которые я указываю в комментарии и дополнительных полях формы.

2. Цели обработки
Запись на услуги, её подтверждение, перенос или отмена, связь со мной по вопросам записи и оказания услуг.

3. Действия с данными
Сбор, запись, систематизация, накопление, хранение, уточнение, использование, блокирование, удаление, уничтожение — с использованием средств автоматизации и без них.

4. Срок действия
Согласие действует до достижения целей обработки или до его отзыва.

5. Отзыв согласия
Я могу отозвать согласие, направив заявление на e-mail ${mail} или по адресу: ${addr}. После отзыва Оператор прекращает обработку и уничтожает персональные данные в сроки, установленные законом.

Я подтверждаю, что ознакомлен(а) с Политикой обработки персональных данных.`;
    return { privacy, consent };
  };

  R.docs = (c) => {
    const l = c.legal || {};
    const tpl = Slot.legalTemplates(c);
    const doc = (id, title) => `
<section class="doc" id="${id}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
  <div class="wrap doc__in">
    <a class="doc__back" href="#top" data-doc-close>${ic('left')}<span>Вернуться на сайт</span></a>
    <article class="doc__text">${Slot.legalHtml((l[id] && l[id].trim()) || tpl[id])}</article>
    <a class="btn btn--line" href="#top" data-doc-close>Вернуться на сайт</a>
  </div>
</section>`;
    return doc('privacy', 'Политика обработки персональных данных') + doc('consent', 'Согласие на обработку персональных данных');
  };

  R.footer = (c) => `
<footer class="ftr">
  <div class="wrap ftr__in">
    <div class="ftr__brand">${logoMark(c, true)}${c.legal && legalEntity(c.legal) ? `<span>${esc(legalEntity(c.legal))}</span>` : ''}</div>
    <nav class="ftr__links" aria-label="Документы">
      <a href="#privacy">Политика обработки персональных данных</a>
      <a href="#consent">Согласие на обработку персональных данных</a>
    </nav>
    <p class="ftr__made">© ${esc((c.legal && c.legal.year) || '2026')} · Разработано с <span class="heart" role="img" aria-label="любовью">❤️</span> в <a href="https://top-in.ru" target="_blank" rel="noopener">top-in.ru</a></p>
  </div>
</footer>`;

  // Рекламная плашка над шапкой: одна акция и кнопка записи на неё
  // Плашка с акцией: владелец меняет текст и выключает её в админке (promo.show = false)
  R.promo = (c) =>
    c.promo && c.promo.show !== false && String(c.promo.text || '').trim()
      ? `
<div class="promo">
  <div class="wrap promo__in">
    <span class="promo__ic">${ic(c.promo.icon || 'sparkle')}</span>
    <p class="promo__text">${esc(c.promo.text)}</p>
    <button class="promo__cta" type="button" data-book${c.promo.service ? ` data-service="${esc(c.promo.service)}"` : ''}>${esc(c.promo.cta || 'Записаться')}${ic('right')}</button>
  </div>
</div>`
      : '';

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

  R.cookie = (c) => `
<div class="cookie" data-cookie hidden>
  <p>Сайт использует cookie: они нужны для записи онлайн${Slot.metrikaId(c) ? ', карты проезда и статистики посещений' : ' и карты проезда'}. <a href="#privacy">Подробнее</a></p>
  <button class="btn btn--line btn--sm" type="button" data-cookie-ok>Понятно</button>
</div>`;

  /* ---------- данные ---------- */

  // Виджет первого экрана, как его надо показать: в калькуляторе — только существующие работы с ценой
  // и хотя бы одна марка; если считать нечего — вместо калькулятора ближайшее время для записи
  // Номер счётчика Яндекс Метрики (вкладка «Настройки»); пусто — статистика выключена
  Slot.metrikaId = (c) => {
    const id = String((c.seo && c.seo.metrika) || '').trim();
    return /^\d{5,12}$/.test(id) ? id : '';
  };

  Slot.heroWidget = (c) => {
    const w = c.hero && c.hero.widget;
    if (!w || w.type !== 'estimate') return w || null;
    const services = (w.services || []).filter((id) => {
      const s = Slot.findService(c, id);
      return s && s.price && s.price.value > 0;
    });
    const brands = (w.brands || []).filter((b) => b && b.name && b.k > 0);
    if (!services.length || !brands.length) return { type: 'slots', title: 'Запись онлайн', more: w.more || 'Выбрать работу и время' };
    return Object.assign({}, w, { services, brands, defaultBrand: Math.min(Math.max(0, w.defaultBrand || 0), brands.length - 1) });
  };

  Slot.findService = (c, id) => {
    for (const cat of c.services) for (const it of cat.items) if (it.id === id) return Object.assign({ category: cat.category }, it);
    return null;
  };

  Slot.roundPrice = (v) => Math.round(v / 100) * 100;

  // Сайт клиента = шаблон ниши + данные клиента (clients/<slug>.json).
  // Секция из списка клиента берёт настройки одноимённой секции ниши и перекрывает их своими.
  // От ниши клиент получает только оформление и поведение. Контент (мастера, услуги, акции,
  // удобства, отзывы, плашка) — только свой: демо-данные вымышленной точки к нему не попадают.
  const TEMPLATE_KEYS = ['label', 'product', 'schemaType', 'timezone', 'booking'];
  const CONTENT_KEYS = ['items', 'levels', 'rows'];

  Slot.compose = (niche, client) => {
    const c = {};
    TEMPLATE_KEYS.forEach((k) => {
      if (niche[k] !== undefined) c[k] = niche[k];
    });
    Object.assign(c, client);
    c.id = client.slug;
    c.staff = client.staff || [];
    // портреты-заглушки — только для самого шаблона ниши (его правят в демо-админке), не для клиентов
    if (client.slug === niche.id && niche.staffPortraits) c.staffPortraits = niche.staffPortraits;
    c.services = client.services || [];
    // фирменный стиль клиента — первым, своя тема из админки — последней
    c.styles = (client.styles || []).concat(niche.styles, client.customTheme ? [Slot.customStyle(client.customTheme)] : []);
    c.defaultStyle = client.style || niche.defaultStyle;
    c.booking = Object.assign({}, niche.booking, client.booking);
    c.hero = Object.assign({}, client.hero);
    // Окна мастеров строятся из данных клиента, поэтому этот виджет можно взять у ниши;
    // калькулятор ссылается на конкретные услуги — его клиент описывает сам
    const nw = niche.hero.widget;
    c.hero.widget =
      client.hero && client.hero.widget
        ? Object.assign({}, client.hero.widget)
        : nw.type === 'slots' && c.staff.length
          ? Object.assign({}, nw)
          : null;
    c.sections = (client.sections || niche.sections.map((s) => s.type)).map((sec) => {
      const o = typeof sec === 'string' ? { type: sec } : sec;
      const base = Object.assign({}, niche.sections.find((n) => n.type === o.type));
      CONTENT_KEYS.forEach((k) => delete base[k]);
      return Object.assign(base, o);
    });
    return c;
  };

  Slot.CONTENT_KEYS = CONTENT_KEYS;

  // Контент демо-ниши в формате данных клиента: так шаблон ниши правится той же админкой,
  // а Slot.compose(ниша, Slot.nicheData(id)) собирает ту же страницу, что и сама ниша
  const NICHE_CONTENT = ['brand', 'promo', 'contacts', 'hours', 'nav', 'hero', 'services', 'staff', 'sections', 'legal', 'schedule'];
  Slot.nicheData = (id) => {
    const n = Slot.niches[id];
    const d = { slug: id, niche: id };
    NICHE_CONTENT.forEach((k) => {
      if (n[k] !== undefined) d[k] = JSON.parse(JSON.stringify(n[k]));
    });
    return d;
  };
  Slot.util = { esc, num, price, duration, plural, initials, ic, DAYS };

  /* ---------- демо: фото и прошлые версии из демо-админки — в IndexedDB браузера ---------- */

  // localStorage вмещает около 5 МБ на весь адрес (на Pages — все демо вместе), а фото в виде
  // data:-строк быстро его заполняют. Поэтому в localStorage лежат данные со ссылками «idb:<ключ>»,
  // а сами фото — в IndexedDB (там сотни мегабайт). Там же — прошлые версии (последние 30), как
  // резервные копии на хостинге. На хостинге фото — файлы в /uploads, это всё не нужно.
  // Ключи: «<сайт>/<хеш>» — фото, «<сайт>|v|<ГГГГММДД-ччммсс>» — версия { at, data }.
  Slot.demoStore = (() => {
    const REF = 'idb:';
    const KEEP = 30;
    let dbp = null;
    const open = () =>
      dbp ||
      (dbp = new Promise((res, rej) => {
        const r = indexedDB.open('slot-demo', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('photos');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }));
    // fn ставит запросы в транзакцию и возвращает объект, который они заполнят
    const run = (mode, fn) =>
      open().then(
        (db) =>
          new Promise((res, rej) => {
            const t = db.transaction('photos', mode);
            const out = fn(t.objectStore('photos'));
            t.oncomplete = () => res(out);
            t.onerror = t.onabort = () => rej(t.error || new Error('IndexedDB'));
          })
      );
    const walk = (v, fn) =>
      Array.isArray(v)
        ? v.map((x) => walk(x, fn))
        : v && typeof v === 'object'
          ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x, fn)]))
          : fn(v);
    const refs = (data, set) => walk(data, (v) => (typeof v === 'string' && v.startsWith(REF) && set.add(v.slice(REF.length)), v));
    const hash = (s) => {
      let h1 = 0xdeadbeef;
      let h2 = 0x41c6ce57;
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 2654435761);
        h2 = Math.imul(h2 ^ c, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36) + s.length.toString(36);
    };
    const photos = (slug) => IDBKeyRange.bound(slug + '/', slug + '/\uffff');
    const vers = (slug) => IDBKeyRange.bound(slug + '|v|', slug + '|v|\uffff');
    // фото → ссылки; новые фото кладём в store
    const toRefs = (s, slug, data) =>
      walk(data, (v) => {
        if (typeof v !== 'string' || !v.startsWith('data:') || v.length < 2048) return v;
        const h = hash(v);
        s.put(v, slug + '/' + h);
        return REF + h;
      });
    // данные → те же данные со ссылками; удаляем фото сайта, на которые не ссылаются ни данные, ни версии
    function pack(slug, data) {
      return run('readwrite', (s) => {
        const out = { light: toRefs(s, slug, data) };
        const used = new Set();
        refs(out.light, used);
        s.getAll(vers(slug)).onsuccess = (e) => {
          e.target.result.forEach((v) => refs(v && v.data, used));
          s.getAllKeys(photos(slug)).onsuccess = (e2) =>
            e2.target.result.forEach((k) => {
              if (!used.has(k.slice(slug.length + 1))) s.delete(k);
            });
        };
        return out;
      }).then((out) => out.light);
    }
    function unpack(slug, data) {
      const need = new Set();
      refs(data, need);
      if (!need.size) return Promise.resolve(data);
      return run('readonly', (s) => {
        const got = {};
        need.forEach((h) => (s.get(slug + '/' + h).onsuccess = (e) => (got[h] = e.target.result)));
        return got;
      }).then((got) => walk(data, (v) => (typeof v === 'string' && v.startsWith(REF) ? got[v.slice(REF.length)] || '' : v)));
    }
    const pad = (n) => String(n).padStart(2, '0');
    return {
      pack,
      unpack,
      has: (json) => typeof json === 'string' && json.indexOf('"' + REF) >= 0,
      // Сохранения, сделанные до IndexedDB, держат фото прямо в localStorage и занимают всё место —
      // переносим их фото в IndexedDB (сайты этих демо продолжают их показывать)
      migrate() {
        const jobs = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          const raw = k && k.indexOf('slot-data-') === 0 ? localStorage.getItem(k) : '';
          if (!raw || raw.length < 20000 || raw.indexOf('"data:') < 0) continue;
          let d = null;
          try {
            d = JSON.parse(raw);
          } catch (e) {
            continue;
          }
          jobs.push(pack(k.slice(10), d).then((light) => localStorage.setItem(k, JSON.stringify(light))));
        }
        return Promise.all(jobs.map((j) => j.catch(() => {})));
      },
      // прошлая версия сайта (перед сохранением или сбросом); хранится KEEP последних
      addVersion(slug, data, label) {
        const d = new Date();
        const id = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
        const at = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} в ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        return run('readwrite', (s) => {
          s.put({ at, label: label || '', data: toRefs(s, slug, data) }, slug + '|v|' + id);
          s.getAllKeys(vers(slug)).onsuccess = (e) => e.target.result.slice(0, -KEEP).forEach((k) => s.delete(k));
        });
      },
      versions: (slug) =>
        run('readonly', (s) => {
          const out = [];
          const r = s.getAllKeys(vers(slug));
          s.getAll(vers(slug)).onsuccess = (e) =>
            e.target.result.forEach((v, i) => out.unshift({ id: r.result[i].split('|v|')[1], at: v.at, label: v.label }));
          return out;
        }),
      version: (slug, id) =>
        run('readonly', (s) => {
          const out = {};
          s.get(slug + '|v|' + id).onsuccess = (e) => (out.v = e.target.result);
          return out;
        }).then((out) => {
          if (!out.v) throw new Error('Такой версии нет');
          return unpack(slug, out.v.data);
        }),
    };
  })();

  /* ---------- страница ---------- */

  // Секции, которые без своих пунктов не имеют смысла, пропускаем
  const NEEDS_ITEMS = ['perks', 'offers', 'steps', 'faq'];
  const hasContent = (c, s) =>
    NEEDS_ITEMS.includes(s.type) ? (s.items || []).length > 0
      : s.type === 'staff' ? c.staff.length > 0
        : s.type === 'services' ? c.services.length > 0
          : s.type === 'gallery' ? (s.items || []).length > 0
            : s.type === 'levels' ? !!(s.levels && s.rows)
              : true;

  Slot.render = (c) => {
    const body = c.sections.map((s) => (R[s.type] && hasContent(c, s) ? R[s.type](c, s) : '')).join('');
    return (
      Slot.sprite() +
      R.promo(c) +
      R.header(c) +
      `<main id="top">${body}</main>` +
      R.footer(c) +
      R.docs(c) +
      R.mbar(c) +
      R.booking() +
      R.cookie(c)
    );
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
