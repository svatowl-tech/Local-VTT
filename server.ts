import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

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
import { taggingEngine } from './server/taggingEngine';
import { CATEGORY_DEFINITIONS, ALL_REGEX_RULES } from './server/regexTagDictionary';
import { TextTagExtractor } from './server/textTagExtractor';
import { systemDirectoryEngine } from './server/systemDirectoryEngine';
import { universalParserEngine } from './server/parsers/universalParserEngine';
import { loreParserEngine } from './server/parsers/loreParserEngine';
import { loreDirectoryEngine } from './server/loreDirectoryEngine';
import { campaignDirectoryEngine } from './server/campaignDirectoryEngine';
import { streamFileWithRangeSupport } from './server/mediaStreamer';
import { cullItemsInFrustum, SpatialItem } from './server/spatialEngine';
import { evaluateRoll, simulateDistribution } from './server/diceEngine';
import { computeDynamicLighting } from './server/lightingEngine';
import { calculateOptimalGrid } from './server/gridEngine';
import { calculateElementalClashes, smoothElementalTrail } from './server/elementalEngine';
import { generateNPC } from './server/npcEngine';
import { generateTreasure } from './server/treasureEngine';
import { generateLoot, generateMerchantShop } from './server/lootShopEngine';
import { generateTravelingMerchant } from './server/travelingMerchantEngine';
import { generateStationaryShop } from './server/stationaryShopEngine';
import { generateEquipment } from './server/equipmentGeneratorEngine';
import { generateMagicItem } from './server/magicItemsEngine';
import { polzaEngine, POLZA_AVAILABLE_MODELS } from './server/polzaEngine';
import { polzaJsonEngine, POLZA_TEXT_MODELS } from './server/polzaJsonEngine';

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

  // --- API ROUTES (BACKEND HEAVY COMPUTATIONS & PROCEDURAL GENERATORS) ---

  app.get('/api/npc/generate', (req, res) => {
    try {
      const {
        race = 'human',
        classType = 'fighter',
        gender = 'male',
        level = '1',
        profession = 'random',
        socialStatus = 'middle',
        ageGroup = 'adult',
        attitude = 'neutral'
      } = req.query;
      const result = generateNPC({
        race: String(race),
        classType: String(classType),
        gender: String(gender),
        level: parseInt(String(level), 10) || 1,
        profession: String(profession),
        socialStatus: String(socialStatus),
        ageGroup: String(ageGroup),
        attitude: String(attitude)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("NPC Generation Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/treasure/generate', (req, res) => {
    try {
      const {
        level = '1',
        theme = 'classic',
        container = 'chest_iron',
        magicFocus = 'balanced',
        trapOrHazard = 'none'
      } = req.query;
      const parsedLevel = parseInt(String(level), 10);
      const safeLevel = (isNaN(parsedLevel) || parsedLevel < 1) ? 1 : Math.min(parsedLevel, 30);
      
      const result = generateTreasure({
        level: safeLevel,
        theme: String(theme),
        container: String(container),
        magicFocus: String(magicFocus),
        trapOrHazard: String(trapOrHazard)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Treasure Generation Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/loot/generate', (req, res) => {
    try {
      const {
        type = 'humanoid',
        tier = 'low',
        richness = 'standard',
        condition = 'any'
      } = req.query;
      const result = generateLoot({
        type: String(type),
        tier: String(tier),
        richness: String(richness),
        condition: String(condition)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Loot Generation Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/merchant/generate', (req, res) => {
    try {
      const { shopType = 'general', archetype = 'peddler' } = req.query;
      const result = generateTravelingMerchant({ archetype: String(archetype || shopType) });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Merchant Generation Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/traveling-merchant/generate', (req, res) => {
    try {
      const { archetype = 'random', region = 'random', itemCount = 'random', priceTier = 'random', attitude = 'random', race = 'random' } = req.query;
      const result = generateTravelingMerchant({
        archetype: String(archetype),
        region: String(region),
        itemCount: String(itemCount),
        priceTier: String(priceTier),
        attitude: String(attitude),
        race: String(race)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Traveling Merchant Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/stationary-shop/generate', (req, res) => {
    try {
      const { shopType = 'random', wealthTier = 'modest', district = 'random', inventorySize = 'random', qualityTier = 'random', ownerTemper = 'random' } = req.query;
      const result = generateStationaryShop({
        shopType: String(shopType),
        wealthTier: String(wealthTier),
        district: String(district),
        inventorySize: String(inventorySize),
        qualityTier: String(qualityTier),
        ownerTemper: String(ownerTemper)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Stationary Shop Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/equipment/generate', (req, res) => {
    try {
      const { category = 'random', hasProperties = 'random', quality = 'random', material = 'random', originStyle = 'random', priceBudget = 'random', propertyType = 'random' } = req.query;
      const result = generateEquipment({
        category: String(category),
        hasProperties: String(hasProperties),
        quality: String(quality),
        material: String(material),
        originStyle: String(originStyle),
        priceBudget: String(priceBudget),
        propertyType: String(propertyType)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Equipment Generation Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });

  app.get('/api/magic-item/generate', (req, res) => {
    try {
      const { school = 'random', itemType = 'random', rarity = 'random', attunementFilter = 'random', chargesStyle = 'random', hasQuirk = 'random' } = req.query;
      const result = generateMagicItem({
        school: String(school),
        itemType: String(itemType),
        rarity: String(rarity),
        attunementFilter: String(attunementFilter),
        chargesStyle: String(chargesStyle),
        hasQuirk: String(hasQuirk)
      });
      res.json({ success: true, text: result.text, raw: result.raw });
    } catch (err) {
      console.error("Magic Item Generation Error:", err);
      res.status(500).json({ success: false, error: String(err) });
    }
  });
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
    const scan = assetDirectoryEngine.scanDisk(true);
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

  // --- ASSET TAGGING & INVERTED INDEX FAST SEARCH ROUTES ---

  // Get full tag dictionary metadata and regular expression rules
  app.get('/api/assets/tag-dictionary', (req, res) => {
    try {
      res.json({
        success: true,
        categories: CATEGORY_DEFINITIONS,
        totalRules: ALL_REGEX_RULES.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Get all unique tags and tag distribution across categories
  app.get('/api/assets/tags', (req, res) => {
    try {
      // Ensure disk is scanned and indexed
      assetDirectoryEngine.scanDisk();
      const summary = taggingEngine.getTagSummary();
      res.json({
        success: true,
        ...summary,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // High-speed inverted index search with multi-tag filtering
  app.get('/api/assets/search', (req, res) => {
    try {
      // Ensure disk is scanned and indexed
      assetDirectoryEngine.scanDisk();

      const {
        q = '',
        query = '',
        tags,
        category = 'all',
        section,
        mode = 'and',
        matchMode = 'and',
        limit = '100',
        offset = '0',
      } = req.query;

      const rawTags = tags
        ? (Array.isArray(tags) ? tags : String(tags).split(',')).map(t => String(t).trim()).filter(Boolean)
        : [];

      const searchQuery = String(q || query || '').trim();
      const parsedLimit = Math.max(1, Math.min(parseInt(String(limit), 10) || 100, 1000));
      const parsedOffset = Math.max(0, parseInt(String(offset), 10) || 0);
      const safeMatchMode = (mode === 'or' || matchMode === 'or') ? 'or' : 'and';

      const searchResult = taggingEngine.search({
        query: searchQuery,
        tags: rawTags,
        category: category as any,
        section: section ? String(section) : undefined,
        matchMode: safeMatchMode,
        limit: parsedLimit,
        offset: parsedOffset,
      });

      res.json({
        success: true,
        ...searchResult,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // Extract tags from raw text, rules markdown, or json statblock
  app.post('/api/assets/extract-tags', (req, res) => {
    try {
      const { text, filename = 'document.txt', section = 'other' } = req.body;
      if (!text || typeof text !== 'string') {
        res.status(400).json({ success: false, error: 'Text content is required' });
        return;
      }

      const result = taggingEngine.autoTag(String(filename), '', String(section), undefined, text);
      res.json({
        success: true,
        tags: result.tags,
        primaryCategory: result.primaryCategory,
        metadata: result.metadata,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || String(err) });
    }
  });

  // --- TTRPG SYSTEMS RULES & CONTENT ENGINE ROUTES ---

  // Get all detected RPG systems with metadata & category counts
  app.get('/api/systems', (req, res) => {
    try {
      const scan = systemDirectoryEngine.scanSystems();
      const session = getSessionState();
      res.json({
        success: true,
        ...scan,
        activeSystemId: session.activeSystemId || scan.activeSystemId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to scan systems' });
    }
  });

  // Get active system details and its categorized items
  app.get('/api/systems/active', (req, res) => {
    try {
      const session = getSessionState();
      const activeId = session.activeSystemId || systemDirectoryEngine.getActiveSystemId();
      const scan = systemDirectoryEngine.scanSystems();
      const activeSystem = scan.systems.find((s) => s.id === activeId) || scan.systems[0];
      const items = activeSystem ? systemDirectoryEngine.getSystemCategoryItems(activeSystem.id) : [];
      res.json({
        success: true,
        activeSystem,
        items,
        totalItems: items.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get active system' });
    }
  });

  // Set active system in session and engine
  app.post('/api/systems/active', (req, res) => {
    try {
      const { systemId } = req.body;
      if (!systemId || typeof systemId !== 'string') {
        res.status(400).json({ error: 'Missing or invalid systemId' });
        return;
      }
      systemDirectoryEngine.setActiveSystemId(systemId);
      updateSessionState({ activeSystemId: systemId });
      const scan = systemDirectoryEngine.scanSystems();
      const activeSystem = scan.systems.find((s) => s.id === systemId);
      const items = activeSystem ? systemDirectoryEngine.getSystemCategoryItems(systemId) : [];
      res.json({
        success: true,
        activeSystemId: systemId,
        activeSystem,
        items,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to set active system' });
    }
  });

  // --- WORLD LORE DISK & PARSER ENDPOINTS ---
  app.get('/api/lore/list', async (req, res) => {
    try {
      const worldId = (req.query.worldId as string) || 'dnd5e_faerun';
      const query = (req.query.query as string) || '';
      const category = (req.query.category as string) || 'all';
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 50;

      const result = await loreDirectoryEngine.searchAndPaginateLore(worldId, query, category, page, limit);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list lore' });
    }
  });

  app.get('/api/lore/scan', async (req, res) => {
    try {
      const worldId = (req.query.worldId as string) || 'dnd5e_faerun';
      const forceReparse = req.query.forceReparse === 'true';
      const result = await loreDirectoryEngine.scanLoreDirectoryIncremental(worldId, forceReparse);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to scan lore directory' });
    }
  });

  app.post('/api/lore/reparse', async (req, res) => {
    try {
      const { worldId } = req.body;
      if (!worldId) {
        res.status(400).json({ error: 'Missing worldId parameter' });
        return;
      }
      const result = await loreDirectoryEngine.scanLoreDirectoryIncremental(worldId, true);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reparse lore directory' });
    }
  });

  app.post('/api/lore/save', (req, res) => {
    try {
      const { worldId, item } = req.body;
      if (!worldId || !item) {
        res.status(400).json({ error: 'Missing worldId or item' });
        return;
      }
      const result = loreDirectoryEngine.saveLoreItemToDisk(worldId, item);
      res.json({ success: result.success, filePath: result.filePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save lore item' });
    }
  });

  // --- CAMPAIGN DISK STORAGE & AI GENERATOR ENDPOINTS ---
  app.get('/api/campaigns/list', (req, res) => {
    try {
      const list = campaignDirectoryEngine.listCampaigns();
      res.json({ success: true, campaigns: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list campaigns' });
    }
  });

  app.get('/api/campaigns/load', (req, res) => {
    try {
      const id = (req.query.id as string) || 'active_campaign';
      let campaign = campaignDirectoryEngine.loadCampaign(id);
      if (!campaign && id !== 'active_campaign') {
        campaign = campaignDirectoryEngine.loadCampaign('active_campaign');
      }
      res.json({ success: true, campaign });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to load campaign' });
    }
  });

  app.post('/api/campaigns/save', (req, res) => {
    try {
      const { campaign } = req.body;
      if (!campaign) {
        res.status(400).json({ error: 'Missing campaign data in request body' });
        return;
      }
      const result = campaignDirectoryEngine.saveCampaign(campaign);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save campaign to disk' });
    }
  });

  app.post('/api/campaigns/delete', (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        res.status(400).json({ error: 'Missing campaign id' });
        return;
      }
      const success = campaignDirectoryEngine.deleteCampaign(id);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete campaign' });
    }
  });

  app.post('/api/campaigns/generate-ai', async (req, res) => {
    try {
      const specs = req.body || {};
      const result = await campaignDirectoryEngine.generateCampaignWithAi(specs);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to generate campaign' });
    }
  });

  // --- POLZA.AI IMAGE GENERATION & ART ENGINE ROUTES ---
  app.get('/api/polza/text-models', (req, res) => {
    try {
      const hasEnvKey = Boolean(process.env.POLZA_AI_API_KEY && process.env.POLZA_AI_API_KEY.trim().length > 0);
      res.json({
        success: true,
        models: POLZA_TEXT_MODELS,
        defaultModel: 'deepseek/deepseek-r1-distill-llama-70b',
        hasEnvKey,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch Polza text models' });
    }
  });

  app.post('/api/polza/generate-json', async (req, res) => {
    try {
      const result = await polzaJsonEngine.generateStructuredEntity(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Polza JSON generation failed' });
    }
  });

  app.get('/api/polza/models', (req, res) => {
    try {
      const hasEnvKey = Boolean(process.env.POLZA_AI_API_KEY && process.env.POLZA_AI_API_KEY.trim().length > 0);
      res.json({
        success: true,
        models: POLZA_AVAILABLE_MODELS,
        defaultModel: 'tongyi-mai/z-image',
        hasEnvKey,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch Polza models' });
    }
  });

  app.post('/api/polza/prompt', (req, res) => {
    try {
      const { entity, stylePreset, customInstructions } = req.body;
      if (!entity || typeof entity !== 'object') {
        res.status(400).json({ success: false, error: 'Entity context is required' });
        return;
      }
      const prompt = polzaEngine.buildPrompt(entity, stylePreset || 'dnd_cinematic', customInstructions);
      const optimalSize = polzaEngine.getOptimalSizeForEntity(entity.type);
      res.json({
        success: true,
        prompt,
        optimalSize,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to build prompt' });
    }
  });

  app.post('/api/polza/generate', async (req, res) => {
    try {
      const result = await polzaEngine.generateImage(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Polza generation failed' });
    }
  });

  app.get('/api/polza/status/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const customApiKey = req.query.customApiKey as string | undefined;
      const result = await polzaEngine.checkMediaStatus(id, customApiKey);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to check media status' });
    }
  });

  app.post('/api/polza/save-image', async (req, res) => {
    try {
      const { imageUrl, b64, name } = req.body;
      let result = null;
      if (imageUrl) {
        result = await polzaEngine.saveRemoteImageToDisk(imageUrl, name || 'art');
      } else if (b64) {
        result = await polzaEngine.saveBase64ImageToDisk(b64, name || 'art');
      }

      if (result) {
        res.json({ success: true, ...result });
      } else {
        res.status(400).json({ success: false, error: 'Failed to save image to disk' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to save image' });
    }
  });

  
  app.post('/api/fs/write', (req, res) => {
    try {
      const { rootPath, subPath, fileName, data } = req.body;
      if (!subPath || !fileName || !data) {
        res.status(400).json({ error: 'Missing subPath, fileName, or data' });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      
      // Default to process.cwd()/assets if rootPath is not provided or not absolute
      let basePath = path.join(process.cwd(), 'assets');
      if (rootPath && path.isAbsolute(rootPath)) {
        basePath = rootPath;
      }

      let currentDir = basePath;
      if (Array.isArray(subPath)) {
        for (const folder of subPath) {
          currentDir = path.join(currentDir, folder);
        }
      } else {
        currentDir = path.join(currentDir, subPath);
      }
      
      if (!fs.existsSync(currentDir)) {
        fs.mkdirSync(currentDir, { recursive: true });
      }
      
      const filePath = path.join(currentDir, fileName);
      const resolvedFilePath = path.resolve(filePath);
      const resolvedBasePath = path.resolve(basePath);
      if (!resolvedFilePath.startsWith(resolvedBasePath)) {
        res.status(403).json({ error: 'Access denied: Path traversal outside base folder is forbidden' });
        return;
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      
      res.json({ success: true, filePath });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to write file' });
    }
  });

  
  app.post('/api/fs/delete', (req, res) => {
    try {
      const { rootPath, subPath, fileName } = req.body;
      if (!subPath || !fileName) {
        res.status(400).json({ error: 'Missing subPath or fileName' });
        return;
      }
      
      const fs = require('fs');
      const path = require('path');
      
      let basePath = path.join(process.cwd(), 'assets');
      if (rootPath && path.isAbsolute(rootPath)) {
        basePath = rootPath;
      }

      let currentDir = basePath;
      if (Array.isArray(subPath)) {
        for (const folder of subPath) {
          currentDir = path.join(currentDir, folder);
        }
      } else {
        currentDir = path.join(currentDir, subPath);
      }
      
      const filePath = path.join(currentDir, fileName);
      const resolvedFilePath = path.resolve(filePath);
      const resolvedBasePath = path.resolve(basePath);
      if (!resolvedFilePath.startsWith(resolvedBasePath)) {
        res.status(403).json({ error: 'Access denied: Path traversal outside base folder is forbidden' });
        return;
      }

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete file' });
    }
  });

  app.post('/api/lore/delete', (req, res) => {
    try {
      const { worldId, itemId } = req.body;
      if (!worldId || !itemId) {
        res.status(400).json({ error: 'Missing worldId or itemId' });
        return;
      }
      const success = loreDirectoryEngine.deleteLoreItemFromDisk(worldId, itemId);
      res.json({ success });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete lore item' });
    }
  });
  app.get('/api/systems/:systemId/items', (req, res) => {
    try {
      const { systemId } = req.params;
      const category = req.query.category as string | undefined;
      const items = systemDirectoryEngine.getSystemCategoryItems(systemId, category);
      res.json({
        success: true,
        systemId,
        category: category || 'all',
        items,
        total: items.length,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get system items' });
    }
  });

  // Serve assets from systems folder (images, tokens, icons) safely with Range streaming support
  app.get('/api/systems/asset', (req, res) => {
    const assetPath = req.query.path as string;
    if (!assetPath) {
      res.status(400).send('Missing path parameter');
      return;
    }

    const fs = require('fs');
    const systemsRoot = systemDirectoryEngine.getSystemsRoot();
    const safePath = path.normalize(path.join(systemsRoot, assetPath));

    // Ensure safe path is within systemsRoot to prevent traversal attacks
    if (!safePath.startsWith(systemsRoot)) {
      res.status(403).send('Access Denied (Path traversal rejected)');
      return;
    }

    if (!fs.existsSync(safePath)) {
      res.status(404).send('System asset file not found');
      return;
    }

    try {
      streamFileWithRangeSupport(safePath, req, res);
    } catch (err: any) {
      res.status(500).send(`Streaming error: ${err.message || err}`);
    }
  });

  // Full-text Master Reference Search across systems (Rust TS Fallback endpoint)
  app.get('/api/systems/search', (req, res) => {
    try {
      const query = (req.query.q as string) || '';
      const systemId = req.query.systemId as string | undefined;
      const category = req.query.category as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 60;

      const result = systemDirectoryEngine.searchSystemReference({
        query,
        systemId,
        category,
        limit,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Reference search failed' });
    }
  });

  // Create a new custom system folder structure
  app.post('/api/systems/create', (req, res) => {
    try {
      const { name, categories } = req.body;
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'System name is required' });
        return;
      }
      const result = systemDirectoryEngine.createCustomSystem(name, Array.isArray(categories) ? categories : undefined);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create custom system' });
    }
  });

  // Universal Parser: Analyze and extract entities from uploaded files (JSON, PDF, Text, XML, YAML, CSV)
  app.post('/api/systems/parse', upload.single('file'), async (req, res) => {
    try {
      let filename = 'data.json';
      let rawBuffer: Buffer | undefined;
      let rawText: string | undefined;
      let parsedJson: any = undefined;
      let targetSystemId = (req.body?.targetSystemId as string) || systemDirectoryEngine.getActiveSystemId();
      let suggestedCategory = req.body?.suggestedCategory as string | undefined;

      if (req.file) {
        filename = req.file.originalname;
        rawBuffer = req.file.buffer;
        const ext = path.extname(filename).toLowerCase();
        if (['.json', '.txt', '.md', '.markdown', '.yaml', '.yml', '.xml', '.gcs', '.csv', '.tsv'].includes(ext)) {
          rawText = req.file.buffer.toString('utf8');
        }
      } else if (req.body) {
        if (req.body.filename) filename = req.body.filename;
        if (req.body.rawText) rawText = req.body.rawText;
        if (req.body.json) parsedJson = req.body.json;
        if (req.body.base64) {
          rawBuffer = Buffer.from(req.body.base64, 'base64');
        }
      }

      const parseResult = await universalParserEngine.parseInput({
        filename,
        rawBuffer,
        rawText,
        parsedJson,
        targetSystemId,
        suggestedCategory,
      });

      res.json(parseResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Parsing error' });
    }
  });

  // Dedicated Lore & Worlds Parser: PDF, ZIP, EPUB, Wiki, JSON, Text
  app.post('/api/systems/parse-lore', upload.single('file'), async (req, res) => {
    try {
      let filename = 'lore_doc.txt';
      let rawBuffer: Buffer | undefined;
      let rawText: string | undefined;
      let targetWorldId = (req.body?.targetWorldId as string) || 'dnd5e_faerun';
      let targetSystemId = (req.body?.targetSystemId as string) || 'dnd5e';

      if (req.file) {
        filename = req.file.originalname;
        rawBuffer = req.file.buffer;
        const ext = path.extname(filename).toLowerCase();
        if (['.txt', '.md', '.markdown', '.wiki', '.mediawiki', '.json', '.yaml', '.yml', '.csv', '.html', '.htm'].includes(ext)) {
          rawText = req.file.buffer.toString('utf8');
        }
      } else if (req.body) {
        if (req.body.filename) filename = req.body.filename;
        if (req.body.rawText) rawText = req.body.rawText;
        if (req.body.base64) {
          rawBuffer = Buffer.from(req.body.base64, 'base64');
        }
      }

      const parseResult = await loreParserEngine.parseLoreFile({
        filename,
        rawBuffer,
        rawText,
        targetWorldId,
        targetSystemId,
      });

      res.json(parseResult);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Lore parsing error' });
    }
  });

  // Import parsed entities directly into the specified system folder
  app.post('/api/systems/import-parsed', (req, res) => {
    try {
      const { systemId, entities } = req.body;
      const targetSystem = systemId || systemDirectoryEngine.getActiveSystemId();
      if (!Array.isArray(entities) || entities.length === 0) {
        res.status(400).json({ error: 'No entities provided for import' });
        return;
      }

      const systemsRoot = systemDirectoryEngine.getSystemsRoot();
      const importResult = universalParserEngine.importEntitiesToSystem(systemsRoot, targetSystem, entities);

      // Rescan systems on disk
      const updatedScan = systemDirectoryEngine.scanSystems();

      res.json({
        success: true,
        targetSystem,
        ...importResult,
        updatedScan,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to import entities' });
    }
  });

  // One-step: Upload, parse and auto-import into active system
  app.post('/api/systems/upload-and-import', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const filename = req.file.originalname;
      const rawBuffer = req.file.buffer;
      const targetSystemId = (req.body?.targetSystemId as string) || systemDirectoryEngine.getActiveSystemId();
      const suggestedCategory = req.body?.suggestedCategory as string | undefined;

      let rawText: string | undefined;
      const ext = path.extname(filename).toLowerCase();
      if (['.json', '.txt', '.md', '.markdown', '.yaml', '.yml', '.xml', '.gcs', '.csv', '.tsv'].includes(ext)) {
        rawText = req.file.buffer.toString('utf8');
      }

      const parseResult = await universalParserEngine.parseInput({
        filename,
        rawBuffer,
        rawText,
        targetSystemId,
        suggestedCategory,
      });

      if (!parseResult.success || parseResult.entities.length === 0) {
        res.status(400).json({
          error: 'Не удалось извлечь сущности из файла',
          parseResult,
        });
        return;
      }

      const systemsRoot = systemDirectoryEngine.getSystemsRoot();
      const importResult = universalParserEngine.importEntitiesToSystem(systemsRoot, targetSystemId, parseResult.entities);
      const updatedScan = systemDirectoryEngine.scanSystems();

      res.json({
        success: true,
        sourceFormat: parseResult.sourceFormat,
        formatDescription: parseResult.formatDescription,
        totalEntities: parseResult.totalEntitiesFound,
        importedCount: importResult.importedCount,
        savedFiles: importResult.savedFiles,
        updatedScan,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upload and import' });
    }
  });

  // Safely read/stream a specific system file
  app.get('/api/systems/file/*', (req, res) => {
    const relPath = req.params[0];
    const safePath = systemDirectoryEngine.resolveSafeSystemFilePath(relPath);
    if (!safePath) {
      res.status(404).send('System file not found or path traversal rejected');
      return;
    }
    try {
      streamFileWithRangeSupport(safePath, req, res);
    } catch (err: any) {
      res.status(500).send(`Streaming error: ${err.message || err}`);
    }
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
