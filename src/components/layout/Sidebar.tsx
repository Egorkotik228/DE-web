'use client';

import React, { useState } from 'react';
import { MODULES } from '@/data/modules';
import { useProgress } from '@/hooks/useProgress';
import { TechIcon } from '@/components/ui/TechIcon';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

interface SidebarProps {
  activeModuleSlug?: string;
  onSelectModule?: (slug: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeModuleSlug, onSelectModule }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { getModuleProgress } = useProgress();

  return (
    <aside
      className={`h-full border-r border-[#21262D] bg-[#090C10] flex flex-col shrink-0 transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-[280px]'
      }`}
    >
      {/* Sidebar Header */}
      <div className="h-12 px-3.5 border-b border-[#21262D] flex items-center justify-between text-xs font-semibold text-[#7D8590]">
        {!isCollapsed && (
          <span className="uppercase tracking-wider text-[11px] font-mono">Стек программы (17)</span>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#151B23] hover:text-[#E6EDF3] transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          }`}
          title={isCollapsed ? 'Развернуть меню' : 'Свернуть меню («)'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Module List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-[#21262D]">
        {MODULES.map((mod) => {
          const { completed, total, percent, isCompleted } = getModuleProgress(mod.slug);
          const isActive = mod.slug === activeModuleSlug;

          return (
            <button
              key={mod.id}
              onClick={() => onSelectModule && onSelectModule(mod.slug)}
              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all group ${
                isActive
                  ? 'bg-[#151B23] border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                  : 'hover:bg-[#151B23]/70 border border-transparent'
              }`}
              title={`${mod.title} (${completed}/${total})`}
            >
              {/* Tech Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                  isCompleted
                    ? 'bg-[#0D211B] border-emerald-500/40 text-emerald-400'
                    : 'bg-[#151B23] border-[#21262D] text-[#7D8590] group-hover:border-[#30363D]'
                }`}
              >
                <TechIcon slug={mod.slug} size={16} />
              </div>

              {/* Module Info (hidden when collapsed) */}
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-medium text-[#E6EDF3] truncate group-hover:text-white">
                      {mod.title}
                    </span>
                    <span className="text-[11px] font-mono text-[#7D8590] shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
                      ) : (
                        `(${completed}/${total})`
                      )}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-[#21262D] overflow-hidden">
                    <div
                      className="h-full bg-[#10B981] rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Sidebar Footer Link */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#21262D] text-[11px] text-[#7D8590] flex items-center justify-between font-mono">
          <span>DE Academy v1.0</span>
          <span className="text-emerald-400">100% Free</span>
        </div>
      )}
    </aside>
  );
};
