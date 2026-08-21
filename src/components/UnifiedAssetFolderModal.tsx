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
} from 'lucide-react';
import {
  pickDiskAssetDirectory,
  scanDiskAssetDirectory,
  saveSessionSnapshotToDisk,
  createCanonicalFolderStructure,
  parseUploadedDirectoryFiles,
  getActiveDirectoryHandle,
  loadAssetFolderContent,
} from '../services/unifiedAssetFolderService';
import { mapLibraryCatalog } from '../services/mapLibraryCatalog';
import { audioEngine } from '../services/audioEngine';
import { diskAssetAutoSync, DiskSyncState } from '../services/diskAssetAutoSync';
import { TabletopSessionState, UnifiedAssetFolderStats, MapItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  session: TabletopSessionState;
  onUpdateMaps: (maps: MapItem[], activeMapId?: string | null) => void;
  onUpdateCategories: (categories: string[]) => void;
  zIndex?: number;
  onFocus?: () => void;
}

export const UnifiedAssetFolderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  session,
  onUpdateMaps,
  onUpdateCategories,
  zIndex = 45,
  onFocus,
}) => {
  const [createStructure, setCreateStructure] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<DiskSyncState>(() => diskAssetAutoSync.getState());
  const [loading, setLoading] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Subscribe to disk asset auto sync service
  useEffect(() => {
    const unsub = diskAssetAutoSync.subscribe((state) => {
      setSyncState(state);
    });
    return unsub;
  }, []);

  const handlePickDirectory = async () => {
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
      setScanProgress('Синхронизация файлов с диска...');
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
        category: m.category || 'Общее',
        layer: 'background',
      };
    });

    const uploadedProps: MapItem[] = parsed.props.map((p) => {
      const url = URL.createObjectURL(p.file);
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
        category: p.category || 'Объекты',
        layer: 'props',
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

  return (
    <FloatingWindow
      id="unified-assets-panel"
      title="Папка контента и ассетов стола"
      isOpen={isOpen}
      onClose={onClose}
      icon={HardDrive}
      defaultPosition={{ x: 140, y: 70 }}
      defaultSize={{ width: 800, height: 580 }}
      minWidth={480}
      minHeight={360}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="flex-1 flex flex-col p-5 overflow-y-auto space-y-5 text-zinc-100 text-xs">
        {/* Status Header Banner */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
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
                <span>Последняя синхронизация: <strong className="text-zinc-300 font-mono">{lastSyncTimeFormatted}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleManualRescan}
              disabled={loading || syncState.isSyncing}
              className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              title="Пересканировать и обновить контент с диска прямо сейчас"
            >
              <RefreshCw className={`w-4 h-4 ${loading || syncState.isSyncing ? 'animate-spin' : ''}`} />
              <span>Обновить контент</span>
            </button>

            <button
              onClick={handlePickDirectory}
              disabled={loading || syncState.isSyncing}
              className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Выбрать другую папку на диске"
            >
              <FolderOpen className="w-4 h-4 text-amber-400" />
              <span>{isConnected ? 'Сменить папку' : 'Привязать папку'}</span>
            </button>

            {isConnected && syncState.localFolderConnected && (
              <button
                onClick={handleDisconnect}
                disabled={loading || syncState.isSyncing}
                className="p-2.5 bg-zinc-900 hover:bg-red-950/60 hover:text-red-400 text-zinc-400 border border-zinc-800 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                title="Отвязать папку"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
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

        {/* Folder Stats Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-medium text-[11px]">maps/ (Карты)</span>
              <MapIcon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">{syncState.stats.mapsCount}</div>
            <p className="text-[10px] text-zinc-500 font-mono">
              Категорий: {syncState.stats.mapCategoriesCount || session.mapCategories?.length || 1}
            </p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-medium text-[11px]">props/ (Объекты)</span>
              <Box className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">{syncState.stats.propsCount}</div>
            <p className="text-[10px] text-zinc-500 font-mono">Токены и декор</p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-medium text-[11px]">music/ (Музыка)</span>
              <Music className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">{syncState.stats.tracksCount}</div>
            <p className="text-[10px] text-zinc-500 font-mono">Фоновые треки</p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="font-medium text-[11px]">sfx/ (Звуки SFX)</span>
              <Volume2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">{syncState.stats.sfxCount}</div>
            <p className="text-[10px] text-zinc-500 font-mono">Звуковые эффекты</p>
          </div>
        </div>

        {/* Sync Mode Information Note */}
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-start space-x-3 text-xs text-zinc-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-zinc-200">Ручная синхронизация контента:</span>
            <p className="text-[11px] text-zinc-400">
              Привязанная папка сохраняется между перезапусками приложения. Когда вы добавляете новые карты, звуки или токены на диск — просто нажмите зелёную кнопку «Обновить контент» или кнопку синхронизации в верхней панели.
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

        {/* Save Session to Disk */}
        <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between shadow-inner">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-xs text-zinc-100 flex items-center space-x-1.5">
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Сохранить снимок стола на диск</span>
            </h4>
            <p className="text-[11px] text-zinc-400">
              Сохраняет все настройки, туман, сетку, рисунки и пропсы в файл сессии «data/Sessions/».
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
    </FloatingWindow>
  );
};

