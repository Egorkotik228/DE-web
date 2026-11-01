'use client';

import React, { useState, useMemo, useRef, useSyncExternalStore } from 'react';
import { MODULES } from '@/data/modules';
import { useProgress, getTodayInTimezone } from '@/hooks/useProgress';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  X,
  Flame,
  Trophy,
  Copy,
  Check,
  FileCheck,
  Sparkles,
  User,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Globe,
  Lock,
  CheckCircle2,
  Cloud,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emptySubscribe = () => () => {};

const TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва / Санкт-Петербург (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const {
    userName,
    streakDays,
    timezone,
    totalCompletedLessons,
    totalBrokenProdFixed,
    totalCourseLessons,
    overallPercent,
    activityHistory,
    getModuleProgress,
    setUserName,
    setTimezone,
    exportBackup,
    importBackup,
    resetProgress,
  } = useProgress();

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const [activeTab, setActiveTab] = useState<'dashboard' | 'resume' | 'settings'>('dashboard');
  const [copied, setCopied] = useState(false);
  const [customName, setCustomName] = useState<string | null>(null);
  const currentDisplayName = customName !== null ? customName : userName;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute 18-week contribution grid
  const calendarData = useMemo(() => {
    if (!isMounted) {
      return { weeks: [], todayStr: '' };
    }
    const todayStr = getTodayInTimezone(timezone);
    const today = new Date(todayStr + 'T00:00:00Z');

    // Find previous Monday for the end of the window
    const dayOfWeek = (today.getUTCDay() + 6) % 7; // 0 = Mon, 6 = Sun
    const currentWeekEnd = new Date(today.getTime() + (6 - dayOfWeek) * 24 * 60 * 60 * 1000);

    const totalWeeks = 18;
    const totalDays = totalWeeks * 7;
    const startDate = new Date(currentWeekEnd.getTime() - (totalDays - 1) * 24 * 60 * 60 * 1000);

    const weeks: { dateStr: string; count: number; isToday: boolean; isFuture: boolean }[][] = [];

    for (let w = 0; w < totalWeeks; w++) {
      const weekDays: { dateStr: string; count: number; isToday: boolean; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const curDate = new Date(startDate.getTime() + (w * 7 + d) * 24 * 60 * 60 * 1000);
        const dateStr = curDate.toISOString().split('T')[0];
        const isToday = dateStr === todayStr;
        const isFuture = curDate.getTime() > today.getTime();
        const count = isFuture ? 0 : (activityHistory[dateStr] || 0);

        weekDays.push({ dateStr, count, isToday, isFuture });
      }
      weeks.push(weekDays);
    }

    return { weeks, todayStr };
  }, [isMounted, timezone, activityHistory]);

  if (!isOpen) return null;

  // Gather bullet points for unlocked modules
  const unlockedModules = MODULES.filter((m) => getModuleProgress(m.slug).completed > 0);
  const lockedModules = MODULES.filter((m) => getModuleProgress(m.slug).completed === 0);

  const unlockedBullets = unlockedModules.flatMap((m) => m.resumeBulletPoints);

  const fullResumeText = `РЕЗЮМЕ DATA ENGINEER / ИНЖЕНЕР ДАННЫХ

КЛЮЧЕВЫЕ НАВЫКИ И ПРОИЗВОДСТВЕННЫЙ ОПЫТ:
${unlockedBullets.length > 0 ? unlockedBullets.map((b) => `• ${b}`).join('\n') : '• Пройдите первые разделы курса для генерации формулировок опыта'}

СТЕК ТЕХНОЛОГИЙ:
SQL, Python 3.11, PostgreSQL, Pandas, Apache Spark (PySpark), Data Vault 2.0, Star/Snowflake Schema, Docker, Apache Airflow, dbt, ClickHouse, Apache Kafka, Apache Iceberg/Parquet, S3.`;

  const handleCopyResume = () => {
    navigator.clipboard.writeText(fullResumeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentDisplayName.trim()) {
      setUserName(currentDisplayName.trim());
      setCustomName(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const success = importBackup(content);
        if (success) {
          setImportNotice('✅ Прогресс и черновики успешно восстановлены из файла!');
        } else {
          setImportNotice('❌ Ошибка: неверный формат файла бэкапа');
        }
        setTimeout(() => setImportNotice(null), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Readiness evaluation
  const readinessTier =
    overallPercent >= 75 ? 'Middle Data Engineer' : overallPercent >= 40 ? 'Junior+ Data Engineer' : 'Junior Data Engineer';

  const readinessPercent = Math.min(100, Math.round(overallPercent * 1.25));

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        onClick={onClose}
      >
        <div
          className="w-full max-w-3xl bg-[#151B23] border border-[#21262D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="h-16 px-6 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#E6EDF3] flex items-center gap-2">
                  <span>{userName}</span>
                  <span className="text-[11px] font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    {readinessTier}
                  </span>
                </h2>
                <p className="text-xs text-[#7D8590]">Личный кабинет студента DE Academy</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#21262D] bg-[#090C10] px-6 gap-2 shrink-0">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>Дашборд и Стрик</span>
            </button>

            <button
              onClick={() => setActiveTab('resume')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'resume'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Генератор резюме (HH / LinkedIn)</span>
              {unlockedBullets.length > 0 && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full font-mono">
                  {unlockedBullets.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 py-3 px-3.5 text-xs font-medium border-b-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-emerald-400 text-emerald-400'
                  : 'border-transparent text-[#7D8590] hover:text-[#E6EDF3]'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Настройки и Безопасность</span>
            </button>
          </div>

          {/* Tab 1: Dashboard & Streak */}
          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#21262D]">
              {/* Quick Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#7D8590]">Ударный стрик</span>
                    <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#E6EDF3]">{streakDays} дн</div>
                  <div className="text-[10px] text-amber-400/80 mt-0.5">В часовом поясе {timezone.split('/')[1] || timezone}</div>
                </div>

                <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#7D8590]">Уроков пройдено</span>
                    <Trophy className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#E6EDF3]">
                    {totalCompletedLessons} <span className="text-xs text-[#7D8590]">/ {totalCourseLessons}</span>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">{overallPercent}% программы</div>
                </div>

                <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#7D8590]">Сломанный прод</span>
                    <Flame className="w-4 h-4 text-rose-500 fill-rose-500/30" />
                  </div>
                  <div className="text-xl font-bold font-mono text-rose-400">{totalBrokenProdFixed}</div>
                  <div className="text-[10px] text-[#7D8590] mt-0.5">аварий починено</div>
                </div>

                <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-3.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-[#7D8590]">Готовность к офферу</span>
                    <Sparkles className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <div className="text-xl font-bold font-mono text-[#38BDF8]">{readinessPercent}%</div>
                  <div className="text-[10px] text-[#38BDF8]/80 mt-0.5">{readinessTier}</div>
                </div>
              </div>

              {/* Course Progress Bar */}
              <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#7D8590]">Общий прогресс курса</span>
                  <span className="font-mono text-emerald-400 font-medium">{overallPercent}% завершено</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#21262D] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    style={{ width: `${overallPercent}%` }}
                  />
                </div>
              </div>

              {/* GitHub-like Contribution Calendar */}
              <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-[#E6EDF3]">Календарь активности (последние 18 недель)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#7D8590]">
                    <span>Меньше</span>
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#161B22]" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#0e4429]" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#006d32]" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#26a641]" />
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#39d353]" />
                    <span>Больше</span>
                  </div>
                </div>

                <div className="overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-[#21262D]">
                  <div className="flex gap-1 min-w-[500px]">
                    {calendarData.weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-1">
                        {week.map((day, dIdx) => {
                          let bgClass = 'bg-[#161B22]';
                          if (day.count === 1) bgClass = 'bg-[#0e4429]';
                          else if (day.count === 2) bgClass = 'bg-[#006d32]';
                          else if (day.count === 3) bgClass = 'bg-[#26a641]';
                          else if (day.count >= 4) bgClass = 'bg-[#39d353]';

                          return (
                            <div
                              key={dIdx}
                              title={`${day.dateStr}: ${day.count} решенных задач`}
                              className={`w-3 h-3 rounded-[2px] transition-transform hover:scale-125 cursor-pointer ${bgClass} ${
                                day.isToday ? 'ring-1 ring-emerald-400' : ''
                              }`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Backup & Restore Bar */}
              <div className="border border-[#21262D] rounded-xl bg-[#090C10] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-[#E6EDF3]">Резервная копия прогресса</div>
                  <div className="text-[11px] text-[#7D8590]">Экспортируйте свои черновики кода и стрик в JSON файл</div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={exportBackup}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-xs text-[#E6EDF3] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Экспорт JSON</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-xs text-[#E6EDF3] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Импорт JSON</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                </div>
              </div>

              {importNotice && (
                <div className="p-3 rounded-xl bg-[#090C10] border border-[#21262D] text-xs text-[#E6EDF3] text-center animate-in fade-in">
                  {importNotice}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Resume Generator */}
          {activeTab === 'resume' && (
            <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#21262D]">
              {/* Top Banner with Copy Button */}
              <div className="border border-[#21262D] rounded-xl bg-[#090C10] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-[#E6EDF3]">
                      Формулировки достижений для резюме
                    </h3>
                  </div>
                  <p className="text-xs text-[#7D8590] mt-1">
                    Разблокировано <span className="font-mono text-emerald-400 font-bold">{unlockedBullets.length}</span> пунктов из {MODULES.flatMap((m) => m.resumeBulletPoints).length}
                  </p>
                </div>

                <button
                  onClick={handleCopyResume}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-black transition-colors shrink-0 shadow-lg shadow-emerald-500/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Скопировано в буфер!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Скопировать весь блок резюме</span>
                    </>
                  )}
                </button>
              </div>

              {/* Ready Formatted Preview */}
              <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-2">
                <div className="text-xs font-medium text-[#7D8590]">Текстовое превью для вставки в HH.ru / Хабр Карьера:</div>
                <div className="bg-[#151B23] border border-[#21262D] rounded-lg p-3 text-xs text-[#E6EDF3] font-mono leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                  {fullResumeText}
                </div>
              </div>

              {/* Module-by-module cards */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#7D8590] uppercase tracking-wider">
                  Разблокированные разделы программы
                </div>

                {/* Unlocked modules */}
                {unlockedModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-4 rounded-xl bg-[#090C10] border border-emerald-500/30 space-y-2.5 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-[#E6EDF3]">{mod.title}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        Разблокировано
                      </span>
                    </div>

                    <ul className="space-y-1.5 pl-5 list-disc text-xs text-[#E6EDF3]/90 leading-relaxed">
                      {mod.resumeBulletPoints.map((bullet, idx) => (
                        <li key={idx} className="marker:text-emerald-400">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}

                {/* Locked modules */}
                {lockedModules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-3.5 rounded-xl bg-[#090C10]/60 border border-[#21262D] space-y-2 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#7D8590]" />
                        <span className="text-xs font-medium text-[#7D8590]">{mod.title}</span>
                      </div>
                      <span className="text-[10px] text-[#7D8590]">Пройдите уроки раздела</span>
                    </div>

                    <ul className="space-y-1 pl-5 list-disc text-xs text-[#7D8590]/70">
                      {mod.resumeBulletPoints.map((bullet, idx) => (
                        <li key={idx} className="blur-[1px] select-none">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Settings & Security */}
          {activeTab === 'settings' && (
            <div className="p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-[#21262D]">
              {/* User Profile Info */}
              <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-4">
                <h3 className="text-xs font-semibold text-[#E6EDF3]">Имя пользователя</h3>
                <form onSubmit={handleSaveName} className="flex gap-2">
                  <input
                    type="text"
                    value={currentDisplayName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="flex-1 bg-[#151B23] border border-[#21262D] rounded-xl px-3.5 py-2 text-xs text-[#E6EDF3] focus:outline-none focus:border-emerald-500"
                    placeholder="Введите ваше имя"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs rounded-xl transition-colors"
                  >
                    Сохранить
                  </button>
                </form>
              </div>

              {/* Timezone Selector for Streaks */}
              <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E6EDF3]">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Часовой пояс для расчета стрика</span>
                </div>
                <p className="text-xs text-[#7D8590]">
                  Стрик обновляется в полночь по выбранному часовому поясу, независимо от серверного времени UTC.
                </p>

                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-[#151B23] border border-[#21262D] rounded-xl px-3.5 py-2.5 text-xs text-[#E6EDF3] focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Supabase Cloud Connection Status */}
              <div className="bg-[#090C10] border border-[#21262D] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-[#38BDF8]" />
                    <span className="text-xs font-semibold text-[#E6EDF3]">Облачная синхронизация (Supabase)</span>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                      isSupabaseConfigured
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}
                  >
                    {isSupabaseConfigured ? 'Supabase активен' : 'Автономный режим (LocalStorage)'}
                  </span>
                </div>

                <p className="text-xs text-[#7D8590]">
                  {isSupabaseConfigured
                    ? 'Облачное хранилище настроено. Вы можете войти через GitHub или Google для синхронизации решений между устройствами.'
                    : 'В автономном режиме все данные хранятся прямо в вашем браузере. Вы можете экспортировать JSON бэкап в любой момент.'}
                </p>

                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151B23] hover:bg-[#21262D] border border-[#21262D] text-xs text-[#E6EDF3] transition-colors"
                >
                  <span>Управление авторизацией и облаком</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Danger Zone: Reset Progress */}
              <div className="border border-rose-500/30 rounded-xl bg-rose-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Опасная зона: Сброс прогресса</span>
                </div>
                <p className="text-xs text-[#7D8590]">
                  Сброс очистит все пройденные уроки, стрик, историю активности и сохраненные черновики кода в браузере. Это действие необратимо.
                </p>

                {showResetConfirm ? (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        resetProgress();
                        setShowResetConfirm(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors"
                    >
                      Да, точно сбросить всё
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-[#21262D] hover:bg-[#30363D] text-[#E6EDF3] text-xs transition-colors"
                    >
                      Отмена
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Сбросить весь прогресс</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal nested */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};