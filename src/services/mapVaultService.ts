import { writeDataToContentFolder } from './universalSyncManager';
import { MapVaultItem, WorkspaceTab, MapItem, MapVaultStats } from '../types';
import { BUILTIN_VAULT_PRESETS } from './mapVaultPresets';

const STORAGE_VAULT_KEY = 'aethermap_map_vault_items_v1';
const STORAGE_CATEGORIES_KEY = 'aethermap_vault_categories_v1';

export const DEFAULT_VAULT_CATEGORIES = [
  'Все',
  'Глобальные миры',
  'Подземелья',
  'Города',
  'Природа',
  'Боссы',
  'Здания',
  'Пользовательские',
];

type VaultListener = (items: MapVaultItem[]) => void;

class MapVaultService {
  private items: MapVaultItem[] = [];
  private categories: string[] = [...DEFAULT_VAULT_CATEGORIES];
  private listeners: Set<VaultListener> = new Set();
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(STORAGE_VAULT_KEY);
        let userItems: MapVaultItem[] = [];
        if (raw) {
          userItems = JSON.parse(raw);
        }

        // Merge builtin presets with user custom saved maps
        const userMapIds = new Set(userItems.map((i) => i.id));
        const nonDuplicatePresets = BUILTIN_VAULT_PRESETS.filter((p) => !userMapIds.has(p.id));

        this.items = [...userItems, ...nonDuplicatePresets];

        const savedCats = localStorage.getItem(STORAGE_CATEGORIES_KEY);
        if (savedCats) {
          const parsedCats = JSON.parse(savedCats);
          if (Array.isArray(parsedCats)) {
            this.categories = Array.from(new Set([...this.categories, ...parsedCats]));
          }
        }
      } else {
        this.items = [...BUILTIN_VAULT_PRESETS];
      }
    } catch (e) {
      console.warn('MapVaultService init fallback to presets:', e);
      this.items = [...BUILTIN_VAULT_PRESETS];
    }
    this.isLoaded = true;
  }

    private persist() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Persist all user items (and overridden presets)
        localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(this.items));
        localStorage.setItem(STORAGE_CATEGORIES_KEY, JSON.stringify(this.categories));
      }
      
      // Also persist universally to the content folder
      writeDataToContentFolder(['data', 'Vault'], 'vault_items.json', this.items).catch(() => {});
      writeDataToContentFolder(['data', 'Vault'], 'vault_categories.json', this.categories).catch(() => {});
      
    } catch (e) {
      console.warn('MapVaultService persist error:', e);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.items));
  }

  public subscribe(listener: VaultListener): () => void {
    this.listeners.add(listener);
    listener(this.items);
    return () => this.listeners.delete(listener);
  }

  public getAll(): MapVaultItem[] {
    return this.items;
  }

  public getAllItems(): MapVaultItem[] {
    return this.items;
  }

  public getById(id: string): MapVaultItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  public getItem(id: string): MapVaultItem | undefined {
    return this.items.find((item) => item.id === id);
  }

  public reconcileUrls(freshMaps: MapItem[]): void {
    let changed = false;
    this.items = this.items.map(item => {
      let tabChanged = false;
      const updatedMaps = item.tabSnapshot.maps.map(existingMap => {
        const freshMap = freshMaps.find(m => m.name === existingMap.name);
        if (freshMap && (existingMap.url !== freshMap.url || existingMap.thumbnailUrl !== freshMap.thumbnailUrl)) {
          tabChanged = true;
          return {
             ...existingMap,
             url: freshMap.url,
             thumbnailUrl: freshMap.thumbnailUrl || freshMap.url,
          };
        }
        return existingMap;
      });

      if (tabChanged) {
        changed = true;
        // Optionally update the vault item's root thumbnail if it matches one of the healed maps
        let newThumbnail = item.thumbnailUrl;
        if (newThumbnail && newThumbnail.startsWith('blob:')) {
          const matchingUpdatedMap = updatedMaps.find(m => newThumbnail && m.thumbnailUrl === newThumbnail);
          if (matchingUpdatedMap) {
            newThumbnail = matchingUpdatedMap.thumbnailUrl;
          } else {
             // Fallback to first map's thumbnail
             newThumbnail = updatedMaps[0]?.thumbnailUrl || newThumbnail;
          }
        }
        
        return {
           ...item,
           thumbnailUrl: newThumbnail,
           tabSnapshot: { ...item.tabSnapshot, maps: updatedMaps }
        };
      }
      return item;
    });

    if (changed) {
      this.persist();
    }
  }

  public getCategories(): string[] {
    return this.categories;
  }

  public addCategory(categoryName: string): void {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    if (!this.categories.includes(trimmed)) {
      this.categories.push(trimmed);
      this.persist();
    }
  }

  /**
   * Helper to compute stats from a workspace tab
   */
  public computeStats(tab: WorkspaceTab): MapVaultStats {
    const primaryBg = (tab.maps || []).find((m) => m.layer === 'background' || m.id === tab.activeMapId) || tab.maps?.[0];
    const props = (tab.maps || []).filter((m) => m.layer !== 'background');

    return {
      propsCount: props.length,
      hasFog: !!(tab.fog && tab.fog.enabled && tab.fog.history && tab.fog.history.length > 0),
      hasEffects: !!(tab.animatedEffects && tab.animatedEffects.length > 0),
      hasDrawings: !!(tab.drawings && tab.drawings.length > 0),
      hasSpells: !!(tab.spellTemplates && tab.spellTemplates.length > 0),
      bgWidth: primaryBg ? Math.round(primaryBg.width) : 1920,
      bgHeight: primaryBg ? Math.round(primaryBg.height) : 1080,
    };
  }

  /**
   * Saves a WorkspaceTab as a reusable MapVaultItem
   */
  public saveTabToVault(
    tab: WorkspaceTab,
    metadata?: {
      name?: string;
      category?: string;
      description?: string;
      thumbnailUrl?: string;
      tags?: string[];
      previewColor?: string;
    }
  ): MapVaultItem {
    const primaryMap = (tab.maps || []).find((m) => m.id === tab.activeMapId) || tab.maps?.[0];
    const name = metadata?.name?.trim() || tab.name || primaryMap?.name || 'Безымянная локация';
    const category = metadata?.category?.trim() || primaryMap?.category || 'Пользовательские';
    const description = metadata?.description?.trim() || tab.notes || 'Сохраненная игровая сцена со всеми объектами и туманом.';
    const thumbnailUrl = metadata?.thumbnailUrl || primaryMap?.thumbnailUrl || primaryMap?.url || '';
    const previewColor = metadata?.previewColor || tab.color || '#f59e0b';
    const tags = metadata?.tags || [category, `${tab.maps?.length || 0} объектов`];

    const stats = this.computeStats(tab);

    const vaultItem: MapVaultItem = {
      id: `vault-map-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      category,
      description,
      thumbnailUrl,
      previewColor,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBuiltInPreset: false,
      tabSnapshot: JSON.parse(JSON.stringify(tab)),
      stats,
    };

    this.items = [vaultItem, ...this.items];
    if (!this.categories.includes(category)) {
      this.categories.push(category);
    }

    this.persist();
    return vaultItem;
  }

  /**
   * Overwrite existing MapVaultItem with updated tab state
   */
  public updateVaultItemFromTab(vaultId: string, currentTab: WorkspaceTab): boolean {
    const idx = this.items.findIndex((i) => i.id === vaultId);
    if (idx === -1) return false;

    const existing = this.items[idx];
    const stats = this.computeStats(currentTab);
    const primaryMap = (currentTab.maps || []).find((m) => m.id === currentTab.activeMapId) || currentTab.maps?.[0];

    this.items[idx] = {
      ...existing,
      updatedAt: Date.now(),
      tabSnapshot: JSON.parse(JSON.stringify(currentTab)),
      thumbnailUrl: primaryMap?.thumbnailUrl || primaryMap?.url || existing.thumbnailUrl,
      stats,
    };

    this.persist();
    return true;
  }

  /**
   * Update metadata of an existing item
   */
  public updateItemMetadata(vaultId: string, updates: Partial<Omit<MapVaultItem, 'id' | 'tabSnapshot'>>): boolean {
    const idx = this.items.findIndex((i) => i.id === vaultId);
    if (idx === -1) return false;

    this.items[idx] = {
      ...this.items[idx],
      ...updates,
      updatedAt: Date.now(),
    };

    this.persist();
    return true;
  }

  /**
   * Delete item from vault
   */
  public deleteItem(vaultId: string): boolean {
    const beforeCount = this.items.length;
    this.items = this.items.filter((i) => i.id !== vaultId);
    if (this.items.length !== beforeCount) {
      this.persist();
      return true;
    }
    return false;
  }

  /**
   * Create a portal MapItem representing this map in the vault, to be placed on a global map.
   */
  public createPortalMapItem(vaultItem: MapVaultItem, spawnPos: { x: number; y: number }): MapItem {
    const primaryBg = (vaultItem.tabSnapshot.maps || []).find((m) => m.layer === 'background' || m.id === vaultItem.tabSnapshot.activeMapId) || vaultItem.tabSnapshot.maps?.[0];
    const portalUrl = vaultItem.thumbnailUrl || primaryBg?.thumbnailUrl || primaryBg?.url || '';

    const width = 240;
    const height = 160;

    return {
      id: `portal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Вход: ${vaultItem.name}`,
      type: 'image',
      url: portalUrl,
      thumbnailUrl: portalUrl,
      width,
      height,
      aspectRatio: width / height,
      position: {
        x: Math.round(spawnPos.x - width / 2),
        y: Math.round(spawnPos.y - height / 2),
      },
      scale: { x: 1, y: 1 },
      rotation: 0,
      zIndex: 25,
      opacity: 1,
      hash: 'portal-' + Math.random().toString(36).substring(2, 8),
      fileSize: 1024,
      format: 'portal',
      category: 'Порталы',
      layer: 'props',
      locked: false,
      isSubmapPortal: true,
      submapVaultId: vaultItem.id,
      targetVaultMapId: vaultItem.id,
      targetVaultMapName: vaultItem.name,
      targetVaultThumbnailUrl: portalUrl,
      portalBadgeText: `Локация: ${vaultItem.category}`,
    };
  }

  /**
   * Export vault item as a downloadable JSON string
   */
  public exportItemToJson(vaultId: string): string | null {
    const item = this.getById(vaultId);
    if (!item) return null;

    const exportData = {
      format: 'aethermap_map_object_v1',
      version: 1,
      exportedAt: Date.now(),
      item,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export all items as a package
   */
  public exportAllPackage(): string {
    const pkg = {
      format: 'aethermap_vault_package_v1',
      version: 1,
      exportedAt: Date.now(),
      vaultItems: this.items,
    };
    return JSON.stringify(pkg, null, 2);
  }

  /**
   * Import vault item from JSON string
   */
  public importFromJson(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);

      // Single map item format
      if (parsed.format === 'aethermap_map_object_v1' && parsed.item) {
        const item: MapVaultItem = parsed.item;
        const newId = `vault-import-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const importedItem: MapVaultItem = {
          ...item,
          id: newId,
          name: `${item.name} (Импорт)`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isBuiltInPreset: false,
        };

        this.items = [importedItem, ...this.items];
        this.persist();
        return { success: true, count: 1 };
      }

      // Package format
      if (parsed.format === 'aethermap_vault_package_v1' && Array.isArray(parsed.vaultItems)) {
        const importedItems: MapVaultItem[] = parsed.vaultItems.map((item: MapVaultItem) => ({
          ...item,
          id: `vault-pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isBuiltInPreset: false,
        }));

        this.items = [...importedItems, ...this.items];
        this.persist();
        return { success: true, count: importedItems.length };
      }

      // Direct WorkspaceTab JSON format
      if (parsed.id && parsed.maps && parsed.camera) {
        const tab = parsed as WorkspaceTab;
        this.saveTabToVault(tab, { name: tab.name });
        return { success: true, count: 1 };
      }

      return { success: false, count: 0, error: 'Неизвестный формат файла карты.' };
    } catch (e: any) {
      return { success: false, count: 0, error: e?.message || 'Ошибка парсинга JSON.' };
    }
  }
}

export const mapVaultService = new MapVaultService();
