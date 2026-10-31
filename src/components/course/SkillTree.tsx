'use client';

import React, { useRef, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { MODULES } from '@/data/modules';
import { TrackModule } from '@/types/course';
import { useProgress } from '@/hooks/useProgress';
import { TechIcon } from '@/components/ui/TechIcon';
import { CheckCircle2, Play } from 'lucide-react';

interface Tier {
  level: number;
  levelTitle: string;
  modules: TrackModule[];
}

export const SkillTree: React.FC = () => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [lines, setLines] = useState<
    { id: string; d: string; isActive: boolean; isCompleted: boolean }[]
  >([]);

  const { getModuleProgress } = useProgress();

  // Group modules by 7 levels
  const tiers: Tier[] = [
    {
      level: 1,
      levelTitle: 'Уровень 1: Старт',
      modules: MODULES.filter((m) => m.level === 1),
    },
    {
      level: 2,
      levelTitle: 'Уровень 2: Ядро и Код',
      modules: MODULES.filter((m) => m.level === 2),
    },
    {
      level: 3,
      levelTitle: 'Уровень 3: СУБД и Моделирование DWH',
      modules: MODULES.filter((m) => m.level === 3),
    },
    {
      level: 4,
      levelTitle: 'Уровень 4: Enterprise Хранилища',
      modules: MODULES.filter((m) => m.level === 4),
    },
    {
      level: 5,
      levelTitle: 'Уровень 5: Инфраструктура и Оркестрация',
      modules: MODULES.filter((m) => m.level === 5),
    },
    {
      level: 6,
      levelTitle: 'Уровень 6: Big Data, Lakehouse & Streaming',
      modules: MODULES.filter((m) => m.level === 6),
    },
    {
      level: 7,
      levelTitle: 'Уровень 7: Финальный босс',
      modules: MODULES.filter((m) => m.level === 7),
    },
  ];

  // Calculate SVG connector lines between parent dependencies and child cards
  const updateLines = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLines: { id: string; d: string; isActive: boolean; isCompleted: boolean }[] = [];

    MODULES.forEach((mod) => {
      const childEl = cardRefs.current[mod.id];
      if (!childEl) return;
      const childRect = childEl.getBoundingClientRect();
      const childX = childRect.left + childRect.width / 2 - containerRect.left + containerRef.current!.scrollLeft;
      const childY = childRect.top - containerRect.top + containerRef.current!.scrollTop;

      mod.dependencies.forEach((parentId) => {
        const parentEl = cardRefs.current[parentId];
        if (!parentEl) return;
        const parentRect = parentEl.getBoundingClientRect();
        const parentX = parentRect.left + parentRect.width / 2 - containerRect.left + containerRef.current!.scrollLeft;
        const parentY = parentRect.bottom - containerRect.top + containerRef.current!.scrollTop;

        // Smooth cubic bezier curve from bottom of parent to top of child
        const midY = (parentY + childY) / 2;
        const d = `M ${parentX} ${parentY} C ${parentX} ${midY}, ${childX} ${midY}, ${childX} ${childY}`;

        const parentProg = getModuleProgress(parentId);
        const childProg = getModuleProgress(mod.slug);

        newLines.push({
          id: `${parentId}->${mod.id}`,
          d,
          isActive: parentProg.isCompleted || childProg.completed > 0,
          isCompleted: parentProg.isCompleted && childProg.isCompleted,
        });
      });
    });

    setLines(newLines);
  }, [getModuleProgress]);

  useLayoutEffect(() => {
    updateLines();
    const handleResize = () => updateLines();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateLines]);

  useEffect(() => {
    // Run after initial mount and font rendering
    const timer = setTimeout(updateLines, 200);
    return () => clearTimeout(timer);
  }, [updateLines]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-y-auto overflow-x-hidden p-8 bg-[#0D1117] scrollbar-thin scrollbar-thumb-[#21262D]"
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#E6EDF3 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* SVG Connectors Overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
        <defs>
          <linearGradient id="active-line-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>
        {lines.map((line) => (
          <path
            key={line.id}
            d={line.d}
            fill="none"
            stroke={line.isCompleted ? '#10B981' : line.isActive ? '#10B981' : '#21262D'}
            strokeWidth={line.isActive ? '2.5' : '1.5'}
            strokeDasharray={line.isActive ? 'none' : '4 4'}
            className={line.isActive ? 'transition-all duration-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' : ''}
          />
        ))}
      </svg>

      {/* Tiers Container */}
      <div className="relative z-10 max-w-5xl mx-auto space-y-14">
        {tiers.map((tier) => (
          <div key={tier.level} className="space-y-4">
            {/* Tier Header Badge */}
            <div className="flex items-center justify-center gap-3">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-[#21262D]" />
              <div className="px-3 py-1 rounded-full bg-[#151B23] border border-[#21262D] text-[11px] font-mono text-[#7D8590] flex items-center gap-1.5 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                {tier.levelTitle}
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-[#21262D]" />
            </div>

            {/* Modules Grid for this Tier */}
            <div className="flex flex-wrap items-stretch justify-center gap-5">
              {tier.modules.map((mod) => {
                const { completed, total, percent, isCompleted, isActive } = getModuleProgress(mod.slug);

                return (
                  <div
                    key={mod.id}
                    ref={(el) => {
                      cardRefs.current[mod.id] = el;
                    }}
                    onClick={() => router.push(`/course/${mod.slug}/1`)}
                    className={`relative w-72 rounded-xl p-4 transition-all duration-200 cursor-pointer select-none group flex flex-col justify-between ${
                      isCompleted
                        ? 'bg-[#0D211B] border border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-400'
                        : isActive
                        ? 'bg-[#151B23] border border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.12)] hover:border-emerald-400'
                        : 'bg-[#151B23] border border-[#21262D] hover:border-[#38BDF8]/40 hover:bg-[#151B23]/90'
                    }`}
                  >
                    <div>
                      {/* Top: Tech Icon, Title, Status */}
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                              isCompleted
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                                : 'bg-[#090C10] border-[#21262D] text-[#E6EDF3]'
                            }`}
                          >
                            <TechIcon slug={mod.slug} size={18} />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#E6EDF3] leading-snug group-hover:text-white transition-colors">
                              {mod.title}
                            </h3>
                            <span className="text-[11px] font-mono text-[#7D8590]">
                              {isCompleted ? (
                                <span className="text-emerald-400 flex items-center gap-1 font-medium">
                                  <CheckCircle2 className="w-3 h-3 inline" /> Пройден
                                </span>
                              ) : (
                                `${completed}/${total} уроков`
                              )}
                            </span>
                          </div>
                        </div>

                        {/* CTA Icon */}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-[#21262D] text-[#7D8590] group-hover:text-emerald-400 group-hover:bg-emerald-500/10'
                          }`}
                        >
                          <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Short Description */}
                      <p className="text-xs text-[#7D8590] line-clamp-2 leading-relaxed mb-4">
                        {mod.shortDescription}
                      </p>
                    </div>

                    {/* Bottom: Progress Bar */}
                    <div className="space-y-1.5 pt-2 border-t border-[#21262D]/60">
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#7D8590]">
                        <span>Прогресс</span>
                        <span className={isCompleted ? 'text-emerald-400 font-bold' : ''}>{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[#090C10] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-[#10B981]' : isActive ? 'bg-[#10B981]' : 'bg-[#21262D]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
