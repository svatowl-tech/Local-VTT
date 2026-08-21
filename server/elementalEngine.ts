/**
 * Backend Elemental Physics & Fluid Caustics Engine
 * Performs spatial particle hashing, river path smoothing, and elemental interaction calculations.
 */

export interface ElementalNode {
  x: number;
  y: number;
  r: number;
}

export interface ElementalClashResult {
  hasClash: boolean;
  clashPoints: { x: number; y: number; intensity: number }[];
  steamSpawnPoints: { x: number; y: number; count: number }[];
}

/**
 * Computes geometric collisions and phase transition points between fire & water paths
 */
export function calculateElementalClashes(
  fireNodes: ElementalNode[],
  waterNodes: ElementalNode[]
): ElementalClashResult {
  const clashPoints: { x: number; y: number; intensity: number }[] = [];
  const steamSpawnPoints: { x: number; y: number; count: number }[] = [];

  for (const f of fireNodes) {
    for (const w of waterNodes) {
      const dx = f.x - w.x;
      const dy = f.y - w.y;
      const dist = Math.hypot(dx, dy);
      const combinedR = f.r + w.r;

      if (dist < combinedR) {
        const overlap = (combinedR - dist) / combinedR;
        const midX = (f.x * w.r + w.x * f.r) / combinedR;
        const midY = (f.y * w.r + w.y * f.r) / combinedR;

        clashPoints.push({
          x: Math.round(midX),
          y: Math.round(midY),
          intensity: Number(overlap.toFixed(2)),
        });

        steamSpawnPoints.push({
          x: Math.round(midX),
          y: Math.round(midY),
          count: Math.min(8, Math.round(overlap * 6) + 1),
        });
      }
    }
  }

  return {
    hasClash: clashPoints.length > 0,
    clashPoints,
    steamSpawnPoints,
  };
}

/**
 * Catmull-Rom spline interpolation for smooth organic river beds and flame paths
 */
export function smoothElementalTrail(
  points: ElementalNode[],
  subdivisions: number = 4
): ElementalNode[] {
  if (points.length <= 2) return points;

  const result: ElementalNode[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    for (let step = 0; step < subdivisions; step++) {
      const t = step / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom formulation
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      const r = p1.r + (p2.r - p1.r) * t;

      result.push({
        x: Math.round(x),
        y: Math.round(y),
        r: Math.round(r),
      });
    }
  }

  result.push(points[points.length - 1]);
  return result;
}
