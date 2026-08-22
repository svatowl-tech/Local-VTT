import React, { useState } from 'react';
import {
  FileText,
  Tag,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  X,
  Code2,
  BookOpen,
  Shield,
  Heart,
  Zap,
  Sword,
  Sparkles,
  Table,
} from 'lucide-react';
import { SystemDataItem } from '../../types/systemDataTypes';

interface Props {
  item: SystemDataItem | null;
  onClose: () => void;
}

export const SystemItemPreviewModal: React.FC<Props> = ({ item, onClose }) => {
  const [viewRawJson, setViewRawJson] = useState<boolean>(false);

  if (!item) return null;

  const formattedDate = item.mtime
    ? new Date(item.mtime).toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const stats = item.data?.stats || {};
  const actions = item.data?.actions || [];
  const traits = item.data?.traits || [];
  const tableData = item.data?.tableData || (item.data?.headers && item.data?.rows ? item.data : null);

  return (
    <div
      id="system-item-preview-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="system-item-preview-modal-container"
        className="bg-zinc-950 border border-zinc-800 w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-zinc-100 truncate">{item.name}</h3>
              <p className="text-[11px] text-zinc-400 font-mono truncate">{item.relativePath}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewRawJson(!viewRawJson)}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                viewRawJson
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{viewRawJson ? 'Сводка' : 'JSON / Raw'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-semibold rounded-md border border-amber-500/30">
              {item.category.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 font-mono rounded-md border border-zinc-800">
              Формат: .{item.format}
            </span>
            {item.source && (
              <span className="px-2 py-0.5 bg-zinc-900 text-amber-400/90 font-medium rounded-md border border-zinc-800">
                Источник: {item.source}
              </span>
            )}
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 font-mono rounded-md border border-zinc-800">
              Размер: {(item.fileSize / 1024).toFixed(1)} КБ
            </span>
            <span className="px-2 py-0.5 bg-zinc-900 text-zinc-400 font-mono rounded-md border border-zinc-800">
              {formattedDate}
            </span>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <Tag className="w-3 h-3 text-zinc-500 mr-1" />
              {item.tags.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-zinc-900 text-zinc-300 rounded-md text-[10px] border border-zinc-800"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Content View */}
          {viewRawJson ? (
            <pre className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl font-mono text-[11px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(item.data || item, null, 2)}
            </pre>
          ) : (
            <div className="space-y-4">
              {/* Primary Monster / Character Attributes Badges */}
              {(item.data?.hp || item.data?.ac || item.data?.cr || item.data?.speed || item.data?.level) && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {item.data.hp && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-rose-300/70 font-mono">Здоровье (HP)</div>
                        <div className="font-bold text-rose-200 text-xs">
                          {typeof item.data.hp === 'object' ? item.data.hp.average || item.data.hp.value || JSON.stringify(item.data.hp) : item.data.hp}
                        </div>
                      </div>
                    </div>
                  )}

                  {item.data.ac && (
                    <div className="p-2.5 bg-blue-950/20 border border-blue-900/40 rounded-xl flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-blue-300/70 font-mono">Класс брони (AC)</div>
                        <div className="font-bold text-blue-200 text-xs">
                          {typeof item.data.ac === 'object' ? item.data.ac.value || item.data.ac[0] || JSON.stringify(item.data.ac) : item.data.ac}
                        </div>
                      </div>
                    </div>
                  )}

                  {item.data.cr && (
                    <div className="p-2.5 bg-amber-950/20 border border-amber-900/40 rounded-xl flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-amber-300/70 font-mono">Опасность (CR)</div>
                        <div className="font-bold text-amber-200 text-xs">{item.data.cr}</div>
                      </div>
                    </div>
                  )}

                  {item.data.speed && (
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-emerald-300/70 font-mono">Скорость</div>
                        <div className="font-bold text-emerald-200 text-xs">
                          {typeof item.data.speed === 'object' ? JSON.stringify(item.data.speed) : item.data.speed}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* D&D / Pathfinder Ability Scores (STR, DEX, CON, INT, WIS, CHA) */}
              {stats.str !== undefined && (
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5">
                  <div className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Характеристики</div>
                  <div className="grid grid-cols-6 gap-1 text-center font-mono">
                    {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((attr) => (
                      <div key={attr} className="p-1.5 bg-zinc-950/80 border border-zinc-800 rounded-lg">
                        <div className="text-[9px] text-amber-400 uppercase font-bold">{attr}</div>
                        <div className="text-xs font-bold text-zinc-100">{stats[attr] ?? '—'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Data view if CSV / Rolltable */}
              {tableData && tableData.headers && tableData.rows && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-1.5 text-amber-400 font-semibold text-xs">
                    <Table className="w-3.5 h-3.5" />
                    <span>Таблица данных ({tableData.rows.length} строк)</span>
                  </div>
                  <div className="overflow-x-auto border border-zinc-800 rounded-xl">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-zinc-900/80 text-zinc-400 border-b border-zinc-800">
                        <tr>
                          {tableData.headers.map((h: string, idx: number) => (
                            <th key={idx} className="px-3 py-2 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                        {tableData.rows.slice(0, 30).map((row: string[], rIdx: number) => (
                          <tr key={rIdx} className="hover:bg-zinc-900/40">
                            {row.map((cell: string, cIdx: number) => (
                              <td key={cIdx} className="px-3 py-1.5 text-zinc-300">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Description / Summary text */}
              {(item.data?.description || item.summary || item.data?.content) && (
                <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl space-y-1.5">
                  <h4 className="font-semibold text-zinc-300 text-xs">Описание / Правило</h4>
                  <div className="text-zinc-300 leading-relaxed whitespace-pre-line text-[11px]">
                    {item.data?.description || item.summary || item.data?.content}
                  </div>
                </div>
              )}

              {/* Traits / Features */}
              {Array.isArray(traits) && traits.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-purple-400 text-xs flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Особенности и черты</span>
                  </h4>
                  <div className="space-y-2">
                    {traits.map((tr: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1"
                      >
                        <div className="font-bold text-zinc-100">{tr.name}</div>
                        <p className="text-zinc-400 text-[11px]">
                          {Array.isArray(tr.entries) ? tr.entries.join('\n') : tr.description || JSON.stringify(tr)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions / Attacks */}
              {Array.isArray(actions) && actions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-amber-400 text-xs flex items-center space-x-1.5">
                    <Sword className="w-3.5 h-3.5" />
                    <span>Действия и Атаки</span>
                  </h4>
                  <div className="space-y-2">
                    {actions.map((act: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-zinc-900/70 border border-zinc-800/80 rounded-xl space-y-1"
                      >
                        <div className="font-bold text-zinc-100">{act.name}</div>
                        <p className="text-zinc-400 text-[11px]">
                          {Array.isArray(act.entries) ? act.entries.join('\n') : act.description || JSON.stringify(act)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
