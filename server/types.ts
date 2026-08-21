export type ObjectLayerType = 'background' | 'props' | 'overhead' | 'above-fog';

export interface MapItem {
  id: string;
  name: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  aspectRatio: number;
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  zIndex: number;
  opacity: number;
  hash: string;
  fileSize: number;
  format: string;
  gridSize?: number;
  gridOffset?: { x: number; y: number };
  layer?: ObjectLayerType;
  locked?: boolean;
  hiddenFromPlayers?: boolean;
}

export interface CameraFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  aspectRatio: number; // e.g. 16/9, 16/10, 4/3
  locked: boolean;
  followMapId?: string;
  zoom: number;
}

export interface FogPoint {
  x: number;
  y: number;
  radius: number;
  type: 'reveal' | 'conceal';
}

export type FogStyleType = 'white-mist' | 'midnight-shadow' | 'mystic-blue' | 'poison-fog';

export interface FogState {
  enabled: boolean;
  opacity: number;
  history: FogPoint[];
  maskDataUrl?: string;
  style?: FogStyleType;
  density?: number;
  animated?: boolean;
}

export interface GridSettings {
  enabled: boolean;
  type: 'square' | 'hex';
  size: number;
  color: string;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  size: number;
  opacity: number;
  tool: 'brush' | 'highlighter' | 'eraser';
}

export type SpellShapeType = 'circle' | 'cone' | 'line' | 'square';
export type SpellEffectType = 'arcane' | 'fire' | 'water' | 'ice' | 'acid' | 'lightning' | 'holy' | 'necrotic';

export interface SpellTemplate {
  id: string;
  type: SpellShapeType;
  position: { x: number; y: number };
  radius: number;
  angle?: number;
  length?: number;
  width?: number;
  color: string;
  label: string;
  feetRadius: number;
  effectType: SpellEffectType;
  createdAt: number;
}

export type AnimatedEffectType = 'fire' | 'water' | 'smoke' | 'lightning' | 'portal';

export interface AnimatedEffect {
  id: string;
  type: AnimatedEffectType;
  position: { x: number; y: number };
  radius: number;
  intensity: number;
  color?: string;
  label?: string;
  createdAt: number;
}

export interface LaserPointer {
  active: boolean;
  x: number;
  y: number;
  color: string;
  lastUpdate: number;
  isPing?: boolean;
}

export interface PlayerBlackoutState {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  preset?: 'prep' | 'rest' | 'tavern' | 'stealth' | 'boss';
}

export interface PlayerCharacter {
  id: string;
  name: string;
  classLevel: string;
  playerOwner?: string;
  maxHp: number;
  currentHp: number;
  ac: number;
  initBonus: number;
  avatar: string;
  notes?: string;
  isPresent?: boolean;
}

export interface MonsterTemplate {
  id: string;
  name: string;
  type: string;
  maxHp: number;
  ac: number;
  initBonus: number;
  cr: string;
  avatar: string;
  notes?: string;
}

export type CombatantCategory = 'player' | 'monster';

export interface InitiativeCombatant {
  id: string;
  entityId?: string;
  name: string;
  category: CombatantCategory;
  initiative: number;
  initBonus: number;
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  ac: number;
  avatar: string;
  conditions: string[];
  notes?: string;
  isHidden?: boolean;
}

export interface InitiativeEncounterState {
  inCombat: boolean;
  round: number;
  activeTurnIndex: number;
  combatants: InitiativeCombatant[];
  showToPlayers?: boolean;
}

export type TabletopLayerId =
  | 'maps'        // Ground maps & background
  | 'props'       // Objects, tokens, props
  | 'grid'        // Grid overlay
  | 'drawings'    // Drawings & annotations
  | 'effects'     // Fire & Water VFX
  | 'spells'      // Spell templates & AoE
  | 'overhead'    // Overhead roofs & upper objects
  | 'fog'         // Fog of War
  | 'laser'       // Laser pointer & ping
  | 'camera';     // Player Camera Frame

export interface LayerItemConfig {
  id: TabletopLayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
  description?: string;
  icon?: string;
}

export interface LayerStackConfig {
  layers: LayerItemConfig[];
}

export interface PlayerTransitionConfig {
  enabled: boolean;
  type: 'cinematic-fade' | 'crossfade' | 'instant';
  durationMs: number;
  showLocationTitle: boolean;
}

export interface WorkspaceTab {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  isLocked?: boolean;
  maps: MapItem[];
  activeMapId: string | null;
  camera: CameraFrame;
  fog: FogState;
  grid: GridSettings;
  drawings: DrawingStroke[];
  spellTemplates: SpellTemplate[];
  animatedEffects: AnimatedEffect[];
  layersConfig?: LayerStackConfig;
}

export interface TabletopSessionState {
  sessionId: string;
  sessionToken: string;
  updatedAt: number;
  maps: MapItem[];
  activeMapId: string | null;
  camera: CameraFrame;
  fog: FogState;
  grid: GridSettings;
  drawings: DrawingStroke[];
  spellTemplates: SpellTemplate[];
  animatedEffects: AnimatedEffect[];
  laserPointer: LaserPointer | null;
  playerBlackout?: PlayerBlackoutState;
  initiative?: InitiativeEncounterState;
  layersConfig?: LayerStackConfig;
  tabs?: WorkspaceTab[];
  activeTabId?: string;
  playerTransition?: PlayerTransitionConfig;
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    speed: number;
  };
}

export interface ParsedMediaResult {
  id: string;
  name: string;
  mediaType: 'image' | 'video';
  format: string;
  width: number;
  height: number;
  aspectRatio: number;
  fileSize: number;
  hash: string;
  dataUrl: string;
  recommendedGridSize: number;
}

export interface CameraTransformMatrix {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  rotationRad: number;
  visibleBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}
