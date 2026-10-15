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
  // S: { slug, nicheId, data, src: { css, render, app, niche } }

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

  // Фото на сервере лежат в /uploads относительно сайта, а админка открыта из /admin
  const imgUrl = (u) => (mode === 'server' && !/^(data:|https?:|\/)/.test(u) ? '../' + u : u);

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
    { id: 'bookings', label: 'Заявки', anchor: 'top', server: true },
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
      ${perks}`;
  };

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

  PANELS.staff = () => `
    <h2>Мастера</h2>
    <p class="lead">Фото лучше вертикальное, по пояс. Его можно снять на телефон.</p>
    ${(data.staff || [])
      .map(
        (m, i) => `
      <div class="card card--staff">
        <div class="card__head"><b>${esc(m.name || 'Новый мастер')}</b>${tools('staff', i, data.staff.length)}</div>
        <div class="staff-row">
          <div class="ph">
            ${m.img ? `<img src="${esc(imgUrl(m.img))}" alt="">` : `<span>${esc(Slot.util.initials(m.name || '?'))}</span>`}
            <label class="ph__btn">${m.img ? 'Заменить' : 'Загрузить фото'}<input type="file" accept="image/*" data-kind="photo" data-target="staff.${i}.img" hidden></label>
            ${m.img ? `<button type="button" class="ph__del" data-act="img-del" data-target="staff.${i}.img">Убрать фото</button>` : ''}
          </div>
          <div class="staff-fields">
            ${input('Имя', `staff.${i}.name`)}
            ${input('Для кнопки «Записаться к …»', `staff.${i}.dative`, { placeholder: 'Артёму' })}
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
      <div class="row2">${input('Яндекс Карты', 'contacts.yandexMaps')}${input('2ГИС', 'contacts.twoGis')}</div>
      <h3 class="sub">Часы работы</h3>
      <div class="hours">${hours}</div>`;
  };

  PANELS.style = () => `
    <h2>Оформление</h2>
    <p class="lead">Стиль меняет шрифты, цвета, скругления и анимацию. Тексты и цены остаются прежними.</p>
    <div class="styles">${(data.styles || [])
      .concat(niche.styles)
      .map(
        (st) => `
      <label class="style">
        <input type="radio" name="style" data-path="style" value="${st.id}"${(data.style || niche.defaultStyle) === st.id ? ' checked' : ''}>
        <span class="style__sw">${['bg', 'accent', 'fg'].map((k) => `<i style="background:${esc(st.tokens[k])}"></i>`).join('')}</span>
        <b>${esc(st.label)}</b>
        <span>${esc(st.spec)}</span>
      </label>`
      )
      .join('')}</div>`;

  PANELS.bookings = () => `
    <h2>Заявки</h2>
    <p class="lead">Последние заявки с сайта. Они же приходят на почту или в Telegram, если это настроено.</p>
    <div class="bookings" data-bookings><p class="lead">Загружаем…</p></div>`;

  /* ---------- отрисовка ---------- */

  function renderTabs() {
    doc.querySelector('[data-tabs]').innerHTML = TABS.filter((t) => !t.server || mode === 'server')
      .map((t) => `<button type="button" class="tab" data-tab="${t.id}" aria-pressed="${t.id === tab}">${t.label}</button>`)
      .join('');
  }

  function renderPanel() {
    doc.querySelector('[data-panel]').innerHTML = PANELS[tab]();
    if (tab === 'bookings') loadBookings();
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
    return Slot.page(c, S.slug, 'site', src, forPreview ? { noMotion: true, base: mode === 'server' ? '../' : '' } : {});
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
    };
    frame.srcdoc = buildHtml(true);
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
    api('bookings')
      .then((res) => {
        const box = doc.querySelector('[data-bookings]');
        if (!box) return;
        box.innerHTML = res.items.length
          ? res.items
              .map(
                (b) => `<div class="card"><div class="card__head"><b>${esc(b.name)} · ${esc(b.phone)}</b><span class="muted">${esc(b.at)}</span></div>
                <p>${esc(b.service)}${b.staff ? ' · ' + esc(b.staff) : ''} · ${esc(b.date.split('-').reverse().join('.'))} в ${esc(b.time)}</p>
                ${b.comment ? `<p class="muted">${esc(b.comment)}</p>` : ''}<p class="muted">Подтвердить: ${esc(b.contact)}</p></div>`
              )
              .join('')
          : '<p class="lead">Заявок пока нет.</p>';
      })
      .catch((err) => toast(err.message, true));
  }

  /* ---------- события ---------- */

  function onInput(e) {
    const t = e.target;
    const kind = t.dataset.kind;
    if (t.dataset.path && !kind) {
      let v = t.type === 'radio' ? t.value : t.value;
      if (t.dataset.type === 'number') v = t.value === '' ? null : Number(t.value);
      setPath(data, t.dataset.path, v);
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
    if (t.dataset.kind === 'photo' && t.files && t.files[0]) putPhoto(t.dataset.target, t.files[0]);
    else if (t.dataset.kind === 'photo-add' && t.files && t.files.length) addPhotos(t.files);
    else if (t.type === 'radio' || t.type === 'checkbox') onInput(e);
  }

  const pendingDel = new Set();

  function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.tab) {
      tab = t.dataset.tab;
      renderTabs();
      renderPanel();
      doc.querySelector('[data-panel]').scrollTop = 0;
      g.scrollTo({ top: 0 });
      const meta = TABS.find((x) => x.id === tab);
      scrollPreviewTo(meta.anchor === 'staff' && !(data.sections || []).some((s) => (s.type || s) === 'staff') ? 'levels' : meta.anchor);
      return;
    }
    if (t.matches('[data-save]')) return save();
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
      (data.staff = data.staff || []).push({ id: uid('m'), name: '', dative: '', role: 'Барбер', note: '' });
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
      kind === 'setup' ? 'Не меньше 8 символов. Его будете вводить при каждом входе.' : `Сайт «${data.brand.name}»`;
    gate.querySelector('form').onsubmit = (e) => {
      e.preventDefault();
      const pass = gate.querySelector('#gate-pass').value;
      api(kind === 'setup' ? 'setup' : 'login', { password: pass })
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
    doc.addEventListener('input', onInput);
    doc.addEventListener('change', onChange);
    doc.addEventListener('click', onClick);
    g.addEventListener('beforeunload', (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
    fetch(`${API}?action=session`, { credentials: 'same-origin' })
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
