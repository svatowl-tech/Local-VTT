export type SystemCategoryType =
  | 'monsters'
  | 'spells'
  | 'races'
  | 'classes'
  | 'items'
  | 'rules'
  | 'lore'
  | 'characters'
  | 'tables'
  | 'cyberware'
  | 'advantages'
  | 'skills'
  | 'feats'
  | 'ancestries'
  | 'occupations'
  | 'weapons'
  | 'equipment'
  | 'general'
  | 'custom';

export type DetectedSourceFormat =
  | 'foundry_actor'
  | 'foundry_item'
  | 'foundry_journal'
  | 'foundry_rolltable'
  | 'foundry_compendium'
  | 'foundry_cards'
  | 'foundry_macro'
  | 'roll20_character'
  | 'roll20_handout'
  | '5etools_monster'
  | '5etools_spell'
  | '5etools_item'
  | '5etools_compendium'
  | 'pathbuilder2e'
  | 'gurps_gcs'
  | 'cyberpunk_red'
  | 'call_of_cthulhu'
  | 'pdf_document'
  | 'text_statblock'
  | 'markdown_doc'
  | 'yaml_data'
  | 'xml_export'
  | 'csv_table'
  | 'generic_json'
  | 'json_lore'
  | 'wikitext'
  | 'text_lore'
  | 'epub'
  | 'zip_archive'
  | 'json'
  | 'text'
  | 'empty'
  | 'error';

export interface NormalizedAction {
  name: string;
  type?: 'action' | 'bonus' | 'reaction' | 'legendary' | 'spell' | 'attack' | 'passive' | 'special';
  toHit?: number | string;
  reach?: string;
  range?: string;
  damage?: string;
  damageType?: string;
  description: string;
  cost?: number;
}

export interface NormalizedTrait {
  name: string;
  description: string;
  type?: string;
}

export interface NormalizedStats {
  hp?: number;
  maxHp?: number;
  hitDice?: string;
  ac?: number | string;
  speed?: string | number;
  cr?: string | number;
  level?: number;
  xp?: number;
  initiativeBonus?: number;
  attributes?: Record<string, number | string>;
  saves?: Record<string, number | string>;
  skills?: Record<string, number | string>;
  senses?: string;
  languages?: string;
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  proficiencyBonus?: number;
  school?: string;
  time?: any;
  range?: any;
  components?: any;
  duration?: any;
  classes?: any;
  roll?: any;
}

export interface UniversalParsedEntity {
  id: string;
  name: string;
  originalName?: string;
  category: SystemCategoryType | string;
  sourceFormat: DetectedSourceFormat;
  sourceSystem?: string;
  summary: string;
  description?: string;
  tags: string[];
  img?: string;
  tokenImg?: string;
  stats?: NormalizedStats;
  actions?: NormalizedAction[];
  traits?: NormalizedTrait[];
  spells?: Array<{ name: string; level?: number; school?: string; description?: string }>;
  items?: Array<{ name: string; quantity?: number; weight?: number; description?: string }>;
  tableData?: {
    headers?: string[];
    rows?: string[][];
    formula?: string;
    results?: Array<{ range: [number, number]; text: string }>;
  };
  pdfSource?: {
    pageNumber: number;
    totalPages?: number;
    section?: string;
  };
  rawContent?: any;
  suggestedFilename: string;
}

export interface UniversalParseResult {
  success: boolean;
  sourceFormat: DetectedSourceFormat;
  formatDescription: string;
  totalEntitiesFound: number;
  entities: UniversalParsedEntity[];
  errors: string[];
  warnings: string[];
  stats: {
    charactersCount: number;
    monstersCount: number;
    spellsCount: number;
    itemsCount: number;
    rulesCount: number;
    tablesCount: number;
    otherCount: number;
  };
}

export interface SystemDataItem {
  id: string;
  systemId: string;
  category: string;
  name: string;
  source?: string;
  format: 'json' | 'yaml' | 'yml' | 'md' | 'txt' | 'pdf' | 'xml' | 'csv';
  fileSize: number;
  mtime: number;
  relativePath: string;
  img?: string;
  tokenImg?: string;
  summary?: string;
  tags: string[];
  attributes?: Record<string, any>;
  data?: any;
}

export interface SystemCategorySummary {
  category: string;
  label: string;
  icon: string;
  count: number;
  items?: SystemDataItem[];
}

export interface TTRPGSystemManifest {
  id: string;
  name: string;
  shortName: string;
  folderName: string;
  description: string;
  version?: string;
  author?: string;
  icon: string;
  color: string;
  categories: string[];
  totalFiles: number;
  categoryStats: Record<string, number>;
  isActive?: boolean;
}

export interface SystemsScanResult {
  systems: TTRPGSystemManifest[];
  activeSystemId: string;
  totalSystemsCount: number;
  totalSystemFilesCount: number;
  lastScannedAt: number;
}
