import React, { useState, useEffect, useCallback, memo } from 'react';
import { MiroCanvas } from './MiroCanvas';
import { PhotoshopToolbar } from './PhotoshopToolbar';
import { MasterTopDock, OpenPanelsState } from './MasterTopDock';
import { CameraControlsPanel } from './CameraControlsPanel';
import { FogOfWarPanel } from './FogOfWarPanel';
import { PlayerCurtainPanel } from './PlayerCurtainPanel';
import { MiniAudioDock } from './MiniAudioDock';
import { InitiativeDashboardWidget } from './InitiativeDashboardWidget';
import { DraggableResizablePanel } from './DraggableResizablePanel';
import { SimsBuildModePanel } from './SimsBuildModePanel';
import { ToolSettingsFlyout } from './ToolSettingsFlyout';
import { initiativeEngine } from '../services/initiativeEngine';
import {
  TabletopSessionState,
  CameraFrame,
  MapItem,
  FogState,
  GridSettings,
  ActiveTool,
  FogPoint,
  DrawingStroke,
  SpellTemplate,
  AnimatedEffect,
  LaserPointer,
  ToolSettings,
  PlayerBlackoutState,
} from '../types';
import {
  Eye,
  Tv,
  EyeOff,
  Lock,
  Swords,
  Package,
} from 'lucide-react';

interface Props {
  session: TabletopSessionState;
  onUpdateCamera: (camera: Partial<CameraFrame>) => void;
  onUpdateMaps: (maps: MapItem[], activeMapId?: string | null) => void;
  onUpdateMapItem?: (mapId: string, partial: Partial<MapItem>) => void;
  onUpdateFog: (fog: Partial<FogState>) => void;
  onUpdateGrid: (grid: Partial<GridSettings>) => void;
  onTogglePlayerBlackout?: () => void;
  onUpdatePlayerBlackout?: (blackout: Partial<PlayerBlackoutState>) => void;
  onAddDrawingStroke: (stroke: DrawingStroke) => void;
  onClearDrawings: () => void;
  onAddSpellTemplate: (template: SpellTemplate) => void;
  onUpdateSpellTemplate: (id: string, partial: Partial<SpellTemplate>) => void;
  onRemoveSpellTemplate: (id: string) => void;
  onClearSpellTemplates: () => void;
  onAddAnimatedEffect: (effect: AnimatedEffect) => void;
  onRemoveAnimatedEffect: (id: string) => void;
  onSyncLaserPointer: (laser: LaserPointer | null) => void;
  onClearWorkspace?: () => void;
  onOpenMapLibrary: () => void;
  onOpenUploadModal: () => void;
  onOpenGridConfig: () => void;
  onOpenLayersConfig?: () => void;
  onOpenObjectLayerBinding?: (mapItem: MapItem) => void;
  onOpenAudioPlayer?: () => void;
  onOpenSfxSoundboard?: () => void;
  onOpenInitiative?: () => void;
  onOpenUnifiedAssets?: () => void;
  onOpenVault?: () => void;
  onOpenSaveTabToVault?: () => void;
  onOpenSubmapTab?: (portalItem: MapItem) => void;
  onDuplicateMap?: (mapItem: MapItem) => void;
  onDeleteMap?: (mapId: string) => void;
  vaultMapsCount?: number;
}

const STORAGE_OPEN_PANELS_KEY = 'aethermap_master_open_panels_v1';

export const MasterDashboard: React.FC<Props> = memo(({
  session,
  onUpdateCamera,
  onUpdateMaps,
  onUpdateMapItem,
  onUpdateFog,
  onUpdateGrid,
  onTogglePlayerBlackout,
  onUpdatePlayerBlackout,
  onAddDrawingStroke,
  onClearDrawings,
  onAddSpellTemplate,
  onUpdateSpellTemplate,
  onRemoveSpellTemplate,
  onClearSpellTemplates,
  onAddAnimatedEffect,
  onRemoveAnimatedEffect,
  onSyncLaserPointer,
  onClearWorkspace,
  onOpenMapLibrary,
  onOpenUploadModal,
  onOpenGridConfig,
  onOpenLayersConfig,
  onOpenObjectLayerBinding,
  onOpenAudioPlayer,
  onOpenSfxSoundboard,
  onOpenInitiative,
  onOpenUnifiedAssets,
  onOpenVault,
  onOpenSaveTabToVault,
  onOpenSubmapTab,
  onDuplicateMap,
  onDeleteMap,
  vaultMapsCount = 0,
}) => {
  const [activeTool, setActiveTool] = useState<ActiveTool>('select');

  // Master Photoshop Tool Settings State
  const [toolSettings, setToolSettings] = useState<ToolSettings>({
    brushColor: '#ef4444',
    brushSize: 8,
    brushOpacity: 0.9,
    spellFeetRadius: 20,
    spellAngle: 0,
    spellShape: 'circle',
    spellEffect: 'fire',
    spellColor: '#f97316',
    laserColor: '#ef4444',
    effectType: 'fire',
    effectRadius: 120,
  });

  // Track Open Floating Panels (Default: ALL panels minimized/closed)
  const [openPanels, setOpenPanels] = useState<OpenPanelsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_OPEN_PANELS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {
      initiative: false,
      sims: false,
      camera: false,
      fog: false,
      curtain: false,
    };
  });

  // Save open panels to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OPEN_PANELS_KEY, JSON.stringify(openPanels));
    } catch (e) {}
  }, [openPanels]);

  const handleTogglePanel = useCallback((panelKey: keyof OpenPanelsState) => {
    if (panelKey === 'vault') {
      if (onOpenVault) onOpenVault();
      return;
    }
    setOpenPanels((prev) => ({
      ...prev,
      [panelKey]: !prev[panelKey],
    }));
  }, [onOpenVault]);

  // Initiative encounter status for top dock badges
  const [encounterState, setEncounterState] = useState(() => initiativeEngine.getState());
  useEffect(() => {
    const unsub = initiativeEngine.subscribe(() => {
      setEncounterState(initiativeEngine.getState());
    });
    return unsub;
  }, []);

  const handleUpdateToolSettings = useCallback((newSettings: Partial<ToolSettings>) => {
    setToolSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const activeMap = session.maps.find((m) => m.id === session.activeMapId);

  const handleSelectMap = useCallback((mapId: string) => {
    onUpdateMaps(session.maps, mapId);
  }, [session.maps, onUpdateMaps]);

  const handleAddFogPoint = useCallback((pt: FogPoint) => {
    const updatedHistory = [...session.fog.history, pt];
    onUpdateFog({ history: updatedHistory });
  }, [session.fog.history, onUpdateFog]);

  const handleResetFog = useCallback((fillWithFog: boolean) => {
    onUpdateFog({
      history: fillWithFog ? [] : [{ x: 0, y: 0, radius: 99999, type: 'reveal' }],
    });
  }, [onUpdateFog]);

  // Global Keyboard Shortcuts (Photoshop / VTT style)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing inside an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const key = e.key.toLowerCase();

      switch (key) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'p':
          setActiveTool('laser');
          break;
        case 'b':
          setActiveTool('brush');
          break;
        case 'm':
          setActiveTool('highlighter');
          break;
        case 'e':
          setActiveTool('eraser');
          break;
        case 'c':
          setActiveTool('spell-circle');
          break;
        case 'f':
          setActiveTool('effect-fire');
          break;
        case 'w':
          setActiveTool('effect-water');
          break;
        case 'l':
          if (onOpenLayersConfig) onOpenLayersConfig();
          break;
        case '[':
          setToolSettings((prev) => ({ ...prev, brushSize: Math.max(2, prev.brushSize - 2) }));
          break;
        case ']':
          setToolSettings((prev) => ({ ...prev, brushSize: Math.min(50, prev.brushSize + 2) }));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenLayersConfig]);

  const handlePlacePropFromSimsPanel = useCallback(
    (prop: {
      name: string;
      url: string;
      width: number;
      height: number;
      layer: 'props' | 'overhead' | 'background';
      category?: string;
    }) => {
      const spawnX = session.camera ? Math.round(session.camera.x) : 0;
      const spawnY = session.camera ? Math.round(session.camera.y) : 0;

      const newProp: MapItem = {
        id: `prop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: prop.name,
        type: 'image',
        url: prop.url,
        thumbnailUrl: prop.url,
        width: prop.width,
        height: prop.height,
        aspectRatio: prop.width / prop.height,
        position: {
          x: spawnX - Math.round(prop.width / 2),
          y: spawnY - Math.round(prop.height / 2),
        },
        scale: { x: 1, y: 1 },
        rotation: 0,
        zIndex: prop.layer === 'overhead' ? 50 : prop.layer === 'background' ? 1 : 10,
        opacity: 1,
        hash: 'sims-' + Math.random().toString(36).substring(2, 8),
        fileSize: 0,
        format: 'png',
        category: prop.category || 'Пропсы',
        layer: prop.layer || 'props',
      };

      onUpdateMaps([...session.maps, newProp], session.activeMapId);
    },
    [session.camera, session.maps, session.activeMapId, onUpdateMaps]
  );

  const propsCount = session.maps.filter((m) => m.layer === 'props').length;

  return (
    <div className="w-full h-full relative overflow-hidden bg-zinc-950 flex flex-col select-none">
      {/* 1. Main Interactive Workspace Split: Fixed Left Sidebar + Dynamic Tabletop */}
      <div className="flex-1 w-full flex relative overflow-hidden">
        {/* Stationary Left Photoshop Toolbar Bar (Solid, anchored sidebar) */}
        <div
          id="master_left_photoshop_bar"
          className="shrink-0 h-full bg-zinc-950/95 border-r border-zinc-800/80 flex flex-col items-center justify-start py-3 px-2 z-30 overflow-y-auto scrollbar-none shadow-2xl relative"
        >
          <PhotoshopToolbar
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            toolSettings={toolSettings}
            onUpdateToolSettings={handleUpdateToolSettings}
            onClearDrawings={onClearDrawings}
            onClearSpellTemplates={onClearSpellTemplates}
            onOpenLayersConfig={onOpenLayersConfig}
          />
        </div>

        {/* 2. Interactive Tabletop Workspace Area */}
        <div className="flex-1 h-full relative overflow-hidden">
          <MiroCanvas
            maps={session.maps}
            activeMapId={session.activeMapId}
            camera={session.camera}
            fog={session.fog}
            grid={session.grid}
            activeTool={activeTool}
            drawings={session.drawings || []}
            spellTemplates={session.spellTemplates || []}
            animatedEffects={session.animatedEffects || []}
            laserPointer={session.laserPointer || null}
            layersConfig={session.layersConfig}
            toolSettings={toolSettings}
            onUpdateCamera={onUpdateCamera}
            onUpdateMaps={(updated) => onUpdateMaps(updated)}
            onSelectMap={handleSelectMap}
            onOpenLayerSettings={onOpenObjectLayerBinding}
            onQuickUpdateMapItem={onUpdateMapItem}
            onDuplicateMap={onDuplicateMap}
            onDeleteMap={onDeleteMap}
            onAddFogPoint={handleAddFogPoint}
            onAddDrawingStroke={onAddDrawingStroke}
            onAddSpellTemplate={onAddSpellTemplate}
            onUpdateSpellTemplate={onUpdateSpellTemplate}
            onRemoveSpellTemplate={onRemoveSpellTemplate}
            onAddAnimatedEffect={onAddAnimatedEffect}
            onRemoveAnimatedEffect={onRemoveAnimatedEffect}
            onSyncLaserPointer={onSyncLaserPointer}
            onOpenMapLibrary={onOpenMapLibrary}
            onOpenUploadModal={onOpenUploadModal}
            onOpenSubmapTab={onOpenSubmapTab}
            fogBrushRadius={toolSettings.brushSize * 2}
          />

          {/* Contextual Floating Tool Settings Panel (Unconstrained by sidebar overflow) */}
          <div
            id="master_tool_settings_container"
            className="absolute top-3.5 left-3.5 z-40 pointer-events-auto select-none"
          >
            <ToolSettingsFlyout
              activeTool={activeTool}
              toolSettings={toolSettings}
              onUpdateToolSettings={handleUpdateToolSettings}
              onClearDrawings={onClearDrawings}
              onClearSpellTemplates={onClearSpellTemplates}
              onClose={() => setActiveTool('select')}
            />
          </div>

          {/* Top-Anchored Master Dock (Equalized 56x56 buttons with active glow) */}
          <div
            id="master_top_dock_container"
            className="absolute top-3 right-4 z-40 pointer-events-auto select-none max-w-[calc(100%-6rem)] overflow-x-auto scrollbar-none"
          >
            <MasterTopDock
              openPanels={openPanels}
              onTogglePanel={handleTogglePanel}
              sessionPropsCount={propsCount}
              combatantsCount={encounterState.encounter.combatants.length}
              inCombat={encounterState.encounter.inCombat}
              combatRound={encounterState.encounter.round}
              isBlackoutEnabled={!!session.playerBlackout?.enabled}
              isFogEnabled={!!session.fog?.enabled}
              vaultMapsCount={vaultMapsCount}
            />
          </div>

        {/* Master Top Notification Floating Alert (When Blackout Curtain is ON) */}
        {session.playerBlackout?.enabled && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-3 bg-amber-950/95 border border-amber-500/60 backdrop-blur-xl px-4 py-2 rounded-2xl shadow-2xl shadow-amber-950/80 text-amber-200 animate-fadeIn pointer-events-auto select-none">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <span className="font-bold text-xs tracking-wide text-amber-100 uppercase">
                Экран игроков скрыт заглушкой
              </span>
            </div>
            <span className="hidden md:inline text-[11px] text-amber-300/80 border-l border-amber-500/30 pl-2.5 max-w-[200px] truncate">
              {session.playerBlackout?.title || 'Мастер подготавливает карту...'}
            </span>
            {onTogglePlayerBlackout && (
              <button
                onClick={onTogglePlayerBlackout}
                className="ml-1 flex items-center space-x-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Показать карту</span>
              </button>
            )}
          </div>
        )}

        {/* 3. Floating Panel: ⚔️ Бой / Очередь Инициативы */}
        <DraggableResizablePanel
          id="panel_initiative"
          isOpen={openPanels.initiative}
          onClose={() => handleTogglePanel('initiative')}
          handleTitle="Очередь инициативы (Бой)"
          handleIcon={<Swords className="w-3.5 h-3.5" />}
          defaultPosition={{ x: 260, y: 70 }}
          defaultSize={{ width: 360, height: 420 }}
          minWidth={300}
          minHeight={200}
          zIndex={35}
        >
          <InitiativeDashboardWidget
            onOpenFullModal={onOpenInitiative || (() => {})}
          />
        </DraggableResizablePanel>

        {/* 4. Floating Panel: 📦 Каталог Объектов (Sims) */}
        <DraggableResizablePanel
          id="panel_sims_catalog"
          isOpen={openPanels.sims}
          onClose={() => handleTogglePanel('sims')}
          handleTitle="Каталог объектов и декораций"
          handleIcon={<Package className="w-3.5 h-3.5" />}
          defaultPosition={{ x: 140, y: 460 }}
          defaultSize={{ width: 780, height: 320 }}
          minWidth={380}
          minHeight={180}
          zIndex={36}
        >
          <SimsBuildModePanel
            sessionMaps={session.maps}
            onPlaceProp={handlePlacePropFromSimsPanel}
            onOpenUploadModal={onOpenUploadModal}
            onOpenUnifiedAssets={onOpenUnifiedAssets}
          />
        </DraggableResizablePanel>

        {/* 5. Floating Panel (Split 1/3): 📺 Управление Камерой */}
        <DraggableResizablePanel
          id="panel_camera_controls"
          isOpen={openPanels.camera}
          onClose={() => handleTogglePanel('camera')}
          handleTitle="Управление камерой игроков"
          handleIcon={<Tv className="w-3.5 h-3.5" />}
          defaultPosition={{ x: 860, y: 70 }}
          defaultSize={{ width: 340, height: 320 }}
          minWidth={280}
          minHeight={160}
          zIndex={32}
        >
          <CameraControlsPanel
            camera={session.camera}
            activeMap={activeMap}
            grid={session.grid}
            onUpdateCamera={onUpdateCamera}
            onClearWorkspace={onClearWorkspace}
          />
        </DraggableResizablePanel>

        {/* 6. Floating Panel (Split 2/3): 👁️‍🗨️ Туман Войны */}
        <DraggableResizablePanel
          id="panel_fog_controls"
          isOpen={openPanels.fog}
          onClose={() => handleTogglePanel('fog')}
          handleTitle="Туман войны"
          handleIcon={<EyeOff className="w-3.5 h-3.5" />}
          defaultPosition={{ x: 860, y: 280 }}
          defaultSize={{ width: 340, height: 280 }}
          minWidth={280}
          minHeight={150}
          zIndex={32}
        >
          <FogOfWarPanel
            fog={session.fog}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onUpdateFog={onUpdateFog}
            fogBrushRadius={toolSettings.brushSize * 2}
            onChangeBrushRadius={(r) =>
              setToolSettings((prev) => ({ ...prev, brushSize: Math.max(1, Math.round(r / 2)) }))
            }
            onResetFog={handleResetFog}
          />
        </DraggableResizablePanel>

        {/* 7. Floating Panel (Split 3/3): 🔒 Заглушка Экрана */}
        <DraggableResizablePanel
          id="panel_curtain_controls"
          isOpen={openPanels.curtain}
          onClose={() => handleTogglePanel('curtain')}
          handleTitle="Заглушка экрана игроков"
          handleIcon={<Lock className="w-3.5 h-3.5" />}
          defaultPosition={{ x: 860, y: 380 }}
          defaultSize={{ width: 380, height: 490 }}
          minWidth={320}
          minHeight={240}
          zIndex={32}
        >
          <PlayerCurtainPanel
            blackout={session.playerBlackout}
            onToggleBlackout={onTogglePlayerBlackout}
            onUpdateBlackout={onUpdatePlayerBlackout}
          />
        </DraggableResizablePanel>
        </div>
      </div>

      {/* 2. Stationary Bottom Audio Dock (Always accessible, anchored to bottom) */}
      <div id="master_bottom_audio_bar" className="w-full shrink-0 z-40">
        <MiniAudioDock
          onOpenFullPlayer={onOpenAudioPlayer || (() => {})}
          onOpenSfxSoundboard={onOpenSfxSoundboard}
        />
      </div>
    </div>
  );
});
