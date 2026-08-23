/**
 * Server-Side Procedural Equipment Engine (Генератор экипировки: оружие, броня, снаряжение)
 * Generates detailed items both WITH and WITHOUT special physical properties & material qualities.
 */

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export interface EquipmentOptions {
  category?: string;       // 'random' | 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'clothing'
  hasProperties?: string;  // 'random' | 'true' | 'false'
  quality?: string;        // 'random' | 'shoddy' | 'standard' | 'fine' | 'masterwork'
  material?: string;       // 'random' | 'steel' | 'iron' | 'cold_iron' | 'mithral' | 'adamantine' | 'leather' | 'wood' | 'silk'
  originStyle?: string;    // 'random' | 'imperial' | 'dwarven' | 'elvish' | 'barbaric' | 'underdark'
  priceBudget?: string;    // 'random' | 'cheap' | 'standard' | 'expensive'
  propertyType?: string;   // 'random' | 'defensive' | 'offensive' | 'utility' | 'lightweight'
}

export interface EquipmentItemProperty {
  name: string;
  effect: string;
}

export interface EquipmentItem {
  name: string;
  category: 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'clothing';
  typeLabel: string;
  material: string;
  quality: string;
  hasSpecialProperties: boolean;
  properties: EquipmentItemProperty[];
  cost: string;
  weight: string;
  damageOrAc: string;
  durability: string;
  description: string;
  origin: string;
}

export interface EquipmentRawData {
  category: string;
  materialOption: string;
  qualityOption: string;
  hasPropertiesOption: boolean;
  item: EquipmentItem;
}

const WEAPONS_BASE = [
  { name: 'Длинный меч (Longsword)', typeLabel: 'Одноручное / Двуручное клинковое', baseDamage: '1d8 рупящий (1d10 универсальное)', baseWeight: '3 фунта', baseCost: 15 },
  { name: 'Кинжал стилет (Dagger)', typeLabel: 'Легкое фехтовальное метательное', baseDamage: '1d4 колющий', baseWeight: '1 фунт', baseCost: 2 },
  { name: 'Двуручный боевой молот (Warhammer)', typeLabel: 'Тяжелое дробящее', baseDamage: '1d8 дробящий (1d10 универсальное)', baseWeight: '2 фунта', baseCost: 15 },
  { name: 'Секира (Battleaxe)', typeLabel: 'Одноручное рубящее', baseDamage: '1d8 рупящий (1d10 универсальное)', baseWeight: '4 фунта', baseCost: 10 },
  { name: 'Алебарда (Halberd)', typeLabel: 'Длинноковое тяжелое', baseDamage: '1d10 рубящий (досягаемость 10 фт)', baseWeight: '6 фунтов', baseCost: 20 },
  { name: 'Рапира (Rapier)', typeLabel: 'Фехтовальное колющее', baseDamage: '1d8 колющий', baseWeight: '2 фунта', baseCost: 25 },
  { name: 'Тяжелый арбалет (Heavy Crossbow)', typeLabel: 'Дальнобойное с воротом', baseDamage: '1d10 колющий (дистанция 100/400)', baseWeight: '18 фунтов', baseCost: 50 },
  { name: 'Длинный составной лук (Longbow)', typeLabel: 'Дальнобойное двуручное', baseDamage: '1d8 колющий (дистанция 150/600)', baseWeight: '2 фунта', baseCost: 50 },
  { name: 'Двуручный меч (Greatsword)', typeLabel: 'Тяжелое двуручное клинковое', baseDamage: '2d6 рубящий', baseWeight: '6 фунтов', baseCost: 50 },
  { name: 'Моргенштерн (Morningstar)', typeLabel: 'Дробящее с шипами', baseDamage: '1d8 колющий', baseWeight: '4 фунта', baseCost: 15 }
];

const ARMOR_BASE = [
  { name: 'Кожаный доспех (Leather Armor)', typeLabel: 'Легкий доспех', baseAc: 'КД 11 + Мод. ЛОВ', baseWeight: '10 фунтов', baseCost: 10 },
  { name: 'Клепаный кожаный доспех (Studded Leather)', typeLabel: 'Легкий доспех', baseAc: 'КД 12 + Мод. ЛОВ', baseWeight: '13 фунтов', baseCost: 45 },
  { name: 'Кольчужная рубаха (Chain Shirt)', typeLabel: 'Средний доспех', baseAc: 'КД 13 + Мод. ЛОВ (макс. +2)', baseWeight: '20 фунтов', baseCost: 50 },
  { name: 'Кираса (Breastplate)', typeLabel: 'Средний доспех', baseAc: 'КД 14 + Мод. ЛОВ (макс. +2)', baseWeight: '20 фунтов', baseCost: 400 },
  { name: 'Полулаты (Half Plate)', typeLabel: 'Средний доспех', baseAc: 'КД 15 + Мод. ЛОВ (макс. +2)', baseWeight: '40 фунтов', baseCost: 750 },
  { name: 'Кольчуга (Chain Mail)', typeLabel: 'Тяжелый доспех', baseAc: 'КД 16 (Треб. СИЛ 13)', baseWeight: '55 фунтов', baseCost: 75 },
  { name: 'Полные латы (Full Plate Armor)', typeLabel: 'Тяжелый монолитный доспех', baseAc: 'КД 18 (Треб. СИЛ 15)', baseWeight: '65 фунтов', baseCost: 1500 }
];

const SHIELDS_BASE = [
  { name: 'Стальной геральдический щит (Heater Shield)', typeLabel: 'Кавалерийский щит', baseAc: '+2 к КД', baseWeight: '6 фунтов', baseCost: 10 },
  { name: 'Деревянный баклер с металлическим умбоном', typeLabel: 'Легкий кулачный щит', baseAc: '+2 к КД', baseWeight: '4 фунта', baseCost: 8 },
  { name: 'Ростовой пехотный щит (Tower Shield)', typeLabel: 'Тяжелый ростовой щит', baseAc: '+2 к КД (+1 к спасброскам ЛОВ от снарядов)', baseWeight: '12 фунтов', baseCost: 25 }
];

const SPECIAL_PROPERTIES_POOL = [
  { name: 'Мастерская балансировка (Masterwork Balance)', effect: '+1 к броскам атаки благодаря идеально рассчитанному центру тяжести.' },
  { name: 'Зазубренная заточка (Serrated Edge)', effect: 'Критический удар оставляет глубокую кровоточащую рану (1d4 урона в начале хода цели).' },
  { name: 'Холодное железо (Cold Iron)', effect: 'Игнорирует сопротивление урону у фей, демонов и бесов.' },
  { name: 'Мифриловое кование (Mithral Forging)', effect: 'Предмет весит вдвое меньше. Не дает помехи к проверкам Скрытности.' },
  { name: 'Адамантиновый сплав (Adamantine Structure)', effect: 'Любое попадание по доспеху превращает критический удар в обычный. Авто-крит по строениям.' },
  { name: 'Усиленные заклепки (Reinforced Lining)', effect: '+10% к прочности. Предмет не повреждается от критических промахов.' },
  { name: 'Позолоченная инкрустация (Gilded Inlay)', effect: 'Преимущество на проверки Убеждения и Магии, когда предмет находится на виду.' },
  { name: 'Гнездо под магический самоцвет (Gem Socket)', effect: 'Содержит пустую оправу для установки зачарованного драгоценного камня.' },
  { name: 'Индивидуальный анатомический пошив (Custom Tailoring)', effect: 'Снижает требования к Силе на 2 и не сковывает движения.' },
  { name: 'Водоотталкивающая пропитка (Hydrophobic Coat)', effect: 'Не намокает, защищен от ржавчины и гниения в болотах.' }
];

const ORIGINS = [
  'Кузницы королевского арсенала столицы',
  'Дварфийская подземная цитадель Железных Гор',
  'Эльфийская мастерская в куще Шепчущего Леса',
  'Оружейная гильдии городских мастеров-оружейников',
  'Заброшенная кузница старинного рыцарского ордена'
];

export function generateEquipment(options: EquipmentOptions = {}): { text: string; raw: EquipmentRawData } {
  const categories = ['weapon', 'armor', 'shield', 'gear', 'tool', 'clothing'];
  let cat = options.category && categories.includes(options.category) ? options.category : randomChoice(categories);
  if (cat === 'random') cat = randomChoice(categories);

  const determineProps = options.hasProperties === 'true' ? true : options.hasProperties === 'false' ? false : Math.random() > 0.4;
  const quality = options.quality && options.quality !== 'random' ? options.quality : randomChoice(['Обычное', 'Добротное', 'Мастерское', 'Превосходное']);
  const material = options.material && options.material !== 'random' ? options.material : randomChoice(['Закаленная сталь', 'Вороненое железо', 'Холодное железо', 'Мифрил', 'Адамантин', 'Дуб и кожа']);

  let name = 'Снаряжение';
  let typeLabel = 'Предмет';
  let damageOrAc = 'Стандарт';
  let weight = '3 фунта';
  let baseCostGp = 10;
  let description = 'Стандартный предмет снаряжения путешественника.';

  if (cat === 'weapon') {
    const w = randomChoice(WEAPONS_BASE);
    name = w.name;
    typeLabel = w.typeLabel;
    damageOrAc = w.baseDamage;
    weight = w.baseWeight;
    baseCostGp = w.baseCost;
    description = `Надежное оружие ближнего или дальнего боя. Прошло закалку в кузнице.`;
  } else if (cat === 'armor') {
    const a = randomChoice(ARMOR_BASE);
    name = a.name;
    typeLabel = a.typeLabel;
    damageOrAc = a.baseAc;
    weight = a.baseWeight;
    baseCostGp = a.baseCost;
    description = `Комплект защитной экипировки, подогнанный под ремни и пластины.`;
  } else if (cat === 'shield') {
    const s = randomChoice(SHIELDS_BASE);
    name = s.name;
    typeLabel = s.typeLabel;
    damageOrAc = s.baseAc;
    weight = s.baseWeight;
    baseCostGp = s.baseCost;
    description = `Защитный щит для отражения стрел и рубящих ударов.`;
  } else if (cat === 'gear') {
    name = randomChoice(['Набор путешественника премиум', 'Походный фонарь с линзой', 'Шелковая веревка 50 фт', 'Подзорная труба']);
    typeLabel = 'Походный инструмент';
    damageOrAc = 'Вспомогательный предмет';
    weight = '4 фунта';
    baseCostGp = 20;
    description = 'Полезный предмет для исследования подземелий и дикой природы.';
  } else if (cat === 'tool') {
    name = randomChoice(['Набор воровских отмычек с подшипником', 'Набор травника с латунным пестом', 'Набор резьбы по кости']);
    typeLabel = 'Ремесленные инструменты';
    damageOrAc = 'Дает костям ремесла +1';
    weight = '5 фунтов';
    baseCostGp = 25;
    description = 'Набор высокоточных инструментов мастерской выделки.';
  } else {
    name = randomChoice(['Плащ из сукна с бархатной подкладкой', 'Охотничьи сапоги с кованой пряжкой', 'Дворянский дублет']);
    typeLabel = 'Одежда и доспешные ткани';
    damageOrAc = 'Защита от холода';
    weight = '2 фунта';
    baseCostGp = 15;
    description = 'Удобная и прочная одежда для дальних путешествий и светских визитов.';
  }

  // Properties logic
  const properties: EquipmentItemProperty[] = [];
  if (determineProps) {
    let poolToUse = [...SPECIAL_PROPERTIES_POOL];
    if (options.propertyType === 'defensive') {
      poolToUse = poolToUse.filter(p => p.name.includes('Адамантин') || p.name.includes('Усилен') || p.name.includes('Анатом'));
    } else if (options.propertyType === 'offensive') {
      poolToUse = poolToUse.filter(p => p.name.includes('Зазубр') || p.name.includes('Баланс') || p.name.includes('Холодное'));
    } else if (options.propertyType === 'lightweight') {
      poolToUse = poolToUse.filter(p => p.name.includes('Мифрил') || p.name.includes('Пошив'));
    }
    if (poolToUse.length === 0) poolToUse = [...SPECIAL_PROPERTIES_POOL];

    const propCount = randomInt(1, 2);
    const shuffledProps = poolToUse.sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(propCount, shuffledProps.length); i++) {
      properties.push(shuffledProps[i]);
    }
  }

  // Cost budget adjustment
  let budgetMult = 1.0;
  if (options.priceBudget === 'cheap') budgetMult = 0.4;
  else if (options.priceBudget === 'expensive') budgetMult = 3.5;

  const costMultiplier = determineProps ? (1.5 + properties.length * 0.8) * budgetMult : 1.0 * budgetMult;
  const finalCostGp = Math.max(1, Math.round(baseCostGp * costMultiplier));
  const costStr = `${finalCostGp} gp`;

  // Origin style mapping
  const ORIGIN_MAP: Record<string, string> = {
    imperial: 'Кузницы Имперского Арсенала столицы',
    dwarven: 'Дварфийская Подземная Цитадель Железных Гор',
    elvish: 'Эльфийская кузница в древних кронах Шепчущего Леса',
    barbaric: 'Дикие мастерские северных кланов варваров',
    underdark: 'Тайные оружейные мастера тёмных эльфов Подземья'
  };
  const origin = options.originStyle && options.originStyle !== 'random' && ORIGIN_MAP[options.originStyle]
    ? ORIGIN_MAP[options.originStyle]
    : randomChoice(ORIGINS);

  const durability = `${randomInt(80, 100)}% (Новый предмет)`;

  const item: EquipmentItem = {
    name: determineProps ? `${name} [${properties[0]?.name.split(' ')[0] || 'Свойства'}]` : name,
    category: cat as any,
    typeLabel,
    material,
    quality,
    hasSpecialProperties: determineProps,
    properties,
    cost: costStr,
    weight,
    damageOrAc,
    durability,
    description,
    origin
  };

  const raw: EquipmentRawData = {
    category: cat,
    materialOption: material,
    qualityOption: quality,
    hasPropertiesOption: determineProps,
    item
  };

  const text = `
╔══════════════════════════════════════════════════════════════════════╗
  ЭКИПИРОВКА: ${item.name.toUpperCase()}
  Категория: ${item.typeLabel} | Качество: ${item.quality}
╠══════════════════════════════════════════════════════════════════════╣
  ХАРАКТЕРИСТИКИ И ХАРАКТЕР ПРЕДМЕТА:
  ✦ Защита / Урон: ${item.damageOrAc}
  ✦ Вес: ${item.weight}
  ✦ Материал: ${item.material}
  ✦ Рыночная стоимость: ${item.cost}
  ✦ Состояние: ${item.durability}
  ✦ Происхождение: ${item.origin}

  ОСОБЫЕ ФИЗИЧЕСКИЕ СВОЙСТВА:
  ${item.hasSpecialProperties && item.properties.length > 0 
    ? item.properties.map(p => `✦ [${p.name}]: ${p.effect}`).join('\n  ') 
    : '✦ Стандартный предмет без специальных физических свойств.'}

  ОПИСАНИЕ:
  ${item.description}
╚══════════════════════════════════════════════════════════════════════╝
`.trim();

  return { text, raw };
}
