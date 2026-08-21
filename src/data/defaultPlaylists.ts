import { AudioPlaylist } from '../types';

export const DEFAULT_PLAYLISTS: AudioPlaylist[] = [
  {
    id: 'playlist-bg-exploration',
    name: '🌲 Исследование и Окружение',
    category: 'background',
    icon: '🌲',
    description: 'Фоновая музыка для путешествий, таверн и городов.',
    tracks: [],
  },
  {
    id: 'playlist-combat',
    name: '⚔️ Боевые столкновения',
    category: 'combat',
    icon: '⚔️',
    description: 'Музыка для сражений, битв с боссами и динамичных сцен.',
    tracks: [],
  },
  {
    id: 'playlist-tension',
    name: '🚨 Напряжение и Скрытность',
    category: 'alarm',
    icon: '🚨',
    description: 'Саспенс, ловушки и скрытное перемещение.',
    tracks: [],
  },
  {
    id: 'playlist-dungeon',
    name: '🏰 Подземелья и Катакомбы',
    category: 'dungeon',
    icon: '🏰',
    description: 'Мрачный эмбиент для темных коридоров и пещер.',
    tracks: [],
  },
];
