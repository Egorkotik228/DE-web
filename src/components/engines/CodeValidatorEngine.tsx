'use client';

import React, { useState, useMemo } from 'react';
import { Lesson } from '@/types/course';
import { DynamicMonaco } from '@/components/editor/DynamicMonaco';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  FileCheck,
  Flame,
} from 'lucide-react';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  passed: boolean;
  severity: 'error' | 'warning';
}

export interface DagNode {
  id: string;
  name: string;
  type: 'operator' | 'sensor' | 'model' | 'table';
  dependencies: string[];
}

function analyzeCode(currentCode: string, moduleSlug: string) {
  const isAirflow = moduleSlug === 'airflow' || currentCode.includes('DAG');
  const isDbt = moduleSlug === 'dbt' || currentCode.includes('config(') || currentCode.includes('materialized');
  const isClickHouse = moduleSlug === 'clickhouse' || currentCode.includes('ReplacingMergeTree') || currentCode.includes('ENGINE =');

  const items: ChecklistItem[] = [];
  const parsedNodes: DagNode[] = [];

  if (isAirflow) {
    const hasCatchupFalse = /catchup\s*=\s*False/i.test(currentCode);
    items.push({
      id: 'c1',
      title: 'Защита от каскадного бэкфила (catchup=False)',
      description: 'Параметр catchup=False предотвращает случайный взрывной запуск тысяч исторических инстансов при деплое.',
      passed: hasCatchupFalse,
      severity: 'error',
    });

    const hasSensor = currentCode.includes('Sensor');
    const hasReschedule = /mode\s*=\s*['"]reschedule['"]/i.test(currentCode);
    if (hasSensor) {
      items.push({
        id: 'c2',
        title: 'Освобождение воркера в сенсорах (mode="reschedule")',
        description: 'В режиме poke сенсор занимает слот воркера Airflow всё время ожидания. Режим reschedule освобождает слот между проверками.',
        passed: hasReschedule,
        severity: 'error',
      });
    }

    const hasDsTemplate = /\{\{\s*ds\s*\}\}/i.test(currentCode) || /\{\{\s*logical_date\s*\}\}/i.test(currentCode);
    const hasDelete = /DELETE\s+FROM/i.test(currentCode) || /TRUNCATE/i.test(currentCode) || /INSERT\s+OVERWRITE/i.test(currentCode);
    items.push({
      id: 'c3',
      title: 'Строгая идемпотентность (Перезапись партиции за {{ ds }})',
      description: 'Пайплайн обязан гарантировать идентичный результат при повторном запуске (DELETE партиции перед INSERT).',
      passed: hasDsTemplate && hasDelete,
      severity: 'error',
    });

    const hasChain = currentCode.includes('>>') || currentCode.includes('set_downstream');
    items.push({
      id: 'c4',
      title: 'Явная топология зависимостей задач (>>)',
      description: 'Задачи связаны в направленный ациклический граф оператором битового сдвига >>.',
      passed: hasChain,
      severity: 'warning',
    });

    const taskMatches = currentCode.matchAll(/task_id\s*=\s*['"]([^'"]+)['"]/g);
    for (const m of taskMatches) {
      const taskId = m[1];
      const isSens = taskId.toLowerCase().includes('wait') || taskId.toLowerCase().includes('sensor');
      parsedNodes.push({
        id: taskId,
        name: taskId,
        type: isSens ? 'sensor' : 'operator',
        dependencies: [],
      });
    }
  } else if (isDbt) {
    const hasIncremental = /materialized\s*=\s*['"]incremental['"]/i.test(currentCode);
    items.push({
      id: 'd1',
      title: 'Инкрементальная материализация (incremental)',
      description: 'Таблица настраивается через {{ config(materialized="incremental") }}.',
      passed: hasIncremental,
      severity: 'error',
    });

    const hasRef = /\{\{\s*ref\(['"][^'"]+['"]\)\s*\}\}/i.test(currentCode);
    items.push({
      id: 'd2',
      title: 'Data Lineage через макрос {{ ref() }}',
      description: 'Связи между моделями строятся исключительно через {{ ref() }} без хардкода схемы.',
      passed: hasRef,
      severity: 'error',
    });

    const hasIsIncremental = /\{\%\s*if\s+is_incremental\(\)\s*\%/i.test(currentCode);
    items.push({
      id: 'd3',
      title: 'Блок дельты {% if is_incremental() %}',
      description: 'Фильтрация новых записей по updated_at > (select max(updated_at) from {{ this }}).',
      passed: hasIsIncremental,
      severity: 'error',
    });

    parsedNodes.push(
      { id: 'stg_orders', name: 'stg_orders', type: 'model', dependencies: [] },
      { id: 'fct_orders', name: 'fct_orders (incremental)', type: 'model', dependencies: ['stg_orders'] },
      { id: 'cdm_sales', name: 'cdm_sales_daily', type: 'model', dependencies: ['fct_orders'] }
    );
  } else if (isClickHouse) {
    const hasEngine = /ENGINE\s*=\s*ReplacingMergeTree|MergeTree/i.test(currentCode);
    items.push({
      id: 'ch1',
      title: 'Движок семейства MergeTree',
      description: 'Таблица использует оптимальный колоночный движок ClickHouse.',
      passed: hasEngine,
      severity: 'error',
    });

    const hasOrderBy = /ORDER\s+BY/i.test(currentCode);
    items.push({
      id: 'ch2',
      title: 'Разреженный первичный индекс (ORDER BY)',
      description: 'Ключ сортировки сформирован от низкой кардинальности к высокой для гранул индекса 8192.',
      passed: hasOrderBy,
      severity: 'error',
    });

    const hasPartitionBy = /PARTITION\s+BY/i.test(currentCode);
    items.push({
      id: 'ch3',
      title: 'Партиционирование (PARTITION BY toYYYYMM())',
      description: 'Партиционирование по месяцам защищает от размножения миллионов микро-файлов кусков (parts).',
      passed: hasPartitionBy,
      severity: 'warning',
    });
  }

  const allPassed = items.length > 0 && items.filter((i) => i.severity === 'error').every((i) => i.passed);

  return { checklist: items, dagNodes: parsedNodes, allPassed };
}

interface CodeValidatorEngineProps {
  lesson: Lesson;
  isBrokenProdMode: boolean;
  onLessonPassed: () => void;
}

export function CodeValidatorEngine({
  lesson,
  isBrokenProdMode,
  onLessonPassed,
}: CodeValidatorEngineProps) {
  const [code, setCode] = useState<string>(
    lesson.initialCode ||
      `# Apache Airflow DAG: Идемпотентный пайплайн загрузки заказов
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.postgres.operators.postgres import PostgresOperator
from airflow.sensors.external_task import ExternalTaskSensor
from datetime import datetime, timedelta

default_args = {
    'owner': 'data_engineer',
    'depends_on_past': False,
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
}

with DAG(
    dag_id='orders_daily_ingest_v2',
    default_args=default_args,
    description='Идемпотентный ETL заказов за расчетную дату',
    schedule='0 3 * * *',
    start_date=datetime(2026, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['orders', 'production'],
) as dag:

    # 1. Ожидание выгрузки из источника
    wait_upstream = ExternalTaskSensor(
        task_id='wait_upstream_crm',
        external_dag_id='crm_export_daily',
        mode='reschedule',
        poke_interval=60,
        timeout=3600,
    )

    # 2. Идемпотентная очистка партиции перед загрузкой (Write-Audit-Publish)
    clean_partition = PostgresOperator(
        task_id='clean_target_partition',
        postgres_conn_id='dwh_postgres',
        sql="""
            DELETE FROM stage.orders 
            WHERE order_date = '{{ ds }}';
        """,
    )

    # 3. Наполнение таблицы за расчетную дату
    load_stage = PostgresOperator(
        task_id='load_stage_orders',
        postgres_conn_id='dwh_postgres',
        sql="""
            INSERT INTO stage.orders (order_id, customer_id, amount, order_date)
            SELECT id, user_id, total, created_at::date
            FROM raw.crm_orders
            WHERE created_at::date = '{{ ds }}';
        """,
    )

    # 4. Проверка качества данных
    validate_dq = PostgresOperator(
        task_id='validate_data_quality',
        postgres_conn_id='dwh_postgres',
        sql="""
            SELECT COUNT(*) FROM stage.orders 
            WHERE order_date = '{{ ds }}' AND amount < 0;
        """,
    )

    # Задаем топологию графа
    wait_upstream >> clean_partition >> load_stage >> validate_dq
`
  );

  const [activeBottomTab, setActiveBottomTab] = useState<'dag' | 'checklist'>('dag');

  const { checklist, dagNodes, allPassed } = useMemo(
    () => analyzeCode(code, lesson.moduleSlug),
    [code, lesson.moduleSlug]
  );

  const handleVerify = () => {
    if (allPassed) {
      onLessonPassed();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0D1117] text-[#E6EDF3] overflow-hidden select-none font-mono">
      {/* Top Bar */}
      <div className="h-11 px-4 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-[#E6EDF3]">Валидатор конфигураций и пайплайнов</span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 font-bold">
            Airflow / dbt / ClickHouse
          </span>
          {isBrokenProdMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-[10px] text-red-300 font-bold animate-pulse">
              <Flame className="w-3 h-3 fill-current text-red-400" />
              Инцидент в конфигурации
            </span>
          )}
        </div>

        <button
          onClick={handleVerify}
          className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] ${
            allPassed ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-emerald-500/80 hover:bg-emerald-500'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Проверить конфигурацию</span>
        </button>
      </div>

      {/* Monaco Code Editor */}
      <div className="flex-1 overflow-hidden">
        <DynamicMonaco
          value={code}
          onChange={setCode}
          language="python"
        />
      </div>

      {/* Bottom Panel: Dynamic DAG & Checklist */}
      <div className="h-56 border-t border-[#21262D] bg-[#090C10] flex flex-col shrink-0">
        <div className="h-9 px-4 border-b border-[#21262D] bg-[#151B23] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveBottomTab('dag')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeBottomTab === 'dag'
                  ? 'bg-[#0D1117] text-emerald-400 border border-emerald-500/30'
                  : 'text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>[🌳 Визуальный граф DAG / Lineage]</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('checklist')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                activeBottomTab === 'checklist'
                  ? 'bg-[#0D1117] text-emerald-400 border border-emerald-500/30'
                  : 'text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                [📋 Инженерный чек-лист] ({checklist.filter((i) => i.passed).length}/{checklist.length})
              </span>
            </button>
          </div>

          <span
            className={`text-xs font-bold ${
              allPassed ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {allPassed ? '✓ Конфигурация готова к проду' : '• Требуется исправление замечаний'}
          </span>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeBottomTab === 'dag' ? (
            <div className="h-full flex items-center justify-center">
              {dagNodes.length === 0 ? (
                <div className="text-center text-xs text-[#7D8590]">
                  В коде пока не обнаружены операторы Airflow или модели dbt.
                </div>
              ) : (
                <div className="flex items-center gap-3 overflow-x-auto p-2">
                  {dagNodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <div className="flex flex-col items-center p-3 rounded-xl border border-emerald-500/40 bg-[#151B23] shadow-[0_0_15px_rgba(16,185,129,0.1)] min-w-[150px]">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase mb-1">
                          {node.type}
                        </span>
                        <span className="text-xs font-bold text-[#E6EDF3] text-center">
                          {node.name}
                        </span>
                        <span className="text-[9px] text-[#7D8590] mt-1 font-mono">
                          ✓ success
                        </span>
                      </div>
                      {i < dagNodes.length - 1 && (
                        <div className="flex items-center text-emerald-400">
                          <ArrowRight className="w-5 h-5 animate-pulse" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-w-3xl mx-auto">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-3 transition-colors ${
                    item.passed
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                      : item.severity === 'error'
                      ? 'border-red-500/40 bg-red-950/20 text-red-200'
                      : 'border-amber-500/40 bg-amber-950/20 text-amber-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {item.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          item.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs font-bold block">{item.title}</span>
                    <p className="text-[11px] text-[#7D8590] mt-0.5">{item.description}</p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      item.passed
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.severity === 'error'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.passed ? 'PASSED' : item.severity.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
