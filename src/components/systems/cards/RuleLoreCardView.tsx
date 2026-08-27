import React, { useState } from 'react';
import { BookOpen, Sparkles, Tag, Layers, Share2, Copy, Pin, Eye } from 'lucide-react';
import { SystemReferenceSearchItem } from '../../../services/rustSystemSearchService';
import { playUniversalSfx } from '../../../utils/sfxAudio';
import { PolzaGenerateButton } from '../../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../../types/polzaTypes';

interface Props {
  item: SystemReferenceSearchItem;
  onRollDice?: (expression: string, label: string) => void;
  onPlaceOnCanvas?: (item: SystemReferenceSearchItem) => void;
}

export const RuleLoreCardView: React.FC<Props> = ({ item, onRollDice, onPlaceOnCanvas }) => {
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);

  const data = item.data || {};
  const content = data.content || data.description || data.text || item.summary || 'Нет описания';
  const traits = data.traits || [];
  const speed = data.speed;
  const size = data.size;
  const features = data.features || data.classFeatures || [];

  const polzaEntityContext: PolzaEntityContext = {
    type: 'lore',
    id: item.id,
    name: item.name,
    subtitle: item.originalName,
    category: `${item.category} (${item.systemName})`,
    description: content,
    system: item.systemName || item.systemId || 'D&D 5e',
    currentImageUrl: customAvatarUrl || undefined,
  };

  return (
    <div id={`rule-lore-card-${item.id}`} className="space-y-4 text-xs select-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 gap-2">
        <div className="flex items-center space-x-3 min-w-0">
          {customAvatarUrl ? (
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 shrink-0 shadow-inner">
              <img
                src={customAvatarUrl}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400 font-serif font-bold text-base select-none shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-indigo-300 leading-tight">{item.name}</h2>
              <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold rounded-md text-[10px]">
                {item.category.toUpperCase()} • {item.systemName}
              </span>
            </div>
            {item.originalName && (
              <p className="text-[11px] text-zinc-400 italic font-serif">{item.originalName}</p>
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
              className="px-2.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs shrink-0"
              title="Поместить карточку правила прямо на рабочий стол карты"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-[11px]">На стол</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick metadata if Race/Class */}
      {(speed || size || data.abilityScoreIncrease || data.hitDice) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
          {speed && (
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Скорость</div>
              <div className="font-semibold text-zinc-100">{speed} фт.</div>
            </div>
          )}
          {size && (
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Размер</div>
              <div className="font-semibold text-zinc-100">{size}</div>
            </div>
          )}
          {data.hitDice && (
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Кость хитов</div>
              <div className="font-semibold text-zinc-100">{data.hitDice}</div>
            </div>
          )}
          {data.abilityScoreIncrease && (
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Характеристики</div>
              <div className="font-semibold text-zinc-100 truncate">{data.abilityScoreIncrease}</div>
            </div>
          )}
        </div>
      )}

      {/* Traits / Features */}
      {Array.isArray(traits) && traits.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider">Черты и особенности</h4>
          <div className="space-y-1.5">
            {traits.map((t: any, idx: number) => (
              <div key={idx} className="p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 text-zinc-300">
                {typeof t === 'string' ? (
                  t
                ) : (
                  <div>
                    <strong className="text-amber-300">{t.name}: </strong>
                    <span>{t.description || t.desc}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Features if class */}
      {Array.isArray(features) && features.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider">Умения класса</h4>
          <div className="space-y-1.5">
            {features.map((f: any, idx: number) => (
              <div key={idx} className="p-2 bg-zinc-900/60 rounded-lg border border-zinc-800 text-zinc-300">
                <strong className="text-indigo-300">{f.name || f.title}: </strong>
                <span>{f.description || f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content / Markdown */}
      <div className="p-3.5 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2">
        <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs font-sans">
          {content}
        </p>
      </div>
    </div>
  );
};
