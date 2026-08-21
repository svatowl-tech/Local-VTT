import { SpellTemplate, SpellShapeType } from '../types';

/**
 * Calculates cone geometry for SVG rendering and handles.
 * D&D 5e standard: 53.13 degree cone apex (width at distance D equals D).
 */
export function getConeGeometry(
  x: number,
  y: number,
  radius: number,
  angleDeg: number = 0,
  halfAngleDeg: number = 26.565
) {
  const radCenter = (angleDeg * Math.PI) / 180;
  const rad1 = ((angleDeg - halfAngleDeg) * Math.PI) / 180;
  const rad2 = ((angleDeg + halfAngleDeg) * Math.PI) / 180;

  // Arc start and end points
  const x1 = x + radius * Math.cos(rad1);
  const y1 = y + radius * Math.sin(rad1);
  const x2 = x + radius * Math.cos(rad2);
  const y2 = y + radius * Math.sin(rad2);

  // Center tip of the cone arc (for rotation & aiming handle)
  const tipX = x + radius * Math.cos(radCenter);
  const tipY = y + radius * Math.sin(radCenter);

  // Path definition (Apex -> Line to Start -> Arc to End -> Close)
  const pathData = `M ${x} ${y} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

  return {
    pathData,
    x1,
    y1,
    x2,
    y2,
    tipX,
    tipY,
    radCenter,
  };
}

/**
 * Normalizes angle to [0, 360) range.
 */
export function normalizeAngle(angleDeg: number): number {
  let a = angleDeg % 360;
  if (a < 0) a += 360;
  return Math.round(a);
}

/**
 * Calculates angle in degrees from origin (ox, oy) to target (tx, ty).
 */
export function calculateAngleDegrees(ox: number, oy: number, tx: number, ty: number): number {
  const radians = Math.atan2(ty - oy, tx - ox);
  return normalizeAngle((radians * 180) / Math.PI);
}

/**
 * Calculates distance in feet based on grid pixel size (typically 50px = 5ft).
 */
export function pixelsToFeet(pixels: number, gridSize: number = 50): number {
  const feet = (pixels / gridSize) * 5;
  return Math.max(5, Math.round(feet / 5) * 5); // Snapped to 5ft increments
}

/**
 * Calculates pixel distance from feet.
 */
export function feetToPixels(feet: number, gridSize: number = 50): number {
  return (feet / 5) * gridSize;
}

/**
 * Cardinal directions mapped to angles.
 */
export const CARDINAL_DIRECTIONS = [
  { label: 'East (0°)', angle: 0, arrow: '➡️' },
  { label: 'SE (45°)', angle: 45, arrow: '↘️' },
  { label: 'South (90°)', angle: 90, arrow: '⬇️' },
  { label: 'SW (135°)', angle: 135, arrow: '↙️' },
  { label: 'West (180°)', angle: 180, arrow: '⬅️' },
  { label: 'NW (225°)', angle: 225, arrow: '↖️' },
  { label: 'North (270°)', angle: 270, arrow: '⬆️' },
  { label: 'NE (315°)', angle: 315, arrow: '↗️' },
] as const;
