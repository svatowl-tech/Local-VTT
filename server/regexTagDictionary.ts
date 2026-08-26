/**
 * REGEX TAG DICTIONARY (СЛОВАРЬ РЕГУЛЯРНЫХ ВЫРАЖЕНИЙ)
 * 
 * Comprehensive categorization and auto-tagging patterns for:
 * 1. Карта (Maps)
 * 2. Сеты (Sets / Tilesets / Environment collections)
 * 3. Токены (Tokens / Creatures / NPCs / Classes)
 * 4. Музыка (Music / Moods / Ambience)
 * 5. Прочее (SFX / VFX Effects / Rules / Lore / Data)
 */

export interface RegexTagRule {
  id: string;
  category: 'maps' | 'sets' | 'tokens' | 'music' | 'other';
  subCategory?: string;
  tagRu: string;
  tagEn: string;
  pattern: RegExp;
  extractValue?: (match: RegExpExecArray, text: string) => string | null;
  priority?: number;
}

export interface RegexCategoryDefinition {
  id: 'maps' | 'sets' | 'tokens' | 'music' | 'other';
  titleRu: string;
  titleEn: string;
  icon: string;
  rules: RegexTagRule[];
}

// 1. КАРТЫ (MAPS) - Регулярные выражения
export const MAP_REGEX_RULES: RegexTagRule[] = [
  // Размеры сетки (Grid Dimensions)
  {
    id: 'map_dimensions',
    category: 'maps',
    subCategory: 'dimensions',
    tagRu: 'Размер',
    tagEn: 'Dimensions',
    pattern: /(?:grid|size|размер|сетка)?\s*(\d{1,3})\s*[xXхХ×_]\s*(\d{1,3})/i,
    extractValue: (match) => `${match[1]}x${match[2]}`,
    priority: 100,
  },
  {
    id: 'map_grid_sq',
    category: 'maps',
    subCategory: 'grid',
    tagRu: 'Сетка (Клетки)',
    tagEn: 'Grid',
    pattern: /\b(?:grid|gridded|gridless|hex|no-grid|nogrid|сетка|гекс|без\s*сетки)\b/i,
    extractValue: (match) => {
      const val = match[0].toLowerCase();
      if (val.includes('no') || val.includes('без')) return 'Без сетки';
      if (val.includes('hex') || val.includes('гекс')) return 'Гекс';
      return 'С сеткой';
    },
  },

  // Окружение / Биомы (Environment & Biomes)
  {
    id: 'map_dungeon',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Подземелье',
    tagEn: 'Dungeon',
    pattern: /\b(?:dungeon|crypt|catacomb|labyrinth|prison|jail|cell|vault|mine|tomb|sewer|подземел|склеп|катакомб|лабиринт|тюрьм|гробниц|шахт|канализац|сток)\b/i,
  },
  {
    id: 'map_cave',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Пещера',
    tagEn: 'Cave',
    pattern: /\b(?:cave|cavern|grotto|canyon|gorge|chasm|underdark|пещер|грот|ущел|скал|андердарк|провал)\b/i,
  },
  {
    id: 'map_forest',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Лес / Природа',
    tagEn: 'Forest',
    pattern: /\b(?:forest|woods|grove|jungle|swamp|marsh|bog|clearing|meadow|trail|path|лес|рощ|бор|джунгл|болот|полян|луг|троп|природ|чаща)\b/i,
  },
  {
    id: 'map_city',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Город / Улицы',
    tagEn: 'City',
    pattern: /\b(?:city|town|village|street|alley|square|plaza|market|bazaar|quarter|slum|город|деревн|улиц|переулок|площад|рынок|базар|квартал|трущоб)\b/i,
  },
  {
    id: 'map_tavern',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Таверна / Постоялый двор',
    tagEn: 'Tavern',
    pattern: /\b(?:tavern|inn|pub|saloon|bar|brewery|hostel|таверн|трактир|кабак|бар|постоял|пивовар)\b/i,
  },
  {
    id: 'map_castle',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Замок / Крепость',
    tagEn: 'Castle',
    pattern: /\b(?:castle|fortress|fort|citadel|keep|palace|bastion|tower|stronghold|mansion|estate|замок|крепост|форт|цитадел|дворец|бастион|башня|поместь|особняк)\b/i,
  },
  {
    id: 'map_ruins',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Руины / Храм',
    tagEn: 'Ruins',
    pattern: /\b(?:ruin|ruins|temple|shrine|sanctuary|altar|ancient|monument|pyramid|руин|развалин|храм|святилищ|алтар|древн|пирамид)\b/i,
  },
  {
    id: 'map_water',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Море / Остров / Корабль',
    tagEn: 'Water & Ships',
    pattern: /\b(?:sea|ocean|coast|beach|shore|island|river|lake|dock|pier|harbor|ship|boat|vessel|pirate|вод|мор|океан|берег|пляж|остров|рек|озер|пристан|порт|корабл|судно|пират)\b/i,
  },
  {
    id: 'map_desert',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Пустыня / Пустошь',
    tagEn: 'Desert',
    pattern: /\b(?:desert|dunes|oasis|wasteland|badlands|arid|sand|пустын|дюн|оазис|пустош|песк)\b/i,
  },
  {
    id: 'map_winter',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Зима / Снег / Лед',
    tagEn: 'Winter',
    pattern: /\b(?:winter|snow|ice|frozen|glacier|tundra|arctic|blizzard|frost|зима|снег|лед|ледяной|ледник|тундр|арктик|мороз|метел)\b/i,
  },
  {
    id: 'map_scifi',
    category: 'maps',
    subCategory: 'biome',
    tagRu: 'Sci-Fi / Киберпанк / Космос',
    tagEn: 'Sci-Fi',
    pattern: /\b(?:scifi|sci-fi|space|spaceship|station|cyberpunk|cyber|neon|matrix|starship|hangar|lab|laboratory|reactor|космос|станци|кораблестро|кибер|неон|лаборатор|реактор|ангар)\b/i,
  },
  {
    id: 'map_boss',
    category: 'maps',
    subCategory: 'feature',
    tagRu: 'Арена Босса',
    tagEn: 'Boss Arena',
    pattern: /\b(?:boss|arena|lair|throne|colosseum|duel|босс|арен|логово|трон|колизей|схватка|финал)\b/i,
  },

  // Освещение и время суток (Lighting & Weather)
  {
    id: 'map_day',
    category: 'maps',
    subCategory: 'time',
    tagRu: 'День',
    tagEn: 'Day',
    pattern: /\b(?:day|daylight|noon|sunny|morning|день|дневн|утро|солнечн)\b/i,
  },
  {
    id: 'map_night',
    category: 'maps',
    subCategory: 'time',
    tagRu: 'Ночь / Тьма',
    tagEn: 'Night',
    pattern: /\b(?:night|dark|moon|midnight|nocturnal|ночь|ночн|тьма|темнота|полночь|лун)\b/i,
  },
  {
    id: 'map_sunset',
    category: 'maps',
    subCategory: 'time',
    tagRu: 'Закат / Рассвет',
    tagEn: 'Sunset / Dawn',
    pattern: /\b(?:sunset|dusk|dawn|sunrise|twilight|закат|рассвет|сумерк)\b/i,
  },
  {
    id: 'map_weather_rain',
    category: 'maps',
    subCategory: 'weather',
    tagRu: 'Дождь / Шторм',
    tagEn: 'Rain & Storm',
    pattern: /\b(?:rain|storm|thunder|lightning|fog|mist|дожд|шторм|гроз|молни|туман|сырост)\b/i,
  },

  // Уровни и этажи (Floors & Levels)
  {
    id: 'map_floor_level',
    category: 'maps',
    subCategory: 'level',
    tagRu: 'Этаж',
    tagEn: 'Floor / Level',
    pattern: /\b(?:floor|level|этаж|уровень|sublevel|basement|roof|подвал|крыша)\s*([0-9a-z_-]+)?\b/i,
    extractValue: (match) => match[0],
  },
  {
    id: 'map_animated',
    category: 'maps',
    subCategory: 'media',
    tagRu: 'Анимированная карта',
    tagEn: 'Animated Map',
    pattern: /\b(?:animated|webm|mp4|video|видео|анимац|живая)\b/i,
  },
];

// 2. СЕТЫ / НАБОРЫ (SETS / TILESETS / PACKS) - Регулярные выражения
export const SET_REGEX_RULES: RegexTagRule[] = [
  {
    id: 'set_tileset',
    category: 'sets',
    subCategory: 'type',
    tagRu: 'Тайлы / Модульный сет',
    tagEn: 'Tileset / Modular',
    pattern: /\b(?:tileset|tile|modular|pack|kit|builder|конструктор|модульн|тайлы|набор|пак)\b/i,
  },
  {
    id: 'set_dungeon_pack',
    category: 'sets',
    subCategory: 'theme',
    tagRu: 'Сет Подземелья',
    tagEn: 'Dungeon Set',
    pattern: /\b(?:dungeon[_-]?pack|dungeon[_-]?tiles|crypt[_-]?kit|катакомб[_-]?сет|данж[_-]?пак)\b/i,
  },
  {
    id: 'set_city_pack',
    category: 'sets',
    subCategory: 'theme',
    tagRu: 'Городской сет / Здания',
    tagEn: 'City & Buildings Set',
    pattern: /\b(?:city[_-]?pack|building[_-]?kit|house[_-]?pack|город[_-]?пак|здани[_-]?сет|дома[_-]?пак)\b/i,
  },
  {
    id: 'set_nature_pack',
    category: 'sets',
    subCategory: 'theme',
    tagRu: 'Природный сет / Террейн',
    tagEn: 'Nature & Terrain Set',
    pattern: /\b(?:nature[_-]?pack|forest[_-]?kit|terrain[_-]?pack|лес[_-]?пак|ландшафт|террейн)\b/i,
  },
  {
    id: 'set_scifi_pack',
    category: 'sets',
    subCategory: 'theme',
    tagRu: 'Sci-Fi сет / Коридоры',
    tagEn: 'Sci-Fi Corridor Set',
    pattern: /\b(?:scifi[_-]?pack|spaceship[_-]?kit|cyber[_-]?pack|космо[_-]?пак|кибер[_-]?сет)\b/i,
  },
  {
    id: 'set_isometric',
    category: 'sets',
    subCategory: 'style',
    tagRu: 'Изометрический сет',
    tagEn: 'Isometric Set',
    pattern: /\b(?:iso|isometric|изометри)\b/i,
  },
  {
    id: 'set_furniture_pack',
    category: 'sets',
    subCategory: 'props',
    tagRu: 'Мебель и Интерьер',
    tagEn: 'Furniture & Interior Pack',
    pattern: /\b(?:furniture|interior|decor|props[_-]?pack|мебел|интерьер|декор[_-]?пак)\b/i,
  },
];

// 3. ТОКЕНЫ (TOKENS / MONSTERS / NPCS / CLASSES) - Регулярные выражения
export const TOKEN_REGEX_RULES: RegexTagRule[] = [
  // Классы персонажей (PC Classes)
  {
    id: 'token_warrior',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Воин / Рыцарь / Варвар',
    tagEn: 'Warrior / Barbarian',
    pattern: /\b(?:fighter|warrior|knight|barbarian|soldier|guard|champion|gladiator|воин|рыцарь|варвар|солдат|страж|стражник|гладиатор)\b/i,
  },
  {
    id: 'token_mage',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Маг / Волшебник / Колдун',
    tagEn: 'Wizard / Mage / Warlock',
    pattern: /\b(?:wizard|mage|sorcerer|warlock|necromancer|archmage|witch|маг|волшебник|колдун|чародей|некромант|ведьма|архимаг)\b/i,
  },
  {
    id: 'token_rogue',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Плут / Ассасин / Вор',
    tagEn: 'Rogue / Assassin',
    pattern: /\b(?:rogue|thief|assassin|scoundrel|shadow|spy|плут|вор|убийца|ассасин|шпион|тень)\b/i,
  },
  {
    id: 'token_cleric',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Жрец / Паладин / Священник',
    tagEn: 'Cleric / Paladin',
    pattern: /\b(?:cleric|priest|paladin|crusader|templar|healer|holy|жрец|священник|паладин|крестоносец|храмовник|целитель)\b/i,
  },
  {
    id: 'token_ranger',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Следопыт / Лучник / Друид',
    tagEn: 'Ranger / Druid / Archer',
    pattern: /\b(?:ranger|archer|hunter|druid|shaman|scout|следопыт|лучник|охотник|друид|шаман|разведчик)\b/i,
  },
  {
    id: 'token_bard_monk',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Бард / Монах / Артист',
    tagEn: 'Bard / Monk',
    pattern: /\b(?:bard|monk|minstrel|entertainer|martial|бард|монах|менестрель|артист)\b/i,
  },
  {
    id: 'token_cyber_roles',
    category: 'tokens',
    subCategory: 'class',
    tagRu: 'Соло / Нетраннер / Фиксер / Техник',
    tagEn: 'Solo / Netrunner / Fixer / Tech',
    pattern: /\b(?:solo|netrunner|fixer|tech|rockerboy|nomad|cop|medtech|соло|нетраннер|фиксер|техник|рокер|номад|коп)\b/i,
  },

  // Монстры и существа (Monsters & Creatures)
  {
    id: 'token_undead',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Нежить',
    tagEn: 'Undead',
    pattern: /\b(?:undead|skeleton|zombie|lich|vampire|wraith|ghost|specter|ghoul|wight|mummy|dracolich|нежит|скелет|зомби|лич|вампир|призрак|упырь|гуль|мумия|драколич)\b/i,
  },
  {
    id: 'token_dragon',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Дракон',
    tagEn: 'Dragon',
    pattern: /\b(?:dragon|drake|wyrm|wyvern|draconic|дракон|виверн|змий|драконид)\b/i,
  },
  {
    id: 'token_fiend',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Демон / Дьявол / Исчадие',
    tagEn: 'Fiend / Demon / Devil',
    pattern: /\b(?:demon|devil|fiend|imp|succubus|incubus|hellhound|pit[_-]?fiend|balor|демон|дьявол|бес|исчадие|суккуб|инкуб|цербер)\b/i,
  },
  {
    id: 'token_beast',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Зверь / Животное',
    tagEn: 'Beast',
    pattern: /\b(?:wolf|bear|spider|snake|boar|rat|bat|lion|tiger|horse|beast|волк|медведь|паук|змея|кабан|крыса|летучая\s*мышь|лев|тигр|лошадь|зверь|животное)\b/i,
  },
  {
    id: 'token_goblinoid',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Гоблины / Орки / Кобольды',
    tagEn: 'Goblinoid / Orc',
    pattern: /\b(?:goblin|orc|hobgoblin|bugbear|kobold|troll|ogre|гоблин|орк|хобгоблин|кобольд|тролль|огр|багбир)\b/i,
  },
  {
    id: 'token_aberration',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Аберрация / Иллитид / Бехолдер',
    tagEn: 'Aberration / Eldritch',
    pattern: /\b(?:aberration|beholder|mind[_-]?flayer|illithid|cthulhu|eldritch|tentacle|aboleth|аберраци|бехолдер|иллитид|ктулху|щупальц|аболет|мистик)\b/i,
  },
  {
    id: 'token_elemental',
    category: 'tokens',
    subCategory: 'monster_type',
    tagRu: 'Элементаль / Голем / Конструкт',
    tagEn: 'Elemental / Golem',
    pattern: /\b(?:elemental|golem|construct|robot|mech|automaton|элементал|голем|конструкт|робот|мех|автоматон)\b/i,
  },

  // Размеры токенов (Token Sizes)
  {
    id: 'token_size_tiny',
    category: 'tokens',
    subCategory: 'size',
    tagRu: 'Крошечный (Tiny)',
    tagEn: 'Tiny',
    pattern: /\b(?:tiny|крошечн)\b/i,
  },
  {
    id: 'token_size_small',
    category: 'tokens',
    subCategory: 'size',
    tagRu: 'Маленький (Small)',
    tagEn: 'Small',
    pattern: /\b(?:small|маленьк)\b/i,
  },
  {
    id: 'token_size_medium',
    category: 'tokens',
    subCategory: 'size',
    tagRu: 'Средний (Medium)',
    tagEn: 'Medium',
    pattern: /\b(?:medium|средн)\b/i,
  },
  {
    id: 'token_size_large',
    category: 'tokens',
    subCategory: 'size',
    tagRu: 'Большой (Large)',
    tagEn: 'Large',
    pattern: /\b(?:large|больш)\b/i,
  },
  {
    id: 'token_size_huge',
    category: 'tokens',
    subCategory: 'size',
    tagRu: 'Огромный (Huge)',
    tagEn: 'Huge',
    pattern: /\b(?:huge|огромн)\b/i,
  },
  {
    id: 'token_size_gargantuan',
    category: 'tokens',
    subCategory: 'size',
    tagRu: 'Исполинский (Gargantuan)',
    tagEn: 'Gargantuan',
    pattern: /\b(?:gargantuan|исполин|колосс)\b/i,
  },

  // Тип рамки / Оформление токена (Token Framing)
  {
    id: 'token_frame_topdown',
    category: 'tokens',
    subCategory: 'frame',
    tagRu: 'Top-Down токен',
    tagEn: 'Top-Down Token',
    pattern: /\b(?:topdown|top-down|вид\s*сверху)\b/i,
  },
  {
    id: 'token_frame_bordered',
    category: 'tokens',
    subCategory: 'frame',
    tagRu: 'Круглый токен с рамкой',
    tagEn: 'Bordered Token',
    pattern: /\b(?:bordered|round|circle|portrait|портрет|круглый|рамк)\b/i,
  },
];

// 4. МУЗЫКА (MUSIC / SOUNDTRACKS / AMBIENCE) - Регулярные выражения
export const MUSIC_REGEX_RULES: RegexTagRule[] = [
  // Настроение и тон (Mood & Energy)
  {
    id: 'music_combat',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Битва / Сражение',
    tagEn: 'Combat / Battle',
    pattern: /\b(?:combat|battle|fight|clash|war|action|skirmish|бой|битв|сражен|атак|война|схватка)\b/i,
  },
  {
    id: 'music_boss',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Босс / Эпическая схватка',
    tagEn: 'Boss Fight / Epic',
    pattern: /\b(?:boss|epic|climax|final|overlord|nemesis|босс|эпик|финал|владык)\b/i,
  },
  {
    id: 'music_tavern',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Таверна / Праздник / Веселье',
    tagEn: 'Tavern / Festive',
    pattern: /\b(?:tavern|inn|folk|feast|party|celebration|drinking|dance|таверн|трактир|пир|праздник|пляск|гулянк)\b/i,
  },
  {
    id: 'music_exploration',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Исследование / Путешествие',
    tagEn: 'Exploration / Travel',
    pattern: /\b(?:exploration|explore|journey|travel|adventure|road|wanderer|исследован|путешеств|странств|дорог|поход)\b/i,
  },
  {
    id: 'music_horror',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Хоррор / Ужас / Мрак',
    tagEn: 'Horror / Creepy',
    pattern: /\b(?:horror|creepy|scary|eerie|dark|spooky|dread|fear|ужас|хоррор|страх|жутк|мрак|тьма|кошмар)\b/i,
  },
  {
    id: 'music_suspense',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Саспенс / Тайна / Скрытность',
    tagEn: 'Suspense / Stealth / Mystery',
    pattern: /\b(?:suspense|stealth|mystery|tension|sneak|infiltrat|саспенс|напряжен|скрытн|тайна|шпионаж|засад)\b/i,
  },
  {
    id: 'music_ambient',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Эмбиент / Фоновый звук',
    tagEn: 'Ambient / Background',
    pattern: /\b(?:ambient|atmosphere|drone|chill|relax|calm|peaceful|эмбиент|атмосфер|покой|спокойн|тишин|релакс)\b/i,
  },
  {
    id: 'music_dungeon_sound',
    category: 'music',
    subCategory: 'mood',
    tagRu: 'Подземелье / Эхо',
    tagEn: 'Dungeon Ambience',
    pattern: /\b(?:dungeon|crypt|catacomb|cave|underground|подземел|склеп|катакомб|пещер|глубин)\b/i,
  },
  {
    id: 'music_cyberpunk',
    category: 'music',
    subCategory: 'genre',
    tagRu: 'Киберпанк / Синтвейв',
    tagEn: 'Cyberpunk / Synthwave',
    pattern: /\b(?:cyberpunk|synthwave|synth|retrowave|techno|electronic|киберпанк|синтвейв|синт|электро)\b/i,
  },
  {
    id: 'music_orchestral',
    category: 'music',
    subCategory: 'genre',
    tagRu: 'Оркестровая музыка',
    tagEn: 'Orchestral',
    pattern: /\b(?:orchestral|symphon|orchestra|choir|string|оркестр|симфон|хор|струнн)\b/i,
  },
];

// 5. ПРОЧЕЕ (SFX, VFX ЭФФЕКТЫ, ПРАВИЛА, ЛОР, ДАННЫЕ) - Регулярные выражения
export const OTHER_REGEX_RULES: RegexTagRule[] = [
  // Звуковые эффекты (SFX)
  {
    id: 'sfx_combat',
    category: 'other',
    subCategory: 'sfx',
    tagRu: 'SFX: Удар / Меч / Оружие',
    tagEn: 'SFX: Combat Hit',
    pattern: /\b(?:hit|slash|sword|blade|impact|punch|strike|shield|bash|удар|меч|клинок|взмах|щит)\b/i,
  },
  {
    id: 'sfx_magic',
    category: 'other',
    subCategory: 'sfx',
    tagRu: 'SFX: Заклинание / Магия',
    tagEn: 'SFX: Spellcast / Magic',
    pattern: /\b(?:spell|cast|magic|zap|blast|rune|enchant|магия|заклинани|вспышка|чары|каст)\b/i,
  },
  {
    id: 'sfx_fire_explosion',
    category: 'other',
    subCategory: 'sfx',
    tagRu: 'SFX: Взрыв / Огонь',
    tagEn: 'SFX: Explosion / Fire',
    pattern: /\b(?:explosion|boom|blast|fireball|burn|flame|взрыв|огонь|пламя|бабах|грохот)\b/i,
  },
  {
    id: 'sfx_monsters',
    category: 'other',
    subCategory: 'sfx',
    tagRu: 'SFX: Рев монстра / Рык',
    tagEn: 'SFX: Monster Roar',
    pattern: /\b(?:roar|growl|screech|howl|monster[_-]?sfx|рык|рев|вой|визг|шипение)\b/i,
  },
  {
    id: 'sfx_environment',
    category: 'other',
    subCategory: 'sfx',
    tagRu: 'SFX: Окружение / Двери / Шаги',
    tagEn: 'SFX: Steps & Doors',
    pattern: /\b(?:door|creak|step|footstep|wind|rain|water[_-]?splash|дверь|скрип|шаги|ветер|всплеск|капли)\b/i,
  },

  // Анимированные видео-эффекты (VFX)
  {
    id: 'vfx_fire',
    category: 'other',
    subCategory: 'vfx',
    tagRu: 'VFX: Огонь / Пламя',
    tagEn: 'VFX: Fire',
    pattern: /\b(?:fire|flame|torch|bonfire|inferno|пламя|огонь|костер|факел)\b/i,
  },
  {
    id: 'vfx_portal',
    category: 'other',
    subCategory: 'vfx',
    tagRu: 'VFX: Портал / Руны / Телепорт',
    tagEn: 'VFX: Portal & Runes',
    pattern: /\b(?:portal|teleport|rune|vortex|gateway|портал|телепорт|руны|вихрь|врата)\b/i,
  },
  {
    id: 'vfx_weather',
    category: 'other',
    subCategory: 'vfx',
    tagRu: 'VFX: Погода / Дождь / Молния / Снег',
    tagEn: 'VFX: Weather & Lightning',
    pattern: /\b(?:rain|lightning|storm|snow|blizzard|fog|smoke|дождь|молния|снег|метель|дым|туман)\b/i,
  },
  {
    id: 'vfx_spells',
    category: 'other',
    subCategory: 'vfx',
    tagRu: 'VFX: Магический спелл / Аура',
    tagEn: 'VFX: Spell / Aura',
    pattern: /\b(?:spell|aura|shield|beam|blast|heal|аура|щит|луч|лечение|исцеление)\b/i,
  },

  // Механики TTRPG и правила (Rules & Mechanics)
  {
    id: 'rule_cr',
    category: 'other',
    subCategory: 'rules',
    tagRu: 'Опасность (CR)',
    tagEn: 'Challenge Rating (CR)',
    pattern: /\b(?:cr|опасность)\s*([0-9/]+)\b/i,
    extractValue: (match) => `CR ${match[1]}`,
  },
  {
    id: 'rule_spell_level',
    category: 'other',
    subCategory: 'rules',
    tagRu: 'Круг заклинания',
    tagEn: 'Spell Level',
    pattern: /(?:(\d+)\s*(?:круг|level|lvl|th level)|(?:cantrip|заговор))/i,
    extractValue: (match) => match[0],
  },
  {
    id: 'rule_statblock',
    category: 'other',
    subCategory: 'rules',
    tagRu: 'Статблок / Монстр',
    tagEn: 'Statblock',
    pattern: /\b(?:statblock|bestiary|monster[_-]?entry|статблок|бестиарий|монстр[_-]?карточка)\b/i,
  },
  {
    id: 'rule_item',
    category: 'other',
    subCategory: 'rules',
    tagRu: 'Предмет / Экипировка / Оружие',
    tagEn: 'Item / Gear',
    pattern: /\b(?:item|weapon|armor|potion|scroll|artifact|loot|предмет|оружие|броня|зелье|свиток|артефакт|лут)\b/i,
  },

  // Лор и Вселенные (Lore & Worlds)
  {
    id: 'lore_faerun',
    category: 'other',
    subCategory: 'lore',
    tagRu: 'Лор: Забытые Королевства (Faerûn)',
    tagEn: 'Lore: Forgotten Realms',
    pattern: /\b(?:faerun|faerûn|waterdeep|baldurs\s*gate|neverwinter|sword\s*coast|торуил|фаэрун|глубоководье|врата\s*балдура|невервинтер)\b/i,
  },
  {
    id: 'lore_cyberpunk',
    category: 'other',
    subCategory: 'lore',
    tagRu: 'Лор: Найт-Сити (Cyberpunk)',
    tagEn: 'Lore: Night City',
    pattern: /\b(?:night\s*city|arasaka|militech|corpo|edgerunner|найт[_-]?сити|арасака|милитех|корпо|эджраннер)\b/i,
  },
  {
    id: 'lore_cthulhu',
    category: 'other',
    subCategory: 'lore',
    tagRu: 'Лор: Зов Ктулху / Мифы Лавкрафта',
    tagEn: 'Lore: Cthulhu Mythos',
    pattern: /\b(?:arkham|cthulhu|necronomicon|innsmouth|miskatonic|аркхем|ктулху|некрономикон|иннсмут|мискатоник)\b/i,
  },
  {
    id: 'lore_faction',
    category: 'other',
    subCategory: 'lore',
    tagRu: 'Фракция / Гильдия / Культ',
    tagEn: 'Faction / Guild / Cult',
    pattern: /\b(?:faction|guild|cult|order|syndicate|clan|house|фракция|гильдия|культ|орден|синдикат|клан|дом)\b/i,
  },

  // Данные и Сохранения (Data)
  {
    id: 'data_session',
    category: 'other',
    subCategory: 'data',
    tagRu: 'Сохранение сессии',
    tagEn: 'Session Save',
    pattern: /\b(?:session|backup|save[_-]?state|сессия|сохранение|бэкап)\b/i,
  },
];

// Объединенный реестр всех правил
export const ALL_REGEX_RULES: RegexTagRule[] = [
  ...MAP_REGEX_RULES,
  ...SET_REGEX_RULES,
  ...TOKEN_REGEX_RULES,
  ...MUSIC_REGEX_RULES,
  ...OTHER_REGEX_RULES,
];

// Категории с метаданными
export const CATEGORY_DEFINITIONS: Record<string, RegexCategoryDefinition> = {
  maps: {
    id: 'maps',
    titleRu: 'Карты',
    titleEn: 'Maps',
    icon: 'Map',
    rules: MAP_REGEX_RULES,
  },
  sets: {
    id: 'sets',
    titleRu: 'Сеты',
    titleEn: 'Sets',
    icon: 'Layers',
    rules: SET_REGEX_RULES,
  },
  tokens: {
    id: 'tokens',
    titleRu: 'Токены',
    titleEn: 'Tokens',
    icon: 'Users',
    rules: TOKEN_REGEX_RULES,
  },
  music: {
    id: 'music',
    titleRu: 'Музыка',
    titleEn: 'Music',
    icon: 'Music',
    rules: MUSIC_REGEX_RULES,
  },
  other: {
    id: 'other',
    titleRu: 'Прочее',
    titleEn: 'Other',
    icon: 'FolderArchive',
    rules: OTHER_REGEX_RULES,
  },
};
