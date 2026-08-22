import YAML from 'yaml';
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

export class FiveToolsParser implements IFormatParser {
  public canParse(input: ParserInput): boolean {
    const data = input.parsedJson || this.tryParseJson(input.rawText);
    return Boolean(data && typeof data === 'object');
  }

  private generateSafeUniqueId(prefix: string, name: string, index: number): string {
    const cleanName = String(name || 'entity')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${prefix}-${cleanName || 'item'}-${index}`;
  }

  public cleanMarkdownHeader(str: string): string {
    if (!str) return 'Без названия';
    return String(str)
      .replace(/^[\*\#\_ ]+/, '')
      .replace(/[\*\#\_ ]+$/, '')
      .trim() || String(str);
  }

  public isRaceNameOrContext(name: string, contextName?: string): boolean {
    const n = (name || '').toLowerCase();
    const c = (contextName || '').toLowerCase();
    const raceKeywords = [
      'race', 'races', 'раса', 'расы', 'dwarf', 'elf', 'human', 'halfling',
      'dragonborn', 'gnome', 'half-elf', 'half-orc', 'tiefling', 'aarakocra',
      'genasi', 'goliath', 'tabaxi', 'aasimar', 'firbolg', 'kenku', 'lizardfolk',
      'triton', 'bugbear', 'goblin', 'hobgoblin', 'kobold', 'orc', 'yuan-ti',
      'gith', 'changeling', 'kalashtar', 'shifter', 'warforged', 'subrace', 'ancestry', 'ancestries'
    ];
    return raceKeywords.some((kw) => n.includes(kw) || c.includes(kw));
  }

  public formatAbilityBonuses(abilityArr: any): string {
    if (!abilityArr) return '';
    if (typeof abilityArr === 'string') return abilityArr;
    const arr = Array.isArray(abilityArr) ? abilityArr : [abilityArr];
    const parts: string[] = [];
    const map: Record<string, string> = {
      str: 'Сила',
      dex: 'Ловкость',
      con: 'Телосложение',
      int: 'Интеллект',
      wis: 'Мудрость',
      cha: 'Харизма',
    };
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      for (const [k, v] of Object.entries(item)) {
        if (map[k] && typeof v === 'number') {
          parts.push(`${map[k]} +${v}`);
        } else if (k === 'choose') {
          parts.push('Характеристики на выбор');
        }
      }
    }
    return parts.join(', ');
  }

  public extractTextContent(val: any): string {
    if (!val) return '';
    if (typeof val === 'string') {
      return this.clean5eTags(val);
    }
    if (Array.isArray(val)) {
      return this.cleanEntries(val);
    }
    if (typeof val === 'object' && val !== null) {
      if (val.entries || val.content || val.text || val.description) {
        return this.cleanEntries(val.entries || val.content || val.text || val.description);
      }
      if (val.table || val.rows) {
        return this.formatMarkdownTable(val.table || val);
      }
      const subEntries = Object.entries(val).filter(([k]) => !k.startsWith('_') && k !== '$schema');
      if (subEntries.length > 0) {
        return subEntries
          .map(([k, v]) => {
            const heading = this.cleanMarkdownHeader(k);
            const content = this.extractTextContent(v);
            return `### ${heading}\n${content}`;
          })
          .join('\n\n');
      }
    }
    return String(val);
  }

  public formatMarkdownTable(tableData: any): string {
    if (!tableData) return '';
    if (typeof tableData === 'string') return this.clean5eTags(tableData);
    if (Array.isArray(tableData)) return this.cleanEntries(tableData);

    const tbl = tableData.table || tableData;
    if (typeof tbl === 'object' && tbl !== null) {
      const keys = Object.keys(tbl);
      if (keys.length > 0 && Array.isArray(tbl[keys[0]])) {
        const colNames = keys;
        const rowCount = tbl[keys[0]].length;
        let md = `| ${colNames.join(' | ')} |\n`;
        md += `| ${colNames.map(() => '---').join(' | ')} |\n`;

        for (let i = 0; i < rowCount; i++) {
          const rowVals = colNames.map((k) => {
            const cell = tbl[k][i];
            return typeof cell === 'object' ? JSON.stringify(cell) : String(cell ?? '');
          });
          md += `| ${rowVals.join(' | ')} |\n`;
        }
        return md;
      }
    }
    return JSON.stringify(tableData, null, 2);
  }

  public parseGenericJsonData(
    data: any,
    filename?: string,
    targetSystemId?: string
  ): UniversalParsedEntity[] {
    const entities: UniversalParsedEntity[] = [];
    const systemId = targetSystemId || 'dnd5e';

    if (!data || typeof data !== 'object') return entities;

    // Check if data has pages array
    if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
      data.pages.forEach((p: any, idx: number) => {
        if (!p || typeof p !== 'object') return;
        const rawName = p.name || p.title || `Страница #${idx + 1}`;
        const cleanTitle = this.cleanMarkdownHeader(rawName);
        const isRace = this.isRaceNameOrContext(cleanTitle, data.name || filename);
        const category = isRace ? 'races' : 'rules';
        const id = this.generateSafeUniqueId(isRace ? 'json-race' : 'json-page', cleanTitle, idx + 1);
        const desc = this.extractTextContent(p.entries || p.text || p.content || p);
        const summary = desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...';

        entities.push({
          id,
          name: cleanTitle,
          category,
          sourceFormat: 'generic_json',
          sourceSystem: systemId,
          summary,
          description: desc,
          tags: ['JSON', isRace ? 'Раса' : 'Правила', category],
          rawContent: p,
          suggestedFilename: `${id}.json`,
        });
      });
      return entities;
    }

    // Check if data itself is a RollTable
    if (data && typeof data === 'object' && !Array.isArray(data) && (data.results || data.rows || data.table)) {
      const rawResults = data.results || data.rows || (data.table ? data.table.rows || data.table : []);
      if (Array.isArray(rawResults)) {
        const rawName = data.name || data.title || data.header || filename?.replace(/\.(json|yaml|yml)$/i, '') || 'Таблица';
        const name = this.cleanMarkdownHeader(rawName);
        const id = this.generateSafeUniqueId('json-table', name, 1);
        const formula = data.formula || data.dice || '1d20';

        const rows: string[][] = [];
        const formattedResults: Array<{ range: [number, number]; text: string }> = [];

        rawResults.forEach((res: any, idx: number) => {
          if (!res) return;
          let rangeStr = `${idx + 1}`;
          let rangePair: [number, number] = [idx + 1, idx + 1];

          if (Array.isArray(res.range)) {
            rangePair = [res.range[0] ?? (idx + 1), res.range[1] ?? res.range[0] ?? (idx + 1)];
            rangeStr = rangePair[0] === rangePair[1] ? `${rangePair[0]}` : `${rangePair[0]}-${rangePair[1]}`;
          } else if (typeof res.range === 'number') {
            rangePair = [res.range, res.range];
            rangeStr = `${res.range}`;
          }

          let text = '';
          if (typeof res === 'string') {
            text = res;
          } else if (typeof res === 'object') {
            text = res.text || res.name || res.label || res.description || res.documentId || `Результат #${idx + 1}`;
            if (res.drawn) text += ' (уже выпадало)';
          }

          text = TextSanitizer.cleanHtmlAndMacros(text);
          rows.push([rangeStr, text]);
          formattedResults.push({ range: rangePair, text });
        });

        const mdTable = [
          `### Таблица: ${name}`,
          `**Формула броска:** \`${formula}\`\n`,
          data.description ? `${TextSanitizer.cleanHtmlAndMacros(data.description)}\n` : '',
          '| Диапазон | Результат |',
          '| :---: | :--- |',
          ...rows.map(([r, t]) => `| ${r} | ${t} |`),
        ].filter(Boolean).join('\n');

        return [{
          id,
          name,
          category: 'tables',
          sourceFormat: 'generic_json',
          sourceSystem: systemId,
          summary: `Таблица результатов: ${name} (${rows.length} строк, ${formula})`,
          description: mdTable,
          tags: ['Таблица', 'Случайный результат', formula],
          tableData: {
            headers: ['Диапазон', 'Результат'],
            rows,
            formula,
            results: formattedResults,
          },
          rawContent: data,
          suggestedFilename: `${id}.json`,
        }];
      }
    }

    // Check if data has entries array with named sub-entries
    if (data.entries && Array.isArray(data.entries) && data.entries.some((e: any) => e && typeof e === 'object' && e.name)) {
      const namedEntries = data.entries.filter((e: any) => e && typeof e === 'object' && e.name);
      if (namedEntries.length > 1) {
        namedEntries.forEach((e: any, idx: number) => {
          const cleanTitle = this.cleanMarkdownHeader(e.name);
          const isRace = this.isRaceNameOrContext(cleanTitle, data.name || filename);
          const category = isRace ? 'races' : 'rules';
          const id = this.generateSafeUniqueId(isRace ? 'json-race-entry' : 'json-entry', cleanTitle, idx + 1);
          const desc = this.extractTextContent(e.entries || e.text || e.content || e);
          const summary = desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...';

          entities.push({
            id,
            name: cleanTitle,
            category,
            sourceFormat: 'generic_json',
            sourceSystem: systemId,
            summary,
            description: desc,
            tags: ['JSON', isRace ? 'Раса' : 'Правила', category],
            rawContent: e,
            suggestedFilename: `${id}.json`,
          });
        });
        return entities;
      }
    }

    // Case A: Array of elements
    if (Array.isArray(data)) {
      data.forEach((item, idx) => {
        if (!item) return;
        if (typeof item === 'string') {
          const id = this.generateSafeUniqueId('json-rule', `rule-${idx + 1}`, idx + 1);
          entities.push({
            id,
            name: `Правило #${idx + 1}`,
            category: 'rules',
            sourceFormat: 'generic_json',
            sourceSystem: systemId,
            summary: item.slice(0, 160),
            description: this.cleanEntries(item),
            tags: ['Правила', 'JSON'],
            rawContent: { item },
            suggestedFilename: `${id}.json`,
          });
          return;
        }

        if (typeof item === 'object') {
          const rawName = item.name || item.title || item.header || item.caption || `Запись #${idx + 1}`;
          const cleanTitle = this.cleanMarkdownHeader(rawName);
          const id = this.generateSafeUniqueId('json-ent', cleanTitle, idx + 1);

          let category = 'rules';
          if (item.cr !== undefined || item.hp !== undefined || item.ac !== undefined) category = 'monsters';
          else if (item.level !== undefined || item.school !== undefined) category = 'spells';
          else if (item.rarity !== undefined || item.weight !== undefined) category = 'items';
          else if (item.table || item.rows || item.results) category = 'tables';
          else if (
            item.ability ||
            item.raceName ||
            item.subraces ||
            item.subrace ||
            this.isRaceNameOrContext(cleanTitle, filename)
          ) {
            category = 'races';
          }

          const desc = this.extractTextContent(item);
          const summary = desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...';

          entities.push({
            id,
            name: cleanTitle,
            category,
            sourceFormat: 'generic_json',
            sourceSystem: systemId,
            summary,
            description: desc,
            tags: ['JSON', category],
            rawContent: item,
            suggestedFilename: `${id}.json`,
          });
        }
      });
      return entities;
    }

    // Check if data is a SINGLE named object record (e.g. { name: '...', description: '...', ... })
    if (typeof data === 'object' && data !== null && (data.name || data.title || data.label || data._id || data.id || data.system || data.pages)) {
      const docName = this.cleanMarkdownHeader(data.name || data.title || data.label || filename?.replace(/\.(json|yaml|yml)$/i, '') || 'Запись JSON');
      const isRaceDoc = this.isRaceNameOrContext(docName, filename);
      const id = this.generateSafeUniqueId('json-doc', docName, 1);
      const desc = this.extractTextContent(data.entries || data.description || data.text || data.content) || JSON.stringify(data, null, 2);

      return [{
        id,
        name: docName,
        category: isRaceDoc ? 'races' : 'rules',
        sourceFormat: 'generic_json',
        sourceSystem: systemId,
        summary: desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...',
        description: desc,
        tags: ['JSON', isRaceDoc ? 'Раса' : 'Запись'],
        rawContent: data,
        suggestedFilename: `${id}.json`,
      }];
    }

    // Case B: Key-Value Dictionary map
    const entries = Object.entries(data).filter(([k]) => !k.startsWith('_') && k !== '$schema');
    if (entries.length > 0) {
      entries.forEach(([key, val], idx) => {
        const cleanTitle = this.cleanMarkdownHeader(key);
        const id = this.generateSafeUniqueId('json-section', cleanTitle, idx + 1);

        const isTable = Boolean(
          typeof val === 'object' &&
            val &&
            ((val as any).table || (val as any).rows || key.toLowerCase().includes('table') || key.toLowerCase().includes('таблиц'))
        );
        const isRace = this.isRaceNameOrContext(cleanTitle, data.name || filename);
        const category = isTable ? 'tables' : isRace ? 'races' : 'rules';
        const desc = this.extractTextContent(val);
        const summary = desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...';

        entities.push({
          id,
          name: cleanTitle,
          category,
          sourceFormat: 'generic_json',
          sourceSystem: systemId,
          summary,
          description: desc,
          tags: ['JSON', category],
          rawContent: { key, value: val },
          suggestedFilename: `${id}.json`,
        });
      });

      return entities;
    }

    // Case C: Single object fallback
    const docName = data.name || data.title || filename?.replace(/\.(json|yaml|yml)$/i, '') || 'Справочник JSON';
    const isRaceDoc = this.isRaceNameOrContext(docName, filename);
    const id = this.generateSafeUniqueId('json-doc', docName, 1);
    const desc = JSON.stringify(data, null, 2);

    entities.push({
      id,
      name: docName,
      category: isRaceDoc ? 'races' : 'rules',
      sourceFormat: 'generic_json',
      sourceSystem: systemId,
      summary: desc.slice(0, 160).replace(/[\{\}\"\n]/g, ' ').trim() + '...',
      description: desc,
      tags: ['JSON', isRaceDoc ? 'Расы' : 'Правила'],
      rawContent: data,
      suggestedFilename: `${id}.json`,
    });

    return entities;
  }

  public parse(input: ParserInput): UniversalParseResult {
    const data = input.parsedJson || this.tryParseJson(input.rawText);
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

    if (!data) {
      return {
        success: false,
        sourceFormat: '5etools_compendium',
        formatDescription: '5eTools JSON Data',
        totalEntitiesFound: 0,
        entities: [],
        errors: ['Не удалось распарсить JSON 5eTools / Compendium'],
        warnings: [],
        stats: statsCounter,
      };
    }

    const root = data.compendium || data;

    const monstersList: any[] = [
      ...(Array.isArray(root.monster) ? root.monster : root.monster ? [root.monster] : []),
      ...(Array.isArray(root.monsters) ? root.monsters : []),
    ];

    const spellsList: any[] = [
      ...(Array.isArray(root.spell) ? root.spell : root.spell ? [root.spell] : []),
      ...(Array.isArray(root.spells) ? root.spells : []),
    ];

    const itemsList: any[] = [
      ...(Array.isArray(root.item) ? root.item : root.item ? [root.item] : []),
      ...(Array.isArray(root.items) ? root.items : []),
    ];

    const racesList: any[] = [
      ...(Array.isArray(root.race) ? root.race : root.race ? [root.race] : []),
      ...(Array.isArray(root.races) ? root.races : []),
      ...(Array.isArray(root.ancestry) ? root.ancestry : root.ancestry ? [root.ancestry] : []),
      ...(Array.isArray(root.ancestries) ? root.ancestries : []),
    ];

    const subracesList: any[] = [
      ...(Array.isArray(root.subrace) ? root.subrace : root.subrace ? [root.subrace] : []),
      ...(Array.isArray(root.subraces) ? root.subraces : []),
    ];

    const classesList: any[] = [
      ...(Array.isArray(root.class) ? root.class : root.class ? [root.class] : []),
      ...(Array.isArray(root.classes) ? root.classes : []),
      ...(Array.isArray(root.subclass) ? root.subclass : root.subclass ? [root.subclass] : []),
      ...(Array.isArray(root.subclasses) ? root.subclasses : []),
    ];

    const featsList: any[] = [
      ...(Array.isArray(root.feat) ? root.feat : root.feat ? [root.feat] : []),
      ...(Array.isArray(root.feats) ? root.feats : []),
    ];

    const pagesList: any[] = [
      ...(Array.isArray(root.pages) ? root.pages : []),
      ...(Array.isArray(root.page) ? root.page : root.page ? [root.page] : []),
      ...(Array.isArray(root.chapters) ? root.chapters : []),
      ...(Array.isArray(root.chapter) ? root.chapter : root.chapter ? [root.chapter] : []),
    ];

    // Direct root array classification
    if (Array.isArray(data)) {
      data.forEach((item) => {
        if (!item || typeof item !== 'object') return;
        if (item.level !== undefined || item.school || item.components || item.time || item.range) {
          spellsList.push(item);
        } else if (item.cr !== undefined || item.ac || item.hp || item.str) {
          monstersList.push(item);
        } else if (item.rarity || item.type === 'weapon' || item.type === 'armor' || item.weight) {
          itemsList.push(item);
        } else if (item.raceName || item.subraces || (item.ability && (item.speed || item.size))) {
          racesList.push(item);
        } else if (item.hd || item.classFeatures) {
          classesList.push(item);
        }
      });
    }

    // 1. Monsters / Bestiary
    monstersList.forEach((m, idx) => {
      if (!m || !m.name) return;
      const id = this.generateSafeUniqueId('5etools-mon', `${m.name}-${m.source || 'srd'}`, idx + 1);
      const ac = Array.isArray(m.ac) ? (typeof m.ac[0] === 'object' ? m.ac[0].ac : m.ac[0]) : m.ac || 10;
      const hp = m.hp?.average ?? (typeof m.hp === 'number' ? m.hp : 10);
      const hitDice = m.hp?.formula;
      const cr = typeof m.cr === 'object' ? m.cr.cr : m.cr ?? '1';

      const stats: NormalizedStats = {
        hp,
        maxHp: hp,
        hitDice,
        ac,
        speed: this.formatSpeed(m.speed),
        cr: `${cr}`,
        attributes: {
          str: m.str ?? 10,
          dex: m.dex ?? 10,
          con: m.con ?? 10,
          int: m.int ?? 10,
          wis: m.wis ?? 10,
          cha: m.cha ?? 10,
        },
        senses: this.cleanEntries(m.senses),
        languages: this.cleanEntries(m.languages),
      };

      const actions: NormalizedAction[] = [];
      if (Array.isArray(m.action)) {
        for (const a of m.action) {
          actions.push({
            name: a.name || 'Действие',
            type: 'action',
            description: this.cleanEntries(a.entries || a.text),
          });
        }
      }

      const traits: NormalizedTrait[] = [];
      if (Array.isArray(m.trait)) {
        for (const t of m.trait) {
          traits.push({
            name: t.name || 'Особенность',
            description: this.cleanEntries(t.entries || t.text),
          });
        }
      }

      const desc = this.cleanEntries(m.entries || m.text || m.description);

      entities.push({
        id,
        name: m.name,
        category: 'monsters',
        sourceFormat: '5etools_monster',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `HP ${hp} (${hitDice || ''}), AC ${ac}, CR ${cr}, Скорость ${stats.speed}`,
        description: desc,
        tags: ['5eTools', 'Монстр', `CR ${cr}`, m.type?.type || m.type || 'creature'],
        stats,
        actions: actions.length > 0 ? actions : undefined,
        traits: traits.length > 0 ? traits : undefined,
        rawContent: m,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.monstersCount++;
    });

    // 2. Spells
    spellsList.forEach((s, idx) => {
      if (!s || !s.name) return;
      const id = this.generateSafeUniqueId('5etools-spell', s.name, idx + 1);
      const desc = this.cleanEntries(s.entries || s.text || s.description);
      const levelNum = s.level !== undefined ? parseInt(s.level, 10) || 0 : 0;
      const levelStr = levelNum === 0 ? 'Заговор' : `${levelNum}-й круг`;

      entities.push({
        id,
        name: s.name,
        category: 'spells',
        sourceFormat: '5etools_spell',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `${levelStr}, ${s.school || 'школа'}, время: ${s.time ? this.cleanEntries(s.time) : '1 действие'}, дистанция: ${s.range ? this.cleanEntries(s.range) : 'касание'}`,
        description: desc,
        tags: ['Заклинание', 'D&D 5e', levelStr, String(s.school || 'magic')],
        stats: {
          level: levelNum,
          school: s.school,
          time: s.time,
          range: s.range,
          components: s.components,
          duration: s.duration,
          classes: s.classes,
        },
        rawContent: s,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.spellsCount++;
    });

    // 3. Items
    itemsList.forEach((it, idx) => {
      if (!it || !it.name) return;
      const id = this.generateSafeUniqueId('5etools-item', it.name, idx + 1);
      const desc = this.cleanEntries(it.entries || it.text || it.description);

      entities.push({
        id,
        name: it.name,
        category: 'items',
        sourceFormat: '5etools_item',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `${it.rarity || 'Обычный'} ${it.type || 'предмет'}, вес: ${it.weight || 0} фнт.`,
        description: desc,
        tags: ['Предмет', 'D&D 5e', String(it.rarity || 'common'), String(it.type || 'item')],
        rawContent: it,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.itemsCount++;
    });

    // 4. Races
    racesList.forEach((r, idx) => {
      if (!r || typeof r !== 'object') return;
      const rawName = r.name || `Раса #${idx + 1}`;
      const name = this.cleanMarkdownHeader(rawName);
      const id = this.generateSafeUniqueId('5etools-race', name, idx + 1);
      const desc = this.cleanEntries(r.entries || r.text || r.description || r);
      const speed = this.formatSpeed(r.speed);
      const size = Array.isArray(r.size) ? r.size.join('/') : r.size || 'M';
      const abilities = this.formatAbilityBonuses(r.ability);

      entities.push({
        id,
        name,
        category: 'races',
        sourceFormat: '5etools_compendium',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `Размер: ${size}, Скорость: ${speed}${abilities ? `, Бонусы: ${abilities}` : ''}`,
        description: desc,
        tags: ['Раса', 'D&D 5e', name],
        rawContent: r,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.rulesCount++;
    });

    // 5. Subraces
    subracesList.forEach((sr, idx) => {
      if (!sr || typeof sr !== 'object') return;
      const raceName = sr.raceName || sr.race || 'Раса';
      const rawSubName = sr.name || `Подраса #${idx + 1}`;
      const cleanSubName = this.cleanMarkdownHeader(rawSubName);
      const name = cleanSubName.toLowerCase().includes(raceName.toLowerCase())
        ? cleanSubName
        : `${raceName} (${cleanSubName})`;
      const id = this.generateSafeUniqueId('5etools-subrace', name, idx + 1);
      const desc = this.cleanEntries(sr.entries || sr.text || sr.description || sr);
      const abilities = this.formatAbilityBonuses(sr.ability);

      entities.push({
        id,
        name,
        category: 'races',
        sourceFormat: '5etools_compendium',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `Подраса для ${raceName}${abilities ? `. Бонусы: ${abilities}` : ''}`,
        description: desc,
        tags: ['Подраса', 'D&D 5e', raceName, cleanSubName],
        rawContent: sr,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.rulesCount++;
    });

    // 6. Classes
    classesList.forEach((c, idx) => {
      if (!c || typeof c !== 'object') return;
      const rawName = c.name || `Класс #${idx + 1}`;
      const name = this.cleanMarkdownHeader(rawName);
      const id = this.generateSafeUniqueId('5etools-class', name, idx + 1);
      const desc = this.cleanEntries(c.entries || c.text || c.description || c);

      entities.push({
        id,
        name,
        category: 'classes',
        sourceFormat: '5etools_compendium',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `Класс D&D 5e: ${name}`,
        description: desc,
        tags: ['Класс', 'D&D 5e', name],
        rawContent: c,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.rulesCount++;
    });

    // 7. Feats
    featsList.forEach((f, idx) => {
      if (!f || typeof f !== 'object') return;
      const rawName = f.name || `Черта #${idx + 1}`;
      const name = this.cleanMarkdownHeader(rawName);
      const id = this.generateSafeUniqueId('5etools-feat', name, idx + 1);
      const desc = this.cleanEntries(f.entries || f.text || f.description || f);

      entities.push({
        id,
        name,
        category: 'feats',
        sourceFormat: '5etools_compendium',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `Черта/Особенность: ${name}`,
        description: desc,
        tags: ['Черта', 'D&D 5e', name],
        rawContent: f,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.rulesCount++;
    });

    // 8. Book Pages / Chapters
    pagesList.forEach((p, idx) => {
      if (!p || typeof p !== 'object') return;
      const rawName = p.name || p.title || p.header || `Страница #${idx + 1}`;
      const name = this.cleanMarkdownHeader(rawName);
      const isRace = this.isRaceNameOrContext(name, root.name);
      const category = isRace ? 'races' : 'rules';
      const id = this.generateSafeUniqueId(isRace ? '5etools-race-page' : '5etools-page', name, idx + 1);
      const desc = this.cleanEntries(p.entries || p.text || p.content || p.description || p);

      entities.push({
        id,
        name,
        category,
        sourceFormat: '5etools_compendium',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...',
        description: desc,
        tags: [isRace ? 'Раса' : 'Глава/Страница', 'D&D 5e', name],
        rawContent: p,
        suggestedFilename: `${id}.json`,
      });
      statsCounter.rulesCount++;
    });

    // 9. Rules, Variant Rules, Tables, Conditions, Actions, Sections
    const rulesList: any[] = [
      ...(Array.isArray(root.variantrule) ? root.variantrule : root.variantrule ? [root.variantrule] : []),
      ...(Array.isArray(root.variantrules) ? root.variantrules : []),
      ...(Array.isArray(root.rule) ? root.rule : root.rule ? [root.rule] : []),
      ...(Array.isArray(root.rules) ? root.rules : []),
      ...(Array.isArray(root.action) ? root.action : root.action ? [root.action] : []),
      ...(Array.isArray(root.actions) ? root.actions : []),
      ...(Array.isArray(root.condition) ? root.condition : root.condition ? [root.condition] : []),
      ...(Array.isArray(root.conditions) ? root.conditions : []),
      ...(Array.isArray(root.background) ? root.background : root.background ? [root.background] : []),
      ...(Array.isArray(root.backgrounds) ? root.backgrounds : []),
      ...(Array.isArray(root.table) ? root.table : root.table ? [root.table] : []),
      ...(Array.isArray(root.tables) ? root.tables : []),
      ...(Array.isArray(root.section) ? root.section : root.section ? [root.section] : []),
      ...(Array.isArray(root.sections) ? root.sections : []),
    ];

    rulesList.forEach((r, idx) => {
      if (!r || typeof r !== 'object') return;
      const rawName = r.name || r.title || r.header || `Правило #${idx + 1}`;
      const name = this.cleanMarkdownHeader(rawName);
      const id = this.generateSafeUniqueId('5etools-rule', name, idx + 1);
      const isTable = Boolean(r.table || r.rows || r.caption);
      const category = isTable ? 'tables' : 'rules';
      const desc = this.extractTextContent(r.entries || r.text || r.content || r.description || r.table || r);

      entities.push({
        id,
        name,
        category,
        sourceFormat: '5etools_compendium',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: desc.slice(0, 160).replace(/[\*\#\`\n]/g, ' ').trim() + '...',
        description: desc,
        tags: [isTable ? 'Таблица' : 'Правила', 'D&D 5e'],
        rawContent: r,
        suggestedFilename: `${id}.json`,
      });
      if (isTable) statsCounter.tablesCount++;
      else statsCounter.rulesCount++;
    });

    // 10. Fallback for generic JSON structures / dictionary objects
    if (entities.length === 0) {
      const genericEntities = this.parseGenericJsonData(data, input.filename, input.targetSystemId);
      genericEntities.forEach((ent) => {
        entities.push(ent);
        if (ent.category === 'rules') statsCounter.rulesCount++;
        else if (ent.category === 'tables') statsCounter.tablesCount++;
        else if (ent.category === 'monsters') statsCounter.monstersCount++;
        else if (ent.category === 'spells') statsCounter.spellsCount++;
        else if (ent.category === 'items') statsCounter.itemsCount++;
        else statsCounter.otherCount++;
      });
    }

    return {
      success: entities.length > 0,
      sourceFormat: '5etools_compendium',
      formatDescription: `5eTools / JSON Справочник (${entities.length} сущностей)`,
      totalEntitiesFound: entities.length,
      entities,
      errors,
      warnings,
      stats: statsCounter,
    };
  }

  private cleanEntries(entries: any): string {
    if (!entries) return '';
    if (typeof entries === 'string') {
      return this.clean5eTags(entries);
    }
    if (Array.isArray(entries)) {
      return entries
        .map((e) => {
          if (typeof e === 'string') return this.clean5eTags(e);
          if (typeof e === 'object' && e.entries) return this.cleanEntries(e.entries);
          if (typeof e === 'object' && e.name) return `**${e.name}**: ${this.cleanEntries(e.entries || e.text)}`;
          return '';
        })
        .filter(Boolean)
        .join('\n\n');
    }
    return '';
  }

  private clean5eTags(text: string): string {
    if (!text) return '';
    const cleaned = text
      .replace(/\{@(damage|dice|d20|hit|savingThrow|scaledamage|scaledice)\s+([^}]+)\}/gi, '$2')
      .replace(/\{@(spell|item|creature|skill|condition|sense|hazard|action|race|background|feat)\s+([^}|]+)(?:\|[^}]+)?\}/gi, '$2')
      .replace(/\{@b\s+([^}]+)\}/gi, '**$1**')
      .replace(/\{@i\s+([^}]+)\}/gi, '*$1*')
      .replace(/\{@note\s+([^}]+)\}/gi, '> $1')
      .trim();
    return TextSanitizer.cleanHtmlAndMacros(cleaned);
  }

  private formatSpeed(speed: any): string {
    if (!speed) return '30 ft';
    if (typeof speed === 'string' || typeof speed === 'number') return `${speed}`;
    if (typeof speed === 'object') {
      const parts: string[] = [];
      if (speed.walk) parts.push(`${speed.walk} ft`);
      if (speed.fly) parts.push(`fly ${typeof speed.fly === 'object' ? speed.fly.number : speed.fly} ft`);
      if (speed.swim) parts.push(`swim ${speed.swim} ft`);
      if (speed.climb) parts.push(`climb ${speed.climb} ft`);
      return parts.join(', ') || '30 ft';
    }
    return '30 ft';
  }

  private tryParseJson(text?: string): any {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}
