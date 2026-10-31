'use client';

import React, { useState } from 'react';
import { LessonSchemaPreview } from '@/types/course';
import { Database, Table } from 'lucide-react';

interface SchemaPreviewViewerProps {
  schemas: LessonSchemaPreview[];
}

export const SchemaPreviewViewer: React.FC<SchemaPreviewViewerProps> = ({ schemas }) => {
  const [selectedTable, setSelectedTable] = useState<string>(
    schemas[0]?.tableName || ''
  );

  if (!schemas || schemas.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[#7D8590] font-mono">
        Для данного урока схемы таблиц не требуются.
      </div>
    );
  }

  const current = schemas.find((s) => s.tableName === selectedTable) || schemas[0];

  return (
    <div className="w-full h-full flex flex-col bg-[#0D1117] overflow-hidden">
      {/* Table Selector Tabs */}
      <div className="h-10 px-4 border-b border-[#21262D] bg-[#090C10] flex items-center gap-2 overflow-x-auto shrink-0">
        <span className="text-[11px] font-mono text-[#7D8590] uppercase tracking-wider mr-2 flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          Таблицы:
        </span>
        {schemas.map((s) => (
          <button
            key={s.tableName}
            onClick={() => setSelectedTable(s.tableName)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
              s.tableName === current.tableName
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/30'
                : 'text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#151B23]/50'
            }`}
          >
            {s.tableName}
          </button>
        ))}
      </div>

      {/* Main Table Viewer */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-[#21262D]">
        {/* Table Description & Column Meta */}
        <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-[#E6EDF3] flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>{current.tableName}</span>
            </h4>
            <span className="text-[10px] font-mono text-[#7D8590]">{current.columns.length} колонок</span>
          </div>

          {current.description && (
            <p className="text-xs text-[#7D8590] leading-relaxed">{current.description}</p>
          )}

          {/* Columns Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {current.columns.map((col) => (
              <div
                key={col.name}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#090C10] border border-[#21262D] text-[11px] font-mono"
              >
                {col.keyType && (
                  <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold">
                    {col.keyType}
                  </span>
                )}
                <span className="text-[#E6EDF3] font-medium">{col.name}</span>
                <span className="text-[#7D8590] text-[10px]">{col.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sample Data Grid */}
        <div className="bg-[#151B23] border border-[#21262D] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#0D1117] border-b border-[#21262D] text-[11px] font-mono text-[#7D8590] flex items-center justify-between">
            <span>Первые 5 строк датасета</span>
            <span>{current.sampleRows.length} записей</span>
          </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#21262D] text-[#7D8590]">
                  {current.columns.map((c) => (
                    <th key={c.name} className="pb-2 pr-4 font-semibold text-[11px]">
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {current.sampleRows.slice(0, 5).map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-[#21262D]/40 hover:bg-[#21262D]/30 transition-colors"
                  >
                    {current.columns.map((c) => (
                      <td key={c.name} className="py-2 pr-4 text-[#E6EDF3] whitespace-nowrap">
                        {row[c.name] === null ? (
                          <span className="text-amber-500/70 italic">NULL</span>
                        ) : (
                          String(row[c.name] ?? '')
                        )}
                      </td>
                    ))}
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
