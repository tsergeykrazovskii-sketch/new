/*
 * Слот — админка владельца. Правит data.json сайта, показывает живой предпросмотр
 * и по кнопке «Сохранить» собирает новый index.html.
 *   Рабочий режим: рядом лежит api.php — вход по паролю, файлы сохраняются на хостинге.
 *   Демо-режим (Vercel, предпросмотр): api.php нет — правки хранятся в этом браузере.
 */
(function (g) {
  'use strict';
  const doc = document;
  const Slot = g.Slot;
  const { esc, price } = Slot.util;
  const S = JSON.parse(doc.getElementById('slot-admin').textContent);
  // S: { slug, nicheId, data, siteUrl, base, demo, src: { css, render, app, niche } }
  //    base — путь от админки к сайту ('../'); в предпросмотре для Claude его нет

  const niche = Slot.niches[S.nicheId];
  const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const KEY = 'slot-data-' + S.slug;
  const API = 'api.php';

  let data = clone(S.data);
  let mode = 'demo'; // 'demo' | 'server'
  let csrf = null;
  let tab = 'main';
  let dirty = false;
  let savedAt = null;

  function clone(o) {
    return JSON.parse(JSON.stringify(o));
  }
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch (e) {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  /* ---------- доступ к полям по пути «services.0.items.2.name» ---------- */

  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const keys = path.split('.');
    let o = obj;
    keys.slice(0, -1).forEach((k, i) => {
      if (o[k] == null) o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = val;
  }

  // Секции клиента хранятся списком; находим нужную по типу (или создаём из шаблона ниши)
  function sectionIndex(type) {
    if (!data.sections) data.sections = niche.sections.map((s) => s.type);
    let i = data.sections.findIndex((s) => (typeof s === 'string' ? s : s.type) === type);
    if (i < 0) return -1;
    if (typeof data.sections[i] === 'string') {
      // как в Slot.compose: от ниши берём настройки секции, но не её демо-пункты и фото
      const base = clone(niche.sections.find((s) => s.type === type) || { type });
      Slot.CONTENT_KEYS.forEach((k) => delete base[k]);
      if (niche.sections.some((s) => s.type === type && s.items)) base.items = [];
      data.sections[i] = base;
    }
    return i;
  }

  const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 7);

  // Пути фото считаются от сайта, а админка открыта из его папки /admin
  const imgUrl = (u) => (S.base && !/^(data:|https?:|\/)/.test(u) ? S.base + u : u);

  /* ---------- поля ---------- */

  const input = (label, path, o) => {
    const opt = o || {};
    const v = getPath(data, path);
    const id = 'f-' + path.replace(/\./g, '-');
    const ctl = opt.multiline
      ? `<textarea id="${id}" data-path="${path}" rows="${opt.rows || 3}">${esc(v == null ? '' : v)}</textarea>`
      : `<input id="${id}" data-path="${path}" type="${opt.type || 'text'}"${opt.type === 'number' ? ' inputmode="numeric" data-type="number"' : ''} value="${esc(v == null ? '' : v)}"${opt.placeholder ? ` placeholder="${esc(opt.placeholder)}"` : ''}>`;
    return `<div class="f${opt.wide ? ' f--wide' : ''}"><label for="${id}">${esc(label)}</label>${ctl}${opt.hint ? `<p class="f__hint">${esc(opt.hint)}</p>` : ''}</div>`;
  };

  const tools = (list, i, n) => `
    <span class="tools">
      <button type="button" class="tool" data-act="up" data-list="${list}" data-i="${i}" aria-label="Выше"${i === 0 ? ' disabled' : ''}>↑</button>
      <button type="button" class="tool" data-act="down" data-list="${list}" data-i="${i}" aria-label="Ниже"${i === n - 1 ? ' disabled' : ''}>↓</button>
      <button type="button" class="tool tool--del" data-act="del" data-list="${list}" data-i="${i}">Удалить</button>
    </span>`;

  /* ---------- вкладки ---------- */

  const TABS = [
    { id: 'main', label: 'Главное', anchor: 'top' },
    { id: 'services', label: 'Услуги и цены', anchor: 'services' },
    { id: 'photos', label: 'Фото', anchor: 'top' },
    { id: 'staff', label: 'Мастера', anchor: 'staff' },
    { id: 'reviews', label: 'Отзывы', anchor: 'reviews' },
    { id: 'contacts', label: 'Контакты и часы', anchor: 'contacts' },
    { id: 'style', label: 'Оформление', anchor: 'top' },
    { id: 'docs', label: 'Документы', anchor: 'top' },
    { id: 'schedule', label: 'Расписание', anchor: 'top', sched: true },
    { id: 'bookings', label: 'Заявки', anchor: 'top', bookings: true },
  ];

  const PANELS = {};

  PANELS.main = () => {
    const pi = sectionIndex('perks');
    const perks =
      pi >= 0
        ? `<h3 class="sub">Удобства под первым экраном</h3>
        ${data.sections[pi].items
          .map(
            (p, i) => `<div class="row2">
            ${input('Заголовок', `sections.${pi}.items.${i}.title`)}
            ${input('Пояснение', `sections.${pi}.items.${i}.text`)}
          </div>`
          )
          .join('')}`
        : '';
    return `
      <h2>Главное</h2>
      <div class="row2">
        ${input('Название', 'brand.name')}
        ${input('Тип заведения', 'brand.kind', { placeholder: 'Барбершоп' })}
      </div>
      ${input('Заголовок первого экрана', 'hero.title', { multiline: true, rows: 2 })}
      ${input('Текст под заголовком', 'hero.lead', { multiline: true, rows: 4 })}
      ${input('Кнопка записи', 'hero.cta')}
      ${promoBlock()}
      ${perks}`;
  };

  // Плашка с акцией над шапкой: включается галочкой, ведёт на запись (можно сразу на нужную услугу)
  const PROMO_ICONS = [
    ['percent', 'Скидка %'],
    ['gift', 'Подарок'],
    ['sparkle', 'Звёздочка'],
    ['calendar', 'Календарь'],
    ['scissors', 'Ножницы'],
    ['tire', 'Колесо'],
  ];
  function promoBlock() {
    const p = data.promo || {};
    const on = !!p.text && p.show !== false;
    const svc = (data.services || [])
      .flatMap((cat) => cat.items || [])
      .map((it) => `<option value="${esc(it.id)}"${p.service === it.id ? ' selected' : ''}>${esc(it.name || 'Без названия')}</option>`)
      .join('');
    return `
      <h3 class="sub">Плашка с акцией над шапкой</h3>
      <div class="card">
        <label class="check"><input type="checkbox" data-path="promo.show"${on ? ' checked' : ''}> Показывать плашку на сайте</label>
        ${input('Текст акции', 'promo.text', { placeholder: '−15% на первую стрижку при записи онлайн', hint: 'Коротко, в одну-две строки на телефоне. Пустой текст — плашки нет.' })}
        <div class="row2">
          ${input('Текст кнопки', 'promo.cta', { placeholder: 'Записаться' })}
          <div class="f"><label for="f-promo-service">Кнопка открывает запись на</label>
            <select id="f-promo-service" data-path="promo.service"><option value=""${p.service ? '' : ' selected'}>любую услугу</option>${svc}</select></div>
        </div>
        <div class="f"><span class="f__lbl">Значок</span><div class="segs">${PROMO_ICONS.map(([id, label]) => choice('promo.icon', id, label, p.icon || 'sparkle')).join('')}</div></div>
      </div>`;
  }

  PANELS.services = () => {
    const cats = (data.services || [])
      .map(
        (cat, ci) => `
      <div class="group">
        <div class="group__head">
          ${input('Категория', `services.${ci}.category`)}
          ${tools('services', ci, data.services.length)}
        </div>
        ${cat.items
          .map(
            (it, i) => `
          <div class="card">
            <div class="card__head"><b>${esc(it.name || 'Новая услуга')}</b>${tools(`services.${ci}.items`, i, cat.items.length)}</div>
            ${input('Название', `services.${ci}.items.${i}.name`)}
            ${input('Описание', `services.${ci}.items.${i}.desc`, { hint: 'Необязательно. Одна строка под названием.' })}
            <div class="row3">
              <div class="f"><label for="p-${ci}-${i}">Цена, ₽</label>
                <input id="p-${ci}-${i}" inputmode="numeric" data-kind="price" data-path="services.${ci}.items.${i}" value="${it.price && it.price.value != null ? it.price.value : ''}" placeholder="по запросу"></div>
              <label class="check"><input type="checkbox" data-kind="price-from" data-path="services.${ci}.items.${i}"${it.price && it.price.from ? ' checked' : ''}> «от»</label>
              ${input('Длительность, мин', `services.${ci}.items.${i}.duration`, { type: 'number' })}
            </div>
          </div>`
          )
          .join('')}
        <button type="button" class="add" data-act="add-service" data-i="${ci}">+ Добавить услугу</button>
      </div>`
      )
      .join('');
    const li = sectionIndex('levels');
    const levels =
      li >= 0 && data.sections[li].rows && data.sections[li].levels
        ? `<h3 class="sub">Цены по уровням мастеров</h3>
        ${data.sections[li].rows
          .map(
            (r, ri) => `<div class="card">
            ${input('Услуга', `sections.${li}.rows.${ri}.service`)}
            <div class="row3">${data.sections[li].levels
              .map((lv, k) => input(lv.name + ', ₽', `sections.${li}.rows.${ri}.values.${k}`, { type: 'number' }))
              .join('')}</div>
          </div>`
          )
          .join('')}`
        : '';
    return `
      <h2>Услуги и цены</h2>
      <p class="lead">Пустая цена показывается как «по запросу». Галочка «от» добавляет «от» перед ценой.</p>
      ${cats}
      <button type="button" class="add" data-act="add-cat">+ Добавить категорию</button>
      ${levels}`;
  };

  // Блок «Мастера» создаётся при первом мастере (в шаблоне автосервиса его изначально нет) — сразу после цен
  function ensureStaff() {
    if (sectionIndex('staff') >= 0) return;
    const type = (x) => (typeof x === 'string' ? x : x.type);
    let at = data.sections.findIndex((x) => ['services', 'levels'].includes(type(x)));
    at = at < 0 ? data.sections.findIndex((x) => ['reviews', 'faq', 'contacts'].includes(type(x))) : at + 1;
    data.sections.splice(at < 0 ? data.sections.length : at, 0, {
      type: 'staff',
      title: 'Мастера',
      lead: niche.id === 'auto' ? 'Кто будет заниматься вашей машиной.' : 'Выберите своего мастера или запишитесь к первому свободному.',
    });
  }

  // Галерея создаётся при первом фото: секция «Атмосфера» перед отзывами и бегущая лента после удобств
  function ensureGallery() {
    let gi = sectionIndex('gallery');
    if (gi >= 0) return gi;
    const at = data.sections.findIndex((s) => ['reviews', 'faq', 'contacts'].includes(typeof s === 'string' ? s : s.type));
    data.sections.splice(at < 0 ? data.sections.length : at, 0, { type: 'gallery', title: 'Атмосфера', lead: '', items: [] });
    if (sectionIndex('strip') < 0) {
      const after = data.sections.findIndex((s) => (typeof s === 'string' ? s : s.type) === 'perks');
      data.sections.splice(after < 0 ? 1 : after + 1, 0, { type: 'strip' });
    }
    return sectionIndex('gallery');
  }

  const photoBox = (src, target, label) => `
    <div class="ph ph--wide">
      ${src ? `<img src="${esc(imgUrl(src))}" alt="">` : `<span>нет фото</span>`}
      <label class="ph__btn">${src ? 'Заменить' : label}<input type="file" accept="image/*" data-kind="photo" data-target="${target}" hidden></label>
      ${src ? `<button type="button" class="ph__del" data-act="img-del" data-target="${target}">Убрать</button>` : ''}
    </div>`;

  PANELS.photos = () => {
    const gi = sectionIndex('gallery');
    const items = gi >= 0 ? data.sections[gi].items || [] : [];
    return `
      <h2>Фото</h2>
      <p class="lead">Фото с телефона подойдут. Сайт сам уменьшит их, чтобы страница открывалась быстро.</p>
      <h3 class="sub">Логотип</h3>
      <div class="card logo-card">
        <div class="logo-card__pv" data-tone="${esc(data.brand.logoTone || '')}">${
          data.brand.logo
            ? `<img src="${esc(imgUrl(data.brand.logo))}" alt="">`
            : `<span>${esc(data.brand.name)}</span>`
        }</div>
        <p class="lead">${
          data.brand.logo
            ? 'Логотип уже подогнан под шапку: лишние поля обрезаны, размер уменьшен.'
            : 'Сейчас в шапке название текстом. Загрузите логотип — PNG с прозрачным фоном или SVG подойдут лучше всего, но и JPG справится: сайт сам обрежет поля и подгонит размер.'
        }</p>
        <div class="fav__acts">
          <label class="btn">${data.brand.logo ? 'Заменить' : 'Загрузить логотип'}<input type="file" accept="image/*" data-kind="logo" hidden></label>
          ${data.brand.logo ? '<button type="button" class="btn" data-act="logo-del">Показывать название текстом</button>' : ''}
        </div>
        ${
          data.brand.logo
            ? `<div class="f"><span class="f__lbl">Цвет логотипа</span><div class="segs">${[
                ['', 'Как есть'],
                ['light', 'Белый — для тёмной шапки'],
                ['dark', 'Чёрный — для светлой шапки'],
              ]
                .map(([v, l]) => choice('brand.logoTone', v, l, data.brand.logoTone || ''))
                .join('')}</div><p class="f__hint">«Белый» и «Чёрный» превращают логотип в однотонный силуэт — подходит для однотонных знаков. Цветной логотип оставьте как есть.</p></div>`
            : ''
        }
      </div>
      <h3 class="sub">Иконка сайта</h3>
      <div class="card fav">
        <div class="fav__tab" aria-hidden="true"><img src="${esc(siteIcon())}" alt=""><span>${esc(data.brand.name)}</span></div>
        <p class="lead">Значок на вкладке браузера и на экране телефона. Подойдёт логотип или любая картинка — сайт сам вырежет квадрат по центру. ${data.brand.favicon ? '' : 'Сейчас — первая буква названия на фирменном цвете.'}</p>
        <div class="fav__acts">
          <label class="btn">${data.brand.favicon ? 'Заменить' : 'Загрузить иконку'}<input type="file" accept="image/*" data-kind="favicon" hidden></label>
          ${data.brand.favicon ? '<button type="button" class="btn" data-act="favicon-del">Вернуть букву</button>' : ''}
        </div>
      </div>
      <h3 class="sub">Первый экран</h3>
      <div class="card">${photoBox(data.hero.image, 'hero.image', 'Загрузить фото')}
        ${input('Что на фото (для поисковиков и незрячих)', 'hero.imageAlt', { placeholder: 'Барбер стрижёт клиента' })}</div>
      <h3 class="sub">Галерея и лента атмосферы</h3>
      ${items
        .map(
          (it, i) => `
        <div class="card">
          <div class="card__head"><b>Фото ${i + 1}</b>${tools(`sections.${gi}.items`, i, items.length)}</div>
          <div class="staff-row">
            ${photoBox(it.img, `sections.${gi}.items.${i}.img`, 'Загрузить')}
            <div>${input('Подпись', `sections.${gi}.items.${i}.caption`, { placeholder: 'Скин-фейд' })}</div>
          </div>
        </div>`
        )
        .join('')}
      <label class="add add--file">+ Добавить фото<input type="file" accept="image/*" multiple data-kind="photo-add" hidden></label>`;
  };

  PANELS.staff = () => {
    // как на сайте: своё фото, а в шаблоне ниши — сгенерированный портрет, если своего нет
    const site = Slot.compose(niche, data);
    const photos = Slot.staffPhotos(site);
    const generated = site.staffPortraits || [];
    return `
    <h2>Мастера</h2>
    <p class="lead">Фото лучше вертикальное, по пояс. Его можно снять на телефон.</p>
    ${(data.staff || [])
      .map(
        (m, i) => `
      <div class="card card--staff">
        <div class="card__head"><b>${esc(m.name || 'Новый мастер')}</b>${tools('staff', i, data.staff.length)}</div>
        ${
          generated.includes(photos[i])
            ? '<p class="own__warn">Сгенерированное фото — замените до запуска. Пока это заглушка: на рабочем сайте у мастера должно быть его настоящее фото.</p>'
            : ''
        }
        <div class="staff-row">
          <div class="ph">
            ${photos[i] ? `<img src="${esc(imgUrl(photos[i]))}" alt="">` : `<span>${esc(Slot.util.initials(m.name || '?'))}</span>`}
            <label class="ph__btn">${photos[i] && !generated.includes(photos[i]) ? 'Заменить' : 'Загрузить фото'}<input type="file" accept="image/*" data-kind="photo" data-target="staff.${i}.img" hidden></label>
            ${m.img && !generated.includes(m.img) ? `<button type="button" class="ph__del" data-act="img-del" data-target="staff.${i}.img">Убрать фото</button>` : ''}
          </div>
          <div class="staff-fields">
            ${input('Имя', `staff.${i}.name`)}
            ${site.booking && site.booking.askStaff === false ? '' : input('Для кнопки «Записаться к …»', `staff.${i}.dative`, { placeholder: 'Артёму' })}
            <div class="row2">
              ${input('Должность или уровень', `staff.${i}.role`)}
              ${input('Стаж, лет', `staff.${i}.years`, { type: 'number' })}
            </div>
            ${input('Пара слов о мастере', `staff.${i}.note`)}
          </div>
        </div>
      </div>`
      )
      .join('')}
    <button type="button" class="add" data-act="add-staff">+ Добавить мастера</button>`;
  };

  PANELS.reviews = () => {
    const ri = sectionIndex('reviews');
    if (ri < 0) return '<h2>Отзывы</h2><p class="lead">На этом сайте нет блока отзывов.</p>';
    const items = data.sections[ri].items || (data.sections[ri].items = []);
    return `
      <h2>Отзывы</h2>
      ${input('Подпись под заголовком', `sections.${ri}.lead`)}
      ${items
        .map(
          (r, i) => `
        <div class="card">
          <div class="card__head"><b>${esc(r.name || 'Отзыв ' + (i + 1))}</b>${tools(`sections.${ri}.items`, i, items.length)}</div>
          ${input('Текст отзыва', `sections.${ri}.items.${i}.text`, { multiline: true })}
          <div class="row3">
            ${input('Имя', `sections.${ri}.items.${i}.name`)}
            ${input('Откуда', `sections.${ri}.items.${i}.source`, { placeholder: 'Яндекс Карты' })}
            ${input('Дата', `sections.${ri}.items.${i}.date`, { placeholder: '2 октября' })}
          </div>
        </div>`
        )
        .join('')}
      <button type="button" class="add" data-act="add-review" data-i="${ri}">+ Добавить отзыв</button>`;
  };

  PANELS.contacts = () => {
    const msg = (label) => {
      const m = (data.contacts.messengers || []).find((x) => x.label === label);
      return `<div class="f"><label for="m-${label}">${label}</label><input id="m-${label}" data-kind="msg" data-label="${label}" value="${esc(m ? m.url : '')}" placeholder="Ссылка"></div>`;
    };
    const hours = data.hours
      .map(
        (h, i) => `
      <div class="hour">
        <span class="hour__day">${DAYS[i]}</span>
        <label class="check"><input type="checkbox" data-kind="hours-open" data-i="${i}"${h ? ' checked' : ''}> работаем</label>
        <input type="time" data-kind="hours" data-i="${i}" data-part="0" value="${h ? h[0] : '10:00'}"${h ? '' : ' disabled'} aria-label="${DAYS[i]}, открытие">
        <span>—</span>
        <input type="time" data-kind="hours" data-i="${i}" data-part="1" value="${h ? h[1] : '20:00'}"${h ? '' : ' disabled'} aria-label="${DAYS[i]}, закрытие">
      </div>`
      )
      .join('');
    return `
      <h2>Контакты и часы</h2>
      <div class="row2">
        <div class="f"><label for="f-phone">Телефон</label><input id="f-phone" data-kind="phone" type="tel" value="${esc(data.contacts.phone)}"></div>
        ${input('Город', 'contacts.city')}
      </div>
      ${input('Адрес', 'contacts.address')}
      ${input('Как найти', 'contacts.addressNote', { placeholder: 'Вход со двора, парковка рядом' })}
      ${input('Метро', 'contacts.metro')}
      <h3 class="sub">Мессенджеры и соцсети</h3>
      <div class="row3">${msg('Telegram')}${msg('MAX')}${msg('ВКонтакте')}</div>
      <h3 class="sub">Карты</h3>
      <div class="row2">${input('Яндекс Карты', 'contacts.yandexMaps', { hint: 'Ссылка на вашу организацию — по ней на сайте появится карта.' })}${input('2ГИС', 'contacts.twoGis')}</div>
      ${input('Код карты (необязательно)', 'contacts.mapWidget', { hint: 'Если карта показывает не то место: в Яндекс Картах «Поделиться» → «Встроить карту», скопируйте код и вставьте сюда.' })}
      <h3 class="sub">Часы работы</h3>
      <div class="hours">${hours}</div>`;
  };

  // Своя тема: что сейчас выбрано (или исходные значения, если владелец ещё не трогал)
  const customOpts = () => Object.assign({}, Slot.CUSTOM_DEFAULT, data.customTheme || {});

  const swatches = (st) => ['bg', 'accent', 'fg'].map((k) => `<i style="background:${esc(st.tokens[k])}"></i>`).join('');

  const choice = (path, value, label, current) =>
    `<label class="seg"><input type="radio" name="${esc(path)}" data-path="${esc(path)}" value="${esc(value)}"${current === value ? ' checked' : ''}><span>${esc(label)}</span></label>`;

  function contrastNote(o) {
    const c = Slot.color.contrast(o.fg, o.bg);
    return c < 4.5
      ? `Текст плохо читается на этом фоне (контраст ${c.toFixed(1)} из нужных 4,5). На сайте мы его затемним или осветлим автоматически, но лучше выбрать цвета контрастнее.`
      : '';
  }

  PANELS.style = () => {
    const o = customOpts();
    const own = Slot.customStyle(o);
    const current = data.style || niche.defaultStyle;
    const fontOpts = (list, sel) =>
      list.map((f) => `<option value="${f.id}"${f.id === sel ? ' selected' : ''}>${esc(f.name)} — ${esc(f.note)}</option>`).join('');
    const color = (key, label) =>
      `<label class="clr"><input type="color" data-path="customTheme.${key}" value="${esc(o[key])}"><span><b>${esc(label)}</b><span data-clr="${key}">${esc(o[key].toUpperCase())}</span></span></label>`;
    return `
    <h2>Оформление</h2>
    <p class="lead">Стиль меняет шрифты, цвета, скругления и анимацию. Тексты и цены остаются прежними.</p>
    <div class="styles">${(data.styles || [])
      .concat(niche.styles)
      .map(
        (st) => `
      <label class="style">
        <input type="radio" name="style" data-path="style" value="${st.id}"${current === st.id ? ' checked' : ''}>
        <span class="style__sw">${swatches(st)}</span>
        <b>${esc(st.label)}</b>
        <span>${esc(st.spec)}</span>
      </label>`
      )
      .join('')}
      <label class="style">
        <input type="radio" name="style" data-path="style" value="custom"${current === 'custom' ? ' checked' : ''}>
        <span class="style__sw" data-own-sw>${swatches(own)}</span>
        <b>Своя</b>
        <span>Настройте ниже: цвета, шрифты, углы, отступы</span>
      </label>
    </div>

    <h3 class="sub">Своя тема</h3>
    <p class="lead">Любая настройка ниже сразу включает тему «Своя».</p>
    <div class="own">
      <div class="own__row">${color('bg', 'Фон')}${color('fg', 'Текст')}${color('accent', 'Акцент — кнопки и выделения')}</div>
      <p class="own__warn" data-contrast-note${contrastNote(o) ? '' : ' hidden'}>${esc(contrastNote(o))}</p>
      <div class="row2">
        <div class="f"><label for="f-own-display">Шрифт заголовков</label><select id="f-own-display" data-path="customTheme.display">${fontOpts(Slot.FONTS.display, o.display)}</select></div>
        <div class="f"><label for="f-own-body">Шрифт текста</label><select id="f-own-body" data-path="customTheme.body">${fontOpts(Slot.FONTS.body, o.body)}</select></div>
      </div>
      <label class="check"><input type="checkbox" data-path="customTheme.upper"${o.upper ? ' checked' : ''}> Заголовки заглавными буквами</label>
      <div class="f"><span class="f__lbl">Размер текста</span><div class="segs">${Object.keys(Slot.TEXT_SIZES)
        .map((k) => choice('customTheme.text', k, Slot.TEXT_SIZES[k].label, o.text))
        .join('')}</div></div>
      <div class="f"><span class="f__lbl">Размер заголовков</span><div class="segs">${Object.keys(Slot.HEAD_SIZES)
        .map((k) => choice('customTheme.heads', k, Slot.HEAD_SIZES[k].label, o.heads))
        .join('')}</div></div>
      <div class="f"><span class="f__lbl">Углы кнопок и карточек</span><div class="segs">${Object.keys(Slot.RADII)
        .map((k) => choice('customTheme.radius', k, Slot.RADII[k].label, o.radius))
        .join('')}</div></div>
      <div class="f"><span class="f__lbl">Отступы между блоками</span><div class="segs">${Object.keys(Slot.SPACES)
        .map((k) => choice('customTheme.space', k, Slot.SPACES[k].label, o.space))
        .join('')}</div></div>
      <div class="f"><span class="f__lbl">Анимация</span><div class="segs">${Object.keys(Slot.MOTIONS)
        .map((k) => choice('customTheme.motion', k, Slot.MOTIONS[k], o.motion))
        .join('')}</div></div>
    </div>`;
  };

  PANELS.docs = () => {
    const l = data.legal || {};
    const empty = (k) => !(l[k] && String(l[k]).trim());
    const doc = (key, title) => `
      <div class="card">
        <div class="card__head"><b>${title}</b><span class="tools">
          <button type="button" class="tool" data-act="doc-template" data-doc="${key}">Вставить шаблон</button>
          <button type="button" class="tool" data-act="doc-show" data-doc="${key}">Показать в предпросмотре</button>
        </span></div>
        ${
          empty(key)
            ? `<p class="own__warn" data-doc-warn="${key}">Своего текста пока нет — на сайте показывается шаблон с данными выше. Вставьте текст, согласованный с юристом.</p>`
            : ''
        }
        ${input('Текст', `legal.${key}`, { multiline: true, rows: 16, wide: true })}
      </div>`;
    return `
      <h2>Документы</h2>
      <p class="lead">Политика обработки персональных данных и согласие на их обработку. Ссылки на них стоят в подвале сайта, в форме записи и в плашке про cookie.</p>
      <h3 class="sub">Оператор персональных данных</h3>
      <div class="row2">
        ${input('ИП или ООО', 'legal.operator', { placeholder: 'ИП Иванов Иван Иванович' })}
        ${input('ИНН', 'legal.inn', { placeholder: '123456789012' })}
      </div>
      <div class="row2">
        ${input('Юридический адрес', 'legal.address', { placeholder: 'г. Тула, ул. Ленина, д. 1' })}
        ${input('E-mail для обращений', 'legal.email', { placeholder: 'owner@yandex.ru' })}
      </div>
      ${input('Дата редакции', 'legal.updated', { placeholder: '01.11.2026', hint: 'Попадает в шаблон. Меняйте, когда обновляете текст.' })}
      <h3 class="sub">Тексты</h3>
      <p class="lead">Вставьте готовый текст из Word или от юриста. Каждая строка станет абзацем. Заголовками станут первая строка, нумерованные пункты без точки в конце («1. Общие положения») и строки заглавными буквами, строки с «—» в начале — списком. «Вставить шаблон» заполнит поле заготовкой по 152-ФЗ с вашими данными — это не юридическая консультация, перед публикацией её стоит показать юристу.</p>
      ${doc('privacy', 'Политика обработки персональных данных')}
      ${doc('consent', 'Согласие на обработку персональных данных')}`;
  };

  PANELS.bookings = () => `
    <h2>Заявки</h2>
    <p class="lead">${
      data.schedule
        ? 'Заявка с сайта занимает время только после того, как вы её подтвердите. Новые заявки — сверху.'
        : 'Последние заявки с сайта. Они же приходят на почту или в Telegram, если это настроено.'
    }${mode === 'server' ? '' : ' В демо заявки хранятся в этом браузере.'}</p>
    <div class="bk-filter segs" data-bk-filter>${[
      ['new', 'Новые'],
      ['confirmed', 'Подтверждённые'],
      ['cancelled', 'Отменённые'],
      ['all', 'Все'],
    ]
      .map(([v, l]) => `<button type="button" class="seg-btn${bkFilter === v ? ' is-on' : ''}" data-act="bk-filter" data-v="${v}">${l}</button>`)
      .join('')}</div>
    <div class="bookings" data-bookings><p class="lead">Загружаем…</p></div>`;

  /* ---------- расписание ---------- */

  let bkFilter = 'new';
  let bookingsCache = [];
  let schedDay = null; // день, открытый в сетке
  const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const DEMO_BK = () => 'slot-bookings-' + S.slug;
  const pad2 = (n) => String(n).padStart(2, '0');
  const hmToMin = (x) => {
    const [h, m] = String(x).split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const minToHm = (m) => Math.floor(m / 60) + ':' + pad2(m % 60);
  const dayStart = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const busyOf = (list) =>
    list
      .filter((b) => b.status === 'confirmed' && b.date && b.time)
      .map((b) => ({ d: b.date, m: hmToMin(b.time), dur: Number(b.dur) || 30, s: b.staffId || '', id: b.id }));

  function siteCfg() {
    return Slot.compose(niche, data);
  }

  PANELS.schedule = () => {
    const sc = data.schedule || {};
    const ext = sc.mode === 'external';
    const head = `
      <h2>Расписание</h2>
      <p class="lead">Как клиенты записываются на сайте и когда вы свободны.</p>
      <div class="f"><span class="f__lbl">Запись на сайте</span><div class="segs">
        ${choice('schedule.mode', 'own', 'Своя — по расписанию ниже', ext ? 'external' : 'own')}
        ${choice('schedule.mode', 'external', 'Через вашу систему записи', ext ? 'external' : 'own')}
      </div></div>`;
    if (ext) {
      const ok = /^https:\/\/[^\s"'<>]+$/.test(sc.url || '');
      return `${head}
      <div class="card">
        ${input('Ссылка на онлайн-запись', 'schedule.url', {
          placeholder: 'https://n123456.yclients.com',
          hint: 'YCLIENTS, DIKIDI, Сонлайн или другая система: скопируйте ссылку на вашу страницу записи. Все кнопки «Записаться» на сайте откроют её в новой вкладке, блок «Свободные окна» скрывается.',
        })}
        ${
          sc.url && !ok
            ? '<p class="own__warn">Ссылка должна начинаться с https://</p>'
            : ok
              ? `<p class="f__hint">Проверить: <a href="${esc(sc.url)}" target="_blank" rel="noopener">открыть страницу записи</a></p>`
              : ''
        }
      </div>`;
    }
    const c = siteCfg();
    const byStaff = Slot.sched.byStaff(c);
    return `${head}
      ${byStaff ? '' : `<div class="card">${input('Сколько клиентов принимаем одновременно', 'schedule.capacity', { type: 'number', hint: 'Например, число постов или кресел, на которые можно записаться онлайн. Мастера при записи не выбирают.' })}</div>`}
      <h3 class="sub">График работы</h3>
      ${byStaff ? staffWeeks() : '<p class="lead">Окна для записи — в часы работы из вкладки «Контакты и часы».</p>'}
      <h3 class="sub">Выходные и отпуска</h3>
      ${offList(byStaff)}
      <h3 class="sub">Сетка на день</h3>
      <p class="lead">Нажмите на свободное время, чтобы закрыть его (например, под клиента, записанного по телефону), и ещё раз — чтобы открыть. Подтверждённые заявки занимают время сами. После правок нажмите «Сохранить».</p>
      <div data-grid>${dayGrid()}</div>`;
  };

  // График мастера: по умолчанию — часы работы салона, можно задать свой
  function staffWeeks() {
    return (data.staff || [])
      .map((m, i) => {
        const own = Array.isArray(m.days);
        const days = own ? m.days : data.hours;
        const rows = days
          .map(
            (h, d) => `
          <div class="hour">
            <span class="hour__day">${DAYS[d]}</span>
            <label class="check"><input type="checkbox" data-kind="sday-open" data-i="${i}" data-d="${d}"${h ? ' checked' : ''}${own ? '' : ' disabled'}> работает</label>
            <input type="time" data-kind="sday" data-i="${i}" data-d="${d}" data-part="0" value="${h ? h[0] : '10:00'}"${h && own ? '' : ' disabled'} aria-label="${esc(m.name)}, ${DAYS[d]}, с">
            <span>—</span>
            <input type="time" data-kind="sday" data-i="${i}" data-d="${d}" data-part="1" value="${h ? h[1] : '20:00'}"${h && own ? '' : ' disabled'} aria-label="${esc(m.name)}, ${DAYS[d]}, до">
          </div>`
          )
          .join('');
        return `
        <div class="card">
          <div class="card__head"><b>${esc(m.name || 'Мастер без имени')}</b></div>
          <label class="check"><input type="checkbox" data-kind="sday-own" data-i="${i}"${own ? ' checked' : ''}> Свой график (иначе — часы работы салона)</label>
          <div class="hours${own ? '' : ' is-muted'}">${rows}</div>
        </div>`;
      })
      .join('');
  }

  function offList(byStaff) {
    const off = (data.schedule && data.schedule.off) || [];
    const who = (sel) =>
      `<option value=""${sel ? '' : ' selected'}>${byStaff ? 'Все' : 'Вся запись'}</option>` +
      (byStaff ? (data.staff || []).map((m) => `<option value="${esc(m.id)}"${sel === m.id ? ' selected' : ''}>${esc(m.name || 'Мастер')}</option>`).join('') : '');
    return `
      ${off
        .map(
          (o, i) => `
        <div class="card off">
          <div class="row3">
            <div class="f"><label for="off-s-${i}">Кто</label><select id="off-s-${i}" data-path="schedule.off.${i}.s">${who(o.s)}</select></div>
            <div class="f"><label for="off-f-${i}">С</label><input id="off-f-${i}" type="date" data-path="schedule.off.${i}.from" value="${esc(o.from || '')}"></div>
            <div class="f"><label for="off-t-${i}">По</label><input id="off-t-${i}" type="date" data-path="schedule.off.${i}.to" value="${esc(o.to || '')}"></div>
          </div>
          <div class="row2">${input('Причина (видна только вам)', `schedule.off.${i}.note`, { placeholder: 'Отпуск' })}
            <div class="f"><span class="f__lbl">&nbsp;</span><button type="button" class="btn" data-act="off-del" data-i="${i}">Удалить</button></div></div>
        </div>`
        )
        .join('')}
      <button type="button" class="add" data-act="off-add">+ Добавить выходной или отпуск</button>`;
  }

  // Сетка дня: строки — время, столбцы — мастера (или «Запись» с числом мест)
  function dayGrid() {
    const c = siteCfg();
    const today = dayStart(new Date());
    if (!schedDay) schedDay = today;
    const days = Array.from({ length: 14 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));
    const dayBtns = days
      .map((d) => {
        const on = d.getTime() === schedDay.getTime();
        return `<button type="button" class="gday${on ? ' is-on' : ''}" data-act="sched-day" data-t="${d.getTime()}"><span>${DAYS_SHORT[(d.getDay() + 6) % 7]}</span><b>${d.getDate()}</b></button>`;
      })
      .join('');
    const ymd = Slot.sched.ymd(schedDay);
    const busy = busyOf(bookingsCache);
    const pending = bookingsCache.filter((b) => b.status === 'new' && b.date === ymd);
    const ids = Slot.sched.resources(c);
    const step = c.booking.step || 30;
    const spans = ids.map((id) => Slot.sched.hours(c, id, schedDay)).filter(Boolean);
    let body = '<p class="lead">В этот день записи нет — выходной по графику.</p>';
    if (spans.length) {
      const from = Math.min(...spans.map((x) => x[0]));
      const to = Math.max(...spans.map((x) => x[1]));
      const heads = ids.map((id) => `<th>${esc(id ? (c.staff.find((m) => m.id === id) || {}).name || '' : `Запись · мест: ${Slot.sched.cap(c, '')}`)}</th>`).join('');
      const rows = [];
      for (let m = from; m + step <= to; m += step) {
        const cells = ids
          .map((id) => {
            const h = Slot.sched.hours(c, id, schedDay);
            if (!h || Slot.sched.off(c, id, ymd) || m < h[0] || m + step > h[1]) return '<td class="gc gc--off">—</td>';
            const blocked = ((data.schedule && data.schedule.blocks) || []).some((b) => b.d === ymd && b.m === m && (b.s || '') === id);
            const taken = busy.filter((b) => b.d === ymd && (id ? b.s === id : true) && m >= b.m && m < b.m + b.dur);
            const wait = pending.filter((b) => hmToMin(b.time) === m && (id ? (b.staffId || '') === id || !b.staffId : true));
            const label = taken.length
              ? esc(taken.map((b) => (bookingsCache.find((x) => x.id === b.id) || {}).name || 'Заявка').join(', '))
              : blocked
                ? 'закрыто'
                : 'свободно';
            const cls = taken.length >= Slot.sched.cap(c, id) ? 'gc--busy' : blocked ? 'gc--block' : taken.length ? 'gc--part' : 'gc--free';
            return `<td class="gc ${cls}">${
              taken.length >= Slot.sched.cap(c, id)
                ? `<span>${label}</span>`
                : `<button type="button" data-act="cell" data-d="${ymd}" data-m="${m}" data-s="${esc(id)}">${label}</button>`
            }${wait.length ? `<span class="gc__wait">ждёт подтверждения: ${wait.length}</span>` : ''}</td>`;
          })
          .join('');
        rows.push(`<tr><th>${minToHm(m)}</th>${cells}</tr>`);
      }
      body = `<div class="grid-wrap"><table class="grid"><thead><tr><th></th>${heads}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
    }
    return `<div class="gdays">${dayBtns}</div>${body}`;
  }

  // Заявки: хранилище — сервер или (в демо) этот браузер
  function bookingsLoad() {
    if (mode === 'server') return api('bookings').then((res) => res.items || []);
    try {
      return Promise.resolve(JSON.parse(store.get(DEMO_BK()) || '[]').slice().reverse());
    } catch (e) {
      return Promise.resolve([]);
    }
  }
  function bookingSetStatus(id, status, staff) {
    if (mode === 'server') return api('booking-status', Object.assign({ id, status }, staff || {}));
    let list = [];
    try {
      list = JSON.parse(store.get(DEMO_BK()) || '[]');
    } catch (e) {
      /* пусто */
    }
    list.forEach((b) => {
      if (b.id === id) Object.assign(b, { status }, staff || {});
    });
    store.set(DEMO_BK(), JSON.stringify(list));
    return Promise.resolve({ ok: true });
  }

  // Подтверждение: время должно быть свободно (кроме самой заявки), а при выборе мастера — мастер назначен
  function conflictOf(b, staffId) {
    const c = siteCfg();
    if (!b.date || !b.time) return '';
    const date = new Date(b.date + 'T00:00:00');
    const busy = busyOf(bookingsCache.filter((x) => x.id !== b.id));
    const rid = Slot.sched.byStaff(c) ? staffId : '';
    if (Slot.sched.byStaff(c) && !rid) return 'Выберите мастера';
    return Slot.sched.free(c, rid, date, hmToMin(b.time), Number(b.dur) || c.booking.step || 30, busy) ? '' : 'Это время уже занято или нерабочее';
  }

  /* ---------- отрисовка ---------- */

  function renderTabs() {
    // «Расписание» — у сайтов с расписанием; «Заявки» — на хостинге и в демо сайтов с расписанием
    doc.querySelector('[data-tabs]').innerHTML = TABS.filter(
      (t) => (!t.sched || data.schedule) && (!t.bookings || mode === 'server' || data.schedule)
    )
      .map((t) => `<button type="button" class="tab" data-tab="${t.id}" aria-pressed="${t.id === tab}">${t.label}</button>`)
      .join('');
  }

  function renderPanel() {
    doc.querySelector('[data-panel]').innerHTML = PANELS[tab]();
    if (tab === 'bookings' || tab === 'schedule') loadBookings();
  }

  function setStatus() {
    const el = doc.querySelector('[data-status]');
    const btn = doc.querySelector('[data-save]');
    btn.disabled = !dirty;
    el.textContent = dirty ? 'Есть несохранённые изменения' : savedAt ? `Сохранено в ${savedAt}` : 'Все изменения сохранены';
    el.classList.toggle('is-dirty', dirty);
  }

  function touch(structural) {
    dirty = true;
    setStatus();
    if (structural) renderPanel();
    schedulePreview();
  }

  /* ---------- предпросмотр ---------- */

  let previewTimer = 0;
  function schedulePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(renderPreview, 350);
  }

  function siteConfig(forPreview) {
    const d = clone(data);
    if (!forPreview && mode === 'server') d.booking = Object.assign({}, d.booking, { endpoint: 'admin/api.php?action=book' });
    if (forPreview && d.booking) delete d.booking.endpoint;
    return d;
  }

  function buildHtml(forPreview) {
    const d = siteConfig(forPreview);
    const c = Slot.compose(niche, d);
    const src = {
      css: S.src.css,
      render: S.src.render,
      app: S.src.app,
      scripts: [S.src.niche, Slot.clientScript(S.slug, S.nicheId, d)],
    };
    return Slot.page(c, S.slug, 'site', src, forPreview ? { noMotion: true, base: S.base || '' } : {});
  }

  function renderPreview() {
    const frame = doc.querySelector('[data-frame]');
    let y = 0;
    try {
      y = frame.contentWindow.scrollY;
    } catch (e) {
      /* нет доступа — начнём сверху */
    }
    frame.onload = () => {
      try {
        frame.contentWindow.scrollTo(0, y);
      } catch (e) {
        /* ничего */
      }
      if (tab === 'docs' && previewDoc) showPreviewDoc(previewDoc);
    };
    frame.srcdoc = buildHtml(true);
  }

  // Документ в предпросмотре: открываем его поверх сайта, как по ссылке из подвала
  let previewDoc = '';
  function showPreviewDoc(id) {
    try {
      const d = doc.querySelector('[data-frame]').contentDocument;
      d.querySelectorAll('.doc').forEach((el) => el.classList.toggle('is-open', el.id === id));
      d.documentElement.classList.toggle('doc-open', !!id);
    } catch (e) {
      /* предпросмотр ещё не готов */
    }
  }

  function scrollPreviewTo(anchor) {
    const frame = doc.querySelector('[data-frame]');
    try {
      const w = frame.contentWindow;
      const el = anchor === 'top' ? null : w.document.getElementById(anchor) || w.document.getElementById('levels');
      w.scrollTo({ top: el ? el.getBoundingClientRect().top + w.scrollY - 70 : 0, behavior: 'smooth' });
    } catch (e) {
      /* ничего */
    }
  }

  /* ---------- сохранение ---------- */

  function save() {
    const btn = doc.querySelector('[data-save]');
    btn.disabled = true;
    const done = (time) => {
      dirty = false;
      savedAt = time;
      setStatus();
      toast(mode === 'server' ? 'Сохранено. Сайт обновлён.' : 'Сохранено в этом браузере. Откройте сайт, чтобы увидеть изменения.');
    };
    if (mode === 'demo') {
      store.set(KEY, JSON.stringify(data));
      return done(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
    }
    api('save', { data, html: buildHtml(false) })
      .then((res) => done(res.savedAt))
      .catch((err) => {
        btn.disabled = false;
        toast(err.message, true);
      });
  }

  function api(action, body) {
    const opt = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf || '' }, body: JSON.stringify(body) }
      : { headers: { 'X-CSRF': csrf || '' } };
    return fetch(`${API}?action=${action}`, Object.assign({ credentials: 'same-origin' }, opt))
      .then((r) => r.json().catch(() => ({ ok: false, error: 'Сервер ответил непонятно' })))
      .then((res) => {
        if (!res.ok) throw new Error(res.error || 'Не получилось');
        return res;
      });
  }

  /* ---------- фото: уменьшаем в браузере, чтобы сайт грузился быстро ---------- */

  function shrink(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const cv = doc.createElement('canvas');
        cv.width = Math.round(img.naturalWidth * k);
        cv.height = Math.round(img.naturalHeight * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob((b) => (b ? resolve(b) : reject(new Error('Не удалось обработать фото'))), 'image/jpeg', 0.84);
      };
      img.onerror = () => reject(new Error('Это не похоже на фото'));
      img.src = url;
    });
  }

  // Загружает фото и возвращает адрес: на сервере — файл в /uploads, в демо — data:-строка
  function uploadPhoto(file, max) {
    return shrink(file, mode === 'server' ? max : Math.min(max, 900))
      .then((blob) => {
        if (mode === 'server') {
          const fd = new FormData();
          fd.append('photo', blob, 'photo.jpg');
          return fetch(`${API}?action=upload`, { method: 'POST', body: fd, headers: { 'X-CSRF': csrf || '' }, credentials: 'same-origin' })
            .then((r) => r.json())
            .then((res) => {
              if (!res.ok) throw new Error(res.error || 'Фото не загрузилось');
              return res.url;
            });
        }
        return new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(blob);
        });
      });
  }

  // Логотип: обрезаем однотонные поля по краям и уменьшаем до 600×200 — шапка сама впишет его по высоте
  function makeLogo(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const W = img.naturalWidth || 600;
        const H = img.naturalHeight || 200;
        const cv = doc.createElement('canvas');
        cv.width = W;
        cv.height = H;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);
        let box = { x: 0, y: 0, w: W, h: H };
        try {
          const px = ctx.getImageData(0, 0, W, H).data;
          const at = (x, y) => (y * W + x) * 4;
          const c0 = at(0, 0);
          const bg = [px[c0], px[c0 + 1], px[c0 + 2], px[c0 + 3]];
          // фон — цвет угла; прозрачный фон — любой почти прозрачный пиксель
          const isBg = (i) =>
            bg[3] < 16 ? px[i + 3] < 16 : Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) < 36 && px[i + 3] > 200;
          let x0 = W, y0 = H, x1 = -1, y1 = -1;
          for (let y = 0; y < H; y++)
            for (let x = 0; x < W; x++)
              if (!isBg(at(x, y))) {
                if (x < x0) x0 = x;
                if (x > x1) x1 = x;
                if (y < y0) y0 = y;
                if (y > y1) y1 = y;
              }
          if (x1 >= x0 && y1 >= y0) {
            const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
            x0 = Math.max(0, x0 - pad);
            y0 = Math.max(0, y0 - pad);
            box = { x: x0, y: y0, w: Math.min(W, x1 + pad + 1) - x0, h: Math.min(H, y1 + pad + 1) - y0 };
          }
        } catch (e) {
          /* картинка без доступа к пикселям — берём целиком */
        }
        const k = Math.min(1, 600 / box.w, 200 / box.h);
        const out = doc.createElement('canvas');
        out.width = Math.max(1, Math.round(box.w * k));
        out.height = Math.max(1, Math.round(box.h * k));
        const o = out.getContext('2d');
        o.imageSmoothingQuality = 'high';
        o.drawImage(cv, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
        knockOut(o, out.width, out.height);
        resolve(out.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Это не похоже на картинку. Подойдут PNG, JPG, WebP или SVG'));
      };
      img.src = url;
    });
  }

  // Однотонный фон логотипа (например, белый у JPG) делаем прозрачным: заливка от краёв картинки,
  // поэтому белое внутри знака (просветы букв) остаётся. Прозрачный PNG не трогаем.
  function knockOut(ctx, W, H) {
    let im;
    try {
      im = ctx.getImageData(0, 0, W, H);
    } catch (e) {
      return;
    }
    const px = im.data;
    if (px[3] < 250) return;
    const bg = [px[0], px[1], px[2]];
    const near = (i) => Math.abs(px[i] - bg[0]) + Math.abs(px[i + 1] - bg[1]) + Math.abs(px[i + 2] - bg[2]) < 48;
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
    for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (!near(i)) continue;
      px[i + 3] = 0;
      const x = p % W;
      if (x > 0) stack.push(p - 1);
      if (x < W - 1) stack.push(p + 1);
      if (p >= W) stack.push(p - W);
      if (p < W * (H - 1)) stack.push(p + W);
    }
    ctx.putImageData(im, 0, 0);
  }

  // Иконка сайта: квадрат по центру картинки, 128×128 PNG прямо в данных сайта (без загрузки на сервер)
  function makeIcon(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        if (!side) return reject(new Error('Не получилось прочитать картинку'));
        const cv = doc.createElement('canvas');
        cv.width = cv.height = 128;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 128, 128);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Это не похоже на картинку. Подойдут PNG, JPG, WebP или SVG'));
      };
      img.src = url;
    });
  }

  // Как иконка выглядит сейчас: загруженная или буква на цвете текущего стиля
  function siteIcon() {
    if (data.brand.favicon) return data.brand.favicon;
    const c = Slot.compose(niche, data);
    const m = /href="([^"]+)"/.exec(Slot.favicon(c, Slot.getStyle(c, c.defaultStyle)));
    return m ? m[1].replace(/&amp;/g, '&') : '';
  }

  function putPhoto(target, file) {
    const max = target === 'hero.image' ? 2000 : target.startsWith('staff') ? 1000 : 1600;
    uploadPhoto(file, max)
      .then((url) => {
        setPath(data, target, url);
        touch(true);
      })
      .catch((err) => toast(err.message, true));
  }

  function addPhotos(files) {
    const gi = ensureGallery();
    Promise.all(Array.from(files).map((f) => uploadPhoto(f, 1600)))
      .then((urls) => {
        urls.forEach((url) => data.sections[gi].items.push({ img: url, caption: '' }));
        touch(true);
      })
      .catch((err) => toast(err.message, true));
  }

  /* ---------- заявки ---------- */

  function loadBookings() {
    bookingsLoad()
      .then((items) => {
        bookingsCache = items;
        const grid = doc.querySelector('[data-grid]');
        if (grid) grid.innerHTML = dayGrid();
        const box = doc.querySelector('[data-bookings]');
        if (!box) return;
        const c = siteCfg();
        const byStaff = Slot.sched.byStaff(c);
        const ST = { new: 'Новая', confirmed: 'Подтверждена', cancelled: 'Отменена' };
        const shown = items.filter((b) => bkFilter === 'all' || (b.status || 'new') === bkFilter);
        box.innerHTML = shown.length
          ? shown
              .map((b) => {
                const st = b.status || 'new';
                const pick =
                  data.schedule && byStaff && b.id && st !== 'confirmed'
                    ? `<div class="f"><label for="bk-${esc(b.id)}">Мастер</label><select id="bk-${esc(b.id)}" data-bk-staff="${esc(b.id)}"><option value="">выберите мастера</option>${c.staff
                        .map((m) => `<option value="${esc(m.id)}"${(b.staffId || '') === m.id ? ' selected' : ''}>${esc(m.name)}</option>`)
                        .join('')}</select></div>`
                    : '';
                const acts =
                  data.schedule && b.id
                    ? `<div class="bk-acts">${st !== 'confirmed' ? `<button type="button" class="btn btn--primary" data-act="bk-confirm" data-id="${esc(b.id)}">Подтвердить</button>` : ''}${
                        st !== 'cancelled' ? `<button type="button" class="btn" data-act="bk-status" data-st="cancelled" data-id="${esc(b.id)}">Отменить</button>` : ''
                      }${st !== 'new' ? `<button type="button" class="btn" data-act="bk-status" data-st="new" data-id="${esc(b.id)}">Вернуть в новые</button>` : ''}</div>`
                    : '';
                return `<div class="card bk bk--${st}"><div class="card__head"><b>${esc(b.name)} · ${esc(b.phone)}</b><span class="bk__st">${ST[st] || st}</span></div>
                <p>${esc(b.service)}${b.staff ? ' · ' + esc(b.staff) : ''} · ${esc((b.date || '').split('-').reverse().join('.'))} в ${esc(b.time)}${b.dur ? ` · ${esc(b.dur)} мин` : ''}</p>
                ${Object.entries(b.extra || {})
                  .filter(([, v]) => v)
                  .map(([k, v]) => `<p class="muted">${esc(k)}: ${esc(v)}</p>`)
                  .join('')}
                ${b.comment ? `<p class="muted">${esc(b.comment)}</p>` : ''}<p class="muted">Подтвердить: ${esc(b.contact)} · заявка от ${esc(b.at || '')}</p>
                ${pick}<p class="own__warn" data-bk-err="${esc(b.id || '')}" hidden></p>${acts}</div>`;
              })
              .join('')
          : `<p class="lead">${bkFilter === 'new' ? 'Новых заявок нет.' : 'Заявок нет.'}</p>`;
      })
      .catch((err) => toast(err.message, true));
  }

  /* ---------- события ---------- */

  function onInput(e) {
    const t = e.target;
    const kind = t.dataset.kind;
    if (t.dataset.path && !kind) {
      let v = t.type === 'checkbox' ? t.checked : t.value;
      if (t.dataset.type === 'number') v = t.value === '' ? null : Number(t.value);
      // своя тема: любая её настройка включает стиль «Своя»
      if (t.dataset.path.startsWith('customTheme.') || (t.dataset.path === 'style' && v === 'custom')) {
        data.customTheme = customOpts();
        if (t.dataset.path !== 'style') setPath(data, t.dataset.path, v);
        data.style = 'custom';
        const radio = doc.querySelector('input[name="style"][value="custom"]');
        if (radio) radio.checked = true;
        const o = customOpts();
        const sw = doc.querySelector('[data-own-sw]');
        if (sw) sw.innerHTML = swatches(Slot.customStyle(o));
        const clr = doc.querySelector(`[data-clr="${t.dataset.path.split('.')[1]}"]`);
        if (clr) clr.textContent = String(v).toUpperCase();
        const note = doc.querySelector('[data-contrast-note]');
        if (note) {
          note.textContent = contrastNote(o);
          note.hidden = !note.textContent;
        }
        return touch(false);
      }
      setPath(data, t.dataset.path, v);
      if (t.dataset.path === 'brand.logoTone' || t.dataset.path === 'schedule.mode') return touch(true);
      if (/^schedule\.(off|capacity)/.test(t.dataset.path)) {
        touch(false);
        const grid = doc.querySelector('[data-grid]');
        if (grid) grid.innerHTML = dayGrid();
        return;
      }
      if (t.dataset.path === 'promo.show' && v && !(data.promo && data.promo.text)) {
        data.promo = Object.assign({ text: 'Скидка на первый визит при записи онлайн', cta: 'Записаться', icon: 'percent' }, data.promo, { show: true });
        return touch(true);
      }
      if (/^legal\.(privacy|consent)$/.test(t.dataset.path)) {
        previewDoc = t.dataset.path.split('.')[1];
        const warn = doc.querySelector(`[data-doc-warn="${previewDoc}"]`);
        if (warn) warn.hidden = !!String(v).trim();
      }
      if (t.dataset.path === 'style') return touch(false);
      const head = t.closest('.card') && t.closest('.card').querySelector('.card__head b');
      if (head && /\.(name|text)$/.test(t.dataset.path) && t.value) head.textContent = t.value;
      return touch(false);
    }
    if (kind === 'price' || kind === 'price-from') {
      const it = getPath(data, t.dataset.path);
      const box = t.closest('.row3');
      const val = box.querySelector('[data-kind="price"]').value.replace(/\D/g, '');
      const from = box.querySelector('[data-kind="price-from"]').checked;
      it.price = val === '' ? null : { value: Number(val), from };
      return touch(false);
    }
    if (kind === 'phone') {
      let d = t.value.replace(/\D/g, '');
      if (d[0] === '8') d = '7' + d.slice(1);
      data.contacts.phone = t.value;
      data.contacts.phoneHref = d ? '+' + d : '';
      return touch(false);
    }
    if (kind === 'msg') {
      const list = (data.contacts.messengers || []).filter((m) => m.label !== t.dataset.label);
      if (t.value.trim()) list.push({ label: t.dataset.label, icon: t.dataset.label === 'Telegram' ? 'send' : 'message', url: t.value.trim() });
      const order = ['Telegram', 'MAX', 'ВКонтакте'];
      data.contacts.messengers = list.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
      return touch(false);
    }
    if (kind === 'sday-own') {
      const m = data.staff[Number(t.dataset.i)];
      if (t.checked) m.days = data.hours.map((h) => (h ? h.slice() : null));
      else delete m.days;
      return touch(true);
    }
    if (kind === 'sday-open') {
      const m = data.staff[Number(t.dataset.i)];
      m.days[Number(t.dataset.d)] = t.checked ? (data.hours[Number(t.dataset.d)] || ['10:00', '20:00']).slice() : null;
      return touch(true);
    }
    if (kind === 'sday') {
      const m = data.staff[Number(t.dataset.i)];
      const h = m.days && m.days[Number(t.dataset.d)];
      if (h) h[Number(t.dataset.part)] = t.value;
      return touch(false);
    }
    if (kind === 'hours-open') {
      const i = Number(t.dataset.i);
      data.hours[i] = t.checked ? ['10:00', '20:00'] : null;
      return touch(true);
    }
    if (kind === 'hours') {
      const i = Number(t.dataset.i);
      if (data.hours[i]) data.hours[i][Number(t.dataset.part)] = t.value;
      return touch(false);
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.dataset.kind === 'logo' && t.files && t.files[0]) {
      makeLogo(t.files[0])
        .then((logo) => {
          data.brand.logo = logo;
          touch(true);
        })
        .catch((err) => toast(err.message, true));
    } else if (t.dataset.kind === 'favicon' && t.files && t.files[0]) {
      makeIcon(t.files[0])
        .then((icon) => {
          data.brand.favicon = icon;
          touch(true);
        })
        .catch((err) => toast(err.message, true));
    } else if (t.dataset.kind === 'photo' && t.files && t.files[0]) putPhoto(t.dataset.target, t.files[0]);
    else if (t.dataset.kind === 'photo-add' && t.files && t.files.length) addPhotos(t.files);
    else if (t.type === 'radio' || t.type === 'checkbox') onInput(e);
  }

  const pendingDel = new Set();

  function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.tab) {
      tab = t.dataset.tab;
      previewDoc = tab === 'docs' ? previewDoc || 'privacy' : '';
      showPreviewDoc(previewDoc);
      renderTabs();
      renderPanel();
      doc.querySelector('[data-panel]').scrollTop = 0;
      g.scrollTo({ top: 0 });
      const meta = TABS.find((x) => x.id === tab);
      scrollPreviewTo(meta.anchor === 'staff' && !(data.sections || []).some((s) => (s.type || s) === 'staff') ? 'levels' : meta.anchor);
      return;
    }
    if (t.matches('[data-save]')) return save();
    if (t.matches('[data-reset]')) {
      if (!g.confirm('Вернуть исходные тексты, цены и фото? Ваши правки в этом браузере удалятся.')) return;
      try {
        localStorage.removeItem(KEY);
      } catch (err) {
        /* хранилище недоступно — правок там и нет */
      }
      data = clone(S.data);
      dirty = false;
      savedAt = null;
      return start();
    }
    if (t.matches('[data-preview-open]')) return doc.body.classList.add('show-preview');
    if (t.matches('[data-preview-close]')) return doc.body.classList.remove('show-preview');

    const act = t.dataset.act;
    if (!act) return;
    const i = Number(t.dataset.i);
    if (act === 'up' || act === 'down' || act === 'del') {
      const list = getPath(data, t.dataset.list);
      if (act === 'del') {
        const key = t.dataset.list + ':' + i;
        if (!pendingDel.has(key)) {
          pendingDel.add(key);
          t.textContent = 'Точно удалить?';
          t.classList.add('is-armed');
          setTimeout(() => {
            pendingDel.delete(key);
            if (t.isConnected) {
              t.textContent = 'Удалить';
              t.classList.remove('is-armed');
            }
          }, 3000);
          return;
        }
        pendingDel.delete(key);
        list.splice(i, 1);
      } else {
        const j = act === 'up' ? i - 1 : i + 1;
        [list[i], list[j]] = [list[j], list[i]];
      }
      return touch(true);
    }
    if (act === 'add-service') {
      data.services[i].items.push({ id: uid('s'), name: '', desc: '', duration: 60, price: { value: 1000, from: false } });
      return touch(true);
    }
    if (act === 'add-cat') {
      data.services.push({ category: 'Новая категория', items: [{ id: uid('s'), name: '', duration: 60, price: { value: 1000 } }] });
      return touch(true);
    }
    if (act === 'add-staff') {
      (data.staff = data.staff || []).push({ id: uid('m'), name: '', dative: '', role: niche.id === 'auto' ? 'Мастер' : 'Барбер', note: '' });
      ensureStaff();
      return touch(true);
    }
    if (act === 'add-review') {
      data.sections[i].items.push({ name: '', source: 'Яндекс Карты', date: '', text: '' });
      return touch(true);
    }
    if (act === 'img-del') {
      setPath(data, t.dataset.target, '');
      return touch(true);
    }
    if (act === 'logo-del') {
      delete data.brand.logo;
      delete data.brand.logoTone;
      return touch(true);
    }
    if (act === 'bk-filter') {
      bkFilter = t.dataset.v;
      return renderPanel();
    }
    if (act === 'bk-confirm' || act === 'bk-status') {
      const id = t.dataset.id;
      const b = bookingsCache.find((x) => x.id === id);
      if (!b) return;
      let extra = null;
      if (act === 'bk-confirm') {
        const sel = doc.querySelector(`[data-bk-staff="${id}"]`);
        const staffId = sel ? sel.value : b.staffId || '';
        const err = conflictOf(b, staffId);
        const box = doc.querySelector(`[data-bk-err="${id}"]`);
        if (err) {
          if (box) {
            box.textContent = err;
            box.hidden = false;
          }
          return;
        }
        if (sel) extra = { staffId, staff: (siteCfg().staff.find((m) => m.id === staffId) || {}).name || '' };
      }
      return bookingSetStatus(id, act === 'bk-confirm' ? 'confirmed' : t.dataset.st, extra)
        .then(() => {
          toast(act === 'bk-confirm' ? 'Подтверждено — время занято' : 'Готово');
          loadBookings();
        })
        .catch((err) => toast(err.message, true));
    }
    if (act === 'sched-day') {
      schedDay = new Date(Number(t.dataset.t));
      const grid = doc.querySelector('[data-grid]');
      if (grid) grid.innerHTML = dayGrid();
      return;
    }
    if (act === 'cell') {
      const sc = (data.schedule = data.schedule || { mode: 'own' });
      const blocks = (sc.blocks = sc.blocks || []);
      const m = Number(t.dataset.m);
      const i = blocks.findIndex((b) => b.d === t.dataset.d && b.m === m && (b.s || '') === t.dataset.s);
      if (i >= 0) blocks.splice(i, 1);
      else blocks.push({ d: t.dataset.d, m, s: t.dataset.s });
      // старые закрытия (прошедшие дни) не храним
      const today = Slot.sched.ymd(new Date());
      sc.blocks = blocks.filter((b) => b.d >= today);
      touch(false);
      const grid = doc.querySelector('[data-grid]');
      if (grid) grid.innerHTML = dayGrid();
      return;
    }
    if (act === 'off-add') {
      const sc = (data.schedule = data.schedule || { mode: 'own' });
      const d = Slot.sched.ymd(new Date());
      (sc.off = sc.off || []).push({ s: '', from: d, to: d, note: '' });
      return touch(true);
    }
    if (act === 'off-del') {
      data.schedule.off.splice(Number(t.dataset.i), 1);
      return touch(true);
    }
    if (act === 'favicon-del') {
      delete data.brand.favicon;
      return touch(true);
    }
    if (act === 'doc-show') {
      previewDoc = t.dataset.doc;
      showPreviewDoc(previewDoc);
      return doc.body.classList.add('show-preview');
    }
    if (act === 'doc-template') {
      const key = t.dataset.doc;
      const cur = getPath(data, 'legal.' + key);
      if (cur && String(cur).trim() && !g.confirm('Заменить текущий текст шаблоном? Ваш текст в этом поле пропадёт.')) return;
      setPath(data, 'legal.' + key, Slot.legalTemplates(Slot.compose(niche, data))[key]);
      previewDoc = key;
      return touch(true);
    }
  }

  let toastTimer = 0;
  function toast(text, bad) {
    const el = doc.querySelector('[data-toast]');
    el.textContent = text;
    el.classList.toggle('is-bad', !!bad);
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 4000);
  }

  /* ---------- вход (рабочий режим) ---------- */

  function showGate(kind) {
    const gate = doc.querySelector('[data-gate]');
    gate.hidden = false;
    gate.querySelector('[data-gate-title]').textContent = kind === 'setup' ? 'Придумайте пароль для админки' : 'Вход в админку';
    gate.querySelector('[data-gate-hint]').textContent =
      kind === 'setup'
        ? 'Код первого входа выдаётся вместе с сайтом. Пароль — не меньше 8 символов, его будете вводить при каждом входе.'
        : `Сайт «${data.brand.name}»`;
    const codeBox = gate.querySelector('[data-gate-code]');
    codeBox.hidden = kind !== 'setup';
    codeBox.querySelector('input').required = kind === 'setup';
    gate.querySelector('#gate-pass').autocomplete = kind === 'setup' ? 'new-password' : 'current-password';
    gate.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const pass = gate.querySelector('#gate-pass').value;
      const body = { password: pass };
      if (kind === 'setup') body.code = codeBox.querySelector('input').value;
      api(kind === 'setup' ? 'setup' : 'login', body)
        .then((res) => {
          csrf = res.csrf;
          gate.hidden = true;
          return fetch('../data.json?t=' + Date.now(), { credentials: 'same-origin' }).then((r) => (r.ok ? r.json() : null));
        })
        .then((fresh) => {
          if (fresh) data = fresh;
          start();
        })
        .catch((err) => {
          gate.querySelector('[data-gate-err]').textContent = err.message;
        });
    };
  }

  function start() {
    const link = doc.querySelector('[data-site-link]');
    if (mode === 'server') link.href = '../';
    else if (S.siteUrl) link.href = S.siteUrl;
    else link.hidden = true;
    doc.querySelector('[data-site-name]').textContent = `${data.brand.kind} «${data.brand.name}»`;
    doc.querySelector('[data-mode]').hidden = mode === 'server';
    renderTabs();
    renderPanel();
    setStatus();
    renderPreview();
  }

  function boot() {
    // Админку нельзя открыть внутри чужой страницы — защита от «подложных кликов»
    if (g.top !== g.self) {
      let foreign = true;
      try {
        foreign = g.top.location.origin !== g.location.origin;
      } catch (err) {
        /* чужой домен — доступа нет */
      }
      if (foreign) {
        doc.body.textContent = 'Админку можно открыть только напрямую.';
        return;
      }
    }
    doc.addEventListener('input', onInput);
    doc.addEventListener('change', onChange);
    doc.addEventListener('click', onClick);
    g.addEventListener('beforeunload', (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    // На Vercel и в предпросмотре сервера нет — сразу демо, без лишнего запроса к api.php
    (S.demo ? Promise.reject(new Error('демо')) : fetch(`${API}?action=session`, { credentials: 'same-origin' }))
      .then((r) => r.json())
      .then((res) => {
        if (!res || !res.ok || !res.slot) throw new Error('нет сервера');
        mode = 'server';
        if (res.setup) return showGate('setup');
        if (!res.auth) return showGate('login');
        csrf = res.csrf;
        return fetch('../data.json?t=' + Date.now(), { credentials: 'same-origin' })
          .then((r) => (r.ok ? r.json() : null))
          .then((fresh) => {
            if (fresh) data = fresh;
            start();
          });
      })
      .catch(() => {
        mode = 'demo';
        try {
          const saved = JSON.parse(store.get(KEY) || 'null');
          if (saved) data = saved;
        } catch (e) {
          /* повреждённые данные — берём исходные */
        }
        start();
      });
  }

  boot();
})(window);
