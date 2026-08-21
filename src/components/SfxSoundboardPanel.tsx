import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { SoundEffect } from '../types';
import { FloatingWindow } from './FloatingWindow';
import {
  Zap,
  Volume1,
  Plus,
  Trash2,
  X,
  Search,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Sliders,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

const SFX_CATEGORIES = [
  { id: 'all', label: 'Все', icon: '✨' },
  { id: 'combat', label: 'Бой', icon: '⚔️' },
  { id: 'magic', label: 'Магия', icon: '🔥' },
  { id: 'weather', label: 'Погода', icon: '⚡' },
  { id: 'game', label: 'Кубики', icon: '🎲' },
  { id: 'dungeon', label: 'Подземелье', icon: '🏰' },
  { id: 'social', label: 'Таверна', icon: '🍻' },
];

const SYNTH_PRESETS: { id: SoundEffect['presetType']; name: string; icon: string }[] = [
  { id: 'sword', name: 'Удар меча', icon: '⚔️' },
  { id: 'dragon', name: 'Рык дракона', icon: '🐲' },
  { id: 'thunder', name: 'Удар грома', icon: '⚡' },
  { id: 'spell', name: 'Взрыв магии', icon: '🔥' },
  { id: 'dice', name: 'Бросок кубиков', icon: '🎲' },
  { id: 'horn', name: 'Боевой горн', icon: '📯' },
  { id: 'door', name: 'Скрип двери', icon: '🚪' },
  { id: 'cheer', name: 'Ликование', icon: '🍻' },
  { id: 'chime', name: 'Перезвон', icon: '✨' },
];

export const SfxSoundboardPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  zIndex = 40,
  onFocus,
}) => {
  const [audioState, setAudioState] = useState(() => audioEngine.getState());
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lastTriggeredId, setLastTriggeredId] = useState<string | null>(null);

  // New SFX Creator state
  const [isAddingSfx, setIsAddingSfx] = useState<boolean>(false);
  const [newSfxName, setNewSfxName] = useState<string>('');
  const [newSfxIcon, setNewSfxIcon] = useState<string>('🔔');
  const [newSfxCategory, setNewSfxCategory] = useState<string>('combat');
  const [newSfxSourceType, setNewSfxSourceType] = useState<'preset' | 'file' | 'url'>('preset');
  const [newSfxPreset, setNewSfxPreset] = useState<SoundEffect['presetType']>('sword');
  const [newSfxUrl, setNewSfxUrl] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let lastState = audioEngine.getState();
    const unsubscribe = audioEngine.subscribe(() => {
      const newState = audioEngine.getState();
      if (
        newState.sfxVolume !== lastState.sfxVolume ||
        newState.soundEffects !== lastState.soundEffects
      ) {
        lastState = newState;
        setAudioState(newState);
      }
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const { sfxVolume, soundEffects } = audioState;

  // Trigger SFX with visual feedback
  const handleTriggerSfx = (sfx: SoundEffect) => {
    setLastTriggeredId(sfx.id);
    audioEngine.playSoundEffect(sfx);

    setTimeout(() => {
      setLastTriggeredId((prev) => (prev === sfx.id ? null : prev));
    }, 400);
  };

  // Filter sound effects
  const filteredEffects = soundEffects.filter((sfx) => {
    const matchesCategory = activeCategory === 'all' || sfx.category === activeCategory;
    const matchesQuery =
      !searchQuery ||
      sfx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sfx.category && sfx.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sfx.tags && sfx.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesQuery;
  });

  // Upload file for SFX
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setNewSfxUrl(objectUrl);
      if (!newSfxName) {
        setNewSfxName(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  // Create new SFX button
  const handleSaveSfx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSfxName.trim()) return;

    audioEngine.addSoundEffect({
      name: newSfxName.trim(),
      icon: newSfxIcon || '🔔',
      category: newSfxCategory,
      url: newSfxSourceType !== 'preset' ? newSfxUrl : undefined,
      presetType: newSfxSourceType === 'preset' ? newSfxPreset : undefined,
    });

    // Reset Form
    setIsAddingSfx(false);
    setNewSfxName('');
    setNewSfxUrl('');
  };

  return (
    <FloatingWindow
      id="sfx-soundboard-panel"
      title={`SFX Саундборд (${soundEffects.length})`}
      isOpen={isOpen}
      onClose={onClose}
      icon={Zap}
      defaultPosition={{ x: 380, y: 120 }}
      defaultSize={{ width: 440, height: 550 }}
      minWidth={320}
      minHeight={340}
      zIndex={zIndex}
      onFocus={onFocus}
      headerRightActions={
        <div className="flex items-center space-x-1 mr-1 bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-800">
          <Volume1 className="w-3 h-3 text-amber-400 shrink-0" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfxVolume}
            onChange={(e) => audioEngine.setSfxVolume(parseFloat(e.target.value))}
            className="w-14 accent-amber-500 h-1 rounded-lg bg-zinc-800 cursor-pointer"
            title={`SFX Громкость: ${Math.round(sfxVolume * 100)}%`}
          />
        </div>
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden text-zinc-100">
        {/* Toolbar: Categories, Search, Add SFX */}
        <div className="p-2.5 bg-zinc-900/50 border-b border-zinc-800/60 space-y-2 shrink-0">
        {/* Category Filters Pill Strip */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none">
          {SFX_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all flex items-center space-x-1 ${
                activeCategory === cat.id
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:bg-zinc-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Search & Add Button */}
        <div className="flex items-center space-x-1.5">
          <div className="relative flex-1">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Поиск звуков..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <button
            onClick={() => setIsAddingSfx(!isAddingSfx)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shrink-0 ${
              isAddingSfx
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingSfx ? 'Отмена' : 'Создать'}</span>
          </button>
        </div>
      </div>

      {/* Add Custom SFX Form Drawer */}
      {isAddingSfx && (
        <form
          onSubmit={handleSaveSfx}
          className="p-3 bg-zinc-900 border-b border-zinc-800 space-y-2.5 animate-in slide-in-from-top duration-200 text-xs shrink-0 max-h-60 overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-amber-300 flex items-center space-x-1.5 text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Создать кнопку SFX</span>
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-zinc-400 mb-0.5">Название</label>
              <input
                type="text"
                placeholder="Взрыв магии"
                value={newSfxName}
                onChange={(e) => setNewSfxName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-0.5">Иконка</label>
              <input
                type="text"
                placeholder="🔥"
                value={newSfxIcon}
                onChange={(e) => setNewSfxIcon(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-[10px] text-zinc-400">Источник звука</label>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setNewSfxSourceType('preset')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                  newSfxSourceType === 'preset'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                }`}
              >
                Синтезатор
              </button>
              <button
                type="button"
                onClick={() => setNewSfxSourceType('file')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                  newSfxSourceType === 'file'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                }`}
              >
                Аудиофайл
              </button>
              <button
                type="button"
                onClick={() => setNewSfxSourceType('url')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                  newSfxSourceType === 'url'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                }`}
              >
                URL
              </button>
            </div>

            {newSfxSourceType === 'preset' && (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {SYNTH_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setNewSfxPreset(p.id);
                      if (!newSfxName) setNewSfxName(p.name);
                      if (!newSfxIcon) setNewSfxIcon(p.icon);
                    }}
                    className={`p-1.5 rounded-lg border text-left transition-all flex items-center space-x-1 ${
                      newSfxPreset === p.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span className="text-[10px] truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            {newSfxSourceType === 'file' && (
              <div className="pt-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 border border-dashed border-zinc-800 hover:border-amber-500/50 rounded-xl bg-zinc-950 text-[10px] text-zinc-300 flex items-center justify-center space-x-1.5"
                >
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>{newSfxUrl ? 'Файл выбран!' : 'Выбрать файл'}</span>
                </button>
              </div>
            )}

            {newSfxSourceType === 'url' && (
              <div className="pt-1">
                <input
                  type="url"
                  placeholder="https://.../sound.mp3"
                  value={newSfxUrl}
                  onChange={(e) => setNewSfxUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-zinc-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="submit"
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold transition-all"
            >
              Сохранить
            </button>
          </div>
        </form>
      )}

      {/* Main Soundboard Trigger Grid */}
      <div className="flex-1 p-3 overflow-y-auto bg-zinc-950/50 min-h-[160px] max-h-[360px]">
        {filteredEffects.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 space-y-1.5">
            <Zap className="w-6 h-6 mx-auto text-zinc-600 opacity-60" />
            <p className="text-xs font-medium">Нет звуковых эффектов</p>
            <p className="text-[10px] text-zinc-600">Нажмите "+ Создать" чтобы добавить новый звук</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredEffects.map((sfx) => {
              const isTriggered = lastTriggeredId === sfx.id;
              return (
                <div
                  key={sfx.id}
                  className="relative group bg-zinc-900/90 hover:bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/50 rounded-xl p-2 flex flex-col items-center justify-between text-center transition-all shadow-sm hover:shadow-md active:scale-95 cursor-pointer"
                  onClick={() => handleTriggerSfx(sfx)}
                >
                  {/* Delete Custom SFX Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      audioEngine.removeSoundEffect(sfx.id);
                    }}
                    className="absolute top-1 right-1 p-0.5 text-zinc-600 hover:text-red-400 hover:bg-zinc-950 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Удалить SFX"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-150 ${
                      isTriggered
                        ? 'scale-125 bg-amber-500 text-zinc-950 ring-2 ring-amber-500/40 shadow-lg'
                        : 'bg-zinc-950 border border-zinc-800/80 group-hover:border-amber-500/40'
                    }`}
                  >
                    {sfx.icon}
                  </div>

                  <span className="font-bold text-[11px] text-zinc-200 group-hover:text-amber-300 truncate w-full mt-1.5">
                    {sfx.name}
                  </span>
                  {sfx.tags && sfx.tags.length > 0 && (
                    <span className="text-[8px] text-zinc-500 font-mono truncate w-full mt-0.5">
                      #{sfx.tags[0]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </FloatingWindow>
  );
};
