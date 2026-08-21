import React, { memo } from 'react';
import { GridSettings } from '../types';

interface Props {
  grid: GridSettings;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export const GridCanvasRenderer: React.FC<Props> = memo(({
  grid,
  width = '100%',
  height = '100%',
  className = '',
}) => {
  if (!grid.enabled) return null;

  const patternId = `grid-pattern-${grid.size}-${grid.type}`;
  const strokeColor = grid.color || '#ffffff';
  const strokeOpacity = Math.max(0.05, Math.min(1, grid.opacity));

  // Square pattern
  if (grid.type === 'square') {
    return (
      <svg
        className={`absolute inset-0 pointer-events-none w-full h-full ${className}`}
        style={{
          opacity: grid.opacity,
          willChange: 'opacity',
        }}
      >
        <defs>
          <pattern
            id={patternId}
            width={grid.size}
            height={grid.size}
            patternUnits="userSpaceOnUse"
            patternTransform={`translate(${grid.offsetX % grid.size}, ${grid.offsetY % grid.size})`}
          >
            <path
              d={`M ${grid.size} 0 L 0 0 0 ${grid.size}`}
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeOpacity={strokeOpacity}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    );
  }

  // Hexagonal pattern (Pointy-topped regular hexagons)
  const s = grid.size;
  const w = s * Math.sqrt(3);
  const h = s * 1.5;
  const r = s;
  const hr = r / 2;
  const hw = w / 2;

  return (
    <svg
      className={`absolute inset-0 pointer-events-none w-full h-full ${className}`}
      style={{
        opacity: grid.opacity,
        willChange: 'opacity',
      }}
    >
      <defs>
        <pattern
          id={patternId}
          width={w}
          height={h * 2}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${grid.offsetX % w}, ${grid.offsetY % (h * 2)})`}
        >
          <path
            d={`
              M 0 ${hr} L ${hw} 0 L ${w} ${hr} L ${w} ${hr + r} L ${hw} ${2 * r} L 0 ${hr + r} Z
              M 0 ${hr + h} L ${hw} ${h} L ${w} ${hr + h} L ${w} ${hr + r + h} L ${hw} ${2 * r + h} L 0 ${hr + r + h} Z
            `}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeOpacity={strokeOpacity}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}, (prev, next) => {
  return (
    prev.grid.enabled === next.grid.enabled &&
    prev.grid.type === next.grid.type &&
    prev.grid.size === next.grid.size &&
    prev.grid.color === next.grid.color &&
    prev.grid.opacity === next.grid.opacity &&
    prev.grid.offsetX === next.grid.offsetX &&
    prev.grid.offsetY === next.grid.offsetY
  );
});
