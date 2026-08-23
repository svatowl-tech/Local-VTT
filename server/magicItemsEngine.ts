/**
 * Server-Side Procedural Magic Items Engine (Генератор магических предметов по Школам Магии D&D 5e)
 * Generates various magical items (Rings, Wands, Staves, Weapons, Armor, Potions, Scrolls, Wondrous Items, Amulets)
 * categorized by ALL 8 Schools of Magic + Universal Artifacts.
 */

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface MagicItemOptions {
  school?: string;   // 'random' | 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation' | 'universal'
  itemType?: string; // 'random' | 'ring' | 'wand' | 'staff' | 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'amulet'
  rarity?: string;   // 'random' | 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary'
  attunementFilter?: string; // 'random' | 'requires' | 'no_attunement'
  chargesStyle?: string;     // 'random' | 'charges' | 'recharge' | 'permanent'
  hasQuirk?: string;         // 'random' | 'clean' | 'quirk' | 'curse'
}

export interface MagicItemEntry {
  name: string;
  school: 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation' | 'universal';
  schoolNameRu: string;
  type: string;
  typeNameRu: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary';
  rarityRu: string;
  attunement: boolean;
  attunementDesc?: string;
  charges?: string;
  activeAbility: string;
  passiveEffect: string;
  commandWord?: string;
  description: string;
  lore: string;
  valueGp: number;
  quirkOrCurse?: string;
}

export interface MagicItemRawData {
  requestedSchool: string;
  requestedType: string;
  requestedRarity: string;
  item: MagicItemEntry;
}

const SCHOOL_NAMES_RU: Record<string, string> = {
  abjuration: 'Заграждение (Abjuration)',
  conjuration: 'Вызов (Conjuration)',
  divination: 'Прорицание (Divination)',
  enchantment: 'Очарование (Enchantment)',
  evocation: 'Воплощение (Evocation)',
  illusion: 'Иллюзия (Illusion)',
  necromancy: 'Некромантия (Necromancy)',
  transmutation: 'Превращение (Transmutation)',
  universal: 'Универсальная магия (Universal)'
};

const RARITY_NAMES_RU: Record<string, string> = {
  Common: 'Обычный (Common)',
  Uncommon: 'Необычный (Uncommon)',
  Rare: 'Редкий (Rare)',
  'Very Rare': 'Очень редкий (Very Rare)',
  Legendary: 'Легендарный (Legendary)'
};

const MAGIC_ITEMS_DATABASE: Array<Omit<MagicItemEntry, 'schoolNameRu' | 'typeNameRu' | 'rarityRu'>> = [
  // ABJURATION (Заграждение)
  {
    name: 'Кольцо Магического Щита (Ring of Abjuration)',
    school: 'abjuration',
    type: 'ring',
    rarity: 'Uncommon',
    attunement: true,
    attunementDesc: 'Требуется настройка заклинателем или воином',
    charges: '3 заряда (восстанавливает 1d3 на рассвете)',
    activeAbility: 'Реакцией при получении урона создает прозрачный силовой щит, поглощающий 2d8+4 урона.',
    passiveEffect: '+1 к спасброскам от заклинаний школы Заграждения.',
    commandWord: '«Aegis Mortis»',
    description: 'Серебряное перстень с встроенным сапфиром, пульсирующим при приближении магических атак.',
    lore: 'Создано стражами древней Цитадели Магов для защиты от стихийных заклинателей.',
    valueGp: 350
  },
  {
    name: 'Амулет Непроницаемости (Amulet of Proof against Detection)',
    school: 'abjuration',
    type: 'amulet',
    rarity: 'Uncommon',
    attunement: true,
    attunementDesc: 'Требуется настройка',
    activeAbility: 'Пассивная постоянная аура.',
    passiveEffect: 'Носитель защищен от заклинаний скраинга, прорицания и ментального обнаружения.',
    commandWord: '«Silencium»',
    description: 'Тяжелый латунный амулет с изображением сомкнутого глаза.',
    lore: 'Использовался гильдией лазутчиков во времена Великих Охот на Магов.',
    valueGp: 450
  },
  {
    name: 'Бастионный Посох Отрицания (Staff of Countering)',
    school: 'abjuration',
    type: 'staff',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка магом или жрецом',
    charges: '7 зарядов (восстанавливает 1d6+1 на рассвете)',
    activeAbility: 'Позволяет использовать Counterspell (3 заряда) или Dispel Magic (2 заряда).',
    passiveEffect: 'Носитель получает +2 к КД против заклинаний-снарядов.',
    commandWord: '«Nego!»',
    description: 'Массивный посох из белого ясеня, на вершине которого парит рунический диск.',
    lore: 'Принадлежал верховному инквизитору архиепископства.',
    valueGp: 2800
  },

  // CONJURATION (Вызов)
  {
    name: 'Жезл Фазового Шага (Wand of Dimension Door)',
    school: 'conjuration',
    type: 'wand',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка заклинателем',
    charges: '3 заряда (восстанавливает 1d3 на рассвете)',
    activeAbility: 'Действием сотворяет заклинание Dimension Door (Пространственная дверь) на 500 футов.',
    passiveEffect: 'Носитель игнорирует трудную местность при прыжках.',
    commandWord: '«Portala!»',
    description: 'Тонкая палочка из извивающегося горного хрусталя, искажающая свет вокруг себя.',
    lore: 'Выкована гильдией следопытов для мгновенного перемещения через пропасти.',
    valueGp: 1800
  },
  {
    name: 'Сумка Бездонного Измерения (Bag of Holding)',
    school: 'conjuration',
    type: 'wondrous',
    rarity: 'Uncommon',
    attunement: false,
    activeAbility: 'Помещает до 500 фунтов предмета объемом 64 кубических фута во карманное измерение.',
    passiveEffect: 'Сумка всегда весит ровно 15 фунтов, независимо от содержимого.',
    description: 'Шелковый походный мешок с рунической вышивкой по краям.',
    lore: 'Классическое произведение мастеров магии вызова.',
    valueGp: 500
  },

  // DIVINATION (Прорицание)
  {
    name: 'Очи Всевидения (Eyes of Minute Seeing)',
    school: 'divination',
    type: 'wondrous',
    rarity: 'Uncommon',
    attunement: false,
    activeAbility: 'Дает возможность рассматривать мелкие объекты с увеличением в 100 раз.',
    passiveEffect: '+5 к проверкам Анализа (Investigation) при поиске ловушек и тайников.',
    description: 'Пара кристаллической оптики в оправу из темного серебра.',
    lore: 'Любимый инструмент замок и мастеров-ювелиров королевского двора.',
    valueGp: 300
  },
  {
    name: 'Хрустальная Сфера Прозрения (Sphere of Scrying)',
    school: 'divination',
    type: 'wondrous',
    rarity: 'Very Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка заклинателем',
    charges: '1 раз в день',
    activeAbility: 'Позволяет сотворить заклинание Scrying (DC 17) для наблюдения за любой точкой мира.',
    passiveEffect: 'Дает преимущество на проверки Проницательности (Insight).',
    commandWord: '«Videre Omnia»',
    description: 'Прозрачный кварцевый шар размером с грейпфрут, внутри которого клубится дым.',
    lore: 'Создана верховным прорицателем для слежки за вражескими армиями.',
    valueGp: 6500
  },

  // ENCHANTMENT (Очарование)
  {
    name: 'Корона Властного Голоса (Crown of Command)',
    school: 'enchantment',
    type: 'wondrous',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка персонажем с Харизмой 13+',
    charges: '4 заряда (1d4 на рассвете)',
    activeAbility: 'Позволяет колдовать Command (1 заряд) или Suggestion (2 заряда) с DC 15.',
    passiveEffect: '+2 к проверкам Убеждения (Persuasion) и Запугивания (Intimidation).',
    commandWord: '«Obey!»',
    description: 'Изящная золотая диадема, украшенная рубином в форме каплей крови.',
    lore: 'Носилась древней королевой для удержания вассалов в подчинении.',
    valueGp: 2200
  },

  // EVOCATION (Воплощение)
  {
    name: 'Клинок Пламенного Взрыва (Flame Tongue Longsword)',
    school: 'evocation',
    type: 'weapon',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка воином',
    activeAbility: 'Бонусным действием произносится слово активации, объявляя клинок ярким пламенем.',
    passiveEffect: 'Добавляет +2d6 урона огнем при каждом попадании.',
    commandWord: '«Ignis!»',
    description: 'Длинный меч из красной стали, чей клинок покрыт рунами огня.',
    lore: 'Закален в сердце вулканической жилы планарными ковалями.',
    valueGp: 3500
  },
  {
    name: 'Жезл Молний (Wand of Lightning Bolts)',
    school: 'evocation',
    type: 'wand',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка заклинателем',
    charges: '7 зарядов (1d6+1 на рассвете)',
    activeAbility: 'Выпускает Молнию (Lightning Bolt) на 8d6 урона электричеством (DC 15 DEX).',
    passiveEffect: 'Носитель получает сопротивление к урону электричеством.',
    commandWord: '«Fulcur!»',
    description: 'Зигзагообразная палочка из обугленного молнией дуба.',
    lore: 'Собрана во время великой грозы на вершине Драконьего Пика.',
    valueGp: 4000
  },

  // ILLUSION (Иллюзия)
  {
    name: 'Плащ Невидимого Призрака (Cloak of Invisibility)',
    school: 'illusion',
    type: 'wondrous',
    rarity: 'Legendary',
    attunement: true,
    attunementDesc: 'Требуется настройка',
    charges: '2 часа использования в день',
    activeAbility: 'Действием делает носителя и его экипировку полностью невидимыми.',
    passiveEffect: 'Заглушает шаги носителя, давая преимущество на Скрытность.',
    commandWord: '«Evanesco»',
    description: 'Темный плащ из шелка, который кажется прозрачным на свету.',
    lore: 'Легендарное деяние мастера иллюзий гильдии ассасинов.',
    valueGp: 25000
  },
  {
    name: 'Маска Ста Ликов (Mask of Many Faces)',
    school: 'illusion',
    type: 'wondrous',
    rarity: 'Uncommon',
    attunement: false,
    activeAbility: 'Позволяет сотворять заклинание Disguise Self без расхода ячеек.',
    passiveEffect: 'Изменяет голос и походку носителя под созданный образ.',
    description: 'Белая фарфоровая маска без черт лица.',
    lore: 'Любимый атрибут шпионов и тайных агентов.',
    valueGp: 800
  },

  // NECROMANCY (Некромантия)
  {
    name: 'Амулет Защиты от Смерти (Amulet of Health & Death Ward)',
    school: 'necromancy',
    type: 'amulet',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка',
    charges: '1 раз в день',
    activeAbility: 'При опускании хитов до 0, носитель вместо этого остается на 1 хит.',
    passiveEffect: 'Дает преимущество на спасброски от смерти.',
    commandWord: '«Vivat»',
    description: 'Амулет из кости древнего дракона с гравировкой рун жизни.',
    lore: 'Создан жрецами культа для защиты своих верховных иерархов.',
    valueGp: 3200
  },

  // TRANSMUTATION (Превращение)
  {
    name: 'Пояс Великаньей Силы (Belt of Hill Giant Strength)',
    school: 'transmutation',
    type: 'wondrous',
    rarity: 'Rare',
    attunement: true,
    attunementDesc: 'Требуется настройка',
    activeAbility: 'Пассивно изменяет физические параметры носителя.',
    passiveEffect: 'Значение Силы носителя становится равным 21.',
    description: 'Широкий кожаный пояс с массивной бронзовой пряжкой в виде головы великана.',
    lore: 'Скроен из кожи горного гиганта и зачарован шаманами.',
    valueGp: 5000
  },
  {
    name: 'Сапоги Прыгучести (Boots of Striding and Leaping)',
    school: 'transmutation',
    type: 'wondrous',
    rarity: 'Uncommon',
    attunement: true,
    attunementDesc: 'Требуется настройка',
    activeAbility: 'Увеличивает дальность прыжка в 3 раза.',
    passiveEffect: 'Скорость носителя становится минимум 30 футов и не снижается от перегруза.',
    description: 'Прочные сапоги из мягкой оленьей кожи с золотыми пряжками.',
    lore: 'Использовались гонцами для пересечения горных ущелий.',
    valueGp: 600
  }
];

export function generateMagicItem(options: MagicItemOptions = {}): { text: string; raw: MagicItemRawData } {
  let pool = [...MAGIC_ITEMS_DATABASE];

  if (options.school && options.school !== 'random' && options.school !== 'all') {
    pool = pool.filter(i => i.school === options.school);
  }

  if (options.itemType && options.itemType !== 'random') {
    pool = pool.filter(i => i.type === options.itemType);
  }

  if (options.rarity && options.rarity !== 'random') {
    pool = pool.filter(i => i.rarity === options.rarity);
  }

  if (options.attunementFilter === 'requires') {
    const filtered = pool.filter(i => i.attunement === true);
    if (filtered.length > 0) pool = filtered;
  } else if (options.attunementFilter === 'no_attunement') {
    const filtered = pool.filter(i => i.attunement === false);
    if (filtered.length > 0) pool = filtered;
  }

  // Fallback if empty pool
  if (pool.length === 0) {
    pool = [...MAGIC_ITEMS_DATABASE];
  }

  const baseItem = randomChoice(pool);

  // Quirk / Curse attachment
  let quirkOrCurse: string | undefined = undefined;
  if (options.hasQuirk === 'quirk') {
    const QUIRKS = [
      'Чудачество: Излучает легкий запах лаванды и сирени при активации.',
      'Чудачество: Владелец видит сны на древнем эльфийском языке.',
      'Чудачество: Тихий звон хрустальных колокольчиков раздается при приближении магии.'
    ];
    quirkOrCurse = randomChoice(QUIRKS);
  } else if (options.hasQuirk === 'curse') {
    const CURSES = [
      'Проклятие: Носитель не может добровольно расстаться с предметом без заклинания «Снятие проклятия».',
      'Проклятие Эфира: Напитки в руках владельца мгновенно превращаются в соленую воду.',
      'Проклятие Шейда: Тень владельца двигается с задержкой в 2 секунды.'
    ];
    quirkOrCurse = randomChoice(CURSES);
  }

  const schoolNameRu = SCHOOL_NAMES_RU[baseItem.school] || baseItem.school;
  const rarityRu = RARITY_NAMES_RU[baseItem.rarity] || baseItem.rarity;
  const typeNameRu = baseItem.type === 'ring' ? 'Кольцо' : baseItem.type === 'wand' ? 'Жезл' : baseItem.type === 'staff' ? 'Посох' : baseItem.type === 'weapon' ? 'Магическое оружие' : baseItem.type === 'amulet' ? 'Амулет' : 'Магический предмет (Wondrous)';

  const item: MagicItemEntry = {
    ...baseItem,
    schoolNameRu,
    typeNameRu,
    rarityRu,
    quirkOrCurse
  };

  const raw: MagicItemRawData = {
    requestedSchool: options.school || 'random',
    requestedType: options.itemType || 'random',
    requestedRarity: options.rarity || 'random',
    item
  };

  const text = `
╔══════════════════════════════════════════════════════════════════════╗
  МАГИЧЕСКИЙ ПРЕДМЕТ: ${item.name.toUpperCase()}
  Школа Магии: ${item.schoolNameRu}
  Тип: ${item.typeNameRu} | Редкость: ${item.rarityRu}
╠══════════════════════════════════════════════════════════════════════╣
  СВОЙСТВА И АКТИВАЦИЯ:
  ✦ Настройка (Attunement): ${item.attunement ? `Да (${item.attunementDesc || 'Стандартная'})` : 'Не требуется'}
  ✦ Заряды / Использование: ${item.charges || 'Постоянное пассивное действие'}
  ✦ Кодовое слово активации: ${item.commandWord || 'Не требуется'}
  ✦ Примерная ценность: ${item.valueGp} gp

  АКТИВНАЯ СПОСОБНОСТЬ:
  ✦ ${item.activeAbility}

  ПАССИВНАЯ АУРА / ЭФФЕКТ:
  ✦ ${item.passiveEffect}

  ВНЕШНИЙ ВИД:
  ${item.description}

  ИСТОРИЯ И ЛОР ПРЕДМЕТА:
  ${item.lore}
╚══════════════════════════════════════════════════════════════════════╝
`.trim();

  return { text, raw };
}
