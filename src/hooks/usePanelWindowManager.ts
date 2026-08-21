import { useState, useCallback } from 'react';

export type PanelWindowId =
  | 'maps'
  | 'upload'
  | 'grid'
  | 'audio'
  | 'sfx'
  | 'initiative'
  | 'layers'
  | 'objectBinding'
  | 'unifiedAssets'
  | 'fogConfig'
  | 'cameraConfig';

const BASE_Z_INDEX = 40;

export function usePanelWindowManager() {
  const [activeWindowId, setActiveWindowId] = useState<PanelWindowId | null>(null);
  const [windowZIndices, setWindowZIndices] = useState<Record<string, number>>({});
  const [topZ, setTopZ] = useState<number>(BASE_Z_INDEX + 10);

  const bringToFront = useCallback((windowId: PanelWindowId | string) => {
    setActiveWindowId(windowId as PanelWindowId);
    setTopZ((prev) => {
      const nextZ = prev + 1;
      setWindowZIndices((curr) => ({
        ...curr,
        [windowId]: nextZ,
      }));
      return nextZ;
    });
  }, []);

  const getZIndex = useCallback(
    (windowId: PanelWindowId | string) => {
      return windowZIndices[windowId] || BASE_Z_INDEX;
    },
    [windowZIndices]
  );

  return {
    activeWindowId,
    bringToFront,
    getZIndex,
  };
}
