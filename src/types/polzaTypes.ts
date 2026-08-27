export type PolzaModelId =
  | 'tongyi-mai/z-image'
  | 'google/gemini-2.5-flash-image'
  | 'bytedance/seedream-4'
  | 'gpt-image-1'
  | 'dall-e-3';

export type PolzaTextModelId =
  | 'deepseek/deepseek-r1-distill-llama-70b'
  | 'google/gemma-3-27b-it'
  | 'openai/gpt-oss-20b'
  | 'deepseek/deepseek-chat'
  | 'openai/gpt-4o'
  | 'anthropic/claude-3-5-sonnet'
  | string;

export interface PolzaTextModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  isDefault?: boolean;
  recommendedFor: string;
  supportsReasoning?: boolean;
}

export type PolzaImageSize =
  | 'auto'
  | '1024x1024'
  | '1536x1024'
  | '1024x1536'
  | '1792x1024'
  | '1024x1792'
  | '512x512'
  | '256x256';

export type PolzaQuality = 'auto' | 'high' | 'medium' | 'low' | 'standard' | 'hd';
export type PolzaStyle = 'vivid' | 'natural';
export type PolzaBackground = 'auto' | 'transparent' | 'opaque';
export type PolzaResponseFormat = 'url' | 'b64_json';

export type PolzaEntityType =
  | 'npc'
  | 'monster'
  | 'item'
  | 'spell'
  | 'location'
  | 'quest'
  | 'lore'
  | 'table'
  | 'rule'
  | 'campaign'
  | 'scene'
  | 'general';

export type PolzaArtStylePreset =
  | 'dnd_cinematic'
  | 'grimdark'
  | 'watercolor_rpg'
  | 'concept_art'
  | 'oil_painting'
  | 'realistic_photo'
  | 'anime_fantasy'
  | 'isometric_token'
  | 'retro_pixel';

export interface PolzaModelInfo {
  id: PolzaModelId;
  name: string;
  provider: string;
  description: string;
  isDefault?: boolean;
  recommendedFor: string;
  supportsTransparentBg?: boolean;
}

export interface PolzaEntityContext {
  type: PolzaEntityType;
  id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  system?: string;
  category?: string;
  // Specific attributes if available:
  race?: string;
  classType?: string;
  cr?: string;
  school?: string;
  rarity?: string;
  environment?: string;
  personality?: string;
  appearance?: string;
  equipment?: string;
  currentImageUrl?: string;
}

export interface PolzaGenerateRequest {
  model: PolzaModelId | string;
  prompt: string;
  size?: PolzaImageSize;
  quality?: PolzaQuality;
  style?: PolzaStyle;
  background?: PolzaBackground;
  response_format?: PolzaResponseFormat;
  customApiKey?: string;
  entityContext?: PolzaEntityContext;
  saveToDisk?: boolean;
}

export interface PolzaUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  cost_rub?: number;
  cost?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
}

export interface PolzaImageData {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
  localAssetUrl?: string;
  localFilePath?: string;
}

export interface PolzaGenerateResponse {
  success: boolean;
  created?: number;
  data?: PolzaImageData[];
  usage?: PolzaUsage;
  id?: string; // If async taskId returned
  status?: 'completed' | 'pending' | 'processing' | 'failed';
  error?: string;
  raw?: any;
}

export interface PolzaStatusResponse {
  success: boolean;
  id: string;
  status: 'completed' | 'pending' | 'processing' | 'failed';
  data?: PolzaImageData[];
  error?: string;
}

// === STRUCTURED JSON & TEXT GENERATION TYPES ===

export interface PolzaDataGenOptions {
  // Base prompt & context
  userPrompt: string;
  entityType: PolzaEntityType;
  systemId?: string;
  worldId?: string;

  // Specific entity parameters
  // Monster
  cr?: string;
  monsterSize?: string;
  monsterType?: string;
  alignment?: string;
  environment?: string;
  specialFeatures?: string;

  // NPC
  race?: string;
  classType?: string;
  gender?: string;
  professionRole?: string;
  socialStatus?: string;
  attitude?: string;
  faction?: string;

  // Item / Magic Item
  itemType?: string;
  rarity?: string;
  attunement?: boolean;
  schoolMagic?: string;

  // Spell
  spellLevel?: number | string;
  spellSchool?: string;
  classRestrictions?: string[];

  // Location / Map
  locationType?: string;
  mapDimensions?: string;
  dangerAtmosphere?: string;
  existingMapName?: string;
  existingMapUrl?: string;

  // Quest
  questCategory?: 'main' | 'side' | 'bounty' | 'faction' | 'personal';
  partyLevel?: number | string;

  // Campaign
  campaignSetting?: string;
  actsCount?: number;
  toneStyle?: string;

  // Rule
  ruleCategory?: string;
  targetSystem?: string;

  // Lore
  loreCategory?: string;
}

export interface PolzaDataGenRequest {
  model?: PolzaTextModelId;
  options: PolzaDataGenOptions;
  customApiKey?: string;
  temperature?: number;
  maxTokens?: number;
  autoSaveToDatabase?: boolean;
  generateImagePrompt?: boolean;
}

export interface PolzaDataGenResponse {
  success: boolean;
  entityType: PolzaEntityType;
  jsonData: any;
  rawText?: string;
  reasoning?: string;
  imagePrompt?: string;
  usage?: PolzaUsage;
  savedFilePath?: string;
  error?: string;
}

