'use client';

import React, { useState } from 'react';
import { MODULES } from '@/data/modules';
import { useProgress } from '@/hooks/useProgress';
import { X, Flame, Trophy, Copy, Check, FileCheck, Sparkles, User } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { userName, streakDays, totalCompletedLessons, totalCourseLessons, overallPercent, getModuleProgress } =
    useProgress();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Gather bullet points for modules that have progress
  const activeBullets = MODULES.flatMap((m) => {
    const prog = getModuleProgress(m.slug);
    if (prog.completed > 0) {
      return m.resumeBulletPoints;
    }
    return [];
  });

  const fullResumeText = `КЛЮЧЕВЫЕ НАВЫКИ И ОПЫТ (DATA ENGINEER):\n\n` +
    activeBullets.map((b) => `• ${b}`).join('\n') +
    `\n\nСТЕК: SQL, Python, PostgreSQL, Data Vault 2.0, Docker, Airflow, dbt, Spark, ClickHouse, Kafka, Iceberg.`;

  const handleCopyResume = () => {
    navigator.clipboard.writeText(fullResumeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#151B23] border border-[#21262D] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E6EDF3] flex items-center gap-2">
                <span>{userName}</span>
                <span className="text-[11px] font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  Junior+ Data Engineer
                </span>
              </h2>
              <p className="text-xs text-[#7D8590]">Личный профиль и Генератор резюме</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-[#21262D]">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-5 h-5 fill-amber-400" />
              </div>
              <div>
                <div className="text-xs text-[#7D8590]">Ударный стрик</div>
                <div className="text-lg font-bold font-mono text-[#E6EDF3]">{streakDays} дней подряд</div>
              </div>
            </div>

            <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#7D8590]">Уроков пройдено</div>
                <div className="text-lg font-bold font-mono text-[#E6EDF3]">{totalCompletedLessons} / {totalCourseLessons}</div>
              </div>
            </div>

            <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-[#7D8590]">Прогресс стека</div>
                <div className="text-lg font-bold font-mono text-[#E6EDF3]">{overallPercent}%</div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#7D8590]">Общий прогресс курса</span>
              <span className="font-mono text-emerald-400 font-medium">{overallPercent}% завершено</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#21262D] overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>

          {/* Resume Generator Section */}
          <div className="border border-[#21262D] rounded-xl bg-[#090C10] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-[#E6EDF3]">
                  Автогенератор резюме (HH.ru / LinkedIn)
                </h3>
              </div>
              <button
                onClick={handleCopyResume}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Скопировано в буфер!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Скопировать для резюме</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-[#7D8590]">
              По мере прохождения модулей сюда автоматически добавляются профессиональные формулировки достижений:
            </p>

            <div className="bg-[#151B23] border border-[#21262D] rounded-lg p-3.5 text-xs text-[#E6EDF3] font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
              {fullResumeText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
