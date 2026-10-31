'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { SkillTree } from '@/components/course/SkillTree';
import { CommandPalette } from '@/components/modals/CommandPalette';
import { CheatSheetsDrawer } from '@/components/drawers/CheatSheetsDrawer';
import { InterviewsDrawer } from '@/components/drawers/InterviewsDrawer';
import { ProfileModal } from '@/components/profile/ProfileModal';

export default function HomePage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCheatSheetsOpen, setIsCheatSheetsOpen] = useState(false);
  const [isInterviewsOpen, setIsInterviewsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedDrawerSlug, setSelectedDrawerSlug] = useState<string>('intro');
  const [activeSidebarSlug, setActiveSidebarSlug] = useState<string>('intro');

  const handleOpenCheatSheets = (slug?: string) => {
    if (slug) setSelectedDrawerSlug(slug);
    setIsCheatSheetsOpen(true);
  };

  const handleOpenInterviews = (slug?: string) => {
    if (slug) setSelectedDrawerSlug(slug);
    setIsInterviewsOpen(true);
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#0D1117] text-[#E6EDF3]">
      {/* Верхняя шапка */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenCheatSheets={() => handleOpenCheatSheets('intro')}
        onOpenInterviews={() => handleOpenInterviews('intro')}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Нижняя область (Сайдбар + Карта Стека) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Левая боковая панель */}
        <Sidebar
          activeModuleSlug={activeSidebarSlug}
          onSelectModule={(slug) => {
            setActiveSidebarSlug(slug);
            handleOpenCheatSheets(slug);
          }}
        />

        {/* Центральный интерактивный холст: Карта Стека (Skill Tree) */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <SkillTree />
        </main>
      </div>

      {/* Глобальный поиск (Ctrl+K) */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onOpenCheatSheets={handleOpenCheatSheets}
        onOpenInterviews={handleOpenInterviews}
      />

      {/* Drawer: Шпаргалки */}
      <CheatSheetsDrawer
        isOpen={isCheatSheetsOpen}
        onClose={() => setIsCheatSheetsOpen(false)}
        initialSlug={selectedDrawerSlug}
      />

      {/* Drawer: Вопросы с собеседований */}
      <InterviewsDrawer
        isOpen={isInterviewsOpen}
        onClose={() => setIsInterviewsOpen(false)}
        initialSlug={selectedDrawerSlug}
      />

      {/* Модалка: Профиль пользователя и Генератор резюме */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}
