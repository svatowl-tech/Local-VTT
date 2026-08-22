import React, { memo, useState } from 'react';
import {
  ActiveTool,
  ToolSettings,
  SpellEffectType,
} from '../types';
import {
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
  Crosshair,
  X,
  ChevronLeft,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { CARDINAL_DIRECTIONS, normalizeAngle } from '../utils/spellGeometry';

interface Props {
  activeTool: ActiveTool;
  toolSettings: ToolSettings;
  onUpdateToolSettings: (settings: Partial<ToolSettings>) => void;
  onClearDrawings: () => void;
  onClearSpellTemplates: () => void;
  onClose?: () => void;
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
  { label: '5 ft', feet: 5 },
  { label: '10 ft', feet: 10 },
  { label: '15 ft', feet: 15 },
  { label: '20 ft', feet: 20 },
  { label: '30 ft', feet: 30 },
  { label: '60 ft', feet: 60 },
];

export const ToolSettingsFlyout: React.FC<Props> = memo(({
  activeTool,
  toolSettings,
  onUpdateToolSettings,
  onClearDrawings,
  onClearSpellTemplates,
  onClose,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isDrawingTool = activeTool === 'brush' || activeTool === 'highlighter' || activeTool === 'eraser';
  const isSpellTool =
    activeTool === 'spell-circle' ||
    activeTool === 'spell-cone' ||
    activeTool === 'spell-line' ||
    activeTool === 'spell-square';
  const isEffectTool = activeTool === 'effect-fire' || activeTool === 'effect-water';
  const isLaserTool = activeTool === 'laser';
  const isFogTool = activeTool === 'fog-reveal' || activeTool === 'fog-conceal';

  if (!isDrawingTool && !isSpellTool && !isEffectTool && !isLaserTool && !isFogTool) {
    return null;
  }

  const getToolTitle = () => {
    switch (activeTool) {
      case 'brush':
        return { name: 'Кисть пера', icon: <Paintbrush className="w-3.5 h-3.5 text-indigo-400" /> };
      case 'highlighter':
        return { name: 'Маркер / Хайлайтер', icon: <Highlighter className="w-3.5 h-3.5 text-yellow-400" /> };
      case 'eraser':
        return { name: 'Ластик рисования', icon: <Eraser className="w-3.5 h-3.5 text-rose-400" /> };
      case 'spell-circle':
        return { name: 'Зона: Сфера / Радиус / Аура', icon: <Circle className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'spell-cone':
        return { name: 'Зона: Конус / Сектор', icon: <Triangle className="w-3.5 h-3.5 text-cyan-400 rotate-90" /> };
      case 'spell-line':
        return { name: 'Зона: Линия / Луч / Траектория', icon: <Minus className="w-3.5 h-3.5 text-cyan-400 rotate-45" /> };
      case 'spell-square':
        return { name: 'Зона: Куб / Область', icon: <Square className="w-3.5 h-3.5 text-cyan-400" /> };
      case 'effect-fire':
        return { name: 'Анимированный Огонь', icon: <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> };
      case 'effect-water':
        return { name: 'Анимированная Вода', icon: <Droplets className="w-3.5 h-3.5 text-sky-400" /> };
      case 'laser':
        return { name: 'Лазерная Указка', icon: <Crosshair className="w-3.5 h-3.5 text-red-500" /> };
      case 'fog-reveal':
        return { name: 'Рассеять Туман (Факел)', icon: <Eye className="w-3.5 h-3.5 text-emerald-400" /> };
      case 'fog-conceal':
        return { name: 'Скрыть Туманом', icon: <EyeOff className="w-3.5 h-3.5 text-red-400" /> };
      default:
        return { name: 'Настройки инструмента', icon: <Sliders className="w-3.5 h-3.5 text-zinc-400" /> };
    }
  };

  const toolInfo = getToolTitle();

  if (isCollapsed) {
    return (
      <div
        id="tool_settings_collapsed_btn"
        className="pointer-events-auto select-none bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/80 rounded-2xl shadow-2xl p-2 flex items-center space-x-2 text-zinc-300 hover:text-white transition-all cursor-pointer"
        onClick={() => setIsCollapsed(false)}
        title="Развернуть панель параметров инструмента"
      >
        <div className="p-1 rounded-lg bg-zinc-800 border border-zinc-700">
          {toolInfo.icon}
        </div>
        <span className="text-xs font-semibold">{toolInfo.name}</span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
      </div>
    );
  }

  return (
    <div
      id="tool_settings_flyout_panel"
      className="w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800/90 rounded-2xl shadow-2xl p-3.5 space-y-3 pointer-events-auto select-none animate-fadeIn text-zinc-200 z-40 max-h-[calc(100vh-140px)] overflow-y-auto scrollbar-none"
    >
      {/* Header with Title & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shadow-inner">
            {toolInfo.icon}
          </div>
          <span className="text-xs font-bold text-zinc-100 tracking-wide">
            {toolInfo.name}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Свернуть панель"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
              title="Закрыть панель"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 1. Freehand Drawing Tools (Brush, Marker, Eraser) */}
      {isDrawingTool && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">Действия с рисунком</span>
            <button
              onClick={onClearDrawings}
              className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center space-x-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-rose-900 transition-colors"
              title="Очистить все нарисованные линии"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Очистить всё</span>
            </button>
          </div>

          {activeTool !== 'eraser' && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                <span>Палитра цвета</span>
                <span className="font-mono text-[10px] text-zinc-300 uppercase">
                  {toolSettings.brushColor}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdateToolSettings({ brushColor: c })}
                    className={`w-7 h-7 rounded-lg border transition-all ${
                      toolSettings.brushColor === c
                        ? 'scale-110 border-white ring-2 ring-indigo-500/50 shadow'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span>Толщина линии</span>
              <span className="font-mono text-zinc-100 font-bold text-xs">{toolSettings.brushSize} px</span>
            </div>
            <div className="grid grid-cols-5 gap-1 mb-1.5 text-[10px]">
              {[2, 6, 12, 24, 40].map((sz) => (
                <button
                  key={sz}
                  onClick={() => onUpdateToolSettings({ brushSize: sz })}
                  className={`py-1 rounded text-center transition-all ${
                    toolSettings.brushSize === sz
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
            <input
              type="range"
              min="2"
              max="60"
              value={toolSettings.brushSize}
              onChange={(e) => onUpdateToolSettings({ brushSize: parseInt(e.target.value, 10) })}
              className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {activeTool === 'brush' && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Прозрачность (Непрозрачность)</span>
                <span className="font-mono text-zinc-100 font-bold text-xs">
                  {Math.round(toolSettings.brushOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={toolSettings.brushOpacity}
                onChange={(e) =>
                  onUpdateToolSettings({ brushOpacity: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* 2. Spell AoE Templates */}
      {isSpellTool && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-cyan-400 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Зона поражения / AoE</span>
            </span>
            <button
              onClick={onClearSpellTemplates}
              className="text-[10px] text-zinc-400 hover:text-rose-400 flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-rose-900 transition-colors"
              title="Удалить все зоны и шаблоны эффектов"
            >
              <Trash2 className="w-3 h-3 text-rose-400" />
              <span>Очистить</span>
            </button>
          </div>

          {/* Spell Size / Radius */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span>{activeTool === 'spell-cone' ? 'Дальность конуса' : 'Радиус / Размер зоны'}</span>
              <span className="font-mono text-cyan-300 font-bold text-xs">
                {toolSettings.spellFeetRadius} ft / {Math.round(toolSettings.spellFeetRadius * 0.3)} м ({Math.round(toolSettings.spellFeetRadius / 5)} кл)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[11px] mb-1.5">
              {(activeTool === 'spell-cone'
                ? [
                    { label: '3 м / 10 ft', feet: 10 },
                    { label: '6 м / 20 ft', feet: 20 },
                    { label: '15 м / 50 ft', feet: 50 },
                  ]
                : [
                    { label: '3 м / 10 ft', feet: 10 },
                    { label: '6 м / 20 ft', feet: 20 },
                    { label: '9 м / 30 ft', feet: 30 },
                    { label: '12 м / 40 ft', feet: 40 },
                    { label: '18 м / 60 ft', feet: 60 },
                    { label: '30 м / 100 ft', feet: 100 },
                  ]
              ).map((p) => (
                <button
                  key={p.feet}
                  onClick={() => onUpdateToolSettings({ spellFeetRadius: p.feet })}
                  className={`px-1.5 py-1 rounded-md text-center transition-all truncate text-[10px] ${
                    toolSettings.spellFeetRadius === p.feet
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 font-bold'
                      : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={toolSettings.spellFeetRadius}
              onChange={(e) =>
                onUpdateToolSettings({ spellFeetRadius: parseInt(e.target.value, 10) })
              }
              className="w-full accent-cyan-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Cone & Line Aim Direction */}
          {(activeTool === 'spell-cone' || activeTool === 'spell-line') && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center space-x-1">
                  <Compass className="w-3 h-3 text-cyan-400" />
                  <span>Направление прицеливания</span>
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() =>
                      onUpdateToolSettings({
                        spellAngle: normalizeAngle((toolSettings.spellAngle || 0) - 45),
                      })
                    }
                    className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-colors"
                    title="Повернуть влево на 45°"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-cyan-300 font-bold text-[10px] w-8 text-center">
                    {toolSettings.spellAngle || 0}°
                  </span>
                  <button
                    onClick={() =>
                      onUpdateToolSettings({
                        spellAngle: normalizeAngle((toolSettings.spellAngle || 0) + 45),
                      })
                    }
                    className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-colors"
                    title="Повернуть вправо на 45°"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Cardinal Compass Quick Buttons */}
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {CARDINAL_DIRECTIONS.map((d) => (
                  <button
                    key={d.angle}
                    onClick={() => onUpdateToolSettings({ spellAngle: d.angle })}
                    className={`p-1 rounded flex items-center justify-center space-x-1 border transition-all ${
                      (toolSettings.spellAngle || 0) === d.angle
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/60 font-bold'
                        : 'bg-zinc-900 text-zinc-400 border-transparent hover:bg-zinc-800'
                    }`}
                    title={d.label}
                  >
                    <span>{d.arrow}</span>
                    <span className="text-[9px]">{d.angle}°</span>
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="0"
                max="359"
                step="5"
                value={toolSettings.spellAngle || 0}
                onChange={(e) =>
                  onUpdateToolSettings({ spellAngle: parseInt(e.target.value, 10) })
                }
                className="w-full accent-cyan-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Spell Element & School */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block">Стихия / Тип урона</label>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {(
                [
                  { type: 'fire', label: 'Огонь', color: '#f97316', icon: <Flame className="w-3 h-3 text-orange-400" /> },
                  { type: 'water', label: 'Вода / Холод', color: '#06b6d4', icon: <Droplets className="w-3 h-3 text-cyan-400" /> },
                  { type: 'lightning', label: 'Молния', color: '#eab308', icon: <Zap className="w-3 h-3 text-yellow-400" /> },
                  { type: 'necrotic', label: 'Некротика', color: '#a855f7', icon: <Skull className="w-3 h-3 text-purple-400" /> },
                  { type: 'holy', label: 'Свет / Святость', color: '#22c55e', icon: <Shield className="w-3 h-3 text-emerald-400" /> },
                  { type: 'arcane', label: 'Тайная магия', color: '#6366f1', icon: <Sparkles className="w-3 h-3 text-indigo-400" /> },
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  onClick={() =>
                    onUpdateToolSettings({
                      spellEffect: item.type as SpellEffectType,
                      spellColor: item.color,
                    })
                  }
                  className={`flex items-center space-x-1 p-1.5 rounded-lg border transition-all ${
                    toolSettings.spellEffect === item.type
                      ? 'bg-zinc-800 border-white text-white font-bold shadow'
                      : 'border-zinc-800 text-zinc-400 bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 leading-relaxed">
            💡 <span className="text-zinc-200 font-semibold">Управление:</span> Кликните на стол для размещения или зажмите мышь для растягивания радиуса и прицеливания конуса!
          </div>
        </div>
      )}

      {/* 3. Animated Effects (Fire 🔥, Water 💧) */}
      {isEffectTool && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span>Радиус зоны эффекта</span>
              <span className="font-mono text-amber-300 font-bold text-xs">{toolSettings.effectRadius} px</span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-[10px] mb-1.5">
              {[40, 80, 140, 220].map((r) => (
                <button
                  key={r}
                  onClick={() => onUpdateToolSettings({ effectRadius: r })}
                  className={`py-1 rounded text-center transition-all ${
                    toolSettings.effectRadius === r
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {r}px
                </button>
              ))}
            </div>

            <input
              type="range"
              min="30"
              max="300"
              value={toolSettings.effectRadius}
              onChange={(e) =>
                onUpdateToolSettings({ effectRadius: parseInt(e.target.value, 10) })
              }
              className="w-full accent-amber-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="text-[10px] text-zinc-400 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 leading-relaxed space-y-1">
            <p className="font-semibold text-zinc-200">✨ Мульти-точечные реки и пламя:</p>
            <p>• Кликайте по карте, чтобы рисовать соединенные русла рек или полосы огня.</p>
            <p>• При пересечении огня и воды рождается реалистичный клубящийся пар!</p>
          </div>
        </div>
      )}

      {/* 4. Laser Pointer */}
      {isLaserTool && (
        <div className="space-y-3">
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block">Цвет лазерного луча</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { color: '#ef4444', name: 'Красный' },
                { color: '#06b6d4', name: 'Циан' },
                { color: '#22c55e', name: 'Зелёный' },
                { color: '#eab308', name: 'Золото' },
              ].map((l) => (
                <button
                  key={l.color}
                  onClick={() => onUpdateToolSettings({ laserColor: l.color })}
                  className={`h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold text-white transition-transform ${
                    toolSettings.laserColor === l.color
                      ? 'scale-105 border-white ring-2 ring-red-500/50 shadow'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: l.color }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] text-zinc-400 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 space-y-1">
            <p className="font-semibold text-zinc-200">🎯 Трансляция на экран игроков:</p>
            <p>• Зажмите ЛКМ и ведите по карте — игроки мгновенно увидят светящуюся пульсирующую точку и импульсные кольца пинга.</p>
          </div>
        </div>
      )}

      {/* 5. Fog of War Brush (Reveal, Conceal) */}
      {isFogTool && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
              <span>Радиус факела / рассеивания</span>
              <span className="font-mono text-emerald-300 font-bold text-xs">{toolSettings.brushSize * 2} px</span>
            </div>

            <div className="grid grid-cols-4 gap-1 text-[10px] mb-1.5">
              {[40, 80, 160, 260].map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdateToolSettings({ brushSize: Math.round(size / 2) })}
                  className={`py-1 rounded text-center transition-all ${
                    toolSettings.brushSize * 2 === size
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>

            <input
              type="range"
              min="20"
              max="350"
              value={toolSettings.brushSize * 2}
              onChange={(e) =>
                onUpdateToolSettings({ brushSize: Math.round(parseInt(e.target.value, 10) / 2) })
              }
              className="w-full accent-emerald-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="text-[10px] text-zinc-400 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800 leading-relaxed">
            🌫️ <span className="text-zinc-200 font-semibold">Объемный туман:</span> Кисть плавно сглаживает границы и открывает игрокам только освещенные области с мягким факельным градиентом.
          </div>
        </div>
      )}
    </div>
  );
});
