import {
  IFormatParser,
  ParserInput,
  UniversalParseResult,
  UniversalParsedEntity,
  NormalizedStats,
  NormalizedAction,
  NormalizedTrait,
} from './types';

export class TextStatblockParser implements IFormatParser {
  public canParse(input: ParserInput): boolean {
    return Boolean(input.rawText && input.rawText.length > 0);
  }

  public parse(input: ParserInput): UniversalParseResult {
    const text = input.rawText || '';
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

    if (!text.trim()) {
      return {
        success: false,
        sourceFormat: 'text_statblock',
        formatDescription: 'Text Data',
        totalEntitiesFound: 0,
        entities: [],
        errors: ['Текстовый файл пуст'],
        warnings: [],
        stats: statsCounter,
      };
    }

    try {
      // 1. Check for YAML frontmatter markdown
      if (text.startsWith('---')) {
        const frontmatterEnd = text.indexOf('---', 3);
        if (frontmatterEnd !== -1) {
          const fmText = text.slice(3, frontmatterEnd);
          const bodyText = text.slice(frontmatterEnd + 3).trim();
          const docTitle =
            this.extractField(fmText, 'name') ||
            this.extractField(fmText, 'title') ||
            input.filename?.replace(/\.(md|txt)$/i, '') ||
            'Текстовый документ';
          const category = this.extractField(fmText, 'category') || 'rules';
          const id = `md-${docTitle}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

          entities.push({
            id,
            name: docTitle,
            category,
            sourceFormat: 'markdown_doc',
            sourceSystem: input.targetSystemId || 'generic',
            summary: bodyText.slice(0, 160).replace(/[#*`_]/g, '').trim() + '...',
            description: bodyText,
            tags: ['Markdown', category],
            rawContent: { frontmatter: fmText, body: bodyText },
            suggestedFilename: `${id}.md`,
          });
          statsCounter.rulesCount++;
        }
      }

      // 2. Try parsing standard creature statblock
      const trimmed = text.trim();
      const isJsonString = trimmed.startsWith('{') || trimmed.startsWith('[');
      const isStatblock =
        !isJsonString &&
        (text.includes('Armor Class') || text.includes('Класс доспеха') || text.includes('AC ') || text.includes('КД ')) &&
        (text.includes('Hit Points') || text.includes('Хиты') || text.includes('HP '));

      if (isStatblock) {
        const parsedCreature = this.parseCreatureStatblock(text, input.filename, input.targetSystemId);
        if (parsedCreature) {
          entities.push(parsedCreature);
          statsCounter.monstersCount++;
        }
      }

      // 3. If no entities were found yet, treat as rule text or notes document
      if (entities.length === 0) {
        const docName =
          input.filename?.replace(/\.(md|txt)$/i, '').replace(/_/g, ' ') || 'Текстовый справочник';
        const id = `txt-${docName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

        entities.push({
          id,
          name: docName,
          category: input.suggestedCategory || 'rules',
          sourceFormat: input.filename?.endsWith('.md') ? 'markdown_doc' : 'text_statblock',
          sourceSystem: input.targetSystemId || 'generic',
          summary: text.slice(0, 180).replace(/\s+/g, ' ').trim() + '...',
          description: text,
          tags: ['Текст', 'Правила'],
          rawContent: { text },
          suggestedFilename: `${id}.md`,
        });
        statsCounter.rulesCount++;
      }
    } catch (err: any) {
      errors.push(`Ошибка при парсинге текста: ${err?.message || err}`);
    }

    return {
      success: entities.length > 0,
      sourceFormat: 'text_statblock',
      formatDescription: `Текстовые данные (${entities.length} сущностей)`,
      totalEntitiesFound: entities.length,
      entities,
      errors,
      warnings,
      stats: statsCounter,
    };
  }

  private parseCreatureStatblock(
    text: string,
    filename?: string,
    targetSystemId?: string
  ): UniversalParsedEntity | null {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) return null;

    const rawName = lines[0] || filename?.replace(/\.(md|txt)$/i, '') || 'Существо';
    if (/^[\[\{\"\']/.test(rawName) || rawName.includes('{') || rawName.includes('}') || rawName.length > 80) {
      return null;
    }
    const name = rawName;
    const id = `txt-stat-${name}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    // Extract AC
    const acMatch = text.match(/(?:Armor Class|Класс Доспеха|AC|КД)\s*[:]?\s*(\d+)/i);
    const ac = acMatch ? parseInt(acMatch[1], 10) : 10;

    // Extract HP
    const hpMatch = text.match(/(?:Hit Points|Хиты|HP)\s*[:]?\s*(\d+)(?:\s*\(([^)]+)\))?/i);
    const hp = hpMatch ? parseInt(hpMatch[1], 10) : 10;
    const hitDice = hpMatch ? hpMatch[2]?.trim() : undefined;

    // Extract Speed
    const speedMatch = text.match(/(?:Speed|Скорость)\s*[:]?\s*([^\n,]+)/i);
    const speed = speedMatch ? speedMatch[1].trim() : '30 ft';

    // Extract CR
    const crMatch = text.match(/(?:Challenge|Опасность|CR)\s*[:]?\s*([0-9/]+)/i);
    const cr = crMatch ? crMatch[1].trim() : undefined;

    // Extract Attributes
    const attrMatch = text.match(
      /(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)/
    );
    const attributes = attrMatch
      ? {
          str: parseInt(attrMatch[1], 10),
          dex: parseInt(attrMatch[2], 10),
          con: parseInt(attrMatch[3], 10),
          int: parseInt(attrMatch[4], 10),
          wis: parseInt(attrMatch[5], 10),
          cha: parseInt(attrMatch[6], 10),
        }
      : undefined;

    // Extract Actions
    const actions: NormalizedAction[] = [];
    const actionIndex = text.search(/(?:ACTIONS|ДЕЙСТВИЯ)/i);
    if (actionIndex !== -1) {
      const actionBlock = text.slice(actionIndex);
      const actionLines = actionBlock.split(/\r?\n/).slice(1);
      for (const line of actionLines) {
        const dotIndex = line.indexOf('.');
        if (dotIndex > 1 && dotIndex < 35) {
          const actName = line.slice(0, dotIndex).trim();
          const actDesc = line.slice(dotIndex + 1).trim();
          actions.push({
            name: actName,
            type: 'action',
            description: actDesc,
          });
        }
      }
    }

    const stats: NormalizedStats = {
      hp,
      maxHp: hp,
      hitDice,
      ac,
      speed,
      cr,
      attributes,
    };

    return {
      id,
      name,
      category: 'monsters',
      sourceFormat: 'text_statblock',
      sourceSystem: targetSystemId || 'dnd5e',
      summary: `Статблок: HP ${hp} (${hitDice || ''}), AC ${ac}, Скорость ${speed}${cr ? `, CR ${cr}` : ''}`,
      description: text,
      tags: ['Статблок', 'Текст', cr ? `CR ${cr}` : 'Монстр'].filter(Boolean) as string[],
      stats,
      actions: actions.length > 0 ? actions : undefined,
      rawContent: { rawText: text },
      suggestedFilename: `${id}.json`,
    };
  }

  private extractField(yaml: string, field: string): string | undefined {
    const match = yaml.match(new RegExp(`^${field}\\s*:\\s*["']?([^"'\r\n]+)["']?`, 'im'));
    return match ? match[1].trim() : undefined;
  }
}
