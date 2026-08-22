import React, { useState, useEffect } from 'react';
import {
  Swords,
  Shield,
  Zap,
  Book,
  Skull,
  Sparkles,
  Folder,
  FolderPlus,
  CheckCircle2,
  FileText,
  Search,
  ChevronRight,
  Eye,
  Layers,
  Info,
  RefreshCw,
  Tag,
} from 'lucide-react';
import {
  TTRPGSystemManifest,
  SystemDataItem,
} from '../../types/systemDataTypes';
import { systemContentService } from '../../services/systemContentService';
import { SystemItemPreviewModal } from './SystemItemPreviewModal';
import { CreateSystemModal } from './CreateSystemModal';
import { UniversalDataParserModal } from './UniversalDataParserModal';

interface Props {
  onSystemChanged?: (systemId: string) => void;
}

export const SystemSelectorSection: React.FC<Props> = ({ onSystemChanged }) => {
  const [systems, setSystems] = useState<TTRPGSystemManifest[]>(() =>
    systemContentService.getSystems()
  );
  const [activeSystemId, setActiveSystemId] = useState<string>(() =>
    systemContentService.getActiveSystemId()
  );
  const [items, setItems] = useState<SystemDataItem[]>(() =>
    systemContentService.getCachedItems()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewItem, setPreviewItem] = useState<SystemDataItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isParserModalOpen, setIsParserModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Subscribe to system service updates
  useEffect(() => {
    const unsub = systemContentService.subscribe(() => {
      setSystems(systemContentService.getSystems());
      setActiveSystemId(systemContentService.getActiveSystemId());
      setItems(systemContentService.getCachedItems());
      setIsLoading(systemContentService.getIsLoading());
    });

    // Initial fetch
    systemContentService.fetchSystems();

    return unsub;
  }, []);

  const handleSelectSystem = async (sysId: string) => {
    setIsLoading(true);
    await systemContentService.setActiveSystem(sysId);
    setSelectedCategory('all');
    setSearchQuery('');
    if (onSystemChanged) {
      onSystemChanged(sysId);
    }
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await systemContentService.fetchSystems();
    setIsLoading(false);
  };

  const activeSystem =
    systems.find((s) => s.id === activeSystemId) || systems[0];

  const filteredItems = systemContentService.filterItems({
    category: selectedCategory,
    searchQuery,
  });

  const getSystemIcon = (iconName: string) => {
    switch (iconName) {
      case 'swords':
        return <Swords className="w-5 h-5" />;
      case 'shield':
        return <Shield className="w-5 h-5" />;
      case 'zap':
        return <Zap className="w-5 h-5" />;
      case 'book':
        return <Book className="w-5 h-5" />;
      case 'skull':
        return <Skull className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getThemeColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      switch (color) {
        case 'rose':
          return 'bg-rose-950/40 border-rose-500/80 text-rose-300 ring-1 ring-rose-500/50 shadow-lg shadow-rose-950/50';
        case 'amber':
          return 'bg-amber-950/40 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/50 shadow-lg shadow-amber-950/50';
        case 'cyan':
          return 'bg-cyan-950/40 border-cyan-500/80 text-cyan-300 ring-1 ring-cyan-500/50 shadow-lg shadow-cyan-950/50';
        case 'emerald':
          return 'bg-emerald-950/40 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50 shadow-lg shadow-emerald-950/50';
        case 'purple':
          return 'bg-purple-950/40 border-purple-500/80 text-purple-300 ring-1 ring-purple-500/50 shadow-lg shadow-purple-950/50';
        default:
          return 'bg-indigo-950/40 border-indigo-500/80 text-indigo-300 ring-1 ring-indigo-500/50 shadow-lg shadow-indigo-950/50';
      }
    }
    return 'bg-zinc-950/80 border-zinc-800/80 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900/60';
  };

  return (
    <div id="system-selector-section" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
            <Swords className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="font-bold text-sm text-zinc-100">Выбери ролевую систему (RPG System)</h3>
              {activeSystem && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-mono text-[10px] rounded-full border border-amber-500/30 shrink-0">
                  Активна: {activeSystem.shortName || activeSystem.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Влияет на загрузку монстров, заклинаний, рас, классов, предметов и специфичных правил из папки «systems/»
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Обновить список систем и файлов"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsParserModalOpen(true)}
            className="px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
            title="Универсальный парсер: Foundry, Roll20, 5eTools, PDF, Текст, XML"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Парсер данных / Импорт</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
            <span>Новая система</span>
          </button>
        </div>
      </div>

      {/* Systems Grid Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {systems.map((sys) => {
          const isActive = sys.id === activeSystemId;
          const totalFiles = sys.totalFiles || 0;

          return (
            <div
              key={sys.id}
              onClick={() => handleSelectSystem(sys.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 relative group ${getThemeColorClasses(
                sys.color,
                isActive
              )}`}
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl border shrink-0 ${
                      isActive
                        ? 'bg-zinc-900/90 border-zinc-700'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                    }`}
                  >
                    {getSystemIcon(sys.icon)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-zinc-100 truncate">{sys.name}</h4>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      папка: systems/{sys.folderName}
                    </span>
                  </div>
                </div>

                {isActive && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full text-[10px] font-bold flex items-center space-x-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Выбрана</span>
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                {sys.description}
              </p>

              {/* Categories & Stats */}
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                <div className="flex items-center space-x-1.5 flex-wrap">
                  <span className="font-mono text-zinc-300 font-bold">{totalFiles}</span>
                  <span>файлов</span>
                  <span className="text-zinc-600">•</span>
                  <span>{sys.categories?.length || 0} категорий</span>
                </div>

                <div className="font-medium text-amber-400/90 group-hover:translate-x-0.5 transition-transform flex items-center">
                  <span>{isActive ? 'Просмотр файлов' : 'Выбрать'}</span>
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active System Content & File Browser */}
      {activeSystem && (
        <div className="p-4 bg-zinc-950/90 border border-zinc-800 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs text-zinc-100">
                Содержимое системы «{activeSystem.name}»
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                ({items.length} файлов на диске)
              </span>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск монстров, заклинаний, правил..."
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-200 text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Все категории ({items.length})
            </button>

            {activeSystem.categories?.map((cat) => {
              const count = activeSystem.categoryStats?.[cat] || 0;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{cat}</span>
                  {count > 0 && <span className="ml-1 text-[10px] text-zinc-500">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* Items List Table / Cards */}
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl space-y-2">
              <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400">
                {searchQuery
                  ? 'Ничего не найдено по вашему запросу'
                  : `В категории «${selectedCategory}» пока нет файлов`}
              </p>
              <p className="text-[11px] text-zinc-500 font-mono">
                Поместите .json, .yaml или .md файлы в «systems/{activeSystem.folderName}/{selectedCategory !== 'all' ? selectedCategory : '...'}/»
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setPreviewItem(item)}
                  className="p-3 bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all cursor-pointer flex items-center justify-between group space-x-3"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-zinc-100 truncate group-hover:text-amber-300 transition-colors">
                        {item.name}
                      </span>
                      <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-400 font-mono text-[9px] rounded border border-zinc-700 shrink-0">
                        .{item.format}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-zinc-400 truncate">
                      <span className="text-amber-400/80">{item.category}</span>
                      {item.summary && (
                        <>
                          <span className="text-zinc-600">•</span>
                          <span className="truncate">{item.summary}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewItem(item);
                    }}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors shrink-0 cursor-pointer"
                    title="Просмотреть данные"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guide Note */}
      <div className="p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-start space-x-3 text-xs text-zinc-300">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-zinc-200">Как добавлять правила и контент:</span>
          <p className="text-[11px] text-zinc-400">
            В папке ассетов откройте каталог <code className="text-amber-300 font-mono">systems/</code>. Внутри каждой папки системы (например, <code className="text-zinc-300 font-mono">D&D_5e</code>, <code className="text-zinc-300 font-mono">Pathfinder_2e</code>, <code className="text-zinc-300 font-mono">Cyberpunk_RED</code>, <code className="text-zinc-300 font-mono">GURPS_4e</code>) создавайте папки для категорий и закидывайте <code className="text-zinc-300 font-mono">.json</code>, <code className="text-zinc-300 font-mono">.yaml</code> или <code className="text-zinc-300 font-mono">.md</code> файлы. Они мгновенно парсятся бекендом и становятся доступными в приложении.
          </p>
        </div>
      </div>

      {/* Item Inspection Preview Modal */}
      {previewItem && (
        <SystemItemPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* Create Custom System Modal */}
      {isCreateModalOpen && (
        <CreateSystemModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={(newSysId) => {
            handleSelectSystem(newSysId);
          }}
        />
      )}

      {/* Universal Data Parser & Import Modal */}
      {isParserModalOpen && (
        <UniversalDataParserModal
          isOpen={isParserModalOpen}
          onClose={() => setIsParserModalOpen(false)}
          targetSystemId={activeSystemId}
          systems={systems}
          onImportComplete={() => {
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};
