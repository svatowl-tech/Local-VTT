const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const { execSync } = require('child_process');

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function d20Pixel(x, y, width, height) {
  const nx = (x / width - 0.5) * 2;
  const ny = (y / height - 0.5) * 2;
  const r = Math.hypot(nx, ny);

  if (r > 0.95) return [0, 0, 0, 0];

  const bgGradient = Math.max(0, 1 - r * 0.8);
  let bgR = Math.round(15 + bgGradient * 15);
  let bgG = Math.round(23 + bgGradient * 20);
  let bgB = Math.round(42 + bgGradient * 30);

  if (r > 0.88) {
    const ringDist = Math.abs(r - 0.91);
    if (ringDist < 0.03) {
      const alpha = 1 - ringDist / 0.03;
      return [
        Math.round(bgR * (1 - alpha) + 245 * alpha),
        Math.round(bgG * (1 - alpha) + 158 * alpha),
        Math.round(bgB * (1 - alpha) + 11 * alpha),
        255
      ];
    }
  }

  const d20R = 0.65;
  const outerVerts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i * 60 - 30) * Math.PI / 180;
    outerVerts.push([d20R * Math.cos(angle), d20R * Math.sin(angle)]);
  }

  const innerVerts = [];
  for (let i = 0; i < 3; i++) {
    const angle = (i * 120 + 90) * Math.PI / 180;
    innerVerts.push([0.32 * Math.cos(angle), 0.32 * Math.sin(angle)]);
  }

  const isInsideD20 = pointInPoly(nx, ny, outerVerts);

  if (isInsideD20) {
    const isCentral = pointInPoly(nx, ny, innerVerts);
    let facetR = 220, facetG = 38, facetB = 38;

    if (isCentral) {
      facetR = 239; facetG = 68; facetB = 68;
    } else {
      const shade = (ny + 0.6) / 1.2;
      facetR = Math.round(180 - shade * 60);
      facetG = Math.round(28 - shade * 15);
      facetB = Math.round(28 - shade * 15);
    }

    const edges = [
      ...outerVerts.map((v, i) => [v, outerVerts[(i + 1) % 6]]),
      ...innerVerts.map((v, i) => [v, innerVerts[(i + 1) % 3]]),
      [outerVerts[0], innerVerts[0]],
      [outerVerts[1], innerVerts[0]],
      [outerVerts[2], innerVerts[1]],
      [outerVerts[3], innerVerts[1]],
      [outerVerts[4], innerVerts[2]],
      [outerVerts[5], innerVerts[2]],
    ];

    let minDist = 999;
    for (const [v1, v2] of edges) {
      const d = distToSegment(nx, ny, v1[0], v1[1], v2[0], v2[1]);
      if (d < minDist) minDist = d;
    }

    const lineThickness = 0.022;
    if (minDist < lineThickness) {
      const lineAlpha = Math.max(0, 1 - minDist / lineThickness);
      facetR = Math.round(facetR * (1 - lineAlpha) + 245 * lineAlpha);
      facetG = Math.round(facetG * (1 - lineAlpha) + 158 * lineAlpha);
      facetB = Math.round(facetB * (1 - lineAlpha) + 11 * lineAlpha);
    }

    return [facetR, facetG, facetB, 255];
  }

  return [bgR, bgG, bgB, 255];
}

function createPngBuffer(width, height, pixelFn) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = a;
    }
  }
  return PNG.sync.write(png);
}

function generateAllIcons() {
  const rootDir = path.join(__dirname, '..');
  const iconDir = path.join(rootDir, 'src-tauri', 'icons');
  const publicDir = path.join(rootDir, 'public');

  if (!fs.existsSync(iconDir)) {
    fs.mkdirSync(iconDir, { recursive: true });
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  console.log('Generating valid PNG master icon (1024x1024)...');
  const masterPngBuffer = createPngBuffer(1024, 1024, d20Pixel);
  const masterPath = path.join(rootDir, 'app-icon.png');
  fs.writeFileSync(masterPath, masterPngBuffer);
  console.log('Created valid app-icon.png (1024x1024)');

  fs.writeFileSync(path.join(publicDir, 'app-icon.png'), masterPngBuffer);
  console.log('Generating public/favicon.png (512x512)...');
  const faviconBuffer = createPngBuffer(512, 512, d20Pixel);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), faviconBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconBuffer);

  console.log('Generating desktop icons for src-tauri/icons/...');
  const tauriIcons = [
    { name: '32x32.png', size: 32 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
    { name: 'icon.png', size: 512 },
    { name: 'Square30x30Logo.png', size: 30 },
    { name: 'Square44x44Logo.png', size: 44 },
    { name: 'Square71x71Logo.png', size: 71 },
    { name: 'Square89x89Logo.png', size: 89 },
    { name: 'Square107x107Logo.png', size: 107 },
    { name: 'Square142x142Logo.png', size: 142 },
    { name: 'Square150x150Logo.png', size: 150 },
    { name: 'Square284x284Logo.png', size: 284 },
    { name: 'Square310x310Logo.png', size: 310 },
    { name: 'StoreLogo.png', size: 50 },
  ];

  for (const iconSpec of tauriIcons) {
    const buf = createPngBuffer(iconSpec.size, iconSpec.size, d20Pixel);
    fs.writeFileSync(path.join(iconDir, iconSpec.name), buf);
  }
  console.log('Generated all Tauri icon PNGs in src-tauri/icons/');

  const tauriConfPath = path.join(rootDir, 'src-tauri', 'tauri.conf.json');
  if (fs.existsSync(tauriConfPath)) {
    try {
      console.log('Running tauri icon CLI...');
      try {
        execSync('npx @tauri-apps/cli icon app-icon.png', { cwd: rootDir, stdio: 'inherit' });
      } catch {
        execSync('npx tauri icon app-icon.png', { cwd: rootDir, stdio: 'inherit' });
      }
      console.log('Tauri icon CLI completed successfully!');
    } catch (err) {
      console.log('Tauri icon generator notice:', err.message || err);
    }
  } else {
    console.log('src-tauri/tauri.conf.json not detected. Direct PNG icons generated successfully!');
  }
}

generateAllIcons();
