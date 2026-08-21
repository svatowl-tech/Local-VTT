import { MapItem } from '../types';

type LibraryListener = (maps: MapItem[], categories: string[]) => void;

class MapLibraryCatalogService {
  private libraryMaps: MapItem[] = [];
  private categories: string[] = ['Подземелья', 'Города', 'Природа', 'Боссы', 'Здания', 'Общее'];
  private listeners: Set<LibraryListener> = new Set();
  private fileHandleMap: Map<string, any> = new Map(); // id -> FileSystemFileHandle

  constructor() {
    this.loadCachedCategories();
  }

  private loadCachedCategories() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const savedCats = localStorage.getItem('aethermap_map_categories');
        if (savedCats) {
          const parsed = JSON.parse(savedCats);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.categories = Array.from(new Set([...this.categories, ...parsed]));
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  public subscribe(listener: LibraryListener): () => void {
    this.listeners.add(listener);
    listener(this.libraryMaps, this.categories);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l(this.libraryMaps, this.categories));
  }

  public getMaps(): MapItem[] {
    return this.libraryMaps;
  }

  public getCategories(): string[] {
    return this.categories;
  }

  public setCategories(categories: string[]): void {
    this.categories = Array.from(new Set(categories));
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('aethermap_map_categories', JSON.stringify(this.categories));
      }
    } catch {
      // Ignore
    }
    this.notify();
  }

  public addCategory(cat: string): void {
    const trimmed = cat.trim();
    if (!trimmed) return;
    if (!this.categories.includes(trimmed)) {
      this.setCategories([...this.categories, trimmed]);
    }
  }

  /**
   * Sets or merges maps into the catalog without flooding the active tabletop canvas
   */
  public setLibraryMaps(maps: MapItem[], categories?: string[]): void {
    this.libraryMaps = maps;
    if (categories && categories.length > 0) {
      this.categories = Array.from(new Set([...this.categories, ...categories]));
    }
    this.notify();
  }

  public mergeLibraryMaps(newMaps: MapItem[], categories?: string[]): void {
    const existingIds = new Set(this.libraryMaps.map((m) => m.id));
    const toAdd = newMaps.filter((m) => !existingIds.has(m.id));

    if (toAdd.length > 0) {
      this.libraryMaps = [...this.libraryMaps, ...toAdd];
    }
    if (categories && categories.length > 0) {
      this.categories = Array.from(new Set([...this.categories, ...categories]));
    }
    this.notify();
  }

  public removeMap(mapId: string): void {
    this.libraryMaps = this.libraryMaps.filter((m) => m.id !== mapId);
    this.fileHandleMap.delete(mapId);
    this.notify();
  }

  public registerFileHandle(mapId: string, handle: any): void {
    this.fileHandleMap.set(mapId, handle);
  }

  public async getFileForMap(mapItem: MapItem): Promise<File | null> {
    const handle = this.fileHandleMap.get(mapItem.id);
    if (handle && typeof handle.getFile === 'function') {
      try {
        return await handle.getFile();
      } catch (e) {
        console.warn('Failed to retrieve file from handle:', e);
      }
    }
    return null;
  }
}

export const mapLibraryCatalog = new MapLibraryCatalogService();
