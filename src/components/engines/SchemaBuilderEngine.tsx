'use client';

import React, { useState } from 'react';
import { Lesson, WorkerResponse } from '@/types/course';
import { DynamicMonaco } from '@/components/editor/DynamicMonaco';
import { OutputConsole } from '@/components/editor/OutputConsole';
import { workerManager } from '@/lib/workerManager';
import {
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Layers,
  Link as LinkIcon,
  ArrowRight,
  Play,
} from 'lucide-react';

let schemaIdCounter = 0;
function nextSchemaId(prefix: string): string {
  schemaIdCounter += 1;
  return `${prefix}_${schemaIdCounter}`;
}

export type TableStereotype =
  // Data Vault 2.0
  | 'Hub'
  | 'Link'
  | 'Satellite'
  | 'Same-As Link'
  | 'Effectivity Sat'
  | 'PIT'
  | 'Bridge'
  // Dimensional DWH
  | 'Fact (Transactional)'
  | 'Fact (Snapshot)'
  | 'Dim (SCD1)'
  | 'Dim (SCD2)';

export type ColumnRole = 'PK' | 'FK' | 'BK' | 'HK' | 'HashDiff' | 'Metadata' | 'Attribute';

export interface CanvasColumn {
  id: string;
  name: string;
  dataType: string;
  role: ColumnRole;
}

export interface CanvasTable {
  id: string;
  name: string;
  stereotype: TableStereotype;
  columns: CanvasColumn[];
  x: number;
  y: number;
}

export interface CanvasRelationship {
  id: string;
  fromTableId: string;
  toTableId: string;
  type: '1:1' | '1:N' | 'M:N';
}

const STEREOTYPE_COLORS: Record<TableStereotype, { bg: string; border: string; text: string; badge: string }> = {
  Hub: { bg: 'bg-blue-950/40', border: 'border-blue-500/50', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  Link: { bg: 'bg-amber-950/40', border: 'border-amber-500/50', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  Satellite: { bg: 'bg-emerald-950/40', border: 'border-emerald-500/50', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  'Same-As Link': { bg: 'bg-orange-950/40', border: 'border-orange-500/50', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300' },
  'Effectivity Sat': { bg: 'bg-teal-950/40', border: 'border-teal-500/50', text: 'text-teal-400', badge: 'bg-teal-500/20 text-teal-300' },
  PIT: { bg: 'bg-purple-950/40', border: 'border-purple-500/50', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300' },
  Bridge: { bg: 'bg-indigo-950/40', border: 'border-indigo-500/50', text: 'text-indigo-400', badge: 'bg-indigo-500/20 text-indigo-300' },
  'Fact (Transactional)': { bg: 'bg-rose-950/40', border: 'border-rose-500/50', text: 'text-rose-400', badge: 'bg-rose-500/20 text-rose-300' },
  'Fact (Snapshot)': { bg: 'bg-pink-950/40', border: 'border-pink-500/50', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300' },
  'Dim (SCD1)': { bg: 'bg-cyan-950/40', border: 'border-cyan-500/50', text: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-300' },
  'Dim (SCD2)': { bg: 'bg-emerald-950/40', border: 'border-emerald-500/50', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
};

const INITIAL_SOURCE_ATTRIBUTES = [
  { name: 'order_id', dataType: 'BIGINT', defaultRole: 'BK' as ColumnRole },
  { name: 'customer_inn', dataType: 'VARCHAR(12)', defaultRole: 'BK' as ColumnRole },
  { name: 'customer_name', dataType: 'VARCHAR(255)', defaultRole: 'Attribute' as ColumnRole },
  { name: 'customer_phone', dataType: 'VARCHAR(30)', defaultRole: 'Attribute' as ColumnRole },
  { name: 'product_sku', dataType: 'VARCHAR(64)', defaultRole: 'BK' as ColumnRole },
  { name: 'order_date', dataType: 'TIMESTAMP', defaultRole: 'Attribute' as ColumnRole },
  { name: 'price', dataType: 'NUMERIC(12,2)', defaultRole: 'Attribute' as ColumnRole },
  { name: 'quantity', dataType: 'INT', defaultRole: 'Attribute' as ColumnRole },
  { name: 'hk_order_h', dataType: 'CHAR(32)', defaultRole: 'HK' as ColumnRole },
  { name: 'hk_customer_h', dataType: 'CHAR(32)', defaultRole: 'HK' as ColumnRole },
  { name: 'hk_order_customer_l', dataType: 'CHAR(32)', defaultRole: 'HK' as ColumnRole },
  { name: 'hash_diff', dataType: 'CHAR(32)', defaultRole: 'HashDiff' as ColumnRole },
  { name: 'load_dts', dataType: 'TIMESTAMP', defaultRole: 'Metadata' as ColumnRole },
  { name: 'record_source', dataType: 'VARCHAR(32)', defaultRole: 'Metadata' as ColumnRole },
  { name: 'effective_from', dataType: 'TIMESTAMP', defaultRole: 'Metadata' as ColumnRole },
  { name: 'effective_to', dataType: 'TIMESTAMP', defaultRole: 'Metadata' as ColumnRole },
  { name: 'is_current', dataType: 'BOOLEAN', defaultRole: 'Metadata' as ColumnRole },
];

interface SchemaBuilderEngineProps {
  lesson: Lesson;
  isBrokenProdMode: boolean;
  onLessonPassed: () => void;
}

export function SchemaBuilderEngine({
  lesson,
  isBrokenProdMode,
  onLessonPassed,
}: SchemaBuilderEngineProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'sql'>('visual');

  // Interactive Schema State
  const [tables, setTables] = useState<CanvasTable[]>([
    {
      id: 'tbl_1',
      name: 'Hub_Customer',
      stereotype: 'Hub',
      x: 30,
      y: 40,
      columns: [
        { id: 'c1', name: 'hk_customer_h', dataType: 'CHAR(32)', role: 'HK' },
        { id: 'c2', name: 'customer_inn', dataType: 'VARCHAR(12)', role: 'BK' },
        { id: 'c3', name: 'load_dts', dataType: 'TIMESTAMP', role: 'Metadata' },
        { id: 'c4', name: 'record_source', dataType: 'VARCHAR(32)', role: 'Metadata' },
      ],
    },
  ]);

  const [relationships, setRelationships] = useState<CanvasRelationship[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<string>('tbl_1');

  // New Table modal / input
  const [newTableName, setNewTableName] = useState('');
  const [newTableStereotype, setNewTableStereotype] = useState<TableStereotype>('Satellite');

  // Verification Results
  const [validationResult, setValidationResult] = useState<{
    passed: boolean;
    issues: string[];
    praises: string[];
  } | null>(null);

  // SQL Script Tab State
  const [sqlCode, setSqlCode] = useState<string>(
    lesson.initialCode ||
      `-- Напишите SQL ETL скрипт наполнения спроектированного Hub_Customer:\nINSERT INTO hub_customer (hk_customer_h, customer_inn, load_dts, record_source)\nSELECT \n    UPPER(HEX(MD5(TRIM(inn)))) AS hk_customer_h,\n    TRIM(inn) AS customer_inn,\n    CURRENT_TIMESTAMP AS load_dts,\n    'CRM_POSTGRES' AS record_source\nFROM stage_customers\nWHERE inn IS NOT NULL;`
  );
  const [sqlResponse, setSqlResponse] = useState<WorkerResponse | null>(null);
  const [isSqlRunning, setIsSqlRunning] = useState(false);

  // Add Table to Canvas
  const handleAddTable = () => {
    if (!newTableName.trim()) return;
    const cleanName = newTableName.trim().replace(/\s+/g, '_');
    const newId = nextSchemaId('tbl');

    // Auto-generate standard fields based on stereotype
    const defaultCols: CanvasColumn[] = [];
    if (newTableStereotype === 'Hub') {
      defaultCols.push(
        { id: `${newId}_hk`, name: `hk_${cleanName.toLowerCase()}_h`, dataType: 'CHAR(32)', role: 'HK' },
        { id: `${newId}_bk`, name: `${cleanName.toLowerCase()}_code`, dataType: 'VARCHAR(64)', role: 'BK' },
        { id: `${newId}_dts`, name: 'load_dts', dataType: 'TIMESTAMP', role: 'Metadata' },
        { id: `${newId}_src`, name: 'record_source', dataType: 'VARCHAR(32)', role: 'Metadata' }
      );
    } else if (newTableStereotype === 'Satellite') {
      defaultCols.push(
        { id: `${newId}_hk`, name: `hk_parent_h`, dataType: 'CHAR(32)', role: 'HK' },
        { id: `${newId}_dts`, name: 'load_dts', dataType: 'TIMESTAMP', role: 'Metadata' },
        { id: `${newId}_hd`, name: 'hash_diff', dataType: 'CHAR(32)', role: 'HashDiff' },
        { id: `${newId}_src`, name: 'record_source', dataType: 'VARCHAR(32)', role: 'Metadata' }
      );
    } else if (newTableStereotype === 'Link') {
      defaultCols.push(
        { id: `${newId}_lhk`, name: `hk_${cleanName.toLowerCase()}_l`, dataType: 'CHAR(32)', role: 'HK' },
        { id: `${newId}_h1`, name: `hk_entity_a_h`, dataType: 'CHAR(32)', role: 'FK' },
        { id: `${newId}_h2`, name: `hk_entity_b_h`, dataType: 'CHAR(32)', role: 'FK' },
        { id: `${newId}_dts`, name: 'load_dts', dataType: 'TIMESTAMP', role: 'Metadata' },
        { id: `${newId}_src`, name: 'record_source', dataType: 'VARCHAR(32)', role: 'Metadata' }
      );
    } else if (newTableStereotype === 'Dim (SCD2)') {
      defaultCols.push(
        { id: `${newId}_id`, name: `${cleanName.toLowerCase()}_sk`, dataType: 'BIGINT', role: 'PK' },
        { id: `${newId}_bk`, name: `${cleanName.toLowerCase()}_id`, dataType: 'VARCHAR(64)', role: 'BK' },
        { id: `${newId}_ef`, name: 'effective_from', dataType: 'TIMESTAMP', role: 'Metadata' },
        { id: `${newId}_et`, name: 'effective_to', dataType: 'TIMESTAMP', role: 'Metadata' },
        { id: `${newId}_cur`, name: 'is_current', dataType: 'BOOLEAN', role: 'Metadata' }
      );
    }

    const newTable: CanvasTable = {
      id: newId,
      name: cleanName,
      stereotype: newTableStereotype,
      x: 50 + (tables.length % 3) * 200,
      y: 50 + Math.floor(tables.length / 3) * 150,
      columns: defaultCols,
    };

    setTables([...tables, newTable]);
    setSelectedTableId(newId);
    setNewTableName('');
  };

  // Add attribute to selected table
  const handleAddAttribute = (attr: typeof INITIAL_SOURCE_ATTRIBUTES[0]) => {
    if (!selectedTableId) return;
    setTables(
      tables.map((t) => {
        if (t.id !== selectedTableId) return t;
        const exists = t.columns.some((c) => c.name === attr.name);
        if (exists) return t;
        const newCol: CanvasColumn = {
          id: nextSchemaId('col'),
          name: attr.name,
          dataType: attr.dataType,
          role: attr.defaultRole,
        };
        return { ...t, columns: [...t.columns, newCol] };
      })
    );
  };

  // Remove column from table
  const handleRemoveColumn = (tableId: string, colId: string) => {
    setTables(
      tables.map((t) =>
        t.id === tableId ? { ...t, columns: t.columns.filter((c) => c.id !== colId) } : t
      )
    );
  };

  // Delete table
  const handleDeleteTable = (tableId: string) => {
    setTables(tables.filter((t) => t.id !== tableId));
    setRelationships(relationships.filter((r) => r.fromTableId !== tableId && r.toTableId !== tableId));
    if (selectedTableId === tableId) setSelectedTableId(tables[0]?.id || '');
  };

  // Change column role
  const handleChangeRole = (tableId: string, colId: string, role: ColumnRole) => {
    setTables(
      tables.map((t) => {
        if (t.id !== tableId) return t;
        return {
          ...t,
          columns: t.columns.map((c) => (c.id === colId ? { ...c, role } : c)),
        };
      })
    );
  };

  // Add Relationship
  const handleAddRelationship = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const exists = relationships.some(
      (r) =>
        (r.fromTableId === fromId && r.toTableId === toId) ||
        (r.fromTableId === toId && r.toTableId === fromId)
    );
    if (exists) return;
    setRelationships([
      ...relationships,
      { id: nextSchemaId('rel'), fromTableId: fromId, toTableId: toId, type: '1:N' },
    ]);
  };

  // Validate Architecture
  const handleValidateArchitecture = () => {
    const issues: string[] = [];
    const praises: string[] = [];

    if (tables.length === 0) {
      issues.push('На холсте нет ни одной спроектированной таблицы.');
      setValidationResult({ passed: false, issues, praises });
      return;
    }

    // Rule 1: Check Data Vault Hub constraints
    const hubs = tables.filter((t) => t.stereotype === 'Hub');
    hubs.forEach((h) => {
      const hasBK = h.columns.some((c) => c.role === 'BK');
      const hasHK = h.columns.some((c) => c.role === 'HK');
      const hasDts = h.columns.some((c) => c.name.toLowerCase().includes('dts') || c.name.toLowerCase().includes('date'));
      const hasSrc = h.columns.some((c) => c.name.toLowerCase().includes('source') || c.name.toLowerCase().includes('src'));

      if (!hasHK) issues.push(`В таблице «${h.name}» (Hub) отсутствует суррогатный хэш-ключ (HK, Hash Key).`);
      if (!hasBK) issues.push(`В таблице «${h.name}» (Hub) отсутствует бизнес-ключ (BK, Business Key).`);
      if (!hasDts || !hasSrc) issues.push(`В таблице «${h.name}» (Hub) отсутствуют обязательные метаданные аудита (load_dts и record_source).`);

      // Prohibited: descriptive attributes in Hub!
      const descriptive = h.columns.filter((c) => c.role === 'Attribute');
      if (descriptive.length > 0) {
        const names = descriptive.map((c) => `«${c.name}»`).join(', ');
        issues.push(
          `Ошибка Data Vault: в таблице «${h.name}» (Hub) не может быть описательных полей (${names})! Вынесите их в Satellite.`
        );
      } else if (hasBK && hasHK) {
        praises.push(`Таблица «${h.name}» строго соблюдает стандарт канонического Хаба (нет описательных полей, есть BK, HK и метаданные).`);
      }
    });

    // Rule 2: Check Satellites
    const sats = tables.filter((t) => t.stereotype === 'Satellite' || t.stereotype === 'Effectivity Sat');
    sats.forEach((s) => {
      const hasHK = s.columns.some((c) => c.role === 'HK');
      const hasHashDiff = s.columns.some((c) => c.role === 'HashDiff' || c.name.toLowerCase().includes('diff'));
      const descCount = s.columns.filter((c) => c.role === 'Attribute').length;

      if (!hasHK) issues.push(`В таблице «${s.name}» (Satellite) отсутствует родительский ключ (HK) для связи с Hub/Link.`);
      if (!hasHashDiff) issues.push(`В таблице «${s.name}» (Satellite) отсутствует колонка «hash_diff» для быстрой детекции изменений в ETL.`);
      if (descCount === 0 && s.stereotype === 'Satellite') {
        issues.push(`В Сателлите «${s.name}» нет описательных атрибутов. Добавьте поля состояния сущности.`);
      } else {
        praises.push(`Сателлит «${s.name}» содержит ${descCount} описательных полей и поле HashDiff для контроля историчности.`);
      }
    });

    // Rule 3: Direct Hub to Hub without Link
    relationships.forEach((rel) => {
      const tA = tables.find((t) => t.id === rel.fromTableId);
      const tB = tables.find((t) => t.id === rel.toTableId);
      if (tA && tB && tA.stereotype === 'Hub' && tB.stereotype === 'Hub') {
        issues.push(
          `Грубая архитектурная ошибка Data Vault: Хабы «${tA.name}» и «${tB.name}» соединены напрямую! В Data Vault 2.0 связь между хабами обязана происходить через промежуточную таблицу Link.`
        );
      }
    });

    // Rule 4: DWH Dimensional Checks
    const dimScd2 = tables.filter((t) => t.stereotype === 'Dim (SCD2)');
    dimScd2.forEach((dim) => {
      const hasEffectiveFrom = dim.columns.some((c) => c.name.toLowerCase().includes('from'));
      const hasEffectiveTo = dim.columns.some((c) => c.name.toLowerCase().includes('to'));
      if (!hasEffectiveFrom || !hasEffectiveTo) {
        issues.push(`Таблица «${dim.name}» (Dim SCD2) обязана содержать временные интервалы версионности (effective_from, effective_to).`);
      } else {
        praises.push(`Измерение «${dim.name}» корректно отслеживает версионность SCD Type 2.`);
      }
    });

    const passed = issues.length === 0;
    setValidationResult({ passed, issues, praises });

    if (passed) {
      onLessonPassed();
    }
  };

  // Run SQL Script
  const handleRunSql = async () => {
    setIsSqlRunning(true);
    try {
      const res = await workerManager.execute('sql', 'RUN', lesson.seedCode, sqlCode);
      setSqlResponse(res);
    } catch {
      setSqlResponse({
        requestId: 'err',
        status: 'ERROR',
        executionTimeMs: 0,
        columns: ['error'],
        rows: [['Ошибка запуска SQL']],
      });
    } finally {
      setIsSqlRunning(false);
    }
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId);

  return (
    <div className="h-full flex flex-col bg-[#0D1117] text-[#E6EDF3] overflow-hidden select-none">
      {/* Top Engine Tabs */}
      <div className="h-11 px-4 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
              activeTab === 'visual'
                ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/30'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>[📐 Интерактивный холст моделирования]</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors ${
              activeTab === 'sql'
                ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/30'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>[💻 SQL-скрипт загрузки]</span>
          </button>

          {isBrokenProdMode && (
            <span className="px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-[10px] text-red-300 font-bold animate-pulse">
              🔥 Авария в схеме
            </span>
          )}
        </div>

        {activeTab === 'visual' ? (
          <button
            onClick={handleValidateArchitecture}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Проверить архитектуру</span>
          </button>
        ) : (
          <button
            onClick={handleRunSql}
            disabled={isSqlRunning}
            className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Запустить SQL</span>
          </button>
        )}
      </div>

      {activeTab === 'visual' ? (
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Main Workspace: Canvas & Tables */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-[#21262D]">
            {/* Top Bar: Attribute Pool */}
            <div className="p-3 border-b border-[#21262D] bg-[#151B23]/70">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-[#7D8590] uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-emerald-400" />
                  Пул атрибутов источника (кликните, чтобы добавить в «{selectedTable?.name || 'выбранную таблицу'}»):
                </span>
                <span className="text-[10px] text-[#7D8590]">Всего атрибутов: {INITIAL_SOURCE_ATTRIBUTES.length}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {INITIAL_SOURCE_ATTRIBUTES.map((attr) => (
                  <button
                    key={attr.name}
                    onClick={() => handleAddAttribute(attr)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#0D1117] border border-[#21262D] hover:border-emerald-500/50 hover:text-emerald-300 text-xs font-mono text-[#E6EDF3] transition-colors"
                    title={`Тип: ${attr.dataType}, Роль: ${attr.defaultRole}`}
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>{attr.name}</span>
                    <span className="text-[9px] text-[#7D8590] ml-0.5">({attr.dataType})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Area with Tables */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#090C10]/50">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {tables.map((tbl) => {
                  const style = STEREOTYPE_COLORS[tbl.stereotype];
                  const isSelected = selectedTableId === tbl.id;

                  return (
                    <div
                      key={tbl.id}
                      onClick={() => setSelectedTableId(tbl.id)}
                      className={`rounded-xl border transition-all cursor-pointer flex flex-col ${
                        isSelected
                          ? 'border-emerald-500 ring-1 ring-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] bg-[#151B23]'
                          : `${style.border} ${style.bg} hover:border-[#30363D]`
                      }`}
                    >
                      {/* Table Header */}
                      <div className="p-3 border-b border-[#21262D] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className={`w-4 h-4 ${style.text}`} />
                          <span className="font-mono text-xs font-bold text-[#E6EDF3]">{tbl.name}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${style.badge}`}>
                            {tbl.stereotype}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTable(tbl.id);
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#7D8590] hover:text-red-400 hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Columns List */}
                      <div className="p-2 space-y-1 flex-1">
                        {tbl.columns.length === 0 ? (
                          <div className="p-4 text-center text-xs text-[#7D8590] font-mono">
                            Таблица пуста. Выберите атрибуты из пула сверху.
                          </div>
                        ) : (
                          tbl.columns.map((col) => (
                            <div
                              key={col.id}
                              className="flex items-center justify-between px-2 py-1 rounded bg-[#0D1117] border border-[#21262D]/60 hover:border-[#30363D] text-xs font-mono"
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span
                                  className={`px-1 rounded text-[9px] font-bold ${
                                    col.role === 'PK'
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : col.role === 'HK'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : col.role === 'BK'
                                      ? 'bg-purple-500/20 text-purple-300'
                                      : col.role === 'HashDiff'
                                      ? 'bg-rose-500/20 text-rose-300'
                                      : 'bg-[#21262D] text-[#7D8590]'
                                  }`}
                                >
                                  {col.role}
                                </span>
                                <span className="text-[#E6EDF3] truncate">{col.name}</span>
                                <span className="text-[10px] text-[#7D8590]">{col.dataType}</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <select
                                  value={col.role}
                                  onChange={(e) => handleChangeRole(tbl.id, col.id, e.target.value as ColumnRole)}
                                  className="bg-[#151B23] border border-[#21262D] rounded text-[10px] font-mono text-[#7D8590] px-1 py-0.5 focus:outline-none"
                                >
                                  <option value="Attribute">Attr</option>
                                  <option value="BK">BK</option>
                                  <option value="HK">HK</option>
                                  <option value="PK">PK</option>
                                  <option value="FK">FK</option>
                                  <option value="HashDiff">HDiff</option>
                                  <option value="Metadata">Meta</option>
                                </select>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveColumn(tbl.id, col.id);
                                  }}
                                  className="text-[#7D8590] hover:text-red-400 p-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Connect Button */}
                      <div className="p-2 border-t border-[#21262D] bg-[#0D1117]/40 flex items-center justify-between text-[11px] text-[#7D8590]">
                        <span>Связать с:</span>
                        <div className="flex items-center gap-1">
                          {tables
                            .filter((other) => other.id !== tbl.id)
                            .map((other) => (
                              <button
                                key={other.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddRelationship(tbl.id, other.id);
                                }}
                                className="px-1.5 py-0.5 rounded bg-[#151B23] border border-[#21262D] hover:border-emerald-500 text-[10px] font-mono text-[#E6EDF3]"
                              >
                                + {other.name}
                              </button>
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Relationships view */}
              {relationships.length > 0 && (
                <div className="mt-4 p-3 rounded-lg border border-[#21262D] bg-[#151B23]/40">
                  <span className="text-xs font-mono font-bold text-[#7D8590] uppercase tracking-wider block mb-2">
                    Активные связи в архитектуре:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {relationships.map((rel) => {
                      const from = tables.find((t) => t.id === rel.fromTableId);
                      const to = tables.find((t) => t.id === rel.toTableId);
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0D1117] border border-[#21262D] text-xs font-mono"
                        >
                          <LinkIcon className="w-3 h-3 text-emerald-400" />
                          <span className="text-blue-400">{from?.name}</span>
                          <span className="text-[#7D8590]">({rel.type})</span>
                          <ArrowRight className="w-3 h-3 text-[#7D8590]" />
                          <span className="text-amber-400">{to?.name}</span>
                          <button
                            onClick={() => setRelationships(relationships.filter((r) => r.id !== rel.id))}
                            className="text-[#7D8590] hover:text-red-400 ml-1"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side Panel: Table Creator & Validation Result */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col bg-[#151B23] overflow-y-auto p-4 space-y-4">
            {/* Create Table Form */}
            <div className="p-3.5 rounded-xl border border-[#21262D] bg-[#0D1117] space-y-3">
              <span className="text-xs font-mono font-bold text-[#E6EDF3] flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                Создать новую таблицу
              </span>

              <div>
                <label className="text-[10px] font-mono text-[#7D8590] uppercase block mb-1">Имя таблицы</label>
                <input
                  type="text"
                  placeholder="Sat_Customer_Details"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] text-xs font-mono text-[#E6EDF3] focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-[#7D8590] uppercase block mb-1">Стереотип сущности</label>
                <select
                  value={newTableStereotype}
                  onChange={(e) => setNewTableStereotype(e.target.value as TableStereotype)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] text-xs font-mono text-[#E6EDF3] focus:border-emerald-500 focus:outline-none"
                >
                  <optgroup label="Data Vault 2.0">
                    <option value="Hub">Hub (Хаб)</option>
                    <option value="Link">Link (Линк)</option>
                    <option value="Satellite">Satellite (Сателлит)</option>
                    <option value="Same-As Link">Same-As Link</option>
                    <option value="Effectivity Sat">Effectivity Satellite</option>
                    <option value="PIT">PIT (Point-in-Time)</option>
                    <option value="Bridge">Bridge</option>
                  </optgroup>
                  <optgroup label="DWH Dimensional">
                    <option value="Fact (Transactional)">Fact (Transactional)</option>
                    <option value="Fact (Snapshot)">Fact (Snapshot)</option>
                    <option value="Dim (SCD1)">Dim (SCD Type 1)</option>
                    <option value="Dim (SCD2)">Dim (SCD Type 2)</option>
                  </optgroup>
                </select>
              </div>

              <button
                onClick={handleAddTable}
                className="w-full py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-bold transition-colors"
              >
                + Добавить на холст
              </button>
            </div>

            {/* Validation Feedback */}
            {validationResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  validationResult.passed
                    ? 'border-emerald-500/50 bg-emerald-950/30'
                    : 'border-red-500/50 bg-red-950/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {validationResult.passed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">Архитектура верна!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-bold text-red-300">Ошибки моделирования</span>
                    </>
                  )}
                </div>

                {validationResult.issues.length > 0 && (
                  <div className="space-y-1.5">
                    {validationResult.issues.map((err, i) => (
                      <p key={i} className="text-xs text-red-200/90 leading-relaxed font-mono">
                        • {err}
                      </p>
                    ))}
                  </div>
                )}

                {validationResult.praises.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                    {validationResult.praises.map((praise, i) => (
                      <p key={i} className="text-xs text-emerald-300/90 leading-relaxed font-mono">
                        ✓ {praise}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SQL Script Tab */
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <DynamicMonaco
              value={sqlCode}
              onChange={setSqlCode}
              language="sql"
              onRunCode={handleRunSql}
            />
          </div>
          <div className="h-48 border-t border-[#21262D]">
            <OutputConsole
              response={sqlResponse}
              isRunning={isSqlRunning}
              onRunCode={handleRunSql}
              onVerifyCode={handleRunSql}
              testConfig={lesson.testConfig}
            />
          </div>
        </div>
      )}
    </div>
  );
}
