import React, { memo } from 'react';
import {
  ActiveTool,
  ToolSettings,
  SpellShapeType,
  SpellEffectType,
  AnimatedEffectType,
} from '../types';
import {
  MousePointer,
  Hand,
  Crosshair,
  Paintbrush,
  Highlighter,
  Eraser,
  Circle,
  Triangle,
  Minus,
  Square,
  Flame,
  Droplets,
  Eye,
  EyeOff,
  Trash2,
  Sparkles,
  Zap,
  Skull,
  Shield,
  RotateCw,
  RotateCcw,
  Compass,
  Layers,
} from 'lucide-react';
import { CARDINAL_DIRECTIONS, normalizeAngle } from '../utils/spellGeometry';

interface Props {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  toolSettings: ToolSettings;
  onUpdateToolSettings: (settings: Partial<ToolSettings>) => void;
  onClearDrawings: () => void;
  onClearSpellTemplates: () => void;
  onOpenLayersConfig?: () => void;
}

const COLOR_PALETTE = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ffffff', // White
  '#18181b', // Dark
];

const SPELL_RADIUS_PRESETS = [
  { label: '5 ft (Touch)', feet: 5 },
  { label: '10 ft', feet: 10 },
  { label: '15 ft (Burning Hands)', feet: 15 },
  { label: '20 ft (Fireball)', feet: 20 },
  { label: '30 ft (Cone of Cold)', feet: 30 },
  { label: '60 ft', feet: 60 },
];

export const PhotoshopToolbar: React.FC<Props> = memo(({
  activeTool,
  onSelectTool,
  toolSettings,
  onUpdateToolSettings,
  onClearDrawings,
  onClearSpellTemplates,
  onOpenLayersConfig,
}) => {
  const isDrawingTool = activeTool === 'brush' || activeTool === 'highlighter' || activeTool === 'eraser';
  const isSpellTool =
    activeTool === 'spell-circle' ||
    activeTool === 'spell-cone' ||
    activeTool === 'spell-line' ||
    activeTool === 'spell-square';
  const isEffectTool = activeTool === 'effect-fire' || activeTool === 'effect-water';
  const isLaserTool = activeTool === 'laser';
  const isFogTool = activeTool === 'fog-reveal' || activeTool === 'fog-conceal';

  return (
    <div className="relative h-full min-h-0 pointer-events-auto select-none flex flex-col justify-center">
      {/* Primary Vertical Photoshop Toolbar */}
      <div className="flex flex-col flex-wrap content-start items-center justify-center bg-zinc-900/95 backdrop-blur-md border border-zinc-800 p-1.5 rounded-2xl shadow-2xl gap-1 max-h-full">
        {/* Navigation & Selection Tools */}
        <button
          onClick={() => onSelectTool('select')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'select'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Select & Transform Maps (V)"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('pan')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'pan'
              ? 'bg-amber-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Hand / Pan Canvas (H / Middle Mouse)"
        >
          <Hand className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('laser')}
          className={`p-2 rounded-xl transition-all relative ${
            activeTool === 'laser'
              ? 'bg-red-500 text-white font-bold shadow-md scale-105 ring-2 ring-red-400/50'
              : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800'
          }`}
          title="Laser Pointer & Ping (P / Hold Click)"
        >
          <Crosshair className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
        </button>

        <div className="w-6 h-[1px] bg-zinc-800 " />

        {/* Freehand Drawing Tools */}
        <button
          onClick={() => onSelectTool('brush')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'brush'
              ? 'bg-indigo-500 text-white font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Brush Pen (B)"
        >
          <Paintbrush className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('highlighter')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'highlighter'
              ? 'bg-yellow-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Marker / Highlighter (M)"
        >
          <Highlighter className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('eraser')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'eraser'
              ? 'bg-rose-500 text-white font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Eraser (E)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-zinc-800 " />

        {/* AoE / Zone Templates (Circle, Cone, Line, Square) */}
        <button
          onClick={() => onSelectTool('spell-circle')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'spell-circle'
              ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800'
          }`}
          title="AoE: Круг / Радиус / Аура (C)"
        >
          <Circle className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('spell-cone')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'spell-cone'
              ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800'
          }`}
          title="AoE: Конус / Сектор / Рассеивание"
        >
          <Triangle className="w-4 h-4 rotate-90" />
        </button>

        <button
          onClick={() => onSelectTool('spell-line')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'spell-line'
              ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800'
          }`}
          title="AoE: Линия / Луч / Траектория"
        >
          <Minus className="w-4 h-4 rotate-45" />
        </button>

        <button
          onClick={() => onSelectTool('spell-square')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'spell-square'
              ? 'bg-cyan-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800'
          }`}
          title="AoE: Квадрат / Куб / Область (R)"
        >
          <Square className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-zinc-800 " />

        {/* Animated Effects (Fire 🔥, Water 💧) */}
        <button
          onClick={() => onSelectTool('effect-fire')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'effect-fire'
              ? 'bg-amber-600 text-white font-bold shadow-md scale-105 ring-2 ring-amber-400/60'
              : 'text-amber-500 hover:text-amber-300 hover:bg-zinc-800'
          }`}
          title="Animated Fire Effect (Bonfire / Inferno)"
        >
          <Flame className="w-4 h-4 animate-pulse" />
        </button>

        <button
          onClick={() => onSelectTool('effect-water')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'effect-water'
              ? 'bg-sky-600 text-white font-bold shadow-md scale-105 ring-2 ring-sky-400/60'
              : 'text-sky-400 hover:text-sky-200 hover:bg-zinc-800'
          }`}
          title="Animated Water / Ripple Effect"
        >
          <Droplets className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-zinc-800 " />

        {/* Fog of War Brush Tools */}
        <button
          onClick={() => onSelectTool('fog-reveal')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'fog-reveal'
              ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800'
          }`}
          title="Reveal Fog Brush"
        >
          <Eye className="w-4 h-4" />
        </button>

        <button
          onClick={() => onSelectTool('fog-conceal')}
          className={`p-2 rounded-xl transition-all ${
            activeTool === 'fog-conceal'
              ? 'bg-red-500 text-white font-bold shadow-md scale-105'
              : 'text-zinc-400 hover:text-red-400 hover:bg-zinc-800'
          }`}
          title="Conceal Fog Brush"
        >
          <EyeOff className="w-4 h-4" />
        </button>

        {onOpenLayersConfig && (
          <>
            <div className="w-6 h-[1px] bg-zinc-800 " />
            <button
              onClick={onOpenLayersConfig}
              className="p-2 rounded-xl transition-all text-amber-400 hover:text-amber-300 hover:bg-amber-500/15"
              title="Управление слоями стола (L)"
            >
              <Layers className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
});

