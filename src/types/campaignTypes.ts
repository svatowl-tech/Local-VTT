/**
 * Campaign Management & Tracker Data Types
 * Comprehensive data structures for TTRPG time, quests, locations, NPC relationship graphs,
 * session chronicles, party treasury, and safety tools.
 */

export type CampaignTimeOfDay =
  | 'dawn'      // Рассвет (05:00 - 07:00)
  | 'morning'   // Утро (07:00 - 12:00)
  | 'noon'      // Полдень (12:00 - 13:00)
  | 'afternoon' // День (13:00 - 18:00)
  | 'dusk'      // Закат (18:00 - 20:00)
  | 'twilight'  // Сумерки (20:00 - 22:00)
  | 'night'     // Ночь (22:00 - 05:00)
  | 'midnight'; // Полночь (00:00)

export type CampaignWeatherType =
  | 'clear'      // Ясно
  | 'cloudy'     // Облачно
  | 'fog'        // Густой туман
  | 'rain'       // Дождь / Ливень
  | 'thunder'    // Гроза / Шторм
  | 'snow'       // Снегопад / Буран
  | 'heat'       // Изнуряющий зной
  | 'wind'       // Шквальный ветер
  | 'magic_storm'; // Магическая буря / Аномалия

export type MoonPhase =
  | 'new_moon'        // Новолуние
  | 'waxing_crescent' // Растущий серп
  | 'first_quarter'   // Первая четверть
  | 'waxing_gibbous'  // Растущая луна
  | 'full_moon'       // Полнолуние
  | 'waning_gibbous'  // Убывающая луна
  | 'last_quarter'    // Последняя четверть
  | 'waning_crescent'; // Убывающий серп

export interface CampaignTimeState {
  year: number;
  month: number; // 1-12
  day: number;   // 1-30
  hour: number;  // 0-23
  minute: number;// 0-59
  eraName: string; // e.g. "Эра Драконов", "1492 DR"
  calendarSystem: 'harptos' | 'gregorian' | 'custom';
  weather: CampaignWeatherType;
  temperatureDesc: string; // e.g. "+18°C, свежий бриз"
  moonPhase: MoonPhase;
  dayOfWeek: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
}

export type QuestCategory = 'main' | 'side' | 'personal' | 'faction' | 'bounty';
export type QuestStatus = 'active' | 'completed' | 'failed' | 'on_hold';

export interface QuestObjective {
  id: string;
  text: string;
  completed: boolean;
  optional?: boolean;
}

export interface CampaignQuest {
  id: string;
  title: string;
  description: string;
  category: QuestCategory;
  status: QuestStatus;
  giverNpcId?: string;
  giverNpcName?: string;
  locationId?: string;
  locationName?: string;
  characterId?: string; // For personal player character quests
  characterName?: string;
  objectives: QuestObjective[];
  rewards: {
    xp?: number;
    gold?: number;
    items?: string[];
    reputation?: string;
  };
  secretsAndClues: string[];
  createdAtInGame: string;
  updatedAtInGame: string;
  tags: string[];
}

export type LocationType =
  | 'city'
  | 'town'
  | 'village'
  | 'settlement'
  | 'dungeon'
  | 'ruins'
  | 'tavern'
  | 'wilderness'
  | 'forest'
  | 'mountain'
  | 'sea'
  | 'stronghold'
  | 'castle'
  | 'temple'
  | 'planar'
  | 'camp';

export type ExplorationStatus =
  | 'visited'    // Посещено
  | 'explored'   // Исследовано
  | 'unexplored' // Не исследовано
  | 'rumored'    // Известно по слухам
  | 'hostile'    // Враждебная зона
  | 'cleared'    // Зачищено / Безопасно
  | 'sanctuary'; // Святилище / База партии

export interface LocationPOI {
  id: string;
  name: string;
  description: string;
  type?: 'shop' | 'npc' | 'secret' | 'hazard' | 'landmark' | string;
  discovered?: boolean;
  threat?: string;
}

export interface CampaignLocation {
  id: string;
  name: string;
  type: LocationType;
  explorationStatus: ExplorationStatus;
  summary?: string;
  description: string;
  region?: string;
  parentLocationId?: string;
  mapVaultId?: string;
  sceneTabName?: string;
  imageUrl?: string;
  sensoryDetails?: {
    sight?: string;
    sound?: string;
    smell?: string;
  };
  pointsOfInterest: LocationPOI[];
  residentNpcIds?: string[];
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'deadly';
  loreSecrets?: string[];
  knownSecrets?: string[];
  connectedLocationIds?: string[];
  tags: string[];
}

export type NpcAttitude = 'ally' | 'friendly' | 'neutral' | 'suspicious' | 'hostile' | 'nemesis';
export type NpcStatus = 'alive' | 'dead' | 'missing' | 'imprisoned' | 'unknown';

export interface CampaignNpc {
  id: string;
  name: string;
  title?: string; // e.g. "Капитан городской стражи"
  race?: string;
  gender?: string;
  age?: string;
  alignment?: string;
  role?: string;  // e.g. "Кузнец", "Архимаг", "Шпион"
  factionId?: string;
  factionName?: string;
  locationId?: string;
  locationName?: string;
  currentLocationId?: string;
  currentLocationName?: string;
  attitude?: NpcAttitude;
  attitudeToParty?: NpcAttitude;
  status: NpcStatus;
  appearance: string;
  personality?: string;
  personalityTraits?: string;
  motivation?: string;
  goalsAndMotivations?: string;
  secrets?: string;
  secretsKnown?: string[];
  voiceNotes?: string;
  voiceAndMannerisms?: string;
  statsSummary?: string; // AC, HP, CR
  statBlockRef?: string;
  avatarUrl?: string;
  tags: string[];
  notes?: string;
}

export type RelationshipType =
  | 'ally'           // Союзник
  | 'allies'         // Союзники (алиас)
  | 'enemy'          // Враг / Противостояние
  | 'family'         // Семья / Родство
  | 'love'           // Романтическая связь
  | 'debt'           // Долг / Обязательство
  | 'betrayal'       // Предательство
  | 'master_servant' // Слуга / Повелитель
  | 'rival'          // Соперничество
  | 'business';      // Деловое партнерство

export interface NpcRelationshipLink {
  id: string;
  sourceNpcId: string;
  targetNpcId: string;
  type?: RelationshipType;
  relationshipType?: RelationshipType | string;
  label?: string;
  description?: string;
  intensity?: string;
}

export interface CampaignFaction {
  id: string;
  name: string;
  emblemIcon?: string;
  goals: string;
  attitudeToParty: NpcAttitude;
  influence?: number; // 1 to 10
  influenceLevel?: string;
  alignment?: string;
  headquartersLocationId?: string;
  leaderNpcId?: string;
  leaderNpcName?: string;
  description?: string;
  notes?: string;
}

export interface CampaignSessionEntry {
  id: string;
  sessionNumber: number;
  title: string;
  realDate: string;      // Реальная дата игры YYYY-MM-DD
  inGameDate: string;    // Игровая дата в мире
  summary: string;       // Краткий итог
  keyEvents?: string[];   // Ключевые события
  prepGoals?: string;     // Планы мастера на следующую сессию
  secretsAndClues?: string[]; // Секреты для этой сессии (Lazy DM)
  lazyDmNotes?: any;
  rewardsGranted?: {
    xp?: number;
    gold?: number;
    items?: string[];
  };
  xpAwarded?: number;
  goldAwarded?: number;
  tags?: string[];
}

export interface CampaignTimelineEvent {
  id: string;
  dateStr?: string;
  inGameDate?: string;
  year?: number;
  month?: number;
  day?: number;
  title: string;
  description: string;
  category: 'world_lore' | 'party_feat' | 'disaster' | 'war' | 'discovery' | string;
  importance: 'minor' | 'major' | 'legendary' | string;
}

export interface CampaignPartyCharacter {
  id: string;
  name: string;
  playerName: string;
  race: string;
  characterClass: string;
  level: number;
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  armorClass: number;
  passivePerception: number;
  passiveInsight?: number;
  passiveInvestigation?: number;
  speed?: number;
  hasInspiration?: boolean;
  inspiration?: boolean;
  personalQuest?: string;
  backstoryBrief?: string;
  avatarUrl?: string;
  notes?: string;
}

export interface SharedInventoryItem {
  id: string;
  name: string;
  quantity: number;
  weightPerUnit?: number;
  weight?: number;
  category?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact' | string;
  description?: string;
  notes?: string;
  isAttuned?: boolean;
  assignedToCharacterId?: string;
}

export interface PartyTreasuryTransaction {
  id: string;
  timestamp: number;
  type: 'deposit' | 'withdraw' | 'split_even';
  amountStr: string;
  reason: string;
}

export interface CampaignPartyTreasury {
  copper: number;    // CP
  silver: number;    // SP
  electrum: number;  // EP
  gold: number;      // GP
  platinum: number;  // PP
  sharedBag: SharedInventoryItem[];
  transactions: PartyTreasuryTransaction[];
}

export interface HouseRuleItem {
  id: string;
  title: string;
  category: 'combat' | 'magic' | 'resting' | 'death_saves' | 'roleplay' | 'inventory' | 'social' | string;
  ruleText?: string;
  description?: string;
  isActive?: boolean;
}

export interface CampaignSafetyTools {
  xCardTriggered: boolean;
  xCardTimestamp?: number;
  lines: string[];   // Темы, полностью исключенные из игры (Hard limits)
  veils: string[];   // Темы, уходящие "в затемнение" (Fade to black)
  houseRules: HouseRuleItem[];
  breakTimerMinutes: number;
  breakTimerEndsAt: number | null;
  breakTimerActive: boolean;
}

export type CampaignSafetyState = CampaignSafetyTools;
export type CampaignHomebrewRule = HouseRuleItem;

export interface CampaignSummary {
  id: string;
  name: string;
  system: string;
  worldName: string;
  dungeonMasterName?: string;
  questsCount: number;
  locationsCount: number;
  npcsCount: number;
  partyCount: number;
  sessionsCount: number;
  updatedAt: number;
  createdAt: number;
  fileName: string;
  fileSizeBytes: number;
}

export interface CampaignState {
  id: string;
  name: string;
  system: string;
  worldName: string;
  dungeonMasterName?: string;
  createdAt: number;
  updatedAt: number;
  time: CampaignTimeState;
  quests: CampaignQuest[];
  locations: CampaignLocation[];
  npcs: CampaignNpc[];
  relationships: NpcRelationshipLink[];
  factions: CampaignFaction[];
  sessions: CampaignSessionEntry[];
  timeline: CampaignTimelineEvent[];
  party: CampaignPartyCharacter[];
  treasury: CampaignPartyTreasury;
  safety: CampaignSafetyTools;
}

export type CampaignData = CampaignState;


