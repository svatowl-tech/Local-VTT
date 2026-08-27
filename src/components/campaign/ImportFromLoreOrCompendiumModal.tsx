import React, { useState, useEffect } from 'react';
import { worldLoreService, DEFAULT_WORLDS } from '../../services/worldLoreService';
import { WorldLoreItem, LoreCategory } from '../../types/worldLoreTypes';
import { campaignService } from '../../services/campaignService';
import {
  Globe,
  Crown,
  Building,
  ShieldAlert,
  BookOpen,
  Search,
  Plus,
  Check,
  X,
  Sparkles,
  Layers,
  Users,
} from 'lucide-react';
import { playUniversalSfx } from '../../utils/sfxAudio';

interface Props {
  targetType: 'npc' | 'location' | 'quest' | 'all';
  onClose: () => void;
  onImported?: (type: 'npc' | 'location' | 'quest', count: number) => void;
}

export const ImportFromLoreOrCompendiumModal: React.FC<Props> = ({
  targetType,
  onClose,
  onImported,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<string>('dnd5e_faerun');
  const [activeCategory, setActiveCategory] = useState<LoreCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loreItems, setLoreItems] = useState<WorldLoreItem[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadLore();
  }, [selectedWorldId]);

  const loadLore = async () => {
    setIsLoading(true);
    try {
      const items = await worldLoreService.getLoreItems(selectedWorldId);
      setLoreItems(items || []);
    } catch (e) {
      console.error('Failed to load lore items for import:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = (item: WorldLoreItem) => {
    playUniversalSfx('item_click');
    const worldName = DEFAULT_WORLDS.find((w) => w.id === selectedWorldId)?.name || 'Лор';

    if (item.category === 'npc_figure' || targetType === 'npc') {
      campaignService.importLoreNpc(item, worldName);
      if (onImported) onImported('npc', 1);
    } else if (
      item.category === 'settlement' ||
      item.category === 'district_location' ||
      item.category === 'shop_tavern_venue' ||
      item.category === 'region_geography' ||
      targetType === 'location'
    ) {
      campaignService.importLoreLocation(item, worldName);
      if (onImported) onImported('location', 1);
    } else {
      campaignService.importLoreQuest(item, worldName);
      if (onImported) onImported('quest', 1);
    }

    setImportedIds((prev) => new Set([...prev, item.id]));
  };

  const filteredItems = loreItems.filter((item) => {
    if (activeCategory !== 'all' && item.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSummary = (item.summary || '').toLowerCase().includes(q);
      const matchTags = (item.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchSummary && !matchTags) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">
                Импорт из LoreWiki & Общей базы знаний
              </h2>
              <p className="text-xs text-zinc-400">
                Выберите персонажей, локации и статьи для прямого добавления в текущую кампанию
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar (World Selector & Filter & Search) */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-400 font-medium">Мир / Сеттинг:</span>
            <select
              value={selectedWorldId}
              onChange={(e) => setSelectedWorldId(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:border-amber-400 focus:outline-none"
            >
              {DEFAULT_WORLDS.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, тегам или лору..."
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-4 py-2 border-b border-zinc-850 bg-zinc-950 flex items-center space-x-1.5 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'all', label: 'Все', icon: Layers },
            { id: 'npc_figure', label: 'НИП / Персонажи', icon: Crown },
            { id: 'settlement', label: 'Локации / Города', icon: Building },
            { id: 'faction_cult', label: 'Фракции / Культы', icon: ShieldAlert },
            { id: 'lore_article', label: 'События и Лор', icon: BookOpen },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {isLoading ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              Загрузка базы знаний...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs">
              {searchQuery
                ? 'Ничего не найдено по вашему запросу'
                : 'В этом мире пока нет статей данной категории'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const isImported = importedIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900/90 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-300">
                            {item.name}
                          </span>
                          {item.originalName && (
                            <span className="text-[10px] text-zinc-500">
                              ({item.originalName})
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {item.category === 'npc_figure'
                            ? 'NPC'
                            : item.category === 'settlement'
                            ? 'Локация'
                            : item.category === 'faction_cult'
                            ? 'Фракция'
                            : 'Лор'}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-300 line-clamp-2 mb-2 leading-relaxed">
                        {item.summary || item.content.slice(0, 100)}
                      </p>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800/80 text-amber-400/80 border border-zinc-700/50"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">
                        {item.npcData?.race || item.settlementData?.type || item.worldName}
                      </span>
                      <button
                        onClick={() => handleImport(item)}
                        disabled={isImported}
                        className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                          isImported
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95'
                        }`}
                      >
                        {isImported ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Добавлено</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>В кампанию</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Импортировано в сессию: <strong className="text-amber-300">{importedIds.size}</strong> объектов
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
