import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  Eye,
  Check,
  Download,
  Tv,
  Layers,
  Wand2,
  Key,
  Info,
  Maximize2,
  Compass,
  Palette,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  PolzaEntityContext,
  PolzaModelId,
  PolzaImageSize,
  PolzaArtStylePreset,
  PolzaModelInfo,
  PolzaImageData,
} from '../../types/polzaTypes';
import { polzaService } from '../../services/polzaService';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { POLZA_AVAILABLE_MODELS } from '../../../server/polzaEngine';

interface PolzaImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: PolzaEntityContext;
  onApplyImage?: (imageUrl: string, localAssetUrl?: string) => void;
  onPlaceOnTable?: (imageUrl: string, entity: PolzaEntityContext) => void;
}

const STYLE_PRESETS: { id: PolzaArtStylePreset; label: string; icon: string; desc: string }[] = [
  { id: 'dnd_cinematic', label: 'D&D 5e Арт', icon: '⚔️', desc: 'Кинематографичный стиль официальных книг правил D&D 5e' },
  { id: 'grimdark', label: 'Grimdark Фэнтези', icon: '💀', desc: 'Мрачная атмосфера, глубокие тени, тёмное фэнтези' },
  { id: 'watercolor_rpg', label: 'Акварель RPG', icon: '🎨', desc: 'Художественная акварель с чернильной обводкой' },
  { id: 'concept_art', label: 'Концепт-арт', icon: '🌌', desc: 'Масштабный цифровой концепт-арт для видеоигр' },
  { id: 'oil_painting', label: 'Масляная живопись', icon: '🖌️', desc: 'Классическое масло, свет Рембрандта' },
  { id: 'realistic_photo', label: 'Фотореализм', icon: '📷', desc: 'Реалистичные текстуры, естественный свет 8K' },
  { id: 'anime_fantasy', label: 'Аниме фэнтези', icon: '✨', desc: 'Стилизованное светящееся аниме-фэнтези' },
  { id: 'isometric_token', label: 'Токен для стола', icon: '🪙', desc: 'Изолированный круглый жетон с рамкой' },
  { id: 'retro_pixel', label: 'Ретро Pixel Art', icon: '👾', desc: '16-битный пиксель-арт классических JRPG' },
];

const SIZE_OPTIONS: { id: PolzaImageSize; label: string; ratio: string; iconDesc: string }[] = [
  { id: '1024x1024', label: '1024×1024', ratio: '1:1 Квадрат', iconDesc: 'Предметы, жетоны, заклинания' },
  { id: '1024x1536', label: '1024×1536', ratio: '2:3 Портрет', iconDesc: 'Портреты NPC, монстры' },
  { id: '1536x1024', label: '1536×1024', ratio: '3:2 Пейзаж', iconDesc: 'Локации, панорамы, сцены' },
  { id: '1792x1024', label: '1792×1024', ratio: '16:9 Широкий', iconDesc: 'Кинематографичные фоны' },
  { id: 'auto', label: 'Auto', ratio: 'Автовыбор', iconDesc: 'Размер определяет модель' },
];

export const PolzaImageModal: React.FC<PolzaImageModalProps> = ({
  isOpen,
  onClose,
  entity,
  onApplyImage,
  onPlaceOnTable,
}) => {
  const [models, setModels] = useState<PolzaModelInfo[]>(POLZA_AVAILABLE_MODELS);
  const [selectedModel, setSelectedModel] = useState<PolzaModelId>(
    (polzaService.getStoredModel() as PolzaModelId) || 'tongyi-mai/z-image'
  );
  const [selectedStyle, setSelectedStyle] = useState<PolzaArtStylePreset>(polzaService.getStoredStyle());
  const [selectedSize, setSelectedSize] = useState<PolzaImageSize>('1024x1024');
  const [prompt, setPrompt] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Result state
  const [generatedImages, setGeneratedImages] = useState<PolzaImageData[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);
  const [tablePlacedSuccess, setTablePlacedSuccess] = useState(false);

  // API Key state
  const [hasEnvKey, setHasEnvKey] = useState(false);
  const [customApiKey, setCustomApiKey] = useState<string>(polzaService.getStoredApiKey());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  const timerRef = useRef<any>(null);

  // Initialize models and prompt on open
  useEffect(() => {
    if (!isOpen) return;

    // Load available models and env key status
    polzaService.getModels().then((info) => {
      if (info.models && info.models.length > 0) {
        setModels(info.models);
      }
      setHasEnvKey(info.hasEnvKey);
      if (!info.hasEnvKey && !customApiKey) {
        setShowKeyInput(true);
      }
    });

    // Auto-select optimal size based on entity type
    if (entity.type === 'npc' || entity.type === 'monster') {
      setSelectedSize('1024x1536');
    } else if (entity.type === 'location' || entity.type === 'scene' || entity.type === 'quest') {
      setSelectedSize('1536x1024');
    } else {
      setSelectedSize('1024x1024');
    }

    // Build initial prompt
    generateSmartPrompt(selectedStyle);
    setErrorMsg(null);
    setAppliedSuccess(false);
    setBroadcastSuccess(false);
    setTablePlacedSuccess(false);
  }, [isOpen, entity]);

  // Handle generation timer
  useEffect(() => {
    if (isGeneratingImage) {
      setTimerSeconds(0);
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGeneratingImage]);

  const generateSmartPrompt = async (style: PolzaArtStylePreset) => {
    setIsGeneratingPrompt(true);
    try {
      const res = await polzaService.generatePrompt(entity, style, customInstructions);
      setPrompt(res.prompt);
      if (res.optimalSize) {
        setSelectedSize(res.optimalSize);
      }
    } catch (e: any) {
      console.warn('Smart prompt generation fallback:', e);
      setPrompt(`Masterpiece fantasy art of ${entity.name}, ${entity.description || ''}, high quality D&D 5e illustration`);
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleStyleChange = (style: PolzaArtStylePreset) => {
    setSelectedStyle(style);
    polzaService.setStoredStyle(style);
    generateSmartPrompt(style);
  };

  const handleModelChange = (modelId: PolzaModelId) => {
    setSelectedModel(modelId);
    polzaService.setStoredModel(modelId);
  };

  const handleApiKeySave = (key: string) => {
    setCustomApiKey(key);
    polzaService.setStoredApiKey(key);
  };

  const currentActiveImage = useMemo(() => {
    if (generatedImages.length > 0 && generatedImages[activeImageIndex]) {
      return generatedImages[activeImageIndex];
    }
    return null;
  }, [generatedImages, activeImageIndex]);

  const resolvedImageUrl = useMemo(() => {
    if (!currentActiveImage) return '';
    return currentActiveImage.localAssetUrl || currentActiveImage.url || (currentActiveImage.b64_json ? `data:image/png;base64,${currentActiveImage.b64_json}` : '');
  }, [currentActiveImage]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Пожалуйста, введите или сгенерируйте промпт');
      return;
    }

    if (!hasEnvKey && !customApiKey.trim()) {
      setShowKeyInput(true);
      setErrorMsg('Требуется API ключ Polza AI. Укажите ключ в поле ниже или в .env');
      return;
    }

    setErrorMsg(null);
    setIsGeneratingImage(true);
    setProgressMsg('Подготовка запроса...');
    setAppliedSuccess(false);
    setBroadcastSuccess(false);
    setTablePlacedSuccess(false);

    try {
      const response = await polzaService.generateImage(
        {
          model: selectedModel,
          prompt: prompt.trim(),
          size: selectedSize,
          quality: 'high',
          customApiKey: customApiKey.trim() || undefined,
          entityContext: entity,
          saveToDisk: true,
        },
        (msg) => setProgressMsg(msg)
      );

      if (response.data && response.data.length > 0) {
        setGeneratedImages(response.data);
        setActiveImageIndex(0);
      } else {
        throw new Error('Изображение не было получено в ответе');
      }
    } catch (err: any) {
      console.error('[PolzaImageModal] Generation error:', err);
      setErrorMsg(err.message || 'Ошибка генерации изображения в Polza AI');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // 1. Apply as avatar/art to card
  const handleApplyToCard = () => {
    if (!resolvedImageUrl) return;
    if (onApplyImage) {
      onApplyImage(resolvedImageUrl, currentActiveImage?.localAssetUrl);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3000);
    }
  };

  // 2. Broadcast to player screen
  const handleBroadcastToPlayers = async () => {
    if (!resolvedImageUrl) return;
    const title = entity.name || 'Иллюстрация сцены';
    const subtitle = entity.category || entity.race || entity.school || 'Демонстрация Мастера';
    const ok = await polzaService.broadcastToPlayers(resolvedImageUrl, title, subtitle);
    if (ok) {
      setBroadcastSuccess(true);
      setTimeout(() => setBroadcastSuccess(false), 3000);
    }
  };

  // 3. Place onto Miro tabletop canvas
  const handlePlaceOnCanvas = () => {
    if (!resolvedImageUrl) return;
    if (onPlaceOnTable) {
      onPlaceOnTable(resolvedImageUrl, entity);
    } else {
      // Fallback: copy link or notify
      copyToClipboard(resolvedImageUrl);
    }
    setTablePlacedSuccess(true);
    setTimeout(() => setTablePlacedSuccess(false), 3000);
  };

  // 4. Download Image
  const handleDownload = () => {
    if (!resolvedImageUrl) return;
    const a = document.createElement('a');
    a.href = resolvedImageUrl;
    a.download = `${entity.name || 'polza_art'}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      {/* Lightbox Zoom Modal */}
      {isLightboxOpen && resolvedImageUrl && (
        <div
          className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsLightboxOpen(false)}
        >
          <img
            src={resolvedImageUrl}
            alt={entity.name}
            className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-zinc-800"
          />
        </div>
      )}

      {/* Main Dialog Window */}
      <div
        id="polza-image-generator-modal"
        className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-zinc-100">Генератор графики Polza AI</h2>
                <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
                  AI Art Engine
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Создание визуалов для: <span className="text-amber-300 font-medium">{entity.name}</span>{' '}
                {entity.category && `(${entity.category})`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowKeyInput(!showKeyInput)}
              className={`p-2 rounded-lg border text-xs flex items-center space-x-1.5 transition-colors ${
                hasEnvKey || customApiKey
                  ? 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white'
                  : 'bg-amber-950/40 border-amber-600/50 text-amber-300 animate-pulse'
              }`}
              title="Настройки API ключа"
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {hasEnvKey ? 'Ключ из .env' : customApiKey ? 'Ключ задан' : 'Ввести API ключ'}
              </span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Optional API Key Expandable Banner */}
        {showKeyInput && (
          <div className="px-5 py-3 bg-amber-950/20 border-b border-amber-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                {hasEnvKey
                  ? 'Ключ POLZA_AI_API_KEY подключен через окружение. Вы можете переопределить его для этой сессии:'
                  : 'Введите API ключ Polza AI (получить можно на polza.ai):'}
              </span>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <input
                type="password"
                placeholder="polza_sk_..."
                value={customApiKey}
                onChange={(e) => handleApiKeySave(e.target.value)}
                className="px-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-zinc-100 text-xs focus:outline-none focus:border-amber-500 w-full sm:w-64"
              />
              <button
                onClick={() => setShowKeyInput(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg shrink-0 font-medium"
              >
                Готово
              </button>
            </div>
          </div>
        )}

        {/* Content Body: 2 Columns (Controls / Preview) */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Generation Settings & Prompt Builder (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* 1. Model Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Модель генерации Polza AI</span>
                </span>
                <span className="text-[11px] text-zinc-500 font-normal">По умолчанию: Z-Image</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {models.map((m) => {
                  const isSelected = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleModelChange(m.id)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 text-zinc-100 shadow-xs'
                          : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-amber-400' : 'text-zinc-200'}`}>
                          {m.name}
                        </span>
                        {m.isDefault && (
                          <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">{m.recommendedFor}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Art Style Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Художественный стиль</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {STYLE_PRESETS.map((preset) => {
                  const isSelected = selectedStyle === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleStyleChange(preset.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-xs'
                          : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">{preset.icon}</span>
                        <span className="text-xs font-medium truncate">{preset.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Resolution / Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" />
                <span>Формат и разрешение</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {SIZE_OPTIONS.map((size) => {
                  const isSelected = selectedSize === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      onClick={() => setSelectedSize(size.id)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/60 text-amber-300'
                          : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-semibold">{size.label}</div>
                      <div className="text-[10px] text-zinc-500">{size.ratio}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Prompt Textarea & Smart Generator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Промпт для нейросети</span>
                </label>
                <button
                  type="button"
                  onClick={() => generateSmartPrompt(selectedStyle)}
                  disabled={isGeneratingPrompt || isGeneratingImage}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 disabled:opacity-50 font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingPrompt ? 'animate-spin' : ''}`} />
                  <span>Перегенерировать промпт</span>
                </button>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Подробное описание визуализации..."
                rows={4}
                className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 focus:outline-none focus:border-amber-500 placeholder-zinc-600 resize-none font-mono leading-relaxed"
              />
            </div>

            {/* 5. Custom extra instructions */}
            <div className="space-y-1">
              <label className="text-[11px] text-zinc-400">
                Дополнительные пожелания к арту (освещение, фон, эмоции):
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') generateSmartPrompt(selectedStyle);
                }}
                placeholder="Например: лунный свет, шрам на щеке, светящийся клинок..."
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-500 placeholder-zinc-600"
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 flex items-start space-x-2">
                <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>
            )}

            {/* Generate Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGeneratingImage || isGeneratingPrompt}
              className={`w-full py-3.5 px-4 rounded-xl font-semibold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
                isGeneratingImage
                  ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-bold shadow-amber-500/20 active:scale-[0.99]'
              }`}
            >
              {isGeneratingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>
                    {progressMsg || 'Генерация изображения...'} ({timerSeconds}с)
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Сгенерировать арт в Polza AI</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Preview & Action Dock (5 cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Результат генерации</span>
              </span>
              {resolvedImageUrl && (
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Увеличить</span>
                </button>
              )}
            </div>

            {/* Main Preview Box */}
            <div className="relative flex-1 min-h-[280px] bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center overflow-hidden group shadow-inner">
              {resolvedImageUrl ? (
                <>
                  <img
                    src={resolvedImageUrl}
                    alt={entity.name}
                    className="w-full h-full object-contain cursor-zoom-in group-hover:scale-102 transition-transform duration-300"
                    onClick={() => setIsLightboxOpen(true)}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/70 backdrop-blur-xs border border-zinc-700/60 rounded-md text-[10px] text-zinc-300">
                    {selectedModel.split('/')[1] || selectedModel} • {selectedSize}
                  </div>
                </>
              ) : isGeneratingImage ? (
                <div className="flex flex-col items-center justify-center space-y-3 p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-spin">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-200">{progressMsg}</p>
                    <p className="text-[11px] text-zinc-500">Прошло времени: {timerSeconds} сек</p>
                  </div>
                </div>
              ) : entity.currentImageUrl && entity.currentImageUrl.trim() ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-2">
                  <img
                    src={entity.currentImageUrl}
                    alt="Текущее изображение"
                    className="max-w-full max-h-56 object-contain opacity-50 rounded-lg"
                  />
                  <span className="absolute bottom-3 text-[11px] text-zinc-400 bg-black/60 px-2 py-1 rounded">
                    Текущая иллюстрация карточки
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2 p-6 text-center text-zinc-600">
                  <Palette className="w-10 h-10 stroke-1" />
                  <p className="text-xs text-zinc-400">Нажмите «Сгенерировать арт в Polza AI»</p>
                  <p className="text-[11px] text-zinc-600 max-w-xs">
                    Результат можно будет сразу показать игрокам, вставить в карточку или бросить на игровой стол.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions Panel when image is ready */}
            {resolvedImageUrl && (
              <div className="space-y-2 pt-1">
                {/* 1. Primary Action: Apply to Card */}
                {onApplyImage && (
                  <button
                    type="button"
                    onClick={handleApplyToCard}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                      appliedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300'
                    }`}
                  >
                    {appliedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>Иллюстрация применена к карточке!</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Применить как аватар / арт карточки</span>
                      </>
                    )}
                  </button>
                )}

                {/* 2. Broadcast to Player Screen */}
                <button
                  type="button"
                  onClick={handleBroadcastToPlayers}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                    broadcastSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  }`}
                  title="Отправить изображение на экран игроков (проектор/шторку)"
                >
                  {broadcastSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Показано на экране игроков!</span>
                    </>
                  ) : (
                    <>
                      <Tv className="w-4 h-4 text-purple-400" />
                      <span>Показать игрокам на проекторе</span>
                    </>
                  )}
                </button>

                {/* 3. Place onto Tabletop Canvas & Download */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handlePlaceOnCanvas}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium flex items-center justify-center space-x-1.5 transition-all ${
                      tablePlacedSuccess
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                    }`}
                    title="Разместить арт как токен/хэндаут на игровом столе"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>{tablePlacedSuccess ? 'На столе!' : 'На стол'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="py-2 px-2.5 rounded-xl text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Скачать PNG</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
