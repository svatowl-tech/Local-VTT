import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Move,
  RotateCcw,
} from 'lucide-react';

interface Props {
  id: string;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  icon?: React.FC<{ className?: string }>;
  defaultPosition?: { x: number; y: number };
  defaultSize?: { width: number; height: number };
  minWidth?: number;
  minHeight?: number;
  children: React.ReactNode;
  headerRightActions?: React.ReactNode;
  className?: string;
  zIndex?: number;
  onFocus?: () => void;
}

interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const STORAGE_PREFIX = 'aethermap_panel_window_';

export const FloatingWindow: React.FC<Props> = ({
  id,
  title,
  isOpen,
  onClose,
  icon: IconComponent,
  defaultPosition = { x: 80, y: 80 },
  defaultSize = { width: 620, height: 500 },
  minWidth = 360,
  minHeight = 240,
  children,
  headerRightActions,
  className = '',
  zIndex = 40,
  onFocus,
}) => {
  // Load initial position & size from localStorage if available
  const [bounds, setBounds] = useState<WindowBounds>(() => {
    try {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.width && parsed.height && typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load window bounds', e);
    }
    return {
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: defaultSize.width,
      height: defaultSize.height,
    };
  });

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [prevBounds, setPrevBounds] = useState<WindowBounds>(bounds);

  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const initialBoundsRef = useRef<WindowBounds>(bounds);

  // Save bounds to localStorage whenever they change
  useEffect(() => {
    if (!isMaximized && !isMinimized && bounds.width > 0 && bounds.height > 0) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(bounds));
      } catch (e) {
        // storage quota exceeded or disabled
      }
    }
  }, [id, bounds, isMaximized, isMinimized]);

  // Window bounds clamping on window resize
  const clampBounds = useCallback((x: number, y: number, w: number, h: number) => {
    const maxX = Math.max(10, window.innerWidth - 80);
    const maxY = Math.max(50, window.innerHeight - 60);
    const clampedX = Math.min(Math.max(10, x), maxX);
    const clampedY = Math.min(Math.max(56, y), maxY);
    const clampedW = Math.min(Math.max(minWidth, w), window.innerWidth - 20);
    const clampedH = Math.min(Math.max(minHeight, h), window.innerHeight - 70);
    return { x: clampedX, y: clampedY, width: clampedW, height: clampedH };
  }, [minWidth, minHeight]);

  const handleStartDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    e.preventDefault();
    if (onFocus) onFocus();
    if (isMaximized) return;

    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialBoundsRef.current = { ...bounds };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = ev.clientX - dragStartPosRef.current.x;
      const deltaY = ev.clientY - dragStartPosRef.current.y;
      const newX = initialBoundsRef.current.x + deltaX;
      const newY = initialBoundsRef.current.y + deltaY;

      setBounds((prev) => ({
        ...prev,
        ...clampBounds(newX, newY, prev.width, prev.height),
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
    if (onFocus) onFocus();
    if (isMaximized || isMinimized) return;

    isResizingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    initialBoundsRef.current = { ...bounds };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const deltaX = ev.clientX - dragStartPosRef.current.x;
      const deltaY = ev.clientY - dragStartPosRef.current.y;
      const newWidth = Math.max(minWidth, initialBoundsRef.current.width + deltaX);
      const newHeight = Math.max(minHeight, initialBoundsRef.current.height + deltaY);

      setBounds((prev) => ({
        ...prev,
        ...clampBounds(prev.x, prev.y, newWidth, newHeight),
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

  const handleToggleMaximize = () => {
    if (isMaximized) {
      setBounds(prevBounds);
      setIsMaximized(false);
    } else {
      setPrevBounds(bounds);
      setBounds({
        x: 12,
        y: 60,
        width: window.innerWidth - 24,
        height: window.innerHeight - 72,
      });
      setIsMaximized(true);
      setIsMinimized(false);
    }
  };

  const handleResetPosition = () => {
    setBounds({
      x: defaultPosition.x,
      y: defaultPosition.y,
      width: defaultSize.width,
      height: defaultSize.height,
    });
    setIsMaximized(false);
    setIsMinimized(false);
  };

  if (!isOpen) return null;

  return (
    <div
      onMouseDown={() => onFocus && onFocus()}
      className={`fixed flex flex-col bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden transition-all duration-75 select-none ${
        isDraggingRef.current ? 'cursor-move opacity-95 ring-1 ring-amber-500/30' : ''
      } ${className}`}
      style={{
        left: `${bounds.x}px`,
        top: `${bounds.y}px`,
        width: `${bounds.width}px`,
        height: isMinimized ? '46px' : `${bounds.height}px`,
        zIndex,
      }}
    >
      {/* Draggable Title Header */}
      <div
        onMouseDown={handleStartDrag}
        onDoubleClick={handleToggleMaximize}
        className="h-11 px-3.5 bg-zinc-950/85 border-b border-zinc-800/90 flex items-center justify-between cursor-move shrink-0"
      >
        <div className="flex items-center space-x-2.5 min-w-0 pr-2">
          {IconComponent && (
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
              <IconComponent className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-bold text-zinc-100 truncate tracking-wide">
            {title}
          </span>
        </div>

        {/* Window Controls */}
        <div className="flex items-center space-x-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          {headerRightActions}

          {/* Reset position button */}
          <button
            onClick={handleResetPosition}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors"
            title="Сбросить положение и размер окна"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Minimize / Expand */}
          <button
            onClick={() => setIsMinimized((v) => !v)}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors"
            title={isMinimized ? 'Развернуть' : 'Свернуть в заголовок'}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          {/* Maximize / Restore */}
          <button
            onClick={handleToggleMaximize}
            className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded-md transition-colors"
            title={isMaximized ? 'Восстановить размер' : 'На весь экран'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors ml-0.5"
            title="Закрыть окно"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Window Body (Hidden when minimized) */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden flex flex-col relative min-h-0">
          {children}

          {/* Corner Resize Handle - Comfortable enlarged grab zone */}
          {!isMaximized && (
            <div
              onMouseDown={handleStartResize}
              className="absolute bottom-0 right-0 w-7 h-7 cursor-nwse-resize z-50 flex items-end justify-end p-1 hover:bg-amber-500/10 rounded-tl-lg transition-all group/resize"
              title="Потяните для изменения размера окна"
            >
              <div className="w-3 h-3 border-r-2 border-b-2 border-zinc-500 group-hover/resize:border-amber-400 group-hover/resize:scale-110 transition-all" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
