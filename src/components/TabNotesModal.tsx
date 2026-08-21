import React, { useState, useEffect } from 'react';
import { FileText, Save, X, Sparkles, BookOpen } from 'lucide-react';
import { WorkspaceTab } from '../types';

interface TabNotesModalProps {
  tab: WorkspaceTab | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (tabId: string, notes: string) => void;
}

export const TabNotesModal: React.FC<TabNotesModalProps> = ({
  tab,
  isOpen,
  onClose,
  onSaveNotes,
}) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (tab) {
      setNotes(tab.notes || '');
    }
  }, [tab]);

  if (!isOpen || !tab) return null;

  const handleSave = () => {
    onSaveNotes(tab.id, notes);
    onClose();
  };

  return (
    <div
      id="tab-notes-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="tab-notes-modal-content"
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950/80 border-b border-neutral-800">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{tab.icon || '🗺️'}</span>
            <div>
              <h2 className="text-base font-semibold text-neutral-100 flex items-center gap-2">
                <span>Заметки Мастера к карте:</span>
                <span className="text-amber-400 font-medium">{tab.name}</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Секретные подсказки, статы ловушек, диалоги NPC и сюжетные триггеры для этой сцены
              </p>
            </div>
          </div>
          <button
            id="tab-notes-close-btn"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 flex flex-col space-y-3 overflow-y-auto">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Личные записи ведущего (не видны игрокам)
            </span>
            <span className="text-neutral-500">Символов: {notes.length}</span>
          </div>

          <textarea
            id="tab-notes-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Введите описание локации, характеристики врагов, триггеры ловушек (DC 15 Внимательность), лут в сундуках..."
            rows={12}
            className="w-full flex-1 p-3.5 bg-neutral-950/90 border border-neutral-800 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 resize-none font-mono leading-relaxed"
          />

          {/* Quick GM Inspiration Templates */}
          <div className="flex items-center gap-2 pt-1 overflow-x-auto">
            <span className="text-xs text-neutral-500 whitespace-nowrap">Быстрые шаблоны:</span>
            <button
              type="button"
              onClick={() =>
                setNotes((prev) =>
                  prev ? `${prev}\n\n🔍 **Окружение и Атмосфера**:\n- Освещение:\n- Запахи и звуки:\n- Опасности:` : `🔍 **Окружение и Атмосфера**:\n- Освещение:\n- Запахи и звуки:\n- Опасности:`
                )
              }
              className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 whitespace-nowrap transition-colors"
            >
              + Окружение
            </button>
            <button
              type="button"
              onClick={() =>
                setNotes((prev) =>
                  prev ? `${prev}\n\n⚠️ **Ловушка (DC 14)**:\n- Обнаружение: Восприятие DC 14\n- Обезвреживание: Ловкость рук DC 13\n- Урон: 2d10 колющего` : `⚠️ **Ловушка (DC 14)**:\n- Обнаружение: Восприятие DC 14\n- Обезвреживание: Ловкость рук DC 13\n- Урон: 2d10 колющего`
                )
              }
              className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 whitespace-nowrap transition-colors"
            >
              + Ловушка
            </button>
            <button
              type="button"
              onClick={() =>
                setNotes((prev) =>
                  prev ? `${prev}\n\n💎 **Сокровища**:\n- 45 зм, 120 см\n- Зелье лечения (2d4+2)\n- Старинный свиток` : `💎 **Сокровища**:\n- 45 зм, 120 см\n- Зелье лечения (2d4+2)\n- Старинный свиток`
                )
              }
              className="text-xs px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded border border-neutral-700 whitespace-nowrap transition-colors"
            >
              + Лут
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950/90 border-t border-neutral-800">
          <button
            id="tab-notes-cancel-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            id="tab-notes-save-btn"
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow flex items-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            Сохранить заметки
          </button>
        </div>
      </div>
    </div>
  );
};
