import React, { memo } from 'react';
import { MapItem, ActiveTool, ObjectLayerType } from '../types';
import { MediaRenderer } from './MediaRenderer';
import { SubmapPortalCard } from './SubmapPortalCard';
import { TabletopContentCard } from './TabletopContentCard';
import {
  Layers,
  Map as MapIcon,
  Box,
  Home,
  Sparkles,
  Lock,
  Unlock,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  Settings,
  EyeOff,
  Compass,
  ExternalLink,
} from 'lucide-react';

interface Props {
  mapItem: MapItem;
  isSelected: boolean;
  activeTool: ActiveTool;
  onSelect: (e: React.MouseEvent, mapItem: MapItem) => void;
  onStartRotate: (e: React.MouseEvent, mapItem: MapItem) => void;
  onStartResize: (e: React.MouseEvent, mapItem: MapItem) => void;
  onOpenLayerSettings?: (mapItem: MapItem) => void;
  onQuickUpdate?: (mapId: string, partial: Partial<MapItem>) => void;
  onContextMenu?: (e: React.MouseEvent, mapItem: MapItem) => void;
  onOpenSubmapTab?: (portalItem: MapItem) => void;
  onDeleteMap?: (mapId: string) => void;
  onOpenInitiative?: () => void;
}

const LAYER_INFO: Record<
  ObjectLayerType,
  { label: string; icon: React.FC<{ className?: string }>; color: string; bg: string; border: string }
> = {
  background: {
    label: 'Карта',
    icon: MapIcon,
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/40',
  },
  props: {
    label: 'Объект',
    icon: Box,
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
  },
  overhead: {
    label: 'Крыша',
    icon: Home,
    color: 'text-rose-400',
    bg: 'bg-rose-500/20',
    border: 'border-rose-500/40',
  },
  'above-fog': {
    label: 'Над туманом',
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/20',
    border: 'border-purple-500/40',
  },
};

const NEXT_LAYER: Record<ObjectLayerType, ObjectLayerType> = {
  background: 'props',
  props: 'overhead',
  overhead: 'above-fog',
  'above-fog': 'background',
};

export const MapCard: React.FC<Props> = memo(({
  mapItem,
  isSelected,
  activeTool,
  onSelect,
  onStartRotate,
  onStartResize,
  onOpenLayerSettings,
  onQuickUpdate,
  onContextMenu,
  onOpenSubmapTab,
  onDeleteMap,
  onOpenInitiative,
}) => {
  const currentLayer: ObjectLayerType = mapItem.layer || 'background';
  const layerMeta = LAYER_INFO[currentLayer] || LAYER_INFO.background;
  const LayerIcon = layerMeta.icon;

  const handleCycleLayer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      const next = NEXT_LAYER[currentLayer];
      onQuickUpdate(mapItem.id, { layer: next });
    }
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { locked: !mapItem.locked });
    }
  };

  const handleBringToFront = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { zIndex: (mapItem.zIndex || 0) + 10 });
    }
  };

  const handleSendToBack = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { zIndex: Math.max(0, (mapItem.zIndex || 0) - 10) });
    }
  };

  const handleBringForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { zIndex: (mapItem.zIndex || 0) + 1 });
    }
  };

  const handleSendBackward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { zIndex: Math.max(0, (mapItem.zIndex || 0) - 1) });
    }
  };

  const handleOpenSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenLayerSettings) {
      onOpenLayerSettings(mapItem);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(e, mapItem);
    } else if (onOpenLayerSettings) {
      onOpenLayerSettings(mapItem);
    }
  };

  return (
    <div
      onMouseDown={(e) => onSelect(e, mapItem)}
      onContextMenu={handleRightClick}
      className={`absolute pointer-events-auto transition-shadow transform-gpu select-none ${
        isSelected ? 'shadow-[0_0_25px_rgba(251,191,36,0.35)]' : ''
      }`}
      style={{
        left: `${mapItem.position.x}px`,
        top: `${mapItem.position.y}px`,
        width: `${mapItem.width * mapItem.scale.x}px`,
        height: `${mapItem.height * mapItem.scale.y}px`,
        transform: `rotate(${mapItem.rotation}deg)`,
        zIndex: mapItem.zIndex,
        opacity: mapItem.opacity,
        willChange: 'transform, left, top',
        contain: 'layout style',
      }}
    >
      {mapItem.isContentCard || mapItem.type === 'card' ? (
        <TabletopContentCard
          mapItem={mapItem}
          isSelected={isSelected}
          activeTool={activeTool}
          onQuickUpdate={onQuickUpdate}
          onDeleteMap={onDeleteMap}
          onOpenInitiative={onOpenInitiative}
        />
      ) : mapItem.isSubmapPortal ? (
        <SubmapPortalCard
          mapItem={mapItem}
          isSelected={isSelected}
          onOpenSubmapTab={onOpenSubmapTab}
        />
      ) : (
        <div
          className={`w-full h-full rounded-lg overflow-hidden border-2 transition-colors ${
            isSelected
              ? 'border-amber-400 ring-2 ring-amber-400/30'
              : mapItem.locked
              ? 'border-zinc-800/80 shadow-lg'
              : 'border-zinc-800 hover:border-zinc-600 shadow-2xl'
          }`}
        >
          <MediaRenderer mapItem={mapItem} />
        </div>
      )}

      {/* Map Title Tag & Layer Status (for standard maps/props, not for content cards) */}
      {!mapItem.isSubmapPortal && !mapItem.isContentCard && mapItem.type !== 'card' && (
        <div className="absolute top-2 left-2 flex items-center space-x-1 pointer-events-auto select-none">
          <div className="bg-zinc-950/85 backdrop-blur-md px-2 py-1 rounded text-[11px] font-medium text-zinc-200 border border-zinc-800/80 flex items-center space-x-1.5 shadow-md">
            <span>{mapItem.name}</span>
            <span className="text-[9px] text-amber-400 uppercase font-mono bg-zinc-900 px-1 rounded border border-zinc-800">
              {mapItem.format}
            </span>
          </div>

          {/* Assigned Layer Pill Badge - Clickable to open Layer Binding */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenLayerSettings) onOpenLayerSettings(mapItem);
            }}
            onContextMenu={handleRightClick}
            className={`px-1.5 py-1 rounded text-[10px] font-bold border flex items-center space-x-1 backdrop-blur-md shadow-md hover:brightness-125 cursor-pointer transition-all ${layerMeta.bg} ${layerMeta.border} ${layerMeta.color}`}
            title="Слой объекта (нажмите для привязки к слою или ПКМ)"
          >
            <LayerIcon className="w-3 h-3" />
            <span>{layerMeta.label}</span>
          </button>

          {/* Locked Status Badge */}
          {mapItem.locked && (
            <div className="px-1.5 py-1 rounded text-[10px] font-semibold border border-amber-500/30 bg-amber-500/20 text-amber-300 flex items-center space-x-1 backdrop-blur-md shadow-md">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Зафиксирован</span>
            </div>
          )}

          {/* Hidden From Players Badge */}
          {mapItem.hiddenFromPlayers && (
            <div className="px-1.5 py-1 rounded text-[10px] font-semibold border border-rose-500/30 bg-rose-500/20 text-rose-300 flex items-center space-x-1 backdrop-blur-md shadow-md">
              <EyeOff className="w-3 h-3 text-rose-400" />
              <span>Скрыт</span>
            </div>
          )}
        </div>
      )}

      {/* Interactive Layer Assignment & Z-Index Floating Bar (When Selected) */}
      {activeTool === 'select' && isSelected && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute -top-12 left-0 right-0 flex items-center justify-between px-2 py-1 bg-zinc-950/90 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl z-30 pointer-events-auto select-none"
        >
          {mapItem.isSubmapPortal ? (
            <button
              onClick={() => onOpenSubmapTab && onOpenSubmapTab(mapItem)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Развернуть сцену</span>
            </button>
          ) : (
            /* Quick Layer Switcher */
            <button
              onClick={handleCycleLayer}
              className={`px-2 py-1 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-colors ${layerMeta.bg} ${layerMeta.border} ${layerMeta.color} hover:brightness-125`}
              title="Нажмите, чтобы переключить слой объекта"
            >
              <LayerIcon className="w-3.5 h-3.5" />
              <span>Слой: {layerMeta.label}</span>
            </button>
          )}

          {/* Quick Z-Index Reorder Buttons */}
          <div className="flex items-center space-x-1 bg-zinc-900/90 px-1.5 py-0.5 rounded-lg border border-zinc-800">
            <button
              onClick={handleSendToBack}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="На самый низ слоя (Z-Index -10)"
            >
              <ChevronsDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleSendBackward}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="Опустить ниже (Z-Index -1)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono font-bold text-amber-400 px-1">
              z:{mapItem.zIndex || 0}
            </span>
            <button
              onClick={handleBringForward}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="Поднять выше (Z-Index +1)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleBringToFront}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="На самый верх слоя (Z-Index +10)"
            >
              <ChevronsUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Lock & Full Settings Buttons */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleToggleLock}
              className={`p-1.5 rounded-lg border transition-colors ${
                mapItem.locked
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title={mapItem.locked ? 'Разблокировать позицию' : 'Зафиксировать позицию'}
            >
              {mapItem.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleOpenSettings}
              className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg transition-colors"
              title="Настройки привязки к слоям"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* Manipulation Handles for Active Map (Disabled if locked) */}
      {activeTool === 'select' && isSelected && !mapItem.locked && (
        <>
          {/* Rotate handle (top center) */}
          <div
            onMouseDown={(e) => onStartRotate(e, mapItem)}
            className="absolute -top-10 left-1/2 -translate-x-1/2 w-7 h-7 bg-zinc-900 border-2 border-amber-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-zinc-800 pointer-events-auto z-10 select-none shadow-lg"
            title="Rotate Map"
          >
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
          </div>

          {/* Rotate connection line */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-[2px] h-6 bg-amber-400 pointer-events-none z-0" />

          {/* Resize handle (bottom right) */}
          <div
            onMouseDown={(e) => onStartResize(e, mapItem)}
            className="absolute -bottom-3 -right-3 w-6 h-6 bg-zinc-900 border-2 border-amber-400 rounded-sm flex items-center justify-center cursor-nwse-resize hover:bg-zinc-800 pointer-events-auto z-10 select-none shadow-lg"
            title="Scale Map"
          >
            <div className="w-2 h-2 bg-amber-400 rounded-sm" />
          </div>
        </>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.isSelected === next.isSelected &&
    prev.activeTool === next.activeTool &&
    prev.mapItem.id === next.mapItem.id &&
    prev.mapItem.position.x === next.mapItem.position.x &&
    prev.mapItem.position.y === next.mapItem.position.y &&
    prev.mapItem.scale.x === next.mapItem.scale.x &&
    prev.mapItem.scale.y === next.mapItem.scale.y &&
    prev.mapItem.rotation === next.mapItem.rotation &&
    prev.mapItem.zIndex === next.mapItem.zIndex &&
    prev.mapItem.opacity === next.mapItem.opacity &&
    prev.mapItem.layer === next.mapItem.layer &&
    prev.mapItem.locked === next.mapItem.locked &&
    prev.mapItem.hiddenFromPlayers === next.mapItem.hiddenFromPlayers &&
    prev.mapItem.url === next.mapItem.url &&
    prev.mapItem.name === next.mapItem.name
  );
});
