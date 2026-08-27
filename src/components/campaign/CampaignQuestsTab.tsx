import React, { useState } from 'react';
import {
  Scroll,
  Plus,
  CheckCircle2,
  Circle,
  AlertCircle,
  Clock,
  Sparkles,
  User,
  MapPin,
  Coins,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Check,
  Globe,
} from 'lucide-react';
import { CampaignQuest, QuestCategory, QuestStatus } from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';

import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  quests: CampaignQuest[];
  onPlaceQuestOnCanvas?: (quest: CampaignQuest) => void;
  onOpenLoreImport?: () => void;
}

export const CampaignQuestsTab: React.FC<Props> = ({ quests, onPlaceQuestOnCanvas, onOpenLoreImport }) => {
  const [filterCategory, setFilterCategory] = useState<QuestCategory | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<QuestStatus | 'all'>('active');
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(quests[0]?.id || null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState<QuestCategory>('main');
  const [newGiver, setNewGiver] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCharName, setNewCharName] = useState('');
  const [newXp, setNewXp] = useState<number>(500);
  const [newGold, setNewGold] = useState<number>(200);
  const [newItems, setNewItems] = useState('');
  const [newObjectives, setNewObjectives] = useState('Найти зацепку\nОсмотреть логово\nВернуться с докладом');

  const filteredQuests = quests.filter((q) => {
    if (filterCategory !== 'all' && q.category !== filterCategory) return false;
    if (filterStatus !== 'all' && q.status !== filterStatus) return false;
    return true;
  });

  const handleCreateQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const objectiveLines = newObjectives
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, idx) => ({
        id: `obj-${Date.now()}-${idx}`,
        text,
        completed: false,
      }));

    campaignService.addQuest({
      title: newTitle.trim(),
      description: newDesc.trim(),
      category: newCategory,
      status: 'active',
      giverNpcName: newGiver.trim() || undefined,
      locationName: newLocation.trim() || undefined,
      characterName: newCategory === 'personal' ? newCharName.trim() || undefined : undefined,
      objectives: objectiveLines.length > 0 ? objectiveLines : [{ id: 'obj-default', text: 'Выполнить поручение', completed: false }],
      rewards: {
        xp: Number(newXp) || 0,
        gold: Number(newGold) || 0,
        items: newItems ? newItems.split(',').map((s) => s.trim()).filter(Boolean) : [],
      },
      secretsAndClues: [],
      tags: [newCategory],
    });

    // Reset Form
    setNewTitle('');
    setNewDesc('');
    setNewGiver('');
    setNewLocation('');
    setNewCharName('');
    setIsCreating(false);
  };

  const getCategoryBadge = (cat: QuestCategory) => {
    switch (cat) {
      case 'main':
        return { label: 'Главный квест', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'side':
        return { label: 'Второстепенный', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'personal':
        return { label: 'Личный квест', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'faction':
        return { label: 'Фракция', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'bounty':
        return { label: 'Охота / Награда', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    }
  };

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* 1. Панель управления и фильтров */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
        {/* Категории */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Все квесты' },
            { id: 'main', label: '👑 Главные' },
            { id: 'side', label: '🧭 Побочные' },
            { id: 'personal', label: '👤 Личные' },
            { id: 'bounty', label: '⚔️ Контракты' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id as any)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                filterCategory === c.id
                  ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Статусы и Кнопка создания */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-zinc-950 border border-zinc-700 text-xs rounded-xl px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="completed">Завершённые</option>
            <option value="failed">Проваленные</option>
            <option value="on_hold">На паузе</option>
          </select>

          {onOpenLoreImport && (
            <button
              onClick={onOpenLoreImport}
              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              title="Импорт заданий и заметок из LoreWiki"
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
            <span>Новый квест</span>
          </button>
        </div>
      </div>

      {/* Быстрый генератор Polza AI для Квестов */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ИИ-Генерация квестов и поручений в Polza AI</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">Сгенерирует название, цели, награды и NPC-квестодателя</span>
        </div>
        <PolzaQuickInlineGenerator
          entityType="quest"
          placeholder="Промпт для квеста (например: Поиски похищенной реликвии, расследование культа, заказ на вервольфа)..."
          buttonLabel="Сгенерировать Квест"
        />
      </div>

      {/* 2. Модалка / Форма создания квеста */}
      {isCreating && (
        <form onSubmit={handleCreateQuest} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Scroll className="w-4 h-4 text-amber-400" />
              Создание новой сюжетной линии / квеста
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
            <div className="md:col-span-2 space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Название квеста *</label>
              <input
                type="text"
                required
                placeholder="например: Пропавшая экспедиция в склеп"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Тип квеста</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as QuestCategory)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="main">👑 Главный сюжет</option>
                <option value="side">🧭 Побочное задание</option>
                <option value="personal">👤 Личный квест героя</option>
                <option value="bounty">⚔️ Охота за головами</option>
                <option value="faction">🛡️ Поручение фракции</option>
              </select>
            </div>
          </div>

          {newCategory === 'personal' && (
            <div className="space-y-1 bg-purple-950/20 border border-purple-800/40 p-2.5 rounded-xl">
              <label className="text-[11px] font-semibold text-purple-300">Имя персонажа игрока</label>
              <input
                type="text"
                placeholder="Имя героя партии, чья это личная арка"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                className="w-full bg-zinc-950 border border-purple-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-purple-400 focus:outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Заказчик / NPC</label>
              <input
                type="text"
                placeholder="например: Капитан стражи Брок"
                value={newGiver}
                onChange={(e) => setNewGiver(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Локация / Местоположение</label>
              <input
                type="text"
                placeholder="например: Старые Катакомбы"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Описание и завязка</label>
            <textarea
              rows={2}
              placeholder="Что произошло и почему отряд должен взяться за это дело?"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Этапы / Задачи (по строке на каждую)</label>
              <textarea
                rows={3}
                value={newObjectives}
                onChange={(e) => setNewObjectives(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
              <span className="text-[11px] font-bold text-amber-400">Награда за выполнение:</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400">Опыт (XP)</label>
                  <input
                    type="number"
                    value={newXp}
                    onChange={(e) => setNewXp(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-zinc-100"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400">Золото (GP)</label>
                  <input
                    type="number"
                    value={newGold}
                    onChange={(e) => setNewGold(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs font-mono text-zinc-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400">Предметы (через запятую)</label>
                <input
                  type="text"
                  placeholder="Зелье невидимости, Плащ защиты"
                  value={newItems}
                  onChange={(e) => setNewItems(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-zinc-100"
                />
              </div>
            </div>
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
              Сохранить квест
            </button>
          </div>
        </form>
      )}

      {/* 3. Список квестов */}
      {filteredQuests.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 space-y-2">
          <Scroll className="w-8 h-8 mx-auto text-zinc-600 opacity-60" />
          <p className="text-xs">В данной категории нет квестов. Создайте первый квест!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuests.map((quest) => {
            const isExpanded = expandedQuestId === quest.id;
            const badge = getCategoryBadge(quest.category);
            const totalObj = quest.objectives.length;
            const completedObj = quest.objectives.filter((o) => o.completed).length;
            const progressPercent = totalObj > 0 ? Math.round((completedObj / totalObj) * 100) : 0;

            return (
              <div
                key={quest.id}
                className={`bg-zinc-900/80 border rounded-2xl transition-all overflow-hidden ${
                  quest.status === 'completed'
                    ? 'border-emerald-500/30 opacity-90'
                    : quest.status === 'failed'
                    ? 'border-rose-500/30 opacity-80'
                    : isExpanded
                    ? 'border-amber-500/50 shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Шапка карточки */}
                <div
                  onClick={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition-colors gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        campaignService.setQuestStatus(
                          quest.id,
                          quest.status === 'completed' ? 'active' : 'completed'
                        );
                      }}
                      className="shrink-0 transition-transform active:scale-90"
                      title={quest.status === 'completed' ? 'Вернуть в активные' : 'Отметить как выполненный'}
                    >
                      {quest.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-500/20" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-500 hover:text-amber-400" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        {quest.characterName && (
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            {quest.characterName}
                          </span>
                        )}
                        {quest.locationName && (
                          <span className="text-[9px] text-zinc-400 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-zinc-500" />
                            {quest.locationName}
                          </span>
                        )}
                      </div>
                      <h3 className={`text-sm font-bold tracking-tight mt-0.5 truncate ${
                        quest.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-100'
                      }`}>
                        {quest.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Прогресс-бар задач */}
                    <div className="hidden sm:flex flex-col items-end">
                      <div className="text-[10px] font-mono text-zinc-400">
                        {completedObj}/{totalObj} ({progressPercent}%)
                      </div>
                      <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {/* Раскрытое тело квеста */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/80 space-y-3 bg-zinc-950/40">
                    {quest.description && (
                      <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                        {quest.description}
                      </p>
                    )}

                    {/* Задачи / Этапы */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                        Этапы выполнения:
                      </span>
                      <div className="space-y-1">
                        {quest.objectives.map((obj) => (
                          <div
                            key={obj.id}
                            onClick={() => campaignService.toggleQuestObjective(quest.id, obj.id)}
                            className={`p-2 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                              obj.completed
                                ? 'bg-emerald-950/20 border-emerald-800/40 text-zinc-400 line-through'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-200'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${
                              obj.completed ? 'bg-emerald-500 border-emerald-400 text-zinc-950' : 'border-zinc-600'
                            }`}>
                              {obj.completed && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs flex-1">{obj.text}</span>
                            {obj.optional && (
                              <span className="text-[9px] text-amber-400/80 font-mono bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Опционально
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Награда и Секреты */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          Обещанная награда
                        </span>
                        <div className="text-xs text-zinc-300 space-y-0.5 font-mono">
                          {quest.rewards.gold ? <div>💰 Золото: <span className="text-amber-300 font-bold">{quest.rewards.gold} GP</span></div> : null}
                          {quest.rewards.xp ? <div>✨ Опыт: <span className="text-purple-300 font-bold">{quest.rewards.xp} XP</span></div> : null}
                          {quest.rewards.items && quest.rewards.items.length > 0 ? (
                            <div>🎁 Трофеи: {quest.rewards.items.join(', ')}</div>
                          ) : null}
                        </div>
                      </div>

                      <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl space-y-1">
                        <span className="text-[10px] font-bold uppercase text-indigo-400 flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          Секреты и зацепки (для Мастера)
                        </span>
                        <div className="text-xs text-zinc-400 italic">
                          {quest.secretsAndClues && quest.secretsAndClues.length > 0 ? (
                            quest.secretsAndClues.map((s, idx) => <div key={idx}>• {s}</div>)
                          ) : (
                            <span>Секретов пока не добавлено.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Кнопки действий */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <PolzaGenerateButton
                          entity={{
                            type: 'quest',
                            id: quest.id,
                            name: quest.title,
                            category: `Квест (${quest.category})`,
                            description: `${quest.description || ''}. ${quest.objectives?.map((o) => o.text).join('. ')}`,
                          }}
                          onApplyImage={(imgUrl) => {
                            // Can save or notify
                          }}
                          onPlaceOnTable={
                            onPlaceQuestOnCanvas
                              ? (imgUrl) => {
                                  onPlaceQuestOnCanvas(quest);
                                }
                              : undefined
                          }
                        />

                        {onPlaceQuestOnCanvas && (
                          <button
                            onClick={() => onPlaceQuestOnCanvas(quest)}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                            title="Выложить карточку квеста на игровой стол MiroCanvas"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>На стол (Miro)</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => campaignService.deleteQuest(quest.id)}
                        className="px-2.5 py-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs transition-all"
                        title="Удалить квест"
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
