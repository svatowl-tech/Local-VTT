import React, { memo } from 'react';
import { CameraFrame } from '../types';
import { Eye, Move, Lock } from 'lucide-react';

interface Props {
  camera: CameraFrame;
  onStartDrag: (e: React.MouseEvent) => void;
  onStartResize: (e: React.MouseEvent, handle: string) => void;
}

export const CameraFrameOverlay: React.FC<Props> = memo(({
  camera,
  onStartDrag,
  onStartResize,
}) => {
  return (
    <div
      className="absolute pointer-events-none border-2 border-cyan-400/90 bg-cyan-400/[0.03] shadow-[0_0_25px_rgba(34,211,238,0.25)] select-none transform-gpu group"
      style={{
        left: `${camera.x}px`,
        top: `${camera.y}px`,
        width: `${camera.width}px`,
        height: `${camera.height}px`,
        transform: `rotate(${camera.rotation}deg)`,
        zIndex: 2000,
        willChange: 'left, top, width, height, transform',
        contain: 'layout style',
      }}
    >
      {/* Top Label & Drag Handle Bar (Interactive) */}
      <div
        onMouseDown={onStartDrag}
        className={`absolute -top-7 left-0 right-0 h-7 pointer-events-auto bg-cyan-950/95 border-t border-x border-cyan-500/80 px-2.5 flex items-center justify-between text-[11px] font-mono text-cyan-200 rounded-t-md cursor-grab active:cursor-grabbing select-none shadow-lg ${
          camera.locked ? 'bg-zinc-900 border-zinc-700 text-zinc-400' : ''
        }`}
      >
        <div className="flex items-center space-x-2">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold tracking-wide">
            PLAYER CAMERA ({camera.aspectRatio === 16 / 9 ? '16:9' : camera.aspectRatio === 16 / 10 ? '16:10' : '4:3'})
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-cyan-300">
          <span className="font-mono font-semibold text-cyan-200">
            {Math.round((camera.width / 50) * 10) / 10}×{Math.round((camera.height / 50) * 10) / 10} кл
          </span>
          <span className="text-cyan-400/60 font-mono">
            ({Math.round(camera.width)}×{Math.round(camera.height)}px)
          </span>
          {camera.locked ? <Lock className="w-3 h-3 text-red-400" /> : <Move className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Interactive Edge & Corner Resizing Handles */}
      {!camera.locked && (
        <>
          {/* Right edge resize strip */}
          <div
            onMouseDown={(e) => onStartResize(e, 'r')}
            className="absolute top-0 -right-2.5 w-5 h-full pointer-events-auto cursor-ew-resize hover:bg-cyan-400/40 rounded transition-colors"
            title="Изменить размер камеры"
          />
          {/* Left edge resize strip */}
          <div
            onMouseDown={(e) => onStartResize(e, 'l')}
            className="absolute top-0 -left-2.5 w-5 h-full pointer-events-auto cursor-ew-resize hover:bg-cyan-400/40 rounded transition-colors"
            title="Изменить размер камеры"
          />
          {/* Bottom edge resize strip */}
          <div
            onMouseDown={(e) => onStartResize(e, 'b')}
            className="absolute -bottom-2.5 left-0 w-full h-5 pointer-events-auto cursor-ns-resize hover:bg-cyan-400/40 rounded transition-colors"
            title="Изменить размер камеры"
          />
          {/* Bottom-Right corner handle */}
          <div
            onMouseDown={(e) => onStartResize(e, 'br')}
            className="absolute -bottom-3 -right-3 w-6 h-6 pointer-events-auto bg-cyan-400 hover:scale-125 transition-transform rounded-full border-2 border-zinc-950 cursor-nwse-resize shadow-lg flex items-center justify-center ring-2 ring-cyan-500/50"
            title="Изменить размер камеры"
          />
          {/* Bottom-Left corner handle */}
          <div
            onMouseDown={(e) => onStartResize(e, 'bl')}
            className="absolute -bottom-3 -left-3 w-6 h-6 pointer-events-auto bg-cyan-400 hover:scale-125 transition-transform rounded-full border-2 border-zinc-950 cursor-nesw-resize shadow-lg flex items-center justify-center ring-2 ring-cyan-500/50"
            title="Изменить размер камеры"
          />
        </>
      )}

      {/* Center Crosshair Marker (Pure visual) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
        <div className="w-6 h-[1px] bg-cyan-400" />
        <div className="h-6 w-[1px] bg-cyan-400 absolute" />
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.camera.x === next.camera.x &&
    prev.camera.y === next.camera.y &&
    prev.camera.width === next.camera.width &&
    prev.camera.height === next.camera.height &&
    prev.camera.rotation === next.camera.rotation &&
    prev.camera.locked === next.camera.locked &&
    prev.camera.aspectRatio === next.camera.aspectRatio
  );
});
