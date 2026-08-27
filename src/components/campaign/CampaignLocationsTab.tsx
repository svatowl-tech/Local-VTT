import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Plus,
  Shield,
  Skull,
  CheckCircle,
  Eye,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Landmark,
  Building,
  TreePine,
  Castle,
  Tent,
  Flame,
  Globe,
  Sparkles,
} from 'lucide-react';
import { CampaignLocation, ExplorationStatus, LocationType } from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';
import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  locations: CampaignLocation[];
  onPlaceLocationOnCanvas?: (loc: CampaignLocation) => void;
  onOpenSceneTab?: (sceneTabName: string) => void;
  onOpenLoreImport?: () => void;
}

export const CampaignLocationsTab: React.FC<Props> = ({
  locations,
  onPlaceLocationOnCanvas,
  onOpenSceneTab,
  onOpenLoreImport,
}) => {
  const [filterStatus, setFilterStatus] = useState<ExplorationStatus | 'all'>('all');
  const [expandedLocId, setExpandedLocId] = useState<string | null>(locations[0]?.id || null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [locType, setLocType] = useState<LocationType>('city');
  const [status, setStatus] = useState<ExplorationStatus>('visited');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [region, setRegion] = useState('');
  const [threatLevel, setThreatLevel] = useState<'low' | 'medium' | 'high' | 'deadly'>('medium');
  const [poisText, setPoisText] = useState('Центральная площадь (Ориентир)\nТаверна "Старый Грот" (Лавка/Отдых)');

  const filteredLocations = locations.filter((loc) => {
    if (filterStatus !== 'all' && loc.explorationStatus !== filterStatus) return false;
    return true;
  });

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pois = poisText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `poi-${Date.now()}-${idx}`,
        name: text,
        description: '',
        type: 'landmark' as const,
        discovered: true,
      }));

    campaignService.addLocation({
      name: name.trim(),
      type: locType,
      explorationStatus: status,
      summary: summary.trim(),
      description: description.trim(),
      region: region.trim() || undefined,
      threatLevel,
      pointsOfInterest: pois,
      residentNpcIds: [],
      loreSecrets: [],
      tags: [locType],
    });

    setName('');
    setSummary('');
    setDescription('');
    setRegion('');
    setIsCreating(false);
  };

  const getLocationIcon = (type: LocationType) => {
    switch (type) {
      case 'city':
      case 'village':
        return Building;
      case 'dungeon':
      case 'ruins':
        return Castle;
      case 'wilderness':
        return TreePine;
      case 'tavern':
        return Flame;
      case 'camp':
        return Tent;
      default:
        return Landmark;
    }
  };

  const getStatusBadge = (st: ExplorationStatus) => {
    switch (st) {
      case 'sanctuary':
        return { label: 'Святилище / База', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'cleared':
        return { label: 'Зачищено', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'visited':
        return { label: 'Исследовано', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'hostile':
        return { label: 'Опасная зона', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'rumored':
        return { label: 'По слухам', bg: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
    }
  };

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* Фильтры и кнопка создания */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Все локации' },
            { id: 'sanctuary', label: '🛡️ Базы / Убежища' },
            { id: 'visited', label: '🧭 Исследованные' },
            { id: 'cleared', label: '✨ Зачищенные' },
            { id: 'hostile', label: '💀 Враждебные' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilterStatus(item.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === item.id
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onOpenLoreImport && (
            <button
              onClick={onOpenLoreImport}
              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              title="Импорт локаций и поселений из LoreWiki"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Из LoreWiki</span>
            </button>
          )}

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новая локация</span>
          </button>
        </div>
      </div>

      {/* Быстрый генератор Polza AI для Атласа Локаций */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ИИ-Генерация описания и районов локации в Polza AI</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">Сгенерирует тип, атмосферу, районы и ключевые точки</span>
        </div>
        <PolzaQuickInlineGenerator
          entityType="location"
          placeholder="Промпт для локации (например: Древний затопленный храм, пиратская бухта, подземный город гномов)..."
          buttonLabel="Сгенерировать Локацию"
        />
      </div>

      {/* Форма создания локации */}
      {isCreating && (
        <form onSubmit={handleCreateLocation} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              Добавление новой локации / атласа
            </span>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-zinc-400 hover:text-zinc-200"
            >
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Название места *</label>
              <input
                type="text"
                required
                placeholder="например: Крепость Ветров"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Тип локации</label>
              <select
                value={locType}
                onChange={(e) => setLocType(e.target.value as LocationType)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="city">🏙️ Город / Столица</option>
                <option value="village">🏡 Деревня / Поселение</option>
                <option value="dungeon">🏰 Подземелье / Цитадель</option>
                <option value="ruins">🏛️ Древние Руины</option>
                <option value="wilderness">🌲 Дикая местность / Лес</option>
                <option value="tavern">🍺 Таверна / Постоялый двор</option>
                <option value="camp">⛺ Лагерь / Стоянка</option>
                <option value="planar">🌌 Другой План бытия</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Статус исследования</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ExplorationStatus)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="visited">🧭 Посещено (Visited)</option>
                <option value="sanctuary">🛡️ Святилище / База (Sanctuary)</option>
                <option value="cleared">✨ Зачищено (Cleared)</option>
                <option value="hostile">💀 Враждебно (Hostile)</option>
                <option value="rumored">📜 По слухам (Rumored)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Регион / Провинция</label>
              <input
                type="text"
                placeholder="например: Побережье Мечей"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Краткая сводка</label>
              <input
                type="text"
                placeholder="Одно предложение о сути локации"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Подробное описание и атмосфера</label>
            <textarea
              rows={2}
              placeholder="Как выглядит место, запахи, звуки, архитектура..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Точки интереса (POI, по строке на точку)</label>
            <textarea
              rows={2}
              value={poisText}
              onChange={(e) => setPoisText(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95"
            >
              Сохранить локацию
            </button>
          </div>
        </form>
      )}

      {/* Список локаций */}
      {filteredLocations.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 space-y-2">
          <Compass className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
          <p className="text-xs">Локаций в этой категории пока нет. Добавьте первую точку на карту!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredLocations.map((loc) => {
            const isExpanded = expandedLocId === loc.id;
            const badge = getStatusBadge(loc.explorationStatus);
            const LocIcon = getLocationIcon(loc.type);

            return (
              <div
                key={loc.id}
                className={`bg-zinc-900/80 border rounded-2xl transition-all overflow-hidden ${
                  isExpanded ? 'border-amber-500/50 shadow-lg' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Шапка */}
                <div
                  onClick={() => setExpandedLocId(isExpanded ? null : loc.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition-colors gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                      <LocIcon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {loc.region && (
                          <span className="text-[10px] text-zinc-400">
                            Регион: <span className="text-zinc-200">{loc.region}</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold tracking-tight text-zinc-100 truncate mt-0.5">
                        {loc.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {loc.threatLevel === 'high' || loc.threatLevel === 'deadly' ? (
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Skull className="w-3 h-3" />
                        Угроза: Высокая
                      </span>
                    ) : null}

                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Тело локации */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/80 space-y-3 bg-zinc-950/40">
                    {loc.summary && (
                      <p className="text-xs text-amber-300/90 font-medium italic">
                        "{loc.summary}"
                      </p>
                    )}

                    {loc.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                        {loc.description}
                      </p>
                    )}

                    {/* Точки интереса (POI) */}
                    {loc.pointsOfInterest && loc.pointsOfInterest.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                          Достопримечательности и точки интереса (POI):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {loc.pointsOfInterest.map((poi) => (
                            <div
                              key={poi.id}
                              className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center space-x-2 text-xs text-zinc-200"
                            >
                              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate">{poi.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Кнопки действий */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <PolzaGenerateButton
                          entity={{
                            type: 'location',
                            id: loc.id,
                            name: loc.name,
                            category: `${loc.type} (${loc.region || 'Неизвестный регион'})`,
                            environment: loc.region || loc.type,
                            description: `${loc.summary || ''}. ${loc.description || ''}`,
                          }}
                          onApplyImage={(imgUrl) => {
                            campaignService.updateLocation(loc.id, { ...loc, mapImageUrl: imgUrl } as any);
                          }}
                          onPlaceOnTable={
                            onPlaceLocationOnCanvas
                              ? (imgUrl) => {
                                  onPlaceLocationOnCanvas({ ...loc, mapImageUrl: imgUrl } as any);
                                }
                              : undefined
                          }
                        />

                        {onPlaceLocationOnCanvas && (
                          <button
                            onClick={() => onPlaceLocationOnCanvas(loc)}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                            title="Выложить карточку локации на стол MiroCanvas"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>На стол (Miro)</span>
                          </button>
                        )}
                        {loc.sceneTabName && onOpenSceneTab && (
                          <button
                            onClick={() => onOpenSceneTab(loc.sceneTabName!)}
                            className="px-3 py-1 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Открыть сцену</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => campaignService.deleteLocation(loc.id)}
                        className="px-2.5 py-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs transition-all"
                        title="Удалить локацию"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
