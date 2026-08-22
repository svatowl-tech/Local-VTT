import { DrawingPoint, SpellShapeType, SpellTemplate } from './types';

/**
 * Douglas-Peucker line simplification algorithm
 * Reduces high-frequency raw mouse/stylus jitter points into clean smooth vector paths.
 */
export function simplifyPoints(points: DrawingPoint[], tolerance: number = 2.0): DrawingPoint[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const lastIndex = points.length - 1;

  for (let i = 1; i < lastIndex; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[lastIndex]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPoints(points.slice(0, index + 1), tolerance);
    const right = simplifyPoints(points.slice(index), tolerance);
    return [...left.slice(0, left.length - 1), ...right];
  } else {
    return [points[0], points[lastIndex]];
  }
}

function perpendicularDistance(point: DrawingPoint, lineStart: DrawingPoint, lineEnd: DrawingPoint): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLengthSq = dx * dx + dy * dy;

  if (lineLengthSq === 0) {
    return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lineLengthSq));
  const projectionX = lineStart.x + t * dx;
  const projectionY = lineStart.y + t * dy;

  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

/**
 * Calculates Universal TTRPG Standard Area & Zone Geometry:
 * - Circle: radius in world units (50px = 5ft)
 * - Cone: 53.13° apex angle, length = radius
 * - Line: width (typically 5ft/50px) x length
 * - Square / Cube: width x height
 */
export function calculateSpellAreaMetrics(
  shape: SpellShapeType,
  radius: number,
  gridPixelSize: number = 50
): {
  areaSqFt: number;
  gridCellsCoveredApprox: number;
  label: string;
} {
  const feetPerPixel = 5 / gridPixelSize;
  const radiusFeet = Math.round(radius * feetPerPixel);

  switch (shape) {
    case 'circle': {
      const area = Math.PI * radiusFeet * radiusFeet;
      return {
        areaSqFt: Math.round(area),
        gridCellsCoveredApprox: Math.round(area / 25),
        label: `${radiusFeet} ft (${Math.round(radiusFeet * 0.3)}m) Radius`,
      };
    }
    case 'cone': {
      // 53.13 deg cone area = (53.13 / 360) * pi * r^2 = 0.463 * r^2
      const area = (53.13 / 360) * Math.PI * radiusFeet * radiusFeet;
      return {
        areaSqFt: Math.round(area),
        gridCellsCoveredApprox: Math.max(1, Math.round(area / 25)),
        label: `${radiusFeet} ft (${Math.round(radiusFeet * 0.3)}m) Cone`,
      };
    }
    case 'line': {
      const lengthFeet = radiusFeet;
      const widthFeet = 5;
      const area = lengthFeet * widthFeet;
      return {
        areaSqFt: Math.round(area),
        gridCellsCoveredApprox: Math.max(1, Math.round(lengthFeet / 5)),
        label: `${widthFeet}x${lengthFeet} ft Line`,
      };
    }
    case 'square': {
      const sideFeet = radiusFeet;
      const area = sideFeet * sideFeet;
      return {
        areaSqFt: Math.round(area),
        gridCellsCoveredApprox: Math.max(1, Math.round(area / 25)),
        label: `${sideFeet}x${sideFeet} ft Cube`,
      };
    }
  }
}
