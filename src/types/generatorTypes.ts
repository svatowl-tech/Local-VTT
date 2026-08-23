export interface NpcStats {
  STR: string;
  DEX: string;
  CON: string;
  INT: string;
  WIS: string;
  CHA: string;
}

export interface NpcRawData {
  fullName: string;
  race: string;
  classType: string;
  profession?: string;
  professionCategory?: string;
  professionPerk?: string;
  socialStatus?: string;
  socialStatusDesc?: string;
  housing?: string;
  ageGroup?: string;
  ageRange?: string;
  attitude?: string;
  attitudeReaction?: string;
  appearance?: string;
  secret?: string;
  rumor?: string;
  level: number;
  alignment: string;
  gender: string;
  stats: NpcStats;
  hp: number;
  hitDice: string;
  ac: number;
  speed: string;
  proficiencyBonus: string;
  savingThrows: string;
  racialTraits: string[];
  classFeatures: string[];
  equipment: string[];
  purse?: { cp: number; sp: number; gp: number; pp?: number };
  motivation: string;
  quirk: string;
}

export interface TreasureRawData {
  level: number;
  theme?: string;
  themeDesc?: string;
  container?: string;
  containerDesc?: string;
  lockDc?: number;
  trap?: string;
  trapEffect?: string;
  trapDetectDc?: number;
  trapDisarmDc?: number;
  specialItem?: string;
  coins: {
    cp: number;
    sp: number;
    gp: number;
    pp: number;
    totalGpEquivalent: number;
  };
  gems: Array<{ name: string; value: number }>;
  artObjects: Array<{ name: string; value: number }>;
  magicItems: string[];
  grandTotalValueGp: number;
}

export interface LootRawData {
  source?: string;
  category?: string;
  tier?: string;
  richness?: string;
  condition?: string;
  conditionDesc?: string;
  coins: {
    cp: number;
    sp: number;
    gp: number;
  };
  items?: string[];
  valuable?: string | null;
  trinket: string;
  clue?: string;
  monsterItem?: string;
}

export interface MerchantItem {
  name: string;
  price: string;
  category: string;
  desc?: string;
  rarity?: string;
}

export interface MerchantRawData {
  shopType: string;
  shopName: string;
  name?: string;
  mood?: string;
  ownerName: string;
  ownerRace: string;
  ownerPersonality: string;
  inventory: MerchantItem[];
}

export interface TravelingMerchantItem {
  name: string;
  price: string;
  desc: string;
  rarity?: string;
  category: string;
}

export interface TravelingMerchantRawData {
  name: string;
  title: string;
  archetype: string;
  race: string;
  personality: string;
  transport: string;
  purse: string;
  meetingPlace: string;
  roadRumor: string;
  tradeQuirk: string;
  inventory: TravelingMerchantItem[];
}

export interface StationaryShopItem {
  name: string;
  price: string;
  category: string;
  stock: number;
  desc: string;
  quality?: string;
}

export interface StationaryShopRawData {
  shopName: string;
  shopType: string;
  shopTypeTitle: string;
  location: string;
  ownerName: string;
  ownerRace: string;
  ownerPersonality: string;
  atmosphere: string;
  securityMeasures: string;
  bargainPolicy: string;
  specialServices: string;
  vaultCash: string;
  inventory: StationaryShopItem[];
}

export interface EquipmentItemProperty {
  name: string;
  effect: string;
}

export interface EquipmentItem {
  name: string;
  category: 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'clothing';
  typeLabel: string;
  material: string;
  quality: string;
  hasSpecialProperties: boolean;
  properties: EquipmentItemProperty[];
  cost: string;
  weight: string;
  damageOrAc: string;
  durability: string;
  description: string;
  origin: string;
}

export interface EquipmentRawData {
  category: string;
  materialOption: string;
  qualityOption: string;
  hasPropertiesOption: boolean;
  item: EquipmentItem;
}

export interface MagicItemEntry {
  name: string;
  school: 'abjuration' | 'conjuration' | 'divination' | 'enchantment' | 'evocation' | 'illusion' | 'necromancy' | 'transmutation' | 'universal';
  schoolNameRu: string;
  type: string; // 'ring' | 'wand' | 'staff' | 'rod' | 'weapon' | 'armor' | 'potion' | 'scroll' | 'wondrous' | 'amulet'
  typeNameRu: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Very Rare' | 'Legendary';
  rarityRu: string;
  attunement: boolean;
  attunementDesc?: string;
  charges?: string;
  activeAbility: string;
  passiveEffect: string;
  commandWord?: string;
  description: string;
  lore: string;
  valueGp: number;
  quirkOrCurse?: string;
}

export interface MagicItemRawData {
  requestedSchool: string;
  requestedType: string;
  requestedRarity: string;
  item: MagicItemEntry;
}

