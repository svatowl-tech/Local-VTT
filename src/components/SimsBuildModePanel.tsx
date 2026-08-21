import React, { useState, useMemo } from 'react';
import {
  PROP_CATEGORIES,
  BUILTIN_PROP_PRESETS,
  PropPreset,
} from '../data/propPresets';
import { MapItem } from '../types';
import {
  Box,
  ChevronDown,
  ChevronUp,
  Search,
  Plus,
  Sparkles,
  Layers,
  Check,
  Upload,
  Move,
  Info,
  Maximize2,
} from 'lucide-react';

interface Props {
  sessionMaps: MapItem[];
  onPlaceProp: (prop: {
    name: string;
    url: string;
    width: number;
    height: number;
    layer: 'props' | 'overhead' | 'background';
    category?: string;
  }) => void;
  onOpenUploadModal?: () => void;
  onOpenUnifiedAssets?: () => void;
}

export const SimsBuildModePanel: React.FC<Props> = ({
  sessionMaps,
  onPlaceProp,
  onOpenUploadModal,
  onOpenUnifiedAssets,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPropId, setSelectedPropId] = useState<string | null>(null);
  const [placedFeedback, setPlacedFeedback] = useState<string | null>(null);

  // Merge built-in presets with user's custom props in session
  const customProps: PropPreset[] = useMemo(() => {
    return sessionMaps
      .filter((m) => m.layer === 'props' || (m.category && m.category !== 'Общие карты' && !['Dungeons', 'Cities', 'Wilderness', 'Battlemaps', 'Taverns', 'Bosses'].includes(m.category)))
      .map((m) => {
        let catId = 'custom';
        const rawCat = m.category || 'Пропсы';
        const lower = rawCat.toLowerCase();
        if (lower.includes('token') || lower.includes('токен') || lower.includes('монстр')) catId = 'tokens';
        else if (lower.includes('furnitur') || lower.includes('мебель')) catId = 'furniture';
        else if (lower.includes('nature') || lower.includes('природ') || lower.includes('дерев')) catId = 'nature';
        else if (lower.includes('loot') || lower.includes('лут') || lower.includes('сокровищ')) catId = 'loot';
        else if (lower.includes('magic') || lower.includes('магия') || lower.includes('ловушк')) catId = 'magic';
        else if (lower.includes('arch') || lower.includes('декор') || lower.includes('стен')) catId = 'architecture';

        return {
          id: `custom-${m.id}`,
          name: m.name,
          category: catId,
          categoryLabel: rawCat,
          icon: catId === 'tokens' ? '⚔️' : catId === 'furniture' ? '🛋️' : catId === 'loot' ? '💎' : '📁',
          url: m.url,
          defaultWidth: m.width && m.width < 1000 ? m.width : 100,
          defaultHeight: m.height && m.height < 1000 ? m.height : 100,
          gridCells: '1x1',
          layer: (m.layer as any) || 'props',
        };
      });
  }, [sessionMaps]);

  // Dynamic Categories Tab List
  const dynamicCategories = useMemo(() => {
    const defaultIds = new Set(PROP_CATEGORIES.map((c) => c.id));
    const extraCats: Array<{ id: string; label: string; icon: string }> = [];

    customProps.forEach((p) => {
      if (p.category === 'custom' && p.categoryLabel && p.categoryLabel !== 'Мои Пропсы') {
        const catKey = p.categoryLabel.toLowerCase();
        if (!extraCats.some((c) => c.id === catKey) && !defaultIds.has(catKey)) {
          extraCats.push({
            id: catKey,
            label: p.categoryLabel,
            icon: '📂',
          });
        }
      }
    });

    return [...PROP_CATEGORIES, ...extraCats];
  }, [customProps]);

  const allProps = useMemo(() => {
    return [...BUILTIN_PROP_PRESETS, ...customProps];
  }, [customProps]);

  // Filter props by category & search
  const filteredProps = useMemo(() => {
    return allProps.filter((p) => {
      // Category filter
      if (activeCategory !== 'all') {
        if (activeCategory === 'custom' && p.category !== 'custom') return false;
        if (activeCategory !== 'custom' && p.category !== activeCategory && p.categoryLabel.toLowerCase() !== activeCategory) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchCat = p.categoryLabel.toLowerCase().includes(query);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [allProps, activeCategory, searchQuery]);

  const handlePlace = (p: PropPreset) => {
    setSelectedPropId(p.id);
    onPlaceProp({
      name: p.name,
      url: p.url,
      width: p.defaultWidth,
      height: p.defaultHeight,
      layer: p.layer,
      category: p.categoryLabel,
    });

    setPlacedFeedback(p.name);
    setTimeout(() => {
      setPlacedFeedback(null);
    }, 1500);
  };

  const handleDragStart = (e: React.DragEvent, p: PropPreset) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'aethermap_prop_preset',
        name: p.name,
        url: p.url,
        width: p.defaultWidth,
        height: p.defaultHeight,
        layer: p.layer,
        category: p.categoryLabel,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-full h-full flex flex-col space-y-2 select-none">
      {/* Sims Style Header Strip */}
      <div className="px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-zinc-100 flex items-center space-x-2">
              <span>Каталог объектов</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                {filteredProps.length} предметов
              </span>
            </h3>
          </div>
        </div>

        {/* Placed Toast Notification */}
        {placedFeedback && (
          <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom duration-200">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>«{placedFeedback}» размещён!</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {onOpenUploadModal && (
            <button
              onClick={onOpenUploadModal}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
              title="Загрузить свой файл объекта"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Загрузить PNG</span>
            </button>
          )}

          {onOpenUnifiedAssets && (
            <button
              onClick={onOpenUnifiedAssets}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-medium transition-all flex items-center space-x-1"
              title="Медиатека ассетов"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ассеты</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Sims Build Mode Catalog Content */}
      <div className="space-y-3 flex-1 flex flex-col overflow-hidden">
        {/* Category Pill Tabs & Search Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
            {/* Category Strip */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none flex-1">
              {dynamicCategories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1.5 border ${
                      isActive
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md scale-105 font-bold'
                        : 'bg-zinc-900/90 text-zinc-400 hover:text-zinc-200 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-48 shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Поиск..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Catalog Props Horizontal Scroll Grid */}
          <div className="relative flex-1 overflow-y-auto">
            {filteredProps.length === 0 ? (
              <div className="py-8 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-800 text-zinc-500 text-xs">
                Объекты в этой категории не найдены.
                {activeCategory === 'custom' && (
                  <div className="mt-2">
                    <button
                      onClick={onOpenUnifiedAssets || onOpenUploadModal}
                      className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl font-semibold hover:bg-amber-500/30 transition-colors"
                    >
                      Подключить папку ассетов на диске
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-800 h-full">
                {filteredProps.map((prop) => {
                  const isSelected = selectedPropId === prop.id;
                  return (
                    <div
                      key={prop.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, prop)}
                      onClick={() => handlePlace(prop)}
                      className={`group relative shrink-0 w-28 bg-zinc-900/90 hover:bg-zinc-900 border rounded-2xl p-2 flex flex-col items-center justify-between text-center transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-105 shadow-md ${
                        isSelected
                          ? 'border-amber-400 ring-2 ring-amber-500/30 bg-amber-500/10'
                          : 'border-zinc-800/90 hover:border-amber-500/50'
                      }`}
                      title="Нажмите или перетащите на карту для размещения"
                    >
                      {/* Grid cell size tag badge */}
                      <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-zinc-950/80 border border-zinc-800 rounded-md text-[9px] font-mono text-zinc-400 group-hover:text-amber-300">
                        {prop.gridCells}
                      </span>

                      {/* Preview Image Box */}
                      <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center p-1 my-1 overflow-hidden group-hover:border-amber-500/40 transition-colors">
                        <img
                          src={prop.url}
                          alt={prop.name}
                          className="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-200"
                          loading="lazy"
                        />
                      </div>

                      {/* Item Title & Place Action */}
                      <span className="text-[11px] font-bold text-zinc-200 group-hover:text-amber-300 truncate w-full">
                        {prop.name}
                      </span>

                      <div className="w-full mt-1 pt-1 border-t border-zinc-800/60 flex items-center justify-center space-x-1 text-[10px] text-amber-400 font-semibold group-hover:opacity-100 opacity-80">
                        <Plus className="w-3 h-3" />
                        <span>На карту</span>
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
