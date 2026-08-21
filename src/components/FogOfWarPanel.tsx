import React from 'react';
import { FogState, ActiveTool, FogStyleType } from '../types';
import {
  Eye,
  EyeOff,
  Eraser,
  Paintbrush,
  Wind,
  Cloud,
  Layers,
  Sparkles,
} from 'lucide-react';

interface Props {
  fog: FogState;
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  onUpdateFog: (fogPartial: Partial<FogState>) => void;
  fogBrushRadius: number;
  onChangeBrushRadius: (radius: number) => void;
  onResetFog: (fillWithFog: boolean) => void;
}

const FOG_STYLES: { id: FogStyleType; label: string; icon: string; previewColor: string }[] = [
  {
    id: 'white-mist',
    label: 'White Mist',
    icon: '🌫️',
    previewColor: '#e2e8f0',
  },
  {
    id: 'mystic-blue',
    label: 'Ghost Blue',
    icon: '👻',
    previewColor: '#38bdf8',
  },
  {
    id: 'poison-fog',
    label: 'Poison Gas',
    icon: '🧪',
    previewColor: '#4ade80',
  },
  {
    id: 'midnight-shadow',
    label: 'Pitch Abyss',
    icon: '🌑',
    previewColor: '#0f172a',
  },
];

export const FogOfWarPanel: React.FC<Props> = ({
  fog,
  activeTool,
  onSelectTool,
  onUpdateFog,
  fogBrushRadius,
  onChangeBrushRadius,
  onResetFog,
}) => {
  const currentStyle = fog.style || 'white-mist';
  const isAnimated = fog.animated !== false;

  return (
    <div className="w-full text-zinc-200 select-none flex flex-col space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-400">
          <Cloud className="w-4 h-4" />
          <span>Volumetric Mist Engine</span>
        </div>

        <button
          onClick={() => onUpdateFog({ enabled: !fog.enabled })}
          className={`px-2 py-0.5 text-[10px] rounded font-mono border transition-colors ${
            fog.enabled
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}
        >
          {fog.enabled ? 'ACTIVE' : 'OFF'}
        </button>
      </div>

      {/* Mist Style / Theme Presets */}
      <div>
        <label className="text-[11px] text-zinc-400 mb-1.5 flex items-center justify-between">
          <span className="flex items-center space-x-1">
            <Layers className="w-3 h-3 text-cyan-400" />
            <span>Mist Atmosphere</span>
          </span>
          <span className="text-[10px] font-mono text-cyan-300">
            {FOG_STYLES.find((s) => s.id === currentStyle)?.label}
          </span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {FOG_STYLES.map((style) => (
            <button
              key={style.id}
              onClick={() => onUpdateFog({ style: style.id })}
              className={`flex items-center space-x-2 p-1.5 rounded-lg border text-left text-xs transition-all ${
                currentStyle === style.id
                  ? 'bg-zinc-800 border-cyan-400 text-white font-bold shadow'
                  : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">{style.icon}</span>
              <div className="truncate">
                <div className="text-[11px] leading-tight truncate">{style.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Billowing Mist Animation Toggle */}
      <div className="flex items-center justify-between bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
        <span className="text-[11px] text-zinc-300 flex items-center space-x-1.5">
          <Wind className={`w-3.5 h-3.5 ${isAnimated ? 'text-cyan-400 animate-pulse' : 'text-zinc-500'}`} />
          <span>Swirling Billowing Drift</span>
        </span>
        <button
          onClick={() => onUpdateFog({ animated: !isAnimated })}
          className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
            isAnimated
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700'
          }`}
        >
          {isAnimated ? 'SWIRLING ON' : 'PAUSED'}
        </button>
      </div>

      {/* Fog Opacity Slider */}
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
          <span>MIST OPACITY</span>
          <span className="text-cyan-300 font-bold">{Math.round((fog.opacity || 0.95) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0.3"
          max="1.0"
          step="0.05"
          value={fog.opacity || 0.95}
          onChange={(e) => onUpdateFog({ opacity: parseFloat(e.target.value) })}
          className="w-full accent-cyan-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Brush Tools */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          onClick={() => onSelectTool(activeTool === 'fog-reveal' ? 'select' : 'fog-reveal')}
          className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeTool === 'fog-reveal'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm font-bold'
              : 'bg-zinc-800/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Eraser className="w-3.5 h-3.5 text-emerald-400" />
          <span>Reveal Torch</span>
        </button>

        <button
          onClick={() => onSelectTool(activeTool === 'fog-conceal' ? 'select' : 'fog-conceal')}
          className={`flex items-center justify-center space-x-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeTool === 'fog-conceal'
              ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-sm font-bold'
              : 'bg-zinc-800/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
        >
          <Paintbrush className="w-3.5 h-3.5 text-red-400" />
          <span>Conceal Mist</span>
        </button>
      </div>

      {/* Brush Radius Slider */}
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
          <span>BRUSH RADIUS</span>
          <span className="text-zinc-200">{fogBrushRadius}px</span>
        </div>
        <input
          type="range"
          min="20"
          max="300"
          value={fogBrushRadius}
          onChange={(e) => onChangeBrushRadius(parseInt(e.target.value, 10))}
          className="w-full accent-cyan-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Reset Options */}
      <div className="grid grid-cols-2 gap-1.5 pt-1">
        <button
          onClick={() => onResetFog(true)}
          className="py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors flex items-center justify-center space-x-1"
          title="Cover entire map with thick mist"
        >
          <EyeOff className="w-3 h-3 text-red-400" />
          <span>Cover All</span>
        </button>

        <button
          onClick={() => onResetFog(false)}
          className="py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 rounded-lg border border-zinc-700/60 transition-colors flex items-center justify-center space-x-1"
          title="Disperse all mist from map"
        >
          <Eye className="w-3 h-3 text-emerald-400" />
          <span>Clear All</span>
        </button>
      </div>
    </div>
  );
};
