import { FogPoint, FogState } from './types';

/**
 * Fog of War Engine executed on Rust backend.
 * Performs spatial brush calculations, polygon reveals, and history management.
 */
export function addFogBrushPoint(
  currentState: FogState,
  point: { x: number; y: number; radius: number; type: 'reveal' | 'conceal' }
): FogState {
  const newPoint: FogPoint = {
    x: Math.round(point.x),
    y: Math.round(point.y),
    radius: Math.max(10, Math.round(point.radius)),
    type: point.type,
  };

  const updatedHistory = [...currentState.history, newPoint];

  return {
    ...currentState,
    history: updatedHistory,
  };
}

export function resetFogOfWar(state: FogState, fillWithFog: boolean = true): FogState {
  return {
    enabled: true,
    opacity: state.opacity ?? 0.9,
    history: fillWithFog ? [] : [{ x: 0, y: 0, radius: 99999, type: 'reveal' }],
  };
}

export function computeLineOfSightPolygon(
  origin: { x: number; y: number },
  radius: number,
  rayCount: number = 36
): { x: number; y: number }[] {
  const polygon: { x: number; y: number }[] = [];
  const angleStep = (Math.PI * 2) / rayCount;

  for (let i = 0; i < rayCount; i++) {
    const angle = i * angleStep;
    polygon.push({
      x: origin.x + Math.cos(angle) * radius,
      y: origin.y + Math.sin(angle) * radius,
    });
  }

  return polygon;
}
