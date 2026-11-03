# Конфиг ниши `niches/<id>.js`

Файл регистрирует `Slot.niches[<id>] = { … }`. Сборка находит его сама (все `niches/*.js`), закрытая витрина и автопроверка — тоже. Лучший образец — `niches/nails.js` (самый полный), механика мест и калькулятора — `niches/auto.js`, окна мастеров и уровни — `niches/barber.js` и `clients/tor.json`.

## Содержание
1. Паспорт ниши
2. Стили
3. Компания, контакты, часы
4. Первый экран и виджеты
5. Услуги
6. Мастера
7. Запись и расписание
8. Разделы страницы
9. Документы
10. Иконки

## 1. Паспорт ниши

```js
id: 'grooming',                       // латиницей, это и адрес демо: demo.top-in.ru/grooming/
label: 'Груминг',                     // как ниша называется в единственном числе
group: 'Груминг-салоны',              // раздел закрытой витрины (множественное число)
product: 'Слот Груминг',
schemaType: 'PetStore',               // тип schema.org: BarberShop, NailSalon, AutoRepair, BeautySalon, DaySpa, HealthAndBeautyBusiness…
timezone: 'Europe/Moscow',
staffRole: 'Грумер',                  // должность нового мастера в админке
staffLead: 'Мастера, которые любят собак не меньше вас.', // подпись блока «Мастера», если владелец включит его сам
defaultStyle: 'pudra',                // id стиля по умолчанию
```

От ниши к сайтам клиентов переходят только `label`, `product`, `schemaType`, `timezone`, `booking` и стили (`Slot.compose`, список `TEMPLATE_KEYS` в `render.js`). Весь контент у клиента — свой, поэтому демо-тексты ниши можно писать свободно.

## 2. Стили (`styles: [ … ]`, обычно 3)

```js
{
  id: 'pudra', label: 'Пудра', recommended: true,
  spec: 'Prata + Manrope · мягкие углы 14–24 px · плавная анимация',   // подпись в переключателе стилей
  scheme: 'light',                    // light | dark — для color-scheme и затемнения первого экрана
  motion: 'elegant',                  // elegant (плавно) | mechanical (чётко) | bold (пружинисто)
  texture: 'none',                    // none | grain (плёночное зерно) | grid (сетка на первом экране)
  hero: 'card',                       // 'card' — первый экран карточкой с отступом; без поля — на всю ширину
  fonts: 'https://fonts.googleapis.com/css2?family=Prata&family=Manrope:wght@400;500;600;700&display=swap',
  tokens: {
    bg, surface, raised, line,        // фон, карточки, приподнятое, линии
    fg, muted,                        // текст и второстепенный текст (контраст к bg ≥ 4,5)
    accent, onAccent, accentText,     // кнопка, текст на кнопке, акцентный текст на фоне
    accentSoft,                       // полупрозрачный акцент для плашек
    stripeA, stripeB, stripeC,        // полоса над виджетом первого экрана
    err,
    display, body,                    // семейства с запасными: '"Prata", Georgia, serif'
    displayWeight, displayScale, displayTracking, displayCase,   // '400', '0.92', '0', 'none' | 'uppercase'
    radius, radiusLg, radiusBtn,      // '14px', '24px', '999px'
    photoCtaBg, photoCtaFg,           // кнопка на фото первого экрана (необязательно)
  },
  invert: { bg, surface, raised, line, fg, muted, accent, onAccent, accentText },  // полоса акций (offers / steps с invert: true)
}
```

Цвета — только `#RRGGBB`, кроме `line` и `accentSoft`: из них считаются затемнение и контраст. Шрифты — из `assets/fonts` (список и разделы в `Slot.FONTS`, `render.js`); у шрифта должны быть нужные начертания (`wght@…`), иначе `scripts/fonts.mjs` не скачает. Проверка контраста:

```bash
node -e "global.window=global;require('./assets/js/render.js');require('./niches/<id>.js');const {contrast}=Slot.color;for(const s of Slot.niches['<id>'].styles){const t=s.tokens;console.log(s.id,contrast(t.fg,t.bg).toFixed(1),contrast(t.muted,t.bg).toFixed(1),contrast(t.onAccent,t.accent).toFixed(1),contrast(t.accentText,t.bg).toFixed(1))}"
```

Всё должно быть не меньше 4,5. То же проверь для `invert` (`muted` на `invert.bg` часто проседает).

## 3. Компания, контакты, часы

```js
brand: { name: 'Миндаль', kind: 'Студия маникюра' },      // в шапке, заголовке страницы и schema
promo: { icon: 'percent', text: '−20% на первое посещение при записи онлайн', cta: 'Записаться', service: 'mani-gel' },
contacts: {
  city, address, addressNote, metro, phone, phoneHref,     // phoneHref: '+79997654321'
  hoursShort: 'Ежедневно с 10:00',
  coords: [59.9439, 30.3575],                              // у вымышленной компании карта — по точке
  yandexMaps, twoGis,                                      // ссылки «Открыть в Яндекс Картах / 2ГИС»
  messengers: [{ label: 'Telegram', icon: 'send', url: 'https://t.me/' }, { label: 'MAX', icon: 'message', url: 'https://max.ru/' }],
},
hours: [['10:00', '21:00'], …, null],                      // Пн…Вс, null — выходной
nav: [{ id: 'services', label: 'Услуги' }, …],             // id — секции на странице
```

## 4. Первый экран (`hero`) и виджеты

```js
hero: {
  title, lead, cta, secondary,
  image: img('hero'), imageAlt,
  proof: [{ source: 'Яндекс Карты', rating: '4,9', count: 528, url }],
  badge: { big: '−20%', text: 'на первый визит' },          // необязательно
  widget: { … },                                             // необязательно
},
```

Виджеты:

- **Окна мастеров**: `{ type: 'slots', title: 'Свободные окна', more: 'Все услуги и время' }`. Ближайшие свободные окна по мастерам, при `askStaff: false` — одна строка «Ближайшее время».
- **Калькулятор**: `{ type: 'estimate', title, brands: [{ name: 'Kia', k: 1 }, { name: 'BMW', k: 1.6 }], defaultBrand: 0, services: ['to1', 'oil'], note, cta }`. Цена работы × коэффициент выбранного варианта. «Марки» могут быть чем угодно: размер собаки, класс авто, площадь. В калькулятор попадают только услуги с ценой; если считать нечего, показывается ближайшее время.
- **Конструктор**: `{ type: 'combo', title: 'Соберите услугу', services: ['mani-gel', 'pedi-gel'], labels: { 'mani-gel': 'Маникюр с покрытием' } }`. Основа и дополнения дают цену, длительность и ближайшее окно; «Записаться» открывает запись сразу на контактах.

Если запись идёт через внешнюю систему (`schedule.mode: 'external'`), окна не показываются: внешняя система их не отдаёт.

## 5. Услуги

```js
const img = (f) => '/assets/img/<id>/' + f + '.webp';
services: [
  {
    category: 'Маникюр', icon: 'nail',
    img: img('cat-mani'), from: 'от 1 400 ₽',            // для плиток категорий (секция cats)
    items: [
      { id: 'mani-gel', name: 'Маникюр с покрытием гель-лаком', desc, duration: 120, price: { value: 2600, from: false },
        options: [{ id: 'remove', name: 'Снятие', price: 300, duration: 15 }] },   // дополнения: галочки в записи
    ],
  },
],
```

`id` услуг уникальны во всём файле: на них ссылаются виджеты, `promo.service` и `offers[].service`. `duration` — в минутах; окна записи считаются по полной длительности вместе с дополнениями. Цена `null` показывается как «по запросу».

## 6. Мастера

```js
staff: [{ id: 'alina', name: 'Алина Соколова', dative: 'Алине', role: 'Топ-мастер', years: 8, note: 'Выравнивание и френч',
          img: img('staff-1'), demoSlots: ['12:00', '15:30', '18:00'], days: [['10:00','19:00'], …, null] }],
staffPortraits: [img('staff-1'), img('staff-2'), img('staff-3'), img('staff-4')],
```

- `dative` нужен для кнопки «Записаться к Алине».
- `days` — личный график; без него мастер работает по часам салона.
- `staffPortraits` — заглушки для мастеров без фото, только в шаблоне ниши. Админка помечает их «замените до запуска».

## 7. Запись и расписание

```js
booking: {
  askStaff: true,                     // клиент выбирает мастера; false — время занимает место (см. capacity)
  step: 30,                           // шаг сетки времени, мин
  contactMethods: ['Звонок', 'Telegram', 'MAX'],
  fields: [{ id: 'car', label: 'Марка и модель', placeholder: 'Kia Rio 2019', required: true }],   // доп. вопросы
},
schedule: { mode: 'own', capacity: 3, off: [], blocks: [] },   // own — своё расписание; capacity — мест одновременно при askStaff: false
// или: schedule: { mode: 'external', url: 'https://n123.yclients.com/' } — все «Записаться» ведут туда
```

Как считается занятость:
- **Своё расписание.** Окна строятся по графику мастеров (или часам работы), выходным `off`, закрытому вручную `blocks` и **подтверждённым** заявкам; неподтверждённая заявка время не занимает. Владелец подтверждает заявки в админке во вкладке «Заявки».
- **Отпуск мастера** (`off` с его id) при `askStaff: false` уменьшает число мест в этот день.

## 8. Разделы страницы (`sections`)

Порядок в массиве — порядок на странице. Строка `'hero'` или объект `{ type, title, lead, invert, items }`.

| type | Что это | items |
|---|---|---|
| `hero` | первый экран | — |
| `perks` | удобства и гарантии полосой | `{ icon, title, text }` |
| `cats` | плитки категорий с фото | берёт `services[].img` (нужно ≥ 2) |
| `services` | прайс вкладками по категориям | берёт `services` |
| `levels` | таблица цен по уровням мастеров | `levels: [{ id, name }]`, `rows: [{ service, values: [] }]` |
| `staff` | мастера с кнопками записи | берёт `staff` |
| `gallery` | плитка фото, просмотр, фильтр по `tags` | `{ caption, img, tags: [] }` |
| `strip` | бегущая лента фото из галереи | — |
| `offers` | акции (часто `invert: true`) | `{ icon, title, text, cta, service }` |
| `steps` | этапы работы | `{ title, text }` |
| `reviews` | отзывы | `{ name, source, date, rating, text }` |
| `faq` | вопросы | `{ q, a }` |
| `contacts` | контакты, часы, карта | берёт `contacts`, `hours` |

Шапка, плашка акции, нижняя панель на телефоне, окно записи, подвал и плашка cookie добавляются сами. Секции `perks`, `offers`, `steps`, `faq` без элементов не выводятся.

## 9. Документы

```js
legal: { operator: 'ИП Соколова Алина Игоревна', inn: '000000000000', address, email, year: '2026' },
```

Из этих данных строятся политика конфиденциальности и согласие на обработку данных по 152-ФЗ (`Slot.legalTemplates`). У вымышленной компании ИНН — нули.

## 10. Иконки

Иконки уже есть в `ICONS` в `render.js`:

phone send message pin clock star check right left down x menu calendar shield camera wrench doc coffee gamepad parking card gift scissors razor mustache clipper comb towel sparkle percent qr wifi award child smartphone car droplet disc gauge snowflake battery key box nail foot brush flower heart tire

Новую иконку добавляй туда же: контур 24×24, `stroke`, без заливки — как у соседних.
