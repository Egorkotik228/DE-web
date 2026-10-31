'use client';

import React from 'react';
import Link from 'next/link';
import { useProgress } from '@/hooks/useProgress';
import { Search, FileText, HelpCircle, Flame, User, Terminal } from 'lucide-react';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenCheatSheets: () => void;
  onOpenInterviews: () => void;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenCheatSheets,
  onOpenInterviews,
  onOpenProfile,
}) => {
  const { userName, streakDays, totalCompletedLessons, totalCourseLessons } = useProgress();

  return (
    <header className="h-16 border-b border-[#21262D] bg-[#090C10] px-6 flex items-center justify-between shrink-0 select-none z-30">
      {/* Слева: Логотип и бейдж */}
      <div className="flex items-center gap-3.5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)] border border-emerald-400/30">
            <Terminal className="w-5 h-5 text-black stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-[#E6EDF3] group-hover:text-emerald-400 transition-colors font-mono">
              DE ACADEMY
            </span>
          </div>
        </Link>

        <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full hidden sm:inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          С нуля до Data Engineer
        </span>
      </div>

      {/* По центру: Строка глобального поиска (Ctrl + K) */}
      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-[#151B23] border border-[#21262D] hover:border-[#30363D] text-xs text-[#7D8590] transition-colors group cursor-pointer shadow-inner"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-[#7D8590] group-hover:text-[#E6EDF3] transition-colors" />
            <span className="text-[#7D8590] group-hover:text-[#E6EDF3] transition-colors">
              Поиск по курсу, шпаргалкам и терминам...
            </span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-1 font-mono text-[10px] text-[#7D8590] bg-[#090C10] border border-[#21262D] rounded px-1.5 py-0.5">
            Ctrl + K
          </kbd>
        </button>
      </div>

      {/* Справа: Справочники и Виджет профиля */}
      <div className="flex items-center gap-2.5">
        {/* Кнопка Шпаргалки */}
        <button
          onClick={onOpenCheatSheets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-[#E6EDF3] transition-colors cursor-pointer"
        >
          <FileText className="w-3.5 h-3.5 text-[#38BDF8]" />
          <span className="hidden sm:inline">Шпаргалки</span>
        </button>

        {/* Кнопка Вопросы с собеседований */}
        <button
          onClick={onOpenInterviews}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-[#E6EDF3] transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Вопросы с собеседований</span>
        </button>

        <div className="h-4 w-[1px] bg-[#21262D] mx-1 hidden sm:block" />

        {/* Виджет профиля пользователя (Строго в правом верхнем углу) */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] hover:border-[#30363D] transition-colors cursor-pointer group"
          title="Открыть профиль и генератор резюме"
        >
          {/* Стрик */}
          <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
            <span>{streakDays} дн</span>
          </div>

          {/* Имя и счетчик */}
          <div className="flex flex-col text-left hidden sm:flex">
            <span className="text-xs font-medium text-[#E6EDF3] leading-none group-hover:text-emerald-400 transition-colors">
              {userName}
            </span>
            <span className="text-[10px] font-mono text-[#7D8590] leading-tight mt-0.5">
              {totalCompletedLessons}/{totalCourseLessons} уроков
            </span>
          </div>

          {/* Аватарка */}
          <div className="w-7 h-7 rounded-full bg-[#090C10] border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>
    </header>
  );
};
