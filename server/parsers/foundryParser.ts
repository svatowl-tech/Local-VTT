import { TextSanitizer } from './textSanitizer';
import {
  IFormatParser,
  ParserInput,
  UniversalParseResult,
  UniversalParsedEntity,
  NormalizedStats,
  NormalizedAction,
  NormalizedTrait,
} from './types';

export class FoundryParser implements IFormatParser {
  public canParse(input: ParserInput): boolean {
    const data = input.parsedJson || this.tryParseJson(input.rawText);
    if (!data) return false;

    const docs = this.extractFoundryDocs(data);
    if (docs.length === 0) return false;

    const first = docs[0];
    if (!first || typeof first !== 'object') return false;

    return (
      first.system !== undefined ||
      first.data !== undefined ||
      first.prototypeToken !== undefined ||
      first.pages !== undefined ||
      first.results !== undefined ||
      first.cards !== undefined ||
      first.command !== undefined ||
      (first._id && first.name && (first.type || first.folder !== undefined))
    );
  }

  public parse(input: ParserInput): UniversalParseResult {
    const rawData = input.parsedJson || this.tryParseJson(input.rawText);
    const entities: UniversalParsedEntity[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    const statsCounter = {
      charactersCount: 0,
      monstersCount: 0,
      spellsCount: 0,
      itemsCount: 0,
      rulesCount: 0,
      tablesCount: 0,
      otherCount: 0,
    };

    if (!rawData) {
      return {
        success: false,
        sourceFormat: 'foundry_actor',
        formatDescription: 'Foundry VTT Data',
        totalEntitiesFound: 0,
        entities: [],
        errors: ['Не удалось распарсить JSON/NeDB структуру Foundry VTT'],
        warnings: [],
        stats: statsCounter,
      };
    }

    const docs = this.extractFoundryDocs(rawData);

    for (let index = 0; index < docs.length; index++) {
      const doc = docs[index];
      if (!doc || typeof doc !== 'object') continue;

      try {
        const entity = this.normalizeFoundryDocument(doc, index, input.targetSystemId);
        if (entity) {
          entities.push(entity);

          if (entity.category === 'characters') statsCounter.charactersCount++;
          else if (entity.category === 'monsters') statsCounter.monstersCount++;
          else if (entity.category === 'spells') statsCounter.spellsCount++;
          else if (entity.category === 'items' || entity.category === 'weapons' || entity.category === 'equipment')
            statsCounter.itemsCount++;
          else if (entity.category === 'rules' || entity.category === 'lore') statsCounter.rulesCount++;
          else if (entity.category === 'tables') statsCounter.tablesCount++;
          else statsCounter.otherCount++;
        }
      } catch (err: any) {
        warnings.push(`Ошибка при разборе Foundry объекта #${index + 1}: ${err?.message || err}`);
      }
    }

    return {
      success: entities.length > 0,
      sourceFormat: 'foundry_compendium',
      formatDescription: `Foundry VTT (${entities.length} сущностей)`,
      totalEntitiesFound: entities.length,
      entities,
      errors,
      warnings,
      stats: statsCounter,
    };
  }

  private extractFoundryDocs(rawData: any): any[] {
    if (!rawData) return [];

    if (Array.isArray(rawData)) {
      return rawData;
    }

    if (typeof rawData === 'object') {
      // Compendium wrappers
      if (Array.isArray(rawData.entries)) return rawData.entries;
      if (Array.isArray(rawData.docs)) return rawData.docs;
      if (
        Array.isArray(rawData.data) &&
        rawData.data.some((x: any) => x && typeof x === 'object' && (x.system || x.data || x.type || x.pages || x.results))
      ) {
        return rawData.data;
      }

      // Dictionary map of documents
      const values = Object.values(rawData);
      if (
        values.length > 0 &&
        values.every(
          (v: any) =>
            v && typeof v === 'object' && (v.system !== undefined || v.data !== undefined || v.type !== undefined || v._id !== undefined)
        )
      ) {
        return values;
      }

      // Single document
      return [rawData];
    }

    return [];
  }

  private normalizeFoundryDocument(
    doc: any,
    index: number,
    targetSystemId?: string
  ): UniversalParsedEntity | null {
    const sysData = doc.system || doc.data || {};
    const name = doc.name || doc.title || `Foundry_${doc.type || 'Entity'}_${index + 1}`;
    const id = (doc._id || `foundry-${doc.type || 'item'}-${name}-${index}`)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');

    const img = doc.img || doc.system?.img || doc.data?.img || undefined;
    const tokenImg = doc.prototypeToken?.texture?.src || doc.prototypeToken?.img || doc.token?.img || doc.token?.texture?.src || undefined;

    // 1. ACTOR (NPC / Character / Monster / Vehicle / Group)
    if (
      doc.type === 'npc' ||
      doc.type === 'character' ||
      doc.type === 'vehicle' ||
      doc.type === 'creature' ||
      doc.type === 'group' ||
      (doc.attributes && doc.items)
    ) {
      const isCharacter = doc.type === 'character';
      const category = isCharacter ? 'characters' : 'monsters';

      const hpObj = sysData.attributes?.hp || sysData.hp || {};
      const acObj = sysData.attributes?.ac || sysData.ac || {};

      const stats: NormalizedStats = {
        hp: hpObj.value ?? (typeof hpObj === 'number' ? hpObj : undefined),
        maxHp: hpObj.max,
        hitDice: sysData.attributes?.hd?.value || sysData.details?.hitDice || hpObj.formula,
        ac: acObj.value ?? acObj.flat ?? (typeof acObj === 'number' ? acObj : 10),
        speed: this.formatSpeed(sysData.attributes?.movement || sysData.movement || sysData.speed),
        cr: sysData.details?.cr ?? sysData.cr,
        level: sysData.details?.level ?? sysData.level,
        xp: sysData.details?.xp?.value ?? sysData.xp,
        senses: sysData.traits?.senses?.value || sysData.attributes?.senses || sysData.senses,
        languages: this.formatLanguages(sysData.traits?.languages || sysData.languages),
        proficiencyBonus: sysData.attributes?.prof ?? sysData.prof,
      };

      // Extract ability scores (STR, DEX, etc.)
      const abilities = sysData.abilities || sysData.stats || {};
      if (abilities && typeof abilities === 'object') {
        stats.attributes = {};
        for (const [k, v] of Object.entries(abilities)) {
          const val = (v as any)?.value ?? v;
          if (val !== undefined && typeof val === 'number') {
            stats.attributes[k.toLowerCase()] = val;
          }
        }
      }

      // Extract actions & items from Foundry Actor items array
      const actions: NormalizedAction[] = [];
      const traits: NormalizedTrait[] = [];
      const spells: Array<{ name: string; level?: number; school?: string; description?: string }> = [];
      const itemsList: Array<{ name: string; quantity?: number; weight?: number; description?: string }> = [];

      if (Array.isArray(doc.items)) {
        for (const item of doc.items) {
          if (!item) continue;
          const iSys = item.system || item.data || {};
          const iName = item.name || 'Безымянный элемент';
          const iType = item.type;
          const iDesc = this.stripHtml(iSys.description?.value || iSys.description || '');

          if (iType === 'spell') {
            spells.push({
              name: iName,
              level: iSys.level ?? 0,
              school: iSys.school,
              description: iDesc,
            });
          } else if (iType === 'weapon' || iType === 'feat' || iType === 'action') {
            actions.push({
              name: iName,
              type: iType === 'weapon' ? 'attack' : (iSys.activation?.type as any) || 'action',
              toHit: iSys.attackBonus || iSys.bonus,
              range: iSys.range?.value ? `${iSys.range.value} ${iSys.range.units || 'ft'}` : undefined,
              damage: this.formatFoundryDamage(iSys.damage),
              description: iDesc,
            });
          } else if (
            iType === 'equipment' ||
            iType === 'consumable' ||
            iType === 'loot' ||
            iType === 'tool' ||
            iType === 'backpack' ||
            iType === 'container'
          ) {
            itemsList.push({
              name: iName,
              quantity: iSys.quantity || 1,
              weight: iSys.weight || 0,
              description: iDesc,
            });
          } else {
            traits.push({
              name: iName,
              description: iDesc,
              type: iType,
            });
          }
        }
      }

      const tags = [
        'Foundry VTT',
        doc.type || 'actor',
        stats.cr ? `CR ${stats.cr}` : undefined,
        stats.level ? `Уровень ${stats.level}` : undefined,
        sysData.details?.type?.value || sysData.details?.race || undefined,
      ].filter(Boolean) as string[];

      const summary =
        stats.hp !== undefined
          ? `Хиты: ${stats.hp}/${stats.maxHp || stats.hp}, КД: ${stats.ac}, Скорость: ${stats.speed || '30 фт'}`
          : `Сущность Foundry: ${name}`;

      return {
        id,
        name,
        originalName: doc.name,
        category,
        sourceFormat: isCharacter ? 'foundry_actor' : 'foundry_actor',
        sourceSystem: targetSystemId || 'foundry',
        summary,
        description: this.stripHtml(sysData.details?.biography?.value || sysData.biography || sysData.description?.value || ''),
        tags,
        img,
        tokenImg,
        stats,
        actions: actions.length > 0 ? actions : undefined,
        traits: traits.length > 0 ? traits : undefined,
        spells: spells.length > 0 ? spells : undefined,
        items: itemsList.length > 0 ? itemsList : undefined,
        rawContent: doc,
        suggestedFilename: `${id}.json`,
      };
    }

    // 2. ITEM (Spell, Weapon, Equipment, Feat, Class, Subclass, Race, Background, Container, Tool, Consumable, Loot)
    if (
      doc.type === 'spell' ||
      doc.type === 'weapon' ||
      doc.type === 'equipment' ||
      doc.type === 'feat' ||
      doc.type === 'consumable' ||
      doc.type === 'loot' ||
      doc.type === 'class' ||
      doc.type === 'subclass' ||
      doc.type === 'race' ||
      doc.type === 'background' ||
      doc.type === 'tool' ||
      doc.type === 'backpack' ||
      doc.type === 'container'
    ) {
      let category: string = 'items';
      if (doc.type === 'spell') category = 'spells';
      else if (doc.type === 'feat') category = 'feats';
      else if (doc.type === 'race') category = 'races';
      else if (doc.type === 'class' || doc.type === 'subclass') category = 'classes';
      else if (doc.type === 'weapon') category = 'weapons';
      else if (doc.type === 'equipment') category = 'equipment';
      else if (doc.type === 'background') category = 'rules';

      const desc = this.stripHtml(sysData.description?.value || sysData.description || '');
      const tags = ['Foundry VTT', doc.type];
      if (sysData.rarity) tags.push(sysData.rarity);
      if (sysData.school) tags.push(sysData.school);
      if (sysData.level !== undefined) tags.push(`Круг ${sysData.level}`);

      return {
        id,
        name,
        originalName: doc.name,
        category,
        sourceFormat: 'foundry_item',
        sourceSystem: targetSystemId || 'foundry',
        summary: desc.slice(0, 160) || `Предмет/способность ${name}`,
        description: desc,
        tags,
        img,
        tokenImg,
        rawContent: doc,
        suggestedFilename: `${id}.json`,
      };
    }

    // 3. JOURNAL ENTRY (Rules & Lore)
    if ((doc.pages && Array.isArray(doc.pages)) || doc.type === 'JournalEntry' || doc.content) {
      const pageTexts: string[] = [];

      if (Array.isArray(doc.pages)) {
        for (const page of doc.pages) {
          if (!page) continue;
          const pName = page.name || 'Страница';
          let pContent = '';

          if (page.text?.content) {
            pContent = this.stripHtml(page.text.content);
          } else if (page.text?.markdown) {
            pContent = page.text.markdown;
          } else if (page.src) {
            pContent = `![${pName}](${page.src})`;
          }

          pageTexts.push(`### ${pName}\n\n${pContent}`);
        }
      } else if (doc.content) {
        pageTexts.push(this.stripHtml(doc.content));
      }

      const fullDesc = pageTexts.join('\n\n---\n\n') || `Справочный материал: ${name}`;

      return {
        id,
        name,
        originalName: doc.name,
        category: 'rules',
        sourceFormat: 'foundry_journal',
        sourceSystem: targetSystemId || 'foundry',
        summary: `Журнал/Справочник правил Foundry: ${name} (${pageTexts.length} стр.)`,
        description: fullDesc,
        tags: ['Foundry VTT', 'Журнал', 'Правила'],
        img,
        tokenImg,
        rawContent: doc,
        suggestedFilename: `${id}.md`,
      };
    }

    // 4. ROLLTABLE
    if (doc.results && Array.isArray(doc.results)) {
      const rows: string[][] = [];
      const results: Array<{ range: [number, number]; text: string }> = [];

      for (let i = 0; i < doc.results.length; i++) {
        const res = doc.results[i];
        if (!res) continue;

        let rangePair: [number, number] = [i + 1, i + 1];
        let rangeStr = `${i + 1}`;

        if (Array.isArray(res.range)) {
          rangePair = [res.range[0] ?? (i + 1), res.range[1] ?? res.range[0] ?? (i + 1)];
          rangeStr = rangePair[0] === rangePair[1] ? `${rangePair[0]}` : `${rangePair[0]}-${rangePair[1]}`;
        } else if (typeof res.range === 'number') {
          rangePair = [res.range, res.range];
          rangeStr = `${res.range}`;
        }

        const rawText = res.text || res.name || res.label || res.description || res.documentId || `Результат #${i + 1}`;
        const cleanText = TextSanitizer.cleanHtmlAndMacros(rawText);

        rows.push([rangeStr, cleanText]);
        results.push({ range: rangePair, text: cleanText });
      }

      const formula = doc.formula || '1d20';
      const mdTableLines = [
        `### Таблица: ${name}`,
        `**Формула броска:** \`${formula}\`\n`,
        doc.description ? `${this.stripHtml(doc.description)}\n` : '',
        '| Диапазон | Результат |',
        '| :---: | :--- |',
        ...rows.map(([r, t]) => `| ${r} | ${t} |`),
      ].filter(Boolean).join('\n');

      return {
        id,
        name,
        originalName: doc.name,
        category: 'tables',
        sourceFormat: 'foundry_rolltable',
        sourceSystem: targetSystemId || 'foundry',
        summary: `Таблица случайных результатов: ${name} (${rows.length} записей, Формула: ${formula})`,
        description: mdTableLines,
        tags: ['Foundry VTT', 'Таблица', formula],
        img,
        tokenImg,
        tableData: {
          headers: ['Диапазон', 'Результат'],
          rows,
          formula,
          results,
        },
        rawContent: doc,
        suggestedFilename: `${id}.json`,
      };
    }

    // 5. CARDS (Decks / Hands / Piles)
    if (doc.cards && Array.isArray(doc.cards)) {
      const cardRows = doc.cards.map((c: any, idx: number) => [
        c.name || `Карта #${idx + 1}`,
        c.type || 'card',
        this.stripHtml(c.description || c.text || ''),
      ]);

      const mdCards = [
        `### Колода/Набор карт: ${name}`,
        '| Карта | Тип | Описание |',
        '| :--- | :--- | :--- |',
        ...cardRows.map((r: string[]) => `| ${r[0]} | ${r[1]} | ${r[2]} |`),
      ].join('\n');

      return {
        id,
        name,
        originalName: doc.name,
        category: 'tables',
        sourceFormat: 'foundry_cards',
        sourceSystem: targetSystemId || 'foundry',
        summary: `Колода/Набор карт Foundry: ${name} (${doc.cards.length} карт)`,
        description: mdCards,
        tags: ['Foundry VTT', 'Карты', doc.type || 'deck'],
        img,
        tokenImg,
        rawContent: doc,
        suggestedFilename: `${id}.json`,
      };
    }

    // 6. MACRO
    if (doc.command || doc.type === 'script') {
      return {
        id,
        name,
        originalName: doc.name,
        category: 'rules',
        sourceFormat: 'foundry_macro',
        sourceSystem: targetSystemId || 'foundry',
        summary: `Макрос Foundry: ${name}`,
        description: `\`\`\`js\n${doc.command || '// Пустой макрос'}\n\`\`\``,
        tags: ['Foundry VTT', 'Макрос', 'Скрипт'],
        img,
        tokenImg,
        rawContent: doc,
        suggestedFilename: `${id}.js`,
      };
    }

    // Fallback generic foundry entity
    return {
      id,
      name,
      originalName: doc.name,
      category: 'general',
      sourceFormat: 'generic_json',
      sourceSystem: targetSystemId || 'foundry',
      summary: `Foundry сущность: ${name}`,
      tags: ['Foundry VTT', doc.type || 'generic'],
      img,
      tokenImg,
      rawContent: doc,
      suggestedFilename: `${id}.json`,
    };
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    return TextSanitizer.cleanHtmlAndMacros(html);
  }

  private formatSpeed(speedObj: any): string {
    if (!speedObj) return '30 ft';
    if (typeof speedObj === 'string' || typeof speedObj === 'number') return `${speedObj}`;
    const parts: string[] = [];
    if (speedObj.walk || speedObj.value) parts.push(`${speedObj.walk || speedObj.value} фт.`);
    if (speedObj.fly) parts.push(`полёт ${speedObj.fly} фт.${speedObj.hover ? ' (парение)' : ''}`);
    if (speedObj.swim) parts.push(`плавание ${speedObj.swim} фт.`);
    if (speedObj.climb) parts.push(`лазание ${speedObj.climb} фт.`);
    if (speedObj.burrow) parts.push(`рытьё ${speedObj.burrow} фт.`);
    return parts.length > 0 ? parts.join(', ') : '30 фт.';
  }

  private formatLanguages(langObj: any): string {
    if (!langObj) return '';
    if (typeof langObj === 'string') return langObj;
    if (Array.isArray(langObj)) return langObj.join(', ');
    if (Array.isArray(langObj.value)) {
      const base = langObj.value.join(', ');
      return langObj.custom ? `${base}, ${langObj.custom}` : base;
    }
    if (langObj.custom) return langObj.custom;
    return '';
  }

  private formatFoundryDamage(dmgObj: any): string | undefined {
    if (!dmgObj) return undefined;
    if (typeof dmgObj === 'string') return dmgObj;
    if (Array.isArray(dmgObj.parts) && dmgObj.parts.length > 0) {
      return dmgObj.parts.map((p: any) => `${p[0]} ${p[1] || ''}`).join(' + ');
    }
    return undefined;
  }

  private tryParseJson(text?: string): any {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;

    try {
      return JSON.parse(trimmed);
    } catch {
      // Continue to NDJSON / NeDB
    }

    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && (l.startsWith('{') || l.startsWith('[')));
    if (lines.length > 0) {
      const items: any[] = [];
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item && typeof item === 'object') items.push(item);
        } catch {
          // ignore invalid lines
        }
      }
      if (items.length > 0) return items;
    }

    return null;
  }
}

