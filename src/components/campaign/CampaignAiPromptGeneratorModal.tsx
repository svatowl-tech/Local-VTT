import React, { useState } from 'react';
import { campaignService } from '../../services/campaignService';
import {
  Sparkles,
  Copy,
  Check,
  X,
  Upload,
  AlertCircle,
  FileCode,
  Wand2,
  Cpu,
} from 'lucide-react';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { copyToClipboard } from '../../utils/clipboardUtils';

interface Props {
  onClose: () => void;
  onCampaignLoaded?: () => void;
}

export const CampaignAiPromptGeneratorModal: React.FC<Props> = ({
  onClose,
  onCampaignLoaded,
}) => {
  const [activeTab, setActiveTab] = useState<'generate_prompt' | 'import_json' | 'direct_ai'>('generate_prompt');

  // Generator Config
  const [title, setTitle] = useState<string>('Проклятие Забытого Маяка');
  const [system, setSystem] = useState<string>('D&D 5e');
  const [setting, setSetting] = useState<string>('Забытые Королевства (Побережье Мечей)');
  const [tone, setTone] = useState<string>('Мрачный детектив и древняя магия');
  const [partyLevel, setPartyLevel] = useState<string>('Уровень 1–3 (Стартовая партия)');
  const [mainTheme, setMainTheme] = useState<string>('Заговор культистов и древнее проклятие стихий');
  const [customWishes, setCustomWishes] = useState<string>(
    'Много тайн, атмосферные локации, 4 колоритных NPC со скрытыми мотивами и зацепки для исследования.'
  );

  // Generated Prompt State
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Import JSON State
  const [jsonInput, setJsonInput] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Direct Backend AI State
  const [isAiGenerating, setIsAiGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const buildPrompt = () => {
    playUniversalSfx('item_click');
    const prompt = `Ты — ведущий мировой сценарист настольных ролевых игр (TTRPG Game Master) и нарративный дизайнер. 
Твоя задача: создать целостный, глубоко проработанный и готовый к игре массив данных для кампании в формате JSON.

ПАРАМЕТРЫ КАМПАНИИ:
- Название / Концепт: ${title}
- Игровая система: ${system}
- Мир / Сеттинг: ${setting}
- Тон и жанр: ${tone}
- Уровень партии: ${partyLevel}
- Главная тема / Троп: ${mainTheme}
- Особые пожелания мастера: ${customWishes}

СТРОГИЕ ТРЕБОВАНИЯ К ФОРМАТУ JSON:
Верни ТОЛЬКО валидный JSON-объект без пояснений и без markdown-разметки (или строго внутри блока \`\`\`json ... \`\`\`).
JSON должен содержать следующие поля:

{
  "id": "campaign-ai-${Date.now()}",
  "name": "${title}",
  "system": "${system}",
  "worldName": "${setting}",
  "dungeonMasterName": "Мастер",
  "createdAt": ${Date.now()},
  "updatedAt": ${Date.now()},
  "time": {
    "year": 1492,
    "month": 7,
    "day": 15,
    "hour": 10,
    "minute": 0,
    "eraName": "1492 DR (Эра Драконов)",
    "calendarSystem": "harptos",
    "weather": "clear",
    "temperatureDesc": "+20°C, легкий бриз",
    "moonPhase": "waxing_gibbous",
    "dayOfWeek": "Элеинсис",
    "season": "summer"
  },
  "quests": [
    {
      "id": "quest-1",
      "title": "Основной квест 1-го акта",
      "description": "Подробное описание квеста и кризиса",
      "category": "main",
      "status": "active",
      "giverNpcName": "Имя квестодателя",
      "locationName": "Стартовая локация",
      "objectives": [
        { "id": "obj-1", "text": "Шаг 1 квеста", "completed": false },
        { "id": "obj-2", "text": "Шаг 2 квеста", "completed": false }
      ],
      "rewards": { "gold": 300, "xp": 500, "items": ["Зелье лечения", "Свиток"] },
      "secretsAndClues": ["Секрет/улика 1", "Секрет/улика 2"],
      "createdAtInGame": "15.7.1492",
      "updatedAtInGame": "15.7.1492",
      "tags": ["Основной сюжет"]
    },
    {
      "id": "quest-2",
      "title": "Побочный квест / Охота за наградой",
      "description": "Описание второстепенного поручения",
      "category": "side",
      "status": "active",
      "giverNpcName": "Имя персонажа",
      "locationName": "Окрестности",
      "objectives": [{ "id": "obj-2-1", "text": "Найти след", "completed": false }],
      "rewards": { "gold": 100, "xp": 200 },
      "secretsAndClues": [],
      "createdAtInGame": "15.7.1492",
      "updatedAtInGame": "15.7.1492",
      "tags": ["Побочный"]
    }
  ],
  "locations": [
    {
      "id": "loc-1",
      "name": "Главный город/поселок",
      "type": "city",
      "description": "Колоритное описание с сенсорными деталями",
      "explorationStatus": "explored",
      "threatLevel": "low",
      "pointsOfInterest": [
        { "id": "poi-1", "name": "Таверна / Штаб", "description": "Описание точки интереса", "threat": "none" },
        { "id": "poi-2", "name": "Башня / Храм", "description": "Описание", "threat": "none" },
        { "id": "poi-3", "name": "Опасное подземелье / Руины", "description": "Описание", "threat": "medium" }
      ],
      "knownSecrets": ["Тайный ход под ратушей"],
      "connectedLocationIds": [],
      "tags": ["Хаб", "Город"]
    }
  ],
  "npcs": [
    {
      "id": "npc-1",
      "name": "Имя NPC",
      "title": "Роль или титул",
      "race": "Раса",
      "gender": "Пол",
      "alignment": "Мировоззрение",
      "attitudeToParty": "friendly",
      "status": "alive",
      "personalityTraits": "Черты характера, манера речи",
      "appearance": "Внешний вид",
      "goalsAndMotivations": "Чего хочет этот NPC?",
      "secretsKnown": ["Личный секрет или важная зацепка"],
      "tags": ["Квестодатель", "Союзник"]
    },
    {
      "id": "npc-boss",
      "name": "Имя антагониста",
      "title": "Глава культа / Злодей",
      "race": "Раса",
      "gender": "Пол",
      "alignment": "Злой",
      "attitudeToParty": "hostile",
      "status": "alive",
      "personalityTraits": "Коварный, расчетливый",
      "appearance": "Зловещий облик",
      "goalsAndMotivations": "Замысел злодея",
      "secretsKnown": ["Слабость антагониста"],
      "tags": ["Антагонист", "Босс"]
    }
  ],
  "relationships": [
    {
      "id": "rel-1",
      "sourceNpcId": "npc-1",
      "targetNpcId": "npc-boss",
      "relationshipType": "rivals",
      "description": "Старая вражда из-за семейной реликвии",
      "intensity": "strong"
    }
  ],
  "factions": [
    {
      "id": "fac-1",
      "name": "Название фракции / Культа",
      "leaderNpcName": "Имя лидера",
      "alignment": "Законно-нейтральный",
      "goals": "Цели фракции",
      "attitudeToParty": "neutral",
      "influenceLevel": "influential",
      "notes": "Особенности организации"
    }
  ],
  "sessions": [
    {
      "id": "session-1",
      "sessionNumber": 1,
      "realDate": "${new Date().toISOString().split('T')[0]}",
      "inGameDate": "15 Флеймрула 1492 DR",
      "title": "Сессия 1: Завязка приключения",
      "summary": "Краткий синопсис первой игровой встречи",
      "lazyDmNotes": {
        "strongStart": "Яркое, захватывающее начало первой сцены (взрыв, нападение, крик о помощи)",
        "potentialScenes": ["Сцена 1", "Сцена 2", "Сцена 3"],
        "secretsAndClues": ["Секрет 1", "Улика 2", "Зацепка 3"],
        "fantasticLocations": ["Необычное место действия"],
        "importantNpcs": ["npc-1"],
        "monsters": ["Монстр 1 (3 шт.)", "Монстр 2 (1 шт.)"],
        "treasureRewards": "50 золотых и зелье"
      },
      "xpAwarded": 150,
      "goldAwarded": 50,
      "tags": ["1 Сессия"]
    }
  ],
  "party": [
    {
      "id": "char-1",
      "name": "Имя героя 1",
      "playerName": "Игрок 1",
      "characterClass": "Воин",
      "level": 1,
      "race": "Человек",
      "currentHp": 12,
      "maxHp": 12,
      "armorClass": 16,
      "passivePerception": 12,
      "inspiration": false,
      "notes": ""
    }
  ],
  "treasury": {
    "copper": 50,
    "silver": 80,
    "electrum": 0,
    "gold": 200,
    "platinum": 5,
    "sharedBag": [
      {
        "id": "item-1",
        "name": "Веревка с крюком",
        "quantity": 1,
        "category": "gear",
        "weight": 4,
        "notes": "Базовый набор"
      }
    ],
    "transactions": []
  },
  "safety": {
    "xCardTriggered": false,
    "lines": ["Насилие над детьми", "Пытки"],
    "veils": ["Романтические сцены (fade to black)"],
    "houseRules": [
      {
        "id": "hr-1",
        "title": "Зелья бонусным действием",
        "category": "combat",
        "ruleText": "Выпить зелье лечения — бонусное действие.",
        "isActive": true
      }
    ],
    "breakTimerMinutes": 15,
    "breakTimerEndsAt": null,
    "breakTimerActive": false
  }
}
`;
    setGeneratedPrompt(prompt);
  };

  const handleCopyPrompt = () => {
    if (!generatedPrompt) return;
    copyToClipboard(generatedPrompt);
    playUniversalSfx('item_click');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleImportJson = async () => {
    setParseError(null);
    if (!jsonInput.trim()) {
      setParseError('Пожалуйста, вставьте JSON-ответ от нейросети в поле выше.');
      return;
    }

    setIsProcessing(true);
    try {
      let clean = jsonInput.trim();
      if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(clean);
      if (!parsed.name && !parsed.title) {
        throw new Error('В JSON отсутствует поле "name" (название кампании).');
      }

      playUniversalSfx('dice_roll');
      await campaignService.createNewCampaign(parsed);
      if (onCampaignLoaded) onCampaignLoaded();
      onClose();
    } catch (e: any) {
      console.error('Failed to parse campaign JSON:', e);
      setParseError(`Ошибка разбора JSON: ${e.message || String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectGeminiGenerate = async () => {
    setIsAiGenerating(true);
    setAiError(null);
    playUniversalSfx('item_click');

    try {
      const res = await campaignService.generateCampaignAi({
        title,
        system,
        setting,
        tone,
        partyLevel,
        villainHook: mainTheme,
        customWishes,
      });

      if (res.success && res.campaign) {
        playUniversalSfx('dice_roll');
        if (onCampaignLoaded) onCampaignLoaded();
        onClose();
      } else {
        setAiError(
          res.error ||
            'Не удалось сгенерировать кампанию через Gemini. Попробуйте скопировать готовый промпт на вкладке "Генератор промпта".'
        );
      }
    } catch (e: any) {
      setAiError(e.message || 'Ошибка генерации кампании.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">
                ИИ-Генератор Кампании (AI Prompt & JSON Importer)
              </h2>
              <p className="text-xs text-zinc-400">
                Сгенерируйте подробный промпт для ChatGPT/Gemini/Claude или сразу загрузите готовую кампанию
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex items-center space-x-2 text-xs">
          <button
            onClick={() => setActiveTab('generate_prompt')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'generate_prompt'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>1. Генератор Промпта</span>
          </button>

          <button
            onClick={() => setActiveTab('import_json')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'import_json'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>2. Вставить ответ ИИ (JSON)</span>
          </button>

          <button
            onClick={() => setActiveTab('direct_ai')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              activeTab === 'direct_ai'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-indigo-400 hover:text-indigo-200 hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>3. Генерация в 1 клик (Gemini)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-300 space-y-4">
          {/* TAB 1: GENERATE PROMPT */}
          {activeTab === 'generate_prompt' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-amber-300 mb-1">
                    Название или задумка:
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:border-amber-400 focus:outline-none"
                    placeholder="Например: Тени над Вратами Балдура"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-400 mb-1">
                    Игровая система:
                  </label>
                  <select
                    value={system}
                    onChange={(e) => setSystem(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  >
                    <option value="D&D 5e">Dungeons & Dragons 5e</option>
                    <option value="Pathfinder 2e">Pathfinder 2e</option>
                    <option value="Cyberpunk RED">Cyberpunk RED</option>
                    <option value="Call of Cthulhu">Call of Cthulhu 7e</option>
                    <option value="Savage Worlds">Savage Worlds</option>
                    <option value="Warhammer Fantasy">Warhammer Fantasy Roleplay</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-zinc-400 mb-1">
                    Сеттинг / Мир:
                  </label>
                  <input
                    type="text"
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-zinc-400 mb-1">
                    Уровень партии:
                  </label>
                  <input
                    type="text"
                    value={partyLevel}
                    onChange={(e) => setPartyLevel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Главная тема / Ключевой троп / Антагонист:
                </label>
                <input
                  type="text"
                  value={mainTheme}
                  onChange={(e) => setMainTheme(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Заговор культистов, древнее проклятие, ограбление века..."
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Особые пожелания и атмосфера:
                </label>
                <textarea
                  value={customWishes}
                  onChange={(e) => setCustomWishes(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Какие NPC, загадки или локации должны быть обязательно..."
                />
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  onClick={buildPrompt}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold transition-all shadow-md active:scale-95"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Сгенерировать Мастер-Промпт для ИИ</span>
                </button>
              </div>

              {generatedPrompt && (
                <div className="space-y-2 pt-3 border-t border-zinc-800/80 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">
                      Готовый промпт для вставки в ChatGPT, Claude или Gemini:
                    </span>
                    <button
                      onClick={handleCopyPrompt}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                        copied
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Скопировано в буфер!' : 'Скопировать промпт'}</span>
                    </button>
                  </div>
                  <pre className="w-full max-h-56 bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 text-[11px] font-mono text-zinc-300 overflow-y-auto whitespace-pre-wrap select-all">
                    {generatedPrompt}
                  </pre>
                  <p className="text-[11px] text-zinc-400">
                    💡 <strong>Что делать дальше:</strong> Вставьте этот промпт в любой чат-бот с ИИ. Скопируйте полученный ответ в формате JSON и вставьте его на соседней вкладке <strong>«2. Вставить ответ ИИ»</strong>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPORT JSON */}
          {activeTab === 'import_json' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  Вставьте сгенерированный ИИ текст или JSON-код:
                </label>
                <textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setParseError(null);
                  }}
                  rows={12}
                  className="w-full bg-zinc-900/90 border border-zinc-700 rounded-xl p-3 font-mono text-[11px] text-zinc-200 placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  placeholder={`{\n  "name": "Проклятие Забытого Маяка",\n  "system": "D&D 5e",\n  "quests": [...],\n  "locations": [...],\n  "npcs": [...]\n}`}
                />
              </div>

              {parseError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-zinc-400">
                  Умный парсер автоматически удалит \`\`\`json разметку и сохранит кампанию на диск.
                </span>
                <button
                  onClick={handleImportJson}
                  disabled={isProcessing || !jsonInput.trim()}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isProcessing ? 'Загрузка...' : 'Загрузить и сохранить на диск'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: DIRECT GEMINI AI */}
          {activeTab === 'direct_ai' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 space-y-2">
                <div className="flex items-center space-x-2 text-indigo-300 font-bold text-xs">
                  <Cpu className="w-4 h-4" />
                  <span>Генерация кампании в один клик через серверную модель Gemini</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Сервер автоматически использует параметры с первой вкладки для создания полной кампании с квестами, локациями, NPC, связями и заметками для Lazy DM.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 block text-[10px]">Название:</span>
                  <strong className="text-amber-300">{title}</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 block text-[10px]">Система:</span>
                  <strong className="text-amber-300">{system}</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 block text-[10px]">Мир / Сеттинг:</span>
                  <strong className="text-zinc-200">{setting}</strong>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-zinc-400 block text-[10px]">Тема:</span>
                  <strong className="text-zinc-200">{mainTheme}</strong>
                </div>
              </div>

              {aiError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              <div className="pt-3 flex justify-end">
                <button
                  onClick={handleDirectGeminiGenerate}
                  disabled={isAiGenerating}
                  className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-amber-500 hover:from-indigo-400 hover:to-amber-400 text-zinc-950 font-black transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className={`w-4 h-4 ${isAiGenerating ? 'animate-spin' : ''}`} />
                  <span>{isAiGenerating ? 'Нейросеть пишет кампанию...' : 'Сгенерировать сейчас'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
