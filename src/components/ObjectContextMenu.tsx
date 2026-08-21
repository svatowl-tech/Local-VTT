import React, { useEffect, useRef } from 'react';
import {
  MapItem,
  ObjectLayerType,
  LayerStackConfig,
} from '../types';
import {
  Layers,
  Map as MapIcon,
  Box,
  Home,
  Sparkles,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { COLOR_THEMES } from '../utils/layerHierarchy';
import { LAYER_ICON_MAP } from './CreateCustomLayerModal';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface Props {
  mapItem: MapItem | null;
  position: ContextMenuPosition | null;
  onClose: () => void;
  layersConfig?: LayerStackConfig;
  onUpdateMapItem: (mapId: string, partial: Partial<MapItem>) => void;
  onDuplicateMap?: (mapItem: MapItem) => void;
  onDeleteMap?: (mapId: string) => void;
  onOpenFullBindingModal?: (mapItem: MapItem) => void;
}

const DEFAULT_LAYERS: Array<{
  id: ObjectLayerType;
  title: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
}> = [
  { id: 'background', title: 'Карта (Фон)', icon: MapIcon, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  { id: 'props', title: 'Объекты и токены', icon: Box, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  { id: 'overhead', title: 'Крыши (Overhead)', icon: Home, color: 'text-rose-400', bg: 'bg-rose-500/15' },
  { id: 'above-fog', title: 'Над туманом', icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/15' },
];

export const ObjectContextMenu: React.FC<Props> = ({
  mapItem,
  position,
  onClose,
  layersConfig,
  onUpdateMapItem,
  onDuplicateMap,
  onDeleteMap,
  onOpenFullBindingModal,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!mapItem || !position) return null;

  // Viewport-safe coordinates calculation
  const menuWidth = 270;
  const menuHeight = 440;
  const safeX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const safeY = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const currentLayer = mapItem.layer || 'background';
  const customLayers = (layersConfig?.layers || []).filter((l) => l.isCustom);

  return (
    <div
      ref={menuRef}
      onContextMenu={(e) => e.preventDefault()}
      className="fixed z-50 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden text-xs text-zinc-200 select-none animate-in fade-in zoom-in-95 duration-100 divide-y divide-zinc-800"
      style={{
        left: `${safeX}px`,
        top: `${safeY}px`,
        width: `${menuWidth}px`,
      }}
    >
      {/* Object Title Header */}
      <div className="p-3 bg-zinc-950/80 flex items-center justify-between">
        <div className="min-w-0 pr-2">
          <h4 className="font-bold text-zinc-100 truncate text-xs">{mapItem.name}</h4>
          <span className="text-[10px] text-zinc-400 font-mono">
            {mapItem.format?.toUpperCase() || 'MAP'} • z:{mapItem.zIndex || 0}
          </span>
        </div>
        <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
          <Layers className="w-4 h-4" />
        </div>
      </div>

      {/* Layer Selection Section */}
      <div className="p-2 space-y-1">
        <div className="px-2 py-1 flex items-center justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
          <span>Привязка к слою:</span>
          {onOpenFullBindingModal && (
            <button
              onClick={() => {
                onClose();
                onOpenFullBindingModal(mapItem);
              }}
              className="text-amber-400 hover:text-amber-300 flex items-center space-x-0.5 normal-case font-semibold"
              title="Открыть подробные настройки слоя"
            >
              <span>Все слои</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1">
          {DEFAULT_LAYERS.map((layer) => {
            const isSelected = currentLayer === layer.id;
            const Icon = layer.icon;

            return (
              <button
                key={layer.id}
                onClick={() => {
                  onUpdateMapItem(mapItem.id, { layer: layer.id });
                  onClose();
                }}
                className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition-all ${
                  isSelected
                    ? `${layer.bg} border-amber-500/40 text-amber-300 font-bold shadow-sm`
                    : 'bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate text-[11px]">{layer.title}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Layers list if any */}
        {customLayers.length > 0 && (
          <div className="pt-1">
            <span className="px-2 text-[10px] text-amber-400/80 font-medium block">
              Кастомные слои:
            </span>
            <div className="grid grid-cols-2 gap-1 mt-1">
              {customLayers.map((layer) => {
                const isSelected = currentLayer === layer.id;
                const theme = layer.color ? COLOR_THEMES[layer.color] || COLOR_THEMES.amber : COLOR_THEMES.amber;
                const IconComp = (layer.iconName && LAYER_ICON_MAP[layer.iconName]) || Box;

                return (
                  <button
                    key={layer.id}
                    onClick={() => {
                      onUpdateMapItem(mapItem.id, { layer: layer.id });
                      onClose();
                    }}
                    className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 transition-all ${
                      isSelected
                        ? `${theme.bg} ${theme.border} text-amber-300 font-bold`
                        : 'bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate text-[11px]">{layer.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick Z-Index Reorder Actions */}
      <div className="p-2 space-y-1">
        <span className="px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
          Порядок наложения (Z-Index):
        </span>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => {
              onUpdateMapItem(mapItem.id, { zIndex: (mapItem.zIndex || 0) + 100 });
              onClose();
            }}
            className="p-1.5 bg-zinc-950/70 hover:bg-zinc-800 rounded-lg border border-zinc-800 flex flex-col items-center justify-center text-[10px] text-zinc-300 transition-colors"
            title="На самый верх (+100)"
          >
            <ChevronsUp className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <span>Верх</span>
          </button>

          <button
            onClick={() => {
              onUpdateMapItem(mapItem.id, { zIndex: (mapItem.zIndex || 0) + 1 });
              onClose();
            }}
            className="p-1.5 bg-zinc-950/70 hover:bg-zinc-800 rounded-lg border border-zinc-800 flex flex-col items-center justify-center text-[10px] text-zinc-300 transition-colors"
            title="Поднять выше (+1)"
          >
            <ArrowUp className="w-3.5 h-3.5 text-zinc-300 mb-0.5" />
            <span>Выше</span>
          </button>

          <button
            onClick={() => {
              onUpdateMapItem(mapItem.id, { zIndex: Math.max(0, (mapItem.zIndex || 0) - 1) });
              onClose();
            }}
            className="p-1.5 bg-zinc-950/70 hover:bg-zinc-800 rounded-lg border border-zinc-800 flex flex-col items-center justify-center text-[10px] text-zinc-300 transition-colors"
            title="Опустить ниже (-1)"
          >
            <ArrowDown className="w-3.5 h-3.5 text-zinc-300 mb-0.5" />
            <span>Ниже</span>
          </button>

          <button
            onClick={() => {
              onUpdateMapItem(mapItem.id, { zIndex: Math.max(0, (mapItem.zIndex || 0) - 100) });
              onClose();
            }}
            className="p-1.5 bg-zinc-950/70 hover:bg-zinc-800 rounded-lg border border-zinc-800 flex flex-col items-center justify-center text-[10px] text-zinc-300 transition-colors"
            title="На самый низ (-100)"
          >
            <ChevronsDown className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
            <span>Низ</span>
          </button>
        </div>
      </div>

      {/* Lock & Visibility Toggles */}
      <div className="p-1.5 space-y-0.5">
        <button
          onClick={() => {
            onUpdateMapItem(mapItem.id, { locked: !mapItem.locked });
            onClose();
          }}
          className="w-full px-2.5 py-2 hover:bg-zinc-800 rounded-lg flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center space-x-2">
            {mapItem.locked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-zinc-400" />}
            <span className="text-xs">{mapItem.locked ? 'Разблокировать сдвиг' : 'Зафиксировать на столе'}</span>
          </div>
          <span className="text-[10px] text-zinc-400">{mapItem.locked ? 'Заблокирован' : 'Свободен'}</span>
        </button>

        <button
          onClick={() => {
            onUpdateMapItem(mapItem.id, { hiddenFromPlayers: !mapItem.hiddenFromPlayers });
            onClose();
          }}
          className="w-full px-2.5 py-2 hover:bg-zinc-800 rounded-lg flex items-center justify-between transition-colors text-left"
        >
          <div className="flex items-center space-x-2">
            {!mapItem.hiddenFromPlayers ? (
              <Eye className="w-4 h-4 text-emerald-400" />
            ) : (
              <EyeOff className="w-4 h-4 text-rose-400" />
            )}
            <span className="text-xs">
              {!mapItem.hiddenFromPlayers ? 'Скрыть от игроков' : 'Показать игрокам'}
            </span>
          </div>
          <span className={`text-[10px] ${!mapItem.hiddenFromPlayers ? 'text-emerald-400' : 'text-rose-400'}`}>
            {!mapItem.hiddenFromPlayers ? 'Видно игрокам' : 'Скрыто'}
          </span>
        </button>
      </div>

      {/* Opacity Presets */}
      <div className="p-2 space-y-1">
        <div className="flex items-center justify-between px-1 text-[10px] text-zinc-400">
          <span className="flex items-center space-x-1">
            <Sliders className="w-3 h-3" />
            <span>Прозрачность:</span>
          </span>
          <span className="font-bold text-amber-400">{Math.round((mapItem.opacity ?? 1) * 100)}%</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {[1.0, 0.75, 0.5, 0.25].map((val) => (
            <button
              key={val}
              onClick={() => {
                onUpdateMapItem(mapItem.id, { opacity: val });
                onClose();
              }}
              className={`py-1 rounded border text-[10px] font-mono transition-colors ${
                Math.abs((mapItem.opacity ?? 1) - val) < 0.05
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
                  : 'bg-zinc-950/60 border-zinc-800 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              {Math.round(val * 100)}%
            </button>
          ))}
        </div>
      </div>

      {/* Duplicate & Delete Actions */}
      <div className="p-1.5 space-y-0.5">
        {onDuplicateMap && (
          <button
            onClick={() => {
              onDuplicateMap(mapItem);
              onClose();
            }}
            className="w-full px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg flex items-center space-x-2 text-zinc-200 transition-colors text-left"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Дублировать объект (Ctrl+D)</span>
          </button>
        )}

        {onDeleteMap && (
          <button
            onClick={() => {
              onDeleteMap(mapItem.id);
              onClose();
            }}
            className="w-full px-2.5 py-1.5 hover:bg-rose-500/15 rounded-lg flex items-center space-x-2 text-rose-300 transition-colors text-left"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Удалить объект со стола</span>
          </button>
        )}
      </div>
    </div>
  );
};
