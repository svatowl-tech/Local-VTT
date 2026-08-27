import React, { useState } from 'react';
import {
  ShieldAlert,
  HelpCircle,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
  FileText,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { CampaignSafetyState, CampaignHomebrewRule } from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { audioEngine } from '../../services/audioEngine';
import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  safety: CampaignSafetyState;
  homebrewRules?: CampaignHomebrewRule[];
}

export const CampaignSafetyRulesTab: React.FC<Props> = ({ safety, homebrewRules }) => {
  const rules = homebrewRules || safety?.houseRules || [];
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [newLine, setNewLine] = useState('');
  const [newVeil, setNewVeil] = useState('');

  // Rule Form
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleCategory, setRuleCategory] = useState<'combat' | 'magic' | 'resting' | 'social'>('combat');
  const [ruleDesc, setRuleDesc] = useState('');

  const handleTriggerXCard = () => {
    campaignService.triggerXCard('Анонимный запрос на паузу');
    audioEngine.playSfxByName('Сигнал внимания', 'combat', 'initiative_chime');
  };

  const handleAddLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLine.trim()) return;
    campaignService.addLineTheme(newLine.trim());
    setNewLine('');
  };

  const handleAddVeil = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVeil.trim()) return;
    campaignService.addVeilTheme(newVeil.trim());
    setNewVeil('');
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleTitle.trim()) return;

    campaignService.addHomebrewRule({
      title: ruleTitle.trim(),
      category: ruleCategory,
      description: ruleDesc.trim(),
      ruleText: ruleDesc.trim(),
      isActive: true,
    });

    setRuleTitle('');
    setRuleDesc('');
    setIsCreatingRule(false);
  };

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* 1. X-Card & Safety Tools Alert Box */}
      <div className="bg-rose-950/20 border border-rose-500/40 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-200">X-Card & Безопасность за столом</h3>
              <p className="text-xs text-zinc-400">
                Инструмент для мгновенной паузы, перемотки или пропуска триггерных сцен без объяснений
              </p>
            </div>
          </div>

          <button
            onClick={handleTriggerXCard}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-lg shadow-rose-900/40 transition-all active:scale-95 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Активировать X-Card (Пауза)</span>
          </button>
        </div>

        {(safety?.xCardTriggered || (safety as any)?.xCardActive) && (
          <div className="p-3 bg-rose-500/30 border border-rose-400 rounded-xl flex items-center justify-between text-xs text-rose-100 font-bold animate-pulse">
            <span>⚠️ СЕССИЯ ПРИОСТАНОВЛЕНА ПО ЗАПРОСУ X-CARD. ПЕРЕМОТАЙТЕ ИЛИ СМЕНИТЕ ТЕМУ.</span>
            <button
              onClick={() => campaignService.resetXCard()}
              className="px-3 py-1 bg-zinc-950 text-rose-300 rounded-lg hover:bg-zinc-900 border border-rose-500/50"
            >
              Возобновить игру
            </button>
          </div>
        )}
      </div>

      {/* 2. Линии и Завесы (Lines & Veils) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Lines (Полный запрет) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              ⛔ Линии (Lines) — Строго табу
            </span>
          </div>

          <form onSubmit={handleAddLine} className="flex space-x-1.5">
            <input
              type="text"
              placeholder="Добавить табу тему..."
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs text-zinc-100"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold"
            >
              +
            </button>
          </form>

          <div className="space-y-1">
            {safety.lines.map((line, idx) => (
              <div
                key={idx}
                className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center justify-between"
              >
                <span>• {line}</span>
                <button
                  onClick={() => campaignService.removeLineTheme(idx)}
                  className="text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Veils (Затемнение) */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              🌫️ Завесы (Veils) — Fade to Black
            </span>
          </div>

          <form onSubmit={handleAddVeil} className="flex space-x-1.5">
            <input
              type="text"
              placeholder="Добавить тему затемнения..."
              value={newVeil}
              onChange={(e) => setNewVeil(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs text-zinc-100"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold"
            >
              +
            </button>
          </form>

          <div className="space-y-1">
            {safety.veils.map((veil, idx) => (
              <div
                key={idx}
                className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center justify-between"
              >
                <span>• {veil}</span>
                <button
                  onClick={() => campaignService.removeVeilTheme(idx)}
                  className="text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Быстрый генератор Polza AI для Домашних Правил */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ИИ-Генерация домашних правил и механик в Polza AI</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">Сгенерирует формулировку правила, кастомную механику или модификатор</span>
        </div>
        <PolzaQuickInlineGenerator
          entityType="rule"
          placeholder="Промпт для правила (например: Правило критических промахов, механика травм и безумия, кастомный отдых)..."
          buttonLabel="Сгенерировать Правило"
        />
      </div>

      {/* 3. Домашние правила мастера (Homebrew Rules) */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-400" />
            Домашние правила кампании (Homebrew Rules)
          </span>

          <button
            onClick={() => setIsCreatingRule(!isCreatingRule)}
            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all"
          >
            + Новое правило
          </button>
        </div>

        {isCreatingRule && (
          <form onSubmit={handleCreateRule} className="bg-zinc-950 p-3 rounded-xl border border-amber-500/30 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                required
                placeholder="Название правила"
                value={ruleTitle}
                onChange={(e) => setRuleTitle(e.target.value)}
                className="md:col-span-2 bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs text-zinc-100"
              />
              <select
                value={ruleCategory}
                onChange={(e) => setRuleCategory(e.target.value as any)}
                className="bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1 text-xs text-zinc-200"
              >
                <option value="combat">Боёвка (Combat)</option>
                <option value="magic">Магия (Magic)</option>
                <option value="resting">Отдых (Resting)</option>
                <option value="social">Социал (Social)</option>
              </select>
            </div>
            <textarea
              rows={2}
              placeholder="Формулировка правила..."
              value={ruleDesc}
              onChange={(e) => setRuleDesc(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1 text-xs text-zinc-100"
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsCreatingRule(false)}
                className="px-3 py-1 bg-zinc-800 text-xs text-zinc-300 rounded-lg"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg"
              >
                Сохранить
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">{rule.title}</span>
                <button
                  onClick={() => campaignService.deleteHomebrewRule(rule.id)}
                  className="text-zinc-500 hover:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">{rule.description || rule.ruleText}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
