import React, { useState } from 'react';
import {
  Shield,
  Coins,
  Heart,
  Eye,
  Sparkles,
  User,
  Plus,
  Trash2,
  Package,
  Dices,
  Divide,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  CampaignPartyCharacter,
  CampaignPartyTreasury,
  SharedInventoryItem,
} from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { spatialDiceService } from '../../services/spatialDiceService';
import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  party: CampaignPartyCharacter[];
  treasury: CampaignPartyTreasury;
}

export const CampaignPartyTreasuryTab: React.FC<Props> = ({ party, treasury }) => {
  const [activeSubTab, setActiveSubTab] = useState<'party' | 'treasury'>('party');
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [isCreatingItem, setIsCreatingItem] = useState(false);

  // Coin Adjustment Form
  const [addGp, setAddGp] = useState<number>(100);
  const [addSp, setAddSp] = useState<number>(0);
  const [addCp, setAddCp] = useState<number>(0);
  const [addPp, setAddPp] = useState<number>(0);
  const [coinReason, setCoinReason] = useState('Трофеи с энкаунтера');

  // Character Form
  const [cName, setCName] = useState('');
  const [cPlayer, setCPlayer] = useState('');
  const [cRace, setCRace] = useState('Человек');
  const [cClass, setCClass] = useState('Воин 5');
  const [cHp, setCHp] = useState<number>(45);
  const [cAc, setCAc] = useState<number>(18);
  const [cPerc, setCPerc] = useState<number>(14);
  const [cInsight, setCInsight] = useState<number>(12);
  const [cQuest, setCQuest] = useState('');

  // Item Form
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemWeight, setItemWeight] = useState<number>(1);
  const [itemRarity, setItemRarity] = useState<any>('common');
  const [itemDesc, setItemDesc] = useState('');

  const handleRollDice = (sides: number, label: string) => {
    spatialDiceService.rollDice(sides);
  };

  const handleCreateCharacter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cName.trim()) return;

    campaignService.addPartyCharacter({
      name: cName.trim(),
      playerName: cPlayer.trim() || 'Игрок',
      race: cRace.trim(),
      characterClass: cClass.trim(),
      level: 5,
      currentHp: Number(cHp) || 30,
      maxHp: Number(cHp) || 30,
      tempHp: 0,
      armorClass: Number(cAc) || 10,
      passivePerception: Number(cPerc) || 10,
      passiveInsight: Number(cInsight) || 10,
      passiveInvestigation: 10,
      speed: 30,
      hasInspiration: false,
      personalQuest: cQuest.trim() || undefined,
    });

    setCName('');
    setCPlayer('');
    setCQuest('');
    setIsCreatingChar(false);
  };

  const handleCreateSharedItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;

    campaignService.addSharedItem({
      name: itemName.trim(),
      quantity: Number(itemQty) || 1,
      weightPerUnit: Number(itemWeight) || 1,
      rarity: itemRarity,
      description: itemDesc.trim(),
    });

    setItemName('');
    setItemDesc('');
    setIsCreatingItem(false);
  };

  const handleSplitEvenly = () => {
    const count = party.length || 4;
    const res = campaignService.splitTreasuryEvenly(count);
    alert(`Разделено поровну: каждый из ${count} игроков получил по ${res.perMemberGp} GP. В казне осталось: ${res.remainingGp} GP.`);
  };

  // Total weight in bag
  const totalWeight = treasury.sharedBag.reduce((acc, i) => acc + i.quantity * i.weightPerUnit, 0);

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* 1. Навигатор: Партия / Казна */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
        <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveSubTab('party')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'party'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Герои партии ({party.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('treasury')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'treasury'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Казна и Общий рюкзак</span>
          </button>
        </div>

        {activeSubTab === 'party' ? (
          <button
            onClick={() => setIsCreatingChar(!isCreatingChar)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить персонажа</span>
          </button>
        ) : (
          <button
            onClick={() => setIsCreatingItem(!isCreatingItem)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Предмет в сундук</span>
          </button>
        )}
      </div>

      {/* Быстрый генератор Polza AI для Героев и Сокровищ */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {activeSubTab === 'party'
                ? 'ИИ-Генерация персонажа / спутника партии в Polza AI'
                : 'ИИ-Генерация волшебного артефакта, сокровища или лута в Polza AI'}
            </span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">
            {activeSubTab === 'party'
              ? 'Сгенерирует анкету героя, характеристики и личный квест'
              : 'Сгенерирует свойства артефакта, стоимость и описание'}
          </span>
        </div>
        <PolzaQuickInlineGenerator
          entityType={activeSubTab === 'party' ? 'npc' : 'item'}
          placeholder={
            activeSubTab === 'party'
              ? 'Промпт для персонажа (например: Паладин Огмы с амнезией, следопыт из Подтемья)...'
              : 'Промпт для предмета/сокровища (например: Кольцо призрачного шага, Зачарованный плащ пламени)...'
          }
          buttonLabel={activeSubTab === 'party' ? 'Сгенерировать Героя' : 'Сгенерировать Артефакт'}
        />
      </div>

      {/* 2. Модалка создания персонажа */}
      {isCreatingChar && (
        <form onSubmit={handleCreateCharacter} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              Добавление персонажа игрока (PC)
            </span>
            <button type="button" onClick={() => setIsCreatingChar(false)} className="text-xs text-zinc-400">
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Имя персонажа *</label>
              <input
                type="text"
                required
                placeholder="например: Варис"
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Имя игрока</label>
              <input
                type="text"
                placeholder="например: Алексей"
                value={cPlayer}
                onChange={(e) => setCPlayer(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Класс и уровень</label>
              <input
                type="text"
                placeholder="Следопыт 5"
                value={cClass}
                onChange={(e) => setCClass(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Раса</label>
              <input
                type="text"
                placeholder="Лесной эльф"
                value={cRace}
                onChange={(e) => setCRace(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">HP (Здоровье)</label>
              <input
                type="number"
                value={cHp}
                onChange={(e) => setCHp(parseInt(e.target.value) || 1)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">AC (Класс Брони)</label>
              <input
                type="number"
                value={cAc}
                onChange={(e) => setCAc(parseInt(e.target.value) || 10)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Пассивн. Внимание</label>
              <input
                type="number"
                value={cPerc}
                onChange={(e) => setCPerc(parseInt(e.target.value) || 10)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Пассивн. Проницат.</label>
              <input
                type="number"
                value={cInsight}
                onChange={(e) => setCInsight(parseInt(e.target.value) || 10)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-zinc-400">Личный квест / Цель героя</label>
            <input
              type="text"
              placeholder="Сюжетная тайна или личный мотив"
              value={cQuest}
              onChange={(e) => setCQuest(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="submit"
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Сохранить персонажа
            </button>
          </div>
        </form>
      )}

      {/* 3. ВИД: Партия Героев */}
      {activeSubTab === 'party' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {party.map((char) => {
            const hpPercent = Math.round((char.currentHp / Math.max(1, char.maxHp)) * 100);

            return (
              <div
                key={char.id}
                className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-zinc-700 transition-all"
              >
                {/* Заголовок карточки */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">{char.name}</h3>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {char.race} • {char.characterClass} ({char.playerName})
                    </div>
                  </div>

                  {/* Вдохновение */}
                  <button
                    onClick={() => campaignService.toggleInspiration(char.id)}
                    className={`p-1.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1 ${
                      char.hasInspiration
                        ? 'bg-amber-500/30 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    }`}
                    title="Вдохновение (Inspiration)"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Полоска здоровья (HP) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-zinc-400 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/30" />
                      HP: <span className="font-bold text-zinc-200">{char.currentHp}</span> / {char.maxHp}
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => campaignService.adjustHp(char.id, -1)}
                        className="w-5 h-5 rounded bg-zinc-800 hover:bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center text-xs"
                      >
                        -
                      </button>
                      <button
                        onClick={() => campaignService.adjustHp(char.id, 1)}
                        className="w-5 h-5 rounded bg-zinc-800 hover:bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hpPercent > 50 ? 'bg-emerald-500' : hpPercent > 20 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${hpPercent}%` }}
                    />
                  </div>
                </div>

                {/* Статы: AC, Passive Perception, Passive Insight */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-zinc-950/80 border border-zinc-800/80 p-1.5 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-500">AC (Броня)</div>
                    <div className="text-sm font-mono font-black text-amber-400">{char.armorClass}</div>
                  </div>
                  <div className="bg-zinc-950/80 border border-zinc-800/80 p-1.5 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-500">Внимание</div>
                    <div className="text-sm font-mono font-black text-indigo-400">{char.passivePerception}</div>
                  </div>
                  <div className="bg-zinc-950/80 border border-zinc-800/80 p-1.5 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-500">Проницат.</div>
                    <div className="text-sm font-mono font-black text-cyan-400">{char.passiveInsight}</div>
                  </div>
                </div>

                {/* Личный квест */}
                {char.personalQuest && (
                  <div className="text-[11px] text-purple-300/90 bg-purple-950/20 border border-purple-900/40 p-2 rounded-xl">
                    <span className="font-bold text-purple-400">Личный квест:</span> {char.personalQuest}
                  </div>
                )}

                {/* Быстрый бросок 3D кубика за персонажа */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => handleRollDice(20, `Проверка ${char.name}`)}
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                    title="Бросить 3D D20 за персонажа"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Бросок D20</span>
                  </button>

                  <button
                    onClick={() => campaignService.deletePartyCharacter(char.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 4. ВИД: Казна и Общий рюкзак */
        <div className="space-y-4">
          {/* Баннер монет */}
          <div className="bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 border border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Общая казна отряда
              </span>
              <button
                onClick={handleSplitEvenly}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                title="Разделить всю наличность поровну между игроками партии"
              >
                <Divide className="w-3.5 h-3.5" />
                <span>Разделить поровну ({party.length || 4} игр.)</span>
              </button>
            </div>

            {/* Баланс монет */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="bg-zinc-950/80 border border-amber-400/40 p-2.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-amber-400">Золото (GP)</div>
                <div className="text-xl font-mono font-black text-amber-300">{treasury.gold}</div>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-400/40 p-2.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Платина (PP)</div>
                <div className="text-xl font-mono font-black text-cyan-300">{treasury.platinum}</div>
              </div>
              <div className="bg-zinc-950/80 border border-zinc-400/30 p-2.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-zinc-400">Серебро (SP)</div>
                <div className="text-xl font-mono font-black text-zinc-300">{treasury.silver}</div>
              </div>
              <div className="bg-zinc-950/80 border border-amber-700/40 p-2.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-amber-600">Медь (CP)</div>
                <div className="text-xl font-mono font-black text-amber-500">{treasury.copper}</div>
              </div>
              <div className="bg-zinc-950/80 border border-indigo-400/40 p-2.5 rounded-xl">
                <div className="text-[10px] uppercase font-bold text-indigo-400">Электрум (EP)</div>
                <div className="text-xl font-mono font-black text-indigo-300">{treasury.electrum}</div>
              </div>
            </div>

            {/* Быстрое добавление монет */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800">
              <span className="text-xs text-zinc-400 font-semibold">Добавить трофеи:</span>
              <input
                type="number"
                placeholder="GP"
                value={addGp}
                onChange={(e) => setAddGp(parseInt(e.target.value) || 0)}
                className="w-20 bg-zinc-950 border border-zinc-700 rounded-xl px-2 py-1 text-xs font-mono text-zinc-100 text-center"
              />
              <button
                onClick={() => campaignService.addCoins(addGp, addSp, addCp, addPp, 0, coinReason)}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold transition-all active:scale-95"
              >
                + Зачислить в казну
              </button>
            </div>
          </div>

          {/* Общий инвентарь / Bag of Holding */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                Общепартийный инвентарь (Мешок хранения)
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Общий вес: <span className="text-amber-400 font-bold">{totalWeight.toFixed(1)} фнт</span>
              </span>
            </div>

            {treasury.sharedBag.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">Мешок хранения пока пуст.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {treasury.sharedBag.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between space-x-2"
                  >
                    <div>
                      <div className="text-xs font-bold text-zinc-200">
                        {item.name} <span className="text-amber-400 font-mono">x{item.quantity}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {item.weightPerUnit} фнт/ед. • {item.description || item.rarity}
                      </div>
                    </div>

                    <button
                      onClick={() => campaignService.deleteSharedItem(item.id)}
                      className="p-1 text-zinc-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
