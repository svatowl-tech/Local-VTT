import YAML from 'yaml';
import { XMLParser } from 'fast-xml-parser';
import {
  IFormatParser,
  ParserInput,
  UniversalParseResult,
  UniversalParsedEntity,
  NormalizedStats,
} from './types';

export class XmlYamlCsvParser implements IFormatParser {
  private xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    isArray: (name) =>
      ['spell', 'monster', 'item', 'class', 'race', 'feat', 'background', 'trait', 'action', 'reaction', 'legendary', 'text', 'roll'].includes(
        name.toLowerCase()
      ),
  });

  public canParse(input: ParserInput): boolean {
    const ext = input.filename?.toLowerCase() || '';
    return (
      ext.endsWith('.xml') ||
      ext.endsWith('.gcs') ||
      ext.endsWith('.yaml') ||
      ext.endsWith('.yml') ||
      ext.endsWith('.csv') ||
      ext.endsWith('.tsv')
    );
  }

  private generateSafeUniqueId(prefix: string, name: string, index: number): string {
    const cleanName = String(name || 'entity')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `${prefix}-${cleanName || 'item'}-${index}`;
  }

  public parse(input: ParserInput): UniversalParseResult {
    const filename = input.filename?.toLowerCase() || '';
    const rawText = input.rawText || (input.rawBuffer ? input.rawBuffer.toString('utf8') : '');

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

    if (!rawText.trim()) {
      return {
        success: false,
        sourceFormat: 'generic_json',
        formatDescription: 'Empty Data',
        totalEntitiesFound: 0,
        entities: [],
        errors: ['Файл пуст'],
        warnings: [],
        stats: statsCounter,
      };
    }

    try {
      // 1. YAML Parser
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        const parsedYaml = YAML.parse(rawText);
        const name = parsedYaml?.name || input.filename?.replace(/\.ya?ml$/i, '') || 'YAML Данные';
        const id = `yaml-${name}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const category = parsedYaml?.category || input.suggestedCategory || 'rules';

        entities.push({
          id,
          name,
          category,
          sourceFormat: 'yaml_data',
          sourceSystem: input.targetSystemId || 'generic',
          summary: `YAML документ: ${name}`,
          description: typeof parsedYaml === 'string' ? parsedYaml : JSON.stringify(parsedYaml, null, 2),
          tags: ['YAML', category],
          rawContent: parsedYaml,
          suggestedFilename: `${id}.json`,
        });
        statsCounter.rulesCount++;
      }

      // 2. CSV / TSV Parser
      else if (filename.endsWith('.csv') || filename.endsWith('.tsv')) {
        const delimiter = filename.endsWith('.tsv') || rawText.includes('\t') ? '\t' : ',';
        const rows = this.parseCsvRows(rawText, delimiter);

        const tableName = input.filename?.replace(/\.(csv|tsv)$/i, '').replace(/_/g, ' ') || 'Таблица данных';
        const id = `csv-table-${tableName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

        const headers = rows.length > 0 ? rows[0] : [];
        const dataRows = rows.slice(1);

        entities.push({
          id,
          name: tableName,
          category: 'tables',
          sourceFormat: 'csv_table',
          sourceSystem: input.targetSystemId || 'generic',
          summary: `Таблица: ${tableName} (${dataRows.length} строк, ${headers.length} колонок)`,
          tags: ['Таблица', 'CSV/TSV', `${dataRows.length} записей`],
          tableData: {
            headers,
            rows: dataRows,
          },
          rawContent: { headers, rows: dataRows },
          suggestedFilename: `${id}.json`,
        });
        statsCounter.tablesCount++;
      }

      // 3. XML / GCS Parser
      else if (filename.endsWith('.xml') || filename.endsWith('.gcs')) {
        const parsedXml = this.xmlParser.parse(rawText);

        // GURPS Character Sheet XML
        if (parsedXml.character_sheet || parsedXml.character) {
          const sheet = parsedXml.character_sheet || parsedXml.character;
          const charName = sheet.profile?.name || sheet.name || 'GURPS Персонаж';
          const id = `gcs-${charName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

          const stats: NormalizedStats = {
            hp: sheet.attributes?.hp || sheet.hp || 10,
            attributes: {
              st: sheet.attributes?.st || 10,
              dx: sheet.attributes?.dx || 10,
              iq: sheet.attributes?.iq || 10,
              ht: sheet.attributes?.ht || 10,
            },
          };

          entities.push({
            id,
            name: charName,
            category: 'characters',
            sourceFormat: 'gurps_gcs',
            sourceSystem: input.targetSystemId || 'gurps',
            summary: `GURPS Персонаж: ST ${stats.attributes?.st}, DX ${stats.attributes?.dx}, IQ ${stats.attributes?.iq}, HT ${stats.attributes?.ht}, HP ${stats.hp}`,
            tags: ['GURPS', 'GCS', 'Персонаж'],
            stats,
            rawContent: parsedXml,
            suggestedFilename: `${id}.json`,
          });
          statsCounter.charactersCount++;
        } else {
          // Check for Compendium XML (FightClub5e / SRD / D&D 5e XML export)
          const root = parsedXml.compendium || parsedXml.spells || parsedXml.monsters || parsedXml.items || parsedXml;

          const rawSpells = root.spell || root.spells || [];
          const rawMonsters = root.monster || root.monsters || [];
          const rawItems = root.item || root.items || [];
          const rawFeats = root.feat || root.feats || [];
          const rawRaces = root.race || root.races || [];
          const rawClasses = root.class || root.classes || [];

          const spellsList = Array.isArray(rawSpells) ? rawSpells : [rawSpells];
          const monstersList = Array.isArray(rawMonsters) ? rawMonsters : [rawMonsters];
          const itemsList = Array.isArray(rawItems) ? rawItems : [rawItems];
          const featsList = Array.isArray(rawFeats) ? rawFeats : [rawFeats];
          const racesList = Array.isArray(rawRaces) ? rawRaces : [rawRaces];
          const classesList = Array.isArray(rawClasses) ? rawClasses : [rawClasses];

          let extractedCount = 0;

          // 1. Spells
          spellsList.forEach((s: any, idx: number) => {
            if (!s || typeof s !== 'object') return;
            const spellName = s.name || s['@_name'] || `Заклинание #${idx + 1}`;
            const id = this.generateSafeUniqueId('xml-spell', spellName, idx + 1);

            const levelNum = s.level !== undefined ? parseInt(s.level, 10) || 0 : 0;
            const levelStr = levelNum === 0 ? 'Заговор' : `${levelNum}-й круг`;
            const schoolStr = this.formatSchoolName(s.school);

            const textLines = Array.isArray(s.text) ? s.text.filter(Boolean).map(String) : s.text ? [String(s.text)] : [];
            const desc = textLines.join('\n\n');

            entities.push({
              id,
              name: spellName,
              category: 'spells',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'dnd5e',
              summary: `${levelStr}, ${schoolStr}, время: ${s.time || '1 действие'}, дист: ${s.range || 'касание'}`,
              description: desc,
              tags: ['Заклинание', 'XML', levelStr, schoolStr, ...(s.classes ? String(s.classes).split(',').map((c: string) => c.trim()) : [])],
              stats: {
                level: levelNum,
                school: s.school,
                time: s.time,
                range: s.range,
                components: s.components,
                duration: s.duration,
                classes: s.classes,
                roll: s.roll,
              },
              rawContent: s,
              suggestedFilename: `${id}.json`,
            });
            statsCounter.spellsCount++;
            extractedCount++;
          });

          // 2. Monsters
          monstersList.forEach((m: any, idx: number) => {
            if (!m || typeof m !== 'object') return;
            const monName = m.name || m['@_name'] || `Монстр #${idx + 1}`;
            const id = this.generateSafeUniqueId('xml-mon', monName, idx + 1);

            const textLines = Array.isArray(m.text) ? m.text.filter(Boolean).map(String) : m.text ? [String(m.text)] : [];
            const desc = textLines.join('\n\n');

            const actions: any[] = [];
            if (Array.isArray(m.action)) {
              m.action.forEach((act: any) => {
                actions.push({
                  name: act.name || 'Действие',
                  type: 'action',
                  description: Array.isArray(act.text) ? act.text.join('\n') : String(act.text || ''),
                });
              });
            }

            const traits: any[] = [];
            if (Array.isArray(m.trait)) {
              m.trait.forEach((tr: any) => {
                traits.push({
                  name: tr.name || 'Особенность',
                  description: Array.isArray(tr.text) ? tr.text.join('\n') : String(tr.text || ''),
                });
              });
            }

            entities.push({
              id,
              name: monName,
              category: 'monsters',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'dnd5e',
              summary: `Монстр (${m.size || 'M'} ${m.type || 'существо'}), AC ${m.ac || 10}, HP ${m.hp || 10}, CR ${m.cr || '1'}`,
              description: desc,
              tags: ['Монстр', 'XML', `CR ${m.cr || '1'}`, String(m.type || 'creature')],
              stats: {
                ac: typeof m.ac === 'number' ? m.ac : parseInt(m.ac, 10) || 10,
                hp: typeof m.hp === 'number' ? m.hp : parseInt(m.hp, 10) || 10,
                maxHp: typeof m.hp === 'number' ? m.hp : parseInt(m.hp, 10) || 10,
                speed: m.speed,
                cr: `${m.cr || '1'}`,
                attributes: {
                  str: parseInt(m.str, 10) || 10,
                  dex: parseInt(m.dex, 10) || 10,
                  con: parseInt(m.con, 10) || 10,
                  int: parseInt(m.int, 10) || 10,
                  wis: parseInt(m.wis, 10) || 10,
                  cha: parseInt(m.cha, 10) || 10,
                },
              },
              actions: actions.length > 0 ? actions : undefined,
              traits: traits.length > 0 ? traits : undefined,
              rawContent: m,
              suggestedFilename: `${id}.json`,
            });
            statsCounter.monstersCount++;
            extractedCount++;
          });

          // 3. Items
          itemsList.forEach((it: any, idx: number) => {
            if (!it || typeof it !== 'object') return;
            const itemName = it.name || it['@_name'] || `Предмет #${idx + 1}`;
            const id = this.generateSafeUniqueId('xml-item', itemName, idx + 1);

            const textLines = Array.isArray(it.text) ? it.text.filter(Boolean).map(String) : it.text ? [String(it.text)] : [];

            entities.push({
              id,
              name: itemName,
              category: 'items',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'dnd5e',
              summary: `Предмет (${it.type || 'снаряжение'}), ценность: ${it.value || '—'}, вес: ${it.weight || '—'}`,
              description: textLines.join('\n\n'),
              tags: ['Предмет', 'XML', String(it.type || 'equipment')],
              rawContent: it,
              suggestedFilename: `${id}.json`,
            });
            statsCounter.itemsCount++;
            extractedCount++;
          });

          // 4. Races
          racesList.forEach((rule: any, idx: number) => {
            if (!rule || typeof rule !== 'object') return;
            const raceName = rule.name || rule['@_name'] || `Раса #${idx + 1}`;
            const id = this.generateSafeUniqueId('xml-race', raceName, idx + 1);

            const textLines = Array.isArray(rule.text) ? rule.text.filter(Boolean).map(String) : rule.text ? [String(rule.text)] : [];

            // Extract sub-traits inside <trait> tags
            const extractedTraits: any[] = [];
            const traitTexts: string[] = [];
            if (Array.isArray(rule.trait)) {
              rule.trait.forEach((tr: any) => {
                if (!tr || typeof tr !== 'object') return;
                const trName = tr.name || 'Особенность';
                const trTexts = Array.isArray(tr.text) ? tr.text.filter(Boolean).map(String) : tr.text ? [String(tr.text)] : [];
                const desc = trTexts.join('\n');
                extractedTraits.push({
                  name: trName,
                  description: desc,
                });
                traitTexts.push(`### ${trName}\n${desc}`);
              });
            } else if (rule.trait && typeof rule.trait === 'object') {
              // Single trait parsed as object instead of array
              const trName = rule.trait.name || 'Особенность';
              const trTexts = Array.isArray(rule.trait.text) ? rule.trait.text.filter(Boolean).map(String) : rule.trait.text ? [String(rule.trait.text)] : [];
              const desc = trTexts.join('\n');
              extractedTraits.push({
                name: trName,
                description: desc,
              });
              traitTexts.push(`### ${trName}\n${desc}`);
            }

            const introParts: string[] = [];
            if (rule.size) introParts.push(`**Размер:** ${rule.size}`);
            if (rule.speed) introParts.push(`**Скорость:** ${rule.speed} фт.`);
            if (rule.ability) introParts.push(`**Увеличение характеристик:** ${rule.ability}`);
            if (rule.proficiency) introParts.push(`**Умения расы:** ${rule.proficiency}`);

            let fullDescription = '';
            if (introParts.length > 0) {
              fullDescription += introParts.join('\n') + '\n\n';
            }
            if (traitTexts.length > 0) {
              fullDescription += `## Особенности расы\n\n` + traitTexts.join('\n\n');
            } else if (textLines.length > 0) {
              fullDescription += textLines.join('\n\n');
            }

            entities.push({
              id,
              name: raceName,
              category: 'races',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'dnd5e',
              summary: `Раса (${rule.size || 'M'} ${rule.speed || 30} фт.), бонусы: ${rule.ability || '—'}`,
              description: fullDescription || 'Нет описания',
              tags: ['Раса', 'XML', `Размер ${rule.size || 'M'}`],
              rawContent: {
                ...rule,
                traits: extractedTraits,
                speed: rule.speed,
                size: rule.size,
                abilityScoreIncrease: rule.ability,
              },
              traits: extractedTraits,
              suggestedFilename: `${id}.json`,
            });
            statsCounter.rulesCount++;
            extractedCount++;
          });

          // 5. Classes
          classesList.forEach((rule: any, idx: number) => {
            if (!rule || typeof rule !== 'object') return;
            const className = rule.name || rule['@_name'] || `Класс #${idx + 1}`;
            const id = this.generateSafeUniqueId('xml-class', className, idx + 1);

            const textLines = Array.isArray(rule.text) ? rule.text.filter(Boolean).map(String) : rule.text ? [String(rule.text)] : [];

            // Parse features in autolevel tags
            const extractedFeatures: any[] = [];
            const featureTexts: string[] = [];

            const autolevels = Array.isArray(rule.autolevel) ? rule.autolevel : rule.autolevel ? [rule.autolevel] : [];
            autolevels.forEach((al: any) => {
              if (!al || typeof al !== 'object') return;
              const lvl = al['@_level'] || al.level || '';
              const features = Array.isArray(al.feature) ? al.feature : al.feature ? [al.feature] : [];
              features.forEach((feat: any) => {
                if (!feat || typeof feat !== 'object') return;
                const featName = feat.name || 'Умение';
                const featTexts = Array.isArray(feat.text) ? feat.text.filter(Boolean).map(String) : feat.text ? [String(feat.text)] : [];
                const desc = featTexts.join('\n');

                extractedFeatures.push({
                  name: lvl ? `${featName} (${lvl} уровень)` : featName,
                  description: desc,
                });
                featureTexts.push(`### ${featName} (${lvl ? `${lvl} уровень` : ''})\n${desc}`);
              });
            });

            let classDesc = '';
            if (rule.hd) classDesc += `**Кость хитов:** d${rule.hd}\n`;
            if (rule.proficiency) classDesc += `**Умения класса:** ${rule.proficiency}\n`;
            if (rule.spellAbility) classDesc += `**Характеристика заклинаний:** ${rule.spellAbility}\n`;

            if (classDesc) {
              classDesc += '\n';
            }
            if (featureTexts.length > 0) {
              classDesc += `## Классовые умения\n\n` + featureTexts.join('\n\n');
            } else if (textLines.length > 0) {
              classDesc += textLines.join('\n\n');
            }

            entities.push({
              id,
              name: className,
              category: 'classes',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'dnd5e',
              summary: `Класс (Кость хитов: d${rule.hd || 8}), умения: ${rule.proficiency || '—'}`,
              description: classDesc || 'Нет описания',
              tags: ['Класс', 'XML', `d${rule.hd || 8}`],
              rawContent: {
                ...rule,
                classFeatures: extractedFeatures,
                hitDice: rule.hd ? `d${rule.hd}` : undefined,
              },
              suggestedFilename: `${id}.json`,
            });
            statsCounter.rulesCount++;
            extractedCount++;
          });

          // 6. Feats
          featsList.forEach((rule: any, idx: number) => {
            if (!rule || typeof rule !== 'object') return;
            const featName = rule.name || rule['@_name'] || `Черта #${idx + 1}`;
            const id = this.generateSafeUniqueId('xml-feat', featName, idx + 1);

            const textLines = Array.isArray(rule.text) ? rule.text.filter(Boolean).map(String) : rule.text ? [String(rule.text)] : [];

            let featDesc = '';
            if (rule.prerequisite) {
              featDesc += `**Требование:** ${rule.prerequisite}\n\n`;
            }
            featDesc += textLines.join('\n\n');

            entities.push({
              id,
              name: featName,
              category: 'feats',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'dnd5e',
              summary: `Черта / Фишка (Требование: ${rule.prerequisite || 'нет'})`,
              description: featDesc || 'Нет описания',
              tags: ['Черта', 'XML'],
              rawContent: rule,
              suggestedFilename: `${id}.json`,
            });
            statsCounter.rulesCount++;
            extractedCount++;
          });

          // Fallback if no specific compendium tags matched
          if (extractedCount === 0) {
            const docName = input.filename?.replace(/\.xml$/i, '') || 'XML Документ';
            const id = `xml-${docName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

            entities.push({
              id,
              name: docName,
              category: 'rules',
              sourceFormat: 'xml_export',
              sourceSystem: input.targetSystemId || 'generic',
              summary: `XML Экспорт: ${docName}`,
              description: JSON.stringify(parsedXml, null, 2),
              tags: ['XML', 'Экспорт'],
              rawContent: parsedXml,
              suggestedFilename: `${id}.json`,
            });
            statsCounter.rulesCount++;
          }
        }
      }
    } catch (err: any) {
      errors.push(`Ошибка парсинга XML/YAML/CSV: ${err?.message || err}`);
    }

    return {
      success: entities.length > 0,
      sourceFormat: 'yaml_data',
      formatDescription: `Структурированные данные (${entities.length} сущностей)`,
      totalEntitiesFound: entities.length,
      entities,
      errors,
      warnings,
      stats: statsCounter,
    };
  }

  private parseCsvRows(text: string, delimiter: string): string[][] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const result: string[][] = [];

    for (const line of lines) {
      // Basic CSV splitter respecting quotes
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());
      result.push(values);
    }

    return result;
  }

  private formatSchoolName(code: any): string {
    if (!code) return 'Универсальная магия';
    const c = String(code).trim().toUpperCase();
    if (c === 'EV' || c === 'E' || c.includes('EVOC')) return 'Воплощение (Evocation)';
    if (c === 'A' || c.includes('ABJ')) return 'Ограждение (Abjuration)';
    if (c === 'C' || c.includes('CONJ')) return 'Вызов (Conjuration)';
    if (c === 'D' || c.includes('DIV')) return 'Прорицание (Divination)';
    if (c === 'EN' || c.includes('ENC')) return 'Очарование (Enchantment)';
    if (c === 'I' || c.includes('ILL')) return 'Иллюзия (Illusion)';
    if (c === 'N' || c.includes('NEC')) return 'Некромантия (Necromancy)';
    if (c === 'T' || c.includes('TRANS')) return 'Преобразование (Transmutation)';
    return String(code);
  }
}
