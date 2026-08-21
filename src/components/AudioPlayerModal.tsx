import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../services/audioEngine';
import { AudioPlaylist, AudioTrack } from '../types';
import { FloatingWindow } from './FloatingWindow';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Plus,
  Trash2,
  Upload,
  Link as LinkIcon,
  X,
  Radio,
  Check,
  Disc,
  FolderPlus,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSfxSoundboard?: () => void;
  zIndex?: number;
  onFocus?: () => void;
}

export const AudioPlayerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onOpenSfxSoundboard,
  zIndex = 40,
  onFocus,
}) => {
  const [audioState, setAudioState] = useState(() => audioEngine.getState());

  // New Playlist creation state
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState<boolean>(false);
  const [newPlaylistName, setNewPlaylistName] = useState<string>('');
  const [newPlaylistCategory, setNewPlaylistCategory] = useState<AudioPlaylist['category']>('background');
  const [newPlaylistIcon, setNewPlaylistIcon] = useState<string>('🎵');

  // Track upload / URL addition state
  const [isAddingTrack, setIsAddingTrack] = useState<boolean>(false);
  const [trackTitleInput, setTrackTitleInput] = useState<string>('');
  const [trackUrlInput, setTrackUrlInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => {
      setAudioState(audioEngine.getState());
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const {
    activePlaylistId,
    activeTrackId,
    isPlaying,
    isShuffle,
    isLoop,
    volume,
    currentTime,
    duration,
    playlists,
    currentTrack,
    currentPlaylist,
  } = audioState;

  const selectedPlaylist = playlists.find((p) => p.id === activePlaylistId) || playlists[0];

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const created = audioEngine.addCustomPlaylist(
      newPlaylistName.trim(),
      newPlaylistCategory,
      newPlaylistIcon
    );
    audioEngine.playPlaylist(created.id);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  const handleAddTrackByUrl = () => {
    if (!trackTitleInput.trim() || !trackUrlInput.trim() || !selectedPlaylist) return;
    audioEngine.addTrackToPlaylist(selectedPlaylist.id, {
      title: trackTitleInput.trim(),
      url: trackUrlInput.trim(),
      artist: 'Внешняя ссылка',
    });
    setTrackTitleInput('');
    setTrackUrlInput('');
    setIsAddingTrack(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedPlaylist) return;

    Array.from(files).forEach((file) => {
      const blobUrl = URL.createObjectURL(file);
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
      audioEngine.addTrackToPlaylist(selectedPlaylist.id, {
        title: cleanTitle,
        url: blobUrl,
        artist: 'Локальный файл',
      });
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsAddingTrack(false);
  };

  return (
    <FloatingWindow
      id="audio-player-panel"
      title="Музыкальный Плеер и Плейлисты"
      isOpen={isOpen}
      onClose={onClose}
      icon={Music}
      defaultPosition={{ x: 140, y: 100 }}
      defaultSize={{ width: 880, height: 560 }}
      minWidth={520}
      minHeight={380}
      zIndex={zIndex}
      onFocus={onFocus}
      headerRightActions={
        onOpenSfxSoundboard ? (
          <button
            onClick={() => {
              onClose();
              onOpenSfxSoundboard();
            }}
            className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition-all flex items-center space-x-1 mr-1"
          >
            <span>⚡</span>
            <span>SFX Саундборд</span>
          </button>
        ) : undefined
      }
    >
      <div className="flex-1 flex flex-col overflow-hidden text-zinc-100">
        {/* Modal Main Content: Playlists */}
        <div className="flex-1 flex overflow-hidden">

            {/* Left Sidebar: Playlists List */}
            <div className="w-72 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col p-3 space-y-2 shrink-0 select-none overflow-y-auto">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <span>Плейлисты</span>
                <button
                  onClick={() => setIsCreatingPlaylist(true)}
                  className="p-1 text-amber-400 hover:text-amber-300 hover:bg-zinc-800 rounded transition-colors"
                  title="Создать плейлист"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>

              {/* Create Playlist Form */}
              {isCreatingPlaylist && (
                <div className="p-3 bg-zinc-900 border border-amber-500/40 rounded-2xl space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Иконка (например 🐉)"
                      value={newPlaylistIcon}
                      onChange={(e) => setNewPlaylistIcon(e.target.value)}
                      className="w-12 bg-zinc-950 border border-zinc-800 rounded-lg p-1 text-center text-sm focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Название плейлиста..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <select
                    value={newPlaylistCategory}
                    onChange={(e) => setNewPlaylistCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-200"
                  >
                    <option value="background">🌲 Фон и Разговоры</option>
                    <option value="combat">⚔️ Схватка и Бой</option>
                    <option value="alarm">🚨 Тревога и Напряжение</option>
                    <option value="dungeon">🏰 Подземелья</option>
                    <option value="magic">🧙 Магия и Тайна</option>
                  </select>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={handleCreatePlaylist}
                      className="flex-1 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Создать</span>
                    </button>
                    <button
                      onClick={() => setIsCreatingPlaylist(false)}
                      className="p-1 text-zinc-400 hover:text-zinc-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Playlists Item Cards */}
              <div className="space-y-1.5 flex-1">
                {playlists.map((pl) => {
                  const isActive = activePlaylistId === pl.id;

                  return (
                    <div key={pl.id} className="group relative flex items-center">
                      <button
                        onClick={() => audioEngine.playPlaylist(pl.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all ${
                          isActive
                            ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-md'
                            : 'bg-zinc-900/60 border border-zinc-800/60 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <span className="text-xl shrink-0">{pl.icon || '🎵'}</span>
                          <div className="truncate">
                            <h4 className="font-bold text-xs truncate leading-tight">{pl.name}</h4>
                            <p className="text-[10px] text-zinc-400 mt-0.5 truncate">
                              {pl.tracks.length} треков • Слайд / Loop
                            </p>
                          </div>
                        </div>

                        {isActive && isPlaying ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400 transition-colors shrink-0" />
                        )}
                      </button>

                      {/* Custom Playlist Delete option */}
                      {pl.id.startsWith('playlist-custom-') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            audioEngine.deletePlaylist(pl.id);
                          }}
                          className="absolute right-2 hidden group-hover:flex p-1.5 bg-zinc-900/90 text-zinc-400 hover:text-red-400 border border-zinc-800 rounded-lg shadow-md"
                          title="Удалить плейлист"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Main Content: Selected Playlist Tracks */}
            <div className="flex-1 flex flex-col bg-zinc-900/40 overflow-hidden">
              {/* Selected Playlist Header Banner */}
              {selectedPlaylist && (
                <div className="px-6 py-4 bg-zinc-950/60 border-b border-zinc-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{selectedPlaylist.icon || '🎵'}</span>
                    <div>
                      <h3 className="font-bold text-lg text-zinc-100 flex items-center space-x-2">
                        <span>{selectedPlaylist.name}</span>
                      </h3>
                      <p className="text-xs text-zinc-400 max-w-xl">
                        {selectedPlaylist.description || 'Нажмите для мгновенного воспроизведения всех треков в случайном порядке.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsAddingTrack(true)}
                      className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Добавить трек</span>
                    </button>

                    <button
                      onClick={() => audioEngine.playPlaylist(selectedPlaylist.id)}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md flex items-center space-x-1.5 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Запустить плейлист</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Add Track Form Panel */}
              {isAddingTrack && (
                <div className="p-4 bg-zinc-950 border-b border-amber-500/30 flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center space-x-1">
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавление аудиозаписи в «{selectedPlaylist?.name}»</span>
                    </span>
                    <button onClick={() => setIsAddingTrack(false)} className="text-zinc-500 hover:text-zinc-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 1: File Upload */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between space-y-2">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center space-x-1">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Загрузить файлы MP3 / WAV / OGG с компьютера</span>
                      </span>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="audio/*"
                        multiple
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-bold transition-colors"
                      >
                        Выбрать аудиофайл(ы)
                      </button>
                    </div>

                    {/* Option 2: Direct URL */}
                    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col space-y-2">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center space-x-1">
                        <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Добавить по прямой интернет-ссылке</span>
                      </span>
                      <input
                        type="text"
                        placeholder="Название трека..."
                        value={trackTitleInput}
                        onChange={(e) => setTrackTitleInput(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200"
                      />
                      <div className="flex space-x-1.5">
                        <input
                          type="url"
                          placeholder="https://.../audio.mp3"
                          value={trackUrlInput}
                          onChange={(e) => setTrackUrlInput(e.target.value)}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200"
                        />
                        <button
                          onClick={handleAddTrackByUrl}
                          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs rounded transition-colors"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracks List */}
              <div className="flex-1 p-6 overflow-y-auto space-y-2">
                {selectedPlaylist && selectedPlaylist.tracks.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 my-auto py-12">
                    <Music className="w-10 h-10 text-zinc-600" />
                    <p className="text-xs text-zinc-400 max-w-sm">
                      В этом плейлисте пока нет треков. Нажмите «Добавить трек», чтобы загрузить свои аудиофайлы или ссылки.
                    </p>
                  </div>
                ) : (
                  selectedPlaylist?.tracks.map((track, idx) => {
                    const isTrackActive = activeTrackId === track.id;

                    return (
                      <div
                        key={track.id}
                        className={`group flex items-center justify-between p-3 rounded-2xl border transition-all ${
                          isTrackActive
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-md'
                            : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3.5 truncate">
                          <button
                            onClick={() => audioEngine.playTrack(track.id)}
                            className={`p-2 rounded-xl text-zinc-950 font-bold transition-transform active:scale-90 shrink-0 ${
                              isTrackActive && isPlaying
                                ? 'bg-amber-400'
                                : 'bg-zinc-800 text-zinc-300 group-hover:bg-amber-500 group-hover:text-zinc-950'
                            }`}
                          >
                            {isTrackActive && isPlaying ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="truncate">
                            <h4 className="font-semibold text-xs text-zinc-100 truncate">{track.title}</h4>
                            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                              {track.artist || 'Случайный трек'} • №{idx + 1}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          {isTrackActive && isPlaying && (
                            <span className="text-[10px] font-mono bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full animate-pulse">
                              ИГРАЕТ
                            </span>
                          )}

                          <button
                            onClick={() => audioEngine.removeTrackFromPlaylist(selectedPlaylist.id, track.id)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-colors"
                            title="Удалить трек"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        {/* Bottom Persistent Audio Controls Bar */}
        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          {/* Progress Bar & Time */}
          <div className="w-full sm:flex-1 flex items-center space-x-3">
            <span className="text-xs font-mono text-zinc-400 w-10 text-right">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => audioEngine.seek(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500 h-1.5 rounded-lg bg-zinc-800 cursor-pointer"
            />
            <span className="text-xs font-mono text-zinc-400 w-10">{formatTime(duration)}</span>
          </div>

          {/* Player Main Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => audioEngine.setShuffle(!isShuffle)}
              className={`p-2 rounded-xl transition-colors ${
                isShuffle
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}
              title={isShuffle ? 'Случайный порядок включен' : 'Включить случайный порядок'}
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={() => audioEngine.prevTrack()}
              className="p-2 text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => audioEngine.togglePlayPause()}
              className="p-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-2xl transition-all shadow-lg active:scale-95"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={() => audioEngine.nextTrack()}
              className="p-2 text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded-xl transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => audioEngine.setLoop(!isLoop)}
              className={`p-2 rounded-xl transition-colors ${
                isLoop
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
              }`}
              title={isLoop ? 'Зацикливание включено' : 'Включить зацикливание'}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
            <Volume2 className="w-4 h-4 text-amber-400 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => audioEngine.setVolume(parseFloat(e.target.value))}
              className="w-20 accent-amber-500 h-1.5 rounded-lg bg-zinc-950 cursor-pointer"
            />
            <span className="text-xs font-mono text-zinc-300 w-8">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>
    </FloatingWindow>
  );
};
