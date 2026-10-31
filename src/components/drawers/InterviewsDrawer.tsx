'use client';

import React, { useState, useMemo } from 'react';
import { MODULES, getAllInterviewQuestions } from '@/data/modules';
import { TechIcon } from '@/components/ui/TechIcon';
import { X, HelpCircle, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';

interface InterviewsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlug?: string;
}

export const InterviewsDrawer: React.FC<InterviewsDrawerProps> = ({
  isOpen,
  onClose,
  initialSlug,
}) => {
  const [selectedModule, setSelectedModule] = useState<string>(initialSlug || 'all');
  const [prevInitialSlug, setPrevInitialSlug] = useState<string | undefined>(initialSlug);
  const [selectedLevel, setSelectedLevel] = useState<'All' | 'Junior' | 'Middle' | 'Senior'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  if (initialSlug !== prevInitialSlug) {
    setPrevInitialSlug(initialSlug);
    setSelectedModule(initialSlug || 'all');
  }

  const allQuestions = useMemo(() => getAllInterviewQuestions(), []);

  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      const matchModule = selectedModule === 'all' || q.moduleSlug === selectedModule;
      const matchLevel = selectedLevel === 'All' || q.level === selectedLevel;
      const matchQuery =
        !searchQuery ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.answer.toLowerCase().includes(searchQuery.toLowerCase());
      return matchModule && matchLevel && matchQuery;
    });
  }, [allQuestions, selectedModule, selectedLevel, searchQuery]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredQuestions.forEach((q) => {
      next[q.id] = true;
    });
    setExpandedIds(next);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl h-full bg-[#0D1117] border-l border-[#21262D] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#151B23] border border-[#21262D] flex items-center justify-center text-amber-400">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E6EDF3]">База вопросов с собеседований</h2>
              <p className="text-xs text-[#7D8590]">Более 85 глубоких вопросов уровня Junior, Middle и Senior по 17 разделам</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-[#21262D] bg-[#090C10]/60 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#7D8590] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по вопросу или ответу..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#151B23] border border-[#21262D] rounded-lg text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Module Selector */}
          <div className="flex items-center gap-1 text-xs text-[#7D8590]">
            <Filter className="w-3.5 h-3.5 text-[#7D8590]" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-[#151B23] border border-[#21262D] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:outline-none"
            >
              <option value="all">Все разделы (17)</option>
              {MODULES.map((m) => (
                <option key={m.slug} value={m.slug}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center bg-[#151B23] border border-[#21262D] rounded-lg p-0.5 text-xs">
            {(['All', 'Junior', 'Middle', 'Senior'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedLevel === lvl
                    ? 'bg-[#21262D] text-emerald-400 font-medium'
                    : 'text-[#7D8590] hover:text-[#E6EDF3]'
                }`}
              >
                {lvl === 'All' ? 'Все' : lvl}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto text-xs">
            <button
              onClick={expandAll}
              className="text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
            >
              Раскрыть все
            </button>
            <span className="text-[#21262D]">•</span>
            <button
              onClick={collapseAll}
              className="text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
            >
              Свернуть
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#0D1117] scrollbar-thin scrollbar-thumb-[#21262D]">
          {filteredQuestions.length === 0 ? (
            <div className="py-20 text-center text-sm text-[#7D8590]">
              Вопросы по заданным фильтрам не найдены.
            </div>
          ) : (
            filteredQuestions.map((q) => {
              const isExpanded = !!expandedIds[q.id];
              return (
                <div
                  key={q.id}
                  className="bg-[#151B23] border border-[#21262D] rounded-xl overflow-hidden transition-all hover:border-[#30363D]"
                >
                  <button
                    onClick={() => toggleExpand(q.id)}
                    className="w-full text-left p-4 flex items-start justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded bg-[#090C10] border border-[#21262D] flex items-center justify-center shrink-0 mt-0.5">
                        <TechIcon slug={q.moduleSlug} size={14} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-mono text-[#7D8590]">{q.moduleTitle}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              q.level === 'Senior'
                                ? 'text-red-400 bg-red-400/10 border border-red-500/20'
                                : q.level === 'Middle'
                                ? 'text-amber-400 bg-amber-400/10 border border-amber-500/20'
                                : 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20'
                            }`}
                          >
                            {q.level}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-[#E6EDF3]">{q.question}</h3>
                      </div>
                    </div>
                    <div className="shrink-0 text-[#7D8590] mt-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-[#21262D]/60 bg-[#0D1117]/50">
                      <div className="text-xs text-[#E6EDF3] leading-relaxed whitespace-pre-wrap pl-9 border-l-2 border-emerald-500/40 my-2">
                        {q.answer}
                      </div>
                      {q.tags && q.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 pl-9 mt-3">
                          {q.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono text-[#7D8590] bg-[#151B23] border border-[#21262D] px-1.5 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
