import React, { useState } from 'react';
import {
  X,
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Sliders,
  Map as MapIcon,
  Box,
  Grid as GridIcon,
  Pencil,
  Flame,
  Sparkles,
  Home,
  CloudFog,
  Crosshair,
  Camera,
  Info,
  Plus,
  Trash2,
  Tag,
} from 'lucide-react';
import { LayerStackConfig, TabletopLayerId, LayerItemConfig, TabletopSessionState } from '../types';
import { DEFAULT_LAYERS_CONFIG } from '../services/defaultSession';
import { CreateCustomLayerModal, LAYER_ICON_MAP } from './CreateCustomLayerModal';
import { COLOR_THEMES } from '../utils/layerHierarchy';
import { FloatingWindow } from './FloatingWindow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  layersConfig?: LayerStackConfig;
  onUpdateLayersConfig: (config: LayerStackConfig) => void;
  onUpdateLayerItem?: (layerId: TabletopLayerId, partial: Partial<LayerItemConfig>) => void;
  session?: TabletopSessionState;
  zIndex?: number;
  onFocus?: () => void;
}

const LAYER_ICONS: Record<string, React.FC<{ className?: string }>> = {
  maps: MapIcon,
  props: Box,
  grid: GridIcon,
  drawings: Pencil,
  effects: Flame,
  spells: Sparkles,
  overhead: Home,
  fog: CloudFog,
  laser: Crosshair,
  camera: Camera,
};

const LAYER_BADGES: Record<string, { color: string; bg: string; border: string }> = {
  maps: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  props: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  grid: { color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  drawings: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  effects: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  spells: { color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  overhead: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
  fog: { color: 'text-zinc-300', bg: 'bg-zinc-500/15', border: 'border-zinc-500/30' },
  laser: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  camera: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
};

export const LayersManagementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  layersConfig,
  onUpdateLayersConfig,
  session,
  zIndex = 40,
  onFocus,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingLayer, setEditingLayer] = useState<LayerItemConfig | null>(null);

  if (!isOpen) return null;

  const currentLayers: LayerItemConfig[] = (layersConfig?.layers || DEFAULT_LAYERS_CONFIG.layers)
    .slice()
    .sort((a, b) => b.order - a.order); // Display top-most layers first (Photoshop standard)

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newLayers = [...currentLayers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index - 1];
    newLayers[index - 1] = temp;

    // Recalculate order values (bottom to top)
    const reordered = newLayers.map((layer, idx) => ({
      ...layer,
      order: (newLayers.length - idx) * 10,
    }));

    onUpdateLayersConfig({ layers: reordered });
  };

  const handleMoveDown = (index: number) => {
    if (index === currentLayers.length - 1) return;
    const newLayers = [...currentLayers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index + 1];
    newLayers[index + 1] = temp;

    // Recalculate order values (bottom to top)
    const reordered = newLayers.map((layer, idx) => ({
      ...layer,
      order: (newLayers.length - idx) * 10,
    }));

    onUpdateLayersConfig({ layers: reordered });
  };

  const handleToggleVisible = (id: string) => {
    const updated = currentLayers.map((l) =>
      l.id === id ? { ...l, visible: !l.visible } : l
    );
    onUpdateLayersConfig({ layers: updated });
  };

  const handleToggleLocked = (id: string) => {
    const updated = currentLayers.map((l) =>
      l.id === id ? { ...l, locked: !l.locked } : l
    );
    onUpdateLayersConfig({ layers: updated });
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    const updated = currentLayers.map((l) =>
      l.id === id ? { ...l, opacity: Math.max(0, Math.min(1, opacity)) } : l
    );
    onUpdateLayersConfig({ layers: updated });
  };

  const handleResetDefaults = () => {
    onUpdateLayersConfig(DEFAULT_LAYERS_CONFIG);
  };

  const handleSaveCustomLayer = (layer: LayerItemConfig) => {
    const existingIndex = currentLayers.findIndex((l) => l.id === layer.id);
    let updated: LayerItemConfig[];
    if (existingIndex >= 0) {
      updated = currentLayers.map((l) => (l.id === layer.id ? layer : l));
    } else {
      // Place right near top (under camera/laser or at very top)
      const maxOrder = Math.max(...currentLayers.map((l) => l.order), 0);
      const newLayer = { ...layer, order: maxOrder + 10 };
      updated = [...currentLayers, newLayer];
    }

    // Sort and re-index
    const sorted = updated.sort((a, b) => b.order - a.order);
    const reindexed = sorted.map((l, idx) => ({
      ...l,
      order: (sorted.length - idx) * 10,
    }));

    onUpdateLayersConfig({ layers: reindexed });
  };

  const handleDeleteCustomLayer = (layerId: string) => {
    const updated = currentLayers.filter((l) => l.id !== layerId);
    const reindexed = updated.map((l, idx) => ({
      ...l,
      order: (updated.length - idx) * 10,
    }));
    onUpdateLayersConfig({ layers: reindexed });
  };

  // Helper to count active items per layer
  const getItemCount = (id: string): string => {
    if (!session) return '';
    switch (id) {
      case 'maps': {
        const count = (session.maps || []).filter((m) => !m.layer || m.layer === 'background').length;
        return `${count} карт`;
      }
      case 'props': {
        const count = (session.maps || []).filter((m) => m.layer === 'props').length;
        return `${count} объектов`;
      }
      case 'grid':
        return session.grid?.enabled ? 'Активна' : 'Выкл';
      case 'drawings':
        return `${session.drawings?.length || 0} линий`;
      case 'effects':
        return `${session.animatedEffects?.length || 0} эффектов`;
      case 'spells':
        return `${session.spellTemplates?.length || 0} AoE`;
      case 'overhead': {
        const count = (session.maps || []).filter((m) => m.layer === 'overhead').length;
        return `${count} крыш`;
      }
      case 'fog':
        return session.fog?.enabled ? 'Включен' : 'Выкл';
      case 'laser':
        return session.laserPointer?.active ? 'Активна' : 'Готова';
      case 'camera':
        return `${(session.camera?.zoom || 1).toFixed(2)}x зум`;
      default: {
        const count = (session.maps || []).filter((m) => m.layer === id).length;
        return `${count} объектов`;
      }
    }
  };

  return (
    <>
      <FloatingWindow
        id="layers-management-panel"
        title={`Слои Стола (${currentLayers.length})`}
        isOpen={isOpen}
        onClose={onClose}
        icon={Layers}
        defaultPosition={{ x: 180, y: 90 }}
        defaultSize={{ width: 720, height: 600 }}
        minWidth={480}
        minHeight={360}
        zIndex={zIndex}
        onFocus={onFocus}
        headerRightActions={
          <div className="flex items-center space-x-1.5 mr-1">
            <button
              onClick={() => {
                setEditingLayer(null);
                setIsCreateModalOpen(true);
              }}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all shadow-sm active:scale-95"
              title="Создать новый кастомный слой"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Слой</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors text-xs flex items-center space-x-1"
              title="Сбросить порядок слоёв по умолчанию"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      >
        <div className="flex-1 flex flex-col overflow-hidden text-zinc-100">
          {/* Content Info Banner */}
          <div className="px-4 py-2 bg-amber-500/5 border-b border-zinc-800/50 flex items-center justify-between text-xs text-amber-300/90 shrink-0">
            <div className="flex items-center space-x-2">
              <Info className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Слои вверху списка отображаются поверх нижних слоев на столе мастера и экране игроков.
              </span>
            </div>
            <button
              onClick={() => {
                setEditingLayer(null);
                setIsCreateModalOpen(true);
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold underline text-[11px] shrink-0 ml-2"
            >
              + Добавить свой слой
            </button>
          </div>

          {/* Layers List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {currentLayers.map((layer, index) => {
              const IconComponent =
                (layer.iconName && LAYER_ICON_MAP[layer.iconName]) ||
                LAYER_ICONS[layer.id] ||
                Layers;

              const customTheme = layer.color ? COLOR_THEMES[layer.color] : null;
              const badge = customTheme || LAYER_BADGES[layer.id] || {
                color: 'text-zinc-400',
                bg: 'bg-zinc-800',
                border: 'border-zinc-700',
              };

              const itemCount = getItemCount(layer.id);
              const isTop = index === 0;
              const isBottom = index === currentLayers.length - 1;

              return (
                <div
                  key={layer.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !layer.visible
                      ? 'bg-zinc-950/40 border-zinc-800/40 opacity-60'
                      : 'bg-zinc-950/80 hover:bg-zinc-950 border-zinc-800 hover:border-zinc-700/80'
                  }`}
                >
                  {/* Left: Reorder & Layer Info */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col space-y-1 shrink-0">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={isTop}
                        className={`p-1 rounded transition-colors ${
                          isTop
                            ? 'text-zinc-700 cursor-not-allowed'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                        title="Поднять слой выше"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={isBottom}
                        className={`p-1 rounded transition-colors ${
                          isBottom
                            ? 'text-zinc-700 cursor-not-allowed'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                        }`}
                        title="Опустить слой ниже"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Icon & Details */}
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${badge.bg} ${badge.border} ${badge.color}`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-zinc-100 truncate">
                          {layer.name}
                        </span>
                        {layer.isCustom && (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            Кастомный
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badge.bg} ${badge.border} ${badge.color}`}
                        >
                          {itemCount}
                        </span>
                      </div>
                      {layer.description && (
                        <p className="text-xs text-zinc-400 truncate max-w-sm">
                          {layer.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Opacity & Action Toggles */}
                  <div className="flex items-center space-x-2 sm:space-x-3 justify-end shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800/60">
                    {/* Custom Layer Actions (Edit & Delete) */}
                    {layer.isCustom && (
                      <div className="flex items-center space-x-1 border-r border-zinc-800 pr-2">
                        <button
                          onClick={() => {
                            setEditingLayer(layer);
                            setIsCreateModalOpen(true);
                          }}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg border border-zinc-800 transition-colors"
                          title="Редактировать параметры слоя"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomLayer(layer.id)}
                          className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 transition-colors"
                          title="Удалить кастомный слой"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Opacity Slider */}
                    <div className="flex items-center space-x-2 bg-zinc-900/90 px-2.5 py-1.5 rounded-lg border border-zinc-800">
                      <Sliders className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <input
                        type="range"
                        min="0.05"
                        max="1"
                        step="0.05"
                        value={layer.opacity}
                        onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                        className="w-16 accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                        title={`Прозрачность слоя: ${Math.round(layer.opacity * 100)}%`}
                      />
                      <span className="text-[11px] font-mono text-zinc-300 w-8 text-right">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>

                    {/* Lock Toggle */}
                    <button
                      onClick={() => handleToggleLocked(layer.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        layer.locked
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                      }`}
                      title={layer.locked ? 'Слой заблокирован от изменений' : 'Заблокировать слой'}
                    >
                      {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>

                    {/* Visibility Toggle */}
                    <button
                      onClick={() => handleToggleVisible(layer.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        layer.visible
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                      title={layer.visible ? 'Слой видим' : 'Слой скрыт'}
                    >
                      {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between shrink-0">
            <span className="text-[11px] text-zinc-400">
              Кастомные слои синхронизируются со всеми окнами и базой данных
            </span>
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
            >
              Готово
            </button>
          </div>
        </div>
      </FloatingWindow>

      {/* Modal for Creating / Editing Custom Layer */}
      <CreateCustomLayerModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingLayer(null);
        }}
        onSaveLayer={handleSaveCustomLayer}
        existingLayer={editingLayer}
        existingCount={currentLayers.length}
      />
    </>
  );
};
