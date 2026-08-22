import React, { useState } from 'react';
import { Table as TableIcon, Dices, Sparkles, Check, Pin } from 'lucide-react';
import { SystemReferenceSearchItem } from '../../../services/rustSystemSearchService';
import { playUniversalSfx } from '../../../utils/sfxAudio';

interface Props {
  item: SystemReferenceSearchItem;
  onRollDice?: (expression: string, label: string) => void;
  onPlaceOnCanvas?: (item: SystemReferenceSearchItem) => void;
}

export const TableCardView: React.FC<Props> = ({ item, onRollDice, onPlaceOnCanvas }) => {
  const tableData = item.tableData || item.data?.tableData || item.data;
  const headers = tableData?.headers || ['d20', 'Результат'];
  const rows: string[][] = tableData?.rows || [];
  const formula = tableData?.formula || `1d${rows.length || 20}`;

  const [rolledIndex, setRolledIndex] = useState<number | null>(null);
  const [rolledResultText, setRolledResultText] = useState<string | null>(null);

  const handleRollTable = () => {
    if (rows.length === 0) return;
    playUniversalSfx('dice_roll');

    const randIdx = Math.floor(Math.random() * rows.length);
    const selectedRow = rows[randIdx];
    const resultStr = selectedRow.join(' — ');

    setRolledIndex(randIdx);
    setRolledResultText(resultStr);

    if (onRollDice) {
      onRollDice(formula, `${item.name}: ${resultStr}`);
    }
  };

  return (
    <div id={`table-card-${item.id}`} className="space-y-4 text-xs select-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 gap-2">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-emerald-400 leading-tight">{item.name}</h2>
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold rounded-md text-[10px]">
              Таблица ({formula})
            </span>
          </div>
          {item.summary && <p className="text-[11px] text-zinc-400 mt-0.5">{item.summary}</p>}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {onPlaceOnCanvas && (
            <button
              onClick={() => {
                playUniversalSfx('success');
                onPlaceOnCanvas(item);
              }}
              className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shadow-xs"
              title="Поместить таблицу прямо на рабочий стол карты"
            >
              <Pin className="w-3.5 h-3.5" />
              <span className="text-[11px]">На стол</span>
            </button>
          )}

          <button
            onClick={handleRollTable}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 shadow-md"
          >
            <Dices className="w-4 h-4" />
            <span>Бросить ({formula})</span>
          </button>
        </div>
      </div>

      {/* Rolled Result Banner */}
      {rolledResultText && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center justify-between animate-fade-in">
          <div className="space-y-0.5">
            <div className="text-[10px] text-emerald-400 uppercase font-bold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Выпавший результат:</span>
            </div>
            <div className="text-xs font-semibold text-emerald-100">{rolledResultText}</div>
          </div>
        </div>
      )}

      {/* Table grid */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-semibold text-zinc-300">
              {headers.map((h: string, idx: number) => (
                <th key={idx} className="px-3 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {rows.map((row: string[], rIdx: number) => {
              const isSelected = rolledIndex === rIdx;
              return (
                <tr
                  key={rIdx}
                  onClick={() => {
                    setRolledIndex(rIdx);
                    setRolledResultText(row.join(' — '));
                  }}
                  className={`transition-colors cursor-pointer text-[11px] ${
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-100 font-semibold'
                      : 'hover:bg-zinc-800/40 text-zinc-300'
                  }`}
                >
                  {row.map((cell: string, cIdx: number) => (
                    <td key={cIdx} className="px-3 py-2">
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
