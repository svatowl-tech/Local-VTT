import React, { useState, useEffect, useCallback } from 'react';
import { initiativeEngine } from '../services/initiativeEngine';
import { InitiativeCombatant } from '../types';
import {
  Swords,
  ChevronRight,
  ChevronLeft,
  Play,
  RotateCcw,
  Dice5,
  Heart,
  Shield,
  Plus,
  Maximize2,
  Minimize2,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

interface Props {
  onOpenFullModal: () => void;
}

export const InitiativeDashboardWidget: React.FC<Props> = ({
  onOpenFullModal,
}) => {
  const [state, setState] = useState(() => initiativeEngine.getState());
  const [spacePressedAnimation, setSpacePressedAnimation] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initiativeEngine.subscribe(() => {
      setState(initiativeEngine.getState());
    });
    return unsubscribe;
  }, []);

  const { encounter } = state;
  const { combatants, inCombat, round, activeTurnIndex } = encounter;

  const activeCombatant: InitiativeCombatant | undefined = combatants[activeTurnIndex];

  // Advance turn handler with visual pulse effect
  const handleNextTurn = useCallback(() => {
    if (combatants.length === 0) return;
    initiativeEngine.nextTurn();
    setSpacePressedAnimation(true);
    setTimeout(() => setSpacePressedAnimation(false), 300);
  }, [combatants.length]);

  const handlePrevTurn = useCallback(() => {
    if (combatants.length === 0) return;
    initiativeEngine.prevTurn();
  }, [combatants.length]);

  // Global Spacebar Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        // Prevent triggering when GM is typing inside an input/textarea/select
        const activeElement = document.activeElement;
        const tagName = activeElement ? activeElement.tagName.toUpperCase() : '';
        const isEditable =
          activeElement &&
          (activeElement.getAttribute('contenteditable') === 'true' ||
            tagName === 'INPUT' ||
            tagName === 'TEXTAREA' ||
            tagName === 'SELECT');

        if (isEditable) return;

        // If combatants exist, advance initiative turn
        if (combatants.length > 0) {
          e.preventDefault();
          handleNextTurn();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [combatants.length, handleNextTurn]);

  return (
    <div className="w-full flex flex-col space-y-3 select-none">
      {/* Widget Quick Controls Bar */}
      <div className="flex items-center justify-between gap-2 bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Swords className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-xs text-zinc-100">Инициатива</span>
              {inCombat ? (
                <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold animate-pulse">
                  Раунд {round}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-400 rounded text-[10px] font-mono">
                  {combatants.length} участ.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-1">
          {/* Toggle Initiative Display for Players */}
          <button
            onClick={() => initiativeEngine.toggleShowToPlayers()}
            className={`p-1.5 rounded-lg transition-colors text-xs ${
              encounter.showToPlayers !== false
                ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40'
                : 'text-zinc-500 hover:bg-zinc-800'
            }`}
            title={
              encounter.showToPlayers !== false
                ? 'Инициатива ПОКАЗЫВАЕТСЯ игрокам на экране. Нажмите, чтобы скрыть.'
                : 'Инициатива СКРЫТА у игроков. Нажмите, чтобы показать на экране игроков.'
            }
          >
            {encounter.showToPlayers !== false ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>

          {combatants.length > 0 && (
            <button
              onClick={() => initiativeEngine.rollInitiativeAll()}
              className="p-1.5 text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors text-xs"
              title="Бросить d20 всем участникам"
            >
              <Dice5 className="w-3.5 h-3.5" />
            </button>
          )}

          {!inCombat ? (
            <button
              onClick={() => initiativeEngine.startCombat()}
              disabled={combatants.length === 0}
              className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 rounded-lg transition-colors text-xs"
              title="Начать Бой"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => initiativeEngine.endCombat()}
              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors text-xs"
              title="Завершить Бой"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onOpenFullModal}
            className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors text-xs"
            title="Открыть полный менеджер инициативы"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-3">
          {combatants.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-xs text-zinc-400">Очередь боя пуста</p>
              <button
                onClick={onOpenFullModal}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                ➕ Добавить участников
              </button>
            </div>
          ) : (
            <>
              {/* Active Turn Highlight Banner */}
              {activeCombatant && (
                <div
                  className={`p-2.5 rounded-xl border transition-all ${
                    activeCombatant.category === 'player'
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                      : 'bg-rose-500/10 border-rose-500/60 shadow-lg shadow-rose-500/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xl shrink-0 shadow-inner">
                        {activeCombatant.avatar}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-xs text-zinc-100 truncate">
                            {activeCombatant.name}
                          </span>
                          <span
                            className={`px-1 py-0.2 text-[9px] font-bold rounded border shrink-0 ${
                              activeCombatant.category === 'player'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {activeCombatant.category === 'player' ? 'Игрок' : 'Монстр'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
                          <span className="flex items-center space-x-0.5 text-zinc-300 font-mono">
                            <Shield className="w-3 h-3 text-amber-400" />
                            <span>{activeCombatant.ac}</span>
                          </span>
                          <span>•</span>
                          <span className="font-mono text-amber-300">
                            Иниц: {activeCombatant.initiative}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick HP adjustment for Active Combatant */}
                    <div className="flex flex-col items-end shrink-0 space-y-1">
                      <div className="flex items-center space-x-1">
                        <Heart className="w-3 h-3 text-rose-500 fill-current" />
                        <span className="font-mono font-bold text-xs text-zinc-100">
                          {activeCombatant.currentHp}/{activeCombatant.maxHp}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => initiativeEngine.updateHp(activeCombatant.id, -1)}
                          className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded text-[10px] font-mono font-bold border border-zinc-800"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => initiativeEngine.updateHp(activeCombatant.id, 1)}
                          className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 rounded text-[10px] font-mono font-bold border border-zinc-800"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Conditions tags if any */}
                  {activeCombatant.conditions.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-2 mt-2 border-t border-zinc-800/80">
                      {activeCombatant.conditions.map((cond) => (
                        <span
                          key={cond}
                          className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[9px] font-medium"
                        >
                          {cond}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Combatants Queue Preview (Compact List) */}
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {combatants.map((c, idx) => {
                  const isActive = idx === activeTurnIndex;
                  return (
                    <div
                      key={c.id}
                      className={`px-2 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-amber-500/20 border-amber-500 text-zinc-100 font-bold'
                          : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="font-mono text-[10px] text-zinc-500 w-3 shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-sm shrink-0">{c.avatar}</span>
                        <span className="truncate">{c.name}</span>
                      </div>

                      <div className="flex items-center space-x-2 font-mono text-[11px] shrink-0">
                        <span
                          className={`px-1 rounded text-[10px] ${
                            c.currentHp === 0
                              ? 'bg-rose-950 text-rose-500'
                              : 'bg-zinc-950 text-zinc-300'
                          }`}
                        >
                          {c.currentHp} HP
                        </span>
                        <span className="text-amber-400 font-bold">{c.initiative}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Prominent Next Turn Control Button with Spacebar Hint */}
              <div className="flex items-center space-x-2 pt-1 border-t border-zinc-800/80">
                <button
                  onClick={handlePrevTurn}
                  className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl transition-all"
                  title="Предыдущий ход"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNextTurn}
                  className={`flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold rounded-xl transition-all text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 ${
                    spacePressedAnimation ? 'scale-95 bg-amber-300 ring-2 ring-amber-400' : ''
                  }`}
                >
                  <span>Сменить ход</span>
                  <span className="px-1.5 py-0.5 bg-zinc-950/30 border border-zinc-950/40 rounded text-[10px] font-mono font-extrabold uppercase">
                    Space
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
    </div>
  );
};
