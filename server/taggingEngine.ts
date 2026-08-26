import {
  ALL_REGEX_RULES,
  MAP_REGEX_RULES,
  SET_REGEX_RULES,
  TOKEN_REGEX_RULES,
  MUSIC_REGEX_RULES,
  OTHER_REGEX_RULES,
  RegexTagRule,
  CATEGORY_DEFINITIONS,
} from './regexTagDictionary';
import { TextTagExtractor } from './textTagExtractor';

export interface TaggedAssetItem {
  id: string;
  name: string;
  category: string; // Subcategory / folder name
  primaryCategory: 'maps' | 'sets' | 'tokens' | 'music' | 'other';
  section: string; // 'maps' | 'props' | 'music' | 'sfx' | 'effects' | 'systems' | 'lore' | 'data'
  url: string;
  path: string;
  tags: string[];
  metadata?: Record<string, any>;
  fileSize?: number;
  lastModified?: number;
}

export interface TagFacet {
  tag: string;
  count: number;
  category: 'maps' | 'sets' | 'tokens' | 'music' | 'other';
}

export interface SearchAssetsOptions {
  query?: string;
  tags?: string[];
  category?: 'all' | 'maps' | 'sets' | 'tokens' | 'music' | 'other';
  section?: string;
  matchMode?: 'and' | 'or';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  items: TaggedAssetItem[];
  total: number;
  facets: TagFacet[];
  queryTimeMs: number;
}

/**
 * Main Tagging and Inverted Index Search Engine
 */
export class TaggingEngine {
  private static instance: TaggingEngine;

  // Inverted index: tag (lowercase) -> Set of asset IDs
  private tagIndex = new Map<string, Set<string>>();
  
  // Category index: category -> Set of asset IDs
  private categoryIndex = new Map<string, Set<string>>();
  
  // Storage of indexed assets by ID
  private assetStore = new Map<string, TaggedAssetItem>();

  public static getInstance(): TaggingEngine {
    if (!TaggingEngine.instance) {
      TaggingEngine.instance = new TaggingEngine();
    }
    return TaggingEngine.instance;
  }

  /**
   * Determine primary category from section, path, and filename
   */
  public determinePrimaryCategory(
    section: string,
    relativePath: string,
    fileName: string
  ): 'maps' | 'sets' | 'tokens' | 'music' | 'other' {
    const lowerSec = (section || '').toLowerCase();
    const lowerPath = (relativePath + ' ' + fileName).toLowerCase();

    if (lowerSec === 'maps') return 'maps';
    if (lowerSec === 'music') return 'music';

    if (lowerSec === 'props') {
      if (
        lowerPath.includes('token') ||
        lowerPath.includes('monster') ||
        lowerPath.includes('npc') ||
        lowerPath.includes('creature') ||
        lowerPath.includes('character') ||
        lowerPath.includes('монстр') ||
        lowerPath.includes('токен') ||
        lowerPath.includes('персонаж')
      ) {
        return 'tokens';
      }
      if (
        lowerPath.includes('tileset') ||
        lowerPath.includes('set') ||
        lowerPath.includes('pack') ||
        lowerPath.includes('modular') ||
        lowerPath.includes('building') ||
        lowerPath.includes('тайл') ||
        lowerPath.includes('сет') ||
        lowerPath.includes('набор')
      ) {
        return 'sets';
      }
      return 'other';
    }

    if (lowerSec === 'sfx' || lowerSec === 'effects' || lowerSec === 'systems' || lowerSec === 'lore' || lowerSec === 'data') {
      return 'other';
    }

    // Default inspection
    if (/\b(?:map|карта|dungeon|battlemap|wilderness)\b/i.test(lowerPath)) return 'maps';
    if (/\b(?:token|миниатюр|персонаж|npc|monster)\b/i.test(lowerPath)) return 'tokens';
    if (/\b(?:tileset|тайл|pack|конструктор)\b/i.test(lowerPath)) return 'sets';
    if (/\b(?:track|soundtrack|ost|песня|музыка)\b/i.test(lowerPath)) return 'music';

    return 'other';
  }

  /**
   * Automatically generate comprehensive tags for an asset
   */
  public autoTag(
    fileName: string,
    relativePath: string,
    section: string,
    fullDiskPath?: string,
    contentText?: string
  ): { tags: string[]; primaryCategory: 'maps' | 'sets' | 'tokens' | 'music' | 'other'; metadata: Record<string, any> } {
    const primaryCategory = this.determinePrimaryCategory(section, relativePath, fileName);
    const tagsSet = new Set<string>();
    const metadata: Record<string, any> = {};

    const cleanName = fileName.replace(/\.[^/.]+$/, '');
    const combinedText = `${fileName} ${relativePath} ${section} ${cleanName}`.toLowerCase();

    // 1. Add category and section basic tags
    const categoryDef = CATEGORY_DEFINITIONS[primaryCategory];
    if (categoryDef) {
      tagsSet.add(categoryDef.titleRu);
      tagsSet.add(categoryDef.titleEn);
    }

    // Extract subfolders from path as immediate tags
    const pathParts = relativePath.split(/[/\\]/).filter(p => p.trim() && p !== fileName && !p.startsWith('.'));
    for (const part of pathParts) {
      const cleanPart = part.replace(/[_-]+/g, ' ').trim();
      if (cleanPart.length > 1 && cleanPart.toLowerCase() !== 'assets') {
        tagsSet.add(cleanPart);
      }
    }

    // 2. Select relevant regex rule sets (category-specific + all)
    let candidateRules: RegexTagRule[] = ALL_REGEX_RULES;
    if (primaryCategory === 'maps') {
      candidateRules = [...MAP_REGEX_RULES, ...OTHER_REGEX_RULES];
    } else if (primaryCategory === 'sets') {
      candidateRules = [...SET_REGEX_RULES, ...MAP_REGEX_RULES];
    } else if (primaryCategory === 'tokens') {
      candidateRules = [...TOKEN_REGEX_RULES, ...OTHER_REGEX_RULES];
    } else if (primaryCategory === 'music') {
      candidateRules = [...MUSIC_REGEX_RULES, ...OTHER_REGEX_RULES];
    } else {
      candidateRules = [...OTHER_REGEX_RULES, ...MAP_REGEX_RULES, ...TOKEN_REGEX_RULES];
    }

    // 3. Scan combined path & filename with Regex rules
    for (const rule of candidateRules) {
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
      const match = regex.exec(combinedText);
      if (match) {
        if (rule.extractValue) {
          const val = rule.extractValue(match, combinedText);
          if (val) {
            tagsSet.add(val);
            if (rule.subCategory) {
              metadata[rule.subCategory] = val;
            }
          }
        } else {
          tagsSet.add(rule.tagRu);
          tagsSet.add(rule.tagEn);
        }
      }
    }

    // 4. Extract deep text tags if content or inspectable disk file is available
    if (contentText && contentText.length > 0) {
      const textResult = TextTagExtractor.extractTagsFromText(contentText, candidateRules);
      textResult.tags.forEach(t => tagsSet.add(t));
      Object.assign(metadata, textResult.extractedMetadata);
    } else if (fullDiskPath) {
      const diskResult = TextTagExtractor.extractTagsFromFile(fullDiskPath, candidateRules);
      diskResult.tags.forEach(t => tagsSet.add(t));
      Object.assign(metadata, diskResult.extractedMetadata);
    }

    // 5. Fallback if empty
    if (tagsSet.size === 0) {
      tagsSet.add('Общее');
      tagsSet.add('General');
    }

    return {
      tags: Array.from(tagsSet),
      primaryCategory,
      metadata,
    };
  }

  /**
   * Reset / clear index
   */
  public clearIndex(): void {
    this.tagIndex.clear();
    this.categoryIndex.clear();
    this.assetStore.clear();
  }

  /**
   * Add or update an asset in the inverted index
   */
  public indexAsset(asset: TaggedAssetItem): void {
    this.assetStore.set(asset.id, asset);

    // Index primary category
    if (!this.categoryIndex.has(asset.primaryCategory)) {
      this.categoryIndex.set(asset.primaryCategory, new Set());
    }
    this.categoryIndex.get(asset.primaryCategory)!.add(asset.id);

    // Index all tags
    for (const rawTag of asset.tags) {
      const normTag = rawTag.toLowerCase().trim();
      if (!normTag) continue;

      if (!this.tagIndex.has(normTag)) {
        this.tagIndex.set(normTag, new Set());
      }
      this.tagIndex.get(normTag)!.add(asset.id);
    }
  }

  /**
   * High-speed inverted index search and multi-tag filtering
   */
  public search(options: SearchAssetsOptions = {}): SearchResult {
    const startTime = performance.now();
    const {
      query = '',
      tags = [],
      category = 'all',
      section,
      matchMode = 'and',
      limit = 100,
      offset = 0,
    } = options;

    let candidateIds: Set<string> | null = null;

    // 1. Filter by category
    if (category && category !== 'all') {
      const catSet = this.categoryIndex.get(category);
      if (catSet) {
        candidateIds = new Set(catSet);
      } else {
        return { items: [], total: 0, facets: [], queryTimeMs: performance.now() - startTime };
      }
    }

    // 2. Filter by Tags via Inverted Index
    if (tags.length > 0) {
      if (matchMode === 'and') {
        for (const rawTag of tags) {
          const normTag = rawTag.toLowerCase().trim();
          const tagSet = this.tagIndex.get(normTag) || new Set<string>();
          if (!candidateIds) {
            candidateIds = new Set(tagSet);
          } else {
            // Intersection
            for (const id of Array.from(candidateIds)) {
              if (!tagSet.has(id)) {
                candidateIds.delete(id);
              }
            }
          }
          if (candidateIds.size === 0) break;
        }
      } else {
        // OR mode
        const unionSet = new Set<string>();
        for (const rawTag of tags) {
          const normTag = rawTag.toLowerCase().trim();
          const tagSet = this.tagIndex.get(normTag);
          if (tagSet) {
            tagSet.forEach(id => {
              if (!candidateIds || candidateIds.has(id)) {
                unionSet.add(id);
              }
            });
          }
        }
        candidateIds = unionSet;
      }
    }

    // 3. Fallback to all assets if no category/tag constraint
    if (!candidateIds) {
      candidateIds = new Set(this.assetStore.keys());
    }

    // 4. Filter by text query and section
    const cleanQuery = query.toLowerCase().trim();
    const matchedAssets: TaggedAssetItem[] = [];

    for (const id of Array.from(candidateIds)) {
      const asset = this.assetStore.get(id);
      if (!asset) continue;

      if (section && asset.section !== section) continue;

      if (cleanQuery) {
        const nameMatch = asset.name.toLowerCase().includes(cleanQuery);
        const pathMatch = asset.path.toLowerCase().includes(cleanQuery);
        const tagMatch = asset.tags.some(t => t.toLowerCase().includes(cleanQuery));

        if (!nameMatch && !pathMatch && !tagMatch) {
          continue;
        }
      }

      matchedAssets.push(asset);
    }

    // 5. Calculate facets (tag distribution among matched assets)
    const facetCounts = new Map<string, { count: number; category: 'maps' | 'sets' | 'tokens' | 'music' | 'other' }>();
    for (const asset of matchedAssets) {
      for (const t of asset.tags) {
        const existing = facetCounts.get(t);
        if (existing) {
          existing.count++;
        } else {
          facetCounts.set(t, { count: 1, category: asset.primaryCategory });
        }
      }
    }

    const facets: TagFacet[] = Array.from(facetCounts.entries())
      .map(([tag, data]) => ({ tag, count: data.count, category: data.category }))
      .sort((a, b) => b.count - a.count);

    // 6. Pagination
    const total = matchedAssets.length;
    const paginatedItems = matchedAssets.slice(offset, offset + limit);

    return {
      items: paginatedItems,
      total,
      facets,
      queryTimeMs: Number((performance.now() - startTime).toFixed(2)),
    };
  }

  /**
   * Get all registered tags with counts and categorized groups
   */
  public getTagSummary(): {
    totalTags: number;
    totalAssets: number;
    categories: Record<string, TagFacet[]>;
  } {
    const summary: Record<string, Map<string, number>> = {
      maps: new Map(),
      sets: new Map(),
      tokens: new Map(),
      music: new Map(),
      other: new Map(),
    };

    for (const asset of this.assetStore.values()) {
      const cat = asset.primaryCategory || 'other';
      const catMap = summary[cat] || summary.other;

      for (const tag of asset.tags) {
        catMap.set(tag, (catMap.get(tag) || 0) + 1);
      }
    }

    const categoriesResult: Record<string, TagFacet[]> = {};
    for (const [cat, map] of Object.entries(summary)) {
      categoriesResult[cat] = Array.from(map.entries())
        .map(([tag, count]) => ({
          tag,
          count,
          category: cat as any,
        }))
        .sort((a, b) => b.count - a.count);
    }

    return {
      totalTags: this.tagIndex.size,
      totalAssets: this.assetStore.size,
      categories: categoriesResult,
    };
  }
}

export const taggingEngine = TaggingEngine.getInstance();
