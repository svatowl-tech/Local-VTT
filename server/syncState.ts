import { DEFAULT_MAP_LIBRARY } from './mediaEngine';
import {
  TabletopSessionState,
  PlayerCharacter,
  MonsterTemplate,
  InitiativeEncounterState,
} from './types';
import { generateSessionToken } from './cryptoEngine';

const INITIAL_SESSION_ID = 'session-default-master';
const tokenInfo = generateSessionToken(INITIAL_SESSION_ID);

export const DEFAULT_LAYERS_CONFIG = {
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

export let currentSessionState: TabletopSessionState = {
  sessionId: INITIAL_SESSION_ID,
  sessionToken: tokenInfo.token,
  updatedAt: Date.now(),
  maps: [...DEFAULT_MAP_LIBRARY],
  activeMapId: 'preset-dragon-lair',
  layersConfig: DEFAULT_LAYERS_CONFIG as any,
  tabs: [
    {
      id: 'tab-default-1',
      name: 'Логово Дракона',
      icon: '🐉',
      color: '#f59e0b',
      notes: 'Главная арена с древним красным драконом. Ловушки у входа.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maps: [...DEFAULT_MAP_LIBRARY],
      activeMapId: 'preset-dragon-lair',
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
      layersConfig: DEFAULT_LAYERS_CONFIG as any,
    },
  ],
  activeTabId: 'tab-default-1',
  playerTransition: {
    enabled: true,
    type: 'cinematic-fade',
    durationMs: 500,
    showLocationTitle: true,
  },
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
  initiative: {
    inCombat: false,
    round: 1,
    activeTurnIndex: 0,
    combatants: [],
    showToPlayers: true,
  },
  playbackState: {
    isPlaying: true,
    currentTime: 0,
    speed: 1,
  },
};

export interface FullInitiativeServerState {
  playerDatabase?: PlayerCharacter[];
  monsterDatabase?: MonsterTemplate[];
  encounter: InitiativeEncounterState;
}

export let currentInitiativeState: FullInitiativeServerState = {
  encounter: {
    inCombat: false,
    round: 1,
    activeTurnIndex: 0,
    combatants: [],
    showToPlayers: true,
  },
};

export function getInitiativeState(): FullInitiativeServerState {
  return currentInitiativeState;
}

export function updateInitiativeState(payload: Partial<FullInitiativeServerState>): FullInitiativeServerState {
  currentInitiativeState = {
    ...currentInitiativeState,
    ...payload,
    encounter: payload.encounter
      ? {
          ...currentInitiativeState.encounter,
          ...payload.encounter,
          showToPlayers: payload.encounter.showToPlayers !== undefined ? payload.encounter.showToPlayers : true,
        }
      : currentInitiativeState.encounter,
  };

  // Sync with session state as well
  if (payload.encounter) {
    currentSessionState = {
      ...currentSessionState,
      initiative: currentInitiativeState.encounter,
      updatedAt: Date.now(),
    };
  }

  return currentInitiativeState;
}

export function getSessionState(): TabletopSessionState {
  return currentSessionState;
}

function syncActiveTabOnServer(): void {
  const activeTabId = currentSessionState.activeTabId;
  if (activeTabId && currentSessionState.tabs) {
    const activeTabIdx = currentSessionState.tabs.findIndex((t) => t.id === activeTabId);
    if (activeTabIdx !== -1) {
      currentSessionState.tabs[activeTabIdx] = {
        ...currentSessionState.tabs[activeTabIdx],
        maps: currentSessionState.maps || [],
        activeMapId: currentSessionState.activeMapId || null,
        camera: currentSessionState.camera,
        fog: currentSessionState.fog,
        grid: currentSessionState.grid,
        drawings: currentSessionState.drawings || [],
        spellTemplates: currentSessionState.spellTemplates || [],
        animatedEffects: currentSessionState.animatedEffects || [],
        layersConfig: currentSessionState.layersConfig || DEFAULT_LAYERS_CONFIG as any,
        updatedAt: Date.now(),
      };
    }
  }
}

export function updateSessionState(partial: Partial<TabletopSessionState>): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    ...partial,
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function addDrawingStroke(stroke: TabletopSessionState['drawings'][0]): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    drawings: [...currentSessionState.drawings, stroke],
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function clearDrawings(): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    drawings: [],
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function addSpellTemplate(template: TabletopSessionState['spellTemplates'][0]): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    spellTemplates: [...currentSessionState.spellTemplates, template],
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updateSpellTemplate(
  id: string,
  partial: Partial<TabletopSessionState['spellTemplates'][0]>
): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    spellTemplates: currentSessionState.spellTemplates.map((t) =>
      t.id === id ? { ...t, ...partial } : t
    ),
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function removeSpellTemplate(id: string): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    spellTemplates: currentSessionState.spellTemplates.filter((t) => t.id !== id),
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function addAnimatedEffect(effect: TabletopSessionState['animatedEffects'][0]): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    animatedEffects: [...currentSessionState.animatedEffects, effect],
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function removeAnimatedEffect(id: string): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    animatedEffects: currentSessionState.animatedEffects.filter((e) => e.id !== id),
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updateLaserPointer(laser: TabletopSessionState['laserPointer']): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    laserPointer: laser,
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updateCameraState(cameraPartial: Partial<TabletopSessionState['camera']>): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    camera: {
      ...currentSessionState.camera,
      ...cameraPartial,
    },
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updateFogState(fogPartial: Partial<TabletopSessionState['fog']>): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    fog: {
      ...currentSessionState.fog,
      ...fogPartial,
    },
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updateGridState(gridPartial: Partial<TabletopSessionState['grid']>): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    grid: {
      ...currentSessionState.grid,
      ...gridPartial,
    },
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updatePlayerBlackoutState(blackoutPartial: Partial<TabletopSessionState['playerBlackout']>): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    playerBlackout: {
      ...(currentSessionState.playerBlackout || {
        enabled: false,
        title: 'Мастер подготавливает карту...',
        subtitle: 'Пожалуйста, подождите. Идет расстановка поля битвы и декораций',
        preset: 'prep',
      }),
      ...blackoutPartial,
    },
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}

export function updateLayersConfigState(layersPartial: Partial<TabletopSessionState['layersConfig']>): TabletopSessionState {
  currentSessionState = {
    ...currentSessionState,
    layersConfig: {
      ...(currentSessionState.layersConfig || DEFAULT_LAYERS_CONFIG as any),
      ...layersPartial,
    },
    updatedAt: Date.now(),
  };
  syncActiveTabOnServer();
  return currentSessionState;
}
