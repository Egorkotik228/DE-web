'use client';

import React, { useState } from 'react';
import { GlossaryTerm } from '@/types/course';
import { HelpCircle, X } from 'lucide-react';

interface GlossaryTextProps {
  content: string;
  terms: GlossaryTerm[];
}

export const GlossaryText: React.FC<GlossaryTextProps> = ({ content, terms }) => {
  const [activePopover, setActivePopover] = useState<{
    term: string;
    definition: string;
    x: number;
    y: number;
  } | null>(null);

  if (!terms || terms.length === 0) {
    return <div className="leading-relaxed whitespace-pre-wrap">{content}</div>;
  }

  // Create a regex for all terms with boundary
  // Sort terms by length descending to match longer terms first
  const sortedTerms = [...terms].sort((a, b) => b.term.length - a.term.length);
  const pattern = new RegExp(
    `(${sortedTerms.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi'
  );

  const parts = content.split(pattern);

  const handleTermClick = (e: React.MouseEvent, termStr: string) => {
    e.stopPropagation();
    const found = terms.find((t) => t.term.toLowerCase() === termStr.toLowerCase());
    if (!found) return;

    const rect = e.currentTarget.getBoundingClientRect();
    setActivePopover({
      term: found.term,
      definition: found.definition,
      x: Math.min(window.innerWidth - 320, Math.max(16, rect.left)),
      y: rect.bottom + 8,
    });
  };

  return (
    <div className="relative leading-relaxed whitespace-pre-wrap">
      {parts.map((part, index) => {
        const matchingTerm = terms.find(
          (t) => t.term.toLowerCase() === part.toLowerCase()
        );

        if (matchingTerm) {
          return (
            <span
              key={index}
              onClick={(e) => handleTermClick(e, part)}
              className="border-b border-dashed border-[#10B981]/70 text-emerald-400 font-medium cursor-help hover:bg-emerald-500/10 rounded px-0.5 transition-colors"
              title={`Термин: ${matchingTerm.term} (нажмите для описания)`}
            >
              {part}
            </span>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}

      {/* Floating Glossary Popover */}
      {activePopover && (
        <div
          className="fixed z-50 w-72 rounded-xl bg-[#151B23] border border-[#10B981]/50 shadow-2xl p-4 animate-in fade-in zoom-in-95 duration-150 text-left font-sans"
          style={{ left: activePopover.x, top: activePopover.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#21262D]">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-emerald-400">
                {activePopover.term}
              </span>
            </div>
            <button
              onClick={() => setActivePopover(null)}
              className="text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[#E6EDF3] leading-relaxed">
            {activePopover.definition}
          </p>
        </div>
      )}
    </div>
  );
};
