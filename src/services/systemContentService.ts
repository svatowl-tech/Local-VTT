import {
  TTRPGSystemManifest,
  SystemDataItem,
  SystemsScanResult,
  UniversalParseResult,
  UniversalParsedEntity,
} from '../types/systemDataTypes';
import { rustSystemParserService } from './rustSystemParserService';

class SystemContentService {
  private systems: TTRPGSystemManifest[] = [];
  private activeSystemId: string = 'dnd5e';
  private cachedItems: SystemDataItem[] = [];
  private listeners: Set<() => void> = new Set();
  private isLoading: boolean = false;
  private lastFetched: number = 0;

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in SystemContentService subscriber:', err);
      }
    });
  }

  public getSystems(): TTRPGSystemManifest[] {
    return this.systems;
  }

  public getActiveSystemId(): string {
    return this.activeSystemId;
  }

  public getActiveSystem(): TTRPGSystemManifest | undefined {
    return this.systems.find((s) => s.id === this.activeSystemId) || this.systems[0];
  }

  public getCachedItems(): SystemDataItem[] {
    return this.cachedItems;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Fetches systems scan results from backend
   */
  public async fetchSystems(): Promise<SystemsScanResult | null> {
    this.isLoading = true;
    this.notify();

    try {
      const res = await fetch('/api/systems');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SystemsScanResult = await res.json();

      this.systems = data.systems || [];
      if (data.activeSystemId) {
        this.activeSystemId = data.activeSystemId;
      }
      this.lastFetched = Date.now();

      // Fetch items for the active system
      await this.fetchActiveSystemItems();

      return data;
    } catch (err) {
      console.warn('Could not fetch systems from server, using fallback local detection:', err);
      return null;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  /**
   * Fetches parsed items for active system
   */
  public async fetchActiveSystemItems(category?: string): Promise<SystemDataItem[]> {
    if (!this.activeSystemId) return [];

    try {
      const url = category
        ? `/api/systems/${encodeURIComponent(this.activeSystemId)}/items?category=${encodeURIComponent(category)}`
        : `/api/systems/${encodeURIComponent(this.activeSystemId)}/items`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.items && Array.isArray(json.items)) {
        this.cachedItems = json.items;
        this.notify();
        return json.items;
      }
      return [];
    } catch (err) {
      console.warn(`Could not fetch items for system ${this.activeSystemId}:`, err);
      return [];
    }
  }

  /**
   * Sets the active RPG system
   */
  public async setActiveSystem(systemId: string): Promise<boolean> {
    this.activeSystemId = systemId;
    this.notify();

    try {
      const res = await fetch('/api/systems/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.items) {
          this.cachedItems = json.items;
        }
      } else {
        await this.fetchActiveSystemItems();
      }

      this.notify();
      return true;
    } catch (err) {
      console.warn('Failed to update active system on backend:', err);
      await this.fetchActiveSystemItems();
      return true;
    }
  }

  /**
   * Creates a new custom system folder structure
   */
  public async createCustomSystem(name: string, categories?: string[]): Promise<TTRPGSystemManifest | null> {
    try {
      const res = await fetch('/api/systems/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, categories }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.manifest) {
        await this.fetchSystems();
        await this.setActiveSystem(json.manifest.id);
        return json.manifest;
      }
      return null;
    } catch (err) {
      console.error('Error creating custom system:', err);
      return null;
    }
  }

  /**
   * Universal Parser: Parses any uploaded file using Rust Tauri backend, with TypeScript fallback
   */
  public async parseFile(
    file: File,
    targetSystemId?: string,
    suggestedCategory?: string
  ): Promise<UniversalParseResult> {
    const { result } = await rustSystemParserService.parseFile(
      file,
      targetSystemId || this.activeSystemId,
      suggestedCategory
    );
    return result;
  }

  /**
   * Universal Parser: Parses raw text or JSON payload using Rust Tauri backend, with TypeScript fallback
   */
  public async parseRawText(options: {
    rawText: string;
    filename?: string;
    targetSystemId?: string;
    suggestedCategory?: string;
  }): Promise<UniversalParseResult> {
    const { result } = await rustSystemParserService.parseRawData({
      rawData: options.rawText,
      filename: options.filename || 'raw-data.txt',
      defaultSystem: options.targetSystemId || this.activeSystemId,
      suggestedCategory: options.suggestedCategory,
    });
    return result;
  }

  /**
   * Imports parsed entities into the system folder on disk (Rust with TS fallback)
   */
  public async importEntities(
    systemId: string,
    entities: UniversalParsedEntity[]
  ): Promise<{ success: boolean; importedCount: number; savedFiles: any[] }> {
    const sysId = systemId || this.activeSystemId;
    const res = await rustSystemParserService.importEntities(
      'assets/systems',
      sysId,
      entities
    );

    await this.fetchSystems();
    return {
      success: res.success,
      importedCount: res.importedCount,
      savedFiles: [],
    };
  }

  /**
   * Filter items by category and search query
   */
  public filterItems(options: {
    category?: string;
    searchQuery?: string;
    tag?: string;
  }): SystemDataItem[] {
    let result = [...this.cachedItems];

    if (options.category && options.category !== 'all') {
      result = result.filter(
        (item) => item.category.toLowerCase() === options.category?.toLowerCase()
      );
    }

    if (options.tag) {
      result = result.filter((item) =>
        item.tags.some((t) => t.toLowerCase() === options.tag?.toLowerCase())
      );
    }

    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.summary && item.summary.toLowerCase().includes(q)) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return result;
  }
}

export const systemContentService = new SystemContentService();
