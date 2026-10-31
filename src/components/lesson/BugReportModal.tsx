'use client';

import React, { useState } from 'react';
import { X, Bug, Check, Send } from 'lucide-react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonTitle: string;
  currentCode: string;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  lessonTitle,
  currentCode,
}) => {
  const [reportText, setReportText] = useState('');
  const [category, setCategory] = useState<'typo' | 'code-bug' | 'explanation' | 'other'>('code-bug');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setReportText('');
      onClose();
    }, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#151B23] border border-[#21262D] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#21262D]">
          <div className="flex items-center gap-2.5 text-amber-400">
            <Bug className="w-5 h-5" />
            <h3 className="text-sm font-bold text-[#E6EDF3]">Сообщить о неточности в уроке</h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#7D8590] hover:text-[#E6EDF3] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSent ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-[#E6EDF3]">Спасибо за обратную связь!</h4>
            <p className="text-xs text-[#7D8590]">Инженеры DE Academy рассмотрят репорт в ближайшем релизе.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-[#090C10] border border-[#21262D] rounded-lg p-3 text-[11px] font-mono text-[#7D8590] space-y-1">
              <div>Урок: <span className="text-[#E6EDF3]">{lessonTitle}</span> ({lessonId})</div>
              <div>Код пользователя: <span className="text-emerald-400">{currentCode.length} символов прикреплено</span></div>
            </div>

            <div>
              <label className="text-xs text-[#7D8590] block mb-1">Тип проблемы:</label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as 'typo' | 'code-bug' | 'explanation' | 'other'
                  )
                }
                className="w-full bg-[#090C10] border border-[#21262D] rounded-lg px-3 py-2 text-xs text-[#E6EDF3] focus:outline-none focus:border-emerald-500"
              >
                <option value="code-bug">Ошибка в коде / тесте / seedCode</option>
                <option value="explanation">Неточность в теории или формулировке</option>
                <option value="typo">Опечатка в тексте</option>
                <option value="other">Другое</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-[#7D8590] block mb-1">Описание проблемы:</label>
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="Опишите, в чем заключается ошибка или как ее воспроизвести..."
                rows={4}
                required
                className="w-full bg-[#090C10] border border-[#21262D] rounded-lg p-3 text-xs text-[#E6EDF3] placeholder-[#7D8590] focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[#7D8590] hover:bg-[#21262D] transition-colors"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить репорт</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
