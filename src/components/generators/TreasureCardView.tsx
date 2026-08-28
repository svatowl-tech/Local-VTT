import React, { useState } from 'react';
import { TreasureRawData } from '../../types/generatorTypes';
import { MapItem } from '../../types';
import { 
  createTreasureTokenItem, 
  createTreasureContentCardItem, 
  createTreasureLoreItem 
} from '../../utils/cardImportHelper';
import { worldLoreService } from '../../services/worldLoreService';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { copyToClipboard } from '../../utils/clipboardUtils';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';
import { 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  Layers, 
  ExternalLink, 
  BookOpen, 
  Coins, 
  Gem, 
  Crown, 
  BookmarkCheck,
  ShieldAlert,
  Lock,
  Scroll,
  Archive
} from 'lucide-react';

interface Props {
  treasure: TreasureRawData;
  rawText: string;
  onImportMapItem?: (item: MapItem) => void;
  onShowToast?: (msg: string) => void;
}

export const TreasureCardView: React.FC<Props> = ({
  treasure,
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
    if (onShowToast) onShowToast('Текст сокровищ скопирован');
  };

  const handlePlaceToken = () => {
    if (!onImportMapItem) return;
    const tokenItem = createTreasureTokenItem(treasure);
    onImportMapItem(tokenItem);
    setTokenPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setTokenPlaced(false), 2500);
    if (onShowToast) onShowToast(`Сундук сокровищ (CR ${treasure.level}) добавлен на карту!`);
  };

  const handlePlaceCard = () => {
    if (!onImportMapItem) return;
    const cardItem = createTreasureContentCardItem(treasure);
    onImportMapItem(cardItem);
    setCardPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setCardPlaced(false), 2500);
    if (onShowToast) onShowToast(`Карточка сокровищницы помещена на стол!`);
  };

  const handleSaveToLore = async () => {
    try {
      const loreItem = createTreasureLoreItem(treasure);
      await worldLoreService.saveItem(loreItem);
      setSavedToLore(true);
      playUniversalSfx('success');
      setTimeout(() => setSavedToLore(false), 3000);
      if (onShowToast) onShowToast(`Клад (CR ${treasure.level}) сохранен в Энциклопедию лора!`);
    } catch (err) {
      console.error('Failed to save treasure to lore:', err);
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
            {viewMode === 'card' ? <FileText className="w-3.5 h-3.5 text-zinc-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
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
          <PolzaGenerateButton
            entity={{
              type: 'item',
              id: treasure.container || 'Сокровища',
              name: treasure.container || 'Сокровищница',
              subtitle: `Уровень ${treasure.level} (${treasure.grandTotalValueGp} gp)`,
              description: `${rawText}. Содержит драгоценности: ${treasure.gems?.map((g) => g.name).join(', ') || ''}. Арт: ${treasure.artObjects?.map((a) => a.name).join(', ') || ''}. Магия: ${treasure.magicItems?.join(', ') || ''}`,
            }}
            onApplyImage={(imgUrl) => {
              if (onShowToast) onShowToast(`Арт Polza AI применён к сокровищу`);
            }}
            onPlaceOnTable={
              onImportMapItem
                ? (imgUrl) => {
                    const token = createTreasureTokenItem(treasure);
                    if (token) {
                      (token as any).img = imgUrl;
                      (token as any).tokenImg = imgUrl;
                      onImportMapItem(token);
                      if (onShowToast) onShowToast(`Токен сокровища с артом Polza AI добавлен на стол`);
                    }
                  }
                : undefined
            }
          />

          <button
            onClick={handlePlaceToken}
            className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Поместить сундук с сокровищами на карту"
          >
            {tokenPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-amber-400" />}
            <span>{tokenPlaced ? 'Клад на карте!' : 'Клад на карту'}</span>
          </button>

          <button
            onClick={handlePlaceCard}
            className="px-2.5 py-1.5 bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-600/60 text-yellow-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Поместить интерактивную карточку сокровищ на стол"
          >
            {cardPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 text-yellow-400" />}
            <span>{cardPlaced ? 'На столе!' : 'Карточка на стол'}</span>
          </button>

          <button
            onClick={handleSaveToLore}
            className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Сохранить сокровища в лор"
          >
            {savedToLore ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <BookOpen className="w-3.5 h-3.5 text-purple-400" />}
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
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3 gap-2">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Уровень / CR {treasure.level}
                </span>
                {treasure.theme && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-amber-300 border border-amber-500/30">
                    {treasure.theme}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{treasure.theme ? `Сокровищница: ${treasure.theme}` : 'Сокровищница и клад'}</span>
              </h3>
              {treasure.themeDesc && (
                <p className="text-[11px] text-zinc-400 leading-snug">{treasure.themeDesc}</p>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] text-zinc-400 block font-medium">Расчетная стоимость</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                ~{treasure.grandTotalValueGp.toLocaleString('ru-RU')} gp
              </span>
            </div>
          </div>

          {/* Container & Trap Block */}
          {(treasure.container || treasure.trap) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              {treasure.container && (
                <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-1">
                  <div className="flex items-center justify-between text-amber-400 font-bold text-[10px] uppercase">
                    <span className="flex items-center space-x-1">
                      <Archive className="w-3 h-3" />
                      <span>Хранилище:</span>
                    </span>
                    {treasure.lockDc !== undefined && (
                      <span className="flex items-center space-x-1 text-zinc-400 font-mono">
                        <Lock className="w-3 h-3 text-zinc-500" />
                        <span>DC {treasure.lockDc > 0 ? treasure.lockDc : '—'}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-200 font-medium">{treasure.container}</p>
                  {treasure.containerDesc && (
                    <p className="text-[10px] text-zinc-400">{treasure.containerDesc}</p>
                  )}
                </div>
              )}

              {treasure.trap && (
                <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/30 space-y-1">
                  <div className="flex items-center justify-between text-rose-400 font-bold text-[10px] uppercase">
                    <span className="flex items-center space-x-1">
                      <ShieldAlert className="w-3 h-3" />
                      <span>Защита / Ловушка:</span>
                    </span>
                    {treasure.trapDetectDc ? (
                      <span className="text-[10px] text-rose-300 font-mono">
                        DC {treasure.trapDetectDc}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-rose-200 font-medium">{treasure.trap}</p>
                  {treasure.trapEffect && (
                    <p className="text-[10px] text-zinc-400">{treasure.trapEffect}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Coins Bar */}
          <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
              <Coins className="w-3.5 h-3.5" />
              <span>Монеты в кладе:</span>
            </span>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
                <span className="text-[10px] text-amber-500/90 block">Золотые (gp)</span>
                <span className="font-bold text-sm text-amber-300">{treasure.coins.gp.toLocaleString('ru-RU')}</span>
              </div>
              <div className="bg-zinc-800/40 p-2 rounded-lg border border-zinc-700/50">
                <span className="text-[10px] text-zinc-400 block">Серебряные (sp)</span>
                <span className="font-bold text-sm text-zinc-200">{treasure.coins.sp.toLocaleString('ru-RU')}</span>
              </div>
              <div className="bg-orange-950/30 p-2 rounded-lg border border-orange-900/40">
                <span className="text-[10px] text-orange-400 block">Медные (cp)</span>
                <span className="font-bold text-sm text-orange-300">{treasure.coins.cp.toLocaleString('ru-RU')}</span>
              </div>
              <div className="bg-cyan-950/30 p-2 rounded-lg border border-cyan-900/40">
                <span className="text-[10px] text-cyan-400 block">Платиновые (pp)</span>
                <span className="font-bold text-sm text-cyan-200">{treasure.coins.pp.toLocaleString('ru-RU')}</span>
              </div>
            </div>
          </div>

          {/* Gems & Art Objects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            {/* Gems */}
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1">
                <Gem className="w-3 h-3" />
                <span>Драгоценные камни ({treasure.gems.length})</span>
              </span>
              {treasure.gems.length > 0 ? (
                <ul className="space-y-1 text-zinc-300">
                  {treasure.gems.map((g, idx) => (
                    <li key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="truncate pr-1">• {g.name}</span>
                      <span className="text-cyan-300 font-mono shrink-0">{g.value} gp</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[10px] text-zinc-500 italic">Нет самоцветов</span>
              )}
            </div>

            {/* Art Objects */}
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                <Crown className="w-3 h-3" />
                <span>Предметы искусства ({treasure.artObjects.length})</span>
              </span>
              {treasure.artObjects.length > 0 ? (
                <ul className="space-y-1 text-zinc-300">
                  {treasure.artObjects.map((a, idx) => (
                    <li key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="truncate pr-1">• {a.name}</span>
                      <span className="text-amber-300 font-mono shrink-0">{a.value} gp</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-[10px] text-zinc-500 italic">Нет предметов искусства</span>
              )}
            </div>
          </div>

          {/* Magic Items */}
          <div className="bg-purple-950/20 p-2.5 rounded-xl border border-purple-900/30 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>Магические предметы и артефакты ({treasure.magicItems.length})</span>
            </span>
            {treasure.magicItems.length > 0 ? (
              <div className="space-y-1">
                {treasure.magicItems.map((m, idx) => (
                  <div key={idx} className="text-[11px] text-purple-200 bg-purple-950/40 p-1.5 rounded-lg border border-purple-900/40 flex items-center space-x-1.5">
                    <span className="text-purple-400 font-bold">✦</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-zinc-500 italic">Нет магических предметов</span>
            )}
          </div>

          {/* Special Item Prompt */}
          {treasure.specialItem && (
            <div className="bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30 text-[11px] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                <Scroll className="w-3 h-3" />
                <span>Сюжетная находка:</span>
              </span>
              <p className="text-zinc-200 italic">✦ {treasure.specialItem}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
