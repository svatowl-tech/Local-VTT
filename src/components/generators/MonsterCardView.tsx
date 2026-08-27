import React, { useState } from 'react';
import { MonsterRawData } from '../../types/generatorTypes';
import { MapItem } from '../../types';
import {
  createMonsterTokenItem,
  createMonsterContentCardItem,
  createMonsterLoreItem,
  createMonsterSearchItem,
} from '../../utils/cardImportHelper';
import { worldLoreService } from '../../services/worldLoreService';
import { rustSystemSearchService } from '../../services/rustSystemSearchService';
import { initiativeEngine } from '../../services/initiativeEngine';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';
import {
  Shield,
  Heart,
  Footprints,
  BookOpen,
  Copy,
  Check,
  Sparkles,
  Sword,
  BookmarkCheck,
  Zap,
  Swords,
  Flame,
  Globe,
  Dices,
  Info,
} from 'lucide-react';

interface Props {
  monster: MonsterRawData;
  onImportMapItem?: (item: MapItem) => void;
  onShowToast?: (msg: string) => void;
}

export const MonsterCardView: React.FC<Props> = ({
  monster,
  onImportMapItem,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);
  const [savedToCompendium, setSavedToCompendium] = useState(false);
  const [tokenPlaced, setTokenPlaced] = useState(false);
  const [cardPlaced, setCardPlaced] = useState(false);
  const [addedToInitiative, setAddedToInitiative] = useState(false);
  const [spawnCount, setSpawnCount] = useState(1);

  const formatMod = (score: number) => {
    const mod = Math.floor((score - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  const handleCopyText = () => {
    const text = `
=== ${monster.name.toUpperCase()} ===
${monster.type} (${monster.size}, ${monster.alignment})
КБ: ${monster.ac} (${monster.acSource}) | Хиты: ${monster.hp} (${monster.hitDice})
Скорость: ${monster.speed} | Опасность: ${monster.cr} (${monster.xp} XP)
----------------------------------------
СИЛ: ${monster.stats.STR} (${formatMod(monster.stats.STR)}) | ЛОВ: ${monster.stats.DEX} (${formatMod(monster.stats.DEX)}) | ТЕЛ: ${monster.stats.CON} (${formatMod(monster.stats.CON)})
ИНТ: ${monster.stats.INT} (${formatMod(monster.stats.INT)}) | МУД: ${monster.stats.WIS} (${formatMod(monster.stats.WIS)}) | ХАР: ${monster.stats.CHA} (${formatMod(monster.stats.CHA)})
----------------------------------------
Чувства: ${monster.senses} | Языки: ${monster.languages}
${monster.damageImmunities ? `Иммунитет: ${monster.damageImmunities}\n` : ''}${monster.damageResistances ? `Сопротивление: ${monster.damageResistances}\n` : ''}
--- ЧЕРТЫ ---
${monster.traits.map(t => `${t.name}: ${t.description}`).join('\n')}
--- ДЕЙСТВИЯ ---
${monster.actions.map(a => `${a.name}: ${a.description}`).join('\n')}
${monster.legendaryActions?.length ? `--- ЛЕГЕНДАРНЫЕ ДЕЙСТВИЯ ---\n${monster.legendaryActions.map(l => `${l.name}: ${l.description}`).join('\n')}` : ''}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    playUniversalSfx('click');
    setTimeout(() => setCopied(false), 2000);
    if (onShowToast) onShowToast('Статблок монстра скопирован в буфер!');
  };

  const handlePlaceToken = () => {
    if (!onImportMapItem) return;
    const tokenItem = createMonsterTokenItem(monster);
    onImportMapItem(tokenItem);
    setTokenPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setTokenPlaced(false), 2500);
    if (onShowToast) onShowToast(`Токен монстра «${monster.name}» добавлен на карту!`);
  };

  const handlePlaceCard = () => {
    if (!onImportMapItem) return;
    const cardItem = createMonsterContentCardItem(monster);
    onImportMapItem(cardItem);
    setCardPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setCardPlaced(false), 2500);
    if (onShowToast) onShowToast(`Интерактивная карточка «${monster.name}» добавлена на стол!`);
  };

  const handleAddToInitiative = () => {
    try {
      const searchItem = createMonsterSearchItem(monster);
      // 1. Add to initiative engine monster DB template
      initiativeEngine.addMonsterToDb({
        name: monster.name,
        type: monster.type,
        maxHp: monster.hp,
        ac: monster.ac,
        initBonus: Math.floor((monster.stats.DEX - 10) / 2),
        cr: monster.cr,
        avatar: monster.avatar,
        notes: `Размер: ${monster.size}. Среда: ${monster.habitat}.`,
      });

      // 2. Add spawnCount copies into active combat encounter
      for (let i = 0; i < spawnCount; i++) {
        initiativeEngine.addSystemEntityToEncounter(searchItem as any);
      }

      setAddedToInitiative(true);
      playUniversalSfx('success');
      setTimeout(() => setAddedToInitiative(false), 3000);
      if (onShowToast) onShowToast(`«${monster.name}» (${spawnCount} шт.) добавлена в Инициативу!`);
    } catch (err) {
      console.error('Failed to add monster to initiative:', err);
    }
  };

  const handleSaveToCompendium = async () => {
    try {
      // 1. Register in system compendium search engine
      const searchItem = createMonsterSearchItem(monster);
      rustSystemSearchService.registerRuleItem(searchItem as any);

      // 2. Save in world lore wiki encyclopedia
      const loreItem = createMonsterLoreItem(monster);
      await worldLoreService.saveItem(loreItem);

      setSavedToCompendium(true);
      playUniversalSfx('success');
      setTimeout(() => setSavedToCompendium(false), 3000);
      if (onShowToast) onShowToast(`«${monster.name}» сохранен в Справочник и Бестиарий!`);
    } catch (err) {
      console.error('Failed to save monster to compendium:', err);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-4 animate-fadeIn">
      {/* 1. Quick Export Actions Toolbar */}
      <div className="p-3 bg-zinc-900/90 rounded-2xl border border-rose-900/40 shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xl shrink-0">{monster.avatar}</span>
          <div>
            <div className="text-xs font-bold text-rose-300 flex items-center space-x-1.5">
              <span>{monster.name}</span>
              <span className="text-[10px] bg-rose-950 text-rose-300 font-mono px-2 py-0.5 rounded-full border border-rose-800/60">
                {monster.cr}
              </span>
            </div>
            <div className="text-[10px] text-zinc-400">
              {monster.size} • {monster.type}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <PolzaGenerateButton
            entity={{
              type: 'monster',
              id: monster.name,
              name: monster.name,
              subtitle: `${monster.size} ${monster.type}, ${monster.alignment}`,
              description: `Опасность: ${monster.cr} (${monster.xp} XP). Хиты: ${monster.hp} (${monster.hitDice}). КБ: ${monster.ac} (${monster.acSource}). Способности: ${monster.traits?.map((t) => `${t.name}: ${t.description}`).join(' ') || ''}. Действия: ${monster.actions?.map((a) => `${a.name}: ${a.description}`).join(' ') || ''}`,
            }}
            onApplyImage={(imgUrl) => {
              (monster as any).avatarUrl = imgUrl;
              (monster as any).tokenImg = imgUrl;
              (monster as any).img = imgUrl;
              if (onShowToast) onShowToast(`Арт Polza AI применён к ${monster.name}`);
            }}
            onPlaceOnTable={
              onImportMapItem
                ? (imgUrl) => {
                    const token = createMonsterTokenItem({ ...monster, avatarUrl: imgUrl } as any);
                    onImportMapItem(token);
                    if (onShowToast) onShowToast(`Токен ${monster.name} с артом Polza AI добавлен на стол`);
                  }
                : undefined
            }
          />

          {/* Initiative Quantity Selector & Button */}
          <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-xl border border-rose-900/50">
            <select
              value={spawnCount}
              onChange={e => setSpawnCount(parseInt(e.target.value, 10))}
              className="bg-zinc-900 text-rose-200 text-xs font-bold px-1.5 py-1 rounded-lg outline-none cursor-pointer"
            >
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={3}>3x</option>
              <option value={4}>4x</option>
              <option value={6}>6x</option>
              <option value={8}>8x</option>
            </select>
            <button
              onClick={handleAddToInitiative}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                addedToInitiative
                  ? 'bg-emerald-600 text-zinc-950'
                  : 'bg-rose-600 hover:bg-rose-500 text-zinc-950 shadow-md'
              }`}
            >
              <Swords className="w-3.5 h-3.5 shrink-0" />
              <span>{addedToInitiative ? 'В бою!' : 'В Инициативу'}</span>
            </button>
          </div>

          <button
            onClick={handlePlaceCard}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 border transition-all cursor-pointer ${
              cardPlaced
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
            }`}
            title="Поместить интерактивную карточку монстра на карту"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Карточку на стол</span>
          </button>

          <button
            onClick={handlePlaceToken}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 border transition-all cursor-pointer ${
              tokenPlaced
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
            }`}
            title="Поместить круглый боевой токен монстра на карту"
          >
            <Dices className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Токен</span>
          </button>

          <button
            onClick={handleSaveToCompendium}
            className={`px-2.5 py-1.5 text-xs font-bold rounded-xl flex items-center space-x-1.5 border transition-all cursor-pointer ${
              savedToCompendium
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
            }`}
            title="Сохранить в системный Справочник и Бестиарий"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">В Справочник</span>
          </button>

          <button
            onClick={handleCopyText}
            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-xl transition-colors cursor-pointer"
            title="Скопировать текстовый статблок"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. D&D 5E Statblock Card Visual */}
      <div className="w-full bg-zinc-950/90 rounded-2xl border-2 border-rose-900/70 p-4 sm:p-6 shadow-2xl space-y-4 custom-scrollbar overflow-y-auto max-h-[600px]">
        {/* Header */}
        <div className="border-b border-rose-900/60 pb-3 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-rose-200 tracking-wide flex items-center space-x-2">
              <span>{monster.avatar}</span>
              <span>{monster.name}</span>
            </h2>
            <p className="text-xs text-rose-400 italic">
              {monster.size} {monster.type}, {monster.alignment}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-amber-400">{monster.cr}</div>
            <div className="text-[10px] text-zinc-400">{monster.xp.toLocaleString()} XP</div>
          </div>
        </div>

        {/* Combat Stats Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Класс Доспеха</div>
              <div className="font-bold text-zinc-100">{monster.ac} <span className="text-[10px] text-zinc-400 font-normal">({monster.acSource})</span></div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex items-center space-x-2">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Хиты (HP)</div>
              <div className="font-bold text-rose-300">{monster.hp} <span className="text-[10px] text-zinc-400 font-normal">({monster.hitDice})</span></div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex items-center space-x-2">
            <Footprints className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Скорость</div>
              <div className="font-bold text-zinc-100">{monster.speed}</div>
            </div>
          </div>

          <div className="bg-zinc-900/80 p-2.5 rounded-xl border border-zinc-800 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="text-[10px] text-zinc-400 uppercase font-semibold">Бонус мастерства</div>
              <div className="font-bold text-sky-300">+{monster.proficiencyBonus}</div>
            </div>
          </div>
        </div>

        {/* Ability Scores Grid */}
        <div className="grid grid-cols-6 gap-1 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800 text-center text-xs">
          <div>
            <div className="text-[10px] font-bold text-zinc-400">СИЛ</div>
            <div className="font-extrabold text-zinc-100">{monster.stats.STR}</div>
            <div className="text-[10px] text-amber-400 font-bold">{formatMod(monster.stats.STR)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400">ЛОВ</div>
            <div className="font-extrabold text-zinc-100">{monster.stats.DEX}</div>
            <div className="text-[10px] text-amber-400 font-bold">{formatMod(monster.stats.DEX)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400">ТЕЛ</div>
            <div className="font-extrabold text-zinc-100">{monster.stats.CON}</div>
            <div className="text-[10px] text-amber-400 font-bold">{formatMod(monster.stats.CON)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400">ИНТ</div>
            <div className="font-extrabold text-zinc-100">{monster.stats.INT}</div>
            <div className="text-[10px] text-amber-400 font-bold">{formatMod(monster.stats.INT)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400">МУД</div>
            <div className="font-extrabold text-zinc-100">{monster.stats.WIS}</div>
            <div className="text-[10px] text-amber-400 font-bold">{formatMod(monster.stats.WIS)}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-400">ХАР</div>
            <div className="font-extrabold text-zinc-100">{monster.stats.CHA}</div>
            <div className="text-[10px] text-amber-400 font-bold">{formatMod(monster.stats.CHA)}</div>
          </div>
        </div>

        {/* Secondary Details: Saves, Immunities, Senses, Languages */}
        <div className="text-xs space-y-1 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80 text-zinc-300 leading-relaxed">
          {monster.savingThrows && (
            <div><span className="font-bold text-rose-300">Спасброски:</span> {monster.savingThrows}</div>
          )}
          {monster.skills && (
            <div><span className="font-bold text-amber-300">Навыки:</span> {monster.skills}</div>
          )}
          {monster.damageResistances && (
            <div><span className="font-bold text-sky-300">Сопротивление урону:</span> {monster.damageResistances}</div>
          )}
          {monster.damageImmunities && (
            <div><span className="font-bold text-emerald-300">Иммунитет к урону:</span> {monster.damageImmunities}</div>
          )}
          {monster.conditionImmunities && (
            <div><span className="font-bold text-purple-300">Иммунитет к состояниям:</span> {monster.conditionImmunities}</div>
          )}
          {monster.vulnerabilities && (
            <div><span className="font-bold text-red-400">Уязвимость:</span> {monster.vulnerabilities}</div>
          )}
          <div><span className="font-bold text-zinc-200">Чувства:</span> {monster.senses}</div>
          <div><span className="font-bold text-zinc-200">Языки:</span> {monster.languages}</div>
        </div>

        {/* Special Traits */}
        {monster.traits.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider border-b border-zinc-800 pb-1">
              Особенности и Умения
            </h3>
            <div className="space-y-2 text-xs">
              {monster.traits.map((trait, idx) => (
                <div key={idx} className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="font-bold text-amber-200">{trait.name}. </span>
                  <span className="text-zinc-300">{trait.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {monster.actions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider border-b border-zinc-800 pb-1 flex items-center space-x-1.5">
              <Sword className="w-3.5 h-3.5 shrink-0" />
              <span>Действия</span>
            </h3>
            <div className="space-y-2 text-xs">
              {monster.actions.map((act, idx) => (
                <div key={idx} className="bg-zinc-900/80 p-2.5 rounded-xl border border-rose-900/40 space-y-1">
                  <div className="flex items-center justify-between font-bold text-rose-200">
                    <span>{act.name}</span>
                    {act.damage && <span className="text-[11px] text-amber-300 font-mono">{act.damage}</span>}
                  </div>
                  <div className="text-zinc-300 text-[11px] leading-relaxed">{act.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legendary Actions */}
        {monster.legendaryActions && monster.legendaryActions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider border-b border-zinc-800 pb-1 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Легендарные Действия</span>
            </h3>
            <p className="text-[10px] text-zinc-400 italic">
              Монстр может совершить 3 легендарных действия, выбирая из представленных ниже вариантов, только в конце хода другого существа.
            </p>
            <div className="space-y-2 text-xs">
              {monster.legendaryActions.map((leg, idx) => (
                <div key={idx} className="bg-purple-950/20 p-2.5 rounded-xl border border-purple-900/40">
                  <span className="font-bold text-purple-200">{leg.name}. </span>
                  <span className="text-zinc-300 text-[11px]">{leg.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spells */}
        {monster.spells && (
          <div className="bg-sky-950/20 p-3 rounded-xl border border-sky-900/40 text-xs space-y-1.5">
            <div className="font-bold text-sky-300 flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Использование заклинаний (КС {monster.spells.saveDc}, +{monster.spells.spellAttackBonus} к попаданию)</span>
            </div>
            <div className="text-[11px] text-zinc-300">{monster.spells.spellList.join(' • ')}</div>
          </div>
        )}

        {/* Lore / Description / Habitat / Tactics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-800">
          <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="font-bold text-zinc-200 flex items-center space-x-1 mb-1">
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Среда обитания & Описание</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">{monster.description}</p>
            <div className="text-[10px] text-emerald-300 mt-1">Обитает: {monster.habitat}</div>
          </div>

          <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/80">
            <div className="font-bold text-zinc-200 flex items-center space-x-1 mb-1">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Тактика боя & Добыча</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">{monster.tactics}</p>
            <div className="text-[10px] text-amber-300 mt-1">Клад/Добыча: {monster.loot}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
