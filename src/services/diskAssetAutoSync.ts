import { MapItem, AudioPlaylist, SoundEffect } from '../types';
import { audioEngine } from './audioEngine';
import { worldLoreService, DEFAULT_WORLDS } from './worldLoreService';
import {
  scanDiskAssetDirectory,
  loadAssetFolderContent,
  getActiveDirectoryHandle,
  setActiveDirectoryHandle,
} from './unifiedAssetFolderService';
import {
  getStoredDirectoryHandle,
  storeDirectoryHandle,
  clearStoredDirectoryHandle,
  getStoredFolderMetadata,
  storeFolderMetadata,
  clearStoredFolderMetadata,
  PersistedFolderMeta,
} from './idbStorage';

export interface DiskSyncEvent {
  type: 'maps' | 'music' | 'sfx' | 'props' | 'effects' | 'all';
  message: string;
  timestamp: number;
}

export interface DiskSyncState {
  isAutoSyncEnabled: boolean;
  isSyncing: boolean;
  serverConnected: boolean;
  localFolderConnected: boolean;
  folderName: string;
  serverRevision: string;
  lastSyncedAt: number;
  stats: {
    mapsCount: number;
    mapCategoriesCount?: number;
    tracksCount: number;
    propsCount: number;
    sfxCount: number;
    effectsCount: number;
    systemsCount?: number;
    systemFilesCount?: number;
    loreCount?: number;
    worldsCount?: number;
    totalCount?: number;
  };
  recentEvents: DiskSyncEvent[];
}

type SyncListener = (state: DiskSyncState) => void;
type MapsUpdateCallback = (maps: MapItem[], categories: string[]) => void;
type PropsUpdateCallback = (props: any[]) => void;

class DiskAssetAutoSyncService {
  private isAutoSyncEnabled: boolean = false; // Strictly manual sync per user request
  private isSyncing: boolean = false;
  private serverRevision: string = '';
  private lastSyncedAt: number = 0;
  private serverConnected: boolean = false;
  private localFolderConnected: boolean = false;
  private folderName: string = 'Серверная папка assets/';
  private listeners: Set<SyncListener> = new Set();
  private recentEvents: DiskSyncEvent[] = [];

  private mapsUpdateCallback: MapsUpdateCallback | null = null;
  private propsUpdateCallback: PropsUpdateCallback | null = null;

  private stats: DiskSyncState['stats'] = {
    mapsCount: 0,
    mapCategoriesCount: 0,
    tracksCount: 0,
    propsCount: 0,
    sfxCount: 0,
    effectsCount: 0,
    systemsCount: 0,
    systemFilesCount: 0,
  };

  constructor() {
    this.restoreFolderBinding();
  }

  public registerCallbacks(mapsCb: MapsUpdateCallback, propsCb?: PropsUpdateCallback): void {
    this.mapsUpdateCallback = mapsCb;
    if (propsCb) this.propsUpdateCallback = propsCb;
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const state = this.getState();
    this.listeners.forEach((l) => l(state));
  }

  public getState(): DiskSyncState {
    return {
      isAutoSyncEnabled: this.isAutoSyncEnabled,
      isSyncing: this.isSyncing,
      serverConnected: this.serverConnected,
      localFolderConnected: this.localFolderConnected,
      folderName: this.folderName,
      serverRevision: this.serverRevision,
      lastSyncedAt: this.lastSyncedAt,
      stats: { ...this.stats },
      recentEvents: [...this.recentEvents],
    };
  }

  private addEvent(type: DiskSyncEvent['type'], message: string): void {
    const ev: DiskSyncEvent = { type, message, timestamp: Date.now() };
    this.recentEvents = [ev, ...this.recentEvents.slice(0, 19)];
  }

  /**
   * Restore stored directory handle and metadata across app reloads
   * WITHOUT triggering unwanted automatic polling loops
   */
  private async restoreFolderBinding(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // 1. Immediately restore metadata (synchronous fallback + async IDB)
      const meta = await getStoredFolderMetadata('aethermap_asset_folder_meta');
      if (meta && meta.connected) {
        this.localFolderConnected = true;
        this.folderName = meta.folderName || 'Рабочая папка';
        this.lastSyncedAt = meta.lastSyncedAt || Date.now();
        if (meta.stats) {
          this.stats = {
            mapsCount: meta.stats.mapsCount || 0,
            mapCategoriesCount: meta.stats.mapCategoriesCount || 0,
            tracksCount: meta.stats.tracksCount || 0,
            propsCount: meta.stats.propsCount || 0,
            sfxCount: meta.stats.sfxCount || 0,
            effectsCount: meta.stats.effectsCount || 0,
            systemsCount: meta.stats.systemsCount || 0,
            systemFilesCount: meta.stats.systemFilesCount || 0,
          };
        }
        this.notify();
      }

      // 2. Restore FileSystemDirectoryHandle from IDB
      const storedHandle = await getStoredDirectoryHandle('aethermap_asset_folder');
      if (storedHandle) {
        setActiveDirectoryHandle(storedHandle);
        this.localFolderConnected = true;
        this.folderName = storedHandle.name;
        this.notify();
      }
    } catch (e) {
      console.warn('Could not restore directory handle from IDB:', e);
    }
  }

  /**
   * User-triggered manual re-sync button handler
   */
  public async manualSync(): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) {
      return { success: false, message: 'Синхронизация уже выполняется...' };
    }

    this.isSyncing = true;
    this.notify();

    try {
      let handle = getActiveDirectoryHandle();

      // If handle not loaded into memory yet, try restoring from IDB
      if (!handle) {
        try {
          handle = await getStoredDirectoryHandle('aethermap_asset_folder');
          if (handle) {
            setActiveDirectoryHandle(handle);
            this.localFolderConnected = true;
            this.folderName = handle.name;
          }
        } catch (e) {}
      }

      // If handle exists, check or request read permissions (since this is inside a user click!)
      if (handle) {
        try {
          let perm = 'prompt';
          if (typeof handle.queryPermission === 'function') {
            perm = await handle.queryPermission({ mode: 'read' });
          }
          if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
            perm = await handle.requestPermission({ mode: 'read' });
          }

          if (perm === 'granted') {
            await this.syncLocalHandleAssets(handle);
          } else {
            console.warn('Permission not granted for directory handle:', perm);
          }
        } catch (permErr) {
          console.warn('Permission query/request error:', permErr);
          // Still try scanning if supported
          await this.syncLocalHandleAssets(handle);
        }
      }

      // Also check server assets if backend is active
      await this.syncServerAssets();

      // Enrich stats with lore, worlds, systems and total counts
      await this.enrichStats();

      this.lastSyncedAt = Date.now();

      // Persist the updated metadata
      const meta: PersistedFolderMeta = {
        connected: this.localFolderConnected,
        folderName: this.folderName,
        lastSyncedAt: this.lastSyncedAt,
        stats: { ...this.stats },
      };
      await storeFolderMetadata('aethermap_asset_folder_meta', meta);

      const summary = `Синхронизация завершена: ${this.stats.mapsCount} карт, ${this.stats.tracksCount} треков, ${this.stats.propsCount} пропсов, ${this.stats.sfxCount} SFX`;
      this.addEvent('all', summary);
      this.notify();

      return { success: true, message: summary };
    } catch (err: any) {
      const errMsg = `Ошибка синхронизации: ${err?.message || err}`;
      this.addEvent('all', errMsg);
      return { success: false, message: errMsg };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  /**
   * Enrich stats with lore, worlds, systems and total counts
   */
  private async enrichStats(): Promise<void> {
    try {
      const loreItems = await worldLoreService.getAllLoreItems();
      const loreCount = loreItems.length;
      const worldsCount = DEFAULT_WORLDS.length;
      const systemsCount = this.stats.systemsCount || 5;
      const systemFiles = this.stats.systemFilesCount || 0;

      const totalCount =
        (this.stats.mapsCount || 0) +
        (this.stats.propsCount || 0) +
        (this.stats.tracksCount || 0) +
        (this.stats.sfxCount || 0) +
        systemFiles +
        loreCount +
        worldsCount;

      this.stats = {
        ...this.stats,
        systemsCount,
        loreCount,
        worldsCount,
        totalCount,
      };
    } catch (e) {
      console.warn('Enrich stats error:', e);
    }
  }

  /**
   * Alias for backward compatibility
   */
  public async triggerSync(): Promise<void> {
    await this.manualSync();
  }

  /**
   * Disconnect local folder binding and clear IDB storage
   */
  public async disconnectFolder(): Promise<void> {
    setActiveDirectoryHandle(null);
    this.localFolderConnected = false;
    this.folderName = 'Серверная папка assets/';
    await clearStoredDirectoryHandle('aethermap_asset_folder');
    await clearStoredFolderMetadata('aethermap_asset_folder_meta');
    this.addEvent('all', 'Папка ассетов отвязана');
    this.notify();
  }

  /**
   * Syncs data directly with backend server's `assets/` directory
   */
  private async syncServerAssets(): Promise<void> {
    try {
      const statusRes = await fetch('/api/assets/status');
      if (!statusRes.ok) {
        this.serverConnected = false;
        return;
      }

      const contentType = statusRes.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        this.serverConnected = false;
        return;
      }

      let statusData: any;
      try {
        statusData = await statusRes.json();
      } catch {
        this.serverConnected = false;
        return;
      }

      this.serverConnected = true;

      // If revision hasn't changed, nothing new to fetch
      if (statusData && statusData.revision && statusData.revision === this.serverRevision) {
        return;
      }

      // Fetch full scan payload
      const scanRes = await fetch('/api/assets/scan');
      if (!scanRes.ok) return;

      const scanContentType = scanRes.headers.get('content-type') || '';
      if (!scanContentType.toLowerCase().includes('application/json')) return;

      let scanData: any;
      try {
        scanData = await scanRes.json();
      } catch {
        return;
      }

      if (!scanData) return;

      this.serverRevision = scanData.revision || '';
      
      // Update stats only if local handle didn't already supply larger counts
      if (!this.localFolderConnected || this.stats.mapsCount === 0) {
        this.stats = {
          mapsCount: scanData.stats?.mapsCount || scanData.maps?.length || 0,
          mapCategoriesCount: scanData.mapCategories?.length || 0,
          tracksCount: scanData.stats?.tracksCount || 0,
          propsCount: scanData.stats?.propsCount || scanData.props?.length || 0,
          sfxCount: scanData.stats?.sfxCount || scanData.sfx?.length || 0,
          effectsCount: scanData.stats?.effectsCount || scanData.effects?.length || 0,
          systemsCount: scanData.stats?.systemsCount || 0,
          systemFilesCount: scanData.stats?.systemFilesCount || 0,
        };
      }

      let hasNewContent = false;

      // 1. Update Playlists in Audio Engine
      if (scanData.playlists && scanData.playlists.length > 0) {
        const transformedPlaylists = scanData.playlists.map((pl: any) => ({
          playlistName: pl.name,
          category: pl.category,
          tracks: pl.tracks.map((t: any) => ({
            title: t.title,
            url: t.url,
          })),
        }));
        audioEngine.loadDiscoveredPlaylists(transformedPlaylists);
        hasNewContent = true;
      }

      // 2. Update SFX in Audio Engine
      if (scanData.sfx && scanData.sfx.length > 0) {
        audioEngine.loadDiscoveredSFX(
          scanData.sfx.map((s: any) => ({
            name: s.name,
            bank: s.bank,
            url: s.url,
            icon: s.icon,
          }))
        );
        hasNewContent = true;
      }

      // 3. Update Maps in Workspace State
      if (scanData.maps && scanData.maps.length > 0 && this.mapsUpdateCallback) {
        const mappedItems: MapItem[] = scanData.maps.map((m: any) => ({
          id: m.id,
          name: m.name,
          type: m.type,
          url: m.url,
          thumbnailUrl: m.thumbnailUrl,
          category: m.category,
          layer: m.layer || 'background',
          format: m.format,
          fileSize: m.fileSize,
          width: m.width || 1920,
          height: m.height || 1080,
          aspectRatio: m.aspectRatio || 1.77,
          position: { x: 0, y: 0 },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: 0,
          opacity: 1,
          hash: m.id,
          tags: m.tags,
        }));

        this.mapsUpdateCallback(mappedItems, scanData.mapCategories || []);
        hasNewContent = true;
      }

      // 4. Update Props in Workspace
      if (scanData.props && scanData.props.length > 0 && this.propsUpdateCallback) {
        this.propsUpdateCallback(scanData.props);
      }

      if (hasNewContent) {
        this.addEvent('all', `Обновлено с сервера: ${this.stats.mapsCount} карт, ${this.stats.tracksCount} треков`);
      }
    } catch (e) {
      console.warn('Server asset sync fetch error:', e);
      this.serverConnected = false;
    }
  }

  /**
   * Syncs data directly with user's local disk folder via FileSystemDirectoryHandle
   */
  private async syncLocalHandleAssets(handle: any): Promise<void> {
    try {
      const stats = await scanDiskAssetDirectory(handle, false);
      const content = await loadAssetFolderContent(handle);

      this.localFolderConnected = true;
      this.folderName = handle.name;
      this.stats = {
        mapsCount: content.maps.length,
        mapCategoriesCount: content.categories.length,
        tracksCount: stats.tracksCount,
        propsCount: stats.propsCount,
        sfxCount: stats.sfxCount,
        effectsCount: (stats as any).effectsCount || 0,
      };

      if (content.playlists.length > 0) {
        audioEngine.loadDiscoveredPlaylists(content.playlists);
      }
      if (content.sfx.length > 0) {
        audioEngine.loadDiscoveredSFX(content.sfx);
      }
      if (content.maps.length > 0 && this.mapsUpdateCallback) {
        this.mapsUpdateCallback(content.maps, content.categories);
      }
    } catch (e) {
      console.warn('Local handle sync error:', e);
    }
  }

  /**
   * Sets new local folder handle and persists to IDB
   */
  public async setConnectedDirectoryHandle(handle: any): Promise<void> {
    setActiveDirectoryHandle(handle);
    this.localFolderConnected = !!handle;
    this.folderName = handle?.name || 'Серверная папка assets/';

    if (handle) {
      await storeDirectoryHandle('aethermap_asset_folder', handle);
      const meta: PersistedFolderMeta = {
        connected: true,
        folderName: handle.name,
        lastSyncedAt: Date.now(),
        stats: { ...this.stats },
      };
      await storeFolderMetadata('aethermap_asset_folder_meta', meta);
    }

    await this.manualSync();
  }

  public setAutoSyncEnabled(enabled: boolean): void {
    this.isAutoSyncEnabled = enabled;
    this.notify();
  }
}

export const diskAssetAutoSync = new DiskAssetAutoSyncService();

