import { FogStyleType } from '../types';

export interface FogColorTheme {
  name: string;
  baseColor: string;
  masterColor: string;
  cloudTintA: string;
  cloudTintB: string;
  cloudTintC: string;
  glowTint: string;
}

export const FOG_THEMES: Record<FogStyleType, FogColorTheme> = {
  'white-mist': {
    name: 'White Billowing Mist (Клубящийся белый туман)',
    baseColor: 'rgba(165, 185, 210, 0.4)',
    masterColor: 'rgba(180, 205, 230, 0.35)',
    cloudTintA: 'rgba(255, 255, 255, 0.85)',
    cloudTintB: 'rgba(215, 230, 245, 0.75)',
    cloudTintC: 'rgba(145, 170, 195, 0.65)',
    glowTint: 'rgba(255, 255, 255, 0.5)',
  },
  'mystic-blue': {
    name: 'Ethereal Ghost Mist (Призрачный туман)',
    baseColor: 'rgba(8, 20, 38, 0.6)',
    masterColor: 'rgba(56, 189, 248, 0.3)',
    cloudTintA: 'rgba(56, 189, 248, 0.85)',
    cloudTintB: 'rgba(14, 116, 144, 0.8)',
    cloudTintC: 'rgba(3, 105, 161, 0.7)',
    glowTint: 'rgba(125, 211, 252, 0.6)',
  },
  'poison-fog': {
    name: 'Toxic Swampland Vapor (Ядовитые испарения)',
    baseColor: 'rgba(6, 24, 14, 0.6)',
    masterColor: 'rgba(34, 197, 94, 0.3)',
    cloudTintA: 'rgba(74, 222, 128, 0.85)',
    cloudTintB: 'rgba(22, 101, 52, 0.8)',
    cloudTintC: 'rgba(21, 128, 61, 0.7)',
    glowTint: 'rgba(134, 239, 172, 0.55)',
  },
  'midnight-shadow': {
    name: 'Pitch Abyss Shadow (Тьма бездны)',
    baseColor: 'rgba(4, 6, 10, 0.95)',
    masterColor: 'rgba(15, 23, 42, 0.55)',
    cloudTintA: 'rgba(10, 16, 28, 0.95)',
    cloudTintB: 'rgba(20, 30, 48, 0.9)',
    cloudTintC: 'rgba(2, 4, 8, 0.98)',
    glowTint: 'rgba(51, 65, 85, 0.4)',
  },
  'red-smoke': {
    name: 'Volcanic Crimson Smoke (Вулканический дым)',
    baseColor: 'rgba(45, 10, 10, 0.7)',
    masterColor: 'rgba(239, 68, 68, 0.35)',
    cloudTintA: 'rgba(248, 113, 113, 0.85)',
    cloudTintB: 'rgba(185, 28, 28, 0.8)',
    cloudTintC: 'rgba(127, 29, 29, 0.7)',
    glowTint: 'rgba(254, 202, 202, 0.5)',
  },
  'dark-obsidian': {
    name: 'Dark Necrotic Shadow (Некротическая тень)',
    baseColor: 'rgba(15, 7, 26, 0.95)',
    masterColor: 'rgba(147, 51, 234, 0.3)',
    cloudTintA: 'rgba(168, 85, 247, 0.85)',
    cloudTintB: 'rgba(107, 33, 168, 0.85)',
    cloudTintC: 'rgba(59, 7, 100, 0.9)',
    glowTint: 'rgba(216, 180, 254, 0.4)',
  },
  'smoke': {
    name: 'Campfire Ash Smoke (Пепельный дым)',
    baseColor: 'rgba(30, 35, 42, 0.7)',
    masterColor: 'rgba(148, 163, 184, 0.3)',
    cloudTintA: 'rgba(203, 213, 225, 0.8)',
    cloudTintB: 'rgba(100, 116, 139, 0.75)',
    cloudTintC: 'rgba(51, 65, 85, 0.7)',
    glowTint: 'rgba(241, 245, 249, 0.4)',
  },
  'parchment': {
    name: 'Antique Cartography (Старинный пергамент)',
    baseColor: 'rgba(44, 30, 15, 0.85)',
    masterColor: 'rgba(217, 119, 6, 0.25)',
    cloudTintA: 'rgba(254, 243, 199, 0.85)',
    cloudTintB: 'rgba(217, 119, 6, 0.7)',
    cloudTintC: 'rgba(146, 64, 14, 0.65)',
    glowTint: 'rgba(253, 230, 138, 0.45)',
  },
  'solid': {
    name: 'Solid True Darkness (Сплошная тьма)',
    baseColor: 'rgba(0, 0, 0, 0.98)',
    masterColor: 'rgba(10, 10, 12, 0.95)',
    cloudTintA: 'rgba(15, 15, 20, 0.98)',
    cloudTintB: 'rgba(8, 8, 12, 0.99)',
    cloudTintC: 'rgba(2, 2, 4, 1)',
    glowTint: 'rgba(40, 40, 50, 0.2)',
  },
  'clouds': {
    name: 'High Altitude Cloudscape (Небесные облака)',
    baseColor: 'rgba(200, 225, 255, 0.5)',
    masterColor: 'rgba(186, 230, 253, 0.4)',
    cloudTintA: 'rgba(255, 255, 255, 0.9)',
    cloudTintB: 'rgba(224, 242, 254, 0.8)',
    cloudTintC: 'rgba(186, 230, 253, 0.7)',
    glowTint: 'rgba(255, 255, 255, 0.6)',
  },
  'nebula': {
    name: 'Cosmic Astral Rift (Астральный разлом)',
    baseColor: 'rgba(22, 10, 40, 0.85)',
    masterColor: 'rgba(236, 72, 153, 0.3)',
    cloudTintA: 'rgba(244, 114, 182, 0.85)',
    cloudTintB: 'rgba(147, 51, 234, 0.8)',
    cloudTintC: 'rgba(79, 70, 229, 0.75)',
    glowTint: 'rgba(251, 207, 232, 0.55)',
  },
  'runic': {
    name: 'Ancient Arcane Runes (Магическое сияние)',
    baseColor: 'rgba(10, 30, 45, 0.8)',
    masterColor: 'rgba(6, 182, 212, 0.35)',
    cloudTintA: 'rgba(103, 232, 249, 0.85)',
    cloudTintB: 'rgba(14, 165, 233, 0.8)',
    cloudTintC: 'rgba(2, 132, 199, 0.75)',
    glowTint: 'rgba(207, 250, 254, 0.6)',
  },
};

/**
 * Fast 2D Permutation table for smooth seamless Simplex / Perlin noise.
 */
const PERM: number[] = new Array(512);
const P: number[] = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];

for (let i = 0; i < 256; i++) {
  PERM[i] = P[i];
  PERM[256 + i] = P[i];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad2d(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
}

/**
 * Seamless periodic Perlin Noise function for seamless tile generation.
 */
function seamlessNoise2D(x: number, y: number, period: number): number {
  const xi = Math.floor(x) % period;
  const yi = Math.floor(y) % period;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const x0 = (xi + period) % period;
  const x1 = (x0 + 1) % period;
  const y0 = (yi + period) % period;
  const y1 = (y0 + 1) % period;

  const aa = PERM[PERM[x0] + y0];
  const ab = PERM[PERM[x0] + y1];
  const ba = PERM[PERM[x1] + y0];
  const bb = PERM[PERM[x1] + y1];

  const x1Interp = lerp(grad2d(aa, xf, yf), grad2d(ba, xf - 1, yf), u);
  const x2Interp = lerp(grad2d(ab, xf, yf - 1), grad2d(bb, xf - 1, yf - 1), u);

  return lerp(x1Interp, x2Interp, v);
}

/**
 * Multi-octave Fractal Brownian Motion (fBm) for organic smoky clouds.
 */
function fbmSeamless(x: number, y: number, period: number, octaves: number = 4): number {
  let val = 0;
  let amp = 0.5;
  let freq = 1.0;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    val += seamlessNoise2D(x * freq, y * freq, Math.round(period * freq)) * amp;
    max += amp;
    amp *= 0.5;
    freq *= 2.0;
  }

  return (val / max + 1) * 0.5; // normalized 0..1
}

const textureCache = new Map<string, HTMLCanvasElement>();

/**
 * Generates a seamless tileable fractal cloud texture for high-performance canvas pattern tiling.
 * Cached in-memory to guarantee zero CPU stalls when toggling fog or changing maps.
 */
export function createSeamlessMistTexture(
  theme: FogColorTheme,
  size: number = 512,
  seedOffset: number = 0
): HTMLCanvasElement {
  const cacheKey = `${theme.name}_${size}_${seedOffset.toFixed(1)}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const period = 4;

  // Pre-parse color components
  const isWhite = theme.name.includes('White');
  const isDark = theme.name.includes('Pitch') || theme.name.includes('Solid') || theme.name.includes('Dark');
  const isBlue = theme.name.includes('Ghost') || theme.name.includes('Ethereal');
  const isGreen = theme.name.includes('Toxic') || theme.name.includes('Poison');

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * period + seedOffset;
      const ny = (y / size) * period + seedOffset;

      // Dual octave sampling for turbulent wisps
      const n1 = fbmSeamless(nx, ny, period, 4);
      const n2 = fbmSeamless(nx + n1 * 0.4, ny + n1 * 0.4, period, 3);
      const density = Math.pow(n2, 1.2); // Contrast curve for soft smoky clouds

      const idx = (y * size + x) * 4;

      if (isWhite) {
        // Volumetric mist: cool shadow wisps, glowing highlights, and soft cloud density
        const shadow = Math.max(0, 1 - density);
        data[idx] = Math.round(140 * shadow + 250 * density);
        data[idx + 1] = Math.round(160 * shadow + 252 * density);
        data[idx + 2] = Math.round(185 * shadow + 255 * density);
        data[idx + 3] = Math.round(Math.min(255, Math.pow(density, 0.85) * 245));
      } else if (isBlue) {
        data[idx] = Math.round(10 + density * 80);
        data[idx + 1] = Math.round(35 + density * 160);
        data[idx + 2] = Math.round(80 + density * 175);
        data[idx + 3] = Math.round(Math.min(255, Math.pow(density, 0.85) * 250));
      } else if (isGreen) {
        data[idx] = Math.round(12 + density * 70);
        data[idx + 1] = Math.round(45 + density * 180);
        data[idx + 2] = Math.round(20 + density * 90);
        data[idx + 3] = Math.round(Math.min(255, Math.pow(density, 0.85) * 250));
      } else {
        // Dark midnight smoke abyss
        data[idx] = Math.round(4 + density * 18);
        data[idx + 1] = Math.round(6 + density * 22);
        data[idx + 2] = Math.round(10 + density * 30);
        data[idx + 3] = Math.round(Math.min(255, 120 + density * 135));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  textureCache.set(cacheKey, canvas);
  return canvas;
}

