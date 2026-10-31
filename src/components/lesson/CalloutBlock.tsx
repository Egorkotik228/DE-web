'use client';

import React from 'react';
import { CalloutVariant } from '@/types/course';
import { Lightbulb, AlertTriangle, HelpCircle } from 'lucide-react';

interface CalloutBlockProps {
  variant: CalloutVariant;
  title: string;
  content: string;
}

export const CalloutBlock: React.FC<CalloutBlockProps> = ({ variant, title, content }) => {
  switch (variant) {
    case 'analogy':
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-[#061813] border-l-4 border-l-[#10B981] p-5 space-y-2 shadow-[0_0_20px_rgba(16,185,129,0.06)]">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
            <Lightbulb className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{title}</span>
          </div>
          <div className="text-xs text-[#E6EDF3] leading-relaxed whitespace-pre-wrap pl-7 opacity-95">
            {content}
          </div>
        </div>
      );

    case 'prod-danger':
      return (
        <div className="rounded-xl border border-amber-500/40 bg-[#1A1005] border-l-4 border-l-[#F59E0B] p-5 space-y-2 shadow-[0_0_20px_rgba(245,158,11,0.06)]">
          <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>{title}</span>
          </div>
          <div className="text-xs text-[#E6EDF3] leading-relaxed whitespace-pre-wrap pl-7 opacity-95">
            {content}
          </div>
        </div>
      );

    case 'interview':
    default:
      return (
        <div className="rounded-xl border border-purple-500/40 bg-[#120B24] border-l-4 border-l-[#8B5CF6] p-5 space-y-2 shadow-[0_0_20px_rgba(139,92,246,0.06)]">
          <div className="flex items-center gap-2.5 text-purple-400 font-bold text-sm">
            <HelpCircle className="w-5 h-5 text-purple-400 shrink-0" />
            <span>{title}</span>
          </div>
          <div className="text-xs text-[#E6EDF3] leading-relaxed whitespace-pre-wrap pl-7 opacity-95">
            {content}
          </div>
        </div>
      );
  }
};
