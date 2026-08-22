import React, { useState } from 'react';
import { FolderPlus, X, Check, Sparkles } from 'lucide-react';
import { systemContentService } from '../../services/systemContentService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (systemId: string) => void;
}

const COMMON_CATEGORIES = [
  'monsters',
  'spells',
  'items',
  'races',
  'classes',
  'rules',
  'cyberware',
  'advantages',
  'skills',
  'lore',
];

export const CreateSystemModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [systemName, setSystemName] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    'monsters',
    'spells',
    'items',
    'rules',
  ]);
  const [customCatInput, setCustomCatInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const addCustomCategory = () => {
    const clean = customCatInput.trim().toLowerCase().replace(/[^a-z0-9_\u0400-\u04FF-]/g, '_');
    if (clean && !selectedCategories.includes(clean)) {
      setSelectedCategories([...selectedCategories, clean]);
      setCustomCatInput('');
    }
  };

  const handleCreate = async () => {
    if (!systemName.trim()) {
      setError('Пожалуйста, введите название ролевой системы');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const manifest = await systemContentService.createCustomSystem(
        systemName.trim(),
        selectedCategories
      );

      if (manifest) {
        onCreated(manifest.id);
        onClose();
      } else {
        setError('Не удалось создать папку системы на сервере');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка создания папки');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="create-system-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="create-system-modal-container"
        className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-100">Создать папку новой ролевой системы</h3>
              <p className="text-[11px] text-zinc-400">Автоматически создаст структуру папок в systems/</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block font-semibold text-zinc-300 text-xs">
              Название ролевой системы:
            </label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="Например: Shadowrun, Warhammer Fantasy, Fate Core"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-400"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="block font-semibold text-zinc-300 text-xs">
              Выберите категории для автоматического создания подпапок:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-300'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-amber-400" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={customCatInput}
              onChange={(e) => setCustomCatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
              placeholder="Добавить свою категорию (например: implants)"
              className="flex-1 px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={addCustomCategory}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Добавить
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            disabled={isSubmitting || !systemName.trim()}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center space-x-1.5 shadow-md"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'Создание...' : 'Создать систему'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
