import { AudioPlaylist, AudioTrack, SoundEffect } from '../types';
import { DEFAULT_PLAYLISTS } from '../data/defaultPlaylists';
import { autoTagResource } from '../utils/taggingEngine';

type AudioListener = () => void;

class AudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  
  // State
  private currentPlaylistId: string | null = null;
  private currentTrackId: string | null = null;
  private isPlaying: boolean = false;
  private isShuffle: boolean = true;
  private isLoop: boolean = true;
  private volume: number = 0.7;
  private sfxVolume: number = 0.9;
  
  private currentTime: number = 0;
  private duration: number = 0;
  
  private playlists: AudioPlaylist[] = DEFAULT_PLAYLISTS;
  private soundEffects: SoundEffect[] = [
    { id: 'sfx-preset-sword', name: 'Удар меча', icon: '⚔️', presetType: 'sword', category: 'combat' },
    { id: 'sfx-preset-dragon', name: 'Рык дракона', icon: '🐲', presetType: 'dragon', category: 'combat' },
    { id: 'sfx-preset-thunder', name: 'Удар грома', icon: '⚡', presetType: 'thunder', category: 'weather' },
    { id: 'sfx-preset-spell', name: 'Взрыв фаербола', icon: '🔥', presetType: 'spell', category: 'magic' },
    { id: 'sfx-preset-dice', name: 'Бросок кубиков', icon: '🎲', presetType: 'dice', category: 'game' },
    { id: 'sfx-preset-horn', name: 'Боевой горн', icon: '📯', presetType: 'horn', category: 'combat' },
    { id: 'sfx-preset-door', name: 'Скрип двери', icon: '🚪', presetType: 'door', category: 'dungeon' },
    { id: 'sfx-preset-cheer', name: 'Крики и ликование', icon: '🍻', presetType: 'cheer', category: 'social' },
    { id: 'sfx-preset-chime', name: 'Магический звон', icon: '✨', presetType: 'chime', category: 'magic' },
  ];
  private shuffledTrackQueue: AudioTrack[] = [];
  private currentQueueIndex: number = 0;
  
  private listeners: Set<AudioListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.volume = this.volume;

      let lastNotifiedSecond = -1;
      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
          this.duration = this.audioElement.duration || 0;
          
          const currentSecond = Math.floor(this.currentTime);
          if (currentSecond !== lastNotifiedSecond) {
            lastNotifiedSecond = currentSecond;
            this.notifyListeners();
          }
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('Audio playback error on source URL:', e);
      });
    }
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getState() {
    return {
      activePlaylistId: this.currentPlaylistId,
      activeTrackId: this.currentTrackId,
      isPlaying: this.isPlaying,
      isShuffle: this.isShuffle,
      isLoop: this.isLoop,
      volume: this.volume,
      sfxVolume: this.sfxVolume,
      currentTime: this.currentTime,
      duration: this.duration,
      playlists: this.playlists,
      soundEffects: this.soundEffects,
      currentTrack: this.getCurrentTrack(),
      currentPlaylist: this.getCurrentPlaylist(),
    };
  }

  public getCurrentPlaylist(): AudioPlaylist | null {
    if (!this.currentPlaylistId) return null;
    return this.playlists.find((p) => p.id === this.currentPlaylistId) || null;
  }

  public getCurrentTrack(): AudioTrack | null {
    if (!this.currentTrackId) return null;
    const playlist = this.getCurrentPlaylist();
    if (!playlist) return null;
    return playlist.tracks.find((t) => t.id === this.currentTrackId) || null;
  }

  // Playlist Activation (Click on playlist)
  public playPlaylist(playlistId: string, startTrackId?: string): void {
    const playlist = this.playlists.find((p) => p.id === playlistId);
    if (!playlist) return;

    this.currentPlaylistId = playlistId;

    if (playlist.tracks.length === 0) {
      this.currentTrackId = null;
      if (this.audioElement) {
        this.audioElement.pause();
      }
      this.isPlaying = false;
      this.notifyListeners();
      return;
    }

    // Build shuffled or linear queue
    this.buildQueue(playlist, startTrackId);

    // Play first track in queue
    if (this.shuffledTrackQueue.length > 0) {
      this.playTrackFromQueue(0);
    }
  }

  private buildQueue(playlist: AudioPlaylist, startTrackId?: string): void {
    let tracks = [...playlist.tracks];

    if (this.isShuffle) {
      // Fisher-Yates Shuffle
      for (let i = tracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
      }
    }

    // If startTrackId specified, move it to the front
    if (startTrackId) {
      const idx = tracks.findIndex((t) => t.id === startTrackId);
      if (idx !== -1) {
        const [target] = tracks.splice(idx, 1);
        tracks.unshift(target);
      }
    }

    this.shuffledTrackQueue = tracks;
    this.currentQueueIndex = 0;
  }

  private playTrackFromQueue(index: number): void {
    if (index < 0 || index >= this.shuffledTrackQueue.length) return;

    const track = this.shuffledTrackQueue[index];
    this.currentQueueIndex = index;
    this.currentTrackId = track.id;

    if (this.audioElement) {
      this.audioElement.src = track.url;
      this.audioElement.volume = this.volume;
      this.audioElement.currentTime = 0;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.notifyListeners();
          })
          .catch((err) => {
            console.warn('Autoplay error or missing direct file audio stream:', err);
          });
      }
    }
  }

  public playTrack(trackId: string): void {
    const playlist = this.getCurrentPlaylist();
    if (!playlist) return;

    const trackIndex = this.shuffledTrackQueue.findIndex((t) => t.id === trackId);
    if (trackIndex !== -1) {
      this.playTrackFromQueue(trackIndex);
    } else {
      this.playPlaylist(playlist.id, trackId);
    }
  }

  public togglePlayPause(): void {
    // If we have a playlist selected, but no track is selected
    if (!this.currentTrackId) {
      const playlist = this.getCurrentPlaylist() || (this.playlists.length > 0 ? this.playlists[0] : null);
      if (playlist && playlist.tracks.length > 0) {
        this.playPlaylist(playlist.id);
      }
      this.notifyListeners();
      return;
    }

    // Standard audio track play/pause
    if (!this.audioElement) return;

    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      this.audioElement.play().then(() => {
        this.isPlaying = true;
        this.notifyListeners();
      }).catch((err) => {
        console.warn('Playback resume failed:', err);
      });
    }
    this.notifyListeners();
  }

  public nextTrack(): void {
    if (this.shuffledTrackQueue.length === 0) return;

    let nextIdx = this.currentQueueIndex + 1;
    if (nextIdx >= this.shuffledTrackQueue.length) {
      if (this.isLoop) {
        // Re-shuffle for next loop pass
        const playlist = this.getCurrentPlaylist();
        if (playlist) {
          this.buildQueue(playlist);
          nextIdx = 0;
        } else {
          nextIdx = 0;
        }
      } else {
        this.isPlaying = false;
        this.notifyListeners();
        return;
      }
    }

    this.playTrackFromQueue(nextIdx);
  }

  public prevTrack(): void {
    if (this.shuffledTrackQueue.length === 0) return;

    if (this.currentTime > 3 && this.audioElement) {
      this.audioElement.currentTime = 0;
      return;
    }

    let prevIdx = this.currentQueueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = this.shuffledTrackQueue.length - 1;
    }

    this.playTrackFromQueue(prevIdx);
  }

  private handleTrackEnded(): void {
    this.nextTrack();
  }

  // Toggles
  public setShuffle(shuffle: boolean): void {
    this.isShuffle = shuffle;
    const playlist = this.getCurrentPlaylist();
    if (playlist && this.currentTrackId) {
      this.buildQueue(playlist, this.currentTrackId);
    }
    this.notifyListeners();
  }

  public setLoop(loop: boolean): void {
    this.isLoop = loop;
    this.notifyListeners();
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    this.notifyListeners();
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.notifyListeners();
  }

  public seek(seconds: number): void {
    if (this.audioElement && this.duration > 0) {
      this.audioElement.currentTime = Math.max(0, Math.min(this.duration, seconds));
      this.currentTime = this.audioElement.currentTime;
      this.notifyListeners();
    }
  }

  // Playlists CRUD
  public loadDiscoveredPlaylists(discovered: any[]): void {
    const existingIds = new Set(this.playlists.map((p) => p.id));
    const merged = [...this.playlists];

    for (const pl of discovered) {
      const plId = pl.id || `playlist-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const name = pl.name || pl.playlistName || 'Дисковый плейлист';
      const category = pl.category || 'custom';
      
      const rawTracks = pl.tracks || [];
      const tracks: AudioTrack[] = rawTracks.map((t: any, i: number) => {
        const title = t.title || t.name || 'Без названия';
        return {
          id: t.id || `track-custom-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 4)}`,
          title,
          url: t.url || '',
          artist: t.artist,
          duration: t.duration,
          category: t.category,
          tags: t.tags && t.tags.length > 0 ? t.tags : autoTagResource(title, name),
        };
      });

      const existingIndex = merged.findIndex((p) => p.id === plId || p.name === name);
      if (existingIndex === -1) {
        merged.push({
          id: plId,
          name,
          category: category as any,
          icon: pl.icon || getPlaylistIconByName(name),
          description: pl.description || 'Импортированный плейлист',
          tracks,
          tags: pl.tags && pl.tags.length > 0 ? pl.tags : autoTagResource(name),
        });
      } else {
        // Merge tracks
        const originalTracks = merged[existingIndex].tracks;
        const originalUrls = new Set(originalTracks.map((t) => t.url));
        const newTracks = [...originalTracks];

        for (const t of tracks) {
          if (!originalUrls.has(t.url)) {
            newTracks.push(t);
            originalUrls.add(t.url);
          }
        }
        merged[existingIndex] = { ...merged[existingIndex], tracks: newTracks };
      }
    }

    this.playlists = merged;
    this.notifyListeners();
  }

  public loadDiscoveredSFX(discovered: any[]): void {
    const existingUrls = new Set(this.soundEffects.map((s) => s.url).filter(Boolean));
    const merged = [...this.soundEffects];

    for (const sfx of discovered) {
      if (sfx.url && !existingUrls.has(sfx.url)) {
        const name = sfx.name || 'Звуковой эффект';
        const bank = sfx.bank || sfx.category || 'custom';
        merged.push({
          id: sfx.id || `sfx-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name,
          icon: sfx.icon || getSfxIconByName(name, bank),
          url: sfx.url,
          category: bank,
          tags: sfx.tags && sfx.tags.length > 0 ? sfx.tags : autoTagResource(name, bank),
        });
        existingUrls.add(sfx.url);
      }
    }

    this.soundEffects = merged;
    this.notifyListeners();
  }

  public addCustomPlaylist(
    name: string,
    category: 'background' | 'combat' | 'alarm' | 'dungeon' | 'magic' | 'custom' = 'background',
    icon?: string
  ): AudioPlaylist {
    const newPlaylist: AudioPlaylist = {
      id: `playlist-custom-${Date.now()}`,
      name,
      icon: icon || getPlaylistIconByName(name),
      category,
      tracks: [],
    };
    this.playlists = [...this.playlists, newPlaylist];
    this.notifyListeners();
    return newPlaylist;
  }

  public addTrackToPlaylist(playlistId: string, track: Omit<AudioTrack, 'id'>): AudioTrack {
    const newTrack: AudioTrack = {
      ...track,
      id: `track-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    this.playlists = this.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          tracks: [...pl.tracks, newTrack],
        };
      }
      return pl;
    });

    if (this.currentPlaylistId === playlistId) {
      const pl = this.getCurrentPlaylist();
      if (pl) {
        this.buildQueue(pl, this.currentTrackId || undefined);
      }
    }

    this.notifyListeners();
    return newTrack;
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    this.playlists = this.playlists.map((pl) => {
      if (pl.id === playlistId) {
        return {
          ...pl,
          tracks: pl.tracks.filter((t) => t.id !== trackId),
        };
      }
      return pl;
    });

    if (this.currentPlaylistId === playlistId) {
      const pl = this.getCurrentPlaylist();
      if (pl) {
        this.buildQueue(pl, this.currentTrackId || undefined);
      }
    }

    if (this.currentTrackId === trackId) {
      this.nextTrack();
    }

    this.notifyListeners();
  }

  public deletePlaylist(playlistId: string): void {
    this.playlists = this.playlists.filter((p) => p.id !== playlistId);
    if (this.currentPlaylistId === playlistId) {
      this.currentPlaylistId = null;
      this.currentTrackId = null;
      if (this.audioElement) this.audioElement.pause();
      this.isPlaying = false;
    }
    this.notifyListeners();
  }

  // Sound Effects CRUD
  public addSoundEffect(smit: Omit<SoundEffect, 'id'>): SoundEffect {
    const newSfx: SoundEffect = {
      ...smit,
      id: `sfx-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.soundEffects = [...this.soundEffects, newSfx];
    this.notifyListeners();
    return newSfx;
  }

  public removeSoundEffect(id: string): void {
    this.soundEffects = this.soundEffects.filter((s) => s.id !== id);
    this.notifyListeners();
  }

  // SFX One-Shot Player
  public playSoundEffect(effectOrUrlOrPreset: SoundEffect | string): void {
    if (typeof window === 'undefined') return;

    let url: string | undefined;

    if (typeof effectOrUrlOrPreset === 'object') {
      url = effectOrUrlOrPreset.url;
    } else {
      url = effectOrUrlOrPreset.startsWith('http') || effectOrUrlOrPreset.startsWith('blob') ? effectOrUrlOrPreset : undefined;
    }

    if (url) {
      try {
        const audio = new Audio(url);
        audio.volume = this.sfxVolume;
        audio.play().catch((err) => {
          console.warn('Failed to play SFX file:', err);
        });
      } catch (err) {
        console.warn('SFX error:', err);
      }
    }
  }
}

export const audioEngine = new AudioEngine();

function getPlaylistIconByName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('combat') || lower.includes('битва') || lower.includes('бой')) return '⚔️';
  if (lower.includes('tavern') || lower.includes('таверна')) return '🍻';
  if (lower.includes('boss') || lower.includes('босс')) return '🐉';
  if (lower.includes('explore') || lower.includes('исследовани')) return '🌲';
  if (lower.includes('dungeon') || lower.includes('подземелье')) return '🏰';
  if (lower.includes('town') || lower.includes('город')) return '🏙️';
  if (lower.includes('magic') || lower.includes('магия')) return '✨';
  return '🎵';
}

function getSfxIconByName(name: string, bank: string): string {
  const lower = (name + ' ' + bank).toLowerCase();
  if (lower.includes('sword') || lower.includes('меч') || lower.includes('атака')) return '⚔️';
  if (lower.includes('fire') || lower.includes('огонь') || lower.includes('spell') || lower.includes('магия')) return '🔥';
  if (lower.includes('thunder') || lower.includes('гром') || lower.includes('молния')) return '⚡';
  if (lower.includes('dragon') || lower.includes('дракон') || lower.includes('монстр')) return '🐲';
  if (lower.includes('dice') || lower.includes('кубик')) return '🎲';
  if (lower.includes('door') || lower.includes('дверь')) return '🚪';
  if (lower.includes('horn') || lower.includes('горн')) return '📯';
  if (lower.includes('cheer') || lower.includes('пир') || lower.includes('крик')) return '🍻';
  return '🔊';
}
