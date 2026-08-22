import {
  TTRPGSystemManifest,
  SystemDataItem,
  SystemsScanResult,
  UniversalParseResult,
  UniversalParsedEntity,
} from '../types/systemDataTypes';
import { rustSystemParserService } from './rustSystemParserService';

const BUILTIN_SYSTEMS_FALLBACK: TTRPGSystemManifest[] = [
  {
    id: 'dnd5e',
    name: 'Dungeons & Dragons 5e',
    shortName: 'D&D 5e',
    folderName: 'dnd5e',
    description: 'Система правил 5-й редакции D&D. Монстры, заклинания, расы, классы, предметы и правила SRD.',
    icon: 'swords',
    color: 'rose',
    categories: ['monsters', 'spells', 'races', 'classes', 'items', 'rules', 'lore'],
    totalFiles: 3,
    categoryStats: { monsters: 1, spells: 1, races: 1, classes: 0, items: 0, rules: 0, lore: 0 }
  },
  {
    id: 'pathfinder2e',
    name: 'Pathfinder 2e',
    shortName: 'PF2e',
    folderName: 'pathfinder2e',
    description: 'Система правил Pathfinder Второй редакции. Бестиарий, заклинания, родословные, черты и экипировка.',
    icon: 'shield',
    color: 'amber',
    categories: ['bestiary', 'spells', 'ancestries', 'classes', 'feats', 'items', 'rules'],
    totalFiles: 2,
    categoryStats: { bestiary: 1, spells: 1 }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk RED / 2020',
    shortName: 'Cyberpunk',
    folderName: 'cyberpunk',
    description: 'Мрачное будущее, киберимпланты, оружие, роли фиксеров, соло, нетраннеров и боевые правила.',
    icon: 'zap',
    color: 'cyan',
    categories: ['cyberware', 'roles', 'weapons', 'netrunning', 'enemies', 'gear', 'rules'],
    totalFiles: 2,
    categoryStats: { cyberware: 1, weapons: 1 }
  },
  {
    id: 'gurps',
    name: 'GURPS 4th Edition',
    shortName: 'GURPS',
    folderName: 'gurps',
    description: 'Универсальная бесклассовая система GURPS 4e. Преимущества, недостатки, навыки, снаряжение и шаблоны.',
    icon: 'book',
    color: 'emerald',
    categories: ['advantages', 'disadvantages', 'skills', 'equipment', 'templates', 'rules'],
    totalFiles: 1,
    categoryStats: { advantages: 1 }
  },
  {
    id: 'coc',
    name: 'Call of Cthulhu 7e',
    shortName: 'CoC 7e',
    folderName: 'coc',
    description: 'Зов Ктулху 7-я редакция. Детективы, чудовища мифов Лавкрафта, заклинания, проверки рассудка и профессии.',
    icon: 'skull',
    color: 'purple',
    categories: ['investigators', 'monsters', 'spells', 'occupations', 'tomes', 'rules'],
    totalFiles: 1,
    categoryStats: { monsters: 1 }
  },
  {
    id: 'lore',
    name: 'Roleplaying Systems Lore',
    shortName: 'Lore & Worlds',
    folderName: 'lore',
    description: 'База знаний лора миров, географии, фракций, НИП и хроник истории TTRPG сеттингов.',
    icon: 'globe',
    color: 'amber',
    categories: ['Worlds', 'Settlements', 'Factions', 'NPCs', 'Articles'],
    totalFiles: 1,
    categoryStats: { Worlds: 1 }
  }
];

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
      
      // Load local fallback presets
      this.systems = BUILTIN_SYSTEMS_FALLBACK;
      this.lastFetched = Date.now();

      // Try scanning system directory via Tauri if available
      if (rustSystemParserService.isRustAvailable()) {
        try {
          const items = await rustSystemParserService.scanSystemDirectory('assets/systems', this.activeSystemId);
          this.cachedItems = items || [];
        } catch (e) {
          console.warn('Tauri native directory scan during fallback failed:', e);
        }
      }

      this.notify();

      return {
        systems: this.systems,
        activeSystemId: this.activeSystemId,
        totalSystemsCount: this.systems.length,
        totalSystemFilesCount: this.cachedItems.length,
        lastScannedAt: Date.now(),
      };
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
      
      // Fallback to Tauri native scanning
      if (rustSystemParserService.isRustAvailable()) {
        try {
          const items = await rustSystemParserService.scanSystemDirectory('assets/systems', this.activeSystemId);
          this.cachedItems = items || [];
          this.notify();
          return this.cachedItems;
        } catch (e) {
          console.warn('Tauri disk scan fallback failed:', e);
        }
      }
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
