'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getModuleBySlug } from '@/data/modules';
import { getLesson, getLessonsForModule } from '@/data/lessons';
import { useProgress } from '@/hooks/useProgress';
import { TechIcon } from '@/components/ui/TechIcon';
import {
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Database,
  ArrowRight,
  Flame,
  FileCode,
  Layers,
} from 'lucide-react';

export default function LessonClient() {
  const params = useParams();
  const router = useRouter();
  const moduleSlug = Array.isArray(params.moduleSlug) ? params.moduleSlug[0] : (params.moduleSlug as string);
  const lessonId = Array.isArray(params.lessonId) ? params.lessonId[0] : (params.lessonId as string);

  const { markLessonCompleted, completedLessonIds } = useProgress();
  const [activeTab, setActiveTab] = useState<'theory' | 'schema' | 'task' | 'brokenProd'>('theory');
  const [revealedHintIndex, setRevealedHintIndex] = useState<number>(-1);

  const currentModule = getModuleBySlug(moduleSlug);
  const currentLesson = getLesson(moduleSlug, lessonId);
  const moduleLessons = getLessonsForModule(moduleSlug);

  if (!currentModule || !currentLesson) {
    return (
      <div className="min-h-screen bg-[#0D1117] text-[#E6EDF3] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#151B23] border border-[#21262D] flex items-center justify-center mb-4 text-[#7D8590]">
          <Database className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Урок находится в разработке</h1>
        <p className="text-xs text-[#7D8590] max-w-md mb-6">
          Материалы для раздела «{currentModule ? currentModule.title : moduleSlug}» активно наполняются по стандарту ARCHITECTURE.md.
        </p>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-semibold transition-colors"
        >
          Вернуться к Карте Стека
        </Link>
      </div>
    );
  }

  const isCompleted = completedLessonIds.includes(currentLesson.id);

  // Find next and previous lessons
  const currentIndex = moduleLessons.findIndex((l) => l.id === currentLesson.id);
  const nextLesson = currentIndex < moduleLessons.length - 1 ? moduleLessons[currentIndex + 1] : null;

  const handleComplete = () => {
    markLessonCompleted(currentLesson.id, currentModule.slug);
    if (nextLesson) {
      router.push(`/course/${currentModule.slug}/${nextLesson.id}`);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0D1117] text-[#E6EDF3]">
      {/* Top Header */}
      <header className="h-14 border-b border-[#21262D] bg-[#090C10] px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Карта Стека</span>
          </Link>

          <span className="text-[#21262D]">•</span>

          <div className="flex items-center gap-2">
            <TechIcon slug={currentModule.slug} size={16} />
            <span className="text-xs font-medium text-[#7D8590]">{currentModule.title}</span>
            <span className="text-[#21262D]">•</span>
            <span className="text-xs font-semibold text-[#E6EDF3] truncate max-w-sm">
              Урок {currentLesson.order}: {currentLesson.title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isCompleted && (
            <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Пройден
            </span>
          )}

          <button
            onClick={handleComplete}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black transition-colors"
          >
            <span>{nextLesson ? 'Завершить и далее' : 'Завершить модуль'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Theory & Schema (Scrollable) */}
        <div className="flex-1 flex flex-col border-r border-[#21262D] overflow-hidden bg-[#0D1117]">
          {/* Navigation Tabs */}
          <div className="h-11 px-6 border-b border-[#21262D] bg-[#090C10] flex items-center gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('theory')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'theory'
                  ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/20'
                  : 'text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              📖 Теория и Архитектура
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'schema'
                  ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/20'
                  : 'text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              📊 Схема данных ({currentLesson.schemaPreview.length})
            </button>
            <button
              onClick={() => setActiveTab('task')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'task'
                  ? 'bg-[#151B23] text-emerald-400 border border-emerald-500/20'
                  : 'text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              🎯 Практическое задание
            </button>
            <button
              onClick={() => setActiveTab('brokenProd')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'brokenProd'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>Сломанный прод</span>
            </button>
          </div>

          {/* Tab 1: Theory */}
          {activeTab === 'theory' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin scrollbar-thumb-[#21262D]">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2">
                  <span>{currentModule.title}</span>
                  <span>•</span>
                  <span>{currentLesson.estimatedMinutes} мин чтения</span>
                </div>
                <h1 className="text-2xl font-bold text-[#E6EDF3] leading-snug">{currentLesson.title}</h1>
              </div>

              {/* Theory Blocks Rendering */}
              {currentLesson.theoryBlocks.map((block, idx) => {
                if (block.type === 'markdown') {
                  return (
                    <div
                      key={idx}
                      className="text-sm text-[#E6EDF3] leading-relaxed whitespace-pre-wrap font-sans"
                    >
                      {block.content}
                    </div>
                  );
                }

                if (block.type === 'callout') {
                  const isAnalogy = block.variant === 'analogy';
                  const isDanger = block.variant === 'prod-danger';
                  const isInterview = block.variant === 'interview';

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-5 space-y-2 ${
                        isAnalogy
                          ? 'bg-[#151B23] border-sky-500/30 text-sky-100'
                          : isDanger
                          ? 'bg-amber-950/20 border-amber-500/40 text-amber-100'
                          : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-sm">
                        {isAnalogy && <Lightbulb className="w-4 h-4 text-sky-400" />}
                        {isDanger && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {isInterview && <HelpCircle className="w-4 h-4 text-emerald-400" />}
                        <span>{block.title}</span>
                      </div>
                      <div className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">
                        {block.content}
                      </div>
                    </div>
                  );
                }

                if (block.type === 'er-diagram') {
                  return (
                    <div key={idx} className="border border-[#21262D] rounded-xl bg-[#090C10] p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
                          {block.data.title || 'Схема сущностей (ER Diagram)'}
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {block.data.tables.map((tbl) => (
                          <div key={tbl.name} className="bg-[#151B23] border border-[#21262D] rounded-lg overflow-hidden">
                            <div className="px-3 py-2 bg-[#0D1117] border-b border-[#21262D] flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-emerald-400">{tbl.name}</span>
                              <span className="text-[10px] font-mono text-[#7D8590] uppercase">{tbl.role || 'table'}</span>
                            </div>
                            <div className="p-2 space-y-1">
                              {tbl.columns.map((col) => (
                                <div key={col.name} className="flex items-center justify-between text-[11px] font-mono px-2 py-0.5 rounded hover:bg-[#21262D]/50">
                                  <div className="flex items-center gap-1.5">
                                    {col.keyType && col.keyType !== 'none' && (
                                      <span className="text-[9px] px-1 rounded bg-amber-500/10 text-amber-400 font-bold border border-amber-500/20">
                                        {col.keyType}
                                      </span>
                                    )}
                                    <span className="text-[#E6EDF3]">{col.name}</span>
                                  </div>
                                  <span className="text-[#7D8590] text-[10px]">{col.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (block.type === 'before-after-table') {
                  return (
                    <div key={idx} className="border border-[#21262D] rounded-xl bg-[#090C10] p-5 space-y-4">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#E6EDF3]">
                        {block.data.title || 'Сравнение данных: ДО и ПОСЛЕ'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* ДО */}
                        <div className="bg-[#151B23] border border-[#21262D] rounded-lg p-3 space-y-2">
                          <span className="text-[11px] font-medium text-amber-400 block">{block.data.beforeDescription}</span>
                          <table className="w-full text-left text-[11px] font-mono border-collapse">
                            <thead>
                              <tr className="border-b border-[#21262D] text-[#7D8590]">
                                {block.data.beforeColumns.map((col) => (
                                  <th key={col} className="pb-1 pr-2">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.data.beforeRows.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-[#21262D]/40 text-[#E6EDF3]">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="py-1 pr-2">{String(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* ПОСЛЕ */}
                        <div className="bg-[#151B23] border border-emerald-500/30 rounded-lg p-3 space-y-2">
                          <span className="text-[11px] font-medium text-emerald-400 block">{block.data.afterDescription}</span>
                          <table className="w-full text-left text-[11px] font-mono border-collapse">
                            <thead>
                              <tr className="border-b border-emerald-500/20 text-[#7D8590]">
                                {block.data.afterColumns.map((col) => (
                                  <th key={col} className="pb-1 pr-2">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {block.data.afterRows.map((row, rIdx) => (
                                <tr key={rIdx} className="border-b border-[#21262D]/40 text-emerald-200">
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className="py-1 pr-2">{String(cell)}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}

              {/* Glossary Terms */}
              {currentLesson.glossaryTerms.length > 0 && (
                <div className="pt-6 border-t border-[#21262D] space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7D8590]">
                    Термины урока (Glossary)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentLesson.glossaryTerms.map((gt) => (
                      <div key={gt.term} className="bg-[#151B23] border border-[#21262D] p-3 rounded-lg space-y-1">
                        <span className="text-xs font-mono font-bold text-emerald-400">{gt.term}</span>
                        <p className="text-[11px] text-[#7D8590] leading-snug">{gt.definition}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Schema */}
          {activeTab === 'schema' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-[#21262D]">
              <h3 className="text-base font-semibold text-[#E6EDF3]">Схема таблиц базы данных</h3>
              {currentLesson.schemaPreview.map((schema) => (
                <div key={schema.tableName} className="bg-[#151B23] border border-[#21262D] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-[#090C10] border-b border-[#21262D] flex items-center justify-between">
                    <div>
                      <span className="font-mono text-sm font-bold text-emerald-400">{schema.tableName}</span>
                      {schema.description && <p className="text-xs text-[#7D8590] mt-0.5">{schema.description}</p>}
                    </div>
                    <span className="text-xs font-mono text-[#7D8590]">{schema.columns.length} колонок</span>
                  </div>

                  <div className="p-4 overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#21262D] text-[#7D8590]">
                          <th className="pb-2">Колонка</th>
                          <th className="pb-2">Тип</th>
                          <th className="pb-2">Ключ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schema.columns.map((col) => (
                          <tr key={col.name} className="border-b border-[#21262D]/40">
                            <td className="py-1.5 text-[#E6EDF3]">{col.name}</td>
                            <td className="py-1.5 text-[#7D8590]">{col.type}</td>
                            <td className="py-1.5 text-amber-400 font-bold">{col.keyType || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {schema.sampleRows.length > 0 && (
                    <div className="px-4 py-3 bg-[#0D1117] border-t border-[#21262D]">
                      <span className="text-[11px] font-mono text-[#7D8590] block mb-2">Примеры строк:</span>
                      <pre className="text-[10px] font-mono text-emerald-400/90 overflow-x-auto">
                        {JSON.stringify(schema.sampleRows, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Task */}
          {activeTab === 'task' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-[#21262D]">
              <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-6 space-y-4">
                <h3 className="text-base font-semibold text-[#E6EDF3] flex items-center gap-2">
                  <span>🎯</span> Техническое задание (ТЗ)
                </h3>
                <p className="text-sm text-[#E6EDF3] leading-relaxed whitespace-pre-wrap">
                  {currentLesson.taskDescription}
                </p>
              </div>

              {/* Hints */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7D8590]">
                  Подсказки к заданию
                </h4>
                {currentLesson.hints.map((hint, hIdx) => {
                  const isRevealed = revealedHintIndex >= hIdx;
                  return (
                    <div key={hIdx} className="bg-[#151B23] border border-[#21262D] rounded-lg p-3 text-xs">
                      {isRevealed ? (
                        <div className="space-y-1">
                          <span className="font-semibold text-emerald-400">Подсказка #{hIdx + 1}:</span>
                          <p className="text-[#E6EDF3]">{hint}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setRevealedHintIndex(hIdx)}
                          className="text-[#7D8590] hover:text-[#E6EDF3] flex items-center gap-2"
                        >
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                          <span>Показать подсказку #{hIdx + 1} {hIdx === 2 ? '(Полное решение)' : ''}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 4: Broken Prod Task */}
          {activeTab === 'brokenProd' && (
            <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-[#21262D]">
              <div className="bg-red-950/20 border border-red-500/40 rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <Flame className="w-4 h-4 fill-current" />
                  <span>{currentLesson.brokenProdTask.title}</span>
                </div>
                <p className="text-xs text-[#E6EDF3] leading-relaxed">
                  {currentLesson.brokenProdTask.incidentDescription}
                </p>
              </div>

              <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-4 space-y-2">
                <span className="text-xs font-semibold text-amber-400 block">Багованный код в проде:</span>
                <pre className="p-3 bg-[#090C10] border border-[#21262D] rounded-lg font-mono text-xs text-red-300 overflow-x-auto">
                  {currentLesson.brokenProdTask.buggyCode}
                </pre>
              </div>

              <div className="bg-[#151B23] border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <span className="text-xs font-semibold text-emerald-400 block">💡 Подсказка к исправлению:</span>
                <p className="text-xs text-[#E6EDF3]">{currentLesson.brokenProdTask.fixHint}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Code Editor Workspace */}
        <div className="w-[45%] flex flex-col bg-[#090C10] overflow-hidden">
          <div className="h-11 px-4 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0 text-xs font-mono text-[#7D8590]">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>solution.{currentModule.engineType === 'python' ? 'py' : 'sql'}</span>
            </div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              {currentModule.engineType.toUpperCase()} Engine
            </span>
          </div>

          {/* Editor Area (Code View) */}
          <div className="flex-1 p-4 bg-[#0D1117] overflow-y-auto font-mono text-xs text-[#E6EDF3]">
            <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-4 text-xs font-mono leading-relaxed space-y-2">
              <span className="text-[#7D8590]">{'// Шаблон решения задачи:'}</span>
              <pre className="text-emerald-400 whitespace-pre-wrap">{currentLesson.initialCode}</pre>
            </div>

            <div className="mt-4 bg-[#151B23] border border-[#21262D] rounded-xl p-4 text-xs font-mono leading-relaxed space-y-2">
              <span className="text-[#7D8590]">{'// Эталонное решение (проверка Web Worker в Этапе 2):'}</span>
              <pre className="text-sky-300 whitespace-pre-wrap">{currentLesson.solutionCode}</pre>
            </div>
          </div>

          {/* Bottom Execution Bar */}
          <div className="h-14 px-4 border-t border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0">
            <span className="text-xs text-[#7D8590] font-mono">Таймаут: 5000 ms</span>
            <button
              onClick={handleComplete}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold transition-colors shadow-lg shadow-emerald-500/10 flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Проверить решение</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
