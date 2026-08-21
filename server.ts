import express from 'express';
import compression from 'compression';
import path from 'path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { parseUploadedMedia, getMediaBuffer } from './server/mediaEngine';
import { calculateCameraViewport, setCameraAspectRatio } from './server/cameraEngine';
import { addFogBrushPoint, resetFogOfWar } from './server/fogEngine';
import { computeStateChecksum, generateSessionToken, verifySessionToken } from './server/cryptoEngine';
import { RUST_ARCHITECTURE_FILES } from './server/rustArchExporter';
import {
  getSessionState,
  updateSessionState,
  updateCameraState,
  updateFogState,
  updateGridState,
  updatePlayerBlackoutState,
  addDrawingStroke,
  clearDrawings,
  addSpellTemplate,
  updateSpellTemplate,
  removeSpellTemplate,
  addAnimatedEffect,
  removeAnimatedEffect,
  updateLaserPointer,
  getInitiativeState,
  updateInitiativeState,
  updateLayersConfigState,
} from './server/syncState';
import { simplifyPoints, calculateSpellAreaMetrics } from './server/drawingEngine';
import { assetDirectoryEngine } from './server/assetDirectoryEngine';
import { streamFileWithRangeSupport } from './server/mediaStreamer';
import { cullItemsInFrustum, SpatialItem } from './server/spatialEngine';
import { evaluateRoll, simulateDistribution } from './server/diceEngine';
import { computeDynamicLighting } from './server/lightingEngine';
import { calculateOptimalGrid } from './server/gridEngine';
import { calculateElementalClashes, smoothElementalTrail } from './server/elementalEngine';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max file size for high-res video maps
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(compression());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API ROUTES (BACKEND HEAVY COMPUTATIONS) ---

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      engine: 'AetherMap Rust Engine Simulator',
      timestamp: Date.now(),
    });
  });

  // Session State Endpoint
  app.get('/api/session', (req, res) => {
    const session = getSessionState();
    const checksum = computeStateChecksum(session);
    res.json({ ...session, checksum });
  });

  // Update Full Session
  app.post('/api/session/update', (req, res) => {
    const updated = updateSessionState(req.body);
    res.json({ success: true, session: updated });
  });

  // Camera Spatial Calculations
  app.post('/api/camera/transform', (req, res) => {
    const { camera, screenWidth, screenHeight } = req.body;
    const currentCamera = camera || getSessionState().camera;
    const matrix = calculateCameraViewport(currentCamera, screenWidth || 1920, screenHeight || 1080);
    res.json({ success: true, transformMatrix: matrix });
  });

  app.post('/api/camera/aspect-ratio', (req, res) => {
    const { aspectRatio } = req.body;
    const session = getSessionState();
    const newCamera = setCameraAspectRatio(session.camera, parseFloat(aspectRatio));
    updateCameraState(newCamera);
    res.json({ success: true, camera: newCamera });
  });

  // Fog of War Heavy Calculations
  app.post('/api/fog/brush', (req, res) => {
    const { point } = req.body;
    const session = getSessionState();
    const updatedFog = addFogBrushPoint(session.fog, point);
    updateFogState(updatedFog);
    res.json({ success: true, fog: updatedFog });
  });

  app.post('/api/fog/reset', (req, res) => {
    const { fillWithFog, opacity } = req.body;
    const session = getSessionState();
    const updatedFog = resetFogOfWar(session.fog, fillWithFog !== false);
    if (opacity !== undefined) updatedFog.opacity = opacity;
    updateFogState(updatedFog);
    res.json({ success: true, fog: updatedFog });
  });

  // Grid Configuration Update
  app.post('/api/grid/update', (req, res) => {
    const updated = updateGridState(req.body);
    res.json({ success: true, grid: updated.grid });
  });

  // Player Screen Blackout / Master Preparation Screen Curtain
  app.post('/api/blackout/update', (req, res) => {
    const updated = updatePlayerBlackoutState(req.body);
    res.json({ success: true, playerBlackout: updated.playerBlackout });
  });

  // Tabletop Layers Configuration
  app.post('/api/layers/update', (req, res) => {
    const updated = updateLayersConfigState(req.body);
    res.json({ success: true, layersConfig: updated.layersConfig });
  });

  // Initiative State Endpoints (Encounter, Turn Order, Health)
  app.get('/api/initiative/state', (req, res) => {
    const state = getInitiativeState();
    res.json({ success: true, ...state });
  });

  app.post('/api/initiative/update', (req, res) => {
    const updated = updateInitiativeState(req.body);
    res.json({ success: true, ...updated });
  });

  // Canvas Drawing Endpoints (with Douglas-Peucker point simplification)
  app.post('/api/drawings/stroke', (req, res) => {
    const rawStroke = req.body;
    if (rawStroke && Array.isArray(rawStroke.points)) {
      const simplifiedPoints = simplifyPoints(rawStroke.points, 1.5);
      const stroke = {
        ...rawStroke,
        points: simplifiedPoints,
      };
      const updated = addDrawingStroke(stroke);
      res.json({ success: true, drawings: updated.drawings });
    } else {
      res.status(400).json({ error: 'Invalid stroke format' });
    }
  });

  app.post('/api/drawings/clear', (req, res) => {
    const updated = clearDrawings();
    res.json({ success: true, drawings: updated.drawings });
  });

  // Spell Template Endpoints (with D&D 5e area metric calculation)
  app.post('/api/spells/add', (req, res) => {
    const rawTemplate = req.body;
    const session = getSessionState();
    const gridPixelSize = session.grid.size || 50;
    const metrics = calculateSpellAreaMetrics(rawTemplate.type, rawTemplate.radius, gridPixelSize);
    
    const template = {
      ...rawTemplate,
      id: rawTemplate.id || `spell-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      label: rawTemplate.label || metrics.label,
      createdAt: Date.now(),
    };

    const updated = addSpellTemplate(template);
    res.json({ success: true, spellTemplates: updated.spellTemplates, template, metrics });
  });

  app.post('/api/spells/update', (req, res) => {
    const { id, ...partial } = req.body;
    if (!id) {
      res.status(400).json({ error: 'Missing spell template id' });
      return;
    }
    const updated = updateSpellTemplate(id, partial);
    res.json({ success: true, spellTemplates: updated.spellTemplates });
  });

  app.post('/api/spells/remove', (req, res) => {
    const { id } = req.body;
    const updated = removeSpellTemplate(id);
    res.json({ success: true, spellTemplates: updated.spellTemplates });
  });

  // Animated Effects Endpoints (Fire, Water, etc.)
  app.post('/api/effects/clashes', (req, res) => {
    const { fireNodes, waterNodes } = req.body;
    if (!Array.isArray(fireNodes) || !Array.isArray(waterNodes)) {
      res.status(400).json({ error: 'fireNodes and waterNodes must be arrays' });
      return;
    }
    const clash = calculateElementalClashes(fireNodes, waterNodes);
    res.json({ success: true, ...clash });
  });

  app.post('/api/effects/smooth-trail', (req, res) => {
    const { nodes, subdivisions } = req.body;
    if (!Array.isArray(nodes)) {
      res.status(400).json({ error: 'nodes must be an array' });
      return;
    }
    const smoothed = smoothElementalTrail(nodes, subdivisions ? Number(subdivisions) : 4);
    res.json({ success: true, nodes: smoothed });
  });

  app.post('/api/effects/add', (req, res) => {
    const rawEffect = req.body;
    const effect = {
      ...rawEffect,
      id: rawEffect.id || `effect-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
    };
    const updated = addAnimatedEffect(effect);
    res.json({ success: true, animatedEffects: updated.animatedEffects, effect });
  });

  app.post('/api/effects/remove', (req, res) => {
    const { id } = req.body;
    const updated = removeAnimatedEffect(id);
    res.json({ success: true, animatedEffects: updated.animatedEffects });
  });

  // Real-time Laser Pointer Sync
  app.post('/api/laser/point', (req, res) => {
    const { laser } = req.body;
    const updated = updateLaserPointer(laser);
    res.json({ success: true, laserPointer: updated.laserPointer });
  });

  // Spatial Frustum Culling Engine (Fast Broadphase Collision & Viewport Query)
  app.post('/api/spatial/culling', (req, res) => {
    const { items, viewX, viewY, viewW, viewH, cellSize } = req.body;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Items must be an array of spatial items' });
      return;
    }
    const result = cullItemsInFrustum(
      items,
      Number(viewX) || 0,
      Number(viewY) || 0,
      Number(viewW) || 1920,
      Number(viewH) || 1080,
      Number(cellSize) || 128
    );
    res.json({ success: true, ...result });
  });

  // Tabletop Dice Engine (AST Parser & Roll Evaluator)
  app.post('/api/dice/roll', (req, res) => {
    const { expression, modifier } = req.body;
    if (!expression || typeof expression !== 'string') {
      res.status(400).json({ error: 'Missing or invalid dice expression' });
      return;
    }
    const rollResult = evaluateRoll(expression, Number(modifier) || 0);
    res.json({ success: true, roll: rollResult });
  });

  // High-Speed Monte Carlo Dice Distribution Simulator
  app.post('/api/dice/simulate', (req, res) => {
    const { expression, iterations } = req.body;
    if (!expression || typeof expression !== 'string') {
      res.status(400).json({ error: 'Missing or invalid dice expression' });
      return;
    }
    const distribution = simulateDistribution(expression, Number(iterations) || 25000);
    res.json({ success: true, distribution });
  });

  // Dynamic Lighting & 2D Shadow Volumes
  app.post('/api/lighting/calculate', (req, res) => {
    const { lights, walls, numRays } = req.body;
    if (!Array.isArray(lights) || !Array.isArray(walls)) {
      res.status(400).json({ error: 'Lights and walls must be arrays' });
      return;
    }
    const volumes = computeDynamicLighting(lights, walls, Number(numRays) || 120);
    res.json({ success: true, volumes });
  });

  // Grid Alignment Auto-Detection
  app.post('/api/grid/detect', (req, res) => {
    const { imageWidth, imageHeight, preferredCellSize } = req.body;
    if (!imageWidth || !imageHeight) {
      res.status(400).json({ error: 'Missing imageWidth or imageHeight' });
      return;
    }
    const result = calculateOptimalGrid(
      Number(imageWidth),
      Number(imageHeight),
      preferredCellSize ? Number(preferredCellSize) : undefined
    );
    res.json({ success: true, grid: result });
  });

  // Serve uploaded media buffers directly to any window/webview
  app.get('/api/media/:id', (req, res) => {
    const item = getMediaBuffer(req.params.id);
    if (item) {
      res.setHeader('Content-Type', item.mimeType);
      res.setHeader('Content-Length', item.buffer.length);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(item.buffer);
    } else {
      res.status(404).send('Media item not found');
    }
  });

  // Media Parsing & Upload Endpoint (Heavy file parsing & SHA256 checksum)
  app.post('/api/map/parse', upload.single('mapFile'), (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No map file provided' });
        return;
      }

      const parsed = parseUploadedMedia(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      res.json({ success: true, parsedMedia: parsed });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to parse media file' });
    }
  });

  // Add parsed or preset map to active session workspace
  app.post('/api/map/add', (req, res) => {
    const newMap = req.body;
    const session = getSessionState();
    const exists = session.maps.some((m) => m.id === newMap.id);

    let updatedMaps = session.maps;
    if (!exists) {
      updatedMaps = [...session.maps, newMap];
    } else {
      updatedMaps = session.maps.map((m) => (m.id === newMap.id ? newMap : m));
    }

    updateSessionState({
      maps: updatedMaps,
      activeMapId: newMap.id,
    });

    res.json({ success: true, maps: updatedMaps });
  });

  // Remove map from workspace
  app.post('/api/map/remove', (req, res) => {
    const { mapId } = req.body;
    const session = getSessionState();
    const updatedMaps = session.maps.filter((m) => m.id !== mapId);
    
    updateSessionState({
      maps: updatedMaps,
      activeMapId: session.activeMapId === mapId ? (updatedMaps[0]?.id || null) : session.activeMapId,
    });

    res.json({ success: true, maps: updatedMaps });
  });

  // Crypto Security Verification & Token creation
  app.post('/api/crypto/verify-token', (req, res) => {
    const { token } = req.body;
    const isValid = verifySessionToken(token);
    res.json({ valid: isValid });
  });

  // Export Rust Desktop Architecture Files
  app.get('/api/rust/architecture', (req, res) => {
    res.json({
      success: true,
      files: RUST_ARCHITECTURE_FILES,
      instructions: {
        macOS: '1. Install Rust (`curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh`)\n2. Install Node dependencies (`npm install`)\n3. Run Tauri dev (`npm run tauri dev`)\n4. Build macOS bundle (`npm run tauri build`)',
        windows: '1. Install Rust & Visual Studio C++ Build Tools\n2. Install Node dependencies (`npm install`)\n3. Run Tauri dev (`npm run tauri dev`)\n4. Build Windows installer (.msi / .exe) (`npm run tauri build`)',
      },
    });
  });

  // --- DISK ASSET ENGINE ROUTES (DIRECT DISK FOLDER READING & WATCHING) ---
  
  // Quick status / revision check (lightweight for polling & auto-sync)
  app.get('/api/assets/status', (req, res) => {
    const scan = assetDirectoryEngine.scanDisk();
    res.json({
      success: true,
      revision: scan.revision,
      timestamp: scan.timestamp,
      rootPath: scan.rootPath,
      stats: scan.stats,
    });
  });

  // Full disk scan of maps, props, music, sfx, effects, and sessions
  app.get('/api/assets/scan', (req, res) => {
    const scan = assetDirectoryEngine.scanDisk();
    res.json({
      success: true,
      ...scan,
    });
  });

  // Rescan trigger
  app.post('/api/assets/rescan', (req, res) => {
    const scan = assetDirectoryEngine.scanDisk();
    res.json({
      success: true,
      ...scan,
    });
  });

  // Serve media files directly from disk folders with Range streaming
  app.get('/api/assets/file/:section/*', (req, res) => {
    const section = req.params.section;
    const relPath = req.params[0];

    const safePath = assetDirectoryEngine.resolveSafeFilePath(section, relPath);
    if (!safePath) {
      res.status(404).send('Asset file not found on disk or path traversal rejected');
      return;
    }

    try {
      streamFileWithRangeSupport(safePath, req, res);
    } catch (err: any) {
      res.status(500).send(`Streaming error: ${err.message || err}`);
    }
  });

  // Save session directly to disk
  app.post('/api/assets/save-session', (req, res) => {
    try {
      const { session, filename } = req.body;
      const targetSession = session || getSessionState();
      const saved = assetDirectoryEngine.saveSessionSnapshot(targetSession, filename);
      res.json({ success: true, ...saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save session to disk' });
    }
  });

  // Get list of saved sessions on disk
  app.get('/api/assets/sessions', (req, res) => {
    const scan = assetDirectoryEngine.scanDisk();
    res.json({ success: true, sessions: scan.savedSessions });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ AetherMap Server & Rust Simulator running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
