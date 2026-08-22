import * as pdfParseModule from 'pdf-parse';
import {
  IFormatParser,
  ParserInput,
  UniversalParseResult,
  UniversalParsedEntity,
  NormalizedStats,
  NormalizedAction,
} from './types';

const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;

export class PdfParser implements IFormatParser {
  public canParse(input: ParserInput): boolean {
    return (
      (input.filename && input.filename.toLowerCase().endsWith('.pdf')) ||
      (input.rawBuffer !== undefined && input.rawBuffer.length > 4 && input.rawBuffer.toString('utf8', 0, 4) === '%PDF')
    );
  }

  public async parse(input: ParserInput): Promise<UniversalParseResult> {
    const buffer = input.rawBuffer;
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

    if (!buffer || buffer.length === 0) {
      return {
        success: false,
        sourceFormat: 'pdf_document',
        formatDescription: 'PDF Document',
        totalEntitiesFound: 0,
        entities: [],
        errors: ['Пустой PDF буфер'],
        warnings: [],
        stats: statsCounter,
      };
    }

    try {
      // Parse PDF using pdf-parse
      const pdfData = await pdfParse(buffer);
      const totalPages = pdfData.numpages || 1;
      const fullText = pdfData.text || '';
      const docTitle =
        pdfData.info?.Title ||
        input.filename?.replace(/\.pdf$/i, '').replace(/_/g, ' ') ||
        'PDF Документ';

      // 1. Create main document entity (for rules & full text reference)
      const mainDocId = `pdf-${docTitle}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
      const cleanSummary = fullText.slice(0, 240).replace(/\s+/g, ' ').trim();

      entities.push({
        id: mainDocId,
        name: docTitle,
        category: 'rules',
        sourceFormat: 'pdf_document',
        sourceSystem: input.targetSystemId || 'generic',
        summary: `PDF Документ: ${docTitle} (${totalPages} стр.). ${cleanSummary}...`,
        description: fullText,
        tags: ['PDF', 'Правила', `Стр: ${totalPages}`, pdfData.info?.Author || 'PDF Export'],
        pdfSource: {
          pageNumber: 1,
          totalPages,
          section: 'Полный текст',
        },
        rawContent: {
          info: pdfData.info,
          metadata: pdfData.metadata,
          version: pdfData.version,
          totalPages,
        },
        suggestedFilename: `${mainDocId}.md`,
      });
      statsCounter.rulesCount++;

      // 2. Extract discrete statblocks / monsters from PDF text
      const extractedBlocks = this.extractStatblocksFromPdfText(fullText, docTitle, input.targetSystemId);
      for (const block of extractedBlocks) {
        entities.push(block);
        if (block.category === 'monsters') statsCounter.monstersCount++;
        else if (block.category === 'spells') statsCounter.spellsCount++;
        else if (block.category === 'items') statsCounter.itemsCount++;
        else statsCounter.otherCount++;
      }
    } catch (err: any) {
      errors.push(`Ошибка при разборе PDF файла: ${err?.message || err}`);
    }

    return {
      success: entities.length > 0,
      sourceFormat: 'pdf_document',
      formatDescription: `PDF Документ (${entities.length} сущностей)`,
      totalEntitiesFound: entities.length,
      entities,
      errors,
      warnings,
      stats: statsCounter,
    };
  }

  /**
   * Scans PDF text for classic statblock patterns (D&D 5e, OSR, Pathfinder)
   */
  private extractStatblocksFromPdfText(
    text: string,
    docTitle: string,
    targetSystemId?: string
  ): UniversalParsedEntity[] {
    const results: UniversalParsedEntity[] = [];

    // Pattern for D&D / Pathfinder creature statblock headers
    // Matches patterns like:
    // Goblin
    // Small humanoid (goblinoid), neutral evil
    // Armor Class 15
    // Hit Points 7 (2d6)
    // Speed 30 ft.
    const statblockRegex =
      /([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё0-9\s'-]{2,30})\n(?:(Tiny|Small|Medium|Large|Huge|Gargantuan|Крошечный|Маленький|Средний|Большой|Огромный|Громадный)[^\n]+)\n+(?:(?:Armor Class|Класс Доспеха|AC|КД)\s*[:]?\s*(\d+)[^\n]*)\n+(?:(?:Hit Points|Хиты|HP)\s*[:]?\s*(\d+)(?:\s*\(([^)]+)\))?[^\n]*)\n+(?:(?:Speed|Скорость)\s*[:]?\s*([^\n]+))/gi;

    let match;
    let index = 0;
    while ((match = statblockRegex.exec(text)) !== null && index < 50) {
      index++;
      const name = match[1].trim();
      const ac = parseInt(match[3], 10) || 10;
      const hp = parseInt(match[4], 10) || 10;
      const hitDice = match[5]?.trim();
      const speed = match[6]?.trim() || '30 ft';

      const id = `pdf-statblock-${name}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      // Extract trailing text slice for actions/traits
      const startPos = match.index;
      const blockSlice = text.slice(startPos, startPos + 1200);

      // Search for attributes (STR DEX CON INT WIS CHA)
      const statsMatch =
        blockSlice.match(/(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)\s+(\d+)\s*\([+-]?\d+\)/);

      const attributes: Record<string, number> | undefined = statsMatch
        ? {
            str: parseInt(statsMatch[1], 10),
            dex: parseInt(statsMatch[2], 10),
            con: parseInt(statsMatch[3], 10),
            int: parseInt(statsMatch[4], 10),
            wis: parseInt(statsMatch[5], 10),
            cha: parseInt(statsMatch[6], 10),
          }
        : undefined;

      // Extract Challenge / CR
      const crMatch = blockSlice.match(/(?:Challenge|Опасность|CR)\s*[:]?\s*([0-9/]+)/i);
      const cr = crMatch ? crMatch[1] : undefined;

      const actions: NormalizedAction[] = [];
      const actionHeaderMatch = blockSlice.match(/(?:ACTIONS|ДЕЙСТВИЯ)([\s\S]*?)(?:REACTIONS|LEGENDARY|РЕАКЦИИ|$)/i);
      if (actionHeaderMatch) {
        const actionText = actionHeaderMatch[1];
        const atkMatches = actionText.matchAll(/([A-ZА-ЯЁ][A-Za-zА-Яа-яЁё\s]+)\.\s*([^\n.]+)/g);
        for (const atk of atkMatches) {
          actions.push({
            name: atk[1].trim(),
            type: 'action',
            description: atk[2].trim(),
          });
        }
      }

      const entity: UniversalParsedEntity = {
        id,
        name,
        category: 'monsters',
        sourceFormat: 'pdf_document',
        sourceSystem: targetSystemId || 'dnd5e',
        summary: `Извлечено из PDF «${docTitle}»: HP ${hp} (${hitDice || ''}), AC ${ac}, Скорость ${speed}${cr ? `, CR ${cr}` : ''}`,
        description: blockSlice.trim(),
        tags: ['PDF Statblock', 'Монстр', cr ? `CR ${cr}` : undefined].filter(Boolean) as string[],
        stats: {
          hp,
          maxHp: hp,
          hitDice,
          ac,
          speed,
          cr,
          attributes,
        },
        actions: actions.length > 0 ? actions : undefined,
        rawContent: {
          extractedText: blockSlice,
          matchedHeader: match[0],
        },
        suggestedFilename: `${id}.json`,
      };

      results.push(entity);
    }

    return results;
  }
}
