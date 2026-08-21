import { WorkspaceTab, TabletopSessionState, MapItem, CameraFrame, FogState, GridSettings, LayerStackConfig } from '../types';
import { DEFAULT_LAYERS_CONFIG } from './defaultSession';

export const DEFAULT_PLAYER_TRANSITION = {
  enabled: true,
  type: 'cinematic-fade' as const,
  durationMs: 500,
  showLocationTitle: true,
};

export const TAB_ICONS = ['🗺️', '🏰', '🌲', '⚔️', '⛺', '🍺', '📜', '💀', '🔥', '🔮', '🏛️', '⛵', '🏔️', '🌋', '🗝️'];

export const TAB_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

export function generateTabId(): string {
  return `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export function createBlankTab(name = 'Новая сцена', icon = '🗺️', color?: string): WorkspaceTab {
  return {
    id: generateTabId(),
    name,
    icon,
    color: color || TAB_COLORS[Math.floor(Math.random() * TAB_COLORS.length)],
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    maps: [],
    activeMapId: null,
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
    layersConfig: DEFAULT_LAYERS_CONFIG,
  };
}

export function createTabFromMap(mapItem: MapItem, name?: string): WorkspaceTab {
  const tabName = name || mapItem.name || 'Карта локации';
  let tabIcon = '🗺️';
  if (tabName.toLowerCase().includes('таверн') || tabName.toLowerCase().includes('город')) tabIcon = '🍺';
  else if (tabName.toLowerCase().includes('подзем') || tabName.toLowerCase().includes('пещер') || tabName.toLowerCase().includes('склеп')) tabIcon = '🏰';
  else if (tabName.toLowerCase().includes('лес') || tabName.toLowerCase().includes('природ')) tabIcon = '🌲';
  else if (tabName.toLowerCase().includes('бой') || tabName.toLowerCase().includes('босс') || tabName.toLowerCase().includes('арен')) tabIcon = '⚔️';

  const tab = createBlankTab(tabName, tabIcon);
  tab.maps = [mapItem];
  tab.activeMapId = mapItem.id;
  tab.camera = {
    x: mapItem.position.x,
    y: mapItem.position.y,
    width: mapItem.width,
    height: mapItem.height,
    rotation: mapItem.rotation || 0,
    aspectRatio: mapItem.aspectRatio || 16 / 9,
    locked: false,
    zoom: 1,
  };
  return tab;
}

export function duplicateTabState(tab: WorkspaceTab, newName?: string): WorkspaceTab {
  const cloneId = generateTabId();
  return {
    ...JSON.parse(JSON.stringify(tab)),
    id: cloneId,
    name: newName || `${tab.name} (Копия)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function extractTabSnapshot(session: TabletopSessionState, tabId: string, currentTab?: WorkspaceTab): WorkspaceTab {
  const existing = currentTab || (session.tabs || []).find((t) => t.id === tabId);
  const name = existing?.name || (session.maps.find((m) => m.id === session.activeMapId)?.name) || 'Основная сцена';
  const icon = existing?.icon || '🗺️';
  const color = existing?.color || '#f59e0b';
  const notes = existing?.notes || '';

  return {
    id: tabId,
    name,
    icon,
    color,
    notes,
    createdAt: existing?.createdAt || Date.now(),
    updatedAt: Date.now(),
    isLocked: existing?.isLocked,
    maps: session.maps || [],
    activeMapId: session.activeMapId || null,
    camera: session.camera,
    fog: session.fog,
    grid: session.grid,
    drawings: session.drawings || [],
    spellTemplates: session.spellTemplates || [],
    animatedEffects: session.animatedEffects || [],
    layersConfig: session.layersConfig || DEFAULT_LAYERS_CONFIG,
  };
}

export function applyTabToSession(session: TabletopSessionState, targetTab: WorkspaceTab): TabletopSessionState {
  return {
    ...session,
    activeTabId: targetTab.id,
    maps: targetTab.maps || [],
    activeMapId: targetTab.activeMapId || (targetTab.maps[0]?.id || null),
    camera: targetTab.camera || session.camera,
    fog: targetTab.fog || session.fog,
    grid: targetTab.grid || session.grid,
    drawings: targetTab.drawings || [],
    spellTemplates: targetTab.spellTemplates || [],
    animatedEffects: targetTab.animatedEffects || [],
    layersConfig: targetTab.layersConfig || session.layersConfig || DEFAULT_LAYERS_CONFIG,
    updatedAt: Date.now(),
  };
}

export function ensureTabsIntegrity(session: TabletopSessionState): TabletopSessionState {
  let tabs = Array.isArray(session.tabs) ? [...session.tabs] : [];
  let activeTabId = session.activeTabId;

  if (tabs.length === 0) {
    // Generate initial tab from current session state
    const initialTabId = generateTabId();
    const primaryMap = session.maps.find((m) => m.id === session.activeMapId) || session.maps[0];
    const initialTabName = primaryMap?.name || 'Главная сцена';

    const defaultTab: WorkspaceTab = {
      id: initialTabId,
      name: initialTabName,
      icon: '🗺️',
      color: '#f59e0b',
      notes: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maps: session.maps || [],
      activeMapId: session.activeMapId || null,
      camera: session.camera,
      fog: session.fog,
      grid: session.grid,
      drawings: session.drawings || [],
      spellTemplates: session.spellTemplates || [],
      animatedEffects: session.animatedEffects || [],
      layersConfig: session.layersConfig || DEFAULT_LAYERS_CONFIG,
    };

    tabs = [defaultTab];
    activeTabId = initialTabId;
  }

  // Ensure activeTabId points to a valid tab
  if (!activeTabId || !tabs.some((t) => t.id === activeTabId)) {
    activeTabId = tabs[0].id;
  }

  return {
    ...session,
    tabs,
    activeTabId,
    playerTransition: session.playerTransition || DEFAULT_PLAYER_TRANSITION,
  };
}
