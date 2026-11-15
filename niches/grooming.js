/* Ниша: груминг-салон для собак и кошек. Все имена, цены, отзывы и реквизиты — демонстрационные. */
(function (g) {
  const Slot = (g.Slot = g.Slot || {});
  Slot.niches = Slot.niches || {};

  const img = (f) => '/assets/img/grooming/' + f + '.webp';

  Slot.niches.grooming = {
    id: 'grooming',
    label: 'Груминг',
    group: 'Груминг-салоны', // раздел в закрытой витрине демо
    staffRole: 'Грумер', // должность нового мастера в админке
    staffLead: 'Грумеры, которые любят питомцев не меньше вас.', // подпись блока «Мастера», если владелец добавил его сам
    product: 'Слот Груминг',
    schemaType: 'PetStore',
    timezone: 'Asia/Yekaterinburg',

    defaultStyle: 'myata',
    styles: [
      {
        id: 'myata',
        label: 'Мята',
        recommended: true,
        spec: 'Unbounded + Golos Text · круглые углы 16–26 px · пружинистая анимация, первый экран карточкой',
        scheme: 'light',
        motion: 'bold',
        texture: 'none',
        hero: 'card',
        fonts: 'https://fonts.googleapis.com/css2?family=Unbounded:wght@600&family=Golos+Text:wght@400;500;600;700&display=swap',
        // Свежая мята и белый: чисто, дружелюбно, «как в хорошей ветклинике, только веселее»
        tokens: {
          bg: '#F3F8F6',
          surface: '#FFFFFF',
          raised: '#E6F1EC',
          line: '#D3E5DD',
          fg: '#1C2925',
          muted: '#52645D',
          accent: '#23806A',
          onAccent: '#FFFFFF',
          accentText: '#1D6E5B',
          accentSoft: 'rgba(35,128,106,0.1)',
          stripeA: '#BFE3D6',
          stripeB: '#F3F8F6',
          stripeC: '#23806A',
          err: '#B42318',
          display: '"Unbounded", "Golos Text", system-ui, sans-serif',
          body: '"Golos Text", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          displayWeight: '600',
          displayScale: '0.82',
          displayTracking: '-0.02em',
          displayCase: 'none',
          radius: '16px',
          radiusLg: '26px',
          radiusBtn: '999px',
          photoCtaBg: '#FFFFFF',
          photoCtaFg: '#1C2925',
        },
        invert: {
          bg: '#1B6654',
          surface: '#1F705D',
          raised: '#247A66',
          line: 'rgba(255,255,255,0.22)',
          fg: '#FFFFFF',
          muted: '#E3F3EC',
          accent: '#FFFFFF',
          onAccent: '#1C2925',
          accentText: '#FFFFFF',
        },
      },
      {
        id: 'biskvit',
        label: 'Бисквит',
        spec: 'Rubik + Nunito · мягкие углы 12–20 px · плавная анимация, первый экран карточкой',
        scheme: 'light',
        motion: 'elegant',
        texture: 'none',
        hero: 'card',
        fonts: 'https://fonts.googleapis.com/css2?family=Rubik:wght@600;700&family=Nunito:wght@400;500;600;700&display=swap',
        // Песочный и терракота: тёплый домашний салон, «как у бабушки, только с феном-компрессором»
        tokens: {
          bg: '#FBF6EE',
          surface: '#FFFFFF',
          raised: '#F3E9DA',
          line: '#E8D9C3',
          fg: '#2E241C',
          muted: '#6B5B4D',
          accent: '#B5522B',
          onAccent: '#FFFFFF',
          accentText: '#9E4523',
          accentSoft: 'rgba(181,82,43,0.1)',
          stripeA: '#EBC9A6',
          stripeB: '#FBF6EE',
          stripeC: '#B5522B',
          err: '#B42318',
          display: '"Rubik", "Nunito", system-ui, sans-serif',
          body: '"Nunito", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          displayWeight: '700',
          displayScale: '0.95',
          displayTracking: '-0.015em',
          displayCase: 'none',
          radius: '12px',
          radiusLg: '20px',
          radiusBtn: '999px',
          photoCtaBg: '#FFFFFF',
          photoCtaFg: '#2E241C',
        },
        invert: {
          bg: '#F1DFC6',
          surface: '#F6E8D5',
          raised: '#FAF0E2',
          line: 'rgba(46,36,28,0.14)',
          fg: '#2E241C',
          muted: '#5C4B3D',
          accent: '#B5522B',
          onAccent: '#FFFFFF',
          accentText: '#93401F',
        },
      },
      {
        id: 'butik',
        label: 'Бутик',
        spec: 'Playfair Display + Manrope · углы 10–18 px · плавная анимация, тёмный, первый экран на всю ширину',
        scheme: 'dark',
        motion: 'elegant',
        texture: 'grain',
        fonts: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Manrope:wght@400;500;600;700&display=swap',
        // Графит и золотистый: премиальный салон для выставочных собак
        tokens: {
          bg: '#15171C',
          surface: '#1D2027',
          raised: '#252932',
          line: 'rgba(242,239,233,0.12)',
          fg: '#F2EFE9',
          muted: '#AEB2BB',
          accent: '#E9B44C',
          onAccent: '#15171C',
          accentText: '#F0C46A',
          accentSoft: 'rgba(233,180,76,0.12)',
          stripeA: '#E9B44C',
          stripeB: '#F2EFE9',
          err: '#FF9B8F',
          display: '"Playfair Display", Georgia, "Times New Roman", serif',
          body: '"Manrope", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          displayWeight: '700',
          displayScale: '1',
          displayTracking: '-0.01em',
          displayCase: 'none',
          radius: '10px',
          radiusLg: '18px',
          radiusBtn: '999px',
        },
        invert: {
          bg: '#E9B44C',
          surface: '#EDBF62',
          raised: '#F0C874',
          line: 'rgba(21,23,28,0.18)',
          fg: '#15171C',
          muted: '#2E2A22',
          accent: '#15171C',
          onAccent: '#F2EFE9',
          accentText: '#15171C',
        },
      },
    ],

    brand: { name: 'Чешир', kind: 'Груминг-салон' },

    promo: { icon: 'percent', text: '−15% на первый визит при записи онлайн', cta: 'Записаться', service: 'complex' },

    contacts: {
      city: 'Екатеринбург',
      address: 'ул. Малышева, 51',
      addressNote: 'Вход со двора, отдельная дверь с лапкой',
      metro: 'м. Площадь 1905 года, 7 минут пешком',
      phone: '+7 999 456-78-90',
      phoneHref: '+79994567890',
      hoursShort: 'Ежедневно с 9:00',
      // точка на улице Малышева; салон вымышленный, поэтому карта по координатам
      coords: [56.8364, 60.6143],
      yandexMaps: 'https://yandex.ru/maps/?pt=60.6143,56.8364&z=17&l=map',
      twoGis: 'https://2gis.ru/ekaterinburg/search/%D0%9C%D0%B0%D0%BB%D1%8B%D1%88%D0%B5%D0%B2%D0%B0%2051',
      messengers: [
        { label: 'Telegram', icon: 'send', url: 'https://t.me/' },
        { label: 'MAX', icon: 'message', url: 'https://max.ru/' },
        { label: 'ВКонтакте', icon: 'message', url: 'https://vk.com/' },
      ],
    },

    // Пн…Вс, null — выходной
    hours: [
      ['9:00', '21:00'],
      ['9:00', '21:00'],
      ['9:00', '21:00'],
      ['9:00', '21:00'],
      ['9:00', '21:00'],
      ['9:00', '20:00'],
      ['10:00', '20:00'],
    ],

    nav: [
      { id: 'services', label: 'Услуги' },
      { id: 'gallery', label: 'Работы' },
      { id: 'staff', label: 'Грумеры' },
      { id: 'reviews', label: 'Отзывы' },
      { id: 'contacts', label: 'Контакты' },
    ],

    hero: {
      title: 'Красиво, чисто и без стресса',
      lead: 'Груминг собак и кошек в центре Екатеринбурга. Без седации, на гипоаллергенной косметике, с фото-отчётом в мессенджер, пока вы пьёте кофе рядом.',
      cta: 'Записаться онлайн',
      secondary: 'Услуги и цены',
      image: img('hero'),
      imageAlt: 'Грумер бережно расчёсывает пушистого шпица',
      proof: [
        { source: 'Яндекс Карты', rating: '4,9', count: 386, url: 'https://yandex.ru/maps/' },
        { source: '2ГИС', rating: '5,0', count: 142, url: 'https://2gis.ru/' },
      ],
      badge: { big: '−15%', text: 'на первый визит при записи онлайн' },
      // Калькулятор: размер собаки (варианты записи) × услуга → цена, время и ближайшее окно
      widget: {
        type: 'estimate',
        variants: true,
        title: 'Сколько стоит груминг',
        serviceLabel: 'Услуга',
        defaultBrand: 1,
        services: ['complex', 'hygiene', 'deshed', 'bath', 'trim'],
        note: 'Точную цену грумер скажет после осмотра шерсти: колтуны и сильная линька добавляют время.',
        cta: 'Записаться на это время',
      },
    },

    services: [
      {
        category: 'Собаки',
        icon: 'paw',
        img: img('cat-dogs'),
        from: 'от 1 200 ₽',
        items: [
          {
            id: 'complex',
            name: 'Комплексный груминг',
            desc: 'Мытьё, сушка, стрижка по стандарту породы или модельная, когти, уши, гигиена',
            duration: 120,
            price: { value: 2600, from: true },
            options: [
              { id: 'mats', name: 'Разбор колтунов', price: 500, duration: 20 },
              { id: 'spa', name: 'SPA-маска для шерсти', price: 600, duration: 15 },
              { id: 'teeth', name: 'Чистка зубов ультразвуком', price: 1500, duration: 30 },
              { id: 'polish', name: 'Цветной лак для когтей', price: 300, duration: 10 },
            ],
          },
          { id: 'hygiene', name: 'Гигиенический груминг', desc: 'Подмывание, лапы и подушечки, интимная зона, когти и уши — между стрижками', duration: 60, price: { value: 1600 } },
          { id: 'deshed', name: 'Экспресс-линька', desc: 'Вычёсываем подшёрсток профессиональной техникой и компрессором, шерсти дома в разы меньше', duration: 90, price: { value: 2400, from: true } },
          { id: 'bath', name: 'Мытьё и сушка', desc: 'Шампунь по типу шерсти, кондиционер, сушка, расчёсывание', duration: 60, price: { value: 1500 } },
          { id: 'trim', name: 'Тримминг', desc: 'Для жесткошёрстных: шнауцеры, терьеры, таксы. Выщипываем отмершую шерсть вручную', duration: 150, price: { value: 3200, from: true } },
          { id: 'puppy', name: 'Щенячий груминг — знакомство', desc: 'Первый визит до 6 месяцев: мытьё, когти, знакомство с феном и столом', duration: 45, price: { value: 1200 }, flat: true },
        ],
      },
      {
        category: 'Кошки',
        icon: 'cat',
        img: img('cat-cats'),
        from: 'от 2 400 ₽',
        items: [
          { id: 'cat-complex', name: 'Комплекс для кошки', desc: 'Мытьё, сушка, вычёсывание, когти и уши. Работаем вдвоём, чтобы было быстрее и спокойнее', duration: 90, price: { value: 3200 }, flat: true },
          { id: 'cat-lion', name: 'Стрижка «под льва»', desc: 'Машинкой по телу, грива и кисточка на хвосте остаются. Спасает от колтунов летом', duration: 75, price: { value: 3000 }, flat: true },
          { id: 'cat-deshed', name: 'Экспресс-линька для кошки', desc: 'Вычёсываем подшёрсток — меньше шерсти на диване и комков в желудке', duration: 60, price: { value: 2400 }, flat: true },
        ],
      },
      {
        category: 'Уход и SPA',
        icon: 'sparkle',
        img: img('cat-spa'),
        from: 'от 400 ₽',
        items: [
          { id: 'nails', name: 'Стрижка когтей', desc: 'С подпиливанием, для собак и кошек', duration: 15, price: { value: 500 }, flat: true },
          { id: 'ears', name: 'Чистка ушей', desc: 'Лосьоном, без ватных палочек', duration: 15, price: { value: 400 }, flat: true },
          { id: 'teeth', name: 'Чистка зубов ультразвуком', desc: 'Без наркоза, для спокойных питомцев', duration: 30, price: { value: 1800 }, flat: true },
          { id: 'spa', name: 'SPA-уход', desc: 'Маска по типу шерсти и озонотерапия: блеск и мягкость', duration: 30, price: { value: 1500 } },
        ],
      },
    ],

    staff: [
      { id: 'ksenia', name: 'Ксения Морозова', dative: 'Ксении', role: 'Топ-грумер', years: 9, note: 'Выставочные и азиатские стрижки, шпицы и пудели', img: img('staff-1'), demoSlots: ['11:00', '14:30', '18:00'] },
      { id: 'polina', name: 'Полина Гусева', dative: 'Полине', role: 'Грумер', years: 5, note: 'Кошки, стрижка «под льва», пугливые питомцы', img: img('staff-2'), demoSlots: ['10:00', '13:00', '16:30'] },
      { id: 'artem', name: 'Артём Белов', dative: 'Артёму', role: 'Грумер', years: 4, note: 'Крупные породы, экспресс-линька и тримминг', img: img('staff-3'), demoSlots: ['12:00', '15:00', '19:00'] },
      { id: 'eva', name: 'Ева Романова', dative: 'Еве', role: 'Грумер', years: 2, note: 'Мини-породы и щенки — первое знакомство с салоном', img: img('staff-4'), demoSlots: ['9:30', '13:30', '17:00'] },
    ],

    // Сгенерированные портреты: у вымышленных мастеров и заглушкой для мастеров без фото (только в шаблоне)
    staffPortraits: [img('staff-1'), img('staff-2'), img('staff-3'), img('staff-4')],

    // Расписание записи: своя запись по графику (mode 'own') или внешняя система (mode 'external', url)
    schedule: { mode: 'own', off: [], blocks: [] },

    booking: {
      askStaff: true,
      step: 30,
      contactMethods: ['Звонок', 'Telegram', 'MAX'],
      // Размер собаки: множитель цены (k) и времени (kd). Услуги с flat: true (кошки, когти, уши) от размера не зависят
      variants: {
        label: 'Размер собаки',
        items: [
          { name: 'Мини, до 5 кг', k: 1, kd: 1 },
          { name: 'Малая, 5–10 кг', k: 1.25, kd: 1.15 },
          { name: 'Средняя, 10–25 кг', k: 1.6, kd: 1.4 },
          { name: 'Крупная, 25–45 кг', k: 2.1, kd: 1.75 },
          { name: 'Гигант, от 45 кг', k: 2.8, kd: 2.2 },
        ],
      },
      fields: [
        { id: 'pet', label: 'Кличка и порода', placeholder: 'Например: Бусинка, шпиц', required: true },
        { id: 'notes', label: 'Особенности (необязательно)', placeholder: 'Боится фена, первый раз в салоне', required: false },
      ],
    },

    sections: [
      { type: 'hero' },
      {
        type: 'perks',
        label: 'Почему у нас спокойно',
        items: [
          { icon: 'heart', title: 'Без седации', text: 'Никаких успокоительных — только терпение и перерывы' },
          { icon: 'droplet', title: 'Гипоаллергенная косметика', text: 'Подбираем шампунь по типу шерсти и кожи' },
          { icon: 'camera', title: 'Фото-отчёт', text: 'Пришлём фото «до» и «после» в мессенджер' },
          { icon: 'coffee', title: 'Можно остаться рядом', text: 'Кофе и диван в зоне ожидания за стеклом' },
        ],
      },
      { type: 'cats' },
      { type: 'services', title: 'Услуги и цены', lead: 'Цены для мини-собак до 5 кг. Выберите размер в калькуляторе или при записи — цена и время пересчитаются сами.' },
      {
        type: 'gallery',
        title: 'Наши работы',
        lead: 'Подопечные салона после груминга. Покажите фото стрижки, которая нравится, — повторим.',
        items: [
          { caption: 'Шпиц: стрижка «под мишку»', img: img('g-spitz'), tags: ['Мини'] },
          { caption: 'Пудель: модельная стрижка', img: img('g-poodle'), tags: ['Средние'] },
          { caption: 'Йорк после комплекса', img: img('g-yorkie'), tags: ['Мини'] },
          { caption: 'Зал салона', img: img('g-interior') },
          { caption: 'Шнауцер: тримминг', img: img('g-schnauzer'), tags: ['Средние'] },
          { caption: 'Хаски: экспресс-линька', img: img('g-husky'), tags: ['Крупные'] },
          { caption: 'Мейн-кун «под льва»', img: img('g-cat'), tags: ['Кошки'] },
          { caption: 'Бишон: выставочная стрижка', img: img('g-bichon'), tags: ['Мини'] },
          { caption: 'Ши-тцу «под мишку»', img: img('g-shihtzu'), tags: ['Мини'] },
          { caption: 'Корги после мытья и сушки', img: img('g-corgi'), tags: ['Средние'] },
          { caption: 'Золотистый ретривер: экспресс-линька', img: img('g-golden'), tags: ['Крупные'] },
          { caption: 'Мальтипу «под щенка»', img: img('g-maltipoo'), tags: ['Мини'] },
        ],
      },
      { type: 'staff', title: 'Грумеры', lead: 'Выберите своего грумера или запишитесь к первому свободному.' },
      {
        type: 'steps',
        title: 'Как проходит визит',
        items: [
          { title: 'Знакомство', text: 'Даём питомцу обнюхаться и успокоиться, осматриваем шерсть, кожу и уши.' },
          { title: 'Мытьё и сушка', text: 'Тёплая вода, шампунь по типу шерсти, тихий фен для пугливых.' },
          { title: 'Стрижка и уход', text: 'Стрижём по стандарту породы или как вы хотите. Когти, уши, лапы.' },
          { title: 'Фото-отчёт', text: 'Присылаем фото «до» и «после» и рассказываем, как ухаживать дома.' },
        ],
      },
      {
        type: 'offers',
        invert: true,
        title: 'Сейчас выгодно',
        items: [
          { icon: 'percent', title: '−15% на первый визит', text: 'При записи онлайн на любую услугу. Не суммируется с другими скидками.', cta: 'Записаться', service: 'complex' },
          { icon: 'paw', title: 'Щенячий груминг за 1 200 ₽', text: 'Первое знакомство с салоном для щенков до 6 месяцев: мытьё, когти и спокойная обстановка.', cta: 'Записать щенка', service: 'puppy' },
          { icon: 'gift', title: 'Подарочный сертификат', text: 'От 2 000 ₽ или на конкретную услугу. Электронный или в конверте.', cta: 'Заказать сертификат' },
        ],
      },
      {
        type: 'reviews',
        title: 'Отзывы',
        lead: 'Собираем отзывы на Яндекс Картах и в 2ГИС, ничего не удаляем.',
        items: [
          { name: 'Анна К.', source: 'Яндекс Карты', date: '9 ноября', rating: 5, text: 'Наш шпиц боится фена, а здесь его высушили спокойно, с перерывами. Ксения прислала фото в процессе — стрижка «под мишку» идеальная.' },
          { name: 'Дмитрий Л.', source: '2ГИС', date: '2 ноября', rating: 5, text: 'Привёз хаски на экспресс-линьку. Забрал через три часа — дома шерсти почти нет уже вторую неделю.' },
          { name: 'Ольга С.', source: 'Яндекс Карты', date: '27 октября', rating: 5, text: 'Наконец-то салон, где берут кошек без успокоительных. Полина постригла мейн-куна «под льва» вдвоём с помощницей, кот даже не обиделся.' },
          { name: 'Марина П.', source: 'Яндекс Карты', date: '15 октября', rating: 4, text: 'Пуделя подстригли отлично. Задержались на 20 минут из-за колтунов, но честно предупредили и показали, где они были.' },
        ],
      },
      {
        type: 'faq',
        title: 'Частые вопросы',
        items: [
          { q: 'Нужны ли прививки?', a: 'Да, комплексная прививка и от бешенства, действующие на день визита. Возьмите ветпаспорт или фото страницы с прививками.' },
          { q: 'Даёте ли вы успокоительные?', a: 'Нет. Пугливым питомцам даём больше времени и перерывы, стрижём вдвоём. Если питомец очень агрессивен, предложим перенести визит.' },
          { q: 'Можно присутствовать?', a: 'Да, зона ожидания отделена стеклом. Многим питомцам спокойнее, когда хозяин не на виду, — решим вместе на месте.' },
          { q: 'Сколько длится груминг?', a: 'От 15 минут на когти до 4–5 часов на комплекс для гиганта. Время записи сайт считает сам по размеру собаки и услугам.' },
          { q: 'Как перенести или отменить запись?', a: 'Напишите в мессенджер или позвоните не позднее чем за 3 часа до визита.' },
        ],
      },
      { type: 'contacts', title: 'Как нас найти' },
    ],

    legal: { operator: 'ИП Морозова Ксения Андреевна', inn: '000000000000', address: 'г. Екатеринбург, ул. Малышева, д. 51', email: 'hello@cheshire-demo.ru', year: '2026' },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
