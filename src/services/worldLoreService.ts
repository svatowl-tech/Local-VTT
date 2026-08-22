import { writeDataToContentFolder, deleteDataFromContentFolder } from './universalSyncManager';
import { WorldLoreItem, WorldDefinition, LoreCategory } from '../types/worldLoreTypes';

export const DEFAULT_WORLDS: WorldDefinition[] = [
  {
    id: 'dnd5e_faerun',
    name: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    description: 'Легендарный мир магии, древних королеств, скрытых культов и великих героев.',
    subWorlds: [
      { id: 'sword_coast', name: 'Побережье Мечей (Sword Coast)' },
      { id: 'underdark', name: 'Подземье (Underdark)' },
      { id: 'chult', name: 'Чулт (Chult)' },
      { id: 'icewind_dale', name: 'Долина Ледяного Ветра (Icewind Dale)' },
    ],
  },
  {
    id: 'dnd5e_eberron',
    name: 'Эберрон (Eberron)',
    systemId: 'dnd5e',
    description: 'Мир магопанка, заснеженных дирижаблей, Домов с Драконьими Метками и шпионских войн.',
    subWorlds: [
      { id: 'sharn', name: 'Шарн — Город Башен' },
      { id: 'khorvaire', name: 'Континент Корвайр' },
      { id: 'mournland', name: 'Земли Стенаний' },
    ],
  },
  {
    id: 'cyberpunk_night_city',
    name: 'Найт-Сити (Cyberpunk Red)',
    systemId: 'cyberpunk_red',
    description: 'Неоновый мегаполис будущего, где правят мегакорпорации, киберпсихи и соло.',
    subWorlds: [
      { id: 'watson', name: 'Уотсон (Watson)' },
      { id: 'city_center', name: 'Городской Центр (City Center)' },
      { id: 'pacifica', name: 'Пасифика (Pacifica)' },
      { id: 'badlands', name: 'Пустоши (Badlands)' },
    ],
  },
  {
    id: 'coc_arkham',
    name: 'Аркхем и Ужасы Лавкрафта (Call of Cthulhu)',
    systemId: 'coc',
    description: '1920-е годы: Нуар, древние культы Великих Древних, безумие и Мискатоникский университет.',
    subWorlds: [
      { id: 'arkham_city', name: 'Город Аркхем' },
      { id: 'innsmouth', name: 'Иннсмут' },
      { id: 'dunwich', name: 'Данвич' },
    ],
  },
];

const INITIAL_LORE_ITEMS: WorldLoreItem[] = [
  // 1. FAERUN OVERVIEW
  {
    id: 'lore-faerun-overview',
    worldId: 'dnd5e_faerun',
    subWorldId: 'sword_coast',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: 'Забытые Королевства: Обзор Мира и Космология',
    originalName: 'Forgotten Realms World Lore & Cosmology',
    category: 'world_overview',
    summary: 'Общие сведения о континенте Фэерун, политике, магии Плетения и пантеоне божеств.',
    content: `
# Забытые Королевства (Faerûn)

**Фэерун** — главный континент мира Торил. Это край древней магии, великих городов-государств, забытых руин и непрекращающегося противостояния между древними культами и героями.

### Политическое устройство
Фэерун не имеет единого императора. Власть разделена между независимыми городами-государствами (**Глубоководье (Waterdeep)**, **Врата Балдура (Baldur's Gate)**, Невервинтер) и влиятельными организациями, такими как [[faction:lore-faction-harpers|Арфисты]] и [[faction:lore-faction-zhentarim|Жентарим]].

### Магия и Плетение (The Weave)
Вся магия в Фэеруне протекает через **Плетение** — божественную ткань, сотворенную богиней магии Мистрой. Заклинатели (такие как [[npc:lore-npc-elminster|Эльминстер]]) получают доступ к заклинаниям, настраиваясь на нити Плетения.

### Пантеон и Боги
- **Мистра** — Богиня Магии и Плетения.
- **Ильматер** — Бог сострадания и стойкости.
- **Сирик** — Бог обмана, убийств и безумия.
- **Тир** — Бог справедливости и праведного суда.
    `,
    tags: ['Космология', 'Фэерун', 'Мистра', 'Побережье Мечей'],
    overviewData: {
      politicsAndGovernment: 'Олигархические республики, торговые гильдии и советы Лордов.',
      economyAndTrade: 'Золотые драконы, торговые караваны Побережья Мечей, сильные купеческие кланы.',
      pantheonAndGods: [
        { name: 'Мистра', domain: 'Магия', alignment: 'Нейтрально-Добрая', description: 'Богиня магии' },
        { name: 'Сирик', domain: 'Обман, Безумие', alignment: 'Хаотично-Злой', description: 'Бог тёмного обмана' },
        { name: 'Тир', domain: 'Правосудие', alignment: 'Законно-Добрый', description: 'Бог справедливости' },
      ],
      cosmologyAndMagic: 'Великое Колесо (Great Wheel) и Плетение Магии Мистры.',
    },
  },

  // 2. SETTLEMENT: WATERDEEP
  {
    id: 'lore-settlement-waterdeep',
    worldId: 'dnd5e_faerun',
    subWorldId: 'sword_coast',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: 'Глубоководье (Waterdeep) — Город Сплинов',
    originalName: 'Waterdeep — City of Splendors',
    category: 'settlement',
    summary: 'Крупнейший мегаполис Побережья Мечей под управлением Тайных Лордов.',
    content: `
# Глубоководье (Waterdeep)

**Глубоководье** — величайший город Северных Земель. Он славится своей архитектурой, богатыми купеческими домами, тайным правительством и подземельем Гора Подгора (Undermountain).

### Управление и Тайные Лорды
Городом управляет Совет Лордов, большинство из которых носят маски и скрывают свои имена, чтобы избежать подкупа и шантажа. Публичным лордом является Open Lord.

### Районы Города
1. **Замковый Район (Castle Ward)** — административный центр и дворец.
2. **Морской Район (Sea Ward)** — виллы знати и великие храмы.
3. **Портовый Район (Dock Ward)** — пристанище таверн, моряков и контрабандистов [[faction:lore-faction-zhentarim|Жентарима]].
4. **Южный Район (Southern Ward)** — караван-сараи и ремесленники.

### Демография
Население составляет более 130,000 жителей. Люди составляют около 60%, эльфы — 10%, полуэльфы — 8%, дворфы — 10%, гафлинги — 7%, остальные расы — 5%.
    `,
    tags: ['Город', 'Глубоководье', 'Побережье Мечей', 'Лорды'],
    settlementData: {
      type: 'metropolis',
      population: 130000,
      rulingBody: 'Совет Тайных Лордов Глубоководья',
      politicsEconomy: 'Торговая столица, контролирующая морские и сухопутные пути.',
      demographics: [
        { raceName: 'Люди', percentage: 60 },
        { raceName: 'Дворфы', percentage: 10 },
        { raceName: 'Эльфы', percentage: 10 },
        { raceName: 'Полуэльфы', percentage: 8 },
        { raceName: 'Полурослики', percentage: 7 },
        { raceName: 'Прочие (Драконорожденные, Дроу, Тифлинги)', percentage: 5 },
      ],
      districts: ['Castle Ward', 'Sea Ward', 'Dock Ward', 'Trades Ward', 'Southern Ward'],
      notableNpcIds: ['lore-npc-elminster'],
    },
  },

  // 3. NPC: ELMINSTER
  {
    id: 'lore-npc-elminster',
    worldId: 'dnd5e_faerun',
    subWorldId: 'sword_coast',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: 'Эльминстер Аумар (Elminster Aumar)',
    originalName: 'Elminster Aumar — Sage of Shadowdale',
    category: 'npc_figure',
    summary: 'Мудрец из Долины Тейн, Избранный Мистры и один из сильнейших магов Фэеруна.',
    content: `
# Эльминстер Аумар

**Эльминстер** — легендарный Мудрец Теневой Долины, Избранный Богини Мистры. Ему более тысячи лет. Он является защитником баланса в Королевствах и соратником [[faction:lore-faction-harpers|Арфистов]].

### Характер и Роль
Внешне выглядит как седой старик в поношенной мантии с курительной трубкой, извергающей синий дым. Он предпочитает решать проблемы хитростью и направлять молодых героев, но при угрозе миру способен использовать сильнейшие заклинания магии.

### Игровые Характеристики (D&D 5e)
- **Класс / Уровень:** Волшебник 20+ / Избранный Мистры
- **Класс Доспеха:** 18 (Магический барьер)
- **Хит-поинты:** 245
- **Ключевые Заклинания:** Time Stop, Wish, Meteor Swarm, Fireball.
    `,
    tags: ['НИП', 'Волшебник', 'Эльминстер', 'Избранный Мистры', 'Арфисты'],
    npcData: {
      titleOrRole: 'Мудрец Теневой Долины / Избранный Мистры',
      factionId: 'lore-faction-harpers',
      locationId: 'lore-settlement-waterdeep',
      race: 'Человек (Избранный)',
      alignment: 'Хаотично-Добрый',
      personality: 'Остроумный, мудрый, любит трубки с табаком и загадки.',
      backgroundLore: 'Живет тысячелетие, спасал Фэерун сотни раз от архидемонов и личей.',
    },
    linkedRuleIds: ['dnd5e-spell-fireball', 'dnd5e-monster-archmage'],
  },

  // 4. FACTION / CULT: HARPERS
  {
    id: 'lore-faction-harpers',
    worldId: 'dnd5e_faerun',
    subWorldId: 'sword_coast',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: 'Арфисты (The Harpers)',
    originalName: 'The Harpers',
    category: 'faction_cult',
    summary: 'Тайная организация добровольцев, бардов и магов, защищающих свободу и баланс.',
    content: `
# Арфисты (The Harpers)

**Арфисты** — тайное сообщество, стремящееся поддерживать баланс между цивилизацией и природой, а также бороться с тиранией, злыми культами и тираническими правителями.

### Символ и Структура
Символ Арфистов — серебряная арфа в кольце из серебряной луны. Они работают ячейками, агент не всегда знает всех членов организации.

### Связанные личности
- [[npc:lore-npc-elminster|Эльминстер Аумар]]
- Ремилия Хаверворс (Лорд Глубоководья)
    `,
    tags: ['Фракция', 'Арфисты', 'Добро', 'Тайное общество'],
    factionData: {
      factionType: 'secret_society',
      leaderNpcId: 'lore-npc-elminster',
      alignment: 'Хаотично-Добрый',
      goalsAndPhilosophy: 'Сохранение истории, защита угнетенных, предотвращение концентрации власти в руках тиранов.',
      hierarchyAndRanks: ['Watcher (Наблюдатель)', 'Harper (Арфист)', 'High Harper (Высший Арфист)'],
      associatedNpcIds: ['lore-npc-elminster'],
    },
  },

  // 5. FACTION / CULT: CULT OF THE DRAGON
  {
    id: 'lore-faction-cult-dragon',
    worldId: 'dnd5e_faerun',
    subWorldId: 'sword_coast',
    worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
    systemId: 'dnd5e',
    name: 'Культ Дракона (Cult of the Dragon)',
    originalName: 'Cult of the Dragon',
    category: 'faction_cult',
    summary: 'Фанатичный религиозный культ, поклоняющийся древним драконам и Тиамат.',
    content: `
# Культ Дракона

**Культ Дракона** — древняя фанатичная организация, верившая, что неживые драконы (драколичи) в конечном итоге будут править Фэеруном. В последнее время фракция **Пурпурных Повелителей** переключилась на призвание пятиглавой богини драконов **Тиамат** из Девяти Преисподних.

### Иерархия
- **Dragonclaw (Драконий Коготь)** — рядовые культисты.
- **Dragonwing & Dragonsoul** — офицеры и элитные бойцы.
- **Wyrmspeaker (Повелитель Червей)** — 5 высших лидеров, владеющих Масками Дракона.
    `,
    tags: ['Культ', 'Драконы', 'Тиамат', 'Зло'],
    factionData: {
      factionType: 'cult',
      alignment: 'Нейтрально-Злой / Хаотично-Злой',
      goalsAndPhilosophy: 'Призвание Тиамат, накопление сокровищ для драконов и установление драконьей власти.',
      hierarchyAndRanks: ['Cultist', 'Dragonclaw', 'Dragonwing', 'Dragonsoul', 'Wyrmspeaker'],
    },
  },

  // 6. EBERRON: SHARN
  {
    id: 'lore-settlement-sharn',
    worldId: 'dnd5e_eberron',
    subWorldId: 'sharn',
    worldName: 'Эберрон (Eberron)',
    systemId: 'dnd5e',
    name: 'Шарн (Sharn) — Город Башен',
    originalName: 'Sharn — City of Towers',
    category: 'settlement',
    summary: 'Вертикальный магопанк-мегаполис на Эберроне, возвышающийся над облаками.',
    content: `
# Шарн — Город Башен

**Шарн** — самый крупный и впечатляющий город континента Корвайр. Построенный над манифестной зоной Сираннии (Плана Воздуха), город растет исключительно вверх в виде колоссальных шпилей и башен.

### Архитектура и Магия
Дирижабли, работающие на элементалях, курсируют между башнями. Внизу, в Глубинах (The Depths) и Клогге, живут бедняки и монстры, а на Верхних плато парят дворцы знати и Домов с Драконьими Метками.
    `,
    tags: ['Шарн', 'Эберрон', 'Магопанк', 'Город'],
    settlementData: {
      type: 'metropolis',
      population: 500000,
      rulingBody: 'Городской Совет Шарна и Командующий Стражей',
      politicsEconomy: 'Центр торговли, дирижаблей и магтехнологий.',
    },
  },

  // 7. CYBERPUNK: NIGHT CITY
  {
    id: 'lore-settlement-night-city',
    worldId: 'cyberpunk_night_city',
    subWorldId: 'city_center',
    worldName: 'Найт-Сити (Cyberpunk Red)',
    systemId: 'cyberpunk_red',
    name: 'Найт-Сити (Night City)',
    originalName: 'Night City — Free City of Del Coronado',
    category: 'settlement',
    summary: 'Независимый свободный мегаполис в Новой Калифорнии, арена войн корпораций Arasaka и Militech.',
    content: `
# Найт-Сити (Night City)

**Найт-Сити** — свободный мегаполис на западе США. Основан Ричардом Найтом в 1994 году. Здесь нет традиционного правительства — всё контролируется Советом Мегакорпораций и уличными бандами.

### Районы
- **City Center:** Небоскребы Arasaka, Militech, Petrochem.
- **Watson:** Промышленный район, засилье банды Maelstrom и Tyger Claws.
- **Pacifica:** Заброшенная курортная зона, оплот Voodoo Boys.
    `,
    tags: ['Киберпанк', 'Найт-Сити', 'Arasaka', 'Банды'],
    settlementData: {
      type: 'metropolis',
      population: 5000000,
      rulingBody: 'Корпоративный Совет Найт-Сити',
    },
  },
];

class WorldLoreService {
  private memoryLoreItems: Map<string, WorldLoreItem> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private isTauriAvailable(): boolean {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      // Load initial defaults
      INITIAL_LORE_ITEMS.forEach((item) => this.memoryLoreItems.set(item.id, item));

      try {
        // Sync defaults from localStorage fallback
        const raw = localStorage.getItem('aethermap_world_lore_items_v1');
        if (raw) {
          const stored = JSON.parse(raw);
          if (stored && Array.isArray(stored) && stored.length > 0) {
            stored.forEach((item: WorldLoreItem) => this.memoryLoreItems.set(item.id, item));
          }
        }
      } catch (e) {
        console.warn('Failed to load lore items from localStorage:', e);
      }

      // Attempt to load active world lore from disk
      try {
        await this.scanAndSyncFolder('dnd5e_faerun', false);
      } catch (e) {
        console.warn('On-disk scan during init skipped:', e);
      }

      this.initialized = true;
    })();

    return this.initPromise;
  }

  private async persist(): Promise<void> {
    try {
      const items = Array.from(this.memoryLoreItems.values());
      localStorage.setItem('aethermap_world_lore_items_v1', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to persist lore items:', e);
    }
  }

  public getAllWorlds(): WorldDefinition[] {
    return DEFAULT_WORLDS;
  }

  private getApiUrl(endpoint: string): string {
    return endpoint;
  }

  /**
   * Scan & Sync lore folder on disk (Tauri Rust / Express Backend)
   * Skips re-parsing source files if individual entity JSON files already exist unless forceReparse is true!
   */
  public async scanAndSyncFolder(worldId: string, forceReparse: boolean = false): Promise<WorldLoreItem[]> {
    if (forceReparse) {
      for (const [id, item] of Array.from(this.memoryLoreItems.entries())) {
        if (item.worldId === worldId) {
          this.memoryLoreItems.delete(id);
        }
      }
    }

    const worldDef = DEFAULT_WORLDS.find((w) => w.id === worldId) || DEFAULT_WORLDS[0];
    const worldFolder = worldDef.id.includes('faerun')
      ? 'Faerun_DND5e'
      : worldDef.id.includes('eberron')
      ? 'Eberron_DND5e'
      : worldDef.id.includes('night_city')
      ? 'Cyberpunk_RED'
      : worldDef.id.includes('arkham')
      ? 'Call_of_Cthulhu'
      : 'Generic_Worlds';

    if (this.isTauriAvailable()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res: any = await invoke('scan_lore_folder_incremental_rust', {
          loreDir: 'assets/lore',
          worldFolder,
          targetWorldId: worldId,
          targetSystemId: worldDef.systemId,
          forceReparse,
        });

        if (res && res.entities && Array.isArray(res.entities)) {
          res.entities.forEach((ent: any) => {
            const item: WorldLoreItem = {
              id: ent.id || `lore-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              worldId,
              worldName: worldDef.name,
              systemId: worldDef.systemId,
              name: ent.name,
              category: ent.category || 'lore_article',
              summary: ent.summary || ent.description?.substring(0, 160) || ent.name,
              content: ent.description || ent.summary || ent.name,
              tags: ent.tags || [worldId],
              imageUrl: ent.rawContent?.imageUrl || ent.imageUrl,
              gmNotes: ent.rawContent?.gmNotes || ent.gmNotes,
            };
            this.memoryLoreItems.set(item.id, item);
          });
        }
        return Array.from(this.memoryLoreItems.values());
      } catch (err) {
        console.info('Tauri lore scan unavailable or failed:', err);
        return Array.from(this.memoryLoreItems.values()); // FAST FAIL IN TAURI, do not hit Express!
      }
    }

    // Fallback or Web Mode: Express Server API
    try {
      const endpoint = forceReparse ? '/api/lore/reparse' : `/api/lore/scan?worldId=${encodeURIComponent(worldId)}`;
      const options: RequestInit = forceReparse
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ worldId }),
          }
        : { method: 'GET' };

      const url = this.getApiUrl(endpoint);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.toLowerCase().includes('application/json')) {
          const data = await res.json();
          const itemsList = data.loreItems || data.items;
          if (itemsList && Array.isArray(itemsList)) {
            itemsList.forEach((item: WorldLoreItem) => {
              this.memoryLoreItems.set(item.id, item);
            });
          }
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        console.info('Lore scan request timed out, operating in client storage mode.');
      } else {
        console.info('Express lore scan endpoint offline or unreachable, using client storage mode.');
      }
    }

    await this.persist();
    return this.getItemsByWorld(worldId);
  }

  /**
   * Reset existing parsed structure on disk and re-parse source files from scratch
   */
  public async reparseFolderFromScratch(worldId: string): Promise<{ success: boolean; items: WorldLoreItem[]; message: string }> {
    const items = await this.scanAndSyncFolder(worldId, true);
    return {
      success: true,
      items,
      message: `Структура успешно сброшена! Перепарсено заново записей: ${items.length}`,
    };
  }

  public async getAllLoreItems(): Promise<WorldLoreItem[]> {
    await this.init();
    return Array.from(this.memoryLoreItems.values());
  }

  public async getItemsByWorld(worldId: string, category?: LoreCategory): Promise<WorldLoreItem[]> {
    await this.init();
    const all = Array.from(this.memoryLoreItems.values());
    return all.filter((item) => {
      if (worldId !== 'all' && item.worldId !== worldId) return false;
      if (category && category !== ('all' as any) && item.category !== category) return false;
      return true;
    });
  }

  public async searchLore(query: string, worldId?: string, category?: LoreCategory | 'all'): Promise<WorldLoreItem[]> {
    await this.init();
    const q = query.trim().toLowerCase();
    const all = Array.from(this.memoryLoreItems.values());

    return all.filter((item) => {
      if (worldId && worldId !== 'all' && item.worldId !== worldId) return false;
      if (category && category !== ('all' as any) && item.category !== category) return false;

      if (!q) return true;

      const nameMatch = item.name.toLowerCase().includes(q) || item.originalName?.toLowerCase().includes(q);
      const summaryMatch = item.summary.toLowerCase().includes(q);
      const contentMatch = item.content.toLowerCase().includes(q);
      const tagMatch = item.tags.some((t) => t.toLowerCase().includes(q));

      return nameMatch || summaryMatch || contentMatch || tagMatch;
    });
  }

  public async getItemById(id: string): Promise<WorldLoreItem | null> {
    await this.init();
    return this.memoryLoreItems.get(id) || null;
  }

    public async saveItem(item: WorldLoreItem): Promise<WorldLoreItem> {
    await this.init();
    const updated: WorldLoreItem = {
      ...item,
      updatedAt: Date.now(),
      createdAt: item.createdAt || Date.now(),
    };
    this.memoryLoreItems.set(updated.id, updated);
    await this.persist();

    // Persist as individual JSON file on disk
    const worldFolder = item.worldId.includes('faerun')
      ? 'Faerun_DND5e'
      : item.worldId.includes('eberron')
      ? 'Eberron_DND5e'
      : item.worldId.includes('night_city')
      ? 'Cyberpunk_RED'
      : item.worldId.includes('arkham')
      ? 'Call_of_Cthulhu'
      : 'Generic_Worlds';

    const cleanFilename = `lore_${item.category}_${item.id}.json`;
    await writeDataToContentFolder(['lore', worldFolder], cleanFilename, updated);
    return updated;
  }

    public async deleteItem(id: string, worldId?: string): Promise<boolean> {
    await this.init();
    const item = this.memoryLoreItems.get(id);
    const deleted = this.memoryLoreItems.delete(id);
    if (deleted) {
      await this.persist();

      const targetWorldId = worldId || item?.worldId || 'dnd5e_faerun';
      const worldFolder = targetWorldId.includes('faerun')
        ? 'Faerun_DND5e'
        : targetWorldId.includes('eberron')
        ? 'Eberron_DND5e'
        : targetWorldId.includes('night_city')
        ? 'Cyberpunk_RED'
        : targetWorldId.includes('arkham')
        ? 'Call_of_Cthulhu'
        : 'Generic_Worlds';

      const cleanFilename = item ? `lore_${item.category}_${item.id}.json` : `${id}.json`;
      await deleteDataFromContentFolder(['lore', worldFolder], cleanFilename);
    }
    return deleted;
  }



} 

export const worldLoreService = new WorldLoreService();
