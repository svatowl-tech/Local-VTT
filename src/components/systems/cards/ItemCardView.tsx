import React, { useState } from 'react';
import { Package, Coins, Weight, Shield, Sparkles, Zap, Crosshair, Pin, Eye } from 'lucide-react';
import { SystemReferenceSearchItem } from '../../../services/rustSystemSearchService';
import { playUniversalSfx } from '../../../utils/sfxAudio';
import { resolveFoundryImageUrl } from '../../../utils/foundryImageResolver';
import { PolzaGenerateButton } from '../../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../../types/polzaTypes';

interface Props {
  item: SystemReferenceSearchItem;
  onRollDice?: (expression: string, label: string) => void;
  onPlaceOnCanvas?: (item: SystemReferenceSearchItem) => void;
}

export const ItemCardView: React.FC<Props> = ({ item, onRollDice, onPlaceOnCanvas }) => {
  const [isImgModalOpen, setIsImgModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  const data = item.data || {};
  const itemType = data.type || data.itemType || item.category || 'Предмет';
  const cost = data.cost || data.price || data.value || '—';
  const weight = data.weight !== undefined ? `${data.weight} фнт.` : (data.wt || '—');
  const rarity = data.rarity || 'Обычный';
  const attunement = data.attunement ? 'Требует настройки' : null;
  const description = data.description || data.desc || data.content || item.summary;
  const properties = data.properties || data.traits || [];

  const rawImgPath = item.img || data.img || item.tokenImg || data.prototypeToken?.texture?.src;
  const initialAvatarUrl = resolveFoundryImageUrl(rawImgPath, item.systemId);
  const avatarUrl = customAvatarUrl || initialAvatarUrl;
  const fullArtUrl = avatarUrl;

  const polzaEntityContext: PolzaEntityContext = {
    type: 'item',
    id: item.id,
    name: item.name,
    subtitle: item.originalName,
    category: `${itemType} (${rarity})`,
    rarity: String(rarity),
    description: description,
    system: item.systemName || item.systemId || 'D&D 5e',
    currentImageUrl: avatarUrl,
  };

  const handleRollItem = () => {
    const match = description.match(/(\d+d\d+(\s*[-+]\s*\d+)?)/i);
    const formula = match ? match[1] : '1d20';
    playUniversalSfx('dice_roll');
    if (onRollDice) {
      onRollDice(formula, `${item.name}`);
    }
  };

  return (
    <div id={`item-card-${item.id}`} className="space-y-4 text-xs select-text">
      {/* Lightbox Art Modal */}
      {isImgModalOpen && Boolean(fullArtUrl && fullArtUrl.trim()) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-zoom-out"
          onClick={() => {
            playUniversalSfx('click');
            setIsImgModalOpen(false);
          }}
        >
          <div className="relative max-w-lg max-h-[80vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center">
            <img 
              src={fullArtUrl || undefined} 
              alt={item.name} 
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[70vh] object-contain rounded-xl"
            />
            <div className="mt-2 text-zinc-400 font-medium text-xs select-none">
              {item.name} — Иллюстрация
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between pb-2 border-b border-zinc-800 gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          {avatarUrl && avatarUrl.trim() ? (
            <div 
              onClick={() => {
                playUniversalSfx('click');
                setIsImgModalOpen(true);
              }}
              className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 flex-shrink-0 group cursor-zoom-in shadow-inner"
              title="Нажмите для просмотра иллюстрации в полный размер"
            >
              <img
                src={avatarUrl || undefined}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center transform transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-zinc-300">
                <Eye className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400 font-serif font-bold text-base select-none shadow-xs">
              {item.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-amber-400 leading-tight">{item.name}</h2>
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold rounded-md text-[10px]">
                {itemType}
              </span>
            </div>
            {item.originalName && (
              <p className="text-[11px] text-zinc-400 italic font-serif leading-none mt-1">{item.originalName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <PolzaGenerateButton
            entity={polzaEntityContext}
            onApplyImage={(imgUrl) => {
              setCustomAvatarUrl(imgUrl);
              playUniversalSfx('success');
            }}
            onPlaceOnTable={
              onPlaceOnCanvas
                ? (imgUrl) => {
                    playUniversalSfx('success');
                    onPlaceOnCanvas({
                      ...item,
                      img: imgUrl,
                      tokenImg: imgUrl,
                    });
                  }
                : undefined
            }
          />

          {onPlaceOnCanvas && (
            <button
              onClick={() => {
                playUniversalSfx('success');
                onPlaceOnCanvas(item);
              }}
              className="px-2.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="Поместить карточку предмета прямо на рабочий стол карты"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-[11px]">На стол</span>
            </button>
          )}

          <button
            onClick={handleRollItem}
            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold rounded-lg flex items-center space-x-1 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px]">Бросок</span>
          </button>
        </div>
      </div>

      {/* Item Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Coins className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Стоимость</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{cost}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-zinc-700/30 text-zinc-300 rounded-lg border border-zinc-700/40">
            <Weight className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Вес</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{weight}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Редкость</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{rarity}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Настройка</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{attunement || 'Не требуется'}</div>
          </div>
        </div>
      </div>

      {/* Properties badges */}
      {Array.isArray(properties) && properties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {properties.map((prop: any, idx: number) => (
            <span
              key={idx}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md text-[11px] font-medium"
            >
              {typeof prop === 'string' ? prop : prop.name}
            </span>
          ))}
        </div>
      )}

      {/* Description */}
      <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2">
        <h4 className="font-semibold text-xs text-zinc-200 uppercase tracking-wider">Свойства и эффекты</h4>
        <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs font-sans">
          {description}
        </p>
      </div>
    </div>
  );
};
