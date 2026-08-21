import React, { memo } from 'react';
import { LaserPointer } from '../types';

interface Props {
  laser: LaserPointer | null;
}

export const LaserPointerLayer: React.FC<Props> = memo(({ laser }) => {
  if (!laser || !laser.active) return null;

  const color = laser.color || '#ef4444';

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2000020 }}
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          left: `${laser.x}px`,
          top: `${laser.y}px`,
        }}
      >
        {/* Pulsating Ping Target Wave */}
        <div
          className="w-16 h-16 -ml-8 -mt-8 rounded-full animate-ping opacity-75 border-2 pointer-events-none absolute"
          style={{ borderColor: color }}
        />

        {/* Secondary Ripple */}
        <div
          className="w-10 h-10 -ml-5 -mt-5 rounded-full animate-pulse border-2 pointer-events-none absolute"
          style={{ borderColor: color, animationDuration: '0.8s' }}
        />

        {/* Glowing Laser Dot */}
        <div
          className="w-4 h-4 rounded-full shadow-lg pointer-events-none relative z-10 flex items-center justify-center"
          style={{
            backgroundColor: '#ffffff',
            boxShadow: `0 0 12px 4px ${color}, 0 0 24px 8px ${color}`,
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
});
