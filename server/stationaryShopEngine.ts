/**
 * Server-Side Stationary Shop Engine (Стационарные городские лавки и магазины)
 * Generates rich, highly specialized urban shops with large assortments (10-18 items),
 * shopkeeper details, town location, shop atmosphere, security wards, vault gold, and bargaining policies.
 */

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface StationaryShopOptions {
  shopType?: string; // 'random' | 'blacksmith' | 'alchemist' | 'magic_scrolls' | 'jeweler_antiques' | 'general_outfitter' | 'scribe_cartographer' | 'herbalist' | 'curiosities_blackmarket'
  wealthTier?: string; // 'modest' | 'wealthy' | 'luxurious'
  district?: string; // 'random' | 'poor_slums' | 'market_center' | 'noble_district'
  inventorySize?: string; // 'random' | 'compact' (6-8) | 'standard' (10-12) | 'massive' (15-20)
  qualityTier?: string; // 'random' | 'budget' | 'standard' | 'masterwork'
  ownerTemper?: string; // 'random' | 'strict' | 'flexible' | 'generous'
}

export interface StationaryShopItem {
  name: string;
  price: string;
  category: string;
  stock: number;
  desc: string;
  quality?: string;
}

export interface StationaryShopRawData {
  shopName: string;
  shopType: string;
  shopTypeTitle: string;
  location: string;
  ownerName: string;
  ownerRace: string;
  ownerPersonality: string;
  atmosphere: string;
  securityMeasures: string;
  bargainPolicy: string;
  specialServices: string;
  vaultCash: string;
  inventory: StationaryShopItem[];
}

const SHOPS_DATA: Record<string, {
  typeTitle: string;
  names: string[];
  locations: string[];
  races: string[];
  owners: string[];
  personalities: string[];
  atmospheres: string[];
  securities: string[];
  bargainPolicies: string[];
  specialServices: string[];
  inventoryPool: StationaryShopItem[];
}> = {
  blacksmith: {
    typeTitle: 'Оружейная лавка и кузница тяжелых доспехов',
    names: ['Кузница «Стальной Молот»', 'Арсенал «Пламя Гор»', 'Оружейная «Чешуя Дракона»', 'Лавка кузнеца «Гром и Наковальня»'],
    locations: [
      'Ремесленная улица у городских ворот (шум молотов с утра до ночи)',
      'Рыночная площадь, напротив гильдии оружейников',
      'Квартал кузнецов у речного причала'
    ],
    races: ['Дварф', 'Полуорк', 'Человек', 'Драконорожденный'],
    owners: ['Мастер Брон Железная Рука', 'Кузнец Торвальд Горный', 'Мадам Божена Стальная', 'Гаррет Оружейник'],
    personalities: [
      'Суровый ветеран войн, проверяет качество каждого меча лично перед продажей',
      'Гордый дварф-мастер, ненавидит дешевку и хвалит только настоящую сталь',
      'Добродушный гигант с опаленными усами, готовый с увлечением рассказывать о закалке клинков'
    ],
    atmospheres: ['Жаркое дымное помещение с запахом раскаленного угля, масленой ветоши и постоянным звоном наковальни'],
    securities: [
      'Двое крепких подмастерьев-молотобойцев в качестве охраны, тяжелые стальные дубовые ставни',
      'Зачарованные решетки на окнах и сторожевой мастиф у входа в оружейную'
    ],
    bargainPolicies: ['Торгуется неохотно (-5% максимум за покупку полного комплекта брони). Уважает воинов.'],
    specialServices: ['Индивидуальная подгонка доспеха (1 день, 10 gp), заточка и полировка (+1 к первому удару, 5 gp)'],
    inventoryPool: [
      { name: 'Длинный меч из закаленной рессорной стали', price: '15 gp', category: 'Оружие', stock: 4, desc: 'Отличный баланс, дола с гравировкой гильдии', quality: 'Отличное' },
      { name: 'Кольчуга из вороненого железа (Ring Mail)', price: '75 gp', desc: 'Усиленные кольца, промасленный поддоспешник', category: 'Доспех', stock: 2, quality: 'Надежное' },
      { name: 'Кираса с нагрудным рельефом льва (Breastplate)', price: '400 gp', desc: 'Кованая рессорная сталь, задерживает стрелы', category: 'Доспех', stock: 1, quality: 'Мастерское' },
      { name: 'Тяжелый стальной щит с кожаной обивкой', price: '10 gp', category: 'Защита', stock: 3, desc: 'Выдерживает прямые удары топоров и копий', quality: 'Добротное' },
      { name: 'Боевой молот с чеканом для пробития доспехов', price: '15 gp', category: 'Оружие', stock: 3, desc: 'Тяжелая набалдашная головка с граненым шипом', quality: 'Отличное' },
      { name: 'Арбалет тяжелый с вороновым стальным дугом', price: '50 gp', category: 'Оружие', stock: 2, desc: 'Усиленный натяжной ворот в комплекте', quality: 'Отличное' },
      { name: 'Набор из 20 стальных болтов в кожаном колчане', price: '2 gp', category: 'Боеприпасы', stock: 8, desc: 'Граненые бронебойные наконечники', quality: 'Стандарт' },
      { name: 'Двуручный меч «Рыцарский Крест»', price: '50 gp', category: 'Оружие', stock: 1, desc: 'Клинок длиною в 5 футов с резной гардой', quality: 'Высшее' },
      { name: 'Латы полные (Plate Armor) с воронением', price: '1500 gp', category: 'Доспех', stock: 1, desc: 'Полный комплект стальной защиты с забралом', quality: 'Мастерское' },
      { name: 'Полулаты (Half Plate) с латунной чеканкой', price: '750 gp', category: 'Доспех', stock: 1, desc: 'Анатомическая подогнанная форма', quality: 'Высшее' },
      { name: 'Точильный комплект кузнеца (бруски, масло)', price: '5 gp', category: 'Инструмент', stock: 5, desc: 'Для ухода за оружием в походе', quality: 'Стандарт' },
      { name: 'Кинжал охотничий с пилообразным обухом', price: '4 gp', category: 'Оружие', stock: 6, desc: 'Прочная обуховая сталь', quality: 'Добротное' }
    ]
  },
  alchemist: {
    typeTitle: 'Алхимическая лаборатория, аптека и лавка зелий',
    names: ['Лаборатория «Золотой Илембик»', 'Аптека «Склянка и Пест»', 'Лавка алхимика «Изумрудный Дым»', 'Алхимический салон «Эликсир Жизни»'],
    locations: [
      'Тихий переулок в квартале ученых и магов',
      'Торговая улица у аптекарского рынка',
      'Верхний город, неподалеку от академии наук'
    ],
    races: ['Гном', 'Полуэльф', 'Человек', 'Тифлинг'],
    owners: ['Магистр Игнатиус Вейн', 'Алхимик Серафима Глин', 'Доктор Орацио Кроу', 'Мадам Элоиза фон Берг'],
    personalities: [
      'Эксцентричный ученый в защитных очках, увлеченно расскажет о дистилляции эфира',
      'Строгая аптекарша, тщательно проверяющая каждый рецепт перед продажей',
      'Скрытный педант, прячущий редкие эликсиры под сейфовым замком'
    ],
    atmospheres: ['Прохладное помещение с сотнями стеклянных колб, кипящими ретортами и пряным ароматом сушеных трав и серы'],
    securities: [
      'Сигнализационные руны на полках с ядами, стеклянные витрины под заклинанием «Замок»',
      'Алхимическая ловушка с ядовитым газом, активируемая педалью под стойкой'
    ],
    bargainPolicies: ['Скидка 10% при обмене на редкие ингредиенты с монстров (железы, клыки, пыльцу).'],
    specialServices: ['Изготовление редкого зелья по рецепту заказчика (2–3 дня), идентификация неизвестных ядов (15 gp)'],
    inventoryPool: [
      { name: 'Зелье лечения (Potion of Healing)', price: '50 gp', category: 'Зелье', stock: 6, desc: 'Восстанавливает 2d4+2 хитов', quality: 'Стандарт' },
      { name: 'Зелье отличного лечения (Greater Healing)', price: '150 gp', category: 'Зелье', stock: 3, desc: 'Восстанавливает 4d4+4 хитов', quality: 'Высшее' },
      { name: 'Алхимический огонь (Alchemist\'s Fire)', price: '50 gp', category: 'Алхимия', stock: 4, desc: 'Стеклянный флакон, поджигает цель на 1d4 урона в ход', quality: 'Стандарт' },
      { name: 'Кислота в герметичном флаконе (Acid vial)', price: '25 gp', category: 'Алхимия', stock: 5, desc: 'Растворяет металл и замок, 2d6 урона кислотой', quality: 'Стандарт' },
      { name: 'Громовой камень (Thunderstone)', price: '35 gp', category: 'Алхимия', stock: 3, desc: 'Оглушает всех в радиусе 10 фт при ударе', quality: 'Отличное' },
      { name: 'Противоядие универсальное (Antitoxin)', price: '50 gp', category: 'Медицина', stock: 4, desc: 'Преимущество на спасброски от яда на 1 час', quality: 'Высшее' },
      { name: 'Мазь против ожогов и кислотных ран', price: '15 gp', category: 'Снадобье', stock: 5, desc: 'Быстро заживляет химические поражения', quality: 'Добротное' },
      { name: 'Флакон дымовой завесы (Smokestick)', price: '20 gp', category: 'Алхимия', stock: 4, desc: 'Мгновенно создает непроницаемый густой дым', quality: 'Стандарт' },
      { name: 'Эликсир ночного зрения (Darkvision Elixir)', price: '100 gp', category: 'Зелье', stock: 2, desc: 'Дает темное зрение 60 фт на 8 часов', quality: 'Высшее' },
      { name: 'Набор алхимика для лаборатории (Alchemist Supplies)', price: '50 gp', category: 'Инструмент', stock: 2, desc: 'Реторты, тигли, ступка и ректификатор', quality: 'Мастерское' },
      { name: 'Флакон растительного яда «Тень Вереска»', price: '75 gp', category: 'Яд', stock: 2, desc: 'Парализует гладкую мускулатуру (DC 13 CON)', quality: 'Опасное' }
    ]
  },
  magic_scrolls: {
    typeTitle: 'Магическая лавка, скрипторий и гримуары',
    names: ['Хранилище магии «Око Азуры»', 'Лавка свитков «Серебряный Гримуар»', 'Магический салон «Астральный Кристалл»', 'Скрипторий «Пыль Эфира»'],
    locations: [
      'Башня рядом с Академией Магии',
      'Элитный аристократический квартал столицы',
      'Тайная подвальная галерея у гильдии чародеев'
    ],
    races: ['Эльф', 'Полуэльф', 'Человек', 'Гном'],
    owners: ['Архивариус Валериан Тень', 'Чародейка Элеонора Вайт', 'Маг Магнус Светлый', 'Мадам Селена Росс'],
    personalities: [
      'Аристократичный эльф с величественными манерами, гордящийся древностью фолиантов',
      'Мудрая чародейка, проверяющая способности покупателей перед продажей свитков',
      'Задумчивый заклинатель, постоянно читающий толстый фолиант с плавающими свечами'
    ],
    atmospheres: ['Парящие свечи под потолком, тихое гудение магических кристаллов, запах пергамента, сургуча и озона'],
    securities: [
      'Невидимый магический страж (Shield Guardian) в углу, заклинание «Сфера Непроницаемости»',
      'Защитные чары от кражи: предметы исчезают из рук вора и возвращаются на витрину'
    ],
    bargainPolicies: ['Цена фиксированная по тарифам Гильдии Магов. Небольшая скидка академикам.'],
    specialServices: ['Перепись заклинаний в книгу мага (50 gp / уровень), снятие проклятий (100 gp)'],
    inventoryPool: [
      { name: 'Свиток заклинания «Огненный шар» (Fireball Scroll)', price: '200 gp', category: 'Свиток', stock: 2, desc: '3-й круг магии, 8d6 урона огнем', quality: 'Редкое' },
      { name: 'Свиток заклинания «Shield» (Щит)', price: '50 gp', category: 'Свиток', stock: 5, desc: '1-й круг магии, +5 к КД реакцией', quality: 'Стандарт' },
      { name: 'Свиток заклинания «Misty Step» (Туманный шаг)', price: '100 gp', category: 'Свиток', stock: 3, desc: '2-й круг магии, телепортация на 30 фт', quality: 'Отличное' },
      { name: 'Книга заклинаний начинающего мага (Пустая)', price: '25 gp', category: 'Фолиант', stock: 4, desc: '100 страниц пергамента с защитной обложкой', quality: 'Добротное' },
      { name: 'Фокус заклинателя: Посох из хрустального древа', price: '30 gp', category: 'Фокус', stock: 3, desc: 'Проводит магию без расхода мелких компонентов', quality: 'Высшее' },
      { name: 'Жемчужина магии (Pearl, 100 gp value)', price: '100 gp', category: 'Реагент', stock: 3, desc: 'Нужна для использования заклинания «Опознание»', quality: 'Редкое' },
      { name: 'Чернила мага с пыльцой мифрила (50 мл)', price: '40 gp', category: 'Реагент', stock: 4, desc: 'Для переписывания заклинаний в гримуар', quality: 'Высшее' },
      { name: 'Свиток заклинания «Распознавание магии» (Detect Magic)', price: '50 gp', category: 'Свиток', stock: 4, desc: '1-й круг магии, подсвечивает ауры', quality: 'Стандарт' },
      { name: 'Свиток заклинания «Невидимость» (Invisibility)', price: '100 gp', category: 'Свиток', stock: 2, desc: '2-й круг магии, на 1 час', quality: 'Отличное' },
      { name: 'Хрустальный гадальный шар (Crystal Ball)', price: '250 gp', category: 'Инструмент', stock: 1, desc: 'Качественная кварцевая сфера для скраинга', quality: 'Высшее' }
    ]
  },
  general_outfitter: {
    typeTitle: 'Общая торговая лавка и склад походного снаряжения',
    names: ['Торговая лавка «Северный Рог»', 'Купеческий лабаз «Сухой Путник»', 'Лавка товаров «Перекресток Дорог»', 'Универмаг «Три Монаты»'],
    locations: [
      'Центральный городской рынок',
      'Торговая пристань портового района',
      'Главная проезжая улица купеческого посада'
    ],
    races: ['Человек', 'Полурослик', 'Дварф', 'Полуэльф'],
    owners: ['Торговец Бернард Крабб', 'Мадам Марта Гудман', 'Уилл Походный', 'Капитан Джонатан Смит'],
    personalities: [
      'Заботливый хозяин, подберет вам идеальные сапоги и палату для любого похода',
      'Практичный купец, знающий цену каждой веревке и пайку',
      'Шумный зазывала, постоянно устраивающий распродажи походной посуды'
    ],
    atmospheres: ['Просторный склад с высокой крышей, пахнет сушеной солониной, рогожей, дегтем и свежевыделанной кожей'],
    securities: ['Дубовые ворота со стальным засовом, дежурный ночной сторож с собакой'],
    bargainPolicies: ['Скидка 5% при покупке полного снаряжения на весь отряд (от 4 человек).'],
    specialServices: ['Доставка грузов до постоялого двора, аренда вьючных мулов (1 gp / день)'],
    inventoryPool: [
      { name: 'Рюкзак путешественника с кожаными ремнями', price: '2 gp', category: 'Снаряжение', stock: 10, desc: 'Вмещает до 30 фунтов походного лута', quality: 'Стандарт' },
      { name: 'Палатка двухместная из непромокаемого брезента', price: '2 gp', category: 'Снаряжение', stock: 5, desc: 'Надежная защита от дождя и ветра', quality: 'Добротное' },
      { name: 'Спальный мешок с подкладкой из овечьей шерсти', price: '1 gp', category: 'Снаряжение', stock: 8, desc: 'Теплый, сворачивается в компактный рулон', quality: 'Добротное' },
      { name: 'Веревка пеньковая (50 футов) с железным крюком', price: '2 gp', category: 'Снаряжение', stock: 12, desc: 'Выдерживает вес до 400 фунтов', quality: 'Стандарт' },
      { name: 'Сухой паек путешественника на 10 дней', price: '5 gp', category: 'Припасы', stock: 15, desc: 'Сухари, солонина, сушеные фрукты, сыр', quality: 'Стандарт' },
      { name: 'Фонарь закрытый с регулировкой шторок (Bullseye)', price: '10 gp', category: 'Освещение', stock: 4, desc: 'Дает сфокусированный луч света на 60 фт', quality: 'Отличное' },
      { name: 'Флакон с масло для фонарей (5 шт)', price: '1 gp', category: 'Припасы', stock: 20, desc: 'Каждая склянка горит 6 часов', quality: 'Стандарт' },
      { name: 'Будюрдюк для воды из бычьей кожи (1 галлон)', price: '2 sp', category: 'Снаряжение', stock: 10, desc: 'Герметичная пробка', quality: 'Стандарт' },
      { name: 'Набор походной посуды (котелок, тренога, ложки)', price: '2 gp', category: 'Инструмент', stock: 6, desc: 'Удобно складывается друг в друга', quality: 'Добротное' },
      { name: 'Лопата дорожная складная со стальным лезвием', price: '2 gp', category: 'Инструмент', stock: 6, desc: 'Для обустройства лагеря и раскопок', quality: 'Добротное' },
      { name: 'Кремень и кресало с трутом в коробочке', price: '5 sp', category: 'Снаряжение', stock: 15, desc: 'Зажигает огонь за считанные секунды', quality: 'Стандарт' },
      { name: 'Ломик стальной (Crowbar)', price: '2 gp', category: 'Инструмент', stock: 5, desc: 'Дает преимущество на проверки Силы при взломе', quality: 'Надежное' }
    ]
  }
};

export function generateStationaryShop(options: StationaryShopOptions = {}): { text: string; raw: StationaryShopRawData } {
  const shopKeys = Object.keys(SHOPS_DATA);
  let key = options.shopType && SHOPS_DATA[options.shopType] ? options.shopType : randomChoice(shopKeys);
  if (key === 'random') key = randomChoice(shopKeys);

  const shop = SHOPS_DATA[key];
  const shopName = randomChoice(shop.names);
  
  // Custom District
  const DISTRICT_MAP: Record<string, string> = {
    poor_slums: 'Трущобы и портовые причалы (темный подвальный заулок)',
    market_center: 'Центральная городская торговая площадь',
    noble_district: 'Элитный аристократический квартал Верхнего Города'
  };
  const location = options.district && options.district !== 'random' && DISTRICT_MAP[options.district]
    ? DISTRICT_MAP[options.district]
    : randomChoice(shop.locations);

  const ownerName = randomChoice(shop.owners);
  const ownerRace = randomChoice(shop.races);
  const ownerPersonality = randomChoice(shop.personalities);
  const atmosphere = randomChoice(shop.atmospheres);
  const securityMeasures = randomChoice(shop.securities);

  // Custom Bargain policy / temper
  const TEMPER_MAP: Record<string, string> = {
    strict: 'Строгий хозяин: цены строго фиксированы по ценникам, торг категорически уместен только от 100 gp.',
    flexible: 'Гибкий торговец: охотно уступает до 15-20% при покупке от 3 предметов.',
    generous: 'Щедрый лавочник: дарит скидки за интересные слухи или похвалу товара.'
  };
  const bargainPolicy = options.ownerTemper && options.ownerTemper !== 'random' && TEMPER_MAP[options.ownerTemper]
    ? TEMPER_MAP[options.ownerTemper]
    : randomChoice(shop.bargainPolicies);

  const specialServices = randomChoice(shop.specialServices);

  // Vault Cash based on wealthTier
  let vaultMinGp = 180;
  let vaultMaxGp = 750;
  if (options.wealthTier === 'modest') { vaultMinGp = 50; vaultMaxGp = 200; }
  else if (options.wealthTier === 'luxurious') { vaultMinGp = 1000; vaultMaxGp = 4000; }

  const vaultGp = randomInt(vaultMinGp, vaultMaxGp);
  const vaultSp = randomInt(40, 200);
  const vaultCash = `${vaultGp} gp, ${vaultSp} sp (в кованом сейфе за стойкой)`;

  // Rich Assortment size
  let itemCount = randomInt(10, 14);
  if (options.inventorySize === 'compact') itemCount = randomInt(6, 8);
  else if (options.inventorySize === 'standard') itemCount = randomInt(10, 12);
  else if (options.inventorySize === 'massive') itemCount = randomInt(15, 20);

  const shuffledPool = [...shop.inventoryPool].sort(() => Math.random() - 0.5);
  let inventory = shuffledPool.slice(0, Math.min(itemCount, shuffledPool.length));

  // Override quality if qualityTier is specified
  if (options.qualityTier && options.qualityTier !== 'random') {
    const qMap: Record<string, string> = {
      budget: 'Бюджетное (б/у)',
      standard: 'Стандартное',
      masterwork: 'Мастерская работа'
    };
    if (qMap[options.qualityTier]) {
      inventory = inventory.map(item => ({ ...item, quality: qMap[options.qualityTier!] }));
    }
  }

  const raw: StationaryShopRawData = {
    shopName,
    shopType: key,
    shopTypeTitle: shop.typeTitle,
    location,
    ownerName,
    ownerRace,
    ownerPersonality,
    atmosphere,
    securityMeasures,
    bargainPolicy,
    specialServices,
    vaultCash,
    inventory
  };

  const text = `
╔══════════════════════════════════════════════════════════════════════╗
  ГОРОДСКАЯ ЛАВКА: "${shopName.toUpperCase()}"
  Специализация: ${shop.typeTitle}
  Расположение: ${location}
╠══════════════════════════════════════════════════════════════════════╣
  ВЛАДЕЛЕЦ / ПРОДАВЕЦ:
  ✦ ${ownerName} (${ownerRace})
  ✦ Характер: ${ownerPersonality}

  АТМОСФЕРА И ИНТЕРЬЕР:
  ✦ ${atmosphere}

  ОХРАНА И МЕРЫ БЕЗОПАСНОСТИ:
  ✦ ${securityMeasures}

  УСЛОВИЯ ТОРГА И УСЛУГИ:
  ✦ Торг: ${bargainPolicy}
  ✦ Услуги: ${specialServices}

  КАССА ЛАВКИ (СЕЙФ):
  ✦ ${vaultCash}
╠──────────────────────────────────────────────────────────────────────╢
  БОГАТЫЙ ВИТРИННЫЙ АССОРТИМЕНТ (${inventory.length} НАИМЕНОВАНИЙ):
${inventory.map((it, idx) => `  ${idx + 1}. ${it.name} — [${it.price}] (В наличии: ${it.stock} шт.)\n     Категория: ${it.category} | Качество: ${it.quality || 'Стандарт'}\n     Описание: ${it.desc}`).join('\n\n')}
╚══════════════════════════════════════════════════════════════════════╝
`.trim();

  return { text, raw };
}
