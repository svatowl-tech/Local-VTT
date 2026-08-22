import React, { useState } from 'react';
import { Sparkles, Clock, Compass, Hourglass, Feather, Flame, Zap, Volume2, Pin, Eye } from 'lucide-react';
import { SystemReferenceSearchItem } from '../../../services/rustSystemSearchService';
import { playUniversalSfx } from '../../../utils/sfxAudio';
import { resolveFoundryImageUrl } from '../../../utils/foundryImageResolver';

interface Props {
  item: SystemReferenceSearchItem;
  onRollDice?: (expression: string, label: string) => void;
  onPlaceOnCanvas?: (item: SystemReferenceSearchItem) => void;
}

export const SpellCardView: React.FC<Props> = ({ item, onRollDice, onPlaceOnCanvas }) => {
  const [isImgModalOpen, setIsImgModalOpen] = useState(false);

  const data = item.data || {};
  const level = data.level !== undefined ? data.level : item.stats?.level;
  const school = data.school || data.magicSchool || 'Магия';
  const castingTime = data.castingTime || data.castTime || '1 действие';
  const range = data.range || data.area || '60 фт.';
  const components = data.components || 'В, С';
  const duration = data.duration || 'Мгновенная';
  const description = data.description || data.desc || data.content || item.summary;
  const higherLevels = data.higherLevels || data.atHigherLevels || data.scaling;

  const rawImgPath = item.img || data.img || item.tokenImg || data.prototypeToken?.texture?.src;
  const avatarUrl = resolveFoundryImageUrl(rawImgPath, item.systemId);
  const fullArtUrl = avatarUrl;

  const levelLabel =
    level === 0 || level === '0' || level === 'cantrip'
      ? 'Заговор (Фокус)'
      : `${level}-й круг`;

  const handleRollSpellDamage = () => {
    const match = (description + ' ' + (higherLevels || '')).match(/(\d+d\d+(\s*[-+]\s*\d+)?)/i);
    const formula = match ? match[1] : '8d6';
    playUniversalSfx('dice_roll');
    if (onRollDice) {
      onRollDice(formula, `${item.name} (${levelLabel})`);
    }
  };

  return (
    <div id={`spell-card-${item.id}`} className="space-y-4 text-xs select-text">
      {/* Lightbox Art Modal */}
      {isImgModalOpen && fullArtUrl && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 cursor-zoom-out"
          onClick={() => {
            playUniversalSfx('click');
            setIsImgModalOpen(false);
          }}
        >
          <div className="relative max-w-lg max-h-[80vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center">
            <img 
              src={fullArtUrl} 
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

      {/* Title & Level Header */}
      <div className="flex items-start justify-between pb-2 border-b border-zinc-800 gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          {avatarUrl ? (
            <div 
              onClick={() => {
                playUniversalSfx('click');
                setIsImgModalOpen(true);
              }}
              className="relative w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 flex-shrink-0 group cursor-zoom-in shadow-inner"
              title="Нажмите для просмотра иллюстрации в полный размер"
            >
              <img
                src={avatarUrl}
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 text-cyan-400 font-serif font-bold text-base select-none shadow-xs">
              {item.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-cyan-400 leading-tight">{item.name}</h2>
              <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-semibold rounded-md text-[10px]">
                {levelLabel} • {school}
              </span>
            </div>
            {item.originalName && (
              <p className="text-[11px] text-zinc-400 italic font-serif leading-none mt-1">{item.originalName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onPlaceOnCanvas && (
            <button
              onClick={() => {
                playUniversalSfx('success');
                onPlaceOnCanvas(item);
              }}
              className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="Поместить карточку заклинания прямо на рабочий стол карты"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-[11px]">На стол</span>
            </button>
          )}

          <button
            onClick={handleRollSpellDamage}
            className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold rounded-lg flex items-center space-x-1 transition-all cursor-pointer shrink-0 shadow-xs"
            title="Сделать бросок урона или эффекта заклинания"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[11px]">Бросок</span>
          </button>
        </div>
      </div>

      {/* Spell Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Время накл.</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{castingTime}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Дистанция</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{range}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Feather className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Компоненты</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{components}</div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <Hourglass className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Длительность</div>
            <div className="font-semibold text-zinc-200 text-[11px]">{duration}</div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/80 space-y-2">
        <h4 className="font-semibold text-xs text-zinc-200 uppercase tracking-wider">Описание</h4>
        <p className="text-zinc-300 leading-relaxed whitespace-pre-line text-xs font-sans">
          {description}
        </p>
      </div>

      {/* Higher Levels / Scaling */}
      {higherLevels && (
        <div className="p-3 bg-cyan-950/20 rounded-xl border border-cyan-800/40 space-y-1.5">
          <h4 className="font-bold text-xs text-cyan-300 flex items-center space-x-1.5">
            <Flame className="w-3.5 h-3.5 text-cyan-400" />
            <span>На более высоких кругах (Scaling)</span>
          </h4>
          <p className="text-zinc-300 leading-relaxed text-[11px]">{higherLevels}</p>
        </div>
      )}
    </div>
  );
};
