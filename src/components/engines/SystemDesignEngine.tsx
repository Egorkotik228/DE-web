'use client';

import React, { useState } from 'react';
import { Lesson } from '@/types/course';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Sliders,
  ArrowRight,
  Flame,
} from 'lucide-react';

let archIdCounter = 0;
function nextArchId(prefix: string): string {
  archIdCounter += 1;
  return `${prefix}_${archIdCounter}`;
}

export interface ArchitectureBlock {
  id: string;
  category: 'source' | 'cdc' | 'buffer' | 'compute' | 'storage' | 'dwh' | 'serving';
  title: string;
  technology: string;
  throughputLimit: number; // ops/sec
  latencyMs: number;
  config: {
    partitions?: number;
    batchSizeRows?: number;
    deliverySemantics?: 'at-least-once' | 'exactly-once' | 'at-most-once';
    storageFormat?: 'Parquet' | 'ORC' | 'JSON' | 'CSV';
    partitionKey?: string;
  };
}

const AVAILABLE_PALETTE: Omit<ArchitectureBlock, 'id'>[] = [
  {
    category: 'source',
    title: 'OLTP PostgreSQL',
    technology: 'PostgreSQL 16 (Primary)',
    throughputLimit: 25000,
    latencyMs: 5,
    config: {},
  },
  {
    category: 'cdc',
    title: 'Debezium CDC',
    technology: 'Debezium / Kafka Connect',
    throughputLimit: 30000,
    latencyMs: 150,
    config: { deliverySemantics: 'at-least-once' },
  },
  {
    category: 'buffer',
    title: 'Kafka Topic (tx.events)',
    technology: 'Apache Kafka 3.6',
    throughputLimit: 10000, // per partition
    latencyMs: 20,
    config: { partitions: 8, deliverySemantics: 'at-least-once' },
  },
  {
    category: 'compute',
    title: 'Flink Anti-Fraud Engine',
    technology: 'Apache Flink (Stateful CEP)',
    throughputLimit: 35000,
    latencyMs: 250,
    config: { deliverySemantics: 'exactly-once' },
  },
  {
    category: 'storage',
    title: 'S3 Bronze Lakehouse',
    technology: 'MinIO / AWS S3 + Apache Iceberg',
    throughputLimit: 50000,
    latencyMs: 1200,
    config: { storageFormat: 'Parquet', partitionKey: 'event_date' },
  },
  {
    category: 'dwh',
    title: 'ClickHouse Anti-Fraud Mart',
    technology: 'ClickHouse ReplacingMergeTree',
    throughputLimit: 40000,
    latencyMs: 100,
    config: { batchSizeRows: 10000 },
  },
  {
    category: 'serving',
    title: 'Real-time Anti-Fraud API',
    technology: 'FastAPI / Go Microservice',
    throughputLimit: 30000,
    latencyMs: 15,
    config: {},
  },
];

interface SystemDesignEngineProps {
  lesson: Lesson;
  isBrokenProdMode: boolean;
  onLessonPassed: () => void;
}

export function SystemDesignEngine({
  lesson,
  isBrokenProdMode,
  onLessonPassed,
}: SystemDesignEngineProps) {
  // Canvas Pipeline Architecture
  const [pipeline, setPipeline] = useState<ArchitectureBlock[]>([
    {
      id: 'b1',
      category: 'source',
      title: 'OLTP PostgreSQL',
      technology: 'PostgreSQL 16',
      throughputLimit: 25000,
      latencyMs: 5,
      config: {},
    },
    {
      id: 'b2',
      category: 'cdc',
      title: 'Debezium CDC',
      technology: 'Kafka Connect',
      throughputLimit: 30000,
      latencyMs: 150,
      config: { deliverySemantics: 'at-least-once' },
    },
    {
      id: 'b3',
      category: 'buffer',
      title: 'Kafka (orders.events)',
      technology: 'Apache Kafka',
      throughputLimit: isBrokenProdMode ? 4000 : 32000,
      latencyMs: 20,
      config: { partitions: isBrokenProdMode ? 1 : 8, deliverySemantics: 'at-least-once' },
    },
    {
      id: 'b4',
      category: 'compute',
      title: 'Flink Streaming Engine',
      technology: 'Apache Flink',
      throughputLimit: 35000,
      latencyMs: 250,
      config: { deliverySemantics: 'exactly-once' },
    },
    {
      id: 'b5',
      category: 'dwh',
      title: 'ClickHouse Serving Mart',
      technology: 'ClickHouse',
      throughputLimit: 40000,
      latencyMs: 80,
      config: { batchSizeRows: isBrokenProdMode ? 1 : 5000 },
    },
  ]);

  const [selectedBlockId, setSelectedBlockId] = useState<string>('b3');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    passed: boolean;
    totalLatencySec: number;
    achievedThroughput: number;
    targetThroughput: number;
    bottleneckBlockTitle: string | null;
    issues: string[];
    praises: string[];
  } | null>(null);

  const targetTxSec = 20000;
  const targetMaxLatencySec = 3.0;

  // Add block to canvas
  const handleAddBlock = (template: Omit<ArchitectureBlock, 'id'>) => {
    const newBlock: ArchitectureBlock = {
      ...template,
      id: nextArchId('block'),
    };
    setPipeline([...pipeline, newBlock]);
    setSelectedBlockId(newBlock.id);
  };

  // Remove block
  const handleRemoveBlock = (id: string) => {
    setPipeline(pipeline.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(pipeline[0]?.id || '');
  };

  // Run Stress-Test & SLA load test
  const handleRunStressTest = () => {
    setIsSimulating(true);
    setSimulationResult(null);

    setTimeout(() => {
      const issues: string[] = [];
      const praises: string[] = [];

      let totalLatencyMs = 0;
      let minThroughput = Infinity;
      let bottleneck: string | null = null;

      // 1. Calculate cumulative latency and find throughput bottlenecks
      pipeline.forEach((b) => {
        totalLatencyMs += b.latencyMs;

        let effectiveLimit = b.throughputLimit;
        // Kafka partitions scale limit
        if (b.category === 'buffer' && b.config.partitions) {
          effectiveLimit = b.config.partitions * 4500;
        }

        // ClickHouse micro-batch penalty
        if (b.category === 'dwh' && b.config.batchSizeRows === 1) {
          effectiveLimit = 1500; // Single row inserts kill ClickHouse parts!
        }

        if (effectiveLimit < minThroughput) {
          minThroughput = effectiveLimit;
          bottleneck = b.title;
        }
      });

      const totalLatencySec = Math.round((totalLatencyMs / 1000) * 100) / 100;

      // Check Ingestion pipeline essentials
      const hasCDC = pipeline.some((b) => b.category === 'cdc');
      const hasKafka = pipeline.some((b) => b.category === 'buffer');
      const hasStreamEngine = pipeline.some((b) => b.category === 'compute');
      const hasServing = pipeline.some((b) => b.category === 'dwh');

      if (!hasCDC) {
        issues.push('Отсутствует CDC-слой (Debezium): прямые запросы SELECT * из аналитики положат базу PostgreSQL!');
      }
      if (!hasKafka) {
        issues.push('Отсутствует шина сообщений (Kafka): при скачках нагрузки система потеряет данные без буфера.');
      }
      if (!hasStreamEngine) {
        issues.push('Отсутствует потоковый процессинг (Flink): расчет агрегатов на лету невозможен.');
      }
      if (!hasServing) {
        issues.push('Отсутствует аналитическая витрина (ClickHouse): запросы аналитиков будут зависать.');
      }

      // Check Kafka partition scalability
      const kafka = pipeline.find((b) => b.category === 'buffer');
      if (kafka && kafka.config.partitions && kafka.config.partitions < 6) {
        issues.push(
          `Бутылочное горлышко: В Kafka всего ${kafka.config.partitions} партиций! Пропускная способность ограничена ~${kafka.config.partitions * 4500} tx/sec, возникнет растущий лаг потребителей (Consumer Lag).`
        );
      }

      // Check ClickHouse batching
      const ch = pipeline.find((b) => b.category === 'dwh');
      if (ch && ch.config.batchSizeRows && ch.config.batchSizeRows < 100) {
        issues.push(
          `Критическая ошибка ClickHouse: вставка одиночными строками (batchSize=1) вызовет ошибку «Too many parts in all data in table» и отказ сервера!`
        );
      }

      // Check SLA targets
      if (minThroughput < targetTxSec) {
        issues.push(
          `Не пройден стресс-тест пропускной способности: достигнуто ${minThroughput.toLocaleString()} tx/sec при требуемых ${targetTxSec.toLocaleString()} tx/sec. Узкое место: «${bottleneck}».`
        );
      } else {
        praises.push(`Пропускная способность выдержала нагрузку: ${minThroughput.toLocaleString()} ops/sec (цель: 20k).`);
      }

      if (totalLatencySec > targetMaxLatencySec) {
        issues.push(
          `Превышен SLA задержки: сквозное время доставки составило ${totalLatencySec} сек (допустимо максимум ${targetMaxLatencySec} сек).`
        );
      } else {
        praises.push(`Сквозная задержка уложилась в строгий SLA: ${totalLatencySec} сек (норматив: < 3.0 сек).`);
      }

      const passed = issues.length === 0;

      setSimulationResult({
        passed,
        totalLatencySec,
        achievedThroughput: minThroughput === Infinity ? 0 : minThroughput,
        targetThroughput: targetTxSec,
        bottleneckBlockTitle: bottleneck,
        issues,
        praises,
      });

      setIsSimulating(false);

      if (passed) {
        onLessonPassed();
      }
    }, 600);
  };

  const selectedBlock = pipeline.find((b) => b.id === selectedBlockId);

  return (
    <div className="h-full flex flex-col bg-[#090C10] text-[#E6EDF3] overflow-hidden select-none font-mono">
      {/* Top Header */}
      <div className="h-11 px-4 border-b border-[#21262D] bg-[#0D1117] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-[#E6EDF3]">
            {lesson.title || 'Data System Design & Нагрузочное тестирование'}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold">
            SLA: 20k tx/sec, &lt; 3.0s
          </span>
          {isBrokenProdMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/60 border border-red-500/40 text-[10px] text-red-300 font-bold animate-pulse">
              <Flame className="w-3 h-3 fill-current text-red-400" />
              Авария SLA
            </span>
          )}
        </div>

        <button
          onClick={handleRunStressTest}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)]"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isSimulating ? 'Стресс-тест...' : 'Запустить нагрузочный тест'}</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Canvas & Flow */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-[#21262D]">
          {/* Top Component Palette */}
          <div className="p-3 border-b border-[#21262D] bg-[#151B23]">
            <span className="text-[11px] text-[#7D8590] uppercase tracking-wider block mb-2">
              Каталог архитектурных компонентов (кликните для добавления в конвейер):
            </span>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_PALETTE.map((tpl, i) => (
                <button
                  key={i}
                  onClick={() => handleAddBlock(tpl)}
                  className="px-2.5 py-1 rounded bg-[#0D1117] border border-[#21262D] hover:border-emerald-500/50 hover:text-emerald-300 text-xs transition-colors"
                >
                  + {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {/* Canvas Architecture Flow */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-[#090C10]">
            <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl">
              {pipeline.map((block, idx) => {
                const isSelected = selectedBlockId === block.id;
                return (
                  <React.Fragment key={block.id}>
                    <div
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer w-48 flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-[#151B23] shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500'
                          : 'border-[#21262D] bg-[#0D1117] hover:border-[#30363D]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[9px] uppercase font-bold text-emerald-400">
                            {block.category}
                          </span>
                          <span className="text-[9px] text-[#7D8590]">{block.latencyMs} ms</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#E6EDF3] leading-tight mb-1">
                          {block.title}
                        </h4>
                        <p className="text-[10px] text-[#7D8590] truncate">{block.technology}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-[#21262D] flex items-center justify-between text-[9px] text-[#7D8590]">
                        <span>Лимит:</span>
                        <span className="text-emerald-300 font-bold">
                          {block.category === 'buffer' && block.config.partitions
                            ? `${(block.config.partitions * 4500).toLocaleString()} ops`
                            : `${block.throughputLimit.toLocaleString()} ops`}
                        </span>
                      </div>
                    </div>

                    {idx < pipeline.length - 1 && (
                      <div className="flex items-center text-emerald-500/70">
                        <ArrowRight className="w-4 h-4 animate-pulse" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Settings & Simulation Results */}
        <div className="w-full lg:w-96 shrink-0 bg-[#151B23] flex flex-col overflow-y-auto p-4 space-y-4">
          {/* Node Config */}
          {selectedBlock ? (
            <div className="p-4 rounded-xl border border-[#21262D] bg-[#0D1117] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Параметры: {selectedBlock.title}
                </span>
                <button
                  onClick={() => handleRemoveBlock(selectedBlock.id)}
                  className="text-[10px] text-red-400 hover:text-red-300"
                >
                  Удалить блок
                </button>
              </div>

              {selectedBlock.category === 'buffer' && (
                <div>
                  <label className="text-[10px] text-[#7D8590] uppercase block mb-1">
                    Число партиций в топике Kafka: {selectedBlock.config.partitions || 1}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    value={selectedBlock.config.partitions || 1}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPipeline(
                        pipeline.map((b) =>
                          b.id === selectedBlock.id ? { ...b, config: { ...b.config, partitions: val } } : b
                        )
                      );
                    }}
                    className="w-full accent-emerald-500"
                  />
                  <span className="text-[9px] text-[#7D8590] block mt-0.5">
                    Каждая партиция масштабирует чтение консьюмерами до ~4,500 msg/sec.
                  </span>
                </div>
              )}

              {selectedBlock.category === 'dwh' && (
                <div>
                  <label className="text-[10px] text-[#7D8590] uppercase block mb-1">
                    Размер микро-батча вставки (ClickHouse batch size): {selectedBlock.config.batchSizeRows || 1}
                  </label>
                  <select
                    value={selectedBlock.config.batchSizeRows || 1000}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPipeline(
                        pipeline.map((b) =>
                          b.id === selectedBlock.id ? { ...b, config: { ...b.config, batchSizeRows: val } } : b
                        )
                      );
                    }}
                    className="w-full px-2 py-1.5 rounded bg-[#151B23] border border-[#21262D] text-xs text-[#E6EDF3] focus:outline-none"
                  >
                    <option value="1">1 строка (Single-row INSERT - авария!)</option>
                    <option value="1000">1 000 строк (Микро-батч)</option>
                    <option value="10000">10 000 строк (Оптимально)</option>
                    <option value="50000">50 000 строк (High throughput)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] text-[#7D8590] uppercase block mb-1">
                  Гарантии доставки сообщений
                </label>
                <select
                  value={selectedBlock.config.deliverySemantics || 'at-least-once'}
                  onChange={(e) => {
                    const sem = e.target.value as 'at-least-once' | 'exactly-once' | 'at-most-once';
                    setPipeline(
                      pipeline.map((b) =>
                        b.id === selectedBlock.id
                          ? { ...b, config: { ...b.config, deliverySemantics: sem } }
                          : b
                      )
                    );
                  }}
                  className="w-full px-2 py-1.5 rounded bg-[#151B23] border border-[#21262D] text-xs text-[#E6EDF3] focus:outline-none"
                >
                  <option value="at-least-once">At-Least-Once (Хотя бы раз)</option>
                  <option value="exactly-once">Exactly-Once (Ровно один раз via 2PC)</option>
                  <option value="at-most-once">At-Most-Once (Не более одного раза)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-[#21262D] text-center text-xs text-[#7D8590]">
              Выберите блок на схеме для настройки конфигурации.
            </div>
          )}

          {/* Stress-test Results */}
          {simulationResult && (
            <div
              className={`p-4 rounded-xl border space-y-3 ${
                simulationResult.passed
                  ? 'border-emerald-500/50 bg-emerald-950/30'
                  : 'border-red-500/50 bg-red-950/30'
              }`}
            >
              <div className="flex items-center gap-2">
                {simulationResult.passed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      SLA выдержан! Архитектура одобрена
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <span className="text-xs font-bold text-red-300">
                      Сбой нагрузки: узкие места в схеме
                    </span>
                  </>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-[#0D1117] border border-[#21262D]">
                  <span className="text-[10px] text-[#7D8590] block">Пропускная способность:</span>
                  <span
                    className={`font-bold ${
                      simulationResult.achievedThroughput >= simulationResult.targetThroughput
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {simulationResult.achievedThroughput.toLocaleString()} / {simulationResult.targetThroughput.toLocaleString()} ops
                  </span>
                </div>
                <div className="p-2 rounded bg-[#0D1117] border border-[#21262D]">
                  <span className="text-[10px] text-[#7D8590] block">Сквозная задержка:</span>
                  <span
                    className={`font-bold ${
                      simulationResult.totalLatencySec <= targetMaxLatencySec
                        ? 'text-emerald-400'
                        : 'text-red-400'
                    }`}
                  >
                    {simulationResult.totalLatencySec}s / max {targetMaxLatencySec}s
                  </span>
                </div>
              </div>

              {simulationResult.issues.length > 0 && (
                <div className="space-y-1 pt-1">
                  {simulationResult.issues.map((err, i) => (
                    <p key={i} className="text-xs text-red-200/90 leading-relaxed font-mono">
                      • {err}
                    </p>
                  ))}
                </div>
              )}

              {simulationResult.praises.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                  {simulationResult.praises.map((praise, i) => (
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
    </div>
  );
}
