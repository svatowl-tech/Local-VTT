import React, { memo, useState, useRef } from 'react';
import { PlayerBlackoutState, BlackoutBackgroundMode } from '../types';
import {
  Eye,
  EyeOff,
  Sparkles,
  Swords,
  Coffee,
  Beer,
  Skull,
  Compass,
  Check,
  Video,
  Upload,
  Link as LinkIcon,
  Sliders,
  Volume2,
  VolumeX,
  Layers,
  Image as ImageIcon,
  Flame,
  X,
  Play,
} from 'lucide-react';
import { BLACKOUT_VIDEO_PRESETS, extractYouTubeId } from '../services/blackoutVideoPresets';
import { saveIDBMediaFile } from '../services/db';

interface Props {
  blackout?: PlayerBlackoutState;
  onToggleBlackout?: () => void;
  onUpdateBlackout?: (blackout: Partial<PlayerBlackoutState>) => void;
}

const STORY_PRESETS = [
  {
    id: 'prep',
    icon: Swords,
    title: 'Мастер подготавливает карту...',
    subtitle: 'Пожалуйста, подождите. Идет расстановка поля битвы и декораций',
    badge: 'Подготовка боя',
  },
  {
    id: 'rest',
    icon: Coffee,
    title: 'Короткий отдых отряда...',
    subtitle: 'Восстановите ячейки, перевяжите раны и распределите добычу',
    badge: 'Привал',
  },
  {
    id: 'tavern',
    icon: Beer,
    title: 'Таверна «Пьяный дракон»',
    subtitle: 'Слухи у трактирщика, звон монет и кружка пенного эля',
    badge: 'Отдых в городе',
  },
  {
    id: 'stealth',
    icon: Compass,
    title: 'Тайная комната / Загадка',
    subtitle: 'Осмотрите окружение, проверьте ловушки и рунические замки',
    badge: 'Исследование',
  },
  {
    id: 'boss',
    icon: Skull,
    title: 'Надвигается тьма...',
    subtitle: 'Воздух тяжелеет, шаги чудовища сотрясают подземелье',
    badge: 'Битва с боссом',
  },
];

export const PlayerCurtainPanel: React.FC<Props> = memo(({
  blackout,
  onToggleBlackout,
  onUpdateBlackout,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'presets' | 'url' | 'upload' | 'settings'>('presets');
  const [isUploading, setIsUploading] = useState(false);

  const isEnabled = !!blackout?.enabled;
  const currentTitle = blackout?.title || 'Мастер подготавливает карту...';
  const currentSubtitle =
    blackout?.subtitle ||
    'Пожалуйста, подождите. Идет расстановка поля битвы и декораций';

  const mode: BlackoutBackgroundMode = blackout?.backgroundMode || 'embers';
  const selectedPresetId = blackout?.presetVideoId || 'campfire';
  const overlayDim = blackout?.overlayDim !== undefined ? blackout.overlayDim : 0.45;
  const blurAmount = blackout?.blurAmount || 0;
  const showEmbers = blackout?.showEmbers !== false;
  const hideCard = !!blackout?.hideCard;
  const soundEnabled = !!blackout?.soundEnabled;

  const handleSelectStoryPreset = (preset: typeof STORY_PRESETS[0]) => {
    if (onUpdateBlackout) {
      onUpdateBlackout({
        title: preset.title,
        subtitle: preset.subtitle,
        preset: preset.id as any,
      });
    }
  };

  const handleSelectVideoPreset = (presetId: string) => {
    if (onUpdateBlackout) {
      onUpdateBlackout({
        backgroundMode: 'preset_video',
        presetVideoId: presetId,
      });
    }
  };

  const handleUrlChange = (val: string) => {
    const trimmed = val.trim();
    if (!onUpdateBlackout) return;

    if (!trimmed) {
      onUpdateBlackout({
        backgroundMode: 'embers',
        videoUrl: '',
        youtubeUrl: '',
        imageUrl: '',
      });
      return;
    }

    const ytId = extractYouTubeId(trimmed);
    if (ytId) {
      onUpdateBlackout({
        backgroundMode: 'youtube',
        youtubeUrl: trimmed,
      });
    } else if (trimmed.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      onUpdateBlackout({
        backgroundMode: 'video',
        videoUrl: trimmed,
      });
    } else if (trimmed.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i)) {
      onUpdateBlackout({
        backgroundMode: 'image',
        imageUrl: trimmed,
      });
    } else {
      // Default to video if unsure
      onUpdateBlackout({
        backgroundMode: 'video',
        videoUrl: trimmed,
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateBlackout) return;

    try {
      setIsUploading(true);
      const isVideo = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm|mov)$/i);
      const isImage = file.type.startsWith('image/') || file.name.match(/\.(png|jpg|jpeg|gif|webp)$/i);

      const mediaKey = `blackout_file_${Date.now()}`;
      const blobUrl = await saveIDBMediaFile(mediaKey, file);

      if (isVideo) {
        onUpdateBlackout({
          backgroundMode: 'video',
          videoUrl: blobUrl,
          mediaName: file.name,
        });
      } else if (isImage) {
        onUpdateBlackout({
          backgroundMode: 'image',
          imageUrl: blobUrl,
          mediaName: file.name,
        });
      }
    } catch (err) {
      console.error('Failed to save background file to IndexedDB:', err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 text-zinc-200 text-xs">
      {/* Master Main Action Button */}
      <div className="space-y-2">
        <button
          onClick={onToggleBlackout}
          className={`w-full py-3 px-4 rounded-xl flex items-center justify-center space-x-2 text-sm font-bold transition-all shadow-lg transform active:scale-98 ${
            isEnabled
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/30 ring-2 ring-amber-400/50'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
          }`}
        >
          {isEnabled ? (
            <>
              <Eye className="w-4 h-4 stroke-[2.5]" />
              <span>Показать карту игрокам (Снять заглушку)</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 text-amber-400" />
              <span>Включить заглушку для игроков</span>
            </>
          )}
        </button>

        {/* Status Card */}
        <div
          className={`p-2.5 rounded-xl border text-xs transition-colors flex items-center space-x-2.5 ${
            isEnabled
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isEnabled ? 'bg-amber-400 animate-ping' : 'bg-zinc-600'
            }`}
          />
          <div className="flex-1 min-w-0">
            <span className="font-semibold block truncate">
              {isEnabled ? 'ЭКРАН ИГРОКОВ ЗАКРЫТ' : 'Игроки видят карту в эфире'}
            </span>
            <span className="text-[11px] text-zinc-400 block truncate">
              Фон: {mode === 'preset_video'
                ? `Видео-пресет (${selectedPresetId})`
                : mode === 'video'
                ? 'Кастомный видеоролик'
                : mode === 'youtube'
                ? 'YouTube ролик'
                : mode === 'image'
                ? 'Изображение / GIF'
                : 'Процедурные искры'}
            </span>
          </div>
        </div>
      </div>

      {/* Background Source Navigation Tabs */}
      <div className="space-y-2 pt-1 border-t border-zinc-800">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
          <span>Фон и видеоролики заглушки</span>
          <span className="text-amber-400/80 font-mono text-[10px]">
            {mode.toUpperCase()}
          </span>
        </label>

        <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950/80 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('presets')}
            className={`py-1.5 px-2 rounded-lg font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
              activeTab === 'presets'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Пресеты</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`py-1.5 px-2 rounded-lg font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
              activeTab === 'url'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">URL / YT</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`py-1.5 px-2 rounded-lg font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
              activeTab === 'upload'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Файл</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-1.5 px-2 rounded-lg font-medium flex flex-col items-center justify-center space-y-1 transition-all ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-zinc-950 font-bold shadow'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="text-[10px] leading-none">Опции</span>
          </button>
        </div>

        {/* Tab 1: Video Presets Catalog */}
        {activeTab === 'presets' && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-none">
              {BLACKOUT_VIDEO_PRESETS.map((vp) => {
                const isSelected = mode === 'preset_video' && selectedPresetId === vp.id;
                return (
                  <button
                    key={vp.id}
                    onClick={() => handleSelectVideoPreset(vp.id)}
                    className={`relative p-2 rounded-xl text-left border transition-all overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/15 shadow-md ring-1 ring-amber-400'
                        : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/60'
                    }`}
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="font-semibold text-zinc-100 text-[11px] block leading-tight">
                        {vp.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-400 line-clamp-1 mt-1 block">
                      {vp.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sparkles Mode Reset Button */}
            <button
              onClick={() =>
                onUpdateBlackout && onUpdateBlackout({ backgroundMode: 'embers' })
              }
              className={`w-full py-1.5 px-2 rounded-lg border text-[11px] flex items-center justify-center space-x-1.5 transition-all ${
                mode === 'embers'
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Стандартный режим (Только искры без видео)</span>
            </button>
          </div>
        )}

        {/* Tab 2: Custom URL / YouTube Embed */}
        {activeTab === 'url' && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div>
              <span className="text-[10px] text-zinc-400 block mb-1">
                Ссылка на MP4 / WebM видео, YouTube или картинку:
              </span>
              <div className="relative">
                <input
                  type="text"
                  value={
                    mode === 'youtube'
                      ? blackout?.youtubeUrl || ''
                      : mode === 'video'
                      ? blackout?.videoUrl || ''
                      : mode === 'image'
                      ? blackout?.imageUrl || ''
                      : ''
                  }
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://...mp4 или https://youtube.com/watch?v=..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 pr-7"
                />
                {(blackout?.videoUrl || blackout?.youtubeUrl || blackout?.imageUrl) && (
                  <button
                    onClick={() => handleUrlChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-[10px] text-zinc-400 space-y-1">
              <span className="font-semibold text-zinc-300 block">💡 Поддерживаемые форматы:</span>
              <p>• Прямые ссылки на видео: <strong>.mp4</strong>, <strong>.webm</strong>, <strong>.ogg</strong></p>
              <p>• YouTube видео и трансляции (ссылка из браузера или "Поделиться")</p>
              <p>• Анимированные фоны <strong>.gif</strong> или арты <strong>.png / .jpg</strong></p>
            </div>
          </div>
        )}

        {/* Tab 3: Upload Local File */}
        {activeTab === 'upload' && (
          <div className="space-y-2 animate-in fade-in duration-200">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,image/*,.gif"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-800 hover:border-amber-500/50 bg-zinc-950/50 hover:bg-zinc-900/50 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <div className="p-2 rounded-xl bg-zinc-900 group-hover:bg-amber-500/20 text-zinc-400 group-hover:text-amber-400 transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-200 text-[11px] block">
                  {isUploading ? 'Загрузка и обработка...' : 'Нажмите для выбора видео или картинки'}
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  MP4, WebM, GIF, PNG, JPG (файл сохраняется локально)
                </span>
              </div>
            </div>

            {blackout?.mediaName && (
              <div className="p-2 rounded-lg bg-zinc-950 border border-amber-500/30 flex items-center justify-between text-[11px]">
                <span className="text-zinc-300 truncate font-mono">
                  📁 {blackout.mediaName}
                </span>
                <span className="text-amber-400 font-semibold shrink-0 ml-2">АКТИВЕН</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Display & Cinematic Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-3 p-1 animate-in fade-in duration-200">
            {/* Dimming Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-400">Затемнение фона (Overlay):</span>
                <span className="text-amber-400 font-mono">
                  {Math.round(overlayDim * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={overlayDim}
                onChange={(e) =>
                  onUpdateBlackout &&
                  onUpdateBlackout({ overlayDim: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Blur Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-zinc-400">Размытие фона (Blur):</span>
                <span className="text-amber-400 font-mono">{blurAmount}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={16}
                step={1}
                value={blurAmount}
                onChange={(e) =>
                  onUpdateBlackout &&
                  onUpdateBlackout({ blurAmount: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 h-1 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showEmbers}
                  onChange={(e) =>
                    onUpdateBlackout &&
                    onUpdateBlackout({ showEmbers: e.target.checked })
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-zinc-300">
                  Магические золотые искры поверх видео
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideCard}
                  onChange={(e) =>
                    onUpdateBlackout &&
                    onUpdateBlackout({ hideCard: e.target.checked })
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-zinc-300">
                  Скрыть текст (Только чистое видео на весь экран)
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) =>
                    onUpdateBlackout &&
                    onUpdateBlackout({ soundEnabled: e.target.checked })
                  }
                  className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-[11px] text-zinc-300 flex items-center space-x-1">
                  <span>Включить звук видеоролика</span>
                  {soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-amber-400 ml-1" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500 ml-1" />
                  )}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Story Presets Selection */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center space-x-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Сюжетные темы текста</span>
        </label>

        <div className="grid grid-cols-2 gap-1.5">
          {STORY_PRESETS.map((p) => {
            const Icon = p.icon;
            const isSelected = currentTitle === p.title;

            return (
              <button
                key={p.id}
                onClick={() => handleSelectStoryPreset(p)}
                className={`p-2 rounded-xl text-left border transition-all flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/40 text-zinc-100 shadow-sm'
                    : 'bg-zinc-950/40 hover:bg-zinc-800/60 border-zinc-800/80 text-zinc-300'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-semibold truncate block">
                    {p.badge}
                  </span>
                </div>
                {isSelected && (
                  <Check className="w-3 h-3 text-amber-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Title & Subtitle Inputs */}
      <div className="space-y-2 pt-2 border-t border-zinc-800">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Свой текст на экране игроков
        </label>

        <div className="space-y-2">
          <div>
            <span className="text-[10px] text-zinc-400 block mb-1">Заголовок:</span>
            <input
              type="text"
              value={currentTitle}
              onChange={(e) =>
                onUpdateBlackout && onUpdateBlackout({ title: e.target.value })
              }
              placeholder="Мастер подготавливает карту..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 block mb-1">
              Подзаголовок / подсказка для игроков:
            </span>
            <textarea
              rows={2}
              value={currentSubtitle}
              onChange={(e) =>
                onUpdateBlackout && onUpdateBlackout({ subtitle: e.target.value })
              }
              placeholder="Пожалуйста, подождите..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
});
