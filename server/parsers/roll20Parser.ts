import {
  IFormatParser,
  ParserInput,
  UniversalParseResult,
  UniversalParsedEntity,
  NormalizedStats,
  NormalizedAction,
} from './types';

export class Roll20Parser implements IFormatParser {
  public canParse(input: ParserInput): boolean {
    const data = input.parsedJson || this.tryParseJson(input.rawText);
    if (!data) return false;

    return (
      (data.schema_version !== undefined && (data.attribs !== undefined || data.abilities !== undefined)) ||
      (Array.isArray(data.attributes) && (data.bio !== undefined || data.gmnotes !== undefined))
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
        sourceFormat: 'roll20_character',
        formatDescription: 'Roll20 Export Data',
        totalEntitiesFound: 0,
        entities: [],
        errors: ['Не удалось разобрать структуру экспорта Roll20'],
        warnings: [],
        stats: statsCounter,
      };
    }

    try {
      const charName = rawData.name || input.filename?.replace(/\.json$/i, '') || 'Персонаж Roll20';
      const id = `roll20-${charName}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

      const attribsList: Array<{ name: string; current: any; max?: any }> =
        rawData.attribs || rawData.attributes || [];

      // Convert flat attribute array into a fast lookup map
      const attrMap = new Map<string, { current: any; max?: any }>();
      const repeatingAttacks = new Map<string, Record<string, any>>();

      for (const attr of attribsList) {
        if (!attr || !attr.name) continue;
        const key = attr.name.toLowerCase();
        attrMap.set(key, attr);

        // Detect repeating attacks e.g. repeating_attack_$0_atkname
        const match = key.match(/^repeating_attack_([^_]+)_(.+)$/);
        if (match) {
          const rowId = match[1];
          const field = match[2];
          if (!repeatingAttacks.has(rowId)) {
            repeatingAttacks.set(rowId, {});
          }
          repeatingAttacks.get(rowId)![field] = attr.current;
        }
      }

      // Check if NPC
      const isNpc =
        attrMap.get('npc')?.current === '1' ||
        attrMap.get('npc')?.current === 1 ||
        attrMap.has('npc_ac') ||
        attrMap.has('npc_hp');

      const hpVal = parseInt(
        attrMap.get('hp')?.current ?? attrMap.get('npc_hp')?.current ?? attrMap.get('hit_points')?.current ?? '10',
        10
      );
      const hpMax = parseInt(
        attrMap.get('hp')?.max ?? attrMap.get('npc_hp')?.max ?? `${hpVal}`,
        10
      );
      const acVal = parseInt(
        attrMap.get('ac')?.current ?? attrMap.get('npc_ac')?.current ?? attrMap.get('armor_class')?.current ?? '10',
        10
      );
      const speed = attrMap.get('speed')?.current ?? attrMap.get('npc_speed')?.current ?? '30 ft';
      const cr = attrMap.get('npc_challenge')?.current ?? attrMap.get('challenge')?.current;
      const level = parseInt(attrMap.get('level')?.current ?? '1', 10);

      // Core attributes
      const attributes: Record<string, number> = {
        str: parseInt(attrMap.get('strength')?.current ?? attrMap.get('npc_str')?.current ?? '10', 10),
        dex: parseInt(attrMap.get('dexterity')?.current ?? attrMap.get('npc_dex')?.current ?? '10', 10),
        con: parseInt(attrMap.get('constitution')?.current ?? attrMap.get('npc_con')?.current ?? '10', 10),
        int: parseInt(attrMap.get('intelligence')?.current ?? attrMap.get('npc_int')?.current ?? '10', 10),
        wis: parseInt(attrMap.get('wisdom')?.current ?? attrMap.get('npc_wis')?.current ?? '10', 10),
        cha: parseInt(attrMap.get('charisma')?.current ?? attrMap.get('npc_cha')?.current ?? '10', 10),
      };

      const stats: NormalizedStats = {
        hp: isNaN(hpVal) ? 10 : hpVal,
        maxHp: isNaN(hpMax) ? (isNaN(hpVal) ? 10 : hpVal) : hpMax,
        ac: isNaN(acVal) ? 10 : acVal,
        speed: `${speed}`,
        cr: cr !== undefined ? `${cr}` : undefined,
        level: isNaN(level) ? 1 : level,
        attributes,
      };

      // Actions from repeating attacks
      const actions: NormalizedAction[] = [];
      for (const [_, atk] of repeatingAttacks.entries()) {
        const atkName = atk.atkname || atk.name || 'Атака';
        const atkBonus = atk.atkbonus || atk.bonus || '+0';
        const atkDmg = atk.dmgbase || atk.damage || '1d6';
        const atkType = atk.atktype || 'melee';

        actions.push({
          name: atkName,
          type: 'attack',
          toHit: atkBonus,
          damage: atkDmg,
          description: `${atkType} атака, урон: ${atkDmg}`,
        });
      }

      // Abilities / Macros
      if (Array.isArray(rawData.abilities)) {
        for (const ab of rawData.abilities) {
          if (ab.name && ab.action) {
            actions.push({
              name: ab.name,
              type: 'special',
              description: ab.action,
            });
          }
        }
      }

      const category = isNpc ? 'monsters' : 'characters';
      if (category === 'characters') statsCounter.charactersCount++;
      else statsCounter.monstersCount++;

      const entity: UniversalParsedEntity = {
        id,
        name: charName,
        originalName: rawData.name,
        category,
        sourceFormat: 'roll20_character',
        sourceSystem: input.targetSystemId || 'dnd5e',
        summary: `Roll20 ${isNpc ? 'NPC' : 'Персонаж'}: Хиты ${stats.hp}/${stats.maxHp}, КД ${stats.ac}, Скорость ${stats.speed}`,
        description: this.stripHtml(rawData.bio || rawData.gmnotes || ''),
        tags: ['Roll20', isNpc ? 'NPC' : 'Персонаж', stats.cr ? `CR ${stats.cr}` : `Lvl ${stats.level}`],
        stats,
        actions: actions.length > 0 ? actions : undefined,
        rawContent: rawData,
        suggestedFilename: `${id}.json`,
      };

      entities.push(entity);
    } catch (err: any) {
      errors.push(`Ошибка парсинга Roll20: ${err?.message || err}`);
    }

    return {
      success: entities.length > 0,
      sourceFormat: 'roll20_character',
      formatDescription: `Roll20 (${entities.length} сущностей)`,
      totalEntitiesFound: entities.length,
      entities,
      errors,
      warnings,
      stats: statsCounter,
    };
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
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
