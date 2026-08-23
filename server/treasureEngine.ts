/**
 * High-Performance Server-Side D&D Treasure & Hoard Engine
 * Generates Coins, Gems, Art Objects, Potions, Scrolls, Wands, Weapons, Armor, and Wondrous Items by Level/CR,
 * with customizable Hoard Archetypes, Containers, Magic Item focuses, and Traps/Guardians.
 */

export interface TreasureOptions {
  level?: number;
  type?: 'hoard' | 'individual' | 'boss';
  theme?: string;         // 'classic' | 'dragon' | 'tomb' | 'thieves' | 'wizard_lab' | 'pirate' | 'cultist' | 'castle_vault' | 'dwarf_hoard' | 'elven_cache'
  container?: string;     // 'chest_iron' | 'sarcophagus' | 'secret_alcove' | 'dragon_pile' | 'magic_sphere' | 'barrels'
  magicFocus?: string;    // 'balanced' | 'weapons_armor' | 'potions_scrolls' | 'wondrous' | 'no_magic'
  trapOrHazard?: string;  // 'none' | 'poison_needle' | 'scythe_blades' | 'fire_rune' | 'sleep_gas' | 'greed_curse' | 'mimic'
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollDice(count: number, sides: number): number {
  let total = 0;
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1;
  }
  return total;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export const TREASURE_THEMES: Record<string, {
  name: string;
  description: string;
  coinMultiplier: { cp: number; sp: number; gp: number; pp: number };
  extraArtTypes: Array<{ name: string; value: number }>;
  specialItemPrompt: string;
}> = {
  classic: {
    name: 'Классическая сокровищница подземелья',
    description: 'Старинный кованый сундук искателей приключений с монетами, ювелирными изделиями и свитками.',
    coinMultiplier: { cp: 1, sp: 1, gp: 1, pp: 1 },
    extraArtTypes: [
      { name: 'Позолоченный кубок с гравировкой битвы', value: 150 },
      { name: 'Серебряный кинжал с ножнами из кожи василиска', value: 200 }
    ],
    specialItemPrompt: 'Запечатанное письмо с сургучной печатью гильдии исследователей подземелий.'
  },
  dragon: {
    name: 'Логово древнего дракона',
    description: 'Гора сплавленных от дыхания монет, гигантских самоцветов, оплавленного оружия павших героев и легендарных реликвий.',
    coinMultiplier: { cp: 0.2, sp: 0.5, gp: 2.2, pp: 3.0 },
    extraArtTypes: [
      { name: 'Массивный слиток чистого червонного золота с драконьим клеймом', value: 500 },
      { name: 'Корона павшего драконьего лорда с шестью огненными опалами', value: 2500 },
      { name: 'Драконий череп, инкрустированный звездчатыми рубинами', value: 3000 }
    ],
    specialItemPrompt: 'Окаменевшее яйцо золотого или теневого дракона, излучающее тепло.'
  },
  tomb: {
    name: 'Гробница древнего владыки / Усыпальница',
    description: 'Погребальные саркофаги, золотые посмертные маски, канопы с благовониями, ритуальные скарабеи и проклятое золото.',
    coinMultiplier: { cp: 0.1, sp: 0.8, gp: 1.5, pp: 1.2 },
    extraArtTypes: [
      { name: 'Золотая посмертная маска с глазами из лазурита', value: 850 },
      { name: 'Алебастровая канопа с бальзамическими маслами тысячелетней выдержки', value: 350 },
      { name: 'Нагрудное ожерелье жреца смерти с вырезанными скарабеями', value: 600 }
    ],
    specialItemPrompt: 'Древний свиток с папирусом проклятия на языке мертвой империи.'
  },
  thieves: {
    name: 'Схрон гильдии воров / Контрабандистов',
    description: 'Тайник с ворованной ювелиркой, слитками, долговыми расписками, ядами и инструментами взлома высшего качества.',
    coinMultiplier: { cp: 1.2, sp: 1.5, gp: 1.3, pp: 0.8 },
    extraArtTypes: [
      { name: 'Бархатный мешочек с россыпью ограненных алмазов без оправы', value: 750 },
      { name: 'Набор мастерских отмычек из темной мифриловой стали в кожаном чехле', value: 300 },
      { name: 'Золотая табакерка с тайным дном для сокрытия яда', value: 450 }
    ],
    specialItemPrompt: 'Зашифрованная бухгалтерская книга тайных сделок и подкупов городской стражи.'
  },
  wizard_lab: {
    name: 'Хранилище архимага / Башня волшебника',
    description: 'Магические гримуары, свитки высших кругов заклинаний, кристаллы концентрированной маны, жезлы и алхимические эликсиры.',
    coinMultiplier: { cp: 0.1, sp: 0.3, gp: 1.2, pp: 2.0 },
    extraArtTypes: [
      { name: 'Хрустальная сфера с пойманной внутри вечной молнией', value: 650 },
      { name: 'Фолиант заклинаний в переплете из чешуи астрального ската с серебряным замком', value: 1200 },
      { name: 'Астролябия из электрума со знаками зодиака и шестеренками времени', value: 900 }
    ],
    specialItemPrompt: 'Кристалл памяти, содержащий утраченную формулу портального круга.'
  },
  pirate: {
    name: 'Пиратский сундук / Затонувший галеон',
    description: 'Окованный латунью морской сундук с испанскими дублонами, черным жемчугом, золотыми слитками, навигационными картами и ромом.',
    coinMultiplier: { cp: 0.5, sp: 1.8, gp: 1.6, pp: 0.5 },
    extraArtTypes: [
      { name: 'Золотой навигационный секстант с гравировкой русалки', value: 400 },
      { name: 'Нить из 15 редчайших глубоководных черных жемчужин', value: 1500 },
      { name: 'Церемониальная абордажная сабля с золотой рукоятью и рубином', value: 600 }
    ],
    specialItemPrompt: 'Карта необитаемого острова с крестом на месте клада капитана Кровавого Шторма.'
  },
  cultist: {
    name: 'Святилище темного культа / Оскверненный алтарь',
    description: 'Оскверненное золото, черные обсидиановые чаши, жертвенные клинки, гримуары теней и амулеты темных божеств.',
    coinMultiplier: { cp: 0.3, sp: 0.7, gp: 1.1, pp: 1.5 },
    extraArtTypes: [
      { name: 'Обсидиановый жертвенный кинжал с желобом для крови и гранатом', value: 550 },
      { name: 'Черная чаша из кости демона с гравировкой нечестивых рун', value: 400 },
      { name: 'Медальон с открывающимся оком из дымчатого кварца', value: 700 }
    ],
    specialItemPrompt: 'Тайный список членов городского культа, включающий имена известных советников.'
  },
  castle_vault: {
    name: 'Королевская казна / Казначейство замка',
    description: 'Огромные штабеля золотых слитков с гербовыми печатями, королевские регалии, фамильные диадемы и драгоценные гобелены.',
    coinMultiplier: { cp: 0.1, sp: 0.5, gp: 2.0, pp: 2.5 },
    extraArtTypes: [
      { name: 'Королевский скипетр с сапфиром размером с куриное яйцо', value: 3500 },
      { name: 'Шелковый гобелен с золотой нитью, изображающий коронацию первой династии', value: 1000 },
      { name: 'Золотой кубок с инкрустацией двенадцатью изумрудами', value: 1800 }
    ],
    specialItemPrompt: 'Королевская грамота с дарованием дворянского титула и земельного надела.'
  },
  dwarf_hoard: {
    name: 'Дворфийская сокровищница / Цитадель клана',
    description: 'Слитки мифрила и адамантина, безупречно ограненные алмазы, рунные боевые топоры и резные наковальни из горного базальта.',
    coinMultiplier: { cp: 0.3, sp: 1.0, gp: 1.8, pp: 1.8 },
    extraArtTypes: [
      { name: 'Слиток чистейшего мифрила с печатью королевской гильдии рудокопов', value: 800 },
      { name: 'Кружка из цельного топаза в золотой оправе с резьбой о подвигах предков', value: 1100 },
      { name: 'Боевой рунный шлем из черненой адамантиновой стали с золотыми рогами', value: 1600 }
    ],
    specialItemPrompt: 'Чертеж легендарного горного бура или чертежи тайного прохода под хребтом.'
  },
  elven_cache: {
    name: 'Тайник эльфийских следопытов / Реликвии предков',
    description: 'Звездные сапфиры, лунное серебро, шелка из паутины фей, зачарованные луки и амулеты солнечного света.',
    coinMultiplier: { cp: 0.1, sp: 0.6, gp: 1.4, pp: 2.0 },
    extraArtTypes: [
      { name: 'Диадема из лунного серебра с танцующим звездным сапфиром', value: 1400 },
      { name: 'Эльфийская флейта из белого дерева с нотами песен рассвета', value: 500 },
      { name: 'Кольцо из живого переплетенного золотого плюща с чистым изумрудом', value: 900 }
    ],
    specialItemPrompt: 'Запечатанное семя древнего Древа Жизни, способное очистить оскверненную землю.'
  }
};

export const CONTAINERS_DATA: Record<string, { name: string; lockDc: number; description: string }> = {
  chest_iron: {
    name: 'Тяжелый кованый сундук из железа и дуба',
    lockDc: 15,
    description: 'Массивный замок с тремя засовами, окантованный стальными полосами.'
  },
  sarcophagus: {
    name: 'Каменный резной саркофаг с барельефом',
    lockDc: 16,
    description: 'Тяжелая каменная плита весом в 400 фунтов, запечатанная свинцом и рунами.'
  },
  secret_alcove: {
    name: 'Потайная стенная ниша за барельефом',
    lockDc: 14,
    description: 'Скрытый нажимной камень в кладке стены (DC 15 на обнаружение).'
  },
  dragon_pile: {
    name: 'Открытая гора сокровищ на полу пещеры',
    lockDc: 0,
    description: 'Россыпь монет и костей прямо на каменном полу под куполом пещеры.'
  },
  magic_sphere: {
    name: 'Левитирующая сфера из силового поля',
    lockDc: 18,
    description: 'Магический барьер (DC 18 Магия для рассеивания или парольная фраза).'
  },
  barrels: {
    name: 'Запечатанные дубовые бочки и кожаные тюки',
    lockDc: 11,
    description: 'Обвязаны просмоленной пеньковой веревкой и запечатаны сургучом.'
  }
};

export const TRAPS_DATA: Record<string, { name: string; detectDc: number; disarmDc: number; effect: string }> = {
  none: {
    name: 'Без ловушек и стражи',
    detectDc: 0,
    disarmDc: 0,
    effect: 'Контейнер безопасен для вскрытия.'
  },
  poison_needle: {
    name: 'Выдвижная игла с ядом василиска в замочной скважине',
    detectDc: 14,
    disarmDc: 14,
    effect: 'Укол наносит 1d4 колющего урона + спасброск Телосложения DC 14 или 4d6 урона ядом и отравление на 1 час.'
  },
  scythe_blades: {
    name: 'Падающие серповидные лезвия из потолка',
    detectDc: 15,
    disarmDc: 15,
    effect: 'Срабатывает при сдвиге сундука. Все в радиусе 10 фт: спасбросок Ловкости DC 15 или 4d10 рубящего урона.'
  },
  fire_rune: {
    name: 'Взрывная огненная руна на крышке',
    detectDc: 16,
    disarmDc: 16,
    effect: 'Взрыв сферы огня радиусом 20 фт. Спасбросок Ловкости DC 15 или 6d6 урона огнем (половина при успехе).'
  },
  sleep_gas: {
    name: 'Баллон с усыпляющим алхимическим газом',
    detectDc: 13,
    disarmDc: 14,
    effect: 'Облако газа 15 фт. Спасбросок Телосложения DC 13 или потеря сознания (сон) на 1 час.'
  },
  greed_curse: {
    name: 'Древнее проклятие жадности фараона/лича',
    detectDc: 17,
    disarmDc: 17,
    effect: 'Всякий, кто берет золото, получает клеймо: помеха на все проверки характеристик, пока проклятие не снято.'
  },
  mimic: {
    name: 'Страж: Замаскированный Сундук-Мимик (CR 2)',
    detectDc: 15,
    disarmDc: 0,
    effect: 'При попытке открыть сундук отращивает пасть с зубами и клейкий псевдоподий, совершая внезапную атаку!'
  }
};

const GEMS_TABLE = [
  // 10 gp
  { name: 'Азурит (непрозрачный пятнистый синий камень)', value: 10 },
  { name: 'Лазурит (светло- и темно-синий с крапинками пирита)', value: 10 },
  { name: 'Малахит (непрозрачный полосчатый зеленый)', value: 10 },
  { name: 'Обсидиан (непрозрачный блестящий черный)', value: 10 },
  { name: 'Тигровый глаз (полупрозрачный коричневый с золотым отливом)', value: 10 },
  { name: 'Бирюза (светло-голубой/зеленый самоцвет)', value: 10 },

  // 50 gp
  { name: 'Кровавик (темно-серый с красными крапинками)', value: 50 },
  { name: 'Сердолик (оранжево-красный халцедон)', value: 50 },
  { name: 'Халцедон (матовый белый самоцвет)', value: 50 },
  { name: 'Хризопраз (полупрозрачный яблочно-зеленый)', value: 50 },
  { name: 'Цитрин (прозрачный бледно-желтый)', value: 50 },
  { name: 'Яшма (непрозрачный синий/коричневый/красный)', value: 50 },
  { name: 'Лунный камень (мерцающий молочно-белый)', value: 50 },
  { name: 'Оникс (матовый черный с белыми полосами)', value: 50 },
  { name: 'Звездчатая роза (полупрозрачный кварц со звездой)', value: 50 },

  // 100 gp
  { name: 'Янтарь (прозрачный золотистый с каплей смолы)', value: 100 },
  { name: 'Аметист (прозрачный глубокий фиолетовый)', value: 100 },
  { name: 'Хризоберилл (прозрачный желто-зеленый)', value: 100 },
  { name: 'Коралл (матовый багряный камень)', value: 100 },
  { name: 'Гранат (прозрачный темно-красный)', value: 100 },
  { name: 'Нефрит (полупрозрачный светло-зеленый)', value: 100 },
  { name: 'Жемчужина (сияющая белая / розовая)', value: 100 },
  { name: 'Шпинель (прозрачный красный кристалл)', value: 100 },

  // 500 gp
  { name: 'Александрит (прозрачный зеленый при солнце, красный при огне)', value: 500 },
  { name: 'Аквамарин (прозрачный бледно-сине-зеленый)', value: 500 },
  { name: 'Черная жемчужина (чистая глубокая тьма с отливом)', value: 500 },
  { name: 'Синий шпинель (прозрачный глубокий синий)', value: 500 },
  { name: 'Топаз (прозрачный золотисто-желтый самоцвет)', value: 500 },

  // 1000 gp
  { name: 'Черный опал (темный с искрами пламени)', value: 1000 },
  { name: 'Синий сапфир (чистейший небесный синий)', value: 1000 },
  { name: 'Изумруд (сверкающий ярко-зеленый)', value: 1000 },
  { name: 'Огненный опал (прозрачный огненно-красный)', value: 1000 },
  { name: 'Опал (радужный молочный камень)', value: 1000 },
  { name: 'Звездчатый рубин (прозрачный рубин со звездой внутри)', value: 1000 },

  // 5000 gp
  { name: 'Черный сапфир (матовый черный с искрами)', value: 5000 },
  { name: 'Алмаз (идеальной огранки чистейшей воды)', value: 5000 },
  { name: 'Жадеит (редчайший полупрозрачный зеленый)', value: 5000 },
  { name: 'Звездчатый сапфир (чистый сапфир с шестью лучами)', value: 5000 },
  { name: 'Красный корунд (королевский рубин высшей чистоты)', value: 5000 }
];

const ART_OBJECTS_TABLE = [
  // 25 gp
  { name: 'Серебряный кувшин с чеканкой виноградной лозы', value: 25 },
  { name: 'Статуэтка грифона из слоновой кости', value: 25 },
  { name: 'Золотой браслет с гравировкой драконьих рун', value: 25 },
  { name: 'Шелковое парчовое одеяние с серебряным шитьем', value: 25 },
  { name: 'Медный кубок с инкрустацией лунного камня', value: 25 },

  // 250 gp
  { name: 'Золотое кольцо с чистым аметистом и гравировкой', value: 250 },
  { name: 'Изящный серебряный кубок с четырьмя хризопразами', value: 250 },
  { name: 'Шкатулка из полированного черного дерева со вставками перламутра', value: 250 },
  { name: 'Церемониальный кинжал с позолотой и рукоятью из янтаря', value: 250 },
  { name: 'Серебряная арфа с шелковыми струнами и инкрустацией цитринами', value: 250 },

  // 750 gp
  { name: 'Золотой кубок с инкрустацией гранатами и рубиновой крошкой', value: 750 },
  { name: 'Икона святого на золотой пластине с эмалью и жемчугом', value: 750 },
  { name: 'Золотое ожерелье с подвеской из черного жемчуга', value: 750 },
  { name: 'Церемониальная корона из электрума с пятью аквамаринами', value: 750 },

  // 2500 gp
  { name: 'Изящная золотая музыкальная шкатулка с танцующими эльфийскими фигурками', value: 2500 },
  { name: 'Золотое ожерелье с двадцатью четырьмя бриллиантами', value: 2500 },
  { name: 'Царская платиновая держава с крупным звездчатым сапфиром', value: 2500 }
];

const MAGIC_WEAPONS_ARMOR_COMMON = [
  'Лунный кинжал (Moon-touched Sword, светится мягким лунным светом в темноте)',
  'Ветреный плащ (Billowing Cloak, эффектно развевается по желанию владельца)',
  'Кинжал с рукоятью из кости дракона (не подвержен коррозии и ржавчине)',
  'Охотничий лук с гравировкой сокола'
];

const MAGIC_CONSUMABLES_COMMON = [
  'Зелье лечения (Potion of Healing, 2d4+2 HP)',
  'Зелье лазания (Potion of Climbing, скорость лазания равна обычной)',
  'Свиток заклинания 1-го круга: Волшебная стрела (Magic Missile)',
  'Свиток заклинания 1-го круга: Щит (Shield +5 AC)',
  'Свиток заклинания 1-го круга: Лечащее слово (Healing Word)',
  'Флакон освященного алхимического масла (1d4 дополнительного святого урона)'
];

const MAGIC_ITEMS_COMMON = [
  ...MAGIC_WEAPONS_ARMOR_COMMON,
  ...MAGIC_CONSUMABLES_COMMON,
  'Веревка лазания (50 фт, движется по команде)',
  'Бусина очищения (очищает до 10 галлонов воды)'
];

const MAGIC_WEAPONS_ARMOR_UNCOMMON = [
  'Оружие +1 (Меч, топор или лук +1 к атаке и урону)',
  'Щит +1 (+3 к Классу Доспеха)',
  'Доспех из шкуры дракона (сопротивление стихийному урону)',
  'Кинжал яда (дополнительно 2d10 урона ядом 1/день)',
  'Копье возвращения (возвращается в руку бросившего)'
];

const MAGIC_CONSUMABLES_UNCOMMON = [
  'Зелье большего лечения (Potion of Greater Healing, 4d4+4 HP)',
  'Зелье дыхания под водой (длительность 24 часа)',
  'Зелье силы холмового великана (Сила становится равной 21 на 1 час)',
  'Свиток заклинания 2-го круга: Невидимость (Invisibility)',
  'Свиток заклинания 2-го круга: Отражения (Mirror Image)',
  'Свиток заклинания 3-го круга: Огненный шар (Fireball, 8d6 урона огнем)'
];

const MAGIC_WONDROUS_UNCOMMON = [
  'Сумка хранения (Bag of Holding, вмещает до 500 фунтов в карманном измерении)',
  'Сапоги эльфийского рода (бесшумные шаги, преимущество на Скрытность)',
  'Плащ защиты (+1 к Классу Доспеха и всем спасброскам)',
  'Очки ночного зрения (Темное зрение 60 фт)',
  'Жезл волшебных стрел (7 зарядов)',
  'Жемчужина силы (восстанавливает ячейку заклинаний до 3-го круга)'
];

const MAGIC_ITEMS_UNCOMMON = [
  ...MAGIC_WEAPONS_ARMOR_UNCOMMON,
  ...MAGIC_CONSUMABLES_UNCOMMON,
  ...MAGIC_WONDROUS_UNCOMMON
];

const MAGIC_WEAPONS_ARMOR_RARE = [
  'Оружие +2 (Меч, алебарда или арбалет +2 к атаке и урону)',
  'Пламенеющий клинок (Flame Tongue, +2d6 урона огнем при активации)',
  'Доспех сопротивления (выбранный тип стихии)',
  'Щит отражения заклинаний',
  'Лук солнечных лучей (+1d8 урона излучением)'
];

const MAGIC_CONSUMABLES_RARE = [
  'Зелье превосходного лечения (Potion of Superior Healing, 8d4+8 HP)',
  'Зелье невидимости (на 1 час)',
  'Зелье полета (скорость полета 60 фт на 1 час)',
  'Свиток заклинания 4-го круга: Высшая невидимость',
  'Свиток заклинания 5-го круга: Излечение ран / Оживление'
];

const MAGIC_WONDROUS_RARE = [
  'Кольцо защиты (+1 к AC и спасброскам)',
  'Плащ перемещения (атаки по владельцу имеют помеху)',
  'Крылатые сапоги (полет со скоростью перемещения)',
  'Жезл огненных шаров (7 зарядов Fireball)',
  'Амулет здоровья (Телосложение становится равным 19)'
];

const MAGIC_ITEMS_RARE = [
  ...MAGIC_WEAPONS_ARMOR_RARE,
  ...MAGIC_CONSUMABLES_RARE,
  ...MAGIC_WONDROUS_RARE
];

const MAGIC_ITEMS_VERY_RARE = [
  'Оружие +3 (+3 к атаке и урону)',
  'Молот громовержца (Dwarven Thrower, возвращающийся боевой молот)',
  'Пояс силы морозного великана (Сила становится 23)',
  'Одеяние архимага (AC 15+DEX, +2 к сложности спасбросков от заклинаний)',
  'Зеркало пленения душ',
  'Посох силы (+2 к AC, могущественный арсенал заклинаний)',
  'Зелье абсолютного исцеления (Potion of Supreme Healing, 10d4+20 HP)'
];

const MAGIC_ITEMS_LEGENDARY = [
  'Святой каратель (Holy Avenger, легендарный меч паладинов)',
  'Посох магов (Staff of the Magi, непревзойденный артефакт волшебников)',
  'Кольцо трех желаний (Ring of Three Wishes)',
  'Броня неуязвимости (сопротивление всему немагическому урону)',
  'Сфера драконьего рода (подчинение древних драконов)'
];

export function generateTreasure(options: TreasureOptions = {}): { text: string; raw: any } {
  const level = Math.max(1, Math.min(30, Number(options.level) || 1));
  const themeKey = options.theme && TREASURE_THEMES[options.theme] ? options.theme : 'classic';
  const theme = TREASURE_THEMES[themeKey];

  const containerKey = options.container && CONTAINERS_DATA[options.container] ? options.container : 'chest_iron';
  const container = CONTAINERS_DATA[containerKey];

  const trapKey = options.trapOrHazard && TRAPS_DATA[options.trapOrHazard] ? options.trapOrHazard : 'none';
  const trap = TRAPS_DATA[trapKey];

  const magicFocus = options.magicFocus || 'balanced';

  let cp = 0;
  let sp = 0;
  let gp = 0;
  let pp = 0;
  const gems: { name: string; value: number }[] = [];
  const artObjects: { name: string; value: number }[] = [];
  const magicItems: string[] = [];

  // 1. Roll Coins based on Tier
  if (level <= 4) {
    // Tier 1 (CR 0-4)
    cp = rollDice(6, 6) * 100;
    sp = rollDice(3, 6) * 100;
    gp = rollDice(2, 6) * 10;
    if (Math.random() < 0.15) pp = rollDice(1, 6);

    // Gems
    const gemCount = randomInt(2, 6);
    for (let i = 0; i < gemCount; i++) {
      gems.push(randomChoice(GEMS_TABLE.filter(x => x.value <= 50)));
    }
    // Art
    if (Math.random() < 0.5) {
      artObjects.push(randomChoice(ART_OBJECTS_TABLE.filter(x => x.value <= 25)));
    }
  } else if (level <= 10) {
    // Tier 2 (CR 5-10)
    cp = rollDice(2, 6) * 100;
    sp = rollDice(2, 6) * 1000;
    gp = rollDice(6, 6) * 100;
    pp = rollDice(3, 6) * 10;

    // Gems (50 - 500 gp)
    const gemCount = randomInt(3, 8);
    for (let i = 0; i < gemCount; i++) {
      gems.push(randomChoice(GEMS_TABLE.filter(x => x.value >= 50 && x.value <= 500)));
    }
    // Art (25 - 250 gp)
    const artCount = randomInt(1, 3);
    for (let i = 0; i < artCount; i++) {
      artObjects.push(randomChoice(ART_OBJECTS_TABLE.filter(x => x.value <= 250)));
    }
  } else if (level <= 16) {
    // Tier 3 (CR 11-16)
    gp = rollDice(4, 6) * 1000;
    pp = rollDice(5, 6) * 100;

    // Gems (100 - 1000 gp)
    const gemCount = randomInt(4, 10);
    for (let i = 0; i < gemCount; i++) {
      gems.push(randomChoice(GEMS_TABLE.filter(x => x.value >= 100 && x.value <= 1000)));
    }
    // Art (250 - 750 gp)
    const artCount = randomInt(2, 4);
    for (let i = 0; i < artCount; i++) {
      artObjects.push(randomChoice(ART_OBJECTS_TABLE.filter(x => x.value >= 250 && x.value <= 750)));
    }
  } else {
    // Tier 4 (CR 17-30)
    gp = rollDice(12, 6) * 1000;
    pp = rollDice(8, 6) * 1000;

    // Gems (1000 - 5000 gp)
    const gemCount = randomInt(6, 15);
    for (let i = 0; i < gemCount; i++) {
      gems.push(randomChoice(GEMS_TABLE.filter(x => x.value >= 1000)));
    }
    // Art (750 - 2500 gp)
    const artCount = randomInt(3, 6);
    for (let i = 0; i < artCount; i++) {
      artObjects.push(randomChoice(ART_OBJECTS_TABLE.filter(x => x.value >= 750)));
    }
  }

  // Apply Theme Coin Multipliers
  cp = Math.round(cp * theme.coinMultiplier.cp);
  sp = Math.round(sp * theme.coinMultiplier.sp);
  gp = Math.round(gp * theme.coinMultiplier.gp);
  pp = Math.round(pp * theme.coinMultiplier.pp);

  // Add Theme-specific unique Art Items
  if (theme.extraArtTypes && theme.extraArtTypes.length > 0) {
    artObjects.push(randomChoice(theme.extraArtTypes));
  }

  // 2. Roll Magic items based on preference
  if (magicFocus !== 'no_magic') {
    let poolCommon = MAGIC_ITEMS_COMMON;
    let poolUncommon = MAGIC_ITEMS_UNCOMMON;
    let poolRare = MAGIC_ITEMS_RARE;

    if (magicFocus === 'weapons_armor') {
      poolCommon = MAGIC_WEAPONS_ARMOR_COMMON;
      poolUncommon = MAGIC_WEAPONS_ARMOR_UNCOMMON;
      poolRare = MAGIC_WEAPONS_ARMOR_RARE;
    } else if (magicFocus === 'potions_scrolls') {
      poolCommon = MAGIC_CONSUMABLES_COMMON;
      poolUncommon = MAGIC_CONSUMABLES_UNCOMMON;
      poolRare = MAGIC_CONSUMABLES_RARE;
    } else if (magicFocus === 'wondrous') {
      poolCommon = ['Веревка лазания', 'Бусина очищения'];
      poolUncommon = MAGIC_WONDROUS_UNCOMMON;
      poolRare = MAGIC_WONDROUS_RARE;
    }

    if (level <= 4) {
      const count = randomInt(1, 2);
      for (let i = 0; i < count; i++) magicItems.push(randomChoice(poolCommon));
      if (Math.random() < 0.35) magicItems.push(randomChoice(poolUncommon));
    } else if (level <= 10) {
      const count = randomInt(2, 3);
      for (let i = 0; i < count; i++) magicItems.push(randomChoice(poolUncommon));
      if (Math.random() < 0.45) magicItems.push(randomChoice(poolRare));
    } else if (level <= 16) {
      const count = randomInt(2, 4);
      for (let i = 0; i < count; i++) magicItems.push(randomChoice(poolRare));
      if (Math.random() < 0.5) magicItems.push(randomChoice(MAGIC_ITEMS_VERY_RARE));
    } else {
      const count = randomInt(3, 5);
      for (let i = 0; i < count; i++) magicItems.push(randomChoice(MAGIC_ITEMS_VERY_RARE));
      const legCount = randomInt(1, 2);
      for (let i = 0; i < legCount; i++) magicItems.push(randomChoice(MAGIC_ITEMS_LEGENDARY));
    }
  }

  const gemsTotalValue = gems.reduce((sum, g) => sum + g.value, 0);
  const artTotalValue = artObjects.reduce((sum, a) => sum + a.value, 0);
  const totalCoinGp = Math.round((cp / 100) + (sp / 10) + gp + (pp * 10));
  const grandTotalGp = Math.round(totalCoinGp + gemsTotalValue + artTotalValue);

  const rawData = {
    level,
    theme: theme.name,
    themeDesc: theme.description,
    container: container.name,
    containerDesc: container.description,
    lockDc: container.lockDc,
    trap: trap.name,
    trapEffect: trap.effect,
    trapDetectDc: trap.detectDc,
    trapDisarmDc: trap.disarmDc,
    specialItem: theme.specialItemPrompt,
    coins: { cp, sp, gp, pp, totalGpEquivalent: totalCoinGp },
    gems,
    artObjects,
    magicItems,
    grandTotalValueGp: grandTotalGp
  };

  const textOutput = `
╔══════════════════════════════════════════════════════════════════════╗
  СОКРОВИЩНИЦА: ${theme.name.toUpperCase()} (Уровень / CR: ${level})
  ${theme.description}
  Общая расчетная стоимость: ~${grandTotalGp.toLocaleString('ru-RU')} gp
╠══════════════════════════════════════════════════════════════════════╣
  ХРАНИЛИЩЕ И ЗАЩИТА:
  • Контейнер: ${container.name} (Сложность взлома замка: DC ${container.lockDc > 0 ? container.lockDc : 'отсутствует'})
  • Описание замка: ${container.description}
  • Защитная ловушка: ${trap.name}
    ${trap.effect} (Обнаружение: DC ${trap.detectDc}, Обезвреживание: DC ${trap.disarmDc})
╠──────────────────────────────────────────────────────────────────────╢
  МОНЕТЫ В КЛАДЕ:
  • Медные (cp):     ${cp > 0 ? cp.toLocaleString('ru-RU') : '0'}
  • Серебряные (sp): ${sp > 0 ? sp.toLocaleString('ru-RU') : '0'}
  • Золотые (gp):    ${gp > 0 ? gp.toLocaleString('ru-RU') : '0'}
  • Платиновые (pp): ${pp > 0 ? pp.toLocaleString('ru-RU') : '0'}
  (Эквивалент в золоте: ~${totalCoinGp.toLocaleString('ru-RU')} gp)
╠──────────────────────────────────────────────────────────────────────╢
  ДРАГОЦЕННЫЕ КАМНИ И САМОЦВЕТЫ (Всего: ${gemsTotalValue} gp):
${gems.length > 0 ? gems.map(g => `  • ${g.name} — ${g.value} gp`).join('\n') : '  (Нет самоцветов)'}
╠──────────────────────────────────────────────────────────────────────╢
  ПРЕДМЕТЫ ИСКУССТВА И ЮВЕЛИРНЫЕ ИЗДЕЛИЯ (Всего: ${artTotalValue} gp):
${artObjects.length > 0 ? artObjects.map(a => `  • ${a.name} — ${a.value} gp`).join('\n') : '  (Нет предметов искусства)'}
╠──────────────────────────────────────────────────────────────────────╢
  МАГИЧЕСКИЕ ПРЕДМЕТЫ И АРТЕФАКТЫ:
${magicItems.length > 0 ? magicItems.map(m => `  ✦ ${m}`).join('\n') : '  (Нет магических предметов)'}
╠──────────────────────────────────────────────────────────────────────╢
  СЮЖЕТНАЯ НАХОДКА:
  ✦ ${theme.specialItemPrompt}
╚══════════════════════════════════════════════════════════════════════╝
`.trim();

  return { text: textOutput, raw: rawData };
}
