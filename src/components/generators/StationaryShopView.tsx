import React from 'react';
import { StationaryShopRawData } from '../../types/generatorTypes';
import { Store, Coins, ShieldCheck, MapPin, Copy, Check, Sparkles, User, Key, Percent } from 'lucide-react';
import { copyToClipboard } from '../../utils/clipboardUtils';

interface StationaryShopViewProps {
  shop: StationaryShopRawData;
  rawText: string;
  onShowToast?: (msg: string) => void;
}

export const StationaryShopView: React.FC<StationaryShopViewProps> = ({ shop, rawText, onShowToast }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyText = () => {
    copyToClipboard(rawText);
    setCopied(true);
    if (onShowToast) onShowToast('Данные лавки скопированы в буфер обмена');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300 tracking-wide">{shop.shopName}</h3>
            <p className="text-xs text-zinc-400 font-medium">{shop.shopTypeTitle}</p>
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

      {/* Location & Owner Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <User className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Владелец / Продавец</span>
            <span className="text-zinc-100 font-bold">{shop.ownerName}</span>
            <span className="text-zinc-400 block text-[11px]">{shop.ownerRace} • {shop.ownerPersonality}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Расположение в городе</span>
            <span className="text-zinc-200 font-medium">{shop.location}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Охрана и безопасность</span>
            <span className="text-zinc-200 font-medium">{shop.securityMeasures}</span>
          </div>
        </div>

        <div className="flex items-start space-x-2 bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg">
          <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Касса и золотой сейф</span>
            <span className="text-amber-300 font-bold">{shop.vaultCash}</span>
          </div>
        </div>
      </div>

      {/* Atmosphere, Bargain & Special Services */}
      <div className="space-y-2 text-xs">
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Интерьер и атмосфера</span>
          <p className="text-zinc-300 leading-relaxed">{shop.atmosphere}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg flex items-start space-x-2">
            <Percent className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Политика торга</span>
              <p className="text-zinc-300 leading-relaxed">{shop.bargainPolicy}</p>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg flex items-start space-x-2">
            <Key className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Спецзаказы и услуги</span>
              <p className="text-zinc-300 leading-relaxed">{shop.specialServices}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rich Assortment List */}
      <div className="space-y-2 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-200 flex items-center space-x-1.5">
            <Store className="w-4 h-4 text-amber-400" />
            <span>Богатый витринный ассортимент ({shop.inventory.length} наименований):</span>
          </span>
          <span className="text-[10px] text-amber-400/80 font-semibold">Стационарная лавка</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">
          {shop.inventory.map((item, idx) => (
            <div key={idx} className="bg-zinc-900/80 border border-zinc-800/90 hover:border-amber-500/40 rounded-lg p-2.5 transition-colors flex flex-col justify-between space-y-1">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-bold text-zinc-100 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{item.name}</span>
                  </span>
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                    {item.price}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal mt-1">{item.desc}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/50">
                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{item.category}</span>
                <span className="text-zinc-300 font-semibold">В наличии: {item.stock} шт.</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
