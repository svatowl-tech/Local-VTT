import React, { useState, useEffect, useCallback } from 'react';
import {
  WorldLoreItem,
  LoreCategory,
  WorldDefinition,
} from '../../types/worldLoreTypes';
import { worldLoreService, DEFAULT_WORLDS } from '../../services/worldLoreService';
import { SystemReferenceSearchItem } from '../../services/rustSystemSearchService';
import { playUniversalSfx } from '../../utils/sfxAudio';
import {
  Globe,
  MapPin,
  Users,
  ShieldAlert,
  BookOpen,
  Sparkles,
  Search,
  Pin,
  Plus,
  Copy,
  Check,
  ChevronRight,
  Trash2,
  Edit3,
  ExternalLink,
  Layers,
  Building,
  Crown,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaJsonGenerateButton } from '../polza/PolzaJsonGenerateButton';
import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';
import { PolzaEntityContext } from '../../types/polzaTypes';

interface Props {
  onPlaceLoreOnCanvas?: (item: WorldLoreItem) => void;
  onPlaceImageOnCanvas?: (imageUrl: string, name: string) => void;
  onOpenRuleItemInCompendium?: (ruleId: string) => void;
}

const LORE_CATEGORIES: Array<{ id: LoreCategory | 'all'; label: string; icon: any; color: string }> = [
  { id: 'all', label: 'Все записи', icon: Globe, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { id: 'world_overview', label: 'Обзор и Боги', icon: BookOpen, color: 'text-indigo-400 border-indigo-500/40 bg-indigo-500/10' },
  { id: 'settlement', label: 'Города и Регионы', icon: Building, color: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  { id: 'npc_figure', label: 'НИП и Правители', icon: Crown, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
  { id: 'faction_cult', label: 'Фракции и Культы', icon: ShieldAlert, color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
  { id: 'demographics_race', label: 'Расы и Демография', icon: Users, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
  { id: 'lore_article', label: 'Хроники и Лор', icon: Layers, color: 'text-zinc-300 border-zinc-700 bg-zinc-800' },
];

export const MasterLoreWikiPanel: React.FC<Props> = ({
  onPlaceLoreOnCanvas,
  onPlaceImageOnCanvas,
  onOpenRuleItemInCompendium,
}) => {
  const [selectedWorldId, setSelectedWorldId] = useState<string>('dnd5e_faerun');
  const [selectedCategory, setSelectedCategory] = useState<LoreCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loreItems, setLoreItems] = useState<WorldLoreItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<WorldLoreItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Article Edit / Create Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<Partial<WorldLoreItem> | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await worldLoreService.searchLore(searchQuery, selectedWorldId, selectedCategory);
      setLoreItems(results);
      if (results.length > 0 && (!selectedItem || !results.some((r) => r.id === selectedItem.id))) {
        setSelectedItem(results[0]);
      }
    } catch (err) {
      console.error('Failed to load lore items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedWorldId, selectedCategory, selectedItem]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const currentWorldDef = DEFAULT_WORLDS.find((w) => w.id === selectedWorldId) || DEFAULT_WORLDS[0];

  const handleOpenCreateArticle = () => {
    setEditingItem({
      id: `lore-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      worldId: selectedWorldId,
      worldName: currentWorldDef.name,
      systemId: currentWorldDef.systemId,
      name: '',
      category: selectedCategory !== 'all' ? selectedCategory : 'npc_figure',
      summary: '',
      content: '',
      tags: [selectedWorldId],
      imageUrl: '',
      gmNotes: '',
    });
    setIsEditModalOpen(true);
    playUniversalSfx('click');
  };

  const handleSaveEditingArticle = async () => {
    if (!editingItem || !editingItem.name?.trim()) {
      showToast('Укажите название статьи/НИП!');
      return;
    }
    const itemToSave: WorldLoreItem = {
      id: editingItem.id || `lore-${Date.now()}`,
      worldId: selectedWorldId,
      worldName: currentWorldDef.name,
      systemId: currentWorldDef.systemId,
      name: editingItem.name.trim(),
      originalName: editingItem.originalName,
      category: editingItem.category || 'lore_article',
      summary: editingItem.summary?.trim() || editingItem.name,
      content: editingItem.content?.trim() || editingItem.name,
      tags: editingItem.tags || [selectedWorldId],
      imageUrl: editingItem.imageUrl,
      gmNotes: editingItem.gmNotes,
    };

    await worldLoreService.saveItem(itemToSave);
    setIsEditModalOpen(false);
    setEditingItem(null);
    setSelectedItem(itemToSave);
    await loadItems();
    playUniversalSfx('success');
    showToast(`Статья «${itemToSave.name}» сохранена на диск!`);
  };

  const handleDeleteArticle = async (item: WorldLoreItem) => {
    if (!confirm(`Удалить статью «${item.name}» с диска?`)) return;
    playUniversalSfx('click');
    await worldLoreService.deleteItem(item.id, selectedWorldId);
    setSelectedItem(null);
    await loadItems();
    showToast(`Запись «${item.name}» удалена`);
  };

  const renderContentWithLinks = (content: string) => {
    // Process markdown-like headers and wiki cross links [[type:id|Label]]
    const lines = content.split('\n');
    return lines.map((line, lIdx) => {
      let trimmed = line.trim();
      if (!trimmed) return <div key={lIdx} className="h-2" />;

      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={lIdx} className="text-base font-bold text-amber-300 border-b border-amber-500/20 pb-1 mt-3 mb-2">
            {trimmed.replace('# ', '')}
          </h1>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={lIdx} className="text-sm font-semibold text-emerald-300 mt-2 mb-1">
            {trimmed.replace('## ', '')}
          </h2>
        );
      }
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={lIdx} className="text-xs font-semibold text-cyan-300 mt-2 mb-1">
            {trimmed.replace('### ', '')}
          </h3>
        );
      }

      // Convert [[link]]
      const linkRegex = /\[\[([a-zA-Z0-9_-]+):([a-zA-Z0-9_-]+)\|([^\]]+)\]\]/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = linkRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        const [full, linkType, linkId, label] = match;

        parts.push(
          <button
            key={`${lIdx}-${match.index}`}
            onClick={async () => {
              playUniversalSfx('click');
              if (linkType === 'rule' || linkType === 'rule_item') {
                if (onOpenRuleItemInCompendium) onOpenRuleItemInCompendium(linkId);
              } else {
                const targetLore = await worldLoreService.getItemById(linkId);
                if (targetLore) {
                  setSelectedItem(targetLore);
                } else {
                  showToast(`Запись «${label}» не найдена`);
                }
              }
            }}
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 mx-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/40 font-semibold text-[11px] transition-all cursor-pointer"
          >
            <Globe className="w-3 h-3 text-amber-400" />
            <span>{label}</span>
          </button>
        );

        lastIndex = match.index + full.length;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <p key={lIdx} className="text-xs text-zinc-300 leading-relaxed my-1">
          {parts}
        </p>
      );
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans border border-zinc-800 rounded-xl overflow-hidden select-none">
      {/* Top Header & World Switcher */}
      <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-lg text-amber-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-amber-300 truncate">Справочник Миров и Лор Вики</h2>
            <p className="text-[11px] text-zinc-400 truncate">База знаний, городов, НИП и культов</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* World Dropdown */}
          <select
            value={selectedWorldId}
            onChange={(e) => {
              setSelectedWorldId(e.target.value);
              playUniversalSfx('click');
            }}
            className="px-2.5 py-1.5 bg-zinc-900 border border-amber-500/30 text-amber-300 font-bold text-xs rounded-lg focus:outline-none focus:border-amber-400 cursor-pointer max-w-[200px] truncate"
          >
            {DEFAULT_WORLDS.map((w) => (
              <option key={w.id} value={w.id} className="bg-zinc-950 text-zinc-100">
                {w.name}
              </option>
            ))}
          </select>

          {/* Polza AI JSON Generator */}
          <PolzaJsonGenerateButton
            entityType={selectedCategory === 'npc_figure' ? 'npc' : selectedCategory === 'settlement' ? 'location' : 'lore'}
            initialOptions={{
              worldId: selectedWorldId,
            }}
            onGenerated={async () => {
              await loadItems();
              showToast('Запись от Polza AI успешно добавлена в лор!');
            }}
            label="Сгенерировать в Polza AI"
          />

          {/* Create Article / NPC Button */}
          <button
            onClick={handleOpenCreateArticle}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
            title="Создать новую статью, НИП, город или фракцию"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Создать статью</span>
          </button>
        </div>
      </div>

      {/* Main Filter & Category Bar */}
      <div className="p-2 bg-zinc-900/40 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1 py-0.5 max-w-full">
          {LORE_CATEGORIES.map((cat) => {
            const IconC = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  playUniversalSfx('click');
                }}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs'
                    : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
              >
                <IconC className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative w-48 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по лору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Category-Specific Polza AI Fast Inline Generator */}
      <div className="px-3 py-2 bg-gradient-to-r from-amber-500/10 via-zinc-900 to-amber-500/10 border-b border-amber-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-300 shrink-0">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Быстрая генерация в Лор Вики:</span>
        </div>

        <div className="flex-1 max-w-xl">
          <PolzaQuickInlineGenerator
            entityType={
              selectedCategory === 'settlement'
                ? 'location'
                : selectedCategory === 'npc_figure'
                ? 'npc'
                : 'lore'
            }
            initialOptions={{
              worldId: selectedWorldId,
              loreCategory: selectedCategory === 'all' ? 'world_overview' : selectedCategory,
            }}
            placeholder={
              selectedCategory === 'settlement'
                ? 'Название города, столицы или региона...'
                : selectedCategory === 'npc_figure'
                ? 'Имя НИП, раса, должность или роль...'
                : selectedCategory === 'faction_cult'
                ? 'Название фракции, клана или культа...'
                : selectedCategory === 'demographics_race'
                ? 'Название и особенность древней расы...'
                : 'Концепт божества, города, НИП или предания...'
            }
            buttonLabel="Сгенерировать в Вики"
            onGenerated={async (result) => {
              await loadItems();
              if (result.loreItem) {
                setSelectedItem(result.loreItem);
              }
              showToast(`✓ "${result.name}" добавлена в вашу Вики!`);
            }}
          />
        </div>
      </div>

      {/* Split Content Body */}
      <div className="flex-1 flex min-h-0 divide-x divide-zinc-800/80 overflow-hidden">
        {/* Left Item List */}
        <div className="w-72 flex flex-col bg-zinc-950 shrink-0 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-zinc-500 flex items-center justify-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Загрузка статей лора...</span>
            </div>
          ) : loreItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 space-y-2">
              <Globe className="w-8 h-8 mx-auto text-zinc-700 opacity-60" />
              <p>Нет статей по выбранному фильтру.</p>
              <button
                onClick={() => handleOpenCreateArticle()}
                className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                Создать новую статью
              </button>
            </div>
          ) : (
            loreItems.map((item, idx) => {
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
                        item: {
                          ...item,
                          format: 'LoreWiki',
                        },
                      })
                    );
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => {
                    setSelectedItem(item);
                    playUniversalSfx('click');
                  }}
                  className={`group/lore p-2.5 rounded-xl border transition-all cursor-pointer flex items-start space-x-2.5 ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/50 text-zinc-100 shadow-sm'
                      : 'bg-zinc-900/40 border-zinc-800/60 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-semibold text-xs text-zinc-100 truncate">{item.name}</h4>
                      {onPlaceLoreOnCanvas && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playUniversalSfx('success');
                            onPlaceLoreOnCanvas(item);
                            showToast(`Карточка «${item.name}» закреплена на столе`);
                          }}
                          className="p-1 opacity-0 group-hover/lore:opacity-100 hover:bg-amber-500/20 text-zinc-400 hover:text-amber-300 rounded-md transition-all cursor-pointer shrink-0"
                          title="Поместить карточку на рабочий стол карты"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {item.summary && (
                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
                        {item.summary}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Article Reader Area */}
        <div className="flex-1 flex flex-col bg-zinc-900/20 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {selectedItem ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800 gap-2 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-base font-bold text-amber-300 leading-tight">{selectedItem.name}</h1>
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold rounded-md text-[10px]">
                      {selectedItem.category.toUpperCase()}
                    </span>
                  </div>
                  {selectedItem.originalName && (
                    <p className="text-xs text-zinc-400 italic mt-0.5">{selectedItem.originalName}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <PolzaGenerateButton
                    entity={{
                      type: selectedItem.category === 'settlement' ? 'location' : selectedItem.category === 'npc_figure' ? 'npc' : 'lore',
                      id: selectedItem.id,
                      name: selectedItem.name,
                      subtitle: selectedItem.originalName,
                      category: selectedItem.category,
                      description: selectedItem.content || selectedItem.summary,
                      currentImageUrl: selectedItem.imageUrl,
                    }}
                    onApplyImage={async (imgUrl) => {
                      const updated: WorldLoreItem = { ...selectedItem, imageUrl: imgUrl };
                      setSelectedItem(updated);
                      await worldLoreService.saveItem(updated);
                      await loadItems();
                      showToast(`Арт Polza AI сохранён в статью «${selectedItem.name}»`);
                    }}
                    onPlaceOnTable={
                      onPlaceImageOnCanvas
                        ? (imgUrl) => {
                            onPlaceImageOnCanvas(imgUrl, selectedItem.name);
                            showToast(`Арт «${selectedItem.name}» выведен на стол`);
                          }
                        : undefined
                    }
                  />

                  <button
                    onClick={() => {
                      setEditingItem({ ...selectedItem });
                      setIsEditModalOpen(true);
                      playUniversalSfx('click');
                    }}
                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs flex items-center space-x-1 transition-all cursor-pointer"
                    title="Редактировать статью"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteArticle(selectedItem)}
                    className="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition-all cursor-pointer"
                    title="Удалить с диска"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {onPlaceLoreOnCanvas && (
                    <button
                      onClick={() => {
                        playUniversalSfx('success');
                        onPlaceLoreOnCanvas(selectedItem);
                        showToast(`Карточка «${selectedItem.name}» выведена на стол`);
                      }}
                      className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                      title="Вывести интерактивную карточку на игровое поле"
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span>🎴 Карточку на стол</span>
                    </button>
                  )}

                  {selectedItem.imageUrl && onPlaceImageOnCanvas && (
                    <button
                      onClick={() => {
                        playUniversalSfx('success');
                        onPlaceImageOnCanvas(selectedItem.imageUrl!, selectedItem.name);
                        showToast(`Картинка «${selectedItem.name}» выведена на стол`);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                      title="Вывести чистую иллюстрацию/портрет/карту прямо на игровое поле"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>🖼️ Картинку на стол</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Article Image Banner if present */}
              {Boolean(selectedItem.imageUrl && selectedItem.imageUrl.trim()) && (
                <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 max-h-64 flex items-center justify-center group/img">
                  <img
                    src={selectedItem.imageUrl || undefined}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover max-h-64"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200 backdrop-blur-md bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-700/60">
                      Иллюстрация: {selectedItem.name}
                    </span>
                    {onPlaceImageOnCanvas && (
                      <button
                        onClick={() => {
                          playUniversalSfx('success');
                          onPlaceImageOnCanvas(selectedItem.imageUrl!, selectedItem.name);
                          showToast(`Изображение «${selectedItem.name}» брошено на стол`);
                        }}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1 transition-all cursor-pointer shadow-lg"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Вывести игрокам</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Settlement Demographics Block if Settlement */}
              {selectedItem.category === 'settlement' && selectedItem.settlementData && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                    <div className="flex items-center space-x-1.5">
                      <Building className="w-4 h-4 text-emerald-400" />
                      <span>
                        {selectedItem.settlementData.type.toUpperCase()} • Население:{' '}
                        {selectedItem.settlementData.population?.toLocaleString() || 'Неизвестно'}
                      </span>
                    </div>
                  </div>

                  {selectedItem.settlementData.demographics && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-zinc-400">Этнический состав:</span>
                      <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                        {selectedItem.settlementData.demographics.map((demo, dIdx) => (
                          <div
                            key={dIdx}
                            style={{ width: `${demo.percentage}%` }}
                            className={`h-full ${
                              dIdx === 0
                                ? 'bg-amber-500'
                                : dIdx === 1
                                ? 'bg-emerald-500'
                                : dIdx === 2
                                ? 'bg-cyan-500'
                                : 'bg-rose-500'
                            }`}
                            title={`${demo.raceName}: ${demo.percentage}%`}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[10px] text-zinc-300 pt-1">
                        {selectedItem.settlementData.demographics.map((demo, dIdx) => (
                          <span key={dIdx} className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded">
                            {demo.raceName}: <strong>{demo.percentage}%</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Formatted Article Body */}
              <div className="prose prose-invert prose-xs max-w-none text-zinc-300 leading-relaxed space-y-1">
                {renderContentWithLinks(selectedItem.content)}
              </div>

              {/* GM Private Notes Block if present */}
              {selectedItem.gmNotes && (
                <div className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl space-y-1 mt-4">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-purple-300">
                    <ShieldAlert className="w-4 h-4 text-purple-400" />
                    <span>Секретные Заметки Мастера (GM Only)</span>
                  </div>
                  <p className="text-xs text-purple-200 leading-relaxed">{selectedItem.gmNotes}</p>
                </div>
              )}
            </>
          ) : (
            <div className="m-auto text-center text-zinc-500 space-y-2">
              <Globe className="w-12 h-12 mx-auto text-zinc-700 opacity-50" />
              <p className="text-xs">Выберите запись лора из списка слева для чтения.</p>
            </div>
          )}
        </div>
      </div>

      {/* Article Create & Edit Modal */}
      {isEditModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-amber-300">
                  {editingItem.name ? `Редактировать «${editingItem.name}»` : 'Создать новую статью / НИП'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-zinc-400 hover:text-zinc-100 text-xs px-2 py-1 rounded bg-zinc-800 cursor-pointer"
              >
                Закрыть
              </button>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Название статьи / НИП *
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Эльминстер Аумар, Найт-Сити, Культ Дракона..."
                    value={editingItem.name || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">Категория</label>
                  <select
                    value={editingItem.category || 'lore_article'}
                    onChange={(e) =>
                      setEditingItem((prev) => ({ ...prev, category: e.target.value as LoreCategory }))
                    }
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="npc_figure">👑 НИП и Правители</option>
                    <option value="settlement">🏰 Города и Регионы</option>
                    <option value="faction_cult">🛡️ Фракции и Культы</option>
                    <option value="world_overview">📖 Обзор и Боги</option>
                    <option value="demographics_race">👥 Расы и Демография</option>
                    <option value="lore_article">📜 Хроники и Лор</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Ссылка на Иллюстрацию / Портрет (Image URL)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="https://... или assets/maps/... (для вывода игрокам)"
                    value={editingItem.imageUrl || ''}
                    onChange={(e) => setEditingItem((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                  {Boolean(editingItem.imageUrl && editingItem.imageUrl.trim()) && (
                    <img
                      src={editingItem.imageUrl || undefined}
                      alt="Preview"
                      className="w-10 h-10 object-cover rounded-lg border border-zinc-700 shrink-0"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">Краткая сводка (Summary)</label>
                <input
                  type="text"
                  placeholder="Одно предложение, описывающее суть сущности..."
                  value={editingItem.summary || ''}
                  onChange={(e) => setEditingItem((prev) => ({ ...prev, summary: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Основное Содержание (Markdown текст + Вики-ссылки [[type:id|Label]])
                </label>
                <textarea
                  rows={8}
                  placeholder="# Заголовок\n\nПодробное описание истории, локации или характера НИП..."
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500 custom-scrollbar"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-purple-400 mb-1">
                  🔒 Секретные Заметки Мастера (GM Only)
                </label>
                <textarea
                  rows={3}
                  placeholder="Заметки, невидимые для игроков (тайны, мотивы, секреты)..."
                  value={editingItem.gmNotes || ''}
                  onChange={(e) => setEditingItem((prev) => ({ ...prev, gmNotes: e.target.value }))}
                  className="w-full p-2.5 bg-zinc-950 border border-purple-500/30 rounded-xl text-xs text-purple-200 font-sans focus:outline-none focus:border-purple-500 custom-scrollbar"
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end space-x-2">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-700 transition-all cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEditingArticle}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Сохранить на диск (.json)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-bold text-xs px-4 py-2.5 rounded-xl shadow-2xl flex items-center space-x-2 animate-bounce">
          <Globe className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
