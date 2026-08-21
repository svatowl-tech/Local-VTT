/**
 * Blackout Video Presets & YouTube Helpers
 */

export interface BlackoutVideoPreset {
  id: string;
  name: string;
  category: 'fire' | 'nature' | 'magic' | 'dungeon' | 'weather';
  videoUrl: string;
  fallbackPoster?: string;
  description: string;
  recommendedTheme: 'prep' | 'rest' | 'tavern' | 'stealth' | 'boss';
}

export const BLACKOUT_VIDEO_PRESETS: BlackoutVideoPreset[] = [];

/**
 * Extracts YouTube video ID from various standard YouTube URL formats.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = trimmed.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}
