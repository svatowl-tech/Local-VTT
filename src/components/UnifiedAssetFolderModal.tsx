import React, { useState, useEffect } from 'react';
import { FloatingWindow } from './FloatingWindow';
import {
  Folder,
  FolderPlus,
  RefreshCw,
  Save,
  CheckCircle2,
  HardDrive,
  Map as MapIcon,
  Box,
  Music,
  Volume2,
  Database,
  ArrowDownToLine,
  FolderOpen,
  Info,
  Check,
  Upload,
  Trash2,
  Clock,
  Sparkles,
  Swords,
  Layers,
  BookOpen,
  Globe,
  Crown,
  Building,
  Users,
  Search,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  FileCode,
  RotateCcw,
  AlertTriangle,
  FileUp,
} from 'lucide-react';
import {
  pickDiskAssetDirectory,
  saveSessionSnapshotToDisk,
  parseUploadedDirectoryFiles,
} from '../services/unifiedAssetFolderService';
import { checkIsTauri } from '../utils/apiUrlHelper';
import { mapLibraryCatalog } from '../services/mapLibraryCatalog';
import { audioEngine } from '../services/audioEngine';
import { diskAssetAutoSync, DiskSyncState } from '../services/diskAssetAutoSync';
import { TabletopSessionState, MapItem } from '../types';
import { autoTagResource } from '../utils/taggingEngine';
import { SystemSelectorSection } from './systems/SystemSelectorSection';
import { MasterLoreWikiPanel } from './lore/MasterLoreWikiPanel';
import { UniversalDataParserModal } from './systems/UniversalDataParserModal';
import { DEFAULT_WORLDS, worldLoreService } from '../services/worldLoreService';
import { systemContentService } from '../services/systemContentService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: TabletopSessionState;
  onUpdateMaps: (maps: MapItem[], activeMapId?: string | null) => void;
  onUpdateCategories: (categories: string[]) => void;
  onPlaceLoreOnCanvas?: (item: any) => void;
  onPlaceImageOnCanvas?: (imageUrl: string, name: string) => void;
  zIndex?: number;
  onFocus?: () => void;
}

export const UnifiedAssetFolderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  session,
  onUpdateMaps,
  onUpdateCategories,
  onPlaceLoreOnCanvas,
  onPlaceImageOnCanvas,
  zIndex = 45,
  onFocus,
}) => {
  const [activeTab, setActiveTab] = useState<'systems' | 'lore' | 'worlds' | 'assets' | 'backup'>('systems');
  const [createStructure, setCreateStructure] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<DiskSyncState>(() => diskAssetAutoSync.getState());
  const [loading, setLoading] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Tauri custom path state
  const [tauriPath, setTauriPath] = useState<string>(() => localStorage.getItem('aethermap_tauri_folder_path') || 'assets');
  const [showTauriPathInput, setShowTauriPathInput] = useState<boolean>(false);

  // Universal Data Parser & Lore Management State
  const [isParserOpen, setIsParserOpen] = useState<boolean>(false);
  const [selectedLoreWorldId, setSelectedLoreWorldId] = useState<string>('dnd5e_faerun');
  const [isConfirmReparseOpen, setIsConfirmReparseOpen] = useState<boolean>(false);
  const [reparseTargetWorldId, setReparseTargetWorldId] = useState<string>('dnd5e_faerun');

  const handleExecuteReparse = async (worldId: string) => {
    setLoading(true);
    setScanProgress(`Сброс структуры и перепарсинг файлов мира «${worldId}»...`);
    try {
      const res = await worldLoreService.reparseFolderFromScratch(worldId);
      await diskAssetAutoSync.manualSync();
      setStatusMessage({
        text: res.message || 'Структура успешно очищена и распарсена заново с нуля!',
        type: 'success',
      });
    } catch (e: any) {
      setStatusMessage({
        text: `Ошибка при перепарсинге: ${e.message || e}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
      setScanProgress('');
      setIsConfirmReparseOpen(false);
    }
  };

  // Subscribe to disk asset auto sync service
  useEffect(() => {
    const unsub = diskAssetAutoSync.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const handlePickDirectory = async () => {
    if (checkIsTauri()) {
      setShowTauriPathInput(true);
      return;
    }

    try {
      setLoading(true);
      setScanProgress('Открытие проводника папок...');
      setStatusMessage(null);

      const res = await pickDiskAssetDirectory(createStructure);
      await diskAssetAutoSync.setConnectedDirectoryHandle(res.handle);

      setStatusMessage({
        text: `Папка «${res.handle.name}» успешно привязана! Контент сохранен. Синхронизация доступна по кнопке «Обновить контент».`,
        type: 'success',
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setStatusMessage({
          text: err.message || 'Не удалось открыть папку через File System Access API. Используйте загрузку папки.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
      setScanProgress('');
    }
  };

  const handleManualRescan = async () => {
    try {
      setLoading(true);
      setScanProgress('Синхронизация локальных и серверных файлов...');
      setStatusMessage(null);

      const result = await diskAssetAutoSync.manualSync();

      if (result.success) {
        setStatusMessage({
          text: result.message,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: result.message,
          type: 'error',
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: `Ошибка сканирования: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
      setScanProgress('');
    }
  };

  const handleDisconnect = async () => {
    try {
      await diskAssetAutoSync.disconnectFolder();
      setStatusMessage({
        text: 'Привязка папки успешно сброшена.',
        type: 'info',
      });
    } catch (e: any) {
      setStatusMessage({ text: `Ошибка: ${e.message}`, type: 'error' });
    }
  };

  const handleSaveSnapshot = async () => {
    try {
      setLoading(true);
      const res = await saveSessionSnapshotToDisk(session);
      setStatusMessage({
        text: `Снимок сессии успешно сохранен в «data/Sessions/${res.filename}» на диске!`,
        type: 'success',
      });
      await diskAssetAutoSync.manualSync();
    } catch (err: any) {
      // Fallback to json download if no direct disk access
      const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AetherMap_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({
        text: 'Файл сохранения успешно скачан в папку Загрузки (data backup)!',
        type: 'info',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDirectoryInputFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const parsed = parseUploadedDirectoryFiles(e.target.files);

    const uploadedMaps: MapItem[] = parsed.maps.map((m) => {
      const url = URL.createObjectURL(m.file);
      const category = m.category || 'Общее';
      return {
        id: `uploaded-map-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: m.name,
        type: m.isVideo ? 'video' : 'image',
        url,
        thumbnailUrl: url,
        width: 1920,
        height: 1080,
        aspectRatio: 1.77,
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        zIndex: 0,
        opacity: 1,
        hash: 'upload-' + Math.random().toString(36).substring(2, 8),
        fileSize: m.file.size || 0,
        format: m.file.name.split('.').pop() || 'png',
        category,
        layer: 'background',
        tags: autoTagResource(m.name, category),
      };
    });

    const uploadedProps: MapItem[] = parsed.props.map((p) => {
      const url = URL.createObjectURL(p.file);
      const category = p.category || 'Объекты';
      return {
        id: `uploaded-prop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: p.name,
        type: 'image',
        url,
        thumbnailUrl: url,
        width: 512,
        height: 512,
        aspectRatio: 1,
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        zIndex: 10,
        opacity: 1,
        hash: 'upload-' + Math.random().toString(36).substring(2, 8),
        fileSize: p.file.size || 0,
        format: p.file.name.split('.').pop() || 'png',
        category,
        layer: 'props',
        tags: autoTagResource(p.name, category),
      };
    });

    const allUploadedMapItems = [...uploadedMaps, ...uploadedProps];

    // Group music files by playlist
    const playlistsMap = new Map<string, Array<{ title: string; url: string }>>();
    parsed.music.forEach((m) => {
      const pName = m.playlist || 'Саундтреки';
      const list = playlistsMap.get(pName) || [];
      list.push({ title: m.title, url: URL.createObjectURL(m.file) });
      playlistsMap.set(pName, list);
    });

    const playlistsToLoad: Array<{ playlistName: string; tracks: Array<{ title: string; url: string }> }> = [];
    playlistsMap.forEach((tracks, playlistName) => {
      playlistsToLoad.push({ playlistName, tracks });
    });

    // Group sfx files
    const sfxToLoad: Array<{ name: string; bank: string; url: string }> = parsed.sfx.map((s) => ({
      name: s.name,
      bank: s.bank || 'Общие SFX',
      url: URL.createObjectURL(s.file),
    }));

    if (playlistsToLoad.length > 0) {
      audioEngine.loadDiscoveredPlaylists(playlistsToLoad);
    }
    if (sfxToLoad.length > 0) {
      audioEngine.loadDiscoveredSFX(sfxToLoad);
    }

    const newCategories = Array.from(
      new Set([
        ...(session.mapCategories || []),
        ...allUploadedMapItems.map((m) => m.category),
      ])
    );
    onUpdateCategories(newCategories);

    // Save to Map Library Catalog
    mapLibraryCatalog.mergeLibraryMaps(allUploadedMapItems, newCategories);

    if (session.maps.length === 0 && allUploadedMapItems.length > 0) {
      onUpdateMaps([allUploadedMapItems[0]], allUploadedMapItems[0].id);
    }

    setStatusMessage({
      text: `Импортировано в библиотеку: ${allUploadedMapItems.length} карт, ${playlistsToLoad.length} плейлистов, ${sfxToLoad.length} SFX!`,
      type: 'success',
    });
  };

  if (!isOpen) return null;

  const isConnected = syncState.localFolderConnected || syncState.serverConnected;
  const lastSyncTimeFormatted = syncState.lastSyncedAt
    ? new Date(syncState.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Еще не синхронизировано';

  // Compute uniform counts
  const mapsCount = syncState.stats.mapsCount || 0;
  const propsCount = syncState.stats.propsCount || 0;
  const tracksCount = syncState.stats.tracksCount || 0;
  const sfxCount = syncState.stats.sfxCount || 0;
  const systemsCount = syncState.stats.systemsCount || 5;
  const loreCount = syncState.stats.loreCount || 8;
  const worldsCount = syncState.stats.worldsCount || DEFAULT_WORLDS.length;
  const totalCount = syncState.stats.totalCount || (mapsCount + propsCount + tracksCount + sfxCount + systemsCount + loreCount + worldsCount);

  return (
    <FloatingWindow
      id="unified-assets-panel"
      title="Папка контента, ассетов, лора и ролевых систем"
      isOpen={isOpen}
      onClose={onClose}
      icon={HardDrive}
      defaultPosition={{ x: 120, y: 50 }}
      defaultSize={{ width: 920, height: 680 }}
      minWidth={600}
      minHeight={450}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4 text-zinc-100 text-xs custom-scrollbar">
        {/* Status Header Banner */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-inner">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div
              className={`p-3 rounded-xl border shrink-0 ${
                isConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              <HardDrive className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="font-bold text-sm text-zinc-100 truncate max-w-[240px]">
                  {syncState.folderName}
                </span>
                {isConnected ? (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-mono text-[10px] rounded-full border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Привязана (Сохраняется)</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-zinc-900 text-zinc-500 font-mono text-[10px] rounded-full border border-zinc-800 shrink-0">
                    Не привязана
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-zinc-400 mt-1">
                <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                <span>
                  Синхронизировано: <strong className="text-zinc-300 font-mono">{lastSyncTimeFormatted}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
            <button
              onClick={() => setIsParserOpen(true)}
              className="px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md active:scale-95"
              title="Универсальный парсер: Foundry VTT, Roll20, 5eTools, PDF, Текст, XML"
            >
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Универсальный Парсер</span>
            </button>

            <button
              onClick={handleManualRescan}
              disabled={loading || syncState.isSyncing}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Пересканировать ассеты, лор и правила с диска"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || syncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>Обновить контент</span>
            </button>

            <button
              onClick={() => {
                setReparseTargetWorldId(selectedLoreWorldId);
                setIsConfirmReparseOpen(true);
              }}
              disabled={loading || syncState.isSyncing}
              className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Сбросить распарсенную структуру и пересоздать её с нуля из исходных файлов"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Перепарсить с нуля</span>
            </button>

            <button
              onClick={handlePickDirectory}
              disabled={loading || syncState.isSyncing}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Выбрать другую папку на диске"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>{isConnected ? 'Сменить папку' : 'Привязать'}</span>
            </button>

            {isConnected && syncState.localFolderConnected && (
              <button
                onClick={handleDisconnect}
                disabled={loading || syncState.isSyncing}
                className="p-2 bg-zinc-900 hover:bg-rose-950/60 hover:text-rose-400 text-zinc-400 border border-zinc-800 rounded-xl transition-all cursor-pointer"
                title="Отвязать папку"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Unified Folder Structure Overview Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-[10px] truncate">maps/</span>
              <MapIcon className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold text-zinc-100">{mapsCount}</div>
            <p className="text-[9px] text-zinc-500 truncate">Карты стола</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-[10px] truncate">props/</span>
              <Box className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold text-zinc-100">{propsCount}</div>
            <p className="text-[9px] text-zinc-500 truncate">Токены и декор</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-[10px] truncate">music/</span>
              <Music className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-base font-bold text-zinc-100">{tracksCount}</div>
            <p className="text-[9px] text-zinc-500 truncate">Саундтреки</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-semibold text-[10px] truncate">sfx/</span>
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-zinc-100">{sfxCount}</div>
            <p className="text-[9px] text-zinc-500 truncate">Звуковые SFX</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-amber-500/30 bg-amber-950/10 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-amber-300">
              <span className="font-semibold text-[10px] truncate">systems/</span>
              <Swords className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-base font-bold text-amber-200">{systemsCount}</div>
            <p className="text-[9px] text-amber-400/70 truncate">Ролевые правила</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-purple-500/30 bg-purple-950/10 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-purple-300">
              <span className="font-semibold text-[10px] truncate">lore/</span>
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-base font-bold text-purple-200">{loreCount}</div>
            <p className="text-[9px] text-purple-400/70 truncate">Статьи и НИПы</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-indigo-500/30 bg-indigo-950/10 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-indigo-300">
              <span className="font-semibold text-[10px] truncate">worlds/</span>
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-base font-bold text-indigo-200">{worldsCount}</div>
            <p className="text-[9px] text-indigo-400/70 truncate">Миры & Сеттинги</p>
          </div>

          <div className="p-2.5 bg-zinc-950 border border-emerald-500/40 bg-emerald-950/20 rounded-xl space-y-0.5">
            <div className="flex items-center justify-between text-emerald-300">
              <span className="font-semibold text-[10px] truncate">ВСЕГО</span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-base font-bold text-emerald-200">{totalCount}</div>
            <p className="text-[9px] text-emerald-400/80 truncate">Файлов & Записей</p>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1.5 border-b border-zinc-800 pb-2 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('systems')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'systems'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>Ролевые системы (`systems/`)</span>
          </button>

          <button
            onClick={() => setActiveTab('lore')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'lore'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>Лор и Энциклопедия (`lore/`)</span>
          </button>

          <button
            onClick={() => setActiveTab('worlds')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'worlds'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span>Миры и Сеттинги (`worlds/`)</span>
          </button>

          <button
            onClick={() => setActiveTab('assets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'assets'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
            }`}
          >
            <Folder className="w-3.5 h-3.5 text-emerald-400" />
            <span>Карты и Медиа (`maps/`, `music/`)</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              activeTab === 'backup'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
            }`}
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Снимки и Бэкап (`data/`)</span>
          </button>
        </div>

        {/* Progress or Notification Message */}
        {scanProgress && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <span>{scanProgress}</span>
          </div>
        )}

        {statusMessage && !scanProgress && (
          <div
            className={`p-3 rounded-xl border flex items-center space-x-2.5 text-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <Info className="w-4 h-4 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* TAB 1: RPG SYSTEMS SELECTION & DATA ENGINE */}
        {activeTab === 'systems' && <SystemSelectorSection />}

        {/* TAB 2: LORE & WIKI ENCYCLOPEDIA */}
        {activeTab === 'lore' && (
          <div className="space-y-3">
            {/* Data & Content Management Header Bar */}
            <div className="p-3.5 bg-zinc-950 border border-purple-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-purple-500/20 border border-purple-500/40 text-purple-300 rounded-xl shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-purple-200">
                    Управление данными и структурой лора (`assets/lore/`)
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Сканирование диска, импорт книг мира (PDF/TXT/XML) и принудительный перепарсинг сущностей
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 flex-wrap gap-1.5">
                <select
                  value={selectedLoreWorldId}
                  onChange={(e) => setSelectedLoreWorldId(e.target.value)}
                  className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  {DEFAULT_WORLDS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={async () => {
                    setLoading(true);
                    setScanProgress(`Синхронизация папки лора для мира «${selectedLoreWorldId}»...`);
                    try {
                      await worldLoreService.scanAndSyncFolder(selectedLoreWorldId, false);
                      await diskAssetAutoSync.manualSync();
                      setStatusMessage({
                        text: `Папка лора «${selectedLoreWorldId}» успешно обновлена!`,
                        type: 'success',
                      });
                    } catch (e: any) {
                      setStatusMessage({ text: `Ошибка обновления папки: ${e.message}`, type: 'error' });
                    } finally {
                      setLoading(false);
                      setScanProgress('');
                    }
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 font-bold rounded-xl text-xs flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                  title="Сканировать локальную папку лора и загрузить новые файлы"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${loading ? 'animate-spin' : ''}`} />
                  <span>Обновить папку</span>
                </button>

                <button
                  onClick={() => {
                    setReparseTargetWorldId(selectedLoreWorldId);
                    setIsConfirmReparseOpen(true);
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold rounded-xl text-xs flex items-center space-x-1 transition-all cursor-pointer disabled:opacity-50"
                  title="Удалить распарсенную структуру мира и обработать исходники с нуля"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Перепарсить с нуля</span>
                </button>

                <button
                  onClick={() => setIsParserOpen(true)}
                  className="px-3 py-1.5 bg-purple-600/30 hover:bg-purple-600/40 text-purple-200 border border-purple-500/40 font-bold rounded-xl text-xs flex items-center space-x-1 transition-all cursor-pointer"
                  title="Импортировать файлы, книги и базы через универсальный парсер"
                >
                  <FileUp className="w-3.5 h-3.5 text-purple-300" />
                  <span>Импорт Книг</span>
                </button>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden min-h-[480px]">
              <MasterLoreWikiPanel
                onPlaceLoreOnCanvas={onPlaceLoreOnCanvas}
                onPlaceImageOnCanvas={onPlaceImageOnCanvas}
              />
            </div>
          </div>
        )}

        {/* TAB 3: WORLDS & SETTINGS MANAGER */}
        {activeTab === 'worlds' && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-100">Управление Мирами и Сеттингами (`assets/lore/`)</h3>
                  <p className="text-[11px] text-zinc-400">
                    Все зарегистрированные игровые вселенные, их папки на диске и структуры регионов
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsParserOpen(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-zinc-100 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Загрузить книгу мира</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DEFAULT_WORLDS.map((world) => {
                const folderName = world.id.includes('faerun')
                  ? 'Faerun_DND5e'
                  : world.id.includes('eberron')
                  ? 'Eberron_DND5e'
                  : world.id.includes('night_city')
                  ? 'Cyberpunk_RED'
                  : world.id.includes('arkham')
                  ? 'Call_of_Cthulhu'
                  : 'Generic_Worlds';

                return (
                  <div
                    key={world.id}
                    className="p-4 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-2xl space-y-3 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-bold text-xs text-zinc-100">{world.name}</h4>
                          <span className="px-2 py-0.2 bg-zinc-800 text-amber-300 text-[10px] font-mono rounded border border-zinc-700">
                            {world.systemId}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Путь: assets/lore/{folderName}/
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold rounded-full border border-indigo-500/30 shrink-0">
                        Сеттинг
                      </span>
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed">{world.description}</p>

                    {world.subWorlds && world.subWorlds.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                          Регионы и Города:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {world.subWorlds.map((sub) => (
                            <span
                              key={sub.id}
                              className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded text-[10px]"
                            >
                              📍 {sub.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              await worldLoreService.scanAndSyncFolder(world.id, false);
                              await diskAssetAutoSync.manualSync();
                              setStatusMessage({
                                text: `Папка «${world.name}» успешно синхронизирована с диском!`,
                                type: 'success',
                              });
                            } catch (e: any) {
                              setStatusMessage({
                                text: `Ошибка сканирования мира: ${e.message}`,
                                type: 'error',
                              });
                            } finally {
                              setLoading(false);
                            }
                          }}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                          title="Сканировать новые файлы в папке"
                        >
                          <RefreshCw className="w-3 h-3 text-blue-400" />
                          <span>Сканировать</span>
                        </button>

                        <button
                          onClick={() => {
                            setReparseTargetWorldId(world.id);
                            setIsConfirmReparseOpen(true);
                          }}
                          className="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                          title="Очистить структуру и заново перепарсить мир"
                        >
                          <RotateCcw className="w-3 h-3 text-rose-400" />
                          <span>Перепарсить</span>
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedLoreWorldId(world.id);
                          setActiveTab('lore');
                        }}
                        className="px-2.5 py-1 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30 rounded-lg text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                      >
                        <span>В Вики</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: GENERAL MEDIA ASSETS (Maps, Props, Music, SFX) */}
        {activeTab === 'assets' && (
          <div className="space-y-4">
            {/* Sync Mode Information Note */}
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-start space-x-3 text-xs text-zinc-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-200">Синхронизация контента стола:</span>
                <p className="text-[11px] text-zinc-400">
                  Привязанная папка сохраняется между перезапусками приложения. Когда вы добавляете новые карты, звуки или токены на диск — просто нажмите зелёную кнопку «Обновить контент» в верхней панели.
                </p>
              </div>
            </div>

            {/* Directory Upload Fallback */}
            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-zinc-200 font-semibold text-xs">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Загрузка папки целиком (Резервный метод)</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400">
                Если браузер не поддерживает прямой доступ к диску через API, вы можете перетащить или выбрать папку с ассетами вручную:
              </p>
              <div>
                <label className="cursor-pointer inline-flex items-center space-x-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold transition-all">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  <span>Импортировать папку с файлами</span>
                  <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleDirectoryInputFallback}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: BACKUP & SESSIONS */}
        {activeTab === 'backup' && (
          <div className="space-y-4">
            {/* Save Session to Disk */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between shadow-inner">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-zinc-100 flex items-center space-x-1.5">
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Сохранить снимок стола на диск</span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Сохраняет все настройки, туман, сетку, рисунки, выбранную систему, лор и пропсы в файл сессии «data/Sessions/».
                </p>
              </div>
              <button
                onClick={handleSaveSnapshot}
                disabled={loading}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-100 border border-zinc-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
                <span>Сохранить в JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Universal Data Parser & Import Modal */}
      {isParserOpen && (
        <UniversalDataParserModal
          isOpen={isParserOpen}
          onClose={() => setIsParserOpen(false)}
          targetSystemId={systemContentService.getActiveSystemId()}
          systems={systemContentService.getSystems()}
          onImportComplete={async () => {
            await diskAssetAutoSync.manualSync();
          }}
        />
      )}

      {/* Tauri Folder Path Input Dialog */}
      {showTauriPathInput && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl shrink-0">
                <FolderOpen className="w-6 h-6 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-zinc-100">Путь к локальной папке ассетов (Tauri)</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  В настольной версии введите абсолютный путь к папке ассетов на вашем диске (например, <code className="text-zinc-200 font-mono">D:\RPG\Assets</code> или <code className="text-zinc-200 font-mono">/Users/username/RPG/Assets</code>).
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Путь к папке</label>
              <input
                type="text"
                value={tauriPath}
                onChange={(e) => setTauriPath(e.target.value)}
                placeholder="assets"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-200 font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowTauriPathInput(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  setShowTauriPathInput(false);
                  setLoading(true);
                  try {
                    await diskAssetAutoSync.setConnectedDirectoryHandle(tauriPath);
                    setStatusMessage({
                      text: `Путь к папке «${tauriPath}» сохранен! Запущена синхронизация.`,
                      type: 'success',
                    });
                  } catch (err: any) {
                    setStatusMessage({
                      text: `Ошибка сохранения пути: ${err.message}`,
                      type: 'error',
                    });
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold cursor-pointer"
              >
                Привязать папку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Force Re-parsing */}
      {isConfirmReparseOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-rose-500/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-rose-200">
                  Перепарсинг и сброс структуры мира
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Текущая распарсенная структура сущностей для мира{' '}
                  <strong className="text-amber-300">{reparseTargetWorldId}</strong> будет полностью
                  очищена на диске.
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 space-y-1.5">
              <div className="font-semibold text-rose-300 flex items-center space-x-1">
                <span>⚠️ Пересоздание данных с нуля</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">
                Движок сервера удалит устаревшие файлы структурированного JSON и заново сгенерирует сущности из всех найденных книг и текстовых архивов.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsConfirmReparseOpen(false)}
                disabled={loading}
                className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => handleExecuteReparse(reparseTargetWorldId)}
                disabled={loading}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-lg disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Очистка и перепарсинг...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Удалить структуру и перепарсить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </FloatingWindow>
  );
};
