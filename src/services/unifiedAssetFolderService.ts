import {
  MapItem,
  AudioPlaylist,
  SoundEffect,
  TabletopSessionState,
  UnifiedAssetFolderStats,
} from '../types';
import { mapLibraryCatalog } from './mapLibraryCatalog';

const CANONICAL_FOLDERS = [
  'maps',
  'props',
  'music',
  'sfx',
  'effects',
  'systems',
  'lore',
  'data',
] as const;

export const DEFAULT_SUBFOLDERS: Record<string, string[]> = {
  maps: ['Dungeons', 'Cities', 'Wilderness', 'Battlemaps', 'Taverns', 'Bosses', 'Castles', 'Caves', 'SciFi'],
  props: ['Tokens', 'Decorations', 'Furniture', 'Monsters', 'NPCs', 'Loot', 'Buildings', 'Vehicles', 'Effects'],
  music: ['Combat', 'Tavern', 'Exploration', 'Boss', 'Dungeon', 'Ambient', 'Peaceful', 'Suspense', 'Epic'],
  sfx: ['Magic', 'Combat', 'Monsters', 'Environment', 'Traps', 'Game', 'Spells', 'UI', 'Weather'],
  effects: ['Fire', 'Water', 'Portals', 'Lightning', 'Weather', 'Spells', 'Smoke', 'Magic_Runes'],
  systems: ['D&D_5e', 'Pathfinder_2e', 'Cyberpunk_RED', 'GURPS_4e', 'Call_of_Cthulhu', 'Generic_Rules'],
  lore: ['Faerun_DND5e', 'Cyberpunk_RED', 'Call_of_Cthulhu', 'Eberron_DND5e', 'GURPS_4e', 'Generic_Worlds'],
  data: ['Sessions', 'Presets', 'Layers', 'Backups'],
};

// Nested subfolders for TTRPG rules & mechanics per system
export const SYSTEM_NESTED_SUBFOLDERS: Record<string, string[]> = {
  'D&D_5e': ['Monsters', 'Spells', 'Items', 'Classes', 'Races', 'Rules', 'Feats', 'Backgrounds'],
  'Pathfinder_2e': ['Monsters', 'Spells', 'Items', 'Classes', 'Ancestries', 'Feats', 'Rules'],
  'Cyberpunk_RED': ['Roles', 'Cyberware', 'Weapons', 'Gear', 'Netrunning', 'NPCs', 'Rules'],
  'Call_of_Cthulhu': ['Investigators', 'Monsters', 'Spells', 'Tomes', 'Occupations', 'Rules', 'Sanity'],
  'GURPS_4e': ['Advantages', 'Disadvantages', 'Skills', 'Equipment', 'Spells', 'Rules'],
  'Generic_Rules': ['Rules', 'Tables', 'Homebrew'],
};

// Nested subfolders for lore, worldbuilding, and settings
export const LORE_NESTED_SUBFOLDERS: Record<string, string[]> = {
  'Faerun_DND5e': ['Factions', 'NPCs', 'Locations', 'History', 'Chronicles', 'Deities', 'Articles'],
  'Eberron_DND5e': ['Dragonmarked_Houses', 'Nations', 'Factions', 'NPCs', 'Locations', 'History', 'Articles'],
  'Cyberpunk_RED': ['Corporations', 'Gangs', 'Fixers_and_Edgerunners', 'Districts', 'History', 'Articles'],
  'Call_of_Cthulhu': ['Cults', 'Entities', 'Artifacts', 'Locations', 'Investigators', 'Articles'],
  'GURPS_4e': ['Infinite_Worlds', 'Timelines', 'Patrol_Factions', 'NPCs', 'Locations', 'Articles'],
  'Generic_Worlds': ['Factions', 'NPCs', 'Locations', 'History', 'Chronicles', 'Articles'],
};

// Global directory handle in memory for the active session
let rootDirectoryHandle: any = null;

// Cache map of file URL to prevent memory leaks with createObjectURL
const objectUrlCache: Map<string, string> = new Map();

export function getActiveDirectoryHandle() {
  return rootDirectoryHandle;
}

export function setActiveDirectoryHandle(handle: any) {
  rootDirectoryHandle = handle;
}

/**
 * Pick directory from disk using File System Access API
 */
export async function pickDiskAssetDirectory(
  createStructure: boolean = true
): Promise<{ stats: UnifiedAssetFolderStats; handle: any }> {
  if (typeof window === 'undefined' || !(window as any).showDirectoryPicker) {
    throw new Error('File System Access API is not supported in this browser. Please use the Directory Upload fallback.');
  }

  const handle = await (window as any).showDirectoryPicker({
    mode: 'readwrite',
    startIn: 'documents',
  });

  rootDirectoryHandle = handle;

  if (createStructure) {
    await createCanonicalFolderStructure(handle);
  }

  const stats = await scanDiskAssetDirectory(handle, createStructure);
  return { stats, handle };
}

/**
 * Create the standardized folders and subfolders on user's disk
 */
export async function createCanonicalFolderStructure(rootHandle: any): Promise<void> {
  if (!rootHandle) return;

  for (const mainFolder of CANONICAL_FOLDERS) {
    try {
      const folderHandle = await rootHandle.getDirectoryHandle(mainFolder, { create: true });
      
      // Create subfolders
      const subfolders = DEFAULT_SUBFOLDERS[mainFolder] || [];
      for (const sub of subfolders) {
        try {
          const subHandle = await folderHandle.getDirectoryHandle(sub, { create: true });

          // Create nested subfolders for systems
          if (mainFolder === 'systems' && SYSTEM_NESTED_SUBFOLDERS[sub]) {
            for (const nested of SYSTEM_NESTED_SUBFOLDERS[sub]) {
              try {
                await subHandle.getDirectoryHandle(nested, { create: true });
              } catch (e) {}
            }
            // System-level readme
            try {
              const sysReadme = await subHandle.getFileHandle('README.txt', { create: true });
              const sysWritable = await sysReadme.createWritable();
              await sysWritable.write(`=== ПРАВИЛА И СПРАВОЧНИКИ: ${sub} ===\nКатегории:\n- Monsters: бестиарий, монстры и NPC\n- Spells: заклинания и способности\n- Items: экипировка, оружие и артефакты\n- Classes/Roles: классы и архетипы\n- Races/Ancestries: расы и происхождения\n- Rules: правила, таблицы и механики\n\nПомещайте сюда файлы .json, .md, .txt, .pdf или импортируйте через Универсальный Парсер.`);
              await sysWritable.close();
            } catch (e) {}
          }

          // Create nested subfolders for lore
          if (mainFolder === 'lore' && LORE_NESTED_SUBFOLDERS[sub]) {
            for (const nested of LORE_NESTED_SUBFOLDERS[sub]) {
              try {
                await subHandle.getDirectoryHandle(nested, { create: true });
              } catch (e) {}
            }
            // Lore world-level readme
            try {
              const loreReadme = await subHandle.getFileHandle('README.txt', { create: true });
              const loreWritable = await loreReadme.createWritable();
              await loreWritable.write(`=== ЛОР И ЭНЦИКЛОПЕДИЯ СЕТТИНГА: ${sub} ===\nКатегории:\n- Factions / Corporations / Cults: фракции, гильдии, культы\n- NPCs / Fixers / Entities: ключевые персонажи и сущности\n- Locations / Districts / Regions: города, регионы, достопримечательности\n- History / Chronicles: хроники, таймлайны и события\n- Articles / Deities: статьи и божества\n\nПомещайте сюда файлы статей (.json, .md, .txt) или импортируйте книги через Универсальный Парсер.`);
              await loreWritable.close();
            } catch (e) {}
          }
        } catch (e) {}
      }

      // Create a helpful README.txt in each main folder
      try {
        const readmeHandle = await folderHandle.getFileHandle('README.txt', { create: true });
        const writable = await readmeHandle.createWritable();
        const text = getFolderReadmeText(mainFolder);
        await writable.write(text);
        await writable.close();
      } catch (e) {
        // Ignored if cannot write
      }
    } catch (e) {
      console.warn(`Could not create folder ${mainFolder}:`, e);
    }
  }
}

function getFolderReadmeText(folderName: string): string {
  switch (folderName) {
    case 'maps':
      return '=== ПАПКА КАРТ (AETHERMAP) ===\nПомещайте сюда изображения и видео карт (.webp, .jpg, .png, .mp4, .webm).\nПодпапки (Dungeons, Cities, Wilderness, Battlemaps, Taverns, Bosses, Castles, Caves, SciFi) автоматически станут категориями карт в библиотеке.';
    case 'props':
      return '=== ПАПКА ОБЪЕКТОВ И ТОКЕНОВ ===\nПомещайте сюда токены персонажей, монстров, мебель, крыши, ловушки и декорации (.png, .webp).\nПодпапки (Tokens, Decorations, Furniture, Monsters, NPCs, Loot, Buildings, Vehicles, Effects) станут категориями объектов на столе.';
    case 'music':
      return '=== ПАПКА МУЗЫКИ И САУНДТРЕКОВ ===\nПомещайте сюда фоновые треки (.mp3, .ogg, .wav, .m4a).\nКаждая подпапка (Combat, Tavern, Exploration, Boss, Dungeon, Ambient, Peaceful, Suspense, Epic) автоматически станет плейлистом в плеере.';
    case 'sfx':
      return '=== ПАПКА ЗВУКОВЫХ ЭФФЕКТОВ (SFX) ===\nПомещайте сюда короткие звуки (.mp3, .wav, .ogg).\nПодпапки (Magic, Combat, Monsters, Environment, Traps, Game, Spells, UI, Weather) станут банками эффектов на звуковой панели (Soundboard).';
    case 'effects':
      return '=== ПАПКА АНИМИРОВАННЫХ ЭФФЕКТОВ (VFX) ===\nПомещайте сюда видео и анимации спецэффектов (.webm с прозрачностью, .mp4, .gif).\nПодпапки (Fire, Water, Portals, Lightning, Weather, Spells, Smoke, Magic_Runes) используются для наложения эффектов на холст стола.';
    case 'systems':
      return '=== ПАПКА РОЛЕВЫХ СИСТЕМ И МЕХАНИК (AETHERMAP SYSTEMS) ===\nСодержит правила, бестиарии монстров, заклинания, экипировку и классы по системам (D&D_5e, Pathfinder_2e, Cyberpunk_RED, GURPS_4e, Call_of_Cthulhu, Generic_Rules).\nКаждая система содержит подпапки Monsters, Spells, Items, Classes, Rules и др.';
    case 'lore':
      return '=== ПАПКА ЛОРА МИРОВ И СЕТТИНГОВ (AETHERMAP WORLD LORE) ===\nСодержит энциклопедии, статьи, фракции, НИП и хроники по вселенным (Faerun_DND5e, Eberron_DND5e, Cyberpunk_RED, Call_of_Cthulhu, GURPS_4e, Generic_Worlds).\nКаждый мир содержит подпапки Factions, NPCs, Locations, History, Articles.';
    case 'data':
      return '=== ПАПКА ДАННЫХ И СОХРАНЕНИЙ ===\nЗдесь хранятся файлы резервных копий сессий (.json), пресеты стола, сохраненные слои и бэкапы (Sessions, Presets, Layers, Backups).';
    default:
      return 'AetherMap asset folder';
  }
}

/**
 * Recursively scan directory and parse all categories, maps, music, sfx, effects, systems, lore, and data
 */
export async function scanDiskAssetDirectory(
  rootHandle: any,
  createStructure: boolean = true
): Promise<UnifiedAssetFolderStats> {
  if (!rootHandle) {
    return {
      connected: false,
      folderName: '',
      createStructureOnConnect: createStructure,
      mapsCount: 0,
      mapCategoriesCount: 0,
      propsCount: 0,
      propCategoriesCount: 0,
      playlistsCount: 0,
      tracksCount: 0,
      sfxBanksCount: 0,
      sfxCount: 0,
      effectsCount: 0,
      effectsCategoriesCount: 0,
      savedSessionsCount: 0,
      systemsCount: 0,
      systemFilesCount: 0,
      loreCount: 0,
      worldsCount: 0,
      totalCount: 0,
      lastSyncedAt: Date.now(),
    };
  }

  let mapsCount = 0;
  let mapCategoriesSet = new Set<string>();
  let propsCount = 0;
  let propCategoriesSet = new Set<string>();
  let playlistsSet = new Set<string>();
  let tracksCount = 0;
  let sfxBanksSet = new Set<string>();
  let sfxCount = 0;
  let effectsCount = 0;
  let effectsCategoriesSet = new Set<string>();
  let savedSessionsCount = 0;
  let systemsSet = new Set<string>();
  let systemFilesCount = 0;
  let loreCount = 0;
  let worldsSet = new Set<string>();

  try {
    for await (const [name, entry] of rootHandle.entries()) {
      if (entry.kind === 'directory') {
        const lowerName = name.toLowerCase();

        if (lowerName === 'maps') {
          const res = await countFilesAndSubfolders(entry);
          mapsCount += res.fileCount;
          res.subfolders.forEach((f) => mapCategoriesSet.add(f));
        } else if (lowerName === 'props') {
          const res = await countFilesAndSubfolders(entry);
          propsCount += res.fileCount;
          res.subfolders.forEach((f) => propCategoriesSet.add(f));
        } else if (lowerName === 'music') {
          const res = await countFilesAndSubfolders(entry);
          tracksCount += res.fileCount;
          res.subfolders.forEach((f) => playlistsSet.add(f));
        } else if (lowerName === 'sfx') {
          const res = await countFilesAndSubfolders(entry);
          sfxCount += res.fileCount;
          res.subfolders.forEach((f) => sfxBanksSet.add(f));
        } else if (lowerName === 'effects') {
          const res = await countFilesAndSubfolders(entry);
          effectsCount += res.fileCount;
          res.subfolders.forEach((f) => effectsCategoriesSet.add(f));
        } else if (lowerName === 'systems') {
          const res = await countFilesAndSubfolders(entry, 3);
          systemFilesCount += res.fileCount;
          res.subfolders.forEach((f) => systemsSet.add(f));
        } else if (lowerName === 'lore') {
          const res = await countFilesAndSubfolders(entry, 3);
          loreCount += res.fileCount;
          res.subfolders.forEach((f) => worldsSet.add(f));
        } else if (lowerName === 'data') {
          const res = await countFilesAndSubfolders(entry);
          savedSessionsCount += res.fileCount;
        }
      }
    }
  } catch (err) {
    console.warn('Error reading directory entries:', err);
  }

  const totalCount =
    mapsCount +
    propsCount +
    tracksCount +
    sfxCount +
    effectsCount +
    systemFilesCount +
    loreCount +
    savedSessionsCount;

  return {
    connected: true,
    folderName: rootHandle.name || 'Assets_Directory',
    createStructureOnConnect: createStructure,
    mapsCount,
    mapCategoriesCount: mapCategoriesSet.size,
    propsCount,
    propCategoriesCount: propCategoriesSet.size,
    playlistsCount: playlistsSet.size,
    tracksCount,
    sfxBanksCount: sfxBanksSet.size,
    sfxCount,
    effectsCount,
    effectsCategoriesCount: effectsCategoriesSet.size,
    savedSessionsCount,
    systemsCount: systemsSet.size,
    systemFilesCount,
    loreCount,
    worldsCount: worldsSet.size,
    totalCount,
    lastSyncedAt: Date.now(),
  };
}

async function countFilesAndSubfolders(
  dirHandle: any,
  maxDepth: number = 2,
  currentDepth: number = 1
): Promise<{ fileCount: number; subfolders: string[] }> {
  let fileCount = 0;
  const subfolders: string[] = [];

  try {
    for await (const [name, entry] of dirHandle.entries()) {
      if (entry.kind === 'directory') {
        subfolders.push(name);
        if (currentDepth < maxDepth) {
          const innerRes = await countFilesAndSubfolders(entry, maxDepth, currentDepth + 1);
          fileCount += innerRes.fileCount;
        }
      } else if (entry.kind === 'file' && !name.startsWith('.') && name !== 'README.txt') {
        fileCount++;
      }
    }
  } catch (e) {}

  return { fileCount, subfolders };
}

/**
 * High-performance, non-blocking asynchronous scanner for large directories (2500+ maps).
 * Yields execution to the main thread so the UI never freezes or locks up.
 */
export async function loadAssetFolderContent(
  rootHandle: any,
  onProgress?: (progress: { currentCategory: string; processedFiles: number; totalEstimated: number }) => void
): Promise<{
  maps: MapItem[];
  categories: string[];
  playlists: Array<{ playlistName: string; tracks: Array<{ title: string; url: string }> }>;
  sfx: Array<{ name: string; bank: string; url: string }>;
  effects: Array<{ name: string; category: string; url: string; isVideo: boolean }>;
}> {
  if (!rootHandle) {
    return { maps: [], categories: [], playlists: [], sfx: [], effects: [] };
  }

  const discoveredMaps: MapItem[] = [];
  const categoriesSet = new Set<string>();
  const playlistsMap = new Map<string, Array<{ title: string; url: string }>>();
  const discoveredSfx: Array<{ name: string; bank: string; url: string }> = [];
  const discoveredEffects: Array<{ name: string; category: string; url: string; isVideo: boolean }> = [];

  let processedCount = 0;

  try {
    for await (const [mainName, mainEntry] of rootHandle.entries()) {
      if (mainEntry.kind !== 'directory') continue;
      const lowerSection = mainName.toLowerCase();

      if (lowerSection === 'maps' || lowerSection === 'props') {
        const isPropsLayer = lowerSection === 'props';
        for await (const [subName, subEntry] of mainEntry.entries()) {
          if (subEntry.kind === 'directory') {
            const categoryName = subName;
            categoriesSet.add(categoryName);

            for await (const [fileName, fileEntry] of subEntry.entries()) {
              if (fileEntry.kind === 'file' && !fileName.startsWith('.') && fileName !== 'README.txt') {
                processedCount++;
                if (processedCount % 25 === 0) {
                  // Non-blocking yield to allow browser rendering and UI event processing
                  await new Promise((resolve) => setTimeout(resolve, 0));
                  if (onProgress) {
                    onProgress({ currentCategory: categoryName, processedFiles: processedCount, totalEstimated: 2500 });
                  }
                }

                try {
                  const file: File = await fileEntry.getFile();
                  const cacheKey = `${fileEntry.name}_${file.size}_${file.lastModified}`;
                  let url = objectUrlCache.get(cacheKey);
                  if (!url) {
                    url = URL.createObjectURL(file);
                    objectUrlCache.set(cacheKey, url);
                  }

                  const cleanName = file.name.replace(/\.[^/.]+$/, '');
                  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name);
                  const mapId = `disk-${categoryName}-${cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_');

                  const mapItem: MapItem = {
                    id: mapId,
                    name: cleanName,
                    type: isVideo ? 'video' : 'image',
                    url,
                    thumbnailUrl: url,
                    width: 1920,
                    height: 1080,
                    aspectRatio: 1.77,
                    position: { x: 0, y: 0 },
                    scale: { x: 1, y: 1 },
                    rotation: 0,
                    zIndex: isPropsLayer ? 10 : 0,
                    opacity: 1,
                    hash: cacheKey,
                    fileSize: file.size || 0,
                    format: file.name.split('.').pop() || 'png',
                    category: categoryName,
                    layer: isPropsLayer ? 'props' : 'background',
                  };

                  mapLibraryCatalog.registerFileHandle(mapId, fileEntry);
                  discoveredMaps.push(mapItem);
                } catch (e) {
                  console.warn('Failed to read map file handle:', e);
                }
              }
            }
          } else if (subEntry.kind === 'file' && !subName.startsWith('.') && subName !== 'README.txt') {
            processedCount++;
            if (processedCount % 25 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 0));
            }

            try {
              const file: File = await subEntry.getFile();
              const cacheKey = `${subEntry.name}_${file.size}_${file.lastModified}`;
              let url = objectUrlCache.get(cacheKey);
              if (!url) {
                url = URL.createObjectURL(file);
                objectUrlCache.set(cacheKey, url);
              }

              const cleanName = file.name.replace(/\.[^/.]+$/, '');
              const isVideo = file.type.startsWith('video/') || /\.(mp4|webm)$/i.test(file.name);
              const mapId = `disk-root-${cleanName}`.replace(/[^a-zA-Z0-9_-]/g, '_');

              const mapItem: MapItem = {
                id: mapId,
                name: cleanName,
                type: isVideo ? 'video' : 'image',
                url,
                thumbnailUrl: url,
                width: 1920,
                height: 1080,
                aspectRatio: 1.77,
                position: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotation: 0,
                zIndex: isPropsLayer ? 10 : 0,
                opacity: 1,
                hash: cacheKey,
                fileSize: file.size || 0,
                format: file.name.split('.').pop() || 'png',
                category: 'Общее',
                layer: isPropsLayer ? 'props' : 'background',
              };

              mapLibraryCatalog.registerFileHandle(mapId, subEntry);
              discoveredMaps.push(mapItem);
            } catch (e) {
              console.warn('Failed to read map root file handle:', e);
            }
          }
        }
      } else if (lowerSection === 'music') {
        for await (const [subName, subEntry] of mainEntry.entries()) {
          if (subEntry.kind === 'directory') {
            const playlistName = subName;
            const tracks: Array<{ title: string; url: string }> = [];

            for await (const [fileName, fileEntry] of subEntry.entries()) {
              if (fileEntry.kind === 'file' && !fileName.startsWith('.') && fileName !== 'README.txt') {
                try {
                  const file: File = await fileEntry.getFile();
                  const cacheKey = `audio_${file.name}_${file.size}`;
                  let url = objectUrlCache.get(cacheKey);
                  if (!url) {
                    url = URL.createObjectURL(file);
                    objectUrlCache.set(cacheKey, url);
                  }
                  const title = file.name.replace(/\.[^/.]+$/, '');
                  tracks.push({ title, url });
                } catch (e) {}
              }
            }

            if (tracks.length > 0) {
              playlistsMap.set(playlistName, tracks);
            }
          } else if (subEntry.kind === 'file' && !subName.startsWith('.') && subName !== 'README.txt') {
            try {
              const file: File = await subEntry.getFile();
              const cacheKey = `audio_${file.name}_${file.size}`;
              let url = objectUrlCache.get(cacheKey);
              if (!url) {
                url = URL.createObjectURL(file);
                objectUrlCache.set(cacheKey, url);
              }
              const title = file.name.replace(/\.[^/.]+$/, '');
              const defaultList = playlistsMap.get('Саундтреки') || [];
              defaultList.push({ title, url });
              playlistsMap.set('Саундтреки', defaultList);
            } catch (e) {}
          }
        }
      } else if (lowerSection === 'effects') {
        for await (const [subName, subEntry] of mainEntry.entries()) {
          if (subEntry.kind === 'directory') {
            const effectCategory = subName;
            for await (const [fileName, fileEntry] of subEntry.entries()) {
              if (fileEntry.kind === 'file' && !fileName.startsWith('.') && fileName !== 'README.txt') {
                try {
                  const file: File = await fileEntry.getFile();
                  const cacheKey = `effect_${file.name}_${file.size}`;
                  let url = objectUrlCache.get(cacheKey);
                  if (!url) {
                    url = URL.createObjectURL(file);
                    objectUrlCache.set(cacheKey, url);
                  }
                  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
                  const cleanName = file.name.replace(/\.[^/.]+$/, '');
                  discoveredEffects.push({ name: cleanName, category: effectCategory, url, isVideo });
                } catch (e) {}
              }
            }
          } else if (subEntry.kind === 'file' && !subName.startsWith('.') && subName !== 'README.txt') {
            try {
              const file: File = await subEntry.getFile();
              const cacheKey = `effect_${file.name}_${file.size}`;
              let url = objectUrlCache.get(cacheKey);
              if (!url) {
                url = URL.createObjectURL(file);
                objectUrlCache.set(cacheKey, url);
              }
              const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
              const cleanName = file.name.replace(/\.[^/.]+$/, '');
              discoveredEffects.push({ name: cleanName, category: 'Общие Эффекты', url, isVideo });
            } catch (e) {}
          }
        }
      } else if (lowerSection === 'sfx') {
        for await (const [subName, subEntry] of mainEntry.entries()) {
          if (subEntry.kind === 'directory') {
            const bankName = subName;

            for await (const [fileName, fileEntry] of subEntry.entries()) {
              if (fileEntry.kind === 'file' && !fileName.startsWith('.') && fileName !== 'README.txt') {
                try {
                  const file: File = await fileEntry.getFile();
                  const cacheKey = `sfx_${file.name}_${file.size}`;
                  let url = objectUrlCache.get(cacheKey);
                  if (!url) {
                    url = URL.createObjectURL(file);
                    objectUrlCache.set(cacheKey, url);
                  }
                  const cleanName = file.name.replace(/\.[^/.]+$/, '');
                  discoveredSfx.push({ name: cleanName, bank: bankName, url });
                } catch (e) {}
              }
            }
          } else if (subEntry.kind === 'file' && !subName.startsWith('.') && subName !== 'README.txt') {
            try {
              const file: File = await subEntry.getFile();
              const cacheKey = `sfx_${file.name}_${file.size}`;
              let url = objectUrlCache.get(cacheKey);
              if (!url) {
                url = URL.createObjectURL(file);
                objectUrlCache.set(cacheKey, url);
              }
              const cleanName = file.name.replace(/\.[^/.]+$/, '');
              discoveredSfx.push({ name: cleanName, bank: 'Общие SFX', url });
            } catch (e) {}
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error reading directory entries for assets:', err);
  }

  const playlists: Array<{ playlistName: string; tracks: Array<{ title: string; url: string }> }> = [];
  playlistsMap.forEach((tracks, playlistName) => {
    playlists.push({ playlistName, tracks });
  });

  const categories = Array.from(categoriesSet);

  // Automatically index all discovered maps in the Map Library Catalog
  mapLibraryCatalog.setLibraryMaps(discoveredMaps, categories);

  return {
    maps: discoveredMaps,
    categories,
    playlists,
    sfx: discoveredSfx,
    effects: discoveredEffects,
  };
}

/**
 * Save current session state as JSON file in `data/Sessions/` folder on disk
 */
export async function saveSessionSnapshotToDisk(
  session: TabletopSessionState,
  filename?: string
): Promise<{ success: boolean; filename: string }> {
  if (!rootDirectoryHandle) {
    throw new Error('Сначала подключите рабочую папку на диске');
  }

  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(
    2,
    '0'
  )}`;
  const actualName = filename || `AetherMap_Session_${dateStr}.json`;

  try {
    const dataDir = await rootDirectoryHandle.getDirectoryHandle('data', { create: true });
    const sessionsDir = await dataDir.getDirectoryHandle('Sessions', { create: true });
    const fileHandle = await sessionsDir.getFileHandle(actualName, { create: true });
    
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(session, null, 2));
    await writable.close();

    return { success: true, filename: actualName };
  } catch (err: any) {
    console.error('Failed to save session to disk:', err);
    throw new Error(`Ошибка записи на диск: ${err.message || err}`);
  }
}

/**
 * Parse files uploaded from webkitdirectory input or drag & drop folder
 */
export function parseUploadedDirectoryFiles(files: FileList | File[]): {
  maps: Array<{ name: string; category: string; file: File; isVideo: boolean }>;
  props: Array<{ name: string; category: string; file: File }>;
  music: Array<{ title: string; playlist: string; file: File }>;
  sfx: Array<{ name: string; bank: string; file: File }>;
  effects: Array<{ name: string; category: string; file: File; isVideo: boolean }>;
  dataSessions: Array<{ name: string; file: File }>;
  detectedFolders: string[];
} {
  const result = {
    maps: [] as Array<{ name: string; category: string; file: File; isVideo: boolean }>,
    props: [] as Array<{ name: string; category: string; file: File }>,
    music: [] as Array<{ title: string; playlist: string; file: File }>,
    sfx: [] as Array<{ name: string; bank: string; file: File }>,
    effects: [] as Array<{ name: string; category: string; file: File; isVideo: boolean }>,
    dataSessions: [] as Array<{ name: string; file: File }>,
    detectedFolders: [] as string[],
  };

  const folderSet = new Set<string>();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = file.webkitRelativePath || file.name;
    const parts = relPath.split('/');

    if (parts.length < 2) continue; // Not inside a folder

    const section = parts[1]?.toLowerCase();
    const categoryOrSub = parts[2] && parts.length > 3 ? parts[2] : 'General';
    folderSet.add(section);

    const isMediaVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
    const isAudio = file.type.startsWith('audio/') || /\.(mp3|ogg|wav|m4a|flac)$/i.test(file.name);
    const isJson = file.name.endsWith('.json');

    if (section === 'maps' && (isImage || isMediaVideo)) {
      result.maps.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        category: categoryOrSub,
        file,
        isVideo: isMediaVideo,
      });
    } else if (section === 'props' && isImage) {
      result.props.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        category: categoryOrSub,
        file,
      });
    } else if (section === 'effects' && (isMediaVideo || isImage)) {
      result.effects.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        category: categoryOrSub,
        file,
        isVideo: isMediaVideo,
      });
    } else if (section === 'music' && isAudio) {
      result.music.push({
        title: file.name.replace(/\.[^/.]+$/, ''),
        playlist: categoryOrSub,
        file,
      });
    } else if (section === 'sfx' && isAudio) {
      result.sfx.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        bank: categoryOrSub,
        file,
      });
    } else if (section === 'data' && isJson) {
      result.dataSessions.push({
        name: file.name,
        file,
      });
    }
  }

  result.detectedFolders = Array.from(folderSet);
  return result;
}

