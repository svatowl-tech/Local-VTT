// IndexedDB helper for persisting FileSystemDirectoryHandle and disk folder preferences

const DB_NAME = 'AetherMapDiskAssetsDB';
const DB_VERSION = 2;
const STORE_NAME = 'handles';
const META_STORE = 'metadata';

const LOCAL_STORAGE_META_KEY = 'aethermap_asset_folder_meta_v2';

export interface PersistedFolderMeta {
  connected: boolean;
  folderName: string;
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
  };
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeDirectoryHandle(key: string, handle: any): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to store directory handle in IDB:', e);
  }
}

export async function getStoredDirectoryHandle(key: string): Promise<any | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to get stored directory handle from IDB:', e);
    return null;
  }
}

export async function clearStoredDirectoryHandle(key: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to clear stored handle:', e);
  }
}

export async function storeFolderMetadata(key: string, meta: PersistedFolderMeta): Promise<void> {
  try {
    // Dual storage: LocalStorage + IDB for instant synchronously available UI data on load
    try {
      localStorage.setItem(LOCAL_STORAGE_META_KEY, JSON.stringify(meta));
    } catch {}

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.put(meta, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to store folder metadata in IDB:', e);
  }
}

export async function getStoredFolderMetadata(key: string): Promise<PersistedFolderMeta | null> {
  // Try localStorage first for instant synchronous data
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_META_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to get stored folder metadata from IDB:', e);
    return null;
  }
}

export async function clearStoredFolderMetadata(key: string): Promise<void> {
  try {
    localStorage.removeItem(LOCAL_STORAGE_META_KEY);
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to clear stored metadata:', e);
  }
}

