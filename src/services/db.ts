import { TabletopSessionState } from '../types';
import { DEFAULT_INITIAL_SESSION } from './defaultSession';

const DB_NAME = 'aethermap_indexed_db';
const DB_VERSION = 1;
const SESSION_STORE = 'sessions';
const MEDIA_STORE = 'media_files';
const CURRENT_SESSION_KEY = 'active_tabletop_session';

let dbPromise: Promise<IDBDatabase | null> | null = null;

async function getDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db && !db.objectStoreNames.contains(SESSION_STORE)) {
            db.createObjectStore(SESSION_STORE);
          }
          if (db && !db.objectStoreNames.contains(MEDIA_STORE)) {
            db.createObjectStore(MEDIA_STORE);
          }
        } catch {
          // Ignore upgrade errors
        }
      };

      request.onsuccess = (event) => {
        try {
          const db = (event.target as IDBOpenDBRequest).result;
          if (db) {
            db.onclose = () => {
              dbPromise = null;
            };
            resolve(db);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      };

      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };

      request.onblocked = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Reads the active session state from IndexedDB.
 * Falls back to default initial session if empty or error.
 */
export async function getIDBSessionState(): Promise<TabletopSessionState> {
  try {
    const db = await getDB();
    if (!db) return DEFAULT_INITIAL_SESSION;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(SESSION_STORE, 'readonly');
        const store = tx.objectStore(SESSION_STORE);
        const req = store.get(CURRENT_SESSION_KEY);

        req.onsuccess = () => {
          const val = req.result as TabletopSessionState | undefined;
          if (val && val.maps && Array.isArray(val.maps)) {
            resolve(val);
          } else {
            resolve(DEFAULT_INITIAL_SESSION);
          }
        };

        req.onerror = () => {
          resolve(DEFAULT_INITIAL_SESSION);
        };
      } catch {
        resolve(DEFAULT_INITIAL_SESSION);
      }
    });
  } catch {
    return DEFAULT_INITIAL_SESSION;
  }
}

/**
 * Saves the session state into IndexedDB.
 */
export async function saveIDBSessionState(session: TabletopSessionState): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(SESSION_STORE, 'readwrite');
        const store = tx.objectStore(SESSION_STORE);
        const req = store.put(session, CURRENT_SESSION_KEY);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Silent fallback
  }
}

/**
 * Save a large media Blob/File to IndexedDB.
 */
export async function saveIDBMediaFile(mapId: string, blob: Blob): Promise<string> {
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(MEDIA_STORE, 'readwrite');
          const store = tx.objectStore(MEDIA_STORE);
          const req = store.put(blob, mapId);

          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    return URL.createObjectURL(blob);
  } catch {
    return URL.createObjectURL(blob);
  }
}

/**
 * Retrieve raw stored media Blob by mapId from IndexedDB.
 */
export async function getIDBBlob(mapId: string): Promise<Blob | null> {
  try {
    const db = await getDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MEDIA_STORE, 'readonly');
        const store = tx.objectStore(MEDIA_STORE);
        const req = store.get(mapId);

        req.onsuccess = () => {
          const blob = req.result as Blob | undefined;
          resolve(blob || null);
        };

        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

/**
 * Retrieve a stored media Blob by mapId and return an object URL.
 */
export async function getIDBMediaUrl(mapId: string): Promise<string | null> {
  try {
    const blob = await getIDBBlob(mapId);
    if (blob) {
      return URL.createObjectURL(blob);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Remove stored media Blob from IndexedDB.
 */
export async function deleteIDBMediaFile(mapId: string): Promise<void> {
  try {
    const db = await getDB();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(MEDIA_STORE, 'readwrite');
        const store = tx.objectStore(MEDIA_STORE);
        const req = store.delete(mapId);

        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  } catch {
    // Ignore error
  }
}
