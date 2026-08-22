import { SystemReferenceSearchItem } from '../services/rustSystemSearchService';

export type LoreCategory =
  | 'world_overview'
  | 'continent_country'
  | 'settlement'
  | 'district_location'
  | 'shop_tavern_venue'
  | 'npc_figure'
  | 'faction_cult'
  | 'region_geography'
  | 'demographics_race'
  | 'lore_item'
  | 'lore_article';

export interface DemographicBreakdown {
  raceName: string;
  percentage: number;
  notes?: string;
}

export interface SettlementData {
  type: 'metropolis' | 'city' | 'town' | 'village' | 'fortress' | 'capital' | 'region';
  population?: number;
  demographics?: DemographicBreakdown[];
  rulingBody?: string;
  politicsEconomy?: string;
  districts?: string[];
  keyLocations?: string[];
  notableNpcIds?: string[];
}

export interface NpcData {
  titleOrRole?: string;
  factionId?: string;
  locationId?: string;
  race?: string;
  alignment?: string;
  personality?: string;
  backgroundLore?: string;
  linkedRuleStatblockId?: string; // Reference to a Monster/NPC rule statblock in Compendium
  statsOverride?: any; // Custom inline stats if needed
}

export interface FactionCultData {
  factionType: 'cult' | 'guild' | 'government' | 'secret_society' | 'order' | 'syndicate' | 'religion';
  leaderNpcId?: string;
  headquartersLocationId?: string;
  alignment?: string;
  goalsAndPhilosophy?: string;
  hierarchyAndRanks?: string[];
  associatedNpcIds?: string[];
  associatedRuleItemIds?: string[]; // Weapons, artifacts used by this faction
}

export interface WorldOverviewData {
  politicsAndGovernment?: string;
  economyAndTrade?: string;
  pantheonAndGods?: Array<{ name: string; domain: string; alignment?: string; description?: string }>;
  cosmologyAndMagic?: string;
  majorHistoryTimeline?: Array<{ year: string; eventName: string; description: string }>;
}

export interface DemographicsRaceData {
  originLore?: string;
  culturalTraits?: string[];
  languages?: string[];
  commonSubraces?: string[];
}

export interface WorldLoreItem {
  id: string;
  worldId: string; // e.g. 'dnd5e_faerun', 'dnd5e_eberron', 'cyberpunk_night_city', 'coc_arkham'
  subWorldId?: string; // e.g. 'sword_coast', 'sharn', 'watson_district'
  worldName: string; // e.g. 'Забытые Королевства (Faerûn)'
  systemId: string; // e.g. 'dnd5e', 'cyberpunk_red', 'coc'
  name: string;
  originalName?: string;
  category: LoreCategory;
  summary: string;
  content: string; // Rich markdown text supporting internal links [[type:id|Name]]
  tags: string[];
  imageUrl?: string;
  galleryUrls?: string[];
  gmNotes?: string;
  filePath?: string;
  
  // Category-specific structured data
  settlementData?: SettlementData;
  npcData?: NpcData;
  factionData?: FactionCultData;
  overviewData?: WorldOverviewData;
  raceData?: DemographicsRaceData;

  // Cross-links
  linkedRuleIds?: string[]; // IDs in rustSystemSearchService (e.g. monster, spell, item)
  linkedLoreIds?: string[]; // IDs of related lore items (e.g. settlement <-> npc <-> faction)

  createdAt?: number;
  updatedAt?: number;
}

export interface WorldDefinition {
  id: string; // e.g. 'dnd5e_faerun'
  name: string; // 'Забытые Королевства (Faerûn)'
  systemId: string; // 'dnd5e'
  description: string;
  subWorlds: Array<{ id: string; name: string }>;
  iconName?: string;
}

export interface IngestionParseResult {
  success: boolean;
  message: string;
  parsedLoreItems: WorldLoreItem[];
  parsedRuleItems: SystemReferenceSearchItem[];
  stats: {
    loreCount: number;
    ruleCount: number;
    extractedNpcs: number;
    extractedLocations: number;
    extractedFactions: number;
  };
}
