import React, { useState } from 'react';
import { LootRawData } from '../../types/generatorTypes';
import { MapItem } from '../../types';
import { 
  createLootTokenItem, 
  createLootContentCardItem, 
  createLootLoreItem 
} from '../../utils/cardImportHelper';
import { worldLoreService } from '../../services/worldLoreService';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  Layers, 
  ExternalLink, 
  BookOpen, 
  Coins, 
  Package, 
  BookmarkCheck,
  Zap,
  Gem,
  FileSearch,
  AlertTriangle
} from 'lucide-react';

interface Props {
  loot: LootRawData;
  rawText: string;
  onImportMapItem?: (item: MapItem) => void;
  onShowToast?: (msg: string) => void;
}

export const LootCardView: React.FC<Props> = ({
  loot,
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
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    playUniversalSfx('click');
    setTimeout(() => setCopied(false), 2000);
    if (onShowToast) onShowToast('Текст добычи скопирован в буфер');
  };

  const handlePlaceToken = () => {
    if (!onImportMapItem) return;
    const tokenItem = createLootTokenItem(loot);
    onImportMapItem(tokenItem);
    setTokenPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setTokenPlaced(false), 2500);
    if (onShowToast) onShowToast('Мешок с добычей добавлен на карту!');
  };

  const handlePlaceCard = () => {
    if (!onImportMapItem) return;
    const cardItem = createLootContentCardItem(loot);
    onImportMapItem(cardItem);
    setCardPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setCardPlaced(false), 2500);
    if (onShowToast) onShowToast('Карточка лута помещена на рабочий стол!');
  };

  const handleSaveToLore = async () => {
    try {
      const loreItem = createLootLoreItem(loot);
      await worldLoreService.saveItem(loreItem);
      setSavedToLore(true);
      playUniversalSfx('success');
      setTimeout(() => setSavedToLore(false), 3000);
      if (onShowToast) onShowToast('Трофей и добыча сохранены в Энциклопедию лора!');
    } catch (err) {
      console.error('Failed to save loot to lore:', err);
    }
  };

  const itemsToDisplay = (loot.items && loot.items.length > 0)
    ? loot.items
    : (loot.monsterItem ? [loot.monsterItem] : ['Обычные вещи']);

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* 1. Action Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'text' : 'card')}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            {viewMode === 'card' ? <FileText className="w-3.5 h-3.5 text-zinc-400" /> : <Sparkles className="w-3.5 h-3.5 text-emerald-400" />}
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
            className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/60 text-emerald-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Поместить мешок с лутом на карту"
          >
            {tokenPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{tokenPlaced ? 'Мешок на карте!' : 'Мешок на карту'}</span>
          </button>

          <button
            onClick={handlePlaceCard}
            className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Поместить карточку лута на стол"
          >
            {cardPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 text-amber-400" />}
            <span>{cardPlaced ? 'На столе!' : 'Карточка на стол'}</span>
          </button>

          <button
            onClick={handleSaveToLore}
            className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Сохранить лут в лор"
          >
            {savedToLore ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <BookOpen className="w-3.5 h-3.5 text-purple-400" />}
            <span>{savedToLore ? 'В лоре!' : 'В лор'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content View */}
      {viewMode === 'text' ? (
        <div className="w-full h-80 bg-zinc-950 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
          <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{rawText}</pre>
        </div>
      ) : (
        <div className="w-full bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 rounded-2xl border border-zinc-800 p-4 space-y-3.5 shadow-xl select-text">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-2.5 gap-2">
            <div className="flex items-start space-x-2">
              <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-800/50 shrink-0">
                <Package className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-1.5 mb-1">
                  {loot.tier && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Уровень {loot.tier.toUpperCase()}
                    </span>
                  )}
                  {loot.richness && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-amber-300 border border-zinc-700">
                      {loot.richness === 'poor' ? 'Скудный' : (loot.richness === 'rich' ? 'Богатый' : (loot.richness === 'lavish' ? 'Роскошный' : 'Обычный'))}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-zinc-100">
                  {loot.source || 'Карманная добыча и трофеи'}
                </h3>
                <p className="text-[11px] text-zinc-400">{loot.category || 'Случайные находки'}</p>
              </div>
            </div>
          </div>

          {/* Condition Alert */}
          {loot.condition && loot.condition !== 'Обычное состояние' && (
            <div className="bg-amber-950/30 p-2.5 rounded-xl border border-amber-900/40 flex items-start space-x-2 text-[11px]">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-300 font-bold">{loot.condition}: </strong>
                <span className="text-zinc-300">{loot.conditionDesc}</span>
              </div>
            </div>
          )}

          {/* Coins Bar */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
              <Coins className="w-3.5 h-3.5" />
              <span>Монеты в карманах / схроне:</span>
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
                <span className="text-[10px] text-amber-500/90 block">Золотые (gp)</span>
                <span className="font-bold text-sm text-amber-300">{loot.coins.gp}</span>
              </div>
              <div className="bg-zinc-800/40 p-2 rounded-lg border border-zinc-700/50">
                <span className="text-[10px] text-zinc-400 block">Серебряные (sp)</span>
                <span className="font-bold text-sm text-zinc-200">{loot.coins.sp}</span>
              </div>
              <div className="bg-orange-950/30 p-2 rounded-lg border border-orange-900/40">
                <span className="text-[10px] text-orange-400 block">Медные (cp)</span>
                <span className="font-bold text-sm text-orange-300">{loot.coins.cp}</span>
              </div>
            </div>
          </div>

          {/* Harvested Items & Gear */}
          <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Найденные вещи и трофеи:</span>
            </span>
            <div className="space-y-1">
              {itemsToDisplay.map((item, idx) => (
                <p key={idx} className="text-xs font-medium text-zinc-200 bg-zinc-950/60 p-1.5 rounded-lg border border-zinc-800/80">
                  • {item}
                </p>
              ))}
            </div>
          </div>

          {/* Valuable Curiosity */}
          {loot.valuable && (
            <div className="bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30 space-y-1 text-[11px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                <Gem className="w-3 h-3" />
                <span>Ювелирная ценность / Диковинка:</span>
              </span>
              <p className="text-amber-200 font-semibold bg-zinc-950/50 p-1.5 rounded-lg border border-amber-900/40">
                ✦ {loot.valuable}
              </p>
            </div>
          )}

          {/* Trinket */}
          <div className="bg-purple-950/20 p-2.5 rounded-xl border border-purple-900/30 space-y-1 text-[11px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Безделушка (Trinket):</span>
            </span>
            <p className="text-xs text-purple-200 italic bg-zinc-950/60 p-2 rounded-lg border border-purple-900/40">
              «{loot.trinket}»
            </p>
          </div>

          {/* Story Clue */}
          {loot.clue && (
            <div className="bg-cyan-950/20 p-2.5 rounded-xl border border-cyan-900/30 space-y-1 text-[11px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1">
                <FileSearch className="w-3 h-3" />
                <span>Сюжетная улика / Документ:</span>
              </span>
              <p className="text-zinc-200 italic bg-zinc-950/50 p-1.5 rounded-lg border border-cyan-900/40">
                ✦ {loot.clue}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
