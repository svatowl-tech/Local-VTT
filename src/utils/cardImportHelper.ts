import { MapItem } from '../types';
import { WorldLoreItem } from '../types/worldLoreTypes';
import { NpcRawData, TreasureRawData, LootRawData, MerchantRawData, MonsterRawData } from '../types/generatorTypes';
import {
  generateNpcTokenSvg,
  generateTreasureTokenSvg,
  generateLootTokenSvg,
  generateMerchantTokenSvg,
  generateMonsterTokenSvg,
} from './tokenSvgFactory';

/**
 * Parses numeric score from stat string like "16 (+3)"
 */
function parseStatNum(val: string | undefined): number {
  if (!val) return 10;
  const match = val.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 10;
}

// ----------------------------------------------------------------------
// 1. NPC IMPORTERS
// ----------------------------------------------------------------------

export function createNpcTokenItem(npc: NpcRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const tokenUrl = generateNpcTokenSvg(npc);
  const size = 100; // Standard 2x2 grid cell size
  const profTag = npc.profession ? ` • ${npc.profession}` : '';
  return {
    id: `token-npc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${npc.fullName} (${npc.race} ${npc.classType}${profTag})`,
    type: 'image',
    url: tokenUrl,
    thumbnailUrl: tokenUrl,
    width: size,
    height: size,
    aspectRatio: 1,
    position: {
      x: spawnPos.x - Math.round(size / 2),
      y: spawnPos.y - Math.round(size / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 55,
    opacity: 1,
    hash: 'npc-tok-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'svg',
    category: 'Токены',
    layer: 'props',
    tags: ['NPC', 'Токен', npc.race, npc.classType, npc.profession || 'Обыватель'],
  };
}

export function createNpcContentCardItem(npc: NpcRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const width = 430;
  const height = 500;

  const profInfo = npc.profession ? `Профессия: ${npc.profession} (${npc.professionCategory || 'Ремесло'})\n` : '';
  const statusInfo = npc.socialStatus ? `Статус: ${npc.socialStatus} | Жилье: ${npc.housing || '—'}\n` : '';
  const secretInfo = npc.secret ? `Тайна: ${npc.secret}\n` : '';
  const rumorInfo = npc.rumor ? `Слух: ${npc.rumor}\n` : '';

  const compendiumItem = {
    id: `npc-comp-${Date.now()}`,
    systemId: 'dnd5e',
    systemName: 'D&D 5e',
    name: npc.fullName,
    originalName: `${npc.race} ${npc.classType} (${npc.profession || 'NPC'}, Ур. ${npc.level})`,
    category: 'monsters', // enables Monster Statblock & Initiative Tracker
    format: 'NPCStatblock',
    summary: `${npc.race} ${npc.classType}${npc.profession ? ` (${npc.profession})` : ''}, ${npc.alignment}. Хиты: ${npc.hp}, КД: ${npc.ac}`,
    snippet: `${profInfo}${statusInfo}Мотивация: ${npc.motivation}\nОсобенность: ${npc.quirk}\n${secretInfo}${rumorInfo}`,
    score: 1,
    matchType: 'exact',
    tags: ['NPC', npc.race, npc.classType, npc.profession || 'NPC', `CR ${npc.level}`],
    relativePath: 'npcs',
    stats: {
      hp: npc.hp,
      ac: npc.ac,
      speed: npc.speed,
      cr: `${npc.level}`,
      str: parseStatNum(npc.stats.STR),
      dex: parseStatNum(npc.stats.DEX),
      con: parseStatNum(npc.stats.CON),
      int: parseStatNum(npc.stats.INT),
      wis: parseStatNum(npc.stats.WIS),
      cha: parseStatNum(npc.stats.CHA),
    },
    actions: npc.equipment.map((eq) => ({
      name: `Экипировка / Атака: ${eq}`,
      toHit: npc.proficiencyBonus.replace('+', ''),
      text: eq,
    })),
    traits: [
      ...(npc.profession ? [{ name: `Профессия: ${npc.profession}`, text: npc.professionPerk || 'Мастер своего дела' }] : []),
      ...(npc.socialStatus ? [{ name: `Социальный статус: ${npc.socialStatus}`, text: `${npc.socialStatusDesc || ''} (Жилье: ${npc.housing || '—'})` }] : []),
      ...npc.racialTraits.map((t) => ({ name: 'Расовая черта', text: t })),
      ...npc.classFeatures.map((f) => ({ name: 'Классовое умение', text: f })),
      { name: 'Мотивация', text: npc.motivation },
      { name: 'Особенность', text: npc.quirk },
      ...(npc.secret ? [{ name: 'Личная тайна', text: npc.secret }] : []),
      ...(npc.rumor ? [{ name: 'Известный слух', text: npc.rumor }] : []),
    ],
    data: {
      stats: {
        str: parseStatNum(npc.stats.STR),
        dex: parseStatNum(npc.stats.DEX),
        con: parseStatNum(npc.stats.CON),
        int: parseStatNum(npc.stats.INT),
        wis: parseStatNum(npc.stats.WIS),
        cha: parseStatNum(npc.stats.CHA),
      },
    },
  };

  return {
    id: `npc-card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: npc.fullName,
    type: 'card',
    url: '',
    thumbnailUrl: '',
    width,
    height,
    aspectRatio: width / height,
    position: {
      x: spawnPos.x - Math.round(width / 2),
      y: spawnPos.y - Math.round(height / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 65,
    opacity: 1,
    hash: 'npc-card-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'png',
    category: 'NPC Карточка',
    layer: 'props',
    isContentCard: true,
    contentCardData: {
      item: compendiumItem as any,
      cardType: 'monsters',
      viewMode: 'full',
    },
  };
}

export function createNpcLoreItem(npc: NpcRawData): WorldLoreItem {
  const contentMarkdown = `
# ${npc.fullName}

**${npc.race} • ${npc.classType} (${npc.level} уровень)**  
*Профессия:* **${npc.profession || 'Обыватель'}** (${npc.professionCategory || 'Общество'})  
*Статус:* ${npc.socialStatus || 'Средний класс'} | *Возраст:* ${npc.ageGroup || 'Зрелый'} (${npc.ageRange || '25-45 лет'})  
*Отношение к героям:* ${npc.attitude || 'Нейтральное'}  
*Мировоззрение:* ${npc.alignment} | *Пол:* ${npc.gender}

---

### Боевые характеристики
- **Класс Доспеха (AC):** ${npc.ac}
- **Хиты (HP):** ${npc.hp} (${npc.hitDice})
- **Скорость:** ${npc.speed}
- **Бонус мастерства:** ${npc.proficiencyBonus}
- **Спасброски:** ${npc.savingThrows}

### Характеристики
| СИЛ | ЛОВ | ТЕЛ | ИНТ | МДР | ХАР |
| :---: | :---: | :---: | :---: | :---: | :---: |
| ${npc.stats.STR} | ${npc.stats.DEX} | ${npc.stats.CON} | ${npc.stats.INT} | ${npc.stats.WIS} | ${npc.stats.CHA} |

---

### Профессия и статус
- **Ремесло / Деятельность:** ${npc.profession || '—'}
- **Профессиональный бонус:** ${npc.professionPerk || '—'}
- **Место проживания:** ${npc.housing || '—'}
${npc.purse ? `- **Кошелек:** ${npc.purse.gp} gp, ${npc.purse.sp} sp, ${npc.purse.cp} cp` : ''}

### Внешность и поведение
${npc.appearance ? `- **Внешний вид:** ${npc.appearance}` : ''}
${npc.attitudeReaction ? `- **Поведение:** ${npc.attitudeReaction}` : ''}
${npc.secret ? `- **Личная тайна:** ${npc.secret}` : ''}
${npc.rumor ? `- **Известный слух:** ${npc.rumor}` : ''}

---

### Расовые особенности
${npc.racialTraits.map((t) => `- **${t}**`).join('\n')}

### Классовые умения
${npc.classFeatures.map((f) => `- **${f}**`).join('\n')}

### Снаряжение и инструменты
${npc.equipment.map((e) => `- ${e}`).join('\n')}

---

### Личность
- **Мотивация:** ${npc.motivation}
- **Индивидуальная черта:** ${npc.quirk}
  `.trim();

  return {
    id: `lore-npc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    worldId: 'dnd5e_faerun',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: npc.fullName,
    originalName: `${npc.race} ${npc.classType} (${npc.profession || 'NPC'}, ${npc.level} lvl)`,
    category: 'npc_figure',
    summary: `${npc.race} ${npc.classType} • ${npc.profession || 'NPC'}. ${npc.motivation}`,
    content: contentMarkdown,
    tags: ['NPC', 'Персонаж', npc.race, npc.classType, npc.profession || 'Профессия', npc.alignment],
    npcData: {
      titleOrRole: `${npc.race} ${npc.classType}${npc.profession ? ` (${npc.profession})` : ''}`,
      race: npc.race,
      alignment: npc.alignment,
      personality: `${npc.motivation} | ${npc.quirk}`,
      backgroundLore: `Профессия: ${npc.profession || '—'}. Тайна: ${npc.secret || '—'}. Снаряжение: ${npc.equipment.join(', ')}`,
      statsOverride: {
        hp: npc.hp,
        ac: npc.ac,
        speed: npc.speed,
        stats: npc.stats,
      },
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ----------------------------------------------------------------------
// 2. TREASURE IMPORTERS
// ----------------------------------------------------------------------

export function createTreasureTokenItem(treasure: TreasureRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const tokenUrl = generateTreasureTokenSvg(treasure.level, treasure.grandTotalValueGp);
  const size = 100;
  const themeName = treasure.theme ? ` [${treasure.theme}]` : '';
  return {
    id: `token-treasure-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Клад${themeName} (CR ${treasure.level}) ~${treasure.grandTotalValueGp} gp`,
    type: 'image',
    url: tokenUrl,
    thumbnailUrl: tokenUrl,
    width: size,
    height: size,
    aspectRatio: 1,
    position: {
      x: spawnPos.x - Math.round(size / 2),
      y: spawnPos.y - Math.round(size / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 50,
    opacity: 1,
    hash: 'trs-tok-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'svg',
    category: 'Сокровища',
    layer: 'props',
    tags: ['Сокровища', 'Клад', treasure.theme || 'Клад', `CR ${treasure.level}`],
  };
}

export function createTreasureContentCardItem(treasure: TreasureRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const width = 430;
  const height = 480;

  const themeInfo = treasure.theme ? `🏛 Тематика: ${treasure.theme}\n📦 Контейнер: ${treasure.container || 'Кованый сундук'} (Замок: DC ${treasure.lockDc || 0})\n` : '';
  const trapInfo = treasure.trap && treasure.trap !== 'none' ? `⚠️ Защита: ${treasure.trap}\n` : '';

  const descText = `
${themeInfo}${trapInfo}
💰 Монеты: ${treasure.coins.cp} cp, ${treasure.coins.sp} sp, ${treasure.coins.gp} gp, ${treasure.coins.pp} pp

💎 Самоцветы:
${treasure.gems.length > 0 ? treasure.gems.map((g) => `• ${g.name} (${g.value} gp)`).join('\n') : '• Нет'}

🏺 Предметы искусства:
${treasure.artObjects.length > 0 ? treasure.artObjects.map((a) => `• ${a.name} (${a.value} gp)`).join('\n') : '• Нет'}

✨ Магические предметы:
${treasure.magicItems.length > 0 ? treasure.magicItems.map((m) => `• ${m}`).join('\n') : '• Нет'}

${treasure.specialItem ? `📜 Находка: ${treasure.specialItem}` : ''}
  `.trim();

  const compendiumItem = {
    id: `trs-comp-${Date.now()}`,
    systemId: 'dnd5e',
    systemName: 'D&D 5e',
    name: `Сокровищница: ${treasure.theme || `Уровень ${treasure.level}`}`,
    originalName: `Treasure Hoard (~${treasure.grandTotalValueGp.toLocaleString('ru-RU')} gp)`,
    category: 'items',
    format: 'TreasureHoard',
    summary: `Общая ценность: ~${treasure.grandTotalValueGp.toLocaleString('ru-RU')} gp (${treasure.container || 'Сундук'})`,
    snippet: descText,
    score: 1,
    matchType: 'exact',
    tags: ['Сокровища', 'Клад', treasure.theme || 'Клад', 'Золото', `CR ${treasure.level}`],
    relativePath: 'treasure',
    data: {
      rarity: `CR ${treasure.level}`,
      cost: `${treasure.grandTotalValueGp.toLocaleString('ru-RU')} gp`,
      weight: '—',
      description: descText,
    },
  };

  return {
    id: `trs-card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Сокровища: ${treasure.theme || `CR ${treasure.level}`}`,
    type: 'card',
    url: '',
    thumbnailUrl: '',
    width,
    height,
    aspectRatio: width / height,
    position: {
      x: spawnPos.x - Math.round(width / 2),
      y: spawnPos.y - Math.round(height / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 65,
    opacity: 1,
    hash: 'trs-card-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'png',
    category: 'Сокровища',
    layer: 'props',
    isContentCard: true,
    contentCardData: {
      item: compendiumItem as any,
      cardType: 'items',
      viewMode: 'full',
    },
  };
}

export function createTreasureLoreItem(treasure: TreasureRawData): WorldLoreItem {
  const contentMarkdown = `
# Сокровищница: ${treasure.theme || `Уровень / CR ${treasure.level}`}

**Общая стоимость:** ~${treasure.grandTotalValueGp.toLocaleString('ru-RU')} gp  
${treasure.themeDesc ? `*Описание:* ${treasure.themeDesc}\n` : ''}
*Хранилище:* **${treasure.container || 'Сундук'}** (DC замка: ${treasure.lockDc || 0})  
*Защита / Ловушка:* ${treasure.trap || 'Без ловушек'} ${treasure.trapEffect ? `(${treasure.trapEffect})` : ''}

---

### Монеты в кладе
- **Медные (cp):** ${treasure.coins.cp.toLocaleString('ru-RU')}
- **Серебряные (sp):** ${treasure.coins.sp.toLocaleString('ru-RU')}
- **Золотые (gp):** ${treasure.coins.gp.toLocaleString('ru-RU')}
- **Платиновые (pp):** ${treasure.coins.pp.toLocaleString('ru-RU')}

---

### Драгоценные камни
${treasure.gems.length > 0 ? treasure.gems.map((g) => `- **${g.name}** — ${g.value} gp`).join('\n') : '*Нет самоцветов*'}

### Предметы искусства и ювелирные изделия
${treasure.artObjects.length > 0 ? treasure.artObjects.map((a) => `- **${a.name}** — ${a.value} gp`).join('\n') : '*Нет предметов искусства*'}

### Магические предметы и артефакты
${treasure.magicItems.length > 0 ? treasure.magicItems.map((m) => `- ✦ **${m}**`).join('\n') : '*Нет магических предметов*'}

${treasure.specialItem ? `\n### Сюжетная находка\n✦ **${treasure.specialItem}**` : ''}
  `.trim();

  return {
    id: `lore-treasure-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    worldId: 'dnd5e_faerun',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: `Клад: ${treasure.theme || `CR ${treasure.level}`}`,
    originalName: `Treasure Hoard (CR ${treasure.level})`,
    category: 'lore_item',
    summary: `Сокровищница (${treasure.theme || 'Клад'}) на сумму ~${treasure.grandTotalValueGp.toLocaleString('ru-RU')} gp.`,
    content: contentMarkdown,
    tags: ['Сокровища', 'Клад', treasure.theme || 'Клад', 'Артефакты', `CR ${treasure.level}`],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ----------------------------------------------------------------------
// 3. LOOT IMPORTERS
// ----------------------------------------------------------------------

export function createLootTokenItem(loot: LootRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const title = (loot.items && loot.items[0]) || loot.monsterItem || 'Добыча';
  const tokenUrl = generateLootTokenSvg(title);
  const size = 90;
  return {
    id: `token-loot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Добыча: ${title}`,
    type: 'image',
    url: tokenUrl,
    thumbnailUrl: tokenUrl,
    width: size,
    height: size,
    aspectRatio: 1,
    position: {
      x: spawnPos.x - Math.round(size / 2),
      y: spawnPos.y - Math.round(size / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 50,
    opacity: 1,
    hash: 'loot-tok-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'svg',
    category: 'Лут',
    layer: 'props',
    tags: ['Лут', 'Трофеи', loot.source || 'Добыча'],
  };
}

export function createLootContentCardItem(loot: LootRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const width = 400;
  const height = 440;

  const itemsList = loot.items && loot.items.length > 0
    ? loot.items.map((it) => `• ${it}`).join('\n')
    : `• ${loot.monsterItem || 'Обычные вещи'}`;

  const descText = `
📦 Источник: ${loot.source || 'Добыча'} (${loot.condition || 'Нормальное состояние'})

🪙 Монеты: ${loot.coins.cp} cp | ${loot.coins.sp} sp | ${loot.coins.gp} gp

🎒 Найденные предметы:
${itemsList}

${loot.valuable ? `💎 Ценность: ${loot.valuable}\n` : ''}
🔮 Диковинка (Trinket):
• ${loot.trinket}

${loot.clue ? `📜 Улика: ${loot.clue}` : ''}
  `.trim();

  const compendiumItem = {
    id: `loot-comp-${Date.now()}`,
    systemId: 'dnd5e',
    systemName: 'D&D 5e',
    name: `Добыча: ${loot.source || 'Лут'}`,
    originalName: loot.source || 'Loot Drop',
    category: 'items',
    format: 'PocketLoot',
    summary: `${loot.source || 'Лут'}. Монеты: ${loot.coins.gp} gp, ${loot.coins.sp} sp`,
    snippet: descText,
    score: 1,
    matchType: 'exact',
    tags: ['Лут', 'Трофеи', loot.source || 'Добыча', 'Trinket'],
    relativePath: 'loot',
    data: {
      rarity: loot.tier ? `CR ${loot.tier}` : 'Обычный',
      cost: `${loot.coins.gp} gp ${loot.coins.sp} sp`,
      weight: '1–5 фнт.',
      description: descText,
    },
  };

  return {
    id: `loot-card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Добыча: ${loot.source || 'Лут'}`,
    type: 'card',
    url: '',
    thumbnailUrl: '',
    width,
    height,
    aspectRatio: width / height,
    position: {
      x: spawnPos.x - Math.round(width / 2),
      y: spawnPos.y - Math.round(height / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 65,
    opacity: 1,
    hash: 'loot-card-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'png',
    category: 'Лут',
    layer: 'props',
    isContentCard: true,
    contentCardData: {
      item: compendiumItem as any,
      cardType: 'items',
      viewMode: 'full',
    },
  };
}

export function createLootLoreItem(loot: LootRawData): WorldLoreItem {
  const itemsList = loot.items && loot.items.length > 0
    ? loot.items.map((it) => `- ${it}`).join('\n')
    : `- ${loot.monsterItem || 'Обычные вещи'}`;

  const contentMarkdown = `
# Найденный трофей и добыча: ${loot.source || 'Лут'}

- **Категория:** ${loot.category || 'Добыча'} | **Опасность:** ${loot.tier || 'CR 0-4'}
- **Состояние:** ${loot.condition || 'Обычное'} (${loot.conditionDesc || '—'})
- **Монеты:** ${loot.coins.cp} cp, ${loot.coins.sp} sp, ${loot.coins.gp} gp

---

### Найденные вещи и материалы
${itemsList}

${loot.valuable ? `\n### Драгоценная находка\n✦ **${loot.valuable}**\n` : ''}
### Диковинка (Trinket)
✦ *«${loot.trinket}»*

${loot.clue ? `\n### Сюжетная зацепка / Улика\n✦ **${loot.clue}**` : ''}
  `.trim();

  return {
    id: `lore-loot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    worldId: 'dnd5e_faerun',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: `Добыча: ${loot.source || 'Трофеи'}`,
    category: 'lore_item',
    summary: `Добыча (${loot.source || 'Трофей'}). Диковинка: ${loot.trinket}`,
    content: contentMarkdown,
    tags: ['Лут', 'Трофеи', loot.source || 'Добыча', 'Диковинки'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ----------------------------------------------------------------------
// 4. MERCHANT IMPORTERS
// ----------------------------------------------------------------------

export function createMerchantTokenItem(merchant: MerchantRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const tokenUrl = generateMerchantTokenSvg(merchant.shopType || 'general', merchant.name);
  const size = 100;
  return {
    id: `token-merchant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Торговец: ${merchant.name}`,
    type: 'image',
    url: tokenUrl,
    thumbnailUrl: tokenUrl,
    width: size,
    height: size,
    aspectRatio: 1,
    position: {
      x: spawnPos.x - Math.round(size / 2),
      y: spawnPos.y - Math.round(size / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 55,
    opacity: 1,
    hash: 'mer-tok-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'svg',
    category: 'Торговцы',
    layer: 'props',
    tags: ['Торговец', 'Лавка', merchant.name],
  };
}

export function createMerchantContentCardItem(merchant: MerchantRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const width = 420;
  const height = 500;

  const invText = merchant.inventory
    .map((item, idx) => `${idx + 1}. ${item.name} — [${item.price}]\n   ${item.desc}`)
    .join('\n\n');

  const compendiumItem = {
    id: `mer-comp-${Date.now()}`,
    systemId: 'dnd5e',
    systemName: 'D&D 5e',
    name: `Лавка: ${merchant.name}`,
    originalName: `Merchant Shop: ${merchant.name}`,
    category: 'shops',
    format: 'ShopInventory',
    summary: `${merchant.name} (${merchant.shopType || 'general'}). Характер: ${merchant.mood}`,
    snippet: `Товары в наличии:\n\n${invText}`,
    score: 1,
    matchType: 'exact',
    tags: ['Торговец', 'Лавка', 'Магазин', merchant.name],
    relativePath: 'shops',
    data: {
      merchantName: merchant.name,
      mood: merchant.mood,
      items: merchant.inventory,
    },
  };

  return {
    id: `mer-card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Лавка: ${merchant.name}`,
    type: 'card',
    url: '',
    thumbnailUrl: '',
    width,
    height,
    aspectRatio: width / height,
    position: {
      x: spawnPos.x - Math.round(width / 2),
      y: spawnPos.y - Math.round(height / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 65,
    opacity: 1,
    hash: 'mer-card-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'png',
    category: 'Лавка',
    layer: 'props',
    isContentCard: true,
    contentCardData: {
      item: compendiumItem as any,
      cardType: 'shops',
      viewMode: 'full',
    },
  };
}

export function createMerchantLoreItem(merchant: MerchantRawData): WorldLoreItem {
  const contentMarkdown = `
# Лавка торговца: ${merchant.name}

**Специализация:** ${merchant.shopType || 'Универсальная лавка'}  
**Характер торговца:** ${merchant.mood}

---

### Ассортимент товаров и ценники:
${merchant.inventory.map((i, idx) => `${idx + 1}. **${i.name}** — \`${i.price}\`\n   *${i.desc}*`).join('\n\n')}
  `.trim();

  return {
    id: `lore-mer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    worldId: 'dnd5e_faerun',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: `Лавка: ${merchant.name}`,
    category: 'shop_tavern_venue',
    summary: `Лавка торговца ${merchant.name}. ${merchant.mood}`,
    content: contentMarkdown,
    tags: ['Торговец', 'Лавка', merchant.name],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// ----------------------------------------------------------------------
// 6. MONSTER IMPORTERS
// ----------------------------------------------------------------------

export function createMonsterTokenItem(monster: MonsterRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const tokenUrl = generateMonsterTokenSvg(monster);
  const size = monster.size === 'Huge' || monster.size === 'Gargantuan' ? 150 : monster.size === 'Large' ? 120 : 100;
  return {
    id: `token-mon-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `${monster.name} (${monster.cr}, КБ ${monster.ac}, HP ${monster.hp})`,
    type: 'image',
    url: tokenUrl,
    thumbnailUrl: tokenUrl,
    width: size,
    height: size,
    aspectRatio: 1,
    position: {
      x: spawnPos.x - Math.round(size / 2),
      y: spawnPos.y - Math.round(size / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 60,
    opacity: 1,
    hash: 'mon-tok-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'svg',
    category: 'Токены',
    layer: 'props',
    tags: ['Монстр', 'Токен', monster.family, monster.cr],
  };
}

export function createMonsterSearchItem(monster: MonsterRawData) {
  return {
    id: `comp-mon-${monster.id}`,
    systemId: 'dnd5e',
    systemName: 'D&D 5e',
    name: monster.name,
    originalName: monster.originalName || monster.name,
    category: 'monsters' as const,
    format: 'MonsterStatblock',
    summary: `${monster.size} ${monster.type}, ${monster.alignment}. Хиты: ${monster.hp}, КД: ${monster.ac}, Опасность: ${monster.cr}`,
    snippet: `${monster.description}\n\nТактика: ${monster.tactics}\nДобыча: ${monster.loot}`,
    score: 1,
    matchType: 'exact',
    tags: ['Монстр', monster.family, monster.element, monster.cr],
    relativePath: 'monsters',
    stats: {
      hp: monster.hp,
      ac: monster.ac,
      speed: monster.speed,
      cr: monster.cr.replace('CR ', ''),
      str: monster.stats.STR,
      dex: monster.stats.DEX,
      con: monster.stats.CON,
      int: monster.stats.INT,
      wis: monster.stats.WIS,
      cha: monster.stats.CHA,
      savingThrows: monster.savingThrows,
      skills: monster.skills,
      damageResistances: monster.damageResistances,
      damageImmunities: monster.damageImmunities,
      conditionImmunities: monster.conditionImmunities,
      senses: monster.senses,
      passivePerception: monster.passivePerception,
      languages: monster.languages,
    },
    traits: monster.traits.map(t => ({ name: t.name, text: t.description })),
    actions: monster.actions.map(a => ({
      name: a.name,
      toHit: a.toHit !== undefined ? `${a.toHit}` : undefined,
      text: a.description,
      attackFormula: a.attackFormula,
    })),
    legendaryActions: monster.legendaryActions?.map(l => ({ name: l.name, text: l.description })),
    lairActions: monster.lairActions?.map(l => ({ name: l.name, text: l.description })),
  };
}

export function createMonsterContentCardItem(monster: MonsterRawData, spawnPos: { x: number; y: number } = { x: 0, y: 0 }): MapItem {
  const width = 450;
  const height = 550;
  const compendiumItem = createMonsterSearchItem(monster);

  return {
    id: `mon-card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: `Монстр: ${monster.name}`,
    type: 'card',
    url: '',
    thumbnailUrl: '',
    width,
    height,
    aspectRatio: width / height,
    position: {
      x: spawnPos.x - Math.round(width / 2),
      y: spawnPos.y - Math.round(height / 2),
    },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: 65,
    opacity: 1,
    hash: 'mon-card-' + Math.random().toString(36).substring(2, 8),
    fileSize: 0,
    format: 'png',
    category: 'Монстры',
    layer: 'props',
    isContentCard: true,
    contentCardData: {
      item: compendiumItem as any,
      cardType: 'monsters',
      viewMode: 'full',
    },
  };
}

export function createMonsterLoreItem(monster: MonsterRawData): WorldLoreItem {
  const contentMarkdown = `
# ${monster.name} (${monster.cr})

**Тип:** ${monster.type} (${monster.size}, ${monster.alignment})  
**Класс Доспеха:** ${monster.ac} (${monster.acSource}) | **Хиты:** ${monster.hp} (${monster.hitDice})  
**Скорость:** ${monster.speed}  

---

### Характеристики:
* **СИЛ:** ${monster.stats.STR} | **ЛОВ:** ${monster.stats.DEX} | **ТЕЛ:** ${monster.stats.CON}
* **ИНТ:** ${monster.stats.INT} | **МУД:** ${monster.stats.WIS} | **ХАР:** ${monster.stats.CHA}

**Чувства:** ${monster.senses} | **Языки:** ${monster.languages}  
${monster.damageImmunities ? `**Иммунитеты к урону:** ${monster.damageImmunities}\n` : ''}${monster.damageResistances ? `**Сопротивления:** ${monster.damageResistances}\n` : ''}

---

### Описание и Обитание:
${monster.description}

**Среда обитания:** ${monster.habitat}  
**Тактика боя:** ${monster.tactics}  
**Добыча:** ${monster.loot}  

---

### Особенности:
${monster.traits.map(t => `* **${t.name}:** ${t.description}`).join('\n')}

### Действия:
${monster.actions.map(a => `* **${a.name}:** ${a.description}`).join('\n')}
  `.trim();

  return {
    id: `lore-mon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    worldId: 'dnd5e_faerun',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: `Бестиарий: ${monster.name}`,
    category: 'lore_article',
    summary: `${monster.name} (${monster.cr}). ${monster.type}. HP: ${monster.hp}, AC: ${monster.ac}`,
    content: contentMarkdown,
    tags: ['Бестиарий', 'Монстр', monster.family, monster.element, monster.cr],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

