import fs from 'fs';
import path from 'path';
import { WorldLoreItem, LoreCategory } from '../src/types/worldLoreTypes';
import { loreParserEngine } from './parsers/loreParserEngine';

const WORLD_FOLDER_MAP: Record<string, string> = {
  dnd5e_faerun: 'Faerun_DND5e',
  dnd5e_eberron: 'Eberron_DND5e',
  cyberpunk_night_city: 'Cyberpunk_RED',
  coc_arkham: 'Call_of_Cthulhu',
  gurps_infinite: 'GURPS_4e',
};

export class LoreDirectoryEngine {
  private cache: Map<string, { timestamp: number; items: WorldLoreItem[] }> = new Map();

  private getRootLorePath(): string {
    return path.join(process.cwd(), 'assets', 'lore');
  }

  public invalidateCache(worldId?: string): void {
    if (worldId) {
      this.cache.delete(worldId);
    } else {
      this.cache.clear();
    }
  }

  public getWorldFolderPath(worldId: string): string {
    const root = this.getRootLorePath();
    const folderName = WORLD_FOLDER_MAP[worldId] || 'Generic_Worlds';
    const fullPath = path.join(root, folderName);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    return fullPath;
  }

  public sanitizeFilename(idOrName: string): string {
    return idOrName
      .toLowerCase()
      .replace(/[^a-z0-9_а-яё\-]/gi, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);
  }

  /**
   * Save an individual Lore item to disk as a small JSON file
   */
  public saveLoreItemToDisk(worldId: string, item: WorldLoreItem): { success: boolean; filePath: string } {
    try {
      this.invalidateCache(worldId);
      const dirPath = this.getWorldFolderPath(worldId);
      const cleanId = this.sanitizeFilename(item.id || item.name);
      const category = item.category || 'lore_article';
      const filename = `lore_${category}_${cleanId}.json`;
      const fullPath = path.join(dirPath, filename);

      const itemToSave: WorldLoreItem = {
        ...item,
        worldId,
        updatedAt: Date.now(),
        filePath: fullPath,
      };

      fs.writeFileSync(fullPath, JSON.stringify(itemToSave, null, 2), 'utf-8');
      return { success: true, filePath: fullPath };
    } catch (err) {
      console.error('Failed to save lore item to disk:', err);
      return { success: false, filePath: '' };
    }
  }

  /**
   * Delete an individual Lore item from disk
   */
  public deleteLoreItemFromDisk(worldId: string, itemId: string): boolean {
    try {
      this.invalidateCache(worldId);
      const dirPath = this.getWorldFolderPath(worldId);
      if (!fs.existsSync(dirPath)) return false;

      const cleanId = this.sanitizeFilename(itemId);
      const files = fs.readdirSync(dirPath);

      for (const file of files) {
        if (file.endsWith('.json') && file.includes(cleanId)) {
          const fullPath = path.join(dirPath, file);
          fs.unlinkSync(fullPath);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Failed to delete lore item from disk:', err);
      return false;
    }
  }

  /**
   * Scan Lore Directory Incrementally:
   * 1. Reads existing individual JSON entity files
   * 2. Checks source files (.pdf, .txt, .md, .zip, .epub, .wiki)
   * 3. Skips re-parsing source files if individual JSON entity files exist
   * 4. Parses new unparsed source files and writes individual JSON files for extracted entities
   */
  public async scanLoreDirectoryIncremental(
    worldId: string,
    forceReparse: boolean = false
  ): Promise<{
    loreItems: WorldLoreItem[];
    stats: { totalJsonEntities: number; sourceFilesParsed: number; skippedSources: number };
  }> {
    if (!forceReparse) {
      const cached = this.cache.get(worldId);
      if (cached && Date.now() - cached.timestamp < 30000) {
        return {
          loreItems: cached.items,
          stats: {
            totalJsonEntities: cached.items.length,
            sourceFilesParsed: 0,
            skippedSources: 0,
          },
        };
      }
    } else {
      this.invalidateCache(worldId);
    }

    const dirPath = this.getWorldFolderPath(worldId);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const files = fs.readdirSync(dirPath);

    const jsonEntityFiles: string[] = [];
    const sourceFiles: string[] = [];

    for (const file of files) {
      if (file.startsWith('.')) continue;
      const ext = path.extname(file).toLowerCase();
      if (ext === '.json') {
        jsonEntityFiles.push(file);
      } else if (['.pdf', '.txt', '.md', '.wiki', '.epub', '.zip'].includes(ext)) {
        sourceFiles.push(file);
      }
    }

    // IF forceReparse is true, delete existing parsed JSON entity files to clean up old structure!
    if (forceReparse && jsonEntityFiles.length > 0) {
      for (const jsonFile of jsonEntityFiles) {
        try {
          const fullPath = path.join(dirPath, jsonFile);
          fs.unlinkSync(fullPath);
        } catch (e) {
          console.warn(`Failed to remove old JSON entity ${jsonFile}:`, e);
        }
      }
      jsonEntityFiles.length = 0;
    }

    const loadedLoreItems: WorldLoreItem[] = [];

    // 1. Read existing JSON entity files (if not forceReparse)
    if (!forceReparse) {
      for (const jsonFile of jsonEntityFiles) {
        try {
          const fullPath = path.join(dirPath, jsonFile);
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(raw);

          if (parsed && parsed.name && parsed.category) {
            loadedLoreItems.push({
              ...parsed,
              worldId,
              filePath: fullPath,
            });
          }
        } catch (e) {
          console.warn(`Skipping invalid lore JSON: ${jsonFile}`, e);
        }
      }
    }

    let sourceFilesParsed = 0;
    let skippedSources = 0;

    // 2. If JSON entity files exist and not forcing reparse, skip parsing source files!
    if (jsonEntityFiles.length > 0 && !forceReparse) {
      skippedSources = sourceFiles.length;
      this.cache.set(worldId, { timestamp: Date.now(), items: loadedLoreItems });
      return {
        loreItems: loadedLoreItems,
        stats: {
          totalJsonEntities: loadedLoreItems.length,
          sourceFilesParsed: 0,
          skippedSources,
        },
      };
    }

    // 3. Parse source files if forceReparse is true OR no JSON entity files exist
    for (const sourceFile of sourceFiles) {
      try {
        const fullPath = path.join(dirPath, sourceFile);
        const ext = path.extname(sourceFile).toLowerCase();
        const isBinary = ['.pdf', '.zip', '.epub'].includes(ext);

        let parseRes;
        if (isBinary) {
          const rawBuffer = fs.readFileSync(fullPath);
          parseRes = await loreParserEngine.parseLoreFile({
            filename: sourceFile,
            rawBuffer,
            targetWorldId: worldId,
            targetSystemId: 'dnd5e',
          });
        } else {
          const rawText = fs.readFileSync(fullPath, 'utf-8');
          parseRes = await loreParserEngine.parseLoreFile({
            filename: sourceFile,
            rawText,
            targetWorldId: worldId,
            targetSystemId: 'dnd5e',
          });
        }

        if (parseRes.entities && parseRes.entities.length > 0) {
          sourceFilesParsed++;
          for (const entity of parseRes.entities) {
            const item: WorldLoreItem = {
              id: entity.id || `lore-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              worldId,
              worldName: worldId,
              systemId: 'dnd5e',
              name: entity.name,
              category: (entity.category as any) || 'lore_article',
              summary: entity.summary || entity.name,
              content: entity.description || entity.summary || entity.name,
              tags: entity.tags || [worldId],
            };
            // Save each newly parsed entity as an individual JSON file
            const saveRes = this.saveLoreItemToDisk(worldId, item);
            if (saveRes.success) {
              loadedLoreItems.push(item);
            }
          }
        }
      } catch (e) {
        console.error(`Error parsing source file ${sourceFile}:`, e);
      }
    }

    this.cache.set(worldId, { timestamp: Date.now(), items: loadedLoreItems });

    return {
      loreItems: loadedLoreItems,
      stats: {
        totalJsonEntities: loadedLoreItems.length,
        sourceFilesParsed,
        skippedSources,
      },
    };
  }

  /**
   * Search / Paginate lore items dynamically from disk
   */
  public async searchAndPaginateLore(
    worldId: string,
    query: string = '',
    category: string = 'all',
    page: number = 1,
    limit: number = 50
  ): Promise<{ items: WorldLoreItem[]; total: number; page: number; totalPages: number }> {
    const { loreItems } = await this.scanLoreDirectoryIncremental(worldId, false);

    const q = query.trim().toLowerCase();
    const filtered = loreItems.filter((item) => {
      const matchCat = category === 'all' || item.category === category;
      const matchQ =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)));
      return matchCat && matchQ;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return { items, total, page, totalPages };
  }
}

export const loreDirectoryEngine = new LoreDirectoryEngine();
