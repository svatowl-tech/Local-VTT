import { UniversalParseResult, UniversalParsedEntity } from './types';
import { FiveToolsParser } from './fiveToolsParser';
import { TextSanitizer } from './textSanitizer';

export interface QualityEvaluationResult {
  hasRawCodeIssue: boolean;
  rawCodeEntityCount: number;
  totalEntityCount: number;
  issues: string[];
  reparsedEntities?: UniversalParsedEntity[];
}

export class CodeQualityDetector {
  private static fiveToolsParser = new FiveToolsParser();

  /**
   * Cleans raw HTML tags, Foundry VTT macros (@Embed, @UUID, @Compendium) and 5eTools tags,
   * converting them into clean, human-readable Markdown.
   */
  public static cleanHtmlAndMacros(input: string): string {
    return TextSanitizer.cleanHtmlAndMacros(input);
  }

  /**
   * Evaluates a parse result for raw code / unparsed JSON/YAML/MD dumps / raw HTML / VTT macros.
   * Auto-cleans and re-evaluates entities.
   */
  public static evaluateAndFix(
    result: UniversalParseResult,
    filename?: string,
    targetSystemId?: string
  ): UniversalParseResult {
    if (!result || !result.entities || result.entities.length === 0) {
      return result;
    }

    const newEntities: UniversalParsedEntity[] = [];
    const qualityErrors: string[] = [];
    const qualityWarnings: string[] = [];
    let rawCodeEntitiesCount = 0;

    for (const entity of result.entities) {
      let currentEntity = { ...entity };
      let evaluation = this.checkEntityQuality(currentEntity);

      if (evaluation.isRawCode) {
        // Attempt 1: Auto-cleaning HTML tags and VTT macros
        if (currentEntity.description || currentEntity.summary) {
          const cleanedDesc = this.cleanHtmlAndMacros(currentEntity.description || '');
          const cleanedSummary = this.cleanHtmlAndMacros(currentEntity.summary || '');

          currentEntity.description = cleanedDesc;
          currentEntity.summary = cleanedSummary.length > 160 ? cleanedSummary.slice(0, 160) + '...' : cleanedSummary;

          // Re-check quality
          evaluation = this.checkEntityQuality(currentEntity);
          if (!evaluation.isRawCode) {
            qualityWarnings.push(
              `[Авто-исправление] Сущность «${currentEntity.name}» с сырым HTML/макрокодом очищена и преобразована в Markdown.`
            );
            newEntities.push(currentEntity);
            continue;
          }
        }

        // Attempt 2: Re-parsing / unpacking if rawContent is available
        if (currentEntity.rawContent && typeof currentEntity.rawContent === 'object') {
          const recovered = this.attemptUnpacking(currentEntity.rawContent, filename || currentEntity.name, targetSystemId);
          if (recovered.length > 0) {
            const cleanRecovered = recovered.map((rec) => {
              const recDesc = this.cleanHtmlAndMacros(rec.description || '');
              return { ...rec, description: recDesc };
            });

            if (cleanRecovered.some((e) => !this.checkEntityQuality(e).isRawCode)) {
              qualityWarnings.push(
                `[Авто-исправление] Сущность «${currentEntity.name}» с сырым кодом успешно перераспакована в ${cleanRecovered.length} структурированных карточек.`
              );
              newEntities.push(...cleanRecovered.filter((e) => !this.checkEntityQuality(e).isRawCode));
              continue;
            }
          }
        }

        // If cleaning and re-parsing failed, flag the error
        rawCodeEntitiesCount++;
        const detailMsg = `[Детектор качества парсинга] Ошибка в сущности «${currentEntity.name || 'Без названия'}»: ${evaluation.reason}`;
        qualityErrors.push(detailMsg);
      }

      newEntities.push(currentEntity);
    }

    const updatedResult: UniversalParseResult = {
      ...result,
      entities: newEntities,
      totalEntitiesFound: newEntities.length,
      errors: [...(result.errors || []), ...qualityErrors],
      warnings: [...(result.warnings || []), ...qualityWarnings],
    };

    // If all entities are raw code dumps/HTML and could not be recovered, mark parse as FAILED
    const allFailed = newEntities.length === 0 || newEntities.every((e) => this.checkEntityQuality(e).isRawCode);
    if (rawCodeEntitiesCount > 0 && allFailed) {
      updatedResult.success = false;
      updatedResult.errors.unshift(
        `ПАРСИНГ НЕУДАЧЕН: Найдено ${rawCodeEntitiesCount} сырых текстовых/JSON/HTML дампов кода вместо человекочитаемых карточек данных.`
      );
    } else {
      updatedResult.success = newEntities.some((e) => !this.checkEntityQuality(e).isRawCode);
    }

    return updatedResult;
  }

  /**
   * Inspects a single entity to detect if it's a raw unformatted code dump, raw HTML, or unparsed macro string.
   */
  public static checkEntityQuality(entity: UniversalParsedEntity): {
    isRawCode: boolean;
    reason?: string;
  } {
    const name = (entity.name || '').trim();
    const desc = (entity.description || '').trim();
    const summary = (entity.summary || '').trim();

    // 1. Invalid or code-like name
    if (!name || name === '[object Object]' || name === 'undefined' || name === 'null') {
      return { isRawCode: true, reason: 'Имя сущности содержит синтаксический мусор или пустую строку' };
    }
    if (name.startsWith('{') || name.startsWith('[') || name.includes('":')) {
      return { isRawCode: true, reason: 'Имя сущности является необработанной JSON/YAML строкой' };
    }

    // 2. Raw JSON string in description or summary
    const isJsonString = (str: string) => {
      const s = str.trim();
      return (
        (s.startsWith('{') && s.endsWith('}')) ||
        (s.startsWith('[') && s.endsWith(']')) ||
        s.startsWith('```json') ||
        s.startsWith('```yaml') ||
        s.startsWith('```yml')
      );
    };

    if (isJsonString(desc)) {
      return {
        isRawCode: true,
        reason: 'Описание (description) является сырым неоформленным дамп-кодом JSON/YAML',
      };
    }

    if (isJsonString(summary) && summary.length > 50) {
      return {
        isRawCode: true,
        reason: 'Сводка (summary) содержит дамп сырого JSON/YAML кода',
      };
    }

    // 3. Raw HTML tags in description
    const hasRawHtmlTags = /<\/?(p|h1|h2|h3|h4|h5|div|span|br|ul|ol|li|strong|b|em|i|table|tr|td|th|a|blockquote)\b[^>]*>/i.test(desc);
    if (hasRawHtmlTags) {
      return {
        isRawCode: true,
        reason: 'Описание содержит сырые HTML-теги (<p>, <h2>, <div> и т.д.) вместо Markdown текста',
      };
    }

    // 4. Unparsed VTT macros (@Embed, @UUID, @Compendium)
    const hasUnparsedMacros = /@(Embed|UUID|Compendium|JournalEntry|Check|Damage)\[[^\]]+\]/i.test(desc);
    if (hasUnparsedMacros) {
      return {
        isRawCode: true,
        reason: 'Описание содержит нераспарсенные макросы VTT (@Embed[...], @UUID[...])',
      };
    }

    // 5. Fallback unextracted document object dump
    if (entity.rawContent && typeof entity.rawContent === 'object') {
      const rc = entity.rawContent;

      const unextractedKeys: string[] = [];
      if (Array.isArray(rc.pages) && rc.pages.length > 0) unextractedKeys.push('pages');
      if (Array.isArray(rc.chapters) && rc.chapters.length > 0) unextractedKeys.push('chapters');
      if (Array.isArray(rc.race) || Array.isArray(rc.races)) unextractedKeys.push('races');
      if (Array.isArray(rc.subrace) || Array.isArray(rc.subraces)) unextractedKeys.push('subraces');
      if (Array.isArray(rc.class) || Array.isArray(rc.classes)) unextractedKeys.push('classes');
      if (Array.isArray(rc.feat) || Array.isArray(rc.feats)) unextractedKeys.push('feats');

      if (unextractedKeys.length > 0 && desc.startsWith('{')) {
        return {
          isRawCode: true,
          reason: `Сущность содержит нераспакованные коллекции данных [${unextractedKeys.join(', ')}] и выведена в виде дампа кода.`,
        };
      }
    }

    // 6. Uncleaned 5eTools tags cluttering the text excessively
    const tagMatches = desc.match(/\{@[a-z_]+[^}]*\}/gi);
    if (tagMatches && tagMatches.length > 8 && !desc.includes('**') && !desc.includes('###')) {
      return {
        isRawCode: true,
        reason: 'Описание содержит нераспарсенные теги разметки (например, {@spell ...})',
      };
    }

    return { isRawCode: false };
  }

  /**
   * Attempts to unpack a raw JSON/YAML object into formatted entities using FiveToolsParser.
   */
  private static attemptUnpacking(
    rawObj: any,
    filename: string,
    targetSystemId?: string
  ): UniversalParsedEntity[] {
    try {
      const parsed = this.fiveToolsParser.parseGenericJsonData(rawObj, filename, targetSystemId || 'dnd5e');
      return parsed;
    } catch {
      return [];
    }
  }
}
