import { writeDataToContentFolder } from './universalSyncManager';
import { TabletopSessionState, MapItem, LayerStackConfig } from '../types';
import { getIDBSessionState, saveIDBSessionState } from './db';
import { mapLibraryCatalog } from './mapLibraryCatalog';
import { ensureTabsIntegrity, DEFAULT_PLAYER_TRANSITION } from './tabStateManager';

export const DEFAULT_MAP_LIBRARY: MapItem[] = [];
export const DEFAULT_MAP_CATEGORIES: string[] = ['Подземелья', 'Города', 'Природа', 'Боссы', 'Здания', 'Общее'];

export const DEFAULT_LAYERS_CONFIG: LayerStackConfig = {
  layers: [
    { id: 'maps', name: 'Карты местности (Фон)', visible: true, locked: false, opacity: 1, order: 10, description: 'Базовые карты и фоновые локации' },
    { id: 'props', name: 'Объекты и токены', visible: true, locked: false, opacity: 1, order: 20, description: 'Декорации, сундуки, мебель, токены' },
    { id: 'grid', name: 'Сетка поля боя', visible: true, locked: false, opacity: 1, order: 30, description: 'Квадратная или гексагональная разметка' },
    { id: 'drawings', name: 'Рисунки и пометки', visible: true, locked: false, opacity: 1, order: 40, description: 'Карандаш, маркеры и рукописные стрелки' },
    { id: 'effects', name: 'Анимированные эффекты', visible: true, locked: false, opacity: 1, order: 50, description: 'Живое пламя, водная гладь, порталы' },
    { id: 'spells', name: 'Шаблоны зон и эффектов (AoE)', visible: true, locked: false, opacity: 1, order: 60, description: 'Радиусы, конусы, линии, секторы и области поражения' },
    { id: 'overhead', name: 'Крыши и навесы (Overhead)', visible: true, locked: false, opacity: 1, order: 70, description: 'Объекты над персонажами под туманом' },
    { id: 'fog', name: 'Туман войны (Fog of War)', visible: true, locked: false, opacity: 1, order: 80, description: 'Динамический туман и зона видимости' },
    { id: 'laser', name: 'Лазерная указка и пинги', visible: true, locked: false, opacity: 1, order: 90, description: 'Целеуказания и сигналы внимания' },
    { id: 'camera', name: 'Рамка камеры игроков', visible: true, locked: false, opacity: 1, order: 100, description: 'Область трансляции на экран игроков' },
  ],
};

export const DEFAULT_INITIAL_SESSION: TabletopSessionState = {
  sessionId: 'session-default-master',
  sessionToken: 'aethermap-token-master-v1',
  updatedAt: Date.now(),
  maps: [],
  mapCategories: DEFAULT_MAP_CATEGORIES,
  activeMapId: null,
  layersConfig: DEFAULT_LAYERS_CONFIG,
  tabs: [],
  activeTabId: 'tab-default-1',
  playerTransition: DEFAULT_PLAYER_TRANSITION,
  camera: {
    x: -480,
    y: -270,
    width: 960,
    height: 540,
    rotation: 0,
    aspectRatio: 16 / 9,
    locked: false,
    zoom: 1,
  },
  fog: {
    enabled: false,
    opacity: 0.95,
    style: 'white-mist',
    density: 1,
    animated: true,
    history: [],
  },
  playerBlackout: {
    enabled: false,
    title: 'Мастер подготавливает карту...',
    subtitle: 'Пожалуйста, подождите. Идет расстановка поля битвы и декораций',
    preset: 'prep',
  },
  grid: {
    enabled: true,
    type: 'square',
    size: 50,
    color: '#ffffff',
    opacity: 0.25,
    offsetX: 0,
    offsetY: 0,
  },
  drawings: [],
  spellTemplates: [],
  animatedEffects: [],
  laserPointer: null,
  playbackState: {
    isPlaying: true,
    currentTime: 0,
    speed: 1,
  },
};

let inMemorySessionCache: TabletopSessionState = ensureTabsIntegrity(DEFAULT_INITIAL_SESSION);

export async function getLocalSessionState(): Promise<TabletopSessionState> {
  const state = await getIDBSessionState();

  // Filter out any pre-installed maps
  const allStoredMaps = (state.maps || []).filter(
    (m) => m && m.id && !m.id.startsWith('preset-')
  );

  // If there are many maps stored in the active session (e.g. from mass folder import),
  // migrate them to the Map Library Catalog to keep the canvas lightweight and prevent freezing.
  if (allStoredMaps.length > 20) {
    mapLibraryCatalog.mergeLibraryMaps(allStoredMaps, state.mapCategories);
  }

  // Active scene on canvas should only contain the active background map + placed props/overhead tokens (max 20 items)
  let activeSceneMaps: MapItem[] = allStoredMaps;
  if (allStoredMaps.length > 20) {
    const activeMap = allStoredMaps.find((m) => m.id === state.activeMapId) || allStoredMaps[0];
    const propsAndTokens = allStoredMaps.filter((m) => m.layer === 'props' || m.layer === 'overhead').slice(0, 20);
    activeSceneMaps = activeMap ? [activeMap, ...propsAndTokens.filter((p) => p.id !== activeMap.id)] : propsAndTokens;
  }

  const activeMapExists = activeSceneMaps.some((m) => m.id === state.activeMapId);

  const sanitized: TabletopSessionState = ensureTabsIntegrity({
    ...DEFAULT_INITIAL_SESSION,
    ...state,
    maps: activeSceneMaps,
    mapCategories: Array.isArray(state.mapCategories) && state.mapCategories.length > 0
      ? state.mapCategories
      : DEFAULT_MAP_CATEGORIES,
    activeMapId: activeMapExists ? state.activeMapId : (activeSceneMaps[0]?.id || null),
    layersConfig: state.layersConfig && Array.isArray(state.layersConfig.layers) && state.layersConfig.layers.length > 0
      ? state.layersConfig
      : DEFAULT_LAYERS_CONFIG,
    drawings: Array.isArray(state.drawings) ? state.drawings : [],
    spellTemplates: Array.isArray(state.spellTemplates) ? state.spellTemplates : [],
    animatedEffects: Array.isArray(state.animatedEffects) ? state.animatedEffects : [],
    laserPointer: state.laserPointer || null,
  });

  inMemorySessionCache = sanitized;
  // Save updated sanitized state back to storage if oversized state was trimmed
  if ((state.maps || []).length !== activeSceneMaps.length || !state.tabs || state.tabs.length === 0) {
    saveIDBSessionState(sanitized).catch(() => {});
  }

  return sanitized;
}

export function getSyncMemorySession(): TabletopSessionState {
  return inMemorySessionCache;
}

export async function saveLocalSessionState(session: TabletopSessionState): Promise<void> {
  inMemorySessionCache = session;
  await saveIDBSessionState(session);
  // Auto-backup to content folder
  writeDataToContentFolder(['data', 'Sessions'], 'active_session.json', session).catch(() => {});
}

/**
 * Emergency recovery: Resets active canvas session to clean state while keeping library categories
 */
export async function resetCorruptedSessionState(): Promise<TabletopSessionState> {
  const cleanSession: TabletopSessionState = {
    ...DEFAULT_INITIAL_SESSION,
    updatedAt: Date.now(),
  };
  inMemorySessionCache = cleanSession;
  await saveIDBSessionState(cleanSession);
  return cleanSession;
}
