import React, { useState, useEffect, useRef, memo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Maximize2,
  Music,
  Zap,
  ChevronDown,
  ListMusic,
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

interface Props {
  onOpenFullPlayer: () => void;
  onOpenSfxSoundboard?: () => void;
}

export const MiniAudioDock: React.FC<Props> = memo(({
  onOpenFullPlayer,
  onOpenSfxSoundboard,
}) => {
  const [audioState, setAudioState] = useState(() => audioEngine.getState());
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let lastState = audioEngine.getState();
    const unsub = audioEngine.subscribe(() => {
      const newState = audioEngine.getState();
      if (
        newState.isPlaying !== lastState.isPlaying ||
        newState.activeTrackId !== lastState.activeTrackId ||
        newState.activePlaylistId !== lastState.activePlaylistId ||
        newState.volume !== lastState.volume ||
        newState.isLoop !== lastState.isLoop ||
        newState.isShuffle !== lastState.isShuffle ||
        newState.playlists !== lastState.playlists
      ) {
        lastState = newState;
        setAudioState(newState);
      }
    });
    return unsub;
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPlaylistMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    isPlaying,
    currentTrack,
    volume,
    isLoop,
    isShuffle,
    playlists,
    activePlaylistId,
    currentPlaylist,
  } = audioState;

  return (
    <div
      id="stationary_mini_audio_dock"
      className="w-full h-14 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4 select-none shadow-2xl z-40 text-zinc-100"
    >
      {/* 1. LEFT: Now Playing Track Info & Expand Button */}
      <div className="flex items-center space-x-2.5 min-w-0 max-w-[220px] sm:max-w-[280px] lg:max-w-[320px] shrink-0">
        <div className="p-2 bg-amber-500/20 border border-amber-500/40 rounded-xl text-amber-400 shrink-0 relative">
          <Music className={`w-4 h-4 ${isPlaying ? 'animate-bounce' : ''}`} />
          {isPlaying && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          )}
        </div>

        <div className="flex flex-col truncate min-w-0">
          <span className="text-xs font-bold text-zinc-100 truncate leading-tight">
            {currentTrack ? currentTrack.title : isPlaying ? 'Атмосферный фон' : 'Музыка выключена'}
          </span>
          <span className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
            {currentPlaylist ? currentPlaylist.name : 'Выберите плейлист'}
          </span>
        </div>

        <button
          onClick={onOpenFullPlayer}
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-lg transition-all shrink-0 hidden md:flex items-center"
          title="Развернуть полный аудиоплеер"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. CENTER: Playback Controls & Volume Slider */}
      <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
        <button
          onClick={() => audioEngine.prevTrack()}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors"
          title="Предыдущий трек"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => audioEngine.togglePlayPause()}
          className={`p-2 rounded-xl text-zinc-950 font-bold transition-transform active:scale-90 shadow-md ${
            isPlaying ? 'bg-amber-400 hover:bg-amber-300' : 'bg-amber-500 hover:bg-amber-400'
          }`}
          title={isPlaying ? 'Пауза' : 'Воспроизведение'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          onClick={() => audioEngine.nextTrack()}
          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-lg transition-colors"
          title="Следующий трек"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <button
          onClick={() => audioEngine.setShuffle(!isShuffle)}
          className={`p-1.5 rounded-lg transition-colors hidden sm:inline-flex ${
            isShuffle ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-400'
          }`}
          title={isShuffle ? 'Случайный порядок: ВКЛ' : 'Включить случайный порядок'}
        >
          <Shuffle className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => audioEngine.setLoop(!isLoop)}
          className={`p-1.5 rounded-lg transition-colors hidden sm:inline-flex ${
            isLoop ? 'text-amber-400 bg-amber-500/10' : 'text-zinc-500 hover:text-zinc-400'
          }`}
          title={isLoop ? 'Зацикливание: ВКЛ' : 'Включить зацикливание'}
        >
          <Repeat className="w-3.5 h-3.5" />
        </button>

        {/* Volume Slider */}
        <div className="flex items-center space-x-1 border-l border-zinc-800/80 pl-2">
          <button
            onClick={() => audioEngine.setVolume(volume > 0 ? 0 : 0.5)}
            className="p-1 text-zinc-400 hover:text-amber-400 transition-colors"
            title="Громкость"
          >
            {volume === 0 ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
            className="w-16 sm:w-20 lg:w-24 accent-amber-500 h-1.5 rounded-lg bg-zinc-900 cursor-pointer"
            title={`Громкость: ${Math.round(volume * 100)}%`}
          />
          <span className="text-[10px] font-mono text-zinc-400 w-7 text-right hidden sm:inline">
            {Math.round(volume * 100)}%
          </span>
        </div>
      </div>

      {/* 3. RIGHT: Quick Atmosphere Strip & SFX Soundboard */}
      <div className="flex items-center space-x-1.5 shrink min-w-0 relative" ref={menuRef}>
        {/* Quick Atmosphere Buttons */}
        <div className="hidden lg:flex items-center space-x-1 overflow-x-auto scrollbar-none py-1">
          {playlists.slice(0, 4).map((pl) => {
            const isActive = activePlaylistId === pl.id && isPlaying;
            return (
              <button
                key={pl.id}
                onClick={() => audioEngine.playPlaylist(pl.id)}
                className={`px-2 py-1 rounded-xl text-xs font-medium border transition-all flex items-center space-x-1 active:scale-95 whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md font-bold'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-amber-500/40 hover:bg-zinc-800 hover:text-amber-300'
                }`}
                title={`Включить атмосферу: ${pl.name}`}
              >
                <span>{pl.icon || '🎵'}</span>
                <span className="max-w-[70px] truncate">{pl.name.replace(/^[^\s]+\s+/, '')}</span>
              </button>
            );
          })}
        </div>

        {/* Dropdown Menu button for ALL playlists */}
        <button
          onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
          className={`px-2 py-1 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1 ${
            showPlaylistMenu
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100'
          }`}
          title="Выбрать атмосферу из всех плейлистов"
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Плейлисты</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showPlaylistMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* SFX Quick Soundboard Trigger */}
        {onOpenSfxSoundboard && (
          <button
            onClick={onOpenSfxSoundboard}
            className="p-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl transition-all flex items-center space-x-1 text-xs font-bold px-2 shrink-0"
            title="Открыть саундборд звуковых эффектов (SFX)"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline text-[11px]">SFX</span>
          </button>
        )}

        {/* Mobile Full Player Button */}
        <button
          onClick={onOpenFullPlayer}
          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-xl transition-all flex md:hidden"
          title="Открыть полный плеер"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Popup List of ALL playlists */}
        {showPlaylistMenu && (
          <div className="absolute bottom-full right-0 mb-2 w-72 max-h-80 bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-y-auto z-50 p-2 space-y-1 backdrop-blur-xl">
            <div className="px-2 py-1 text-[10px] font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800/60 pb-1.5 mb-1">
              <span>Доступные плейлисты ({playlists.length})</span>
              <button
                onClick={() => {
                  setShowPlaylistMenu(false);
                  onOpenFullPlayer();
                }}
                className="text-amber-400 hover:underline text-[10px] normal-case"
              >
                Управление
              </button>
            </div>

            {playlists.map((pl) => {
              const isSelected = activePlaylistId === pl.id;
              const isCurrentPlaying = isSelected && isPlaying;

              return (
                <button
                  key={pl.id}
                  onClick={() => {
                    audioEngine.playPlaylist(pl.id);
                    setShowPlaylistMenu(false);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-zinc-900/50 border border-zinc-800/50 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <span className="text-base shrink-0">{pl.icon || '🎵'}</span>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-zinc-100 truncate leading-tight">
                        {pl.name}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate leading-tight mt-0.5">
                        {pl.tracks.length} {pl.tracks.length === 1 ? 'трек' : pl.tracks.length >= 2 && pl.tracks.length <= 4 ? 'трека' : 'треков'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isCurrentPlaying ? (
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-zinc-500 hover:text-amber-400 transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});
