import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapVaultItem, WorkspaceTab, MapItem } from '../types';
import { mapVaultService } from '../services/mapVaultService';
import {
  FolderArchive,
  Search,
  Plus,
  Download,
  Upload,
  ExternalLink,
  MapPin,
  RefreshCw,
  Trash2,
  X,
  Layers,
  Eye,
  Flame,
  Sparkles,
  Save,
  Check,
  Compass,
  FileJson,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTab?: WorkspaceTab | null;
  activeMapId?: string | null;
  onOpenAsTab: (vaultItem: MapVaultItem) => void;
  onPlacePortalOnMap: (vaultItem: MapVaultItem) => void;
  onOpenSaveCurrentTab?: () => void;
  onOpenSaveCurrentTabDialog?: () => void;
}

export const MapVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTab,
  activeMapId,
  onOpenAsTab,
  onPlacePortalOnMap,
  onOpenSaveCurrentTab,
  onOpenSaveCurrentTabDialog,
}) => {
  const triggerOpenSaveDialog = onOpenSaveCurrentTab || onOpenSaveCurrentTabDialog;
  const [items, setItems] = useState<MapVaultItem[]>(() => mapVaultService.getAll());
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<MapVaultItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = mapVaultService.subscribe((updated) => {
      setItems([...updated]);
    });
    return unsub;
  }, []);

  const categories = useMemo(() => {
    const defaultCats = mapVaultService.getCategories();
    return defaultCats;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCategory =
        selectedCategory === 'Все'
          ? true
          : selectedCategory === 'Пользовательские'
          ? !item.isBuiltInPreset
          : selectedCategory === 'Пресеты'
          ? item.isBuiltInPreset
          : item.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCategory;

      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));

      return matchCategory && (matchName || matchDesc || matchTags);
    });
  }, [items, selectedCategory, searchQuery]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  if (!isOpen) return null;

  const handleExportSingle = (item: MapVaultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = mapVaultService.exportItemToJson(item.id);
    if (!json) return;

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `map_${item.name.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Карта "${item.name}" успешно экспортирована в файл`);
  };

  const handleExportAll = () => {
    const json = mapVaultService.exportAllPackage();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethermap_vault_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Все (${items.length}) карт экспортированы в пакет резервной копии`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = mapVaultService.importFromJson(content);
        if (result.success) {
          showToast(`Успешно импортировано карт: ${result.count}`);
        } else {
          showToast(`Ошибка импорта: ${result.error}`);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleOverwriteFromCurrent = (item: MapVaultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentTab) return;
    const ok = mapVaultService.updateVaultItemFromTab(item.id, currentTab);
    if (ok) {
      showToast(`Карта "${item.name}" обновлена из текущей вкладки!`);
    }
  };

  const handleDelete = (item: MapVaultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Удалить карту "${item.name}" из Хранилища?`)) {
      mapVaultService.deleteItem(item.id);
      if (selectedItem?.id === item.id) {
        setSelectedItem(null);
      }
      showToast(`Карта "${item.name}" удалена`);
    }
  };

  return (
    <div
      id="map-vault-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-6xl h-[88vh] bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="px-6 py-4 bg-zinc-950/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shadow-inner">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-zinc-100">
                  Хранилище Готовых Карт
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold rounded-full">
                  {items.length} карт
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Сохраненные сцены, готовые пресеты и интерактивные порталы для глобальных карт
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center space-x-2.5">
            {triggerOpenSaveDialog && (
              <button
                type="button"
                onClick={triggerOpenSaveDialog}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                title="Сохранить текущую открытую вкладку в Хранилище"
              >
                <Save className="w-4 h-4" />
                <span>Сохранить сцену</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Импортировать карту из .json файла"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>Импорт .json</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />

            <button
              type="button"
              onClick={handleExportAll}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Экспорт всех карт в один резервный файл"
            >
              <Download className="w-3.5 h-3.5 text-zinc-400" />
              <span>Резервная копия</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="px-6 py-3 bg-zinc-900/90 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          {/* Categories Pill Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-2xl no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                    : 'bg-zinc-950/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или тегам..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700/80 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div className="absolute top-20 right-6 z-50 bg-amber-500 text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl flex items-center space-x-2 animate-in slide-in-from-top-2">
            <Check className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}

        {/* Main Grid Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/40">
          {filteredItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500 space-y-3">
              <Compass className="w-12 h-12 text-zinc-600" />
              <div className="space-y-1">
                <div className="text-zinc-300 font-semibold text-sm">
                  Карты не найдены
                </div>
                <div className="text-xs text-zinc-500 max-w-sm">
                  Попробуйте изменить категорию или поисковый запрос, либо сохраните текущую открытую сцену.
                </div>
              </div>
              {currentTab && (
                <button
                  type="button"
                  onClick={onOpenSaveCurrentTabDialog}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md mt-2 cursor-pointer"
                >
                  + Сохранить текущую сцену
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredItems.map((item) => {
                const primaryMap = (item.tabSnapshot.maps || []).find(
                  (m) => m.id === item.tabSnapshot.activeMapId
                ) || item.tabSnapshot.maps?.[0];
                const thumb = item.thumbnailUrl || primaryMap?.thumbnailUrl || primaryMap?.url || '';
                const stats = item.stats || mapVaultService.computeStats(item.tabSnapshot);

                return (
                  <div
                    key={item.id}
                    className="group bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/60 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col hover:shadow-2xl"
                  >
                    {/* Card Thumbnail & Action Overlay */}
                    <div className="relative h-44 bg-zinc-950 overflow-hidden border-b border-zinc-800">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                          Нет изображения
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 bg-zinc-950/85 backdrop-blur-md border border-zinc-700/80 text-zinc-200 text-[10px] font-bold rounded-md">
                          {item.category}
                        </span>
                        {item.isBuiltInPreset && (
                          <span className="px-2 py-0.5 bg-amber-500/90 text-zinc-950 text-[10px] font-extrabold rounded-md shadow">
                            ПРЕСЕТ
                          </span>
                        )}
                      </div>

                      {/* Bottom Stats Overlay */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 bg-zinc-950/85 backdrop-blur-md px-2 py-1 rounded-md border border-zinc-800 text-[10px] text-zinc-300">
                          <span className="flex items-center space-x-1">
                            <Layers className="w-3 h-3 text-blue-400" />
                            <span>{item.tabSnapshot.maps?.length || 0}</span>
                          </span>
                          {stats.hasFog && (
                            <span className="flex items-center space-x-1 text-purple-400">
                              <Eye className="w-3 h-3" />
                            </span>
                          )}
                          {stats.hasEffects && (
                            <span className="flex items-center space-x-1 text-orange-400">
                              <Flame className="w-3 h-3" />
                            </span>
                          )}
                          {stats.hasSpells && (
                            <span className="flex items-center space-x-1 text-rose-400">
                              <Sparkles className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] font-mono text-zinc-400 bg-zinc-950/85 backdrop-blur-md px-1.5 py-0.5 rounded border border-zinc-800">
                          {stats.bgWidth}×{stats.bgHeight}
                        </div>
                      </div>
                    </div>

                    {/* Card Information */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-bold text-sm text-zinc-100 line-clamp-1 group-hover:text-amber-400 transition-colors">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 4).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[9px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800/85 px-1.5 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {/* 1. Open as new tab */}
                          <button
                            type="button"
                            onClick={() => {
                              onOpenAsTab(item);
                              onClose();
                            }}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                            title="Развернуть эту карту в отдельной вкладке наверху"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Открыть вкладку</span>
                          </button>

                          {/* 2. Place as Portal link on global map */}
                          <button
                            type="button"
                            onClick={() => {
                              onPlacePortalOnMap(item);
                              onClose();
                            }}
                            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 hover:border-amber-500/40 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                            title="Разместить объект-портал на текущей карте (например, на глобальной карте мира)"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Портал на карту</span>
                          </button>
                        </div>

                        {/* Secondary utility buttons */}
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                          <button
                            type="button"
                            onClick={(e) => handleExportSingle(item, e)}
                            className="hover:text-zinc-300 flex items-center space-x-1 cursor-pointer transition-colors"
                            title="Экспортировать карту в файл .json"
                          >
                            <FileJson className="w-3 h-3 text-zinc-400" />
                            <span>Экспорт .json</span>
                          </button>

                          {currentTab && (
                            <button
                              type="button"
                              onClick={(e) => handleOverwriteFromCurrent(item, e)}
                              className="hover:text-amber-400 flex items-center space-x-1 cursor-pointer transition-colors"
                              title="Перезаписать эту запись текущим состоянием открытой вкладки"
                            >
                              <RefreshCw className="w-3 h-3 text-amber-400" />
                              <span>Обновить из текущей</span>
                            </button>
                          )}

                          {!item.isBuiltInPreset && (
                            <button
                              type="button"
                              onClick={(e) => handleDelete(item, e)}
                              className="hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title="Удалить карту из хранилища"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-rose-400" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
