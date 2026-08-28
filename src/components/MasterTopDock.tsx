import React, { memo, useState, useEffect } from 'react';
import {
  Swords,
  Package,
  Tv,
  EyeOff,
  Lock,
  FolderArchive,
  BookOpen,
  Globe,
  Dices,
  Scroll,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { uiDensityService } from '../services/uiDensityService';

export interface OpenPanelsState {
  initiative: boolean;
  campaign: boolean;
  sims: boolean;
  camera: boolean;
  fog: boolean;
  curtain: boolean;
  dungeon: boolean;
  vault: boolean;
  reference: boolean;
  lore: boolean;
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
  const [isCompact, setIsCompact] = useState<boolean>(() => uiDensityService.isCompactActive());

  useEffect(() => {
    const unsub = uiDensityService.subscribe((_, compact) => {
      setIsCompact(compact);
    });
    return unsub;
  }, []);

  const btnSizeClass = isCompact
    ? 'w-10 h-10 sm:w-11 sm:h-11 rounded-xl p-0.5'
    : 'w-11 h-11 sm:w-13 sm:h-13 rounded-2xl p-1';

  const iconBoxSizeClass = isCompact
    ? 'w-5 h-5 rounded-lg'
    : 'w-5 sm:w-6 h-5 sm:h-6 rounded-xl';

  const textSizeClass = isCompact
    ? 'text-[7.5px] max-w-[38px]'
    : 'text-[8.5px] max-w-[44px]';

  return (
    <div
      id="master_top_dock"
      className="flex items-center space-x-1 sm:space-x-1.5 select-none pointer-events-auto bg-zinc-950/85 backdrop-blur-md p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl border border-zinc-800/80 shadow-2xl transition-all duration-200"
      title="Панель инструментов мастера"
    >
      {/* 1. Бой / Инициатива */}
      <button
        id="dock_btn_initiative"
        onClick={() => onTogglePanel('initiative')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.initiative
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Очередь инициативы (Бой)"
      >
        {inCombat ? (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-rose-500 text-white text-[8px] font-mono font-black border border-rose-300 shadow-md animate-pulse">
            Р.{combatRound}
          </span>
        ) : (
          combatantsCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[8px] font-mono font-black border border-amber-300 shadow-md">
              {combatantsCount}
            </span>
          )
        )}
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Swords className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          {inCombat ? `Р.${combatRound}` : 'Бой'}
        </span>
      </button>

      {/* 1.5. Кампания (Campaign Tracker, Quests, Time & NPC Web) */}
      <button
        id="dock_btn_campaign"
        onClick={() => onTogglePanel('campaign')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.campaign
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Инструменты ведения кампании (Время, Квесты, Локации, NPC, Сессии, Казна)"
      >
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Scroll className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Кампания
        </span>
      </button>

      {/* 2. Объекты / Каталог (Sims) */}
      <button
        id="dock_btn_sims"
        onClick={() => onTogglePanel('sims')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.sims
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Каталог объектов и декораций (Sims)"
      >
        {sessionPropsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[8px] font-mono font-black border border-amber-300 shadow-md">
            {sessionPropsCount}
          </span>
        )}
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Package className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Объекты
        </span>
      </button>

      {/* 2.5 Рандомная генерация */}
      <button
        id="dock_btn_dungeon"
        onClick={() => onTogglePanel('dungeon')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.dungeon
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Генераторы карт"
      >
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Dices className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Генератор
        </span>
      </button>

      {/* 3. Хранилище готовых карт (Map Vault) */}
      <button
        id="dock_btn_vault"
        onClick={() => onTogglePanel('vault')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.vault
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Хранилище готовых карт, пресетов и сцен"
      >
        {vaultMapsCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-zinc-950 text-[8px] font-mono font-black border border-amber-300 shadow-md">
            {vaultMapsCount}
          </span>
        )}
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <FolderArchive className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Хранилище
        </span>
      </button>

      {/* 4. Справочник (Reference & Compendium) */}
      <button
        id="dock_btn_reference"
        onClick={() => onTogglePanel('reference')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.reference
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Справочник мастера (Compendium, бестиарий, заклинания, правила)"
      >
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Справочник
        </span>
      </button>

      {/* 5. Лор и Вики Миров (World Lore & Wiki) */}
      <button
        id="dock_btn_lore"
        onClick={() => onTogglePanel('lore')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.lore
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Лор миров, вики, города, НИП, культы и фракции"
      >
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Лор Вики
        </span>
      </button>

      {/* 6. Камера */}
      <button
        id="dock_btn_camera"
        onClick={() => onTogglePanel('camera')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.camera
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Управление камерой игроков"
      >
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Tv className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Камера
        </span>
      </button>

      {/* 7. Туман войны */}
      <button
        id="dock_btn_fog"
        onClick={() => onTogglePanel('fog')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.fog
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Туман войны"
      >
        {isFogEnabled && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 border border-amber-200"></span>
          </span>
        )}
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Туман
        </span>
      </button>

      {/* 8. Заглушка (Curtain) */}
      <button
        id="dock_btn_curtain"
        onClick={() => onTogglePanel('curtain')}
        className={`relative ${btnSizeClass} flex flex-col items-center justify-center transition-all duration-200 group active:scale-95 shadow-md ${
          openPanels.curtain
            ? 'bg-amber-500/25 border-2 border-amber-400 text-amber-300 ring-1 ring-amber-500/30 scale-105 shadow-amber-500/20'
            : 'bg-zinc-950/90 border border-amber-500/40 hover:border-amber-400 hover:bg-zinc-900 text-amber-400 hover:scale-105'
        }`}
        title="Заглушка экрана игроков (Blackout curtain)"
      >
        {isBlackoutEnabled && (
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 border border-amber-200"></span>
          </span>
        )}
        <div className={`${iconBoxSizeClass} bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all duration-200 shadow-sm`}>
          <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </div>
        <span className={`${textSizeClass} font-bold text-amber-300/90 group-hover:text-amber-300 tracking-tight mt-0.5 truncate`}>
          Заглушка
        </span>
      </button>
    </div>
  );
});

