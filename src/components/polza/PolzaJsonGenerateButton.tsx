import React, { useState } from 'react';
import { Sparkles, FileJson } from 'lucide-react';
import { PolzaEntityType, PolzaDataGenOptions } from '../../types/polzaTypes';
import { PolzaJsonModal } from './PolzaJsonModal';

interface PolzaJsonGenerateButtonProps {
  entityType?: PolzaEntityType;
  initialOptions?: Partial<PolzaDataGenOptions>;
  onGenerated?: (jsonData: any, imagePrompt?: string, entityType?: PolzaEntityType) => void;
  variant?: 'compact' | 'full' | 'icon' | 'badge' | 'ghost';
  className?: string;
  label?: string;
}

export const PolzaJsonGenerateButton: React.FC<PolzaJsonGenerateButtonProps> = ({
  entityType = 'monster',
  initialOptions,
  onGenerated,
  variant = 'compact',
  className = '',
  label,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const defaultLabel = label || 'Заполнить через Polza AI';

  return (
    <>
      {variant === 'icon' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`p-1.5 rounded-lg bg-zinc-900/80 hover:bg-amber-500/20 border border-zinc-800 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-colors shadow-xs ${className}`}
          title="Сгенерировать сущность в Polza AI (JSON)"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>
      )}

      {variant === 'badge' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-400 flex items-center space-x-1 transition-all ${className}`}
          title="Сгенерировать данные в Polza AI"
        >
          <Sparkles className="w-2.5 h-2.5" />
          <span>{defaultLabel}</span>
        </button>
      )}

      {variant === 'ghost' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1.5 transition-colors ${className}`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{defaultLabel}</span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-900/90 hover:bg-amber-500/15 border border-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300 flex items-center space-x-1.5 transition-all shadow-xs shrink-0 ${className}`}
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>{defaultLabel}</span>
        </button>
      )}

      {variant === 'full' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsModalOpen(true);
          }}
          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 hover:border-amber-500/60 text-amber-300 flex items-center justify-center space-x-2 transition-all shadow-xs ${className}`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{defaultLabel}</span>
        </button>
      )}

      {/* JSON Generation Modal */}
      <PolzaJsonModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialEntityType={entityType}
        initialOptions={initialOptions}
        onGenerated={onGenerated}
      />
    </>
  );
};
