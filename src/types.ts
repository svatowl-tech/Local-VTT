export type ObjectLayerType = 'background' | 'props' | 'overhead' | 'above-fog' | string;

export interface MapItem {
  id: string;
  name: string;
  type: 'image' | 'video' | 'card';
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
  category?: string;
  layer?: ObjectLayerType;
  locked?: boolean;
  hiddenFromPlayers?: boolean;
  description?: string;
  tags?: string[];
  // Sub-map portal & Map link capabilities (for global maps and nested scenes)
  isSubmapPortal?: boolean;
  submapVaultId?: string;
  targetVaultMapId?: string;
  targetVaultMapName?: string;
  targetVaultThumbnailUrl?: string;
  portalBadgeText?: string;
  // Interactive Content Card on Canvas (Monsters, Spells, Items, Tables, Rules)
  isContentCard?: boolean;
  contentCardData?: {
    item: any; // SystemReferenceSearchItem
    cardType?: string;
    viewMode?: 'full' | 'compact' | 'minimal';
    showGmNotes?: boolean;
    customNotes?: string;
  };
}

export interface CameraFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  aspectRatio: number;
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

export type FogStyleType =
  | 'white-mist'
  | 'midnight-shadow'
  | 'mystic-blue'
  | 'poison-fog'
  | 'parchment'
  | 'smoke'
  | 'solid'
  | 'clouds'
  | 'nebula'
  | 'runic'
  | 'red-smoke'
  | 'dark-obsidian';

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
  radius: number; // in world units/pixels (50px = 5ft typically)
  angle?: number; // degrees for cone / line rotation
  length?: number; // for line / box
  width?: number; // for line / box
  color: string;
  label: string;
  feetRadius: number; // e.g. 20 (for 20ft Fireball)
  effectType: SpellEffectType;
  createdAt: number;
}

export type AnimatedEffectType = 'fire' | 'water' | 'smoke' | 'lightning' | 'portal';

export interface EffectNode {
  x: number;
  y: number;
  r?: number;
}

export interface AnimatedEffect {
  id: string;
  type: AnimatedEffectType;
  position: { x: number; y: number };
  radius: number;
  intensity: number; // 0.1 to 2.0
  color?: string;
  label?: string;
  createdAt: number;
  nodes?: EffectNode[]; // Trail / path / front vertices forming complex shapes, rivers, fire walls
}

export interface LaserPointer {
  active: boolean;
  x: number;
  y: number;
  color: string;
  lastUpdate: number;
  isPing?: boolean;
}

export type BlackoutBackgroundMode = 'embers' | 'video' | 'image' | 'preset_video' | 'youtube';

export interface PlayerBlackoutState {
  enabled: boolean;
  title?: string;
  subtitle?: string;
  preset?: 'prep' | 'rest' | 'tavern' | 'stealth' | 'boss';
  backgroundMode?: BlackoutBackgroundMode;
  videoUrl?: string;
  imageUrl?: string;
  youtubeUrl?: string;
  presetVideoId?: string;
  overlayDim?: number;
  blurAmount?: number;
  hideCard?: boolean;
  showEmbers?: boolean;
  soundEnabled?: boolean;
  mediaName?: string;
}

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  category?: string;
  tags?: string[];
}

export interface AudioPlaylist {
  id: string;
  name: string;
  category: 'background' | 'combat' | 'alarm' | 'dungeon' | 'magic' | 'custom';
  icon?: string;
  description?: string;
  tracks: AudioTrack[];
  tags?: string[];
}

export interface SoundEffect {
  id: string;
  name: string;
  icon: string;
  url?: string;
  presetType?: 'sword' | 'dragon' | 'thunder' | 'spell' | 'dice' | 'horn' | 'door' | 'cheer' | 'chime';
  category?: string;
  color?: string;
  tags?: string[];
}

export interface AudioState {
  activePlaylistId: string | null;
  activeTrackId: string | null;
  isPlaying: boolean;
  isShuffle: boolean;
  isLoop: boolean;
  volume: number;
  sfxVolume: number;
  playlists: AudioPlaylist[];
  soundEffects: SoundEffect[];
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
  | 'camera'      // Player Camera Frame
  | string;

export interface LayerItemConfig {
  id: TabletopLayerId;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  order: number;
  description?: string;
  icon?: string;
  isCustom?: boolean;
  color?: string; // Color identifier for badge (e.g. 'amber', 'purple', 'emerald', 'blue', 'rose', 'cyan', 'orange', 'indigo')
  iconName?: string; // Icon identifier (e.g. 'box', 'shield', 'flame', 'sword', 'skull', 'key', 'ghost', 'home', 'star')
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
  // Complete snapshot of workspace state
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
  mapCategories?: string[];
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
  audioState?: AudioState;
  layersConfig?: LayerStackConfig;
  tabs?: WorkspaceTab[];
  activeTabId?: string;
  activeSystemId?: string;
  playerTransition?: PlayerTransitionConfig;
  playbackState: {
    isPlaying: boolean;
    currentTime: number;
    speed: number;
  };
  checksum?: string;
}

export interface RustArchitectureFile {
  filename: string;
  path: string;
  language: string;
  content: string;
  description: string;
}

export interface RustArchitectureResponse {
  success: boolean;
  files: RustArchitectureFile[];
  instructions: {
    macOS: string;
    windows: string;
  };
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

export type InitiativeFormula = 'd20' | 'd10' | '2d6' | '3d6' | 'd100' | 'd6' | 'static';
export type InitiativeSortDirection = 'desc' | 'asc';

export interface InitiativeEncounterState {
  inCombat: boolean;
  round: number;
  activeTurnIndex: number;
  combatants: InitiativeCombatant[];
  showToPlayers?: boolean;
  formula?: InitiativeFormula;
  sortDirection?: InitiativeSortDirection;
}

export type ViewMode = 'master' | 'player';

export type ActiveTool =
  | 'select'
  | 'pan'
  | 'brush'
  | 'highlighter'
  | 'eraser'
  | 'spell-circle'
  | 'spell-cone'
  | 'spell-line'
  | 'spell-square'
  | 'effect-fire'
  | 'effect-water'
  | 'laser'
  | 'fog-reveal'
  | 'fog-conceal'
  | 'measure';

export interface ToolSettings {
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  spellType?: SpellShapeType;
  spellShape?: SpellShapeType;
  spellFeetRadius: number;
  spellAngle?: number;
  spellEffect: SpellEffectType;
  spellColor: string;
  effectType: AnimatedEffectType;
  effectRadius: number;
  laserColor: string;
}

export interface PanelWindowState {
  id: string;
  title: string;
  isOpen: boolean;
  isMinimized?: boolean;
  isMaximized?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  zIndex: number;
}

export interface UnifiedAssetFolderStats {
  connected: boolean;
  folderName: string;
  path?: string;
  createStructureOnConnect: boolean;
  mapsCount: number;
  mapCategoriesCount: number;
  propsCount: number;
  propCategoriesCount: number;
  playlistsCount: number;
  tracksCount: number;
  sfxBanksCount: number;
  sfxCount: number;
  effectsCount?: number;
  effectsCategoriesCount?: number;
  savedSessionsCount: number;
  systemsCount?: number;
  systemFilesCount?: number;
  loreCount?: number;
  worldsCount?: number;
  totalCount?: number;
  activeSystemId?: string;
  lastSyncedAt?: number;
}

export * from './types/systemDataTypes';

export interface ParsedDiskAssetFolder {
  maps: Array<{ name: string; url: string; category: string; format: string; fileSize: number }>;
  props: Array<{ name: string; url: string; category: string; format: string; fileSize: number }>;
  musicPlaylists: Array<{ name: string; category: string; tracks: Array<{ name: string; url: string }> }>;
  sfxBanks: Array<{ category: string; sounds: Array<{ name: string; url: string }> }>;
  dataSessions: Array<{ name: string; timestamp: number; data: any }>;
}

export interface MapVaultStats {
  propsCount: number;
  hasFog: boolean;
  hasEffects: boolean;
  hasDrawings: boolean;
  hasSpells: boolean;
  bgWidth?: number;
  bgHeight?: number;
}

export interface MapVaultItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  thumbnailUrl?: string;
  previewColor?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  isBuiltInPreset?: boolean;
  tabSnapshot: WorkspaceTab;
  stats?: MapVaultStats;
}

export interface MapVaultExportPackage {
  format: 'aethermap_vault_package_v1';
  version: number;
  exportedAt: number;
  vaultItems: MapVaultItem[];
}


