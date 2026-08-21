import React, { memo } from 'react';
import { MapItem } from '../types';
import { MediaRenderer } from './MediaRenderer';
import { Compass, ExternalLink, Sparkles, Map as MapIcon, Layers } from 'lucide-react';

interface Props {
  mapItem: MapItem;
  isSelected: boolean;
  onOpenSubmapTab?: (portalItem: MapItem) => void;
}

export const SubmapPortalCard: React.FC<Props> = memo(({
  mapItem,
  isSelected,
  onOpenSubmapTab,
}) => {
  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenSubmapTab) {
      onOpenSubmapTab(mapItem);
    }
  };

  return (
    <div className="w-full h-full relative group rounded-xl overflow-hidden bg-zinc-950 border-2 border-amber-500/80 shadow-2xl transition-all select-none">
      {/* Background Media Thumbnail */}
      <div className="w-full h-full relative">
        <MediaRenderer mapItem={mapItem} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        {/* Subtle Dark Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent pointer-events-none" />
      </div>

      {/* Top Floating Badge */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
        <div className="bg-amber-500/90 backdrop-blur-md text-zinc-950 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1 shadow-lg">
          <Compass className="w-3 h-3 text-zinc-950" />
          <span>{mapItem.portalBadgeText || 'ВХОД В ЛОКАЦИЮ'}</span>
        </div>

        <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
      </div>

      {/* Bottom Information & Action Bar */}
      <div className="absolute bottom-2 left-2 right-2 flex flex-col space-y-1.5 pointer-events-auto">
        <div className="bg-zinc-950/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-zinc-800 flex items-center justify-between shadow-lg">
          <div className="min-w-0 pr-2">
            <div className="text-xs font-bold text-zinc-100 truncate flex items-center space-x-1">
              <span>{mapItem.targetVaultMapName || mapItem.name}</span>
            </div>
            <div className="text-[10px] text-amber-400 font-mono">
              Интерактивная сцена
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenClick}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-extrabold rounded-md text-[11px] flex items-center space-x-1 transition-all shadow-md cursor-pointer shrink-0"
            title="Развернуть эту локацию как вкладку в верхней панели"
          >
            <span>Перейти</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
});
