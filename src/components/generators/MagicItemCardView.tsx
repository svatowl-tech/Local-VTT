import React, { useState } from 'react';
import { MagicItemRawData } from '../../types/generatorTypes';
import { Wand2, Sparkles, Flame, Shield, Coins, BookOpen, Key, Copy, Check, Zap, Eye, Skull } from 'lucide-react';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';

interface MagicItemCardViewProps {
  magicData: MagicItemRawData;
  rawText: string;
  onShowToast?: (msg: string) => void;
}

export const MagicItemCardView: React.FC<MagicItemCardViewProps> = ({ magicData, rawText, onShowToast }) => {
  const [copied, setCopied] = React.useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const { item } = magicData;

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    if (onShowToast) onShowToast('Магический предмет скопирован в буфер обмена');
    setTimeout(() => setCopied(false), 2000);
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity) {
      case 'Common': return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'Uncommon': return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
      case 'Rare': return 'bg-sky-950/60 text-sky-300 border-sky-500/40';
      case 'Very Rare': return 'bg-purple-950/60 text-purple-300 border-purple-500/40';
      case 'Legendary': return 'bg-amber-950/60 text-amber-300 border-amber-500/50';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          {customAvatarUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-amber-500/30 shrink-0">
              <img
                src={customAvatarUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 shrink-0">
              <Wand2 className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-bold text-amber-300 tracking-wide">{item.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
              <span className="text-xs text-zinc-300 font-semibold">{item.schoolNameRu}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">{item.typeNameRu}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getRarityBadgeColor(item.rarity)}`}>
            {item.rarityRu}
          </span>

          <PolzaGenerateButton
            entity={{
              type: 'item',
              id: item.name,
              name: item.name,
              subtitle: `${item.rarityRu} ${item.typeNameRu}`,
              rarity: item.rarity,
              description: `${item.description || ''}. ${item.lore || ''}. ${item.activeAbility || ''}`,
            }}
            onApplyImage={(imgUrl) => {
              setCustomAvatarUrl(imgUrl);
              if (onShowToast) onShowToast(`Арт Polza AI применён к ${item.name}`);
            }}
          />

          <button
            onClick={handleCopyText}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 text-xs font-semibold rounded-lg border border-zinc-700/80 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано' : 'Копировать'}</span>
          </button>
        </div>
      </div>

      {/* Grid Activation & Charges Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Настройка (Attunement)</span>
          <span className="text-zinc-200 font-semibold mt-1">
            {item.attunement ? `Требуется (${item.attunementDesc || 'Стандарт'})` : 'Не требуется'}
          </span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Заряды / Использование</span>
          <span className="text-amber-300 font-bold mt-1">{item.charges || 'Постоянное действие'}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Кодовое слово / Ценность</span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-zinc-200 font-mono text-[11px]">{item.commandWord || '—'}</span>
            <span className="text-amber-400 font-bold">{item.valueGp} gp</span>
          </div>
        </div>
      </div>

      {/* Active Ability & Passive Effect */}
      <div className="space-y-2 text-xs">
        <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-lg flex items-start space-x-2">
          <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Активируемая способность</span>
            <p className="text-amber-100/90 leading-relaxed mt-0.5">{item.activeAbility}</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800/80 p-2.5 rounded-lg flex items-start space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-bold block">Пассивная аура / Эффект</span>
            <p className="text-zinc-200 leading-relaxed mt-0.5">{item.passiveEffect}</p>
          </div>
        </div>
      </div>

      {/* Description & Lore */}
      <div className="space-y-2 text-xs">
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Внешний вид</span>
          <p className="text-zinc-300 leading-relaxed">{item.description}</p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">История и Лор предмета</span>
          <p className="text-zinc-400 italic leading-relaxed">"{item.lore}"</p>
        </div>
      </div>
    </div>
  );
};
