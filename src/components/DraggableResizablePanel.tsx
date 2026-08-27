import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical, RotateCcw, Minus, X } from 'lucide-react';

interface Bounds {
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
}

interface Props {
  id: string;
  isOpen?: boolean;
  onClose?: () => void;
  defaultPosition: { x: number; y: number };
  defaultSize?: { width: number | 'auto'; height: number | 'auto' };
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  children: React.ReactNode;
  className?: string;
  handleTitle?: string;
  handleIcon?: React.ReactNode;
  zIndex?: number;
  showReset?: boolean;
  noPadding?: boolean;
}

const STORAGE_PREFIX = 'aethermap_floating_bounds_';

export const DraggableResizablePanel: React.FC<Props> = ({
  id,
  isOpen = true,
  onClose,
  defaultPosition,
  defaultSize = { width: 'auto', height: 'auto' },
  minWidth = 260,
  minHeight = 120,
  maxWidth,
  maxHeight,
  children,
  className = '',
  handleTitle,
  handleIcon,
  zIndex = 30,
  showReset = true,
  noPadding = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measuredSizeRef = useRef({ width: 0, height: 0 });

  const clampPosition = useCallback(
    (x: number, y: number, w: number, h: number) => {
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1920;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 1080;
      const targetW = Math.max(20, w || 200);
      const targetH = Math.max(20, h || 120);

      const maxX = Math.max(4, screenW - targetW - 8);
      const maxY = Math.max(4, screenH - targetH - 64); // Safe buffer for top/bottom docks
      const clampedX = Math.min(Math.max(4, x), maxX);
      const clampedY = Math.min(Math.max(4, y), maxY);
      return { x: clampedX, y: clampedY };
    },
    []
  );

  // Bounds state with localStorage cache
  const [bounds, setBounds] = useState<Bounds>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return {
            x: parsed.x,
            y: parsed.y,
            width: parsed.width !== undefined ? parsed.width : defaultSize.width,
            height: parsed.height !== undefined ? parsed.height : defaultSize.height,
          };
        }
      }
    } catch (e) {
      console.warn(`Failed to read panel bounds for ${id}`, e);
    }
    const initialW = typeof defaultSize.width === 'number' ? defaultSize.width : 340;
    const initialH = typeof defaultSize.height === 'number' ? defaultSize.height : 240;
    const clampedInit = clampPosition(defaultPosition.x, defaultPosition.y, initialW, initialH);

    return {
      x: clampedInit.x,
      y: clampedInit.y,
      width: defaultSize.width,
      height: defaultSize.height,
    };
  });

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialBoundsRef = useRef<Bounds>(bounds);

  // Save to localStorage when bounds change
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(bounds));
    } catch (e) {}
  }, [id, bounds]);

  // Window Resize Listener: automatically shifts and clamps panels within window boundaries
  useEffect(() => {
    const handleWindowResize = () => {
      const curW =
        typeof bounds.width === 'number'
          ? bounds.width
          : measuredSizeRef.current.width || 340;
      const curH =
        typeof bounds.height === 'number'
          ? bounds.height
          : measuredSizeRef.current.height || 240;

      setBounds((prev) => {
        const clamped = clampPosition(prev.x, prev.y, curW, curH);
        if (clamped.x === prev.x && clamped.y === prev.y) {
          return prev;
        }
        return {
          ...prev,
          x: clamped.x,
          y: clamped.y,
        };
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [bounds.width, bounds.height, clampPosition]);

  // Measure element size with ResizeObserver and re-clamp if overflowing
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    if (typeof ResizeObserver === 'undefined') {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        measuredSizeRef.current = { width: rect.width, height: rect.height };
      }
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          measuredSizeRef.current = { width, height };
          setBounds((prev) => {
            const clamped = clampPosition(prev.x, prev.y, width, height);
            if (clamped.x !== prev.x || clamped.y !== prev.y) {
              return { ...prev, x: clamped.x, y: clamped.y };
            }
            return prev;
          });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen, clampPosition]);

  const handleStartDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    e.preventDefault();
    e.stopPropagation();

    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const currentWidth =
      typeof bounds.width === 'number'
        ? bounds.width
        : measuredSizeRef.current.width || 340;
    const currentHeight =
      typeof bounds.height === 'number'
        ? bounds.height
        : measuredSizeRef.current.height || 240;

    initialBoundsRef.current = { ...bounds };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;

      const newX = initialBoundsRef.current.x + dx;
      const newY = initialBoundsRef.current.y + dy;

      const clamped = clampPosition(newX, newY, currentWidth, currentHeight);

      setBounds((prev) => ({
        ...prev,
        x: clamped.x,
        y: clamped.y,
      }));
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    isResizingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };

    const startW =
      typeof bounds.width === 'number'
        ? bounds.width
        : measuredSizeRef.current.width || 340;
    const startH =
      typeof bounds.height === 'number'
        ? bounds.height
        : measuredSizeRef.current.height || 240;

    initialBoundsRef.current = { ...bounds, width: startW, height: startH };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const dx = ev.clientX - dragStartRef.current.x;
      const dy = ev.clientY - dragStartRef.current.y;

      const maxAllowedW = maxWidth
        ? Math.min(maxWidth, window.innerWidth - bounds.x - 8)
        : window.innerWidth - bounds.x - 8;
      const maxAllowedH = maxHeight
        ? Math.min(maxHeight, window.innerHeight - bounds.y - 8)
        : window.innerHeight - bounds.y - 8;

      let newW = Math.max(minWidth, Math.min(maxAllowedW, startW + dx));
      let newH = Math.max(minHeight, Math.min(maxAllowedH, startH + dy));

      setBounds((prev) => ({
        ...prev,
        width: newW,
        height: newH,
      }));
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const initW = typeof defaultSize.width === 'number' ? defaultSize.width : 340;
    const initH = typeof defaultSize.height === 'number' ? defaultSize.height : 240;
    const clamped = clampPosition(defaultPosition.x, defaultPosition.y, initW, initH);
    setBounds({
      x: clamped.x,
      y: clamped.y,
      width: defaultSize.width,
      height: defaultSize.height,
    });
  };

  if (!isOpen) return null;

  const stylePosition: React.CSSProperties = {
    position: 'absolute',
    left: `${bounds.x}px`,
    top: `${bounds.y}px`,
    width: bounds.width === 'auto' ? 'auto' : `${bounds.width}px`,
    height: bounds.height === 'auto' ? 'auto' : `${bounds.height}px`,
    zIndex,
  };

  return (
    <div
      ref={containerRef}
      style={stylePosition}
      className={`group absolute pointer-events-auto select-none flex flex-col bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden animate-fadeIn ${className}`}
    >
      {/* Modern Top Header Bar / Drag Grip */}
      <div
        onMouseDown={handleStartDrag}
        className="px-3 py-2 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing shrink-0 select-none"
        title="Зажмите и потяните для перемещения окна"
      >
        <div className="flex items-center space-x-2 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
          {handleIcon && <span className="text-amber-400 shrink-0">{handleIcon}</span>}
          {handleTitle && (
            <span className="font-bold text-xs text-zinc-100 truncate tracking-wide">
              {handleTitle}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          {showReset && (
            <button
              onClick={handleReset}
              className="p-1 text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 rounded-lg transition-colors"
              title="Сбросить позицию и размер"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Свернуть окно"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area (Fluid, no crop on resize) */}
      <div className={`flex-1 min-h-0 min-w-0 ${noPadding ? '' : 'p-3'} overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col`}>
        {children}
      </div>

      {/* Bottom Right Resize Handle - Comfortable enlarged grab zone */}
      <div
        onMouseDown={handleStartResize}
        className="absolute bottom-0 right-0 w-7 h-7 cursor-se-resize flex items-end justify-end p-1 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-tl-lg transition-all z-50 select-none group/resize"
        title="Потяните для изменения размера окна"
      >
        <svg className="w-3.5 h-3.5 fill-current text-zinc-500 group-hover/resize:text-amber-400 group-hover/resize:scale-110 transition-all" viewBox="0 0 6 6">
          <path d="M6 6H4V4h2v2zM6 2H4V0h2v2zM2 6H0V4h2v2z" />
        </svg>
      </div>
    </div>
  );
};
