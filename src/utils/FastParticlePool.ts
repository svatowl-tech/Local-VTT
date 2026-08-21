/**
 * Zero-Allocation High-Speed Particle Pool
 * Implements flat contiguous TypedArray buffers (Float32Array) mirroring Rust memory layout.
 * Eliminates garbage collector sweeps (GC lag) during 60/120 FPS continuous animations.
 *
 * Buffer Layout per Particle (8 floats per entry):
 * [0] x
 * [1] y
 * [2] vx
 * [3] vy
 * [4] life
 * [5] maxLife
 * [6] size
 * [7] hue (or alpha / custom param)
 */

export class FastParticlePool {
  private capacity: number;
  private stride: number = 8;
  private data: Float32Array;
  public count: number = 0;

  constructor(maxParticles: number = 512) {
    this.capacity = maxParticles;
    this.data = new Float32Array(this.capacity * this.stride);
  }

  /**
   * Resets active count without re-allocating memory
   */
  clear(): void {
    this.count = 0;
  }

  /**
   * Spawns a particle in O(1) time
   */
  spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    maxLife: number,
    size: number,
    hue: number
  ): boolean {
    if (this.count >= this.capacity) return false;

    const offset = this.count * this.stride;
    this.data[offset + 0] = x;
    this.data[offset + 1] = y;
    this.data[offset + 2] = vx;
    this.data[offset + 3] = vy;
    this.data[offset + 4] = life;
    this.data[offset + 5] = maxLife;
    this.data[offset + 6] = size;
    this.data[offset + 7] = hue;

    this.count++;
    return true;
  }

  /**
   * High-speed batch physics & lifetime update (zero allocations, swap-and-pop on death)
   */
  update(
    gravityY: number = 0,
    windTurbulence: number = 0,
    time: number = 0
  ): void {
    const s = this.stride;
    let i = 0;

    while (i < this.count) {
      const offset = i * s;
      let life = this.data[offset + 4] - 1;

      // Check if dead or too small
      if (life <= 0) {
        // Swap with last active particle (O(1) deletion)
        this.count--;
        if (i < this.count) {
          const lastOffset = this.count * s;
          for (let j = 0; j < s; j++) {
            this.data[offset + j] = this.data[lastOffset + j];
          }
        }
        continue;
      }

      this.data[offset + 4] = life;

      // Update position with velocity + wind turbulence
      const py = this.data[offset + 1];
      const turb = windTurbulence > 0 ? Math.sin(time * 3 + py * 0.05) * windTurbulence : 0;

      this.data[offset + 0] += this.data[offset + 2] + turb;
      this.data[offset + 1] += this.data[offset + 3] + gravityY;
      this.data[offset + 6] *= 0.96; // size decay

      i++;
    }
  }

  /**
   * Fast Read Access for Renderers
   */
  get(index: number) {
    const offset = index * this.stride;
    const life = this.data[offset + 4];
    const maxLife = this.data[offset + 5];
    const alpha = maxLife > 0 ? Math.max(0, life / maxLife) : 0;

    return {
      x: this.data[offset + 0],
      y: this.data[offset + 1],
      vx: this.data[offset + 2],
      vy: this.data[offset + 3],
      life,
      maxLife,
      size: this.data[offset + 6],
      hue: this.data[offset + 7],
      alpha,
    };
  }

  getRawData(): Float32Array {
    return this.data;
  }
}
