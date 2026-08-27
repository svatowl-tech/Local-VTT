import React, { useState } from 'react';
import { 
  NpcRawData 
} from '../../types/generatorTypes';
import { 
  MapItem 
} from '../../types';
import { 
  createNpcTokenItem, 
  createNpcContentCardItem, 
  createNpcLoreItem 
} from '../../utils/cardImportHelper';
import { worldLoreService } from '../../services/worldLoreService';
import { playUniversalSfx } from '../../utils/sfxAudio';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';
import { 
  Shield, 
  Heart, 
  Footprints, 
  BookOpen, 
  Layers, 
  Copy, 
  Check, 
  FileText, 
  Sparkles, 
  Sword, 
  BookmarkCheck,
  User,
  ExternalLink,
  Briefcase,
  Coins,
  Home,
  Eye,
  KeyRound,
  Radio,
  Smile
} from 'lucide-react';

interface Props {
  npc: NpcRawData;
  rawText: string;
  onImportMapItem?: (item: MapItem) => void;
  onShowToast?: (msg: string) => void;
}

export const NpcCardView: React.FC<Props> = ({
  npc,
  rawText,
  onImportMapItem,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'card' | 'text'>('card');
  const [copied, setCopied] = useState(false);
  const [savedToLore, setSavedToLore] = useState(false);
  const [tokenPlaced, setTokenPlaced] = useState(false);
  const [cardPlaced, setCardPlaced] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    playUniversalSfx('click');
    setTimeout(() => setCopied(false), 2000);
    if (onShowToast) onShowToast('Текст NPC скопирован в буфер обмена');
  };

  const handlePlaceToken = () => {
    if (!onImportMapItem) return;
    const tokenItem = createNpcTokenItem(npc);
    onImportMapItem(tokenItem);
    setTokenPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setTokenPlaced(false), 2500);
    if (onShowToast) onShowToast(`Токен «${npc.fullName}» добавлен на карту!`);
  };

  const handlePlaceCard = () => {
    if (!onImportMapItem) return;
    const cardItem = createNpcContentCardItem(npc);
    onImportMapItem(cardItem);
    setCardPlaced(true);
    playUniversalSfx('click');
    setTimeout(() => setCardPlaced(false), 2500);
    if (onShowToast) onShowToast(`Карточка «${npc.fullName}» помещена на стол!`);
  };

  const handleSaveToLore = async () => {
    try {
      const loreItem = createNpcLoreItem(npc);
      await worldLoreService.saveItem(loreItem);
      setSavedToLore(true);
      playUniversalSfx('success');
      setTimeout(() => setSavedToLore(false), 3000);
      if (onShowToast) onShowToast(`«${npc.fullName}» успешно сохранен в Энциклопедию лора!`);
    } catch (err) {
      console.error('Failed to save NPC to lore:', err);
    }
  };

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* 1. Quick Actions Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'text' : 'card')}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Переключить вид: Карточка / Текст"
          >
            {viewMode === 'card' ? <FileText className="w-3.5 h-3.5 text-zinc-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
            <span>{viewMode === 'card' ? 'Текст' : 'Карточка'}</span>
          </button>
          
          <button
            onClick={handleCopy}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg border border-zinc-700/60 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Скопировать статблок"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
          </button>
        </div>

        {/* Action Group: Import to Map & Lore */}
        <div className="flex items-center space-x-1.5">
          <PolzaGenerateButton
            entity={{
              type: 'npc',
              id: npc.fullName,
              name: npc.fullName,
              subtitle: `${npc.gender} ${npc.race} ${npc.classType}`,
              race: npc.race,
              classType: npc.classType,
              personality: `${npc.appearance || ''}. ${npc.motivation || ''}. ${npc.quirk || ''}`,
              description: rawText,
            }}
            onApplyImage={(imgUrl) => {
              (npc as any).avatarUrl = imgUrl;
              (npc as any).tokenImg = imgUrl;
              (npc as any).img = imgUrl;
              if (onShowToast) onShowToast(`Арт Polza AI применён к ${npc.fullName}`);
            }}
            onPlaceOnTable={
              onImportMapItem
                ? (imgUrl) => {
                    const token = createNpcTokenItem({ ...npc, avatarUrl: imgUrl } as any);
                    onImportMapItem(token);
                    if (onShowToast) onShowToast(`Токен с артом Polza AI добавлен на стол`);
                  }
                : undefined
            }
          />

          <button
            onClick={handlePlaceToken}
            className="px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/60 text-rose-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Создать боевой токен персонажа и поместить на карту"
          >
            {tokenPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Layers className="w-3.5 h-3.5 text-rose-400" />}
            <span>{tokenPlaced ? 'Токен добавлен!' : 'Токен на карту'}</span>
          </button>

          <button
            onClick={handlePlaceCard}
            className="px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/60 text-amber-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Создать интерактивную карточку персонажа на игровом столе"
          >
            {cardPlaced ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ExternalLink className="w-3.5 h-3.5 text-amber-400" />}
            <span>{cardPlaced ? 'На столе!' : 'Карточка на стол'}</span>
          </button>

          <button
            onClick={handleSaveToLore}
            className="px-2.5 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-200 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            title="Сохранить персонажа в Энциклопедию лора мира"
          >
            {savedToLore ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" /> : <BookOpen className="w-3.5 h-3.5 text-purple-400" />}
            <span>{savedToLore ? 'В лоре!' : 'В энциклопедию'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Display */}
      {viewMode === 'text' ? (
        <div className="w-full h-80 bg-zinc-950 rounded-xl border border-zinc-800 p-3 overflow-y-auto custom-scrollbar">
          <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap">{rawText}</pre>
        </div>
      ) : (
        <div className="w-full bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 rounded-2xl border border-zinc-800 p-4 space-y-3.5 shadow-xl select-text">
          {/* Header Identity Bar */}
          <div className="flex items-start justify-between border-b border-zinc-800/80 pb-3 gap-2">
            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Уровень {npc.level}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {npc.gender}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {npc.alignment}
                </span>
                {npc.ageGroup && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-950/50 text-blue-300 border border-blue-800/40">
                    {npc.ageGroup}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>{npc.fullName}</span>
              </h3>
              <p className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5 flex-wrap">
                <span>{npc.race} • {npc.classType}</span>
                {npc.profession && (
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] rounded-md border border-amber-500/30 flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{npc.profession}</span>
                  </span>
                )}
              </p>
            </div>

            {/* Quick Stat Pill */}
            <div className="flex items-center space-x-1.5 shrink-0">
              <div className="flex flex-col items-center bg-rose-950/40 border border-rose-800/50 rounded-xl px-2.5 py-1">
                <div className="flex items-center space-x-1 text-rose-400 text-[10px] font-bold">
                  <Heart className="w-3 h-3" />
                  <span>HP</span>
                </div>
                <span className="text-xs font-bold text-zinc-100">{npc.hp}</span>
              </div>

              <div className="flex flex-col items-center bg-blue-950/40 border border-blue-800/50 rounded-xl px-2.5 py-1">
                <div className="flex items-center space-x-1 text-blue-400 text-[10px] font-bold">
                  <Shield className="w-3 h-3" />
                  <span>AC</span>
                </div>
                <span className="text-xs font-bold text-zinc-100">{npc.ac}</span>
              </div>

              <div className="flex flex-col items-center bg-emerald-950/40 border border-emerald-800/50 rounded-xl px-2.5 py-1">
                <div className="flex items-center space-x-1 text-emerald-400 text-[10px] font-bold">
                  <Footprints className="w-3 h-3" />
                  <span>Скорость</span>
                </div>
                <span className="text-[11px] font-bold text-zinc-100">{npc.speed}</span>
              </div>
            </div>
          </div>

          {/* Profession & Social Status Block */}
          {(npc.profession || npc.socialStatus) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-amber-950/20 p-2.5 rounded-xl border border-amber-900/30">
              <div className="space-y-1">
                <div className="flex items-center space-x-1 text-amber-400 font-bold text-[10px] uppercase">
                  <Briefcase className="w-3 h-3" />
                  <span>Профессия: {npc.profession || 'Обыватель'}</span>
                </div>
                <p className="text-zinc-300 text-[11px]">
                  {npc.professionPerk || 'Мастер своего дела'}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-amber-400 font-bold text-[10px] uppercase">
                  <span className="flex items-center space-x-1">
                    <Home className="w-3 h-3" />
                    <span>{npc.socialStatus || 'Средний класс'}</span>
                  </span>
                  {npc.purse && (
                    <span className="text-amber-300 font-mono font-bold flex items-center space-x-1">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span>{npc.purse.gp} gp {npc.purse.sp} sp</span>
                    </span>
                  )}
                </div>
                <p className="text-zinc-300 text-[11px]">
                  {npc.socialStatusDesc || npc.housing || 'Обычное жилье'}
                </p>
              </div>
            </div>
          )}

          {/* Core Ability Scores Grid */}
          <div className="grid grid-cols-6 gap-1.5 bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80 text-center font-mono">
            {[
              { label: 'СИЛ', val: npc.stats.STR },
              { label: 'ЛОВ', val: npc.stats.DEX },
              { label: 'ТЕЛ', val: npc.stats.CON },
              { label: 'ИНТ', val: npc.stats.INT },
              { label: 'МДР', val: npc.stats.WIS },
              { label: 'ХАР', val: npc.stats.CHA },
            ].map((st) => (
              <div key={st.label} className="flex flex-col items-center bg-zinc-900/60 py-1.5 px-1 rounded-lg border border-zinc-800/50">
                <span className="text-[9px] text-zinc-500 font-sans font-bold">{st.label}</span>
                <span className="text-xs font-bold text-zinc-200">{st.val}</span>
              </div>
            ))}
          </div>

          {/* Saving Throws & Proficiencies */}
          <div className="text-[11px] text-zinc-300 space-y-1 bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60">
            <div>
              <strong className="text-zinc-400">Спасброски: </strong>
              <span className="text-amber-200">{npc.savingThrows}</span>
            </div>
            <div>
              <strong className="text-zinc-400">Бонус мастерства: </strong>
              <span className="text-zinc-200 font-mono">{npc.proficiencyBonus}</span>
            </div>
          </div>

          {/* Appearance & Attitude */}
          {(npc.appearance || npc.attitudeReaction) && (
            <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-800/80 text-[11px] space-y-1.5">
              {npc.appearance && (
                <div className="flex items-start space-x-1.5">
                  <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-300">Внешность: </strong>
                    <span className="text-zinc-400">{npc.appearance}</span>
                  </div>
                </div>
              )}
              {npc.attitudeReaction && (
                <div className="flex items-start space-x-1.5">
                  <Smile className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-300">Отношение: </strong>
                    <span className="text-zinc-400">{npc.attitude} — {npc.attitudeReaction}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Secret & Rumor Hooks */}
          {(npc.secret || npc.rumor) && (
            <div className="bg-purple-950/20 p-2.5 rounded-xl border border-purple-900/40 text-[11px] space-y-1.5">
              {npc.secret && (
                <div className="flex items-start space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-purple-300">Личная тайна: </strong>
                    <span className="text-zinc-300">{npc.secret}</span>
                  </div>
                </div>
              )}
              {npc.rumor && (
                <div className="flex items-start space-x-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Известный слух: </strong>
                    <span className="text-zinc-300">{npc.rumor}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Racial & Class Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                Расовые особенности
              </span>
              <ul className="space-y-0.5 text-zinc-300 list-disc list-inside">
                {npc.racialTraits.map((trait, idx) => (
                  <li key={idx} className="truncate">{trait}</li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Классовые умения
              </span>
              <ul className="space-y-0.5 text-zinc-300 list-disc list-inside">
                {npc.classFeatures.map((feat, idx) => (
                  <li key={idx} className="truncate">{feat}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Equipment */}
          <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1">
              <Sword className="w-3 h-3" />
              <span>Снаряжение, оружие и инструменты</span>
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {npc.equipment.map((item, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] font-medium rounded-md border border-zinc-700">
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Motivation & Quirk */}
          <div className="bg-zinc-900/40 p-2.5 rounded-xl border border-zinc-800/60 text-[11px] space-y-1">
            <div>
              <strong className="text-amber-400">Мотивация: </strong>
              <span className="text-zinc-200">{npc.motivation}</span>
            </div>
            <div>
              <strong className="text-amber-400">Особенность: </strong>
              <span className="text-zinc-300 italic">{npc.quirk}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
