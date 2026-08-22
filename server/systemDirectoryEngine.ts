import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  TTRPGSystemManifest,
  SystemDataItem,
  SystemCategorySummary,
  SystemsScanResult,
  UniversalParsedEntity,
} from '../src/types/systemDataTypes';
import { universalParserEngine } from './parsers/universalParserEngine';

const DEFAULT_SYSTEMS_DIR_NAME = 'systems';
const SUPPORTED_EXTENSIONS = [
  '.json',
  '.yaml',
  '.yml',
  '.md',
  '.txt',
  '.pdf',
  '.xml',
  '.gcs',
  '.csv',
  '.tsv',
  '.db',
  '.jsonl',
];

interface FileCacheEntry {
  mtime: number;
  size: number;
  items: SystemDataItem[];
}

// Predefined manifests for core supported TTRPG systems
const BUILTIN_SYSTEMS_PRESETS: Record<
  string,
  {
    name: string;
    shortName: string;
    description: string;
    icon: string;
    color: string;
    defaultCategories: string[];
    sampleFiles: Array<{ category: string; filename: string; content: string }>;
  }
> = {
  'dnd5e': {
    name: 'Dungeons & Dragons 5e',
    shortName: 'D&D 5e',
    description: 'Система правил 5-й редакции D&D. Монстры, заклинания, расы, классы, предметы и правила SRD.',
    icon: 'swords',
    color: 'rose',
    defaultCategories: ['monsters', 'spells', 'races', 'classes', 'items', 'rules', 'lore'],
    sampleFiles: [
      {
        category: 'monsters',
        filename: 'goblin.json',
        content: JSON.stringify(
          {
            name: 'Гоблин (Goblin)',
            size: 'Small',
            type: 'humanoid (goblinoid)',
            alignment: 'neutral evil',
            armorClass: 15,
            hitPoints: 7,
            hitDice: '2d6',
            speed: '30 ft.',
            cr: '1/4',
            xp: 50,
            stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
            skills: { stealth: 6 },
            senses: 'darkvision 60 ft., passive Perception 9',
            languages: 'Common, Goblin',
            abilities: [
              {
                name: 'Проворный побег (Nimble Escape)',
                description: 'Гоблин может в каждый свой ход бонусным действием совершить Отход или Засаду.',
              },
            ],
            actions: [
              {
                name: 'Скимитар (Scimitar)',
                description: 'Рукопашная атака оружием: +4 к попаданию, досягаемость 5 фт., одна цель. Попадание: 5 (1d6 + 2) рубящего урона.',
              },
              {
                name: 'Короткий лук (Shortbow)',
                description: 'Дальнобойная атака оружием: +4 к попаданию, дистанция 80/320 фт., одна цель. Попадание: 5 (1d6 + 2) колющего урона.',
              },
            ],
          },
          null,
          2
        ),
      },
      {
        category: 'spells',
        filename: 'fireball.json',
        content: JSON.stringify(
          {
            name: 'Огненный шар (Fireball)',
            level: 3,
            school: 'Evocation',
            castingTime: '1 action',
            range: '150 feet',
            components: 'V, S, M (a tiny ball of bat guano and sulfur)',
            duration: 'Instantaneous',
            description: 'Яркий луч вспыхивает из вашего пальца в точку, выбранную вами в пределах дистанции, а затем с негромким грохотом взрывается огненным пламенем. Каждое существо в сфере радиусом 20 футов с центром в этой точке должно совершить спасбросок Ловкости. Цель получает 8d6 урона огнем при провале или половину урона при успехе.',
          },
          null,
          2
        ),
      },
      {
        category: 'races',
        filename: 'human.json',
        content: JSON.stringify(
          {
            name: 'Человек (Human)',
            speed: 30,
            abilityScoreIncrease: 'Все характеристики +1',
            size: 'Medium',
            traits: ['Язык: Общий и один дополнительный'],
          },
          null,
          2
        ),
      },
    ],
  },
  'pathfinder2e': {
    name: 'Pathfinder 2e',
    shortName: 'PF2e',
    description: 'Система правил Pathfinder Второй редакции. Бестиарий, заклинания, родословные, черты и экипировка.',
    icon: 'shield',
    color: 'amber',
    defaultCategories: ['bestiary', 'spells', 'ancestries', 'classes', 'feats', 'items', 'rules'],
    sampleFiles: [
      {
        category: 'bestiary',
        filename: 'wolf.json',
        content: JSON.stringify(
          {
            name: 'Волк (Wolf)',
            level: 1,
            traits: ['Animal'],
            perception: 7,
            ac: 15,
            hp: 24,
            fortitude: 7,
            reflex: 7,
            will: 4,
            speed: '35 feet',
            attacks: [
              {
                name: 'Укус (Jaws)',
                bonus: 9,
                damage: '1d6+2 колющий + Knockdown',
              },
            ],
          },
          null,
          2
        ),
      },
      {
        category: 'spells',
        filename: 'heal.json',
        content: JSON.stringify(
          {
            name: 'Исцеление (Heal)',
            rank: 1,
            traditions: ['divine', 'primal'],
            actions: '1 to 3 actions',
            description: 'Вы направляете позитивную энергию для исцеления живых или нанесения урона нежити.',
          },
          null,
          2
        ),
      },
    ],
  },
  'cyberpunk': {
    name: 'Cyberpunk RED / 2020',
    shortName: 'Cyberpunk',
    description: 'Мрачное будущее, киберимпланты, оружие, роли фиксеров, соло, нетраннеров и боевые правила.',
    icon: 'zap',
    color: 'cyan',
    defaultCategories: ['cyberware', 'roles', 'weapons', 'netrunning', 'enemies', 'gear', 'rules'],
    sampleFiles: [
      {
        category: 'cyberware',
        filename: 'sandevistan.json',
        content: JSON.stringify(
          {
            name: 'Сандевистан (Sandevistan Speedware)',
            install: 'Hospital',
            humanityLoss: '2d6 (7)',
            cost: '500eb (Expensive)',
            description: 'Позволяет добавить +3 к броскам Инициативы на 1 минуту при активации.',
          },
          null,
          2
        ),
      },
      {
        category: 'weapons',
        filename: 'heavy_pistol.json',
        content: JSON.stringify(
          {
            name: 'Тяжелый пистолет (Heavy Pistol)',
            weaponSkill: 'Handgun',
            damage: '3d6',
            magazine: 8,
            rateOfFire: 2,
            cost: '100eb',
          },
          null,
          2
        ),
      },
    ],
  },
  'gurps': {
    name: 'GURPS 4th Edition',
    shortName: 'GURPS',
    description: 'Универсальная бесклассовая система GURPS 4e. Преимущества, недостатки, навыки, снаряжение и шаблоны.',
    icon: 'book',
    color: 'emerald',
    defaultCategories: ['advantages', 'disadvantages', 'skills', 'equipment', 'templates', 'rules'],
    sampleFiles: [
      {
        category: 'advantages',
        filename: 'combat_reflexes.json',
        content: JSON.stringify(
          {
            name: 'Боевые рефлексы (Combat Reflexes)',
            points: 15,
            type: 'Physical/Mental',
            description: '+1 ко всем активным защитам, +1 к броскам на выход из шока, +2 к броскам на испуг.',
          },
          null,
          2
        ),
      },
    ],
  },
  'coc': {
    name: 'Call of Cthulhu 7e',
    shortName: 'CoC 7e',
    description: 'Зов Ктулху 7-я редакция. Детективы, чудовища мифов Лавкрафта, заклинания, проверки рассудка и профессии.',
    icon: 'skull',
    color: 'purple',
    defaultCategories: ['investigators', 'monsters', 'spells', 'occupations', 'tomes', 'rules'],
    sampleFiles: [
      {
        category: 'monsters',
        filename: 'deep_one.json',
        content: JSON.stringify(
          {
            name: 'Глубоководный (Deep One)',
            str: 70,
            con: 55,
            siz: 80,
            dex: 50,
            int: 65,
            pow: 50,
            hp: 13,
            damageBonus: '+1D4',
            build: 1,
            move: '8 / Swim 10',
            sanityLoss: '0/1D6',
            attacks: '1 per round (Claw 25%, 1D6 + db)',
          },
          null,
          2
        ),
      },
    ],
  },
  'lore': {
    name: 'Roleplaying Systems Lore',
    shortName: 'Lore & Worlds',
    description: 'База знаний лора миров, географии, фракций, НИП и хроник истории TTRPG сеттингов.',
    icon: 'globe',
    color: 'amber',
    defaultCategories: ['Worlds', 'Settlements', 'Factions', 'NPCs', 'Articles'],
    sampleFiles: [
      {
        category: 'Worlds',
        filename: 'faerun_sword_coast.json',
        content: JSON.stringify(
          {
            id: 'world-faerun-sword-coast',
            name: 'Забытые Королевства: Побережье Мечей (Sword Coast)',
            originalName: 'Forgotten Realms: Sword Coast World Lore',
            category: 'world_overview',
            systemId: 'dnd5e',
            worldId: 'dnd5e_faerun',
            summary: 'Справочник лора региона Побережья Мечей: Глубоководье, Врата Балдура, Невервинтер.',
            content: '# Побережье Мечей (Sword Coast)\n\nПобережье Мечей — легендарный регион континента Фэерун...',
            tags: ['Фэерун', 'Побережье Мечей', 'Миры'],
            overviewData: {
              politicsAndGovernment: 'Совет Лордов Побережья Мечей',
              economyAndTrade: 'Торговые пути и купеческие гильдии',
            },
          },
          null,
          2
        ),
      },
    ],
  },
};

export class SystemDirectoryEngine {
  private systemsRoot: string;
  private activeSystemId: string = 'dnd5e';
  private cachedScan: SystemsScanResult | null = null;
  private lastRevision: string = '';

  private fileCache: Map<string, FileCacheEntry> = new Map();

  constructor(customAssetsRoot?: string) {
    const baseAssetsRoot = customAssetsRoot || path.join(process.cwd(), 'assets');
    this.systemsRoot = path.join(baseAssetsRoot, DEFAULT_SYSTEMS_DIR_NAME);
  }

  public getSystemsRoot(): string {
    return this.systemsRoot;
  }

  public setSystemsRoot(newRoot: string): void {
    this.systemsRoot = newRoot;
    this.cachedScan = null;
    this.fileCache.clear();
  }

  public getActiveSystemId(): string {
    return this.activeSystemId;
  }

  public setActiveSystemId(systemId: string): void {
    this.activeSystemId = systemId;
  }

  /**
   * Initializes canonical systems folder structure on disk
   */
  public ensureCanonicalStructure(): void {
    if (!fs.existsSync(this.systemsRoot)) {
      fs.mkdirSync(this.systemsRoot, { recursive: true });
    }

    // Top-level README
    const mainReadmePath = path.join(this.systemsRoot, 'README.txt');
    if (!fs.existsSync(mainReadmePath)) {
      fs.writeFileSync(
        mainReadmePath,
        `=== ПАПКА РОЛЕВЫХ СИСТЕМ (AETHERMAP TTRPG SYSTEMS) ===\n\n` +
          `В этой папке хранятся файлы правил, бестиариев, заклинаний, рас, классов, предметов и таблиц.\n` +
          `Приложение автоматически сканирует эту папку, распознаёт любые созданные подпапки как новые ролевые системы\n` +
          `и сразу парсит помещённые файлы (Foundry VTT, Roll20, 5eTools, PDF, GURPS, XML, CSV, Markdown, JSON)!\n\n` +
          `Структура папок:\n` +
          `systems/\n` +
          `  ├── D&D_5e/\n` +
          `  │    ├── monsters/     (Монстры и NPC в JSON, MD, PDF или 5eTools)\n` +
          `  │    ├── spells/       (Заклинания)\n` +
          `  │    ├── races/        (Расы и народности)\n` +
          `  │    ├── classes/      (Классы)\n` +
          `  │    ├── items/        (Оружие, броня, лут, CSV таблицы)\n` +
          `  │    └── rules/        (Справочные правила)\n` +
          `  ├── Pathfinder_2e/\n` +
          `  ├── Cyberpunk_RED/\n` +
          `  ├── GURPS_4e/\n` +
          `  ├── Call_of_Cthulhu/\n` +
          `  └── [Любая_Ваша_Папка]/ (Любая новая папка станет доступной системой в меню выбора!)\n\n` +
          `Поддерживаемые форматы: .json, .pdf, .txt, .md, .xml, .gcs, .yaml, .yml, .csv, .tsv, .db, .jsonl\n`,
        'utf8'
      );
    }

    // Create default preset folders and sample files if missing
    for (const [sysKey, preset] of Object.entries(BUILTIN_SYSTEMS_PRESETS)) {
      const folderName = this.getStandardFolderName(sysKey, preset.name);
      const sysDir = path.join(this.systemsRoot, folderName);

      if (!fs.existsSync(sysDir)) {
        fs.mkdirSync(sysDir, { recursive: true });
      }

      // Create manifest.json
      const manifestPath = path.join(sysDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) {
        const manifest: TTRPGSystemManifest = {
          id: sysKey,
          name: preset.name,
          shortName: preset.shortName,
          folderName,
          description: preset.description,
          icon: preset.icon,
          color: preset.color,
          version: '1.0.0',
          categories: preset.defaultCategories,
          totalFiles: 0,
          categoryStats: {},
        };
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
      }

      // Create category subfolders
      for (const cat of preset.defaultCategories) {
        const catDir = path.join(sysDir, cat);
        if (!fs.existsSync(catDir)) {
          fs.mkdirSync(catDir, { recursive: true });
        }
      }

      // Create sample files
      for (const sample of preset.sampleFiles) {
        const filePath = path.join(sysDir, sample.category, sample.filename);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, sample.content, 'utf8');
        }
      }
    }
  }

  private getStandardFolderName(sysKey: string, sysName: string): string {
    switch (sysKey) {
      case 'dnd5e':
        return 'D&D_5e';
      case 'pathfinder2e':
        return 'Pathfinder_2e';
      case 'cyberpunk':
        return 'Cyberpunk_RED';
      case 'gurps':
        return 'GURPS_4e';
      case 'coc':
        return 'Call_of_Cthulhu';
      case 'lore':
        return 'Lore';
      default:
        return sysName.replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
    }
  }

  /**
   * Scans the systems root folder and parses all available systems and data items
   */
  public scanSystems(): SystemsScanResult {
    this.ensureCanonicalStructure();

    const discoveredSystems: TTRPGSystemManifest[] = [];
    let totalFilesCount = 0;
    let revisionContent = '';

    if (!fs.existsSync(this.systemsRoot)) {
      return {
        systems: [],
        activeSystemId: this.activeSystemId,
        totalSystemsCount: 0,
        totalSystemFilesCount: 0,
        lastScannedAt: Date.now(),
      };
    }

    try {
      const entries = fs.readdirSync(this.systemsRoot, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

        const sysFolderPath = path.join(this.systemsRoot, entry.name);
        const manifestPath = path.join(sysFolderPath, 'manifest.json');

        let systemManifest: Partial<TTRPGSystemManifest> = {};
        if (fs.existsSync(manifestPath)) {
          try {
            const raw = fs.readFileSync(manifestPath, 'utf8');
            systemManifest = JSON.parse(raw);
          } catch (e) {
            console.warn(`Could not parse manifest at ${manifestPath}:`, e);
          }
        }

        const sysId =
          systemManifest.id ||
          entry.name.toLowerCase().replace(/[^a-z0-9_\u0400-\u04FF]/g, '_');
        const sysName =
          systemManifest.name ||
          entry.name.replace(/_/g, ' ');
        const shortName = systemManifest.shortName || sysName.slice(0, 12);
        const description =
          systemManifest.description ||
          `Пользовательская игровая система «${sysName}». Файлы и правила из папки ${entry.name}.`;
        const icon = systemManifest.icon || this.inferSystemIcon(entry.name);
        const color = systemManifest.color || this.inferSystemColor(entry.name);

        const categoryStats: Record<string, number> = {};
        const categoriesSet = new Set<string>();
        let sysFileCount = 0;

        // Scan subfolders and files inside this system directory
        const subEntries = fs.readdirSync(sysFolderPath, { withFileTypes: true });
        for (const sub of subEntries) {
          if (sub.name.startsWith('.') || sub.name === 'manifest.json' || sub.name === 'README.txt') {
            continue;
          }

          if (sub.isDirectory()) {
            const catName = sub.name;
            categoriesSet.add(catName);
            const catPath = path.join(sysFolderPath, catName);
            const files = fs.readdirSync(catPath);

            let countInCat = 0;
            for (const file of files) {
              if (file.startsWith('.') || file === 'README.txt') continue;
              const ext = path.extname(file).toLowerCase();
              if (SUPPORTED_EXTENSIONS.includes(ext)) {
                countInCat++;
                sysFileCount++;
                totalFilesCount++;
                try {
                  const stat = fs.statSync(path.join(catPath, file));
                  revisionContent += `${sysId}/${catName}/${file}:${stat.mtimeMs}|`;
                } catch {
                  revisionContent += `${sysId}/${catName}/${file}|`;
                }
              }
            }
            categoryStats[catName] = countInCat;
          } else if (sub.isFile()) {
            const ext = path.extname(sub.name).toLowerCase();
            if (SUPPORTED_EXTENSIONS.includes(ext)) {
              sysFileCount++;
              totalFilesCount++;
              // Infer category from file name if root-level (e.g. monsters.json -> monsters)
              const baseNameLower = path.basename(sub.name, ext).toLowerCase();
              let inferredCat = 'general';
              if (baseNameLower.includes('monster') || baseNameLower.includes('bestiary') || baseNameLower.includes('creature')) {
                inferredCat = 'monsters';
              } else if (baseNameLower.includes('spell') || baseNameLower.includes('magic')) {
                inferredCat = 'spells';
              } else if (baseNameLower.includes('item') || baseNameLower.includes('equipment') || baseNameLower.includes('loot') || baseNameLower.includes('weapon')) {
                inferredCat = 'items';
              } else if (baseNameLower.includes('rule') || baseNameLower.includes('guide')) {
                inferredCat = 'rules';
              } else if (baseNameLower.includes('character') || baseNameLower.includes('actor') || baseNameLower.includes('npc')) {
                inferredCat = 'characters';
              } else if (baseNameLower.includes('table') || baseNameLower.includes('roll')) {
                inferredCat = 'tables';
              }

              categoriesSet.add(inferredCat);
              categoryStats[inferredCat] = (categoryStats[inferredCat] || 0) + 1;
              try {
                const stat = fs.statSync(path.join(sysFolderPath, sub.name));
                revisionContent += `${sysId}/${inferredCat}/${sub.name}:${stat.mtimeMs}|`;
              } catch {
                revisionContent += `${sysId}/${inferredCat}/${sub.name}|`;
              }
            }
          }
        }

        const finalCategories =
          systemManifest.categories && systemManifest.categories.length > 0
            ? Array.from(new Set([...systemManifest.categories, ...Array.from(categoriesSet)]))
            : Array.from(categoriesSet);

        // Auto-save manifest if it didn't exist
        if (!fs.existsSync(manifestPath)) {
          try {
            const autoManifest: TTRPGSystemManifest = {
              id: sysId,
              name: sysName,
              shortName,
              folderName: entry.name,
              description,
              icon,
              color,
              version: '1.0.0',
              author: 'AetherMap Auto-Scan',
              categories: finalCategories,
              totalFiles: sysFileCount,
              categoryStats,
            };
            fs.writeFileSync(manifestPath, JSON.stringify(autoManifest, null, 2), 'utf8');
          } catch (e) {
            console.warn(`Could not auto-create manifest at ${manifestPath}:`, e);
          }
        }

        discoveredSystems.push({
          id: sysId,
          name: sysName,
          shortName,
          folderName: entry.name,
          description,
          icon,
          color,
          version: systemManifest.version || '1.0.0',
          author: systemManifest.author || 'AetherMap System',
          categories: finalCategories,
          totalFiles: sysFileCount,
          categoryStats,
          isActive: sysId === this.activeSystemId,
        });
      }
    } catch (err) {
      console.error('Error scanning systems directory:', err);
    }

    // Generate revision hash
    const revision = crypto
      .createHash('md5')
      .update(`${totalFilesCount}-${discoveredSystems.length}-${revisionContent}`)
      .digest('hex')
      .substring(0, 12);
    this.lastRevision = revision;

    const result: SystemsScanResult = {
      systems: discoveredSystems,
      activeSystemId: this.activeSystemId,
      totalSystemsCount: discoveredSystems.length,
      totalSystemFilesCount: totalFilesCount,
      lastScannedAt: Date.now(),
    };

    this.cachedScan = result;
    return result;
  }

  /**
   * Loads, auto-parses and normalizes all items for a specific system and category
   */
  public getSystemCategoryItems(systemId: string, category?: string): SystemDataItem[] {
    const scan = this.cachedScan || this.scanSystems();
    const system = scan.systems.find((s) => s.id === systemId);
    if (!system) return [];

    const sysFolderPath = path.join(this.systemsRoot, system.folderName);
    if (!fs.existsSync(sysFolderPath)) return [];

    const items: SystemDataItem[] = [];

    // Collect all candidate file paths to parse
    const filesToProcess: Array<{ filePath: string; category: string; fileName: string }> = [];

    const subEntries = fs.readdirSync(sysFolderPath, { withFileTypes: true });
    for (const sub of subEntries) {
      if (sub.name.startsWith('.') || sub.name === 'manifest.json' || sub.name === 'README.txt') {
        continue;
      }

      if (sub.isDirectory()) {
        const catName = sub.name;
        if (category && category !== 'all' && catName !== category) continue;

        const catPath = path.join(sysFolderPath, catName);
        const fileNames = fs.readdirSync(catPath);
        for (const fileName of fileNames) {
          if (fileName.startsWith('.') || fileName === 'README.txt') continue;
          const ext = path.extname(fileName).toLowerCase();
          if (SUPPORTED_EXTENSIONS.includes(ext)) {
            filesToProcess.push({
              filePath: path.join(catPath, fileName),
              category: catName,
              fileName,
            });
          }
        }
      } else if (sub.isFile()) {
        const ext = path.extname(sub.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          const baseNameLower = path.basename(sub.name, ext).toLowerCase();
          let inferredCat = 'general';
          if (baseNameLower.includes('monster') || baseNameLower.includes('bestiary') || baseNameLower.includes('creature')) {
            inferredCat = 'monsters';
          } else if (baseNameLower.includes('spell') || baseNameLower.includes('magic')) {
            inferredCat = 'spells';
          } else if (baseNameLower.includes('item') || baseNameLower.includes('equipment') || baseNameLower.includes('loot') || baseNameLower.includes('weapon')) {
            inferredCat = 'items';
          } else if (baseNameLower.includes('rule') || baseNameLower.includes('guide')) {
            inferredCat = 'rules';
          } else if (baseNameLower.includes('character') || baseNameLower.includes('actor') || baseNameLower.includes('npc')) {
            inferredCat = 'characters';
          } else if (baseNameLower.includes('table') || baseNameLower.includes('roll')) {
            inferredCat = 'tables';
          }

          if (!category || category === 'all' || inferredCat === category) {
            filesToProcess.push({
              filePath: path.join(sysFolderPath, sub.name),
              category: inferredCat,
              fileName: sub.name,
            });
          }
        }
      }
    }

    // Process each file with fast caching
    for (const { filePath, category: fileCat, fileName } of filesToProcess) {
      try {
        const stat = fs.statSync(filePath);
        if (!stat.isFile()) continue;

        const cached = this.fileCache.get(filePath);
        if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
          items.push(...cached.items);
          continue;
        }

        // Parse file and extract entities
        const parsedItems = this.parseFileIntoSystemItems(filePath, system, fileCat, stat);
        this.fileCache.set(filePath, {
          mtime: stat.mtimeMs,
          size: stat.size,
          items: parsedItems,
        });

        items.push(...parsedItems);
      } catch (err) {
        console.warn(`Error reading/parsing system file ${filePath}:`, err);
      }
    }

    return items;
  }

  /**
   * Internal parser: converts a disk file into one or multiple normalized SystemDataItems
   */
  private parseFileIntoSystemItems(
    filePath: string,
    system: TTRPGSystemManifest,
    category: string,
    stat: fs.Stats
  ): SystemDataItem[] {
    const ext = path.extname(filePath).toLowerCase();
    const cleanName = path.basename(filePath, ext);
    const format = ext.replace('.', '') as any;
    const relPath = path.relative(this.systemsRoot, filePath).replace(/\\/g, '/');

    // 1. JSON Files (Single entity, 5eTools, Foundry, Roll20, or Compendiums)
    if (ext === '.json') {
      try {
        const rawText = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(rawText);

        // Check if multi-entity compendium (e.g. 5eTools monster array, spell array, item array)
        if (parsed.monster && Array.isArray(parsed.monster) && parsed.monster.length > 0) {
          return parsed.monster.map((m: any, idx: number) => ({
            id: `sys-${system.id}-monster-${m.name || idx}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            systemId: system.id,
            category: 'monsters',
            name: m.name || `Monster ${idx + 1}`,
            source: m.source || '5eTools Bestiary',
            format: 'json',
            fileSize: stat.size,
            mtime: stat.mtimeMs,
            relativePath: relPath,
            summary: m.entries ? m.entries.join(' ') : (m.hp ? `HP: ${m.hp.average || m.hp}, AC: ${m.ac?.[0] || m.ac}` : undefined),
            tags: [system.shortName, 'monsters', m.type?.type || m.type || 'creature', m.cr ? `CR ${m.cr}` : ''].filter(Boolean),
            data: {
              name: m.name,
              type: m.type,
              alignment: m.alignment,
              ac: m.ac,
              hp: m.hp,
              speed: m.speed,
              stats: {
                str: m.str,
                dex: m.dex,
                con: m.con,
                int: m.int,
                wis: m.wis,
                cha: m.cha,
              },
              cr: m.cr,
              traits: m.trait,
              actions: m.action,
              description: m.entries ? m.entries.join('\n\n') : undefined,
              rawContent: m,
            },
          }));
        }

        if (parsed.spell && Array.isArray(parsed.spell) && parsed.spell.length > 0) {
          return parsed.spell.map((sp: any, idx: number) => ({
            id: `sys-${system.id}-spell-${sp.name || idx}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            systemId: system.id,
            category: 'spells',
            name: sp.name || `Spell ${idx + 1}`,
            source: sp.source || '5eTools Spells',
            format: 'json',
            fileSize: stat.size,
            mtime: stat.mtimeMs,
            relativePath: relPath,
            summary: `Lvl ${sp.level} ${sp.school || ''} (${sp.time?.[0]?.number || 1} action)`,
            tags: [system.shortName, 'spells', `Level ${sp.level}`, sp.school].filter(Boolean),
            data: {
              name: sp.name,
              level: sp.level,
              school: sp.school,
              time: sp.time,
              range: sp.range,
              components: sp.components,
              duration: sp.duration,
              description: sp.entries ? sp.entries.join('\n\n') : undefined,
              rawContent: sp,
            },
          }));
        }

        // Foundry VTT Actor/Item export
        if (parsed.type && (parsed.system || parsed.data)) {
          const sysData = parsed.system || parsed.data || {};
          const isActor = ['character', 'npc', 'monster', 'creature'].includes(parsed.type);
          const isItem = ['weapon', 'equipment', 'spell', 'feat', 'feature', 'loot', 'consumable'].includes(parsed.type);

          const cat = isActor ? 'monsters' : isItem ? (parsed.type === 'spell' ? 'spells' : 'items') : category;
          const hp = sysData.attributes?.hp?.value || sysData.hp?.value || sysData.hp;
          const ac = sysData.attributes?.ac?.value || sysData.ac?.value || sysData.ac;

          const img = parsed.img || sysData.img || undefined;
          const tokenImg = parsed.prototypeToken?.texture?.src || parsed.prototypeToken?.img || parsed.token?.img || parsed.token?.texture?.src || undefined;

          return [
            {
              id: `sys-${system.id}-${cat}-${parsed.name || cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
              systemId: system.id,
              category: cat,
              name: parsed.name || cleanName.replace(/_/g, ' '),
              source: 'Foundry VTT',
              format: 'json',
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: relPath,
              img,
              tokenImg,
              summary: hp || ac ? `HP: ${hp || '—'}, AC: ${ac || '—'}` : parsed.type,
              tags: [system.shortName, cat, parsed.type, 'Foundry VTT'],
              data: {
                name: parsed.name,
                type: parsed.type,
                hp,
                ac,
                img,
                tokenImg,
                system: sysData,
                items: parsed.items,
                description: sysData.details?.biography?.value || sysData.description?.value || undefined,
                rawContent: parsed,
              },
            },
          ];
        }

        // Standard Single JSON Entity
        const tags: string[] = [system.shortName, category];
        if (parsed.name) tags.push(parsed.name);
        if (parsed.type) tags.push(parsed.type);
        if (parsed.cr) tags.push(`CR ${parsed.cr}`);
        if (parsed.level) tags.push(`Lvl ${parsed.level}`);

        const summary =
          parsed.description ||
          parsed.summary ||
          (parsed.hp ? `HP: ${parsed.hp}, AC: ${parsed.ac}` : undefined);

        return [
          {
            id: `sys-${system.id}-${category}-${cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            systemId: system.id,
            category,
            name: parsed.name || cleanName.replace(/_/g, ' '),
            format: 'json',
            fileSize: stat.size,
            mtime: stat.mtimeMs,
            relativePath: relPath,
            summary,
            tags: Array.from(new Set(tags)),
            data: parsed,
          },
        ];
      } catch (e) {
        console.warn(`JSON parse error in ${filePath}:`, e);
      }
    }

    // 2. CSV / TSV Tables (Loot tables, encounters, item price lists)
    if (ext === '.csv' || ext === '.tsv') {
      try {
        const rawText = fs.readFileSync(filePath, 'utf8');
        const delimiter = ext === '.tsv' ? '\t' : ',';
        const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
        const headers = lines.length > 0 ? lines[0].split(delimiter).map((h) => h.trim()) : [];
        const rows = lines.slice(1).map((l) => l.split(delimiter).map((c) => c.trim()));

        return [
          {
            id: `sys-${system.id}-table-${cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            systemId: system.id,
            category: 'tables',
            name: cleanName.replace(/_/g, ' '),
            source: 'CSV/TSV Table',
            format: 'csv',
            fileSize: stat.size,
            mtime: stat.mtimeMs,
            relativePath: relPath,
            summary: `Таблица: ${headers.join(', ')} (${rows.length} строк)`,
            tags: [system.shortName, 'tables', 'CSV'],
            data: {
              name: cleanName.replace(/_/g, ' '),
              headers,
              rows,
              rowCount: rows.length,
              tableData: { headers, rows },
            },
          },
        ];
      } catch (e) {}
    }

    // 3. Markdown / Text / YAML / XML
    if (['.md', '.txt', '.yaml', '.yml', '.xml', '.gcs'].includes(ext)) {
      try {
        const rawText = fs.readFileSync(filePath, 'utf8');
        const summary = rawText.slice(0, 180).replace(/[#*`_]/g, '').trim() + '...';

        return [
          {
            id: `sys-${system.id}-${category}-${cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            systemId: system.id,
            category,
            name: cleanName.replace(/_/g, ' '),
            format: ext.replace('.', '') as any,
            fileSize: stat.size,
            mtime: stat.mtimeMs,
            relativePath: relPath,
            summary,
            tags: [system.shortName, category, ext.replace('.', '').toUpperCase()],
            data: {
              name: cleanName.replace(/_/g, ' '),
              content: rawText,
              description: rawText,
            },
          },
        ];
      } catch (e) {}
    }

    // Fallback single item
    return [
      {
        id: `sys-${system.id}-${category}-${cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
        systemId: system.id,
        category,
        name: cleanName.replace(/_/g, ' '),
        format: ext.replace('.', '') as any,
        fileSize: stat.size,
        mtime: stat.mtimeMs,
        relativePath: relPath,
        summary: `Файл .${format}`,
        tags: [system.shortName, category],
        data: { name: cleanName },
      },
    ];
  }

  /**
   * Safely resolves path preventing directory traversal
   */
  public resolveSafeSystemFilePath(relativePath: string): string | null {
    const decoded = decodeURIComponent(relativePath);
    const resolved = path.resolve(this.systemsRoot, decoded);

    if (!resolved.startsWith(path.resolve(this.systemsRoot))) {
      return null;
    }

    if (!fs.existsSync(resolved)) {
      return null;
    }

    return resolved;
  }

  /**
   * Creates a new custom system folder structure
   */
  public createCustomSystem(
    name: string,
    categories: string[] = ['monsters', 'spells', 'items', 'rules']
  ): { success: boolean; manifest: TTRPGSystemManifest } {
    this.ensureCanonicalStructure();

    const safeFolderName = name.replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
    const sysId = safeFolderName.toLowerCase();
    const sysDir = path.join(this.systemsRoot, safeFolderName);

    if (!fs.existsSync(sysDir)) {
      fs.mkdirSync(sysDir, { recursive: true });
    }

    for (const cat of categories) {
      const catDir = path.join(sysDir, cat);
      if (!fs.existsSync(catDir)) {
        fs.mkdirSync(catDir, { recursive: true });
      }
    }

    const manifest: TTRPGSystemManifest = {
      id: sysId,
      name,
      shortName: name.slice(0, 10),
      folderName: safeFolderName,
      description: `Пользовательская система правил и контента для ${name}`,
      icon: 'sparkles',
      color: 'indigo',
      version: '1.0.0',
      categories,
      totalFiles: 0,
      categoryStats: {},
    };

    fs.writeFileSync(
      path.join(sysDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );

    this.cachedScan = null;
    return { success: true, manifest };
  }

  /**
   * High-speed search across all system items in TS backend fallback
   */
  public searchSystemReference(options: {
    query: string;
    systemId?: string;
    category?: string;
    limit?: number;
  }): {
    success: boolean;
    query: string;
    totalMatches: number;
    elapsedMs: number;
    engine: string;
    categoryCounts: Record<string, number>;
    results: any[];
  } {
    const startTime = performance.now();
    const queryClean = (options.query || '').trim().toLowerCase();
    const limit = options.limit || 60;
    const items = this.getSystemCategoryItems(options.systemId, options.category);

    const queryTokens = queryClean.split(/\s+/).filter(Boolean);
    const isBrowse = queryClean.length === 0;

    const matched: any[] = [];
    const categoryCounts: Record<string, number> = {};

    for (const item of items) {
      if (options.category && options.category !== 'all' && item.category !== options.category) {
        continue;
      }

      let score = 0;
      let matchType = 'none';
      let snippet: string | undefined;

      const nameLower = (item.name || '').toLowerCase();
      const summaryText = item.summary || '';
      const summaryLower = summaryText.toLowerCase();

      if (isBrowse) {
        score = 100;
        matchType = 'browse';
      } else {
        if (nameLower === queryClean) {
          score += 1000;
          matchType = 'exact_title';
        } else if (nameLower.startsWith(queryClean)) {
          score += 600;
          matchType = 'prefix_title';
        } else if (nameLower.includes(queryClean)) {
          score += 350;
          matchType = 'substring_title';
        } else {
          let tokenMatches = 0;
          for (const t of queryTokens) {
            if (nameLower.includes(t)) tokenMatches++;
          }
          if (tokenMatches === queryTokens.length && queryTokens.length > 0) {
            score += 250 + tokenMatches * 30;
            matchType = 'tokens_title';
          } else if (tokenMatches > 0) {
            score += tokenMatches * 40;
            matchType = 'partial_title';
          }
        }

        // Tags matching
        if (Array.isArray(item.tags)) {
          for (const tag of item.tags) {
            const tagLower = (tag || '').toLowerCase();
            if (tagLower === queryClean) {
              score += 200;
              if (matchType === 'none') matchType = 'exact_tag';
            } else if (tagLower.includes(queryClean)) {
              score += 80;
              if (matchType === 'none') matchType = 'tag';
            }
          }
        }

        // Summary matching
        if (summaryLower.includes(queryClean)) {
          score += 70;
          if (matchType === 'none') matchType = 'summary';
          const pos = summaryLower.indexOf(queryClean);
          const start = Math.max(0, pos - 40);
          const end = Math.min(summaryText.length, pos + queryClean.length + 80);
          snippet = `${start > 0 ? '...' : ''}${summaryText.slice(start, end)}${end < summaryText.length ? '...' : ''}`;
        }

        // Data / Actions / Traits matching
        if (item.data) {
          const dataStr = JSON.stringify(item.data).toLowerCase();
          if (dataStr.includes(queryClean)) {
            score += score === 0 ? 50 : 30;
            if (matchType === 'none') matchType = 'deep_content';
          }
        }
      }

      if (score > 0) {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;

        const systemName =
          item.systemId === 'dnd5e'
            ? 'D&D 5e'
            : item.systemId === 'pathfinder2e'
            ? 'Pathfinder 2e'
            : item.systemId === 'cyberpunk_red'
            ? 'Cyberpunk RED'
            : item.systemId === 'gurps'
            ? 'GURPS'
            : item.systemId === 'call_of_cthulhu'
            ? 'Call of Cthulhu'
            : item.systemId;

        matched.push({
          id: item.id,
          systemId: item.systemId,
          systemName,
          name: item.name,
          originalName: item.data?.originalName,
          category: item.category,
          format: item.format,
          summary: summaryText,
          snippet,
          score,
          matchType,
          tags: item.tags || [],
          relativePath: item.relativePath,
          stats: item.data?.stats,
          actions: item.data?.actions,
          traits: item.data?.traits || item.data?.abilities,
          spells: item.data?.spells,
          items: item.data?.items,
          tableData: item.data?.tableData || (item.data?.headers && item.data?.rows ? item.data : undefined),
          data: item.data,
        });
      }
    }

    matched.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    const totalMatches = matched.length;
    const truncated = matched.slice(0, limit);
    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      success: true,
      query: options.query || '',
      totalMatches,
      elapsedMs,
      engine: 'TypeScript Server Engine',
      categoryCounts,
      results: truncated,
    };
  }

  private inferSystemIcon(folderName: string): string {
    const lower = folderName.toLowerCase();
    if (lower.includes('dnd') || lower.includes('d&d')) return 'swords';
    if (lower.includes('pathfinder') || lower.includes('pf')) return 'shield';
    if (lower.includes('cyber') || lower.includes('punk') || lower.includes('scifi')) return 'zap';
    if (lower.includes('gurps')) return 'book';
    if (lower.includes('cthulhu') || lower.includes('horror') || lower.includes('coc')) return 'skull';
    return 'sparkles';
  }

  private inferSystemColor(folderName: string): string {
    const lower = folderName.toLowerCase();
    if (lower.includes('dnd') || lower.includes('d&d')) return 'rose';
    if (lower.includes('pathfinder') || lower.includes('pf')) return 'amber';
    if (lower.includes('cyber') || lower.includes('punk')) return 'cyan';
    if (lower.includes('gurps')) return 'emerald';
    if (lower.includes('cthulhu') || lower.includes('coc')) return 'purple';
    return 'indigo';
  }
}

export const systemDirectoryEngine = new SystemDirectoryEngine();
