'use client';

import React, { useState } from 'react';
import { MODULES } from '@/data/modules';
import { TechIcon } from '@/components/ui/TechIcon';
import { X, FileText, Check, Copy } from 'lucide-react';

interface CheatSheetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialSlug?: string;
}

export const CheatSheetsDrawer: React.FC<CheatSheetsDrawerProps> = ({
  isOpen,
  onClose,
  initialSlug = 'intro',
}) => {
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);
  const [prevInitialSlug, setPrevInitialSlug] = useState<string>(initialSlug);
  const [copied, setCopied] = useState(false);

  // Official React pattern: adjusting state when props change
  if (initialSlug !== prevInitialSlug) {
    setPrevInitialSlug(initialSlug);
    setSelectedSlug(initialSlug);
  }

  if (!isOpen) return null;

  const currentModule = MODULES.find((m) => m.slug === selectedSlug) || MODULES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentModule.cheatSheetMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl h-full bg-[#0D1117] border-l border-[#21262D] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="h-16 px-6 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#151B23] border border-[#21262D] flex items-center justify-center text-[#38BDF8]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E6EDF3]">Инженерные шпаргалки (Cheat Sheets)</h2>
              <p className="text-xs text-[#7D8590]">Быстрый справочник синтаксиса и архитектурных правил по 17 разделам</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-[#E6EDF3] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#7D8590]" />
                  <span>Скопировать Markdown</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Module Selector (tabs) */}
          <div className="w-64 border-r border-[#21262D] bg-[#090C10] overflow-y-auto p-2 space-y-1 shrink-0 scrollbar-thin scrollbar-thumb-[#21262D]">
            <div className="px-3 py-2 text-[11px] font-semibold text-[#7D8590] uppercase tracking-wider">
              Все 17 разделов
            </div>
            {MODULES.map((mod) => {
              const isSelected = mod.slug === currentModule.slug;
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedSlug(mod.slug)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-[#151B23] text-emerald-400 font-medium border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                      : 'text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#151B23]/60'
                  }`}
                >
                  <TechIcon slug={mod.slug} size={15} />
                  <span className="truncate">{mod.title}</span>
                </button>
              );
            })}
          </div>

          {/* Right Sheet Markdown Body */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#0D1117] scrollbar-thin scrollbar-thumb-[#21262D]">
            <div className="flex items-center gap-3 pb-4 border-b border-[#21262D]">
              <div className="w-10 h-10 rounded-xl bg-[#151B23] border border-[#21262D] flex items-center justify-center">
                <TechIcon slug={currentModule.slug} size={22} />
              </div>
              <div>
                <span className="text-xs text-emerald-400 font-mono font-medium">{currentModule.levelTitle}</span>
                <h1 className="text-xl font-bold text-[#E6EDF3]">{currentModule.title}</h1>
              </div>
            </div>

            {/* Markdown rendered view */}
            <div className="prose prose-invert max-w-none text-sm text-[#E6EDF3] leading-relaxed">
              <div className="bg-[#151B23] border border-[#21262D] rounded-xl p-6 font-mono text-xs whitespace-pre-wrap leading-relaxed text-[#E6EDF3] selection:bg-emerald-900">
                {currentModule.cheatSheetMarkdown}
              </div>
            </div>

            {/* Resume bullets for this module */}
            <div className="mt-8 pt-6 border-t border-[#21262D]">
              <h3 className="text-sm font-semibold text-[#E6EDF3] mb-3 flex items-center gap-2">
                <span>💼</span> Готовые строчки для резюме (HH.ru / LinkedIn):
              </h3>
              <ul className="space-y-2">
                {currentModule.resumeBulletPoints.map((bp, i) => (
                  <li key={i} className="text-xs text-[#7D8590] flex items-start gap-2 bg-[#151B23]/40 border border-[#21262D]/60 p-2.5 rounded-lg">
                    <span className="text-emerald-400 font-bold shrink-0">•</span>
                    <span className="text-[#E6EDF3]">{bp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
