import React, { useState, memo } from 'react';
import {
  MapItem,
  ActiveTool,
} from '../types';
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
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Maximize2,
  Minimize2,
  Dices,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { initiativeEngine } from '../services/initiativeEngine';
import { playUniversalSfx } from '../utils/sfxAudio';

interface Props {
  mapItem: MapItem;
  isSelected: boolean;
  activeTool: ActiveTool;
  onQuickUpdate?: (mapId: string, partial: Partial<MapItem>) => void;
  onDeleteMap?: (mapId: string) => void;
  onOpenInitiative?: () => void;
}

export const TabletopContentCard: React.FC<Props> = memo(({
  mapItem,
  isSelected,
  activeTool,
  onQuickUpdate,
  onDeleteMap,
  onOpenInitiative,
}) => {
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

  const [viewMode, setViewMode] = useState<'full' | 'compact' | 'minimal'>(
    mapItem.contentCardData?.viewMode || 'full'
  );
  const [rolledResult, setRolledResult] = useState<{
    text: string;
    expression: string;
    total: number;
  } | null>(null);

  const category = (item.category || 'monsters').toLowerCase();
  const data = item.data || {};
  const stats = item.stats || data.stats || {};
  const actions = item.actions || data.actions || [];
  const traits = item.traits || data.traits || data.abilities || [];
  const isHiddenFromPlayers = !!mapItem.hiddenFromPlayers;

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    playUniversalSfx('click');
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { hiddenFromPlayers: !isHiddenFromPlayers });
    }
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    playUniversalSfx('click');
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, { locked: !mapItem.locked });
    }
  };

  const handleToggleViewMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    playUniversalSfx('click');
    const nextMode = viewMode === 'full' ? 'compact' : viewMode === 'compact' ? 'minimal' : 'full';
    setViewMode(nextMode);
    if (onQuickUpdate) {
      onQuickUpdate(mapItem.id, {
        contentCardData: {
          ...mapItem.contentCardData,
          item,
          viewMode: nextMode,
        },
      });
    }
  };

  const handleSendToInitiative = (e: React.MouseEvent) => {
    e.stopPropagation();
    playUniversalSfx('success');
    initiativeEngine.addSystemEntityToEncounter(item);
    if (onOpenInitiative) {
      onOpenInitiative();
    }
  };

  const handleRollAction = (actionName: string, text: string) => {
    playUniversalSfx('dice_roll');
    const match = text.match(/(\d+)d(\d+)(\s*[-+]\s*\d+)?/i);
    let total = 0;
    let expr = '1d20';
    if (match) {
      const count = parseInt(match[1], 10) || 1;
      const sides = parseInt(match[2], 10) || 6;
      const mod = match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0;
      let sum = 0;
      for (let i = 0; i < count; i++) {
        sum += Math.floor(Math.random() * sides) + 1;
      }
      total = sum + mod;
      expr = match[0];
    } else {
      total = Math.floor(Math.random() * 20) + 1;
    }

    setRolledResult({
      text: actionName,
      expression: expr,
      total,
    });
    setTimeout(() => setRolledResult(null), 3500);
  };

  const handleRollTable = (e: React.MouseEvent) => {
    e.stopPropagation();
    playUniversalSfx('dice_roll');
    const tableData = item.tableData || data.tableData;
    if (tableData && tableData.rows && tableData.rows.length > 0) {
      const idx = Math.floor(Math.random() * tableData.rows.length);
      const row = tableData.rows[idx];
      setRolledResult({
        text: `Случайный результат: ${row.join(' — ')}`,
        expression: tableData.formula || `d${tableData.rows.length}`,
        total: idx + 1,
      });
      setTimeout(() => setRolledResult(null), 4000);
    }
  };

  const getStatMod = (val: any) => {
    const num = typeof val === 'number' ? val : parseInt(val, 10);
    if (isNaN(num)) return '-';
    const mod = Math.floor((num - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  // Border & Header Styling based on category
  const getCategoryTheme = () => {
    switch (category) {
      case 'monsters':
      case 'bestiary':
        return {
          border: 'border-rose-500/50',
          selectedBorder: 'border-rose-400',
          bgHeader: 'bg-rose-950/80',
          titleColor: 'text-rose-300',
          badgeBg: 'bg-rose-900/60 border-rose-700/60 text-rose-200',
          icon: Swords,
        };
      case 'spells':
      case 'magic':
        return {
          border: 'border-cyan-500/50',
          selectedBorder: 'border-cyan-400',
          bgHeader: 'bg-cyan-950/80',
          titleColor: 'text-cyan-300',
          badgeBg: 'bg-cyan-900/60 border-cyan-700/60 text-cyan-200',
          icon: Sparkles,
        };
      case 'items':
      case 'equipment':
        return {
          border: 'border-amber-500/50',
          selectedBorder: 'border-amber-400',
          bgHeader: 'bg-amber-950/80',
          titleColor: 'text-amber-300',
          badgeBg: 'bg-amber-900/60 border-amber-700/60 text-amber-200',
          icon: Package,
        };
      case 'tables':
        return {
          border: 'border-emerald-500/50',
          selectedBorder: 'border-emerald-400',
          bgHeader: 'bg-emerald-950/80',
          titleColor: 'text-emerald-300',
          badgeBg: 'bg-emerald-900/60 border-emerald-700/60 text-emerald-200',
          icon: TableIcon,
        };
      default:
        return {
          border: 'border-zinc-700',
          selectedBorder: 'border-zinc-500',
          bgHeader: 'bg-zinc-900/90',
          titleColor: 'text-zinc-200',
          badgeBg: 'bg-zinc-800 border-zinc-700 text-zinc-300',
          icon: BookOpen,
        };
    }
  };

  const theme = getCategoryTheme();
  const CategoryIcon = theme.icon;

  return (
    <div
      id={`tabletop-card-${mapItem.id}`}
      className={`w-full h-full rounded-2xl flex flex-col overflow-hidden backdrop-blur-xl border-2 transition-all shadow-2xl ${
        isSelected
          ? `${theme.selectedBorder} ring-4 ring-amber-400/25 shadow-amber-500/20`
          : `${theme.border} bg-zinc-950/95`
      }`}
      style={{
        backgroundColor: 'rgba(9, 9, 11, 0.94)',
      }}
    >
      {/* 1. Header Toolbar Bar */}
      <div
        className={`px-3 py-2 ${theme.bgHeader} border-b border-zinc-800/80 flex items-center justify-between gap-2 shrink-0 select-none`}
      >
        <div className="flex items-center space-x-2 min-w-0">
          <div className="p-1 rounded-lg bg-zinc-950/60 border border-zinc-800 shrink-0">
            <CategoryIcon className="w-4 h-4 text-zinc-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <h3 className={`font-bold text-xs ${theme.titleColor} truncate`}>{item.name}</h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-950/90 border border-zinc-800 text-zinc-400 shrink-0">
                {item.systemName}
              </span>
            </div>
            {item.originalName && (
              <p className="text-[10px] text-zinc-400 italic font-serif truncate">
                {item.originalName}
              </p>
            )}
          </div>
        </div>

        {/* Master Quick Actions Toolbar */}
        <div className="flex items-center space-x-1 shrink-0">
          {/* Toggle Visibility for Players */}
          <button
            onClick={handleToggleVisibility}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center space-x-1 transition-all cursor-pointer shadow-xs ${
              isHiddenFromPlayers
                ? 'bg-rose-950/70 border border-rose-600/50 text-rose-300 hover:bg-rose-900/80'
                : 'bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80 ring-1 ring-emerald-400/30 animate-pulse'
            }`}
            title={
              isHiddenFromPlayers
                ? 'Скрыто от игроков (нажмите, чтобы показать на экране игроков)'
                : 'Видно игрокам (нажмите, чтобы скрыть)'
            }
          >
            {isHiddenFromPlayers ? (
              <>
                <EyeOff className="w-3 h-3 text-rose-400" />
                <span className="hidden sm:inline">Скрыто</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline">Игрокам</span>
              </>
            )}
          </button>

          {/* If Monster: Add to Initiative Tracker */}
          {(category === 'monsters' || category === 'bestiary' || category === 'npcs') && (
            <button
              onClick={handleSendToInitiative}
              className="p-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
              title="Добавить в трекер инициативы и боя"
            >
              <Swords className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Toggle Mode: Full / Compact / Minimal */}
          <button
            onClick={handleToggleViewMode}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
            title={`Режим карточки (${viewMode === 'full' ? 'Полный' : viewMode === 'compact' ? 'Компактный' : 'Мини'})`}
          >
            {viewMode === 'full' ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </button>

          {/* Lock / Unlock */}
          <button
            onClick={handleToggleLock}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              mapItem.locked
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title={mapItem.locked ? 'Зафиксировано на столе' : 'Разблокировано'}
          >
            {mapItem.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          </button>

          {/* Delete from Tabletop */}
          {onDeleteMap && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playUniversalSfx('click');
                onDeleteMap(mapItem.id);
              }}
              className="p-1.5 bg-zinc-900 hover:bg-rose-950/80 hover:text-rose-400 text-zinc-400 rounded-lg border border-zinc-800 transition-colors cursor-pointer"
              title="Удалить карточку с рабочего стола"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Roll Notification Banner */}
      {rolledResult && (
        <div className="bg-amber-500 text-zinc-950 font-bold px-3 py-1.5 text-xs flex items-center justify-between animate-bounce shadow-md shrink-0">
          <div className="flex items-center space-x-1.5 truncate">
            <Dices className="w-3.5 h-3.5" />
            <span className="truncate">{rolledResult.text}</span>
          </div>
          <span className="font-mono bg-zinc-950 text-amber-400 px-2 py-0.5 rounded text-xs shrink-0 ml-2">
            {rolledResult.expression} = <strong>{rolledResult.total}</strong>
          </span>
        </div>
      )}

      {/* 2. Card Body Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs select-text">
        {/* === MONSTER CARD VIEW === */}
        {(category === 'monsters' || category === 'bestiary' || category === 'npcs') && (
          <div className="space-y-2.5">
            {/* Quick Stat Header: HP, AC, Speed, CR */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800 flex flex-col items-center">
                <div className="flex items-center space-x-1 text-rose-400 text-[10px]">
                  <Heart className="w-3 h-3" />
                  <span>Хиты (HP)</span>
                </div>
                <span className="font-bold text-sm text-zinc-100 mt-0.5">
                  {stats.hp ?? data.hitPoints ?? '10'}
                </span>
              </div>

              <div className="bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800 flex flex-col items-center">
                <div className="flex items-center space-x-1 text-blue-400 text-[10px]">
                  <Shield className="w-3 h-3" />
                  <span>КД (AC)</span>
                </div>
                <span className="font-bold text-sm text-zinc-100 mt-0.5">
                  {stats.ac ?? data.armorClass ?? '10'}
                </span>
              </div>

              <div className="bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800 flex flex-col items-center">
                <div className="flex items-center space-x-1 text-emerald-400 text-[10px]">
                  <Footprints className="w-3 h-3" />
                  <span>Скорость</span>
                </div>
                <span className="font-bold text-[11px] text-zinc-200 mt-1 truncate max-w-[65px]">
                  {stats.speed ?? data.speed ?? '30 фт.'}
                </span>
              </div>

              <div className="bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800 flex flex-col items-center">
                <div className="flex items-center space-x-1 text-amber-400 text-[10px]">
                  <Zap className="w-3 h-3" />
                  <span>Опасность</span>
                </div>
                <span className="font-bold text-sm text-amber-300 mt-0.5">
                  {stats.cr ?? data.cr ?? '1/4'}
                </span>
              </div>
            </div>

            {/* Core Ability Modifiers (STR, DEX, CON, INT, WIS, CHA) */}
            {viewMode !== 'minimal' && (
              <div className="grid grid-cols-6 gap-1 bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 text-center font-mono">
                {[
                  { label: 'СИЛ', val: stats.str ?? data.stats?.str ?? 10 },
                  { label: 'ЛОВ', val: stats.dex ?? data.stats?.dex ?? 10 },
                  { label: 'ТЕЛ', val: stats.con ?? data.stats?.con ?? 10 },
                  { label: 'ИНТ', val: stats.int ?? data.stats?.int ?? 10 },
                  { label: 'МДР', val: stats.wis ?? data.stats?.wis ?? 10 },
                  { label: 'ХАР', val: stats.cha ?? data.stats?.cha ?? 10 },
                ].map((st) => (
                  <div key={st.label} className="flex flex-col items-center">
                    <span className="text-[9px] text-zinc-500 font-sans font-bold">{st.label}</span>
                    <span className="text-xs font-bold text-zinc-100">{st.val}</span>
                    <span className="text-[10px] text-amber-400/90 font-semibold">
                      {getStatMod(st.val)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions & Attacks List */}
            {viewMode === 'full' && actions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-[11px] text-rose-400 flex items-center space-x-1">
                  <Swords className="w-3.5 h-3.5" />
                  <span>Действия и атаки:</span>
                </h4>
                <div className="space-y-1.5">
                  {actions.map((act: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/60 space-y-1 hover:border-zinc-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-200 text-xs">{act.name}</span>
                        <button
                          onClick={() =>
                            handleRollAction(
                              act.name,
                              `${act.toHit ? `+${act.toHit}` : ''} ${act.damage || act.text || ''}`
                            )
                          }
                          className="px-2 py-0.5 bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 border border-rose-800/50 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors"
                          title="Бросить атаку и урон"
                        >
                          <Dices className="w-3 h-3" />
                          <span>Бросок</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                        {act.text || act.description || act.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Special Traits */}
            {viewMode === 'full' && traits.length > 0 && (
              <div className="space-y-1 pt-1">
                <h4 className="font-bold text-[11px] text-amber-400">Особенности:</h4>
                <div className="space-y-1">
                  {traits.map((t: any, idx: number) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/30 p-1.5 rounded-lg border border-zinc-800/50 text-[11px]"
                    >
                      <strong className="text-zinc-200">{t.name}: </strong>
                      <span className="text-zinc-400">{t.text || t.desc || t.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === SPELL CARD VIEW === */}
        {(category === 'spells' || category === 'magic') && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Круг и школа</span>
                <span className="font-bold text-xs text-cyan-300">
                  {stats.level !== undefined
                    ? stats.level === 0
                      ? 'Заговор'
                      : `${stats.level} круг`
                    : 'Заклинание'}{' '}
                  • {data.school || 'Магия'}
                </span>
              </div>

              <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Время накладывания</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {data.castingTime || data.castTime || '1 действие'}
                </span>
              </div>

              <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Дистанция / Область</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {data.range || data.area || '60 фт.'}
                </span>
              </div>

              <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-500 block">Длительность</span>
                <span className="font-semibold text-xs text-zinc-200">
                  {data.duration || 'Мгновенная'}
                </span>
              </div>
            </div>

            {viewMode === 'full' && (
              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed space-y-2">
                <p>{data.description || item.summary || item.snippet}</p>
                {data.higherLevels && (
                  <div className="pt-2 border-t border-zinc-800/80 text-amber-300/90">
                    <strong>На больших кругах: </strong>
                    <span>{data.higherLevels}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === ITEM CARD VIEW === */}
        {(category === 'items' || category === 'equipment' || category === 'cyberware') && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="bg-zinc-900/70 p-1.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] text-zinc-500 block">Редкость</span>
                <span className="font-bold text-[11px] text-amber-300">
                  {data.rarity || 'Обычный'}
                </span>
              </div>
              <div className="bg-zinc-900/70 p-1.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] text-zinc-500 block">Стоимость</span>
                <span className="font-bold text-[11px] text-zinc-200">
                  {data.cost || data.price || '—'}
                </span>
              </div>
              <div className="bg-zinc-900/70 p-1.5 rounded-xl border border-zinc-800">
                <span className="text-[9px] text-zinc-500 block">Вес</span>
                <span className="font-bold text-[11px] text-zinc-200">
                  {data.weight ? `${data.weight} фнт.` : '—'}
                </span>
              </div>
            </div>

            {viewMode === 'full' && (
              <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
                <p>{data.description || item.summary || item.snippet}</p>
              </div>
            )}
          </div>
        )}

        {/* === TABLE / GENERATOR VIEW === */}
        {category === 'tables' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-semibold">Таблица генерации</span>
              <button
                onClick={handleRollTable}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-lg text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Бросить по таблице</span>
              </button>
            </div>

            {item.tableData?.rows && (
              <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-900">
                {item.tableData.rows.map((row: string[], idx: number) => (
                  <div key={idx} className="p-1.5 text-[11px] flex items-center space-x-2 text-zinc-300 hover:bg-zinc-900">
                    <span className="w-6 font-mono text-zinc-500 shrink-0 text-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{row.join(' — ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === RULE / LORE VIEW === */}
        {category !== 'monsters' &&
          category !== 'bestiary' &&
          category !== 'npcs' &&
          category !== 'spells' &&
          category !== 'magic' &&
          category !== 'items' &&
          category !== 'equipment' &&
          category !== 'tables' && (
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed select-text space-y-2">
              <p className="whitespace-pre-line">{data.text || data.description || item.summary || item.snippet}</p>
            </div>
          )}
      </div>
    </div>
  );
});
