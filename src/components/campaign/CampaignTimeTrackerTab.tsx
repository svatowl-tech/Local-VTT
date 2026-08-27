import React, { useState } from 'react';
import {
  Sun,
  Moon,
  CloudRain,
  CloudLightning,
  CloudFog,
  CloudSnow,
  Wind,
  Flame,
  Sparkles,
  Clock,
  Calendar,
  Coffee,
  Bed,
  Plus,
  Play,
  Volume2,
} from 'lucide-react';
import { CampaignTimeState, CampaignWeatherType, MoonPhase } from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { audioEngine } from '../../services/audioEngine';

import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  time: CampaignTimeState;
}

export const CampaignTimeTrackerTab: React.FC<Props> = ({ time }) => {
  const [customMinutes, setCustomMinutes] = useState<number>(30);

  // Month names for Harptos / Standard Fantasy
  const monthNames = [
    'Хаммер (Глубокая Зима)',
    'Алтерок (Коготь Зимы)',
    'Чес (Коготь Заката)',
    'Тарсак (Коготь Бурь)',
    'Миртул (Таяние)',
    'Киторн (Время Цветов)',
    'Флеймрул (Время Солнца)',
    'Элезис (Высокое Солнце)',
    'Элинт (Увядание)',
    'Марпенот (Листопад)',
    'Уктхар (Гниль)',
    'Найтрол (Праздник Луны)',
  ];

  const currentMonthName = monthNames[time.month - 1] || `Месяц ${time.month}`;

  // Time of Day determination
  const getTimeOfDayDesc = (hour: number) => {
    if (hour >= 5 && hour < 7) return { label: 'Рассвет', icon: Sun, color: 'text-amber-400' };
    if (hour >= 7 && hour < 12) return { label: 'Утро', icon: Sun, color: 'text-amber-300' };
    if (hour >= 12 && hour < 14) return { label: 'Полдень', icon: Sun, color: 'text-yellow-400' };
    if (hour >= 14 && hour < 18) return { label: 'День', icon: Sun, color: 'text-amber-200' };
    if (hour >= 18 && hour < 20) return { label: 'Закат', icon: Moon, color: 'text-orange-400' };
    if (hour >= 20 && hour < 23) return { label: 'Сумерки', icon: Moon, color: 'text-indigo-300' };
    return { label: 'Глубокая ночь', icon: Moon, color: 'text-indigo-400' };
  };

  const tod = getTimeOfDayDesc(time.hour);
  const TodIcon = tod.icon;

  const weatherPresets: { type: CampaignWeatherType; label: string; icon: React.FC<any>; soundPreset?: string }[] = [
    { type: 'clear', label: 'Ясно / Солнце', icon: Sun, soundPreset: 'ambient_wind' },
    { type: 'cloudy', label: 'Пасмурно', icon: CloudFog, soundPreset: 'ambient_wind' },
    { type: 'fog', label: 'Густой туман', icon: CloudFog, soundPreset: 'ambient_wind' },
    { type: 'rain', label: 'Дождь / Ливень', icon: CloudRain, soundPreset: 'sfx_rain' },
    { type: 'thunder', label: 'Гроза и шторм', icon: CloudLightning, soundPreset: 'sfx_thunder' },
    { type: 'snow', label: 'Снегопад', icon: CloudSnow, soundPreset: 'ambient_wind' },
    { type: 'heat', label: 'Знойная жара', icon: Flame, soundPreset: 'ambient_wind' },
    { type: 'wind', label: 'Шквальный ветер', icon: Wind, soundPreset: 'ambient_wind' },
    { type: 'magic_storm', label: 'Магическая буря', icon: Sparkles, soundPreset: 'spell_magic' },
  ];

  const moonPhases: { phase: MoonPhase; label: string; icon: string }[] = [
    { phase: 'new_moon', label: 'Новолуние', icon: '🌑' },
    { phase: 'waxing_crescent', label: 'Растущий серп', icon: '🌒' },
    { phase: 'first_quarter', label: 'Первая четверть', icon: '🌓' },
    { phase: 'waxing_gibbous', label: 'Растущая луна', icon: '🌔' },
    { phase: 'full_moon', label: 'Полнолуние', icon: '🌕' },
    { phase: 'waning_gibbous', label: 'Убывающая луна', icon: '🌖' },
    { phase: 'last_quarter', label: 'Последняя четверть', icon: '🌗' },
    { phase: 'waning_crescent', label: 'Убывающий серп', icon: '🌘' },
  ];

  const handlePlayAtmosphereSound = (soundType?: string) => {
    if (!soundType) return;
    if (soundType === 'sfx_rain') {
      audioEngine.playSfxByName('Дождь (Rain Ambience)', 'nature', 'rain');
    } else if (soundType === 'sfx_thunder') {
      audioEngine.playSfxByName('Удар Грома (Thunderclap)', 'combat', 'thunder');
    } else if (soundType === 'spell_magic') {
      audioEngine.playSfxByName('Магический гул (Arcane Surge)', 'magic', 'spell_fireball');
    } else {
      audioEngine.playSfxByName('Ветер (Wind Gust)', 'nature', 'wind');
    }
  };

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* 1. Главный инфо-баннер времени и календаря */}
      <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-amber-500/30 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Дата и Эпоха */}
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-amber-400/80 font-bold">
                {time.eraName} • {time.season === 'summer' ? 'Лето' : time.season === 'winter' ? 'Зима' : time.season === 'autumn' ? 'Осень' : 'Весна'}
              </div>
              <h2 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
                <span>{time.day} {currentMonthName}</span>
                <span className="text-sm font-mono text-zinc-400 font-normal">({time.year} г.)</span>
              </h2>
              <div className="text-xs text-zinc-400 mt-0.5">
                День недели: <span className="text-zinc-200 font-semibold">{time.dayOfWeek || 'Будний день'}</span>
              </div>
            </div>
          </div>

          {/* Часы и Время Суток */}
          <div className="flex items-center space-x-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl px-4 py-2.5 shadow-md">
            <TodIcon className={`w-6 h-6 ${tod.color} animate-pulse`} />
            <div className="text-right">
              <div className="text-2xl font-mono font-black text-zinc-100 tracking-wider">
                {String(time.hour).padStart(2, '0')}:{String(time.minute).padStart(2, '0')}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${tod.color}`}>
                {tod.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Быстрый генератор Polza AI для событий Мастера */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ИИ-Мастер: Быстрая генерация события, слуха или детали</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">Автоматически сохраняется в Кампанию & LoreWiki</span>
        </div>
        <PolzaQuickInlineGenerator
          entityType="lore"
          placeholder="Промпт для Мастера (например: Слухи в местной таверне, ночное случайное столкновение, аномальная погода)..."
          buttonLabel="Сгенерировать в Polza AI"
        />
      </div>

      {/* 2. Быстрые контроллеры времени и отдых */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Кнопки промотки времени */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Промотка игрового времени
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Минуты / Часы</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => campaignService.advanceTime(10)}
              className="px-2 py-1.5 bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border border-zinc-700/60 rounded-xl text-xs font-mono font-bold text-zinc-200 hover:text-amber-300 transition-all active:scale-95"
              title="Перемотать на 10 минут вперед (исследование комнаты)"
            >
              +10 мин
            </button>
            <button
              onClick={() => campaignService.advanceTime(30)}
              className="px-2 py-1.5 bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border border-zinc-700/60 rounded-xl text-xs font-mono font-bold text-zinc-200 hover:text-amber-300 transition-all active:scale-95"
            >
              +30 мин
            </button>
            <button
              onClick={() => campaignService.advanceHours(1)}
              className="px-2 py-1.5 bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border border-zinc-700/60 rounded-xl text-xs font-mono font-bold text-zinc-200 hover:text-amber-300 transition-all active:scale-95"
            >
              +1 час
            </button>
            <button
              onClick={() => campaignService.advanceHours(4)}
              className="px-2 py-1.5 bg-zinc-800/80 hover:bg-amber-500/20 hover:border-amber-500/40 border border-zinc-700/60 rounded-xl text-xs font-mono font-bold text-zinc-200 hover:text-amber-300 transition-all active:scale-95"
            >
              +4 часа
            </button>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="number"
              min="1"
              max="720"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs font-mono text-center text-zinc-100 focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={() => campaignService.advanceTime(customMinutes)}
              className="flex-1 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Добавить {customMinutes} мин
            </button>
          </div>
        </div>

        {/* Отдых и Переход суток */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Bed className="w-3.5 h-3.5 text-indigo-400" />
              Отдых отряда и новый день
            </span>
            <span className="text-[10px] font-mono text-zinc-500">Short / Long Rest</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => campaignService.shortRest()}
              className="p-2.5 bg-zinc-800/80 hover:bg-indigo-950/40 hover:border-indigo-500/40 border border-zinc-700/60 rounded-xl flex items-center space-x-2.5 transition-all text-left group active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-zinc-950 transition-all shrink-0">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-indigo-300">
                  Короткий отдых
                </div>
                <div className="text-[10px] font-mono text-zinc-400">+1 час • Траты костей</div>
              </div>
            </button>

            <button
              onClick={() => campaignService.longRest()}
              className="p-2.5 bg-zinc-800/80 hover:bg-amber-950/40 hover:border-amber-500/40 border border-zinc-700/60 rounded-xl flex items-center space-x-2.5 transition-all text-left group active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-all shrink-0">
                <Bed className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-200 group-hover:text-amber-300">
                  Длинный отдых
                </div>
                <div className="text-[10px] font-mono text-zinc-400">+8 часов • Сброс ячеек</div>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => campaignService.advanceHours(24)}
              className="px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 transition-all active:scale-95 text-center"
            >
              🌅 Следующий день (+24ч)
            </button>
            <button
              onClick={() => campaignService.setTime(time.hour >= 20 || time.hour < 6 ? 8 : 22, 0)}
              className="px-3 py-1.5 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-300 transition-all active:scale-95 text-center"
            >
              🌓 Сменить День / Ночь
            </button>
          </div>
        </div>
      </div>

      {/* 3. Погода и Фазы Луны */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Погода */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
              Погода и атмосфера
            </span>
            <span className="text-[10px] text-cyan-400/90 font-medium truncate max-w-[150px]">
              {time.temperatureDesc}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {weatherPresets.map((w) => {
              const WIcon = w.icon;
              const isSelected = time.weather === w.type;
              return (
                <button
                  key={w.type}
                  onClick={() => {
                    campaignService.setWeather(w.type);
                    if (w.soundPreset) handlePlayAtmosphereSound(w.soundPreset);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 text-center ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md ring-1 ring-cyan-500/30'
                      : 'bg-zinc-800/70 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={w.label}
                >
                  <WIcon className="w-4 h-4" />
                  <span className="text-[10px] font-semibold truncate w-full">{w.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Фазы Луны */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              Фаза Луны (Ночные циклы)
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {moonPhases.find((m) => m.phase === time.moonPhase)?.label || time.moonPhase}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {moonPhases.map((m) => {
              const isSelected = time.moonPhase === m.phase;
              return (
                <button
                  key={m.phase}
                  onClick={() => campaignService.setMoonPhase(m.phase)}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center space-y-1 transition-all active:scale-95 text-center ${
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-zinc-800/70 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={m.label}
                >
                  <span className="text-base leading-none">{m.icon}</span>
                  <span className="text-[9px] font-medium truncate w-full">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
