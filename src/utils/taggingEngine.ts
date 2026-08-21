/**
 * TTRPG Smart Tagging Engine
 * Automatically analyzes resource names (maps, props, audio, SFX) and assigns tags
 * based on a comprehensive dictionary of synonyms and spelling variants in Russian and English.
 */

export function autoTagResource(name: string, category?: string): string[] {
  const tags: string[] = [];
  const text = (name + ' ' + (category || '')).toLowerCase();

  // 1. Combat / Бой / Сражение
  const combatKeys = [
    'бой', 'битв', 'сражен', 'дуэл', 'арен', 'атак', 'меч', 'удар', 'войн', 'конфликт', 'босс', 'драк', 'сеч', 'стыч', 'натиск', 'ярост', 'экшен', 'раунд', 'инициатив', 'рыцар', 'секир', 'стрел', 'лук', 'щит', 'копь', 'секира', 'алебард',
    'combat', 'battle', 'fight', 'duel', 'arena', 'blood', 'attack', 'sword', 'hit', 'slash', 'strike', 'war', 'boss', 'skirmish', 'conflict', 'brawl', 'action', 'fury', 'initiative', 'knight', 'shield', 'arrow', 'bow', 'spear', 'gladiator', 'clash'
  ];
  if (combatKeys.some(k => text.includes(k))) {
    tags.push('Бой', 'Combat');
  }

  // 2. Dungeon / Подземелье
  const dungeonKeys = [
    'подземел', 'данж', 'склеп', 'лабиринт', 'катакомб', 'тюрьм', 'камер', 'решетк', 'пыточн', 'саркофаг', 'гробниц', 'заточен', 'шахт',
    'dungeon', 'crypt', 'labyrinth', 'catacomb', 'prison', 'cell', 'grate', 'torture', 'sarcophagus', 'tomb', 'jail', 'mine', 'vault'
  ];
  if (dungeonKeys.some(k => text.includes(k))) {
    tags.push('Подземелье', 'Dungeon');
  }

  // 3. Forest / Nature / Лес / Природа
  const natureKeys = [
    'лес', 'природ', 'дерев', 'рощ', 'бор', 'джунгл', 'болот', 'полян', 'луг', 'трава', 'куст', 'сад', 'парк', 'троп', 'ветка', 'листв', 'дубрава', 'тайга',
    'forest', 'nature', 'tree', 'grove', 'woods', 'jungle', 'swamp', 'clearing', 'meadow', 'grass', 'bush', 'garden', 'park', 'trail', 'path', 'branch', 'foliage', 'swampy', 'marsh'
  ];
  if (natureKeys.some(k => text.includes(k))) {
    tags.push('Природа', 'Лес', 'Nature');
  }

  // 4. Town / City / Город / Улица / Урбан
  const townKeys = [
    'город', 'улиц', 'площад', 'здан', 'дом', 'рынок', 'базар', 'ратуш', 'мостовая', 'переулок', 'квартал', 'кабак', 'лавка', 'кузниц', 'магазин',
    'town', 'city', 'street', 'square', 'building', 'house', 'market', 'bazaar', 'plaza', 'alley', 'quarter', 'tavern', 'shop', 'forge', 'smithy'
  ];
  if (townKeys.some(k => text.includes(k))) {
    tags.push('Город', 'Town');
  }

  // 5. Tavern / Peace / Peaceful / Таверна / Мирный / Отдых
  const tavernKeys = [
    'таверн', 'пир', 'трактир', 'эль', 'пиво', 'кружк', 'весел', 'люди', 'мирн', 'отдых', 'сон', 'деревн', 'очаг', 'камин', 'разговор',
    'tavern', 'feast', 'inn', 'ale', 'beer', 'mug', 'cheer', 'peaceful', 'rest', 'sleep', 'village', 'hearth', 'fireplace', 'chat', 'cozy'
  ];
  if (tavernKeys.some(k => text.includes(k))) {
    tags.push('Мирный', 'Таверна', 'Tavern');
  }

  // 6. Water / Ocean / Sea / Вода / Море / Океан / Река / Озеро
  const waterKeys = [
    'вод', 'мор', 'океан', 'рек', 'озер', 'ручей', 'водопад', 'берег', 'пляж', 'пристан', 'порт', 'корабл', 'судно', 'парус', 'пират', 'шторм', 'буря', 'волна', 'глубин', 'бездна', 'остров',
    'water', 'ocean', 'sea', 'river', 'lake', 'stream', 'waterfall', 'coast', 'beach', 'pier', 'port', 'ship', 'boat', 'sail', 'pirate', 'storm', 'wave', 'deep', 'abyss', 'island'
  ];
  if (waterKeys.some(k => text.includes(k))) {
    tags.push('Вода', 'Море', 'Water');
  }

  // 7. Magic / Mystery / Магия / Волшебство / Мистика / Руны
  const magicKeys = [
    'маги', 'волшеб', 'колдов', 'заклин', 'ритуал', 'пентаграмм', 'рун', 'портал', 'алтар', 'астрал', 'кристалл', 'сфер', 'иллюзи', 'чародей', 'ведьм', 'некроман',
    'magic', 'spell', 'wizard', 'ritual', 'pentagram', 'rune', 'portal', 'altar', 'astral', 'crystal', 'sphere', 'illusion', 'sorcerer', 'witch', 'necromancy', 'enchant'
  ];
  if (magicKeys.some(k => text.includes(k))) {
    tags.push('Магия', 'Мистика', 'Magic');
  }

  // 8. Fire / Inferno / Hell / Огонь / Пламя / Ад / Лава
  const fireKeys = [
    'огон', 'пламя', 'костер', 'печ', 'лава', 'ад', 'преисподн', 'вулкан', 'пепел', 'угол', 'факел', 'искра',
    'fire', 'flame', 'bonfire', 'furnace', 'lava', 'hell', 'inferno', 'volcano', 'ash', 'coal', 'torch', 'spark', 'burn'
  ];
  if (fireKeys.some(k => text.includes(k))) {
    tags.push('Огонь', 'Пламя', 'Fire');
  }

  // 9. Space / Sci-Fi / Космос / Фантастика / Звезды
  const scifiKeys = [
    'космос', 'звезд', 'планет', 'корабль', 'кибер', 'лазер', 'нло', 'галактик', 'орбит', 'скафандр', 'техно',
    'space', 'star', 'planet', 'cyber', 'laser', 'ufo', 'galaxy', 'orbit', 'spacesuit', 'techno', 'sci-fi', 'futuristic'
  ];
  if (scifiKeys.some(k => text.includes(k))) {
    tags.push('Космос', 'Sci-Fi');
  }

  // 10. Horror / Death / Ужас / Хоррор / Смерть / Страх / Тьма
  const horrorKeys = [
    'ужас', 'хоррор', 'смерт', 'страх', 'тьма', 'призрак', 'зомби', 'мертв', 'скелет', 'чудовищ', 'монстр', 'вампир', 'оборотень', 'пугающ', 'крик', 'кров', 'убийств', 'кладбищ', 'могил',
    'horror', 'death', 'fear', 'darkness', 'ghost', 'zombie', 'dead', 'skeleton', 'monster', 'beast', 'vampire', 'werewolf', 'creepy', 'scream', 'blood', 'murder', 'cemetery', 'grave', 'haunted'
  ];
  if (horrorKeys.some(k => text.includes(k))) {
    tags.push('Ужас', 'Смерть', 'Horror');
  }

  // 11. Weather / Atmosphere / Погода / Атмосфера / Гром / Дождь / Ветер / Туман
  const weatherKeys = [
    'погод', 'атмосфер', 'гром', 'дожд', 'ветер', 'туман', 'облак', 'гроза', 'ураган', 'ливень', 'сырост', 'сквозняк', 'эхо',
    'weather', 'atmosphere', 'thunder', 'rain', 'wind', 'fog', 'cloud', 'lightning', 'storm', 'hurricane', 'mist', 'damp', 'echo'
  ];
  if (weatherKeys.some(k => text.includes(k))) {
    tags.push('Атмосфера', 'Погода', 'Weather');
  }

  // 12. Winter / Ice / Snow / Холод / Зима / Лед / Снег / Метель / Мороз
  const winterKeys = [
    'холод', 'зима', 'лед', 'снег', 'метел', 'мороз', 'вьюга', 'айсберг', 'замороз', 'иней',
    'cold', 'winter', 'ice', 'snow', 'blizzard', 'frost', 'snowstorm', 'iceberg', 'freezing'
  ];
  if (winterKeys.some(k => text.includes(k))) {
    tags.push('Зима', 'Холод', 'Winter');
  }

  // 13. Cave / Mountains / Пещера / Горы / Скалы
  const caveKeys = [
    'пещер', 'гор', 'скал', 'ущел', 'камен', 'шахт', 'грот', 'пик', 'хребет', 'валун',
    'cave', 'mountain', 'rock', 'canyon', 'gorge', 'stone', 'mine', 'grotto', 'peak', 'boulder'
  ];
  if (caveKeys.some(k => text.includes(k))) {
    tags.push('Пещера', 'Горы', 'Cave');
  }

  // 14. Ruins / Руины / Развалины / Древний / Заброшенный
  const ruinsKeys = [
    'руин', 'развалин', 'древн', 'заброш', 'осколк', 'храм', 'упадок', 'разрушен', 'ветх',
    'ruins', 'ancient', 'abandoned', 'shards', 'temple', 'decay', 'destroyed', 'dilapidated'
  ];
  if (ruinsKeys.some(k => text.includes(k))) {
    tags.push('Руины', 'Древность', 'Ruins');
  }

  // 15. Castle / Fortress / Замок / Крепость / Башня / Дворец
  const castleKeys = [
    'замок', 'крепост', 'башня', 'дворец', 'цитадел', 'бастион', 'стена', 'трон', 'покои', 'корол',
    'castle', 'fortress', 'tower', 'palace', 'citadel', 'bastion', 'wall', 'throne', 'chamber', 'king', 'lord'
  ];
  if (castleKeys.some(k => text.includes(k))) {
    tags.push('Замок', 'Крепость', 'Castle');
  }

  // Fallback default tag if none matched
  if (tags.length === 0) {
    tags.push('Общее', 'General');
  }

  // Deduplicate and return
  return Array.from(new Set(tags));
}
