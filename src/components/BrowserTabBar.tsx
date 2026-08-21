import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Copy,
  Edit2,
  FileText,
  Sparkles,
  Sliders,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Eye,
  Grid,
  CloudFog,
  Layers,
  MapPin,
  Upload,
  FolderArchive,
  Save,
} from 'lucide-react';
import { WorkspaceTab, PlayerTransitionConfig, MapItem } from '../types';
import { TAB_ICONS, TAB_COLORS } from '../services/tabStateManager';
import { TabNotesModal } from './TabNotesModal';
import { TabTransitionSettingsModal } from './TabTransitionSettingsModal';

interface BrowserTabBarProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  playerTransition?: PlayerTransitionConfig;
  onSwitchTab: (tabId: string) => void;
  onCreateTab: (name?: string, icon?: string, fromMap?: MapItem) => void;
  onDuplicateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, name: string, icon?: string, color?: string) => void;
  onUpdateTabNotes: (tabId: string, notes: string) => void;
  onUpdateTransitionConfig: (partial: Partial<PlayerTransitionConfig>) => void;
  onOpenMapCatalog?: () => void;
  onOpenUploadModal?: () => void;
  onOpenVault?: () => void;
  onSaveCurrentTabToVault?: () => void;
}

export const BrowserTabBar: React.FC<BrowserTabBarProps> = ({
  tabs,
  activeTabId,
  playerTransition = {
    enabled: true,
    type: 'cinematic-fade',
    durationMs: 500,
    showLocationTitle: true,
  },
  onSwitchTab,
  onCreateTab,
  onDuplicateTab,
  onCloseTab,
  onRenameTab,
  onUpdateTabNotes,
  onUpdateTransitionConfig,
  onOpenMapCatalog,
  onOpenUploadModal,
  onOpenVault,
  onSaveCurrentTabToVault,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenuTabId, setContextMenuTabId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showNewTabMenu, setShowNewTabMenu] = useState(false);
  const [newTabMenuPos, setNewTabMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [iconPickerTabId, setIconPickerTabId] = useState<string | null>(null);
  const [iconPickerPos, setIconPickerPos] = useState<{ x: number; y: number } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Scroll active tab into view when switched
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector(`[data-tab-id="${activeTabId}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeTabId]);

  // Global keyboard shortcuts for tabs (Ctrl+1..9, Ctrl+T, Ctrl+W)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting inside inputs/textareas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        // Ctrl + 1..9
        const keyNum = parseInt(e.key, 10);
        if (!isNaN(keyNum) && keyNum >= 1 && keyNum <= 9) {
          const targetTab = tabs[keyNum - 1];
          if (targetTab) {
            e.preventDefault();
            onSwitchTab(targetTab.id);
          }
        }
        // Ctrl + T (New Tab)
        else if (e.key.toLowerCase() === 't') {
          e.preventDefault();
          onCreateTab(`Сцена ${tabs.length + 1}`);
        }
        // Ctrl + W (Close Active Tab)
        else if (e.key.toLowerCase() === 'w') {
          e.preventDefault();
          if (tabs.length > 1 && activeTab) {
            onCloseTab(activeTab.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTab, onSwitchTab, onCreateTab, onCloseTab]);

  // Close menus on outside click or resize
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuTabId(null);
      setShowNewTabMenu(false);
      setIconPickerTabId(null);
    };
    const handleWindowResize = () => {
      setContextMenuTabId(null);
      setShowNewTabMenu(false);
      setIconPickerTabId(null);
    };

    window.addEventListener('click', handleClickOutside);
    window.addEventListener('resize', handleWindowResize);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  const handleStartRename = (tab: WorkspaceTab, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTabId(tab.id);
    setEditName(tab.name);
    setContextMenuTabId(null);
  };

  const handleFinishRename = (tabId: string) => {
    if (editName.trim()) {
      onRenameTab(tabId, editName.trim());
    }
    setEditingTabId(null);
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleContextMenu = (tabId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuTabId(tabId);
    setContextMenuPos({ x: Math.min(e.clientX, window.innerWidth - 240), y: Math.min(e.clientY + 8, window.innerHeight - 300) });
  };

  const handleOpenIconPicker = (tabId: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setIconPickerPos({
      x: Math.min(rect.left, window.innerWidth - 240),
      y: rect.bottom + 6,
    });
    setIconPickerTabId(iconPickerTabId === tabId ? null : tabId);
  };

  const handleOpenNewTabMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setNewTabMenuPos({
      x: Math.min(rect.left, window.innerWidth - 300),
      y: rect.bottom + 6,
    });
    setShowNewTabMenu((v) => !v);
  };

  return (
    <div
      id="browser-tab-bar"
      className="relative flex items-center justify-between bg-neutral-950 border-b border-neutral-800/90 select-none z-30 h-10 px-2 shadow-inner"
    >
      {/* Scroll Left Button */}
      <button
        type="button"
        id="tabs-scroll-left-btn"
        onClick={() => handleScroll('left')}
        className="text-neutral-500 hover:text-neutral-200 p-1 hover:bg-neutral-800 rounded transition-colors hidden sm:flex items-center justify-center mr-1"
        title="Прокрутить вкладки влево"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center space-x-1 overflow-x-auto no-scrollbar scroll-smooth py-1"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;
          const hasFog = tab.fog?.enabled;
          const hasGrid = tab.grid?.enabled;
          const hasNotes = Boolean(tab.notes?.trim());

          return (
            <div
              key={tab.id}
              data-tab-id={tab.id}
              id={`workspace-tab-${tab.id}`}
              onClick={() => onSwitchTab(tab.id)}
              onDoubleClick={(e) => handleStartRename(tab, e)}
              onContextMenu={(e) => handleContextMenu(tab.id, e)}
              className={`group relative flex items-center h-8 px-3 rounded-t-lg transition-all cursor-pointer max-w-[240px] min-w-[130px] border-t border-x ${
                isActive
                  ? 'bg-neutral-900 border-neutral-700/80 text-neutral-100 shadow-sm'
                  : 'bg-neutral-950/60 border-transparent text-neutral-400 hover:bg-neutral-900/50 hover:text-neutral-200 hover:border-neutral-800'
              }`}
            >
              {/* Tab Color Accent Bar */}
              {tab.color && (
                <div
                  className="absolute top-0 left-2 right-2 h-[2px] rounded-full transition-opacity"
                  style={{
                    backgroundColor: tab.color,
                    opacity: isActive ? 1 : 0.4,
                  }}
                />
              )}

              {/* Tab Icon / Emoji */}
              <button
                type="button"
                onClick={(e) => handleOpenIconPicker(tab.id, e)}
                className="mr-1.5 text-sm hover:scale-110 transition-transform cursor-pointer p-0.5 rounded"
                title="Сменить иконку сцены"
              >
                {tab.icon || '🗺️'}
              </button>

              {/* Tab Name or Inline Edit */}
              <div className="flex-1 min-w-0 mr-1.5">
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleFinishRename(tab.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleFinishRename(tab.id);
                      if (e.key === 'Escape') setEditingTabId(null);
                    }}
                    autoFocus
                    className="w-full bg-neutral-950 text-xs text-white px-1.5 py-0.5 rounded border border-amber-500 outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-medium truncate">{tab.name}</span>
                    {hasNotes && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                        title="Есть заметки мастера к этой сцене"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Status Mini Icons */}
              <div className="flex items-center space-x-1 text-neutral-500 opacity-60 group-hover:opacity-100 transition-opacity mr-1">
                {hasFog && (
                  <span title="Туман войны активен" className="flex items-center">
                    <CloudFog className="w-2.5 h-2.5 text-blue-400" />
                  </span>
                )}
                {hasGrid && (
                  <span title="Сетка включена" className="flex items-center">
                    <Grid className="w-2.5 h-2.5 text-neutral-400" />
                  </span>
                )}
              </div>

              {/* Close Button */}
              {tabs.length > 1 && (
                <button
                  type="button"
                  id={`tab-close-btn-${tab.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className={`p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-opacity ${
                    isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70'
                  }`}
                  title="Закрыть вкладку сцены (Ctrl+W)"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        {/* New Tab Button */}
        <button
          type="button"
          id="tab-create-new-btn"
          onClick={handleOpenNewTabMenu}
          className="flex items-center justify-center w-7 h-7 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors ml-1 shrink-0 active:scale-95"
          title="Добавить подготовленную карту/сцену (Ctrl+T)"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        id="tabs-scroll-right-btn"
        onClick={() => handleScroll('right')}
        className="text-neutral-500 hover:text-neutral-200 p-1 hover:bg-neutral-800 rounded transition-colors hidden sm:flex items-center justify-center ml-1 mr-2"
        title="Прокрутить вкладки вправо"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>

      {/* Right Side Utilities: Notes, Player Transition settings */}
      <div className="flex items-center space-x-1.5 shrink-0 pl-2 border-l border-neutral-800">
        {/* GM Notes for Active Scene */}
        <button
          type="button"
          id="tab-active-notes-btn"
          onClick={() => setShowNotesModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            activeTab?.notes?.trim()
              ? 'bg-amber-950/50 text-amber-300 border border-amber-500/40 hover:bg-amber-900/50'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
          }`}
          title="Личные заметки Мастера к текущей сцене"
        >
          <FileText className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Заметки к карте</span>
          {activeTab?.notes?.trim() && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Player Screen Smooth Transition Settings */}
        <button
          type="button"
          id="tab-player-transition-btn"
          onClick={() => setShowTransitionModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
            playerTransition?.enabled
              ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
          }`}
          title="Настройка плавного переключения локаций для игроков"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Переход:</span>
          <span className="text-[11px] text-amber-400 font-mono hidden sm:inline">
            {playerTransition?.enabled ? `${playerTransition.durationMs}мс` : 'Выкл'}
          </span>
        </button>

        {/* Tab Count Badge */}
        <div className="text-[11px] text-neutral-500 font-mono px-1">
          {tabs.findIndex((t) => t.id === activeTabId) + 1}/{tabs.length}
        </div>
      </div>

      {/* Floating New Tab Dropdown Popover (Never clipped by overflow) */}
      {showNewTabMenu && newTabMenuPos && (
        <div
          id="new-tab-menu-dropdown"
          className="fixed w-72 bg-neutral-900/98 backdrop-blur-md border border-neutral-700/90 rounded-xl shadow-2xl py-1.5 z-[9999] text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: newTabMenuPos.y, left: newTabMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 mb-1 flex items-center justify-between">
            <span>Добавить сцену / карту</span>
            <span className="text-neutral-500 font-normal">Ctrl+T</span>
          </div>

          {onOpenVault && (
            <button
              type="button"
              id="new-tab-open-vault-btn"
              onClick={() => {
                setShowNewTabMenu(false);
                onOpenVault();
              }}
              className="w-full px-3 py-2 text-left hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-100 transition-colors group"
            >
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 group-hover:bg-amber-500/20 shrink-0">
                <FolderArchive className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-amber-300">Хранилище готовых карт...</div>
                <div className="text-[10px] text-neutral-400 truncate">Открыть сохраненную локацию или пресет</div>
              </div>
            </button>
          )}

          {onOpenMapCatalog && (
            <button
              type="button"
              id="new-tab-open-catalog-btn"
              onClick={() => {
                setShowNewTabMenu(false);
                onOpenMapCatalog();
              }}
              className="w-full px-3 py-2 text-left hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-100 transition-colors group"
            >
              <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-emerald-300">Выбрать из Библиотеки карт...</div>
                <div className="text-[10px] text-neutral-400 truncate">Готовые карты подземелий, городов и таверн</div>
              </div>
            </button>
          )}

          {onOpenUploadModal && (
            <button
              type="button"
              id="new-tab-open-upload-btn"
              onClick={() => {
                setShowNewTabMenu(false);
                onOpenUploadModal();
              }}
              className="w-full px-3 py-2 text-left hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-100 transition-colors group"
            >
              <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 group-hover:bg-amber-500/20 shrink-0">
                <Upload className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-amber-300">Загрузить свою карту с диска...</div>
                <div className="text-[10px] text-neutral-400 truncate">PNG, JPG, WebP или анимированное MP4</div>
              </div>
            </button>
          )}

          <button
            type="button"
            id="new-tab-duplicate-btn"
            onClick={() => {
              setShowNewTabMenu(false);
              if (activeTab) onDuplicateTab(activeTab.id);
            }}
            className="w-full px-3 py-2 text-left hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-100 transition-colors group border-t border-neutral-800 mt-1"
          >
            <div className="p-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 group-hover:bg-blue-500/20 shrink-0">
              <Copy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-blue-300">Дублировать текущую сцену</div>
              <div className="text-[10px] text-neutral-400 truncate">Копия со всеми токенами, туманом и сеткой</div>
            </div>
          </button>

          <button
            type="button"
            id="new-tab-blank-btn"
            onClick={() => {
              setShowNewTabMenu(false);
              onCreateTab(`Сцена ${tabs.length + 1}`);
            }}
            className="w-full px-3 py-2 text-left hover:bg-neutral-800/80 flex items-center gap-2.5 text-neutral-100 transition-colors group border-t border-neutral-800 mt-1"
          >
            <div className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-300 group-hover:bg-neutral-700 shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-xs text-neutral-200">Новая пустая сцена</div>
              <div className="text-[10px] text-neutral-400 truncate">Чистый стол с сеткой без фоновой карты</div>
            </div>
          </button>
        </div>
      )}

      {/* Tab Context Menu */}
      {contextMenuTabId && contextMenuPos && (
        <div
          id="tab-context-menu"
          className="fixed bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl py-1.5 z-[9999] text-xs text-neutral-200 w-56 animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenuPos.y, left: contextMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const targetTab = tabs.find((t) => t.id === contextMenuTabId);
            if (!targetTab) return null;

            return (
              <>
                <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800 mb-1 flex items-center justify-between">
                  <span className="truncate max-w-[150px]">{targetTab.name}</span>
                  <span className="text-sm">{targetTab.icon || '🗺️'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartRename(targetTab)}
                  className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Переименовать</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContextMenuTabId(null);
                    onDuplicateTab(targetTab.id);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Дублировать сцену</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setContextMenuTabId(null);
                    onSwitchTab(targetTab.id);
                    setShowNotesModal(true);
                  }}
                  className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Заметки Мастера к сцене</span>
                </button>

                {onSaveCurrentTabToVault && (
                  <button
                    type="button"
                    onClick={() => {
                      setContextMenuTabId(null);
                      onSwitchTab(targetTab.id);
                      onSaveCurrentTabToVault();
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-neutral-800 flex items-center gap-2 text-amber-300 border-t border-neutral-800 mt-1"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-400" />
                    <span>Сохранить в Хранилище...</span>
                  </button>
                )}

                {/* Color Selection Palette */}
                <div className="px-3 py-2 border-t border-neutral-800 mt-1">
                  <div className="text-[10px] text-neutral-400 mb-1.5">Цветовой маркер:</div>
                  <div className="flex items-center gap-1.5">
                    {TAB_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => {
                          onRenameTab(targetTab.id, targetTab.name, targetTab.icon, col);
                          setContextMenuTabId(null);
                        }}
                        className="w-4 h-4 rounded-full border border-white/20 hover:scale-125 transition-transform"
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setContextMenuTabId(null);
                      onCloseTab(targetTab.id);
                    }}
                    className="w-full px-3 py-1.5 text-left hover:bg-red-950/60 text-red-400 border-t border-neutral-800 mt-1 flex items-center gap-2"
                  >
                    <X className="w-3.5 h-3.5 text-red-400" />
                    <span>Закрыть сцену</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Emoji / Icon Quick Picker Popover (Fixed coordinates, never clipped) */}
      {iconPickerTabId && iconPickerPos && (
        <div
          id="tab-icon-picker-dropdown"
          className="fixed bg-neutral-900/98 backdrop-blur-md border border-neutral-700 rounded-xl shadow-2xl p-2.5 z-[9999] animate-in fade-in zoom-in-95 duration-100 w-56"
          style={{
            top: iconPickerPos.y,
            left: iconPickerPos.x,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-[11px] font-semibold text-neutral-400 mb-2">Выберите иконку сцены:</div>
          <div className="grid grid-cols-5 gap-2 text-xl">
            {TAB_ICONS.map((icon) => {
              const target = tabs.find((t) => t.id === iconPickerTabId);
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => {
                    if (target) onRenameTab(target.id, target.name, icon, target.color);
                    setIconPickerTabId(null);
                  }}
                  className="w-8 h-8 rounded hover:bg-neutral-800 flex items-center justify-center transition-colors hover:scale-110 active:scale-95"
                >
                  {icon}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes Modal */}
      <TabNotesModal
        tab={activeTab}
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        onSaveNotes={onUpdateTabNotes}
      />

      {/* Transition Settings Modal */}
      <TabTransitionSettingsModal
        isOpen={showTransitionModal}
        onClose={() => setShowTransitionModal(false)}
        config={playerTransition}
        onUpdateConfig={onUpdateTransitionConfig}
      />
    </div>
  );
};

