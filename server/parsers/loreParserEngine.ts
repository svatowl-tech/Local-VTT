import JSZip from 'jszip';
import * as pdfParseModule from 'pdf-parse';
const pdfParse = (pdfParseModule as any).default || pdfParseModule;
import { UniversalParseResult, UniversalParsedEntity } from './types';

export interface LoreParseOptions {
  filename: string;
  rawBuffer?: Buffer;
  rawText?: string;
  targetWorldId?: string;
  targetSystemId?: string;
}

export class LoreParserEngine {
  /**
   * Universal, high-speed, non-blocking parser for PDF, ZIP, Wiki, EPUB, JSON and Text files.
   */
  public async parseLoreFile(options: LoreParseOptions): Promise<UniversalParseResult> {
    const filename = options.filename || 'document.txt';
    const lowerFname = filename.toLowerCase();
    const systemId = options.targetSystemId || 'dnd5e';
    const worldId = options.targetWorldId || 'dnd5e_faerun';

    const entities: UniversalParsedEntity[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. ZIP Archives (.zip, .epub)
      if (lowerFname.endsWith('.zip') || lowerFname.endsWith('.epub')) {
        if (!options.rawBuffer) {
          throw new Error('Для обработки ZIP/EPUB архива требуются бинарные данные (buffer)');
        }
        return await this.parseZipOrEpubBuffer(options.rawBuffer, filename, systemId, worldId);
      }

      // 2. PDF Documents (.pdf)
      if (lowerFname.endsWith('.pdf')) {
        if (!options.rawBuffer) {
          throw new Error('Для обработки PDF требуются бинарные данные (buffer)');
        }
        return await this.parsePdfBuffer(options.rawBuffer, filename, systemId, worldId);
      }

      // 3. Text / Wiki / JSON Content
      let rawText = options.rawText || '';
      if (!rawText && options.rawBuffer) {
        rawText = options.rawBuffer.toString('utf8');
      }

      if (!rawText.trim()) {
        return {
          success: false,
          sourceFormat: 'empty',
          formatDescription: 'Пустой файл',
          totalEntitiesFound: 0,
          entities: [],
          errors: ['Файл не содержит текста для анализа'],
          warnings: [],
          stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: 0, tablesCount: 0, otherCount: 0 },
        };
      }

      // JSON Parsing check
      if (rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          const json = JSON.parse(rawText);
          const jsonEntities = this.parseJsonLoreEntities(json, systemId, worldId);
          if (jsonEntities.length > 0) {
            return {
              success: true,
              sourceFormat: 'json_lore',
              formatDescription: 'JSON Lore & World Data',
              totalEntitiesFound: jsonEntities.length,
              entities: jsonEntities,
              errors: [],
              warnings: [],
              stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: jsonEntities.length, tablesCount: 0, otherCount: 0 },
            };
          }
        } catch (e) {
          // Fall through to text/wiki
        }
      }

      // Wiki / MediaWiki parsing check
      if (lowerFname.endsWith('.wiki') || lowerFname.endsWith('.mediawiki') || rawText.includes('==') || rawText.includes('[[')) {
        const wikiEntities = this.parseWikitextContent(rawText, filename, systemId, worldId);
        if (wikiEntities.length > 0) {
          return {
            success: true,
            sourceFormat: 'wikitext',
            formatDescription: 'Wiki / MediaWiki Document Parser',
            totalEntitiesFound: wikiEntities.length,
            entities: wikiEntities,
            errors: [],
            warnings: [],
            stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: wikiEntities.length, tablesCount: 0, otherCount: 0 },
          };
        }
      }

      // Markdown / Plain Text section parsing
      const textEntities = this.parseTextSections(rawText, filename, systemId, worldId);
      return {
        success: true,
        sourceFormat: 'text_lore',
        formatDescription: 'Universal Text & Markdown Lore Parser',
        totalEntitiesFound: textEntities.length,
        entities: textEntities,
        errors: [],
        warnings: [],
        stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: textEntities.length, tablesCount: 0, otherCount: 0 },
      };
    } catch (err: any) {
      return {
        success: false,
        sourceFormat: 'error',
        formatDescription: 'Ошибка обработки файла',
        totalEntitiesFound: 0,
        entities: [],
        errors: [err.message || 'Сбой парсера лора'],
        warnings,
        stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: 0, tablesCount: 0, otherCount: 0 },
      };
    }
  }

  /**
   * ZIP and EPUB Archive extractor and parser
   */
  private async parseZipOrEpubBuffer(
    buffer: Buffer,
    filename: string,
    systemId: string,
    worldId: string
  ): Promise<UniversalParseResult> {
    const zip = await JSZip.loadAsync(buffer);
    const allEntities: UniversalParsedEntity[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const fileKeys = Object.keys(zip.files).filter(
      (k) => !zip.files[k].dir && !k.startsWith('__MACOSX') && !k.startsWith('.')
    );

    let processedCount = 0;

    for (const key of fileKeys) {
      const entry = zip.files[key];
      const lowerKey = key.toLowerCase();

      // Only parse supported text-like or pdf extensions
      if (
        lowerKey.endsWith('.json') ||
        lowerKey.endsWith('.md') ||
        lowerKey.endsWith('.txt') ||
        lowerKey.endsWith('.wiki') ||
        lowerKey.endsWith('.mediawiki') ||
        lowerKey.endsWith('.html') ||
        lowerKey.endsWith('.xhtml') ||
        lowerKey.endsWith('.xml') ||
        lowerKey.endsWith('.yaml') ||
        lowerKey.endsWith('.yml') ||
        lowerKey.endsWith('.csv')
      ) {
        try {
          const contentStr = await entry.async('string');
          if (lowerKey.endsWith('.json')) {
            try {
              const json = JSON.parse(contentStr);
              const jsonEnts = this.parseJsonLoreEntities(json, systemId, worldId);
              allEntities.push(...jsonEnts);
            } catch (e) {
              const textEnts = this.parseTextSections(contentStr, key, systemId, worldId);
              allEntities.push(...textEnts);
            }
          } else if (lowerKey.endsWith('.wiki') || lowerKey.endsWith('.mediawiki') || contentStr.includes('==')) {
            const wikiEnts = this.parseWikitextContent(contentStr, key, systemId, worldId);
            allEntities.push(...wikiEnts);
          } else {
            // Strip HTML/XHTML if chapter file in EPUB
            let cleanStr = contentStr;
            if (lowerKey.endsWith('.html') || lowerKey.endsWith('.xhtml')) {
              cleanStr = contentStr
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi, '\n# $1\n')
                .replace(/<p[^>]*>/gi, '\n')
                .replace(/<[^>]+>/g, ' ')
                .replace(/&nbsp;/g, ' ')
                .replace(/&gt;/g, '>')
                .replace(/&lt;/g, '<')
                .replace(/&amp;/g, '&');
            }
            const textEnts = this.parseTextSections(cleanStr, key, systemId, worldId);
            allEntities.push(...textEnts);
          }
          processedCount++;
        } catch (fileErr: any) {
          warnings.push(`Не удалось спарсить файл "${key}" из архива: ${fileErr.message}`);
        }
      }
    }

    return {
      success: allEntities.length > 0,
      sourceFormat: filename.toLowerCase().endsWith('.epub') ? 'epub' : 'zip_archive',
      formatDescription: `Архив ${filename} (распаковано файлов: ${processedCount})`,
      totalEntitiesFound: allEntities.length,
      entities: allEntities,
      errors,
      warnings,
      stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: allEntities.length, tablesCount: 0, otherCount: 0 },
    };
  }

  /**
   * PDF Document Parser
   */
  private async parsePdfBuffer(
    buffer: Buffer,
    filename: string,
    systemId: string,
    worldId: string
  ): Promise<UniversalParseResult> {
    try {
      const pdfData = await pdfParse(buffer);
      const text = pdfData.text || '';
      const entities = this.parseTextSections(text, filename, systemId, worldId);

      return {
        success: entities.length > 0,
        sourceFormat: 'pdf_document',
        formatDescription: `PDF Документ (${pdfData.numpages || 1} страниц)`,
        totalEntitiesFound: entities.length,
        entities,
        errors: [],
        warnings: [],
        stats: { charactersCount: 0, monstersCount: 0, spellsCount: 0, itemsCount: 0, rulesCount: entities.length, tablesCount: 0, otherCount: 0 },
      };
    } catch (err: any) {
      throw new Error(`Ошибка считывания PDF: ${err.message || err}`);
    }
  }

  /**
   * Parses JSON structure into Lore entities
   */
  private parseJsonLoreEntities(json: any, systemId: string, worldId: string): UniversalParsedEntity[] {
    let items: any[] = [];
    if (Array.isArray(json)) {
      items = json;
    } else if (json.compendium) {
      const c = json.compendium;
      items = [
        ...(Array.isArray(c.spell) ? c.spell : c.spell ? [c.spell] : []),
        ...(Array.isArray(c.spells) ? c.spells : []),
        ...(Array.isArray(c.monster) ? c.monster : c.monster ? [c.monster] : []),
        ...(Array.isArray(c.monsters) ? c.monsters : []),
        ...(Array.isArray(c.item) ? c.item : c.item ? [c.item] : []),
        ...(Array.isArray(c.items) ? c.items : []),
        ...(Array.isArray(c.articles) ? c.articles : []),
        ...(Array.isArray(c.lore) ? c.lore : []),
      ];
    } else if (json.spell || json.spells || json.monster || json.monsters || json.item || json.items) {
      items = [
        ...(Array.isArray(json.spell) ? json.spell : json.spell ? [json.spell] : []),
        ...(Array.isArray(json.spells) ? json.spells : []),
        ...(Array.isArray(json.monster) ? json.monster : json.monster ? [json.monster] : []),
        ...(Array.isArray(json.monsters) ? json.monsters : []),
        ...(Array.isArray(json.item) ? json.item : json.item ? [json.item] : []),
        ...(Array.isArray(json.items) ? json.items : []),
      ];
    } else if (typeof json === 'object' && json !== null) {
      if (json.items || json.lore || json.articles) {
        items = json.items || json.lore || json.articles;
      } else {
        // Check if key-value dictionary object of rules/sections
        const entries = Object.entries(json).filter(([k]) => !k.startsWith('_') && k !== '$schema');
        if (entries.length > 0 && !json.name && !json.title) {
          return entries.map(([key, val], idx) => {
            const name = key.replace(/^[\*\#\_ ]+/, '').replace(/[\*\#\_ ]+$/, '').trim() || key;
            const obj = val as any;
            const description =
              typeof val === 'string'
                ? val
                : Array.isArray(val)
                ? val.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('\n\n')
                : typeof val === 'object' && val
                ? (obj.entries
                    ? Array.isArray(obj.entries)
                      ? obj.entries.join('\n\n')
                      : String(obj.entries)
                    : obj.content
                    ? Array.isArray(obj.content)
                      ? obj.content.join('\n\n')
                      : String(obj.content)
                    : JSON.stringify(val, null, 2))
                : String(val);

            return {
              id: `lore-json-${name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}-${idx + 1}`,
              name,
              category: 'lore',
              sourceFormat: 'json',
              sourceSystem: systemId,
              summary: description.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...',
              description,
              tags: ['JSON', 'Lore'],
              rawContent: { key, value: val, worldId, systemId },
              suggestedFilename: `lore_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`,
            };
          });
        } else {
          items = [json];
        }
      }
    }

    const entities: UniversalParsedEntity[] = [];

    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;

      const name = item.name || item.title || `Запись #${idx + 1}`;
      let category = item.category;

      if (!category) {
        if (item.level !== undefined || item.school || item.components || item.duration) {
          category = 'spells';
        } else if (item.cr !== undefined || item.ac || item.hp) {
          category = 'monsters';
        } else if (item.rarity || item.weight || item.value || item.type === 'weapon' || item.type === 'armor') {
          category = 'items';
        } else {
          category = this.detectCategoryFromText(JSON.stringify(item));
        }
      }

      const summary =
        item.summary ||
        item.snippet ||
        (category === 'spells'
          ? `${item.level === 0 ? 'Заговор' : `${item.level || 1}-й круг`}, ${item.school || 'магия'}`
          : item.content
          ? item.content.substring(0, 160)
          : '');

      const description =
        item.content ||
        item.description ||
        (Array.isArray(item.entries) ? item.entries.join('\n\n') : '') ||
        (Array.isArray(item.text) ? item.text.join('\n\n') : '') ||
        JSON.stringify(item, null, 2);

      entities.push({
        id: item.id ? `${item.id}-${idx + 1}` : `lore-json-${Date.now()}-${idx + 1}`,
        name,
        originalName: item.originalName || item.name,
        category,
        sourceFormat: 'json',
        sourceSystem: systemId,
        summary,
        description,
        tags: Array.isArray(item.tags) ? item.tags : ['JSON', category],
        rawContent: {
          ...item,
          worldId,
          systemId,
        },
        suggestedFilename: `lore_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`,
      });
    });

    return entities;
  }

  /**
   * Wikitext markup cleaner and article extractor
   */
  private parseWikitextContent(rawText: string, filename: string, systemId: string, worldId: string): UniversalParsedEntity[] {
    const clean = rawText
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\{\{[\s\S]*?\}\}/g, '') // strip templates
      .replace(/'''''/g, '')
      .replace(/'''/g, '**')
      .replace(/''/g, '*');

    return this.parseTextSections(clean, filename, systemId, worldId);
  }

  /**
   * Section splitter and Lore entity classifier
   */
  private parseTextSections(rawText: string, filename: string, systemId: string, worldId: string): UniversalParsedEntity[] {
    const sections = rawText.split(/(?=\n#{1,3}\s+)|(?=\n==+\s+)/g);
    const entities: UniversalParsedEntity[] = [];

    sections.forEach((sec, idx) => {
      const trimmed = sec.trim();
      if (!trimmed) return;

      const lines = trimmed.split('\n');
      const header = lines[0].replace(/^[#=]+\s*/, '').replace(/\s*=+$/, '').trim();
      const body = lines.slice(1).join('\n').trim();

      const title = header || `Раздел Документа #${idx + 1}`;
      const category = this.detectCategoryFromText(trimmed);

      entities.push({
        id: `lore-sec-${Date.now()}-${idx}`,
        name: title,
        originalName: title,
        category,
        sourceFormat: 'text',
        sourceSystem: systemId,
        summary: body.substring(0, 180) + '...',
        description: body || trimmed,
        tags: ['Лор', category],
        rawContent: {
          worldId,
          systemId,
          sourceFile: filename,
        },
        suggestedFilename: `lore_item_${idx}.json`,
      });
    });

    return entities;
  }

  private detectCategoryFromText(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('континент') || lower.includes('империя') || lower.includes('королевство') || lower.includes('страна') || lower.includes('continent') || lower.includes('empire') || lower.includes('kingdom')) {
      return 'continent_country';
    }
    if (lower.includes('район') || lower.includes('квартал') || lower.includes('зона') || lower.includes('district') || lower.includes('quarter') || lower.includes('neighborhood') || lower.includes('zone')) {
      return 'district_location';
    }
    if (lower.includes('город') || lower.includes('поселение') || lower.includes('крепость') || lower.includes('мегаздание') || lower.includes('аркология') || lower.includes('столица') || lower.includes('settlement') || lower.includes('city') || lower.includes('town')) {
      return 'settlement';
    }
    if (lower.includes('магазин') || lower.includes('лавка') || lower.includes('риппердок') || lower.includes('клиника') || lower.includes('кузница') || lower.includes('таверна') || lower.includes('клуб') || lower.includes('бар') || lower.includes('рынок') || lower.includes('shop') || lower.includes('store') || lower.includes('tavern') || lower.includes('clinic')) {
      return 'shop_tavern_venue';
    }
    if (lower.includes('культ') || lower.includes('гильдия') || lower.includes('фракция') || lower.includes('корпорация') || lower.includes('орден') || lower.includes('синдикат') || lower.includes('faction') || lower.includes('cult') || lower.includes('corporation')) {
      return 'faction_cult';
    }
    if (lower.includes('нип') || lower.includes('персонаж') || lower.includes('правитель') || lower.includes('фиксер') || lower.includes('соло') || lower.includes('лидер') || lower.includes('глава') || lower.includes('npc') || lower.includes('ruler')) {
      return 'npc_figure';
    }
    if (lower.includes('раса') || lower.includes('народ') || lower.includes('этнос') || lower.includes('вид') || lower.includes('race') || lower.includes('species') || lower.includes('ethnicity')) {
      return 'demographics_race';
    }
    if (lower.includes('артефакт') || lower.includes('реликвия') || lower.includes('предмет') || lower.includes('киберпротез') || lower.includes('artifact') || lower.includes('relic') || lower.includes('cyberware')) {
      return 'lore_item';
    }
    if (lower.includes('география') || lower.includes('горы') || lower.includes('река') || lower.includes('лес') || lower.includes('регион') || lower.includes('пустошь') || lower.includes('geography') || lower.includes('region') || lower.includes('wasteland')) {
      return 'region_geography';
    }
    return 'world_overview';
  }
}

export const loreParserEngine = new LoreParserEngine();
