import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface DiskAssetMap {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string;
  category: string;
  layer: 'background' | 'props' | 'overhead';
  format: string;
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: number;
  mtime: number;
  relativePath: string;
  tags?: string[];
}

export interface DiskAssetProp {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  icon: string;
  url: string;
  defaultWidth: number;
  defaultHeight: number;
  gridCells: string;
  layer: 'props' | 'overhead' | 'background';
  format: string;
  fileSize: number;
  mtime: number;
  relativePath: string;
  tags?: string[];
}

export interface DiskAssetTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  playlistName: string;
  format: string;
  fileSize: number;
  mtime: number;
  relativePath: string;
  tags?: string[];
}

export interface DiskAssetPlaylist {
  id: string;
  name: string;
  category: 'background' | 'combat' | 'alarm' | 'dungeon' | 'magic' | 'custom';
  icon: string;
  tracks: DiskAssetTrack[];
  tags?: string[];
}

export interface DiskAssetSFX {
  id: string;
  name: string;
  bank: string;
  icon: string;
  url: string;
  format: string;
  fileSize: number;
  mtime: number;
  relativePath: string;
  tags?: string[];
}

export interface DiskAssetEffect {
  id: string;
  name: string;
  category: string;
  url: string;
  type: 'fire' | 'water' | 'smoke' | 'lightning' | 'portal' | 'custom';
  format: string;
  fileSize: number;
  mtime: number;
  relativePath: string;
}

export interface DiskScanResult {
  rootPath: string;
  revision: string;
  timestamp: number;
  maps: DiskAssetMap[];
  mapCategories: string[];
  props: DiskAssetProp[];
  propCategories: string[];
  playlists: DiskAssetPlaylist[];
  sfx: DiskAssetSFX[];
  sfxBanks: string[];
  effects: DiskAssetEffect[];
  savedSessions: Array<{ filename: string; size: number; mtime: number }>;
  stats: {
    totalFiles: number;
    mapsCount: number;
    propsCount: number;
    tracksCount: number;
    playlistsCount: number;
    sfxCount: number;
    effectsCount: number;
  };
}

// Canonical Asset Directories Structure
const DEFAULT_ASSETS_DIR_NAME = 'assets';

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

const SUBDIRECTORIES = {
  maps: ['Dungeons', 'Cities', 'Wilderness', 'Battlemaps', 'Taverns', 'Bosses'],
  props: ['Tokens', 'Furniture', 'Decorations', 'Monsters', 'Loot', 'Effects'],
  music: ['Combat', 'Tavern', 'Exploration', 'Boss', 'Dungeon', 'Ambient'],
  sfx: ['Combat', 'Magic', 'Monsters', 'Environment', 'Traps', 'Game'],
  effects: ['Fire', 'Water', 'Portals', 'Lightning', 'Weather'],
  data: ['Sessions', 'Presets', 'Layers'],
};

export class AssetDirectoryEngine {
  private assetsRoot: string;
  private cachedScan: DiskScanResult | null = null;
  private lastRevision: string = '';
  private isScanning: boolean = false;

  constructor(customPath?: string) {
    this.assetsRoot = customPath
      ? path.resolve(customPath)
      : path.resolve(process.cwd(), DEFAULT_ASSETS_DIR_NAME);

    this.ensureCanonicalStructure();
  }

  public getRootPath(): string {
    return this.assetsRoot;
  }

  /**
   * Initializes canonical folders on disk if they don't exist
   */
  public ensureCanonicalStructure(): void {
    try {
      if (!fs.existsSync(this.assetsRoot)) {
        fs.mkdirSync(this.assetsRoot, { recursive: true });
      }

      for (const [section, subs] of Object.entries(SUBDIRECTORIES)) {
        const sectionDir = path.join(this.assetsRoot, section);
        if (!fs.existsSync(sectionDir)) {
          fs.mkdirSync(sectionDir, { recursive: true });
        }

        for (const sub of subs) {
          const subDir = path.join(sectionDir, sub);
          if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
          }
        }

        // README info file
        const readmePath = path.join(sectionDir, 'README.txt');
        if (!fs.existsSync(readmePath)) {
          fs.writeFileSync(readmePath, this.getSectionReadme(section), 'utf8');
        }
      }
    } catch (err) {
      console.warn('Could not initialize canonical asset directories:', err);
    }
  }

  private getSectionReadme(section: string): string {
    switch (section) {
      case 'maps':
        return '=== AETHERMAP КАРТЫ ===\nПомещайте сюда файлы карт (.jpg, .png, .webp, .mp4, .webm).\nЛюбая подпапка автоматически станет категорией карт в интерфейсе мастера.';
      case 'props':
        return '=== AETHERMAP ОБЪЕКТЫ И ТОКЕНЫ ===\nПомещайте сюда токены, мебель, крыши и декорации (.png, .webp, .svg).\nКаждая подпапка станет категорией в каталоге объектов Sims Build Mode.';
      case 'music':
        return '=== AETHERMAP МУЗЫКА И САУНДТРЕКИ ===\nПомещайте сюда фоновую музыку (.mp3, .ogg, .wav, .m4a, .flac).\nКаждая подпапка автоматически станет плейлистом в плеере.';
      case 'sfx':
        return '=== AETHERMAP ЗВУКОВЫЕ ЭФФЕКТЫ (SFX) ===\nПомещайте сюда звуки (.mp3, .wav, .ogg).\nПодпапки станут банками на звуковой панели (SFX Soundboard).';
      case 'effects':
        return '=== AETHERMAP АНИМИРОВАННЫЕ ЭФФЕКТЫ (VFX) ===\nПомещайте сюда анимированные видео-эффекты и спрайты (.webm, .mp4, .gif, .png).';
      case 'data':
        return '=== AETHERMAP СОХРАНЕНИЯ И ПРЕСЕТЫ ===\nЗдесь автоматически сохраняются сессии (.json).';
      default:
        return 'AetherMap Asset Folder';
    }
  }

  /**
   * Scans the disk folder and extracts all maps, props, tracks, sfx, and effects
   */
  public scanDisk(): DiskScanResult {
    if (this.isScanning && this.cachedScan) {
      return this.cachedScan;
    }

    this.isScanning = true;
    try {
      this.ensureCanonicalStructure();

      const maps: DiskAssetMap[] = [];
      const mapCategoriesSet = new Set<string>();
      const props: DiskAssetProp[] = [];
      const propCategoriesSet = new Set<string>();
      const playlistsMap = new Map<string, DiskAssetTrack[]>();
      const sfx: DiskAssetSFX[] = [];
      const sfxBanksSet = new Set<string>();
      const effects: DiskAssetEffect[] = [];
      const savedSessions: Array<{ filename: string; size: number; mtime: number }> = [];

      let totalMtimeSum = 0;
      let totalFilesCount = 0;

      // 1. Scan Maps
      const mapsRoot = path.join(this.assetsRoot, 'maps');
      if (fs.existsSync(mapsRoot)) {
        this.scanDirectoryRecursive(mapsRoot, (fullPath, relPath, stat) => {
          const ext = path.extname(fullPath).toLowerCase();
          const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);
          const isVideo = ['.mp4', '.webm', '.m4v', '.mov'].includes(ext);

          if ((isImage || isVideo) && !path.basename(fullPath).startsWith('.')) {
            totalFilesCount++;
            totalMtimeSum += stat.mtimeMs;
            const category = path.dirname(relPath) === '.' ? 'Общие карты' : path.dirname(relPath).split(path.sep)[0];
            mapCategoriesSet.add(category);

            const fileName = path.basename(fullPath, ext);
            const cleanRelPath = relPath.replace(/\\/g, '/');
            const fileUrl = `/api/assets/file/maps/${encodeURIComponent(cleanRelPath)}`;

            maps.push({
              id: `disk-map-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`,
              name: fileName,
              type: isVideo ? 'video' : 'image',
              url: fileUrl,
              thumbnailUrl: fileUrl,
              category,
              layer: 'background',
              format: ext.replace('.', ''),
              fileSize: stat.size,
              width: 1920,
              height: 1080,
              aspectRatio: 1.77,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: autoTagResource(fileName, category),
            });
          }
        });
      }

      // 2. Scan Props (Tokens, Furniture, Decor)
      const propsRoot = path.join(this.assetsRoot, 'props');
      if (fs.existsSync(propsRoot)) {
        this.scanDirectoryRecursive(propsRoot, (fullPath, relPath, stat) => {
          const ext = path.extname(fullPath).toLowerCase();
          const isImage = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext);

          if (isImage && !path.basename(fullPath).startsWith('.')) {
            totalFilesCount++;
            totalMtimeSum += stat.mtimeMs;
            const category = path.dirname(relPath) === '.' ? 'custom' : path.dirname(relPath).split(path.sep)[0];
            propCategoriesSet.add(category);

            const fileName = path.basename(fullPath, ext);
            const cleanRelPath = relPath.replace(/\\/g, '/');
            const fileUrl = `/api/assets/file/props/${encodeURIComponent(cleanRelPath)}`;

            props.push({
              id: `disk-prop-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`,
              name: fileName,
              category: category.toLowerCase(),
              categoryLabel: category,
              icon: this.getPropCategoryIcon(category),
              url: fileUrl,
              defaultWidth: 100,
              defaultHeight: 100,
              gridCells: '1x1',
              layer: 'props',
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: autoTagResource(fileName, category),
            });
          }
        });
      }

      // 3. Scan Music
      const musicRoot = path.join(this.assetsRoot, 'music');
      if (fs.existsSync(musicRoot)) {
        this.scanDirectoryRecursive(musicRoot, (fullPath, relPath, stat) => {
          const ext = path.extname(fullPath).toLowerCase();
          const isAudio = ['.mp3', '.ogg', '.wav', '.m4a', '.flac', '.aac'].includes(ext);

          if (isAudio && !path.basename(fullPath).startsWith('.')) {
            totalFilesCount++;
            totalMtimeSum += stat.mtimeMs;
            const playlistName = path.dirname(relPath) === '.' ? 'Основной плейлист' : path.dirname(relPath).split(path.sep)[0];
            const fileName = path.basename(fullPath, ext);
            const cleanRelPath = relPath.replace(/\\/g, '/');
            const fileUrl = `/api/assets/file/music/${encodeURIComponent(cleanRelPath)}`;

            const track: DiskAssetTrack = {
              id: `disk-track-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`,
              title: fileName,
              url: fileUrl,
              playlistName,
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: autoTagResource(fileName, playlistName),
            };

            if (!playlistsMap.has(playlistName)) {
              playlistsMap.set(playlistName, []);
            }
            playlistsMap.get(playlistName)!.push(track);
          }
        });
      }

      // 4. Scan SFX
      const sfxRoot = path.join(this.assetsRoot, 'sfx');
      if (fs.existsSync(sfxRoot)) {
        this.scanDirectoryRecursive(sfxRoot, (fullPath, relPath, stat) => {
          const ext = path.extname(fullPath).toLowerCase();
          const isAudio = ['.mp3', '.ogg', '.wav', '.m4a', '.flac'].includes(ext);

          if (isAudio && !path.basename(fullPath).startsWith('.')) {
            totalFilesCount++;
            totalMtimeSum += stat.mtimeMs;
            const bank = path.dirname(relPath) === '.' ? 'Общие звуки' : path.dirname(relPath).split(path.sep)[0];
            sfxBanksSet.add(bank);

            const fileName = path.basename(fullPath, ext);
            const cleanRelPath = relPath.replace(/\\/g, '/');
            const fileUrl = `/api/assets/file/sfx/${encodeURIComponent(cleanRelPath)}`;

            sfx.push({
              id: `disk-sfx-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`,
              name: fileName,
              bank,
              icon: this.getSfxIcon(fileName, bank),
              url: fileUrl,
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: autoTagResource(fileName, bank),
            });
          }
        });
      }

      // 5. Scan Effects (VFX)
      const effectsRoot = path.join(this.assetsRoot, 'effects');
      if (fs.existsSync(effectsRoot)) {
        this.scanDirectoryRecursive(effectsRoot, (fullPath, relPath, stat) => {
          const ext = path.extname(fullPath).toLowerCase();
          const isMedia = ['.mp4', '.webm', '.gif', '.png', '.webp'].includes(ext);

          if (isMedia && !path.basename(fullPath).startsWith('.')) {
            totalFilesCount++;
            totalMtimeSum += stat.mtimeMs;
            const category = path.dirname(relPath) === '.' ? 'Custom' : path.dirname(relPath).split(path.sep)[0];
            const fileName = path.basename(fullPath, ext);
            const cleanRelPath = relPath.replace(/\\/g, '/');
            const fileUrl = `/api/assets/file/effects/${encodeURIComponent(cleanRelPath)}`;

            let vfxType: 'fire' | 'water' | 'smoke' | 'lightning' | 'portal' | 'custom' = 'custom';
            const lower = (fileName + ' ' + category).toLowerCase();
            if (lower.includes('fire') || lower.includes('огонь') || lower.includes('пламя')) vfxType = 'fire';
            else if (lower.includes('water') || lower.includes('вода') || lower.includes('волна')) vfxType = 'water';
            else if (lower.includes('smoke') || lower.includes('дым') || lower.includes('туман')) vfxType = 'smoke';
            else if (lower.includes('light') || lower.includes('молни')) vfxType = 'lightning';
            else if (lower.includes('portal') || lower.includes('портал')) vfxType = 'portal';

            effects.push({
              id: `disk-effect-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`,
              name: fileName,
              category,
              url: fileUrl,
              type: vfxType,
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
            });
          }
        });
      }

      // 6. Scan Data Sessions
      const dataSessionsRoot = path.join(this.assetsRoot, 'data', 'Sessions');
      if (fs.existsSync(dataSessionsRoot)) {
        this.scanDirectoryRecursive(dataSessionsRoot, (fullPath, relPath, stat) => {
          if (fullPath.endsWith('.json') && !path.basename(fullPath).startsWith('.')) {
            savedSessions.push({
              filename: path.basename(fullPath),
              size: stat.size,
              mtime: stat.mtimeMs,
            });
          }
        });
      }

      // Convert Playlists Map to Array
      const playlists: DiskAssetPlaylist[] = [];
      playlistsMap.forEach((tracks, name) => {
        let cat: 'background' | 'combat' | 'alarm' | 'dungeon' | 'magic' | 'custom' = 'custom';
        const lower = name.toLowerCase();
        if (lower.includes('combat') || lower.includes('битва') || lower.includes('бой')) cat = 'combat';
        else if (lower.includes('tavern') || lower.includes('таверна')) cat = 'background';
        else if (lower.includes('dungeon') || lower.includes('подземелье')) cat = 'dungeon';
        else if (lower.includes('magic') || lower.includes('магия')) cat = 'magic';
        else if (lower.includes('boss') || lower.includes('босс')) cat = 'alarm';

        playlists.push({
          id: `disk-pl-${crypto.createHash('md5').update(name).digest('hex').substring(0, 10)}`,
          name,
          category: cat,
          icon: this.getPlaylistIcon(name),
          tracks,
          tags: autoTagResource(name),
        });
      });

      // Calculate Revision Hash
      const revision = crypto
        .createHash('sha256')
        .update(`${totalFilesCount}-${totalMtimeSum}-${maps.length}-${props.length}-${playlists.length}-${sfx.length}`)
        .digest('hex')
        .substring(0, 16);

      this.lastRevision = revision;

      const result: DiskScanResult = {
        rootPath: this.assetsRoot,
        revision,
        timestamp: Date.now(),
        maps,
        mapCategories: Array.from(mapCategoriesSet),
        props,
        propCategories: Array.from(propCategoriesSet),
        playlists,
        sfx,
        sfxBanks: Array.from(sfxBanksSet),
        effects,
        savedSessions: savedSessions.sort((a, b) => b.mtime - a.mtime),
        stats: {
          totalFiles: totalFilesCount,
          mapsCount: maps.length,
          propsCount: props.length,
          tracksCount: Array.from(playlistsMap.values()).reduce((acc, t) => acc + t.length, 0),
          playlistsCount: playlists.length,
          sfxCount: sfx.length,
          effectsCount: effects.length,
        },
      };

      this.cachedScan = result;
      return result;
    } finally {
      this.isScanning = false;
    }
  }

  public getRevision(): string {
    return this.lastRevision;
  }

  /**
   * Resolves safe local file path preventing Directory Traversal attacks
   */
  public resolveSafeFilePath(section: string, relativePath: string): string | null {
    const decodedRelPath = decodeURIComponent(relativePath);
    const resolvedPath = path.resolve(this.assetsRoot, section, decodedRelPath);

    // Prevent Path Traversal
    const expectedBase = path.resolve(this.assetsRoot, section);
    if (!resolvedPath.startsWith(expectedBase)) {
      return null;
    }

    if (!fs.existsSync(resolvedPath)) {
      return null;
    }

    return resolvedPath;
  }

  /**
   * Saves a session JSON file to disk in `assets/data/Sessions/`
   */
  public saveSessionSnapshot(sessionData: any, filename?: string): { success: boolean; filename: string; path: string } {
    this.ensureCanonicalStructure();
    const sessionsDir = path.join(this.assetsRoot, 'data', 'Sessions');
    if (!fs.existsSync(sessionsDir)) {
      fs.mkdirSync(sessionsDir, { recursive: true });
    }

    const d = new Date();
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(
      2,
      '0'
    )}`;
    const finalFilename = filename || `AetherMap_Session_${dateStr}.json`;
    const targetPath = path.join(sessionsDir, finalFilename);

    fs.writeFileSync(targetPath, JSON.stringify(sessionData, null, 2), 'utf8');
    return { success: true, filename: finalFilename, path: targetPath };
  }

  /**
   * Helper to scan directories recursively
   */
  private scanDirectoryRecursive(
    dir: string,
    callback: (fullPath: string, relPath: string, stat: fs.Stats) => void,
    baseDir: string = dir
  ): void {
    if (!fs.existsSync(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'README.txt') continue;

        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          this.scanDirectoryRecursive(fullPath, callback, baseDir);
        } else if (entry.isFile()) {
          try {
            const stat = fs.statSync(fullPath);
            callback(fullPath, relPath, stat);
          } catch {}
        }
      }
    } catch (err) {
      console.warn(`Error scanning directory: ${dir}`, err);
    }
  }

  private getPropCategoryIcon(cat: string): string {
    const lower = cat.toLowerCase();
    if (lower.includes('token') || lower.includes('токен') || lower.includes('монстр')) return '⚔️';
    if (lower.includes('furnitur') || lower.includes('мебель') || lower.includes('стол')) return '🛋️';
    if (lower.includes('decor') || lower.includes('декор')) return '🏛️';
    if (lower.includes('loot') || lower.includes('сундук') || lower.includes('сокровищ')) return '💎';
    if (lower.includes('magic') || lower.includes('магия')) return '🔮';
    return '📦';
  }

  private getPlaylistIcon(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes('combat') || lower.includes('битва') || lower.includes('бой')) return '⚔️';
    if (lower.includes('tavern') || lower.includes('таверна')) return '🍻';
    if (lower.includes('boss') || lower.includes('босс')) return '🐉';
    if (lower.includes('explore') || lower.includes('исследовани')) return '🌲';
    if (lower.includes('dungeon') || lower.includes('подземелье')) return '🏰';
    if (lower.includes('town') || lower.includes('город')) return '🏙️';
    if (lower.includes('magic') || lower.includes('магия')) return '✨';
    return '🎵';
  }

  private getSfxIcon(name: string, bank: string): string {
    const lower = (name + ' ' + bank).toLowerCase();
    if (lower.includes('sword') || lower.includes('меч') || lower.includes('атака')) return '⚔️';
    if (lower.includes('fire') || lower.includes('огонь') || lower.includes('spell') || lower.includes('магия')) return '🔥';
    if (lower.includes('thunder') || lower.includes('гром') || lower.includes('молния')) return '⚡';
    if (lower.includes('dragon') || lower.includes('дракон') || lower.includes('рык')) return '🐲';
    if (lower.includes('dice') || lower.includes('кубик')) return '🎲';
    if (lower.includes('door') || lower.includes('дверь')) return '🚪';
    if (lower.includes('horn') || lower.includes('горн')) return '📯';
    return '🔊';
  }
}

export const assetDirectoryEngine = new AssetDirectoryEngine();
