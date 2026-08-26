import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { systemDirectoryEngine } from './systemDirectoryEngine';
import { taggingEngine } from './taggingEngine';
import { CATEGORY_DEFINITIONS } from './regexTagDictionary';

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
  tags?: string[];
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
  systemsCount?: number;
  systemFilesCount?: number;
  tagSummary?: {
    totalTags: number;
    totalAssets: number;
    categories: Record<string, Array<{ tag: string; count: number }>>;
  };
  stats: {
    totalFiles: number;
    mapsCount: number;
    propsCount: number;
    tracksCount: number;
    playlistsCount: number;
    sfxCount: number;
    effectsCount: number;
    systemsCount?: number;
  };
}

// Canonical Asset Directories Structure
const DEFAULT_ASSETS_DIR_NAME = 'assets';

export function autoTagResource(
  name: string,
  category?: string,
  section: string = 'maps',
  fullDiskPath?: string,
  contentText?: string
): string[] {
  const result = taggingEngine.autoTag(name, category || '', section, fullDiskPath, contentText);
  return result.tags;
}

const SUBDIRECTORIES = {
  maps: ['Dungeons', 'Cities', 'Wilderness', 'Battlemaps', 'Taverns', 'Bosses', 'Castles', 'Caves', 'SciFi'],
  props: ['Tokens', 'Furniture', 'Decorations', 'Monsters', 'NPCs', 'Loot', 'Buildings', 'Vehicles', 'Effects'],
  music: ['Combat', 'Tavern', 'Exploration', 'Boss', 'Dungeon', 'Ambient', 'Peaceful', 'Suspense', 'Epic'],
  sfx: ['Combat', 'Magic', 'Monsters', 'Environment', 'Traps', 'Game', 'Spells', 'UI', 'Weather'],
  effects: ['Fire', 'Water', 'Portals', 'Lightning', 'Weather', 'Spells', 'Smoke', 'Magic_Runes'],
  systems: ['D&D_5e', 'Pathfinder_2e', 'Cyberpunk_RED', 'GURPS_4e', 'Call_of_Cthulhu', 'Generic_Rules'],
  lore: ['Faerun_DND5e', 'Cyberpunk_RED', 'Call_of_Cthulhu', 'Eberron_DND5e', 'GURPS_4e', 'Generic_Worlds'],
  data: ['Sessions', 'Presets', 'Layers', 'Backups'],
};

const SYSTEM_NESTED_SUBFOLDERS: Record<string, string[]> = {
  'D&D_5e': ['Monsters', 'Spells', 'Items', 'Classes', 'Races', 'Rules', 'Feats', 'Backgrounds'],
  'Pathfinder_2e': ['Monsters', 'Spells', 'Items', 'Classes', 'Ancestries', 'Feats', 'Rules'],
  'Cyberpunk_RED': ['Roles', 'Cyberware', 'Weapons', 'Gear', 'Netrunning', 'NPCs', 'Rules'],
  'Call_of_Cthulhu': ['Investigators', 'Monsters', 'Spells', 'Tomes', 'Occupations', 'Rules', 'Sanity'],
  'GURPS_4e': ['Advantages', 'Disadvantages', 'Skills', 'Equipment', 'Spells', 'Rules'],
  'Generic_Rules': ['Rules', 'Tables', 'Homebrew'],
};

const LORE_NESTED_SUBFOLDERS: Record<string, string[]> = {
  'Faerun_DND5e': ['Factions', 'NPCs', 'Locations', 'History', 'Chronicles', 'Deities', 'Articles'],
  'Eberron_DND5e': ['Dragonmarked_Houses', 'Nations', 'Factions', 'NPCs', 'Locations', 'History', 'Articles'],
  'Cyberpunk_RED': ['Corporations', 'Gangs', 'Fixers_and_Edgerunners', 'Districts', 'History', 'Articles'],
  'Call_of_Cthulhu': ['Cults', 'Entities', 'Artifacts', 'Locations', 'Investigators', 'Articles'],
  'GURPS_4e': ['Infinite_Worlds', 'Timelines', 'Patrol_Factions', 'NPCs', 'Locations', 'Articles'],
  'Generic_Worlds': ['Factions', 'NPCs', 'Locations', 'History', 'Chronicles', 'Articles'],
};

function fastHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

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

          // Create nested subfolders for systems
          if (section === 'systems' && SYSTEM_NESTED_SUBFOLDERS[sub]) {
            for (const nested of SYSTEM_NESTED_SUBFOLDERS[sub]) {
              const nestedDir = path.join(subDir, nested);
              if (!fs.existsSync(nestedDir)) {
                fs.mkdirSync(nestedDir, { recursive: true });
              }
            }
            const sysReadmePath = path.join(subDir, 'README.txt');
            if (!fs.existsSync(sysReadmePath)) {
              fs.writeFileSync(
                sysReadmePath,
                `=== ПРАВИЛА И СПРАВОЧНИКИ: ${sub} ===\nКатегории:\n- Monsters: бестиарий, монстры и NPC\n- Spells: заклинания и способности\n- Items: экипировка, оружие и артефакты\n- Classes/Roles: классы и архетипы\n- Races/Ancestries: расы и происхождения\n- Rules: правила, таблицы и механики\n\nПомещайте сюда файлы .json, .md, .txt, .pdf или импортируйте через Универсальный Парсер.`,
                'utf8'
              );
            }
          }

          // Create nested subfolders for lore
          if (section === 'lore' && LORE_NESTED_SUBFOLDERS[sub]) {
            for (const nested of LORE_NESTED_SUBFOLDERS[sub]) {
              const nestedDir = path.join(subDir, nested);
              if (!fs.existsSync(nestedDir)) {
                fs.mkdirSync(nestedDir, { recursive: true });
              }
            }
            const loreReadmePath = path.join(subDir, 'README.txt');
            if (!fs.existsSync(loreReadmePath)) {
              fs.writeFileSync(
                loreReadmePath,
                `=== ЛОР И ЭНЦИКЛОПЕДИЯ СЕТТИНГА: ${sub} ===\nКатегории:\n- Factions / Corporations / Cults: фракции, гильдии, культы\n- NPCs / Fixers / Entities: ключевые персонажи и сущности\n- Locations / Districts / Regions: города, регионы, достопримечательности\n- History / Chronicles: хроники, таймлайны и события\n- Articles / Deities: статьи и божества\n\nПомещайте сюда файлы статей (.json, .md, .txt) или импортируйте книги через Универсальный Парсер.`,
                'utf8'
              );
            }
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
        return '=== AETHERMAP КАРТЫ ===\nПомещайте сюда файлы карт (.jpg, .png, .webp, .mp4, .webm).\nПодпапки (Dungeons, Cities, Wilderness, Battlemaps, Taverns, Bosses, Castles, Caves, SciFi) автоматически станут категориями карт в библиотеке.';
      case 'props':
        return '=== AETHERMAP ОБЪЕКТЫ И ТОКЕНЫ ===\nПомещайте сюда токены, мебель, крыши, ловушки и декорации (.png, .webp, .svg).\nПодпапки (Tokens, Furniture, Decorations, Monsters, NPCs, Loot, Buildings, Vehicles, Effects) станут категориями в каталоге объектов.';
      case 'music':
        return '=== AETHERMAP МУЗЫКА И САУНДТРЕКИ ===\nПомещайте сюда фоновую музыку (.mp3, .ogg, .wav, .m4a, .flac).\nКаждая подпапка (Combat, Tavern, Exploration, Boss, Dungeon, Ambient, Peaceful, Suspense, Epic) автоматически станет плейлистом в плеере.';
      case 'sfx':
        return '=== AETHERMAP ЗВУКОВЫЕ ЭФФЕКТЫ (SFX) ===\nПомещайте сюда звуки (.mp3, .wav, .ogg).\nПодпапки (Combat, Magic, Monsters, Environment, Traps, Game, Spells, UI, Weather) станут банками на звуковой панели (SFX Soundboard).';
      case 'effects':
        return '=== AETHERMAP АНИМИРОВАННЫЕ ЭФФЕКТЫ (VFX) ===\nПомещайте сюда анимированные видео-эффекты и спецэффекты (.webm с прозрачностью, .mp4, .gif).\nПодпапки (Fire, Water, Portals, Lightning, Weather, Spells, Smoke, Magic_Runes) используются для наложения на стол.';
      case 'systems':
        return '=== AETHERMAP РОЛЕВЫЕ СИСТЕМЫ И ПРАВИЛА (TTRPG SYSTEMS) ===\nПомещайте сюда папки систем с файлами монстров, заклинаний, рас, классов, предметов и правил (D&D_5e, Pathfinder_2e, Cyberpunk_RED, GURPS_4e, Call_of_Cthulhu, Generic_Rules).\nКаждая система содержит подпапки Monsters, Spells, Items, Classes, Rules и др.';
      case 'lore':
        return '=== AETHERMAP ЛОР И ЭНЦИКЛОПЕДИЯ ВСЕЛЕННЫХ (WORLD LORE) ===\nПомещайте сюда статьи энциклопедии, книги, фракции, НИП и хроники по вселенным (Faerun_DND5e, Eberron_DND5e, Cyberpunk_RED, Call_of_Cthulhu, GURPS_4e, Generic_Worlds).\nКаждый мир содержит подпапки Factions, NPCs, Locations, History, Articles.';
      case 'data':
        return '=== AETHERMAP СОХРАНЕНИЯ И ПРЕСЕТЫ ===\nЗдесь хранятся файлы резервных копий сессий (.json), пресеты стола и бэкапы (Sessions, Presets, Layers, Backups).';
      default:
        return 'AetherMap Asset Folder';
    }
  }

  /**
   * Scans the disk folder and extracts all maps, props, tracks, sfx, and effects
   */
  public scanDisk(forceRescan: boolean = false): DiskScanResult {
    if (!forceRescan && this.cachedScan && Date.now() - this.cachedScan.timestamp < 5000) {
      return this.cachedScan;
    }

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

      // 0. Reset Inverted Index before scan
      taggingEngine.clearIndex();

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
            const mapId = `disk-map-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`;

            const tagResult = taggingEngine.autoTag(fileName, cleanRelPath, 'maps', fullPath);

            const mapItem: DiskAssetMap = {
              id: mapId,
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
              tags: tagResult.tags,
            };

            maps.push(mapItem);

            taggingEngine.indexAsset({
              id: mapId,
              name: fileName,
              category,
              primaryCategory: 'maps',
              section: 'maps',
              url: fileUrl,
              path: cleanRelPath,
              tags: tagResult.tags,
              metadata: tagResult.metadata,
              fileSize: stat.size,
              lastModified: stat.mtimeMs,
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
            const propId = `disk-prop-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`;

            const tagResult = taggingEngine.autoTag(fileName, cleanRelPath, 'props', fullPath);

            const propItem: DiskAssetProp = {
              id: propId,
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
              tags: tagResult.tags,
            };

            props.push(propItem);

            taggingEngine.indexAsset({
              id: propId,
              name: fileName,
              category,
              primaryCategory: tagResult.primaryCategory,
              section: 'props',
              url: fileUrl,
              path: cleanRelPath,
              tags: tagResult.tags,
              metadata: tagResult.metadata,
              fileSize: stat.size,
              lastModified: stat.mtimeMs,
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
            const trackId = `disk-track-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`;

            const tagResult = taggingEngine.autoTag(fileName, cleanRelPath, 'music', fullPath);

            const track: DiskAssetTrack = {
              id: trackId,
              title: fileName,
              url: fileUrl,
              playlistName,
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: tagResult.tags,
            };

            if (!playlistsMap.has(playlistName)) {
              playlistsMap.set(playlistName, []);
            }
            playlistsMap.get(playlistName)!.push(track);

            taggingEngine.indexAsset({
              id: trackId,
              name: fileName,
              category: playlistName,
              primaryCategory: 'music',
              section: 'music',
              url: fileUrl,
              path: cleanRelPath,
              tags: tagResult.tags,
              metadata: tagResult.metadata,
              fileSize: stat.size,
              lastModified: stat.mtimeMs,
            });
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
            const sfxId = `disk-sfx-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`;

            const tagResult = taggingEngine.autoTag(fileName, cleanRelPath, 'sfx', fullPath);

            sfx.push({
              id: sfxId,
              name: fileName,
              bank,
              icon: this.getSfxIcon(fileName, bank),
              url: fileUrl,
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: tagResult.tags,
            });

            taggingEngine.indexAsset({
              id: sfxId,
              name: fileName,
              category: bank,
              primaryCategory: 'other',
              section: 'sfx',
              url: fileUrl,
              path: cleanRelPath,
              tags: tagResult.tags,
              metadata: tagResult.metadata,
              fileSize: stat.size,
              lastModified: stat.mtimeMs,
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
            const effectId = `disk-effect-${crypto.createHash('md5').update(cleanRelPath).digest('hex').substring(0, 10)}`;

            let vfxType: 'fire' | 'water' | 'smoke' | 'lightning' | 'portal' | 'custom' = 'custom';
            const lower = (fileName + ' ' + category).toLowerCase();
            if (lower.includes('fire') || lower.includes('огонь') || lower.includes('пламя')) vfxType = 'fire';
            else if (lower.includes('water') || lower.includes('вода') || lower.includes('волна')) vfxType = 'water';
            else if (lower.includes('smoke') || lower.includes('дым') || lower.includes('туман')) vfxType = 'smoke';
            else if (lower.includes('light') || lower.includes('молни')) vfxType = 'lightning';
            else if (lower.includes('portal') || lower.includes('портал')) vfxType = 'portal';

            const tagResult = taggingEngine.autoTag(fileName, cleanRelPath, 'effects', fullPath);

            effects.push({
              id: effectId,
              name: fileName,
              category,
              url: fileUrl,
              type: vfxType,
              format: ext.replace('.', ''),
              fileSize: stat.size,
              mtime: stat.mtimeMs,
              relativePath: cleanRelPath,
              tags: tagResult.tags,
            });

            taggingEngine.indexAsset({
              id: effectId,
              name: fileName,
              category,
              primaryCategory: 'other',
              section: 'effects',
              url: fileUrl,
              path: cleanRelPath,
              tags: tagResult.tags,
              metadata: tagResult.metadata,
              fileSize: stat.size,
              lastModified: stat.mtimeMs,
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

      // 7. Systems Summary Scan
      const systemsScan = systemDirectoryEngine.scanSystems();

      // Calculate Revision Hash
      const revision = crypto
        .createHash('sha256')
        .update(`${totalFilesCount}-${totalMtimeSum}-${maps.length}-${props.length}-${playlists.length}-${sfx.length}-${systemsScan.totalSystemFilesCount}`)
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
        systemsCount: systemsScan.totalSystemsCount,
        systemFilesCount: systemsScan.totalSystemFilesCount,
        tagSummary: taggingEngine.getTagSummary(),
        stats: {
          totalFiles: totalFilesCount + systemsScan.totalSystemFilesCount,
          mapsCount: maps.length,
          propsCount: props.length,
          tracksCount: Array.from(playlistsMap.values()).reduce((acc, t) => acc + t.length, 0),
          playlistsCount: playlists.length,
          sfxCount: sfx.length,
          effectsCount: effects.length,
          systemsCount: systemsScan.totalSystemsCount,
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
