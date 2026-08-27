import React, { useState, useEffect } from 'react';
import { campaignService } from '../../services/campaignService';
import { CampaignSummary } from '../../types/campaignTypes';
import {
  FolderOpen,
  Plus,
  Trash2,
  Download,
  Sparkles,
  Check,
  X,
  Scroll,
  Clock,
  MapPin,
  Users,
  Shield,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { playUniversalSfx } from '../../utils/sfxAudio';

interface Props {
  currentCampaignId: string;
  onClose: () => void;
  onOpenWizard: () => void;
  onOpenAiGenerator: () => void;
  onCampaignSwitched?: () => void;
}

export const CampaignManagerModal: React.FC<Props> = ({
  currentCampaignId,
  onClose,
  onOpenWizard,
  onOpenAiGenerator,
  onCampaignSwitched,
}) => {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    setIsLoading(true);
    try {
      const list = await campaignService.fetchCampaignsList();
      setCampaigns(list);
    } catch (e) {
      console.error('Failed to load campaigns list:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchCampaign = async (c: CampaignSummary) => {
    playUniversalSfx('item_click');
    const ok = await campaignService.loadCampaignFromDisk(c.fileName || c.id);
    if (ok) {
      playUniversalSfx('dice_roll');
      if (onCampaignSwitched) onCampaignSwitched();
      onClose();
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Вы уверены, что хотите удалить эту кампанию с диска? Это действие необратимо.')) {
      setDeletingId(id);
      playUniversalSfx('item_click');
      await campaignService.deleteCampaignFromDisk(id);
      await loadList();
      setDeletingId(null);
    }
  };

  const handleExportJson = (c: CampaignSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    playUniversalSfx('item_click');
    // Fetch full JSON and download
    fetch(`/api/campaigns/load?id=${encodeURIComponent(c.fileName || c.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.campaign) {
          const blob = new Blob([JSON.stringify(data.campaign, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${c.name.replace(/\s+/g, '_')}_campaign.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-zinc-950 border border-amber-500/40 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-amber-300">
                Кампании на диске (Campaign Manager)
              </h2>
              <p className="text-xs text-zinc-400">
                Хранилище кампаний в директории <code className="text-amber-400/80">assets/data/Campaigns/</code>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadList}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
              title="Обновить список"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-wrap gap-2.5 items-center justify-between">
          <span className="text-xs text-zinc-400 font-medium">
            Найдено кампаний: <strong className="text-amber-300">{campaigns.length}</strong>
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                onClose();
                onOpenWizard();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Создать (Мастер)</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenAiGenerator();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ИИ Генератор / Импорт JSON</span>
            </button>
          </div>
        </div>

        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="text-center py-16 text-zinc-500 text-xs">
              Загрузка кампаний с диска...
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-xs text-zinc-400">На диске пока нет сохраненных кампаний.</p>
              <button
                onClick={() => {
                  onClose();
                  onOpenWizard();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs"
              >
                Создать первую кампанию
              </button>
            </div>
          ) : (
            campaigns.map((c) => {
              const isActive = c.id === currentCampaignId;
              const dateStr = new Date(c.updatedAt).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={c.id}
                  onClick={() => handleSwitchCampaign(c)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                      : 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900/90 hover:border-zinc-700'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-zinc-100">{c.name}</span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                          Активная
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {c.system}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-amber-400/70" />
                        <span>{c.worldName || 'Свой мир'}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Scroll className="w-3 h-3 text-cyan-400/70" />
                        <span>Квестов: {c.questsCount}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3 text-rose-400/70" />
                        <span>NPC: {c.npcsCount}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-zinc-500" />
                        <span>{dateStr}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end md:self-center">
                    <button
                      onClick={(e) => handleExportJson(c, e)}
                      title="Экспорт JSON файла"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(c.id, e)}
                      disabled={deletingId === c.id}
                      title="Удалить кампанию с диска"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {!isActive && (
                      <button
                        onClick={() => handleSwitchCampaign(c)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-all shadow-sm"
                      >
                        Загрузить
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <span>Все данные синхронизируются в реальном времени на диск сервера.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-all"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
