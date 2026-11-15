/* Ниша: массажный салон (релакс, спорт, SPA — без медицинских услуг). Все имена, цены, отзывы и реквизиты — демонстрационные. */
(function (g) {
  const Slot = (g.Slot = g.Slot || {});
  Slot.niches = Slot.niches || {};

  const img = (f) => '/assets/img/massage/' + f + '.webp';

  Slot.niches.massage = {
    id: 'massage',
    label: 'Массаж',
    group: 'Массажные салоны', // раздел в закрытой витрине демо
    staffRole: 'Массажист', // должность нового мастера в админке
    staffLead: 'Мастера с медицинским образованием и сертификатами.', // подпись блока «Мастера», если владелец добавил его сам
    product: 'Слот Массаж',
    schemaType: 'DaySpa',
    timezone: 'Europe/Moscow',

    defaultStyle: 'pesok',
    styles: [
      {
        id: 'pesok',
        label: 'Песок',
        recommended: true,
        spec: 'Cormorant + Manrope · мягкие углы 14–24 px · плавная анимация, первый экран карточкой',
        scheme: 'light',
        motion: 'elegant',
        texture: 'none',
        hero: 'card',
        fonts: 'https://fonts.googleapis.com/css2?family=Cormorant:wght@600;700&family=Manrope:wght@400;500;600;700&display=swap',
        // Тёплый песок и оливка: тишина, натуральные ткани, дерево
        tokens: {
          bg: '#F7F2EA',
          surface: '#FFFDF9',
          raised: '#EFE6D8',
          line: '#E3D7C4',
          fg: '#2A2620',
          muted: '#665C4F',
          accent: '#566440',
          onAccent: '#FFFFFF',
          accentText: '#4B5737',
          accentSoft: 'rgba(86,100,64,0.1)',
          stripeA: '#D9CBB2',
          stripeB: '#F7F2EA',
          stripeC: '#566440',
          err: '#B42318',
          display: '"Cormorant", "Cormorant Garamond", Georgia, "Times New Roman", serif',
          body: '"Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          displayWeight: '600',
          displayScale: '1.12',
          displayTracking: '-0.01em',
          displayCase: 'none',
          radius: '14px',
          radiusLg: '24px',
          radiusBtn: '999px',
          photoCtaBg: '#FFFDF9',
          photoCtaFg: '#2A2620',
        },
        invert: {
          bg: '#4B5737',
          surface: '#55623F',
          raised: '#5E6C47',
          line: 'rgba(255,255,255,0.2)',
          fg: '#FFFFFF',
          muted: '#EDEADD',
          accent: '#FFFFFF',
          onAccent: '#2A2620',
          accentText: '#FFFFFF',
        },
      },
      {
        id: 'evkalipt',
        label: 'Эвкалипт',
        spec: 'Tenor Sans + Mulish · углы 10–18 px · плавная анимация, первый экран карточкой',
        scheme: 'light',
        motion: 'elegant',
        texture: 'none',
        hero: 'card',
        fonts: 'https://fonts.googleapis.com/css2?family=Tenor+Sans&family=Mulish:wght@400;500;600;700&display=swap',
        // Прохладный серо-зелёный и бирюза: чистота, свежесть, как в хорошем спа
        tokens: {
          bg: '#F1F5F4',
          surface: '#FFFFFF',
          raised: '#E3ECEA',
          line: '#D2DFDC',
          fg: '#1F2A2A',
          muted: '#506261',
          accent: '#2C6B66',
          onAccent: '#FFFFFF',
          accentText: '#265E5A',
          accentSoft: 'rgba(44,107,102,0.1)',
          stripeA: '#BFD8D4',
          stripeB: '#F1F5F4',
          stripeC: '#2C6B66',
          err: '#B42318',
          display: '"Tenor Sans", "Mulish", system-ui, sans-serif',
          body: '"Mulish", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          displayWeight: '400',
          displayScale: '0.9',
          displayTracking: '0',
          displayCase: 'none',
          radius: '10px',
          radiusLg: '18px',
          radiusBtn: '999px',
          photoCtaBg: '#FFFFFF',
          photoCtaFg: '#1F2A2A',
        },
        invert: {
          bg: '#265E5A',
          surface: '#2B6762',
          raised: '#31706B',
          line: 'rgba(255,255,255,0.2)',
          fg: '#FFFFFF',
          muted: '#E2EFEC',
          accent: '#FFFFFF',
          onAccent: '#1F2A2A',
          accentText: '#FFFFFF',
        },
      },
      {
        id: 'tik',
        label: 'Тик',
        spec: 'Prata + Golos Text · углы 8–16 px · плавная анимация, тёмный, первый экран на всю ширину',
        scheme: 'dark',
        motion: 'elegant',
        texture: 'grain',
        fonts: 'https://fonts.googleapis.com/css2?family=Prata&family=Golos+Text:wght@400;500;600;700&display=swap',
        // Тёмное дерево и медь: вечерний салон, приглушённый свет, свечи
        tokens: {
          bg: '#1C1814',
          surface: '#25201B',
          raised: '#2E2822',
          line: 'rgba(240,230,216,0.12)',
          fg: '#F0E6D8',
          muted: '#B5A895',
          accent: '#D49A5C',
          onAccent: '#1C1814',
          accentText: '#E0AD74',
          accentSoft: 'rgba(212,154,92,0.12)',
          stripeA: '#D49A5C',
          stripeB: '#F0E6D8',
          err: '#FF9B8F',
          display: '"Prata", Georgia, "Times New Roman", serif',
          body: '"Golos Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          displayWeight: '400',
          displayScale: '0.95',
          displayTracking: '-0.01em',
          displayCase: 'none',
          radius: '8px',
          radiusLg: '16px',
          radiusBtn: '999px',
        },
        invert: {
          bg: '#D49A5C',
          surface: '#D9A469',
          raised: '#DEAE78',
          line: 'rgba(28,24,20,0.18)',
          fg: '#1C1814',
          muted: '#2E2620',
          accent: '#1C1814',
          onAccent: '#F0E6D8',
          accentText: '#1C1814',
        },
      },
    ],

    brand: { name: 'Штиль', kind: 'Массажный салон' },

    promo: { icon: 'percent', text: '−20% на первый сеанс при записи онлайн', cta: 'Записаться', service: 'classic' },

    contacts: {
      city: 'Нижний Новгород',
      address: 'ул. Большая Покровская, 18',
      addressNote: 'Вход со двора, 2 этаж, домофон 18',
      metro: 'м. Горьковская, 8 минут пешком',
      phone: '+7 999 321-54-76',
      phoneHref: '+79993215476',
      hoursShort: 'Ежедневно с 10:00',
      // точка на Большой Покровской; салон вымышленный, поэтому карта по координатам
      coords: [56.3203, 44.0018],
      yandexMaps: 'https://yandex.ru/maps/?pt=44.0018,56.3203&z=17&l=map',
      twoGis: 'https://2gis.ru/n_novgorod/search/%D0%91%D0%BE%D0%BB%D1%8C%D1%88%D0%B0%D1%8F%20%D0%9F%D0%BE%D0%BA%D1%80%D0%BE%D0%B2%D1%81%D0%BA%D0%B0%D1%8F%2018',
      messengers: [
        { label: 'Telegram', icon: 'send', url: 'https://t.me/' },
        { label: 'MAX', icon: 'message', url: 'https://max.ru/' },
        { label: 'ВКонтакте', icon: 'message', url: 'https://vk.com/' },
      ],
    },

    // Пн…Вс, null — выходной
    hours: [
      ['10:00', '22:00'],
      ['10:00', '22:00'],
      ['10:00', '22:00'],
      ['10:00', '22:00'],
      ['10:00', '22:00'],
      ['10:00', '22:00'],
      ['10:00', '21:00'],
    ],

    nav: [
      { id: 'services', label: 'Массаж и цены' },
      { id: 'staff', label: 'Мастера' },
      { id: 'gallery', label: 'Салон' },
      { id: 'reviews', label: 'Отзывы' },
      { id: 'contacts', label: 'Контакты' },
    ],

    hero: {
      title: 'Час, когда можно ничего не делать',
      lead: 'Массаж в центре Нижнего Новгорода: отдельные кабинеты с душем, тёплые столы, мастера с медицинским образованием. Чай после сеанса — за наш счёт.',
      cta: 'Записаться онлайн',
      secondary: 'Массаж и цены',
      image: img('hero'),
      imageAlt: 'Мастер делает массаж спины в тихом кабинете с тёплым светом',
      proof: [
        { source: 'Яндекс Карты', rating: '4,9', count: 512, url: 'https://yandex.ru/maps/' },
        { source: '2ГИС', rating: '4,9', count: 207, url: 'https://2gis.ru/' },
      ],
      badge: { big: '−20%', text: 'на первый сеанс при записи онлайн' },
      // Калькулятор: длительность (варианты записи) × вид массажа → цена, время и ближайшее окно
      widget: {
        type: 'estimate',
        variants: true,
        title: 'Подберите сеанс',
        serviceLabel: 'Массаж',
        defaultBrand: 1,
        services: ['classic', 'relax', 'sport', 'lymph', 'thai', 'anticell'],
        note: 'Время — на столе у мастера. Приходите за 10 минут: переодеться и выпить воды.',
        cta: 'Записаться на это время',
      },
    },

    services: [
      {
        category: 'Массаж тела',
        icon: 'heart',
        img: img('cat-body'),
        from: 'от 2 000 ₽',
        items: [
          {
            id: 'classic',
            name: 'Классический массаж',
            desc: 'Всё тело: спина, шея, руки, ноги. Давление — как вам комфортно',
            duration: 60,
            price: { value: 3000 },
            options: [
              { id: 'aroma', name: 'Ароматерапия', price: 300, duration: 0 },
              { id: 'stones', name: 'Горячие камни на спину', price: 700, duration: 15 },
              { id: 'scrub', name: 'Скраб для тела', price: 900, duration: 20 },
            ],
          },
          { id: 'relax', name: 'Расслабляющий массаж', desc: 'Медленные мягкие движения, тёплое масло, тихая музыка. Чтобы выспаться ночью', duration: 60, price: { value: 3200 } },
          { id: 'sport', name: 'Спортивный массаж', desc: 'Глубокая проработка мышц после тренировок и забегов, растяжка', duration: 60, price: { value: 3500 } },
          { id: 'lymph', name: 'Лимфодренажный массаж', desc: 'Лёгкие ритмичные движения по ходу лимфы: меньше отёков и тяжести в ногах', duration: 60, price: { value: 3400 } },
          { id: 'anticell', name: 'Антицеллюлитный массаж', desc: 'Интенсивная работа с бёдрами, ягодицами и животом. Курс — от 10 сеансов', duration: 60, price: { value: 3000 } },
          { id: 'thai', name: 'Тайский массаж', desc: 'На мате, в свободной одежде: растяжки и давление ладонями и стопами', duration: 60, price: { value: 3800 } },
          { id: 'back', name: 'Массаж спины и шеи', desc: 'Если затекли плечи после работы за компьютером', duration: 40, price: { value: 2000 }, flat: true },
        ],
      },
      {
        category: 'Лицо и голова',
        icon: 'flower',
        img: img('cat-face'),
        from: 'от 1 600 ₽',
        items: [
          { id: 'face', name: 'Скульптурный массаж лица', desc: 'Глубокая проработка мышц лица: чёткий овал и свежий цвет', duration: 45, price: { value: 3000 }, flat: true },
          { id: 'head', name: 'Массаж головы и шеи', desc: 'Снимает напряжение и головную боль от усталости', duration: 30, price: { value: 1600 }, flat: true },
        ],
      },
      {
        category: 'SPA-программы',
        icon: 'sparkle',
        img: img('cat-spa'),
        from: 'от 3 500 ₽',
        items: [
          { id: 'stone', name: 'Стоун-терапия', desc: 'Массаж горячими базальтовыми камнями: глубокое тепло и расслабление', duration: 90, price: { value: 5200 }, flat: true },
          { id: 'wrap', name: 'Обёртывание с водорослями', desc: 'Скраб, обёртывание и лёгкий массаж — кожа мягкая и подтянутая', duration: 60, price: { value: 3500 }, flat: true },
          { id: 'ritual', name: 'SPA-ритуал «Полный штиль»', desc: 'Скраб, обёртывание, массаж всего тела и чай. Два часа только для себя', duration: 120, price: { value: 6900 }, flat: true },
        ],
      },
    ],

    staff: [
      { id: 'marina', name: 'Марина Белова', dative: 'Марине', role: 'Ведущий мастер', years: 12, note: 'Классический и лимфодренажный массаж, медицинское образование', img: img('staff-1'), demoSlots: ['11:00', '15:00', '19:00'] },
      { id: 'sergey', name: 'Сергей Лаптев', dative: 'Сергею', role: 'Массажист', years: 8, note: 'Спортивный и тайский массаж, сильное давление', img: img('staff-2'), demoSlots: ['12:00', '16:30', '20:00'] },
      { id: 'amina', name: 'Амина Кузина', dative: 'Амине', role: 'Массажист', years: 5, note: 'Расслабляющий массаж, стоун-терапия и SPA-ритуалы', img: img('staff-3'), demoSlots: ['10:00', '14:00', '18:30'] },
      { id: 'dinara', name: 'Динара Сафина', dative: 'Динаре', role: 'Массажист', years: 4, note: 'Массаж лица и антицеллюлитные курсы', img: img('staff-4'), demoSlots: ['13:00', '17:00', '20:30'] },
    ],

    // Сгенерированные портреты: у вымышленных мастеров и заглушкой для мастеров без фото (только в шаблоне)
    staffPortraits: [img('staff-1'), img('staff-2'), img('staff-3'), img('staff-4')],

    // Расписание записи: своя запись по графику (mode 'own') или внешняя система (mode 'external', url)
    schedule: { mode: 'own', off: [], blocks: [] },

    booking: {
      askStaff: true,
      step: 30,
      contactMethods: ['Звонок', 'Telegram', 'MAX'],
      // Длительность сеанса: множитель цены (k) и времени (kd) от цены за 60 минут.
      // Услуги с flat: true (лицо, стоун, ритуалы) идут фиксированное время
      variants: {
        label: 'Длительность',
        items: [
          { name: '30 минут', k: 0.6, kd: 0.5 },
          { name: '60 минут', k: 1, kd: 1 },
          { name: '90 минут', k: 1.4, kd: 1.5 },
          { name: '120 минут', k: 1.75, kd: 2 },
        ],
      },
      fields: [{ id: 'notes', label: 'Пожелания и противопоказания (необязательно)', placeholder: 'Сильное давление, болит поясница, беременность', required: false }],
    },

    sections: [
      { type: 'hero' },
      {
        type: 'perks',
        label: 'Почему у нас спокойно',
        items: [
          { icon: 'droplet', title: 'Душ в каждом кабинете', text: 'Отдельные кабинеты, никто не заходит во время сеанса' },
          { icon: 'towel', title: 'Одноразовое бельё', text: 'Халат, тапочки и полотенца — свежие для каждого гостя' },
          { icon: 'award', title: 'Медицинское образование', text: 'У каждого мастера — диплом и сертификаты' },
          { icon: 'coffee', title: 'Чай после сеанса', text: 'Травяной чай и тишина в зоне отдыха' },
        ],
      },
      { type: 'cats' },
      { type: 'services', title: 'Массаж и цены', lead: 'Цены за 60 минут. Выберите длительность при записи — цена и время пересчитаются сами.' },
      { type: 'staff', title: 'Мастера', lead: 'Выберите мастера — или запишитесь к первому свободному. Можно попросить мастера-мужчину или женщину.' },
      {
        type: 'gallery',
        title: 'Салон',
        lead: 'Четыре кабинета, зона отдыха и чайная. Тёплый свет, тишина, никаких телефонов.',
        items: [
          { caption: 'После сеанса', img: img('g-hands') },
          { caption: 'Горячие камни', img: img('g-stones') },
          { caption: 'Масла собственного смешения', img: img('g-oils') },
          { caption: 'Тёплый стол в кабинете', img: img('g-room') },
          { caption: 'Травяной чай после массажа', img: img('g-tea') },
          { caption: 'Ароматы для SPA-ритуалов', img: img('g-aroma') },
        ],
      },
      {
        type: 'steps',
        title: 'Как проходит сеанс',
        items: [
          { title: 'Знакомство', text: 'Мастер спросит о самочувствии и пожеланиях, подберёт масло и давление.' },
          { title: 'Душ и переодевание', text: 'Халат, тапочки и одноразовое бельё ждут в кабинете.' },
          { title: 'Массаж', text: 'Тёплый стол, приглушённый свет. Можно молчать или разговаривать — как удобно.' },
          { title: 'Чай и отдых', text: 'Не спешите вставать: травяной чай и десять минут тишины.' },
        ],
      },
      {
        type: 'offers',
        invert: true,
        title: 'Сейчас выгодно',
        items: [
          { icon: 'percent', title: '−20% на первый сеанс', text: 'При записи онлайн на любой массаж. Не суммируется с другими скидками.', cta: 'Записаться', service: 'classic' },
          { icon: 'calendar', title: 'Абонемент на 10 сеансов', text: 'Скидка 15% на курс любого массажа. Действует полгода, можно делить с близкими.', cta: 'Записаться на первый', service: 'anticell' },
          { icon: 'gift', title: 'Подарочный сертификат', text: 'На сумму от 3 000 ₽ или на SPA-ритуал. В красивом конверте или электронный.', cta: 'Заказать сертификат' },
        ],
      },
      {
        type: 'reviews',
        title: 'Отзывы',
        lead: 'Собираем отзывы на Яндекс Картах и в 2ГИС, ничего не удаляем.',
        items: [
          { name: 'Екатерина Р.', source: 'Яндекс Карты', date: '11 ноября', rating: 5, text: 'Хожу к Марине на лимфодренаж уже третий месяц. Ноги к вечеру больше не гудят, а сам салон — как остров тишины посреди Покровки.' },
          { name: 'Андрей М.', source: '2ГИС', date: '4 ноября', rating: 5, text: 'Сергей после полумарафона буквально собрал меня заново. Давит сильно, но всегда спрашивает. Записался на курс.' },
          { name: 'Ольга Т.', source: 'Яндекс Карты', date: '28 октября', rating: 5, text: 'Подарила маме сертификат на «Полный штиль». Мама в восторге: говорит, два часа пролетели как десять минут.' },
          { name: 'Ирина Л.', source: 'Яндекс Карты', date: '19 октября', rating: 4, text: 'Массаж лица у Динары отличный, эффект видно сразу. Единственное — в выходные трудно найти свободное время, записывайтесь заранее.' },
        ],
      },
      {
        type: 'faq',
        title: 'Частые вопросы',
        items: [
          { q: 'Есть ли противопоказания?', a: 'Да: температура, острые воспаления, кожные заболевания в зоне массажа, тромбоз, онкология. При беременности и хронических болезнях — только после разрешения врача. Напишите об этом при записи, мастер подберёт программу.' },
          { q: 'Это лечебный массаж?', a: 'Нет, мы не оказываем медицинских услуг: наш массаж — для расслабления, восстановления после нагрузок и ухода за телом. Если вас беспокоит боль, сначала покажитесь врачу.' },
          { q: 'Что взять с собой?', a: 'Ничего: халат, тапочки, одноразовое бельё, полотенца и всё для душа есть в кабинете. Для тайского массажа выдадим свободную одежду.' },
          { q: 'Сколько длится сеанс и когда приходить?', a: 'Сколько вы выбрали при записи: 30, 60, 90 или 120 минут — это время на столе. Приходите за 10 минут, чтобы спокойно переодеться.' },
          { q: 'Как перенести или отменить запись?', a: 'Напишите в мессенджер или позвоните не позднее чем за 3 часа до сеанса.' },
        ],
      },
      { type: 'contacts', title: 'Как нас найти' },
    ],

    legal: { operator: 'ИП Белова Марина Сергеевна', inn: '000000000000', address: 'г. Нижний Новгород, ул. Большая Покровская, д. 18', email: 'hello@shtil-demo.ru', year: '2026' },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
