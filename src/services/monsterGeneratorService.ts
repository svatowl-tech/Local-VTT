import { MonsterRawData, MonsterGeneratorOptions, MonsterAction, MonsterTrait } from '../types/generatorTypes';

/**
5E CR Math Table based on Dungeon Master's Guide
*/
interface CrStats {
  crStr: string;
  crValue: number;
  xp: number;
  profBonus: number;
  targetHpMin: number;
  targetHpMax: number;
  targetAc: number;
  targetAtk: number;
  targetDprMin: number;
  targetDprMax: number;
  saveDc: number;
}

const CR_TABLE: Record<string, CrStats> = {
  '0': { crStr: 'CR 0', crValue: 0, xp: 10, profBonus: 2, targetHpMin: 1, targetHpMax: 6, targetAc: 12, targetAtk: 3, targetDprMin: 1, targetDprMax: 3, saveDc: 10 },
  '1/8': { crStr: 'CR 1/8', crValue: 0.125, xp: 25, profBonus: 2, targetHpMin: 7, targetHpMax: 15, targetAc: 12, targetAtk: 3, targetDprMin: 4, targetDprMax: 5, saveDc: 10 },
  '1/4': { crStr: 'CR 1/4', crValue: 0.25, xp: 50, profBonus: 2, targetHpMin: 16, targetHpMax: 30, targetAc: 13, targetAtk: 3, targetDprMin: 6, targetDprMax: 8, saveDc: 11 },
  '1/2': { crStr: 'CR 1/2', crValue: 0.5, xp: 100, profBonus: 2, targetHpMin: 31, targetHpMax: 49, targetAc: 13, targetAtk: 3, targetDprMin: 9, targetDprMax: 11, saveDc: 11 },
  '1': { crStr: 'CR 1', crValue: 1, xp: 200, profBonus: 2, targetHpMin: 50, targetHpMax: 70, targetAc: 13, targetAtk: 3, targetDprMin: 12, targetDprMax: 14, saveDc: 12 },
  '2': { crStr: 'CR 2', crValue: 2, xp: 450, profBonus: 2, targetHpMin: 71, targetHpMax: 85, targetAc: 13, targetAtk: 4, targetDprMin: 15, targetDprMax: 20, saveDc: 13 },
  '3': { crStr: 'CR 3', crValue: 3, xp: 700, profBonus: 2, targetHpMin: 86, targetHpMax: 100, targetAc: 14, targetAtk: 4, targetDprMin: 21, targetDprMax: 26, saveDc: 13 },
  '4': { crStr: 'CR 4', crValue: 4, xp: 1100, profBonus: 2, targetHpMin: 101, targetHpMax: 115, targetAc: 14, targetAtk: 5, targetDprMin: 27, targetDprMax: 32, saveDc: 14 },
  '5': { crStr: 'CR 5', crValue: 5, xp: 1800, profBonus: 3, targetHpMin: 116, targetHpMax: 130, targetAc: 15, targetAtk: 6, targetDprMin: 33, targetDprMax: 38, saveDc: 15 },
  '6': { crStr: 'CR 6', crValue: 6, xp: 2300, profBonus: 3, targetHpMin: 131, targetHpMax: 145, targetAc: 15, targetAtk: 6, targetDprMin: 39, targetDprMax: 44, saveDc: 15 },
  '7': { crStr: 'CR 7', crValue: 7, xp: 2900, profBonus: 3, targetHpMin: 146, targetHpMax: 160, targetAc: 15, targetAtk: 6, targetDprMin: 45, targetDprMax: 50, saveDc: 15 },
  '8': { crStr: 'CR 8', crValue: 8, xp: 3900, profBonus: 3, targetHpMin: 161, targetHpMax: 175, targetAc: 16, targetAtk: 7, targetDprMin: 51, targetDprMax: 56, saveDc: 16 },
  '9': { crStr: 'CR 9', crValue: 9, xp: 5000, profBonus: 4, targetHpMin: 176, targetHpMax: 190, targetAc: 16, targetAtk: 7, targetDprMin: 57, targetDprMax: 62, saveDc: 16 },
  '10': { crStr: 'CR 10', crValue: 10, xp: 5900, profBonus: 4, targetHpMin: 191, targetHpMax: 205, targetAc: 17, targetAtk: 7, targetDprMin: 63, targetDprMax: 68, saveDc: 16 },
  '11': { crStr: 'CR 11', crValue: 11, xp: 7200, profBonus: 4, targetHpMin: 206, targetHpMax: 220, targetAc: 17, targetAtk: 8, targetDprMin: 69, targetDprMax: 74, saveDc: 17 },
  '12': { crStr: 'CR 12', crValue: 12, xp: 8400, profBonus: 4, targetHpMin: 221, targetHpMax: 235, targetAc: 17, targetAtk: 8, targetDprMin: 75, targetDprMax: 80, saveDc: 17 },
  '13': { crStr: 'CR 13', crValue: 13, xp: 10000, profBonus: 5, targetHpMin: 236, targetHpMax: 250, targetAc: 18, targetAtk: 8, targetDprMin: 81, targetDprMax: 86, saveDc: 18 },
  '14': { crStr: 'CR 14', crValue: 14, xp: 11500, profBonus: 5, targetHpMin: 251, targetHpMax: 265, targetAc: 18, targetAtk: 8, targetDprMin: 87, targetDprMax: 92, saveDc: 18 },
  '15': { crStr: 'CR 15', crValue: 15, xp: 13000, profBonus: 5, targetHpMin: 266, targetHpMax: 280, targetAc: 18, targetAtk: 9, targetDprMin: 93, targetDprMax: 98, saveDc: 18 },
  '16': { crStr: 'CR 16', crValue: 16, xp: 15000, profBonus: 5, targetHpMin: 281, targetHpMax: 295, targetAc: 18, targetAtk: 9, targetDprMin: 99, targetDprMax: 104, saveDc: 18 },
  '17': { crStr: 'CR 17', crValue: 17, xp: 18000, profBonus: 6, targetHpMin: 296, targetHpMax: 310, targetAc: 19, targetAtk: 10, targetDprMin: 105, targetDprMax: 110, saveDc: 19 },
  '18': { crStr: 'CR 18', crValue: 18, xp: 20000, profBonus: 6, targetHpMin: 311, targetHpMax: 325, targetAc: 19, targetAtk: 10, targetDprMin: 111, targetDprMax: 116, saveDc: 19 },
  '19': { crStr: 'CR 19', crValue: 19, xp: 22000, profBonus: 6, targetHpMin: 326, targetHpMax: 340, targetAc: 19, targetAtk: 10, targetDprMin: 117, targetDprMax: 122, saveDc: 19 },
  '20': { crStr: 'CR 20', crValue: 20, xp: 25000, profBonus: 6, targetHpMin: 341, targetHpMax: 355, targetAc: 19, targetAtk: 11, targetDprMin: 123, targetDprMax: 140, saveDc: 19 },
  '21-25': { crStr: 'CR 23', crValue: 23, xp: 50000, profBonus: 7, targetHpMin: 400, targetHpMax: 500, targetAc: 21, targetAtk: 13, targetDprMin: 150, targetDprMax: 180, saveDc: 21 },
  '26-30': { crStr: 'CR 28', crValue: 28, xp: 120000, profBonus: 8, targetHpMin: 550, targetHpMax: 680, targetAc: 23, targetAtk: 16, targetDprMin: 210, targetDprMax: 260, saveDc: 23 },
};

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

function formatMod(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

const FAMILY_TRANSLATIONS: Record<string, string> = {
  humanoid: 'Гуманоид',
  beast: 'Зверь',
  dragon: 'Дракон',
  undead: 'Нежить',
  fiend: 'Исчадие (демон/дьявол)',
  elemental: 'Элементаль',
  monstrosity: 'Чудовище',
  aberration: 'Аберрация',
  construct: 'Конструкт',
  plant: 'Растение',
  fey: 'Фея',
  celestial: 'Небожитель',
  ooze: 'Слизь',
};

const ELEMENT_TRANSLATIONS: Record<string, string> = {
  fire: 'Огонь / Пламя',
  cold: 'Холод / Мороз',
  lightning: 'Молния / Шторм',
  acid_poison: 'Кислота / Яд',
  shadow_necrotic: 'Тьма / Некромантия',
  radiant_holy: 'Свет / Святость',
  psychic: 'Псионика / Ментал',
  earth_stone: 'Земля / Камень',
  arcane: 'Магия / Аркана',
  physical: 'Физическая / Естественная',
};

const ROLE_TRANSLATIONS: Record<string, string> = {
  brute: 'Брут / Танк',
  skirmisher: 'Застрельщик / Ловкач',
  caster: 'Заклинатель / Маг',
  controller: 'Контролер',
  boss: 'Босс / Легендарное существо',
  ambusher: 'Засадник / Убийца',
};

const EMOJI_MAP: Record<string, string> = {
  dragon: '🐉',
  undead: '💀',
  fiend: '👿',
  elemental: '🔥',
  beast: '🐺',
  monstrosity: '🧌',
  aberration: '👁️',
  construct: '🤖',
  plant: '🌵',
  fey: '🧚',
  celestial: '🪽',
  ooze: '🧪',
  humanoid: '🤺',
};

class MonsterGeneratorService {
  /**
   * Generates a complete 5E Statblock Monster based on selected options
   */
  public generateMonster(options: MonsterGeneratorOptions = {}): MonsterRawData {
    // 1. Resolve selections
    const familyKey =
      !options.family || options.family === 'random'
        ? randomChoice(Object.keys(FAMILY_TRANSLATIONS))
        : options.family;

    const elementKey =
      !options.element || options.element === 'random'
        ? randomChoice(Object.keys(ELEMENT_TRANSLATIONS))
        : options.element;

    const crKey =
      !options.cr || options.cr === 'random'
        ? randomChoice(Object.keys(CR_TABLE))
        : options.cr;

    const roleKey =
      !options.role || options.role === 'random'
        ? randomChoice(Object.keys(ROLE_TRANSLATIONS))
        : options.role;

    const sizeKey =
      !options.size || options.size === 'random'
        ? this.getDefaultSizeForFamily(familyKey)
        : (options.size as any);

    const envKey =
      !options.environment || options.environment === 'random'
        ? randomChoice(['dungeon', 'forest', 'mountains', 'swamp', 'desert', 'aquatic', 'planar'])
        : options.environment;

    const crInfo = CR_TABLE[crKey] || CR_TABLE['1'];

    // 2. Base Ability Scores according to Role & Family
    const stats = this.generateAbilityScores(familyKey, roleKey, crInfo.crValue);

    // 3. Size & Hit Dice
    const hitDieValue = this.getHitDieForSize(sizeKey);
    const conMod = calcMod(stats.CON);
    const strMod = calcMod(stats.STR);
    const dexMod = calcMod(stats.DEX);
    const intMod = calcMod(stats.INT);
    const wisMod = calcMod(stats.WIS);
    const chaMod = calcMod(stats.CHA);

    // Calculate Target HP & HD count
    let targetHp = randomRange(crInfo.targetHpMin, crInfo.targetHpMax);
    if (roleKey === 'brute') targetHp = Math.round(targetHp * 1.3);
    if (roleKey === 'boss') targetHp = Math.round(targetHp * 1.5);
    if (roleKey === 'caster') targetHp = Math.round(targetHp * 0.85);

    const avgDieHp = hitDieValue / 2 + 0.5 + conMod;
    const numDice = Math.max(1, Math.round(targetHp / Math.max(1, avgDieHp)));
    const actualHp = Math.max(1, Math.round(numDice * avgDieHp));
    const conBonusTotal = numDice * conMod;
    const hitDiceStr = `${actualHp} (${numDice}d${hitDieValue}${conBonusTotal >= 0 ? ` + ${conBonusTotal}` : ` - ${Math.abs(conBonusTotal)}`})`;

    // 4. Armor Class
    let baseAc = crInfo.targetAc;
    if (roleKey === 'brute') baseAc = Math.max(10, baseAc - 1);
    if (roleKey === 'skirmisher') baseAc = Math.max(11, 10 + dexMod + 1);
    if (roleKey === 'boss') baseAc = Math.min(25, baseAc + 1);
    const acSource = this.getAcSource(familyKey, roleKey, baseAc, dexMod);

    // 5. Speed
    const speedStr = this.generateSpeed(familyKey, sizeKey, elementKey);

    // 6. Name Generation
    const monsterName = this.generateName(familyKey, elementKey, roleKey, crInfo.crValue);

    // 7. Senses, Languages, Alignment
    const sensesStr = this.generateSenses(familyKey, wisMod, crInfo.profBonus);
    const passivePerception = 10 + wisMod + (familyKey === 'beast' || familyKey === 'dragon' ? crInfo.profBonus : 0);
    const languagesStr = this.generateLanguages(familyKey, intMod);
    const alignmentStr = this.generateAlignment(familyKey);

    // 8. Resistances, Immunities & Vulnerabilities
    const defs = this.generateDefenses(familyKey, elementKey);

    // 9. Special Traits
    const traits = this.generateTraits(familyKey, elementKey, roleKey, crInfo);

    // 10. Actions & Multiattack
    const actions = this.generateActions(familyKey, elementKey, roleKey, crInfo, stats, sizeKey);

    // 11. Legendary & Lair Actions (for Boss / CR >= 10)
    let legendaryActions: MonsterTrait[] | undefined = undefined;
    let lairActions: MonsterTrait[] | undefined = undefined;

    if (roleKey === 'boss' || crInfo.crValue >= 10) {
      legendaryActions = this.generateLegendaryActions(monsterName, elementKey, crInfo);
      lairActions = this.generateLairActions(elementKey, envKey);
    }

    // 12. Spells (for Casters)
    let spellsInfo = undefined;
    if (roleKey === 'caster' || familyKey === 'celestial') {
      spellsInfo = this.generateSpells(intMod, wisMod, chaMod, crInfo);
    }

    // 13. Descriptions & Flavor
    const description = this.generateDescription(monsterName, familyKey, elementKey, sizeKey, envKey);
    const habitat = this.generateHabitat(envKey);
    const tactics = this.generateTactics(roleKey, elementKey);
    const loot = this.generateLoot(crInfo.crValue, familyKey);

    const typeFull = `${FAMILY_TRANSLATIONS[familyKey] || familyKey} (${ELEMENT_TRANSLATIONS[elementKey] || elementKey})`;
    const avatar = EMOJI_MAP[familyKey] || '👾';

    return {
      id: `proc-mon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: monsterName,
      title: `${ROLE_TRANSLATIONS[roleKey] || roleKey} • ${crInfo.crStr}`,
      type: typeFull,
      family: familyKey,
      element: elementKey,
      role: roleKey,
      size: sizeKey,
      alignment: alignmentStr,
      ac: baseAc,
      acSource,
      hp: actualHp,
      hitDice: hitDiceStr,
      speed: speedStr,
      cr: crInfo.crStr,
      crValue: crInfo.crValue,
      xp: crInfo.xp,
      proficiencyBonus: crInfo.profBonus,
      stats,
      savingThrows: this.generateSaves(stats, crInfo.profBonus, roleKey),
      skills: this.generateSkills(stats, crInfo.profBonus, familyKey),
      damageResistances: defs.resistances,
      damageImmunities: defs.immunities,
      conditionImmunities: defs.conditionImmunities,
      vulnerabilities: defs.vulnerabilities,
      senses: sensesStr,
      passivePerception,
      languages: languagesStr,
      traits,
      actions,
      legendaryActions,
      lairActions,
      spells: spellsInfo,
      description,
      habitat,
      tactics,
      loot,
      avatar,
    };
  }

  // --- HELPER SUB-METHODS ---

  private getDefaultSizeForFamily(family: string): 'Tiny' | 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan' {
    switch (family) {
      case 'dragon': return randomChoice(['Large', 'Huge', 'Gargantuan']);
      case 'giant': return randomChoice(['Large', 'Huge']);
      case 'ooze': return randomChoice(['Medium', 'Large']);
      case 'beast': return randomChoice(['Small', 'Medium', 'Large', 'Huge']);
      default: return randomChoice(['Medium', 'Large']);
    }
  }

  private getHitDieForSize(size: string): number {
    switch (size) {
      case 'Tiny': return 4;
      case 'Small': return 6;
      case 'Medium': return 8;
      case 'Large': return 10;
      case 'Huge': return 12;
      case 'Gargantuan': return 20;
      default: return 8;
    }
  }

  private generateAbilityScores(family: string, role: string, cr: number) {
    let str = 12, dex = 12, con = 12, int = 10, wis = 10, cha = 10;

    // Stat bonuses based on CR
    const bonus = Math.floor(cr / 2);

    if (role === 'brute') {
      str = 16 + bonus;
      con = 15 + bonus;
      dex = 10;
      int = 6;
    } else if (role === 'skirmisher' || role === 'ambusher') {
      dex = 16 + bonus;
      str = 12;
      con = 12 + Math.floor(bonus / 2);
      wis = 13;
    } else if (role === 'caster') {
      int = 16 + bonus;
      wis = 14 + bonus;
      cha = 14 + bonus;
      str = 10;
      con = 12;
    } else if (role === 'boss') {
      str = 16 + bonus;
      con = 16 + bonus;
      dex = 13 + Math.floor(bonus / 2);
      int = 14 + Math.floor(bonus / 2);
      wis = 14 + Math.floor(bonus / 2);
      cha = 15 + Math.floor(bonus / 2);
    }

    // Family stat bias
    if (family === 'dragon') { str += 2; con += 2; cha += 2; }
    if (family === 'undead') { con += 2; dex -= 2; }
    if (family === 'fiend') { str += 1; cha += 2; }
    if (family === 'elemental') { con += 2; }
    if (family === 'construct') { str += 2; con += 2; int = 3; cha = 1; }
    if (family === 'beast') { str += 1; dex += 1; int = 2; }

    return {
      STR: Math.min(30, Math.max(1, str)),
      DEX: Math.min(30, Math.max(1, dex)),
      CON: Math.min(30, Math.max(1, con)),
      INT: Math.min(30, Math.max(1, int)),
      WIS: Math.min(30, Math.max(1, wis)),
      CHA: Math.min(30, Math.max(1, cha)),
    };
  }

  private getAcSource(family: string, role: string, ac: number, dexMod: number): string {
    if (family === 'construct' || family === 'dragon' || family === 'elemental' || family === 'monstrosity') {
      return `${ac} (природный доспех)`;
    }
    if (role === 'caster' || role === 'skirmisher') {
      return `${ac} (${dexMod >= 2 ? 'кожаный доспех / ловкость' : 'магический доспех'})`;
    }
    return `${ac} (тяжелая броня / щит)`;
  }

  private generateSpeed(family: string, size: string, element: string): string {
    const base = '30 фт.';
    if (family === 'dragon' || family === 'fey' || family === 'celestial') return '30 фт., летая 60 фт.';
    if (element === 'fire' || element === 'cold') return '40 фт.';
    if (size === 'Huge' || size === 'Gargantuan') return '40 фт.';
    if (family === 'ooze') return '10 фт., лазая 10 фт.';
    if (family === 'undead') return '25 фт.';
    return base;
  }

  private generateName(family: string, element: string, role: string, cr: number): string {
    const prefixes: Record<string, string[]> = {
      fire: ['Пламенный', 'Обжигающий', 'Пепельный', 'Вулканический', 'Огненный'],
      cold: ['Ледяной', 'Морозный', 'Хладный', 'Заиндевелый', 'Арктический'],
      lightning: ['Грозовой', 'Искрящий', 'Молниеносный', 'Электрический'],
      acid_poison: ['Ядовитый', 'Токсичный', 'Едкий', 'Кислотный', 'Гнилостный'],
      shadow_necrotic: ['Теневой', 'Мрачный', 'Некротический', 'Кошмарный', 'Чёрный'],
      radiant_holy: ['Ослепительный', 'Священный', 'Солнечный', 'Лучезарный'],
      psychic: ['Ментальный', 'Псионический', 'Астральный', 'Искажающий'],
      earth_stone: ['Кристаллический', 'Каменный', 'Гранитный', 'Разрушительный'],
      arcane: ['Арканический', 'Эфирный', 'Заколдованный', 'Изначальный'],
      physical: ['Кровавый', 'Свирепый', 'Исполинский', 'Хищный', 'Дикий'],
    };

    const nouns: Record<string, string[]> = {
      dragon: ['Дракон', 'Змей', 'Вайверн', 'Драколидин'],
      undead: ['Упырь', 'Страж Склепа', 'Рыцарь Смерти', 'Призрак', 'Лорд Теней'],
      fiend: ['Демон', 'Дьявол', 'Агонист', 'Мучитель'],
      elemental: ['Элементаль', 'Дух', 'Воплощение', 'Аватар'],
      beast: ['Волк', 'Засадник', 'Медведь', 'Хищник', 'Ящер'],
      monstrosity: ['Гидра', 'Василиск', 'Химера', 'Страж'],
      aberration: ['Пожиратель', 'Наблюдатель', 'Породитель', 'Истязатель'],
      construct: ['Голем', 'Автоматон', 'Страж', 'Конструктор'],
      plant: ['Заросль', 'Цветок Смерти', 'Древогрыз'],
      fey: ['Дух Леса', 'Нимфа', 'Пакостник'],
      celestial: ['Серафим', 'Каратель', 'Заступник'],
      ooze: ['Слизень', 'Дрожащий Куб', 'Едкая Масса'],
      humanoid: ['Вождь', 'Берсерк', 'Засадник', 'Чародей'],
    };

    const titles = ['Разрушитель', 'Ужас Бездны', 'Кошмар Подземелий', 'Страж Руин', 'Презренный'];

    const pref = randomChoice(prefixes[element] || prefixes['physical']);
    const noun = randomChoice(nouns[family] || nouns['monstrosity']);

    if (cr >= 10 || role === 'boss') {
      const title = randomChoice(titles);
      return `${pref} ${noun} — ${title}`;
    }

    return `${pref} ${noun}`;
  }

  private generateSenses(family: string, wisMod: number, prof: number): string {
    const list = ['темное зрение 60 фт.'];
    if (family === 'undead' || family === 'fiend' || family === 'aberration') list.push('темное зрение 120 фт.');
    if (family === 'elemental' || family === 'ooze') list.push('слепое зрение 60 фт.');
    list.push(`пассивная Внимательность ${10 + wisMod}`);
    return list.join(', ');
  }

  private generateLanguages(family: string, intMod: number): string {
    if (family === 'beast' || family === 'ooze') return '—';
    if (family === 'humanoid') return 'Общий, Драконий или Подземный';
    if (family === 'dragon') return 'Драконий, Общий';
    if (family === 'fiend') return 'Бездна, Инфернальный, Телепатия 120 фт.';
    if (family === 'elemental') return 'Первичный (Игнан / Терран)';
    if (family === 'aberration') return 'Глубокая Речь, Подземный, Телепатия 60 фт.';
    return 'Общий';
  }

  private generateAlignment(family: string): string {
    if (family === 'beast' || family === 'ooze' || family === 'construct') return 'Безмировоззренческий';
    if (family === 'fiend' || family === 'undead') return 'Хаотично-злой или Законно-злой';
    if (family === 'celestial') return 'Законно-добрый';
    return 'Нейтрально-злой';
  }

  private generateDefenses(family: string, element: string) {
    const resistances: string[] = [];
    const immunities: string[] = [];
    const conditionImmunities: string[] = [];
    const vulnerabilities: string[] = [];

    if (element === 'fire') { immunities.push('огню'); vulnerabilities.push('холоду'); }
    if (element === 'cold') { immunities.push('холоду'); vulnerabilities.push('огню'); }
    if (element === 'lightning') { immunities.push('электричеству'); }
    if (element === 'acid_poison') { immunities.push('яду', 'кислоте'); conditionImmunities.push('отравление'); }
    if (element === 'shadow_necrotic') { resistances.push('некротическому урону', 'холоду'); }

    if (family === 'undead') {
      immunities.push('яду');
      conditionImmunities.push('отравление', 'испуг', 'очарование');
    }
    if (family === 'construct') {
      immunities.push('яду', 'психическому урону');
      conditionImmunities.push('очарование', 'испуг', 'паралич', 'отравление');
    }

    return {
      resistances: resistances.join(', ') || undefined,
      immunities: immunities.join(', ') || undefined,
      conditionImmunities: conditionImmunities.join(', ') || undefined,
      vulnerabilities: vulnerabilities.join(', ') || undefined,
    };
  }

  private generateSaves(stats: any, prof: number, role: string): string | undefined {
    const saves: string[] = [];
    const strM = calcMod(stats.STR) + prof;
    const dexM = calcMod(stats.DEX) + prof;
    const conM = calcMod(stats.CON) + prof;
    const wisM = calcMod(stats.WIS) + prof;

    if (role === 'brute' || role === 'boss') saves.push(`Сил ${formatMod(strM)}`, `Тел ${formatMod(conM)}`);
    if (role === 'skirmisher' || role === 'ambusher') saves.push(`Лов ${formatMod(dexM)}`);
    if (role === 'caster') saves.push(`Мудр ${formatMod(wisM)}`);

    return saves.length > 0 ? saves.join(', ') : undefined;
  }

  private generateSkills(stats: any, prof: number, family: string): string | undefined {
    const skills: string[] = [];
    const percM = calcMod(stats.WIS) + prof;
    const steaM = calcMod(stats.DEX) + prof;

    if (family === 'beast' || family === 'dragon' || family === 'monstrosity') {
      skills.push(`Внимательность ${formatMod(percM)}`);
    }
    if (family === 'humanoid' || family === 'undead') {
      skills.push(`Скрытность ${formatMod(steaM)}`);
    }

    return skills.length > 0 ? skills.join(', ') : undefined;
  }

  private generateTraits(family: string, element: string, role: string, crInfo: CrStats): MonsterTrait[] {
    const traits: MonsterTrait[] = [];

    // Role trait
    if (role === 'boss' || crInfo.crValue >= 5) {
      traits.push({
        name: 'Легендарное сопротивление (3/День)',
        description: 'Если монстр проваливает спасбросок, он может вместо этого сделать его успешным.',
      });
    }

    if (role === 'ambusher') {
      traits.push({
        name: 'Засадная атака',
        description: 'В первом раунде боя монстр имеет преимущество на броски атаки против застигнутых врасплох целей. Попав по застигнутой цели, наносит доп. 2d6 урона.',
      });
    }

    if (role === 'brute') {
      traits.push({
        name: 'Сокрушительная сила',
        description: 'При попадании рукопашной атакой монстр наносит один дополнительный кубик урона своего оружия.',
      });
    }

    // Family trait
    if (family === 'undead') {
      traits.push({
        name: 'Стойкость нежити',
        description: 'Если урон снижает HP нежити до 0, она делает спасбросок Телосложения с КС 5 + полученный урон. При успехе HP становится равным 1.',
      });
    } else if (family === 'elemental' && element === 'fire') {
      traits.push({
        name: 'Огненное тело',
        description: 'Существо, касающееся монстра или попадающее по нему рукопашной атакой в пределах 5 фт., получает 5 (1d10) урона огнем.',
        attackFormula: 'Огненное тело||1d10',
      });
    } else if (family === 'beast') {
      traits.push({
        name: 'Тактика стаи',
        description: 'Монстр совершает с преимуществом броски атаки по существу, если в пределах 5 фт. от цели находится дееспособный союзник.',
      });
    } else if (family === 'dragon') {
      traits.push({
        name: 'Амфибия',
        description: 'Дракон может дышать как воздухом, так и водой.',
      });
    }

    return traits;
  }

  private generateActions(family: string, element: string, role: string, crInfo: CrStats, stats: any, size: string): MonsterAction[] {
    const actions: MonsterAction[] = [];
    const strM = calcMod(stats.STR);
    const dexM = calcMod(stats.DEX);

    const mainMod = Math.max(strM, dexM);
    const toHit = crInfo.targetAtk;
    const saveDc = crInfo.saveDc;

    // Multiattack
    const multiCount = crInfo.crValue >= 11 ? 3 : crInfo.crValue >= 3 ? 2 : 1;
    if (multiCount > 1) {
      actions.push({
        name: 'Мультиатака',
        description: `Монстр совершает ${multiCount === 2 ? 'две' : 'три'} атаки: одной укусом/удар и одной когтями или оружием.`,
      });
    }

    // Primary Attack
    const dmgType = element === 'fire' ? 'огнем' : element === 'cold' ? 'холодом' : element === 'lightning' ? 'электричеством' : element === 'acid_poison' ? 'кислотой/ядом' : 'колющий/рубящий';
    const mainDmgDice = crInfo.crValue >= 10 ? '3d10' : crInfo.crValue >= 5 ? '2d8' : '1d8';
    const totalBonus = mainMod + Math.floor(crInfo.crValue / 3);

    actions.push({
      name: family === 'dragon' ? 'Укус' : family === 'beast' ? 'Укус / Когти' : 'Удар оружием',
      type: 'melee',
      toHit,
      reachOrRange: 'досягаемость 5 фт.',
      target: 'одна цель',
      damage: `${toHit + 3} (${mainDmgDice} + ${mainMod}) ${dmgType}`,
      attackFormula: `Атака|${toHit}|${mainDmgDice}+${mainMod}`,
      description: `Рукопашная атака оружием: +${toHit} к попаданию, досягаемость 5 фт. Попадание: ${mainDmgDice} + ${mainMod} ${dmgType} урона.`,
    });

    // Breath weapon for dragons or elemental burst
    if (family === 'dragon' || element === 'fire' || element === 'cold' || element === 'lightning') {
      const breathDmg = `${Math.min(20, Math.max(3, Math.round(crInfo.targetDprMax * 0.8)))}d6`;
      actions.push({
        name: `Дыхание стихии (Перезарядка 5-6)`,
        type: 'special',
        reachOrRange: 'конус 30 фт.',
        description: `Монстр выдыхает поток стихии в конусе 30 фт. Каждое существо в зоне должно сделать спасбросок Ловкости/Телосложения с КС ${saveDc}, получая ${breathDmg} урона ${dmgType} при провале или половину при успехе.`,
        attackFormula: `Дыхание||${breathDmg}`,
      });
    }

    return actions;
  }

  private generateLegendaryActions(monsterName: string, element: string, crInfo: CrStats): MonsterTrait[] {
    return [
      {
        name: 'Обнаружение',
        description: `${monsterName} совершает проверку Мудрости (Внимательность).`,
      },
      {
        name: 'Атака хвостом / когтем',
        description: `${monsterName} совершает одну рукопашную атаку.`,
      },
      {
        name: 'Взмах крыльев / Всплеск энергии (Стоит 2 действия)',
        description: `Каждое существо в пределах 10 фт. должно преуспеть в спасброске Ловкости с КС ${crInfo.saveDc} или получить 2d6 + ${crInfo.profBonus} урона и быть сбитым с ног.`,
      },
    ];
  }

  private generateLairActions(element: string, env: string): MonsterTrait[] {
    return [
      {
        name: 'Извержение Логова (Инициатива 20)',
        description: `В точке на земле в пределах 120 фт. возникает стихийный всплеск. Все существа в радиусе 10 фт. делают спасбросок КС 15 или получают 3d6 урона.`,
      },
      {
        name: 'Дрожь и Гуд',
        description: `Сейсмическая волна сотрясает логово. Все существа на земле должны преуспеть в спасброске Ловкости КС 15 или упасть ничком.`,
      },
    ];
  }

  private generateSpells(intM: number, wisM: number, chaM: number, crInfo: CrStats) {
    const dc = crInfo.saveDc;
    const atk = crInfo.targetAtk;
    return {
      casterLevel: Math.max(1, Math.min(20, crInfo.crValue + 2)),
      spellcastingAbility: 'Интеллект / Харизма',
      saveDc: dc,
      spellAttackBonus: atk,
      spellList: ['Фокусы: Огненный снаряд, Малая иллюзия', '1 круг: Магическая стрела, Щит', '2 круг: Туманный шаг, Отражения', '3 круг: Огненный шар, Контрзаклятие'],
      slots: [4, 3, 3, 2],
    };
  }

  private generateDescription(name: string, family: string, element: string, size: string, env: string): string {
    return `${name} — ${FAMILY_TRANSLATIONS[family] || family} размера ${size}, источающий ауру ${ELEMENT_TRANSLATIONS[element] || element}. Обычно обитает в экосистеме «${env}», где доминирует над прочими хищниками.`;
  }

  private generateHabitat(env: string): string {
    const envs: Record<string, string> = {
      dungeon: 'Темные подземелья, заброшенные гробницы и древние катакомбы',
      forest: 'Густые лесные чащобы и дремучие дубравы',
      mountains: 'Высокогорные скалистые пики и ущелья',
      swamp: 'Топкие болота и туманные трясины',
      desert: 'Знойные песчаные дюны и оазисы',
      aquatic: 'Морские пучины, прибрежные гроты и подводные руины',
      planar: 'Иные планы бытия (Бездна, Астрал, Элементальный План)',
    };
    return envs[env] || 'Подземелья и древние руины';
  }

  private generateTactics(role: string, element: string): string {
    if (role === 'brute') return 'Атакует в лоб, пытаясь раздавить самую сильную цель и игнорируя получаемый урон.';
    if (role === 'skirmisher') return 'Использует высокую мобильность, атакует и отступает, избегая провоцированных атак.';
    if (role === 'caster') return 'Держится на дистанции за спинами слуг, используя заклинания по площади.';
    if (role === 'ambusher') return 'Нападает из невидимости или засады, фокусируя весь урон на наименее защищенных магах.';
    return 'Действует тактически грамотно, используя возможности окружения и контрольные способности.';
  }

  private generateLoot(cr: number, family: string): string {
    const gp = Math.round(cr * 45 + Math.random() * 50);
    if (family === 'beast' || family === 'plant') return `Шкура / Трофеи стоимостью ~${gp} зм`;
    return `${gp} золотых монет, драгоценности и трофейные артефакты`;
  }
}

export const monsterGeneratorService = new MonsterGeneratorService();
