import React, { useState, useEffect } from 'react';
import { useTabletopSync } from './hooks/useTabletopSync';
import { WindowSwitcherBar } from './components/WindowSwitcherBar';
import { BrowserTabBar } from './components/BrowserTabBar';
import { MasterDashboard } from './components/MasterDashboard';
import { PlayerView } from './components/PlayerView';
import { MapSelectorModal } from './components/MapSelectorModal';
import { CustomMapUploadModal } from './components/CustomMapUploadModal';
import { GridOverlayConfigModal } from './components/GridOverlayConfigModal';
import { AudioPlayerModal } from './components/AudioPlayerModal';
import { SfxSoundboardPanel } from './components/SfxSoundboardPanel';
import { InitiativeModal } from './components/InitiativeModal';
import { LayersManagementModal } from './components/LayersManagementModal';
import { ObjectLayerBindingModal } from './components/ObjectLayerBindingModal';
import { UnifiedAssetFolderModal } from './components/UnifiedAssetFolderModal';
import { MapVaultModal } from './components/MapVaultModal';
import { SaveTabToVaultModal } from './components/SaveTabToVaultModal';
import { ViewMode, MapItem, TabletopSessionState, MapVaultItem } from './types';
import { addMapToWorkspace, removeMapFromWorkspace } from './services/apiClient';
import { diskAssetAutoSync, DiskSyncState } from './services/diskAssetAutoSync';
import { tauriWindowManager } from './services/tauriWindowManager';
import { resetCorruptedSessionState } from './services/defaultSession';
import { mapLibraryCatalog } from './services/mapLibraryCatalog';
import { mapVaultService } from './services/mapVaultService';

export default function App() {
  const {
    session,
    loading,
    setCamera,
    setFog,
    setGrid,
    setMaps,
    healMapUrls,
    updateMapItem,
    setLayersConfig,
    updateLayerItem,
    setMapCategories,
    setPlayerBlackout,
    togglePlayerBlackout,
    addDrawingStroke,
    clearDrawings,
    addSpellTemplate,
    updateSpellTemplate,
    removeSpellTemplate,
    clearSpellTemplates,
    addAnimatedEffect,
    removeAnimatedEffect,
    syncLaserPointer,
    clearWorkspaceExceptMap,
    switchTab,
    createTab,
    duplicateTab,
    closeTab,
    renameTab,
    updateTabNotes,
    setPlayerTransition,
    openTabFromVault,
    placeVaultPortalOnMap,
  } = useTabletopSync();
  const [viewMode, setViewMode] = useState<ViewMode>('master');
  const [showEmergencyReset, setShowEmergencyReset] = useState<boolean>(false);

  // Show emergency reset button if loading takes more than 2.5 seconds
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowEmergencyReset(true), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowEmergencyReset(false);
    }
  }, [loading]);

  // Modal states
  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isGridModalOpen, setIsGridModalOpen] = useState<boolean>(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState<boolean>(false);
  const [isSfxModalOpen, setIsSfxModalOpen] = useState<boolean>(false);
  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState<boolean>(false);
  const [isLayersModalOpen, setIsLayersModalOpen] = useState<boolean>(false);
  const [isUnifiedAssetsModalOpen, setIsUnifiedAssetsModalOpen] = useState<boolean>(false);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState<boolean>(false);
  const [isSaveTabModalOpen, setIsSaveTabModalOpen] = useState<boolean>(false);
  const [vaultMapsCount, setVaultMapsCount] = useState<number>(() => mapVaultService.getAllItems().length);
  const [selectedObjectForLayer, setSelectedObjectForLayer] = useState<MapItem | null>(null);
  const [diskSyncStatus, setDiskSyncStatus] = useState<DiskSyncState | null>(null);

  // Subscribe to Map Vault updates for real-time count badges
  useEffect(() => {
    const unsub = mapVaultService.subscribe((items) => {
      setVaultMapsCount(items.length);
    });
    return unsub;
  }, []);

  // Auto-sync assets from disk watcher
  useEffect(() => {
    // Register update callbacks
    diskAssetAutoSync.registerCallbacks(
      (newMaps, categories) => {
        if (!session) return;
        // Save to the Map Library Catalog without flooding active canvas session
        mapLibraryCatalog.mergeLibraryMaps(newMaps, categories);
        
        // RECONCILE: Heal broken blob URLs or old paths for maps already on the active canvas AND all inactive tabs
        healMapUrls(newMaps);

        // Heal URLs for Vault Items globally across the system
        try {
          if (typeof mapVaultService.reconcileUrls === 'function') {
            mapVaultService.reconcileUrls(newMaps);
          }
        } catch (e) {
          console.warn('Could not reconcile vault URLs', e);
        }

        if (categories && categories.length > 0) {
          const mergedCats = Array.from(new Set([...(session.mapCategories || []), ...categories]));
          setMapCategories(mergedCats);
        }

        // If canvas is completely empty, activate the first discovered map
        if (session.maps.length === 0 && newMaps.length > 0) {
          const firstMap = newMaps[0];
          setMaps([firstMap], firstMap.id);
        }
      },
      (newProps) => {
        if (!session) return;
        mapLibraryCatalog.mergeLibraryMaps(newProps as MapItem[]);
      }
    );

    const unsubscribe = diskAssetAutoSync.subscribe((state) => {
      setDiskSyncStatus(state);
    });

    return () => unsubscribe();
  }, [session, setMaps, healMapUrls, setMapCategories]);

  // Robust route check for standalone player window popup across web and Tauri desktop
  const isStandalonePlayer = tauriWindowManager.isPlayerWindow();

  if (isStandalonePlayer) {
    return <PlayerView session={session} />;
  }

  if (loading || !session) {
    return (
      <div className="w-full h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs space-y-4 select-none">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <span>Загрузка движка AetherMap Master и проверка кэша сессии...</span>

        {showEmergencyReset && (
          <div className="mt-4 p-4 bg-zinc-900 border border-amber-500/40 rounded-2xl flex flex-col items-center space-y-2 max-w-sm text-center">
            <span className="text-amber-300 font-sans font-semibold text-sm">
              Сессия загружается дольше обычного?
            </span>
            <p className="text-[11px] text-zinc-400 font-sans">
              Если предыдущая сессия содержала слишком много объектов или поврежденные ссылки, сбросьте кэш стола.
            </p>
            <button
              onClick={async () => {
                await resetCorruptedSessionState();
                window.location.reload();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-sans rounded-xl text-xs transition-all shadow-md active:scale-95 mt-1"
            >
              ⚡ Экстренный сброс кэша стола
            </button>
          </div>
        )}
      </div>
    );
  }

  const activeMap = session.maps.find((m) => m.id === session.activeMapId);

  const handleOpenPlayerWindow = async () => {
    try {
      const opened = await tauriWindowManager.openPlayerWindow('/player');
      if (!opened) {
        setViewMode('player');
      }
    } catch (e) {
      console.warn('Could not open separate window, switching view mode:', e);
      setViewMode('player');
    }
  };

  const handleCustomMapUploaded = async (mapItem: MapItem) => {
    mapLibraryCatalog.mergeLibraryMaps([mapItem]);
    await addMapToWorkspace(mapItem);
    const nonBackgroundMaps = session.maps.filter((m) => m.layer === 'props' || m.layer === 'overhead');
    setMaps([mapItem, ...nonBackgroundMaps], mapItem.id);
  };

  const handleSelectActiveMap = (mapId: string, chosenMapItem?: MapItem) => {
    const existing = session.maps.find((m) => m.id === mapId);
    if (existing) {
      setMaps(session.maps, mapId);
      return;
    }

    const candidate = chosenMapItem || mapLibraryCatalog.getMaps().find((m) => m.id === mapId);
    if (candidate) {
      const nonBackgroundMaps = session.maps.filter((m) => m.layer === 'props' || m.layer === 'overhead');
      setMaps([candidate, ...nonBackgroundMaps], candidate.id);
    }
  };

  const handleRemoveMap = async (mapId: string) => {
    await removeMapFromWorkspace(mapId);
    mapLibraryCatalog.removeMap(mapId);
    const filtered = session.maps.filter((m) => m.id !== mapId);
    setMaps(filtered, filtered[0]?.id || null);
  };

  const handleUpdateMapCategory = (mapId: string, category: string) => {
    const updatedMaps = session.maps.map((m) =>
      m.id === mapId ? { ...m, category } : m
    );
    setMaps(updatedMaps, session.activeMapId);
  };

  const handleDuplicateMap = (mapItem: MapItem) => {
    const duplicated: MapItem = {
      ...mapItem,
      id: `map-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      name: `${mapItem.name} (Копия)`,
      position: {
        x: mapItem.position.x + 40,
        y: mapItem.position.y + 40,
      },
      zIndex: (mapItem.zIndex || 0) + 1,
    };
    const updated = [...session.maps, duplicated];
    setMaps(updated, duplicated.id);
    setSelectedObjectForLayer(duplicated);
  };

  const handleLoadFolderMaps = async (newMaps: MapItem[]) => {
    mapLibraryCatalog.mergeLibraryMaps(newMaps);
    if (session.maps.length === 0 && newMaps.length > 0) {
      const firstMap = newMaps[0];
      setMaps([firstMap], firstMap.id);
    }
  };

  const handleImportSessionState = (importedSession: Partial<TabletopSessionState>) => {
    if (importedSession.maps) {
      setMaps(importedSession.maps, importedSession.activeMapId || null);
    }
    if (importedSession.grid) setGrid(importedSession.grid);
    if (importedSession.fog) setFog(importedSession.fog);
    if (importedSession.layersConfig) setLayersConfig(importedSession.layersConfig);
    if (importedSession.mapCategories) setMapCategories(importedSession.mapCategories);
  };

  const handleOpenSubmapTab = (portalItem: MapItem) => {
    // 1. If portal is tied to a specific vault map ID, load it from vault
    const vaultId = portalItem.submapVaultId || portalItem.targetVaultMapId;
    if (vaultId) {
      const vaultItem = mapVaultService.getById(vaultId) || mapVaultService.getItem(vaultId);
      if (vaultItem) {
        openTabFromVault(vaultItem);
        return;
      }
    }

    // 2. Look for existing tab by vault ID or by target scene name
    const targetName = portalItem.targetVaultMapName || portalItem.name.replace(/^Вход:\s*/, '');
    const existingTab = session.tabs?.find(
      (t) =>
        (vaultId && (t as any).vaultMapId === vaultId) ||
        t.name.toLowerCase() === targetName.toLowerCase() ||
        t.name.toLowerCase() === portalItem.name.toLowerCase()
    );
    if (existingTab) {
      switchTab(existingTab.id);
      return;
    }

    // 3. Search Vault by matching name
    const vaultItemByName = mapVaultService.getAll().find(
      (v) => v.name.toLowerCase() === targetName.toLowerCase()
    );
    if (vaultItemByName) {
      openTabFromVault(vaultItemByName);
      return;
    }

    // 4. Fallback: create a blank new tab for this scene
    createTab(targetName, '🏰');
  };

  const activeWorkspaceTab = session.tabs?.find((t) => t.id === session.activeTabId) || session.tabs?.[0];

  return (
    <div className="w-full h-screen bg-zinc-950 flex flex-col overflow-hidden text-zinc-100 font-sans">
      {/* Top Header Navigation Bar */}
      <WindowSwitcherBar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onOpenPlayerWindow={handleOpenPlayerWindow}
        onOpenMapLibrary={() => setIsMapModalOpen(true)}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onOpenGridConfig={() => setIsGridModalOpen(true)}
        onOpenLayersConfig={() => setIsLayersModalOpen(true)}
        onOpenAudioPlayer={() => setIsAudioModalOpen(true)}
        onOpenSfxSoundboard={() => setIsSfxModalOpen(true)}
        onOpenInitiative={() => setIsInitiativeModalOpen(true)}
        onOpenUnifiedAssets={() => setIsUnifiedAssetsModalOpen(true)}
        gridEnabled={session.grid.enabled}
        onToggleGrid={() => setGrid({ enabled: !session.grid.enabled })}
        isSynced={true}
        activeMapName={activeMap?.name}
        playerBlackout={session.playerBlackout}
        onTogglePlayerBlackout={togglePlayerBlackout}
        diskSyncStatus={diskSyncStatus}
      />

      {/* Browser Tab Bar for Multiple Prepared Scenes & Maps */}
      {viewMode === 'master' && (
        <BrowserTabBar
          tabs={session.tabs || []}
          activeTabId={session.activeTabId || ''}
          playerTransition={session.playerTransition}
          onSwitchTab={switchTab}
          onCreateTab={(name, icon) => createTab(name, icon)}
          onDuplicateTab={duplicateTab}
          onCloseTab={closeTab}
          onRenameTab={renameTab}
          onUpdateTabNotes={updateTabNotes}
          onUpdateTransitionConfig={setPlayerTransition}
          onOpenMapCatalog={() => setIsMapModalOpen(true)}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onOpenVault={() => setIsVaultModalOpen(true)}
          onSaveCurrentTabToVault={() => setIsSaveTabModalOpen(true)}
        />
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 relative overflow-hidden">
        {viewMode === 'master' && (
          <MasterDashboard
            session={session}
            onUpdateCamera={setCamera}
            onUpdateMaps={(updated, activeId) => setMaps(updated, activeId)}
            onUpdateMapItem={updateMapItem}
            onUpdateFog={setFog}
            onUpdateGrid={setGrid}
            onTogglePlayerBlackout={togglePlayerBlackout}
            onUpdatePlayerBlackout={setPlayerBlackout}
            onAddDrawingStroke={addDrawingStroke}
            onClearDrawings={clearDrawings}
            onAddSpellTemplate={addSpellTemplate}
            onUpdateSpellTemplate={updateSpellTemplate}
            onRemoveSpellTemplate={removeSpellTemplate}
            onClearSpellTemplates={clearSpellTemplates}
            onAddAnimatedEffect={addAnimatedEffect}
            onRemoveAnimatedEffect={removeAnimatedEffect}
            onSyncLaserPointer={syncLaserPointer}
            onClearWorkspace={clearWorkspaceExceptMap}
            onOpenMapLibrary={() => setIsMapModalOpen(true)}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            onOpenGridConfig={() => setIsGridModalOpen(true)}
            onOpenLayersConfig={() => setIsLayersModalOpen(true)}
            onOpenObjectLayerBinding={(mapItem) => setSelectedObjectForLayer(mapItem)}
            onOpenAudioPlayer={() => setIsAudioModalOpen(true)}
            onOpenSfxSoundboard={() => setIsSfxModalOpen(true)}
            onOpenInitiative={() => setIsInitiativeModalOpen(true)}
            onOpenUnifiedAssets={() => setIsUnifiedAssetsModalOpen(true)}
            onOpenVault={() => setIsVaultModalOpen(true)}
            onOpenSaveTabToVault={() => setIsSaveTabModalOpen(true)}
            onOpenSubmapTab={handleOpenSubmapTab}
            vaultMapsCount={vaultMapsCount}
            onDuplicateMap={handleDuplicateMap}
            onDeleteMap={(id) => {
              handleRemoveMap(id);
              if (selectedObjectForLayer?.id === id) {
                setSelectedObjectForLayer(null);
              }
            }}
          />
        )}

        {viewMode === 'player' && <PlayerView session={session} />}
      </main>

      {/* Dialog Modals */}
      <MapSelectorModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        maps={session.maps}
        activeMapId={session.activeMapId}
        mapCategories={session.mapCategories}
        onSelectActiveMap={handleSelectActiveMap}
        onOpenUploadModal={() => setIsUploadModalOpen(true)}
        onRemoveMap={handleRemoveMap}
        onUpdateMapCategory={handleUpdateMapCategory}
        onUpdateCategories={setMapCategories}
      />

      <CustomMapUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onMapUploaded={handleCustomMapUploaded}
        categories={session.mapCategories}
      />

      <GridOverlayConfigModal
        isOpen={isGridModalOpen}
        onClose={() => setIsGridModalOpen(false)}
        grid={session.grid}
        onUpdateGrid={setGrid}
      />

      <AudioPlayerModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        onOpenSfxSoundboard={() => setIsSfxModalOpen(true)}
      />

      <SfxSoundboardPanel
        isOpen={isSfxModalOpen}
        onClose={() => setIsSfxModalOpen(false)}
      />

      <InitiativeModal
        isOpen={isInitiativeModalOpen}
        onClose={() => setIsInitiativeModalOpen(false)}
      />

      {/* Global Layer Hierarchy & Stack Modal */}
      <LayersManagementModal
        isOpen={isLayersModalOpen}
        onClose={() => setIsLayersModalOpen(false)}
        layersConfig={session.layersConfig}
        onUpdateLayersConfig={setLayersConfig}
        onUpdateLayerItem={updateLayerItem}
        session={session}
      />

      {/* Object Layer Binding Modal for Individual Map / Prop */}
      <ObjectLayerBindingModal
        isOpen={!!selectedObjectForLayer}
        onClose={() => setSelectedObjectForLayer(null)}
        mapItem={selectedObjectForLayer}
        layersConfig={session.layersConfig}
        onUpdateMapItem={updateMapItem}
        onDuplicateMap={handleDuplicateMap}
        onDeleteMap={(id) => {
          handleRemoveMap(id);
          setSelectedObjectForLayer(null);
        }}
        onOpenLayersConfig={() => setIsLayersModalOpen(true)}
      />

      {/* Unified Local Disk Asset Folder Modal */}
      <UnifiedAssetFolderModal
        isOpen={isUnifiedAssetsModalOpen}
        onClose={() => setIsUnifiedAssetsModalOpen(false)}
        session={session}
        onUpdateMaps={(maps) => setMaps(maps, session.activeMapId || maps[0]?.id || null)}
        onUpdateCategories={setMapCategories}
      />

      {/* Map Vault / Ready-Made Maps Repository Modal */}
      <MapVaultModal
        isOpen={isVaultModalOpen}
        onClose={() => setIsVaultModalOpen(false)}
        onOpenAsTab={(vaultItem) => openTabFromVault(vaultItem)}
        onPlacePortalOnMap={(vaultItem) => placeVaultPortalOnMap(vaultItem)}
        onOpenSaveCurrentTab={() => setIsSaveTabModalOpen(true)}
      />

      {/* Save Tab to Vault Modal */}
      {activeWorkspaceTab && (
        <SaveTabToVaultModal
          isOpen={isSaveTabModalOpen}
          onClose={() => setIsSaveTabModalOpen(false)}
          currentTab={activeWorkspaceTab}
          session={session}
          onSaved={(savedItem) => {
            // Re-render / update count
            setVaultMapsCount(mapVaultService.getAllItems().length);
          }}
        />
      )}
    </div>
  );
}
