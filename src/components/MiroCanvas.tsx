import React, { useRef, useState, useEffect, useCallback, memo } from 'react';
import {
  MapItem,
  CameraFrame,
  FogState,
  GridSettings,
  ActiveTool,
  FogPoint,
  DrawingStroke,
  DrawingPoint,
  SpellTemplate,
  AnimatedEffect,
  LaserPointer,
  ToolSettings,
  LayerStackConfig,
} from '../types';
import { MapCard } from './MapCard';
import { CameraFrameOverlay } from './CameraFrameOverlay';
import { GridCanvasRenderer } from './GridCanvasRenderer';
import { FogCanvasRenderer } from './FogCanvasRenderer';
import { DrawingCanvasLayer } from './DrawingCanvasLayer';
import { SpellTemplatesLayer } from './SpellTemplatesLayer';
import { AnimatedEffectsLayer } from './AnimatedEffectsLayer';
import { LaserPointerLayer } from './LaserPointerLayer';
import { ObjectContextMenu, ContextMenuPosition } from './ObjectContextMenu';
import { DraggableResizablePanel } from './DraggableResizablePanel';
import { calculateAngleDegrees, pixelsToFeet, feetToPixels } from '../utils/spellGeometry';
import { MapPin, Upload } from 'lucide-react';
import { tabletopMathEngine } from '../utils/tabletopMathEngine';
import {
  getLayerZIndex,
  getLayerOpacity,
  isLayerVisible,
  isLayerLocked,
  filterMapsByObjectLayer,
  getCustomLayers,
  mapObjectLayerToTabletopLayer,
} from '../utils/layerHierarchy';

interface Props {
  maps: MapItem[];
  activeMapId: string | null;
  camera: CameraFrame;
  fog: FogState;
  grid: GridSettings;
  activeTool: ActiveTool;
  drawings: DrawingStroke[];
  spellTemplates: SpellTemplate[];
  animatedEffects: AnimatedEffect[];
  laserPointer: LaserPointer | null;
  toolSettings: ToolSettings;
  layersConfig?: LayerStackConfig;
  onUpdateCamera: (camera: Partial<CameraFrame>) => void;
  onUpdateMaps: (maps: MapItem[]) => void;
  onSelectMap: (id: string) => void;
  onAddFogPoint: (point: FogPoint) => void;
  onAddDrawingStroke: (stroke: DrawingStroke) => void;
  onAddSpellTemplate: (template: SpellTemplate) => void;
  onUpdateSpellTemplate?: (id: string, partial: Partial<SpellTemplate>) => void;
  onRemoveSpellTemplate: (id: string) => void;
  onAddAnimatedEffect: (effect: AnimatedEffect) => void;
  onRemoveAnimatedEffect: (id: string) => void;
  onSyncLaserPointer: (laser: LaserPointer | null) => void;
  onOpenLayerSettings?: (mapItem: MapItem) => void;
  onQuickUpdateMapItem?: (mapId: string, partial: Partial<MapItem>) => void;
  onDuplicateMap?: (mapItem: MapItem) => void;
  onDeleteMap?: (mapId: string) => void;
  onOpenMapLibrary?: () => void;
  onOpenUploadModal?: () => void;
  onOpenSubmapTab?: (portalItem: MapItem) => void;
  onOpenInitiative?: () => void;
  fogBrushRadius: number;
}

export const MiroCanvas: React.FC<Props> = memo(({
  maps,
  activeMapId,
  camera,
  fog,
  grid,
  activeTool,
  drawings,
  spellTemplates,
  animatedEffects,
  laserPointer,
  toolSettings,
  layersConfig,
  onUpdateCamera,
  onUpdateMaps,
  onSelectMap,
  onAddFogPoint,
  onAddDrawingStroke,
  onAddSpellTemplate,
  onUpdateSpellTemplate,
  onRemoveSpellTemplate,
  onAddAnimatedEffect,
  onRemoveAnimatedEffect,
  onSyncLaserPointer,
  onOpenLayerSettings,
  onQuickUpdateMapItem,
  onDuplicateMap,
  onDeleteMap,
  onOpenMapLibrary,
  onOpenUploadModal,
  onOpenSubmapTab,
  onOpenInitiative,
  fogBrushRadius,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Object Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    item: MapItem;
    position: ContextMenuPosition;
  } | null>(null);

  const handleCardContextMenu = useCallback(
    (e: React.MouseEvent, mapItem: MapItem) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasRightClickDraggedRef.current) {
        hasRightClickDraggedRef.current = false;
        return;
      }
      onSelectMap(mapItem.id);
      setContextMenu({
        item: mapItem,
        position: { x: e.clientX, y: e.clientY },
      });
    },
    [onSelectMap]
  );

  // Canvas pan & zoom state
  const [zoom, setZoom] = useState<number>(0.8);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // In-progress active drawing stroke
  const [currentStroke, setCurrentStroke] = useState<{
    points: DrawingPoint[];
    color: string;
    size: number;
    opacity: number;
    tool: 'brush' | 'highlighter' | 'eraser';
  } | null>(null);

  // In-progress spell aiming preview
  const [activeSpellPreview, setActiveSpellPreview] = useState<SpellTemplate | null>(null);

  // Dragging refs for 60fps RAF operations without lag
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isRightClickPanRef = useRef<boolean>(false);
  const rightClickStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasRightClickDraggedRef = useRef<boolean>(false);
  const [isRightClickPanning, setIsRightClickPanning] = useState<boolean>(false);

  const isDraggingCameraRef = useRef<boolean>(false);
  const isResizingCameraRef = useRef<string | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraStartFrameRef = useRef<CameraFrame>(camera);

  const draggingMapIdRef = useRef<string | null>(null);
  const mapStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const resizingMapIdRef = useRef<string | null>(null);
  const rotatingMapIdRef = useRef<string | null>(null);
  const mapStartScaleRef = useRef<{ x: number; y: number }>({ x: 1, y: 1 });

  const isDrawingRef = useRef<boolean>(false);
  const isLaserActiveRef = useRef<boolean>(false);
  const isPlacingSpellRef = useRef<{
    startPos: { x: number; y: number };
    startClientPos: { x: number; y: number };
    type: SpellTemplate['type'];
  } | null>(null);
  const lastFogPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastEffectPointRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Center workspace on initial load
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPan({
        x: Math.round(rect.width / 2),
        y: Math.round(rect.height / 2),
      });
    }
  }, []);

  // Zoom with mouse wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      setZoom((z) => Math.min(Math.max(z * zoomFactor, 0.15), 3.0));
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Screen coordinates to Workspace coordinates
  const screenToWorkspace = useCallback(
    (screenX: number, screenY: number) => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = screenX - rect.left - pan.x;
      const relativeY = screenY - rect.top - pan.y;
      return {
        x: relativeX / zoom,
        y: relativeY / zoom,
      };
    },
    [pan, zoom]
  );

  // Mouse down handler
  const handleMouseDown = (e: React.MouseEvent) => {
    // RMB (e.button === 2) triggers instant canvas pan across ALL active tools
    if (e.button === 2) {
      isPanningRef.current = true;
      isRightClickPanRef.current = true;
      rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
      hasRightClickDraggedRef.current = false;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      setIsRightClickPanning(true);
      return;
    }

    if (e.button === 1 || activeTool === 'pan') {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    const mousePos = screenToWorkspace(e.clientX, e.clientY);

    // 1. Freehand Drawing Tools (Brush / Highlighter / Eraser)
    if (activeTool === 'brush' || activeTool === 'highlighter' || activeTool === 'eraser') {
      isDrawingRef.current = true;
      const newStroke = {
        points: [{ x: Math.round(mousePos.x), y: Math.round(mousePos.y) }],
        color: toolSettings.brushColor,
        size: toolSettings.brushSize,
        opacity: activeTool === 'highlighter' ? 0.35 : toolSettings.brushOpacity,
        tool: activeTool as 'brush' | 'highlighter' | 'eraser',
      };
      setCurrentStroke(newStroke);
      return;
    }

    // 2. Laser Pointer Tool
    if (activeTool === 'laser') {
      isLaserActiveRef.current = true;
      onSyncLaserPointer({
        active: true,
        x: Math.round(mousePos.x),
        y: Math.round(mousePos.y),
        color: toolSettings.laserColor,
        lastUpdate: Date.now(),
        isPing: true,
      });
      return;
    }

    // 3. Spell Templates (Circle, Cone, Line, Square)
    if (
      activeTool === 'spell-circle' ||
      activeTool === 'spell-cone' ||
      activeTool === 'spell-line' ||
      activeTool === 'spell-square'
    ) {
      const type = activeTool.replace('spell-', '') as SpellTemplate['type'];
      const gridSize = grid.size || 50;
      const radiusPixels = (toolSettings.spellFeetRadius / 5) * gridSize;
      const initialAngle = toolSettings.spellAngle || 0;

      const previewTemplate: SpellTemplate = {
        id: `spell-preview`,
        type,
        position: { x: Math.round(mousePos.x), y: Math.round(mousePos.y) },
        radius: radiusPixels,
        length: radiusPixels,
        angle: initialAngle,
        color: toolSettings.spellColor || '#06b6d4',
        label: `${toolSettings.spellFeetRadius} ft ${toolSettings.spellEffect.toUpperCase()} ${type.toUpperCase()}`,
        feetRadius: toolSettings.spellFeetRadius,
        effectType: toolSettings.spellEffect,
        createdAt: Date.now(),
      };

      isPlacingSpellRef.current = {
        startPos: { x: Math.round(mousePos.x), y: Math.round(mousePos.y) },
        startClientPos: { x: e.clientX, y: e.clientY },
        type,
      };
      setActiveSpellPreview(previewTemplate);
      return;
    }

    // 4. Animated Effects (Fire, Water, River trails, and Flame walls)
    if (activeTool === 'effect-fire' || activeTool === 'effect-water') {
      const effectType = activeTool === 'effect-fire' ? 'fire' : 'water';
      const radius = toolSettings.effectRadius || 45;
      lastEffectPointRef.current = mousePos;
      const newEffect: AnimatedEffect = {
        id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: effectType,
        position: { x: Math.round(mousePos.x), y: Math.round(mousePos.y) },
        radius: radius,
        intensity: 1.0,
        createdAt: Date.now(),
        nodes: [
          {
            x: Math.round(mousePos.x),
            y: Math.round(mousePos.y),
            r: radius,
          },
        ],
      };
      onAddAnimatedEffect(newEffect);
      return;
    }

    // 5. Fog of War Brush
    if (activeTool === 'fog-reveal' || activeTool === 'fog-conceal') {
      lastFogPointRef.current = mousePos;
      onAddFogPoint({
        x: Math.round(mousePos.x),
        y: Math.round(mousePos.y),
        radius: fogBrushRadius,
        type: activeTool === 'fog-reveal' ? 'reveal' : 'conceal',
      });
      return;
    }
  };

  // Mouse move handler (Throttled by RAF for maximum 60-120fps smoothness)
  const handleMouseMove = (e: React.MouseEvent) => {
    const clientX = e.clientX;
    const clientY = e.clientY;
    const buttons = e.buttons;

    if (rafIdRef.current) return;

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;

      if (isPanningRef.current) {
        if (isRightClickPanRef.current) {
          const dist = Math.hypot(
            clientX - rightClickStartPosRef.current.x,
            clientY - rightClickStartPosRef.current.y
          );
          if (dist > 4) {
            hasRightClickDraggedRef.current = true;
          }
        }
        setPan({
          x: Math.round(clientX - panStartRef.current.x),
          y: Math.round(clientY - panStartRef.current.y),
        });
        return;
      }

      const mousePos = screenToWorkspace(clientX, clientY);

      // Real-time Laser Pointer update
      if (activeTool === 'laser' && buttons === 1) {
        onSyncLaserPointer({
          active: true,
          x: Math.round(mousePos.x),
          y: Math.round(mousePos.y),
          color: toolSettings.laserColor,
          lastUpdate: Date.now(),
          isPing: false,
        });
        return;
      }

      // Live Aiming / Sizing of Spell Template while dragging
      if (isPlacingSpellRef.current && buttons === 1) {
        const { startPos, startClientPos, type } = isPlacingSpellRef.current;
        const dragDist = Math.hypot(clientX - startClientPos.x, clientY - startClientPos.y);

        if (dragDist > 8) {
          const angle = calculateAngleDegrees(startPos.x, startPos.y, mousePos.x, mousePos.y);
          const worldDist = Math.hypot(mousePos.x - startPos.x, mousePos.y - startPos.y);
          const gridSize = grid.size || 50;
          const feet = pixelsToFeet(worldDist, gridSize);
          const radiusPixels = feetToPixels(feet, gridSize);

          setActiveSpellPreview({
            id: `spell-preview`,
            type,
            position: startPos,
            radius: radiusPixels,
            length: radiusPixels,
            angle,
            color: toolSettings.spellColor || '#06b6d4',
            label: `${feet} ft (∠${angle}°) ${toolSettings.spellEffect.toUpperCase()} ${type.toUpperCase()}`,
            feetRadius: feet,
            effectType: toolSettings.spellEffect,
            createdAt: Date.now(),
          });
        }
        return;
      }

      // Drawing stroke recording
      if (isDrawingRef.current && buttons === 1) {
        setCurrentStroke((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            points: [...prev.points, { x: Math.round(mousePos.x), y: Math.round(mousePos.y) }],
          };
        });
        return;
      }

      // Continuous Animated Effects brush (Fire trails / walls / River paths)
      if (buttons === 1 && (activeTool === 'effect-fire' || activeTool === 'effect-water')) {
        const lastPt = lastEffectPointRef.current;
        const dist = lastPt ? Math.hypot(mousePos.x - lastPt.x, mousePos.y - lastPt.y) : Infinity;
        const radius = toolSettings.effectRadius || 45;

        if (dist > Math.max(18, radius * 0.4)) {
          lastEffectPointRef.current = mousePos;
          const effectType = activeTool === 'effect-fire' ? 'fire' : 'water';
          onAddAnimatedEffect({
            id: `effect-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            type: effectType,
            position: { x: Math.round(mousePos.x), y: Math.round(mousePos.y) },
            radius: radius,
            intensity: 1.0,
            createdAt: Date.now(),
            nodes: [
              {
                x: Math.round(mousePos.x),
                y: Math.round(mousePos.y),
                r: radius,
              },
            ],
          });
        }
        return;
      }

      // Continuous fog brush
      if (buttons === 1 && (activeTool === 'fog-reveal' || activeTool === 'fog-conceal')) {
        const lastPt = lastFogPointRef.current;
        const dist = lastPt ? Math.hypot(mousePos.x - lastPt.x, mousePos.y - lastPt.y) : Infinity;

        if (dist > Math.max(12, fogBrushRadius / 3)) {
          lastFogPointRef.current = mousePos;
          onAddFogPoint({
            x: Math.round(mousePos.x),
            y: Math.round(mousePos.y),
            radius: fogBrushRadius,
            type: activeTool === 'fog-reveal' ? 'reveal' : 'conceal',
          });
        }
        return;
      }

      // Dragging Camera Frame
      if (isDraggingCameraRef.current && !cameraStartFrameRef.current.locked) {
        const deltaX = (clientX - dragStartPosRef.current.x) / zoom;
        const deltaY = (clientY - dragStartPosRef.current.y) / zoom;

        onUpdateCamera({
          x: Math.round(cameraStartFrameRef.current.x + deltaX),
          y: Math.round(cameraStartFrameRef.current.y + deltaY),
        });
        return;
      }

      // Resizing Camera Frame
      if (isResizingCameraRef.current && !cameraStartFrameRef.current.locked) {
        const handle = isResizingCameraRef.current;
        const deltaX = (clientX - dragStartPosRef.current.x) / zoom;

        let newWidth = cameraStartFrameRef.current.width;
        let newHeight = cameraStartFrameRef.current.height;
        let newX = cameraStartFrameRef.current.x;
        let newY = cameraStartFrameRef.current.y;

        if (handle.includes('r')) {
          newWidth = Math.max(200, cameraStartFrameRef.current.width + deltaX);
        }
        if (handle.includes('l')) {
          const potentialWidth = cameraStartFrameRef.current.width - deltaX;
          if (potentialWidth > 200) {
            newWidth = potentialWidth;
            newX = cameraStartFrameRef.current.x + deltaX;
          }
        }

        // Maintain aspect ratio
        newHeight = newWidth / cameraStartFrameRef.current.aspectRatio;

        onUpdateCamera({
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
        return;
      }

      // Resizing Map Card
      if (resizingMapIdRef.current) {
        const targetId = resizingMapIdRef.current;
        const deltaX = (clientX - dragStartPosRef.current.x) / zoom;
        const activeItem = maps.find((m) => m.id === targetId);
        if (activeItem) {
          const scaleDelta = deltaX / activeItem.width;
          const newScaleX = Math.max(0.1, mapStartScaleRef.current.x + scaleDelta * 2);
          const newScaleY = Math.max(0.1, mapStartScaleRef.current.y + scaleDelta * 2);

          const updated = maps.map((m) =>
            m.id === targetId ? { ...m, scale: { x: newScaleX, y: newScaleY } } : m
          );
          onUpdateMaps(updated);
        }
        return;
      }

      // Rotating Map Card
      if (rotatingMapIdRef.current) {
        const targetId = rotatingMapIdRef.current;
        const activeItem = maps.find((m) => m.id === targetId);
        if (activeItem) {
          const center = {
            x: (activeItem.position?.x ?? 0) + (activeItem.width * (activeItem.scale?.x ?? 1)) / 2,
            y: (activeItem.position?.y ?? 0) + (activeItem.height * (activeItem.scale?.y ?? 1)) / 2,
          };
          const angle = Math.atan2(mousePos.y - center.y, mousePos.x - center.x) * (180 / Math.PI);
          const updated = maps.map((m) =>
            m.id === targetId ? { ...m, rotation: Math.round(angle + 90) } : m
          );
          onUpdateMaps(updated);
        }
        return;
      }

      // Dragging map card
      if (draggingMapIdRef.current) {
        const targetId = draggingMapIdRef.current;
        const deltaX = (clientX - dragStartPosRef.current.x) / zoom;
        const deltaY = (clientY - dragStartPosRef.current.y) / zoom;

        const updated = maps.map((m) => {
          if (m.id === targetId) {
            return {
              ...m,
              position: {
                x: Math.round(mapStartPosRef.current.x + deltaX),
                y: Math.round(mapStartPosRef.current.y + deltaY),
              },
            };
          }
          return m;
        });
        onUpdateMaps(updated);
        return;
      }
    });
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    isRightClickPanRef.current = false;
    setIsRightClickPanning(false);
    isDraggingCameraRef.current = false;
    isResizingCameraRef.current = null;
    draggingMapIdRef.current = null;
    resizingMapIdRef.current = null;
    rotatingMapIdRef.current = null;
    lastFogPointRef.current = null;
    lastEffectPointRef.current = null;

    if (isPlacingSpellRef.current && activeSpellPreview) {
      const finalTemplate: SpellTemplate = {
        ...activeSpellPreview,
        id: `spell-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      };
      onAddSpellTemplate(finalTemplate);
      isPlacingSpellRef.current = null;
      setActiveSpellPreview(null);
    }

    if (isDrawingRef.current && currentStroke && currentStroke.points.length > 1) {
      isDrawingRef.current = false;
      const simplifiedPoints = tabletopMathEngine.simplifyStrokeRDP(currentStroke.points, 1.2);
      const stroke: DrawingStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        points: simplifiedPoints.length > 1 ? simplifiedPoints : currentStroke.points,
        color: currentStroke.color,
        size: currentStroke.size,
        opacity: currentStroke.opacity,
        tool: currentStroke.tool,
      };
      onAddDrawingStroke(stroke);
      setCurrentStroke(null);
    }

    if (isLaserActiveRef.current) {
      isLaserActiveRef.current = false;
      // Auto fade laser pointer after 2.5s if released
      setTimeout(() => {
        onSyncLaserPointer(null);
      }, 2500);
    }
  };

  // Map drag & transformation triggers
  const handleStartMapDrag = (e: React.MouseEvent, mapItem: MapItem) => {
    if (e.button !== 0) return; // Only left mouse button initiates object dragging
    if (activeTool !== 'select') return;
    onSelectMap(mapItem.id);
    if (
      mapItem.locked ||
      isLayerLocked(mapObjectLayerToTabletopLayer(mapItem.layer), layersConfig)
    ) {
      return;
    }
    draggingMapIdRef.current = mapItem.id;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    mapStartPosRef.current = { ...mapItem.position };
  };

  const handleStartMapResize = (e: React.MouseEvent, mapItem: MapItem) => {
    e.stopPropagation();
    if (
      mapItem.locked ||
      isLayerLocked(mapObjectLayerToTabletopLayer(mapItem.layer), layersConfig)
    ) {
      return;
    }
    resizingMapIdRef.current = mapItem.id;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    mapStartScaleRef.current = { ...mapItem.scale };
  };

  const handleStartMapRotate = (e: React.MouseEvent, mapItem: MapItem) => {
    e.stopPropagation();
    if (
      mapItem.locked ||
      isLayerLocked(mapObjectLayerToTabletopLayer(mapItem.layer), layersConfig)
    ) {
      return;
    }
    rotatingMapIdRef.current = mapItem.id;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  // Camera frame drag & resize triggers
  const handleStartCameraDrag = (e: React.MouseEvent) => {
    if (activeTool !== 'select' || camera.locked) return;
    isDraggingCameraRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    cameraStartFrameRef.current = { ...camera };
  };

  const handleStartCameraResize = (e: React.MouseEvent, handle: string) => {
    if (camera.locked) return;
    isResizingCameraRef.current = handle;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    cameraStartFrameRef.current = { ...camera };
  };

  // Group maps by assigned layer
  const backgroundMaps = filterMapsByObjectLayer(maps, 'background');
  const propsMaps = filterMapsByObjectLayer(maps, 'props');
  const overheadMaps = filterMapsByObjectLayer(maps, 'overhead');
  const aboveFogMaps = filterMapsByObjectLayer(maps, 'above-fog');

  // Dynamic Layer Z-Indices from layersConfig
  const mapsZIndex = getLayerZIndex('maps', layersConfig);
  const propsZIndex = getLayerZIndex('props', layersConfig);
  const gridZIndex = getLayerZIndex('grid', layersConfig);
  const drawingsZIndex = getLayerZIndex('drawings', layersConfig);
  const effectsZIndex = getLayerZIndex('effects', layersConfig);
  const spellsZIndex = getLayerZIndex('spells', layersConfig);
  const overheadZIndex = getLayerZIndex('overhead', layersConfig);
  const fogZIndex = getLayerZIndex('fog', layersConfig);
  const laserZIndex = getLayerZIndex('laser', layersConfig);
  const cameraZIndex = getLayerZIndex('camera', layersConfig);

  // Dynamic Layer Opacities
  const mapsOpacity = getLayerOpacity('maps', layersConfig);
  const propsOpacity = getLayerOpacity('props', layersConfig);
  const gridOpacity = getLayerOpacity('grid', layersConfig);
  const drawingsOpacity = getLayerOpacity('drawings', layersConfig);
  const effectsOpacity = getLayerOpacity('effects', layersConfig);
  const spellsOpacity = getLayerOpacity('spells', layersConfig);
  const overheadOpacity = getLayerOpacity('overhead', layersConfig);
  const fogOpacity = getLayerOpacity('fog', layersConfig);

  // Dynamic Layer Visibilities
  const mapsVisible = isLayerVisible('maps', layersConfig);
  const propsVisible = isLayerVisible('props', layersConfig);
  const gridVisible = isLayerVisible('grid', layersConfig);
  const drawingsVisible = isLayerVisible('drawings', layersConfig);
  const effectsVisible = isLayerVisible('effects', layersConfig);
  const spellsVisible = isLayerVisible('spells', layersConfig);
  const overheadVisible = isLayerVisible('overhead', layersConfig);
  const fogVisible = isLayerVisible('fog', layersConfig);

  const renderMapList = (items: MapItem[]) => {
    // Frustum Spatial Culling for high-performance with dozens or hundreds of maps
    let displayItems = items;
    if ((items.length > 5 || maps.length > 10) && containerRef.current) {
      const containerW = containerRef.current.clientWidth || window.innerWidth;
      const containerH = containerRef.current.clientHeight || window.innerHeight;
      const margin = 600; // Extra buffer around viewport for smooth panning
      const viewLeft = -pan.x / zoom - margin;
      const viewTop = -pan.y / zoom - margin;
      const viewRight = (containerW - pan.x) / zoom + margin;
      const viewBottom = (containerH - pan.y) / zoom + margin;

      displayItems = items.filter((mapItem) => {
        if (mapItem.id === activeMapId) return true; // Always render active/selected item
        const itemW = (mapItem.width || 800) * (mapItem.scale?.x || 1);
        const itemH = (mapItem.height || 600) * (mapItem.scale?.y || 1);
        const itemX = mapItem.position?.x || 0;
        const itemY = mapItem.position?.y || 0;

        return (
          itemX < viewRight &&
          itemX + itemW > viewLeft &&
          itemY < viewBottom &&
          itemY + itemH > viewTop
        );
      });
    }

    return displayItems
      .slice()
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map((mapItem) => (
        <MapCard
          key={mapItem.id}
          mapItem={mapItem}
          isSelected={mapItem.id === activeMapId}
          activeTool={activeTool}
          onSelect={handleStartMapDrag}
          onStartRotate={handleStartMapRotate}
          onStartResize={handleStartMapResize}
          onOpenLayerSettings={onOpenLayerSettings}
          onQuickUpdate={onQuickUpdateMapItem}
          onContextMenu={handleCardContextMenu}
          onOpenSubmapTab={onOpenSubmapTab}
          onDeleteMap={onDeleteMap}
          onOpenInitiative={onOpenInitiative}
        />
      ));
  };

  const getCursorClass = () => {
    if (isRightClickPanning || activeTool === 'pan') {
      return 'cursor-grab active:cursor-grabbing';
    }
    if (activeTool === 'brush' || activeTool === 'highlighter') return 'cursor-crosshair';
    if (activeTool === 'eraser') return 'cursor-crosshair';
    if (activeTool === 'laser') return 'cursor-crosshair';
    if (activeTool.startsWith('spell-') || activeTool.startsWith('effect-')) return 'cursor-crosshair';
    if (activeTool === 'fog-reveal' || activeTool === 'fog-conceal') return 'cursor-crosshair';
    return 'cursor-default';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/json')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('application/json');
    if (!rawData) return;
    try {
      const data = JSON.parse(rawData);
      if (data && data.type === 'aethermap_prop_preset') {
        const dropPos = screenToWorkspace(e.clientX, e.clientY);
        const newProp: MapItem = {
          id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: data.name,
          type: 'image',
          url: data.url,
          thumbnailUrl: data.url,
          width: data.width || 100,
          height: data.height || 100,
          aspectRatio: (data.width || 100) / (data.height || 100),
          position: {
            x: Math.round(dropPos.x - (data.width || 100) / 2),
            y: Math.round(dropPos.y - (data.height || 100) / 2),
          },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: data.layer === 'overhead' ? 50 : data.layer === 'background' ? 1 : 10,
          opacity: 1,
          hash: 'drop-' + Math.random().toString(36).substring(2, 8),
          fileSize: 0,
          format: 'png',
          category: data.category || 'Пропсы',
          layer: data.layer || 'props',
        };
        onUpdateMaps([...maps, newProp]);
      } else if (data && data.type === 'aethermap_compendium_card' && data.item) {
        const dropPos = screenToWorkspace(e.clientX, e.clientY);
        const item = data.item;
        const width = 380;
        const height = 460;
        const newCardMapItem: MapItem = {
          id: `card-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.name,
          type: 'card',
          url: '',
          thumbnailUrl: '',
          width,
          height,
          aspectRatio: width / height,
          position: {
            x: Math.round(dropPos.x - width / 2),
            y: Math.round(dropPos.y - height / 2),
          },
          scale: { x: 1, y: 1 },
          rotation: 0,
          zIndex: 60,
          opacity: 1,
          hash: 'card-' + Math.random().toString(36).substring(2, 8),
          fileSize: 0,
          format: 'png',
          category: 'Справочник',
          layer: 'props',
          isContentCard: true,
          contentCardData: item,
        };
        onUpdateMaps([...maps, newCardMapItem]);
      }
    } catch (err) {
      console.warn('Drop prop error:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => {
        e.preventDefault();
        if (hasRightClickDraggedRef.current) {
          hasRightClickDraggedRef.current = false;
        }
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full h-full relative overflow-hidden bg-zinc-950 select-none ${getCursorClass()}`}
    >
      {/* Infinite Miro Tabletop Workspace Layer */}
      <div
        className="absolute top-0 left-0 w-full h-full origin-top-left pointer-events-none transform-gpu"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          willChange: 'transform',
        }}
      >
        {/* Empty Workspace Notification */}
        {maps.length === 0 && (
          <div
            id="empty-workspace-quickstart"
            className="absolute pointer-events-auto flex flex-col items-center justify-center p-8 bg-zinc-900/95 border-2 border-dashed border-zinc-700/80 backdrop-blur-md rounded-3xl text-center space-y-4 shadow-2xl transition-all"
            style={{
              width: '600px',
              height: '380px',
              left: '-300px',
              top: '-190px',
              zIndex: 10,
            }}
          >
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-zinc-100">Рабочая сцена пуста</h3>
              <p className="text-xs text-zinc-400 max-w-md">
                В этой вкладке пока нет карты или объектов. Выберите готовую локацию из библиотеки или загрузите своё изображение / видео.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {onOpenMapLibrary && (
                <button
                  type="button"
                  id="empty-scene-open-library-btn"
                  onClick={onOpenMapLibrary}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition-all shadow-lg active:scale-95 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-zinc-950" />
                  <span>Выбрать из Библиотеки карт</span>
                </button>
              )}
              {onOpenUploadModal && (
                <button
                  type="button"
                  id="empty-scene-open-upload-btn"
                  onClick={onOpenUploadModal}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold border border-zinc-700 rounded-xl text-xs flex items-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Загрузить карту с ПК</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 1. Слой карт / Задний план (maps) */}
        {mapsVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: mapsZIndex, opacity: mapsOpacity }}
          >
            {renderMapList(backgroundMaps)}
          </div>
        )}

        {/* 2. Слой объектов стола и токенов (props) */}
        {propsVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: propsZIndex, opacity: propsOpacity }}
          >
            {renderMapList(propsMaps)}
          </div>
        )}

        {/* 3. Сетка рабочего стола (grid) */}
        {grid.enabled && gridVisible && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: '4000px',
              height: '4000px',
              left: '-2000px',
              top: '-2000px',
              zIndex: gridZIndex,
              opacity: gridOpacity,
            }}
          >
            <GridCanvasRenderer grid={grid} />
          </div>
        )}

        {/* 4. Слой рисунков (drawings) */}
        {drawingsVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: drawingsZIndex, opacity: drawingsOpacity }}
          >
            <DrawingCanvasLayer
              drawings={drawings}
              currentStroke={currentStroke}
              width={4000}
              height={4000}
              offsetX={2000}
              offsetY={2000}
            />
          </div>
        )}

        {/* 5. Слой анимированных спецэффектов (effects) */}
        {effectsVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: effectsZIndex, opacity: effectsOpacity }}
          >
            <AnimatedEffectsLayer
              effects={animatedEffects}
              width={4000}
              height={4000}
              offsetX={2000}
              offsetY={2000}
              isMaster={true}
              onRemoveEffect={onRemoveAnimatedEffect}
            />
          </div>
        )}

        {/* 6. Слой заклинаний и шаблонов AoE (spells) */}
        {spellsVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: spellsZIndex, opacity: spellsOpacity }}
          >
            <SpellTemplatesLayer
              spellTemplates={activeSpellPreview ? [...spellTemplates, activeSpellPreview] : spellTemplates}
              isMaster={true}
              gridSize={grid.size || 50}
              onRemoveTemplate={onRemoveSpellTemplate}
              onUpdateTemplate={onUpdateSpellTemplate}
            />
          </div>
        )}

        {/* 7. Верхний слой / Крыши и навесы (overhead) */}
        {overheadVisible && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: overheadZIndex, opacity: overheadOpacity }}
          >
            {renderMapList(overheadMaps)}
          </div>
        )}

        {/* 8. Туман войны (fog) */}
        {fog.enabled && fogVisible && (
          <div
            className="absolute pointer-events-none"
            style={{
              width: '4000px',
              height: '4000px',
              left: '-2000px',
              top: '-2000px',
              zIndex: fogZIndex,
              opacity: fogOpacity,
            }}
          >
            <FogCanvasRenderer
              fog={fog}
              width={4000}
              height={4000}
              offsetX={2000}
              offsetY={2000}
              className="w-full h-full"
              isMasterPreview={true}
            />
          </div>
        )}

        {/* 9. Парящие объекты над туманом (above-fog maps) & Лазерная указка (laser) */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: laserZIndex }}>
          {renderMapList(aboveFogMaps)}
          <LaserPointerLayer laser={laserPointer} />
        </div>

        {/* 10. Рамка камеры игроков (camera) */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: cameraZIndex }}>
          <CameraFrameOverlay
            camera={camera}
            onStartDrag={handleStartCameraDrag}
            onStartResize={handleStartCameraResize}
          />
        </div>

        {/* 11. Пользовательские кастомные слои (custom layers) */}
        {getCustomLayers(layersConfig).map((customLayer) => {
          if (!isLayerVisible(customLayer.id, layersConfig)) return null;
          const customMaps = filterMapsByObjectLayer(maps, customLayer.id);
          const zIdx = getLayerZIndex(customLayer.id, layersConfig);
          const opac = getLayerOpacity(customLayer.id, layersConfig);
          return (
            <div
              key={customLayer.id}
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: zIdx, opacity: opac }}
            >
              {renderMapList(customMaps)}
            </div>
          );
        })}
      </div>

      {/* Canvas Zoom Controls (Bottom Left stationary HUD) */}
      <div
        id="canvas_zoom_controls"
        className="absolute bottom-4 left-4 z-20 pointer-events-auto flex items-center space-x-1.5 bg-zinc-950/90 backdrop-blur-md border border-zinc-800/90 p-1.5 rounded-xl text-xs text-zinc-300 shadow-2xl select-none"
      >
        <button
          onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
          className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-100 transition-colors border border-zinc-800"
          title="Zoom Out"
        >
          -
        </button>
        <span className="w-12 text-center font-mono text-[11px] text-zinc-300 font-semibold">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
          className="w-7 h-7 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-center font-bold text-zinc-100 transition-colors border border-zinc-800"
          title="Zoom In"
        >
          +
        </button>

        <button
          onClick={() => {
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setPan({ x: Math.round(rect.width / 2), y: Math.round(rect.height / 2) });
              setZoom(0.8);
            }
          }}
          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] rounded-lg text-zinc-300 transition-colors font-medium ml-1"
          title="Reset Canvas View"
        >
          Сброс
        </button>
      </div>

      {/* Right-Click Object Context Menu */}
      {contextMenu && (
        <ObjectContextMenu
          mapItem={contextMenu.item}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          layersConfig={layersConfig}
          onUpdateMapItem={(id, partial) => {
            if (onQuickUpdateMapItem) onQuickUpdateMapItem(id, partial);
          }}
          onDuplicateMap={onDuplicateMap}
          onDeleteMap={onDeleteMap}
          onOpenFullBindingModal={onOpenLayerSettings}
        />
      )}
    </div>
  );
});
