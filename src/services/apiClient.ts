import {
  TabletopSessionState,
  RustArchitectureResponse,
  MapItem,
  FogPoint,
  GridSettings,
  DrawingStroke,
  SpellTemplate,
  AnimatedEffect,
  LaserPointer,
  LayerStackConfig,
} from '../types';
import {
  getLocalSessionState,
  saveLocalSessionState,
  getSyncMemorySession,
} from './defaultSession';
import { saveIDBMediaFile, deleteIDBMediaFile } from './db';
import { generateImageThumbnail, generateVideoThumbnail } from './thumbnailGenerator';
import { mapLibraryCatalog } from './mapLibraryCatalog';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function safeParseJson<T = any>(res: Response): Promise<T | null> {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return null;
  }
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchSessionState(): Promise<TabletopSessionState> {
  try {
    const res = await fetchWithTimeout('/api/session');
    const data = await safeParseJson<TabletopSessionState>(res);
    if (data) {
      await saveLocalSessionState(data);
      return data;
    }
  } catch (err) {
    // Desktop static / offline IndexedDB fallback
  }
  return await getLocalSessionState();
}

export async function updateSessionState(
  partial: Partial<TabletopSessionState>
): Promise<TabletopSessionState> {
  const current = await getLocalSessionState();
  const updated = { ...current, ...partial, updatedAt: Date.now() };
  await saveLocalSessionState(updated);

  try {
    const res = await fetchWithTimeout('/api/session/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    const data = await safeParseJson<{ session: TabletopSessionState }>(res);
    if (data && data.session) {
      return data.session;
    }
  } catch (err) {
    // Offline / desktop static
  }

  return updated;
}

export async function setCameraAspectRatio(aspectRatio: number): Promise<{ camera: any }> {
  const session = await getLocalSessionState();
  const newCamera = { ...session.camera, aspectRatio };
  await saveLocalSessionState({ ...session, camera: newCamera, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/camera/aspect-ratio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aspectRatio }),
    });
    const data = await safeParseJson<{ camera: any }>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return { camera: newCamera };
}

export async function addFogBrushPoint(
  point: FogPoint
): Promise<{ success: boolean; fog: any }> {
  const session = await getLocalSessionState();
  const updatedHistory = [...session.fog.history, point];
  const updatedFog = { ...session.fog, history: updatedHistory };
  await saveLocalSessionState({ ...session, fog: updatedFog, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/fog/brush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ point }),
    });
    const data = await safeParseJson<{ success: boolean; fog: any }>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return { success: true, fog: updatedFog };
}

export async function resetFog(
  fillWithFog: boolean = true,
  opacity?: number
): Promise<{ success: boolean; fog: any }> {
  const session = await getLocalSessionState();
  const updatedFog = {
    ...session.fog,
    enabled: fillWithFog,
    history: [],
    opacity: opacity !== undefined ? opacity : session.fog.opacity,
  };
  await saveLocalSessionState({ ...session, fog: updatedFog, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/fog/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fillWithFog, opacity }),
    });
    const data = await safeParseJson<{ success: boolean; fog: any }>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return { success: true, fog: updatedFog };
}

export async function updateGridSettings(
  grid: Partial<GridSettings>
): Promise<{ success: boolean; grid: GridSettings }> {
  const session = await getLocalSessionState();
  const updatedGrid = { ...session.grid, ...grid };
  await saveLocalSessionState({ ...session, grid: updatedGrid, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/grid/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(grid),
    });
    const data = await safeParseJson<{ success: boolean; grid: GridSettings }>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return { success: true, grid: updatedGrid };
}

export async function uploadCustomMap(file: File, category?: string): Promise<MapItem> {
  const mapId = `custom-map-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(file.name);

  // 1. Generate thumbnail and detect exact dimensions on client
  let mediaMeta = {
    width: isVideo ? 1920 : 1600,
    height: isVideo ? 1080 : 1200,
    aspectRatio: isVideo ? 16 / 9 : 1.33,
    thumbnailUrl: '',
  };

  try {
    if (isVideo) {
      mediaMeta = await generateVideoThumbnail(file);
    } else {
      mediaMeta = await generateImageThumbnail(file);
    }
  } catch (e) {
    console.warn('Could not generate client thumbnail:', e);
  }

  // 2. Always persist raw blob into local IndexedDB
  const mediaBlobUrl = await saveIDBMediaFile(mapId, file);

  let fileHash = `${file.size}-${file.name}`;
  try {
    // @ts-ignore
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const { invoke } = await import('@tauri-apps/api/core');
      fileHash = await invoke<string>('hash_file_data', { name: file.name, size: file.size });
    }
  } catch (err) {
    // fallback
  }

  let serverDataUrl = '';
  try {
    const formData = new FormData();
    formData.append('mapFile', file);

    const res = await fetchWithTimeout('/api/map/parse', {
      method: 'POST',
      body: formData,
    }, 5000);

    const data = await safeParseJson<{ parsedMedia: any }>(res);
    if (data && data.parsedMedia) {
      serverDataUrl = data.parsedMedia.dataUrl || '';
      if (data.parsedMedia.hash) fileHash = data.parsedMedia.hash;
    }
  } catch (err) {
    // Backend offline / desktop mode -> handled gracefully
  }

  const effectiveUrl = serverDataUrl || mediaBlobUrl || `idb://${mapId}`;
  const effectiveThumbnail = mediaMeta.thumbnailUrl || effectiveUrl;

  const mapItem: MapItem = {
    id: mapId,
    name: file.name.replace(/\.[^/.]+$/, ''),
    type: isVideo ? 'video' : 'image',
    url: effectiveUrl,
    thumbnailUrl: effectiveThumbnail,
    width: mediaMeta.width || (isVideo ? 1920 : 1600),
    height: mediaMeta.height || (isVideo ? 1080 : 1200),
    aspectRatio: mediaMeta.aspectRatio || (isVideo ? 16 / 9 : 1.33),
    position: { x: 0, y: 0 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    zIndex: Date.now() % 1000000,
    opacity: 1,
    hash: fileHash,
    fileSize: file.size,
    format: file.name.split('.').pop()?.toUpperCase() || (isVideo ? 'MP4' : 'PNG'),
    gridSize: 50,
    category: category || 'Без категории',
  };

  // Register in library catalog so it immediately appears in all categories/modals
  mapLibraryCatalog.mergeLibraryMaps([mapItem], category ? [category] : undefined);

  // Add to active workspace canvas
  await addMapToWorkspace(mapItem);
  return mapItem;
}

export async function addMapToWorkspace(mapItem: MapItem): Promise<void> {
  const session = await getLocalSessionState();
  const exists = session.maps.some((m) => m.id === mapItem.id);
  const updatedMaps = exists
    ? session.maps.map((m) => (m.id === mapItem.id ? mapItem : m))
    : [...session.maps, mapItem];

  await saveLocalSessionState({
    ...session,
    maps: updatedMaps,
    activeMapId: mapItem.id,
    updatedAt: Date.now(),
  });

  try {
    await fetchWithTimeout('/api/map/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapItem),
    });
  } catch (err) {
    // Fallback
  }
}

export async function removeMapFromWorkspace(mapId: string): Promise<void> {
  const session = await getLocalSessionState();
  const updatedMaps = session.maps.filter((m) => m.id !== mapId);
  const newActiveId = session.activeMapId === mapId ? (updatedMaps[0]?.id || null) : session.activeMapId;

  await deleteIDBMediaFile(mapId);

  await saveLocalSessionState({
    ...session,
    maps: updatedMaps,
    activeMapId: newActiveId,
    updatedAt: Date.now(),
  });

  try {
    await fetchWithTimeout('/api/map/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapId }),
    });
  } catch (err) {
    // Fallback
  }
}

export async function fetchRustArchitecture(): Promise<RustArchitectureResponse> {
  try {
    const res = await fetchWithTimeout('/api/rust/architecture');
    const data = await safeParseJson<RustArchitectureResponse>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return {
    success: true,
    files: [
      {
        filename: 'main.rs',
        path: 'src-tauri/src/main.rs',
        language: 'rust',
        content: `#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]\n\nfn main() {\n  tauri::Builder::default()\n    .plugin(tauri_plugin_shell::init())\n    .run(tauri::generate_context!())\n    .expect("error while running tauri application");\n}`,
        description: 'Tauri Rust main entry point',
      },
    ],
    instructions: {
      macOS: '1. Install Rust\n2. Run `npm run tauri dev` or `npm run tauri build`',
      windows: '1. Install Rust & Visual Studio C++ Build Tools\n2. Run `npm run tauri build`',
    },
  };
}

export async function addDrawingStrokeSync(stroke: DrawingStroke): Promise<DrawingStroke[]> {
  const session = await getLocalSessionState();
  const updatedDrawings = [...(session.drawings || []), stroke];
  await saveLocalSessionState({ ...session, drawings: updatedDrawings, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/drawings/stroke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stroke),
    });
    const data = await safeParseJson<{ success: boolean; drawings: DrawingStroke[] }>(res);
    if (data?.drawings) return data.drawings;
  } catch (err) {
    // Fallback
  }
  return updatedDrawings;
}

export async function clearDrawingsSync(): Promise<void> {
  const session = await getLocalSessionState();
  await saveLocalSessionState({ ...session, drawings: [], updatedAt: Date.now() });

  try {
    await fetchWithTimeout('/api/drawings/clear', { method: 'POST' });
  } catch (err) {
    // Fallback
  }
}

export async function addSpellTemplateSync(template: SpellTemplate): Promise<SpellTemplate[]> {
  const session = await getLocalSessionState();
  const updatedTemplates = [...(session.spellTemplates || []), template];
  await saveLocalSessionState({ ...session, spellTemplates: updatedTemplates, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/spells/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template),
    });
    const data = await safeParseJson<{ success: boolean; spellTemplates: SpellTemplate[] }>(res);
    if (data?.spellTemplates) return data.spellTemplates;
  } catch (err) {
    // Fallback
  }
  return updatedTemplates;
}

export async function updateSpellTemplateSync(
  id: string,
  partial: Partial<SpellTemplate>
): Promise<SpellTemplate[]> {
  const session = await getLocalSessionState();
  const updatedTemplates = (session.spellTemplates || []).map((t) =>
    t.id === id ? { ...t, ...partial } : t
  );
  await saveLocalSessionState({ ...session, spellTemplates: updatedTemplates, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/spells/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...partial }),
    });
    const data = await safeParseJson<{ success: boolean; spellTemplates: SpellTemplate[] }>(res);
    if (data?.spellTemplates) return data.spellTemplates;
  } catch (err) {
    // Fallback
  }
  return updatedTemplates;
}

export async function removeSpellTemplateSync(id: string): Promise<SpellTemplate[]> {
  const session = await getLocalSessionState();
  const updatedTemplates = (session.spellTemplates || []).filter((t) => t.id !== id);
  await saveLocalSessionState({ ...session, spellTemplates: updatedTemplates, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/spells/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await safeParseJson<{ success: boolean; spellTemplates: SpellTemplate[] }>(res);
    if (data?.spellTemplates) return data.spellTemplates;
  } catch (err) {
    // Fallback
  }
  return updatedTemplates;
}

export async function addAnimatedEffectSync(effect: AnimatedEffect): Promise<AnimatedEffect[]> {
  const session = await getLocalSessionState();
  const updatedEffects = [...(session.animatedEffects || []), effect];
  await saveLocalSessionState({ ...session, animatedEffects: updatedEffects, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/effects/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(effect),
    });
    const data = await safeParseJson<{ success: boolean; animatedEffects: AnimatedEffect[] }>(res);
    if (data?.animatedEffects) return data.animatedEffects;
  } catch (err) {
    // Fallback
  }
  return updatedEffects;
}

export async function removeAnimatedEffectSync(id: string): Promise<AnimatedEffect[]> {
  const session = await getLocalSessionState();
  const updatedEffects = (session.animatedEffects || []).filter((e) => e.id !== id);
  await saveLocalSessionState({ ...session, animatedEffects: updatedEffects, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/effects/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await safeParseJson<{ success: boolean; animatedEffects: AnimatedEffect[] }>(res);
    if (data?.animatedEffects) return data.animatedEffects;
  } catch (err) {
    // Fallback
  }
  return updatedEffects;
}

export async function syncLaserPointer(laser: LaserPointer | null): Promise<void> {
  const session = await getLocalSessionState();
  await saveLocalSessionState({ ...session, laserPointer: laser, updatedAt: Date.now() });

  try {
    await fetchWithTimeout('/api/laser/point', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ laser }),
    });
  } catch (err) {
    // Fallback
  }
}

export async function updatePlayerBlackout(
  blackoutPartial: Partial<TabletopSessionState['playerBlackout']>
): Promise<{ success: boolean; playerBlackout: any }> {
  const session = await getLocalSessionState();
  const current = session.playerBlackout || {
    enabled: false,
    title: 'Мастер подготавливает карту...',
    subtitle: 'Пожалуйста, подождите. Идет расстановка поля битвы и декораций',
    preset: 'prep',
  };
  const updatedBlackout = { ...current, ...blackoutPartial };
  await saveLocalSessionState({ ...session, playerBlackout: updatedBlackout, updatedAt: Date.now() });

  try {
    const res = await fetchWithTimeout('/api/blackout/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blackoutPartial),
    });
    const data = await safeParseJson<{ success: boolean; playerBlackout: any }>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return { success: true, playerBlackout: updatedBlackout };
}

export async function fetchInitiativeState(): Promise<any | null> {
  try {
    const res = await fetchWithTimeout('/api/initiative/state');
    const data = await safeParseJson<any>(res);
    if (data && data.encounter) {
      return data;
    }
  } catch (err) {
    // Offline / fallback
  }
  return null;
}

export async function updateInitiativeStateServer(payload: any): Promise<void> {
  try {
    await fetchWithTimeout('/api/initiative/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Fallback
  }
}

export async function updateLayersConfig(layersConfig: Partial<LayerStackConfig>): Promise<{ success: boolean; layersConfig: LayerStackConfig }> {
  const session = await getLocalSessionState();
  const currentLayers = session.layersConfig?.layers || [];
  const updatedLayers = layersConfig.layers || currentLayers;
  const newLayersConfig: LayerStackConfig = { layers: updatedLayers };

  await saveLocalSessionState({
    ...session,
    layersConfig: newLayersConfig,
    updatedAt: Date.now(),
  });

  try {
    const res = await fetchWithTimeout('/api/layers/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layersConfig),
    });
    const data = await safeParseJson<{ success: boolean; layersConfig: LayerStackConfig }>(res);
    if (data) return data;
  } catch (err) {
    // Fallback
  }

  return { success: true, layersConfig: newLayersConfig };
}
