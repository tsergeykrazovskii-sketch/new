/* Ниша: автосервис. Все имена, цены, отзывы и реквизиты — демонстрационные. */
(function (g) {
  const Slot = (g.Slot = g.Slot || {});
  Slot.niches = Slot.niches || {};

  Slot.niches.auto = {
    id: 'auto',
    label: 'Автосервис',
    schemaType: 'AutoRepair',
    timezone: 'Asia/Yekaterinburg',

    theme: {
      scheme: 'light',
      fonts: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;600;700&family=Onest:wght@400;500;600;700&display=swap',
      // Светлый «цех»: холодный бетон, графит и сигнальный жёлтый как у разметки на подъёмниках
      tokens: {
        bg: '#E9ECEF',
        surface: '#FFFFFF',
        raised: '#F3F5F7',
        line: '#D2D8DE',
        fg: '#14171B',
        muted: '#545C66',
        accent: '#FFC21A',
        onAccent: '#14171B',
        accentText: '#6E4F00',
        accentSoft: 'rgba(255,194,26,0.2)',
        stripeA: '#FFC21A',
        stripeB: '#14171B',
        display: '"Unbounded", "Arial Black", system-ui, sans-serif',
        body: '"Onest", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        displayWeight: '600',
        displayScale: '0.74',
        displayTracking: '-0.02em',
        radius: '6px',
        radiusLg: '10px',
        err: '#B42318',
      },
      // Полоса «Как проходит ремонт» — графитовая
      invert: {
        bg: '#14171B',
        surface: '#1E2228',
        raised: '#262B32',
        line: 'rgba(255,255,255,0.12)',
        fg: '#F1F3F5',
        muted: '#A3ABB5',
        accent: '#FFC21A',
        onAccent: '#14171B',
        accentText: '#FFC21A',
      },
    },

    brand: { name: 'Поршень', kind: 'Техцентр' },

    contacts: {
      city: 'Екатеринбург',
      address: 'ул. Промышленная, 18',
      addressNote: 'Въезд с торца здания, 6 постов',
      metro: '',
      phone: '+7 999 765-43-21',
      phoneHref: '+79997654321',
      hoursShort: 'Пн–Сб с 9:00',
      yandexMaps: 'https://yandex.ru/maps/',
      twoGis: 'https://2gis.ru/',
      messengers: [
        { label: 'Telegram', icon: 'send', url: 'https://t.me/' },
        { label: 'MAX', icon: 'message', url: 'https://max.ru/' },
        { label: 'ВКонтакте', icon: 'message', url: 'https://vk.com/' },
      ],
    },

    hours: [
      ['09:00', '21:00'],
      ['09:00', '21:00'],
      ['09:00', '21:00'],
      ['09:00', '21:00'],
      ['09:00', '21:00'],
      ['09:00', '21:00'],
      ['10:00', '18:00'],
    ],

    nav: [
      { id: 'services', label: 'Цены' },
      { id: 'steps', label: 'Как работаем' },
      { id: 'offers', label: 'Акции' },
      { id: 'reviews', label: 'Отзывы' },
      { id: 'contacts', label: 'Контакты' },
    ],

    hero: {
      title: 'Ремонт без сюрпризов в итоговом счёте',
      lead: 'Сначала диагностика и смета, ремонт — только после вашего согласия. Гарантия 12 месяцев на работы и запчасти. Обслуживаем иномарки, китайские и отечественные автомобили.',
      cta: 'Записаться на ремонт',
      secondary: 'Цены на работы',
      proof: [
        { source: 'Яндекс Карты', rating: '4,8', count: 1204, url: 'https://yandex.ru/maps/' },
        { source: '2ГИС', rating: '4,9', count: 531, url: 'https://2gis.ru/' },
      ],
      widget: {
        type: 'estimate',
        title: 'Сколько будет стоить',
        defaultBrand: 0,
        brands: [
          { name: 'Kia', k: 1 },
          { name: 'Hyundai', k: 1 },
          { name: 'Lada', k: 0.8 },
          { name: 'Haval', k: 1.05 },
          { name: 'Chery', k: 1.05 },
          { name: 'Geely', k: 1.05 },
          { name: 'Toyota', k: 1.1 },
          { name: 'Skoda', k: 1 },
          { name: 'VW', k: 1.05 },
          { name: 'BMW', k: 1.6 },
        ],
        services: ['to1', 'oil', 'pads', 'tires', 'diag', 'ac'],
        note: 'Стоимость работ без запчастей. Точную смету пришлём после приёмки.',
        cta: 'Записаться на это время',
      },
    },

    services: [
      {
        category: 'ТО и масло',
        items: [
          { id: 'to1', name: 'ТО по регламенту', desc: 'Масло, фильтры, проверка по 30 пунктам, отметка в сервисной книжке', duration: 90, price: { value: 3900, from: true } },
          { id: 'oil', name: 'Замена масла в двигателе', desc: 'Масло и фильтр ваши или с нашего склада', duration: 30, price: { value: 1200, from: true } },
          { id: 'atf', name: 'Замена масла в АКПП или вариаторе', desc: 'Частичная или аппаратная замена', duration: 60, price: { value: 2900, from: true } },
        ],
      },
      {
        category: 'Ходовая и тормоза',
        items: [
          { id: 'susp', name: 'Диагностика ходовой', desc: 'Бесплатно, если ремонт делаете у нас', duration: 30, price: { value: 990 } },
          { id: 'pads', name: 'Замена тормозных колодок', desc: 'Одна ось, с проверкой дисков и суппортов', duration: 45, price: { value: 1500, from: true } },
          { id: 'shocks', name: 'Замена амортизаторов', desc: 'Пара на одной оси, с развалом-схождением', duration: 120, price: { value: 4800, from: true } },
        ],
      },
      {
        category: 'Диагностика',
        items: [
          { id: 'diag', name: 'Компьютерная диагностика', desc: 'Чтение ошибок всех блоков, отчёт в мессенджер', duration: 40, price: { value: 1500 } },
          { id: 'check', name: 'Проверка перед покупкой', desc: 'Кузов, ЛКП, двигатель, ходовая, история по VIN', duration: 90, price: { value: 4500 } },
        ],
      },
      {
        category: 'Шины',
        items: [
          { id: 'tires', name: 'Сезонная переобувка', desc: 'Комплект R13–R16, снятие, монтаж, балансировка', duration: 40, price: { value: 2400, from: true } },
          { id: 'storage', name: 'Хранение шин', desc: 'Мойка, упаковка, хранение до следующего сезона', duration: 0, price: { value: 3500, from: true } },
        ],
      },
      {
        category: 'Кондиционер',
        items: [{ id: 'ac', name: 'Заправка кондиционера', desc: 'Проверка на утечки, заправка фреоном, дезинфекция', duration: 40, price: { value: 2500, from: true } }],
      },
    ],

    staff: [],

    booking: {
      askStaff: false,
      step: 60,
      contactMethods: ['Звонок', 'Telegram', 'MAX'],
      fields: [
        { id: 'car', label: 'Марка и модель', placeholder: 'Например, Kia Rio 2019', required: true },
        { id: 'plate', label: 'Госномер', placeholder: 'А123ВС 196', required: false },
      ],
    },

    sections: [
      { type: 'hero' },
      {
        type: 'perks',
        label: 'Гарантии',
        items: [
          { icon: 'shield', title: 'Гарантия 12 месяцев', text: 'На работы и запчасти с нашего склада' },
          { icon: 'camera', title: 'Фотоотчёт в мессенджер', text: 'Показываем неисправность до ремонта' },
          { icon: 'wrench', title: 'Старые детали — вам', text: 'Возвращаем всё, что заменили' },
          { icon: 'doc', title: 'Работаем с юрлицами', text: 'Договор, безнал, закрывающие документы' },
        ],
      },
      { type: 'services', title: 'Работы и цены', lead: 'Цены на работы без запчастей. Итог зависит от марки и состояния авто — смету согласуем до начала ремонта.' },
      {
        type: 'steps',
        invert: true,
        title: 'Как проходит ремонт',
        items: [
          { title: 'Приёмка', text: 'Принимаем машину в назначенное время, при вас фиксируем пробег и состояние.' },
          { title: 'Диагностика и смета', text: 'Присылаем в Telegram или MAX список работ с ценами и фото неисправностей.' },
          { title: 'Ремонт после согласия', text: 'Начинаем только после вашего «да». Цена из сметы не меняется.' },
          { title: 'Выдача и гарантия', text: 'Отдаём старые детали, заказ-наряд и гарантийный талон на 12 месяцев.' },
        ],
      },
      {
        type: 'offers',
        title: 'Сейчас выгодно',
        items: [
          { icon: 'tire', title: 'Переобувка без очереди', text: 'Сезон начался. Запишитесь на точное время — снимем и поставим колёса за 40 минут.', cta: 'Выбрать время', service: 'tires' },
          { icon: 'wrench', title: 'Диагностика ходовой за 0 ₽', text: 'Бесплатно, если ремонт делаете у нас. Без ремонта — 990 ₽.', cta: 'Записаться', service: 'susp' },
          { icon: 'shield', title: 'Хранение шин до весны', text: 'Помоем, упакуем и сохраним. Заберёте при следующей переобувке.', cta: 'Узнать условия' },
        ],
      },
      {
        type: 'reviews',
        title: 'Отзывы',
        lead: 'Отзывы с Яндекс Карт и 2ГИС. Отвечаем на каждый, в том числе на критику.',
        items: [
          { name: 'Евгений Л.', source: 'Яндекс Карты', date: '9 октября', rating: 5, text: 'Приехал на ТО, прислали в Telegram фото подтекающего сальника и цену. Согласовал — сделали за день, итог совпал со сметой.' },
          { name: 'Наталья С.', source: '2ГИС', date: '6 октября', rating: 5, text: 'Переобулась за полчаса по записи, без очереди. Колёса отбалансировали, руль больше не бьёт.' },
          { name: 'Ринат Г.', source: 'Яндекс Карты', date: '28 сентября', rating: 5, text: 'Haval F7, проверка перед покупкой. Нашли подкрашенное крыло и ошибку по АКПП, сэкономил на торге 60 тысяч.' },
          { name: 'Павел М.', source: 'Яндекс Карты', date: '15 сентября', rating: 4, text: 'Сделали качественно, но запчасть ждали два дня. Честно предупредили заранее и дали подменный срок.' },
        ],
      },
      {
        type: 'gallery',
        title: 'Сервис изнутри',
        lead: 'Шесть постов, своя шиномонтажная зона и комната ожидания с Wi-Fi.',
        items: [
          { caption: 'Зона приёмки' },
          { caption: 'Подъёмники' },
          { caption: 'Диагностика' },
          { caption: 'Шиномонтаж' },
          { caption: 'Склад шин' },
          { caption: 'Комната ожидания' },
        ],
      },
      {
        type: 'faq',
        title: 'Частые вопросы',
        items: [
          { q: 'Сохранится ли гарантия дилера?', a: 'Да, если ТО сделано по регламенту производителя. Ставим отметку в сервисной книжке и выдаём заказ-наряд с перечнем работ и запчастей.' },
          { q: 'Можно приехать со своими запчастями?', a: 'Можно. В этом случае гарантия 12 месяцев действует на работу, а на детали — гарантия продавца.' },
          { q: 'Сколько ждать?', a: 'ТО и шиномонтаж — от 30 до 90 минут, можно подождать в комнате отдыха. Срок ремонта согласуем при приёмке.' },
          { q: 'Работаете с юрлицами?', a: 'Да, по договору: безналичная оплата, закрывающие документы, обслуживание автопарков.' },
          { q: 'Как можно оплатить?', a: 'Картой, наличными, через СБП по QR-коду или по счёту для юрлиц.' },
        ],
      },
      { type: 'contacts', title: 'Как добраться' },
    ],

    legal: { entity: 'ООО «Поршень» · ИНН 0000000000', year: '2026' },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
