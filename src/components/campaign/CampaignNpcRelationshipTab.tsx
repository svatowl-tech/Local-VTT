import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Users,
  Network,
  Plus,
  Heart,
  Swords,
  Skull,
  Shield,
  UserCheck,
  UserX,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
  Mic,
  Smile,
  Zap,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  CampaignNpc,
  NpcRelationshipLink,
  RelationshipType,
  NpcAttitude,
  NpcStatus,
} from '../../types/campaignTypes';
import { campaignService } from '../../services/campaignService';
import { PolzaGenerateButton } from '../polza/PolzaGenerateButton';
import { PolzaEntityContext } from '../../types/polzaTypes';
import { PolzaQuickInlineGenerator } from '../polza/PolzaQuickInlineGenerator';

interface Props {
  npcs: CampaignNpc[];
  relationships: NpcRelationshipLink[];
  onPlaceNpcOnCanvas?: (npc: CampaignNpc) => void;
  onOpenLoreImport?: () => void;
}

interface NodePosition {
  id: string;
  x: number;
  y: number;
}

export const CampaignNpcRelationshipTab: React.FC<Props> = ({
  npcs,
  relationships,
  onPlaceNpcOnCanvas,
  onOpenLoreImport,
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'web'>('web');
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(npcs[0]?.id || null);
  const [isCreatingNpc, setIsCreatingNpc] = useState(false);
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // NPC Form
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [race, setRace] = useState('');
  const [role, setRole] = useState('');
  const [attitude, setAttitude] = useState<NpcAttitude>('neutral');
  const [status, setStatus] = useState<NpcStatus>('alive');
  const [appearance, setAppearance] = useState('');
  const [personality, setPersonality] = useState('');
  const [motivation, setMotivation] = useState('');
  const [secrets, setSecrets] = useState('');
  const [voiceNotes, setVoiceNotes] = useState('');

  // Link Form
  const [sourceId, setSourceId] = useState(npcs[0]?.id || '');
  const [targetId, setTargetId] = useState(npcs[1]?.id || '');
  const [linkType, setLinkType] = useState<RelationshipType>('ally');
  const [linkLabel, setLinkLabel] = useState('');

  // Interactive Graph Node Positions State
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const graphContainerRef = useRef<HTMLDivElement>(null);

  // Initialize node positions in a circular layout if not set
  useEffect(() => {
    setNodePositions((prev) => {
      const updated = { ...prev };
      const count = npcs.length;
      const radius = 180;
      const centerX = 320;
      const centerY = 240;

      npcs.forEach((npc, index) => {
        if (!updated[npc.id]) {
          const angle = (index / Math.max(1, count)) * 2 * Math.PI;
          updated[npc.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          };
        }
      });
      return updated;
    });
  }, [npcs]);

  const handleMouseDownNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDraggingNodeId(id);
    const pos = nodePositions[id] || { x: 300, y: 200 };
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingNodeId) return;
      const newX = Math.max(50, Math.min(650, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(50, Math.min(480, e.clientY - dragOffsetRef.current.y));
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: newX, y: newY },
      }));
    },
    [draggingNodeId]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  const handleCreateNpc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    campaignService.addNpc({
      name: name.trim(),
      title: title.trim() || undefined,
      race: race.trim() || undefined,
      role: role.trim() || undefined,
      attitude,
      status,
      appearance: appearance.trim(),
      personality: personality.trim(),
      motivation: motivation.trim(),
      secrets: secrets.trim(),
      voiceNotes: voiceNotes.trim(),
      tags: [role || 'NPC'],
    });

    setName('');
    setTitle('');
    setRole('');
    setIsCreatingNpc(false);
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) return;

    const defaultLabels: Record<RelationshipType, string> = {
      ally: 'Союзники',
      allies: 'Союзники',
      enemy: 'Враги',
      family: 'Семья',
      love: 'Любовь',
      debt: 'Долг / Обязательство',
      betrayal: 'Предательство',
      master_servant: 'Служба / Повелевание',
      rival: 'Соперники',
      business: 'Партнеры',
    };

    campaignService.addRelationship({
      sourceNpcId: sourceId,
      targetNpcId: targetId,
      type: linkType,
      label: linkLabel.trim() || defaultLabels[linkType],
    });

    setLinkLabel('');
    setIsCreatingLink(false);
  };

  const getAttitudeColor = (att: NpcAttitude) => {
    switch (att) {
      case 'ally':
      case 'friendly':
        return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
      case 'nemesis':
      case 'hostile':
        return 'text-rose-400 border-rose-500/50 bg-rose-500/10';
      case 'suspicious':
        return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
      default:
        return 'text-zinc-300 border-zinc-700 bg-zinc-800/80';
    }
  };

  const getLinkColor = (type: RelationshipType) => {
    switch (type) {
      case 'ally':
      case 'love':
        return '#10b981'; // Emerald / Green
      case 'enemy':
      case 'betrayal':
        return '#ef4444'; // Red
      case 'family':
        return '#8b5cf6'; // Purple
      case 'master_servant':
        return '#f59e0b'; // Amber
      case 'debt':
      case 'business':
        return '#06b6d4'; // Cyan
      case 'rival':
        return '#f97316'; // Orange
      default:
        return '#71717a';
    }
  };

  const selectedNpc = npcs.find((n) => n.id === selectedNpcId);

  return (
    <div className="space-y-4 text-zinc-100 select-none">
      {/* 1. Верхний переключатель режимов: Паутина / Карточки */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
        <div className="flex items-center space-x-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setViewMode('web')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'web'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Паутина отношений</span>
          </button>

          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'cards'
                ? 'bg-amber-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Карточки NPC ({npcs.length})</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenLoreImport && (
            <button
              onClick={onOpenLoreImport}
              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
              title="Импорт NPC и монстров из LoreWiki"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Из LoreWiki</span>
            </button>
          )}

          <button
            onClick={() => setIsCreatingLink(!isCreatingLink)}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-semibold rounded-xl text-xs transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Связать NPC</span>
          </button>

          <button
            onClick={() => setIsCreatingNpc(!isCreatingNpc)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый NPC</span>
          </button>
        </div>
      </div>

      {/* Быстрый генератор Polza AI для NPC и Связей */}
      <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-3 shadow-md space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold text-amber-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ИИ-Генерация персонажей (NPC) и их социальных связей в Polza AI</span>
          </span>
          <span className="text-[10px] text-zinc-400 font-normal">Сгенерирует внешность, характер, тайны, токен и связи в социальном графе</span>
        </div>
        <PolzaQuickInlineGenerator
          entityType="npc"
          placeholder="Промпт для NPC (например: Кенку-плут торгующий секретами, капитан стражи, безумный алхимик)..."
          buttonLabel="Сгенерировать NPC & Связи"
        />
      </div>

      {/* 2. Модалка добавления связи (Link) */}
      {isCreatingLink && (
        <form onSubmit={handleCreateLink} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Добавление связи между персонажами
            </span>
            <button type="button" onClick={() => setIsCreatingLink(false)} className="text-xs text-zinc-400">
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Персонаж 1 (Источник)</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
              >
                {npcs.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.role || 'NPC'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Тип отношений</label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as RelationshipType)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
              >
                <option value="ally">🤝 Союзник / Друг</option>
                <option value="enemy">⚔️ Враг / Противостояние</option>
                <option value="family">🧬 Семья / Родственник</option>
                <option value="love">💖 Любовь / Роман</option>
                <option value="master_servant">👑 Слуга / Повелитель</option>
                <option value="betrayal">🗡️ Предательство / Месть</option>
                <option value="debt">📜 Долг / Обязательство</option>
                <option value="rival">⚡ Соперничество</option>
                <option value="business">💰 Деловое партнерство</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Персонаж 2 (Цель)</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
              >
                {npcs.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.role || 'NPC'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="submit"
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Создать связь
            </button>
          </div>
        </form>
      )}

      {/* 3. Модалка создания NPC */}
      {isCreatingNpc && (
        <form onSubmit={handleCreateNpc} className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Создание карточки NPC
            </span>
            <button type="button" onClick={() => setIsCreatingNpc(false)} className="text-xs text-zinc-400">
              Отмена
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Имя персонажа *</label>
              <input
                type="text"
                required
                placeholder="например: Талиса Лунный Ручей"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Титул / Должность</label>
              <input
                type="text"
                placeholder="например: Капитан стражи"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Отношение к партии</label>
              <select
                value={attitude}
                onChange={(e) => setAttitude(e.target.value as NpcAttitude)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
              >
                <option value="ally">💚 Союзник (Ally)</option>
                <option value="friendly">🤝 Дружелюбен (Friendly)</option>
                <option value="neutral">⚖️ Нейтрален (Neutral)</option>
                <option value="suspicious">🧐 Насторожен (Suspicious)</option>
                <option value="hostile">⚔️ Враждебен (Hostile)</option>
                <option value="nemesis">💀 Заклятый враг (Nemesis)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Характер и мотивация</label>
              <textarea
                rows={2}
                placeholder="Чего хочет NPC, его манеры и ценности"
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400">Секреты для Мастера</label>
              <textarea
                rows={2}
                placeholder="Тайны, которые партия может раскрыть"
                value={secrets}
                onChange={(e) => setSecrets(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-zinc-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="submit"
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-md"
            >
              Сохранить NPC
            </button>
          </div>
        </form>
      )}

      {/* 4. ВИД: Паутина отношений (Interactive Web Graph) */}
      {viewMode === 'web' ? (
        <div
          ref={graphContainerRef}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="relative w-full h-[460px] bg-zinc-950/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-inner cursor-crosshair select-none"
        >
          {/* Фон с сеткой */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <pattern id="grid_pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="#3f3f46" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid_pattern)" />

            {/* Линии связей */}
            {relationships.map((rel) => {
              const srcPos = nodePositions[rel.sourceNpcId];
              const tgtPos = nodePositions[rel.targetNpcId];
              if (!srcPos || !tgtPos) return null;

              const strokeColor = getLinkColor(rel.type);
              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;

              return (
                <g key={rel.id}>
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeDasharray={rel.type === 'betrayal' || rel.type === 'enemy' ? '4 3' : undefined}
                    opacity="0.85"
                  />
                  {/* Подпись связи */}
                  <rect
                    x={midX - 45}
                    y={midY - 10}
                    width="90"
                    height="20"
                    rx="6"
                    fill="#18181b"
                    stroke={strokeColor}
                    strokeWidth="1"
                    opacity="0.9"
                  />
                  <text
                    x={midX}
                    y={midY + 3.5}
                    textAnchor="middle"
                    fill="#f4f4f5"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {rel.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Узлы NPC */}
          {npcs.map((npc) => {
            const pos = nodePositions[npc.id] || { x: 200, y: 150 };
            const isSelected = selectedNpcId === npc.id;
            const attClass = getAttitudeColor(npc.attitude);

            return (
              <div
                key={npc.id}
                onMouseDown={(e) => handleMouseDownNode(e, npc.id)}
                onClick={() => setSelectedNpcId(npc.id)}
                style={{
                  left: `${pos.x - 60}px`,
                  top: `${pos.y - 28}px`,
                }}
                className={`absolute w-[120px] p-2 rounded-xl border flex flex-col items-center justify-center text-center cursor-grab active:cursor-grabbing transition-shadow shadow-md z-10 ${attClass} ${
                  isSelected ? 'ring-2 ring-amber-400 scale-105 shadow-amber-500/20' : 'hover:scale-102'
                }`}
              >
                <span className="text-[11px] font-bold tracking-tight truncate w-full">
                  {npc.name}
                </span>
                <span className="text-[9px] text-zinc-400 truncate w-full font-mono">
                  {npc.role || npc.title || 'Персонаж'}
                </span>
              </div>
            );
          })}

          {/* Плашка выбранного NPC сбоку */}
          {selectedNpc && (
            <div className="absolute bottom-3 left-3 max-w-xs bg-zinc-900/95 backdrop-blur-md border border-amber-500/40 p-3 rounded-xl shadow-2xl z-20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">{selectedNpc.name}</span>
                <span className="text-[9px] font-mono text-zinc-400">{selectedNpc.role}</span>
              </div>
              {selectedNpc.personality && (
                <p className="text-[11px] text-zinc-300 leading-snug">{selectedNpc.personality}</p>
              )}
              {selectedNpc.secrets && (
                <div className="text-[10px] text-indigo-300 italic bg-indigo-950/30 p-1.5 rounded border border-indigo-900/50">
                  🔒 {selectedNpc.secrets}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* 5. ВИД: Каталог карточек NPC */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {npcs.map((npc) => {
            const attClass = getAttitudeColor(npc.attitude);
            return (
              <div
                key={npc.id}
                className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3.5 space-y-2.5 hover:border-zinc-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                      <span>{npc.name}</span>
                      {npc.title && (
                        <span className="text-xs font-normal text-zinc-400">({npc.title})</span>
                      )}
                    </h3>
                    <div className="text-[10px] font-mono text-zinc-400">
                      {npc.race} • {npc.role || 'NPC'}
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${attClass}`}>
                    {npc.attitude}
                  </span>
                </div>

                {npc.personality && (
                  <p className="text-xs text-zinc-300 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/80">
                    {npc.personality}
                  </p>
                )}

                {npc.secrets && (
                  <div className="text-xs text-indigo-300 italic bg-indigo-950/20 p-2 rounded-xl border border-indigo-900/40 flex items-start gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{npc.secrets}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                  <div className="flex items-center space-x-2">
                    <PolzaGenerateButton
                      entity={{
                        type: 'npc',
                        id: npc.id,
                        name: npc.name,
                        subtitle: npc.title,
                        race: npc.race,
                        classType: npc.role,
                        personality: npc.personality,
                        description: `${npc.personality || ''}. ${npc.secrets || ''}`,
                      }}
                      onApplyImage={(imgUrl) => {
                        campaignService.updateNpc(npc.id, { ...npc, avatarUrl: imgUrl } as any);
                      }}
                      onPlaceOnTable={
                        onPlaceNpcOnCanvas
                          ? (imgUrl) => {
                              onPlaceNpcOnCanvas({ ...npc, avatarUrl: imgUrl } as any);
                            }
                          : undefined
                      }
                    />

                    {onPlaceNpcOnCanvas && (
                      <button
                        onClick={() => onPlaceNpcOnCanvas(npc)}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>На стол</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => campaignService.deleteNpc(npc.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
