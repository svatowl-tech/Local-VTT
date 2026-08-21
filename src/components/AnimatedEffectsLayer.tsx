import React, { useRef, useEffect, memo } from 'react';
import { AnimatedEffect, EffectNode } from '../types';
import {
  WaterEffectState,
  createWaterEffectState,
  renderWaterEffect,
} from '../utils/waterEffectRenderer';
import { FastParticlePool } from '../utils/FastParticlePool';
import { particleSpriteCache } from '../utils/precomputedParticleSprites';
import { SpatialHashGrid2D } from '../utils/SpatialHashGrid2D';

interface Props {
  effects: AnimatedEffect[];
  width?: number;
  height?: number;
  offsetX?: number;
  offsetY?: number;
  isMaster?: boolean;
  onRemoveEffect?: (id: string) => void;
}

export const AnimatedEffectsLayer: React.FC<Props> = memo(({
  effects,
  width = 4000,
  height = 4000,
  offsetX = 2000,
  offsetY = 2000,
  isMaster = false,
  onRemoveEffect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firePoolRef = useRef<FastParticlePool>(new FastParticlePool(512));
  const steamPoolRef = useRef<FastParticlePool>(new FastParticlePool(128));
  const waterStatesMapRef = useRef<Map<string, WaterEffectState>>(new Map());
  const spatialGridRef = useRef<SpatialHashGrid2D>(new SpatialHashGrid2D(128));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    if (!effects || effects.length === 0) {
      ctx.clearRect(0, 0, width, height);
      firePoolRef.current.clear();
      steamPoolRef.current.clear();
      waterStatesMapRef.current.clear();
      return;
    }

    let time = 0;
    const firePool = firePoolRef.current;
    const steamPool = steamPoolRef.current;
    const spatialGrid = spatialGridRef.current;

    const renderLoop = () => {
      time += 0.04;
      ctx.clearRect(0, 0, width, height);

      // Clean up stale water states
      const activeIds = new Set(effects.map((e) => e.id));
      for (const key of waterStatesMapRef.current.keys()) {
        if (!activeIds.has(key)) waterStatesMapRef.current.delete(key);
      }

      // Populate spatial grid for O(1) clash detection
      spatialGrid.clear();
      for (const effect of effects) {
        const nodes: EffectNode[] =
          effect.nodes && effect.nodes.length > 0
            ? effect.nodes
            : [{ x: effect.position.x, y: effect.position.y, r: effect.radius || 45 }];

        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          spatialGrid.insert({
            id: `${effect.id}_${i}`,
            x: n.x + offsetX,
            y: n.y + offsetY,
            r: n.r || effect.radius || 45,
            type: effect.type,
          });
        }
      }

      // Update particle physics (zero-allocation typed array loop)
      firePool.update(0, 0.4, time);
      steamPool.update(-0.6, 0.2, time);

      // Render Active Effects
      for (const effect of effects) {
        const cx = effect.position.x + offsetX;
        const cy = effect.position.y + offsetY;
        const r = effect.radius || 45;
        const intensity = effect.intensity || 1.0;

        const nodes: EffectNode[] =
          effect.nodes && effect.nodes.length > 0
            ? effect.nodes
            : [{ x: effect.position.x, y: effect.position.y, r }];

        if (effect.type === 'fire') {
          // 1. Draw glowing fiery corridor along connected nodes
          ctx.save();
          if (nodes.length > 1) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Pass A: Outer Heat Glow (Crimson)
            ctx.beginPath();
            for (let i = 0; i < nodes.length - 1; i++) {
              ctx.moveTo(nodes[i].x + offsetX, nodes[i].y + offsetY);
              ctx.lineTo(nodes[i + 1].x + offsetX, nodes[i + 1].y + offsetY);
            }
            ctx.strokeStyle = 'rgba(220, 38, 38, 0.45)';
            ctx.lineWidth = r * 2.2;
            ctx.stroke();

            // Pass B: Blazing Body (Orange)
            ctx.beginPath();
            for (let i = 0; i < nodes.length - 1; i++) {
              ctx.moveTo(nodes[i].x + offsetX, nodes[i].y + offsetY);
              ctx.lineTo(nodes[i + 1].x + offsetX, nodes[i + 1].y + offsetY);
            }
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
            ctx.lineWidth = r * 1.5;
            ctx.stroke();

            // Pass C: Molten Core (Gold)
            ctx.beginPath();
            for (let i = 0; i < nodes.length - 1; i++) {
              ctx.moveTo(nodes[i].x + offsetX, nodes[i].y + offsetY);
              ctx.lineTo(nodes[i + 1].x + offsetX, nodes[i + 1].y + offsetY);
            }
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
            ctx.lineWidth = r * 0.7;
            ctx.stroke();
          }

          // Draw fast node core fills
          for (const node of nodes) {
            const nx = node.x + offsetX;
            const ny = node.y + offsetY;
            const nr = node.r || r;

            ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
            ctx.beginPath();
            ctx.arc(nx, ny, nr * 1.1, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
            ctx.beginPath();
            ctx.arc(nx, ny, nr * 0.6, 0, Math.PI * 2);
            ctx.fill();

            // Spatial Clash check: If fire touches water, spawn billowing steam!
            const waterClash = spatialGrid.queryRadius(nx, ny, nr, 'water');
            if (waterClash.length > 0 && Math.random() < 0.15) {
              steamPool.spawn(
                nx + (Math.random() - 0.5) * nr,
                ny + (Math.random() - 0.5) * nr,
                (Math.random() - 0.5) * 0.8,
                -(1.2 + Math.random() * 1.5),
                35,
                35,
                nr * 0.4,
                0
              );
            }
          }
          ctx.restore();

          // 2. Spawn Rising Flame Particles into TypedArray Pool
          const spawnCount = Math.min(3, Math.round(2 * intensity));
          for (let s = 0; s < spawnCount; s++) {
            let px = cx;
            let py = cy;
            if (nodes.length > 1) {
              const segIdx = Math.floor(Math.random() * (nodes.length - 1));
              const n1 = nodes[segIdx];
              const n2 = nodes[segIdx + 1];
              const t = Math.random();
              px = n1.x + offsetX + (n2.x - n1.x) * t;
              py = n1.y + offsetY + (n2.y - n1.y) * t;
            } else {
              px = nodes[0].x + offsetX;
              py = nodes[0].y + offsetY;
            }

            const jitterX = (Math.random() - 0.5) * (r * 0.6);
            const pLife = 18 + Math.random() * 20;
            const pSize = (8 + Math.random() * 12) * Math.min(2.0, r / 45);
            const pHue = 18 + Math.random() * 32;

            firePool.spawn(
              px + jitterX,
              py + (Math.random() - 0.5) * (r * 0.3),
              (Math.random() - 0.5) * 1.2,
              -(1.8 + Math.random() * 2.8 * intensity),
              pLife,
              pLife,
              pSize,
              pHue
            );
          }
        } else if (effect.type === 'water') {
          // --- MULTI-NODE ORGANIC WATER RIVERS & PUDDLES ---
          let waterState = waterStatesMapRef.current.get(effect.id);
          if (!waterState) {
            waterState = createWaterEffectState(effect.id);
            waterStatesMapRef.current.set(effect.id, waterState);
          }

          renderWaterEffect(
            ctx,
            waterState,
            cx,
            cy,
            r,
            intensity,
            time,
            nodes,
            offsetX,
            offsetY
          );
        }
      }

      // 3. Render Flame Particles using Pre-rendered High-Speed Sprite Stamps
      if (firePool.count > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < firePool.count; i++) {
          const p = firePool.get(i);
          if (p.size <= 1 || p.alpha <= 0.02) continue;

          const stamp = particleSpriteCache.getFireSprite(p.size, p.hue);
          const half = p.size;
          ctx.globalAlpha = p.alpha * 0.85;
          ctx.drawImage(stamp, p.x - half, p.y - half, p.size * 2, p.size * 2);
        }
        ctx.restore();
      }

      // 4. Render Billowing Steam Particles using Pre-rendered Stamps
      if (steamPool.count > 0) {
        ctx.save();
        for (let i = 0; i < steamPool.count; i++) {
          const sp = steamPool.get(i);
          if (sp.alpha <= 0.02) continue;

          const steamStamp = particleSpriteCache.getSteamSprite(sp.size);
          const half = sp.size;
          ctx.globalAlpha = sp.alpha * 0.6;
          ctx.drawImage(steamStamp, sp.x - half, sp.y - half, sp.size * 2, sp.size * 2);
        }
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(renderLoop);
    };

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [effects, width, height, offsetX, offsetY]);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2000008 }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute pointer-events-none transform-gpu"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          left: `${-offsetX}px`,
          top: `${-offsetY}px`,
          willChange: 'contents',
        }}
      />

      {/* Remove effect overlay button on Master dashboard */}
      {isMaster &&
        onRemoveEffect &&
        effects.map((e) => (
          <button
            key={`btn-${e.id}`}
            onClick={(ev) => {
              ev.stopPropagation();
              onRemoveEffect(e.id);
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto px-2 py-0.5 bg-zinc-950/90 hover:bg-red-950 border border-zinc-700/80 hover:border-red-600 rounded text-[10px] font-mono text-zinc-300 hover:text-red-200 transition-all shadow-md flex items-center space-x-1"
            style={{
              left: `${e.position.x}px`,
              top: `${e.position.y}px`,
            }}
          >
            <span>{e.type === 'fire' ? '🔥 Огонь' : '💧 Вода'}</span>
            <span className="text-zinc-500 hover:text-red-400 font-bold">×</span>
          </button>
        ))}
    </div>
  );
});
