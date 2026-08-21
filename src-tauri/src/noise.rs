/// High-speed 2D Seamless Fractal Simplex / Perlin Noise Generator in Rust
/// Designed for procedural fog, mist, and cloud density maps with zero runtime allocation overhead.

pub struct FractalNoiseGenerator {
    perm: [u8; 512],
}

impl Default for FractalNoiseGenerator {
    fn default() -> Self {
        Self::new(42)
    }
}

impl FractalNoiseGenerator {
    pub fn new(seed: u64) -> Self {
        let mut p: [u8; 256] = [0; 256];
        for i in 0..256 {
            p[i] = i as u8;
        }

        // LCG shuffle with seed
        let mut s = seed.wrapping_add(0x9E3779B97F4A7C15);
        for i in (1..256).rev() {
            s = s.wrapping_mul(6364136223846793005).wrapping_add(1);
            let j = (s >> 33) as usize % (i + 1);
            p.swap(i, j);
        }

        let mut perm = [0u8; 512];
        for i in 0..512 {
            perm[i] = p[i & 255];
        }

        Self { perm }
    }

    #[inline(always)]
    fn grad(hash: u8, x: f64, y: f64) -> f64 {
        match hash & 7 {
            0 => x + y,
            1 => -x + y,
            2 => x - y,
            3 => -x - y,
            4 => x,
            5 => -x,
            6 => y,
            _ => -y,
        }
    }

    #[inline(always)]
    fn fade(t: f64) -> f64 {
        t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
    }

    #[inline(always)]
    fn lerp(a: f64, b: f64, t: f64) -> f64 {
        a + t * (b - a)
    }

    /// Single octave 2D noise with periodic wrapping
    pub fn noise2d_periodic(&self, x: f64, y: f64, period_x: f64, period_y: f64) -> f64 {
        let x_mod = x.rem_euclid(period_x);
        let y_mod = y.rem_euclid(period_y);

        let xi = (x_mod.floor() as usize) % (period_x as usize);
        let yi = (y_mod.floor() as usize) % (period_y as usize);

        let xi1 = (xi + 1) % (period_x as usize);
        let yi1 = (yi + 1) % (period_y as usize);

        let xf = x_mod - x_mod.floor();
        let yf = y_mod - y_mod.floor();

        let u = Self::fade(xf);
        let v = Self::fade(yf);

        let aa = self.perm[self.perm[xi] as usize + yi] as u8;
        let ab = self.perm[self.perm[xi] as usize + yi1] as u8;
        let ba = self.perm[self.perm[xi1] as usize + yi] as u8;
        let bb = self.perm[self.perm[xi1] as usize + yi1] as u8;

        let g_aa = Self::grad(aa, xf, yf);
        let g_ba = Self::grad(ba, xf - 1.0, yf);
        let g_ab = Self::grad(ab, xf, yf - 1.0);
        let g_bb = Self::grad(bb, xf - 1.0, yf - 1.0);

        let x1 = Self::lerp(g_aa, g_ba, u);
        let x2 = Self::lerp(g_ab, g_bb, u);

        Self::lerp(x1, x2, v)
    }

    /// Generates multi-octave seamless fractal turbulence (fBm)
    pub fn fractal_turbulence_seamless(
        &self,
        x: f64,
        y: f64,
        size: usize,
        octaves: usize,
        persistence: f64,
    ) -> f64 {
        let mut total = 0.0;
        let mut max_val = 0.0;
        let mut amplitude = 1.0;
        let mut freq = 4.0;
        let period = size as f64;

        for _ in 0..octaves {
            let n = self.noise2d_periodic(
                (x * freq) / period * period,
                (y * freq) / period * period,
                freq,
                freq,
            );
            total += n.abs() * amplitude;
            max_val += amplitude;
            amplitude *= persistence;
            freq *= 2.0;
        }

        total / max_val
    }

    /// Generates seamless RGBA texture buffer for Web/Canvas
    pub fn generate_mist_texture_rgba(
        &self,
        size: usize,
        octaves: usize,
        r: u8,
        g: u8,
        b: u8,
    ) -> Vec<u8> {
        let mut buffer = vec![0u8; size * size * 4];

        for y in 0..size {
            for x in 0..size {
                let idx = (y * size + x) * 4;
                let density = self.fractal_turbulence_seamless(x as f64, y as f64, size, octaves, 0.5);
                let alpha = (density * 255.0).clamp(0.0, 255.0) as u8;

                buffer[idx + 0] = r;
                buffer[idx + 1] = g;
                buffer[idx + 2] = b;
                buffer[idx + 3] = alpha;
            }
        }

        buffer
    }
}
