import React, { useState, useEffect } from 'react';
import {
  Monitor,
  Eye,
  EyeOff,
  ExternalLink,
  Code2,
  Map as MapIcon,
  Grid,
  ShieldAlert,
  SlidersHorizontal,
  PlusCircle,
  Tv,
  Lock,
  Unlock,
  Music,
  Layers,
  FolderArchive,
  RefreshCw,
  Laptop,
} from 'lucide-react';
import { ViewMode, PlayerBlackoutState } from '../types';
import { DiskSyncState, diskAssetAutoSync } from '../services/diskAssetAutoSync';
import { UiDensityControl } from './UiDensityControl';
import { uiDensityService } from '../services/uiDensityService';

interface Props {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onOpenPlayerWindow: () => void;
  onOpenMapLibrary: () => void;
  onOpenUploadModal: () => void;
  onOpenGridConfig: () => void;
  onOpenLayersConfig?: () => void;
  onOpenAudioPlayer?: () => void;
  onOpenSfxSoundboard?: () => void;
  onOpenInitiative?: () => void;
  onOpenUnifiedAssets?: () => void;
  onToggleGrid?: () => void;
  gridEnabled?: boolean;
  isSynced: boolean;
  activeMapName?: string;
  playerBlackout?: PlayerBlackoutState;
  onTogglePlayerBlackout?: () => void;
  diskSyncStatus?: DiskSyncState | null;
  onOpenDevConsole?: () => void;
}

export const WindowSwitcherBar: React.FC<Props> = ({
  viewMode,
  onViewModeChange,
  onOpenPlayerWindow,
  onOpenMapLibrary,
  onOpenUploadModal,
  onOpenGridConfig,
  onOpenLayersConfig,
  onOpenAudioPlayer,
  onOpenSfxSoundboard,
  onOpenInitiative,
  onOpenUnifiedAssets,
  onToggleGrid,
  gridEnabled,
  isSynced,
  activeMapName,
  playerBlackout,
  onTogglePlayerBlackout,
  diskSyncStatus,
  onOpenDevConsole,
}) => {
  const isBlackoutActive = !!playerBlackout?.enabled;
  const [isCompact, setIsCompact] = useState<boolean>(() => uiDensityService.isCompactActive());

  useEffect(() => {
    const unsub = uiDensityService.subscribe((_, compact) => {
      setIsCompact(compact);
    });
    return unsub;
  }, []);

  const handleManualSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await diskAssetAutoSync.manualSync();
  };

  const handleOpenDevTools = async () => {
    if (onOpenDevConsole) {
      onOpenDevConsole();
    }
  };

  const isFolderConnected = !!(diskSyncStatus?.localFolderConnected || diskSyncStatus?.serverConnected);
  const totalAssetsCount = diskSyncStatus?.stats
    ? diskSyncStatus.stats.mapsCount + diskSyncStatus.stats.tracksCount + diskSyncStatus.stats.propsCount
    : 0;

  return (
    <header className={`${isCompact ? 'h-11 sm:h-12' : 'h-13 sm:h-14'} bg-zinc-950 border-b border-zinc-800/80 px-2 sm:px-3 flex items-center justify-between text-zinc-100 select-none z-30 relative shadow-md max-w-full overflow-hidden gap-1.5 transition-all duration-150`}>
      {/* Brand & Active Map Indicator */}
      <div className="flex items-center space-x-2 shrink-0 min-w-0">
        <div className="h-7 sm:h-8 px-2 flex items-center space-x-1.5 bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase">
            AetherMap
          </span>
          <span className="text-[9px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1 py-0.1 rounded font-semibold">
            Rust
          </span>
        </div>

        {activeMapName && (
          <div className="hidden lg:flex items-center space-x-1 text-xs text-zinc-400 border-l border-zinc-800/80 pl-2 min-w-0">
            <MapIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-zinc-300 max-w-[100px] xl:max-w-[160px] truncate">
              {activeMapName}
            </span>
          </div>
        )}
      </div>

      {/* Center View Mode Selector & Master Blackout Status */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Main View Mode Selector */}
        <div className="flex items-center bg-zinc-900/90 p-0.5 sm:p-1 rounded-xl border border-zinc-800/80 space-x-0.5 h-7 sm:h-8">
          <button
            onClick={() => onViewModeChange('master')}
            className={`h-6 sm:h-7 px-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
              viewMode === 'master'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Панель Мастера"
          >
            <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Мастер</span>
          </button>

          <button
            onClick={() => onViewModeChange('player')}
            className={`h-6 sm:h-7 px-2 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors ${
              viewMode === 'player'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Предпросмотр экрана игроков"
          >
            <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Игроки</span>
          </button>
        </div>

        {/* PROMINENT PLAYER CURTAIN / BLACKOUT TOGGLE BUTTON */}
        {onTogglePlayerBlackout && (
          <button
            onClick={onTogglePlayerBlackout}
            className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold border flex items-center space-x-1 transition-colors shrink-0 active:scale-95 ${
              isBlackoutActive
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md animate-pulse'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title={
              isBlackoutActive
                ? 'Заглушка активна: игроки видят экран подготовки'
                : 'Включить заглушку для игроков'
            }
          >
            {isBlackoutActive ? (
              <>
                <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-950 stroke-[2.5]" />
                <span className="font-bold">ЗАГЛУШКА</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Заглушка</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Control Actions & Popups - Uniform Compact Sizing */}
      <div className="flex items-center space-x-1 shrink min-w-0">
        {/* Screen / Density Mode Optimizer Button */}
        <UiDensityControl />

        {onOpenAudioPlayer && (
          <button
            onClick={onOpenAudioPlayer}
            className="h-7 sm:h-8 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors shrink-0"
            title="Музыкальный плеер"
          >
            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden 2xl:inline">Музыка</span>
          </button>
        )}

        {onOpenInitiative && (
          <button
            onClick={onOpenInitiative}
            className="h-7 sm:h-8 px-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shrink-0"
            title="Очередь инициативы"
          >
            <span className="text-xs shrink-0">⚔️</span>
            <span className="hidden 2xl:inline">Инициатива</span>
          </button>
        )}

        {onOpenSfxSoundboard && (
          <button
            onClick={onOpenSfxSoundboard}
            className="h-7 sm:h-8 px-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shrink-0"
            title="Звуковые эффекты (SFX)"
          >
            <span className="text-xs shrink-0">⚡</span>
            <span className="hidden 2xl:inline">SFX</span>
          </button>
        )}

        {/* Unified Assets Folder & 1-Click Manual Sync */}
        {onOpenUnifiedAssets && (
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0">
            <button
              onClick={onOpenUnifiedAssets}
              className="h-7 sm:h-8 px-2 hover:bg-zinc-800 text-emerald-300 text-xs font-semibold flex items-center space-x-1 transition-colors"
              title={`Папка ассетов: ${diskSyncStatus?.folderName || 'Рабочая папка'}. Нажмите для управления.`}
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="hidden 2xl:inline">Папка</span>
              {totalAssetsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                  {totalAssetsCount}
                </span>
              )}
            </button>

            {/* Direct manual re-sync button */}
            <button
              onClick={handleManualSyncClick}
              disabled={diskSyncStatus?.isSyncing}
              className="h-7 sm:h-8 px-1.5 bg-emerald-950/40 hover:bg-emerald-800/40 border-l border-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center cursor-pointer"
              title="Синхронизировать контент с диска прямо сейчас"
            >
              <RefreshCw className={`w-3 h-3 ${diskSyncStatus?.isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        <button
          onClick={onOpenMapLibrary}
          className="h-7 sm:h-8 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors shrink-0"
          title="Библиотека карт"
        >
          <MapIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden 2xl:inline">Карты</span>
        </button>

        <button
          onClick={onOpenUploadModal}
          className="h-7 sm:h-8 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors shrink-0"
          title="Загрузить карту"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden 2xl:inline">Импорт</span>
        </button>

        {onOpenLayersConfig && (
          <button
            onClick={onOpenLayersConfig}
            className="h-7 sm:h-8 px-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors shrink-0"
            title="Управление слоями стола (Положение и порядок слоев)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden 2xl:inline">Слои</span>
          </button>
        )}

        <div className="flex items-center -space-x-px shrink-0">
          <button
            onClick={onToggleGrid}
            className={`h-7 sm:h-8 px-2 rounded-l-lg text-xs font-medium flex items-center space-x-1 border transition-colors ${
              gridEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/25'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title={gridEnabled ? "Отключить отображение сетки" : "Включить отображение сетки"}
          >
            <Grid className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="hidden 2xl:inline">Сетка</span>
            {gridEnabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5 shrink-0" />
            )}
          </button>
          <button
            onClick={onOpenGridConfig}
            className={`h-7 sm:h-8 px-1.5 rounded-r-lg text-xs font-medium flex items-center border transition-colors ${
              gridEnabled
                ? 'bg-cyan-500/15 text-cyan-300 border-y border-r border-l-0 border-cyan-500/40 hover:bg-cyan-500/25'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-y border-r border-l-0 border-zinc-800'
            }`}
            title="Настройки параметров сетки"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          </button>
        </div>

        <button
          onClick={onOpenPlayerWindow}
          className="h-7 sm:h-8 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors shrink-0"
          title="2-е окно для проектора"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden 2xl:inline">2-е Окно</span>
        </button>

        <button
          onClick={handleOpenDevTools}
          className="h-7 sm:h-8 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-lg text-xs font-mono flex items-center space-x-1 transition-colors shrink-0"
          title="Консоль разработчика (DevTools)"
        >
          <Code2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden 2xl:inline">Консоль</span>
        </button>
      </div>
    </header>
  );
};

