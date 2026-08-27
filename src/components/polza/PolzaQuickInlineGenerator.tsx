import React, { useState } from 'react';
import { Sparkles, Loader2, Check, Settings, AlertCircle } from 'lucide-react';
import { PolzaEntityType, PolzaDataGenOptions } from '../../types/polzaTypes';
import { polzaEntityAdapterService, AdaptedPolzaEntityResult } from '../../services/polzaEntityAdapterService';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { PolzaJsonModal } from './PolzaJsonModal';

interface PolzaQuickInlineGeneratorProps {
  entityType: PolzaEntityType | 'prop' | string;
  placeholder?: string;
  defaultPrompt?: string;
  buttonLabel?: string;
  initialOptions?: Partial<PolzaDataGenOptions>;
  onGenerated?: (result: AdaptedPolzaEntityResult) => void;
  className?: string;
  compact?: boolean;
}

export const PolzaQuickInlineGenerator: React.FC<PolzaQuickInlineGeneratorProps> = ({
  entityType,
  placeholder = 'Введите имя или концепт для генерации...',
  defaultPrompt = '',
  buttonLabel = 'Сгенерировать ИИ',
  initialOptions,
  onGenerated,
  className = '',
  compact = false,
}) => {
  const [promptInput, setPromptInput] = useState<string>(defaultPrompt);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState<boolean>(false);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setStatusMsg('Polza AI генерирует сущность...');
    setErrorMsg(null);

    try {
      const adapted = await polzaEntityAdapterService.generateAndSaveEntity(
        entityType,
        promptInput.trim(),
        initialOptions
      );

      playUniversalSfx('success');
      setStatusMsg(`✓ Создано: ${adapted.name}`);
      
      if (onGenerated) {
        onGenerated(adapted);
      }

      setTimeout(() => {
        setStatusMsg(null);
      }, 4000);
    } catch (err: any) {
      console.error('Quick inline generation error:', err);
      setErrorMsg(err.message || 'Ошибка генерации');
      playUniversalSfx('error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isGenerating) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      {/* Input box */}
      <div className="relative flex-1 min-w-[200px]">
        <input
          type="text"
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          className="w-full pl-3 pr-8 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all disabled:opacity-50"
        />
        {promptInput && (
          <button
            type="button"
            onClick={() => setPromptInput('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            ✕
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs ${
            isGenerating
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-amber-500/20'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              <span>Создаётся...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{buttonLabel}</span>
            </>
          )}
        </button>

        {/* Gear icon for optional advanced modal */}
        <button
          type="button"
          onClick={() => setIsAdvancedModalOpen(true)}
          title="Расширенные настройки Polza AI (JSON / Модели)"
          className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-amber-400 transition-colors cursor-pointer shrink-0"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Status or Error Toast inline */}
      {statusMsg && (
        <div className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg shrink-0 animate-in fade-in">
          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg shrink-0 animate-in fade-in">
          <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Advanced Full Modal */}
      <PolzaJsonModal
        isOpen={isAdvancedModalOpen}
        onClose={() => setIsAdvancedModalOpen(false)}
        initialEntityType={entityType as PolzaEntityType}
        initialOptions={{ ...initialOptions, userPrompt: promptInput }}
        onGenerated={() => {
          setIsAdvancedModalOpen(false);
          if (onGenerated) {
            // Trigger refresh
            onGenerated({} as any);
          }
        }}
      />
    </div>
  );
};
