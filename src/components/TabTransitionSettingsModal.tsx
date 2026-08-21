import React from 'react';
import { Sparkles, Eye, Shield, Sliders, X, Check } from 'lucide-react';
import { PlayerTransitionConfig } from '../types';

interface TabTransitionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PlayerTransitionConfig;
  onUpdateConfig: (partial: Partial<PlayerTransitionConfig>) => void;
}

export const TabTransitionSettingsModal: React.FC<TabTransitionSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="tab-transition-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="tab-transition-modal-content"
        className="w-full max-w-md bg-neutral-900 border border-neutral-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-neutral-950/80 border-b border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-neutral-100">
              Переключение сцен для игроков
            </h2>
          </div>
          <button
            id="tab-transition-close-btn"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Toggle Enable */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-lg">
            <div>
              <div className="text-sm font-medium text-neutral-200">
                Плавный кинематографичный переход
              </div>
              <div className="text-xs text-neutral-400">
                Мягкое затемнение экрана игроков при смене карты
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => onUpdateConfig({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Transition Style */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Стиль анимации перехода
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateConfig({ type: 'cinematic-fade' })}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                  config.type === 'cinematic-fade'
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : 'bg-neutral-950/40 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span className="text-sm font-medium flex items-center justify-between">
                  Затемнение (Fade)
                  {config.type === 'cinematic-fade' && <Check className="w-4 h-4 text-amber-400" />}
                </span>
                <span className="text-xs text-neutral-400">
                  Мягкое угасание в темноту и появление новой локации
                </span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateConfig({ type: 'crossfade' })}
                className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                  config.type === 'crossfade'
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : 'bg-neutral-950/40 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span className="text-sm font-medium flex items-center justify-between">
                  Плавное растворение
                  {config.type === 'crossfade' && <Check className="w-4 h-4 text-amber-400" />}
                </span>
                <span className="text-xs text-neutral-400">
                  Прямой кроссфейд между сценами
                </span>
              </button>
            </div>
          </div>

          {/* Duration Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                Длительность перехода
              </label>
              <span className="text-xs font-semibold text-amber-400">
                {config.durationMs} мс ({((config.durationMs || 500) / 1000).toFixed(1)} сек)
              </span>
            </div>
            <input
              type="range"
              min={200}
              max={1500}
              step={100}
              value={config.durationMs || 500}
              onChange={(e) => onUpdateConfig({ durationMs: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-neutral-500">
              <span>Быстро (200мс)</span>
              <span>Баланс (500мс)</span>
              <span>Кинематографично (1.5с)</span>
            </div>
          </div>

          {/* Show Location Title */}
          <div className="flex items-center justify-between p-3.5 bg-neutral-950/60 border border-neutral-800 rounded-lg">
            <div>
              <div className="text-sm font-medium text-neutral-200">
                Показывать название локации игрокам
              </div>
              <div className="text-xs text-neutral-400">
                Отображает красивый титр новой локации при входе
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.showLocationTitle}
                onChange={(e) => onUpdateConfig({ showLocationTitle: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-neutral-950/90 border-t border-neutral-800 flex justify-end">
          <button
            id="tab-transition-done-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
};
