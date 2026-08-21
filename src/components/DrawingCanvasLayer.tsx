import React, { useRef, useEffect, memo } from 'react';
import { DrawingStroke, DrawingPoint } from '../types';

interface Props {
  drawings: DrawingStroke[];
  currentStroke?: {
    points: DrawingPoint[];
    color: string;
    size: number;
    opacity: number;
    tool: 'brush' | 'highlighter' | 'eraser';
  } | null;
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
}

export const DrawingCanvasLayer: React.FC<Props> = memo(({
  drawings,
  currentStroke,
  width = 4000,
  height = 4000,
  offsetX = 2000,
  offsetY = 2000,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const renderStrokeToContext = (ctx: CanvasRenderingContext2D, stroke: DrawingStroke) => {
    if (!stroke.points || stroke.points.length < 2) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.size;

    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else if (stroke.tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = Math.min(0.4, stroke.opacity * 0.4);
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
      ctx.globalAlpha = stroke.opacity;
    }

    // Smooth path using quadratic curves between midpoints
    const pts = stroke.points;
    const startX = pts[0].x + offsetX;
    const startY = pts[0].y + offsetY;
    ctx.moveTo(startX, startY);

    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2 + offsetX;
      const yc = (pts[i].y + pts[i + 1].y) / 2 + offsetY;
      ctx.quadraticCurveTo(pts[i].x + offsetX, pts[i].y + offsetY, xc, yc);
    }

    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x + offsetX, last.y + offsetY);
    }

    ctx.stroke();
    ctx.restore();
  };

  // 1. Bake completed drawing strokes onto an offscreen canvas only when `drawings` changes
  useEffect(() => {
    if (!staticCanvasRef.current) {
      staticCanvasRef.current = document.createElement('canvas');
    }
    const staticCanvas = staticCanvasRef.current;
    if (staticCanvas.width !== width || staticCanvas.height !== height) {
      staticCanvas.width = width;
      staticCanvas.height = height;
    }

    const staticCtx = staticCanvas.getContext('2d');
    if (!staticCtx) return;

    staticCtx.clearRect(0, 0, width, height);

    for (const stroke of drawings) {
      renderStrokeToContext(staticCtx, stroke);
    }

    // Also blit to main canvas
    const mainCanvas = canvasRef.current;
    if (mainCanvas) {
      const mainCtx = mainCanvas.getContext('2d');
      if (mainCtx) {
        mainCtx.clearRect(0, 0, width, height);
        mainCtx.drawImage(staticCanvas, 0, 0);
        if (currentStroke && currentStroke.points.length > 1) {
          renderStrokeToContext(mainCtx, {
            id: 'current-preview',
            ...currentStroke,
          });
        }
      }
    }
  }, [drawings, width, height, offsetX, offsetY]);

  // 2. Fast-path single stroke blit when user is dragging brush / highlighter
  useEffect(() => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;
    const mainCtx = mainCanvas.getContext('2d');
    if (!mainCtx) return;

    mainCtx.clearRect(0, 0, width, height);

    if (staticCanvasRef.current) {
      mainCtx.drawImage(staticCanvasRef.current, 0, 0);
    }

    if (currentStroke && currentStroke.points.length > 1) {
      renderStrokeToContext(mainCtx, {
        id: 'current-preview',
        ...currentStroke,
      });
    }
  }, [currentStroke, width, height, offsetX, offsetY]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none transform-gpu"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        left: `${-offsetX}px`,
        top: `${-offsetY}px`,
        zIndex: 2000005,
        willChange: currentStroke ? 'contents' : 'auto',
      }}
    />
  );
});
