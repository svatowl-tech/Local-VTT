import React, { useState, useEffect } from 'react';
import {
  initiativeEngine,
  POPULAR_CONDITIONS,
  INITIATIVE_FORMULAS,
} from '../services/initiativeEngine';
import { dnd5eApiService } from '../services/dnd5eApiService';
import {
  PlayerCharacter,
  MonsterTemplate,
  InitiativeCombatant,
  CombatantCategory,
  InitiativeFormula,
  InitiativeSortDirection,
} from '../types';
import { FloatingWindow } from './FloatingWindow';
import {
  Swords,
  Shield,
  Skull,
  UserPlus,
  Plus,
  Trash2,
  X,
  Play,
  RotateCcw,
  Dice5,
  ChevronRight,
  ChevronLeft,
  Search,
  Eye,
  EyeOff,
  Heart,
  ShieldAlert,
  Sparkles,
  Check,
  Settings,
  ArrowDownUp,
  Sliders,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

export const InitiativeModal: React.FC<Props> = ({
  isOpen,
  onClose,
  zIndex,
  onFocus,
}) => {
  const [state, setState] = useState(() => initiativeEngine.getState());
  const [activeTab, setActiveTab] = useState<'combat' | 'add-from-db' | 'manage-db'>('combat');

  // Sub-tab for DB selection/management
  const [dbCategory, setDbCategory] = useState<CombatantCategory>('player');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Monster quantity selection map: monsterId -> quantity
  const [monsterQuantities, setMonsterQuantities] = useState<Record<string, number>>({});

  // D&D 5e API Bestiary State
  const [monsterSourceTab, setMonsterSourceTab] = useState<'dnd5eapi' | 'local'>('dnd5eapi');
  const [dnd5eMonsters, setDnd5eMonsters] = useState<MonsterTemplate[]>([]);
  const [isSearchingDnd5e, setIsSearchingDnd5e] = useState<boolean>(false);
  const [dnd5eCrFilter, setDnd5eCrFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (activeTab === 'add-from-db' && dbCategory === 'monster' && monsterSourceTab === 'dnd5eapi') {
      let isCancelled = false;
      setIsSearchingDnd5e(true);
      const timer = setTimeout(() => {
        dnd5eApiService
          .searchMonsters(searchQuery, dnd5eCrFilter)
          .then((results) => {
            if (!isCancelled) {
              setDnd5eMonsters(results);
              setIsSearchingDnd5e(false);
            }
          })
          .catch((err) => {
            console.error('Error fetching dnd5eapi monsters:', err);
            if (!isCancelled) setIsSearchingDnd5e(false);
          });
      }, 150);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
      };
    }
  }, [searchQuery, dnd5eCrFilter, monsterSourceTab, activeTab, dbCategory]);

  // Conditions popup active for combatant
  const [activeConditionsCombatantId, setActiveConditionsCombatantId] = useState<string | null>(null);
  const [customConditionInput, setCustomConditionInput] = useState<string>('');

  // Rules flyout
  const [showRulesConfig, setShowRulesConfig] = useState<boolean>(false);

  // Forms for creating new Player / Monster
  const [isCreatingPlayer, setIsCreatingPlayer] = useState<boolean>(false);
  const [newPlayerName, setNewPlayerName] = useState<string>('');
  const [newPlayerClass, setNewPlayerClass] = useState<string>('');
  const [newPlayerOwner, setNewPlayerOwner] = useState<string>('');
  const [newPlayerHp, setNewPlayerHp] = useState<number>(30);
  const [newPlayerAc, setNewPlayerAc] = useState<number>(14);
  const [newPlayerInitBonus, setNewPlayerInitBonus] = useState<number>(2);
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string>('🛡️');

  const [isCreatingMonster, setIsCreatingMonster] = useState<boolean>(false);
  const [newMonsterName, setNewMonsterName] = useState<string>('');
  const [newMonsterType, setNewMonsterType] = useState<string>('Противник');
  const [newMonsterCr, setNewMonsterCr] = useState<string>('Ранг 1');
  const [newMonsterHp, setNewMonsterHp] = useState<number>(15);
  const [newMonsterAc, setNewMonsterAc] = useState<number>(12);
  const [newMonsterInitBonus, setNewMonsterInitBonus] = useState<number>(1);
  const [newMonsterAvatar, setNewMonsterAvatar] = useState<string>('👹');

  useEffect(() => {
    const unsubscribe = initiativeEngine.subscribe(() => {
      setState(initiativeEngine.getState());
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const { playerDatabase, monsterDatabase, encounter } = state;
  const { combatants, inCombat, round, activeTurnIndex, formula = 'd20', sortDirection = 'desc' } = encounter;

  const activeCombatant = combatants[activeTurnIndex];

  // Monster quantity helper
  const getMonsterQuantity = (id: string) => monsterQuantities[id] || 1;
  const setMonsterQuantity = (id: string, qty: number) => {
    setMonsterQuantities((prev) => ({ ...prev, [id]: Math.max(1, Math.min(20, qty)) }));
  };

  // Add selected present players to combat
  const handleAddPresentPlayers = () => {
    initiativeEngine.addPresentPlayersToEncounter();
    setActiveTab('combat');
  };

  // Add monster to combat
  const handleAddMonster = (monsterId: string) => {
    const qty = getMonsterQuantity(monsterId);
    initiativeEngine.addMonsterToEncounter(monsterId, qty);
    setActiveTab('combat');
  };

  // Create new player handler
  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;

    initiativeEngine.addPlayerToDb({
      name: newPlayerName.trim(),
      classLevel: newPlayerClass.trim() || 'Герой',
      playerOwner: newPlayerOwner.trim() || 'Игрок',
      maxHp: newPlayerHp,
      currentHp: newPlayerHp,
      ac: newPlayerAc,
      initBonus: newPlayerInitBonus,
      avatar: newPlayerAvatar || '🛡️',
      isPresent: true,
    });

    setIsCreatingPlayer(false);
    setNewPlayerName('');
    setNewPlayerClass('');
    setNewPlayerOwner('');
  };

  // Create new monster handler
  const handleSaveMonster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonsterName.trim()) return;

    initiativeEngine.addMonsterToDb({
      name: newMonsterName.trim(),
      type: newMonsterType.trim() || 'Противник',
      cr: newMonsterCr.trim() || 'Ранг 1',
      maxHp: newMonsterHp,
      ac: newMonsterAc,
      initBonus: newMonsterInitBonus,
      avatar: newMonsterAvatar || '👹',
    });

    setIsCreatingMonster(false);
    setNewMonsterName('');
  };

  // Filtered DB items
  const filteredPlayers = playerDatabase.filter(
    (p) =>
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.classLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.playerOwner && p.playerOwner.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredMonsters = monsterDatabase.filter(
    (m) =>
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.cr.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentFormulaObj = INITIATIVE_FORMULAS.find((f) => f.id === formula) || INITIATIVE_FORMULAS[0];

  return (
    <FloatingWindow
      id="initiative-controller-panel"
      title="Трекер Инициативы и Очереди Ходов"
      isOpen={isOpen}
      onClose={onClose}
      icon={Swords}
      defaultPosition={{ x: 120, y: 70 }}
      defaultSize={{ width: 900, height: 620 }}
      minWidth={540}
      minHeight={420}
      zIndex={zIndex}
      onFocus={onFocus}
      headerRightActions={
        <div className="flex items-center space-x-1.5 mr-1">
          {inCombat && (
            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-lg text-[10px] font-bold animate-pulse">
              Раунд {round}
            </span>
          )}
          <button
            onClick={() => initiativeEngine.toggleShowToPlayers()}
            className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all border ${
              encounter.showToPlayers !== false
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
            }`}
            title={
              encounter.showToPlayers !== false
                ? 'Инициатива ПОКАЗЫВАЕТСЯ игрокам на экране'
                : 'Инициатива СКРЫТА у игроков'
            }
          >
            {encounter.showToPlayers !== false ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Экран игроков: ВКЛ</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Экран игроков: ВЫКЛ</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden text-zinc-100">
        {/* Navigation Bar */}
        <div className="p-3 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80">
            <button
              onClick={() => setActiveTab('combat')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'combat'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Очередь Боя ({combatants.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('add-from-db')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'add-from-db'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Выбор из Базы</span>
            </button>

            <button
              onClick={() => setActiveTab('manage-db')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeTab === 'manage-db'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Базы Данных</span>
            </button>
          </div>

          {/* Quick Encounter Action Controls when in Combat tab */}
          {activeTab === 'combat' && (
            <div className="flex items-center space-x-2">
              {/* Formula & Rules config button */}
              <button
                onClick={() => setShowRulesConfig(!showRulesConfig)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 border ${
                  showRulesConfig
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title="Настроить формулу броска инициативы и порядок сортировки"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentFormulaObj.label.split(' ')[0]}</span>
              </button>

              <button
                onClick={() => initiativeEngine.rollInitiativeAll()}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 hover:scale-105 active:scale-95"
                title={`Автоматически бросить ${currentFormulaObj.label} всем участникам`}
              >
                <Dice5 className="w-3.5 h-3.5" />
                <span>Бросить Всем</span>
              </button>

              {!inCombat ? (
                <button
                  onClick={() => initiativeEngine.startCombat()}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 hover:scale-105 active:scale-95 shadow-md shadow-emerald-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Начать Бой</span>
                </button>
              ) : (
                <button
                  onClick={() => initiativeEngine.endCombat()}
                  className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Завершить Бой</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Rules Configuration Banner */}
        {showRulesConfig && activeTab === 'combat' && (
          <div className="p-3 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-zinc-400 font-semibold flex items-center space-x-1">
                <Dice5 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Формула Инициативы:</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {INITIATIVE_FORMULAS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => initiativeEngine.setFormula(f.id)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      formula === f.id
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                    }`}
                    title={f.description}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-zinc-400 font-semibold flex items-center space-x-1">
                <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Порядок:</span>
              </span>
              <button
                onClick={() => initiativeEngine.setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
                className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 text-amber-300 rounded-lg text-[11px] font-bold transition-all"
              >
                {sortDirection === 'desc' ? 'По убыванию ↓ (Выше = Первее)' : 'По возрастанию ↑ (Ниже = Первее)'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: COMBAT INITIATIVE LIST */}
        {activeTab === 'combat' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-zinc-900/30">
            {/* Turn & Round Status Control Header Bar */}
            {combatants.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/90 p-4 border border-zinc-800 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-300 font-mono font-bold text-sm">
                    Раунд {round}
                  </div>
                  <div>
                    <span className="text-xs text-zinc-400 block">Сейчас ходит:</span>
                    <span className="font-bold text-sm text-zinc-100 flex items-center space-x-1.5">
                      <span>{activeCombatant?.avatar}</span>
                      <span className={activeCombatant?.category === 'player' ? 'text-amber-300' : 'text-rose-400'}>
                        {activeCombatant?.name || 'Никого'}
                      </span>
                      {activeCombatant && (
                        <span className="text-xs font-mono text-zinc-400">
                          (Инициатива: {activeCombatant.initiative})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => initiativeEngine.prevTurn()}
                    className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 rounded-xl transition-all text-xs font-bold flex items-center space-x-1"
                    title="Предыдущий ход"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Пред. ход</span>
                  </button>

                  <button
                    onClick={() => initiativeEngine.nextTurn()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition-all text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95"
                  >
                    <span>Следующий ход (Пробел)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Combatants List Grid */}
            {combatants.length === 0 ? (
              <div className="text-center py-12 bg-zinc-950/60 border border-dashed border-zinc-800 rounded-3xl p-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl">
                  ⚔️
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-200">Список участников пуст</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Выберите персонажей игроков или добавьте противников / NPC из базы, чтобы сформировать очередь ходов.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('add-from-db')}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-2xl text-xs transition-all shadow-lg shadow-amber-500/20"
                >
                  ➕ Добавить Участников из Базы
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {combatants.map((c, idx) => {
                  const isActive = idx === activeTurnIndex && inCombat;
                  const isPlayer = c.category === 'player';

                  return (
                    <div
                      key={c.id}
                      className={`relative p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                          : isPlayer
                          ? 'bg-zinc-950/80 border-zinc-800/80 hover:border-amber-500/40'
                          : 'bg-zinc-950/80 border-zinc-800/80 hover:border-rose-500/40'
                      }`}
                    >
                      {/* Left Block: Turn Rank, Category Badge, Avatar, Name */}
                      <div className="flex items-center space-x-3 w-full sm:w-auto">
                        {/* Turn Position Badge */}
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isActive
                              ? 'bg-amber-500 text-zinc-950 shadow-md'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                          }`}
                        >
                          #{idx + 1}
                        </div>

                        {/* Category Badge & Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl shadow-inner">
                            {c.avatar}
                          </div>
                          <span
                            className={`absolute -bottom-1 -right-1 px-1 rounded-md text-[9px] font-bold border ${
                              isPlayer
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {isPlayer ? 'Герой' : 'NPC'}
                          </span>
                        </div>

                        {/* Name & Subtitle */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4
                              className={`font-bold text-sm ${
                                isPlayer ? 'text-zinc-100' : 'text-rose-200'
                              }`}
                            >
                              {c.name}
                            </h4>
                            {isActive && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-zinc-950 font-bold rounded text-[10px] animate-pulse">
                                ХОД
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">{c.notes}</p>
                        </div>
                      </div>

                      {/* Middle Block: Initiative Score & HP Adjuster */}
                      <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-start">
                        {/* Initiative Controls */}
                        <div className="flex items-center space-x-1.5 bg-zinc-900/90 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                          <button
                            onClick={() => initiativeEngine.rollInitiativeOne(c.id)}
                            className="text-amber-400 hover:text-amber-300 p-1 hover:bg-zinc-800 rounded transition-colors"
                            title={`Бросить ${currentFormulaObj.label} для ${c.name}`}
                          >
                            <Dice5 className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] text-zinc-400 font-semibold">Иниц:</span>
                          <input
                            type="number"
                            value={c.initiative}
                            onChange={(e) =>
                              initiativeEngine.setInitiative(c.id, parseInt(e.target.value) || 0)
                            }
                            className="w-12 bg-zinc-950 border border-zinc-700/80 rounded-lg px-1.5 py-0.5 text-center font-mono font-bold text-amber-300 text-xs focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* HP & AC Block */}
                        <div className="flex items-center space-x-2 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800">
                          <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <div className="flex items-center space-x-1 text-xs font-mono">
                            <span className="font-bold text-zinc-100">{c.currentHp}</span>
                            <span className="text-zinc-500">/</span>
                            <span className="text-zinc-400">{c.maxHp}</span>
                          </div>

                          <div className="flex items-center space-x-0.5 pl-1 border-l border-zinc-800">
                            <button
                              onClick={() => initiativeEngine.updateHp(c.id, -5)}
                              className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-[10px] font-mono font-bold transition-colors"
                              title="-5 HP"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => initiativeEngine.updateHp(c.id, -1)}
                              className="px-1.5 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded text-[10px] font-mono font-bold transition-colors"
                              title="-1 HP"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => initiativeEngine.updateHp(c.id, 1)}
                              className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono font-bold transition-colors"
                              title="+1 HP"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => initiativeEngine.updateHp(c.id, 5)}
                              className="px-1.5 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-mono font-bold transition-colors"
                              title="+5 HP"
                            >
                              +5
                            </button>
                          </div>

                          <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800 text-[11px] font-mono text-zinc-400">
                            <Shield className="w-3 h-3 text-cyan-400" />
                            <span>{c.ac}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Condition Tagging, Visibility, Actions */}
                      <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end">
                        {/* Toggle Player Visibility */}
                        <button
                          onClick={() =>
                            initiativeEngine.updateCombatant(c.id, { isHidden: !c.isHidden })
                          }
                          className={`p-2 rounded-xl border transition-all ${
                            c.isHidden
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                          }`}
                          title={c.isHidden ? 'Скрыт от игроков (показать)' : 'Виден игрокам (скрыть)'}
                        >
                          {c.isHidden ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>

                        {/* Conditions Button & Flyout */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveConditionsCombatantId(
                                activeConditionsCombatantId === c.id ? null : c.id
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-1 transition-all ${
                              c.conditions.length > 0
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                            }`}
                            title="Управление состояниями и эффектами"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{c.conditions.length > 0 ? `${c.conditions.length}` : '+Сост.'}</span>
                          </button>

                          {/* Conditions Popup Drawer */}
                          {activeConditionsCombatantId === c.id && (
                            <div className="absolute right-0 top-10 z-30 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl space-y-2 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                                <span className="text-[10px] font-bold text-zinc-300">
                                  Состояния: {c.name}
                                </span>
                                <button
                                  onClick={() => setActiveConditionsCombatantId(null)}
                                  className="text-zinc-500 hover:text-zinc-300"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Custom Condition Add Input */}
                              <div className="flex items-center space-x-1">
                                <input
                                  type="text"
                                  placeholder="Свое состояние..."
                                  value={customConditionInput}
                                  onChange={(e) => setCustomConditionInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customConditionInput.trim()) {
                                      initiativeEngine.toggleCondition(c.id, customConditionInput.trim());
                                      setCustomConditionInput('');
                                    }
                                  }}
                                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-100 focus:outline-none focus:border-amber-500"
                                />
                                <button
                                  onClick={() => {
                                    if (customConditionInput.trim()) {
                                      initiativeEngine.toggleCondition(c.id, customConditionInput.trim());
                                      setCustomConditionInput('');
                                    }
                                  }}
                                  className="p-1 bg-amber-500 text-zinc-950 rounded-lg font-bold text-[10px]"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="max-h-44 overflow-y-auto space-y-0.5 pr-1">
                                {POPULAR_CONDITIONS.map((cond) => {
                                  const isSelected = c.conditions.includes(cond);
                                  return (
                                    <button
                                      key={cond}
                                      onClick={() => initiativeEngine.toggleCondition(c.id, cond)}
                                      className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center justify-between ${
                                        isSelected
                                          ? 'bg-amber-500/20 text-amber-300 font-bold'
                                          : 'hover:bg-zinc-900 text-zinc-400'
                                      }`}
                                    >
                                      <span>{cond}</span>
                                      {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Remove Combatant */}
                        <button
                          onClick={() => initiativeEngine.removeCombatant(c.id)}
                          className="p-2 text-zinc-600 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors"
                          title="Удалить из боя"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Display Conditions Chips if any */}
                      {c.conditions.length > 0 && (
                        <div className="w-full flex flex-wrap gap-1 pt-1 border-t border-zinc-900">
                          {c.conditions.map((cond) => (
                            <span
                              key={cond}
                              className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[10px] font-semibold flex items-center space-x-1"
                            >
                              <span>{cond}</span>
                              <X
                                className="w-2.5 h-2.5 cursor-pointer hover:text-rose-400"
                                onClick={() => initiativeEngine.toggleCondition(c.id, cond)}
                              />
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SELECT FROM DATABASE (PLAYERS & MONSTERS) */}
        {activeTab === 'add-from-db' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-900/30">
            {toastMessage && (
              <div className="bg-amber-500 text-zinc-950 font-bold px-4 py-1.5 text-center text-xs flex items-center justify-center space-x-2 animate-bounce rounded-xl">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{toastMessage}</span>
              </div>
            )}
            {/* Category Selector (Players vs Monsters) */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDbCategory('player')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                    dbCategory === 'player'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Персонажи Героев ({playerDatabase.length})</span>
                </button>

                <button
                  onClick={() => setDbCategory('monster')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                    dbCategory === 'monster'
                      ? 'bg-rose-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Skull className="w-4 h-4" />
                  <span>Противники и NPC ({monsterDatabase.length})</span>
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Поиск по названию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* PLAYER DATABASE SELECTION */}
            {dbCategory === 'player' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-400">
                    Отметьте присутствующих персонажей и добавьте их в текущее сражение.
                  </div>
                  <button
                    onClick={handleAddPresentPlayers}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить Выбранных Персонажей в Бой</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPlayers.map((player) => (
                    <div
                      key={player.id}
                      onClick={() =>
                        initiativeEngine.updatePlayerInDb(player.id, {
                          isPresent: player.isPresent === false ? true : false,
                        })
                      }
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        player.isPresent !== false
                          ? 'bg-amber-500/10 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            player.isPresent !== false
                              ? 'bg-amber-500 border-amber-400 text-zinc-950'
                              : 'bg-zinc-900 border-zinc-700 text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>

                        <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
                          {player.avatar}
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{player.name}</h4>
                          <p className="text-xs text-zinc-400">
                            {player.classLevel} {player.playerOwner ? `• ${player.playerOwner}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right text-xs font-mono space-y-0.5">
                        <div className="text-amber-300 font-bold">HP: {player.maxHp}</div>
                        <div className="text-zinc-400">
                          Защита: {player.ac} | Иниц: {player.initBonus >= 0 ? `+${player.initBonus}` : player.initBonus}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MONSTER DATABASE SELECTION */}
            {dbCategory === 'monster' && (
              <div className="space-y-4">
                {/* Source Selection Sub-tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-950/80 p-1.5 rounded-2xl border border-zinc-800">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setMonsterSourceTab('dnd5eapi')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        monsterSourceTab === 'dnd5eapi'
                          ? 'bg-amber-500 text-zinc-950 shadow-md'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Бестиарий D&D 5e API (330+ монстров)</span>
                    </button>
                    <button
                      onClick={() => setMonsterSourceTab('local')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        monsterSourceTab === 'local'
                          ? 'bg-amber-500 text-zinc-950 shadow-md'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      <Skull className="w-3.5 h-3.5" />
                      <span>Моя локальная база ({monsterDatabase.length})</span>
                    </button>
                  </div>

                  {monsterSourceTab === 'dnd5eapi' && (
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">CR:</span>
                      <select
                        value={dnd5eCrFilter}
                        onChange={(e) => setDnd5eCrFilter(e.target.value)}
                        className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-2 py-1 focus:outline-none cursor-pointer"
                      >
                        <option value="all">Все CR</option>
                        <option value="CR 0">CR 0</option>
                        <option value="CR 0.125">CR 1/8</option>
                        <option value="CR 0.25">CR 1/4</option>
                        <option value="CR 0.5">CR 1/2</option>
                        <option value="CR 1">CR 1</option>
                        <option value="CR 2">CR 2</option>
                        <option value="CR 3">CR 3</option>
                        <option value="CR 4">CR 4</option>
                        <option value="CR 5">CR 5</option>
                        <option value="CR 6">CR 6</option>
                        <option value="CR 7">CR 7</option>
                        <option value="CR 8">CR 8</option>
                        <option value="CR 9">CR 9</option>
                        <option value="CR 10">CR 10+</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* D&D 5E API TAB CONTENT */}
                {monsterSourceTab === 'dnd5eapi' && (
                  <div className="space-y-3">
                    {isSearchingDnd5e ? (
                      <div className="p-8 text-center text-zinc-400 space-y-2">
                        <Sparkles className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
                        <p className="text-xs">Загрузка монстров из dnd5eapi.co...</p>
                      </div>
                    ) : dnd5eMonsters.length === 0 ? (
                      <div className="p-8 text-center bg-zinc-950/40 rounded-2xl border border-zinc-800/80 text-zinc-400 space-y-1">
                        <Skull className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                        <p className="font-semibold text-xs text-zinc-300">Монстры не найдены</p>
                        <p className="text-[11px] text-zinc-500">
                          Попробуйте изменить поисковый запрос (например: goblin, dragon, beholder, skeleton)
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dnd5eMonsters.map((monster) => {
                          const qty = getMonsterQuantity(monster.id);

                          return (
                            <div
                              key={monster.id}
                              className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-amber-500/40 transition-all shadow-sm"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3 min-w-0">
                                  <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                                    {monster.avatar && monster.avatar.startsWith('http') ? (
                                      <img
                                        src={monster.avatar}
                                        alt={monster.name}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          (e.target as HTMLElement).style.display = 'none';
                                        }}
                                      />
                                    ) : (
                                      <span>{monster.avatar || '👾'}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="font-bold text-sm text-zinc-100 truncate">{monster.name}</h4>
                                    <p className="text-xs text-zinc-400 truncate">
                                      {monster.type} • <span className="text-amber-400 font-semibold">{monster.cr}</span>
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right text-xs font-mono space-y-0.5 shrink-0">
                                  <div className="text-rose-400 font-bold">HP: {monster.maxHp}</div>
                                  <div className="text-zinc-400">КБ: {monster.ac} | Иниц: {monster.initBonus >= 0 ? `+${monster.initBonus}` : monster.initBonus}</div>
                                </div>
                              </div>

                              {monster.notes && (
                                <p className="text-[11px] text-zinc-500 line-clamp-1 italic">{monster.notes}</p>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-zinc-900 gap-2">
                                {/* Quantity Selector */}
                                <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
                                  <button
                                    onClick={() => setMonsterQuantity(monster.id, qty - 1)}
                                    className="w-5 h-5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <span className="w-5 text-center font-mono text-xs font-bold text-zinc-100">
                                    {qty}
                                  </span>
                                  <button
                                    onClick={() => setMonsterQuantity(monster.id, qty + 1)}
                                    className="w-5 h-5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>

                                <div className="flex items-center space-x-1.5">
                                  <button
                                    onClick={() => {
                                      initiativeEngine.addMonsterToDb(monster);
                                      showToast(`Сохранено в базу: ${monster.name}`);
                                    }}
                                    className="px-2 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[11px] font-medium transition-all cursor-pointer"
                                    title="Сохранить монстра в локальную базу"
                                  >
                                    + В базу
                                  </button>

                                  <button
                                    onClick={() => {
                                      initiativeEngine.addMonsterTemplateToEncounter(monster, qty);
                                      setActiveTab('combat');
                                    }}
                                    className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-md shadow-rose-500/20 cursor-pointer"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>В бой {qty > 1 ? `(${qty})` : ''}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* LOCAL MONSTER DATABASE TAB CONTENT */}
                {monsterSourceTab === 'local' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMonsters.map((monster) => {
                      const qty = getMonsterQuantity(monster.id);

                      return (
                        <div
                          key={monster.id}
                          className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex flex-col justify-between space-y-3 hover:border-rose-500/40 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl">
                                {monster.avatar}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm text-zinc-100">{monster.name}</h4>
                                <p className="text-xs text-zinc-400">
                                  {monster.type} • <span className="text-rose-400 font-semibold">{monster.cr}</span>
                                </p>
                              </div>
                            </div>

                            <div className="text-right text-xs font-mono space-y-0.5">
                              <div className="text-rose-400 font-bold">HP: {monster.maxHp}</div>
                              <div className="text-zinc-400">Защита: {monster.ac}</div>
                            </div>
                          </div>

                          {monster.notes && (
                            <p className="text-[11px] text-zinc-500 line-clamp-1 italic">{monster.notes}</p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                            {/* Quantity Selector */}
                            <div className="flex items-center space-x-1.5">
                              <span className="text-xs text-zinc-400">Кол-во:</span>
                              <div className="flex items-center space-x-1 bg-zinc-900 border border-zinc-800 rounded-xl p-0.5">
                                <button
                                  onClick={() => setMonsterQuantity(monster.id, qty - 1)}
                                  className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center font-mono text-xs font-bold text-zinc-100">
                                  {qty}
                                </span>
                                <button
                                  onClick={() => setMonsterQuantity(monster.id, qty + 1)}
                                  className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center text-xs font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Add button */}
                            <button
                              onClick={() => handleAddMonster(monster.id)}
                              className="px-3.5 py-1.5 bg-rose-500 hover:bg-rose-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-md shadow-rose-500/20"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Добавить {qty > 1 ? `(${qty})` : ''}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAGE DATABASES (CREATE/EDIT/DELETE) */}
        {activeTab === 'manage-db' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-900/30">
            {/* Category Selector */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDbCategory('player')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                    dbCategory === 'player'
                      ? 'bg-amber-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>База Героев ({playerDatabase.length})</span>
                </button>

                <button
                  onClick={() => setDbCategory('monster')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                    dbCategory === 'monster'
                      ? 'bg-rose-500 text-zinc-950 shadow-md'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  <Skull className="w-4 h-4" />
                  <span>База Противников ({monsterDatabase.length})</span>
                </button>
              </div>

              {dbCategory === 'player' ? (
                <button
                  onClick={() => setIsCreatingPlayer(!isCreatingPlayer)}
                  className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать Персонажа</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsCreatingMonster(!isCreatingMonster)}
                  className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать NPC / Противника</span>
                </button>
              )}
            </div>

            {/* CREATE PLAYER FORM */}
            {isCreatingPlayer && dbCategory === 'player' && (
              <form
                onSubmit={handleSavePlayer}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in duration-150 text-xs"
              >
                <h4 className="font-bold text-amber-300 text-xs">Новый Персонаж</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Имя Персонажа</label>
                    <input
                      type="text"
                      placeholder="Арагорн / Джон Доу"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Класс / Роль / Концепт</label>
                    <input
                      type="text"
                      placeholder="Следопыт / Снайпер / Пилот"
                      value={newPlayerClass}
                      onChange={(e) => setNewPlayerClass(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Имя Игрока (Владелец)</label>
                    <input
                      type="text"
                      placeholder="Алексей"
                      value={newPlayerOwner}
                      onChange={(e) => setNewPlayerOwner(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Макс. HP</label>
                    <input
                      type="number"
                      value={newPlayerHp}
                      onChange={(e) => setNewPlayerHp(parseInt(e.target.value) || 1)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Защита / AC</label>
                    <input
                      type="number"
                      value={newPlayerAc}
                      onChange={(e) => setNewPlayerAc(parseInt(e.target.value) || 10)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Бонус Иниц.</label>
                    <input
                      type="number"
                      value={newPlayerInitBonus}
                      onChange={(e) => setNewPlayerInitBonus(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Иконка / Эмодзи</label>
                    <input
                      type="text"
                      value={newPlayerAvatar}
                      onChange={(e) => setNewPlayerAvatar(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500 text-center"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPlayer(false)}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 rounded-xl"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl"
                  >
                    Сохранить в базу
                  </button>
                </div>
              </form>
            )}

            {/* CREATE MONSTER FORM */}
            {isCreatingMonster && dbCategory === 'monster' && (
              <form
                onSubmit={handleSaveMonster}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in duration-150 text-xs"
              >
                <h4 className="font-bold text-rose-300 text-xs">Новый NPC / Противник в Базу</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Название</label>
                    <input
                      type="text"
                      placeholder="Охранник / Дрон / Элементаль"
                      value={newMonsterName}
                      onChange={(e) => setNewMonsterName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Категория / Тип</label>
                    <input
                      type="text"
                      placeholder="Пехота / Механизм / Мутант"
                      value={newMonsterType}
                      onChange={(e) => setNewMonsterType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Ранг / Уровень / CR</label>
                    <input
                      type="text"
                      placeholder="Ранг 2 / Уровень 3"
                      value={newMonsterCr}
                      onChange={(e) => setNewMonsterCr(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Здоровье (HP)</label>
                    <input
                      type="number"
                      value={newMonsterHp}
                      onChange={(e) => setNewMonsterHp(parseInt(e.target.value) || 1)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Защита / AC</label>
                    <input
                      type="number"
                      value={newMonsterAc}
                      onChange={(e) => setNewMonsterAc(parseInt(e.target.value) || 10)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Бонус Иниц.</label>
                    <input
                      type="number"
                      value={newMonsterInitBonus}
                      onChange={(e) => setNewMonsterInitBonus(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Иконка / Эмодзи</label>
                    <input
                      type="text"
                      value={newMonsterAvatar}
                      onChange={(e) => setNewMonsterAvatar(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500 text-center"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCreatingMonster(false)}
                    className="px-3 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 rounded-xl"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold rounded-xl"
                  >
                    Сохранить в базу
                  </button>
                </div>
              </form>
            )}

            {/* LIST OF DB ITEMS */}
            <div className="space-y-2">
              {dbCategory === 'player'
                ? playerDatabase.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{p.avatar}</div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{p.name}</h4>
                          <p className="text-xs text-zinc-400">
                            {p.classLevel} {p.playerOwner ? `• Игрок: ${p.playerOwner}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-amber-300 font-bold">
                          HP: {p.maxHp} | Защита: {p.ac} | Иниц: {p.initBonus >= 0 ? `+${p.initBonus}` : p.initBonus}
                        </span>
                        <button
                          onClick={() => initiativeEngine.removePlayerFromDb(p.id)}
                          className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors"
                          title="Удалить из базы"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                : monsterDatabase.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">{m.avatar}</div>
                        <div>
                          <h4 className="font-bold text-sm text-zinc-100">{m.name}</h4>
                          <p className="text-xs text-zinc-400">
                            {m.type} • {m.cr}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono text-rose-300 font-bold">
                          HP: {m.maxHp} | Защита: {m.ac} | Иниц: {m.initBonus >= 0 ? `+${m.initBonus}` : m.initBonus}
                        </span>
                        <button
                          onClick={() => initiativeEngine.removeMonsterFromDb(m.id)}
                          className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors"
                          title="Удалить из базы"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        )}
      </div>
    </FloatingWindow>
  );
};
