import React, { memo, useRef, useCallback } from 'react';
import { SpellTemplate } from '../types';
import {
  Trash2,
  Flame,
  Droplets,
  Sparkles,
  Zap,
  Skull,
  Shield,
  RotateCw,
  RotateCcw,
  Compass,
  Move,
} from 'lucide-react';
import {
  getConeGeometry,
  normalizeAngle,
  calculateAngleDegrees,
  pixelsToFeet,
  feetToPixels,
} from '../utils/spellGeometry';

interface Props {
  spellTemplates: SpellTemplate[];
  onRemoveTemplate?: (id: string) => void;
  onUpdateTemplate?: (id: string, partial: Partial<SpellTemplate>) => void;
  isMaster?: boolean;
  gridSize?: number;
}

export const SpellTemplatesLayer: React.FC<Props> = memo(({
  spellTemplates,
  onRemoveTemplate,
  onUpdateTemplate,
  isMaster = false,
  gridSize = 50,
}) => {
  const activeDragRef = useRef<{
    templateId: string;
    type: 'rotate' | 'length' | 'move';
    startX: number;
    startY: number;
    initialAngle: number;
    initialRadius: number;
    initialPos: { x: number; y: number };
  } | null>(null);

  const handleStartRotate = useCallback(
    (e: React.MouseEvent, template: SpellTemplate) => {
      if (!isMaster || !onUpdateTemplate) return;
      e.stopPropagation();
      e.preventDefault();

      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const originX = template.position.x;
      const originY = template.position.y;
      const initialAngle = template.angle || 0;

      const handleWindowMouseMove = (moveEv: MouseEvent) => {
        // Calculate angle from template apex origin to current cursor position
        // Notice: Need to calculate delta from start or use direct coordinates
        const deltaX = moveEv.clientX - startMouseX;
        const deltaY = moveEv.clientY - startMouseY;
        const targetX = originX + template.radius * Math.cos((initialAngle * Math.PI) / 180) + deltaX;
        const targetY = originY + template.radius * Math.sin((initialAngle * Math.PI) / 180) + deltaY;

        const newAngle = calculateAngleDegrees(originX, originY, targetX, targetY);
        onUpdateTemplate(template.id, { angle: newAngle });
      };

      const handleWindowMouseUp = () => {
        window.removeEventListener('mousemove', handleWindowMouseMove);
        window.removeEventListener('mouseup', handleWindowMouseUp);
      };

      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    },
    [isMaster, onUpdateTemplate]
  );

  const handleRotateStep = useCallback(
    (template: SpellTemplate, deltaAngle: number) => {
      if (!onUpdateTemplate) return;
      const currentAngle = template.angle || 0;
      const newAngle = normalizeAngle(currentAngle + deltaAngle);
      onUpdateTemplate(template.id, { angle: newAngle });
    },
    [onUpdateTemplate]
  );

  const handleAdjustLength = useCallback(
    (template: SpellTemplate, deltaFeet: number) => {
      if (!onUpdateTemplate) return;
      const currentFeet = template.feetRadius || 20;
      const newFeet = Math.max(5, Math.min(120, currentFeet + deltaFeet));
      const newRadius = feetToPixels(newFeet, gridSize);
      const newLabel = `${newFeet} ft ${template.effectType.toUpperCase()} ${template.type.toUpperCase()}`;

      onUpdateTemplate(template.id, {
        feetRadius: newFeet,
        radius: newRadius,
        length: newRadius,
        label: newLabel,
      });
    },
    [onUpdateTemplate, gridSize]
  );

  if (!spellTemplates || spellTemplates.length === 0) return null;

  const getEffectIcon = (type: string) => {
    switch (type) {
      case 'fire':
        return <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />;
      case 'water':
      case 'ice':
        return <Droplets className="w-3.5 h-3.5 text-cyan-400" />;
      case 'lightning':
        return <Zap className="w-3.5 h-3.5 text-yellow-300" />;
      case 'necrotic':
        return <Skull className="w-3.5 h-3.5 text-purple-400" />;
      case 'holy':
        return <Shield className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2000010 }}>
      <svg
        className="absolute w-[8000px] h-[8000px] -left-[4000px] -top-[4000px] pointer-events-none"
        viewBox="-4000 -4000 8000 8000"
      >
        <defs>
          {spellTemplates.map((t) => (
            <radialGradient key={`grad-${t.id}`} id={`grad-${t.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={t.color} stopOpacity="0.45" />
              <stop offset="65%" stopColor={t.color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={t.color} stopOpacity="0.65" />
            </radialGradient>
          ))}
        </defs>

        {spellTemplates.map((t) => {
          const { x, y } = t.position;
          const r = t.radius;
          const angle = t.angle || 0;

          if (t.type === 'cone') {
            // 53.13 degree D&D 5e Cone with rotatable angle and interactive handles
            const cone = getConeGeometry(x, y, r, angle);

            return (
              <g key={t.id}>
                {/* Outer glowing cone shape */}
                <path
                  d={cone.pathData}
                  fill={`url(#grad-${t.id})`}
                  stroke={t.color}
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />

                {/* Center Aiming Axis line */}
                <line
                  x1={x}
                  y1={y}
                  x2={cone.tipX}
                  y2={cone.tipY}
                  stroke={t.color}
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  opacity={0.7}
                />

                {/* Apex origin point */}
                <circle cx={x} cy={y} r={6} fill={t.color} />
                <circle cx={x} cy={y} r={12} fill="none" stroke={t.color} strokeWidth="1.5" opacity={0.6} />

                {/* Interactive Rotation & Direction Handle at the tip of the cone arc */}
                {isMaster && (
                  <g
                    className="pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    onMouseDown={(e) => handleStartRotate(e, t)}
                  >
                    <circle
                      cx={cone.tipX}
                      cy={cone.tipY}
                      r={14}
                      fill="#18181b"
                      stroke={t.color}
                      strokeWidth="2.5"
                    />
                    <circle cx={cone.tipX} cy={cone.tipY} r={5} fill={t.color} />
                  </g>
                )}
              </g>
            );
          }

          if (t.type === 'circle') {
            return (
              <g key={t.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={`url(#grad-${t.id})`}
                  stroke={t.color}
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
                <circle cx={x} cy={y} r={5} fill={t.color} />
                <circle cx={x} cy={y} r={12} fill="none" stroke={t.color} strokeWidth="1.5" />
              </g>
            );
          }

          if (t.type === 'line') {
            const length = t.length || r;
            const width = t.width || 50; // 5ft standard line width
            const rad = (angle * Math.PI) / 180;
            const tipX = x + length * Math.cos(rad);
            const tipY = y + length * Math.sin(rad);

            return (
              <g key={t.id}>
                <g transform={`translate(${x}, ${y}) rotate(${angle}) translate(0, ${-width / 2})`}>
                  <rect
                    x={0}
                    y={0}
                    width={length}
                    height={width}
                    fill={`url(#grad-${t.id})`}
                    stroke={t.color}
                    strokeWidth="2.5"
                    rx={4}
                    strokeDasharray="6 4"
                  />
                </g>
                <circle cx={x} cy={y} r={5} fill={t.color} />

                {/* Line rotation handle at the tip */}
                {isMaster && (
                  <g
                    className="pointer-events-auto cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    onMouseDown={(e) => handleStartRotate(e, t)}
                  >
                    <circle cx={tipX} cy={tipY} r={14} fill="#18181b" stroke={t.color} strokeWidth="2.5" />
                    <circle cx={tipX} cy={tipY} r={5} fill={t.color} />
                  </g>
                )}
              </g>
            );
          }

          if (t.type === 'square') {
            const side = r;
            return (
              <g key={t.id} transform={`translate(${x}, ${y}) rotate(${angle}) translate(${-side / 2}, ${-side / 2})`}>
                <rect
                  x={0}
                  y={0}
                  width={side}
                  height={side}
                  fill={`url(#grad-${t.id})`}
                  stroke={t.color}
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
                <circle cx={side / 2} cy={side / 2} r={5} fill={t.color} />
              </g>
            );
          }

          return null;
        })}
      </svg>

      {/* HTML Interactive Overlay Badge with Rotation & Size Controls (Master View ONLY) */}
      {isMaster &&
        spellTemplates.map((t) => {
          const { x, y } = t.position;
          const angle = t.angle || 0;
          const feet = t.feetRadius || 20;

          return (
            <div
              key={`ui-${t.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto flex items-center space-x-1.5 px-2.5 py-1 bg-zinc-950/95 backdrop-blur-md border border-zinc-700/90 rounded-xl shadow-2xl text-xs text-zinc-100 font-medium select-none"
              style={{
                left: `${x}px`,
                top: `${y}px`,
              }}
            >
              {getEffectIcon(t.effectType)}
              <span className="font-mono text-[11px] whitespace-nowrap">{t.label}</span>

              {/* Quick Angle & Length manipulation controls for Master */}
              <div className="flex items-center space-x-1 pl-1.5 border-l border-zinc-800">
                {/* Cone / Line Rotation Steppers */}
                {(t.type === 'cone' || t.type === 'line' || t.type === 'square') && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateStep(t, -45);
                      }}
                      className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-colors"
                      title="Rotate -45° Left"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>

                    <span className="font-mono text-[10px] text-cyan-400 font-bold px-0.5">
                      {angle}°
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateStep(t, 45);
                      }}
                      className="p-1 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded transition-colors"
                      title="Rotate +45° Right"
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </>
                )}

                {/* Length Steppers */}
                <div className="flex items-center space-x-0.5 pl-1 border-l border-zinc-800">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdjustLength(t, -5);
                    }}
                    className="px-1 text-[10px] text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
                    title="Decrease length by 5 ft"
                  >
                    -5ft
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAdjustLength(t, 5);
                    }}
                    className="px-1 text-[10px] text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded transition-colors"
                    title="Increase length by 5 ft"
                  >
                    +5ft
                  </button>
                </div>

                {/* Remove button */}
                {onRemoveTemplate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTemplate(t.id);
                    }}
                    className="p-1 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors ml-0.5"
                    title="Remove Template"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
});
