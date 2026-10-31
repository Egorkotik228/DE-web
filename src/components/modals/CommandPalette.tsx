'use client';

import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { MODULES, getAllInterviewQuestions } from '@/data/modules';
import { ALL_LESSONS } from '@/data/lessons';
import { TechIcon } from '@/components/ui/TechIcon';
import { Search, BookOpen, HelpCircle, FileText, ChevronRight, Sparkles } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCheatSheets: (slug?: string) => void;
  onOpenInterviews: (slug?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenCheatSheets,
  onOpenInterviews,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState('');

  // Global hotkey: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // trigger open via parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const interviewQuestions = getAllInterviewQuestions();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#151B23] border border-[#21262D] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Глобальный поиск по платформе" shouldFilter={true} className="w-full flex flex-col">
          <div className="flex items-center px-4 border-b border-[#21262D] bg-[#090C10]">
            <Search className="w-5 h-5 text-[#7D8590] shrink-0 mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Поиск по курсу, урокам, шпаргалкам и вопросам собеседований..."
              className="w-full py-4 bg-transparent text-sm text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none font-sans"
              autoFocus
            />
            <span className="text-xs text-[#7D8590] border border-[#21262D] rounded px-1.5 py-0.5 font-mono">
              ESC
            </span>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[#21262D]">
            <Command.Empty className="py-12 text-center text-sm text-[#7D8590]">
              Ничего не найдено по запросу «{search}».
            </Command.Empty>

            {/* Разделы курса */}
            <Command.Group heading="Разделы программы (17 модулей)" className="text-xs font-semibold text-[#7D8590] px-2 py-1.5 uppercase tracking-wider">
              {MODULES.map((mod) => (
                <Command.Item
                  key={mod.id}
                  value={`раздел ${mod.title} ${mod.slug} ${mod.levelTitle}`}
                  onSelect={() => {
                    onClose();
                    router.push(`/course/${mod.slug}/1`);
                  }}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-[#E6EDF3] hover:bg-[#21262D] cursor-pointer transition-colors group data-[selected=true]:bg-[#21262D]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded bg-[#090C10] flex items-center justify-center border border-[#21262D]">
                      <TechIcon slug={mod.slug} size={16} />
                    </div>
                    <div>
                      <div className="font-medium text-[#E6EDF3]">{mod.title}</div>
                      <div className="text-xs text-[#7D8590]">{mod.levelTitle} • {mod.totalLessons} уроков</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#7D8590] group-hover:text-[#10B981] transition-colors" />
                </Command.Item>
              ))}
            </Command.Group>

            {/* Доступные интерактивные уроки */}
            <Command.Group heading="Интерактивные уроки" className="text-xs font-semibold text-[#7D8590] px-2 py-1.5 uppercase tracking-wider mt-2 border-t border-[#21262D]/50 pt-2">
              {ALL_LESSONS.map((lesson) => (
                <Command.Item
                  key={lesson.id}
                  value={`урок ${lesson.title} ${lesson.moduleSlug}`}
                  onSelect={() => {
                    onClose();
                    router.push(`/course/${lesson.moduleSlug}/${lesson.id}`);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#E6EDF3] hover:bg-[#21262D] cursor-pointer transition-colors group data-[selected=true]:bg-[#21262D]"
                >
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-[#10B981]" />
                    <span className="font-medium">{lesson.title}</span>
                  </div>
                  <span className="text-xs text-[#7D8590] font-mono">{lesson.estimatedMinutes} мин</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Шпаргалки */}
            <Command.Group heading="Шпаргалки инженера" className="text-xs font-semibold text-[#7D8590] px-2 py-1.5 uppercase tracking-wider mt-2 border-t border-[#21262D]/50 pt-2">
              {MODULES.map((mod) => (
                <Command.Item
                  key={`cs-${mod.id}`}
                  value={`шпаргалка cheat sheet ${mod.title}`}
                  onSelect={() => {
                    onClose();
                    onOpenCheatSheets(mod.slug);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#E6EDF3] hover:bg-[#21262D] cursor-pointer transition-colors group data-[selected=true]:bg-[#21262D]"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-[#38BDF8]" />
                    <span>Шпаргалка: {mod.title}</span>
                  </div>
                  <span className="text-xs text-[#38BDF8] bg-[#38BDF8]/10 px-1.5 py-0.5 rounded">Справочник</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Вопросы собеседований */}
            <Command.Group heading="Вопросы с собеседований" className="text-xs font-semibold text-[#7D8590] px-2 py-1.5 uppercase tracking-wider mt-2 border-t border-[#21262D]/50 pt-2">
              {interviewQuestions.slice(0, 15).map((q) => (
                <Command.Item
                  key={q.id}
                  value={`вопрос собеседование ${q.question} ${q.moduleTitle} ${q.level}`}
                  onSelect={() => {
                    onClose();
                    onOpenInterviews(q.moduleSlug);
                  }}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-[#E6EDF3] hover:bg-[#21262D] cursor-pointer transition-colors group data-[selected=true]:bg-[#21262D]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <HelpCircle className="w-4 h-4 text-[#FACC15] shrink-0" />
                    <span className="truncate">{q.question}</span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium ${
                    q.level === 'Senior'
                      ? 'text-red-400 bg-red-400/10'
                      : q.level === 'Middle'
                      ? 'text-yellow-400 bg-yellow-400/10'
                      : 'text-emerald-400 bg-emerald-400/10'
                  }`}>
                    {q.level}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-[#21262D] bg-[#090C10] flex items-center justify-between text-xs text-[#7D8590]">
            <div className="flex items-center gap-3">
              <span>↑↓ для навигации</span>
              <span>↵ для перехода</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>17 разделов • 100% практический стек</span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
};
