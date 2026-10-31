'use client';

import React from 'react';
import { Eye, ArrowDownToLine, AlertCircle } from 'lucide-react';

interface SolutionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReveal: () => void;
  onInsertCode: (code: string) => void;
  solutionCode: string;
}

export const SolutionConfirmModal: React.FC<SolutionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReveal,
  onInsertCode,
  solutionCode,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#151B23] border border-[#21262D] rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-[#E6EDF3]">
            Открыть эталонное решение?
          </h3>
          <p className="text-xs text-[#7D8590] leading-relaxed">
            Самостоятельный поиск решения тренирует инженерное мышление. Рекомендуем сначала проверить Подсказку 1 и Подсказку 2.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => {
              onInsertCode(solutionCode);
              onConfirmReveal();
              onClose();
            }}
            className="w-full py-2.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Вставить эталонное решение в редактор</span>
          </button>

          <button
            onClick={() => {
              onConfirmReveal();
              onClose();
            }}
            className="w-full py-2.5 rounded-lg text-xs font-medium bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Просто посмотреть код ответа</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 text-xs text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
          >
            Вернуться и попробовать еще раз
          </button>
        </div>
      </div>
    </div>
  );
};
