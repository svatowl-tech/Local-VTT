import React, { useState, useEffect } from 'react';
import { WorkspaceTab, MapVaultItem } from '../types';
import { mapVaultService } from '../services/mapVaultService';
import {
  FolderArchive,
  Save,
  X,
  Sparkles,
  Layers,
  Eye,
  Flame,
  Grid,
  FileText,
  Tag,
  Check,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentTab: WorkspaceTab | null;
  session?: any;
  onSaved?: (savedItem: MapVaultItem) => void;
}

export const SaveTabToVaultModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentTab,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Пользовательские');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const categories = mapVaultService.getCategories();

  useEffect(() => {
    if (isOpen && currentTab) {
      const primaryMap = (currentTab.maps || []).find((m) => m.id === currentTab.activeMapId) || currentTab.maps?.[0];
      setName(currentTab.name || primaryMap?.name || 'Новая локация');
      setCategory(primaryMap?.category || 'Пользовательские');
      setDescription(currentTab.notes || '');
      setTagsInput(primaryMap?.category ? `${primaryMap.category}, сцена` : 'сцена, локация');
      setSavedSuccess(false);
    }
  }, [isOpen, currentTab]);

  if (!isOpen || !currentTab) return null;

  const stats = mapVaultService.computeStats(currentTab);
  const primaryMap = (currentTab.maps || []).find((m) => m.id === currentTab.activeMapId) || currentTab.maps?.[0];
  const previewImg = (primaryMap?.thumbnailUrl || primaryMap?.url || '').trim();

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      mapVaultService.addCategory(newCategoryName.trim());
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const saved = mapVaultService.saveTabToVault(currentTab, {
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      thumbnailUrl: previewImg,
      tags,
      previewColor: currentTab.color,
    });

    setSavedSuccess(true);
    if (onSaved) {
      onSaved(saved);
    }

    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div
      id="save-tab-vault-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
                <span>Сохранить сцену в Хранилище</span>
                <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] rounded-full font-mono">
                  Map Object
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Сохраняет всю вкладку со всеми картами, декорациями, туманом, рисунками и заклинаниями
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Preview Card */}
          <div className="flex items-center space-x-4 p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl">
            <div className="w-24 h-16 rounded-lg bg-zinc-900 overflow-hidden border border-zinc-700 shrink-0 relative">
              {previewImg ? (
                <img src={previewImg || undefined} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                  Нет фото
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-semibold text-zinc-200 truncate">
                {name || 'Без названия'}
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center space-x-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                  <Layers className="w-3 h-3 text-blue-400" />
                  <span>{currentTab.maps?.length || 0} объектов</span>
                </span>
                {stats.hasFog && (
                  <span className="flex items-center space-x-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-purple-400">
                    <Eye className="w-3 h-3" />
                    <span>Туман войны</span>
                  </span>
                )}
                {stats.hasEffects && (
                  <span className="flex items-center space-x-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-orange-400">
                    <Flame className="w-3 h-3" />
                    <span>Спецэффекты</span>
                  </span>
                )}
                {stats.hasSpells && (
                  <span className="flex items-center space-x-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-rose-400">
                    <Sparkles className="w-3 h-3" />
                    <span>Заклинания</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Название карты / локации <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Логово Красного Дракона (Этаж 1)"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            {/* Category */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-zinc-300">
                  Категория в Хранилище
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer"
                >
                  {isAddingCategory ? 'Выбрать из существующих' : '+ Новая категория'}
                </button>
              </div>

              {isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Название новой категории..."
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs"
                  >
                    Добавить
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Description & Master Notes */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Заметки Мастера к локации</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Секреты, засады, сокровища, условия перехода..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5 flex items-center space-x-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                <span>Теги (через запятую)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="босс, подземелье, сложная битва, сокровища"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || savedSuccess}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all shadow-lg cursor-pointer ${
              savedSuccess
                ? 'bg-emerald-500 text-zinc-950'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95'
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Сохранено в Хранилище!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Сохранить в Хранилище</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
