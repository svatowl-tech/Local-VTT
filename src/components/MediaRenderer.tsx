import React, { useState, useEffect, memo } from 'react';
import { getCachedMediaUrl } from '../services/mediaCache';
import { resolveApiUrl } from '../utils/apiUrlHelper';
import { MapItem } from '../types';

interface Props {
  mapItem: MapItem;
  className?: string;
}

export const MediaRenderer: React.FC<Props> = memo(({ mapItem, className }) => {
  // Determine safe initial URL (data:, blob:, http:, /api/ are immediately usable)
  const initialUrl =
    mapItem.url && !mapItem.url.startsWith('idb://')
      ? mapItem.url
      : mapItem.thumbnailUrl && !mapItem.thumbnailUrl.startsWith('idb://')
      ? mapItem.thumbnailUrl
      : '';

  const [resolvedUrl, setResolvedUrl] = useState<string>(initialUrl);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    setLoadError(false);

    getCachedMediaUrl(mapItem.id, mapItem.url).then((url) => {
      if (mounted && url && url !== resolvedUrl) {
        setResolvedUrl(url);
      }
    });

    return () => {
      mounted = false;
    };
  }, [mapItem.url, mapItem.id]);

  const handleMediaError = () => {
    // If current resolved URL fails, attempt fallback to thumbnail or backend stream
    if (!loadError) {
      setLoadError(true);
      if (mapItem.thumbnailUrl && mapItem.thumbnailUrl !== resolvedUrl && !mapItem.thumbnailUrl.startsWith('blob:')) {
        setResolvedUrl(mapItem.thumbnailUrl);
      } else if (!resolvedUrl.startsWith('/api/media/')) {
        setResolvedUrl(resolveApiUrl(`/api/media/${mapItem.id}`));
      }
    }
  };

  if (mapItem.type === 'video') {
    return (
      <div className="w-full h-full relative bg-zinc-950 overflow-hidden select-none">
        {resolvedUrl && !loadError ? (
          <video
            key={resolvedUrl}
            src={resolvedUrl}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onError={handleMediaError}
            className={className || "w-full h-full object-cover pointer-events-none transform-gpu"}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-950/80 text-zinc-600 font-mono text-xs">
            <span className="opacity-40">● ● ●</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-zinc-950 overflow-hidden select-none">
      {resolvedUrl && !loadError ? (
        <img
          key={resolvedUrl}
          src={resolvedUrl}
          alt=""
          aria-label={mapItem.name}
          loading="eager"
          decoding="async"
          onError={handleMediaError}
          className={className || "w-full h-full object-cover pointer-events-none transform-gpu"}
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-zinc-950/80 text-zinc-600 font-mono text-xs">
          <span className="opacity-40">● ● ●</span>
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.mapItem.id === next.mapItem.id &&
    prev.mapItem.url === next.mapItem.url &&
    prev.mapItem.thumbnailUrl === next.mapItem.thumbnailUrl &&
    prev.mapItem.type === next.mapItem.type &&
    prev.className === next.className
  );
});
