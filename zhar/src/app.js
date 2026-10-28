/* Жар-соус: фильтр линейки, подбор к блюду, окно соуса, нижняя панель */
(function () {
  'use strict';
  const D = window.ZHAR;
  const doc = document;
  const byId = Object.fromEntries(D.products.map((p) => [p.id, p]));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const HEAT = ['Неострый', 'Слегка острый', 'Острый', 'Экстра острый'];
  const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const icon = (id) => (doc.querySelector(`[data-open="${id}"] .pimg__ph`) || {}).innerHTML || '';

  // Фильтр линейки
  function filter(btn) {
    const line = btn.dataset.lineF;
    doc.querySelectorAll('[data-line-f]').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
      b.setAttribute('aria-pressed', String(b === btn));
    });
    doc.querySelectorAll('[data-cards] .card').forEach((c) => {
      const show = !line || c.dataset.line === line;
      c.hidden = !show;
      if (show) {
        c.style.animation = 'none';
        void c.offsetWidth;
        c.style.animation = '';
      }
    });
  }

  // Подбор к блюду
  function dish(btn) {
    doc.querySelectorAll('[data-dish]').forEach((b) => {
      b.classList.toggle('is-on', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    doc.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== btn.dataset.dish));
  }

  // Окно соуса: состав, КБЖУ, хранение, кнопки магазинов
  function open(id) {
    const p = byId[id];
    if (!p) return;
    const m = doc.getElementById('modal');
    const n = p.nutrition;
    m.querySelector('[data-modal]').innerHTML = `
      <button class="pd__close" type="button" data-close aria-label="Закрыть"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      <div class="pd" style="--c:${p.color}">
        <span class="pimg pd__img" style="--c:${p.color}">${p.img ? `<img src="${esc(p.img)}" alt="${esc('Жар-соус — ' + p.name)}" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<span class="pimg__ph" aria-hidden="true">${icon(id)}</span></span>
        <div class="pd__body">
          <span class="heat heat--${p.heat}"><span class="heat__dots" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= p.heat ? 'on' : ''}"></i>`).join('')}</span>${HEAT[p.heat]}${p.shu ? ` · ${num(p.shu)} SHU` : ''}</span>
          <h2 class="pd__name">${esc(p.name)}</h2>
          <p class="pd__notes">${esc(p.notes)}</p>
          <p class="pd__meta">${p.rating ? `<span>★ ${String(p.rating).replace('.', ',')} на Ozon</span>` : ''}${p.reviews ? `<span>${num(p.reviews)} отзывов</span>` : ''}<span>${p.volume === '1000' ? '1 кг' : esc(p.volume || 100) + ' мл'}</span></p>
          <h3>К чему</h3><p>${esc(p.pairs)}</p>
          ${p.composition ? `<h3>Состав</h3><p class="pd__comp">${esc(p.composition)}</p>` : ''}
          ${n ? `<h3>На 100 г</h3><div class="nutr">${[[n.kcal, "ккал"], [n.p, "белки, г"], [n.f, "жиры, г"], [n.c, "углеводы, г"]].map(([v, l]) => `<span><b>${esc(String(v).replace(".", ","))}</b>${l}</span>`).join("")}</div>` : ''}
          ${p.storage ? `<h3>Хранение</h3><p class="pd__comp">${esc(p.storage)}</p>` : ''}
          <div class="buy"><a class="btn btn--ozon" href="${esc(p.ozon)}" target="_blank" rel="noopener">Купить на Ozon</a><a class="btn btn--wb" href="${esc(D.wb)}" target="_blank" rel="noopener">Wildberries</a></div>
        </div>
      </div>`;
    if (!m.open) m.showModal();
    m.scrollTop = 0;
  }

  doc.addEventListener('click', (e) => {
    const t = e.target;
    const f = t.closest('[data-line-f]');
    if (f) return filter(f);
    const d = t.closest('[data-dish]');
    if (d) return dish(d);
    const o = t.closest('[data-open]');
    if (o) return open(o.dataset.open);
    if (t.closest('[data-close]') || t.id === 'modal') doc.getElementById('modal').close();
  });

  // Нижняя панель «Ozon / WB» на телефоне — после первого экрана
  const bar = doc.querySelector('.mbar');
  const hero = doc.querySelector('.hero');
  if (bar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => bar.classList.toggle('is-on', !en.isIntersecting)).observe(hero);
  }
})();
