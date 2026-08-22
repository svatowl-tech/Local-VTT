import { tabletopMathEngine, LightSource, ShadowVolume, VisionWall, GridDetectionResult } from '../utils/tabletopMathEngine';
import { FastSpatialGrid } from '../utils/fastSpatialGrid';

export interface DiceRollResult {
  total: number;
  rolls: number[];
  modifier: number;
  isCrit: boolean;
  isFumble: boolean;
  breakdown: string;
  formatted: string;
}

export interface DiceDistributionResult {
  expression: string;
  iterations: number;
  min: number;
  max: number;
  average: number;
  standardDeviation: number;
  critPercentage: number;
  histogram: Record<number, number>;
}

export interface SpatialItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  layer?: string;
  zIndex?: number;
}

export interface SpatialQueryResult {
  visibleIds: string[];
  items: SpatialItem[];
  count: number;
}

/**
 * Spatial & Tabletop Dice Service
 * Integrates with Rust Tauri IPC when running desktop app, backend REST endpoints, or instant client WebAssembly/Fast Math fallback
 */
export const spatialDiceService = {
  /**
   * Fast Dice Roll Evaluation (Universal TTRPG standard)
   */
  async roll(expression: string, modifier: number = 0): Promise<DiceRollResult> {
    try {
      // Check if Tauri desktop invoke is available
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<DiceRollResult>('evaluate_dice_roll', { expression, modifier });
      }

      // Backend API call
      const res = await fetch('/api/dice/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression, modifier }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.roll;
      }
    } catch (err) {
      console.warn('Backend dice roll failed, computing client fallback', err);
    }

    // Client fallback
    return this.clientFallbackRoll(expression, modifier);
  },

  /**
   * Monte Carlo distribution simulation (10k+ iterations in ms)
   */
  async simulate(expression: string, iterations: number = 25000): Promise<DiceDistributionResult | null> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<DiceDistributionResult>('simulate_dice_distribution', { expression, iterations });
      }

      const res = await fetch('/api/dice/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression, iterations }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.distribution;
      }
    } catch (err) {
      console.warn('Dice simulation error', err);
    }
    return null;
  },

  /**
   * Spatial Frustum Culling calculation for Miro canvas objects (using Fast 2D Spatial Grid)
   */
  async calculateCulling(
    items: SpatialItem[],
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
  ): Promise<string[]> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<SpatialQueryResult>('calculate_spatial_culling', {
          items,
          viewX,
          viewY,
          viewW,
          viewH,
        });
        return res.visibleIds;
      }

      // Fast Client Spatial Hash Grid for immediate zero-lag 120 FPS rendering
      const grid = new FastSpatialGrid(128);
      grid.insertBatch(items);
      const visible = grid.queryFrustum({ x: viewX, y: viewY, width: viewW, height: viewH });
      return visible.map((i) => i.id);
    } catch (err) {
      // Simple AABB intersection fallback
      const viewRight = viewX + viewW;
      const viewBottom = viewY + viewH;
      return items
        .filter(
          (item) =>
            item.x < viewRight &&
            item.x + item.width > viewX &&
            item.y < viewBottom &&
            item.y + item.height > viewY
        )
        .map((i) => i.id);
    }
  },

  /**
   * Fast Dynamic Lighting & Shadow Volume Calculation (Rust / Backend / Fast Math)
   */
  async calculateLighting(
    lights: LightSource[],
    walls: VisionWall[] = [],
    numRays = 120
  ): Promise<ShadowVolume[]> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<ShadowVolume[]>('calculate_dynamic_lighting', {
          lights,
          walls,
          numRays,
        });
      }

      const res = await fetch('/api/lighting/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lights, walls, numRays }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.volumes || [];
      }
    } catch (err) {
      // Fallback
    }

    return tabletopMathEngine.computeLighting(lights, walls, numRays);
  },

  /**
   * Optimal Grid Auto-Detection (Rust / Backend / Fast Math)
   */
  async detectGrid(
    imageWidth: number,
    imageHeight: number,
    preferredCellSize?: number
  ): Promise<GridDetectionResult> {
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<GridDetectionResult>('detect_grid_alignment', {
          imageWidth,
          imageHeight,
          preferredCellSize,
        });
      }

      const res = await fetch('/api/grid/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageWidth, imageHeight, preferredCellSize }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.grid;
      }
    } catch (err) {
      // Fallback
    }

    return tabletopMathEngine.detectGrid(imageWidth, imageHeight, preferredCellSize);
  },

  clientFallbackRoll(expression: string, modifier: number): DiceRollResult {
    const clean = expression.replace(/\s+/g, '').toLowerCase();
    const parts = clean.split('d');
    const count = parseInt(parts[0], 10) || 1;
    const sides = parseInt(parts[1], 10) || 20;

    const rolls: number[] = [];
    let sum = 0;
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * sides) + 1;
      rolls.push(r);
      sum += r;
    }

    const total = sum + modifier;
    const isCrit = count === 1 && sides === 20 && rolls[0] === 20;
    const isFumble = count === 1 && sides === 20 && rolls[0] === 1;

    return {
      total,
      rolls,
      modifier,
      isCrit,
      isFumble,
      breakdown: `[${rolls.join(',')}]`,
      formatted: `${expression} [${rolls.join(',')}]${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`,
    };
  },
};

