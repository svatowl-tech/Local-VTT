import React from 'react';
import { TravelingMerchantRawData } from '../../types/generatorTypes';
import { ShoppingBag, Coins, Compass, Sparkles, MessageSquare, ShieldAlert, Truck, MapPin, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboardUtils';

interface TravelingMerchantViewProps {
  merchant: TravelingMerchantRawData;
  rawText: string;
  onShowToast?: (msg: string) => void;
}

export const TravelingMerchantView: React.FC<TravelingMerchantViewProps> = ({ merchant, rawText, onShowToast }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyText = () => {
    copyToClipboard(rawText);
    setCopied(true);
    if (onShowToast) onShowToast('Текст торговца скопирован в буфер обмена');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300 tracking-wide">{merchant.name}</h3>
            <p className="text-xs text-zinc-400 font-medium">{merchant.title} ({merchant.race})</p>
          </div>
        </div>

        <button
          onClick={handleCopyText}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 text-xs font-semibold rounded-lg border border-zinc-700/80 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Скопировано' : 'Копировать'}</span>
        </button>
      </div>

      {/* Grid Meta Specs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <Truck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Транспорт и вьючные животные</span>
            <span className="text-zinc-200 font-medium">{merchant.transport}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Место встречи на тракте</span>
            <span className="text-zinc-200 font-medium">{merchant.meetingPlace}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Наличность в кошельке</span>
            <span className="text-amber-300 font-bold">{merchant.purse}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Особенность торга / Бартер</span>
            <span className="text-zinc-200 font-medium">{merchant.tradeQuirk}</span>
          </div>
        </div>
      </div>

      {/* Personality & Rumor */}
      <div className="space-y-2 text-xs">
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Характер и повадки</span>
          <p className="text-zinc-300 leading-relaxed">{merchant.personality}</p>
        </div>

        {merchant.roadRumor && (
          <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-lg flex items-start space-x-2">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Слух с дороги</span>
              <p className="text-amber-200/90 italic leading-relaxed">"{merchant.roadRumor}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Compact Inventory List (3-6 items) */}
      <div className="space-y-2 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 flex items-center space-x-1.5">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Компактный дорожный ассортимент ({merchant.inventory.length} шт.):</span>
          </span>
          <span className="text-[10px] text-zinc-400">Ограниченный выбор странника</span>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {merchant.inventory.map((item, idx) => (
            <div key={idx} className="bg-zinc-900/80 border border-zinc-800/90 hover:border-amber-500/40 rounded-lg p-2.5 transition-colors flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-100 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{item.name}</span>
                </span>
                <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {item.price}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-normal">{item.desc}</p>
              <div className="flex items-center space-x-2 text-[10px] text-zinc-400 pt-0.5">
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{item.category}</span>
                {item.rarity && <span className="text-amber-400/80">{item.rarity}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
