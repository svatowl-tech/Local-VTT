import React, { useRef, useEffect, memo } from 'react';
import { FogState } from '../types';
import {
  FOG_THEMES,
  createSeamlessMistTexture,
} from '../utils/fogMistNoise';
import { tabletopMathEngine } from '../utils/tabletopMathEngine';
import { particleSpriteCache } from '../utils/precomputedParticleSprites';

interface Props {
  fog: FogState;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  className?: string;
  isMasterPreview?: boolean;
}

export const FogCanvasRenderer: React.FC<Props> = memo(({
  fog,
  width,
  height,
  offsetX = 0,
  offsetY = 0,
  className = '',
  isMasterPreview = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const texture1Ref = useRef<HTMLCanvasElement | null>(null);
  const texture2Ref = useRef<HTMLCanvasElement | null>(null);
  const currentThemeStyleRef = useRef<string>('');
  const animOffsetRef = useRef<{ x1: number; y1: number; x2: number; y2: number }>({
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });
  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const styleType = fog.style || 'white-mist';
  const theme = FOG_THEMES[styleType] || FOG_THEMES['white-mist'];
  const isAnimated = fog.animated !== false;

  const targetWidth = Math.min(width, 4000);
  const targetHeight = Math.min(height, 4000);

  // 1. Generate seamless fractal noise cloud textures when theme style changes (Cached)
  useEffect(() => {
    if (!fog.enabled) return;

    if (currentThemeStyleRef.current !== styleType || !texture1Ref.current) {
      texture1Ref.current = createSeamlessMistTexture(theme, 512, 0);
      texture2Ref.current = createSeamlessMistTexture(theme, 512, 17.3);
      currentThemeStyleRef.current = styleType;
    }
  }, [fog.enabled, styleType, theme]);

  // 2. Pre-bake Fog Reveal / Conceal Alpha Mask onto Offscreen Canvas using fast Sprite Stamps
  useEffect(() => {
    if (!fog.enabled) return;

    if (!maskCanvasRef.current) {
      maskCanvasRef.current = document.createElement('canvas');
    }

    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas.width !== targetWidth || maskCanvas.height !== targetHeight) {
      maskCanvas.width = targetWidth;
      maskCanvas.height = targetHeight;
    }

    const maskCtx = maskCanvas.getContext('2d', { alpha: true });
    if (!maskCtx) return;

    // Start with fully opaque mask
    maskCtx.clearRect(0, 0, targetWidth, targetHeight);
    maskCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    maskCtx.fillRect(0, 0, targetWidth, targetHeight);

    // Apply brush strokes onto the mask using fast point decimation
    if (fog.history && fog.history.length > 0) {
      const activeHistory = fog.history.length > 30
        ? tabletopMathEngine.decimateFogPoints(fog.history as any)
        : fog.history;

      for (let i = 0; i < activeHistory.length; i++) {
        const pt = activeHistory[i];
        const px = pt.x + offsetX;
        const py = pt.y + offsetY;
        const featherRadius = pt.radius;

        // Quick bounds cull
        if (
          px + featherRadius < 0 ||
          px - featherRadius > targetWidth ||
          py + featherRadius < 0 ||
          py - featherRadius > targetHeight
        ) {
          continue;
        }

        const prevPt = i > 0 ? activeHistory[i - 1] : null;

        if (pt.type === 'reveal') {
          maskCtx.globalCompositeOperation = 'destination-out';
          const stamp = particleSpriteCache.getFogRevealStamp(featherRadius);
          maskCtx.drawImage(
            stamp,
            px - featherRadius,
            py - featherRadius,
            featherRadius * 2,
            featherRadius * 2
          );

          // Smooth contiguous reveal strokes between consecutive drag points
          if (prevPt && prevPt.type === 'reveal') {
            const prevX = prevPt.x + offsetX;
            const prevY = prevPt.y + offsetY;
            const dist = Math.hypot(px - prevX, py - prevY);
            if (dist < featherRadius * 3) {
              maskCtx.lineWidth = featherRadius * 1.5;
              maskCtx.lineCap = 'round';
              maskCtx.lineJoin = 'round';
              maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
              maskCtx.beginPath();
              maskCtx.moveTo(prevX, prevY);
              maskCtx.lineTo(px, py);
              maskCtx.stroke();
            }
          }
        } else {
          // Conceal: paint volumetric cloud mask back
          maskCtx.globalCompositeOperation = 'source-over';
          maskCtx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          maskCtx.beginPath();
          maskCtx.arc(px, py, featherRadius, 0, Math.PI * 2);
          maskCtx.fill();

          if (prevPt && prevPt.type === 'conceal') {
            const prevX = prevPt.x + offsetX;
            const prevY = prevPt.y + offsetY;
            const dist = Math.hypot(px - prevX, py - prevY);
            if (dist < featherRadius * 3) {
              maskCtx.lineWidth = featherRadius * 1.4;
              maskCtx.lineCap = 'round';
              maskCtx.lineJoin = 'round';
              maskCtx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
              maskCtx.beginPath();
              maskCtx.moveTo(prevX, prevY);
              maskCtx.lineTo(px, py);
              maskCtx.stroke();
            }
          }
        }
      }
    }
  }, [fog.enabled, fog.history, targetWidth, targetHeight, offsetX, offsetY]);

  // 3. Ultra-smooth GPU rendering loop (Animates clouds and performs 1 composite blit)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !fog.enabled) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    let isSubscribed = true;

    const renderFrame = (timestamp: number) => {
      if (!isSubscribed) return;

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Update texture scroll coordinates (wind simulation)
      if (isAnimated) {
        const dt = Math.min(delta, 100) * 0.001;
        animOffsetRef.current.x1 = (animOffsetRef.current.x1 + dt * 14) % 512;
        animOffsetRef.current.y1 = (animOffsetRef.current.y1 + dt * 7) % 512;
        animOffsetRef.current.x2 = (animOffsetRef.current.x2 - dt * 9 + 512) % 512;
        animOffsetRef.current.y2 = (animOffsetRef.current.y2 + dt * 11) % 512;
      }

      ctx.clearRect(0, 0, targetWidth, targetHeight);

      // --- STEP 1: Ambient Base Color ---
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = isMasterPreview ? theme.masterColor : theme.baseColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // --- STEP 2: Layer 1 Flowing Fractal Fog Layer ---
      const tex1 = texture1Ref.current;
      if (tex1) {
        const pattern1 = ctx.createPattern(tex1, 'repeat');
        if (pattern1) {
          ctx.save();
          ctx.globalAlpha = isMasterPreview ? 0.45 : 0.85;
          ctx.translate(animOffsetRef.current.x1, animOffsetRef.current.y1);
          ctx.fillStyle = pattern1;
          ctx.fillRect(
            -animOffsetRef.current.x1,
            -animOffsetRef.current.y1,
            targetWidth + 512,
            targetHeight + 512
          );
          ctx.restore();
        }
      }

      // --- STEP 3: Layer 2 Counter-Drifting Atmospheric Volumetric Clouds ---
      const tex2 = texture2Ref.current;
      if (tex2) {
        const pattern2 = ctx.createPattern(tex2, 'repeat');
        if (pattern2) {
          ctx.save();
          ctx.globalAlpha = isMasterPreview ? 0.35 : 0.75;
          ctx.translate(animOffsetRef.current.x2, animOffsetRef.current.y2);
          ctx.fillStyle = pattern2;
          ctx.fillRect(
            -animOffsetRef.current.x2,
            -animOffsetRef.current.y2,
            targetWidth + 512,
            targetHeight + 512
          );
          ctx.restore();
        }
      }

      // --- STEP 4: Apply Pre-calculated Alpha Mask (Single GPU Texture Blit) ---
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(maskCanvas, 0, 0);
      }

      ctx.restore();

      if (isAnimated) {
        rafIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    if (isAnimated) {
      rafIdRef.current = requestAnimationFrame(renderFrame);
    } else {
      renderFrame(0);
    }

    return () => {
      isSubscribed = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [
    fog.enabled,
    fog.opacity,
    fog.style,
    fog.animated,
    targetWidth,
    targetHeight,
    isMasterPreview,
    isAnimated,
    theme,
  ]);

  if (!fog.enabled) {
    return null;
  }

  const effectiveOpacity = isMasterPreview ? Math.min(fog.opacity, 0.6) : fog.opacity;

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none transform-gpu ${className}`}
      style={{
        opacity: effectiveOpacity,
        willChange: isAnimated ? 'contents' : 'opacity',
      }}
    />
  );
});
