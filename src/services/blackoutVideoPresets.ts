/**
 * Atmospheric Looping Video Presets for Player Blackout Screen & Game Pauses
 * Provides reliable, high-performance live video loops for immersion and ambiance.
 */

export interface BlackoutVideoPreset {
  id: string;
  name: string;
  category: 'fire' | 'nature' | 'magic' | 'dungeon' | 'weather';
  videoUrl: string;
  fallbackPoster: string;
  description: string;
  recommendedTheme: 'prep' | 'rest' | 'tavern' | 'stealth' | 'boss';
}

export const BLACKOUT_VIDEO_PRESETS: BlackoutVideoPreset[] = [
  {
    id: 'campfire',
    name: '🔥 Костёр в ночном лесу',
    category: 'fire',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-fire-burning-in-the-wild-at-night-42289-large.mp4',
    fallbackPoster: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?q=80&w=1200&auto=format&fit=crop',
    description: 'Живое пламя походного костра с искрами под ночным небом',
    recommendedTheme: 'rest',
  },
  {
    id: 'tavern_hearth',
    name: '🍺 Камин в тёплой таверне',
    category: 'fire',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-flames-in-a-fireplace-43288-large.mp4',
    fallbackPoster: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1200&auto=format&fit=crop',
    description: 'Уютный очаг таверны, треск дров и золотой свет',
    recommendedTheme: 'tavern',
  },
  {
    id: 'dungeon_sparks',
    name: '⚔️ Факелы и искры подземелья',
    category: 'dungeon',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-sparks-of-fire-on-black-background-41489-large.mp4',
    fallbackPoster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop',
    description: 'Таинственный огонь факелов в катакомбах и криптах',
    recommendedTheme: 'prep',
  },
  {
    id: 'astral_nebula',
    name: '✨ Астральная туманность',
    category: 'magic',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-1610-large.mp4',
    fallbackPoster: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
    description: 'Звездный космос, мерцание галактик и магия астрала',
    recommendedTheme: 'boss',
  },
  {
    id: 'rain_lake',
    name: '🌧️ Дождь и ночная гроза',
    category: 'weather',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-rain-falling-on-the-water-of-a-lake-seen-up-18312-large.mp4',
    fallbackPoster: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1200&auto=format&fit=crop',
    description: 'Круги на воде под проливным ночным дождём',
    recommendedTheme: 'stealth',
  },
  {
    id: 'blizzard_mountain',
    name: '❄️ Ледяная метель на пиках',
    category: 'weather',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cold-snowy-mountain-landscape-42525-large.mp4',
    fallbackPoster: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?q=80&w=1200&auto=format&fit=crop',
    description: 'Суровый северный буран, снежная пыль и горные вершины',
    recommendedTheme: 'boss',
  },
];

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
