'use client';

import React from 'react';
import { BeforeAfterTableData } from '@/types/course';
import { Table, Sparkles } from 'lucide-react';

interface BeforeAfterTableProps {
  data: BeforeAfterTableData;
}

export const BeforeAfterTable: React.FC<BeforeAfterTableProps> = ({ data }) => {
  const isHighlighted = (rowIdx: number, colIdx: number) => {
    return (
      data.highlightDiffIndices?.some(
        (h) => h.row === rowIdx && h.col === colIdx
      ) ?? false
    );
  };

  return (
    <div className="border border-[#21262D] rounded-xl bg-[#090C10] p-6 space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
          <Table className="w-4 h-4" />
          <span>{data.title || 'Сравнение состояния данных: ДО и ПОСЛЕ'}</span>
        </div>
        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Трансформация
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Таблица ДО */}
        <div className="bg-[#151B23] border border-[#21262D] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-[#0D1117] border-b border-[#21262D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300">Исходные данные (ДО)</span>
            </div>
            <span className="text-[10px] font-mono text-[#7D8590]">{data.beforeRows.length} строк</span>
          </div>

          <p className="px-4 py-2 text-xs text-[#7D8590] bg-[#151B23] border-b border-[#21262D]/60 leading-snug">
            {data.beforeDescription}
          </p>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#21262D] text-[#7D8590]">
                  {data.beforeColumns.map((col) => (
                    <th key={col} className="pb-2 pr-3 font-semibold text-[11px]">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.beforeRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-[#21262D]/40 hover:bg-[#21262D]/30 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 pr-3 text-[#E6EDF3]">
                        {cell === null ? (
                          <span className="text-amber-500/70 italic">NULL</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Таблица ПОСЛЕ */}
        <div className="bg-[#151B23] border border-emerald-500/40 rounded-xl overflow-hidden flex flex-col shadow-[0_0_20px_rgba(16,185,129,0.08)]">
          <div className="px-4 py-3 bg-[#061813] border-b border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-400">Результат трансформации (ПОСЛЕ)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/80">{data.afterRows.length} строк</span>
          </div>

          <p className="px-4 py-2 text-xs text-[#7D8590] bg-[#151B23] border-b border-[#21262D]/60 leading-snug">
            {data.afterDescription}
          </p>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-emerald-500/20 text-[#7D8590]">
                  {data.afterColumns.map((col) => (
                    <th key={col} className="pb-2 pr-3 font-semibold text-[11px] text-emerald-400/90">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.afterRows.map((row, rIdx) => (
                  <tr key={rIdx} className="border-b border-[#21262D]/40 hover:bg-emerald-950/20 transition-colors">
                    {row.map((cell, cIdx) => {
                      const highlighted = isHighlighted(rIdx, cIdx);
                      return (
                        <td
                          key={cIdx}
                          className={`py-2 pr-3 transition-colors ${
                            highlighted
                              ? 'text-emerald-300 font-bold bg-emerald-500/15 rounded'
                              : 'text-[#E6EDF3]'
                          }`}
                        >
                          {cell === null ? (
                            <span className="text-amber-500/70 italic">NULL</span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
