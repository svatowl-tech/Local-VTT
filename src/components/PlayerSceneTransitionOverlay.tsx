import React, { useEffect, useState, useRef } from 'react';
import { TabletopSessionState, WorkspaceTab } from '../types';

interface PlayerSceneTransitionOverlayProps {
  session: TabletopSessionState;
}

export const PlayerSceneTransitionOverlay: React.FC<PlayerSceneTransitionOverlayProps> = ({
  session,
}) => {
  const transitionConfig = session.playerTransition || {
    enabled: true,
    type: 'cinematic-fade',
    durationMs: 500,
    showLocationTitle: true,
  };

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [veilOpacity, setVeilOpacity] = useState(0);
  const [locationTitle, setLocationTitle] = useState('');
  const [locationIcon, setLocationIcon] = useState('🗺️');

  const lastTabIdRef = useRef<string | null>(null);
  const isFirstMountRef = useRef<boolean>(true);

  const activeTab: WorkspaceTab | undefined =
    session.tabs?.find((t) => t.id === session.activeTabId) ||
    session.tabs?.[0];

  useEffect(() => {
    const currentTabId = session.activeTabId || 'default';

    // Skip transition on initial load to immediately display the view
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      lastTabIdRef.current = currentTabId;
      return;
    }

    if (lastTabIdRef.current && lastTabIdRef.current !== currentTabId && transitionConfig.enabled) {
      const duration = transitionConfig.durationMs || 500;
      const halfDuration = Math.max(100, Math.floor(duration / 2));

      const tabTitle =
        activeTab?.name ||
        session.maps.find((m) => m.id === session.activeMapId)?.name ||
        'Новая локация';
      const tabIcon = activeTab?.icon || '🗺️';

      setLocationTitle(tabTitle);
      setLocationIcon(tabIcon);
      setIsTransitioning(true);

      // Phase 1: Fade to deep darkness
      setVeilOpacity(1);

      // Phase 2: Fade back in to show new scene
      const fadeOutTimer = setTimeout(() => {
        setVeilOpacity(0);
      }, halfDuration);

      // Phase 3: Cleanup overlay
      const endTimer = setTimeout(() => {
        setIsTransitioning(false);
      }, duration + 100);

      lastTabIdRef.current = currentTabId;

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(endTimer);
      };
    }

    lastTabIdRef.current = currentTabId;
  }, [session.activeTabId, transitionConfig.enabled, transitionConfig.durationMs, activeTab, session.maps, session.activeMapId]);

  if (!isTransitioning && veilOpacity === 0) {
    return null;
  }

  const durationSec = ((transitionConfig.durationMs || 500) / 2000).toFixed(2);

  return (
    <div
      id="player-scene-transition-overlay"
      className="fixed inset-0 z-[9990] pointer-events-none flex items-center justify-center bg-black transition-opacity ease-in-out"
      style={{
        opacity: veilOpacity,
        transitionDuration: `${durationSec}s`,
      }}
    >
      {transitionConfig.showLocationTitle && locationTitle && (
        <div
          id="player-scene-transition-title"
          className="text-center px-6 py-4 transform transition-transform duration-500 max-w-2xl"
          style={{
            transform: veilOpacity === 1 ? 'scale(1)' : 'scale(0.95)',
          }}
        >
          <div className="text-4xl mb-3 animate-pulse">{locationIcon}</div>
          <div className="text-xs uppercase tracking-[0.3em] text-amber-500/80 mb-1 font-semibold">
            ✦ Локация ✦
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-neutral-100 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            {locationTitle}
          </h1>
        </div>
      )}
    </div>
  );
};
