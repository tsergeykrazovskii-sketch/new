// Сайт бренда «Жар-соус»: данные (src/content.json + src/ozon-raw.json) → zhar/dist/index.html
// Запуск: node zhar/build.mjs [--base-url https://zharsous.ru/] [--out папка] [--demo]
//   --demo — черновик на demo.top-in.ru: закрыт от поисковиков (noindex), без canonical и sitemap
// Фото упаковок: zhar/img/products/<артикул Ozon>.webp (node zhar/fetch-images.mjs), пока их нет — ссылки на фото Ozon.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const arg0 = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : '');
const dist = arg0('--out') ? path.resolve(arg0('--out')) : path.join(here, 'dist');
const DEMO = process.argv.includes('--demo');
const read = (p) => fs.readFileSync(path.join(here, p), 'utf8');
const C = JSON.parse(read('src/content.json'));
const RAW = JSON.parse(read('src/ozon-raw.json'));
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : '');
const SITE = (arg('--base-url') || '').replace(/\/?$/, '/').replace(/^\/$/, '');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const NB = ' ';
const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
const plural = (n, f) => f[n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2];

// Продукты: редакторские поля + данные карточки Ozon
const products = C.products.map((p) => {
  const r = RAW[p.id] || {};
  const local = `img/products/${p.id}.webp`;
  const img = fs.existsSync(path.join(here, local)) ? local : (r.images || [])[0] || '';
  return Object.assign({}, p, {
    ozon: r.ozon,
    rating: r.rating,
    reviews: r.reviews,
    composition: r.composition,
    storage: r.storage,
    nutrition: r.nutrition,
    volume: r.volume,
    weight: r.weight,
    img,
  });
});
const byId = Object.fromEntries(products.map((p) => [p.id, p]));
const FLAVORS = products.filter((p) => p.line !== 'big').length; // «Помидор, 1 кг» — тот же вкус

/* ---------- иконки (контур, 24×24) ---------- */
const ICONS = {
  flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.6-2.4-5.6-3.6-8.4-.4 1.8-1.4 3-2.6 3.6.2-3.2-1.2-6.4-4-8.4.4 3.2-1.2 5.2-2.7 7C4.8 10.6 5 12 5 15.2 5 19.3 8 22 12 22z"/><path d="M12 22c-1.7 0-3-1.3-3-3.1 0-1.8 1.4-2.6 2-4.4.8 1 1.6 1.3 2.2 1.2-.2 1 .8 1.6.8 3.2 0 1.8-.9 3.1-2 3.1z"/>',
  pepper: '<path d="M13.5 7.5c-3 .5-5 3-6 6.5-.8 2.8-2.3 4.8-4.5 6 4.8.6 9.6-.8 12.4-4.6 1.8-2.4 2-5.4.6-7.2-.8-.7-1.6-.9-2.5-.7z"/><path d="M15 7.2c.2-1.6 1.2-3 3-3.7M16.5 8.5c1.5-.8 3-.6 4.2.4"/>',
  star: '<path d="m12 2.8 2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
  arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  drop: '<path d="M12 3.2s-6 6.6-6 10.8a6 6 0 0 0 12 0c0-4.2-6-10.8-6-10.8z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-1.5-3-5-3.6-5-1.4C7 8 9.5 8 12 8zm0 0c1.5-3 5-3.6 5-1.4C17 8 14.5 8 12 8z"/>',
  leaf: '<path d="M5 19c0-8 5-13 15-14-1 10-6 15-14 15"/><path d="M5 19 13 11"/>',
  chef: '<path d="M7 14.5V20h10v-5.5"/><path d="M7 14.5A4 4 0 0 1 6.6 6.6a5 5 0 0 1 9.8-.6A4 4 0 0 1 17 14.5z"/><path d="M7 17.5h10"/>',
  drum: '<path d="M14.5 4.5a5 5 0 0 1 3.3 8.6l-3.8 3.8-4.9-4.9 3.8-3.8A5 5 0 0 1 14.5 4.5z"/><path d="m9.1 12-4.6 4.6a1.8 1.8 0 1 0 2.4 2.4l.4.4 4.4-4.5"/>',
  fish: '<path d="M3 12c3-4 7-5.5 11-5 3 .4 5 2.5 6 5-1 2.5-3 4.6-6 5-4 .5-8-1-11-5z"/><path d="M3 12 1 9M3 12l-2 3"/><circle cx="16" cy="11" r=".8"/>',
  cheese: '<path d="M3 17V10l11-6 7 6v7z"/><path d="M3 10h18"/><circle cx="8" cy="14" r="1.2"/><circle cx="15" cy="13.5" r="1.6"/>',
  burger: '<path d="M4 10a8 5 0 0 1 16 0z"/><path d="M3.5 13.5h17M4 17h16a0 0 0 0 1 0 0 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>',
  ice: '<path d="M8 11 12 21l4-10"/><path d="M7 11a5 5 0 1 1 10 0z"/>',
  vk: '<path d="M3 7h3.2c.3 4 2 6 3.6 6.4V7h3v3.6c1.6-.2 3.2-2 3.8-3.6h3c-.5 2.4-2.4 4.4-3.8 5.2 1.4.6 3.6 2.4 4.2 4.8h-3.3c-.6-1.6-2-3-3.9-3.2V17h-.4C6.6 17 3.3 13.6 3 7z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
};
const ic = (n, cls) => `<svg class="ic${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- кусочки ---------- */
const HEAT = ['Неострый', 'Слегка острый', 'Острый', 'Экстра острый'];
const heat = (p) =>
  `<span class="heat heat--${p.heat}" title="${HEAT[p.heat]}"><span class="heat__dots" aria-hidden="true">${[1, 2, 3].map((i) => `<i class="${i <= p.heat ? 'on' : ''}"></i>`).join('')}</span>${HEAT[p.heat]}${p.shu ? ` · ${num(p.shu)}${NB}SHU` : ''}</span>`;
const stars = (r) => `<span class="rate">${ic('star', 'rate__star')}<b>${String(r).replace('.', ',')}</b></span>`;
const buy = (p, cls) =>
  `<div class="buy ${cls || ''}"><a class="btn btn--ozon" href="${esc(p.ozon)}" target="_blank" rel="noopener">Ozon${ic('arrow')}</a><a class="btn btn--wb" href="${esc(C.brand.wb)}" target="_blank" rel="noopener">WB${ic('arrow')}</a></div>`;
const pimg = (p, cls, eager) =>
  `<span class="pimg ${cls || ''}" style="--c:${p.color}"><img src="${esc(p.img)}" alt="${esc(C.brand.name + ' — ' + p.name)}"${eager ? '' : ' loading="lazy"'} referrerpolicy="no-referrer" onerror="this.remove()"><span class="pimg__ph" aria-hidden="true">${ic('pepper')}</span></span>`;

const card = (p) => `
      <li class="card" data-line="${p.line}" data-dishes="${p.dishes.join(' ')}" style="--c:${p.color}">
        <button class="card__open" type="button" data-open="${p.id}" aria-label="Подробнее: ${esc(p.name)}">${pimg(p, 'card__img')}</button>
        ${p.hit ? `<span class="card__hit">${esc(p.hit)}</span>` : ''}
        <div class="card__body">
          ${heat(p)}
          <h3 class="card__name"><button type="button" data-open="${p.id}">${esc(p.name)}</button></h3>
          <p class="card__notes">${esc(p.notes)}</p>
          <p class="card__meta">${p.rating ? stars(p.rating) : ''}${p.reviews ? `<span>${num(p.reviews)} ${plural(p.reviews, ['отзыв', 'отзыва', 'отзывов'])}</span>` : ''}<span>${esc(p.volume === '1000' ? '1 кг' : (p.volume || 100) + ' мл')}</span></p>
          ${buy(p)}
        </div>
      </li>`;

/* ---------- секции ---------- */
const hits = ['440273240', '1971091698', '2091586568'].map((id) => byId[id]);
const B = C.brand;

const header = `
<a class="skip" href="#catalog">К соусам</a>
<header class="hdr" data-hdr>
  <div class="wrap hdr__in">
    <a class="logo" href="#top" aria-label="${esc(B.name)} — наверх">${ic('flame', 'logo__ic')}<span><b>ЖАР</b>-СОУС</span></a>
    <nav class="nav" aria-label="Разделы">
      <a href="#catalog">Соусы</a><a href="#heat">Острота</a><a href="#match">К чему</a><a href="#reviews">Отзывы</a><a href="#opt">Оптовикам</a>
    </nav>
    <a class="btn btn--fire hdr__cta" href="#buy">Купить</a>
    <button class="burger" type="button" data-menu aria-expanded="false" aria-controls="menu" aria-label="Открыть меню"><span></span><span></span><span></span></button>
  </div>
  <div class="menu" id="menu" hidden>
    <nav class="wrap menu__in" aria-label="Меню">
      ${[['catalog', 'Соусы'], ['heat', 'Острота'], ['match', 'К чему'], ['reviews', 'Отзывы'], ['gift', 'В подарок'], ['opt', 'Оптовикам'], ['buy', 'Где купить'], ['faq', 'Вопросы']]
        .map(([id, t], i) => `<a class="menu__link" href="#${id}" style="--i:${i}">${t}${ic('arrow')}</a>`)
        .join('')}
      <div class="menu__buy"><a class="btn btn--ozon btn--lg" href="${esc(B.ozonShop)}" target="_blank" rel="noopener">Ozon${ic('arrow')}</a><a class="btn btn--wb btn--lg" href="${esc(B.wb)}" target="_blank" rel="noopener">Wildberries${ic('arrow')}</a></div>
      <a class="menu__vk" href="${esc(B.vk)}" target="_blank" rel="noopener">${ic('vk')}Мы во ВКонтакте</a>
    </nav>
  </div>
</header>`;

const hero = `
<section class="hero" id="top">
  <div class="hero__bg"><img src="img/hero.webp" alt="" fetchpriority="high"></div>
  <div class="wrap hero__in">
    <div class="hero__copy">
      <p class="eyebrow rise">${ic('pepper')} ${esc(B.tagline)}</p>
      <h1 class="hero__title rise" style="--d:1">Сначала вкус. <span class="fire">Потом жар.</span></h1>
      <p class="hero__lead rise" style="--d:2">Острые соусы на настоящих ягодах и фруктах — клюква, манго, слива, фейхоа, смородина — и перце Carolina Reaper. Острота приходит после вкуса и регулируется каплями.</p>
      <ul class="chips rise" style="--d:3">
        <li>${ic('leaf')}Пюре ягод и фруктов в основе</li><li>${ic('drop')}Без резкого уксусного вкуса</li><li>${ic('gift')}В подарочной коробке</li>
      </ul>
      <div class="hero__buy rise" style="--d:4">
        <a class="btn btn--ozon btn--lg" href="${esc(B.ozonShop)}" target="_blank" rel="noopener">Купить на Ozon${ic('arrow')}</a>
        <a class="btn btn--wb btn--lg" href="${esc(B.wb)}" target="_blank" rel="noopener">Купить на Wildberries${ic('arrow')}</a>
      </div>
      <p class="proof rise" style="--d:5">${stars(B.rating)}<span>${B.reviews} отзывов на Ozon</span><span class="proof__dot"></span><span>${B.orders}+ заказов</span></p>
    </div>
    <div class="hero__shelf rise" style="--d:3" aria-label="Хиты">
      ${hits.map((p, i) => `<button class="shelf__item" type="button" data-open="${p.id}" style="--i:${i};--c:${p.color}">${pimg(p, '', i === 0)}<span class="shelf__name">${esc(p.name)}</span></button>`).join('')}
    </div>
  </div>
</section>
<div class="ticker" aria-hidden="true"><div class="ticker__in">${Array(2)
  .fill(['CAROLINA REAPER', '15 000 SHU', 'НАСТОЯЩИЕ ЯГОДЫ', 'СНАЧАЛА ВКУС — ПОТОМ ЖАР', `${FLAVORS} ВКУСОВ`, '4,9 НА OZON'].map((t) => `<span>${t}</span>${ic('flame')}`).join(''))
  .join('')}</div></div>`;

const catalog = `
<section class="sec" id="catalog">
  <div class="wrap">
    <div class="sec__head">
      <p class="eyebrow">Линейка</p>
      <h2 class="sec__title">${FLAVORS} вкусов — от «не жжёт» до «держите сметану»</h2>
      <p class="sec__lead">Острые — на перце Carolina Reaper, неострые — к сыру, рыбе и десертам. Нажмите на соус — покажем состав и с чем его есть.</p>
    </div>
    <div class="filters" role="group" aria-label="Фильтр">
      <button class="pill is-on" type="button" data-line-f="" aria-pressed="true">Все <small>${products.length}</small></button>
      ${C.lines.map((l) => `<button class="pill" type="button" data-line-f="${l.id}" aria-pressed="false">${esc(l.label)} <small>${products.filter((p) => p.line === l.id).length}</small></button>`).join('')}
    </div>
    <ul class="cards" data-cards>${products.map(card).join('')}</ul>
  </div>
</section>`;

const heatSec = `
<section class="sec sec--dark" id="heat">
  <div class="wrap heat-sec">
    <div>
      <p class="eyebrow">Острота</p>
      <h2 class="sec__title">15 000 SHU — это сколько?</h2>
      <p class="sec__lead">Остроту меряют в единицах Сковилла (SHU). На этикетке острых Жар-соусов — 15 000 SHU: заметно острее Табаско, но в тысячу раз мягче самого перца Carolina Reaper. Перца в соусе немного — ровно столько, чтобы вкус фруктов успел раскрыться.</p>
      <ul class="tips">
        <li>${ic('drop')}<span><b>Начните с 1–2 капель.</b> Острота регулируется количеством.</span></li>
        <li>${ic('check')}<span><b>Мягче — со сметаной или майонезом.</b> Получится густой дип.</span></li>
        <li>${ic('flame')}<span><b>Жар приходит после вкуса.</b> Сначала фрукты, через пару секунд — тепло.</span></li>
      </ul>
    </div>
    <div class="scale" aria-label="Шкала остроты">
      <div class="scale__row"><span class="scale__name">Кетчуп</span><span class="scale__bar"><i style="--w:1%"></i></span><span class="scale__val">0</span></div>
      <div class="scale__row"><span class="scale__name">Табаско</span><span class="scale__bar"><i style="--w:38%"></i></span><span class="scale__val">2 500–5 000</span></div>
      <div class="scale__row scale__row--us"><span class="scale__name">Жар-соус</span><span class="scale__bar"><i style="--w:58%"></i></span><span class="scale__val">15 000</span></div>
      <div class="scale__row"><span class="scale__name">Перец Carolina Reaper</span><span class="scale__bar"><i style="--w:100%"></i></span><span class="scale__val">≈ 1 600 000</span></div>
      <p class="scale__note">Шкала логарифмическая. Табаско и Carolina Reaper — общеизвестные данные, Жар-соус — по этикетке острых вкусов.</p>
      <img class="scale__img" src="img/reaper.webp" alt="Перцы Carolina Reaper" loading="lazy">
    </div>
  </div>
</section>`;

const match = `
<section class="sec" id="match">
  <div class="wrap">
    <div class="sec__head">
      <p class="eyebrow">Подбор</p>
      <h2 class="sec__title">К чему этот соус?</h2>
      <p class="sec__lead">Выберите блюдо — покажем, какие соусы к нему советуют создатели.</p>
    </div>
    <div class="match">
      <div class="match__tabs" role="tablist" aria-label="Блюдо">${C.dishes
        .map((d, i) => `<button class="mtab${i ? '' : ' is-on'}" type="button" role="tab" aria-selected="${!i}" data-dish="${d.id}">${ic(d.icon)}${esc(d.label)}</button>`)
        .join('')}</div>
      <div class="match__stage">
        ${C.dishes
          .map(
            (d, i) => `<div class="match__panel" data-panel="${d.id}"${i ? ' hidden' : ''}>
          <img class="match__img" src="img/${{ meat: 'hero', bird: 'fruits', fish: 'fish', cheese: 'cheese', street: 'street', sweet: 'sweet' }[d.id]}.webp" alt="" loading="lazy">
          <ul class="match__list">${products
            .filter((p) => p.dishes.includes(d.id) && p.line !== 'big')
            .map((p) => `<li><button type="button" data-open="${p.id}" style="--c:${p.color}"><i class="dot"></i><b>${esc(p.name)}</b><span>${esc(p.pairs)}</span>${heat(p)}</button></li>`)
            .join('')}</ul>
        </div>`
          )
          .join('')}
      </div>
    </div>
  </div>
</section>`;

const why = `
<section class="sec sec--cream" id="why">
  <div class="wrap">
    <div class="sec__head">
      <p class="eyebrow">Чем отличается</p>
      <h2 class="sec__title">Не «жжёт ради жжения»</h2>
    </div>
    <div class="vs">
      <div class="vs__col">
        <h3>Обычный острый соус</h3>
        <ul><li>Уксус и перец — главный вкус</li><li>Жжёт сразу и перебивает блюдо</li><li>Один вкус на все случаи</li><li>Бутылка без истории</li></ul>
      </div>
      <div class="vs__col vs__col--us">
        <h3>${ic('flame')}Жар-соус</h3>
        <ul><li>${ic('check')}В основе — пюре ягод и фруктов</li><li>${ic('check')}Сначала вкус, жар приходит следом</li><li>${ic('check')}${FLAVORS} вкусов: к мясу, рыбе, сыру и десертам</li><li>${ic('check')}Коробочка, письмо от создателей и рецепты внутри</li></ul>
      </div>
    </div>
    <div class="steps">
      <figure class="step"><img src="img/berries.webp" alt="Клюква, смородина и перцы" loading="lazy"><figcaption><b>01</b>Ягоды и фрукты</figcaption><p>Дикая клюква, садовая слива, фейхоа, манго, смородина — в основе соуса пюре и соки, а не загустители.</p></figure>
      <figure class="step"><img src="img/reaper.webp" alt="Перцы Carolina Reaper" loading="lazy"><figcaption><b>02</b>Carolina Reaper</figcaption><p>Один из самых острых перцев в мире — понемногу, вместе с имбирём, лаймом и пряностями.</p></figure>
      <figure class="step"><img src="img/fruits.webp" alt="Фрукты и соус" loading="lazy"><figcaption><b>03</b>Баланс</figcaption><p>Сладость, кислинка и тепло в одной капле: острота не убивает вкус, а раскрывает его.</p></figure>
    </div>
  </div>
</section>`;

const reviews = `
<section class="sec" id="reviews">
  <div class="wrap rev">
    <div class="rev__side">
      <p class="eyebrow">Отзывы</p>
      <h2 class="sec__title">Пишут те, кто уже попробовал</h2>
      <p class="rev__big">${B.rating}</p>
      <p class="rev__stars">${Array(5).fill(ic('star', 'rate__star')).join('')}</p>
      <p class="rev__src">средняя оценка товаров магазина на Ozon · ${B.reviews} отзывов · ${B.years} на Ozon</p>
      <a class="btn btn--line" href="${esc(B.ozonShop)}" target="_blank" rel="noopener">Все отзывы на Ozon${ic('arrow')}</a>
    </div>
    <ul class="rev__list">${C.reviews
      .map((r) => {
        const p = byId[r.product];
        return `<li class="review"><p class="review__top"><span class="review__stars">${Array(5).fill(ic('star', 'rate__star')).join('')}</span><button type="button" class="review__p" data-open="${p.id}" style="--c:${p.color}">${esc(p.name)}</button></p><blockquote>«${esc(r.text)}»</blockquote><p class="review__who"><span class="ava">${esc(r.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2))}</span><b>${esc(r.name)}</b><span>${esc(r.date)} · Ozon</span></p></li>`;
      })
      .join('')}</ul>
  </div>
</section>`;

const gift = `
<section class="sec sec--fire" id="gift">
  <div class="wrap gift">
    <div>
      <p class="eyebrow">В подарок</p>
      <h2 class="sec__title">Подарок, который не уберут в шкаф</h2>
      <p class="sec__lead">Каждый соус — в плотной коробочке, бутылка с тонким носиком-дозатором запаяна в пакет. Покупатели находят внутри магнит и письмо от создателей с историей вкуса и рецептами.</p>
      <a class="btn btn--light btn--lg" href="${esc(B.ozonShop)}" target="_blank" rel="noopener">Выбрать на Ozon${ic('arrow')}</a>
    </div>
    <ul class="gift__list"><li>${ic('box')}Коробочка и герметичный пакет</li><li>${ic('drop')}Носик-дозатор — по капле</li><li>${ic('gift')}Магнит и письмо с рецептами</li><li>${ic('star')}${B.rating} — средняя оценка на Ozon</li></ul>
  </div>
</section>`;

// Оптовикам: кому, проверенный спрос, форматы и характеристики. Условия и прайс — по запросу (в открытых данных их нет)
const horeca = `
<section class="sec sec--dark" id="opt">
  <div class="wrap">
    <div class="opt__head">
      <div>
        <p class="eyebrow">Оптовикам</p>
        <h2 class="sec__title">Жар-соус в ваш магазин, ресторан или подарочный набор</h2>
        <p class="sec__lead">${FLAVORS} вкусов в двух форматах, подарочная упаковка и срок годности до двух лет. Прайс, минимальную партию и условия доставки пришлём по запросу.</p>
        <div class="horeca__cta">
          <a class="btn btn--fire btn--lg" href="${esc(B.vk)}" target="_blank" rel="noopener">${ic('vk')}Запросить прайс во ВКонтакте</a>
          <a class="btn btn--line btn--lg" href="#opt-spec">Характеристики</a>
        </div>
      </div>
      <div class="demand">
        <p class="eyebrow">Спрос уже проверен</p>
        <ul class="demand__nums">
          <li><b>${B.rating}</b><span>средняя оценка товаров на Ozon</span></li>
          <li><b>${B.reviews}</b><span>отзывов покупателей</span></li>
          <li><b>${B.orders}+</b><span>заказов на Ozon</span></li>
          <li><b>${B.years}</b><span>на Ozon, статус Premium</span></li>
        </ul>
      </div>
    </div>
    <ul class="opt__cards">
      <li class="opt-card"><span class="opt-card__n">01</span><span class="opt-card__tag">Розница</span><h3>Магазины и сети</h3><p>Фермерские и гастрономические магазины, лавки специй, мясные бутики, магазины для гриля и барбекю. Бутылка 100 мл в своей коробке — сразу на полку.</p><p class="opt-card__chips"><span>Гастрономы</span><span>Мясные лавки</span><span>Всё для гриля</span></p></li>
      <li class="opt-card"><span class="opt-card__n">02</span><span class="opt-card__tag">HoReCa</span><h3>Рестораны и кафе</h3><p>Томатный соус есть в упаковке 1 кг. «Острую тыкву» создатели впервые сварили по заказу бренд-шефа сети ресторанов в Москве — вкус под ваше меню тоже обсуждаем.</p><p class="opt-card__chips"><span>Стейк-хаусы</span><span>Бургерные</span><span>Шашлычные</span></p></li>
      <li class="opt-card"><span class="opt-card__n">03</span><span class="opt-card__tag">Подарки</span><h3>Корпоративные подарки</h3><p>Каждый соус — в плотной коробочке, бутылка запаяна в пакет. Готовый подарок коллегам и клиентам: к Новому году, 23 февраля, на день компании.</p><p class="opt-card__chips"><span>Коллегам</span><span>Клиентам</span><span>Новый год</span></p></li>
    </ul>
    <div class="spec" id="opt-spec">
      <div class="spec__col">
        <h3>Форматы</h3>
        <dl><dt>Бутылка</dt><dd>100 мл (≈ 110 г), носик-дозатор, коробка + герметичный пакет</dd><dt>Большой формат</dt><dd>1 кг — томатный соус «Помидор»</dd><dt>Линейка</dt><dd>${products.filter((p) => p.line === 'hot').length} острых с Carolina Reaper и ${products.filter((p) => p.line === 'mild').length} неострых</dd></dl>
      </div>
      <div class="spec__col">
        <h3>Хранение и сроки</h3>
        <dl><dt>Срок годности</dt><dd>2 года у большинства вкусов</dd><dt>Хранение</dt><dd>от 0 до +25 °C, влажность до 75 %; неострые после вскрытия — не выше +12 °C</dd><dt>Производство</dt><dd>Россия</dd></dl>
      </div>
      <p class="spec__foot">Состав и КБЖУ каждого вкуса — в карточке соуса выше. Прайс, минимальная партия, документы и доставка — по запросу.<a class="btn btn--light" href="${esc(B.vk)}" target="_blank" rel="noopener">Запросить${ic('arrow')}</a></p>
    </div>
  </div>
</section>`;

const where = `
<section class="sec" id="buy">
  <div class="wrap">
    <div class="sec__head">
      <p class="eyebrow">Где купить</p>
      <h2 class="sec__title">На Ozon и Wildberries — с доставкой по всей России</h2>
    </div>
    <div class="shops">
      <a class="shop shop--ozon" href="${esc(B.ozonShop)}" target="_blank" rel="noopener"><span class="shop__logo">O</span><span class="shop__t"><b>Ozon</b>Магазин «Жар-соус» · Premium · ${B.rating} · ${B.reviews} отзывов</span><span class="btn btn--ozon">Перейти${ic('arrow')}</span></a>
      <a class="shop shop--wb" href="${esc(B.wb)}" target="_blank" rel="noopener"><span class="shop__logo">W</span><span class="shop__t"><b>Wildberries</b>Подборка Жар-соусов</span><span class="btn btn--wb">Перейти${ic('arrow')}</span></a>
    </div>
  </div>
</section>`;

const faq = `
<section class="sec sec--cream" id="faq">
  <div class="wrap faq">
    <div class="sec__head"><p class="eyebrow">Вопросы</p><h2 class="sec__title">Частые вопросы</h2></div>
    <div class="faq__list">${C.faq.map((f) => `<details class="qa"><summary>${esc(f.q)}${ic('x', 'qa__ic')}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
  </div>
</section>`;

const footer = `
<footer class="ftr">
  <div class="wrap ftr__in">
    <div><a class="logo" href="#top">${ic('flame', 'logo__ic')}<span><b>ЖАР</b>-СОУС</span></a><p>${esc(B.tagline)}. Сначала вкус — потом жар.</p></div>
    <nav aria-label="Разделы"><a href="#catalog">Соусы</a><a href="#heat">Острота</a><a href="#match">К чему</a><a href="#reviews">Отзывы</a><a href="#opt">Оптовикам</a><a href="#faq">Вопросы</a></nav>
    <div class="ftr__links"><a href="${esc(B.ozonShop)}" target="_blank" rel="noopener">Ozon</a><a href="${esc(B.wb)}" target="_blank" rel="noopener">Wildberries</a><a href="${esc(B.vk)}" target="_blank" rel="noopener">ВКонтакте</a></div>
  </div>
  <div class="wrap ftr__bot"><span>© ${B.year} ${esc(B.legal)}</span><span>Информация на сайте не является публичной офертой</span><span>Разработано в <a href="https://top-in.ru/" target="_blank" rel="noopener">top-in.ru</a></span></div>
</footer>
<div class="mbar"><a class="btn btn--ozon" href="${esc(B.ozonShop)}" target="_blank" rel="noopener">Ozon</a><a class="btn btn--wb" href="${esc(B.wb)}" target="_blank" rel="noopener">Wildberries</a></div>
<dialog class="modal" id="modal" aria-label="Соус"><div class="modal__in" data-modal></div></dialog>`;

// Данные для окна соуса — только то, что нужно странице
const P = products.map((p) => ({
  id: p.id, name: p.name, line: p.line, heat: p.heat, shu: p.shu, color: p.color, notes: p.notes, pairs: p.pairs,
  ozon: p.ozon, img: p.img, rating: p.rating, reviews: p.reviews, composition: p.composition, storage: p.storage,
  nutrition: p.nutrition, volume: p.volume, weight: p.weight,
}));

const title = `${B.name} — острые соусы с Carolina Reaper на ягодах и фруктах`;
const desc = `Жар-соус: ${FLAVORS} вкусов — клюква, манго, слива, фейхоа, смородина и Carolina Reaper. Сначала вкус, потом жар. Купить на Ozon и Wildberries. Оценка 4,9.`;
const fonts = ['dela-gothic-one', 'manrope'];
// превью ссылки 1200×630: node scripts/share.mjs zhar (снимок первого экрана) → assets/share/zhar.jpg
const SHARE = fs.existsSync(path.join(root, 'assets/share/zhar.jpg'));
const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#160D0A">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#E2341D"/><path d="M16 27c5 0 8-3.3 8-8 0-4.3-2.8-6.8-4.2-10.2-.5 2.2-1.6 3.6-3 4.3.2-3.9-1.4-7.7-4.7-10.1.5 3.9-1.4 6.3-3.1 8.4C7.5 13.5 8 15.4 8 19c0 4.7 3 8 8 8z" fill="#FFD25A"/></svg>')}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ru_RU">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${DEMO ? '<meta name="robots" content="noindex, nofollow">\n' : ''}${SITE ? `${DEMO ? '' : `<link rel="canonical" href="${esc(SITE)}">\n`}<meta property="og:url" content="${esc(SITE)}">\n<meta property="og:image" content="${esc(SITE)}${SHARE ? 'share.jpg' : 'img/hero.webp'}">\n${SHARE ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n' : ''}` : ''}${fonts.map((f) => `<link rel="stylesheet" href="fonts/${f}.css">`).join('\n')}
<style>${read('src/style.css')}</style>
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Brand',
  name: B.name,
  description: desc,
  sameAs: [B.ozonShop, B.wb, B.vk],
}).replace(/</g, '\\u003c')}</script>
</head>
<body>
${header}
<main>
${hero}
${catalog}
${heatSec}
${match}
${why}
${reviews}
${gift}
${horeca}
${where}
${faq}
</main>
${footer}
<script>window.ZHAR=${JSON.stringify({ products: P, wb: B.wb }).replace(/</g, '\\u003c')};</script>
<script>${read('src/app.js')}</script>
</body>
</html>
`;

// Сборка: страница, фото, нужные шрифты
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'fonts', 'files'), { recursive: true });
fs.writeFileSync(path.join(dist, 'index.html'), html);
fs.cpSync(path.join(here, 'img'), path.join(dist, 'img'), { recursive: true });
for (const f of fonts) {
  const css = fs.readFileSync(path.join(root, 'assets/fonts', f + '.css'), 'utf8');
  fs.writeFileSync(path.join(dist, 'fonts', f + '.css'), css);
  for (const m of css.matchAll(/url\(files\/([^)]+)\)/g)) fs.copyFileSync(path.join(root, 'assets/fonts/files', m[1]), path.join(dist, 'fonts/files', m[1]));
}
if (SHARE) fs.copyFileSync(path.join(root, 'assets/share/zhar.jpg'), path.join(dist, 'share.jpg'));
if (!DEMO) fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n${SITE ? `Sitemap: ${SITE}sitemap.xml\n` : ''}`);
if (SITE && !DEMO) fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${esc(SITE)}</loc></url></urlset>\n`);
const local = products.filter((p) => p.img.startsWith('img/')).length;
console.log(`${path.relative(root, dist)}/index.html — ${(html.length / 1024).toFixed(1)} КБ, соусов: ${products.length}, фото упаковок в комплекте: ${local}/${products.length}`);
