import React, { useState } from 'react';
import { Shield, Heart, Zap, Footprints, Skull, Award, Swords, Sparkles, Volume2, PlusCircle, Pin, Eye } from 'lucide-react';
import { SystemReferenceSearchItem } from '../../../services/rustSystemSearchService';
import { playUniversalSfx } from '../../../utils/sfxAudio';
import { resolveFoundryImageUrl } from '../../../utils/foundryImageResolver';

interface Props {
  item: SystemReferenceSearchItem;
  onSendToInitiative?: (item: SystemReferenceSearchItem) => void;
  onRollDice?: (expression: string, label: string) => void;
  onPlaceOnCanvas?: (item: SystemReferenceSearchItem) => void;
}

export const MonsterCardView: React.FC<Props> = ({
  item,
  onSendToInitiative,
  onRollDice,
  onPlaceOnCanvas,
}) => {
  const [isImgModalOpen, setIsImgModalOpen] = useState(false);

  const data = item.data || {};
  const stats = item.stats || data.stats || {};
  const actions = item.actions || data.actions || [];
  const traits = item.traits || data.traits || data.abilities || [];
  const legendary = data.legendaryActions || [];
  const reactions = data.reactions || [];

  const rawImgPath = item.tokenImg || item.img || data.img || data.prototypeToken?.texture?.src || data.prototypeToken?.img;
  const avatarUrl = resolveFoundryImageUrl(rawImgPath, item.systemId);
  const fullArtPath = item.img || data.img || rawImgPath;
  const fullArtUrl = resolveFoundryImageUrl(fullArtPath, item.systemId);

  const handleRollAction = (actionName: string, text: string) => {
    // Try to find dice pattern in action text like 1d6 + 2 or 2d8 + 3
    const match = text.match(/(\d+d\d+(\s*[-+]\s*\d+)?)/i);
    const formula = match ? match[1] : '1d20';
    playUniversalSfx('dice_roll');
    if (onRollDice) {
      onRollDice(formula, `${item.name}: ${actionName}`);
    }
  };

  const getStatMod = (val: any) => {
    const num = typeof val === 'number' ? val : parseInt(val, 10);
    if (isNaN(num)) return null;
    const mod = Math.floor((num - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div id={`monster-card-${item.id}`} className="space-y-4 text-xs select-text">
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

      {/* Top Banner with Type and System */}
      <div className="flex items-start justify-between pb-2 border-b border-zinc-800 gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          {avatarUrl ? (
            <div 
              onClick={() => {
                if (fullArtUrl) {
                  playUniversalSfx('click');
                  setIsImgModalOpen(true);
                }
              }}
              className="relative w-12 h-12 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800/80 flex-shrink-0 group cursor-zoom-in shadow-inner"
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
                <Eye className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400 font-serif font-bold text-lg select-none shadow-xs">
              {item.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-bold text-amber-400 leading-tight">{item.name}</h2>
            {item.originalName && (
              <p className="text-[11px] text-zinc-400 italic font-serif">{item.originalName}</p>
            )}
            <p className="text-[11px] text-zinc-400">
              {[data.size, data.type, data.alignment].filter(Boolean).join(' • ') || item.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onPlaceOnCanvas && (
            <button
              onClick={() => {
                playUniversalSfx('success');
                onPlaceOnCanvas(item);
              }}
              className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="Поместить карточку монстра прямо на рабочий стол карты"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-[11px]">На стол</span>
            </button>
          )}

          {onSendToInitiative && (
            <button
              onClick={() => {
                playUniversalSfx('click');
                onSendToInitiative(item);
              }}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg flex items-center space-x-1 transition-all cursor-pointer shrink-0 shadow-xs"
              title="Добавить существо в трекер инициативы и боя"
            >
              <Swords className="w-3.5 h-3.5" />
              <span className="text-[11px]">В бой</span>
            </button>
          )}
        </div>
      </div>

      {/* Core Combat Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
            <Heart className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Хиты (HP)</div>
            <div className="font-bold text-zinc-100 text-xs">
              {stats.hp ?? data.hitPoints ?? '—'}
              {(stats.hitDice || data.hitDice) && (
                <span className="text-[10px] text-zinc-400 ml-1">({stats.hitDice || data.hitDice})</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Класс брони</div>
            <div className="font-bold text-zinc-100 text-xs">
              {stats.ac ?? data.armorClass ?? '—'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Footprints className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Скорость</div>
            <div className="font-bold text-zinc-100 text-xs">
              {stats.speed ?? data.speed ?? '30 фт.'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
            <Award className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-400 uppercase font-semibold">Опасность (CR)</div>
            <div className="font-bold text-amber-300 text-xs">
              {stats.cr ?? data.cr ?? '—'}
              {(stats.xp || data.xp) && (
                <span className="text-[10px] text-zinc-400 ml-1">({stats.xp || data.xp} XP)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Ability Scores (D&D / PF / GURPS) */}
      {(stats.str !== undefined || stats.dex !== undefined || stats.attributes || data.stats) && (
        <div className="grid grid-cols-6 gap-1 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 text-center font-mono">
          {[
            { label: 'СИЛ (STR)', val: stats.str ?? data.stats?.str },
            { label: 'ЛОВ (DEX)', val: stats.dex ?? data.stats?.dex },
            { label: 'ТЕЛ (CON)', val: stats.con ?? data.stats?.con },
            { label: 'ИНТ (INT)', val: stats.int ?? data.stats?.int },
            { label: 'МДР (WIS)', val: stats.wis ?? data.stats?.wis },
            { label: 'ХАР (CHA)', val: stats.cha ?? data.stats?.cha },
          ].map((attr, idx) => (
            <div key={idx} className="p-1 rounded-lg bg-zinc-950/60 border border-zinc-800">
              <div className="text-[9px] text-zinc-400 font-sans">{attr.label}</div>
              <div className="font-bold text-zinc-100 text-xs">{attr.val ?? '10'}</div>
              <div className="text-[10px] text-amber-400">{getStatMod(attr.val) || '+0'}</div>
            </div>
          ))}
        </div>
      )}

      {/* Senses, Skills, Languages, Saves */}
      <div className="space-y-1 text-[11px] text-zinc-300 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60">
        {data.savingThrows && (
          <p>
            <strong className="text-zinc-100">Спасброски:</strong> {typeof data.savingThrows === 'object' ? Object.entries(data.savingThrows).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ') : data.savingThrows}
          </p>
        )}
        {data.skills && (
          <p>
            <strong className="text-zinc-100">Навыки:</strong> {typeof data.skills === 'object' ? Object.entries(data.skills).map(([k, v]) => `${k} +${v}`).join(', ') : data.skills}
          </p>
        )}
        {(stats.senses || data.senses) && (
          <p>
            <strong className="text-zinc-100">Чувства:</strong> {stats.senses || data.senses}
          </p>
        )}
        {(stats.languages || data.languages) && (
          <p>
            <strong className="text-zinc-100">Языки:</strong> {stats.languages || data.languages}
          </p>
        )}
      </div>

      {/* Traits & Passive Abilities */}
      {traits.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-zinc-800 pb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Особенности и умения</span>
          </h4>
          <div className="space-y-2">
            {traits.map((trait: any, idx: number) => (
              <div key={idx} className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/80">
                <span className="font-bold text-amber-300">{trait.name}. </span>
                <span className="text-zinc-300 leading-relaxed">{trait.description || trait.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-zinc-800 pb-1">
            <Swords className="w-3.5 h-3.5 text-rose-400" />
            <span>Действия</span>
          </h4>
          <div className="space-y-2">
            {actions.map((action: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-zinc-900/70 rounded-lg border border-zinc-800 flex flex-col space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 text-xs">{action.name}</span>
                  <button
                    onClick={() => handleRollAction(action.name, action.description || action.desc || '')}
                    className="px-2 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-semibold rounded-md border border-rose-500/30 flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <span>Бросок</span>
                  </button>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">{action.description || action.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reactions */}
      {reactions.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-zinc-800 pb-1">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Реакции</span>
          </h4>
          <div className="space-y-2">
            {reactions.map((react: any, idx: number) => (
              <div key={idx} className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <span className="font-bold text-blue-300">{react.name}. </span>
                <span className="text-zinc-300 leading-relaxed">{react.description || react.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legendary Actions */}
      {legendary.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider flex items-center space-x-1.5 border-b border-zinc-800 pb-1">
            <Skull className="w-3.5 h-3.5 text-purple-400" />
            <span>Легендарные действия</span>
          </h4>
          <div className="space-y-2">
            {legendary.map((leg: any, idx: number) => (
              <div key={idx} className="p-2 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <span className="font-bold text-purple-300">{leg.name}. </span>
                <span className="text-zinc-300 leading-relaxed">{leg.description || leg.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
