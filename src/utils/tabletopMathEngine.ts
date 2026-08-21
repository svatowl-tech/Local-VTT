export interface Point2D {
  x: number;
  y: number;
}

export interface FogPoint {
  x: number;
  y: number;
  radius: number;
  type: 'reveal' | 'conceal';
  opacity?: number;
}

export interface VisionWall {
  p1: Point2D;
  p2: Point2D;
  blocksVision: boolean;
}

export interface LightSource {
  id: string;
  x: number;
  y: number;
  brightRadius: number;
  dimRadius: number;
  color: string;
  intensity?: number;
  castShadows?: boolean;
}

export interface ShadowVolume {
  lightId: string;
  polygon: Point2D[];
  brightRadius: number;
  dimRadius: number;
  color: string;
}

export interface GridDetectionResult {
  detectedCellSize: number;
  columns: number;
  rows: number;
  offsetX: number;
  offsetY: number;
  confidence: number;
  recommendedPpi: number;
}

/**
 * Fast Client-side Math & Geometry Engine
 * Mirroring native Rust optimizations for instant zero-lag responsiveness on low-spec hardware.
 */
export const tabletopMathEngine = {
  /**
   * Checks if running inside native Tauri Rust environment
   */
  isTauri(): boolean {
    if (typeof window === 'undefined') return false;
    // @ts-ignore
    return !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
  },

  /**
   * Ramer-Douglas-Peucker (RDP) algorithm to compress pointer drawing strokes
   */
  simplifyStrokeRDP(points: Point2D[], epsilon = 1.5): Point2D[] {
    if (!points || points.length <= 2) return points;

    let maxDist = 0;
    let index = 0;
    const endIdx = points.length - 1;

    for (let i = 1; i < endIdx; i++) {
      const dist = this.perpendicularDistance(points[i], points[0], points[endIdx]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      const left = this.simplifyStrokeRDP(points.slice(0, index + 1), epsilon);
      const right = this.simplifyStrokeRDP(points.slice(index), epsilon);
      return left.slice(0, -1).concat(right);
    }
    return [points[0], points[endIdx]];
  },

  perpendicularDistance(pt: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      const px = pt.x - lineStart.x;
      const py = pt.y - lineStart.y;
      return Math.sqrt(px * px + py * py);
    }

    const num = Math.abs(dy * pt.x - dx * pt.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x);
    return num / Math.sqrt(lenSq);
  },

  /**
   * Optimizes fog history by eliminating redundant fully-occluded points in reverse order
   * Uses flat spatial array matching Rust decimation algorithm
   */
  decimateFogPoints(history: FogPoint[]): FogPoint[] {
    if (!history || history.length < 10) return history;

    const optimized: FogPoint[] = [];

    for (let i = history.length - 1; i >= 0; i--) {
      const pt = history[i];
      let isCovered = false;

      for (let j = 0; j < optimized.length; j++) {
        const kept = optimized[j];
        if (pt.type === kept.type) {
          const dx = pt.x - kept.x;
          const dy = pt.y - kept.y;
          const distSq = dx * dx + dy * dy;

          const rDiff = kept.radius - pt.radius;
          if (rDiff > 0 && distSq <= rDiff * rDiff) {
            isCovered = true;
            break;
          }

          const decimateThreshold = kept.radius * 0.35;
          if (distSq < decimateThreshold * decimateThreshold && pt.radius <= kept.radius) {
            isCovered = true;
            break;
          }
        }
      }

      if (!isCovered) {
        optimized.push(pt);
      }
    }

    return optimized.reverse();
  },

  /**
   * Async Rust optimization invocation if Tauri is available
   */
  async optimizeFogAsync(history: FogPoint[]): Promise<FogPoint[]> {
    if (this.isTauri()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke<FogPoint[]>('optimize_fog', { history });
      } catch (e) {
        // Fallback to local
      }
    }
    return this.decimateFogPoints(history);
  },

  /**
   * Fast Raycasting 2D Visibility Polygon calculation (Field of View)
   */
  calculateFOVPolygon(
    origin: Point2D,
    radius: number,
    numRays = 120,
    walls: VisionWall[] = []
  ): Point2D[] {
    const raysCount = Math.max(36, Math.min(360, numRays));
    const angleStep = (Math.PI * 2) / raysCount;

    const activeWalls = walls
      .filter((w) => w.blocksVision)
      .map((w) => ({ p1: w.p1, p2: w.p2 }));

    const polygon: Point2D[] = [];

    for (let i = 0; i < raysCount; i++) {
      const angle = i * angleStep;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let closestDist = radius;

      if (activeWalls.length > 0) {
        for (let j = 0; j < activeWalls.length; j++) {
          const w = activeWalls[j];
          const dist = this.raySegmentIntersect(origin, dirX, dirY, w.p1, w.p2);
          if (dist !== null && dist < closestDist && dist > 0) {
            closestDist = dist;
          }
        }
      }

      polygon.push({
        x: origin.x + dirX * closestDist,
        y: origin.y + dirY * closestDist,
      });
    }

    return polygon;
  },

  raySegmentIntersect(
    rayOrigin: Point2D,
    rayDirX: number,
    rayDirY: number,
    p1: Point2D,
    p2: Point2D
  ): number | null {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    const denom = rayDirX * dy - rayDirY * dx;
    if (Math.abs(denom) < 1e-7) return null;

    const rx = p1.x - rayOrigin.x;
    const ry = p1.y - rayOrigin.y;

    const t = (rx * dy - ry * dx) / denom;
    const u = (rx * rayDirY - ry * rayDirX) / denom;

    if (t >= 0 && u >= 0 && u <= 1) {
      return t;
    }
    return null;
  },

  /**
   * Computes dynamic shadow volumes for multiple lights
   */
  computeLighting(
    lights: LightSource[],
    walls: VisionWall[] = [],
    numRays = 120
  ): ShadowVolume[] {
    return lights.map((light) => {
      const maxR = Math.max(light.dimRadius || 0, light.brightRadius || 0);
      const polygon = this.calculateFOVPolygon(
        { x: light.x, y: light.y },
        maxR,
        numRays,
        light.castShadows !== false ? walls : []
      );
      return {
        lightId: light.id,
        polygon,
        brightRadius: light.brightRadius || 0,
        dimRadius: light.dimRadius || 0,
        color: light.color || '#ffeedd',
      };
    });
  },

  /**
   * Grid alignment detection
   */
  detectGrid(
    imageWidth: number,
    imageHeight: number,
    preferredCellSize?: number
  ): GridDetectionResult {
    const standardSizes = [50, 70, 100, 140, 200, 256];
    let bestSize = preferredCellSize || 70;
    let bestRemainder = Number.MAX_VALUE;

    if (!preferredCellSize) {
      for (const size of standardSizes) {
        const remW = imageWidth % size;
        const remH = imageHeight % size;
        const totalRem = remW + remH;

        if (totalRem < bestRemainder) {
          bestRemainder = totalRem;
          bestSize = size;
        }
      }
    }

    const cols = Math.max(1, Math.round(imageWidth / bestSize));
    const rows = Math.max(1, Math.round(imageHeight / bestSize));

    const offsetX = Math.max(0, (imageWidth - cols * bestSize) * 0.5);
    const offsetY = Math.max(0, (imageHeight - rows * bestSize) * 0.5);

    const confidence = bestRemainder < 10 ? 0.95 : bestRemainder < 30 ? 0.8 : 0.65;

    let ppi = 70;
    if (bestSize <= 60) ppi = 50;
    else if (bestSize <= 85) ppi = 70;
    else if (bestSize <= 120) ppi = 100;
    else if (bestSize <= 160) ppi = 140;
    else ppi = 200;

    return {
      detectedCellSize: bestSize,
      columns: cols,
      rows,
      offsetX,
      offsetY,
      confidence,
      recommendedPpi: ppi,
    };
  },
};
