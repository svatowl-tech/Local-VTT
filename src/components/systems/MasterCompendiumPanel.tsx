import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen,
  Search,
  X,
  Sparkles,
  Swords,
  Shield,
  Zap,
  Package,
  Table as TableIcon,
  Layers,
  Flame,
  FileText,
  Filter,
  Check,
  ChevronRight,
  Code2,
  RefreshCw,
  FolderOpen,
  Dices,
  Copy,
  ExternalLink,
  Cpu,
  Pin,
} from 'lucide-react';
import {
  rustSystemSearchService,
  SystemReferenceSearchItem,
  SystemReferenceSearchResult,
} from '../../services/rustSystemSearchService';
import { MonsterCardView } from './cards/MonsterCardView';
import { SpellCardView } from './cards/SpellCardView';
import { ItemCardView } from './cards/ItemCardView';
import { TableCardView } from './cards/TableCardView';
import { RuleLoreCardView } from './cards/RuleLoreCardView';
import { initiativeEngine } from '../../services/initiativeEngine';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { copyToClipboard } from '../../utils/clipboardUtils';

interface Props {
  onOpenUniversalParser?: () => void;
  onOpenInitiative?: () => void;
  onPlaceCardOnCanvas?: (item: SystemReferenceSearchItem, importType?: 'card' | 'token') => void;
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Все', icon: Layers },
  { id: 'monsters', label: 'Монстры', icon: Swords },
  { id: 'spells', label: 'Заклинания', icon: Sparkles },
  { id: 'items', label: 'Предметы', icon: Package },
  { id: 'rules', label: 'Правила', icon: BookOpen },
  { id: 'tables', label: 'Таблицы', icon: TableIcon },
  { id: 'races', label: 'Расы/Родословные', icon: Shield },
  { id: 'classes', label: 'Классы', icon: Zap },
];

const SYSTEM_OPTIONS = [
  { id: 'all', name: 'Все системы' },
  { id: 'dnd5e', name: 'D&D 5e' },
  { id: 'pathfinder2e', name: 'Pathfinder 2e' },
  { id: 'cyberpunk_red', name: 'Cyberpunk RED' },
  { id: 'gurps', name: 'GURPS 4e' },
  { id: 'call_of_cthulhu', name: 'Call of Cthulhu' },
];

export const MasterCompendiumPanel: React.FC<Props> = ({
  onOpenUniversalParser,
  onOpenInitiative,
  onPlaceCardOnCanvas,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<SystemReferenceSearchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SystemReferenceSearchItem | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMeta, setSearchMeta] = useState<{
    elapsedMs: number;
    totalMatches: number;
    engine: string;
    categoryCounts: Record<string, number>;
  }>({
    elapsedMs: 0,
    totalMatches: 0,
    engine: 'Rust Engine',
    categoryCounts: {},
  });
  const [viewRawJson, setViewRawJson] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 2500);
  };

  // Perform search with debounce
  const executeSearch = useCallback(
    async (query: string, systemId: string, category: string) => {
      setIsSearching(true);
      try {
        const res: SystemReferenceSearchResult = await rustSystemSearchService.search({
          query,
          systemId: systemId === 'all' ? undefined : systemId,
          category: category === 'all' ? undefined : category,
          limit: 80,
        });

        if (res && res.success) {
          setSearchResults(res.results);
          setSearchMeta({
            elapsedMs: res.elapsedMs,
            totalMatches: res.totalMatches,
            engine: res.engine,
            categoryCounts: res.categoryCounts || {},
          });

          // Select first item if current selection is invalid or null
          if (res.results.length > 0) {
            setSelectedItem((prev) => {
              if (prev && res.results.some((r) => r.id === prev.id)) {
                return res.results.find((r) => r.id === prev.id) || res.results[0];
              }
              return res.results[0];
            });
          } else {
            setSelectedItem(null);
          }
        }
      } catch (err) {
        console.error('MasterCompendiumPanel search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  // Trigger search on parameter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(searchQuery, selectedSystem, selectedCategory);
    }, 90);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, selectedSystem, selectedCategory, executeSearch]);

  // Handle adding monster directly to initiative combat tracker
  const handleSendToInitiative = (item: SystemReferenceSearchItem) => {
    initiativeEngine.addSystemEntityToEncounter(item);
    showToast(`«${item.name}» добавлен в трекер инициативы!`);
    playUniversalSfx('success');
    if (onOpenInitiative) {
      onOpenInitiative();
    }
  };

  // Handle rolling dice from card
  const handleRollDice = (expression: string, label: string) => {
    showToast(`Бросок кубика ${expression} для ${label}`);
  };

  // Handle copy JSON / text
  const handleCopyCard = (item: SystemReferenceSearchItem) => {
    const textToCopy = JSON.stringify(item.data || item, null, 2);
    copyToClipboard(textToCopy);
    showToast('Данные карточки скопированы в буфер обмена!');
    playUniversalSfx('click');
  };

  // Render proper card view based on category or content
  const renderCardDetail = () => {
    if (!selectedItem) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 p-8 text-center select-none">
          <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800 text-zinc-400">
            <BookOpen className="w-8 h-8 opacity-40" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-zinc-300">Ничего не выбрано</h4>
            <p className="text-xs text-zinc-500 max-w-xs mt-1">
              Введите поисковый запрос или выберите карточку из списка слева для просмотра параметров.
            </p>
          </div>
        </div>
      );
    }

    if (viewRawJson) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-amber-400">{selectedItem.relativePath}</span>
            <button
              onClick={() => handleCopyCard(selectedItem)}
              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Копировать JSON</span>
            </button>
          </div>
          <pre className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-emerald-400 font-mono text-[11px] overflow-auto max-h-[60vh] select-text">
            {JSON.stringify(selectedItem.data || selectedItem, null, 2)}
          </pre>
        </div>
      );
    }

    const cat = selectedItem.category.toLowerCase();
    if (cat === 'monsters' || cat === 'bestiary' || cat === 'npcs') {
      return (
        <MonsterCardView
          item={selectedItem}
          onSendToInitiative={handleSendToInitiative}
          onRollDice={handleRollDice}
          onPlaceOnCanvas={onPlaceCardOnCanvas}
        />
      );
    }

    if (cat === 'spells' || cat === 'magic') {
      return (
        <SpellCardView
          item={selectedItem}
          onRollDice={handleRollDice}
          onPlaceOnCanvas={onPlaceCardOnCanvas}
        />
      );
    }

    if (cat === 'items' || cat === 'equipment' || cat === 'cyberware') {
      return (
        <ItemCardView
          item={selectedItem}
          onRollDice={handleRollDice}
          onPlaceOnCanvas={onPlaceCardOnCanvas}
        />
      );
    }

    if (cat === 'tables' || selectedItem.tableData) {
      return (
        <TableCardView
          item={selectedItem}
          onRollDice={handleRollDice}
          onPlaceOnCanvas={onPlaceCardOnCanvas}
        />
      );
    }

    return (
      <RuleLoreCardView
        item={selectedItem}
        onRollDice={handleRollDice}
        onPlaceOnCanvas={onPlaceCardOnCanvas}
      />
    );
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'monsters':
      case 'bestiary':
        return <Swords className="w-3.5 h-3.5 text-rose-400" />;
      case 'spells':
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
      case 'items':
      case 'equipment':
        return <Package className="w-3.5 h-3.5 text-amber-400" />;
      case 'tables':
        return <TableIcon className="w-3.5 h-3.5 text-emerald-400" />;
      case 'races':
      case 'classes':
        return <Shield className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <BookOpen className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div
      id="master-compendium-panel-root"
      className="flex flex-col h-full bg-zinc-950 text-zinc-100 text-xs overflow-hidden select-none"
    >
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-amber-500 text-zinc-950 font-bold px-4 py-2 text-center text-xs flex items-center justify-center space-x-2 animate-bounce shadow-lg z-50">
          <Sparkles className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Search Controls Bar */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        {/* Left branding and fast Rust status */}
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm text-zinc-100 truncate">Справочник мастера</h3>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-semibold rounded-md text-[10px] shrink-0 flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-emerald-400" />
                <span>{searchMeta.engine} • {searchMeta.elapsedMs} ms</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate">
              Мгновенный поиск по бестиарию, заклинаниям, предметам и правилам систем
            </p>
          </div>
        </div>

        {/* Right actions: System Select & Parser Link */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* System Select Dropdown */}
          <select
            value={selectedSystem}
            onChange={(e) => setSelectedSystem(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-3 py-1.5 focus:outline-hidden focus:border-amber-500 cursor-pointer font-medium"
          >
            {SYSTEM_OPTIONS.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.name}
              </option>
            ))}
          </select>

          {onOpenUniversalParser && (
            <button
              onClick={onOpenUniversalParser}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Импортировать файлы систем (Foundry, 5eTools, GURPS, PDF, Markdown)"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Импорт / Парсер</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input and Category Filters Bar */}
      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40 flex flex-col gap-2 shrink-0">
        {/* Search Bar Input */}
        <div className="relative flex items-center w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск монстров (гоблин), заклинаний (огненный шар), предметов, таблиц, характеристик (CR 1/4)..."
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-amber-500 rounded-xl pl-9 pr-8 py-2 text-xs text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 p-1 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
          {CATEGORY_TABS.map((cat) => {
            const Icon = cat.icon;
            const count =
              cat.id === 'all'
                ? searchMeta.totalMatches
                : searchMeta.categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center space-x-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold shadow-xs'
                    : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? 'bg-amber-500/30 text-amber-200' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Two-Column Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Results List Pane */}
        <div className="w-full sm:w-80 md:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950/60 shrink-0">
          <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/30">
            <span>
              Найдено: <strong className="text-zinc-200">{searchResults.length}</strong> карточек
            </span>
            {isSearching && (
              <span className="text-amber-400 flex items-center space-x-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Поиск...</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/80 p-1.5 space-y-1">
            {searchResults.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 space-y-2">
                <p>Ничего не найдено по запросу «{searchQuery}»</p>
                <p className="text-[10px] text-zinc-600">
                  Попробуйте изменить категорию или поисковые слова.
                </p>
              </div>
            ) : (
              searchResults.map((item, idx) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(
                        'application/json',
                        JSON.stringify({
                          type: 'aethermap_compendium_card',
                          item,
                        })
                      );
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => {
                      setSelectedItem(item);
                      playUniversalSfx('click');
                    }}
                    className={`group/item p-2.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-2.5 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/40 text-zinc-100 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="p-1.5 bg-zinc-950 rounded-lg border border-zinc-800 shrink-0 mt-0.5">
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-semibold text-xs text-zinc-100 truncate">{item.name}</h4>
                        <div className="flex items-center space-x-1 shrink-0">
                          {onPlaceCardOnCanvas && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                playUniversalSfx('success');
                                onPlaceCardOnCanvas(item);
                                showToast(`Карточка «${item.name}» закреплена на столе`);
                              }}
                              className="p-1 opacity-0 group-hover/item:opacity-100 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded-md transition-all cursor-pointer"
                              title="Поместить карточку на рабочий стол карты"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-400">
                            {item.systemName}
                          </span>
                        </div>
                      </div>

                      {item.snippet ? (
                        <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5 font-sans leading-relaxed">
                          {item.snippet}
                        </p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{item.summary}</p>
                      )}

                      <div className="flex items-center space-x-1.5 mt-1.5">
                        <span className="px-1.5 py-0.2 bg-zinc-950 text-amber-400/90 rounded-sm text-[9px] font-semibold uppercase border border-zinc-800/80">
                          {item.category}
                        </span>
                        {item.stats?.cr && (
                          <span className="px-1.5 py-0.2 bg-rose-950/40 text-rose-300 rounded-sm text-[9px] font-semibold border border-rose-800/40">
                            CR {item.stats.cr}
                          </span>
                        )}
                        {item.stats?.level !== undefined && (
                          <span className="px-1.5 py-0.2 bg-cyan-950/40 text-cyan-300 rounded-sm text-[9px] font-semibold border border-cyan-800/40">
                            {item.stats.level === 0 ? 'Заговор' : `${item.stats.level} круг`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail Pane */}
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden">
          {/* Detail Toolbar */}
          {selectedItem && (
            <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40 shrink-0">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="text-zinc-400 text-[11px] shrink-0">Просмотр карточки:</span>
                <span className="font-semibold text-zinc-200 text-xs truncate max-w-xs">
                  {selectedItem.name}
                </span>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {onPlaceCardOnCanvas && (
                  <button
                    onClick={() => {
                      playUniversalSfx('success');
                      onPlaceCardOnCanvas(selectedItem);
                      showToast(`Карточка «${selectedItem.name}» закреплена на столе`);
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-[11px] flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                    title="Поместить эту карточку на рабочий стол рядом с картой"
                  >
                    <Pin className="w-3.5 h-3.5" />
                    <span>На рабочий стол</span>
                  </button>
                )}
                <button
                  onClick={() => setViewRawJson(!viewRawJson)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                    viewRawJson
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{viewRawJson ? 'Карточка' : 'JSON'}</span>
                </button>
                <button
                  onClick={() => handleCopyCard(selectedItem)}
                  className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
                  title="Скопировать"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Card Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">{renderCardDetail()}</div>
        </div>
      </div>
    </div>
  );
};
