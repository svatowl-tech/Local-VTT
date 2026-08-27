import React, { useState } from 'react';
import { campaignService } from '../../services/campaignService';
import {
  CampaignState,
  CampaignQuest,
  CampaignLocation,
  CampaignNpc,
  CampaignPartyCharacter,
} from '../../types/campaignTypes';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Scroll,
  ShieldAlert,
  Users,
  MapPin,
  Swords,
  Crown,
  BookOpen,
  Dice5,
  Coins,
} from 'lucide-react';
import { playUniversalSfx } from '../../utils/sfxAudio';

interface Props {
  onClose: () => void;
  onCampaignCreated?: () => void;
}

export const CampaignCreationWizardModal: React.FC<Props> = ({
  onClose,
  onCampaignCreated,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 7;

  // Step 1: Basics
  const [name, setName] = useState<string>('Хроники Потерянного Королевства');
  const [dmName, setDmName] = useState<string>('Мастер');
  const [system, setSystem] = useState<string>('D&D 5e');
  const [worldName, setWorldName] = useState<string>('Забытые Королевства (Faerûn)');
  const [tone, setTone] = useState<string>('Героическое фэнтези с элементами древней магии');

  // Step 2: Threat & Inciting Incident
  const [villainName, setVillainName] = useState<string>('Малакор Темнокрылый');
  const [villainGoal, setVillainGoal] = useState<string>('Пробуждение спящего древнего бога из глубин катакомб');
  const [mainThreatDesc, setMainThreatDesc] = useState<string>(
    'Культисты Теневой Вуали похищают артефакты стихий, чтобы снять печати с врат Бездны.'
  );

  // Step 3: Starter Hub / Settlement
  const [hubName, setHubName] = useState<string>('Ореховый Дол (Oakhaven)');
  const [hubTavernName, setHubTavernName] = useState<string>('Таверна «Хромой Грифон»');
  const [hubDesc, setHubDesc] = useState<string>(
    'Уютное торговое поселение у подножия туманных холмов, известное крепким элем и частыми слухами о монстрах.'
  );

  // Step 4: Key NPCs
  const [questGiverName, setQuestGiverName] = useState<string>('Элдрин Седобородый');
  const [questGiverRole, setQuestGiverRole] = useState<string>('Хранитель архивов и отставной боевой маг');
  const [allyName, setAllyName] = useState<string>('Мира Быстроногая');
  const [allyRole, setAllyRole] = useState<string>('Опытная следопытка и информатор гильдии');

  // Step 5: Starter Quests
  const [mainQuestTitle, setMainQuestTitle] = useState<string>('Тайна оскверненного источника');
  const [mainQuestGoal, setMainQuestGoal] = useState<string>('Исследовать древний колодец и остановить ритуал скверны');
  const [sideHook, setSideHook] = useState<string>('Награда за поимку банды Гоблинов-Разбойников на тракте');

  // Step 6: Party & Treasury
  const [partyNames, setPartyNames] = useState<string>('Торин (Воин), Лира (Жрица), Варис (Плут), Кай (Чародей)');
  const [startingGold, setStartingGold] = useState<number>(150);

  // Step 7: Safety Tools & House Rules
  const [lines, setLines] = useState<string>('Насилие над детьми, жестокие пытки');
  const [veils, setVeils] = useState<string>('Романтические сцены (fade to black), детальные ранения');
  const [useFlanking, setUseFlanking] = useState<boolean>(true);
  const [potionBonusAction, setPotionBonusAction] = useState<boolean>(true);

  const handleNext = () => {
    playUniversalSfx('item_click');
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    playUniversalSfx('item_click');
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinishWizard = async () => {
    playUniversalSfx('dice_roll');
    const now = Date.now();
    const id = `campaign-wiz-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Parse party characters
    const charList: CampaignPartyCharacter[] = partyNames
      .split(',')
      .map((item, idx) => {
        const trimmed = item.trim();
        const match = trimmed.match(/^([^(]+)(?:\(([^)]+)\))?/);
        const cName = match ? match[1].trim() : trimmed;
        const cClass = match && match[2] ? match[2].trim() : 'Приключенец';
        return {
          id: `char-${idx + 1}`,
          name: cName || `Герой ${idx + 1}`,
          playerName: `Игрок ${idx + 1}`,
          characterClass: cClass,
          level: 1,
          race: 'Человек',
          currentHp: 12,
          maxHp: 12,
          armorClass: 14,
          passivePerception: 12,
          inspiration: false,
          notes: '',
        };
      })
      .filter((c) => c.name.length > 0);

    // Starter NPCs
    const npcs: CampaignNpc[] = [
      {
        id: `npc-giver-${now}`,
        name: questGiverName,
        title: questGiverRole,
        race: 'Человек',
        gender: 'Мужской',
        alignment: 'Законно-добрый',
        attitudeToParty: 'friendly',
        status: 'alive',
        currentLocationName: hubName,
        personalityTraits: 'Мудрый, слегка рассеянный, но верный слову',
        appearance: 'Седовласый старец в синей мантии с серебряной вышивкой',
        goalsAndMotivations: 'Защитить долину от надвигающейся угрозы',
        secretsKnown: ['Знает точное расположение скрытого святилища культистов'],
        tags: ['Квестодатель', 'Союзник', 'Маг'],
      },
      {
        id: `npc-ally-${now}`,
        name: allyName,
        title: allyRole,
        race: 'Полуэльф',
        gender: 'Женский',
        alignment: 'Хаотично-добрая',
        attitudeToParty: 'friendly',
        status: 'alive',
        currentLocationName: hubTavernName,
        personalityTraits: 'Наблюдательная, быстрая на расправу, любит шутки',
        appearance: 'Кожаная броня, короткий лук за спиной, пронзительный взгляд',
        goalsAndMotivations: 'Раскрыть тайну исчезновения своего отряда',
        secretsKnown: [],
        tags: ['Следопыт', 'Информатор'],
      },
      {
        id: `npc-boss-${now}`,
        name: villainName,
        title: 'Главный антагонист',
        race: 'Тифлинг / Нежить',
        gender: 'Мужской',
        alignment: 'Нейтрально-злой',
        attitudeToParty: 'hostile',
        status: 'alive',
        personalityTraits: 'Холодный стратег, манипулятор',
        appearance: 'Темные латы, скрывающее лицо капюшон, горящие фиолетовым глаза',
        goalsAndMotivations: villainGoal,
        secretsKnown: ['Уязвим к святой воде и лунному серебру'],
        tags: ['Босс', 'Злодей', 'Культ'],
      },
    ];

    // Starter Location
    const locations: CampaignLocation[] = [
      {
        id: `loc-hub-${now}`,
        name: hubName,
        type: 'town',
        description: hubDesc,
        explorationStatus: 'explored',
        threatLevel: 'none',
        pointsOfInterest: [
          {
            id: 'poi-1',
            name: hubTavernName,
            description: 'Главное место сбора новостей и отдыха',
            threat: 'none',
          },
          {
            id: 'poi-2',
            name: 'Башня архивариуса',
            description: 'Обитель Элдрина и хранилище старинных свитков',
            threat: 'none',
          },
          {
            id: 'poi-3',
            name: 'Старый заброшенный колодец',
            description: 'Вход в подземные катакомбы и источник скверны',
            threat: 'medium',
          },
        ],
        knownSecrets: [mainThreatDesc],
        connectedLocationIds: [],
        tags: ['Хаб', 'Город'],
      },
    ];

    // Starter Quests
    const quests: CampaignQuest[] = [
      {
        id: `quest-main-${now}`,
        title: mainQuestTitle,
        description: `${mainQuestGoal}. ${mainThreatDesc}`,
        category: 'main',
        status: 'active',
        giverNpcName: questGiverName,
        locationName: hubName,
        objectives: [
          { id: 'o-1', text: 'Поговорить с Элдрином в башне архивариуса', completed: true },
          { id: 'o-2', text: 'Найти тайный спуск в катакомбы под колодцем', completed: false },
          { id: 'o-3', text: 'Прервать ритуал культистов', completed: false },
        ],
        rewards: {
          gold: 300,
          xp: 600,
          items: ['Зелье исцеления (2 шт.)', 'Свиток Опознания'],
        },
        secretsAndClues: ['Культисты используют медальоны в форме глаза с тремя зрачками'],
        createdAtInGame: '15.7.1492',
        updatedAtInGame: '15.7.1492',
        tags: ['Основной сюжет', '1 Акт'],
      },
      {
        id: `quest-side-${now}`,
        title: 'Зацепка: ' + sideHook,
        description: 'Местные торговцы жалуются на нападения на тракте и предлагают вознаграждение за очистку дороги.',
        category: 'bounty',
        status: 'active',
        giverNpcName: allyName,
        locationName: 'Окрестности тракта',
        objectives: [
          { id: 'so-1', text: 'Выследить лагерь налетчиков', completed: false },
          { id: 'so-2', text: 'Вернуть украденный караван', completed: false },
        ],
        rewards: {
          gold: 100,
          xp: 200,
        },
        secretsAndClues: [],
        createdAtInGame: '15.7.1492',
        updatedAtInGame: '15.7.1492',
        tags: ['Побочный квест', 'Награда'],
      },
    ];

    const newCampaign: Partial<CampaignState> = {
      id,
      name,
      dungeonMasterName: dmName,
      system,
      worldName,
      time: {
        year: 1492,
        month: 7,
        day: 15,
        hour: 10,
        minute: 0,
        eraName: '1492 DR (Эра Приключений)',
        calendarSystem: 'harptos',
        weather: 'clear',
        temperatureDesc: '+21°C, солнечно и ясно',
        moonPhase: 'first_quarter',
        dayOfWeek: 'Флеймрул',
        season: 'summer',
      },
      quests,
      locations,
      npcs,
      relationships: [
        {
          id: `rel-1-${now}`,
          sourceNpcId: npcs[0].id,
          targetNpcId: npcs[1].id,
          relationshipType: 'allies',
          description: 'Мира выполняет поручения архивариуса по сбору информации',
          intensity: 'strong',
        },
      ],
      factions: [
        {
          id: `fac-cult-${now}`,
          name: 'Культ Теневой Вуали',
          leaderNpcName: villainName,
          alignment: 'Нейтрально-злой',
          goals: villainGoal,
          attitudeToParty: 'hostile',
          influenceLevel: 'influential',
          notes: 'Секретная организация, вербующая изгоев и колдунов',
        },
      ],
      sessions: [
        {
          id: `sess-0-${now}`,
          sessionNumber: 1,
          realDate: new Date().toISOString().split('T')[0],
          inGameDate: '15 Флеймрула 1492 DR',
          title: 'Сессия 1: Прибытие в Ореховый Дол',
          summary: 'Герои прибывают в таверну «Хромой Грифон» и получают первое предупреждение о надвигающейся беде.',
          lazyDmNotes: {
            strongStart: 'Гоблинский арбалетный болт с глухим стуком вонзается в деревянную вывеску таверны прямо над головами героев!',
            potentialScenes: [
              'Схватка с передовым дозором гоблинов на мосту',
              'Разговор с напуганным трактирщиком и встреча с Мирой',
              'Спуск в холодные катакомбы под старым колодцем',
            ],
            secretsAndClues: [
              'Символ культа оставляет ожог на коже каждого посвященного',
              'Вода в колодце по ночам слабо светится бледным фиолетовым светом',
            ],
            fantasticLocations: [
              'Древний зал со сводчатыми потолками и статуями безликих королей',
            ],
            importantNpcs: [questGiverName, allyName],
            monsters: ['Гоблины (4 шт.)', 'Гоблин-шаман (1 шт.)', 'Теневые крысы (2 шт.)'],
            treasureRewards: 'Кошель с 45 зм и старинный амулет защиты',
          },
          xpAwarded: 150,
          goldAwarded: 45,
          tags: ['Старт', '1 Сессия'],
        },
      ],
      party: charList,
      treasury: {
        copper: 40,
        silver: 65,
        electrum: 0,
        gold: startingGold,
        platinum: 2,
        sharedBag: [
          {
            id: 'item-starter-rope',
            name: 'Шелковая веревка (50 фт.)',
            quantity: 1,
            category: 'gear',
            weight: 5,
            notes: 'Базовое снаряжение приключенцев',
          },
          {
            id: 'item-starter-torch',
            name: 'Факелы',
            quantity: 5,
            category: 'gear',
            weight: 5,
            notes: 'Освещают радиус 20 фт. ярким светом',
          },
        ],
        transactions: [
          {
            id: 'tx-init',
            timestamp: now,
            type: 'deposit',
            amountStr: `+${startingGold} GP`,
            reason: 'Стартовая казна партии героев',
          },
        ],
      },
      safety: {
        xCardTriggered: false,
        lines: lines.split(',').map((s) => s.trim()).filter(Boolean),
        veils: veils.split(',').map((s) => s.trim()).filter(Boolean),
        houseRules: [
          ...(potionBonusAction
            ? [
                {
                  id: 'hr-potion',
                  title: 'Зелья бонусным действием',
                  category: 'combat' as const,
                  ruleText: 'Выпить зелье исцеления самостоятельно стоит Бонусное действие (бросок кубиков) или Основное действие (максимальное исцеление). Напоить союзника — всегда Основное.',
                  isActive: true,
                },
              ]
            : []),
          ...(useFlanking
            ? [
                {
                  id: 'hr-flanking',
                  title: 'Фланкирование (+2 к атаке)',
                  category: 'combat' as const,
                  ruleText: 'Если два союзника находятся на противоположных сторонах врага, они получают +2 к броскам атаки ближнего боя.',
                  isActive: true,
                },
              ]
            : []),
        ],
        breakTimerMinutes: 15,
        breakTimerEndsAt: null,
        breakTimerActive: false,
      },
    };

    await campaignService.createNewCampaign(newCampaign);
    if (onCampaignCreated) onCampaignCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">
                Мастер создания кампании (Пошаговый конструктор)
              </h2>
              <p className="text-xs text-zinc-400">
                Шаг {currentStep} из {totalSteps}: {getStepTitle(currentStep)}
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

        {/* Progress Bar */}
        <div className="w-full bg-zinc-900 h-1.5 flex">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-full transition-all duration-300 ${
                i + 1 <= currentStep ? 'bg-amber-400' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-zinc-300 space-y-4">
          {/* STEP 1: BASICS */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  1. Название кампании:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                  placeholder="Например: Тени над Невервинтером"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">
                    Имя Мастера (DM / GM):
                  </label>
                  <input
                    type="text"
                    value={dmName}
                    onChange={(e) => setDmName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
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
                    <option value="Call of Cthulhu">Зов Ктулху (CoC 7e)</option>
                    <option value="Savage Worlds">Savage Worlds</option>
                    <option value="GURPS">GURPS</option>
                    <option value="Custom System">Своя / Авторская система</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Мир / Сеттинг:
                </label>
                <input
                  type="text"
                  value={worldName}
                  onChange={(e) => setWorldName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Forgotten Realms, Eberron, Ravenloft, Свой мир"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Жанр, тон и общая атмосфера:
                </label>
                <input
                  type="text"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Героическое приключение, Гримдарк, Интриги и детектив"
                />
              </div>
            </div>
          )}

          {/* STEP 2: MAIN THREAT */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  2. Главный антагонист / Лидер угрозы:
                </label>
                <input
                  type="text"
                  value={villainName}
                  onChange={(e) => setVillainName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                  placeholder="Имя главного злодея или враждебной силы"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Главная цель и тайный замысел антагониста:
                </label>
                <input
                  type="text"
                  value={villainGoal}
                  onChange={(e) => setVillainGoal(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Что произойдет, если герои не вмешаются?"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Завязка сюжета (Inciting Incident) и первые признаки угрозы:
                </label>
                <textarea
                  value={mainThreatDesc}
                  onChange={(e) => setMainThreatDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="С чего начинается кризис в регионе?"
                />
              </div>
            </div>
          )}

          {/* STEP 3: STARTER HUB */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-amber-300 mb-1">
                    3. Стартовое поселение / Хаб:
                  </label>
                  <input
                    type="text"
                    value={hubName}
                    onChange={(e) => setHubName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 focus:border-amber-400 focus:outline-none"
                    placeholder="Название деревни, города или аванпоста"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-400 mb-1">
                    Главная таверна или место сбора:
                  </label>
                  <input
                    type="text"
                    value={hubTavernName}
                    onChange={(e) => setHubTavernName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                    placeholder="Название таверны или штаба"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Краткое описание стартовой локации и атмосфера:
                </label>
                <textarea
                  value={hubDesc}
                  onChange={(e) => setHubDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Чем живет это место, какие слухи ходят среди жителей..."
                />
              </div>
            </div>
          )}

          {/* STEP 4: KEY NPCS */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <span className="font-bold text-amber-300 text-xs">
                  4.1. Главный квестодатель / Наставник:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={questGiverName}
                    onChange={(e) => setQuestGiverName(e.target.value)}
                    placeholder="Имя квестодателя"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={questGiverRole}
                    onChange={(e) => setQuestGiverRole(e.target.value)}
                    placeholder="Роль / Статус / Профессия"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/50 space-y-3">
                <span className="font-bold text-amber-300 text-xs">
                  4.2. Местный союзник / Информатор:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={allyName}
                    onChange={(e) => setAllyName(e.target.value)}
                    placeholder="Имя союзника"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={allyRole}
                    onChange={(e) => setAllyRole(e.target.value)}
                    placeholder="Роль / Связи"
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: STARTER QUESTS */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  5.1. Название основного квеста 1-го акта:
                </label>
                <input
                  type="text"
                  value={mainQuestTitle}
                  onChange={(e) => setMainQuestTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Первоочередная цель этого квеста:
                </label>
                <input
                  type="text"
                  value={mainQuestGoal}
                  onChange={(e) => setMainQuestGoal(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  5.2. Побочная зацепка / Слух для охоты:
                </label>
                <input
                  type="text"
                  value={sideHook}
                  onChange={(e) => setSideHook(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Награда за монстра или заказ от гильдии"
                />
              </div>
            </div>
          )}

          {/* STEP 6: PARTY & TREASURY */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block font-bold text-amber-300 mb-1">
                  6. Состав партии героев (Имя и класс через запятую):
                </label>
                <textarea
                  value={partyNames}
                  onChange={(e) => setPartyNames(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  placeholder="Торин (Воин), Лира (Жрица), Варис (Плут), Кай (Чародей)"
                />
                <span className="text-[10px] text-zinc-500">
                  Формат: Имя (Класс). Вы всегда сможете добавить статы и отредактировать в трекере.
                </span>
              </div>

              <div>
                <label className="block font-medium text-zinc-400 mb-1">
                  Стартовый золотой запас партии (GP):
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    value={startingGold}
                    onChange={(e) => setStartingGold(parseInt(e.target.value, 10) || 0)}
                    className="w-32 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-amber-400 font-bold">GP (Золотых монет)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7: SAFETY TOOLS & SUMMARY */}
          {currentStep === 7 && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <label className="block font-bold text-rose-300 mb-1">
                  7.1. Линии (Hard Limits - полностью исключенные темы):
                </label>
                <input
                  type="text"
                  value={lines}
                  onChange={(e) => setLines(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-indigo-300 mb-1">
                  7.2. Вуали (Veils - темы, уходящие в затемнение):
                </label>
                <input
                  type="text"
                  value={veils}
                  onChange={(e) => setVeils(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
                <span className="font-bold text-amber-300 text-xs">
                  Популярные домашние правила:
                </span>
                <label className="flex items-center space-x-2.5 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={potionBonusAction}
                    onChange={(e) => setPotionBonusAction(e.target.checked)}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                  />
                  <span>Зелья исцеления пьются бонусным действием</span>
                </label>
                <label className="flex items-center space-x-2.5 cursor-pointer text-zinc-300">
                  <input
                    type="checkbox"
                    checked={useFlanking}
                    onChange={(e) => setUseFlanking(e.target.checked)}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-0"
                  />
                  <span>Фланкирование дает +2 к атаке</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={handlePrev}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Назад</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              onClick={handleNext}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <span>Далее</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinishWizard}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 text-xs font-black transition-all shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Создать и открыть кампанию</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return 'Основы и Сеттинг';
    case 2:
      return 'Главный конфликт и Угроза';
    case 3:
      return 'Стартовая локация';
    case 4:
      return 'Ключевые NPC';
    case 5:
      return 'Стартовые квесты';
    case 6:
      return 'Партия героев и Казна';
    case 7:
      return 'Правила и Безопасность';
    default:
      return '';
  }
}
