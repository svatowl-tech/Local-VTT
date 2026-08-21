/**
 * High-Performance 2D Spatial Hash Grid
 * Reduces O(N^2) pairwise distance checks to O(1) local cell lookups.
 * Used for elemental clash detection (Water vs Fire steam generation), token collisions & viewport queries.
 */

export interface SpatialNode {
  id: string;
  x: number;
  y: number;
  r: number;
  type: 'fire' | 'water' | 'fog' | 'token' | 'wall' | 'lightning' | string;
  data?: any;
}

export class SpatialHashGrid2D {
  private cellSize: number;
  private inverseCellSize: number;
  private grid: Map<string, SpatialNode[]> = new Map();

  constructor(cellSize: number = 128) {
    this.cellSize = cellSize;
    this.inverseCellSize = 1 / cellSize;
  }

  private hash(gridX: number, gridY: number): string {
    return `${gridX}_${gridY}`;
  }

  clear(): void {
    this.grid.clear();
  }

  /**
   * Inserts a node into all grid cells it overlaps
   */
  insert(node: SpatialNode): void {
    const minGridX = Math.floor((node.x - node.r) * this.inverseCellSize);
    const maxGridX = Math.floor((node.x + node.r) * this.inverseCellSize);
    const minGridY = Math.floor((node.y - node.r) * this.inverseCellSize);
    const maxGridY = Math.floor((node.y + node.r) * this.inverseCellSize);

    for (let gx = minGridX; gx <= maxGridX; gx++) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const key = this.hash(gx, gy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(node);
      }
    }
  }

  /**
   * Queries all neighboring nodes within radius R in O(1) amortized time
   */
  queryRadius(x: number, y: number, radius: number, filterType?: SpatialNode['type']): SpatialNode[] {
    const minGridX = Math.floor((x - radius) * this.inverseCellSize);
    const maxGridX = Math.floor((x + radius) * this.inverseCellSize);
    const minGridY = Math.floor((y - radius) * this.inverseCellSize);
    const maxGridY = Math.floor((y + radius) * this.inverseCellSize);

    const foundSet = new Set<string>();
    const results: SpatialNode[] = [];
    const radSq = radius * radius;

    for (let gx = minGridX; gx <= maxGridX; gx++) {
      for (let gy = minGridY; gy <= maxGridY; gy++) {
        const cell = this.grid.get(this.hash(gx, gy));
        if (!cell) continue;

        for (let i = 0; i < cell.length; i++) {
          const item = cell[i];
          if (filterType && item.type !== filterType) continue;
          if (foundSet.has(item.id)) continue;

          const dx = item.x - x;
          const dy = item.y - y;
          const combinedR = radius + item.r;

          if (dx * dx + dy * dy <= combinedR * combinedR) {
            foundSet.add(item.id);
            results.push(item);
          }
        }
      }
    }

    return results;
  }
}
