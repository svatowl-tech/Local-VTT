import { PolzaEntityType, PolzaDataGenOptions } from '../types/polzaTypes';
import { WorldLoreItem, LoreCategory } from '../types/worldLoreTypes';
import { worldLoreService } from './worldLoreService';
import { rustSystemSearchService } from './rustSystemSearchService';
import { initiativeEngine } from './initiativeEngine';
import { campaignService } from './campaignService';
import { MonsterTemplate, PlayerCharacter, MapItem } from '../types';
import { generateMonsterTokenSvg, generateNpcTokenSvg } from '../utils/tokenSvgFactory';
import { polzaService } from './polzaService';

export interface AdaptedPolzaEntityResult {
  entityType: PolzaEntityType | 'prop';
  name: string;
  originalName?: string;
  summary: string;
  loreItem?: WorldLoreItem;
  monsterTemplate?: MonsterTemplate;
  playerCharacter?: PlayerCharacter;
  propItem?: MapItem;
  rawJson: any;
}

/**
 * Service that converts raw AI JSON outputs into native app entities,
 * auto-saves them into local databases (Lore Wiki, Bestiary, Compendium, Initiative, Props)
 * and makes them immediately usable in the UI.
 */
export class PolzaEntityAdapterService {
  /**
   * Directly generates an entity via Polza AI API, adapts it, and auto-saves it to local DBs
   */
  public async generateAndSaveEntity(
    entityType: PolzaEntityType | 'prop' | string,
    promptText?: string,
    options?: Partial<PolzaDataGenOptions>
  ): Promise<AdaptedPolzaEntityResult> {
    const genOptions: Partial<PolzaDataGenOptions> = {
      entityType: entityType as PolzaEntityType,
      userPrompt: promptText || options?.userPrompt || '',
      ...options,
    };

    const customApiKey = polzaService.getStoredApiKey();

    const res = await fetch('/api/polza/generate-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-distill-llama-70b',
        options: genOptions,
        customApiKey: customApiKey || undefined,
        autoSaveToDatabase: true,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success || !data.jsonData) {
      throw new Error(data.error || 'Ошибка генерации через Polza AI');
    }

    return await this.adaptAndSave(data.jsonData, entityType, genOptions);
  }

  /**
   * Adapts and saves any Polza AI generated JSON to local application databases
   */
  public async adaptAndSave(
    jsonData: any,
    entityType: PolzaEntityType | 'prop' | string,
    options?: Partial<PolzaDataGenOptions>
  ): Promise<AdaptedPolzaEntityResult> {
    if (!jsonData || typeof jsonData !== 'object') {
      throw new Error('Невалидные данные JSON от Polza AI');
    }

    const worldId = options?.worldId || 'dnd5e_faerun';
    const name = jsonData.name || jsonData.title || jsonData.fullName || 'Безымянный объект';
    const originalName = jsonData.originalName || jsonData.englishName || '';

    let loreItem: WorldLoreItem | undefined;
    let monsterTemplate: MonsterTemplate | undefined;
    let playerCharacter: PlayerCharacter | undefined;
    let propItem: MapItem | undefined;

    const normalizedType = (entityType || jsonData.entityType || 'lore').toLowerCase();

    // 1. MONSTER ENTITY
    if (normalizedType === 'monster' || jsonData.cr !== undefined || jsonData.stats?.str !== undefined) {
      monsterTemplate = this.createMonsterTemplateFromData(jsonData);
      
      // Save to Initiative Engine Monster DB
      initiativeEngine.addMonsterToDb({
        name: monsterTemplate.name,
        type: monsterTemplate.type,
        maxHp: monsterTemplate.maxHp,
        ac: monsterTemplate.ac,
        initBonus: monsterTemplate.initBonus,
        cr: monsterTemplate.cr,
        avatar: monsterTemplate.avatar,
        notes: monsterTemplate.notes,
      });

      // Save to Lore Wiki as Bestiary Entry
      loreItem = this.createLoreItemFromMonster(jsonData, worldId);
      await worldLoreService.saveItem(loreItem);

      // Register in Rust System Search Compendium
      this.registerMonsterInSearchService(jsonData, monsterTemplate);
    }
    // 2. NPC ENTITY
    else if (normalizedType === 'npc' || jsonData.race !== undefined || jsonData.classType !== undefined) {
      playerCharacter = this.createNpcCharacterFromData(jsonData);

      // Save to Initiative Engine NPC DB
      initiativeEngine.addPlayerToDb({
        name: playerCharacter.name,
        classLevel: playerCharacter.classLevel,
        playerOwner: playerCharacter.playerOwner || 'НИП',
        maxHp: playerCharacter.maxHp,
        currentHp: playerCharacter.currentHp,
        ac: playerCharacter.ac,
        initBonus: playerCharacter.initBonus,
        avatar: playerCharacter.avatar,
        notes: playerCharacter.notes,
        isPresent: true,
      });

      // Save to Campaign Service NPCs list
      const campaignNpc = campaignService.addNpc({
        name: playerCharacter.name,
        role: jsonData.role || jsonData.occupation || jsonData.socialStatus || 'НИП',
        race: (playerCharacter as any).race || jsonData.race || 'Гуманоид',
        factionName: jsonData.faction || 'Независимый',
        locationName: jsonData.locationName || jsonData.location || 'Местный район',
        attitude: (jsonData.attitude as any) || 'friendly',
        status: 'alive',
        secrets: jsonData.summaryAndSecrets || jsonData.description || jsonData.secrets || playerCharacter.notes || '',
        appearance: jsonData.appearance || '',
        tags: [jsonData.role || 'NPC'],
      });

      // Automatically add relationship links if specified
      if (Array.isArray(jsonData.relationships) && campaignNpc) {
        jsonData.relationships.forEach((rel: any) => {
          campaignService.addRelationship({
            sourceNpcId: campaignNpc.id,
            targetNpcId: rel.targetNpcId || rel.targetName || 'Другой НПС',
            relationshipType: rel.relationshipType || rel.type || 'ally',
            description: rel.description || '',
          });
        });
      }

      // Determine Lore Category (npc_figure / ruler)
      const isRuler = options?.loreCategory === 'npc_figure' || (jsonData.socialStatus && jsonData.socialStatus.toLowerCase().includes('прав'));
      loreItem = this.createLoreItemFromNpc(jsonData, worldId, isRuler ? 'npc_figure' : 'npc_figure');
      await worldLoreService.saveItem(loreItem);

      // Register in Search Service
      this.registerNpcInSearchService(jsonData, playerCharacter);
    }
    // 3. PROP / DECORATION / OBJECT ENTITY
    else if (normalizedType === 'prop' || jsonData.isProp || jsonData.objectCategory) {
      propItem = this.createPropFromData(jsonData);
      // Lore record for prop if significant
      loreItem = this.createLoreItemFromProp(jsonData, worldId);
      await worldLoreService.saveItem(loreItem);
    }
    // 4. LOCATION / SETTLEMENT ENTITY
    else if (normalizedType === 'location' || jsonData.locationType || jsonData.districts) {
      const locCategory: LoreCategory = 'settlement';
      loreItem = this.createLoreItemFromLocation(jsonData, worldId, locCategory);
      await worldLoreService.saveItem(loreItem);
      this.registerLoreInSearchService(loreItem);

      const poiList = (Array.isArray(jsonData.keyFeatures) ? jsonData.keyFeatures : Array.isArray(jsonData.districts) ? jsonData.districts : []).map((feat: any, idx: number) => ({
        id: `poi-${Date.now()}-${idx}`,
        name: typeof feat === 'string' ? feat : feat.name || `Точка #${idx+1}`,
        description: typeof feat === 'string' ? '' : feat.description || '',
      }));

      // Save directly to Campaign Locations
      campaignService.addLocation({
        name: jsonData.name || jsonData.title || name || 'Новая локация',
        type: jsonData.locationType || 'city',
        region: jsonData.region || 'Свой мир',
        description: jsonData.description || jsonData.summary || '',
        explorationStatus: 'explored',
        pointsOfInterest: poiList,
        threatLevel: 'medium',
        tags: [jsonData.locationType || 'локация'],
      });
    }
    // 5. QUEST ENTITY
    else if (normalizedType === 'quest' || jsonData.objectives || jsonData.questCategory) {
      const cat: LoreCategory = 'lore_article';
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, cat);
      await worldLoreService.saveItem(loreItem);
      this.registerLoreInSearchService(loreItem);

      // Save directly to Campaign Quests
      campaignService.addQuest({
        title: jsonData.title || jsonData.name || name || 'Новый квест',
        description: jsonData.description || jsonData.summary || '',
        category: jsonData.category || options?.questCategory || 'main',
        status: 'active',
        giverNpcName: jsonData.giverNpcName || jsonData.giver,
        locationName: jsonData.locationName || jsonData.location,
        objectives: Array.isArray(jsonData.objectives)
          ? jsonData.objectives.map((o: any, idx: number) => ({
              id: `obj-${Date.now()}-${idx}`,
              text: typeof o === 'string' ? o : o.text || 'Цель квеста',
              completed: Boolean(o.completed),
            }))
          : [{ id: `obj-${Date.now()}-0`, text: 'Выполнить поручение', completed: false }],
        rewards: {
          xp: jsonData.rewards?.xp || 500,
          gold: jsonData.rewards?.gold || 200,
          items: jsonData.rewards?.items || [],
        },
        secretsAndClues: jsonData.secretsAndClues || [],
        tags: [jsonData.category || 'квест'],
      });
    }
    // 6. SESSION / TIMELINE ENTITY
    else if (normalizedType === 'session' || normalizedType === 'timeline' || jsonData.sessionNumber || jsonData.events) {
      const cat: LoreCategory = 'lore_article';
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, cat);
      await worldLoreService.saveItem(loreItem);

      campaignService.addSession({
        sessionNumber: jsonData.sessionNumber || (campaignService.getState().sessions.length + 1),
        realDate: new Date().toISOString().split('T')[0],
        inGameDate: jsonData.inGameDate || '14 Флеймрула 1492 DR',
        title: jsonData.title || jsonData.name || name || `Сессия #${campaignService.getState().sessions.length + 1}`,
        summary: jsonData.summary || jsonData.description || '',
        keyEvents: Array.isArray(jsonData.keyEvents) ? jsonData.keyEvents : Array.isArray(jsonData.events) ? jsonData.events : [],
        prepGoals: jsonData.notesForNextSession || '',
      });

      if (jsonData.timelineEvent || jsonData.inGameDate) {
        campaignService.addTimelineEvent({
          inGameDate: jsonData.inGameDate || 'День 1',
          title: jsonData.title || jsonData.name || 'Событие таймлайна',
          description: jsonData.summary || jsonData.description || '',
          category: 'party_feat',
          importance: 'major',
        });
      }
    }
    // 7. ITEM / TREASURY / ARTIFACT ENTITY
    else if (normalizedType === 'item' || jsonData.itemType || jsonData.valueGp !== undefined) {
      const cat: LoreCategory = 'lore_item';
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, cat);
      await worldLoreService.saveItem(loreItem);

      campaignService.addSharedItem({
        name: jsonData.name || name || 'Сокровище',
        quantity: jsonData.quantity || 1,
        weight: jsonData.weight || 1,
        description: jsonData.description || jsonData.summary || '',
        rarity: jsonData.rarity || 'uncommon',
      });
    }
    // 8. RULE / HOMEBREW ENTITY
    else if (normalizedType === 'rule' || jsonData.ruleCategory || jsonData.ruleText) {
      const cat: LoreCategory = 'lore_article';
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, cat);
      await worldLoreService.saveItem(loreItem);

      campaignService.addHouseRule({
        title: jsonData.title || jsonData.name || name || 'Правило',
        category: jsonData.category || 'combat',
        description: jsonData.description || jsonData.summary || '',
        ruleText: jsonData.ruleText || jsonData.description || '',
        isActive: true,
      });
    }
    // 9. DEITY / RELIGION / CULT / FACTION
    else if (options?.loreCategory === 'world_overview' || options?.loreCategory === 'faction_cult' || jsonData.deityDomain || jsonData.cultGoal) {
      const cat: LoreCategory = options?.loreCategory === 'faction_cult' ? 'faction_cult' : 'world_overview';
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, cat);
      await worldLoreService.saveItem(loreItem);
      this.registerLoreInSearchService(loreItem);
    }
    // 10. RACE / DEMOGRAPHICS
    else if (options?.loreCategory === 'demographics_race' || jsonData.racialTraits || jsonData.subraces) {
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, 'demographics_race');
      await worldLoreService.saveItem(loreItem);
      this.registerLoreInSearchService(loreItem);
    }
    // 11. GENERAL LORE / CAMPAIGN / OTHER
    else {
      const cat: LoreCategory = (options?.loreCategory as LoreCategory) || 'lore_article';
      loreItem = this.createLoreItemFromGeneral(jsonData, worldId, cat);
      await worldLoreService.saveItem(loreItem);
      this.registerLoreInSearchService(loreItem);
    }

    const summary = jsonData.summary || jsonData.description || jsonData.contentMarkdown?.slice(0, 150) || `${name} — сгенерировано через Polza AI`;

    return {
      entityType: normalizedType as any,
      name,
      originalName,
      summary,
      loreItem,
      monsterTemplate,
      playerCharacter,
      propItem,
      rawJson: jsonData,
    };
  }

  // --- Helper Creators ---

  private createMonsterTemplateFromData(data: any): MonsterTemplate {
    const hp = typeof data.hp === 'number' ? data.hp : parseInt(data.hp, 10) || 30;
    const ac = typeof data.ac === 'number' ? data.ac : parseInt(data.ac, 10) || 13;
    const dex = data.stats?.dex || data.stats?.DEX || 10;
    const initBonus = Math.floor((dex - 10) / 2);

    return {
      id: data.id || `monster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name || 'Монстр',
      type: data.type || data.monsterType || 'Чудовище',
      maxHp: hp,
      ac: ac,
      initBonus,
      cr: data.cr ? `CR ${data.cr}` : 'Ранг 1',
      avatar: data.avatar || data.icon || '👾',
      notes: `${data.size || 'Средний'} ${data.type || ''} • ${data.alignment || 'Нейтральный'}`,
    };
  }

  private createNpcCharacterFromData(data: any): PlayerCharacter {
    const hp = typeof data.hp === 'number' ? data.hp : parseInt(data.hp, 10) || 25;
    const ac = typeof data.ac === 'number' ? data.ac : parseInt(data.ac, 10) || 12;
    const dex = data.stats?.dex || data.stats?.DEX || 12;
    const initBonus = Math.floor((dex - 10) / 2);

    return {
      id: data.id || `npc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name || data.fullName || 'НИП',
      classLevel: `${data.race || 'Гуманоид'} ${data.classType || data.profession || 'Обыватель'}`,
      playerOwner: 'НИП / NPC',
      maxHp: hp,
      currentHp: hp,
      ac: ac,
      initBonus,
      avatar: data.avatar || '👤',
      notes: data.summary || data.motivation || `${data.attitude || 'Нейтральный'}`,
      isPresent: true,
    };
  }

  private createPropFromData(data: any): MapItem {
    const width = data.width || 120;
    const height = data.height || 120;
    return {
      id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: data.name || 'Декорация',
      type: 'image',
      url: data.imageUrl || data.url || '',
      thumbnailUrl: data.imageUrl || data.url || '',
      width,
      height,
      aspectRatio: width / height,
      position: { x: 100, y: 100 },
      scale: { x: 1, y: 1 },
      rotation: 0,
      zIndex: 10,
      opacity: 1,
      hash: `prop-${Math.random().toString(36).substring(2, 8)}`,
      fileSize: 0,
      format: 'png',
      category: data.categoryLabel || data.objectCategory || 'Декорации',
      layer: 'props',
      tags: ['Объект', 'Декор', data.name],
    };
  }

  private createLoreItemFromMonster(data: any, worldId: string): WorldLoreItem {
    const actionsText = Array.isArray(data.actions)
      ? data.actions.map((a: any) => `### ⚔️ ${a.name}\n${a.description || a.text || ''}`).join('\n\n')
      : '';

    const traitsText = Array.isArray(data.traits)
      ? data.traits.map((t: any) => `* **${t.name}**: ${t.description || t.text || ''}`).join('\n')
      : '';

    const content = `
# ${data.name} (${data.originalName || 'Monster'})

**Размер и Тип:** ${data.size || 'Средний'} ${data.type || 'Чудовище'}, ${data.alignment || 'Нейтральный'}  
**Класс Доспеха (AC):** ${data.ac || 13} (${data.acSource || 'естественная броня'})  
**Хиты (HP):** ${data.hp || 30}  
**Опасность (CR):** ${data.cr || '1'} (${data.xp || 200} XP)  

---

## Черты и Способности
${traitsText || 'Нет особых черт.'}

---

## Действия в бою
${actionsText || 'Базовая атака.'}

---

## Лор и Мастерские Заметки
${data.lore || data.summary || 'Опасное существо, обитающее в диких землях или глубоких подземельях.'}
    `.trim();

    return {
      id: `lore-mon-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      worldId,
      worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
      systemId: 'dnd5e',
      name: data.name,
      originalName: data.originalName,
      category: 'lore_article',
      summary: `${data.size || 'Средний'} ${data.type || 'Монстр'}, CR ${data.cr || '1'}. ${data.summary || ''}`,
      content,
      tags: ['Монстр', 'Бестиарий', data.type || 'Чудовище', `CR ${data.cr || 1}`],
      imageUrl: data.imageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private createLoreItemFromNpc(data: any, worldId: string, category: LoreCategory): WorldLoreItem {
    const content = `
# ${data.name || data.fullName} (${data.originalName || 'NPC'})

**Раса и Класс:** ${data.race || 'Гуманоид'} ${data.classType || 'Обыватель'}  
**Мировоззрение:** ${data.alignment || 'Нейтральный'}  
**Статус/Профессия:** ${data.profession || data.socialStatus || 'Загадочная личность'}  

---

## Внешность и Характер
${data.appearance || data.personality || 'Выразительная внешность и уникальная манера речи.'}

## Мотивация и Тайна
* **Мотивация:** ${data.motivation || 'Защита собственных интересов.'}
* **Скрытая тайна:** ${data.secret || 'Скрывает прошлое.'}

---

## Отношение к игрокам
${data.attitude || 'Настороженное, готов к сделке.'}
    `.trim();

    return {
      id: `lore-npc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      worldId,
      worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
      systemId: 'dnd5e',
      name: data.name || data.fullName,
      originalName: data.originalName,
      category,
      summary: `${data.race || ''} ${data.classType || ''} ${data.profession || ''}. ${data.motivation || ''}`,
      content,
      tags: ['НИП', 'Персонаж', data.race || 'Гуманоид', data.classType || 'Персона'],
      imageUrl: data.imageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private createLoreItemFromLocation(data: any, worldId: string, category: LoreCategory): WorldLoreItem {
    const content = data.contentMarkdown || `
# ${data.name} (${data.originalName || 'Location'})

**Тип локации:** ${data.locationType || 'Поселение / Регион'}  
**Атмосфера:** ${data.dangerAtmosphere || 'Загадочная и опасная'}  

---

## Описание
${data.summary || data.description || 'Интересное место с богатой историей.'}

## Районы и достопримечательности
${Array.isArray(data.districts) ? data.districts.map((d: any) => `* **${d.name}**: ${d.description || ''}`).join('\n') : 'Единый комплекс.'}

## Зацепки для квестов
${Array.isArray(data.questHooks) ? data.questHooks.map((h: any) => `* ${h}`).join('\n') : 'Местные жители ищут помощь.'}
    `.trim();

    return {
      id: `lore-loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      worldId,
      worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
      systemId: 'dnd5e',
      name: data.name,
      originalName: data.originalName,
      category,
      summary: data.summary || `${data.locationType || 'Локация'}. ${data.dangerAtmosphere || ''}`,
      content,
      tags: ['Локация', 'Поселение', data.locationType || 'Регион'],
      imageUrl: data.imageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private createLoreItemFromProp(data: any, worldId: string): WorldLoreItem {
    return {
      id: `lore-prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      worldId,
      worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
      systemId: 'dnd5e',
      name: `Объект: ${data.name}`,
      originalName: data.originalName,
      category: 'lore_article',
      summary: `Декоративный объект или конструкция: ${data.name}. ${data.description || ''}`,
      content: `# ${data.name}\n\n${data.description || 'Интерактивный предмет окружения.'}`,
      tags: ['Объект', 'Декорация', data.name],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private createLoreItemFromGeneral(data: any, worldId: string, category: LoreCategory): WorldLoreItem {
    const name = data.name || data.title || 'Статья Лор Вики';
    const content = data.contentMarkdown || `# ${name}\n\n${data.summary || data.description || 'Содержание статьи...'}`;

    return {
      id: `lore-gen-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      worldId,
      worldName: 'Забытые Королевства (Faerûn / D&D 5e)',
      systemId: 'dnd5e',
      name,
      originalName: data.originalName,
      category,
      summary: data.summary || name,
      content,
      tags: data.tags || ['Лор', 'Вики', category],
      imageUrl: data.imageUrl,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  private registerMonsterInSearchService(jsonData: any, template: MonsterTemplate) {
    rustSystemSearchService.registerRuleItem({
      id: `comp-mon-${template.id}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e',
      name: template.name,
      originalName: jsonData.originalName || template.name,
      category: 'monsters',
      format: 'MonsterStatblock',
      summary: `${template.cr} • ${template.type}. HP ${template.maxHp}, AC ${template.ac}`,
      snippet: jsonData.summary || template.notes,
      score: 1,
      matchType: 'exact',
      tags: ['Монстр', template.type, template.cr],
      relativePath: 'monsters',
      stats: {
        hp: template.maxHp,
        ac: template.ac,
        speed: jsonData.speed || '30 фт.',
        cr: template.cr.replace('CR ', '').replace('Ранг ', ''),
        str: jsonData.stats?.str || 10,
        dex: jsonData.stats?.dex || 10,
        con: jsonData.stats?.con || 10,
        int: jsonData.stats?.int || 10,
        wis: jsonData.stats?.wis || 10,
        cha: jsonData.stats?.cha || 10,
      },
    } as any);
  }

  private registerNpcInSearchService(jsonData: any, npc: PlayerCharacter) {
    rustSystemSearchService.registerRuleItem({
      id: `comp-npc-${npc.id}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e',
      name: npc.name,
      originalName: jsonData.originalName || npc.name,
      category: 'npcs',
      format: 'NPCStatblock',
      summary: `${npc.classLevel}. HP ${npc.maxHp}, AC ${npc.ac}`,
      snippet: npc.notes,
      score: 1,
      matchType: 'exact',
      tags: ['НИП', 'Персонаж'],
      relativePath: 'npcs',
      stats: {
        hp: npc.maxHp,
        ac: npc.ac,
        speed: '30 фт.',
        cr: '1',
      },
    } as any);
  }

  private registerLoreInSearchService(loreItem: WorldLoreItem) {
    rustSystemSearchService.registerRuleItem({
      id: `comp-lore-${loreItem.id}`,
      systemId: 'dnd5e',
      systemName: 'D&D 5e',
      name: loreItem.name,
      originalName: loreItem.originalName || loreItem.name,
      category: 'lore',
      format: 'RuleArticle',
      summary: loreItem.summary,
      snippet: loreItem.content.slice(0, 200),
      score: 1,
      matchType: 'exact',
      tags: loreItem.tags,
      relativePath: 'lore',
    } as any);
  }
}

export const polzaEntityAdapterService = new PolzaEntityAdapterService();
