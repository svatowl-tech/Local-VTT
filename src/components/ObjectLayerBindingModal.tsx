import React from 'react';
import {
  X,
  Layers,
  Map as MapIcon,
  Box,
  Home,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sliders,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  Trash2,
  Copy,
  Plus,
} from 'lucide-react';
import { MapItem, ObjectLayerType, LayerStackConfig, LayerItemConfig } from '../types';
import { COLOR_THEMES } from '../utils/layerHierarchy';
import { LAYER_ICON_MAP } from './CreateCustomLayerModal';
import { FloatingWindow } from './FloatingWindow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mapItem: MapItem | null;
  layersConfig?: LayerStackConfig;
  onUpdateMapItem: (mapId: string, partial: Partial<MapItem>) => void;
  onDuplicateMap?: (mapItem: MapItem) => void;
  onDuplicateMapItem?: (mapItem: MapItem) => void;
  onDeleteMap?: (mapId: string) => void;
  onDeleteMapItem?: (mapId: string) => void;
  onOpenLayersConfig?: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

const DEFAULT_LAYER_OPTIONS: Array<{
  id: string;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
}> = [
  {
    id: 'background',
    title: 'Слой карты (Фон)',
    subtitle: 'Базовое покрытие местности, под сеткой и объектами',
    icon: MapIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    id: 'props',
    title: 'Слой объектов и токенов',
    subtitle: 'Предметы, мебель, декорации, накладные элементы и токены',
    icon: Box,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    id: 'overhead',
    title: 'Верхний слой / Крыши (Overhead)',
    subtitle: 'Накладывается поверх токенов и сетки, скрывается туманом',
    icon: Home,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
  {
    id: 'above-fog',
    title: 'Слой над туманом войны',
    subtitle: 'Парящие облака, HUD-маркеры, видимые сквозь любой туман',
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

export const ObjectLayerBindingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mapItem,
  layersConfig,
  onUpdateMapItem,
  onDuplicateMap,
  onDuplicateMapItem,
  onDeleteMap,
  onDeleteMapItem,
  onOpenLayersConfig,
  zIndex = 50,
  onFocus,
}) => {
  if (!isOpen || !mapItem) return null;

  const handleDuplicate = onDuplicateMap || onDuplicateMapItem;
  const handleDelete = onDeleteMap || onDeleteMapItem;

  const currentLayer: ObjectLayerType = mapItem.layer || 'background';
  const customLayers: LayerItemConfig[] = (layersConfig?.layers || []).filter((l) => l.isCustom);

  const handleSelectLayer = (layer: ObjectLayerType) => {
    onUpdateMapItem(mapItem.id, { layer });
  };

  const handleBringToFront = () => {
    onUpdateMapItem(mapItem.id, { zIndex: (mapItem.zIndex || 0) + 100 });
  };

  const handleBringForward = () => {
    onUpdateMapItem(mapItem.id, { zIndex: (mapItem.zIndex || 0) + 1 });
  };

  const handleSendBackward = () => {
    onUpdateMapItem(mapItem.id, { zIndex: Math.max(0, (mapItem.zIndex || 0) - 1) });
  };

  const handleSendToBack = () => {
    onUpdateMapItem(mapItem.id, { zIndex: Math.max(0, (mapItem.zIndex || 0) - 100) });
  };

  return (
    <FloatingWindow
      id={`object-layer-binding-${mapItem.id}`}
      title={`Слой: ${mapItem.name}`}
      isOpen={isOpen}
      onClose={onClose}
      icon={Layers}
      defaultPosition={{ x: 260, y: 110 }}
      defaultSize={{ width: 520, height: 620 }}
      minWidth={380}
      minHeight={400}
      zIndex={zIndex}
      onFocus={onFocus}
      headerRightActions={
        onOpenLayersConfig ? (
          <button
            onClick={() => {
              onClose();
              onOpenLayersConfig();
            }}
            className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded-lg mr-1"
          >
            <Plus className="w-3 h-3" />
            <span>Слои</span>
          </button>
        ) : undefined
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Layer Selection Radio Cards */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
              Стандартные слои стола:
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {DEFAULT_LAYER_OPTIONS.map((opt) => {
                const isSelected = currentLayer === opt.id;
                const IconComponent = opt.icon;

                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectLayer(opt.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3.5 ${
                      isSelected
                        ? `${opt.bg} ${opt.border} shadow-lg ring-1 ring-amber-400/50`
                        : 'bg-zinc-950/60 hover:bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? `${opt.bg} ${opt.border} ${opt.color}`
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? 'text-zinc-100' : 'text-zinc-300'
                          }`}
                        >
                          {opt.title}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-zinc-950 rounded-md">
                            Выбран
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                        {opt.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Layers Section */}
          {customLayers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
                  Кастомные слои стола:
                </label>
                <span className="text-[11px] text-amber-400 font-medium">
                  {customLayers.length} создано
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {customLayers.map((layer) => {
                  const isSelected = currentLayer === layer.id;
                  const theme = layer.color ? COLOR_THEMES[layer.color] || COLOR_THEMES.amber : COLOR_THEMES.amber;
                  const IconComp = (layer.iconName && LAYER_ICON_MAP[layer.iconName]) || Box;

                  return (
                    <button
                      key={layer.id}
                      onClick={() => handleSelectLayer(layer.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3.5 ${
                        isSelected
                          ? `${theme.bg} ${theme.border} shadow-lg ring-1 ring-amber-400/50`
                          : 'bg-zinc-950/60 hover:bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? `${theme.bg} ${theme.border} ${theme.color}`
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-sm font-semibold ${
                                isSelected ? 'text-zinc-100' : 'text-zinc-300'
                              }`}
                            >
                              {layer.name}
                            </span>
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                              Кастомный
                            </span>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-amber-500 text-zinc-950 rounded-md">
                              Выбран
                            </span>
                          )}
                        </div>
                        {layer.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                            {layer.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Depth / Z-Index Ordering Controls */}
          <div className="p-4 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                Порядок наложения (Z-Index):
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-zinc-400">Уровень:</span>
                <input
                  type="number"
                  value={mapItem.zIndex || 0}
                  onChange={(e) =>
                    onUpdateMapItem(mapItem.id, { zIndex: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-center text-xs font-mono text-amber-400 font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={handleBringToFront}
                className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
                title="На самый верх (+100)"
              >
                <ChevronsUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Наверх</span>
              </button>

              <button
                onClick={handleBringForward}
                className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
                title="Поднять выше (+1)"
              >
                <ArrowUp className="w-3.5 h-3.5 text-zinc-300" />
                <span>Выше</span>
              </button>

              <button
                onClick={handleSendBackward}
                className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
                title="Опустить ниже (-1)"
              >
                <ArrowDown className="w-3.5 h-3.5 text-zinc-300" />
                <span>Ниже</span>
              </button>

              <button
                onClick={handleSendToBack}
                className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 rounded-lg text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
                title="На самый низ (-100)"
              >
                <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
                <span>На низ</span>
              </button>
            </div>
          </div>

          {/* Opacity & Lock Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opacity */}
            <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Прозрачность:</span>
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {Math.round((mapItem.opacity ?? 1) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={mapItem.opacity ?? 1}
                onChange={(e) =>
                  onUpdateMapItem(mapItem.id, { opacity: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>

            {/* Position Lock */}
            <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-200 block">
                  Зафиксировать на столе
                </span>
                <span className="text-[11px] text-zinc-400">
                  Защита от случайного сдвига
                </span>
              </div>
              <button
                onClick={() => onUpdateMapItem(mapItem.id, { locked: !mapItem.locked })}
                className={`p-2 rounded-xl border transition-colors ${
                  mapItem.locked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                }`}
                title={mapItem.locked ? 'Заблокировано' : 'Разблокировано'}
              >
                {mapItem.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Visibility for Players */}
          <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-200 block">
                Видимость для игроков
              </span>
              <span className="text-[11px] text-zinc-400">
                {mapItem.hiddenFromPlayers
                  ? 'Скрыто на экране игроков (видит только Мастер)'
                  : 'Отображается на экране игроков'}
              </span>
            </div>
            <button
              onClick={() =>
                onUpdateMapItem(mapItem.id, { hiddenFromPlayers: !mapItem.hiddenFromPlayers })
              }
              className={`p-2 rounded-xl border transition-colors ${
                !mapItem.hiddenFromPlayers
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
              title={mapItem.hiddenFromPlayers ? 'Скрыто от игроков' : 'Видно игрокам'}
            >
              {!mapItem.hiddenFromPlayers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {handleDuplicate && (
              <button
                onClick={() => handleDuplicate(mapItem)}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors"
                title="Дублировать объект"
              >
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Дублировать</span>
              </button>
            )}
            {handleDelete && (
              <button
                onClick={() => {
                  handleDelete(mapItem.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-medium flex items-center space-x-1.5 transition-colors"
                title="Удалить объект"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Удалить</span>
              </button>
            )}
            {onOpenLayersConfig && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLayersConfig();
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1 underline ml-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Настроить слои</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            Применить
          </button>
        </div>
      </div>
    </FloatingWindow>
  );
};
