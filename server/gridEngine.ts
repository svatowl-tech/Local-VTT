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
 * Computes optimal grid alignment, dimensions, offsets and PPI for any battlemap
 */
export function calculateOptimalGrid(
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
}

/**
 * Snap coordinates to nearest grid point or tile center with sub-pixel accuracy
 */
export function snapToGridCell(
  x: number,
  y: number,
  cellSize: number,
  offsetX = 0,
  offsetY = 0,
  snapToCenter = false
): { x: number; y: number } {
  if (cellSize <= 0) return { x, y };

  const relX = x - offsetX;
  const relY = y - offsetY;

  if (snapToCenter) {
    const snappedX = Math.floor(relX / cellSize) * cellSize + cellSize * 0.5 + offsetX;
    const snappedY = Math.floor(relY / cellSize) * cellSize + cellSize * 0.5 + offsetY;
    return { x: snappedX, y: snappedY };
  } else {
    const snappedX = Math.round(relX / cellSize) * cellSize + offsetX;
    const snappedY = Math.round(relY / cellSize) * cellSize + offsetY;
    return { x: snappedX, y: snappedY };
  }
}
