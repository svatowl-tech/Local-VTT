import { WorldLoreItem, LoreCategory, IngestionParseResult } from '../types/worldLoreTypes';
import { SystemReferenceSearchItem, rustSystemSearchService } from './rustSystemSearchService';
import { worldLoreService } from './worldLoreService';
import { tauriWindowManager } from './tauriWindowManager';
import JSZip from 'jszip';

export class WorldLoreParserService {
  private getApiUrl(endpoint: string): string {
    return endpoint;
  }

  /**
   * Parse arbitrary File (PDF, ZIP, EPUB, Wiki, JSON, Text) with Rust-first & TS fallback pipeline
   */
  public async parseAndIngestFile(
    file: File,
    targetWorldId: string = 'dnd5e_faerun',
    targetSystemId: string = 'dnd5e'
  ): Promise<IngestionParseResult> {
    const filename = file.name;
    const lowerName = filename.toLowerCase();

    // 1. Rust Native Parser Attempt (if running inside Tauri)
    if (tauriWindowManager.isTauri()) {
      try {
        const textContent = await file.text();
        const { invoke } = await import('@tauri-apps/api/core');
        const rustResult: any = await invoke('parse_lore_raw_data', {
          data: textContent,
          filename,
          targetWorldId,
          targetSystemId,
        });

        if (rustResult && rustResult.parsed_entities && rustResult.parsed_entities.length > 0) {
          return await this.ingestUniversalEntities(rustResult.parsed_entities, targetWorldId, targetSystemId);
        }
      } catch (rustErr) {
        console.info('Rust native parser skipped, trying server/TS parser...');
      }
    }

    // 2. Server-side Express API Fallback (/api/systems/parse-lore)
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetWorldId', targetWorldId);
      formData.append('targetSystemId', targetSystemId);

      const url = this.getApiUrl('/api/systems/parse-lore');
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.entities && data.entities.length > 0) {
          return await this.ingestUniversalEntities(data.entities, targetWorldId, targetSystemId);
        }
      }
    } catch (serverErr) {
      console.info('Server-side lore parser endpoint offline, using browser TS parser fallback.');
    }

    // 3. Browser Client-side TypeScript Parser Fallback
    return await this.parseFileInBrowserFallback(file, targetWorldId, targetSystemId);
  }

  /**
   * Browser-based fallback for ZIP, EPUB, Wiki, JSON, Text parsing
   */
  public async parseFileInBrowserFallback(
    file: File,
    targetWorldId: string,
    targetSystemId: string
  ): Promise<IngestionParseResult> {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.zip') || lowerName.endsWith('.epub')) {
      const buffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buffer);
      let combinedText = '';

      for (const key of Object.keys(zip.files)) {
        if (!zip.files[key].dir && !key.startsWith('__MACOSX')) {
          const entryStr = await zip.files[key].async('string');
          combinedText += `\n# Раздел из архива: ${key}\n` + entryStr + '\n';
        }
      }

      return await this.parseAndIngestContent(combinedText, targetWorldId, targetSystemId);
    }

    const textContent = await file.text();
    return await this.parseAndIngestContent(textContent, targetWorldId, targetSystemId);
  }

  /**
   * Parse raw string / Markdown / Wikitext / JSON
   */
  public async parseAndIngestContent(
    rawInput: string,
    targetWorldId: string = 'dnd5e_faerun',
    targetSystemId: string = 'dnd5e'
  ): Promise<IngestionParseResult> {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return {
        success: false,
        message: 'Пустой ввод для парсинга',
        parsedLoreItems: [],
        parsedRuleItems: [],
        stats: { loreCount: 0, ruleCount: 0, extractedNpcs: 0, extractedLocations: 0, extractedFactions: 0 },
      };
    }

    // JSON Parsing
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        return await this.processJsonPayload(parsedJson, targetWorldId, targetSystemId);
      } catch (e) {
        console.log('Not valid JSON, falling back to Wiki/Markdown parser...');
      }
    }

    // Wikitext / Text / Markdown Ingestion Parser
    return await this.parseMarkdownOrTextBook(trimmed, targetWorldId, targetSystemId);
  }

  /**
   * Maps UniversalParsedEntity[] array into WorldLoreItem[] and saves to worldLoreService
   */
  private async ingestUniversalEntities(
    entities: any[],
    targetWorldId: string,
    targetSystemId: string
  ): Promise<IngestionParseResult> {
    const loreItems: WorldLoreItem[] = [];
    const ruleItems: SystemReferenceSearchItem[] = [];
    let extractedNpcs = 0;
    let extractedLocations = 0;
    let extractedFactions = 0;

    entities.forEach((ent, idx) => {
      const sourceFormat = (ent.source_format || ent.sourceFormat || '').toString();
      const isRule = sourceFormat.includes('rule') || ent.category === 'monsters' || ent.category === 'statblock';

      if (isRule) {
        // Build Rule Statblock
        const ruleItem: SystemReferenceSearchItem = {
          id: ent.id || `rule-${targetSystemId}-${idx}`,
          systemId: targetSystemId,
          systemName: targetSystemId.toUpperCase(),
          name: ent.name || `Статблок #${idx + 1}`,
          category: ent.category || 'monsters',
          format: 'json',
          summary: ent.summary || ent.description?.substring(0, 160) || ent.name,
          score: 1.0,
          matchType: 'exact',
          tags: ent.tags || ['Правило', targetSystemId],
          relativePath: `systems/${targetSystemId}/${ent.name}.json`,
          stats: ent.stats || {
            ac: 12,
            hp: 20,
            cr: '1',
            speed: '30 ft.',
            str_val: 10,
            dex_val: 10,
            con_val: 10,
            int_val: 10,
            wis_val: 10,
            cha_val: 10,
          },
          actions: ent.actions || [],
          traits: ent.traits || [],
          data: ent.rawContent || ent.raw_content,
        };
        ruleItems.push(ruleItem);
        rustSystemSearchService.registerRuleItem(ruleItem);
      } else {
        const category: LoreCategory = (ent.category as LoreCategory) || 'world_overview';

        if (category === 'settlement' || category === 'district_location') extractedLocations++;
        if (category === 'faction_cult') extractedFactions++;
        if (category === 'npc_figure') extractedNpcs++;

        const linkedRuleIds = ent.raw_content?.linkedRuleIds || ent.rawContent?.linkedRuleIds || [];

        const item: WorldLoreItem = {
          id: ent.id || `lore-parsed-${Date.now()}-${idx}`,
          worldId: targetWorldId,
          worldName: targetWorldId,
          systemId: targetSystemId,
          name: ent.name || `Статья Лора #${idx + 1}`,
          category,
          summary: ent.summary || (ent.description ? ent.description.substring(0, 180) : ent.name),
          content: ent.description || ent.summary || ent.name,
          tags: ent.tags || ['Импорт', category],
          linkedRuleIds,
          createdAt: Date.now(),
        };

        loreItems.push(item);
      }
    });

    if (loreItems.length > 0) {
      await worldLoreService.addBatchItems(loreItems);
    }

    return {
      success: true,
      message: `Успешно спарсено ${loreItems.length} заметок лора и ${ruleItems.length} правил/статблоков`,
      parsedLoreItems: loreItems,
      parsedRuleItems: ruleItems,
      stats: {
        loreCount: loreItems.length,
        ruleCount: ruleItems.length,
        extractedNpcs,
        extractedLocations,
        extractedFactions,
      },
    };
  }

  /**
   * Structured text/Markdown books parser
   */
  private async parseMarkdownOrTextBook(
    text: string,
    worldId: string,
    systemId: string
  ): Promise<IngestionParseResult> {
    const loreItems: WorldLoreItem[] = [];
    const ruleItems: SystemReferenceSearchItem[] = [];

    // Clean wikitext formatting if present
    const cleanText = text
      .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/\{\{[\s\S]*?\}\}/g, '');

    const sections = cleanText.split(/(?=\n#{1,3}\s+)|(?=\n==+\s+)/g);

    let extractedNpcs = 0;
    let extractedLocations = 0;
    let extractedFactions = 0;

    sections.forEach((sec, idx) => {
      const trimmedSec = sec.trim();
      if (!trimmedSec) return;

      const lines = trimmedSec.split('\n');
      const headerLine = lines[0].replace(/^[#=]+\s*/, '').replace(/\s*=+$/, '').trim();
      const body = lines.slice(1).join('\n').trim();

      const lowerText = trimmedSec.toLowerCase();

      // Rule Detection: Is this a Monster Statblock?
      if (
        lowerText.includes('хит-поинты') ||
        lowerText.includes('класс доспеха') ||
        lowerText.includes('armor class') ||
        lowerText.includes('hit points') ||
        lowerText.includes('d20')
      ) {
        const ruleItem: SystemReferenceSearchItem = {
          id: `rule-parsed-${Date.now()}-${idx}`,
          systemId,
          systemName: systemId.toUpperCase(),
          name: headerLine || `Существо #${idx + 1}`,
          category: 'monsters',
          format: 'markdown',
          summary: body.substring(0, 160) + '...',
          score: 1,
          matchType: 'parsed',
          tags: ['Существо', 'Импорт из книги'],
          relativePath: `imported/${headerLine}.md`,
          data: { content: trimmedSec },
        };
        ruleItems.push(ruleItem);
        return;
      }

      // Lore Category Classifier
      let category: LoreCategory = 'lore_article';
      if (
        lowerText.includes('город') ||
        lowerText.includes('поселение') ||
        lowerText.includes('крепость') ||
        lowerText.includes('city') ||
        lowerText.includes('settlement')
      ) {
        category = 'settlement';
        extractedLocations++;
      } else if (
        lowerText.includes('культ') ||
        lowerText.includes('гильдия') ||
        lowerText.includes('фракция') ||
        lowerText.includes('орден') ||
        lowerText.includes('faction')
      ) {
        category = 'faction_cult';
        extractedFactions++;
      } else if (
        lowerText.includes('нип') ||
        lowerText.includes('персонаж') ||
        lowerText.includes('правитель') ||
        lowerText.includes('npc')
      ) {
        category = 'npc_figure';
        extractedNpcs++;
      }

      const loreItem: WorldLoreItem = {
        id: `lore-parsed-${Date.now()}-${idx}`,
        worldId,
        worldName: worldId,
        systemId,
        name: headerLine || `Раздел лора #${idx + 1}`,
        category,
        summary: body ? body.substring(0, 180) + '...' : headerLine,
        content: trimmedSec,
        tags: ['Импорт из книги', category],
        createdAt: Date.now(),
      };

      loreItems.push(loreItem);
    });

    if (loreItems.length > 0) {
      await worldLoreService.addBatchItems(loreItems);
    }

    return {
      success: true,
      message: `Парсинг завершен: создано ${loreItems.length} заметок лора и ${ruleItems.length} монстров`,
      parsedLoreItems: loreItems,
      parsedRuleItems: ruleItems,
      stats: {
        loreCount: loreItems.length,
        ruleCount: ruleItems.length,
        extractedNpcs,
        extractedLocations,
        extractedFactions,
      },
    };
  }

  public generateLlmPromptTemplate(worldName: string): string {
    return `Проанализируй следующий текст по сеттингу "${worldName}" и выдели структурированные заметки лора в формате JSON:
[
  {
    "name": "Название локации/НИП/фракции",
    "category": "settlement | npc_figure | faction_cult | world_overview | demographics_race | region_geography",
    "summary": "Краткое резюме на 1-2 предложения",
    "content": "Подробный текст заметки с фактами, историей и деталями",
    "tags": ["Тег1", "Тег2"]
  }
]`;
  }

  private async processJsonPayload(
    parsedJson: any,
    targetWorldId: string,
    targetSystemId: string
  ): Promise<IngestionParseResult> {
    let items: any[] = [];
    if (Array.isArray(parsedJson)) {
      items = parsedJson;
    } else if (parsedJson.compendium) {
      const c = parsedJson.compendium;
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
    } else if (parsedJson.spell || parsedJson.spells || parsedJson.monster || parsedJson.monsters || parsedJson.item || parsedJson.items) {
      items = [
        ...(Array.isArray(parsedJson.spell) ? parsedJson.spell : parsedJson.spell ? [parsedJson.spell] : []),
        ...(Array.isArray(parsedJson.spells) ? parsedJson.spells : []),
        ...(Array.isArray(parsedJson.monster) ? parsedJson.monster : parsedJson.monster ? [parsedJson.monster] : []),
        ...(Array.isArray(parsedJson.monsters) ? parsedJson.monsters : []),
        ...(Array.isArray(parsedJson.item) ? parsedJson.item : parsedJson.item ? [parsedJson.item] : []),
        ...(Array.isArray(parsedJson.items) ? parsedJson.items : []),
      ];
    } else {
      items = parsedJson.items || parsedJson.lore || parsedJson.articles || [parsedJson];
    }

    const loreItems: WorldLoreItem[] = [];

    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object') return;

      let category = item.category;
      if (!category) {
        if (item.level !== undefined || item.school || item.components || item.duration) {
          category = 'spells';
        } else if (item.cr !== undefined || item.ac || item.hp) {
          category = 'monsters';
        } else if (item.rarity || item.weight || item.value) {
          category = 'items';
        } else {
          category = 'world_overview';
        }
      }

      const name = item.name || item.title || `Запись #${idx + 1}`;
      const desc =
        item.content ||
        item.description ||
        (Array.isArray(item.entries) ? item.entries.join('\n\n') : '') ||
        (Array.isArray(item.text) ? item.text.join('\n\n') : '') ||
        JSON.stringify(item, null, 2);

      loreItems.push({
        id: item.id ? `${item.id}-${idx + 1}` : `lore-json-${Date.now()}-${idx + 1}`,
        worldId: targetWorldId,
        worldName: targetWorldId,
        systemId: targetSystemId,
        name,
        category,
        summary: item.summary || (desc ? desc.substring(0, 160) : ''),
        content: desc,
        tags: item.tags || ['JSON Import', category],
        createdAt: Date.now(),
      });
    });

    if (loreItems.length > 0) {
      await worldLoreService.addBatchItems(loreItems);
    }

    return {
      success: true,
      message: `Импортировано ${loreItems.length} записей из JSON`,
      parsedLoreItems: loreItems,
      parsedRuleItems: [],
      stats: {
        loreCount: loreItems.length,
        ruleCount: 0,
        extractedNpcs: 0,
        extractedLocations: 0,
        extractedFactions: 0,
      },
    };
  }
}

export const worldLoreParserService = new WorldLoreParserService();
