import { useState, useEffect, useCallback, useRef } from 'react';
import {
  TabletopSessionState,
  CameraFrame,
  FogState,
  GridSettings,
  MapItem,
  DrawingStroke,
  SpellTemplate,
  AnimatedEffect,
  LaserPointer,
  LayerStackConfig,
  TabletopLayerId,
  WorkspaceTab,
  PlayerTransitionConfig,
  MapVaultItem,
} from '../types';
import { mapVaultService } from '../services/mapVaultService';
import { fetchSessionState, updateSessionState } from '../services/apiClient';
import { getLocalSessionState, saveLocalSessionState, getSyncMemorySession, DEFAULT_LAYERS_CONFIG } from '../services/defaultSession';
import {
  ensureTabsIntegrity,
  extractTabSnapshot,
  applyTabToSession,
  createBlankTab,
  createTabFromMap,
  duplicateTabState,
  DEFAULT_PLAYER_TRANSITION,
} from '../services/tabStateManager';
import { applyElementalInteraction } from '../services/elementalPhysicsEngine';

const CHANNEL_NAME = 'aethermap_sync_channel';
const PERSIST_DEBOUNCE_MS = 300; // Increased debounce to save battery & CPU on low-end laptops

export function useTabletopSync() {
  const [session, setSession] = useState<TabletopSessionState>(() => ensureTabsIntegrity(getSyncMemorySession()));
  const [loading, setLoading] = useState<boolean>(true);

  const sessionRef = useRef<TabletopSessionState>(session);
  sessionRef.current = session;

  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastChecksumRef = useRef<string>('');
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initial load from IndexedDB or Backend
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const initial = await fetchSessionState();
        if (mounted) {
          const validated = ensureTabsIntegrity(initial);
          setSession(validated);
          lastChecksumRef.current = initial.checksum || '';
          setLoading(false);
        }
      } catch (e) {
        if (mounted) {
          const local = await getLocalSessionState();
          const validated = ensureTabsIntegrity(local);
          setSession(validated);
          setLoading(false);
        }
      }
    }

    init();

    // BroadcastChannel for instant sub-millisecond local tab/window state broadcast (0 CPU)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          const newSession = event.data.session as TabletopSessionState;
          if (newSession && newSession.updatedAt !== sessionRef.current.updatedAt) {
            setSession(ensureTabsIntegrity(newSession));
          }
        }
      };
    }

    // Smart, lightweight background sync fallback (pauses when tab is in background)
    const interval = setInterval(async () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      try {
        const latest = await fetchSessionState();
        if (latest.checksum && latest.checksum !== lastChecksumRef.current) {
          lastChecksumRef.current = latest.checksum;
          setSession(ensureTabsIntegrity(latest));
        }
      } catch (err) {
        // Silent fail in background
      }
    }, 6000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (channelRef.current) {
        channelRef.current.close();
      }
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, []);

  // Internal helper to broadcast and debounce persist
  const applyStateUpdate = useCallback((
    updater: (prev: TabletopSessionState) => TabletopSessionState,
    partialUpdateForApi: (newSession: TabletopSessionState) => Partial<TabletopSessionState>
  ) => {
    setSession((prev) => {
      let newSession = updater(prev);
      newSession = ensureTabsIntegrity(newSession);

      // Keep active tab state in 100% sync with active workspace
      const activeTabId = newSession.activeTabId;
      if (activeTabId && newSession.tabs) {
        const activeTabIdx = newSession.tabs.findIndex((t) => t.id === activeTabId);
        if (activeTabIdx !== -1) {
          const updatedTab: WorkspaceTab = {
            ...newSession.tabs[activeTabIdx],
            maps: newSession.maps,
            activeMapId: newSession.activeMapId,
            camera: newSession.camera,
            fog: newSession.fog,
            grid: newSession.grid,
            drawings: newSession.drawings || [],
            spellTemplates: newSession.spellTemplates || [],
            animatedEffects: newSession.animatedEffects || [],
            layersConfig: newSession.layersConfig,
            updatedAt: Date.now(),
          };
          const newTabs = [...newSession.tabs];
          newTabs[activeTabIdx] = updatedTab;
          newSession = { ...newSession, tabs: newTabs };
        }
      }

      newSession.updatedAt = Date.now();

      // Instantly broadcast to other windows (Player View) with zero serialization overhead
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'STATE_UPDATE',
          session: newSession,
        });
      }

      // Debounce disk I/O & network calls
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
      persistTimeoutRef.current = setTimeout(() => {
        saveLocalSessionState(newSession).catch(() => {});
        updateSessionState(partialUpdateForApi(newSession)).catch(() => {});
      }, PERSIST_DEBOUNCE_MS);

      return newSession;
    });
  }, []);

  // Public broadcast manually
  const broadcastState = useCallback((newSession: TabletopSessionState) => {
    applyStateUpdate(() => newSession, (s) => s);
  }, [applyStateUpdate]);

  // Tab Operations
  const switchTab = useCallback((targetTabId: string) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        if (safe.activeTabId === targetTabId) return safe;

        const currentActiveTab = safe.tabs?.find((t) => t.id === safe.activeTabId);
        const targetTab = safe.tabs?.find((t) => t.id === targetTabId);
        if (!targetTab) return safe;

        // Snapshot current workspace into current active tab
        const updatedTabs = (safe.tabs || []).map((t) =>
          t.id === safe.activeTabId ? extractTabSnapshot(safe, t.id, currentActiveTab) : t
        );

        const targetTabFresh = updatedTabs.find((t) => t.id === targetTabId) || targetTab;
        const switched = applyTabToSession(
          {
            ...safe,
            tabs: updatedTabs,
          },
          targetTabFresh
        );

        return switched;
      },
      (s) => ({
        activeTabId: s.activeTabId,
        maps: s.maps,
        activeMapId: s.activeMapId,
        camera: s.camera,
        fog: s.fog,
        grid: s.grid,
        drawings: s.drawings,
        spellTemplates: s.spellTemplates,
        animatedEffects: s.animatedEffects,
        layersConfig: s.layersConfig,
        tabs: s.tabs,
      })
    );
  }, [applyStateUpdate]);

  const createTab = useCallback((name?: string, icon?: string, fromMap?: MapItem) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const currentActiveTab = safe.tabs?.find((t) => t.id === safe.activeTabId);

        // Snapshot current active tab
        const updatedTabs = (safe.tabs || []).map((t) =>
          t.id === safe.activeTabId ? extractTabSnapshot(safe, t.id, currentActiveTab) : t
        );

        const newTab = fromMap ? createTabFromMap(fromMap, name) : createBlankTab(name, icon);
        const finalTabs = [...updatedTabs, newTab];

        return applyTabToSession(
          {
            ...safe,
            tabs: finalTabs,
          },
          newTab
        );
      },
      (s) => ({
        activeTabId: s.activeTabId,
        maps: s.maps,
        activeMapId: s.activeMapId,
        camera: s.camera,
        fog: s.fog,
        grid: s.grid,
        drawings: s.drawings,
        spellTemplates: s.spellTemplates,
        animatedEffects: s.animatedEffects,
        layersConfig: s.layersConfig,
        tabs: s.tabs,
      })
    );
  }, [applyStateUpdate]);

  const duplicateTab = useCallback((tabId: string) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const sourceTab = (safe.tabs || []).find((t) => t.id === tabId);
        if (!sourceTab) return safe;

        const currentActiveTab = safe.tabs?.find((t) => t.id === safe.activeTabId);
        const updatedTabs = (safe.tabs || []).map((t) =>
          t.id === safe.activeTabId ? extractTabSnapshot(safe, t.id, currentActiveTab) : t
        );

        const freshSource = updatedTabs.find((t) => t.id === tabId) || sourceTab;
        const clonedTab = duplicateTabState(freshSource);
        const finalTabs = [...updatedTabs, clonedTab];

        return applyTabToSession(
          {
            ...safe,
            tabs: finalTabs,
          },
          clonedTab
        );
      },
      (s) => ({
        activeTabId: s.activeTabId,
        maps: s.maps,
        activeMapId: s.activeMapId,
        camera: s.camera,
        fog: s.fog,
        grid: s.grid,
        drawings: s.drawings,
        spellTemplates: s.spellTemplates,
        animatedEffects: s.animatedEffects,
        layersConfig: s.layersConfig,
        tabs: s.tabs,
      })
    );
  }, [applyStateUpdate]);

  const closeTab = useCallback((tabId: string) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const currentTabs = safe.tabs || [];
        if (currentTabs.length <= 1) return safe; // Keep at least 1 tab

        const closingIndex = currentTabs.findIndex((t) => t.id === tabId);
        if (closingIndex === -1) return safe;

        const filteredTabs = currentTabs.filter((t) => t.id !== tabId);

        if (safe.activeTabId === tabId) {
          const nextActiveIndex = Math.max(0, closingIndex - 1);
          const nextTab = filteredTabs[nextActiveIndex] || filteredTabs[0];
          return applyTabToSession(
            {
              ...safe,
              tabs: filteredTabs,
            },
            nextTab
          );
        }

        return {
          ...safe,
          tabs: filteredTabs,
        };
      },
      (s) => ({
        activeTabId: s.activeTabId,
        maps: s.maps,
        activeMapId: s.activeMapId,
        camera: s.camera,
        fog: s.fog,
        grid: s.grid,
        drawings: s.drawings,
        spellTemplates: s.spellTemplates,
        animatedEffects: s.animatedEffects,
        layersConfig: s.layersConfig,
        tabs: s.tabs,
      })
    );
  }, [applyStateUpdate]);

  const renameTab = useCallback((tabId: string, name: string, icon?: string, color?: string) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const updatedTabs = (safe.tabs || []).map((t) =>
          t.id === tabId
            ? {
                ...t,
                name: name.trim() || t.name,
                icon: icon !== undefined ? icon : t.icon,
                color: color !== undefined ? color : t.color,
                updatedAt: Date.now(),
              }
            : t
        );
        return {
          ...safe,
          tabs: updatedTabs,
        };
      },
      (s) => ({ tabs: s.tabs })
    );
  }, [applyStateUpdate]);

  const updateTabNotes = useCallback((tabId: string, notes: string) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const updatedTabs = (safe.tabs || []).map((t) =>
          t.id === tabId ? { ...t, notes, updatedAt: Date.now() } : t
        );
        return {
          ...safe,
          tabs: updatedTabs,
        };
      },
      (s) => ({ tabs: s.tabs })
    );
  }, [applyStateUpdate]);

  const reorderTabs = useCallback((newTabs: WorkspaceTab[]) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        tabs: newTabs,
      }),
      (s) => ({ tabs: s.tabs })
    );
  }, [applyStateUpdate]);

  const setPlayerTransition = useCallback((configPartial: Partial<PlayerTransitionConfig>) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        playerTransition: {
          ...(prev.playerTransition || DEFAULT_PLAYER_TRANSITION),
          ...configPartial,
        },
      }),
      (s) => ({ playerTransition: s.playerTransition })
    );
  }, [applyStateUpdate]);

  // Open a saved Vault Map as a workspace tab
  const openTabFromVault = useCallback((vaultItem: MapVaultItem) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const currentTabs = safe.tabs || [];
        const currentActiveTab = currentTabs.find((t) => t.id === safe.activeTabId);

        // 1. Snapshot the CURRENT active tab before navigating away
        const tabsWithSavedActive = currentTabs.map((t) =>
          t.id === safe.activeTabId ? extractTabSnapshot(safe, t.id, currentActiveTab) : t
        );

        // 2. Check if a tab with this vault map id or matching name is already open
        const existingTab = tabsWithSavedActive.find(
          (t) => (t as any).vaultMapId === vaultItem.id || t.name === vaultItem.name
        );

        if (existingTab) {
          return applyTabToSession(
            {
              ...safe,
              tabs: tabsWithSavedActive,
            },
            existingTab
          );
        }

        // 3. Generate a new workspace tab from the saved vault snapshot
        const newTabId = `tab-vault-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const freshTab: WorkspaceTab = {
          ...JSON.parse(JSON.stringify(vaultItem.tabSnapshot)),
          id: newTabId,
          name: vaultItem.name,
          color: vaultItem.previewColor || '#f59e0b',
          notes: vaultItem.description || vaultItem.tabSnapshot.notes || '',
          updatedAt: Date.now(),
        };
        (freshTab as any).vaultMapId = vaultItem.id;

        const updatedTabs = [...tabsWithSavedActive, freshTab];
        return applyTabToSession(
          {
            ...safe,
            tabs: updatedTabs,
          },
          freshTab
        );
      },
      (s) => ({
        activeTabId: s.activeTabId,
        maps: s.maps,
        activeMapId: s.activeMapId,
        camera: s.camera,
        fog: s.fog,
        grid: s.grid,
        drawings: s.drawings,
        spellTemplates: s.spellTemplates,
        animatedEffects: s.animatedEffects,
        layersConfig: s.layersConfig,
        tabs: s.tabs,
      })
    );
  }, [applyStateUpdate]);

  // Place a Map Vault object/portal directly on the active canvas
  const placeVaultPortalOnMap = useCallback((vaultItem: MapVaultItem, atPosition?: { x: number; y: number }) => {
    applyStateUpdate(
      (prev) => {
        const safe = ensureTabsIntegrity(prev);
        const spawnX = atPosition?.x ?? (safe.camera ? Math.round(safe.camera.x) : 0);
        const spawnY = atPosition?.y ?? (safe.camera ? Math.round(safe.camera.y) : 0);

        const portalItem = mapVaultService.createPortalMapItem(vaultItem, {
          x: spawnX,
          y: spawnY,
        });

        const newMaps = [...safe.maps, portalItem];
        const currentActiveTab = safe.tabs?.find((t) => t.id === safe.activeTabId);
        const updatedTabs = (safe.tabs || []).map((t) =>
          t.id === safe.activeTabId ? { ...t, maps: newMaps, activeMapId: portalItem.id, updatedAt: Date.now() } : t
        );

        return {
          ...safe,
          tabs: updatedTabs,
          maps: newMaps,
          activeMapId: portalItem.id,
        };
      },
      (s) => ({ maps: s.maps, activeMapId: s.activeMapId, tabs: s.tabs })
    );
  }, [applyStateUpdate]);

  // Update camera frame
  const setCamera = useCallback((cameraPartial: Partial<CameraFrame>) => {
    applyStateUpdate(
      (prev) => ({ ...prev, camera: { ...prev.camera, ...cameraPartial } }),
      (s) => ({ camera: s.camera })
    );
  }, [applyStateUpdate]);

  // Update fog (with Rust optimization offload)
  const setFog = useCallback(async (fogPartial: Partial<FogState>) => {
    if (fogPartial.history && fogPartial.history.length > 50) {
      try {
        // @ts-ignore
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          const { invoke } = await import('@tauri-apps/api/core');
          const optimizedHistory = await invoke<any[]>('optimize_fog', {
            history: fogPartial.history,
          });
          if (optimizedHistory && optimizedHistory.length < fogPartial.history.length) {
            fogPartial.history = optimizedHistory;
          }
        }
      } catch (err) {
        // Fallback
      }
    }

    applyStateUpdate(
      (prev) => ({ ...prev, fog: { ...prev.fog, ...fogPartial } }),
      (s) => ({ fog: s.fog })
    );
  }, [applyStateUpdate]);

  // Update grid
  const setGrid = useCallback((gridPartial: Partial<GridSettings>) => {
    applyStateUpdate(
      (prev) => ({ ...prev, grid: { ...prev.grid, ...gridPartial } }),
      (s) => ({ grid: s.grid })
    );
  }, [applyStateUpdate]);

  // Heal URLs across all tabs and current maps
  const healMapUrls = useCallback((freshMaps: MapItem[]) => {
    applyStateUpdate(
      (prev) => {
        let changed = false;

        const updateMapArray = (oldMaps: MapItem[]) => {
          return oldMaps.map((existingMap) => {
            const freshMap = freshMaps.find((m) => m.name === existingMap.name);
            if (freshMap && (existingMap.url !== freshMap.url || existingMap.thumbnailUrl !== freshMap.thumbnailUrl)) {
              changed = true;
              return { ...existingMap, url: freshMap.url, thumbnailUrl: freshMap.thumbnailUrl || freshMap.url };
            }
            return existingMap;
          });
        };

        const newMaps = updateMapArray(prev.maps);
        const newTabs = (prev.tabs || []).map(tab => ({
          ...tab,
          maps: updateMapArray(tab.maps || [])
        }));

        if (!changed) return prev;

        return {
          ...prev,
          maps: newMaps,
          tabs: newTabs
        };
      },
      (s) => ({ maps: s.maps, tabs: s.tabs })
    );
  }, [applyStateUpdate]);

  // Update maps array or positions
  const setMaps = useCallback((maps: MapItem[], activeMapId?: string | null) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        maps,
        activeMapId: activeMapId !== undefined ? activeMapId : prev.activeMapId,
      }),
      (s) => ({ maps: s.maps, activeMapId: s.activeMapId })
    );
  }, [applyStateUpdate]);

  // Update map categories list
  const setMapCategories = useCallback((mapCategories: string[]) => {
    applyStateUpdate(
      (prev) => ({ ...prev, mapCategories }),
      (s) => ({ mapCategories: s.mapCategories })
    );
  }, [applyStateUpdate]);

  // Drawing strokes
  const addDrawingStroke = useCallback((stroke: DrawingStroke) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        drawings: [...(prev.drawings || []), stroke],
      }),
      (s) => ({ drawings: s.drawings })
    );
  }, [applyStateUpdate]);

  const clearDrawings = useCallback(() => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        drawings: [],
      }),
      () => ({ drawings: [] })
    );
  }, [applyStateUpdate]);

  // Spell templates
  const addSpellTemplate = useCallback((template: SpellTemplate) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        spellTemplates: [...(prev.spellTemplates || []), template],
      }),
      (s) => ({ spellTemplates: s.spellTemplates })
    );
  }, [applyStateUpdate]);

  const updateSpellTemplate = useCallback((id: string, partial: Partial<SpellTemplate>) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        spellTemplates: (prev.spellTemplates || []).map((t) =>
          t.id === id ? { ...t, ...partial } : t
        ),
      }),
      (s) => ({ spellTemplates: s.spellTemplates })
    );
  }, [applyStateUpdate]);

  const removeSpellTemplate = useCallback((id: string) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        spellTemplates: (prev.spellTemplates || []).filter((t) => t.id !== id),
      }),
      (s) => ({ spellTemplates: s.spellTemplates })
    );
  }, [applyStateUpdate]);

  const clearSpellTemplates = useCallback(() => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        spellTemplates: [],
      }),
      () => ({ spellTemplates: [] })
    );
  }, [applyStateUpdate]);

  // Clear workspace of everything except the base map(s) and player camera
  const clearWorkspaceExceptMap = useCallback(() => {
    applyStateUpdate(
      (prev) => {
        const activeMapId = prev.activeMapId;
        let keptMaps = prev.maps.filter(
          (m) => m.id === activeMapId || m.layer === 'background'
        );
        if (keptMaps.length === 0 && prev.maps.length > 0) {
          keptMaps = [prev.maps[0]];
        }
        return {
          ...prev,
          maps: keptMaps,
          drawings: [],
          spellTemplates: [],
          animatedEffects: [],
          laserPointer: null,
        };
      },
      (s) => ({
        maps: s.maps,
        drawings: s.drawings,
        spellTemplates: s.spellTemplates,
        animatedEffects: s.animatedEffects,
        laserPointer: s.laserPointer,
      })
    );
  }, [applyStateUpdate]);

  // Animated effects with elemental clustering and physics interaction
  const addAnimatedEffect = useCallback((effect: AnimatedEffect) => {
    applyStateUpdate(
      (prev) => {
        const currentEffects = prev.animatedEffects || [];
        const result = applyElementalInteraction(currentEffects, effect);
        return {
          ...prev,
          animatedEffects: result.updatedEffects,
        };
      },
      (s) => ({ animatedEffects: s.animatedEffects })
    );
  }, [applyStateUpdate]);

  const removeAnimatedEffect = useCallback((id: string) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        animatedEffects: (prev.animatedEffects || []).filter((e) => e.id !== id),
      }),
      (s) => ({ animatedEffects: s.animatedEffects })
    );
  }, [applyStateUpdate]);

  // Real-time laser pointer
  const syncLaserPointer = useCallback((laser: LaserPointer | null) => {
    setSession((prev) => {
      const newSession = { ...prev, laserPointer: laser, updatedAt: Date.now() };
      if (channelRef.current) {
        channelRef.current.postMessage({
          type: 'STATE_UPDATE',
          session: newSession,
        });
      }
      return newSession;
    });
  }, []);

  // Player Screen Blackout / Master Preparation Screen Curtain
  const setPlayerBlackout = useCallback((blackoutPartial: Partial<TabletopSessionState['playerBlackout']>) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        playerBlackout: {
          ...(prev.playerBlackout || {
            enabled: false,
            title: 'Мастер подготавливает карту...',
            subtitle: 'Пожалуйста, подождите. Идет расстановка поля битвы и декораций',
            preset: 'prep',
          }),
          ...blackoutPartial,
        },
      }),
      (s) => ({ playerBlackout: s.playerBlackout })
    );
  }, [applyStateUpdate]);

  const togglePlayerBlackout = useCallback(() => {
    applyStateUpdate(
      (prev) => {
        const current = prev.playerBlackout || {
          enabled: false,
          title: 'Мастер подготавливает карту...',
          subtitle: 'Пожалуйста, подождите. Идет расстановка поля битвы и декораций',
          preset: 'prep',
        };
        return {
          ...prev,
          playerBlackout: {
            ...current,
            enabled: !current.enabled,
          },
        };
      },
      (s) => ({ playerBlackout: s.playerBlackout })
    );
  }, [applyStateUpdate]);

  const setLayersConfig = useCallback((layersConfig: LayerStackConfig) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        layersConfig,
      }),
      (s) => ({ layersConfig: s.layersConfig })
    );
  }, [applyStateUpdate]);

  const updateLayerItem = useCallback((layerId: TabletopLayerId, partial: Partial<{ visible: boolean; locked: boolean; opacity: number; order: number }>) => {
    applyStateUpdate(
      (prev) => {
        const currentLayers = prev.layersConfig?.layers || DEFAULT_LAYERS_CONFIG.layers;
        const updatedLayers = currentLayers.map((l) =>
          l.id === layerId ? { ...l, ...partial } : l
        );
        return {
          ...prev,
          layersConfig: { layers: updatedLayers },
        };
      },
      (s) => ({ layersConfig: s.layersConfig })
    );
  }, [applyStateUpdate]);

  const updateMapItem = useCallback((mapId: string, partial: Partial<MapItem>) => {
    applyStateUpdate(
      (prev) => ({
        ...prev,
        maps: prev.maps.map((m) => (m.id === mapId ? { ...m, ...partial } : m)),
      }),
      (s) => ({ maps: s.maps })
    );
  }, [applyStateUpdate]);

  return {
    session,
    loading,
    setCamera,
    setFog,
    setGrid,
    setMaps,
    healMapUrls,
    setMapCategories,
    setPlayerBlackout,
    togglePlayerBlackout,
    setLayersConfig,
    updateLayerItem,
    updateMapItem,
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
    broadcastState,
    // Tab actions
    switchTab,
    createTab,
    duplicateTab,
    closeTab,
    renameTab,
    updateTabNotes,
    reorderTabs,
    setPlayerTransition,
    // Vault actions
    openTabFromVault,
    placeVaultPortalOnMap,
  };
}

