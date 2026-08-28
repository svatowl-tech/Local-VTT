import React, { useState, useEffect, useRef } from 'react';
import {
  Laptop,
  Maximize2,
  Minimize2,
  Sparkles,
  Sliders,
  Check,
  Monitor,
  LayoutGrid,
} from 'lucide-react';
import {
  uiDensityService,
  UiDensityMode,
  UiScalePercent,
  UiDensitySettings,
} from '../services/uiDensityService';

export const UiDensityControl: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<UiDensitySettings>(() => uiDensityService.getSettings());
  const [isCompact, setIsCompact] = useState<boolean>(() => uiDensityService.isCompactActive());
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = uiDensityService.subscribe((newSettings, compactActive) => {
      setSettings(newSettings);
      setIsCompact(compactActive);
    });
    return unsub;
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleModeSelect = (mode: UiDensityMode) => {
    uiDensityService.setMode(mode);
  };

  const handleScaleSelect = (scale: UiScalePercent) => {
    uiDensityService.setScale(scale);
  };

  return (
    <div className="relative shrink-0" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border transition-all ${
          isCompact
            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
        }`}
        title={`Масштаб и плотность интерфейса: ${
          settings.mode === 'auto'
            ? `Авто (${isCompact ? 'Компактный 720p' : 'Стандарт'})`
            : settings.mode === 'compact'
            ? 'Компактный (11" / 720p)'
            : 'Стандартный'
        }`}
      >
        <Laptop className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span className="hidden 2xl:inline">
          {isCompact ? '720p Компакт' : 'Интерфейс'}
        </span>
        {isCompact && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
        )}
      </button>

      {isOpen && (
        <div
          className="fixed sm:absolute top-12 right-2 sm:right-0 w-72 bg-zinc-950/98 backdrop-blur-xl border border-zinc-700/90 rounded-2xl shadow-2xl p-3 z-50 text-xs text-zinc-200 animate-in fade-in zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2.5">
            <div className="flex items-center space-x-1.5">
              <Laptop className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs text-zinc-100">
                Оптимизация под экран
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              {window.innerWidth}×{window.innerHeight}
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
            Настройте компактность панелей, отступов и кнопок для удобной работы на 11-дюймовых экранах и 720p ноутбуках.
          </p>

          {/* Mode Selector */}
          <div className="space-y-1.5 mb-3">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              Режим плотности:
            </label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => handleModeSelect('auto')}
                className={`px-2 py-1.5 rounded-xl text-center text-xs font-semibold transition-all border ${
                  settings.mode === 'auto'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div>Авто</div>
                <div className="text-[9px] opacity-75 font-normal">
                  {isCompact ? '720p' : 'FHD'}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeSelect('compact')}
                className={`px-2 py-1.5 rounded-xl text-center text-xs font-semibold transition-all border ${
                  settings.mode === 'compact'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div>Компакт</div>
                <div className="text-[9px] opacity-75 font-normal">11" / 720p</div>
              </button>

              <button
                type="button"
                onClick={() => handleModeSelect('comfortable')}
                className={`px-2 py-1.5 rounded-xl text-center text-xs font-semibold transition-all border ${
                  settings.mode === 'comfortable'
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                }`}
              >
                <div>Стандарт</div>
                <div className="text-[9px] opacity-75 font-normal">Крупный</div>
              </button>
            </div>
          </div>

          {/* Scale Percent Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                Масштаб элементов:
              </label>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {settings.scale}%
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {([85, 90, 100, 110] as UiScalePercent[]).map((sc) => (
                <button
                  key={sc}
                  type="button"
                  onClick={() => handleScaleSelect(sc)}
                  className={`py-1 rounded-lg text-center font-mono text-xs transition-all ${
                    settings.scale === sc
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {sc}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
