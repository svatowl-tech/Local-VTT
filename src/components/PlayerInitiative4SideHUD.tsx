import React, { useState, useEffect } from 'react';
import { initiativeEngine } from '../services/initiativeEngine';
import { InitiativeCombatant, InitiativeEncounterState } from '../types';
import { Swords } from 'lucide-react';

interface SingleStripProps {
  combatants: InitiativeCombatant[];
  activeTurnIndex: number;
  round: number;
  inCombat: boolean;
}

const SingleEdgeInitiativeStrip: React.FC<SingleStripProps> = ({
  combatants,
  activeTurnIndex,
  round,
  inCombat,
}) => {
  if (combatants.length === 0) return null;

  // Filter out hidden monsters for player view
  const visibleCombatants = combatants.filter((c) => !c.isHidden);
  if (visibleCombatants.length === 0) return null;

  const activeCombatant = combatants[activeTurnIndex];

  // Reorder queue starting from active turn index
  const orderedQueue: InitiativeCombatant[] = [];
  const total = combatants.length;
  for (let i = 0; i < Math.min(total, 5); i++) {
    const idx = (activeTurnIndex + i) % total;
    const combatant = combatants[idx];
    if (combatant && !combatant.isHidden) {
      orderedQueue.push(combatant);
    }
  }

  return (
    <div className="flex items-center space-x-1.5 bg-zinc-950/92 backdrop-blur-md border border-amber-500/40 rounded-xl px-2 py-1 shadow-2xl shadow-black/80 max-w-full overflow-hidden select-none">
      {/* Round Badge */}
      <div className="flex items-center space-x-1 bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-amber-300 shrink-0">
        <Swords className="w-3 h-3 text-amber-400" />
        <span>{inCombat ? `Р.${round}` : 'ОЧЕРЕДЬ'}</span>
      </div>

      {/* Combatants Queue */}
      <div className="flex items-center space-x-1 overflow-hidden">
        {orderedQueue.map((c) => {
          const isActive = activeCombatant && activeCombatant.id === c.id;

          if (isActive) {
            return (
              <div
                key={c.id}
                className="flex items-center space-x-1.5 bg-amber-500 text-zinc-950 font-bold px-2 py-0.5 rounded-lg shadow-lg shadow-amber-500/30 text-xs shrink-0 animate-pulse"
              >
                <span className="text-xs leading-none">{c.avatar || '⚔️'}</span>
                <span className="truncate max-w-[80px]">{c.name}</span>
                <span className="bg-zinc-950/90 text-amber-300 text-[10px] px-1 py-0.2 rounded font-mono border border-amber-400/50">
                  {c.initiative}
                </span>
              </div>
            );
          }

          return (
            <div
              key={c.id}
              className="flex items-center space-x-1 bg-zinc-900/90 border border-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded-lg text-xs shrink-0 opacity-80"
            >
              <span className="text-[11px] leading-none">{c.avatar || '⚔️'}</span>
              <span className="truncate max-w-[65px] text-[10px]">{c.name}</span>
              <span className="text-[9px] text-amber-400/90 font-mono font-semibold ml-0.5">
                {c.initiative}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface Props {
  sessionEncounter?: InitiativeEncounterState;
}

export const PlayerInitiative4SideHUD: React.FC<Props> = ({ sessionEncounter }) => {
  const [engineState, setEngineState] = useState(() => initiativeEngine.getState());

  useEffect(() => {
    // Ping to request latest state if freshly opened
    initiativeEngine.requestRemoteSync();

    const unsubscribe = initiativeEngine.subscribe(() => {
      setEngineState(initiativeEngine.getState());
    });
    return unsubscribe;
  }, []);

  const encounter =
    engineState.encounter && engineState.encounter.combatants && engineState.encounter.combatants.length > 0
      ? engineState.encounter
      : sessionEncounter || engineState.encounter;

  const { combatants = [], inCombat = false, round = 1, activeTurnIndex = 0, showToPlayers = true } = encounter;

  // If initiative is toggled off for players or no combatants exist, hide HUD
  if (showToPlayers === false || combatants.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-[4000] overflow-hidden select-none">
      {/* 1. TOP EDGE PANEL (North - Rotated 180°) */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[calc(100%-180px)] max-w-4xl h-11 flex justify-center items-center pointer-events-none overflow-hidden">
        <div className="rotate-180 origin-center max-w-full flex justify-center">
          <SingleEdgeInitiativeStrip
            combatants={combatants}
            activeTurnIndex={activeTurnIndex}
            round={round}
            inCombat={inCombat}
          />
        </div>
      </div>

      {/* 2. BOTTOM EDGE PANEL (South - Standard 0°) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-180px)] max-w-4xl h-11 flex justify-center items-center pointer-events-none overflow-hidden">
        <div className="max-w-full flex justify-center">
          <SingleEdgeInitiativeStrip
            combatants={combatants}
            activeTurnIndex={activeTurnIndex}
            round={round}
            inCombat={inCombat}
          />
        </div>
      </div>

      {/* 3. LEFT EDGE PANEL (West - Rotated 90°, bounded by 100% - 180px) */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-[calc(100%-180px)] max-h-[600px] flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[calc(100vh-180px)] max-w-[600px] h-11 absolute flex items-center justify-center rotate-90 origin-center pointer-events-none">
          <SingleEdgeInitiativeStrip
            combatants={combatants}
            activeTurnIndex={activeTurnIndex}
            round={round}
            inCombat={inCombat}
          />
        </div>
      </div>

      {/* 4. RIGHT EDGE PANEL (East - Rotated -90°, bounded by 100% - 180px) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-[calc(100%-180px)] max-h-[600px] flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-[calc(100vh-180px)] max-w-[600px] h-11 absolute flex items-center justify-center -rotate-90 origin-center pointer-events-none">
          <SingleEdgeInitiativeStrip
            combatants={combatants}
            activeTurnIndex={activeTurnIndex}
            round={round}
            inCombat={inCombat}
          />
        </div>
      </div>
    </div>
  );
};
