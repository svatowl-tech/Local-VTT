import fs from 'fs';
import path from 'path';
import { ALL_REGEX_RULES, RegexTagRule } from './regexTagDictionary';

/**
 * TextTagExtractor:
 * Inspects file contents (JSON, MD, TXT, YAML, CSV, XML) and sidecar files to extract deep tags and metadata.
 */
export class TextTagExtractor {
  private static MAX_TEXT_SCAN_BYTES = 64 * 1024; // Scan up to 64KB for speed and low memory usage

  /**
   * Check if a file extension represents a readable text/data file
   */
  public static isInspectableTextFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.json', '.md', '.txt', '.yaml', '.yml', '.csv', '.xml', '.tsv', '.html', '.htm'].includes(ext);
  }

  /**
   * Extract tags from a text string or raw file buffer
   */
  public static extractTagsFromText(
    text: string,
    rules: RegexTagRule[] = ALL_REGEX_RULES
  ): { tags: string[]; extractedMetadata: Record<string, any> } {
    if (!text || text.trim().length === 0) {
      return { tags: [], extractedMetadata: {} };
    }

    const tagsSet = new Set<string>();
    const metadata: Record<string, any> = {};

    // 1. If text looks like JSON, try to extract structured fields first
    const trimmed = text.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const json = JSON.parse(text);
        this.extractFromJsonStructure(json, tagsSet, metadata);
      } catch (e) {
        // Fall back to plain regex scanning
      }
    }

    // 2. Scan text body with Regex rules (first 64KB of text)
    const scanChunk = text.slice(0, this.MAX_TEXT_SCAN_BYTES);
    for (const rule of rules) {
      // Test regex against text
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = regex.exec(scanChunk)) !== null && count < 5) {
        count++;
        if (rule.extractValue) {
          const val = rule.extractValue(match, scanChunk);
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

    // 3. Extract common Markdown headers (# Title, ## Section) as key tags
    if (text.includes('#')) {
      const headerMatches = text.match(/^#{1,3}\s+([^\n\r#]{3,40})/gm);
      if (headerMatches) {
        for (const h of headerMatches.slice(0, 5)) {
          const cleanHeader = h.replace(/^#{1,3}\s+/, '').trim();
          if (cleanHeader.length > 2 && cleanHeader.length < 35 && !/^[0-9\s.,-]+$/.test(cleanHeader)) {
            tagsSet.add(cleanHeader);
          }
        }
      }
    }

    return {
      tags: Array.from(tagsSet),
      extractedMetadata: metadata,
    };
  }

  /**
   * Safely read and extract tags from a file on disk
   */
  public static extractTagsFromFile(
    filePath: string,
    rules: RegexTagRule[] = ALL_REGEX_RULES
  ): { tags: string[]; extractedMetadata: Record<string, any> } {
    try {
      if (!fs.existsSync(filePath)) {
        return { tags: [], extractedMetadata: {} };
      }

      // If it's a media file (image/audio), check if a sidecar .json or .txt exists
      if (!this.isInspectableTextFile(filePath)) {
        const sidecarJson = filePath.replace(/\.[^/.]+$/, '.json');
        const sidecarTxt = filePath.replace(/\.[^/.]+$/, '.txt');
        const sidecarMd = filePath.replace(/\.[^/.]+$/, '.md');

        if (fs.existsSync(sidecarJson)) {
          return this.extractTagsFromFile(sidecarJson, rules);
        }
        if (fs.existsSync(sidecarTxt)) {
          return this.extractTagsFromFile(sidecarTxt, rules);
        }
        if (fs.existsSync(sidecarMd)) {
          return this.extractTagsFromFile(sidecarMd, rules);
        }
        return { tags: [], extractedMetadata: {} };
      }

      // Read text up to MAX_TEXT_SCAN_BYTES
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(this.MAX_TEXT_SCAN_BYTES);
      const bytesRead = fs.readSync(fd, buffer, 0, this.MAX_TEXT_SCAN_BYTES, 0);
      fs.closeSync(fd);

      const content = buffer.toString('utf8', 0, bytesRead);
      return this.extractTagsFromText(content, rules);
    } catch (err) {
      return { tags: [], extractedMetadata: {} };
    }
  }

  /**
   * Extract fields from recognized TTRPG JSON structures (Foundry, 5eTools, Roll20, GCS, Wiki)
   */
  private static extractFromJsonStructure(
    json: any,
    tagsSet: Set<string>,
    metadata: Record<string, any>
  ): void {
    if (!json || typeof json !== 'object') return;

    // Explicit tags array in JSON
    if (Array.isArray(json.tags)) {
      json.tags.forEach((t: any) => typeof t === 'string' && tagsSet.add(t));
    }
    if (Array.isArray(json.categories)) {
      json.categories.forEach((c: any) => typeof c === 'string' && tagsSet.add(c));
    }

    // Name / Title / Type
    if (typeof json.name === 'string') {
      tagsSet.add(json.name);
      metadata.name = json.name;
    }
    if (typeof json.type === 'string') {
      tagsSet.add(json.type);
      metadata.type = json.type;
    }
    if (typeof json.system === 'string') {
      tagsSet.add(json.system);
    }

    // Creature / Monster fields
    if (json.cr !== undefined) {
      const crTag = `CR ${json.cr}`;
      tagsSet.add(crTag);
      metadata.cr = json.cr;
    }
    if (json.level !== undefined || json.lvl !== undefined) {
      const lvl = json.level ?? json.lvl;
      const lvlTag = `Уровень ${lvl}`;
      tagsSet.add(lvlTag);
      tagsSet.add(`Lvl ${lvl}`);
      metadata.level = lvl;
    }
    if (json.school && typeof json.school === 'string') {
      tagsSet.add(`Школа: ${json.school}`);
      tagsSet.add(`School: ${json.school}`);
      metadata.school = json.school;
    }
    if (json.rarity && typeof json.rarity === 'string') {
      tagsSet.add(`Редкость: ${json.rarity}`);
      metadata.rarity = json.rarity;
    }
    if (json.alignment && typeof json.alignment === 'string') {
      tagsSet.add(json.alignment);
      metadata.alignment = json.alignment;
    }

    // Biome / Environment / Faction
    if (json.environment && Array.isArray(json.environment)) {
      json.environment.forEach((env: string) => tagsSet.add(env));
    }
    if (typeof json.faction === 'string') {
      tagsSet.add(json.faction);
    }
    if (typeof json.world === 'string') {
      tagsSet.add(json.world);
    }
    if (typeof json.gridDimensions === 'string') {
      tagsSet.add(json.gridDimensions);
      metadata.gridDimensions = json.gridDimensions;
    }

    // Foundry Actor / Item structure
    if (json.data?.details?.type?.value) {
      tagsSet.add(String(json.data.details.type.value));
    }
    if (json.data?.details?.cr) {
      tagsSet.add(`CR ${json.data.details.cr}`);
    }
  }
}
