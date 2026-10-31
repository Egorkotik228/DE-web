'use client';

import React, { useState } from 'react';
import { ERDiagramData, ERTableRole, ERColumnKeyType } from '@/types/course';
import { Layers, ArrowRight, HelpCircle } from 'lucide-react';

interface ERDiagramProps {
  data: ERDiagramData;
}

export const ERDiagram: React.FC<ERDiagramProps> = ({ data }) => {
  const [hoveredColumn, setHoveredColumn] = useState<{
    tableName: string;
    colName: string;
    keyType?: ERColumnKeyType;
    description?: string;
  } | null>(null);

  const getRoleBadge = (role?: ERTableRole) => {
    switch (role) {
      case 'hub':
        return {
          label: 'HUB (БИЗНЕС-КЛЮЧ)',
          border: 'border-[#3B82F6]/60',
          headerBg: 'bg-[#1E3A8A]/30 text-[#93C5FD]',
          bg: 'bg-[#0B1528]',
          glow: 'shadow-[0_0_15px_rgba(59,130,246,0.12)]',
        };
      case 'link':
        return {
          label: 'LINK (СВЯЗЬ / N:M)',
          border: 'border-[#F59E0B]/60',
          headerBg: 'bg-[#78350F]/30 text-[#FCD34D]',
          bg: 'bg-[#1C1306]',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.12)]',
        };
      case 'satellite':
        return {
          label: 'SATELLITE (КОНТЕКСТ / ИСТОРИЯ)',
          border: 'border-[#10B981]/60',
          headerBg: 'bg-[#064E3B]/30 text-[#6EE7B7]',
          bg: 'bg-[#061813]',
          glow: 'shadow-[0_0_15px_rgba(16,185,129,0.12)]',
        };
      case 'dimension':
        return {
          label: 'DIMENSION (ИЗМЕРЕНИЕ)',
          border: 'border-[#8B5CF6]/60',
          headerBg: 'bg-[#4C1D95]/30 text-[#C4B5FD]',
          bg: 'bg-[#130B24]',
          glow: 'shadow-[0_0_15px_rgba(139,92,246,0.12)]',
        };
      case 'fact':
        return {
          label: 'FACT (ТАБЛИЦА ФАКТОВ)',
          border: 'border-[#F97316]/60',
          headerBg: 'bg-[#7C2D12]/30 text-[#FDBA74]',
          bg: 'bg-[#1A0B05]',
          glow: 'shadow-[0_0_15px_rgba(249,115,22,0.12)]',
        };
      default:
        return {
          label: 'TABLE (ТАБЛИЦА)',
          border: 'border-[#21262D]',
          headerBg: 'bg-[#090C10] text-[#E6EDF3]',
          bg: 'bg-[#151B23]',
          glow: '',
        };
    }
  };

  const getKeyBadge = (keyType?: ERColumnKeyType) => {
    switch (keyType) {
      case 'PK':
        return { label: 'PK', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
      case 'FK':
        return { label: 'FK', color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' };
      case 'BK':
        return { label: 'BK', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' };
      case 'HK':
        return { label: 'HK', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
      default:
        return null;
    }
  };

  const getKeyExplanation = (keyType?: ERColumnKeyType, desc?: string) => {
    if (desc) return desc;
    switch (keyType) {
      case 'PK':
        return 'Первичный ключ (Primary Key): гарантирует уникальность каждой физической строки в таблице.';
      case 'FK':
        return 'Внешний ключ (Foreign Key): ссылается на первичный или суррогатный ключ связанной таблицы.';
      case 'BK':
        return 'Бизнес-ключ (Business Key): естественный уникальный идентификатор сущности из внешней системы (ИНН, client_id, vin).';
      case 'HK':
        return 'Хэш-ключ (Hash Key): криптографический детерминированный хэш (SHA-256) от бизнес-ключа для параллельной загрузки.';
      default:
        return 'Описательное поле сущности.';
    }
  };

  return (
    <div className="border border-[#21262D] rounded-xl bg-[#090C10] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>{data.title || 'Реляционная архитектура сущностей (ER Diagram)'}</span>
          </div>
          {data.description && (
            <p className="text-xs text-[#7D8590] leading-relaxed">{data.description}</p>
          )}
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded border border-[#3B82F6]/50 text-[#93C5FD] bg-[#1E3A8A]/20">
            Hub
          </span>
          <span className="px-1.5 py-0.5 rounded border border-[#F59E0B]/50 text-[#FCD34D] bg-[#78350F]/20">
            Link
          </span>
          <span className="px-1.5 py-0.5 rounded border border-[#10B981]/50 text-[#6EE7B7] bg-[#064E3B]/20">
            Satellite
          </span>
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.tables.map((table) => {
          const style = getRoleBadge(table.role);

          return (
            <div
              key={table.name}
              className={`rounded-xl border ${style.border} ${style.bg} ${style.glow} flex flex-col overflow-hidden transition-all duration-200`}
            >
              {/* Table Header */}
              <div className={`px-4 py-2.5 border-b border-[#21262D] flex items-center justify-between ${style.headerBg}`}>
                <div>
                  <h4 className="text-xs font-mono font-bold tracking-tight">{table.name}</h4>
                  {table.comment && (
                    <span className="text-[10px] text-[#7D8590] block leading-tight">{table.comment}</span>
                  )}
                </div>
                <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-black/40 border border-white/10 uppercase">
                  {style.label.split(' ')[0]}
                </span>
              </div>

              {/* Columns */}
              <div className="p-2 space-y-1 divide-y divide-[#21262D]/40">
                {table.columns.map((col) => {
                  const badge = getKeyBadge(col.keyType);
                  const isHovered =
                    hoveredColumn?.tableName === table.name && hoveredColumn?.colName === col.name;

                  return (
                    <div
                      key={col.name}
                      onMouseEnter={() =>
                        setHoveredColumn({
                          tableName: table.name,
                          colName: col.name,
                          keyType: col.keyType,
                          description: col.description,
                        })
                      }
                      onMouseLeave={() => setHoveredColumn(null)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors cursor-help ${
                        isHovered ? 'bg-[#21262D] text-white' : 'hover:bg-[#151B23]/70 text-[#E6EDF3]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {badge ? (
                          <span
                            className={`text-[9px] font-bold px-1 py-0.2 rounded border ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        ) : (
                          <span className="w-5 text-center text-[#7D8590] text-[9px]">•</span>
                        )}
                        <span className="font-medium truncate max-w-[140px]">{col.name}</span>
                      </div>
                      <span className="text-[10px] text-[#7D8590] ml-2 shrink-0">{col.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Relationships Summary */}
      {data.relationships.length > 0 && (
        <div className="pt-4 border-t border-[#21262D] space-y-2">
          <span className="text-[11px] font-mono text-[#7D8590] uppercase tracking-wider block font-semibold">
            Реляционные связи и кардинальность:
          </span>
          <div className="flex flex-wrap gap-2">
            {data.relationships.map((rel, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] text-xs font-mono text-[#E6EDF3]"
              >
                <span className="text-emerald-400 font-bold">{rel.fromTable}.{rel.fromColumn}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#7D8590]" />
                <span className="text-sky-400 font-bold">{rel.toTable}.{rel.toColumn}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/40 border border-[#21262D] text-amber-400 font-semibold ml-1">
                  {rel.cardinality}
                </span>
                {rel.label && <span className="text-[11px] text-[#7D8590] ml-1">({rel.label})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hover Info Tooltip Bar */}
      <div className="min-h-9 px-3 py-2 rounded-lg bg-[#151B23] border border-[#21262D] text-xs flex items-center gap-2 text-[#7D8590]">
        <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        {hoveredColumn ? (
          <div>
            <span className="font-mono text-emerald-400 font-bold mr-2">
              {hoveredColumn.tableName}.{hoveredColumn.colName}:
            </span>
            <span className="text-[#E6EDF3]">
              {getKeyExplanation(hoveredColumn.keyType, hoveredColumn.description)}
            </span>
          </div>
        ) : (
          <span>Наведите курсор на любую колонку таблицы, чтобы увидеть её архитектурную роль и тип ключа.</span>
        )}
      </div>
    </div>
  );
};
