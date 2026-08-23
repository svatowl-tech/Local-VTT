import React from 'react';
import { EquipmentRawData } from '../../types/generatorTypes';
import { Shield, Sparkles, Scale, Coins, Wrench, Copy, Check, ShieldAlert, Award } from 'lucide-react';

interface EquipmentCardViewProps {
  equipment: EquipmentRawData;
  rawText: string;
  onShowToast?: (msg: string) => void;
}

export const EquipmentCardView: React.FC<EquipmentCardViewProps> = ({ equipment, rawText, onShowToast }) => {
  const [copied, setCopied] = React.useState(false);
  const { item } = equipment;

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    if (onShowToast) onShowToast('Экипировка скопирована в буфер обмена');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 shadow-xl flex flex-col space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-300 tracking-wide">{item.name}</h3>
            <p className="text-xs text-zinc-400 font-medium">{item.typeLabel} • Качество: {item.quality}</p>
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

      {/* Primary Grid Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Урон / КД / Эффект</span>
          <span className="text-amber-300 font-bold text-xs mt-1">{item.damageOrAc}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Материал</span>
          <span className="text-zinc-100 font-medium text-xs mt-1">{item.material}</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Вес предмета</span>
          <span className="text-zinc-200 font-medium text-xs mt-1 flex items-center space-x-1">
            <Scale className="w-3 h-3 text-zinc-400" />
            <span>{item.weight}</span>
          </span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2.5 rounded-lg flex flex-col justify-between">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Стоимость</span>
          <span className="text-amber-400 font-bold text-xs mt-1 flex items-center space-x-1">
            <Coins className="w-3 h-3" />
            <span>{item.cost}</span>
          </span>
        </div>
      </div>

      {/* Special Physical Properties section (with or without properties) */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 p-3 rounded-lg space-y-1.5">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-zinc-200">
          <Award className="w-4 h-4 text-amber-400" />
          <span>Особые физические свойства:</span>
        </div>

        {item.hasSpecialProperties && item.properties.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {item.properties.map((prop, idx) => (
              <div key={idx} className="bg-amber-950/20 border border-amber-500/30 p-2 rounded-lg text-xs">
                <span className="font-bold text-amber-300 block">✦ {prop.name}</span>
                <span className="text-zinc-300 text-[11px] leading-relaxed block mt-0.5">{prop.effect}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">Стандартный фабричный предмет без дополнительных физических свойств.</p>
        )}
      </div>

      {/* Description & Origin */}
      <div className="space-y-2 text-xs">
        <div className="bg-zinc-900/40 border border-zinc-800/60 p-2.5 rounded-lg">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold block mb-0.5">Описание</span>
          <p className="text-zinc-300 leading-relaxed">{item.description}</p>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1 pt-1 border-t border-zinc-800/60">
          <span>Происхождение: <strong className="text-zinc-300">{item.origin}</strong></span>
          <span>Прочность: <strong className="text-emerald-400">{item.durability}</strong></span>
        </div>
      </div>
    </div>
  );
};
