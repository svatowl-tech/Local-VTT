import fs from 'fs';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import {
  PolzaDataGenOptions,
  PolzaDataGenRequest,
  PolzaDataGenResponse,
  PolzaEntityType,
  PolzaTextModelId,
  PolzaTextModelInfo,
} from '../src/types/polzaTypes';
import { systemDirectoryEngine } from './systemDirectoryEngine';
import { loreDirectoryEngine } from './loreDirectoryEngine';
import { campaignDirectoryEngine } from './campaignDirectoryEngine';

export const POLZA_TEXT_MODELS: PolzaTextModelInfo[] = [
  {
    id: 'deepseek/deepseek-r1-distill-llama-70b',
    name: 'DeepSeek R1 Distill Llama 70B',
    provider: 'DeepSeek / Meta',
    description: 'Продвинутая reasoning-модель для генерации сложных D&D статблоков, глубокого лора, нелинейных квестов и баланса правил (по умолчанию).',
    isDefault: true,
    recommendedFor: 'Бестиарий, монстры, NPC, механики правил, сюжеты кампаний',
    supportsReasoning: true,
  },
  {
    id: 'google/gemma-3-27b-it',
    name: 'Google Gemma 3 27B IT',
    provider: 'Google',
    description: 'Новейшая быстрая и креативная модель от Google для атмосферных описаний локаций, диалогов и предметов.',
    recommendedFor: 'Описания карт и локаций, магические предметы, заклинания',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT OSS 20B',
    provider: 'OpenAI Open-Weights',
    description: 'Компактная сбалансированная модель для мгновенной генерации таблиц, лута и коротких статов.',
    recommendedFor: 'Таблицы бросков, быстрые НИП, генераторы снаряжения',
  },
  {
    id: 'deepseek/deepseek-chat',
    name: 'DeepSeek Chat (V3)',
    provider: 'DeepSeek',
    description: 'Высокоскоростная флагманская языковая модель с безупречным русским языком и знанием правил D&D 5e.',
    recommendedFor: 'Универсальная генерация любых JSON и текстов',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    description: 'Флагманская модель для сложнейших многоуровневых кампаний и сценариев.',
    recommendedFor: 'Большие кампании, сложные лорные взаимосвязи',
  },
];

export class PolzaJsonEngine {
  /**
   * Resolve Polza.ai API Key
   */
  public getApiKey(customKey?: string): string {
    return (customKey || process.env.POLZA_AI_API_KEY || '').trim();
  }

  /**
   * Universal Structured JSON Generation via Polza.ai Chat Completions
   */
  public async generateStructuredEntity(req: PolzaDataGenRequest): Promise<PolzaDataGenResponse> {
    const apiKey = this.getApiKey(req.customApiKey);
    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      if (geminiKey) {
        console.log(`[PolzaJsonEngine] POLZA_AI_API_KEY is not set. Using Gemini API fallback for entity: ${req.options.entityType}`);
        return await this.generateWithGeminiFallback(req, geminiKey);
      }
      return {
        success: false,
        entityType: req.options.entityType || 'general',
        jsonData: null,
        error: 'API ключ Polza AI не настроен. Укажите POLZA_AI_API_KEY в .env или введите ключ в окне генерации.',
      };
    }

    const model: PolzaTextModelId = req.model || 'deepseek/deepseek-r1-distill-llama-70b';
    const entityType = req.options.entityType || 'monster';
    const { systemPrompt, userMessage, schemaHint } = this.buildPromptForEntity(req.options);

    // Build payload according to official Polza.ai API ChatCompletions specification
    const payload: Record<string, any> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: typeof req.temperature === 'number' ? Math.min(2, Math.max(0, req.temperature)) : 0.7,
      max_tokens: req.maxTokens || 4096,
    };

    // Only include response_format for models that natively support json_object mode in Polza.ai API
    const supportsJsonObjectMode =
      model === 'openai/gpt-4o' ||
      model === 'openai/gpt-4o-mini' ||
      model.startsWith('openai/gpt-4') ||
      model === 'deepseek/deepseek-chat';

    if (supportsJsonObjectMode) {
      payload.response_format = { type: 'json_object' };
    }

    // Configure reasoning object according to Polza.ai ReasoningDto specification (effort: xhigh | high | medium | low | minimal | none)
    const isReasoningModel =
      model.includes('deepseek-r1') ||
      model.includes('r1') ||
      model.includes('o1') ||
      model.includes('o3');

    if (isReasoningModel) {
      payload.reasoning = {
        effort: 'high',
      };
    }

    try {
      console.log(`[PolzaJsonEngine] Requesting Polza AI Chat completions (${model}) for entity: ${entityType}`);

      const response = await fetch('https://polza.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let resJson: any;
      try {
        resJson = JSON.parse(responseText);
      } catch (pErr) {
        console.error('[PolzaJsonEngine] Response parse error:', responseText);
        if (geminiKey) {
          console.warn('[PolzaJsonEngine] Polza AI response unparseable. Falling back to Gemini API...');
          return await this.generateWithGeminiFallback(req, geminiKey);
        }
        return {
          success: false,
          entityType,
          jsonData: null,
          error: `Ошибка чтения ответа от Polza AI (HTTP ${response.status}): ${responseText.slice(0, 250)}`,
        };
      }

      if (!response.ok) {
        let errorMsg =
          resJson?.error?.message ||
          (typeof resJson?.error === 'string' ? resJson.error : null) ||
          resJson?.message ||
          resJson?.detail;

        if (typeof errorMsg === 'object') {
          errorMsg = JSON.stringify(errorMsg);
        }

        if (!errorMsg) {
          errorMsg = `HTTP ${response.status}: ${responseText.slice(0, 250)}`;
        }

        if ((response.status === 401 || response.status === 403 || response.status === 404) && geminiKey) {
          console.warn(`[PolzaJsonEngine] Polza AI key/endpoint issue (${response.status}). Falling back to Gemini API...`);
          return await this.generateWithGeminiFallback(req, geminiKey);
        }

        return {
          success: false,
          entityType,
          jsonData: null,
          error: `Ошибка Polza AI (${response.status}): ${errorMsg}`,
        };
      }

      const choice = resJson?.choices?.[0];
      const messageContent = choice?.message?.content || '';
      let reasoningContent = choice?.message?.reasoning || choice?.reasoning_content || '';

      // Extract <think>...</think> tags if present in content
      let cleanContent = messageContent;
      const thinkMatch = messageContent.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        reasoningContent = (reasoningContent ? reasoningContent + '\n' : '') + thinkMatch[1].trim();
        cleanContent = cleanContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      }

      // Parse JSON from clean content
      const parsedJson = this.extractAndCleanJson(cleanContent, schemaHint);

      if (!parsedJson) {
        return {
          success: false,
          entityType,
          jsonData: null,
          rawText: cleanContent,
          reasoning: reasoningContent,
          error: 'Не удалось распарсить валидный JSON из ответа нейросети. Попробуйте уточнить промпт или повторить.',
        };
      }

      // Generate paired visual image prompt for art generation
      const imagePrompt = this.generateImagePromptFromEntity(entityType, parsedJson, req.options);

      // Auto-save to local database if requested
      let savedFilePath: string | undefined;
      if (req.autoSaveToDatabase !== false) {
        savedFilePath = this.autoSaveEntityToDisk(entityType, parsedJson, req.options);
      }

      return {
        success: true,
        entityType,
        jsonData: parsedJson,
        rawText: cleanContent,
        reasoning: reasoningContent,
        imagePrompt,
        usage: resJson.usage,
        savedFilePath,
      };
    } catch (err: any) {
      console.error('[PolzaJsonEngine] Network or processing error:', err);
      if (geminiKey) {
        console.warn('[PolzaJsonEngine] Network error with Polza AI. Falling back to Gemini API...');
        return await this.generateWithGeminiFallback(req, geminiKey);
      }
      return {
        success: false,
        entityType,
        jsonData: null,
        error: err.message || 'Ошибка сети при обращении к Polza AI',
      };
    }
  }

  /**
   * Fallback structured JSON generation using Gemini API when POLZA_AI_API_KEY is missing or invalid
   */
  private async generateWithGeminiFallback(req: PolzaDataGenRequest, geminiKey: string): Promise<PolzaDataGenResponse> {
    const entityType = req.options.entityType || 'monster';
    const { systemPrompt, userMessage, schemaHint } = this.buildPromptForEntity(req.options);

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${userMessage}\n\nStrict JSON Format Requirements:\n${schemaHint}`,
        config: {
          systemInstruction: `${systemPrompt}\nCRITICAL: Respond strictly with valid JSON. Do not wrap in markdown or backticks.`,
          responseMimeType: 'application/json',
          temperature: typeof req.temperature === 'number' ? Math.min(2, Math.max(0, req.temperature)) : 0.7,
        },
      });

      const responseText = response.text || '';
      const parsedJson = this.extractAndCleanJson(responseText, schemaHint);

      if (!parsedJson) {
        return {
          success: false,
          entityType,
          jsonData: null,
          error: 'Не удалось разобрать JSON, сгенерированный Gemini AI.',
        };
      }

      const imagePrompt = this.generateImagePromptFromEntity(entityType, parsedJson, req.options);

      let savedFilePath: string | undefined;
      if (req.autoSaveToDatabase !== false) {
        savedFilePath = this.autoSaveEntityToDisk(entityType, parsedJson, req.options);
      }

      return {
        success: true,
        entityType,
        jsonData: parsedJson,
        rawText: responseText,
        reasoning: 'Сгенерировано через Gemini 2.5 Flash (Автоматический fallback)',
        imagePrompt,
        savedFilePath,
      };
    } catch (gErr: any) {
      console.error('[PolzaJsonEngine] Gemini fallback error:', gErr);
      return {
        success: false,
        entityType,
        jsonData: null,
        error: `Ошибка генерации (Polza & Gemini): ${gErr.message || String(gErr)}`,
      };
    }
  }

  /**
   * Build specific, high-precision system prompt and user query for each entity type
   */
  private buildPromptForEntity(options: PolzaDataGenOptions): {
    systemPrompt: string;
    userMessage: string;
    schemaHint: Record<string, any>;
  } {
    const { entityType, userPrompt } = options;

    const baseSystemGuideline = `You are the master TTRPG Game Master and System Architect for AetherMap.
Your task is to generate complete, fully balanced, deeply immersive and structured data in STRICT JSON format.
Language for names and descriptions: RUSSIAN (with original English name in 'originalName' field).
All stats, abilities, mechanics, math, XP, challenge ratings must strictly follow tabletop RPG standards (D&D 5e / Pathfinder 2e compatible).
Respond ONLY with a valid JSON object matching the requested schema. Do not output conversational preamble.`;

    switch (entityType) {
      case 'monster': {
        const schema = {
          id: 'alien_xenomorph_stalker',
          name: 'Ксеноморф-Охотник',
          originalName: 'Xenomorph Stalker',
          size: options.monsterSize || 'Большой',
          type: options.monsterType || 'Аберрация (Чужой)',
          alignment: options.alignment || 'Законно-злой',
          cr: options.cr || '8',
          xp: 3900,
          ac: 17,
          acSource: 'хитиновый экзоскелет',
          hp: 127,
          hitDice: '15d10 + 45',
          speed: '40 фт., лазание 40 фт., плавание 30 фт.',
          stats: { str: 18, dex: 20, con: 16, int: 12, wis: 14, cha: 8 },
          savingThrows: ['Ловкость +8', 'Телосложение +6'],
          skills: ['Скрытность +11', 'Внимательность +8', 'Акробатика +8'],
          damageResistances: ['кислота', 'яд'],
          conditionImmunities: ['ослепление', 'испуг'],
          senses: 'слепое зрение 60 фт., темное зрение 120 фт., пассивная Внимательность 18',
          languages: 'телепатия улья 120 фт.',
          environment: options.environment || 'космические корабли, катакомбы, подземелья',
          lore: 'Беспощадный инопланетный хищник с кислотой вместо крови, охотящийся из вентиляции.',
          tactics: 'Атакует из засады с потолка, пытается утащить одинокую жертву в темноту.',
          traits: [
            { name: 'Кислотная кровь', description: 'Когда существу наносится колющий или рубящий урон в пределах 5 фт., атакующий получает 2d8 урона кислотой.' },
            { name: 'Скрытный охотник', description: 'Может совершать действие Скрытность бонусным действием.' }
          ],
          actions: [
            { name: 'Мультиатака', description: 'Совершает одну атаку когтями и одну атаку хвостом или челюстями.' },
            { name: 'Хвост-гарпун', description: 'Рукопашная атака оружием: +8 к попаданию, досягаемость 10 фт., одна цель. Попадание: 15 (2d10 + 4) колющего урона.' },
            { name: 'Выдвижные челюсти', description: 'Рукопашная атака: +8 к попаданию, досягаемость 5 фт. Попадание: 18 (3d8 + 5) колющего урона + 7 (2d6) кислоты.' }
          ],
          reactions: [{ name: 'Молниеносный уворот', description: 'Уменьшает урон от атаки вдвое в качестве реакции.' }],
          legendaryActions: [],
          avatarPrompt: 'Terrifying biomechanical alien predator creature in dark metallic spaceship corridor, glistening black carapace, acid dripping, hyper-detailed fantasy art'
        };

        const userMsg = `Сгенерируй полноценного сбалансированного монстра для D&D 5e / AetherMap.
Параметры:
- Пользовательский запрос: "${userPrompt}"
- Желаемый CR: ${options.cr || 'любой сбалансированный'}
- Размер: ${options.monsterSize || 'любой подходящий'}
- Тип: ${options.monsterType || 'любой'}
- Среда обитания: ${options.environment || 'подземелья, руины'}
- Особые фичи: ${options.specialFeatures || 'кислотная кровь, скрытность, уникальные атаки'}
Обязательно заполни все статы, хиты, КБ, спасброски, способности, атаки и подробную тактику.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'npc': {
        const schema = {
          id: 'npc_kenku_rogue_merchant',
          fullName: 'Скрип-Колеса (Скрипер)',
          originalName: 'Creaker (Screech-Wheel)',
          title: 'Скупщик редких диковинок и гильдейский связной',
          race: options.race || 'Кенку',
          classType: options.classType || 'Плут (Вор)',
          gender: options.gender || 'Мужской',
          age: '28 лет',
          level: 5,
          alignment: options.alignment || 'Хаотично-нейтральный',
          appearance: 'Перья цвета воронова крыла с бронзовым отливом, потрёпанный кожаный плащ со скрытыми карманами, очки с увеличительными линзами.',
          personalityTraits: 'Повторяет звук звона золотых монет при радости, говорит голосами своих бывших клиентов.',
          motivation: 'Собрать достаточно золота и магии, чтобы вернуть своему народу утраченный дар полета.',
          secret: 'Втайне хранит ключ от тайника убитого магистра гильдии воров.',
          quirk: 'Всегда пробует монеты на зуб и щелкает клювом.',
          background: 'Бывший карманник в доках Уотердипа, ныне управляющий лавкой диковинок.',
          stats: { str: 10, dex: 18, con: 14, int: 16, wis: 14, cha: 12 },
          equipment: 'Короткий меч с гравировкой ворона, набор воровских инструментов, плащ с карманами, монокль оценщика.',
          roleInWorld: 'Торговец информацией, скупщик краденого, квестодатель для гильдии теней.',
          plotHook: 'Предлагает героям карту тайного входа в особняк знати в обмен на одну конкретную безделушку.',
          avatarPrompt: 'Kenku rogue merchant wearing leather trench coat with hidden pouches, magnifying glass monocle, dark fantasy tavern background, intricate tabletop portrait'
        };

        const userMsg = `Сгенерируй глубоко проработанного NPC (НИП) для кампании:
- Запрос: "${userPrompt}"
- Раса: ${options.race || 'любая'}
- Класс / Роль: ${options.classType || options.professionRole || 'любой'}
- Пол: ${options.gender || 'любой'}
- Фракция / Статус: ${options.faction || options.socialStatus || 'любой'}
- Характер / Отношение: ${options.attitude || 'нейтральное'}
Заполни имя, прозвище, внешность, мотивацию, тайну, особенности речи, статы и зацепку для квеста.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'location': {
        const schema = {
          id: 'loc_sunken_umberlee_temple',
          name: 'Затопленный Храм Умберли',
          originalName: 'Sunken Temple of Umberlee',
          region: 'Побережье Мечей / Коралловые Глубины',
          type: options.locationType || 'Подводное святилище / Затонувшие руины',
          environment: options.environment || 'Глубоководные рифы, полузатопленные залы с воздушными карманами',
          atmosphere: 'Зловещий гул прилива, фосфоресцирующие кораллы, соленый запах водорослей и разложения.',
          sensoryDetails: {
            sight: 'Зеленоватый свет водорослей освещает гигантские статуи морской богини с щупальцами.',
            sound: 'Глухой стон каменных сводов под давлением толщи воды, плеск волн о потолок.',
            smell: 'Запах озона, йода и древней сырости.'
          },
          description: 'Древний храм Владычицы Морской Ярости, поглощенный пучиной три века назад во время Великого Разлома. По слухам, в центральном жертвеннике до сих пор хранится Сердце Штормов.',
          secretRooms: [
            'Потайная ризница за разбитой статуей кракена (требуется проверка Внимательности СЛ 15)',
            'Воздушный карман с дневником верховного жреца'
          ],
          hazards: [
            'Коралловые шипы с ядом паралича (Спасбросок Телосложения СЛ 14)',
            'Внезапные приливные водовороты, сбивающие с ног'
          ],
          keyNpcs: ['Призрачный смотритель Морган', 'Шаман сахуагинов Зул-Крак'],
          plotHooks: [
            'Утонувший купеческий корабль застрял прямо в шпиле храма с грузом артефактов.',
            'Культисты начали ритуал призыва гигантского цунами на прибрежный город.'
          ],
          pointsOfInterest: [
            'Зал Утопленников с кристальным алтарем',
            'Глубоководный колодец бездны',
            'Затопленный архив с пергаментами в герметичных капсулах'
          ],
          avatarPrompt: 'Ancient sunken underwater temple of sea goddess, glowing bioluminescent corals, ruins submerged in dark turquoise ocean, rays of light through water, atmospheric fantasy concept art'
        };

        const userMsg = `Сгенерируй детальное описание локации / карты для Атласа и Мастера:
- Пользовательский запрос: "${userPrompt}"
- Название карты (если есть): "${options.existingMapName || ''}"
- Тип локации: ${options.locationType || 'подземелье, руины, город'}
- Окружение / Опасность: ${options.dangerAtmosphere || 'высокая опасность, таинственность'}
Заполни историю, атмосферу, сенсорные детали (звуки, запахи, вид), тайники, ловушки, ключевых персонажей и зацепки для сюжета.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'item': {
        const schema = {
          id: 'item_blade_of_the_shadow_phoenix',
          name: 'Клинок Теневого Феникса',
          originalName: 'Blade of the Shadow Phoenix',
          type: options.itemType || 'Оружие (Длинный меч)',
          typeNameRu: 'Магическое оружие',
          rarity: options.rarity || 'legendary',
          rarityRu: 'Легендарный',
          attunement: options.attunement !== false,
          attunementRequirement: 'требуется настройка заклинателем или воином',
          damage: '1d8 (1d10) рубящий + 1d6 некротический или огонь',
          properties: ['Универсальное', 'Магическое +2'],
          valueGp: 15000,
          weight: '3 фунта',
          description: 'Клинок из обсидиановой стали, по лезвию которого пульсирует темное фиолетовое пламя, не излучающее тепла.',
          lore: 'Выкован из пера потустороннего феникса в кузницах Теневого Предела для свержения тирана.',
          activeAbility: 'Пепельное Перерождение: 1 раз в сутки, если хиты владельца опускаются до 0, он мгновенно восстанавливает 30 хитов и совершает взрыв темного пламени (4d8 урона врагам в пределах 10 фт.).',
          passiveBonus: '+2 к броскам атаки и урона, сопротивление к урону некротической энергией и огню.',
          charges: { current: 3, max: 3, recharge: '1d3 на рассвете' },
          curse: 'Владелец видит вещие сны о пепле и разрушении.',
          avatarPrompt: 'Legendary obsidian longsword radiating dark violet spectral fire, glowing phoenix runes on blade, ornate dark fantasy weapon illustration on dark background'
        };

        const userMsg = `Сгенерируй уникальный магический предмет или артефакт:
- Запрос: "${userPrompt}"
- Тип: ${options.itemType || 'оружие, броня, кольцо, жезл'}
- Редкость: ${options.rarity || 'очень редкий или легендарный'}
- Школа магии: ${options.schoolMagic || 'воплощение, некромантия, иллюзия'}
Заполни описание, историю, боевые механики, активные способности, заряды и стоимость.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'spell': {
        const schema = {
          id: 'spell_cataclysmic_void_sphere',
          name: 'Сфера Катастрофической Пустоты',
          originalName: 'Cataclysmic Void Sphere',
          level: Number(options.spellLevel) || 6,
          school: options.spellSchool || 'Воплощение / Некромантия',
          castingTime: '1 действие',
          range: '120 футов (сфера радиусом 20 футов)',
          components: 'В, С, М (осколок черного метеорита стоимостью 100 зм)',
          duration: 'Концентрация, до 1 минуты',
          classes: ['Волшебник', 'Колдун', 'Чародей'],
          damageType: 'Силовое поле и Некротический',
          saveOrAttack: 'Спасбросок Силы',
          description: 'Вы создаете гравитационную воронку темной энергии в точке в пределах дистанции. Все существа в сфере должны совершить спасбросок Силы. При провале они получают 6d10 урона силовым полем и притягиваются к центру сферы. При успехе — половину урона без притягивания.',
          higherLevels: 'При сотворении ячейкой 7 уровня или выше урон увеличивается на 1d10 за каждый уровень ячейки выше 6-го.',
          avatarPrompt: 'Swirling gravitational sphere of void energy, dark matter particles, arcane runes, cosmic magical explosion, tabletop spell card artwork'
        };

        const userMsg = `Сгенерируй новое заклинание для D&D 5e:
- Запрос: "${userPrompt}"
- Уровень заклинания: ${options.spellLevel || 'любой сбалансированный'}
- Школа магии: ${options.spellSchool || 'любая подходящая'}
Заполни компоненты, время сотворения, дистанцию, спасбросок, механику урона или эффекта, и усиление на высоких уровнях.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'quest': {
        const schema = {
          id: 'quest_shadow_guild_conspiracy',
          title: 'Тени над Золотым Шпилем',
          originalName: 'Shadows over the Golden Spire',
          category: options.questCategory || 'main',
          categoryRu: 'Основной сюжет',
          partyLevel: options.partyLevel || '3-5 уровень',
          giver: 'Леди Элеонора из Верховного Совета',
          location: 'Верхний Город и Подземные Катакомбы',
          summary: 'Похищение древней реликвии совета привело к раскрытию заговора темного культа среди аристократии.',
          description: 'Во время ежегодного бала масок неизвестные в масках чумных докторов похитили Печать Города и отравили верховного магистра. Героям предстоит выследить убийц по горячим следам, пока культ не открыл врата Бездны.',
          objectives: [
            { id: 'obj_1', text: 'Опросить свидетелей на месте преступления и изучить улики отравления', optional: false, status: 'active' },
            { id: 'obj_2', text: 'Проникнуть в подпольный притон «Слепой Угорь» в портовых доках', optional: false, status: 'active' },
            { id: 'obj_3', text: 'Предотвратить ритуал в затопленных катакомбах под шпилем', optional: false, status: 'active' },
            { id: 'obj_4', text: 'Спасти заложников без поднятия общей тревоги', optional: true, status: 'active' }
          ],
          rewards: {
            xp: 2500,
            gold: 800,
            items: ['Кольцо Теневого Шага', 'Благодарственная грамота лорда-защитника'],
            reputation: '+3 к репутации в Верховном Совете, -2 у Гильдии Теней'
          },
          complications: 'Один из членов совета тайно спонсирует культистов и будет пускать стражу по ложному следу.',
          plotTwists: 'Похищенная печать оказалась фальшивкой, а настоящий ритуал планируется в самом святилище города.',
          aftermath: 'Город спасен от осады демонов, но предатель в совете успевает скрыться в соседнее королевство.',
          avatarPrompt: 'Dramatic nighttime quest scene, plague doctor masked cultists sneaking across gothic cathedral rooftops, moonlit city, dark fantasy illustration'
        };

        const userMsg = `Сгенерируй полноценный многоуровневый квест для игроков:
- Запрос: "${userPrompt}"
- Категория: ${options.questCategory || 'главный сюжет / побочный / гильдейский заказ'}
- Уровень группы: ${options.partyLevel || '3-5'}
Заполни сюжетную завязку, список четких целей (objectives), награды (золото, опыт, артефакты), осложнения, неожиданный сюжетный поворот (plot twist) и последствия.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'campaign': {
        const schema = {
          id: 'campaign_gothic_blood_curse',
          title: 'Кровавое Затмение Драговии',
          originalName: 'Blood Eclipse of Dragovia',
          setting: options.campaignSetting || 'Готическое фэнтези / Земли вампиров',
          toneStyle: options.toneStyle || 'Мрачный хоррор, психологическое напряжение, отчаяние и надежда',
          startingLevel: 1,
          targetLevel: 10,
          synopsis: 'Изолированная горная долина Драговия погрузилась в вечную кровавую ночь после пробуждения древнего графа-вампира. Единственный способ развеять проклятие — восстановить три осколка Солнечного Сердца, спрятанные в забытых монастырях.',
          startingHook: 'Карета героев терпит крушение в густом тумане на границе долины, где их встречает стая чудовищных лютоволков.',
          mainVillain: {
            name: 'Граф Валериан фон Драгов',
            title: 'Первый Кровопийца и Владыка Алого Шпиля',
            motivation: 'Разорвать связь долины с богами света и вознестись в ранг бога крови.',
            tactics: 'Играет с героями как кошка с мышкой, посылая видения и подставляя союзников.'
          },
          acts: [
            {
              actNumber: 1,
              title: 'Акт I: Туманная Клетка (Уровни 1-3)',
              summary: 'Герои исследуют заброшенную деревню Могильный Дол, спасают выживших жителей и находят первый осколок в полуразрушенном склепе святого Мартина.',
              keyLocations: ['Деревня Могильный Дол', 'Склеп Святого Мартина', 'Таверна «Увядшая Роза»'],
              bossFight: 'Ночной Ужас — порождение теней и оборотень-вожак.'
            },
            {
              actNumber: 2,
              title: 'Акт II: Замок на Пике Скорби (Уровни 4-7)',
              summary: 'Путешествие через Проклятый Перевал к Ордену Серебряных Рыцарей, осажденному армией нежити.',
              keyLocations: ['Монастырь Серебряной Зари', 'Катакомбы Отшельника', 'Кровавые Топи'],
              bossFight: 'Верховная инквизиторша-вампир Лилит.'
            },
            {
              actNumber: 3,
              title: 'Акт III: Штурм Алого Шпиля (Уровни 8-10)',
              summary: 'Финальная осада цитадели графа во время кульминации Кровавого Затмения.',
              keyLocations: ['Замок Драгов', 'Тронный Зал Крови', 'Астральный Разлом'],
              bossFight: 'Граф Валериан в истинной форме Аватара Крови.'
            }
          ],
          keyFactions: [
            { name: 'Орден Серебряного Клыка', attitude: 'Союзники', description: 'Остатки паладинов, ведущих партизанскую войну.' },
            { name: 'Кровный Двор', attitude: 'Враги', description: 'Вампирская аристократия и их присягнувшие вассалы.' }
          ],
          milestones: [
            'Уровень 2: Очищение церкви от гулей',
            'Уровень 4: Обретение первого Солнечного Осколка',
            'Уровень 7: Заключение союза с оборотнями-изгоями',
            'Уровень 10: Победа над графом'
          ],
          avatarPrompt: 'Gothic fantasy vampire castle looming on snowy cliff under blood red eclipse moon, dark carriage and heroes in fog, epic campaign concept art'
        };

        const userMsg = `Сгенерируй грандиозную сюжетную кампанию для TTRPG:
- Запрос: "${userPrompt}"
- Сеттинг: ${options.campaignSetting || 'готический хоррор / темное фэнтези'}
- Стиль и атмосфера: ${options.toneStyle || 'хоррор, эпика, героизм'}
- Количество актов: ${options.actsCount || 3}
Сгенерируй синопсис, завязку, главного злодея (BBEG), подробное расписание всех актов с локациями и боссами, фракции и этапы прокачки (milestones).`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'rule': {
        const schema = {
          id: 'rule_sanity_and_madness_system',
          name: 'Система Рассудка и Безумия',
          originalName: 'Sanity and Eldritch Madness Mechanics',
          category: options.ruleCategory || 'Домашние правила / Хоррор механики',
          targetSystem: options.targetSystem || 'D&D 5e / Универсальная',
          summary: 'Полноценная модульная механика для отслеживания психологического состояния персонажей при столкновении с космическим ужасом и лавкрафтовскими монстрами.',
          mechanics: {
            attribute: 'Очки Рассудка (ОР) = Мудрость × 2 + Бонус Мастерства',
            triggers: [
              'Увидеть смерть близкого союзника или жестокую резню (Спасбросок Мудрости СЛ 12)',
              'Взгляд на аберрацию или потустороннего бога (Спасбросок Мудрости СЛ 15-20)',
              'Использование запретных гримуаров или темных реликвий'
            ],
            stages: [
              { stage: 1, name: 'Легкое потрясение (75-50% ОР)', effect: 'Помеха на проверки Харизмы и Интеллекта в течение 1 часа, нервный тик.' },
              { stage: 2, name: 'Острый психоз (49-25% ОР)', effect: 'Персонаж слышит шепот в голове, каждую короткую передышку должен совершать спасбросок, чтобы не впасть в ступор.' },
              { stage: 3, name: 'Глубокое безумие (24-1% ОР)', effect: 'Галлюцинации, персонаж может атаковать иллюзорных врагов в бою (случайный выбор цели броском 1d4).' },
              { stage: 4, name: 'Крах разума (0 ОР)', effect: 'Персонаж впадает в кому или переходит под временный контроль Мастера как обезумевший культист.' }
            ],
            recovery: 'Длинный отдых в безопасном месте восстанавливает 1d6 + модификатор Мудрости ОР. Заклинание Высшее Восстановление возвращает 20 ОР.'
          },
          examples: 'Игрок видит пробуждение Ктулху, проваливает спасбросок на 8 единиц и теряет 15 ОР, переходя на 2-ю стадию безумия.',
          edgeCases: 'Паладины с аурой храбрости имеют преимущество на спасброски рассудка от страха, но не от космического откровения.',
          gmTips: 'Описывайте эффекты безумия шёпотом на ухо конкретному игроку или передавайте тайные записки для максимального погружения.'
        };

        const userMsg = `Сгенерируй четкое, сбалансированное игровое правило или домашнюю механику:
- Запрос: "${userPrompt}"
- Категория: ${options.ruleCategory || 'бой, исследование, социальное, хоррор, крафт'}
- Совместимость с системой: ${options.targetSystem || 'D&D 5e'}
Опиши формулу проверки, триггеры срабатывания, градации эффектов, примеры применения в игре, особые случаи и советы для Мастера.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'lore': {
        const schema = {
          id: 'lore_cult_of_the_black_sun',
          name: 'Культ Чёрного Солнца',
          originalName: 'Cult of the Black Sun',
          category: options.loreCategory || 'faction',
          categoryRu: 'Фракция / Тайный орден',
          summary: 'Древнее эзотерическое общество магов-еретиков, поклоняющихся потухшей звезде Надир.',
          historicalTimeline: [
            { era: 'Эра Падения', event: 'Основание культа архимагом Вольфрамом после катастрофы Нетерила.' },
            { era: 'Век Тишины', event: 'Уход в подполье после запрета Высшим Советом Мистры.' },
            { era: 'Наши дни', event: 'Внедрение шпионов в гильдии магов всех крупнейших метрополий.' }
          ],
          contentMarkdown: `# Культ Чёрного Солнца\n\n## Происхождение и Идеология\nКульт Чёрного Солнца зародился в глубинах подземных обсерваторий Подземья...\n\n### Иерархия и Ритуалы\nЧлены ордена делятся на три круга посвящения...\n\n### Отношения с фракциями\n- **Арфисты**: Непримиримые враги.\n- **Жентарим**: Тайные торговые партнёры.`,
          secrets: [
            'Лидер культа — не человек, а древний лич, скрывающийся под личиной слепого библиотекаря.',
            'В их святилище спрятан портал в Дальний Предел.'
          ],
          tags: ['культ', 'магия', 'заговор', 'нежить', 'запретные_знания'],
          avatarPrompt: 'Occult fantasy faction meeting of hooded black sun cultists around glowing obsidian altar with dark eclipse magic, intricate wiki illustration'
        };

        const userMsg = `Сгенерируй детальную энциклопедическую статью для Базы Знаний мира (Lore Wiki):
- Запрос: "${userPrompt}"
- Категория: ${options.loreCategory || 'фракция, поселение, пантеон, историческое событие, персона'}
Заполни краткое содержание, хронологию эпох, форматированный Markdown текст статьи с заголовками, скрытые тайны для Мастера и теги.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }

      case 'table':
      default: {
        const schema = {
          id: 'table_random_dungeon_encounters',
          name: 'Случайные происшествия в древних катакомбах',
          originalName: 'Dungeon Catacomb Random Encounters',
          diceFormula: 'd20',
          description: 'Таблица атмосферных событий, находок и внезапных опасностей во время исследования подземелий.',
          entries: [
            { range: '1-2', text: 'Обвал потолка: все должны совершить спасбросок Ловкости СЛ 13 или получить 2d6 урона камнями.' },
            { range: '3-5', text: 'Стая светящихся пещерных жуков, вспыхивающих при приближении огня факела.' },
            { range: '6-9', text: 'Заброшенный лагерь авантюристов с дневником на мертвом языке и 15 серебряными монетами.' },
            { range: '10-13', text: 'Патруль из 1d4 скелетов-стражей с ржавыми алебардами.' },
            { range: '14-17', text: 'Магическая ловушка-руна иллюзии, заставляющая стены казаться сжимающимися.' },
            { range: '18-19', text: 'Тайный проход за фальшивой кирпичной кладкой.' },
            { range: '20', text: 'Древний саркофаг полководца с магическим оружием и призраком-хранителем.' }
          ]
        };

        const userMsg = `Сгенерируй интересную случайную таблицу бросков:
- Запрос: "${userPrompt}"
- Формула кубика: d20, d100 или d6
Заполни список исходов с диапазонами, описаниями опасностей и ценных находок.`;

        return {
          systemPrompt: `${baseSystemGuideline}\nSchema structure example:\n${JSON.stringify(schema, null, 2)}`,
          userMessage: userMsg,
          schemaHint: schema,
        };
      }
    }
  }

  /**
   * Safe JSON Extractor that handles markdown fences, unescaped newlines, and trailing commas
   */
  private extractAndCleanJson(rawText: string, fallbackSchema?: any): any {
    if (!rawText || typeof rawText !== 'string') return null;

    let text = rawText.trim();

    // 1. Direct JSON parse try
    try {
      return JSON.parse(text);
    } catch (_) {}

    // 2. Extract from markdown code blocks ```json ... ``` or ``` ... ```
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (_) {
        text = codeBlockMatch[1].trim();
      }
    }

    // 3. Extract substring between first '{' and last '}'
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // Try sanitizing trailing commas
        const sanitized = candidate
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/[\u0000-\u001F]+/g, ' ');
        try {
          return JSON.parse(sanitized);
        } catch (_) {}
      }
    }

    return null;
  }

  /**
   * Generate an optimized English visual prompt based on the newly generated JSON entity
   */
  private generateImagePromptFromEntity(
    entityType: PolzaEntityType,
    jsonData: any,
    options: PolzaDataGenOptions
  ): string {
    if (jsonData.avatarPrompt) {
      return jsonData.avatarPrompt;
    }

    const name = jsonData.name || jsonData.title || options.userPrompt;
    switch (entityType) {
      case 'monster':
        return `Detailed fantasy creature illustration of ${jsonData.originalName || name}, ${jsonData.size || ''} ${jsonData.type || ''}, menace and deadly anatomy, dramatic lighting, D&D 5e sourcebook art`;
      case 'npc':
        return `Fantasy portrait of ${jsonData.originalName || name}, ${jsonData.gender || ''} ${jsonData.race || ''} ${jsonData.classType || ''}, ${jsonData.appearance || ''}, expressive facial details, high-end tabletop character portrait`;
      case 'location':
        return `Cinematic fantasy environment concept art of ${jsonData.originalName || name}, ${jsonData.environment || ''}, atmospheric volumetric lighting, rich architectural details, panoramic master shot`;
      case 'item':
        return `Intricately designed magical RPG artifact ${jsonData.originalName || name}, glowing runes, metallic sheen, dark vignette backdrop, legendary relic item illustration`;
      case 'spell':
        return `Dynamic spell visualization of ${jsonData.originalName || name}, swirling magical energy, vibrant runes and sparks, arcane mastery concept art`;
      case 'quest':
      case 'campaign':
        return `Epic narrative scene for quest "${jsonData.originalName || name}", dramatic fantasy storytelling composition, moody shadows, high tabletop RPG art`;
      case 'lore':
      default:
        return `Masterpiece fantasy illustration depicting ${jsonData.originalName || name}, rich world lore, atmospheric storytelling details, 8k resolution`;
    }
  }

  /**
   * Automatically save newly generated entity into the appropriate application storage on disk
   */
  private autoSaveEntityToDisk(entityType: PolzaEntityType, jsonData: any, options: PolzaDataGenOptions): string | undefined {
    try {
      const activeSystemId = options.systemId || systemDirectoryEngine.getActiveSystemId() || 'dnd5e';
      const activeWorldId = options.worldId || 'dnd5e_faerun';
      const safeId = (jsonData.id || `${entityType}_${Date.now()}`).toLowerCase().replace(/[^a-z0-9_\-]/g, '_');

      switch (entityType) {
        case 'monster':
        case 'item':
        case 'spell':
        case 'rule':
        case 'table': {
          const categoryMap: Record<string, string> = {
            monster: 'bestiary',
            item: 'items',
            spell: 'spells',
            rule: 'rules',
            table: 'tables',
          };
          const cat = categoryMap[entityType] || 'items';
          const systemsRoot = systemDirectoryEngine.getSystemsRoot();
          const targetDir = path.join(systemsRoot, activeSystemId, cat);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const filePath = path.join(targetDir, `${safeId}.json`);
          fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8');
          // Rescan systems
          systemDirectoryEngine.scanSystems();
          return filePath;
        }

        case 'npc':
        case 'location':
        case 'lore': {
          const loreItem: any = {
            id: safeId,
            worldId: activeWorldId,
            worldName: 'Забытые Королевства',
            systemId: activeSystemId,
            name: jsonData.name || jsonData.fullName || 'Без названия',
            originalName: jsonData.originalName,
            category: entityType === 'npc' ? 'npc_figure' : entityType === 'location' ? 'settlement' : jsonData.category || 'lore_article',
            summary: jsonData.summary || jsonData.personalityTraits || jsonData.description || '',
            content: jsonData.contentMarkdown || jsonData.description || JSON.stringify(jsonData, null, 2),
            tags: jsonData.tags || [entityType],
            relations: jsonData.keyNpcs ? jsonData.keyNpcs.map((n: string) => ({ targetName: n, relationType: 'ally' })) : [],
            updatedAt: Date.now(),
          };
          const saved = loreDirectoryEngine.saveLoreItemToDisk(activeWorldId, loreItem);
          return saved.filePath;
        }

        case 'campaign': {
          const saved = campaignDirectoryEngine.saveCampaign(jsonData);
          return saved?.filePath || saved?.fileName;
        }

        default:
          return undefined;
      }
    } catch (err) {
      console.warn('[PolzaJsonEngine] Auto-save to disk failed:', err);
      return undefined;
    }
  }
}

export const polzaJsonEngine = new PolzaJsonEngine();
