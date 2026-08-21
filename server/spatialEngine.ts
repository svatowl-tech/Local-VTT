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
 * 2D Spatial Hash Grid for high-performance tabletop queries (frustum culling, collision, proximity)
 * Reduces query complexity from O(N^2) to O(1)
 */
export class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, SpatialItem[]> = new Map();

  constructor(cellSize: number = 128) {
    this.cellSize = cellSize > 0 ? cellSize : 128;
  }

  private getCellKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  private getCellCoords(x: number, y: number): [number, number] {
    return [Math.floor(x / this.cellSize), Math.floor(y / this.cellSize)];
  }

  public insert(item: SpatialItem): void {
    const [minCx, minCy] = this.getCellCoords(item.x, item.y);
    const [maxCx, maxCy] = this.getCellCoords(item.x + item.width, item.y + item.height);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.getCellKey(cx, cy);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(item);
      }
    }
  }

  public queryFrustum(
    viewX: number,
    viewY: number,
    viewW: number,
    viewH: number
  ): SpatialQueryResult {
    const [minCx, minCy] = this.getCellCoords(viewX, viewY);
    const [maxCx, maxCy] = this.getCellCoords(viewX + viewW, viewY + viewH);

    const seenIds = new Set<string>();
    const visibleItems: SpatialItem[] = [];

    const viewRight = viewX + viewW;
    const viewBottom = viewY + viewH;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const list = this.grid.get(this.getCellKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);

              const itemRight = item.x + item.width;
              const itemBottom = item.y + item.height;

              // Fast AABB intersection
              if (
                item.x < viewRight &&
                itemRight > viewX &&
                item.y < viewBottom &&
                itemBottom > viewY
              ) {
                visibleItems.push(item);
              }
            }
          }
        }
      }
    }

    return {
      visibleIds: visibleItems.map((item) => item.id),
      items: visibleItems,
      count: visibleItems.length,
    };
  }

  public queryRadius(originX: number, originY: number, radius: number): SpatialItem[] {
    const rSq = radius * radius;
    const [minCx, minCy] = this.getCellCoords(originX - radius, originY - radius);
    const [maxCx, maxCy] = this.getCellCoords(originX + radius, originY + radius);

    const seenIds = new Set<string>();
    const result: SpatialItem[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const list = this.grid.get(this.getCellKey(cx, cy));
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);

              const closestX = Math.max(item.x, Math.min(originX, item.x + item.width));
              const closestY = Math.max(item.y, Math.min(originY, item.y + item.height));
              const dx = originX - closestX;
              const dy = originY - closestY;

              if (dx * dx + dy * dy <= rSq) {
                result.push(item);
              }
            }
          }
        }
      }
    }

    return result;
  }
}

export function cullItemsInFrustum(
  items: SpatialItem[],
  viewX: number,
  viewY: number,
  viewW: number,
  viewH: number,
  cellSize: number = 128
): SpatialQueryResult {
  const grid = new SpatialHashGrid(cellSize);
  for (let i = 0; i < items.length; i++) {
    grid.insert(items[i]);
  }
  return grid.queryFrustum(viewX, viewY, viewW, viewH);
}
