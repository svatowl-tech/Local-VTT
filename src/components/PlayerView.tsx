import React, { useRef, useEffect, useState, memo } from 'react';
import { TabletopSessionState, MapItem } from '../types';
import { Maximize2, Tv, MousePointer, MousePointerClick, MapPin } from 'lucide-react';
import { MediaRenderer } from './MediaRenderer';
import { PlayerContentCardRenderer } from './PlayerContentCardRenderer';
import { FogCanvasRenderer } from './FogCanvasRenderer';
import { GridCanvasRenderer } from './GridCanvasRenderer';
import { DrawingCanvasLayer } from './DrawingCanvasLayer';
import { SpellTemplatesLayer } from './SpellTemplatesLayer';
import { AnimatedEffectsLayer } from './AnimatedEffectsLayer';
import { LaserPointerLayer } from './LaserPointerLayer';
import { PlayerBlackoutScreen } from './PlayerBlackoutScreen';
import { PlayerInitiative4SideHUD } from './PlayerInitiative4SideHUD';
import { PlayerSceneTransitionOverlay } from './PlayerSceneTransitionOverlay';
import { tauriWindowManager } from '../services/tauriWindowManager';
import {
  getLayerZIndex,
  getLayerOpacity,
  isLayerVisible,
  filterMapsByObjectLayer,
  getCustomLayers,
} from '../utils/layerHierarchy';

interface Props {
  session: TabletopSessionState | null;
}

export const PlayerView: React.FC<Props> = memo(({ session }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 1920, height: 1080 });
  const [isClickThrough, setIsClickThrough] = useState<boolean>(
    () => tauriWindowManager.getConfig().clickThrough
  );
  const [showStatusToast, setShowStatusToast] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = tauriWindowManager.subscribe((cfg) => {
      setIsClickThrough(cfg.clickThrough);
    });
    return () => unsubscribe();
  }, []);

  // Global hotkey F8 or Ctrl+Shift+C to toggle Click-Through Mode anytime
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        const nextState = !isClickThrough;
        tauriWindowManager.setClickThrough(nextState);
        setShowStatusToast(true);
        setTimeout(() => setShowStatusToast(false), 3000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isClickThrough]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({
            width: Math.round(width),
            height: Math.round(height),
          });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleClickThrough = () => {
    const nextState = !isClickThrough;
    tauriWindowManager.setClickThrough(nextState);
    setShowStatusToast(true);
    setTimeout(() => setShowStatusToast(false), 3000);
  };

  if (!session) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-zinc-500 font-mono text-sm space-y-3 select-none">
        <Tv className="w-10 h-10 animate-pulse text-amber-500" />
        <span>AetherMap Player Screen - Waiting for Master Signal...</span>
      </div>
    );
  }

  const {
    camera,
    maps,
    grid,
    fog,
    drawings = [],
    spellTemplates = [],
    animatedEffects = [],
    laserPointer = null,
  } = session;

  // Calculate viewport transformation matrix to match camera frame exactly
  const scaleX = containerSize.width / (camera.width || 1920);
  const scaleY = containerSize.height / (camera.height || 1080);
  const scale = Math.min(scaleX, scaleY);

  const cx = camera.x + camera.width / 2;
  const cy = camera.y + camera.height / 2;

  // Group maps by assigned layer (filter out hidden maps)
  const visibleMaps = maps.filter((m) => !m.hiddenFromPlayers);
  const backgroundMaps = filterMapsByObjectLayer(visibleMaps, 'background');
  const propsMaps = filterMapsByObjectLayer(visibleMaps, 'props');
  const overheadMaps = filterMapsByObjectLayer(visibleMaps, 'overhead');
  const aboveFogMaps = filterMapsByObjectLayer(visibleMaps, 'above-fog');

  // Dynamic Layer Z-Indices from layersConfig
  const layersConfig = session.layersConfig;
  const mapsZIndex = getLayerZIndex('maps', layersConfig);
  const propsZIndex = getLayerZIndex('props', layersConfig);
  const gridZIndex = getLayerZIndex('grid', layersConfig);
  const drawingsZIndex = getLayerZIndex('drawings', layersConfig);
  const effectsZIndex = getLayerZIndex('effects', layersConfig);
  const spellsZIndex = getLayerZIndex('spells', layersConfig);
  const overheadZIndex = getLayerZIndex('overhead', layersConfig);
  const fogZIndex = getLayerZIndex('fog', layersConfig);
  const laserZIndex = getLayerZIndex('laser', layersConfig);

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

  const renderPlayerMapList = (items: MapItem[]) => {
    return items
      .slice()
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map((mapItem) => {
        const isPortal = !!mapItem.isSubmapPortal;
        return (
          <div
            key={mapItem.id}
            className={`absolute transform-gpu ${isPortal ? 'overflow-visible' : 'overflow-hidden'}`}
            style={{
              left: `${mapItem.position.x}px`,
              top: `${mapItem.position.y}px`,
              width: `${mapItem.width * mapItem.scale.x}px`,
              height: `${mapItem.height * mapItem.scale.y}px`,
              transform: `rotate(${mapItem.rotation}deg)`,
              zIndex: mapItem.zIndex,
              opacity: mapItem.opacity,
              contain: 'layout style',
            }}
          >
            {mapItem.isContentCard || mapItem.type === 'card' ? (
              <PlayerContentCardRenderer mapItem={mapItem} />
            ) : isPortal ? (
              <div className="w-full h-full flex flex-col items-center justify-center relative select-none pointer-events-auto">
                {/* Pulsing red radar rings */}
                <div className="absolute w-12 h-12 rounded-full bg-rose-600/20 border border-rose-500/50 animate-ping opacity-75" />
                <div className="absolute w-8 h-8 rounded-full bg-rose-600/30 border border-rose-500/60 animate-pulse" />
                
                {/* Thin detailed red pin */}
                <div className="relative z-10 filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                  <MapPin className="w-9 h-9 text-rose-500 fill-rose-950/40 stroke-[1.5]" />
                </div>

                {/* Floating labels with interactive destination name */}
                <div className="absolute top-full mt-2 bg-zinc-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-200 text-xs font-bold whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.9)] flex items-center space-x-1.5 filter drop-shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>{mapItem.targetVaultMapName || mapItem.name}</span>
                </div>
              </div>
            ) : (
              <MediaRenderer mapItem={mapItem} className="w-full h-full object-cover" />
            )}
          </div>
        );
      });
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full bg-black relative overflow-hidden select-none flex items-center justify-center cursor-none group ${
        isClickThrough ? 'pointer-events-none' : ''
      }`}
      style={{ contain: 'strict' }}
    >
      {/* Projection Stage Canvas */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-0 w-full h-full transform-gpu origin-top-left"
          style={{
            transform: `translate3d(${containerSize.width / 2}px, ${containerSize.height / 2}px, 0) scale(${scale}) rotate(${-camera.rotation || 0}deg) translate3d(${-cx}px, ${-cy}px, 0)`,
            willChange: 'transform',
          }}
        >
          {/* 1. Слой карт / Задний план (maps) */}
          {mapsVisible && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: mapsZIndex, opacity: mapsOpacity }}
            >
              {renderPlayerMapList(backgroundMaps)}
            </div>
          )}

          {/* 2. Слой объектов стола и токенов (props) */}
          {propsVisible && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: propsZIndex, opacity: propsOpacity }}
            >
              {renderPlayerMapList(propsMaps)}
            </div>
          )}

          {/* 3. Сетка (grid) */}
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
                isMaster={false}
              />
            </div>
          )}

          {/* 6. Слой заклинаний и шаблонов AoE (spells) */}
          {spellsVisible && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: spellsZIndex, opacity: spellsOpacity }}
            >
              <SpellTemplatesLayer spellTemplates={spellTemplates} isMaster={false} />
            </div>
          )}

          {/* 7. Верхний слой / Крыши и навесы (overhead) */}
          {overheadVisible && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ zIndex: overheadZIndex, opacity: overheadOpacity }}
            >
              {renderPlayerMapList(overheadMaps)}
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
              />
            </div>
          )}

          {/* 9. Парящие объекты над туманом (above-fog maps) & Лазерная указка (laser) */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: laserZIndex }}>
            {renderPlayerMapList(aboveFogMaps)}
            <LaserPointerLayer laser={laserPointer} />
          </div>

          {/* 10. Пользовательские кастомные слои (custom layers) */}
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
                {renderPlayerMapList(customMaps)}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. 4-Side Perimeter Initiative HUD for Tabletop TV/Projector */}
      <PlayerInitiative4SideHUD sessionEncounter={session.initiative} />

      {/* 8. Master Preparation Screen / Player Blackout Curtain */}
      {session.playerBlackout?.enabled && (
        <PlayerBlackoutScreen blackout={session.playerBlackout} />
      )}

      {/* 9. Cinematic Scene Transition Crossfade / Veil */}
      <PlayerSceneTransitionOverlay session={session} />

      {/* Status Notification Toast on Mode Switch */}
      {showStatusToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-zinc-950/90 text-zinc-100 px-4 py-2 rounded-xl border border-zinc-700 shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs font-mono z-50 animate-in fade-in duration-200 pointer-events-none">
          {isClickThrough ? (
            <>
              <MousePointer className="w-4 h-4 text-emerald-400" />
              <span>
                <strong className="text-emerald-400">СКВОЗНОЙ КЛИК ВКЛЮЧЕН</strong>: Клики
                проходят на рабочий стол (F8 для выкл)
              </span>
            </>
          ) : (
            <>
              <MousePointerClick className="w-4 h-4 text-amber-400" />
              <span>
                <strong className="text-amber-400">СКВОЗНОЙ КЛИК ВЫКЛЮЧЕН</strong>: Окно
                захватывает курсор (F8 для вкл)
              </span>
            </>
          )}
        </div>
      )}

      {/* Hover Overlay Controls for Master/Projector Setup */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 bg-zinc-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-300 z-50 select-none pointer-events-auto">
        <div className="flex items-center space-x-1.5 pr-1 border-r border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono text-[11px] text-zinc-400">ПРОЕКЦИЯ</span>
        </div>

        {/* Click-Through Toggle Button */}
        <button
          onClick={handleToggleClickThrough}
          className={`px-2 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors ${
            isClickThrough
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
          }`}
          title="Сквозной клик (F8): разрешает управлять рабочим столом и окнами под проекцией"
        >
          {isClickThrough ? (
            <>
              <MousePointer className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">Клик сквозь: ВКЛ</span>
            </>
          ) : (
            <>
              <MousePointerClick className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[11px]">Клик сквозь: ВЫКЛ</span>
            </>
          )}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-200 transition-colors"
          title="Полноэкранный режим (F11 / Fullscreen)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

