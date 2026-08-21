import { AudioPlaylist, AudioTrack, SoundEffect } from '../types';
import { DEFAULT_PLAYLISTS } from '../data/defaultPlaylists';

type AudioListener = () => void;

class AudioEngine {
  private audioElement: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;
  
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
  private isProceduralPlaying: boolean = false;
  private proceduralOscillators: OscillatorNode[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.audioElement = new Audio();
      this.audioElement.volume = this.volume;

      this.audioElement.addEventListener('timeupdate', () => {
        if (this.audioElement) {
          this.currentTime = this.audioElement.currentTime;
          this.duration = this.audioElement.duration || 0;
          this.notifyListeners();
        }
      });

      this.audioElement.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audioElement.addEventListener('error', (e) => {
        console.warn('Audio playback error on source URL, falling back to procedural audio synthesis:', e);
        this.playProceduralFallback();
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

    this.stopProceduralFallback();
    this.currentPlaylistId = playlistId;

    if (playlist.tracks.length === 0) {
      this.currentTrackId = null;
      this.playProceduralFallback();
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
            console.warn('Autoplay error or missing direct file audio stream, triggering Web Audio synth:', err);
            this.playProceduralFallback();
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
    if (!this.currentTrackId && this.playlists.length > 0) {
      this.playPlaylist(this.playlists[0].id);
      return;
    }

    if (this.isProceduralPlaying) {
      if (this.isPlaying) {
        this.stopProceduralFallback();
        this.isPlaying = false;
      } else {
        this.playProceduralFallback();
      }
      this.notifyListeners();
      return;
    }

    if (!this.audioElement) return;

    if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      this.audioElement.play().then(() => {
        this.isPlaying = true;
        this.notifyListeners();
      }).catch(() => {
        this.playProceduralFallback();
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

  // Add Custom Track or Playlist
  public addCustomPlaylist(name: string, category: AudioPlaylist['category'], icon: string = '🎵'): AudioPlaylist {
    const newPlaylist: AudioPlaylist = {
      id: `playlist-custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      category,
      icon,
      tracks: [],
    };

    this.playlists = [...this.playlists, newPlaylist];
    this.notifyListeners();
    return newPlaylist;
  }

  /**
   * Load or merge discovered playlists and tracks from local disk asset folder
   */
  public loadDiscoveredPlaylists(
    discovered: Array<{ playlistName: string; category?: string; tracks: Array<{ title: string; url: string }> }>
  ): void {
    if (!discovered || discovered.length === 0) return;

    let updatedPlaylists = [...this.playlists];

    for (const item of discovered) {
      let existingPlaylist = updatedPlaylists.find(
        (p) => p.name.toLowerCase() === item.playlistName.toLowerCase()
      );

      const tracksToAdd: AudioTrack[] = item.tracks.map((t) => ({
        id: `track-disk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: t.title,
        url: t.url,
        duration: 180,
      }));

      if (existingPlaylist) {
        // Merge tracks into existing playlist, avoiding exact URL duplicates
        const existingUrls = new Set(existingPlaylist.tracks.map((t) => t.url));
        const filteredNewTracks = tracksToAdd.filter((t) => !existingUrls.has(t.url));

        updatedPlaylists = updatedPlaylists.map((p) => {
          if (p.id === existingPlaylist!.id) {
            return {
              ...p,
              tracks: [...p.tracks, ...filteredNewTracks],
            };
          }
          return p;
        });
      } else {
        // Create new playlist
        const newPlaylist: AudioPlaylist = {
          id: `playlist-disk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.playlistName,
          category: (item.category as any) || 'ambient',
          icon: getPlaylistIconByName(item.playlistName),
          tracks: tracksToAdd,
        };
        updatedPlaylists.push(newPlaylist);
      }
    }

    this.playlists = updatedPlaylists;
    this.notifyListeners();
  }

  /**
   * Load or merge discovered SFX items from local disk asset folder
   */
  public loadDiscoveredSFX(
    discoveredSfx: Array<{ name: string; bank: string; url: string; icon?: string }>
  ): void {
    if (!discoveredSfx || discoveredSfx.length === 0) return;

    const existingUrls = new Set(this.soundEffects.map((s) => s.url));
    const newEffects: SoundEffect[] = [];

    for (const item of discoveredSfx) {
      if (item.url && !existingUrls.has(item.url)) {
        newEffects.push({
          id: `sfx-disk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: item.name,
          category: item.bank.toLowerCase(),
          icon: item.icon || getSfxIconByName(item.name, item.bank),
          url: item.url,
        });
      }
    }

    if (newEffects.length > 0) {
      this.soundEffects = [...this.soundEffects, ...newEffects];
      this.notifyListeners();
    }
  }

  public addTrackToPlaylist(playlistId: string, track: Omit<AudioTrack, 'id'>): void {
    const newTrack: AudioTrack = {
      ...track,
      id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };

    this.playlists = this.playlists.map((p) => {
      if (p.id === playlistId) {
        return {
          ...p,
          tracks: [...p.tracks, newTrack],
        };
      }
      return p;
    });

    if (this.currentPlaylistId === playlistId) {
      const playlist = this.getCurrentPlaylist();
      if (playlist) this.buildQueue(playlist, this.currentTrackId || undefined);
    }

    this.notifyListeners();
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string): void {
    this.playlists = this.playlists.map((p) => {
      if (p.id === playlistId) {
        return {
          ...p,
          tracks: p.tracks.filter((t) => t.id !== trackId),
        };
      }
      return p;
    });

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
  public addSoundEffect(sfx: Omit<SoundEffect, 'id'>): SoundEffect {
    const newSfx: SoundEffect = {
      ...sfx,
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
    let preset: string | undefined;

    if (typeof effectOrUrlOrPreset === 'object') {
      url = effectOrUrlOrPreset.url;
      preset = effectOrUrlOrPreset.presetType || effectOrUrlOrPreset.name || effectOrUrlOrPreset.id;
    } else {
      url = effectOrUrlOrPreset.startsWith('http') || effectOrUrlOrPreset.startsWith('blob') ? effectOrUrlOrPreset : undefined;
      preset = effectOrUrlOrPreset;
    }

    if (url) {
      try {
        const audio = new Audio(url);
        audio.volume = this.sfxVolume;
        audio.play().catch(() => {
          this.playSyntheticSFX(preset || 'chime');
        });
        return;
      } catch {
        this.playSyntheticSFX(preset || 'chime');
        return;
      }
    }

    this.playSyntheticSFX(preset || 'chime');
  }

  // Web Audio Procedural Sound Synthesizer Fallback
  private playProceduralFallback(): void {
    if (typeof window === 'undefined') return;
    this.stopProceduralFallback();

    try {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx();
      const ctx = this.audioContext;

      // Create rich ambient drone chords depending on playlist category
      const playlist = this.getCurrentPlaylist();
      const cat = playlist?.category || 'background';

      let freqs = [110, 164.81, 220, 261.63]; // A-minor calm ambient
      if (cat === 'combat') freqs = [73.42, 110, 146.83, 220]; // D-minor heavy battle
      if (cat === 'alarm') freqs = [82.41, 116.54, 164.81, 233.08]; // E-tritone tension
      if (cat === 'dungeon') freqs = [55, 110, 130.81, 164.81]; // Dark bass dungeon
      if (cat === 'magic') freqs = [220, 329.63, 440, 659.25]; // Celestial magic

      this.proceduralOscillators = freqs.map((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = cat === 'combat' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime((0.15 * this.volume) / freqs.length, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        return osc;
      });

      this.isProceduralPlaying = true;
      this.isPlaying = true;
      this.notifyListeners();
    } catch (e) {
      console.warn('Procedural synth error:', e);
    }
  }

  private stopProceduralFallback(): void {
    if (this.proceduralOscillators.length > 0) {
      this.proceduralOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      this.proceduralOscillators = [];
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }
    this.isProceduralPlaying = false;
  }

  private playSyntheticSFX(idOrType: string): void {
    try {
      // @ts-ignore
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const typeLower = idOrType.toLowerCase();

      if (typeLower.includes('sword') || typeLower.includes('меч')) {
        // Metallic clash sweep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.22);
        gain.gain.setValueAtTime(0.35 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      } else if (typeLower.includes('dragon') || typeLower.includes('дракон') || typeLower.includes('рык')) {
        // Deep low roar sweep
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.85);
        gain.gain.setValueAtTime(0.45 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
      } else if (typeLower.includes('thunder') || typeLower.includes('гром')) {
        // Heavy bass rumble
        osc.type = 'square';
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(25, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.5 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      } else if (typeLower.includes('spell') || typeLower.includes('fire') || typeLower.includes('магия') || typeLower.includes('взрыв')) {
        // Magic burst frequency glide
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(950, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.45);
        gain.gain.setValueAtTime(0.4 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      } else if (typeLower.includes('dice') || typeLower.includes('кубик')) {
        // Rapid staccato dice roll clicks
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.3 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      } else if (typeLower.includes('horn') || typeLower.includes('горн')) {
        // Brass war horn tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(293.66, ctx.currentTime); // D4
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2); // A4
        gain.gain.setValueAtTime(0.35 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      } else if (typeLower.includes('door') || typeLower.includes('дверь')) {
        // Creaking pitch shift
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(540, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.25 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      } else if (typeLower.includes('cheer') || typeLower.includes('крик')) {
        // High group rise
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      } else {
        // Generic chime / magic bell
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.3 * this.sfxVolume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      }

      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch {}
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
