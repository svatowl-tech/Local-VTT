import React, { useState } from 'react';
import { MerchantRawData } from '../../types/generatorTypes';
import { MapItem } from '../../types';
import { 
  createMerchantTokenItem, 
  createMerchantContentCardItem, 
  createMerchantLoreItem 
} from '../../utils/cardImportHelper';
import { worldLoreService } from '../../services/worldLoreService';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  Layers, 
  ExternalLink, 
  BookOpen, 
  Store, 
  Tag, 
  BookmarkCheck 
} from 'lucide-react';

interface Props {
  merchant: MerchantRawData;
  rawText: string;
  onImportMapItem?: (item: MapItem) => void;
  onShowToast?: (msg: string) => void;
}

export const MerchantCardView: React.FC<Props> = ({
  merchant,
  rawText,
  onImportMapItem,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'text'>('card');
  const [copied, setCopied] = useState(false);
  const [savedToLore, setSavedToLore] = useState(false);
  const [tokenPlaced, setTokenPlaced] = useState(false);
  const [cardPlaced, setCardPlaced] = useState(false);

  const handleCopy = () => {
    copyToClipboard(rawText);
    setCopied(true);
    playUniversalSfx('click');
    setTimeout(() => setCopied(false), 2000);
    if (onShowToast) onShowToast('Текст лавки скопирован');
  };

  const handlePlaceToken = () => {
    if (!onImportMapItem) return;
    const tokenItem = createMerchantTokenItem(merchant);
    onImportMapItem(tokenItem);
    setTokenPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setTokenPlaced(false), 2500);
    if (onShowToast) onShowToast(`Лавка торговца «${merchant.name}» добавлена на карту!`);
  };

  const handlePlaceCard = () => {
    if (!onImportMapItem) return;
    const cardItem = createMerchantContentCardItem(merchant);
    onImportMapItem(cardItem);
    setCardPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setCardPlaced(false), 2500);
    if (onShowToast) onShowToast(`Витрина торговца «${merchant.name}» помещена на стол!`);
  };

  const handleSaveToLore = async () => {
    try {
      const loreItem = createMerchantLoreItem(merchant);
      await worldLoreService.saveItem(loreItem);
      setSavedToLore(true);
      playUniversalSfx('success');
      setTimeout(() => setSavedToLore(false), 3000);
      if (onShowToast) onShowToast(`Лавка «${merchant.name}» сохранена в Энциклопедию лора!`);
    } catch (err) {
      console.error('Failed to save merchant to lore:', err);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* 1. Action Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'text' : 'card')}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            {viewMode === 'card' ? <FileText className="w-3.5 h-3.5 text-zinc-400" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
            <span>{viewMode === 'card' ? 'Текст' : 'Карточка'}</span>
          </button>
          
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
          </button>
        </div>

        {/* Action Group */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handlePlaceToken}
            className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Поместить лавку торговца на карту"
          >
            {tokenPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-purple-400" />}
            <span>{tokenPlaced ? 'Лавка на карте!' : 'Лавка на карту'}</span>
          </button>

          <button
            onClick={handlePlaceCard}
            className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Поместить карточку витрины торговца на стол"
          >
            {cardPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 text-amber-400" />}
            <span>{cardPlaced ? 'На столе!' : 'Витрина на стол'}</span>
          </button>

          <button
            onClick={handleSaveToLore}
            className="px-2.5 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-600/60 text-indigo-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Сохранить лавку в лор"
          >
            {savedToLore ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <BookOpen className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{savedToLore ? 'В лоре!' : 'В лор'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Display */}
      {viewMode === 'text' ? (
        <div className="w-full h-80 bg-zinc-950 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
          <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{rawText}</pre>
        </div>
      ) : (
        <div className="w-full bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 rounded-2xl border border-zinc-800 p-4 space-y-3.5 shadow-xl select-text">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-purple-950/60 border border-purple-800/50">
                <Store className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                  <span>Торговец {merchant.name}</span>
                </h3>
                <p className="text-[11px] text-zinc-400 italic">
                  Характер: {merchant.mood}
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {merchant.inventory.length} товаров
            </span>
          </div>

          {/* Inventory Table */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
              <Tag className="w-3.5 h-3.5" />
              <span>Ассортимент лавки и цены:</span>
            </span>
            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {merchant.inventory.map((item, idx) => (
                <div key={idx} className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800/80 flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-200 block truncate">{item.name}</span>
                    <span className="text-[10px] text-zinc-400 block">{item.desc}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-950/40 text-amber-300 text-[11px] font-bold font-mono rounded-lg border border-amber-900/50 shrink-0">
                    {item.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
