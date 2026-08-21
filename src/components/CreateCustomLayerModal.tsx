import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  Box,
  Map as MapIcon,
  Shield,
  Flame,
  Sparkles,
  Home,
  Skull,
  Sword,
  Key,
  Ghost,
  Compass,
  Droplets,
  Star,
  Flag,
  Eye,
  Sliders,
  Check,
} from 'lucide-react';
import { LayerItemConfig } from '../types';
import { COLOR_THEMES } from '../utils/layerHierarchy';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaveLayer: (layer: LayerItemConfig) => void;
  existingLayer?: LayerItemConfig | null;
  existingCount?: number;
}

export const LAYER_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  box: Box,
  map: MapIcon,
  shield: Shield,
  flame: Flame,
  sparkles: Sparkles,
  home: Home,
  skull: Skull,
  sword: Sword,
  key: Key,
  ghost: Ghost,
  compass: Compass,
  droplets: Droplets,
  star: Star,
  flag: Flag,
  eye: Eye,
  layers: Layers,
};

const ICON_OPTIONS = [
  { id: 'box', label: 'Предмет', icon: Box },
  { id: 'shield', label: 'Защита', icon: Shield },
  { id: 'skull', label: 'Опасность', icon: Skull },
  { id: 'sword', label: 'Оружие', icon: Sword },
  { id: 'flame', label: 'Огонь', icon: Flame },
  { id: 'sparkles', label: 'Магия', icon: Sparkles },
  { id: 'home', label: 'Крыша / Здание', icon: Home },
  { id: 'key', label: 'Секрет', icon: Key },
  { id: 'ghost', label: 'Ловушки / Призраки', icon: Ghost },
  { id: 'star', label: 'Маркер', icon: Star },
  { id: 'compass', label: 'Ориентир', icon: Compass },
  { id: 'droplets', label: 'Вода / Жидкость', icon: Droplets },
  { id: 'flag', label: 'Зона / Точка', icon: Flag },
  { id: 'map', label: 'Карта', icon: MapIcon },
];

export const CreateCustomLayerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSaveLayer,
  existingLayer,
  existingCount = 10,
}) => {
  const [name, setName] = useState<string>(existingLayer?.name || '');
  const [description, setDescription] = useState<string>(existingLayer?.description || '');
  const [selectedColor, setSelectedColor] = useState<string>(existingLayer?.color || 'amber');
  const [selectedIcon, setSelectedIcon] = useState<string>(existingLayer?.iconName || 'box');
  const [opacity, setOpacity] = useState<number>(existingLayer?.opacity ?? 1);
  const [locked, setLocked] = useState<boolean>(existingLayer?.locked ?? false);
  const [visible, setVisible] = useState<boolean>(existingLayer?.visible ?? true);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const layerId = existingLayer?.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    const layerConfig: LayerItemConfig = {
      id: layerId,
      name: trimmedName,
      description: description.trim() || undefined,
      color: selectedColor,
      iconName: selectedIcon,
      opacity,
      locked,
      visible,
      order: existingLayer?.order || (existingCount + 1) * 10,
      isCustom: true,
    };

    onSaveLayer(layerConfig);
    onClose();
  };

  const currentTheme = COLOR_THEMES[selectedColor] || COLOR_THEMES.amber;
  const IconComponent = LAYER_ICON_MAP[selectedIcon] || Box;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${currentTheme.bg} ${currentTheme.border} ${currentTheme.color}`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">
                {existingLayer ? 'Редактировать слой' : 'Создать кастомный слой стола'}
              </h2>
              <p className="text-xs text-zinc-400">
                Слой появится в списке слоев и в меню привязки объектов
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-8rem)]">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
              <span>Название слоя *</span>
              <span className="text-[10px] text-zinc-500 font-normal">например: Секретные ловушки</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Введите название слоя..."
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/80 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
              <span>Описание назначения (необязательно)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткая подсказка для мастера..."
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-amber-500/80 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none transition-colors"
            />
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Цвет маркера и бейджа</label>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(COLOR_THEMES).map(([colorKey, theme]) => {
                const isSelected = selectedColor === colorKey;
                return (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => setSelectedColor(colorKey)}
                    className={`flex items-center space-x-1.5 px-2 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? `${theme.bg} ${theme.border} ${theme.color} ring-1 ring-amber-400/50 scale-102`
                        : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${theme.bg} ${theme.border} border shrink-0`} />
                    <span className="truncate text-[11px]">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300">Иконка слоя</label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {ICON_OPTIONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? `${currentTheme.bg} ${currentTheme.border} ${currentTheme.color} ring-1 ring-amber-400/50 scale-105`
                        : 'bg-zinc-950/50 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                    }`}
                    title={item.label}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span className="text-[10px] truncate max-w-full">{item.label.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opacity slider */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span>Начальная прозрачность</span>
              </span>
              <span className="font-mono font-bold text-amber-400">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{existingLayer ? 'Сохранить изменения' : 'Создать слой'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
