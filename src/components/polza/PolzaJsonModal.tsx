import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles,
  Bot,
  Wand2,
  X,
  Check,
  Copy,
  Save,
  Brain,
  Terminal,
  RefreshCw,
  AlertCircle,
  FileJson,
  Layers,
  MapPin,
  ShieldAlert,
  Sword,
  Scroll,
  BookOpen,
  Dice5,
  Compass,
  Cpu,
  Globe,
  Swords,
  Crown,
  Building,
} from 'lucide-react';
import {
  PolzaDataGenOptions,
  PolzaEntityType,
  PolzaTextModelId,
  PolzaTextModelInfo,
  PolzaDataGenResponse,
} from '../../types/polzaTypes';
import { polzaEntityAdapterService, AdaptedPolzaEntityResult } from '../../services/polzaEntityAdapterService';
import { polzaService } from '../../services/polzaService';
import { playUniversalSfx } from '../../utils/sfxAudio';

interface PolzaJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEntityType?: PolzaEntityType;
  initialOptions?: Partial<PolzaDataGenOptions>;
  onGenerated?: (jsonData: any, imagePrompt?: string, entityType?: PolzaEntityType) => void;
}

export const PolzaJsonModal: React.FC<PolzaJsonModalProps> = ({
  isOpen,
  onClose,
  initialEntityType = 'monster',
  initialOptions,
  onGenerated,
}) => {
  const [entityType, setEntityType] = useState<PolzaEntityType>(initialEntityType);
  const [models, setModels] = useState<PolzaTextModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<PolzaTextModelId>('deepseek/deepseek-r1-distill-llama-70b');
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(true);
  const [customApiKey, setCustomApiKey] = useState<string>(() => polzaService.getStoredApiKey());

  // Prompt options state
  const [userPrompt, setUserPrompt] = useState<string>('');
  const [cr, setCr] = useState<string>('8');
  const [monsterSize, setMonsterSize] = useState<string>('Большой');
  const [monsterType, setMonsterType] = useState<string>('Аберрация');
  const [environment, setEnvironment] = useState<string>('Подземелья, корабль, заброшенные руины');
  const [specialFeatures, setSpecialFeatures] = useState<string>('Кислотная кровь, скрытность, ядовитый укус');

  // NPC options
  const [race, setRace] = useState<string>('Кенку');
  const [classType, setClassType] = useState<string>('Плут (Вор)');
  const [gender, setGender] = useState<string>('Мужской');
  const [attitude, setAttitude] = useState<string>('Скрытный торговец');
  const [faction, setFaction] = useState<string>('Гильдия Воров');

  // Location
  const [locationType, setLocationType] = useState<string>('Затопленный древний храм');
  const [dangerAtmosphere, setDangerAtmosphere] = useState<string>('Высокая опасность, зловещий шепот волн');

  // Quest / Campaign
  const [questCategory, setQuestCategory] = useState<'main' | 'side' | 'bounty'>('main');
  const [partyLevel, setPartyLevel] = useState<string>('3-5');
  const [campaignSetting, setCampaignSetting] = useState<string>('Готическое фэнтези / Холодные земли');
  const [actsCount, setActsCount] = useState<number>(3);

  // Rule
  const [ruleCategory, setRuleCategory] = useState<string>('Хоррор / Безумие');

  // General settings
  const [autoSave, setAutoSave] = useState<boolean>(true);

  // Status & Generation output
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [result, setResult] = useState<PolzaDataGenResponse | null>(null);
  const [adaptedResult, setAdaptedResult] = useState<AdaptedPolzaEntityResult | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'json'>('card');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showReasoning, setShowReasoning] = useState<boolean>(true);

  // Sync initial state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialEntityType) setEntityType(initialEntityType);
      if (initialOptions) {
        if (initialOptions.userPrompt) setUserPrompt(initialOptions.userPrompt);
        if (initialOptions.cr) setCr(initialOptions.cr);
        if (initialOptions.monsterSize) setMonsterSize(initialOptions.monsterSize);
        if (initialOptions.monsterType) setMonsterType(initialOptions.monsterType);
        if (initialOptions.environment) setEnvironment(initialOptions.environment);
        if (initialOptions.race) setRace(initialOptions.race);
        if (initialOptions.classType) setClassType(initialOptions.classType);
        if (initialOptions.gender) setGender(initialOptions.gender);
        if (initialOptions.locationType) setLocationType(initialOptions.locationType);
        if (initialOptions.existingMapName) setUserPrompt(`Описание и лор для карты: ${initialOptions.existingMapName}`);
      }
      fetchModels();
    }
  }, [isOpen, initialEntityType, initialOptions]);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/polza/text-models');
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        setModels(data.models);
        if (data.defaultModel) setSelectedModel(data.defaultModel);
        setHasEnvKey(data.hasEnvKey);
      }
    } catch (err) {
      console.warn('Failed to load text models:', err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setResult(null);

    const options: PolzaDataGenOptions = {
      userPrompt: userPrompt.trim() || getDefaultPromptForEntity(entityType),
      entityType,
      cr,
      monsterSize,
      monsterType,
      environment,
      specialFeatures,
      race,
      classType,
      gender,
      attitude,
      faction,
      locationType,
      dangerAtmosphere,
      existingMapName: initialOptions?.existingMapName,
      questCategory,
      partyLevel,
      campaignSetting,
      actsCount,
      ruleCategory,
    };

    try {
      const res = await fetch('/api/polza/generate-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel,
          options,
          customApiKey: customApiKey.trim() || undefined,
          autoSaveToDatabase: autoSave,
        }),
      });

      const data: PolzaDataGenResponse = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Ошибка при генерации JSON через Polza AI');
      } else {
        setResult(data);
        if (data.jsonData) {
          try {
            const adapted = await polzaEntityAdapterService.adaptAndSave(data.jsonData, entityType, options);
            setAdaptedResult(adapted);
            playUniversalSfx('success');
          } catch (adaptErr: any) {
            console.error('Entity adaptation error:', adaptErr);
          }
        }
        if (onGenerated && data.jsonData) {
          onGenerated(data.jsonData, data.imagePrompt, entityType);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка подключения к серверу генерации');
    } finally {
      setIsGenerating(false);
    }
  };

  const getDefaultPromptForEntity = (type: PolzaEntityType): string => {
    switch (type) {
      case 'monster':
        return 'Опасный инопланетный хищник типа Чужого с кислотной кровью, живущий в темноте';
      case 'npc':
        return 'Скрытный кенку-плут, торгующий украденными артефактами в таверне';
      case 'location':
        return 'Затопленный храм древней богини морей с ловушками и секретными комнатами';
      case 'item':
        return 'Древний обсидиановый клинок теневого феникса с фиолетовым пламенем';
      case 'spell':
        return 'Заклинание 6 уровня: Сфера Гравитационной Пустоты';
      case 'quest':
        return 'Поиски похищенной печати совета и раскрытие культа чумных докторов';
      case 'campaign':
        return 'Мрачная готическая кампания "Кровавое Затмение" из 3 актов про графа-вампира';
      case 'rule':
        return 'Механика очков Рассудка и Безумия от вида космических аберраций';
      case 'lore':
        return 'Энциклопедическая статья про тайный Культ Чёрного Солнца';
      case 'table':
        return 'Случайная таблица d20 непредсказуемых происшествий в катакомбах';
      default:
        return 'Уникальный игровой объект';
    }
  };

  const handleCopyJson = () => {
    if (result?.jsonData) {
      navigator.clipboard.writeText(JSON.stringify(result.jsonData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-hidden">
      <div className="relative w-full max-w-4xl max-h-[88vh] h-full sm:h-auto flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
                <span>Polza AI — Генератор структурированных данных JSON</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase font-mono">
                  PRO
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Автоматическое создание лора, бестиария, НИП, квестов и кампаний с нейросетевым рассуждением
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Generator Controls */}
          <div className="lg:col-span-5 space-y-4">
            {/* Entity Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Тип генерируемой сущности</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'monster', label: 'Монстр / CR', icon: ShieldAlert },
                  { id: 'npc', label: 'NPC / НИП', icon: Wand2 },
                  { id: 'location', label: 'Карта / Локация', icon: MapPin },
                  { id: 'item', label: 'Артефакт', icon: Sword },
                  { id: 'quest', label: 'Квест', icon: Scroll },
                  { id: 'campaign', label: 'Кампания (3 Акта)', icon: Compass },
                  { id: 'rule', label: 'Правило / Механика', icon: Cpu },
                  { id: 'lore', label: 'Статья Лор Wiki', icon: BookOpen },
                  { id: 'spell', label: 'Заклинание', icon: Sparkles },
                  { id: 'table', label: 'Таблица D20', icon: Dice5 },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = entityType === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setEntityType(item.id as PolzaEntityType)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center space-x-2 transition-all text-left ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-xs'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Brain className="w-3.5 h-3.5 text-purple-400" />
                  <span>Модель Polza AI</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Chat Completions</span>
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as PolzaTextModelId)}
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 focus:outline-hidden focus:border-amber-500"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.isDefault ? ' (По умолчанию)' : ''} — {m.provider}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">
                {models.find((m) => m.id === selectedModel)?.description || 'DeepSeek R1 reasoning модель для баланса D&D.'}
              </p>
            </div>

            {/* Custom API Key if required */}
            {!hasEnvKey && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>POLZA_AI_API_KEY не обнаружен</span>
                </div>
                <input
                  type="password"
                  placeholder="Вставьте ваш Polza AI API Ключ (polza_...)"
                  value={customApiKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomApiKey(val);
                    polzaService.setStoredApiKey(val);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-amber-500/40 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden"
                />
              </div>
            )}

            {/* Entity-Specific Form Controls */}
            <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 space-y-3">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                <span>Параметры и Фичи</span>
                <span className="text-[10px] font-normal text-zinc-500 capitalize">{entityType}</span>
              </h3>

              {/* Monster Specific Controls */}
              {entityType === 'monster' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Опасность (CR)</label>
                    <input
                      type="text"
                      value={cr}
                      onChange={(e) => setCr(e.target.value)}
                      placeholder="Например: 8 или 1/2"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Размер</label>
                    <select
                      value={monsterSize}
                      onChange={(e) => setMonsterSize(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    >
                      <option value="Крошечный">Крошечный</option>
                      <option value="Маленький">Маленький</option>
                      <option value="Средний">Средний</option>
                      <option value="Большой">Большой</option>
                      <option value="Огромный">Огромный</option>
                      <option value="Громадный">Громадный</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[11px] text-zinc-400 block mb-1">Особые фичи (через запятую)</label>
                    <input
                      type="text"
                      value={specialFeatures}
                      onChange={(e) => setSpecialFeatures(e.target.value)}
                      placeholder="Кислотная кровь, вытягивание душ, телепортация"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                </div>
              )}

              {/* NPC Specific Controls */}
              {entityType === 'npc' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Раса</label>
                    <input
                      type="text"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      placeholder="Кенку, Драконорожденный, Человек..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Класс / Роль</label>
                    <input
                      type="text"
                      value={classType}
                      onChange={(e) => setClassType(e.target.value)}
                      placeholder="Плут, Торговец, Паладин..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Пол</label>
                    <input
                      type="text"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Фракция</label>
                    <input
                      type="text"
                      value={faction}
                      onChange={(e) => setFaction(e.target.value)}
                      placeholder="Гильдия воров, Сообщество..."
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                </div>
              )}

              {/* Location Controls */}
              {entityType === 'location' && (
                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Тип локации / Окружение</label>
                    <input
                      type="text"
                      value={locationType}
                      onChange={(e) => setLocationType(e.target.value)}
                      placeholder="Подводный храм, некрополь, заброшенная шахта"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Атмосфера и опасности</label>
                    <input
                      type="text"
                      value={dangerAtmosphere}
                      onChange={(e) => setDangerAtmosphere(e.target.value)}
                      placeholder="Высокая опасность, коралловый яд, зловещий гул"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                </div>
              )}

              {/* Quest & Campaign Controls */}
              {(entityType === 'quest' || entityType === 'campaign') && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Уровень группы</label>
                    <input
                      type="text"
                      value={partyLevel}
                      onChange={(e) => setPartyLevel(e.target.value)}
                      placeholder="1-3, 5-7, 10+"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                    />
                  </div>
                  {entityType === 'campaign' && (
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Сеттинг</label>
                      <input
                        type="text"
                        value={campaignSetting}
                        onChange={(e) => setCampaignSetting(e.target.value)}
                        placeholder="Готика, Киберпанк, Темное фэнтези"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Main Custom Prompt Box */}
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1 font-semibold">
                  Пользовательский концепт / Конкретное пожелание (Промпт)
                </label>
                <textarea
                  rows={3}
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  placeholder={getDefaultPromptForEntity(entityType)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500 resize-none"
                />
              </div>
            </div>

            {/* Options Checkbox */}
            <div className="flex items-center space-x-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                id="autoSaveDb"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                className="w-4 h-4 rounded-md border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0"
              />
              <label htmlFor="autoSaveDb" className="cursor-pointer select-none">
                Автоматически сохранить в базу данных приложения (.json)
              </label>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 flex items-center justify-center space-x-2 transition-all shadow-lg hover:shadow-amber-500/20 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-zinc-950" />
                  <span>Генерация структурированного JSON...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-zinc-950" />
                  <span>Сгенерировать в Polza AI</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Output & JSON Display */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-1">
                <div className="font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Ошибка генерации</span>
                </div>
                <p>{errorMsg}</p>
              </div>
            )}

            {!result && !isGenerating && !errorMsg && (
              <div className="flex-1 min-h-[340px] rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400">
                  <FileJson className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Готов к генерации игрового объекта</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Выберите тип объекта, задайте желаемые статы или концепт и нажмите «Сгенерировать в Polza AI». ИИ создаст валидный D&D 5e JSON.
                </p>
              </div>
            )}

            {isGenerating && (
              <div className="flex-1 min-h-[340px] rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col items-center justify-center space-y-4 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
                  <Bot className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">Нейросеть проектирует объект...</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Модель {selectedModel} строит баланс, статблок и рассуждения.
                  </p>
                </div>
              </div>
            )}

            {result && result.success && (
              <div className="flex-1 flex flex-col space-y-3">
                {/* Result header with tabs */}
                <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-zinc-100">
                      Успешно создано: {adaptedResult?.name || result.entityType}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                      ✓ Сохранено в базу
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex p-0.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setViewMode('card')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          viewMode === 'card' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        Карточка
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('json')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                          viewMode === 'json' ? 'bg-amber-500 text-zinc-950 shadow-xs' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        JSON Исходник
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-2.5 py-1 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Скопировано' : 'Копия'}</span>
                    </button>
                  </div>
                </div>

                {/* Reasoning Tab if available */}
                {result.reasoning && (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="w-full px-3 py-2 bg-purple-900/30 hover:bg-purple-900/40 text-left text-xs font-bold text-purple-300 flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <Brain className="w-3.5 h-3.5 text-purple-400" />
                        <span>Логика и Рассуждения нейросети (DeepSeek R1 Thinking)</span>
                      </span>
                      <span className="text-[10px] font-mono">{showReasoning ? 'Скрыть' : 'Показать'}</span>
                    </button>
                    {showReasoning && (
                      <div className="p-3 text-[11px] font-mono text-purple-200/90 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed border-t border-purple-500/20 bg-black/40">
                        {result.reasoning}
                      </div>
                    )}
                  </div>
                )}

                {/* View Mode Content */}
                {viewMode === 'card' && adaptedResult ? (
                  <div className="flex-1 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">
                              {adaptedResult.monsterTemplate?.avatar || adaptedResult.playerCharacter?.avatar || '✦'}
                            </span>
                            <h3 className="text-base font-bold text-amber-300">{adaptedResult.name}</h3>
                          </div>
                          {adaptedResult.originalName && (
                            <p className="text-xs text-zinc-400 italic mt-0.5">{adaptedResult.originalName}</p>
                          )}
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-[11px]">
                          {adaptedResult.monsterTemplate?.cr || adaptedResult.playerCharacter?.classLevel || adaptedResult.entityType}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-200 leading-relaxed bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                        {adaptedResult.summary}
                      </p>

                      {/* Display Monster Stats if Monster */}
                      {adaptedResult.monsterTemplate && (
                        <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-rose-950/20 border border-rose-900/40">
                          <div>
                            <div className="text-[10px] text-rose-400 font-bold uppercase">Хиты (HP)</div>
                            <div className="text-sm font-bold text-rose-200">{adaptedResult.monsterTemplate.maxHp}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-rose-400 font-bold uppercase">Класс Доспеха (AC)</div>
                            <div className="text-sm font-bold text-rose-200">{adaptedResult.monsterTemplate.ac}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-rose-400 font-bold uppercase">Инициатива</div>
                            <div className="text-sm font-bold text-rose-200">+{adaptedResult.monsterTemplate.initBonus}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Toast / Success confirmation */}
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
                      <span className="font-semibold flex items-center space-x-1.5">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Объект готов к работе в Лор Вики и Бестиарии</span>
                      </span>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                      >
                        Принять
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 relative rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden min-h-[220px]">
                    <pre className="p-4 text-xs font-mono text-amber-200/90 overflow-auto h-full max-h-[380px] leading-relaxed select-all">
                      {JSON.stringify(result.jsonData, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Paired Image Prompt Info */}
                {result.imagePrompt && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                    <div className="flex items-center space-x-2 truncate mr-2">
                      <Wand2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="truncate">Промпт арта: {result.imagePrompt}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-xs text-zinc-400 z-10">
          <div className="flex items-center space-x-2">
            <Terminal className="w-3.5 h-3.5 text-amber-400" />
            <span>Polza AI Backend API • Chat Completions JSON Format</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
