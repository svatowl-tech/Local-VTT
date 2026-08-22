import React, { memo } from 'react';
import { MapItem } from '../types';
import { SystemReferenceSearchItem } from '../services/rustSystemSearchService';
import {
  Swords,
  Shield,
  Heart,
  Zap,
  Footprints,
  Sparkles,
  Package,
  Table as TableIcon,
  BookOpen,
} from 'lucide-react';

interface Props {
  mapItem: MapItem;
}

export const PlayerContentCardRenderer: React.FC<Props> = memo(({ mapItem }) => {
  const item: SystemReferenceSearchItem =
    mapItem.contentCardData?.item || {
      id: mapItem.id,
      name: mapItem.name,
      category: 'monsters',
      systemId: 'dnd5e',
      systemName: 'D&D 5e',
      summary: '',
      tags: [],
      format: 'JSON',
      score: 1,
      matchType: 'exact',
      relativePath: '',
    };

  const category = (item.category || 'monsters').toLowerCase();
  const data = item.data || {};
  const stats = item.stats || data.stats || {};
  const actions = item.actions || data.actions || [];
  const traits = item.traits || data.traits || data.abilities || [];

  const getStatMod = (val: any) => {
    const num = typeof val === 'number' ? val : parseInt(val, 10);
    if (isNaN(num)) return '-';
    const mod = Math.floor((num - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const getTheme = () => {
    switch (category) {
      case 'monsters':
      case 'bestiary':
      case 'npcs':
        return {
          border: 'border-rose-500/80',
          glow: 'shadow-[0_0_30px_rgba(244,63,94,0.35)]',
          headerBg: 'bg-gradient-to-r from-rose-950/90 to-zinc-950/90',
          titleColor: 'text-rose-200',
          icon: Swords,
        };
      case 'spells':
      case 'magic':
        return {
          border: 'border-cyan-500/80',
          glow: 'shadow-[0_0_30px_rgba(6,182,212,0.35)]',
          headerBg: 'bg-gradient-to-r from-cyan-950/90 to-zinc-950/90',
          titleColor: 'text-cyan-200',
          icon: Sparkles,
        };
      case 'items':
      case 'equipment':
        return {
          border: 'border-amber-500/80',
          glow: 'shadow-[0_0_30px_rgba(245,158,11,0.35)]',
          headerBg: 'bg-gradient-to-r from-amber-950/90 to-zinc-950/90',
          titleColor: 'text-amber-200',
          icon: Package,
        };
      case 'tables':
        return {
          border: 'border-emerald-500/80',
          glow: 'shadow-[0_0_30px_rgba(16,185,129,0.35)]',
          headerBg: 'bg-gradient-to-r from-emerald-950/90 to-zinc-950/90',
          titleColor: 'text-emerald-200',
          icon: TableIcon,
        };
      default:
        return {
          border: 'border-amber-500/60',
          glow: 'shadow-[0_0_30px_rgba(251,191,36,0.25)]',
          headerBg: 'bg-gradient-to-r from-zinc-900 to-zinc-950',
          titleColor: 'text-zinc-100',
          icon: BookOpen,
        };
    }
  };

  const theme = getTheme();
  const IconComp = theme.icon;

  return (
    <div
      id={`player-card-renderer-${mapItem.id}`}
      className={`w-full h-full rounded-2xl flex flex-col overflow-hidden border-2 ${theme.border} ${theme.glow} bg-zinc-950/95 backdrop-blur-2xl text-zinc-100 select-none shadow-2xl`}
    >
      {/* Header Banner for Players */}
      <div className={`px-4 py-3 ${theme.headerBg} border-b border-zinc-800 flex items-center justify-between shrink-0`}>
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 text-amber-400">
            <IconComp className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`font-bold text-base ${theme.titleColor} leading-tight`}>{item.name}</h2>
            {item.originalName && (
              <p className="text-xs text-zinc-400 italic font-serif">{item.originalName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono font-semibold text-zinc-300">
            {item.systemName}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[11px] font-bold text-amber-300 uppercase">
            {item.category}
          </span>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {/* Monster View for Players */}
        {(category === 'monsters' || category === 'bestiary' || category === 'npcs') && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Тип / Размер</span>
                <span className="font-bold text-xs text-zinc-200 mt-0.5 block">
                  {[data.size, data.type].filter(Boolean).join(' • ') || item.summary || 'Существо'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Скорость</span>
                <span className="font-bold text-xs text-emerald-300 mt-0.5 block">
                  {stats.speed ?? data.speed ?? '30 фт.'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[11px] text-zinc-400 block">Опасность</span>
                <span className="font-bold text-xs text-amber-300 mt-0.5 block">
                  {stats.cr ? `CR ${stats.cr}` : data.cr ? `CR ${data.cr}` : 'CR 1/4'}
                </span>
              </div>
            </div>

            {/* Actions for Players */}
            {actions.length > 0 && (
              <div className="space-y-2 pt-1">
                <h4 className="font-bold text-xs text-rose-400 flex items-center space-x-1.5">
                  <Swords className="w-4 h-4" />
                  <span>Действия и атаки:</span>
                </h4>
                <div className="space-y-2">
                  {actions.map((act: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800 space-y-1"
                    >
                      <span className="font-bold text-zinc-200 text-xs">{act.name}</span>
                      <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                        {act.text || act.description || act.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lore / Description */}
            {(data.description || item.summary) && (
              <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
                <p>{data.description || item.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* Spell View for Players */}
        {(category === 'spells' || category === 'magic') && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Круг и школа</span>
                <span className="font-bold text-xs text-cyan-300">
                  {stats.level !== undefined
                    ? stats.level === 0
                      ? 'Заговор'
                      : `${stats.level} круг`
                    : 'Заклинание'}{' '}
                  • {data.school || 'Магия'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Время накладывания</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {data.castingTime || data.castTime || '1 действие'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Дистанция</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {data.range || data.area || '60 фт.'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Длительность</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {data.duration || 'Мгновенная'}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-200 leading-relaxed space-y-2">
              <p>{data.description || item.summary || item.snippet}</p>
              {data.higherLevels && (
                <div className="pt-2 border-t border-zinc-800 text-amber-300">
                  <strong>На больших кругах: </strong>
                  <span>{data.higherLevels}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Item View for Players */}
        {(category === 'items' || category === 'equipment' || category === 'cyberware') && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Редкость</span>
                <span className="font-bold text-xs text-amber-300">
                  {data.rarity || 'Обычный'}
                </span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Стоимость</span>
                <span className="font-bold text-xs text-zinc-200">{data.cost || '—'}</span>
              </div>
              <div className="bg-zinc-900/80 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 block">Вес</span>
                <span className="font-bold text-xs text-zinc-200">
                  {data.weight ? `${data.weight} фнт.` : '—'}
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-200 leading-relaxed">
              <p>{data.description || item.summary || item.snippet}</p>
            </div>
          </div>
        )}

        {/* Other / Rules / Lore for Players */}
        {category !== 'monsters' &&
          category !== 'bestiary' &&
          category !== 'npcs' &&
          category !== 'spells' &&
          category !== 'magic' &&
          category !== 'items' &&
          category !== 'equipment' && (
            <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-200 leading-relaxed whitespace-pre-line">
              {data.text || data.description || item.summary || item.snippet}
            </div>
          )}
      </div>
    </div>
  );
});
