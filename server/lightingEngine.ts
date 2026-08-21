export interface Point2D {
  x: number;
  y: number;
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

/**
 * Fast 2D Visibility Polygon & Raycasting Lighting Engine
 * Computes dynamic shadow volumes from wall occluders and multiple light sources.
 */
export function computeDynamicLighting(
  lights: LightSource[],
  walls: VisionWall[],
  numRaysPerLight = 120
): ShadowVolume[] {
  const raysCount = Math.max(36, Math.min(360, numRaysPerLight));
  const angleStep = (Math.PI * 2) / raysCount;

  const activeWalls = walls
    .filter((w) => w.blocksVision)
    .map((w) => ({ p1: w.p1, p2: w.p2 }));

  const volumes: ShadowVolume[] = [];

  for (const light of lights) {
    const maxR = Math.max(light.dimRadius || 0, light.brightRadius || 0);
    if (maxR <= 0) continue;

    const origin = { x: light.x, y: light.y };
    const boundary: Point2D[] = [];

    for (let i = 0; i < raysCount; i++) {
      const angle = i * angleStep;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      let closestHit = maxR;

      if (light.castShadows !== false && activeWalls.length > 0) {
        for (const wall of activeWalls) {
          const dist = rayIntersect(origin, dirX, dirY, wall.p1, wall.p2);
          if (dist !== null && dist < closestHit && dist > 0) {
            closestHit = dist;
          }
        }
      }

      boundary.push({
        x: origin.x + dirX * closestHit,
        y: origin.y + dirY * closestHit,
      });
    }

    volumes.push({
      lightId: light.id,
      polygon: boundary,
      brightRadius: light.brightRadius || 0,
      dimRadius: light.dimRadius || 0,
      color: light.color || '#ffeedd',
    });
  }

  return volumes;
}

function rayIntersect(
  rayOrigin: Point2D,
  rayDirX: number,
  rayDirY: number,
  p1: Point2D,
  p2: Point2D
): number | null {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const denom = rayDirX * dy - rayDirY * dx;
  if (Math.abs(denom) < 1e-7) {
    return null;
  }

  const rx = p1.x - rayOrigin.x;
  const ry = p1.y - rayOrigin.y;

  const t = (rx * dy - ry * dx) / denom;
  const u = (rx * rayDirY - ry * rayDirX) / denom;

  if (t >= 0 && u >= 0 && u <= 1) {
    return t;
  }
  return null;
}
