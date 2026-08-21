import React, { useState, useEffect, useMemo } from 'react';
import { MapItem } from '../types';
import { FloatingWindow } from './FloatingWindow';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Video,
  Image as ImageIcon,
  Plus,
  Trash2,
  X,
  CheckCircle2,
  Search,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { MediaRenderer } from './MediaRenderer';
import { mapLibraryCatalog } from '../services/mapLibraryCatalog';
import { diskAssetAutoSync } from '../services/diskAssetAutoSync';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  maps: MapItem[];
  activeMapId: string | null;
  mapCategories?: string[];
  onSelectActiveMap: (id: string, mapItem?: MapItem) => void;
  onOpenUploadModal: () => void;
  onRemoveMap: (id: string) => void;
  onUpdateMapCategory?: (mapId: string, category: string) => void;
  onUpdateCategories?: (categories: string[]) => void;
  zIndex?: number;
  onFocus?: () => void;
}

const ITEMS_PER_PAGE = 24;

export const MapSelectorModal: React.FC<Props> = ({
  isOpen,
  onClose,
  maps: sessionMaps,
  activeMapId,
  mapCategories: propCategories = ['Подземелья', 'Города', 'Природа', 'Боссы', 'Здания', 'Общее'],
  onSelectActiveMap,
  onOpenUploadModal,
  onRemoveMap,
  onUpdateMapCategory,
  onUpdateCategories,
  zIndex = 40,
  onFocus,
}) => {
  const [catalogMaps, setCatalogMaps] = useState<MapItem[]>(() => mapLibraryCatalog.getMaps());
  const [catalogCategories, setCatalogCategories] = useState<string[]>(() => mapLibraryCatalog.getCategories());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Subscribe to library catalog
  useEffect(() => {
    const unsub = mapLibraryCatalog.subscribe((maps, categories) => {
      setCatalogMaps(maps);
      setCatalogCategories(categories);
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      await diskAssetAutoSync.manualSync();
    } finally {
      setIsSyncing(false);
    }
  };


  // Merge session maps and catalog maps with deduplication by ID
  const allMaps = useMemo(() => {
    const mapDict = new Map<string, MapItem>();
    catalogMaps.forEach((m) => mapDict.set(m.id, m));
    sessionMaps.forEach((m) => mapDict.set(m.id, m));
    return Array.from(mapDict.values());
  }, [catalogMaps, sessionMaps]);

  const effectiveCategories = useMemo(() => {
    return Array.from(new Set([...propCategories, ...catalogCategories]));
  }, [propCategories, catalogCategories]);

  // Category Selection State ('ALL_MAPS', 'UNCATEGORIZED', or Category Name)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL_MAPS');

  // Filter type state ('all' | 'image' | 'video')
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);

  // New category creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, typeFilter, searchQuery]);

  if (!isOpen) return null;

  // Filtered maps calculation
  const filteredMaps = allMaps.filter((m) => {
    // 1. Category Filter
    if (selectedCategory === 'UNCATEGORIZED') {
      if (m.category && m.category !== 'Без категории' && m.category !== '') return false;
    } else if (selectedCategory !== 'ALL_MAPS') {
      if (m.category !== selectedCategory) return false;
    }

    // 2. Type Filter (Image vs Video)
    if (typeFilter === 'image' && m.type !== 'image') return false;
    if (typeFilter === 'video' && m.type !== 'video') return false;

    // 3. Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchName = (m.name || '').toLowerCase().includes(query);
      const matchFormat = (m.format || '').toLowerCase().includes(query);
      const matchCat = (m.category || '').toLowerCase().includes(query);
      const matchTags = m.tags?.some((t) => t.toLowerCase().includes(query)) || false;
      if (!matchName && !matchFormat && !matchCat && !matchTags) return false;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredMaps.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedMaps = filteredMaps.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const totalCount = allMaps.length;
  const uncategorizedCount = allMaps.filter(
    (m) => !m.category || m.category === 'Без категории' || m.category === ''
  ).length;

  const getCategoryCount = (catName: string) => {
    return allMaps.filter((m) => m.category === catName).length;
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    mapLibraryCatalog.addCategory(trimmed);
    if (onUpdateCategories) {
      onUpdateCategories(Array.from(new Set([...effectiveCategories, trimmed])));
    }
    setSelectedCategory(trimmed);
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };

  const handleSelectMap = (mapItem: MapItem) => {
    onSelectActiveMap(mapItem.id, mapItem);
  };

  const handleRemove = (e: React.MouseEvent, mapId: string) => {
    e.stopPropagation();
    mapLibraryCatalog.removeMap(mapId);
    onRemoveMap(mapId);
  };

  return (
    <FloatingWindow
      id="maps-library-panel"
      title={`Библиотека карт (${allMaps.length} файлов)`}
      isOpen={isOpen}
      onClose={onClose}
      icon={FolderOpen}
      defaultPosition={{ x: 90, y: 65 }}
      defaultSize={{ width: 960, height: 620 }}
      minWidth={540}
      minHeight={380}
      zIndex={zIndex}
      onFocus={onFocus}
      headerRightActions={
        <div className="flex items-center space-x-1.5 mr-1">
          <div className="relative w-44">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Поиск карт..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-7 pr-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 hover:border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            title="Синхронизировать карты с привязанной папки на диске"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Синхронизировать</span>
          </button>
        </div>
      }
    >
      <div className="flex-1 flex overflow-hidden text-zinc-100">
        {/* Left Categories Sidebar */}
        <div className="w-56 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col p-3 space-y-2 shrink-0 select-none overflow-y-auto">
          <div className="px-2 py-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
            <span>Категории</span>
            <button
              onClick={() => setIsCreatingCategory(true)}
              className="p-1 text-amber-400 hover:text-amber-300 hover:bg-zinc-800/80 rounded transition-colors"
              title="Создать новую категорию"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Create Category Form */}
          {isCreatingCategory && (
            <div className="p-2 bg-zinc-900 border border-amber-500/40 rounded-xl space-y-2">
              <input
                type="text"
                placeholder="Имя категории..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                  if (e.key === 'Escape') setIsCreatingCategory(false);
                }}
                autoFocus
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={handleAddCategory}
                  className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Создать</span>
                </button>
                <button
                  onClick={() => setIsCreatingCategory(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Categories List */}
          <div className="space-y-0.5">
            <button
              onClick={() => setSelectedCategory('ALL_MAPS')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedCategory === 'ALL_MAPS'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center space-x-2 truncate">
                <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="truncate">Все карты</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-900 rounded border border-zinc-800 text-zinc-400">
                {totalCount}
              </span>
            </button>

            {effectiveCategories.map((cat) => {
              const count = getCategoryCount(cat);
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Folder className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="truncate">{cat}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-900/80 rounded border border-zinc-800 text-zinc-400">
                    {count}
                  </span>
                </button>
              );
            })}

            {uncategorizedCount > 0 && (
              <button
                onClick={() => setSelectedCategory('UNCATEGORIZED')}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === 'UNCATEGORIZED'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                <span className="text-zinc-500 italic truncate">Без категории</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-900/80 rounded border border-zinc-800 text-zinc-500">
                  {uncategorizedCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/40">
          {/* Top Bar: Filters + Upload Button */}
          <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40 shrink-0">
            <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  typeFilter === 'all'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Все ({filteredMaps.length})
              </button>
              <button
                onClick={() => setTypeFilter('image')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                  typeFilter === 'image'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Фото</span>
              </button>
              <button
                onClick={() => setTypeFilter('video')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
                  typeFilter === 'video'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                <span>Видео</span>
              </button>
            </div>

            <button
              onClick={() => {
                onClose();
                onOpenUploadModal();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Загрузить карту</span>
            </button>
          </div>

          {/* Maps Grid Area */}
          <div className="flex-1 p-5 overflow-y-auto">
            {paginatedMaps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-amber-400 shadow-inner">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="font-semibold text-base text-zinc-100">
                    {selectedCategory === 'ALL_MAPS'
                      ? 'В библиотеке пока нет карт'
                      : `В папке «${selectedCategory}» нет карт`}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Подключите папку на диске через «Папка ассетов» или импортируйте изображение карты.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {paginatedMaps.map((mapItem) => {
                  const isActive = mapItem.id === activeMapId;

                  return (
                    <div
                      key={mapItem.id}
                      onClick={() => handleSelectMap(mapItem)}
                      className={`group relative bg-zinc-950 border rounded-xl overflow-hidden transition-all flex flex-col shadow-md cursor-pointer hover:scale-[1.01] ${
                        isActive
                          ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-amber-500/10'
                          : 'border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      {/* Media Thumbnail */}
                      <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                        <MediaRenderer mapItem={mapItem} className="w-full h-full object-cover" />

                        {/* Format Badge */}
                        <div className="absolute top-2 left-2 bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-mono text-zinc-200 border border-zinc-800 flex items-center space-x-1">
                          {mapItem.type === 'video' ? (
                            <Video className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-amber-400" />
                          )}
                          <span>{mapItem.format}</span>
                        </div>

                        {/* Active Badge */}
                        {isActive && (
                          <div className="absolute top-2 right-2 bg-amber-500 text-zinc-950 px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center space-x-1 shadow-md">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Активна на столе</span>
                          </div>
                        )}
                      </div>

                      {/* Card Info */}
                      <div className="p-2.5 flex flex-col justify-between space-y-2">
                        <div>
                          <h4 className="font-semibold text-xs text-zinc-100 line-clamp-1 group-hover:text-amber-300 transition-colors">
                            {mapItem.name}
                          </h4>
                          <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                            {mapItem.category || 'Общее'} • {mapItem.width}x{mapItem.height}
                          </p>
                          {mapItem.tags && mapItem.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {mapItem.tags.slice(0, 3).map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[8px] font-medium bg-zinc-900 text-zinc-400 border border-zinc-800/80 px-1.5 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                          <button
                            onClick={() => handleSelectMap(mapItem)}
                            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center space-x-1"
                          >
                            <span>Активировать</span>
                          </button>

                          <button
                            onClick={(e) => handleRemove(e, mapItem.id)}
                            className="p-1 text-zinc-600 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                            title="Удалить из библиотеки"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Pagination Bar */}
          {totalPages > 1 && (
            <div className="px-5 py-2.5 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
              <span>
                Показано {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredMaps.length)} из {filteredMaps.length}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-200 rounded-lg border border-zinc-800 flex items-center space-x-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Назад</span>
                </button>

                <span className="px-2 font-bold text-amber-400">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 text-zinc-200 rounded-lg border border-zinc-800 flex items-center space-x-1"
                >
                  <span>Вперед</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </FloatingWindow>
  );
};
