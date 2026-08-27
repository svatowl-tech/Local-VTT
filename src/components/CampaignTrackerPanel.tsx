import React, { useState, useEffect } from 'react';
import {
  Clock,
  Scroll,
  Compass,
  Users,
  BookOpen,
  Shield,
  ShieldAlert,
  Sparkles,
  Download,
  Upload,
  RefreshCw,
  FolderOpen,
  Plus,
  Globe,
  Wand2,
} from 'lucide-react';
import { CampaignData } from '../types/campaignTypes';
import { campaignService } from '../services/campaignService';
import { CampaignTimeTrackerTab } from './campaign/CampaignTimeTrackerTab';
import { CampaignQuestsTab } from './campaign/CampaignQuestsTab';
import { CampaignLocationsTab } from './campaign/CampaignLocationsTab';
import { CampaignNpcRelationshipTab } from './campaign/CampaignNpcRelationshipTab';
import { CampaignSessionsTimelineTab } from './campaign/CampaignSessionsTimelineTab';
import { CampaignPartyTreasuryTab } from './campaign/CampaignPartyTreasuryTab';
import { CampaignSafetyRulesTab } from './campaign/CampaignSafetyRulesTab';
import { CampaignManagerModal } from './campaign/CampaignManagerModal';
import { CampaignCreationWizardModal } from './campaign/CampaignCreationWizardModal';
import { CampaignAiPromptGeneratorModal } from './campaign/CampaignAiPromptGeneratorModal';
import { ImportFromLoreOrCompendiumModal } from './campaign/ImportFromLoreOrCompendiumModal';
import { PolzaJsonModal } from './polza/PolzaJsonModal';
import { PolzaQuickInlineGenerator } from './polza/PolzaQuickInlineGenerator';
import { playUniversalSfx } from '../utils/sfxAudio';

interface Props {
  onClose?: () => void;
  onPlaceOnCanvas?: (type: 'quest' | 'npc' | 'location', data: any) => void;
  onOpenSceneTab?: (sceneTabName: string) => void;
}

type MainTabType = 'time' | 'quests' | 'locations' | 'npcs' | 'sessions' | 'party' | 'safety';

export const CampaignTrackerPanel: React.FC<Props> = ({
  onClose,
  onPlaceOnCanvas,
  onOpenSceneTab,
}) => {
  const [campaign, setCampaign] = useState<CampaignData>(campaignService.getState());
  const [activeTab, setActiveTab] = useState<MainTabType>('time');

  // Modals
  const [showManagerModal, setShowManagerModal] = useState<boolean>(false);
  const [showWizardModal, setShowWizardModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showLoreImportModal, setShowLoreImportModal] = useState<boolean>(false);
  const [showPolzaModal, setShowPolzaModal] = useState<boolean>(false);

  // Subscribe to reactive service changes
  useEffect(() => {
    const unsub = campaignService.subscribe((state) => {
      setCampaign({ ...state });
    });
    return () => unsub();
  }, []);

  const handleExportJson = () => {
    playUniversalSfx('item_click');
    const jsonStr = JSON.stringify(campaign, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign_${campaign.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const navTabs: { id: MainTabType; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'time', label: 'Время & Календарь', icon: Clock },
    {
      id: 'quests',
      label: 'Квесты & Задания',
      icon: Scroll,
      badge: campaign.quests?.filter((q) => q.status === 'active').length || 0,
    },
    { id: 'locations', label: 'Атлас & Локации', icon: Compass, badge: campaign.locations?.length || 0 },
    { id: 'npcs', label: 'NPC & Связи', icon: Users, badge: campaign.npcs?.length || 0 },
    { id: 'sessions', label: 'Сессии & Таймлайн', icon: BookOpen, badge: campaign.sessions?.length || 0 },
    { id: 'party', label: 'Партия & Казна', icon: Shield, badge: campaign.party?.length || 0 },
    { id: 'safety', label: 'Правила & Safety', icon: ShieldAlert },
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-100 font-sans select-none overflow-hidden relative">
      {/* 1. Верхняя панель заголовка модуля кампании */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-zinc-900/95 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
            <Scroll className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-zinc-100 tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">{campaign.name}</span>
              <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                Диск: assets/data/Campaigns
              </span>
            </h2>
            <div className="text-[10px] sm:text-[11px] text-zinc-400 truncate">
              Мастер: <span className="text-zinc-200 font-medium">{campaign.dungeonMasterName || 'DM'}</span> •{' '}
              {campaign.system} • <span className="text-zinc-300">{campaign.worldName || 'Свой мир'}</span>
            </div>
          </div>
        </div>

        {/* Действия: Менеджер, Мастер, ИИ, Импорт Лора */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Открыть Менеджер Кампаний на Диске */}
          <button
            onClick={() => {
              playUniversalSfx('item_click');
              setShowManagerModal(true);
            }}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Список всех кампаний на диске"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Кампании</span>
          </button>

          {/* Мастер создания новой кампании */}
          <button
            onClick={() => {
              playUniversalSfx('item_click');
              setShowWizardModal(true);
            }}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Пошаговый мастер создания новой кампании"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Мастер</span>
          </button>

          {/* Генерация в Polza AI */}
          <button
            onClick={() => {
              playUniversalSfx('item_click');
              setShowPolzaModal(true);
            }}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/50 text-amber-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 active:scale-95"
            title="Генерация любого элемента кампании в Polza AI"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Генерация в Polza AI</span>
          </button>

          {/* ИИ Генератор Промпта & JSON */}
          <button
            onClick={() => {
              playUniversalSfx('item_click');
              setShowAiModal(true);
            }}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Генератор промптов для ИИ и загрузчик готового JSON"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">ИИ Промпт</span>
          </button>

          {/* Импорт из LoreWiki */}
          <button
            onClick={() => {
              playUniversalSfx('item_click');
              setShowLoreImportModal(true);
            }}
            className="px-2 sm:px-2.5 py-1 sm:py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
            title="Импорт NPC, локаций и статей из LoreWiki"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Из LoreWiki</span>
          </button>

          {/* Экспорт */}
          <button
            onClick={handleExportJson}
            className="p-1 sm:p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
            title="Экспорт JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Горизонтальная панель вкладок (Табы) - адаптивная, все вкладки всегда видны */}
      <div className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-zinc-900/60 border-b border-zinc-800/80 flex flex-wrap items-center gap-1 sm:gap-1.5 shrink-0 z-10">
        {navTabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                playUniversalSfx('item_click');
                setActiveTab(tab.id);
              }}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-95 shrink-0 ${
                isActive
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-zinc-800/80'
              }`}
            >
              <TabIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`text-[9px] sm:text-[10px] font-mono font-black px-1.5 py-0.2 rounded-full shrink-0 ${
                    isActive ? 'bg-zinc-950 text-amber-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Рабочая область контента активного таба */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {activeTab === 'time' && <CampaignTimeTrackerTab time={campaign.time} />}

        {activeTab === 'quests' && (
          <CampaignQuestsTab
            quests={campaign.quests || []}
            onPlaceQuestOnCanvas={(q) => onPlaceOnCanvas?.('quest', q)}
            onOpenLoreImport={() => setShowLoreImportModal(true)}
          />
        )}

        {activeTab === 'locations' && (
          <CampaignLocationsTab
            locations={campaign.locations || []}
            onPlaceLocationOnCanvas={(loc) => onPlaceOnCanvas?.('location', loc)}
            onOpenSceneTab={onOpenSceneTab}
            onOpenLoreImport={() => setShowLoreImportModal(true)}
          />
        )}

        {activeTab === 'npcs' && (
          <CampaignNpcRelationshipTab
            npcs={campaign.npcs || []}
            relationships={campaign.relationships || []}
            onPlaceNpcOnCanvas={(npc) => onPlaceOnCanvas?.('npc', npc)}
            onOpenLoreImport={() => setShowLoreImportModal(true)}
          />
        )}

        {activeTab === 'sessions' && (
          <CampaignSessionsTimelineTab
            sessions={campaign.sessions || []}
            timeline={campaign.timeline || []}
          />
        )}

        {activeTab === 'party' && (
          <CampaignPartyTreasuryTab
            party={campaign.party || []}
            treasury={campaign.treasury}
          />
        )}

        {activeTab === 'safety' && (
          <CampaignSafetyRulesTab
            safety={campaign.safety}
          />
        )}
      </div>

      {/* MODALS */}
      {showManagerModal && (
        <CampaignManagerModal
          currentCampaignId={campaign.id}
          onClose={() => setShowManagerModal(false)}
          onOpenWizard={() => setShowWizardModal(true)}
          onOpenAiGenerator={() => setShowAiModal(true)}
        />
      )}

      {showWizardModal && (
        <CampaignCreationWizardModal
          onClose={() => setShowWizardModal(false)}
        />
      )}

      {showAiModal && (
        <CampaignAiPromptGeneratorModal
          onClose={() => setShowAiModal(false)}
        />
      )}

      {showLoreImportModal && (
        <ImportFromLoreOrCompendiumModal
          targetType={
            activeTab === 'npcs'
              ? 'npc'
              : activeTab === 'locations'
              ? 'location'
              : activeTab === 'quests'
              ? 'quest'
              : 'all'
          }
          onClose={() => setShowLoreImportModal(false)}
        />
      )}

      {showPolzaModal && (
        <PolzaJsonModal
          isOpen={showPolzaModal}
          onClose={() => setShowPolzaModal(false)}
          initialEntityType={
            activeTab === 'quests'
              ? 'quest'
              : activeTab === 'locations'
              ? 'location'
              : activeTab === 'npcs'
              ? 'npc'
              : activeTab === 'sessions'
              ? 'lore'
              : activeTab === 'party'
              ? 'item'
              : activeTab === 'safety'
              ? 'rule'
              : 'lore'
          }
        />
      )}
    </div>
  );
};
