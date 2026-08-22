import path from 'path';
import YAML from 'yaml';
import { DetectedSourceFormat, ParserInput } from './types';

export class FormatDetector {
  /**
   * Fast detection of file format and TTRPG schema
   */
  public static detect(input: ParserInput): DetectedSourceFormat {
    const ext = path.extname(input.filename || '').toLowerCase();

    // 1. PDF
    if (ext === '.pdf') {
      return 'pdf_document';
    }

    // 2. CSV / TSV
    if (ext === '.csv' || ext === '.tsv') {
      return 'csv_table';
    }

    // 3. XML
    if (ext === '.xml' || ext === '.gcs') {
      return 'xml_export';
    }

    // 4. YAML / JSON / NeDB inspection
    const isYaml = ext === '.yaml' || ext === '.yml';
    if (isYaml || ext === '.json' || ext === '.db' || ext === '.jsonl' || ext === '.nedb' || input.parsedJson || input.rawText) {
      let data = input.parsedJson;
      if (!data && input.rawText) {
        if (isYaml) {
          try {
            data = YAML.parse(input.rawText);
          } catch {
            // ignore
          }
        } else {
          data = this.tryParseJson(input.rawText);
        }
      }

      if (data) {
        // Extract sample doc if array or wrapper
        const docs = this.extractDocs(data);
        const sample = docs[0] || data;

        if (sample && typeof sample === 'object') {
          // Foundry VTT Actor
          if (
            (sample.type === 'character' || sample.type === 'npc' || sample.type === 'vehicle' || sample.type === 'creature' || sample.type === 'group') &&
            (sample.system || sample.data || sample.prototypeToken || sample.items || sample.attributes)
          ) {
            return docs.length > 1 ? 'foundry_compendium' : 'foundry_actor';
          }

          // Foundry VTT Item
          if (
            (sample.type === 'weapon' ||
              sample.type === 'spell' ||
              sample.type === 'equipment' ||
              sample.type === 'feat' ||
              sample.type === 'consumable' ||
              sample.type === 'loot' ||
              sample.type === 'class' ||
              sample.type === 'subclass' ||
              sample.type === 'race' ||
              sample.type === 'background' ||
              sample.type === 'tool' ||
              sample.type === 'backpack' ||
              sample.type === 'container') &&
            (sample.system || sample.data)
          ) {
            return docs.length > 1 ? 'foundry_compendium' : 'foundry_item';
          }

          // Foundry Journal Entry
          if ((sample.pages && Array.isArray(sample.pages)) || sample.type === 'JournalEntry' || (sample.content && sample._id)) {
            return docs.length > 1 ? 'foundry_compendium' : 'foundry_journal';
          }

          // Foundry RollTable
          if (
            (sample.results && Array.isArray(sample.results)) ||
            sample.type === 'rolltable' ||
            sample.type === 'RollTable'
          ) {
            return docs.length > 1 ? 'foundry_compendium' : 'foundry_rolltable';
          }

          // Foundry Cards / Decks
          if (sample.cards && Array.isArray(sample.cards)) {
            return 'foundry_compendium';
          }

          // Foundry Compendium Wrapper
          if (sample.system !== undefined || sample.data !== undefined || sample._id !== undefined) {
            if (docs.length > 1) {
              return 'foundry_compendium';
            }
          }
        }

        // 5eTools & Compendium format (spells, monsters, items)
        if (
          data.monster ||
          data.monsters ||
          (Array.isArray(data) && data.some((x: any) => x && (x.cr !== undefined || x.hp !== undefined)))
        ) {
          return '5etools_monster';
        }
        if (
          data.spell ||
          data.spells ||
          (Array.isArray(data) && data.some((x: any) => x && (x.level !== undefined || x.school !== undefined)))
        ) {
          return '5etools_spell';
        }
        if (
          data.item ||
          data.items ||
          (Array.isArray(data) && data.some((x: any) => x && (x.rarity !== undefined || x.weight !== undefined)))
        ) {
          return '5etools_item';
        }
        if (data.compendium || data._meta || data.class || data.race || data.background || data.feat || data.table) {
          return '5etools_compendium';
        }

        // Roll20 Character JSON Export
        if (data.schema_version && (data.attribs || data.abilities) && Array.isArray(data.attribs)) {
          return 'roll20_character';
        }
        if (data.attributes && Array.isArray(data.attributes) && data.name && data.bio !== undefined) {
          return 'roll20_character';
        }

        // Pathbuilder 2e
        if (data.success && data.build && data.build.ancestry && data.build.class) {
          return 'pathbuilder2e';
        }

        // GURPS GCS (JSON)
        if (data.type === 'character' && data.profile && data.attributes && data.traits) {
          return 'gurps_gcs';
        }

        if (isYaml) {
          return 'yaml_data';
        }
        return 'generic_json';
      }
    }

    // 6. Plain Text / Markdown inspection
    if (ext === '.md' || ext === '.markdown' || ext === '.txt' || input.rawText) {
      const text = input.rawText || '';
      if (
        (text.includes('Armor Class') || text.includes('Класс доспеха') || text.includes('AC ')) &&
        (text.includes('Hit Points') || text.includes('Хиты') || text.includes('HP ')) &&
        (text.includes('STR') || text.includes('СИЛ') || text.includes('Strength') || text.includes('Speed'))
      ) {
        return 'text_statblock';
      }

      if (text.startsWith('---') && text.includes('---')) {
        return 'markdown_doc';
      }

      if (ext === '.md' || ext === '.markdown') {
        return 'markdown_doc';
      }

      return 'text_statblock';
    }

    return 'generic_json';
  }

  private static extractDocs(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (typeof data === 'object') {
      if (Array.isArray(data.entries)) return data.entries;
      if (Array.isArray(data.docs)) return data.docs;
      if (Array.isArray(data.data) && data.data.some((x: any) => x && typeof x === 'object')) return data.data;
      const values = Object.values(data);
      if (values.length > 0 && values.every((v: any) => v && typeof v === 'object' && (v._id || v.name || v.type))) {
        return values;
      }
      return [data];
    }
    return [];
  }

  private static tryParseJson(text?: string): any {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue to NDJSON / NeDB
    }

    // NDJSON / NeDB (.db files) line by line
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && (l.startsWith('{') || l.startsWith('[')));
    if (lines.length > 0) {
      const items: any[] = [];
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed && typeof parsed === 'object') items.push(parsed);
        } catch {
          // ignore invalid lines
        }
      }
      if (items.length > 0) return items;
    }

    return null;
  }
}

