import { getIDBMediaUrl } from './db';
import { mapLibraryCatalog } from './mapLibraryCatalog';
import { resolveApiUrl } from '../utils/apiUrlHelper';

// In-memory cache for resolved Blob object URLs to avoid continuous IDB reads and memory leaks
const urlCache = new Map<string, string>();
const pendingPromises = new Map<string, Promise<string | null>>();

/**
 * Gets or loads a cached object URL for a given map item.
 * Automatically resolves `idb://`, `blob:`, FileSystem handles, and custom uploaded maps across all windows.
 */
export async function getCachedMediaUrl(mapId: string, rawUrl: string): Promise<string> {
  if (!rawUrl) {
    return resolveApiUrl(`/api/media/${mapId}`);
  }

  // If raw URL is a direct web/HTTP or data URL, return immediately
  if (
    rawUrl.startsWith('data:') ||
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://')
  ) {
    return rawUrl;
  }

  const cleanKey = rawUrl.startsWith('idb://') ? rawUrl.replace('idb://', '') : mapId;

  // Check in-memory cache for current window
  if (urlCache.has(cleanKey)) {
    return urlCache.get(cleanKey)!;
  }
  if (urlCache.has(mapId)) {
    return urlCache.get(mapId)!;
  }

  // If rawUrl is already a blob: URL and it's present, return it and cache
  if (rawUrl.startsWith('blob:')) {
    urlCache.set(cleanKey, rawUrl);
    urlCache.set(mapId, rawUrl);
    return rawUrl;
  }

  // Deduplicate concurrent requests for the same media
  if (pendingPromises.has(cleanKey)) {
    const res = await pendingPromises.get(cleanKey)!;
    return res || rawUrl || resolveApiUrl(`/api/media/${cleanKey}`);
  }

  const fetchPromise = (async (): Promise<string> => {
    try {
      // Priority 1: Check local IndexedDB storage in this window's origin
      const blobUrl = await getIDBMediaUrl(cleanKey);
      if (blobUrl) {
        urlCache.set(cleanKey, blobUrl);
        urlCache.set(mapId, blobUrl);
        return blobUrl;
      }

      // Also try mapId directly
      if (mapId && mapId !== cleanKey) {
        const fallbackBlob = await getIDBMediaUrl(mapId);
        if (fallbackBlob) {
          urlCache.set(cleanKey, fallbackBlob);
          urlCache.set(mapId, fallbackBlob);
          return fallbackBlob;
        }
      }
    } catch (err) {
      console.warn('Failed to retrieve media from IDB cache for key:', cleanKey, err);
    }

    // Priority 2: Check if mapLibraryCatalog has an active FileSystem handle
    try {
      const file = await mapLibraryCatalog.getFileForMap({ id: mapId } as any);
      if (file) {
        const newBlobUrl = URL.createObjectURL(file);
        urlCache.set(cleanKey, newBlobUrl);
        urlCache.set(mapId, newBlobUrl);
        return newBlobUrl;
      }
    } catch {
      // ignore
    }

    // Priority 3: Fallback to backend media stream endpoint if running
    const backendMediaUrl = resolveApiUrl(`/api/media/${cleanKey}`);
    try {
      const checkRes = await fetch(backendMediaUrl, { method: 'HEAD' });
      if (checkRes.ok && checkRes.headers.get('content-type')?.includes('image') || checkRes.headers.get('content-type')?.includes('video')) {
        urlCache.set(cleanKey, backendMediaUrl);
        return backendMediaUrl;
      }
    } catch {
      // ignore
    }

    // Priority 4: Return rawUrl if non-empty
    if (rawUrl && !rawUrl.startsWith('idb://')) {
      return rawUrl;
    }

    return resolveApiUrl(`/api/media/${cleanKey}`);
  })();

  pendingPromises.set(cleanKey, fetchPromise);

  try {
    const result = await fetchPromise;
    return result;
  } finally {
    pendingPromises.delete(cleanKey);
  }
}

/**
 * Register a newly created object URL in cache
 */
export function registerCachedMediaUrl(key: string, url: string): void {
  urlCache.set(key, url);
}

/**
 * Clear cached URL and revoke object URL to free memory
 */
export function revokeCachedMediaUrl(key: string): void {
  const url = urlCache.get(key);
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }
  urlCache.delete(key);
}
