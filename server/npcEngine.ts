/**
 * High-Performance Server-Side D&D NPC Engine
 * Generates rich statblocks, professions, backgrounds, social standing, personality traits, secrets, rumors, and combat stats.
 */

export interface NPCOptions {
  race?: string;
  classType?: string;
  gender?: string;
  level?: number;
  profession?: string;
  socialStatus?: string;
  ageGroup?: string;
  attitude?: string;
}

export const PROFESSIONS_DATA: Record<string, {
  name: string;
  category: string;
  statBonus: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  tools: string[];
  gear: string[];
  perk: string;
  rumorPrompt: string;
}> = {
  // Ремесло
  blacksmith: {
    name: 'Кузнец / Оружейник',
    category: 'Ремесло',
    statBonus: 'str',
    tools: ['Инструменты кузнеца', 'Горн и мехи'],
    gear: ['Тяжелый кузнечный молот', 'Кожаный фартук с подпалинами', 'Брусок закаленной стали', 'Точило'],
    perk: 'Знаток металлов: сразу распознает качество оружия и наличие сплавов мифрила/адамантина.',
    rumorPrompt: 'Говорят, местный дворянин тайно заказал сотню наконечников для копий странной формы...'
  },
  jeweler: {
    name: 'Ювелир / Огранщик',
    category: 'Ремесло',
    statBonus: 'dex',
    tools: ['Инструменты ювелира', 'Лупа с хрустальной линзой'],
    gear: ['Пинцеты и напильники', 'Бархатный мешочек с россыпью полудрагоценных камней', 'Весы ювелира'],
    perk: 'Оценка самоцветов: мгновенно определяет подлинность и точную стоимость любых камней.',
    rumorPrompt: 'Недавно ко мне приносили рубин с печатью королевской сокровищницы, продавец нервничал...'
  },
  carpenter: {
    name: 'Плотник / Корабел',
    category: 'Ремесло',
    statBonus: 'str',
    tools: ['Инструменты плотника', 'Рубанок и пила'],
    gear: ['Деревянный метр', 'Смола и гвозди', 'Крепкий топор плотника'],
    perk: 'Оценка конструкций: находит слабые места в деревянных дверях, кораблях и перекрытиях.',
    rumorPrompt: 'В старой верфи по ночам слышен стук топоров, хотя рабочих там нет уже лет десять...'
  },
  alchemist_craft: {
    name: 'Алхимик / Зельевар',
    category: 'Наука и магия',
    statBonus: 'int',
    tools: ['Алхимические принадлежности', 'Реторты и колбы'],
    gear: ['Флакон с алхимическим огнем', 'Набор сушеных трав и редких солей', 'Тетрадь с формулами'],
    perk: 'Химический нюх: определяет тип зелья или яда по запаху без необходимости пробовать.',
    rumorPrompt: 'В канализации под алхимическим кварталом начали находить светящихся фиолетовых крыс...'
  },
  herbalist: {
    name: 'Травник / Знахарь',
    category: 'Медицина и природа',
    statBonus: 'wis',
    tools: ['Набор травника', 'Ступка и пестик'],
    gear: ['Сушеные пучки зверобоя и омелы', 'Кинжал для срезания кореньев', 'Бинты и мази'],
    perk: 'Природная аптека: может изготовить компресс для стабилизации раненого прямо в полевых условиях.',
    rumorPrompt: 'В глубине леса травы начали увядать, а корни деревьев сочатся черной смолой...'
  },
  plague_doctor: {
    name: 'Чумной лекарь / Доктор',
    category: 'Медицина',
    statBonus: 'int',
    tools: ['Анатомический набор', 'Птичья маска с фильтром'],
    gear: ['Скальпели и пинцеты', 'Фляга с уксусом и травами', 'Тростинка для осмотра пациентов'],
    perk: 'Диагностика скверны: выявляет болезни, паразитов и магические заражения на ранней стадии.',
    rumorPrompt: 'В трущобах зафиксирована странная лихорадка, от которой кожа покрывается светящимися пятнами...'
  },
  innkeeper: {
    name: 'Трактирщик / Корчмарь',
    category: 'Услуги',
    statBonus: 'cha',
    tools: ['Инструменты пивовара', 'Счетная доска'],
    gear: ['Ключи от всех комнат', 'Дубинка под стойкой', 'Фартук со следами эля', 'Толстая записная книга постояльцев'],
    perk: 'Ухо таверны: знает последние сплетни обо всех путешественниках и наемниках в городе.',
    rumorPrompt: 'Трое подозрительных типов в плащах с капюшонами шептались о контрабанде у южных ворот...'
  },
  merchant_cloth: {
    name: 'Купец / Торговец гильдии',
    category: 'Торговля',
    statBonus: 'cha',
    tools: ['Весы торговца', 'Торговая печать'],
    gear: ['Шелковые одежды', 'Кошелек с золотыми монетами', 'Охранная грамота гильдии', 'Журнал сделок'],
    perk: 'Торговое чутье: всегда получает 10-15% скидку или наценку благодаря красноречию и связям.',
    rumorPrompt: 'Цены на железо подскочили втрое, поговаривают, что рудники на востоке захвачены гоблинами...'
  },
  smuggler: {
    name: 'Контрабандист / Скупщик',
    category: 'Теневой мир',
    statBonus: 'dex',
    tools: ['Воровские инструменты', 'Фальшивые документы'],
    gear: ['Потайной пояс с двойным дном', 'Острый кинжал', 'Темный плащ', 'Шелковая веревка с кошкой'],
    perk: 'Тайные тропы: знает скрытые ходы в канализации, потайные бухты и обходы стражи.',
    rumorPrompt: 'На следующей неделе через залив прибудет корабль с запретными артефактами из Моря Ужасов...'
  },
  thief_pickpocket: {
    name: 'Вор-карманник / Ловкач',
    category: 'Теневой мир',
    statBonus: 'dex',
    tools: ['Воровские инструменты', 'Набор для маскировки'],
    gear: ['Набор отмычек', 'Свинчатка в рукаве', 'Мешочек с шутовскими блестками для отвлечения'],
    perk: 'Ловкость пальцев: может незаметно срезать кошелек или подбросить улику в карман.',
    rumorPrompt: 'Глава городской гильдии воров объявил награду за печать судьи, выпавшую во время облавы...'
  },
  guard_captain: {
    name: 'Стражник / Патрульный',
    category: 'Закон и порядок',
    statBonus: 'str',
    tools: ['Свисток стражи', 'Жетон городской стражи'],
    gear: ['Кольчуга и гербовая накидка', 'Копье или алебарда', 'Короткий меч', 'Наручники и свисток'],
    perk: 'Власть закона: имеет право задерживать подозрительных лиц и призывать на помощь патруль.',
    rumorPrompt: 'Ночной караул у старого кладбища докладывал о странном синем свечении среди склепов...'
  },
  magistrate: {
    name: 'Судья / Магистрат',
    category: 'Закон и власть',
    statBonus: 'wis',
    tools: ['Гербовая печать суда', 'Свод законов'],
    gear: ['Мантия магистрата', 'Золотое кольцо с печатью', 'Свитки судебных постановлений', 'Охрана'],
    perk: 'Юридический иммунитет: мастерски ориентируется в городских законах, указах и правах сословий.',
    rumorPrompt: 'Один из верховных лордов тайно спонсирует запретный культ, но прямых улик пока не хватает...'
  },
  bounty_hunter: {
    name: 'Охотник за головами',
    category: 'Военное дело',
    statBonus: 'wis',
    tools: ['Набор следопыта', 'Капканы и сети'],
    gear: ['Тяжелый арбалет', 'Наручники из холодного железа', 'Свитки с ориентировками преступников'],
    perk: 'Глаз сыщика: выслеживает следы беглецов даже в густонаселенном мегаполисе.',
    rumorPrompt: 'За беглого мага-некроманта назначена награда в 500 золотых, последний раз его видели у доков...'
  },
  sailor_captain: {
    name: 'Моряк / Капитан судна',
    category: 'Морское дело',
    statBonus: 'con',
    tools: ['Навигационные инструменты', 'Подзорная труба'],
    gear: ['Абордажная сабля', 'Карта течений и рифов', 'Фляга с крепким громом', 'Компас'],
    perk: 'Морской волк: ориентируется по звездам и безошибочно предсказывает перемену погоды и штормы.',
    rumorPrompt: 'Рыбаки выловили в море обломок мачты с рунами глубоководных чудовищ...'
  },
  priest_cleric: {
    name: 'Жрец храма / Капеллан',
    category: 'Религия',
    statBonus: 'wis',
    tools: ['Священный символ', 'Книга литургий'],
    gear: ['Серебряное кадило', 'Освященная вода (2 флакона)', 'Храмовые одеяния', 'Молитвенник'],
    perk: 'Благословение веры: распознает нежить и оскверненные места, проводит погребальные обряды.',
    rumorPrompt: 'В подземельях старого собора начали самопроизвольно гаснуть освященные лампады...'
  },
  gravedigger: {
    name: 'Гробовщик / Смотритель кладбища',
    category: 'Услуги',
    statBonus: 'con',
    tools: ['Лопата и лом', 'Масляный фонарь'],
    gear: ['Тяжелые кожаные перчатки', 'Связка ключей от склепов', 'Фляга со спиртом', 'Толстая лопата'],
    perk: 'Знаток усопших: знает генеалогию захороненных родов и расположение тайных крипт.',
    rumorPrompt: 'В третьем мавзолее на прошлой неделе кто-то взломал саркофаг графа и забрал только его череп...'
  },
  scholar_sage: {
    name: 'Ученый / Книжник / Архивариус',
    category: 'Наука',
    statBonus: 'int',
    tools: ['Принадлежности для каллиграфии', 'Книги по истории'],
    gear: ['Очки в медной оправе', 'Древний фолиант в кожаном переплете', 'Свитки пергамента', 'Чернильница'],
    perk: 'Энциклопедическая память: может вспомнить редчайшие исторические факты о древних империях.',
    rumorPrompt: 'В древних хрониках города упоминается затопленный уровень под ратушей с хранилищем реликвий...'
  },
  miner: {
    name: 'Шахтер / Рудокоп',
    category: 'Ремесло и природа',
    statBonus: 'str',
    tools: ['Кирка и кувалда', 'Шахтерский фонарь'],
    gear: ['Крепкая каска', 'Связка факелов', 'Мешок с образцами руды', 'Прочная веревка'],
    perk: 'Чувство толщи: определяет устойчивость сводов пещеры и направление к выходу на слух.',
    rumorPrompt: 'В нижнем штреке шахтеры пробили стену в неестественно ровный каменный коридор с фиолетовым мхом...'
  },
  hunter_trapper: {
    name: 'Охотник / Егерь',
    category: 'Природа',
    statBonus: 'dex',
    tools: ['Капканы', 'Набор для свежевания дичи'],
    gear: ['Длинный лук со стрелами', 'Охотничий нож', 'Маскировочный плащ из шкуры волка'],
    perk: 'Чтение следов: определяет вид, вес и свежесть следов любого зверя или гуманоида.',
    rumorPrompt: 'В чащобе завелся огромный белый волк с горящими багровыми глазами, стрелы от него отскакивают...'
  },
  bard_minstrel: {
    name: 'Бард / Менестрель',
    category: 'Искусство',
    statBonus: 'cha',
    tools: ['Музыкальный инструмент (Лютня/Флейта)', 'Песенник'],
    gear: ['Яркий щегольской дублет', 'Перо на шляпе', 'Лютня с серебряными колками', 'Запасные струны'],
    perk: 'Очарование толпы: может расположить к себе публику, отвлечь внимание или собрать щедрые чаевые.',
    rumorPrompt: 'Сложили новую балладу о принцессе, которая на самом деле была подменена доппельгангером...'
  }
};

const SOCIAL_STATUS_DATA: Record<string, {
  name: string;
  wealthDesc: string;
  bonusCoins: { cp: number; sp: number; gp: number; pp: number };
  housing: string;
}> = {
  destitute: {
    name: 'Нищий / Бродяга',
    wealthDesc: 'Живет впроголодь, ночует в ночлежках или под мостом, одежда вся в заплатах.',
    bonusCoins: { cp: 15, sp: 2, gp: 0, pp: 0 },
    housing: 'Уличные переулки, заброшенные сараи'
  },
  poor: {
    name: 'Бедный обыватель / Подмастерье',
    wealthDesc: 'Сводит концы с концами, бережет каждую медную монету.',
    bonusCoins: { cp: 45, sp: 12, gp: 2, pp: 0 },
    housing: 'Комната в доходном доме или при мастерской'
  },
  middle: {
    name: 'Средний класс / Мастер',
    wealthDesc: 'Стабильный доход от ремесла или службы, добротная одежда и обувь.',
    bonusCoins: { cp: 30, sp: 40, gp: 25, pp: 0 },
    housing: 'Собственный двухэтажный дом с лавкой на первом этаже'
  },
  wealthy: {
    name: 'Зажиточный горожанин / Купец',
    wealthDesc: 'Владеет недвижимостью, носит шелка и меха, имеет слуг и охрану.',
    bonusCoins: { cp: 0, sp: 20, gp: 120, pp: 10 },
    housing: 'Каменная городская усадьба с садом'
  },
  noble: {
    name: 'Знать / Аристократ / Патриций',
    wealthDesc: 'Огромные фамильные богатства, родовые земли, драгоценности и влияние.',
    bonusCoins: { cp: 0, sp: 0, gp: 400, pp: 50 },
    housing: 'Родовое поместье или замок'
  }
};

const AGE_GROUPS_DATA: Record<string, { name: string; ageRange: string; visualDesc: string }> = {
  young: { name: 'Молодой (Юноша/Девушка)', ageRange: '17–24 года', visualDesc: 'Пылкий взгляд, быстрая походка, гладкая кожа без морщин.' },
  adult: { name: 'Зрелый (В расцвете сил)', ageRange: '25–45 лет', visualDesc: 'Уверенные движения, опытный взгляд, физически крепок.' },
  elder: { name: 'Пожилой ветеран', ageRange: '46–65 лет', visualDesc: 'Седеющие волосы, сеть морщин у глаз, размеренная речь.' },
  venerable: { name: 'Преклонный старец', ageRange: '66+ лет', visualDesc: 'Белоснежная борода/волосы, пронзительный мудрый взгляд, опирается на посох.' }
};

const ATTITUDES_DATA: Record<string, { name: string; reaction: string }> = {
  hostile: { name: 'Враждебное', reaction: 'Смотрит волком, держит руку на оружии, отвечает резко и с угрозой.' },
  suspicious: { name: 'Настороженное / Подозрительное', reaction: 'Присматривается, не доверяет чужакам, взвешивает каждое слово.' },
  neutral: { name: 'Нейтральное / Деловое', reaction: 'Готов говорить по делу, ценит свое время и выгоду.' },
  friendly: { name: 'Дружелюбное / Радушное', reaction: 'Улыбается, охотно идет на контакт, готов угостить или помочь советом.' },
  fawning: { name: 'Заискивающее / Угодливое', reaction: 'Льстит, кланяется, пытается заслужить благосклонность влиятельных героев.' }
};

const SECRETS_TABLE = [
  'Тайно состоит в культе возрождения древнего архимага.',
  'Хранит фальшивое завещание на половину городской набережной.',
  'Является бастардом известного дворянского рода и скрывает фамильный перстень.',
  'Задолжал криминальному авторитету огромную сумму золота и ищет способ сбежать.',
  'По ночам превращается в оборотня или страдает от странного лунного проклятия.',
  'Был свидетелем заказного убийства капитана стражи, но боится говорить правду.',
  'Прячет в подвале своего дома беглого эльфийского дипломата.',
  'Служит тайным информатором конкурирующей гильдии.',
  'Нашел на дне колодца древнюю реликвию, шепчущую во тьме, и никому о ней не говорит.',
  'Его настоящее имя другое — он сменил личность после побега из королевской тюрьмы.'
];

const APPEARANCE_FEATURES = [
  'Глубокий шрам на левой щеке, полученный в старой дуэли.',
  'Один глаз карий, а другой неестественно ярко-зеленый (гетерохромия).',
  'Густые татуировки в виде рун на предплечьях и кистях рук.',
  'Хриплый, прокуренный голос с легким северным акцентом.',
  'Необычайно высокий рост и широкие плечи, возвышающиеся над толпой.',
  'Всегда носит широкополую шляпу, скрывающую верхнюю часть лица.',
  'Постоянно крутит в пальцах старинное кольцо с треснувшим камнем.',
  'Пронзительный ястребиный взгляд, от которого собеседникам становится не по себе.',
  'Одет с иголочки, несмотря на пыль и грязь мостовой вокруг.',
  'Немного прихрамывает на правую ногу, опираясь на резную трость.'
];

const RACES_DATA: Record<string, {
  name: string;
  statMods: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  speed: number;
  traits: string[];
  size: string;
  names: {
    male: string[];
    female: string[];
    surnames: string[];
  };
}> = {
  human: {
    name: 'Человек',
    statMods: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    speed: 30,
    size: 'Средний',
    traits: ['Универсальность', 'Дополнительный навык', 'Выносливость'],
    names: {
      male: ['Альдрен', 'Бертрам', 'Вульфрик', 'Гарет', 'Джеймс', 'Кадвар', 'Лиам', 'Морган', 'Освальд', 'Роланд', 'Сигурд', 'Тристан', 'Эдвард', 'Яромир', 'Борис', 'Дмитрий'],
      female: ['Адель', 'Бригитта', 'Валерия', 'Гвен', 'Даниэль', 'Елена', 'Изольда', 'Кэтрин', 'Лира', 'Матильда', 'Оливия', 'Розалинда', 'Сибилла', 'Элинор', 'Юлиана'],
      surnames: ['Блэквуд', 'Винтерборн', 'Грейвс', 'Дрейквуд', 'Кроули', 'Морн', 'Нортвуд', 'Олдридж', 'Пендлтон', 'Риверс', 'Сторм', 'Торн', 'Фрост', 'Хок']
    }
  },
  elf: {
    name: 'Эльф',
    statMods: { str: 0, dex: 2, con: -1, int: 1, wis: 1, cha: 0 },
    speed: 30,
    size: 'Средний',
    traits: ['Темное зрение 60 фт', 'Обостренные чувства', 'Наследие фей (иммунитет ко сну)', 'Транс'],
    names: {
      male: ['Аэлар', 'Беливар', 'Виндис', 'Галанон', 'Дралос', 'Иллидис', 'Кэлен', 'Лорафир', 'Мириэль', 'Найло', 'Рилариэль', 'Таэлон', 'Фейлин', 'Эрион'],
      female: ['Алантэ', 'Бетрин', 'Валестра', 'Гиладриэль', 'Далария', 'Иллирия', 'Кейлет', 'Лириэль', 'Меланис', 'Найда', 'Рилин', 'Сильфира', 'Тириэль', 'Элария'],
      surnames: ['Амакиир (Цветок Самоцвета)', 'Голдблум', 'Ильфелкиир', 'Лиадон (Серебряный Лист)', 'Мелиамне', 'Найтбриз', 'Сиалодель', 'Старсикер', 'Холлоуэй']
    }
  },
  dwarf: {
    name: 'Дворф',
    statMods: { str: 1, dex: 0, con: 2, int: 0, wis: 1, cha: -1 },
    speed: 25,
    size: 'Средний',
    traits: ['Темное зрение 60 фт', 'Дворфийская стойкость (сопротивление яду)', 'Знание камня', 'Владение боевым топором и молотом'],
    names: {
      male: ['Балин', 'Броггар', 'Гимли', 'Дагнал', 'Двал', 'Килгар', 'Моргран', 'Орик', 'Рурик', 'Торден', 'Ульфар', 'Фаргрим', 'Хельгар', 'Эберк'],
      female: ['Барда', 'Брунхильда', 'Гурдис', 'Дагна', 'Ильде', 'Катра', 'Мардред', 'Ольма', 'Руна', 'Тора', 'Ульрика', 'Финна', 'Хельга', 'Эльдрид'],
      surnames: ['Айронфист', 'Бронзобородый', 'Голдмайнер', 'Дангронд', 'Каменный Щит', 'Молоторуб', 'Огненный Горн', 'Рудознатец', 'Сталекров', 'Торнберг']
    }
  },
  halfling: {
    name: 'Полурослик',
    statMods: { str: -1, dex: 2, con: 1, int: 0, wis: 0, cha: 1 },
    speed: 25,
    size: 'Маленький',
    traits: ['Везучий (переброс 1 на d20)', 'Храбрый (преимущество против испуга)', 'Проворство полуросликов'],
    names: {
      male: ['Алтон', 'Бобби', 'Коррин', 'Майло', 'Осборн', 'Перрин', 'Рид', 'Роско', 'Уэлби', 'Финдо', 'Элдон'],
      female: ['Бри', 'Верна', 'Джилли', 'Кали', 'Киди', 'Лавиния', 'Лидда', 'Мерла', 'Порция', 'Серафина', 'Шаэна'],
      surnames: ['Бочковерт', 'Брушгатер', 'Гудбаррел', 'Зеленохолм', 'Подлесный', 'Светлоног', 'Толлхил', 'Чайка']
    }
  },
  tiefling: {
    name: 'Тифлинг',
    statMods: { str: 0, dex: 0, con: 0, int: 1, wis: 0, cha: 2 },
    speed: 30,
    size: 'Средний',
    traits: ['Темное зрение 60 фт', 'Адское сопротивление (огонь)', 'Дьявольское наследие (магия огня)'],
    names: {
      male: ['Азазель', 'Бальтазар', 'Валфас', 'Дамакос', 'Карон', 'Люциан', 'Мордо', 'Семиэль', 'Терион', 'Экемон'],
      female: ['Анакис', 'Белиал', 'Каллиста', 'Лилит', 'Макария', 'Немезида', 'Орианна', 'Ривета', 'Террайя'],
      surnames: ['Арт', 'Горечь', 'Идеал', 'Мрак', 'Надежда', 'Отчаяние', 'Пепел', 'Поэзия', 'Скорбь', 'Ужас']
    }
  },
  dragonborn: {
    name: 'Драконорожденный',
    statMods: { str: 2, dex: 0, con: 0, int: 0, wis: 0, cha: 1 },
    speed: 30,
    size: 'Средний',
    traits: ['Драконье дыхание (конус/линия стихии)', 'Сопротивление драконьей стихии'],
    names: {
      male: ['Архан', 'Баласар', 'Донаар', 'Кривош', 'Медраш', 'Надир', 'Патрин', 'Рогар', 'Торин', 'Шамаш'],
      female: ['Акра', 'Бира', 'Даари', 'Кора', 'Мишна', 'Нала', 'Перра', 'Раанна', 'Сурина', 'Харисс'],
      surnames: ['Демирджян', 'Даалендор', 'Клиншар', 'Нембид', 'Норрикс', 'Тарканис', 'Шестанделар']
    }
  },
  orc: {
    name: 'Полуорк',
    statMods: { str: 2, dex: 0, con: 1, int: -1, wis: 0, cha: -1 },
    speed: 30,
    size: 'Средний',
    traits: ['Темное зрение 60 фт', 'Угрожающий вид', 'Несгибаемая стойкость (1 HP вместо 0)', 'Свирепые атаки'],
    names: {
      male: ['Вронг', 'Гарнак', 'Денч', 'Имш', 'Краг', 'Морг', 'Ронт', 'Тарок', 'Уггат', 'Фенг', 'Шагар'],
      female: ['Багги', 'Вула', 'Кангра', 'Мирка', 'Овака', 'Рута', 'Сутха', 'Улька', 'Хельга', 'Эмен'],
      surnames: ['Громобой', 'Железный Клык', 'Костедробитель', 'Кровавый Топор', 'Пеплорук', 'Череполом']
    }
  },
  gnome: {
    name: 'Гном',
    statMods: { str: -1, dex: 1, con: 1, int: 2, wis: 0, cha: 0 },
    speed: 25,
    size: 'Маленький',
    traits: ['Темное зрение 60 фт', 'Гномья хитрость (спасброски против магии)', 'Инженерное мастерство'],
    names: {
      male: ['Бингл', 'Вренн', 'Гимбл', 'Димбл', 'Зук', 'Келлен', 'Ним', 'Оррин', 'Сибо', 'Физзл'],
      female: ['Бимбл', 'Донна', 'Занна', 'Лолла', 'Мерна', 'Орла', 'Росинка', 'Тизи', 'Шамика', 'Элли'],
      surnames: ['Винтокрыл', 'Искроверт', 'Меднопружин', 'Пылепых', 'Часозвон', 'Шестеренник']
    }
  }
};

const CLASSES_DATA: Record<string, {
  name: string;
  hd: number;
  primaryStats: ('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha')[];
  proficiencies: { armor: string[]; weapons: string[]; saves: string[] };
  featuresByLevel: Record<number, string[]>;
  defaultGear: string[];
}> = {
  fighter: {
    name: 'Воин',
    hd: 10,
    primaryStats: ['str', 'con', 'dex'],
    proficiencies: {
      armor: ['Все доспехи', 'Щиты'],
      weapons: ['Все простое и воинское оружие'],
      saves: ['Сила', 'Телосложение']
    },
    featuresByLevel: {
      1: ['Боевой стиль (Оборона / Дуэлянт / Двуручное оружие)', 'Второе дыхание (1d10 + уровень HP за бонусное действие)'],
      2: ['Всплеск действий (Action Surge — дополнительное действие 1/отдых)'],
      3: ['Воинский архетип (Чемпион / Мастер боевых искусств)', 'Критический удар на 19-20'],
      5: ['Дополнительная атака (2 атаки за действие)']
    },
    defaultGear: ['Кольчужный доспех (AC 16)', 'Длинный меч (1d8/1d10) или секира', 'Тяжелый арбалет (1d10)', 'Щит (+2 AC)']
  },
  wizard: {
    name: 'Волшебник',
    hd: 6,
    primaryStats: ['int', 'con', 'dex'],
    proficiencies: {
      armor: ['Нет'],
      weapons: ['Кинжалы', 'Дротики', 'Пращи', 'Посохи', 'Легкие арбалеты'],
      saves: ['Интеллект', 'Мудрость']
    },
    featuresByLevel: {
      1: ['Использование заклинаний', 'Магическое восстановление (ячейки на коротком отдыхе)'],
      2: ['Магическая традиция (Эвокация / Иллюзия / Некромантия)'],
      3: ['Заклинания 2-го круга (Паутина, Отражения, Туманный шаг)'],
      5: ['Заклинания 3-го круга (Огненный шар, Молния, Контрзаклинание)']
    },
    defaultGear: ['Мантия ученого', 'Магический посох (1d6)', 'Книга заклинаний', 'Компонентная сумка']
  },
  rogue: {
    name: 'Плут',
    hd: 8,
    primaryStats: ['dex', 'int', 'cha'],
    proficiencies: {
      armor: ['Легкие доспехи'],
      weapons: ['Простое оружие', 'Ручные арбалеты', 'Длинные мечи', 'Рапиры', 'Короткие мечи'],
      saves: ['Ловкость', 'Интеллект']
    },
    featuresByLevel: {
      1: ['Скрытая атака (Sneak Attack +1d6)', 'Воровской жаргон', 'Компетентность (удвоенный бонус мастерства)'],
      2: ['Хитрое действие (Бонусное действие: Рывок / Отход / Засада)'],
      3: ['Архетип: Вор / Убийца / Мистический ловкач', 'Скрытая атака +2d6'],
      5: ['Невероятное уклонение (половина урона реакцией)', 'Скрытая атака +3d6']
    },
    defaultGear: ['Кожаный доспех (AC 11+DEX)', 'Рапира (1d8+DEX)', 'Два кинжала (1d4)', 'Воровские инструменты']
  },
  cleric: {
    name: 'Жрец',
    hd: 8,
    primaryStats: ['wis', 'con', 'str'],
    proficiencies: {
      armor: ['Легкие', 'Средние доспехи', 'Щиты'],
      weapons: ['Все простое оружие'],
      saves: ['Мудрость', 'Харизма']
    },
    featuresByLevel: {
      1: ['Божественный домен (Жизнь / Война / Свет)', 'Священная магия'],
      2: ['Божественный канал (1/отдых)', 'Изгнание нежити'],
      3: ['Заклинания домена 2-го круга (Духовное оружие, Молебен)'],
      5: ['Уничтожение нежити (CR 1/2)', 'Маяки веры / Стражи веры']
    },
    defaultGear: ['Чешуйчатый доспех (AC 14+DEX макс 2)', 'Булава (1d6+STR)', 'Щит со священным символом (+2 AC)']
  },
  bard: {
    name: 'Бард',
    hd: 8,
    primaryStats: ['cha', 'dex', 'con'],
    proficiencies: {
      armor: ['Легкие доспехи'],
      weapons: ['Простое оружие', 'Рапиры', 'Длинные мечи', 'Короткие мечи'],
      saves: ['Ловкость', 'Харизма']
    },
    featuresByLevel: {
      1: ['Вдохновение барда (d6)', 'Магия барда'],
      2: ['Мастер на все руки (+половина мастерства ко всем проверкам)', 'Песнь отдыха (d6 HP)'],
      3: ['Коллегия бардов (Преданий / Доблести)', 'Компетентность'],
      5: ['Вдохновение барда (d8, восстанавливается на коротком отдыхе)']
    },
    defaultGear: ['Кожаный доспех', 'Рапира', 'Лютня / Флейта', 'Набор дипломата']
  },
  ranger: {
    name: 'Следопыт',
    hd: 10,
    primaryStats: ['dex', 'wis', 'con'],
    proficiencies: {
      armor: ['Легкие', 'Средние доспехи', 'Щиты'],
      weapons: ['Простое', 'Воинское оружие'],
      saves: ['Сила', 'Ловкость']
    },
    featuresByLevel: {
      1: ['Избранный враг (Гуманоиды / Нежить / Чудовища)', 'Исследователь природы (Лес / Горы / Болота)'],
      2: ['Боевой стиль (Стрельба +2 к попаданию)', 'Магия следопыта (Метка охотника)'],
      3: ['Архетип: Охотник (Убийца колоссов) / Повелитель зверей'],
      5: ['Дополнительная атака (2 выстрела)']
    },
    defaultGear: ['Проклепанная кожа (AC 12+DEX)', 'Длинный лук (1d8+DEX, 150/600 фт)', 'Два коротких меча']
  },
  paladin: {
    name: 'Паладин',
    hd: 10,
    primaryStats: ['str', 'cha', 'con'],
    proficiencies: {
      armor: ['Все доспехи', 'Щиты'],
      weapons: ['Простое', 'Воинское оружие'],
      saves: ['Мудрость', 'Харизма']
    },
    featuresByLevel: {
      1: ['Божественное чувство (нежить/исчадия/небожители)', 'Наложение рук (Пул HP = Ур * 5)'],
      2: ['Боевой стиль', 'Божественная кара (Divine Smite +2d8+1d8/ячейка)', 'Заклинания паладина'],
      3: ['Священная клятва (Клятва Преданности / Возмездия / Древних)'],
      5: ['Дополнительная атака']
    },
    defaultGear: ['Латный или кольчужный доспех', 'Полуторный меч или боевой молот', 'Щит со священным гербом']
  },
  barbarian: {
    name: 'Варвар',
    hd: 12,
    primaryStats: ['str', 'con', 'dex'],
    proficiencies: {
      armor: ['Легкие', 'Средние доспехи', 'Щиты'],
      weapons: ['Простое', 'Воинское оружие'],
      saves: ['Сила', 'Телосложение']
    },
    featuresByLevel: {
      1: ['Ярость (+2 к урону, сопротивление дробящему/колющему/рубящему)', 'Защита без доспехов (10+DEX+CON)'],
      2: ['Безрассудная атака (преимущество на атаку ценой преимущества врагов)', 'Чувство опасности'],
      3: ['Первобытный путь (Путь Берсерка / Тотемного воина)'],
      5: ['Дополнительная атака', 'Быстрое перемещение (+10 фт к скорости)']
    },
    defaultGear: ['Двуручный топор (1d12+STR)', 'Два ручных топора (1d6)', 'Шкуры и боевой раскрас']
  },
  druid: {
    name: 'Друид',
    hd: 8,
    primaryStats: ['wis', 'con', 'dex'],
    proficiencies: {
      armor: ['Легкие', 'Средние (неметаллические)', 'Щиты (деревянные)'],
      weapons: ['Дубинки', 'Кинжалы', 'Дротики', 'Булавы', 'Боевые посохи', 'Серпы'],
      saves: ['Интеллект', 'Мудрость']
    },
    featuresByLevel: {
      1: ['Друидический язык', 'Использование заклинаний природы'],
      2: ['Дикий облик (Превращение в зверя 2/отдых)', 'Круг друидов (Круг Земли / Луны)'],
      3: ['Заклинания 2-го круга (Дубовая кора, Лунный луч, Шипы)'],
      5: ['Заклинания 3-го круга (Призыв лесных созданий, Молния)']
    },
    defaultGear: ['Кожаный доспех', 'Деревянный щит', 'Костяной серп', 'Фокусировка из омелы']
  },
  sorcerer: {
    name: 'Чародей',
    hd: 6,
    primaryStats: ['cha', 'con', 'dex'],
    proficiencies: {
      armor: ['Нет'],
      weapons: ['Кинжалы', 'Дротики', 'Пращи', 'Посохи', 'Легкие арбалеты'],
      saves: ['Телосложение', 'Харизма']
    },
    featuresByLevel: {
      1: ['Происхождение чародея (Драконья кровь / Дикая магия)', 'Врожденная магия'],
      2: ['Источник магии (Единицы чародейства, гибкая магия)'],
      3: ['Метамагия (Удвоенное заклинание, Быстрое заклинание)'],
      5: ['Заклинания 3-го круга (Огненный шар, Ускорение, Полет)']
    },
    defaultGear: ['Кинжал', 'Хрустальный фокус', 'Шелковая мантия с вышивкой']
  },
  monk: {
    name: 'Монах',
    hd: 8,
    primaryStats: ['dex', 'wis', 'con'],
    proficiencies: {
      armor: ['Нет'],
      weapons: ['Простое оружие', 'Короткие мечи'],
      saves: ['Сила', 'Ловкость']
    },
    featuresByLevel: {
      1: ['Боевые искусства (d4 урон без оружия, бонусный безоружный удар)', 'Защита без доспехов (10+DEX+WIS)'],
      2: ['Энергия Ци (Поступь ветра, Терпеливая оборона, Шквал ударов)', 'Движение без доспехов (+10 фт)'],
      3: ['Монашеская традиция (Путь Открытой Ладони / Тень / Четыре Стихии)', 'Отражение снарядов'],
      5: ['Дополнительная атака', 'Ошеломляющий удар (Stunning Strike)']
    },
    defaultGear: ['Простая туника монаха', 'Боевой посох (1d8 универсальное)', '10 дротиков']
  },
  aristocrat: {
    name: 'Аристократ (NPC)',
    hd: 8,
    primaryStats: ['cha', 'int', 'wis'],
    proficiencies: {
      armor: ['Легкие', 'Средние', 'Щиты'],
      weapons: ['Все простое и воинское оружие'],
      saves: ['Мудрость', 'Харизма']
    },
    featuresByLevel: {
      1: ['Богатство и связи', 'Командный голос (+1d4 союзнику к атаке)'],
      3: ['Личная охрана', 'Дипломатический иммунитет'],
      5: ['Влиятельный статус']
    },
    defaultGear: ['Изысканная одежда (100 gp)', 'Церемониальная рапира с инкрустацией', 'Печатка с родовым гербом', 'Кошелек с платиной и золотом']
  },
  commoner: {
    name: 'Обыватель (NPC)',
    hd: 8,
    primaryStats: ['con', 'wis', 'str'],
    proficiencies: {
      armor: ['Нет'],
      weapons: ['Дубинка'],
      saves: ['Мудрость']
    },
    featuresByLevel: {
      1: ['Ремесленный навык', 'Знание местных слухов и округи']
    },
    defaultGear: ['Рабочая одежда', 'Кинжал или дубинка', 'Мешочек с медными монетами']
  },
  expert: {
    name: 'Эксперт / Ремесленник (NPC)',
    hd: 8,
    primaryStats: ['int', 'dex', 'wis'],
    proficiencies: {
      armor: ['Легкие доспехи'],
      weapons: ['Простое оружие'],
      saves: ['Интеллект', 'Мудрость']
    },
    featuresByLevel: {
      1: ['Экспертные знания (+4 к выбранным ремеслам или наукам)', 'Оценка предметов'],
      3: ['Мастерское качество изделий', 'Быстрый ремонт']
    },
    defaultGear: ['Кожаный фартук', 'Набор ремесленных инструментов высшего качества', 'Кинжал', 'Записная книжка']
  },
  warrior: {
    name: 'Стражник / Наемник (NPC)',
    hd: 8,
    primaryStats: ['str', 'dex', 'con'],
    proficiencies: {
      armor: ['Все доспехи', 'Щиты'],
      weapons: ['Все простое и воинское оружие'],
      saves: ['Сила', 'Телосложение']
    },
    featuresByLevel: {
      1: ['Военная подготовка (+2 к атакам в строю)', 'Стойкость на посту'],
      3: ['Опыт уличных стычек'],
      5: ['Дополнительная атака']
    },
    defaultGear: ['Кольчужная рубаха (AC 13+DEX)', 'Копье или алебарда', 'Короткий меч', 'Жетон стражи']
  }
};

const ALIGNMENTS = [
  'Законно-добрый (LG)', 'Нейтрально-добрый (NG)', 'Хаотично-добрый (CG)',
  'Законно-нейтральный (LN)', 'Истинно нейтральный (N)', 'Хаотично-нейтральный (CN)',
  'Законно-злой (LE)', 'Нейтрально-злой (NE)', 'Хаотично-злой (CE)'
];

const MOTIVATIONS = [
  'Ищет искупления за давнюю трагическую ошибку.',
  'Копит золото для выкупа своего захваченного в рабство родственника.',
  'Жаждет тайных знаний древней исчезнувшей цивилизации.',
  'Стремится доказать свою доблесть и занять почетное место в гильдии.',
  'Прячется от влиятельного кредитора или наемных убийц преступного синдиката.',
  'Служит тайным шпионом местного дворянина или ордена.',
  'Ищет легендарную реликвию, упоминаемую в семейных хрониках.',
  'Хочет открыть собственную таверну или мастерскую в столице.',
  'Одержим идеей отомстить культу или монстру, разрушившему родную деревню.'
];

const QUIRKS = [
  'Постоянно подбрасывает в руке старинную медную монету.',
  'Говорит тихим, но гипнотически уверенным шепотом.',
  'Имеет заметный шрам через левую бровь и щеку.',
  'Никогда не поворачивается спиной к закрытым дверям.',
  'Любит приправлять речь поговорками на древнем наречии.',
  'Всегда тщательно проверяет еду и напитки перед употреблением.',
  'Часто насвистывает задорную матросскую или походную песенку.',
  'Носит на шее амулет из осколка метеорита или когтя грифона.'
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollD6(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function rollStat(): number {
  const rolls = [rollD6(), rollD6(), rollD6(), rollD6()].sort((a, b) => a - b);
  return rolls[1] + rolls[2] + rolls[3];
}

function getMod(val: number): number {
  return Math.floor((val - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function generateNPC(options: NPCOptions = {}): { text: string; raw: any } {
  const raceKey = (options.race || 'human').toLowerCase();
  const classKey = (options.classType || 'fighter').toLowerCase();
  const gender = (options.gender || 'male').toLowerCase();
  const level = Math.max(1, Math.min(20, Number(options.level) || 1));

  // Determine Profession
  const professionKeys = Object.keys(PROFESSIONS_DATA);
  const profKey = (options.profession && PROFESSIONS_DATA[options.profession])
    ? options.profession
    : (options.profession === 'random' || !options.profession ? randomChoice(professionKeys) : 'blacksmith');
  const profData = PROFESSIONS_DATA[profKey] || PROFESSIONS_DATA.blacksmith;

  // Determine Social Status
  const statusKeys = Object.keys(SOCIAL_STATUS_DATA);
  const statusKey = (options.socialStatus && SOCIAL_STATUS_DATA[options.socialStatus])
    ? options.socialStatus
    : (options.socialStatus === 'random' || !options.socialStatus ? randomChoice(statusKeys) : 'middle');
  const statusData = SOCIAL_STATUS_DATA[statusKey] || SOCIAL_STATUS_DATA.middle;

  // Determine Age Group
  const ageKeys = Object.keys(AGE_GROUPS_DATA);
  const ageKey = (options.ageGroup && AGE_GROUPS_DATA[options.ageGroup])
    ? options.ageGroup
    : (options.ageGroup === 'random' || !options.ageGroup ? randomChoice(ageKeys) : 'adult');
  const ageData = AGE_GROUPS_DATA[ageKey] || AGE_GROUPS_DATA.adult;

  // Determine Attitude
  const attitudeKeys = Object.keys(ATTITUDES_DATA);
  const attitudeKey = (options.attitude && ATTITUDES_DATA[options.attitude])
    ? options.attitude
    : (options.attitude === 'random' || !options.attitude ? randomChoice(attitudeKeys) : 'neutral');
  const attitudeData = ATTITUDES_DATA[attitudeKey] || ATTITUDES_DATA.neutral;

  const race = RACES_DATA[raceKey] || RACES_DATA.human;
  const cls = CLASSES_DATA[classKey] || CLASSES_DATA.fighter;

  // Generate Name
  const firstNameList = gender === 'female' ? race.names.female : race.names.male;
  const firstName = randomChoice(firstNameList);
  const surname = randomChoice(race.names.surnames);
  const fullName = `${firstName} ${surname}`;

  // Roll ability scores with priority for primary class stats
  const rolls = [rollStat(), rollStat(), rollStat(), rollStat(), rollStat(), rollStat()].sort((a, b) => b - a);
  const stats: Record<string, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const statKeys: ('str' | 'dex' | 'con' | 'int' | 'wis' | 'cha')[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

  // Assign highest to primary stats
  cls.primaryStats.forEach((st, idx) => {
    stats[st] = rolls[idx];
  });
  const remainingKeys = statKeys.filter(k => !cls.primaryStats.includes(k));
  remainingKeys.forEach((st, idx) => {
    stats[st] = rolls[cls.primaryStats.length + idx];
  });

  // Apply racial modifiers
  stats.str += race.statMods.str;
  stats.dex += race.statMods.dex;
  stats.con += race.statMods.con;
  stats.int += race.statMods.int;
  stats.wis += race.statMods.wis;
  stats.cha += race.statMods.cha;

  // Apply profession bonus (+1 to primary profession stat)
  stats[profData.statBonus] += 1;

  const profBonus = Math.floor((level - 1) / 4) + 2;

  // Calculate HP
  const conMod = getMod(stats.con);
  const hpFirstLevel = cls.hd + conMod;
  const hpSubsequent = (level - 1) * (Math.floor(cls.hd / 2) + 1 + conMod);
  const totalHp = Math.max(1, hpFirstLevel + hpSubsequent);

  // AC calculation
  const dexMod = getMod(stats.dex);
  let baseAc = 10 + dexMod;
  if (classKey === 'fighter' || classKey === 'paladin') {
    baseAc = 18; // Heavy armor + shield
  } else if (classKey === 'barbarian') {
    baseAc = 10 + dexMod + conMod;
  } else if (classKey === 'monk') {
    baseAc = 10 + dexMod + getMod(stats.wis);
  } else if (classKey === 'rogue' || classKey === 'ranger') {
    baseAc = 12 + dexMod; // Studded leather
  } else if (classKey === 'cleric' || classKey === 'warrior') {
    baseAc = 16; // Scale mail + shield
  }

  const alignment = randomChoice(ALIGNMENTS);
  const motivation = randomChoice(MOTIVATIONS);
  const quirk = randomChoice(QUIRKS);
  const secret = randomChoice(SECRETS_TABLE);
  const appearanceFeature = randomChoice(APPEARANCE_FEATURES);

  // Aggregate features up to current level
  const features: string[] = [];
  for (let lvl = 1; lvl <= level; lvl++) {
    if (cls.featuresByLevel[lvl]) {
      features.push(...cls.featuresByLevel[lvl]);
    }
  }

  // Combined equipment: Class Gear + Profession Gear + Tools
  const fullEquipment = Array.from(new Set([
    ...cls.defaultGear,
    ...profData.gear,
    ...profData.tools.map(t => `Владение: ${t}`)
  ]));

  const rawData = {
    fullName,
    race: race.name,
    classType: cls.name,
    profession: profData.name,
    professionCategory: profData.category,
    professionPerk: profData.perk,
    socialStatus: statusData.name,
    socialStatusDesc: statusData.wealthDesc,
    housing: statusData.housing,
    ageGroup: ageData.name,
    ageRange: ageData.ageRange,
    attitude: attitudeData.name,
    attitudeReaction: attitudeData.reaction,
    appearance: `${ageData.visualDesc} ${appearanceFeature}`,
    secret,
    rumor: profData.rumorPrompt,
    level,
    alignment,
    gender: gender === 'female' ? 'Женский' : 'Мужской',
    stats: {
      STR: `${stats.str} (${formatMod(getMod(stats.str))})`,
      DEX: `${stats.dex} (${formatMod(getMod(stats.dex))})`,
      CON: `${stats.con} (${formatMod(getMod(stats.con))})`,
      INT: `${stats.int} (${formatMod(getMod(stats.int))})`,
      WIS: `${stats.wis} (${formatMod(getMod(stats.wis))})`,
      CHA: `${stats.cha} (${formatMod(getMod(stats.cha))})`
    },
    hp: totalHp,
    hitDice: `${level}d${cls.hd}`,
    ac: baseAc,
    speed: `${race.speed} фт.`,
    proficiencyBonus: `+${profBonus}`,
    savingThrows: cls.proficiencies.saves.join(', '),
    racialTraits: race.traits,
    classFeatures: features,
    equipment: fullEquipment,
    purse: statusData.bonusCoins,
    motivation,
    quirk
  };

  // Formatted Output (Clean ASCII Statblock)
  const textOutput = `
╔══════════════════════════════════════════════════════════════════════╗
  ${fullName.toUpperCase()} — ${race.name} ${cls.name} (${level} уровень)
  Профессия: ${profData.name} (${profData.category})
  Статус: ${statusData.name} | Возраст: ${ageData.name} (${ageData.ageRange})
  Отношение к героям: ${attitudeData.name}
╠══════════════════════════════════════════════════════════════════════╣
  Класс Доспеха (AC): ${baseAc}
  Хиты (HP): ${totalHp} (${level}d${cls.hd}+${level * conMod})
  Скорость: ${race.speed} фт. | Бонус мастерства: +${profBonus}
  Инициатива: ${formatMod(dexMod)} | Мировоззрение: ${alignment}
╠──────────────────────────────────────────────────────────────────────╢
  ХАРАКТЕРИСТИКИ:
  СИЛ: ${stats.str.toString().padEnd(2)} (${formatMod(getMod(stats.str))})  |  ЛОВ: ${stats.dex.toString().padEnd(2)} (${formatMod(getMod(stats.dex))})  |  ТЕЛ: ${stats.con.toString().padEnd(2)} (${formatMod(getMod(stats.con))})
  ИНТ: ${stats.int.toString().padEnd(2)} (${formatMod(getMod(stats.int))})  |  МДР: ${stats.wis.toString().padEnd(2)} (${formatMod(getMod(stats.wis))})  |  ХАР: ${stats.cha.toString().padEnd(2)} (${formatMod(getMod(stats.cha))})
╠──────────────────────────────────────────────────────────────────────╢
  ПРОФЕССИЯ И НАВЫКИ:
  • Ремесло: ${profData.name} (${profData.perk})
  • Инструменты: ${profData.tools.join(', ')}
  • Жилье: ${statusData.housing}
  • Кошелек: ${statusData.bonusCoins.gp} gp, ${statusData.bonusCoins.sp} sp, ${statusData.bonusCoins.cp} cp
╠──────────────────────────────────────────────────────────────────────╢
  ВНЕШНОСТЬ И ПОВЕДЕНИЕ:
  • Внешний вид: ${ageData.visualDesc} ${appearanceFeature}
  • Поведение: ${attitudeData.reaction}
  • Личная тайна: ${secret}
  • Известный слух: ${profData.rumorPrompt}
╠──────────────────────────────────────────────────────────────────────╢
  РАСОВЫЕ ОСОБЕННОСТИ И КЛАССОВЫЕ УМЕНИЯ:
${race.traits.map(t => `  • ${t}`).join('\n')}
${features.map(f => `  • ${f}`).join('\n')}
╠──────────────────────────────────────────────────────────────────────╢
  СНАРЯЖЕНИЕ:
${fullEquipment.map(g => `  • ${g}`).join('\n')}
╠──────────────────────────────────────────────────────────────────────╢
  ЛИЧНОСТЬ:
  • Мотивация: ${motivation}
  • Особенность: ${quirk}
╚══════════════════════════════════════════════════════════════════════╝
`.trim();

  return { text: textOutput, raw: rawData };
}
