import React, { memo } from 'react';
import {
  Swords,
  Package,
  Tv,
  EyeOff,
  Lock,
  FolderArchive,
} from 'lucide-react';

export interface OpenPanelsState {
  initiative: boolean;
  sims: boolean;
  camera: boolean;
  fog: boolean;
  curtain: boolean;
  vault: boolean;
}

interface Props {
  openPanels: OpenPanelsState;
  onTogglePanel: (panelKey: keyof OpenPanelsState) => void;
  sessionPropsCount: number;
  combatantsCount: number;
  inCombat: boolean;
  combatRound: number;
  isBlackoutEnabled: boolean;
  isFogEnabled: boolean;
  vaultMapsCount?: number;
}

export const MasterTopDock: React.FC<Props> = memo(({
  openPanels,
  onTogglePanel,
  sessionPropsCount,
  combatantsCount,
  inCombat,
  combatRound,
  isBlackoutEnabled,
  isFogEnabled,
  vaultMapsCount = 0,
}) => {
  return (
    <div
      id="master_top_dock"
      className="flex items-center space-x-2 select-none pointer-events-auto bg-zinc-950/80 backdrop-blur-md p-1.5 rounded-3xl border border-zinc-800/80 shadow-2xl"
      title="Панель инструментов мастера"
    >
      {/* 1. Бой / Инициатива */}
      <button
        id="dock_btn_initiative"
        onClick={() => onTogglePanel('initiative')}
        className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center p-1 transition-all duration-200 group active:scale-95 shadow-lg ${
          openPanels.initiative
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Очередь инициативы (Бой)"
      >
        {inCombat ? (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-mono font-black border border-rose-300 shadow-md animate-pulse">
            Р.{combatRound}
          </span>
        ) : (
          combatantsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-mono font-black border border-amber-300 shadow-md">
              {combatantsCount}
            </span>
          )
        )}
        <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <Swords className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-[48px]">
          {inCombat ? `Р.${combatRound}` : 'Бой'}
        </span>
      </button>

      {/* 2. Объекты / Каталог (Sims) */}
      <button
        id="dock_btn_sims"
        onClick={() => onTogglePanel('sims')}
        className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center p-1 transition-all duration-200 group active:scale-95 shadow-lg ${
          openPanels.sims
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Каталог объектов и декораций (Sims)"
      >
        {sessionPropsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-mono font-black border border-amber-300 shadow-md">
            {sessionPropsCount}
          </span>
        )}
        <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <Package className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-[48px]">
          Объекты
        </span>
      </button>

      {/* 3. Хранилище готовых карт (Map Vault) */}
      <button
        id="dock_btn_vault"
        onClick={() => onTogglePanel('vault')}
        className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center p-1 transition-all duration-200 group active:scale-95 shadow-lg ${
          openPanels.vault
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Хранилище готовых карт, пресетов и сцен"
      >
        {vaultMapsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-zinc-950 text-[9px] font-mono font-black border border-amber-300 shadow-md">
            {vaultMapsCount}
          </span>
        )}
        <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <FolderArchive className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-[48px]">
          Хранилище
        </span>
      </button>

      {/* 4. Камера */}
      <button
        id="dock_btn_camera"
        onClick={() => onTogglePanel('camera')}
        className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center p-1 transition-all duration-200 group active:scale-95 shadow-lg ${
          openPanels.camera
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Управление камерой игроков"
      >
        <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <Tv className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-[48px]">
          Камера
        </span>
      </button>

      {/* 5. Туман войны */}
      <button
        id="dock_btn_fog"
        onClick={() => onTogglePanel('fog')}
        className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center p-1 transition-all duration-200 group active:scale-95 shadow-lg ${
          openPanels.fog
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Туман войны"
      >
        {isFogEnabled && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 border border-amber-200"></span>
          </span>
        )}
        <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <EyeOff className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-[48px]">
          Туман
        </span>
      </button>

      {/* 6. Заглушка (Curtain) */}
      <button
        id="dock_btn_curtain"
        onClick={() => onTogglePanel('curtain')}
        className={`relative w-14 h-14 rounded-2xl flex flex-col items-center justify-center p-1 transition-all duration-200 group active:scale-95 shadow-lg ${
          openPanels.curtain
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-2 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Заглушка экрана игроков (Blackout curtain)"
      >
        {isBlackoutEnabled && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border border-amber-200"></span>
          </span>
        )}
        <div className="w-6 h-6 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate max-w-[48px]">
          Заглушка
        </span>
      </button>
    </div>
  );
});
