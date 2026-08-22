import React from 'react';
import { GridSettings } from '../types';
import { Grid, X, Check } from 'lucide-react';
import { updateGridSettings } from '../services/apiClient';
import { FloatingWindow } from './FloatingWindow';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  grid: GridSettings;
  onUpdateGrid: (gridPartial: Partial<GridSettings>) => void;
  zIndex?: number;
  onFocus?: () => void;
}

export const GridOverlayConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  grid,
  onUpdateGrid,
  zIndex = 50,
  onFocus,
}) => {
  if (!isOpen) return null;

  const handleChange = (partial: Partial<GridSettings>) => {
    onUpdateGrid(partial);
  };

  return (
    <FloatingWindow
      id="grid-overlay-config-panel"
      title="Настройки Тактической Сетки"
      isOpen={isOpen}
      onClose={onClose}
      icon={Grid}
      defaultPosition={{ x: 280, y: 120 }}
      defaultSize={{ width: 440, height: 490 }}
      minWidth={320}
      minHeight={360}
      zIndex={zIndex}
      onFocus={onFocus}
    >
      <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4 text-zinc-100">
        {/* Enable Grid Toggle */}
        <div className="flex items-center justify-between p-3 bg-zinc-950/60 rounded-xl border border-zinc-800">
          <span className="text-xs font-semibold text-zinc-200">Включить сетку</span>
          <button
            onClick={() => handleChange({ enabled: !grid.enabled })}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
              grid.enabled ? 'bg-cyan-500 justify-end' : 'bg-zinc-800 justify-start'
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-zinc-950 shadow-md" />
          </button>
        </div>

        {/* Grid Type */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-zinc-400">Тип сетки</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleChange({ type: 'square' })}
              className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                grid.type === 'square'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Квадратная (Square)
            </button>
            <button
              onClick={() => handleChange({ type: 'hex' })}
              className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${
                grid.type === 'hex'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                  : 'bg-zinc-950/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              Гексагональная (Hex)
            </button>
          </div>
        </div>

        {/* Cell Size */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
            <span>РАЗМЕР КЛЕТКИ</span>
            <span className="font-bold text-cyan-400">{grid.size}px</span>
          </div>
          <input
            type="range"
            min="20"
            max="150"
            value={grid.size}
            onChange={(e) => handleChange({ size: parseInt(e.target.value, 10) })}
            className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Opacity */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-mono">
            <span>ПРОЗРАЧНОСТЬ</span>
            <span className="font-bold text-cyan-400">{Math.round(grid.opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1"
            step="0.05"
            value={grid.opacity}
            onChange={(e) => handleChange({ opacity: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Color Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono uppercase text-zinc-400">Цвет линий</label>
          <div className="flex items-center space-x-2.5">
            {['#ffffff', '#000000', '#22d3ee', '#fbbf24', '#34d399', '#f43f5e'].map((c) => (
              <button
                key={c}
                onClick={() => handleChange({ color: c })}
                className={`w-7 h-7 rounded-full border-2 transition-transform ${
                  grid.color === c ? 'scale-110 border-cyan-400 shadow-md ring-2 ring-cyan-500/40' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
};
