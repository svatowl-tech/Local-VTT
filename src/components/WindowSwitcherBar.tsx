import React from 'react';
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
} from 'lucide-react';
import { ViewMode, PlayerBlackoutState } from '../types';
import { DiskSyncState, diskAssetAutoSync } from '../services/diskAssetAutoSync';

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
}) => {
  const isBlackoutActive = !!playerBlackout?.enabled;

  const handleManualSyncClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await diskAssetAutoSync.manualSync();
  };

  const handleOpenDevTools = async () => {
    try {
      // @ts-ignore
      if (window.__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('plugin:webview|internal_toggle_devtools');
      } else {
        console.log('DevTools action is for Desktop version only.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isFolderConnected = !!(diskSyncStatus?.localFolderConnected || diskSyncStatus?.serverConnected);
  const totalAssetsCount = diskSyncStatus?.stats
    ? diskSyncStatus.stats.mapsCount + diskSyncStatus.stats.tracksCount + diskSyncStatus.stats.propsCount
    : 0;

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-3 sm:px-4 flex items-center justify-between text-zinc-100 select-none z-30 relative shadow-md max-w-full overflow-hidden gap-2">
      {/* Brand & Active Map Indicator */}
      <div className="flex items-center space-x-3 shrink-0 min-w-0">
        <div className="h-8 px-2.5 flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-bold text-xs tracking-wider text-zinc-100 uppercase">
            AetherMap
          </span>
          <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded font-semibold">
            Rust
          </span>
        </div>

        {activeMapName && (
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-zinc-400 border-l border-zinc-800/80 pl-3 min-w-0">
            <MapIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-medium text-zinc-300 max-w-[120px] lg:max-w-[180px] truncate">
              {activeMapName}
            </span>
          </div>
        )}
      </div>

      {/* Center View Mode Selector & Master Blackout Status */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* Main View Mode Selector */}
        <div className="flex items-center bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80 space-x-1 h-9">
          <button
            onClick={() => onViewModeChange('master')}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              viewMode === 'master'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Панель Мастера"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Дашборд Мастера</span>
            <span className="sm:hidden">Мастер</span>
          </button>

          <button
            onClick={() => onViewModeChange('player')}
            className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
              viewMode === 'player'
                ? 'bg-amber-500 text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
            title="Предпросмотр экрана игроков"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Экран Игроков</span>
            <span className="sm:hidden">Игроки</span>
          </button>
        </div>

        {/* PROMINENT PLAYER CURTAIN / BLACKOUT TOGGLE BUTTON */}
        {onTogglePlayerBlackout && (
          <button
            onClick={onTogglePlayerBlackout}
            className={`h-9 px-3 rounded-xl text-xs font-bold border flex items-center space-x-1.5 transition-colors shrink-0 active:scale-95 ${
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
                <Lock className="w-3.5 h-3.5 text-zinc-950 stroke-[2.5]" />
                <span className="hidden sm:inline font-bold">СКРЫТО ЗАГЛУШКОЙ</span>
                <span className="sm:hidden font-bold">ЗАГЛУШКА</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Заглушка</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Control Actions & Popups - Uniform Compact Sizing */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink min-w-0">
        {onOpenAudioPlayer && (
          <button
            onClick={onOpenAudioPlayer}
            className="h-8 px-2 sm:px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shrink-0"
            title="Музыкальный плеер"
          >
            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden 2xl:inline">Музыка</span>
          </button>
        )}

        {onOpenInitiative && (
          <button
            onClick={onOpenInitiative}
            className="h-8 px-2 sm:px-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
            title="Очередь инициативы"
          >
            <span className="text-xs shrink-0">⚔️</span>
            <span className="hidden 2xl:inline">Инициатива</span>
          </button>
        )}

        {onOpenSfxSoundboard && (
          <button
            onClick={onOpenSfxSoundboard}
            className="h-8 px-2 sm:px-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
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
              className="h-8 px-2 sm:px-2.5 hover:bg-zinc-800 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              title={`Папка ассетов: ${diskSyncStatus?.folderName || 'Рабочая папка'}. Нажмите для управления.`}
            >
              <FolderArchive className={`w-3.5 h-3.5 text-emerald-400 shrink-0`} />
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
              className="h-8 px-2 bg-emerald-950/40 hover:bg-emerald-800/40 border-l border-zinc-800 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center cursor-pointer"
              title="Синхронизировать контент с диска прямо сейчас"
            >
              <RefreshCw className={`w-3 h-3 ${diskSyncStatus?.isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        <button
          onClick={onOpenMapLibrary}
          className="h-8 px-2 sm:px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shrink-0"
          title="Библиотека карт"
        >
          <MapIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden 2xl:inline">Карты</span>
        </button>

        <button
          onClick={onOpenUploadModal}
          className="h-8 px-2 sm:px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shrink-0"
          title="Загрузить карту"
        >
          <PlusCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden 2xl:inline">Импорт</span>
        </button>

        {onOpenLayersConfig && (
          <button
            onClick={onOpenLayersConfig}
            className="h-8 px-2 sm:px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0"
            title="Управление слоями стола (Положение и порядок слоев)"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="hidden 2xl:inline">Слои</span>
          </button>
        )}

        <button
          onClick={onOpenGridConfig}
          className={`h-8 px-2 sm:px-2.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 border transition-colors shrink-0 ${
            gridEnabled
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
          }`}
          title="Настройка сетки"
        >
          <Grid className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="hidden 2xl:inline">Сетка</span>
          {gridEnabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse ml-0.5 shrink-0" />
          )}
        </button>

        <button
          onClick={onOpenPlayerWindow}
          className="h-8 px-2 sm:px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shrink-0"
          title="2-е окно для проектора"
        >
          <ExternalLink className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="hidden 2xl:inline">2-е Окно</span>
        </button>

        <button
          onClick={handleOpenDevTools}
          className="h-8 px-2 sm:px-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors shrink-0"
          title="Консоль разработчика (DevTools)"
        >
          <Code2 className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden 2xl:inline">Консоль</span>
        </button>
      </div>
    </header>
  );
};

