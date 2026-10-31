'use client';

import React, { useState } from 'react';
import { WorkerResponse, LessonTestConfig } from '@/types/course';
import { Play, CheckCircle2, Terminal, Table, CheckSquare, Clock, AlertTriangle } from 'lucide-react';

interface OutputConsoleProps {
  response: WorkerResponse | null;
  isRunning: boolean;
  onRunCode: () => void;
  onVerifyCode: () => void;
  testConfig: LessonTestConfig;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  response,
  isRunning,
  onRunCode,
  onVerifyCode,
  testConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'logs' | 'tests'>('table');

  return (
    <div className="w-full h-full flex flex-col bg-[#090C10] border-t border-[#21262D] overflow-hidden select-none">
      {/* Top Action Bar & Tabs */}
      <div className="h-11 px-4 border-b border-[#21262D] bg-[#0D1117] flex items-center justify-between shrink-0">
        {/* Output Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'table'
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/20'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Таблица результата</span>
            {response?.rows && (
              <span className="text-[10px] text-[#7D8590]">({response.rows.length})</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'logs'
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/20'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Консоль / Логи</span>
          </button>

          <button
            onClick={() => setActiveTab('tests')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'tests'
                ? 'bg-[#151B23] text-emerald-400 font-bold border border-emerald-500/20'
                : 'text-[#7D8590] hover:text-[#E6EDF3]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>План проверки</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {response && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#7D8590] mr-2">
              <Clock className="w-3.5 h-3.5" />
              <span>{response.executionTimeMs} ms</span>
            </div>
          )}

          <button
            onClick={onRunCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-[#E6EDF3] transition-colors cursor-pointer disabled:opacity-50"
            title="Запустить код (Ctrl + Enter)"
          >
            <Play className="w-3 h-3 fill-current text-sky-400" />
            <span className="hidden sm:inline">Запустить</span>
            <span className="text-[10px] text-[#7D8590] hidden md:inline">(Ctrl+↵)</span>
          </button>

          <button
            onClick={onVerifyCode}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-600 text-black transition-colors cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-500/10"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Проверить решение</span>
          </button>
        </div>
      </div>

      {/* Output Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#0D1117] font-mono text-xs scrollbar-thin scrollbar-thumb-[#21262D]">
        {isRunning ? (
          <div className="h-full flex flex-col items-center justify-center text-[#7D8590] gap-2">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Выполнение запроса в изолированном Web Worker...</span>
          </div>
        ) : !response ? (
          <div className="h-full flex flex-col items-center justify-center text-[#7D8590] text-center p-6 space-y-1">
            <Terminal className="w-6 h-6 text-[#21262D] mb-1" />
            <p className="text-xs text-[#7D8590]">Нажмите «Запустить код» или «Проверить решение»</p>
            <p className="text-[11px] text-[#7D8590]/70">Горячие клавиши: Ctrl + Enter / Cmd + Enter</p>
          </div>
        ) : response.status === 'ERROR' ? (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Ошибка выполнения запроса {response.errorDetails?.line ? `(Строка ${response.errorDetails.line})` : ''}</span>
            </div>
            <p className="text-xs leading-relaxed">
              {response.errorDetails?.friendlyMessage || response.errorDetails?.rawError}
            </p>
            {response.errorDetails?.rawError && (
              <pre className="p-2.5 bg-[#090C10] rounded border border-red-500/20 text-[11px] text-red-300 overflow-x-auto whitespace-pre-wrap">
                {response.errorDetails.rawError}
              </pre>
            )}
          </div>
        ) : activeTab === 'table' ? (
          response.columns && response.columns.length > 0 && response.rows ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#21262D] text-emerald-400">
                    {response.columns.map((c) => (
                      <th key={c} className="pb-2 pr-4 font-bold text-[11px]">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {response.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="border-b border-[#21262D]/40 hover:bg-[#151B23] transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="py-2 pr-4 text-[#E6EDF3]">
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
          ) : (
            <div className="text-[#7D8590] text-xs">Запрос выполнен успешно. Результат не содержит возвращаемых строк.</div>
          )
        ) : activeTab === 'logs' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs text-[#7D8590] pb-2 border-b border-[#21262D]">
              <span>Статус: <strong className="text-emerald-400">{response.status}</strong></span>
              <span>Время: <strong className="text-emerald-400">{response.executionTimeMs} ms</strong></span>
            </div>
            <pre className="text-xs text-[#E6EDF3] leading-relaxed whitespace-pre-wrap">
              {response.stdout || 'Лог вывода пуст (запрос выполнен штатно).'}
            </pre>
          </div>
        ) : (
          /* Verification Plan Tab */
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <CheckSquare className="w-4 h-4" />
              <span>Критерии верификации решения:</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-[#151B23] border border-[#21262D] rounded-lg flex items-center justify-between">
                <span>Проверка сортировки строк (checkOrder):</span>
                <span className="text-emerald-400 font-bold">{testConfig.checkOrder ? 'ВКЛЮЧЕНА' : 'ВЫКЛЮЧЕНА'}</span>
              </div>
              <div className="p-3 bg-[#151B23] border border-[#21262D] rounded-lg flex items-center justify-between">
                <span>Точность сравнения float чисел:</span>
                <span className="text-sky-400 font-bold">{testConfig.floatPrecision} знака</span>
              </div>
              {testConfig.expectedColumns && (
                <div className="p-3 bg-[#151B23] border border-[#21262D] rounded-lg space-y-1">
                  <span className="text-[#7D8590]">Ожидаемые колонки:</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {testConfig.expectedColumns.map((col) => (
                      <span key={col} className="px-2 py-0.5 rounded bg-[#090C10] border border-emerald-500/30 text-emerald-400 text-[11px]">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {response.verification && (
                <div className={`p-4 rounded-xl border mt-3 ${
                  response.verification.passed
                    ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                }`}>
                  <div className="font-bold flex items-center gap-2 mb-1">
                    {response.verification.passed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Тесты успешно пройдены!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400">Результат не совпадает с эталоном:</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed">{response.verification.feedback}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
