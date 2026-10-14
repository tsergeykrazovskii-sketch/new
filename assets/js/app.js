/*
 * Слот — поведение страницы: тема, статус «открыто», свободные окна,
 * калькулятор, онлайн-запись и демо-переключатель ниш.
 */
(function (g) {
  'use strict';
  const Slot = g.Slot;
  const { esc, price, duration, initials, ic } = Slot.util;
  const doc = document;

  let cfg = null;
  let opts = { demo: false };
  let widgetDay = null; // день, для которого показаны окна в первом экране
  let estimate = null; // { service, date, time } — выбор в калькуляторе

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
      } catch (e) {
        /* хранилище недоступно — работаем без него */
      }
    },
  };

  /* ---------- время бизнеса ---------- */

  const DAYS_ACC = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
  const fmtDay = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
  const fmtDayShort = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
  const fmtWeekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });

  function bizNow() {
    const now = new Date();
    try {
      return new Date(now.toLocaleString('en-US', { timeZone: cfg.timezone }));
    } catch (e) {
      return now;
    }
  }
  const toMin = (s) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  const fmtMin = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
  const dow = (date) => (date.getDay() + 6) % 7;
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const addDays = (date, n) => {
    const x = new Date(date);
    x.setDate(x.getDate() + n);
    x.setHours(0, 0, 0, 0);
    return x;
  };

  function dayLabel(date) {
    const today = bizNow();
    if (sameDay(date, today)) return 'сегодня, ' + fmtDayShort.format(date).replace('.', '');
    if (sameDay(date, addDays(today, 1))) return 'завтра, ' + fmtDayShort.format(date).replace('.', '');
    return fmtDay.format(date);
  }

  function status() {
    const now = bizNow();
    const day = dow(now);
    const m = now.getHours() * 60 + now.getMinutes();
    const h = cfg.hours[day];
    if (h && m >= toMin(h[0]) && m < toMin(h[1])) return { open: true, text: 'Открыто до ' + fmtMin(toMin(h[1])) };
    if (h && m < toMin(h[0])) return { open: false, text: 'Откроемся в ' + fmtMin(toMin(h[0])) };
    for (let i = 1; i <= 7; i++) {
      const hh = cfg.hours[(day + i) % 7];
      if (hh) return { open: false, text: 'Откроемся ' + (i === 1 ? 'завтра' : DAYS_ACC[(day + i) % 7]) + ' в ' + fmtMin(toMin(hh[0])) };
    }
    return { open: false, text: 'Временно закрыто' };
  }

  /* ---------- демо-расписание ---------- */

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // Сетка времени на день. staffId = null — «любой мастер» (свободно, если свободен хоть кто-то).
  function daySlots(date, staffId) {
    const h = cfg.hours[dow(date)];
    if (!h) return [];
    const step = cfg.booking.step;
    const start = toMin(h[0]);
    const end = toMin(h[1]);
    const now = bizNow();
    const cut = sameDay(date, now) ? now.getHours() * 60 + now.getMinutes() + 30 : -1;
    const ids = staffId ? [staffId] : cfg.staff.length ? cfg.staff.map((s) => s.id) : ['post'];
    const key = date.toDateString();
    const out = [];
    for (let m = start; m + step <= end; m += step) {
      const busy = ids.every((id) => hash(key + '|' + id + '|' + m) % 100 < 48);
      out.push({ m, busy, past: m < cut });
    }
    return out;
  }
  const freeSlots = (date, staffId) => daySlots(date, staffId).filter((s) => !s.busy && !s.past);

  function nearest(staffId) {
    const today = addDays(bizNow(), 0);
    for (let i = 0; i < 14; i++) {
      const day = addDays(today, i);
      const free = freeSlots(day, staffId);
      if (free.length) return { date: day, time: free[0].m };
    }
    return null;
  }

  /* ---------- тема и шрифты ---------- */

  function applyTheme() {
    let st = doc.getElementById('slot-theme');
    if (!st) {
      st = doc.createElement('style');
      st.id = 'slot-theme';
    }
    // тема должна идти последней, иначе её перекроют запасные значения из slot.css
    (doc.head || doc.documentElement).appendChild(st);
    st.textContent = Slot.themeCss(cfg);
    let ln = doc.getElementById('slot-fonts');
    if (!ln) {
      ln = doc.createElement('link');
      ln.id = 'slot-fonts';
      ln.rel = 'stylesheet';
      doc.head.appendChild(ln);
    }
    if (ln.getAttribute('href') !== cfg.theme.fonts) ln.setAttribute('href', cfg.theme.fonts);
    doc.documentElement.dataset.niche = cfg.id;
  }

  /* ---------- оживление статичной разметки ---------- */

  function hydrate() {
    const st = status();
    doc.querySelectorAll('[data-status]').forEach((el) => {
      el.classList.toggle('is-open', st.open);
      el.querySelector('[data-status-text]').textContent = st.text;
    });

    const today = dow(bizNow());
    doc.querySelectorAll('.hours li').forEach((li) => {
      const [a, b] = li.dataset.days.split('-').map(Number);
      li.classList.toggle('is-today', today >= a && today <= b);
    });

    // Окна в первом экране: сегодня, если есть хоть одно, иначе ближайший рабочий день
    const slotsBox = doc.querySelectorAll('[data-qw-slots]');
    if (slotsBox.length) {
      const base = addDays(bizNow(), 0);
      widgetDay = base;
      for (let i = 0; i < 7; i++) {
        const day = addDays(base, i);
        if (cfg.staff.some((s) => freeSlots(day, s.id).length)) {
          widgetDay = day;
          break;
        }
      }
      const dateEl = doc.querySelector('[data-qw-date]');
      if (dateEl) dateEl.textContent = dayLabel(widgetDay);
      slotsBox.forEach((box) => {
        const id = box.dataset.qwSlots;
        const free = freeSlots(widgetDay, id).slice(0, 3);
        box.innerHTML = free.length
          ? free.map((s) => `<button class="chip" type="button" data-book data-staff="${esc(id)}" data-time="${s.m}">${fmtMin(s.m)}</button>`).join('')
          : '<span class="qw__none">Окон нет</span>';
      });
    }

    if (doc.querySelector('[data-widget="estimate"]')) updateEstimate();

    const cookie = doc.querySelector('[data-cookie]');
    if (cookie) cookie.hidden = !!store.get('slot-cookie');
  }

  function updateEstimate() {
    const w = cfg.hero.widget;
    const checked = doc.querySelector('input[name="qw-brand"]:checked');
    const brand = w.brands[checked ? Number(checked.value) : w.defaultBrand];
    const sel = doc.querySelector('[data-est-service]');
    const svc = Slot.findService(cfg, sel.value);
    const near = nearest(null);
    estimate = { service: svc.id, date: near && near.date, time: near && near.time };
    doc.querySelector('[data-est-price]').textContent = price({ from: true, value: Slot.roundPrice(svc.price.value * brand.k) });
    doc.querySelector('[data-est-dur]').innerHTML = svc.duration ? ic('clock') + 'около ' + duration(svc.duration) : '';
    doc.querySelector('[data-est-slot]').textContent = near ? dayLabel(near.date) + ', ' + fmtMin(near.time) : 'уточните по телефону';
  }

  /* ---------- онлайн-запись ---------- */

  const B = { steps: [], i: 0, data: null, errors: {} };
  const STEP_NAMES = { service: 'Услуга', staff: 'Мастер', time: 'Дата и время', contacts: 'Контакты' };

  const dlg = () => doc.getElementById('book');

  function openBooking(preset) {
    B.data = Object.assign(
      {
        service: null,
        staff: null,
        staffChosen: !cfg.booking.askStaff,
        date: null,
        time: null,
        name: '',
        phone: '',
        comment: '',
        contact: cfg.booking.contactMethods[0],
        consent: false,
        extra: {},
      },
      preset
    );
    B.errors = {};
    B.steps = ['service'].concat(cfg.booking.askStaff ? ['staff'] : [], ['time', 'contacts']);
    B.i = nextIncomplete(-1);
    renderBooking();
    const d = dlg();
    if (!d.open) d.showModal();
    focusStep();
  }

  function isComplete(step) {
    const x = B.data;
    if (step === 'service') return !!x.service;
    if (step === 'staff') return x.staffChosen;
    if (step === 'time') return !!(x.date && x.time != null);
    return false;
  }

  function nextIncomplete(from) {
    for (let i = from + 1; i < B.steps.length; i++) if (!isComplete(B.steps[i])) return i;
    return B.steps.length - 1;
  }

  function summary() {
    const x = B.data;
    const parts = [];
    if (x.service) parts.push(Slot.findService(cfg, x.service).name);
    if (cfg.booking.askStaff && x.staffChosen) {
      const s = cfg.staff.find((m) => m.id === x.staff);
      parts.push(s ? s.name : 'Любой мастер');
    }
    if (x.date && x.time != null) parts.push(dayLabel(x.date) + ', ' + fmtMin(x.time));
    return parts.map((p) => `<span>${esc(p)}</span>`).join('');
  }

  function stepService() {
    return (
      '<div class="opts">' +
      cfg.services
        .map(
          (cat) =>
            `<p class="opts__cat">${esc(cat.category)}</p>` +
            cat.items
              .map(
                (it) => `
          <label class="opt">
            <input type="radio" name="b-service" value="${esc(it.id)}"${B.data.service === it.id ? ' checked' : ''}>
            <span class="opt__main"><b>${esc(it.name)}</b>${it.duration ? `<span>${duration(it.duration)}</span>` : ''}</span>
            <span class="opt__price">${price(it.price)}</span>
          </label>`
              )
              .join('')
        )
        .join('') +
      '</div>'
    );
  }

  function stepStaff() {
    const any = `
      <label class="opt">
        <input type="radio" name="b-staff" value=""${B.data.staffChosen && !B.data.staff ? ' checked' : ''}>
        <span class="ava" aria-hidden="true">${ic('scissors')}</span>
        <span class="opt__main"><b>Любой свободный мастер</b><span>Больше свободного времени</span></span>
      </label>`;
    return (
      '<div class="opts">' +
      any +
      cfg.staff
        .map(
          (s) => `
      <label class="opt">
        <input type="radio" name="b-staff" value="${esc(s.id)}"${B.data.staff === s.id ? ' checked' : ''}>
        <span class="ava" aria-hidden="true">${esc(initials(s.name))}</span>
        <span class="opt__main"><b>${esc(s.name)}</b><span>${esc(s.role)}</span></span>
      </label>`
        )
        .join('') +
      '</div>'
    );
  }

  function stepTime() {
    const today = addDays(bizNow(), 0);
    if (!B.data.date) {
      const near = nearest(B.data.staff);
      B.data.date = near ? near.date : today;
    }
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i))
      .map((day) => {
        const closed = !cfg.hours[dow(day)];
        const on = sameDay(day, B.data.date);
        return `<button class="day${on ? ' is-on' : ''}" type="button" data-day="${day.getTime()}" aria-pressed="${on}"${closed ? ' disabled' : ''}>
          <span>${i18nWeekday(day, today)}</span><b>${day.getDate()}</b></button>`;
      })
      .join('');
    const slots = daySlots(B.data.date, B.data.staff);
    const avail = slots.filter((s) => !s.busy && !s.past);
    const grid = avail.length
      ? slots
          .filter((s) => !s.past)
          .map(
            (s) =>
              `<button class="chip${B.data.time === s.m ? ' is-on' : ''}" type="button" data-slot="${s.m}" aria-pressed="${B.data.time === s.m}"${s.busy ? ' disabled' : ''}>${fmtMin(s.m)}</button>`
          )
          .join('')
      : '';
    return `
      <p class="opts__cat">${esc(fmtDay.format(B.data.date).replace(/^./, (c) => c.toUpperCase()))}</p>
      <div class="days" role="group" aria-label="Дата">${days}</div>
      ${grid ? `<div class="times" role="group" aria-label="Время">${grid}</div>` : '<p class="empty">На этот день свободных окон нет. Выберите другую дату.</p>'}`;
  }

  function i18nWeekday(day, today) {
    if (sameDay(day, today)) return 'сег';
    return fmtWeekday.format(day);
  }

  function field(id, label, input, hint) {
    const err = B.errors[id];
    return `
      <div class="field${err ? ' has-error' : ''}">
        <label for="b-${id}">${label}</label>
        ${input}
        ${err ? `<p class="field__err" id="b-${id}-err">${esc(err)}</p>` : hint ? `<p class="field__hint">${esc(hint)}</p>` : ''}
      </div>`;
  }

  function stepContacts() {
    const x = B.data;
    const aria = (id) => (B.errors[id] ? ` aria-invalid="true" aria-describedby="b-${id}-err"` : '');
    const extra = cfg.booking.fields
      .map((f) =>
        field(
          f.id,
          f.label + (f.required ? '' : ' <span class="opt-l">(необязательно)</span>'),
          `<input id="b-${f.id}" name="${f.id}" data-extra="${f.id}" type="text" placeholder="${esc(f.placeholder)}" value="${esc(x.extra[f.id] || '')}"${aria(f.id)}>`
        )
      )
      .join('');
    const methods = cfg.booking.contactMethods
      .map(
        (m) =>
          `<label class="chip chip--radio"><input type="radio" name="b-contact" value="${esc(m)}"${x.contact === m ? ' checked' : ''}><span>${esc(m)}</span></label>`
      )
      .join('');
    return `
      <div class="fields">
        ${field('name', 'Имя', `<input id="b-name" name="name" type="text" autocomplete="given-name" value="${esc(x.name)}"${aria('name')}>`)}
        ${field('phone', 'Телефон', `<input id="b-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 (___) ___-__-__" value="${esc(x.phone)}"${aria('phone')}>`, 'Пришлём напоминание за 2 часа до визита')}
        ${extra}
        <fieldset class="field">
          <legend>Как подтвердить запись</legend>
          <div class="chips">${methods}</div>
        </fieldset>
        ${field('comment', 'Комментарий <span class="opt-l">(необязательно)</span>', `<textarea id="b-comment" name="comment" rows="2">${esc(x.comment)}</textarea>`)}
        <div class="field${B.errors.consent ? ' has-error' : ''}">
          <label class="check">
            <input id="b-consent" type="checkbox"${x.consent ? ' checked' : ''}${aria('consent')}>
            <span>Даю <a href="#consent">согласие на обработку персональных данных</a> и принимаю <a href="#privacy">политику конфиденциальности</a></span>
          </label>
          ${B.errors.consent ? `<p class="field__err" id="b-consent-err">${esc(B.errors.consent)}</p>` : ''}
        </div>
      </div>`;
  }

  function stepDone() {
    const x = B.data;
    const svc = Slot.findService(cfg, x.service);
    const staff = cfg.staff.find((m) => m.id === x.staff);
    return `
      <div class="done">
        <span class="done__ic">${ic('check')}</span>
        <h3 class="done__title">Вы записаны</h3>
        <p class="done__when">${esc(dayLabel(x.date))}, ${fmtMin(x.time)}</p>
        <ul class="done__list">
          <li><span>Услуга</span><b>${esc(svc.name)}</b></li>
          ${cfg.booking.askStaff ? `<li><span>Мастер</span><b>${esc(staff ? staff.name : 'Любой свободный')}</b></li>` : ''}
          <li><span>Адрес</span><b>${esc(cfg.contacts.address)}</b></li>
          <li><span>Подтверждение</span><b>${esc(x.contact)}</b></li>
        </ul>
        <p class="done__note">Это демо: заявка никуда не отправлена. В рабочей версии она уходит администратору в Telegram или в YCLIENTS.</p>
      </div>`;
  }

  function renderBooking() {
    const d = dlg();
    const step = B.steps[B.i] || 'done';
    const isDone = step === 'done';
    d.querySelector('[data-book-step]').textContent = isDone ? 'Готово' : `Шаг ${B.i + 1} из ${B.steps.length} · ${STEP_NAMES[step]}`;
    d.querySelector('[data-book-back]').hidden = isDone || B.i === 0;
    d.querySelector('[data-book-sum]').innerHTML = isDone ? '' : summary();
    const body = d.querySelector('[data-book-body]');
    body.innerHTML =
      step === 'service' ? stepService() : step === 'staff' ? stepStaff() : step === 'time' ? stepTime() : step === 'contacts' ? stepContacts() : stepDone();
    const next = d.querySelector('[data-book-next]');
    next.textContent = isDone ? 'Готово' : step === 'contacts' ? 'Записаться' : 'Далее';
    next.disabled = !isDone && step !== 'contacts' && !isComplete(step);
    if (step === 'time') {
      const on = body.querySelector('.day.is-on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function focusStep() {
    const d = dlg();
    const first = d.querySelector('[data-book-body] input:checked, [data-book-body] input, [data-book-body] button:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }

  function validateContacts() {
    const x = B.data;
    const e = {};
    if (!x.name.trim()) e.name = 'Напишите, как к вам обращаться';
    if (x.phone.replace(/\D/g, '').length !== 11) e.phone = 'Введите номер полностью: +7 и 10 цифр';
    cfg.booking.fields.forEach((f) => {
      if (f.required && !(x.extra[f.id] || '').trim()) e[f.id] = 'Заполните поле, чтобы мастер подготовил запчасти';
    });
    if (!x.consent) e.consent = 'Без согласия мы не можем принять заявку';
    B.errors = e;
    return !Object.keys(e).length;
  }

  function goNext() {
    const step = B.steps[B.i];
    if (!step) return dlg().close();
    if (step === 'contacts') {
      if (!validateContacts()) {
        renderBooking();
        const bad = dlg().querySelector('[aria-invalid="true"]');
        if (bad) bad.focus();
        return;
      }
      B.i = B.steps.length; // экран «Готово»
    } else {
      if (!isComplete(step)) return;
      B.i = nextIncomplete(B.i);
    }
    renderBooking();
    dlg().querySelector('[data-book-body]').scrollTop = 0;
    focusStep();
  }

  function maskPhone(v) {
    let d = v.replace(/\D/g, '');
    if (!d) return '';
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    const p = d.slice(1, 11);
    let out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length > 3) out += ') ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  }

  /* ---------- события (делегирование, вешаются один раз) ---------- */

  function onClick(e) {
    const t = e.target;

    const book = t.closest('[data-book]');
    if (book) {
      const ds = book.dataset;
      const preset = {};
      if (ds.service) preset.service = ds.service;
      if (ds.staff) {
        preset.staff = ds.staff;
        preset.staffChosen = true;
      }
      if (ds.time && widgetDay) {
        preset.date = widgetDay;
        preset.time = Number(ds.time);
      }
      if (ds.fromEstimate !== undefined && estimate) {
        preset.service = estimate.service;
        if (estimate.date) {
          preset.date = estimate.date;
          preset.time = estimate.time;
        }
        const car = doc.querySelector('input[name="qw-brand"]:checked');
        if (car) preset.extra = { car: car.nextElementSibling.textContent + ' ' };
      }
      closeMenu();
      openBooking(preset);
      return;
    }

    const menuBtn = t.closest('[data-menu]');
    if (menuBtn) {
      const menu = doc.getElementById('menu');
      const open = menu.hidden;
      menu.hidden = !open;
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      menuBtn.innerHTML = ic(open ? 'x' : 'menu');
      return;
    }
    if (t.closest('.menu a')) closeMenu();

    const tab = t.closest('[role="tab"]');
    if (tab) return selectTab(tab);

    if (t.closest('[data-cookie-ok]')) {
      store.set('slot-cookie', '1');
      doc.querySelector('[data-cookie]').hidden = true;
      return;
    }

    const niche = t.closest('[data-niche]');
    if (niche) return switchNiche(niche.dataset.niche, true);

    // внутри окна записи
    if (t.closest('[data-book-close]')) return dlg().close();
    if (t.closest('[data-book-back]')) {
      B.i = Math.max(0, B.i - 1);
      renderBooking();
      return focusStep();
    }
    const day = t.closest('[data-day]');
    if (day) {
      B.data.date = new Date(Number(day.dataset.day));
      B.data.time = null;
      renderBooking();
      const first = dlg().querySelector('[data-slot]:not([disabled])');
      if (first) first.focus({ preventScroll: true });
      return;
    }
    const slot = t.closest('[data-slot]');
    if (slot) {
      B.data.time = Number(slot.dataset.slot);
      renderBooking();
      dlg().querySelector('[data-book-next]').focus({ preventScroll: true });
      return;
    }
    if (t === dlg()) dlg().close(); // клик по затемнению
  }

  function onChange(e) {
    const t = e.target;
    if (t.name === 'qw-brand' || t.matches('[data-est-service]')) return updateEstimate();
    if (!B.data) return;
    if (t.name === 'b-service') {
      B.data.service = t.value;
      renderBooking();
      dlg().querySelector('[data-book-next]').focus({ preventScroll: true });
    } else if (t.name === 'b-staff') {
      B.data.staff = t.value || null;
      B.data.staffChosen = true;
      if (B.data.date && B.data.time != null) {
        const ok = freeSlots(B.data.date, B.data.staff).some((s) => s.m === B.data.time);
        if (!ok) B.data.time = null;
      }
      renderBooking();
      dlg().querySelector('[data-book-next]').focus({ preventScroll: true });
    } else if (t.name === 'b-contact') B.data.contact = t.value;
    else if (t.id === 'b-consent') B.data.consent = t.checked;
  }

  function onInput(e) {
    const t = e.target;
    if (!B.data) return;
    if (t.id === 'b-phone') {
      t.value = maskPhone(t.value);
      B.data.phone = t.value;
    } else if (t.id === 'b-name') B.data.name = t.value;
    else if (t.id === 'b-comment') B.data.comment = t.value;
    else if (t.dataset.extra) B.data.extra[t.dataset.extra] = t.value;
  }

  function onSubmit(e) {
    if (!e.target.closest('.book__form')) return;
    e.preventDefault();
    goNext();
  }

  function onKey(e) {
    const tab = e.target.closest('[role="tab"]');
    if (!tab || !['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const tabs = Array.from(tab.parentElement.querySelectorAll('[role="tab"]'));
    let i = tabs.indexOf(tab);
    if (e.key === 'ArrowRight') i = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') i = 0;
    if (e.key === 'End') i = tabs.length - 1;
    e.preventDefault();
    selectTab(tabs[i]);
    tabs[i].focus();
  }

  function selectTab(tab) {
    const list = tab.parentElement;
    list.querySelectorAll('[role="tab"]').forEach((b) => {
      const on = b === tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      doc.getElementById(b.getAttribute('aria-controls')).hidden = !on;
    });
  }

  function closeMenu() {
    const menu = doc.getElementById('menu');
    const btn = doc.querySelector('[data-menu]');
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Открыть меню');
    btn.innerHTML = ic('menu');
  }

  /* ---------- демо: переключатель ниш ---------- */

  function demoBar() {
    const ids = Object.keys(Slot.niches);
    return `
      <div class="wrap demo__in">
        <p class="demo__text"><b>Шаблон «Слот»</b> · демо, все данные вымышленные</p>
        <div class="demo__seg" role="group" aria-label="Ниша">${ids
          .map(
            (id) =>
              `<button type="button" data-niche="${id}" aria-pressed="${id === cfg.id}">${esc(Slot.niches[id].label)}</button>`
          )
          .join('')}</div>
      </div>`;
  }

  function switchNiche(id, user) {
    if (!Slot.niches[id] || (cfg && cfg.id === id && !user)) return;
    cfg = Slot.niches[id];
    applyTheme();
    const app = doc.getElementById('app');
    app.innerHTML = Slot.render(cfg);
    const bar = doc.getElementById('demo');
    if (bar) bar.innerHTML = demoBar();
    hydrate();
    if (user) {
      store.set('slot-niche', id);
      try {
        history.replaceState(null, '', '#' + id);
      } catch (e) {
        /* в песочнице может быть недоступно */
      }
      window.scrollTo(0, 0);
    }
  }

  /* ---------- запуск ---------- */

  Slot.boot = function (o) {
    opts = Object.assign(opts, o || {});
    doc.addEventListener('click', onClick);
    doc.addEventListener('change', onChange);
    doc.addEventListener('input', onInput);
    doc.addEventListener('submit', onSubmit);
    doc.addEventListener('keydown', onKey);

    const fromHash = (location.hash || '').slice(1);
    let id = opts.niche;
    if (opts.demo) {
      if (Slot.niches[fromHash]) id = fromHash;
      else if (Slot.niches[store.get('slot-niche')]) id = store.get('slot-niche');
    }
    const app = doc.getElementById('app');
    const prerendered = app.dataset.niche === id && app.children.length;
    cfg = Slot.niches[id];
    applyTheme();
    if (!prerendered) app.innerHTML = Slot.render(cfg);
    if (opts.demo) {
      const bar = doc.getElementById('demo');
      bar.hidden = false;
      bar.innerHTML = demoBar();
    }
    hydrate();
  };
})(window);
