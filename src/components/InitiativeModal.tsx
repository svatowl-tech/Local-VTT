import React, { useState, useEffect } from 'react';
import { initiativeEngine, POPULAR_CONDITIONS } from '../services/initiativeEngine';
import {
  PlayerCharacter,
  MonsterTemplate,
  InitiativeCombatant,
  CombatantCategory,
} from '../types';
import { FloatingWindow } from './FloatingWindow';
import {
  Swords,
  Shield,
  Skull,
  UserCheck,
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
  Edit2,
  Check,
  CheckSquare,
  Square,
  Sliders,
  Settings,
  Users,
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
  zIndex = 40,
  onFocus,
}) => {
  const [state, setState] = useState(() => initiativeEngine.getState());
  const [activeTab, setActiveTab] = useState<'combat' | 'add-from-db' | 'manage-db'>('combat');

  // Sub-tab for DB selection/management
  const [dbCategory, setDbCategory] = useState<CombatantCategory>('player');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Monster quantity selection map: monsterId -> quantity
  const [monsterQuantities, setMonsterQuantities] = useState<Record<string, number>>({});

  // Conditions popup active for combatant
  const [activeConditionsCombatantId, setActiveConditionsCombatantId] = useState<string | null>(null);

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
  const [newMonsterType, setNewMonsterType] = useState<string>('Гуманоид');
  const [newMonsterCr, setNewMonsterCr] = useState<string>('CR 1');
  const [newMonsterHp, setNewMonsterHp] = useState<number>(15);
  const [newMonsterAc, setNewMonsterAc] = useState<number>(13);
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
  const { combatants, inCombat, round, activeTurnIndex } = encounter;

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
      classLevel: newPlayerClass.trim() || 'Персонаж 1',
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
      type: newMonsterType.trim() || 'Гуманоид',
      cr: newMonsterCr.trim() || 'CR 1',
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

  return (
    <FloatingWindow
      id="initiative-controller-panel"
      title="Контроллер Инициативы"
      isOpen={isOpen}
      onClose={onClose}
      icon={Swords}
      defaultPosition={{ x: 120, y: 70 }}
      defaultSize={{ width: 880, height: 600 }}
      minWidth={520}
      minHeight={400}
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
                <span>Игроки: ВКЛ</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                <span>Игроки: ВЫКЛ</span>
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
              <button
                onClick={() => initiativeEngine.rollInitiativeAll()}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 hover:scale-105 active:scale-95"
                title="Автоматически бросить d20 + бонус инициативы всем участникам"
              >
                <Dice5 className="w-3.5 h-3.5" />
                <span>Бросить Всем d20</span>
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
                    <span>Следующий ход</span>
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
                  <h3 className="text-base font-bold text-zinc-200">Список инициативы пуст</h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    Выберите игроков из базы или добавьте монстров из бестиария, чтобы начать сражение.
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
                            {isPlayer ? 'Игрок' : 'Монстр'}
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
                                ХОДИЛ
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400">{c.notes}</p>
                        </div>
                      </div>

                      {/* Middle Block: Initiative Score & HP Adjuster */}
                      <div className="flex items-center justify-between sm:justify-end space-x-3 w-full sm:w-auto">
                        {/* Initiative Input/Roll */}
                        <div className="flex items-center space-x-1.5 bg-zinc-900/90 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                          <span className="text-[10px] font-medium text-zinc-400">Иниц:</span>
                          <input
                            type="number"
                            value={c.initiative}
                            onChange={(e) =>
                              initiativeEngine.setInitiative(c.id, parseInt(e.target.value) || 0)
                            }
                            className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg text-center font-mono font-bold text-xs text-amber-300 py-0.5 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={() => initiativeEngine.rollInitiativeOne(c.id)}
                            className="p-1 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors"
                            title="Перебросить d20"
                          >
                            <Dice5 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Armor Class (AC) */}
                        <div
                          className="flex items-center space-x-1 bg-zinc-900/90 px-2.5 py-1.5 rounded-xl border border-zinc-800 text-zinc-300 text-xs"
                          title="Класс Доспеха (AC)"
                        >
                          <Shield className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-mono font-bold">{c.ac}</span>
                        </div>

                        {/* HP Counter */}
                        <div className="flex items-center space-x-1.5 bg-zinc-900/90 px-2.5 py-1.5 rounded-xl border border-zinc-800">
                          <Heart
                            className={`w-3.5 h-3.5 shrink-0 ${
                              c.currentHp === 0 ? 'text-zinc-600' : 'text-rose-500 fill-current'
                            }`}
                          />
                          <button
                            onClick={() => initiativeEngine.updateHp(c.id, -5)}
                            className="px-1.5 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded text-[10px] font-mono font-bold border border-zinc-800"
                          >
                            -5
                          </button>
                          <button
                            onClick={() => initiativeEngine.updateHp(c.id, -1)}
                            className="px-1.5 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded text-[10px] font-mono font-bold border border-zinc-800"
                          >
                            -1
                          </button>

                          <span className="font-mono font-bold text-xs px-1 text-zinc-100">
                            {c.currentHp}/{c.maxHp}
                          </span>

                          <button
                            onClick={() => initiativeEngine.updateHp(c.id, 1)}
                            className="px-1.5 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded text-[10px] font-mono font-bold border border-zinc-800"
                          >
                            +1
                          </button>
                          <button
                            onClick={() => initiativeEngine.updateHp(c.id, 5)}
                            className="px-1.5 py-0.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded text-[10px] font-mono font-bold border border-zinc-800"
                          >
                            +5
                          </button>
                        </div>

                        {/* Conditions Toggle Button */}
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActiveConditionsCombatantId(
                                activeConditionsCombatantId === c.id ? null : c.id
                              )
                            }
                            className={`p-2 rounded-xl border transition-all text-xs flex items-center space-x-1 ${
                              c.conditions.length > 0
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                            }`}
                            title="Состояния / Эффекты"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {c.conditions.length > 0 && (
                              <span className="font-mono font-bold text-[10px]">
                                {c.conditions.length}
                              </span>
                            )}
                          </button>

                          {/* Conditions Popup Drawer */}
                          {activeConditionsCombatantId === c.id && (
                            <div className="absolute right-0 top-10 z-30 w-48 bg-zinc-950 border border-zinc-800 rounded-2xl p-2.5 shadow-2xl space-y-1 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                                <span className="text-[10px] font-bold text-zinc-400">
                                  Состояния {c.name}
                                </span>
                                <button
                                  onClick={() => setActiveConditionsCombatantId(null)}
                                  className="text-zinc-500 hover:text-zinc-300"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-0.5">
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
                  <span>База Игроков ({playerDatabase.length})</span>
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
                  <span>База Монстров ({monsterDatabase.length})</span>
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
                    Отметьте галочками персонажей, присутствующих на текущей игре, и добавьте их в бой.
                  </div>
                  <button
                    onClick={handleAddPresentPlayers}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-amber-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить Выбранных Игроков в Бой</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredPlayers.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => initiativeEngine.togglePlayerPresence(player.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        player.isPresent
                          ? 'bg-amber-500/10 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                            player.isPresent
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
                          AC: {player.ac} | Иниц: {player.initBonus >= 0 ? `+${player.initBonus}` : player.initBonus}
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
                <div className="text-xs text-zinc-400">
                  Укажите количество монстров каждого типа и нажмите "В бой" для мгновенного добавления в инициативу.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMonsters.map((monster) => {
                    const qty = getMonsterQuantity(monster.id);

                    return (
                      <div
                        key={monster.id}
                        className="p-4 bg-zinc-950/80 border border-zinc-800/80 hover:border-rose-500/40 rounded-2xl transition-all flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl">
                            {monster.avatar}
                          </div>

                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-bold text-sm text-zinc-100">{monster.name}</h4>
                              <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded font-mono text-[10px] font-bold">
                                {monster.cr}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400">
                              {monster.type} • HP: {monster.maxHp} • AC: {monster.ac}
                            </p>
                          </div>
                        </div>

                        {/* Quantity & Add Button */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center space-x-1 bg-zinc-900 px-2 py-1 rounded-xl border border-zinc-800">
                            <button
                              onClick={() => setMonsterQuantity(monster.id, qty - 1)}
                              className="w-5 h-5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded font-mono font-bold text-xs flex items-center justify-center"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-mono font-bold text-xs text-zinc-100">
                              {qty}
                            </span>
                            <button
                              onClick={() => setMonsterQuantity(monster.id, qty + 1)}
                              className="w-5 h-5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded font-mono font-bold text-xs flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => handleAddMonster(monster.id)}
                            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-zinc-950 font-bold rounded-xl text-xs transition-all flex items-center space-x-1 shadow-md shadow-rose-500/20"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>В бой</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MANAGE DATABASES & CREATE CUSTOMS */}
        {activeTab === 'manage-db' && (
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6 bg-zinc-900/30">
            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setDbCategory('player')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dbCategory === 'player'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  Управление Игроками
                </button>
                <button
                  onClick={() => setDbCategory('monster')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dbCategory === 'monster'
                      ? 'bg-rose-500 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  Управление Монстрами
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
                  <span>Создать Монстра</span>
                </button>
              )}
            </div>

            {/* CREATE PLAYER FORM */}
            {isCreatingPlayer && dbCategory === 'player' && (
              <form
                onSubmit={handleSavePlayer}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in duration-150 text-xs"
              >
                <h4 className="font-bold text-amber-300 text-xs">Новый Персонаж Игрока</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Имя Персонажа</label>
                    <input
                      type="text"
                      placeholder="Арагорн"
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Класс / Уровень</label>
                    <input
                      type="text"
                      placeholder="Следопыт 5"
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
                    <label className="block text-zinc-400 text-[10px] mb-1">AC (Доспех)</label>
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
                <h4 className="font-bold text-rose-300 text-xs">Новый Монстр в Бестиарий</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Название Монстра</label>
                    <input
                      type="text"
                      placeholder="Темный Элементаль"
                      value={newMonsterName}
                      onChange={(e) => setNewMonsterName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Тип Существа</label>
                    <input
                      type="text"
                      placeholder="Элементаль"
                      value={newMonsterType}
                      onChange={(e) => setNewMonsterType(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] mb-1">Опасность (CR)</label>
                    <input
                      type="text"
                      placeholder="CR 5"
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
                    <label className="block text-zinc-400 text-[10px] mb-1">AC (Доспех)</label>
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
                    Сохранить в бестиарий
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
                          HP: {p.maxHp} | AC: {p.ac}
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
                          HP: {m.maxHp} | AC: {m.ac}
                        </span>
                        <button
                          onClick={() => initiativeEngine.removeMonsterFromDb(m.id)}
                          className="p-1.5 text-zinc-600 hover:text-rose-400 hover:bg-zinc-900 rounded-xl transition-colors"
                          title="Удалить из бестиария"
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
