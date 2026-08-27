import React, { useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Plus,
  Trash2,
  HelpCircle,
  Coins,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Milestone,
} from 'lucide-react';
import { CampaignSessionEntry, CampaignTimelineEvent } from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  sessions: CampaignSessionEntry[];
  timeline: CampaignTimelineEvent[];
}

export const CampaignSessionsTimelineTab: React.FC<Props> = ({ sessions, timeline }) => {
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'timeline'>('sessions');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(sessions[0]?.id || null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCreatingTimeline, setIsCreatingTimeline] = useState(false);

  // Session Form
  const [title, setTitle] = useState('');
  const [sessionNum, setSessionNum] = useState<number>(sessions.length + 1);
  const [realDate, setRealDate] = useState(new Date().toISOString().split('T')[0]);
  const [inGameDate, setInGameDate] = useState('14 Флеймрула 1492 DR');
  const [summary, setSummary] = useState('');
  const [prepGoals, setPrepGoals] = useState('');
  const [secretsText, setSecretsText] = useState('Секрет 1: Культисты боятся солнечного света\nСекрет 2: В руинах спрятан свиток телепортации');
  const [xp, setXp] = useState<number>(600);
  const [gold, setGold] = useState<number>(250);

  // Timeline Form
  const [tlTitle, setTlTitle] = useState('');
  const [tlDateStr, setTlDateStr] = useState('');
  const [tlYear, setTlYear] = useState<number>(1492);
  const [tlDesc, setTlDesc] = useState('');
  const [tlCategory, setTlCategory] = useState<'world_lore' | 'party_feat' | 'disaster' | 'war'>('party_feat');

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const secrets = secretsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    campaignService.addSession({
      sessionNumber: Number(sessionNum) || 1,
      title: title.trim(),
      realDate,
      inGameDate: inGameDate.trim(),
      summary: summary.trim(),
      keyEvents: [],
      prepGoals: prepGoals.trim(),
      secretsAndClues: secrets,
      rewardsGranted: {
        xp: Number(xp) || 0,
        gold: Number(gold) || 0,
        items: [],
      },
    });

    setTitle('');
    setSummary('');
    setPrepGoals('');
    setIsCreatingSession(false);
  };

  const handleCreateTimeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tlTitle.trim()) return;

    campaignService.addTimelineEvent({
      title: tlTitle.trim(),
      dateStr: tlDateStr.trim() || `${tlYear} DR`,
      year: Number(tlYear) || 1492,
      month: 1,
      day: 1,
      description: tlDesc.trim(),
      category: tlCategory,
      importance: 'major',
    });

    setTlTitle('');
    setTlDesc('');
    setIsCreatingTimeline(false);
  };

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* 1. Переключатель: Сессии / Хронология мира */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
        <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'sessions'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Журнал сессий ({sessions.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'timeline'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Milestone className="w-3.5 h-3.5" />
            <span>Хронология событий ({timeline.length})</span>
          </button>
        </div>

        {activeSubTab === 'sessions' ? (
          <button
            onClick={() => setIsCreatingSession(!isCreatingSession)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Запланировать сессию</span>
          </button>
        ) : (
          <button
            onClick={() => setIsCreatingTimeline(!isCreatingTimeline)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Событие в таймлайн</span>
          </button>
        )}
      </div>

      {/* Быстрый генератор Polza AI для Сессий и Таймлайна */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {activeSubTab === 'sessions'
                ? 'ИИ-Генерация плана/отчета сессии в Polza AI'
                : 'ИИ-Генерация хроники и событий таймлайна в Polza AI'}
            </span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">
            {activeSubTab === 'sessions'
              ? 'Сгенерирует тему сессии, ключевые события и секреты'
              : 'Сгенерирует историческое событие или веху'}
          </span>
        </div>
        <PolzaQuickInlineGenerator
          entityType={activeSubTab === 'sessions' ? 'session' : 'timeline'}
          placeholder={
            activeSubTab === 'sessions'
              ? 'Промпт для сессии (например: Штурм крепости огров, дипломатический бал у герцога)...'
              : 'Промпт для события таймлайна (например: Падение древней империи, битва при Долине Ледяного Ветра)...'
          }
          buttonLabel={activeSubTab === 'sessions' ? 'Сгенерировать Сессию' : 'Сгенерировать Событие'}
        />
      </div>

      {/* 2. Модалка создания сессии */}
      {isCreatingSession && (
        <form onSubmit={handleCreateSession} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Подготовка / Отчет по сессии
            </span>
            <button type="button" onClick={() => setIsCreatingSession(false)} className="text-xs text-zinc-400">
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400">Название сессии *</label>
              <input
                type="text"
                required
                placeholder="например: Сессия 3: Тайны глубин"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Номер сессии</label>
              <input
                type="number"
                value={sessionNum}
                onChange={(e) => setSessionNum(parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Реальная дата</label>
              <input
                type="date"
                value={realDate}
                onChange={(e) => setRealDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Краткое содержание (Recap)</label>
            <textarea
              rows={2}
              placeholder="Что произошло на игре, важные выборы игроков..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Планы мастера на следующую игру</label>
              <textarea
                rows={2}
                placeholder="Какие энкаунтеры и сцены подготовить"
                value={prepGoals}
                onChange={(e) => setPrepGoals(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Секреты и зацепки (Lazy DM, по строке)</label>
              <textarea
                rows={2}
                value={secretsText}
                onChange={(e) => setSecretsText(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="submit"
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Сохранить сессию
            </button>
          </div>
        </form>
      )}

      {/* 3. Модалка добавления события в Timeline */}
      {isCreatingTimeline && (
        <form onSubmit={handleCreateTimeline} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Milestone className="w-4 h-4 text-amber-400" />
              Добавление исторического события в таймлайн
            </span>
            <button type="button" onClick={() => setIsCreatingTimeline(false)} className="text-xs text-zinc-400">
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-semibold text-zinc-400">Название события *</label>
              <input
                type="text"
                required
                placeholder="например: Падение Нетерила"
                value={tlTitle}
                onChange={(e) => setTlTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Год в мире</label>
              <input
                type="number"
                value={tlYear}
                onChange={(e) => setTlYear(parseInt(e.target.value) || 1492)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Описание последствий</label>
            <textarea
              rows={2}
              value={tlDesc}
              onChange={(e) => setTlDesc(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="submit"
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Добавить в хронологию
            </button>
          </div>
        </form>
      )}

      {/* 4. ВИД: Журнал сессий */}
      {activeSubTab === 'sessions' ? (
        <div className="space-y-3">
          {sessions.map((sess) => {
            const isExpanded = expandedSessionId === sess.id;
            return (
              <div
                key={sess.id}
                className={`bg-zinc-900/80 border rounded-2xl transition-all overflow-hidden ${
                  isExpanded ? 'border-amber-500/50 shadow-lg' : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div
                  onClick={() => setExpandedSessionId(isExpanded ? null : sess.id)}
                  className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition-colors gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-black text-xs shrink-0">
                      #{sess.sessionNumber}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 text-[10px] text-zinc-400">
                        <span>🗓️ {sess.realDate}</span>
                        {sess.inGameDate && <span>• ⏳ {sess.inGameDate}</span>}
                      </div>
                      <h3 className="text-sm font-bold text-zinc-100 tracking-tight mt-0.5 truncate">
                        {sess.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-zinc-800/80 space-y-3 bg-zinc-950/40">
                    {sess.summary && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-400">Итог сессии:</span>
                        <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
                          {sess.summary}
                        </p>
                      </div>
                    )}

                    {sess.prepGoals && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-amber-400">План на следующую игру:</span>
                        <p className="text-xs text-zinc-300 bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                          {sess.prepGoals}
                        </p>
                      </div>
                    )}

                    {sess.secretsAndClues && sess.secretsAndClues.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase text-indigo-400">
                          Секреты и зацепки мастера:
                        </span>
                        <div className="space-y-1">
                          {sess.secretsAndClues.map((s, idx) => (
                            <div key={idx} className="text-xs text-indigo-300 italic bg-indigo-950/20 p-2 rounded-xl border border-indigo-900/40">
                              🔒 {s}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => campaignService.deleteSession(sess.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                        title="Удалить запись сессии"
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
      ) : (
        /* 5. ВИД: Хронология мира (Timeline View) */
        <div className="relative pl-6 space-y-4 border-l-2 border-amber-500/30 my-2">
          {timeline.map((evt) => (
            <div key={evt.id} className="relative group">
              {/* Точка на таймлайне */}
              <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-zinc-950 shadow-md group-hover:scale-125 transition-transform" />

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 space-y-1.5 hover:border-zinc-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {evt.dateStr}
                  </span>
                  <button
                    onClick={() => campaignService.deleteTimelineEvent(evt.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h4 className="text-sm font-bold text-zinc-100">{evt.title}</h4>
                <p className="text-xs text-zinc-300">{evt.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
