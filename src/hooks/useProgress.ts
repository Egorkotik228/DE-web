'use client';

import { useState, useCallback, useEffect } from 'react';
import { MODULES } from '@/data/modules';
import { syncLocalToCloud, fetchCloudProgress } from '@/lib/supabase/sync';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase/client';

const STORAGE_KEY = 'de_academy_user_progress_v1';

export interface ProgressState {
  userName: string;
  streakDays: number;
  lastActiveDate: string;
  timezone: string;
  completedLessonIds: string[];
  fixedBrokenProdIds: string[];
  bookmarkedLessonIds: string[];
  demoModuleCompletions: Record<string, number>;
  activityHistory: Record<string, number>; // 'YYYY-MM-DD': count
}

/**
 * Получение текущей даты в формате YYYY-MM-DD для заданного часового пояса
 */
export function getTodayInTimezone(timezone: string = 'Europe/Moscow'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Расчет разницы в календарных днях между двумя датами YYYY-MM-DD
 */
function getDayDifference(dateA: string, dateB: string): number {
  if (!dateA || !dateB) return 999;
  const tA = new Date(dateA + 'T00:00:00Z').getTime();
  const tB = new Date(dateB + 'T00:00:00Z').getTime();
  return Math.round((tB - tA) / (1000 * 60 * 60 * 24));
}

const DEFAULT_TIMEZONE = 'Europe/Moscow';
const INITIAL_TODAY = '2026-11-01';

const DEFAULT_STATE: ProgressState = {
  userName: 'Александр',
  streakDays: 5,
  lastActiveDate: INITIAL_TODAY,
  timezone: DEFAULT_TIMEZONE,
  completedLessonIds: ['intro-1', 'intro-2', 'sql-window-functions', 'dwh-star-schema'],
  fixedBrokenProdIds: ['intro-1', 'sql-window-functions'],
  bookmarkedLessonIds: ['sql-window-functions'],
  demoModuleCompletions: {
    intro: 6, // 6/6
    sql: 14,  // 14/20
    python: 8, // 8/15
    pandas: 0,
    postgresql: 0,
    dwh: 3,
    'data-vault': 0,
    'linux-git': 0,
    docker: 0,
    airflow: 2,
    dbt: 1,
    'formats-s3': 0,
    hadoop: 0,
    spark: 0,
    clickhouse: 0,
    kafka: 0,
    'system-design': 0,
  },
  activityHistory: {
    '2026-10-28': 2,
    '2026-10-29': 3,
    '2026-10-30': 1,
    '2026-10-31': 4,
    '2026-11-01': 3,
  },
};

export function useProgress() {
  const [state, setState] = useState<ProgressState>(() => {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          fixedBrokenProdIds: parsed.fixedBrokenProdIds || DEFAULT_STATE.fixedBrokenProdIds,
          activityHistory: parsed.activityHistory || DEFAULT_STATE.activityHistory,
          timezone: parsed.timezone || DEFAULT_TIMEZONE,
          demoModuleCompletions: {
            ...DEFAULT_STATE.demoModuleCompletions,
            ...(parsed.demoModuleCompletions || {}),
          },
        };
      }
    } catch {
      // fallback
    }
    return DEFAULT_STATE;
  });

  // Автоматическая фоновая синхронизация с Supabase при монтировании (если пользователь залогинен)
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchCloudProgress().then((cloudData) => {
          if (cloudData) {
            setState((prev) => {
              const mergedCompleted = Array.from(
                new Set([...prev.completedLessonIds, ...cloudData.completedLessonIds])
              );
              const mergedBroken = Array.from(
                new Set([...prev.fixedBrokenProdIds, ...cloudData.fixedBrokenProdIds])
              );
              return {
                ...prev,
                completedLessonIds: mergedCompleted,
                fixedBrokenProdIds: mergedBroken,
                streakDays: Math.max(prev.streakDays, cloudData.streakDays),
              };
            });
          }
        });
      }
    });
  }, []);

  const saveState = useCallback((updater: (prev: ProgressState) => ProgressState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
      } catch {
        // ignore storage errors
      }

      // Если подключен Supabase, делаем фоновую синхронизацию
      if (isSupabaseConfigured) {
        syncLocalToCloud(next).catch(() => {});
      }

      return next;
    });
  }, []);

  const markLessonCompleted = useCallback(
    (lessonId: string, moduleSlug?: string, isBrokenProd?: boolean) => {
      saveState((prev) => {
        const today = getTodayInTimezone(prev.timezone);
        const dayDiff = getDayDifference(prev.lastActiveDate, today);

        let nextStreak = prev.streakDays;
        if (dayDiff === 1) {
          // Занятие на следующий календарный день подряд
          nextStreak += 1;
        } else if (dayDiff > 1) {
          // Пропущен 1 или более дней
          nextStreak = 1;
        } else if (!prev.lastActiveDate) {
          nextStreak = 1;
        }

        const isAlreadyCompleted = prev.completedLessonIds.includes(lessonId);
        const nextCompleted = isAlreadyCompleted
          ? prev.completedLessonIds
          : [...prev.completedLessonIds, lessonId];

        const nextBroken = isBrokenProd && !prev.fixedBrokenProdIds.includes(lessonId)
          ? [...prev.fixedBrokenProdIds, lessonId]
          : prev.fixedBrokenProdIds;

        const nextDemo = { ...prev.demoModuleCompletions };
        if (moduleSlug && !isAlreadyCompleted) {
          nextDemo[moduleSlug] = (nextDemo[moduleSlug] || 0) + 1;
        }

        const nextActivity = { ...prev.activityHistory };
        nextActivity[today] = (nextActivity[today] || 0) + 1;

        return {
          ...prev,
          completedLessonIds: nextCompleted,
          fixedBrokenProdIds: nextBroken,
          demoModuleCompletions: nextDemo,
          streakDays: nextStreak,
          lastActiveDate: today,
          activityHistory: nextActivity,
        };
      });
    },
    [saveState]
  );

  const toggleBookmark = useCallback(
    (lessonId: string) => {
      saveState((prev) => {
        const exists = prev.bookmarkedLessonIds.includes(lessonId);
        return {
          ...prev,
          bookmarkedLessonIds: exists
            ? prev.bookmarkedLessonIds.filter((id) => id !== lessonId)
            : [...prev.bookmarkedLessonIds, lessonId],
        };
      });
    },
    [saveState]
  );

  const setUserName = useCallback(
    (userName: string) => {
      saveState((prev) => ({ ...prev, userName }));
    },
    [saveState]
  );

  const setTimezone = useCallback(
    (timezone: string) => {
      saveState((prev) => ({ ...prev, timezone }));
    },
    [saveState]
  );

  const resetProgress = useCallback(() => {
    const freshState: ProgressState = {
      userName: state.userName || 'Инженер данных',
      streakDays: 0,
      lastActiveDate: '',
      timezone: state.timezone || DEFAULT_TIMEZONE,
      completedLessonIds: [],
      fixedBrokenProdIds: [],
      bookmarkedLessonIds: [],
      demoModuleCompletions: {
        intro: 0,
        sql: 0,
        python: 0,
        pandas: 0,
        postgresql: 0,
        dwh: 0,
        'data-vault': 0,
        'linux-git': 0,
        docker: 0,
        airflow: 0,
        dbt: 0,
        'formats-s3': 0,
        hadoop: 0,
        spark: 0,
        clickhouse: 0,
        kafka: 0,
        'system-design': 0,
      },
      activityHistory: {},
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(freshState));
        // Удаляем сохраненные черновики кода
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('draft_normal_') || key.startsWith('draft_broken_')) {
            localStorage.removeItem(key);
          }
        });
      } catch {
        // ignore
      }
    }

    setState(freshState);
  }, [state.userName, state.timezone]);

  const exportBackup = useCallback(() => {
    if (typeof window === 'undefined') return;
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      state,
      drafts: {} as Record<string, string>,
    };

    // Сбор всех черновиков
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('draft_normal_') || key.startsWith('draft_broken_'))) {
        backupData.drafts[key] = localStorage.getItem(key) || '';
      }
    }

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `de-academy-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state]);

  const importBackup = useCallback(
    (jsonString: string): boolean => {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || !parsed.state) {
          throw new Error('Некорректная структура резервной копии');
        }

        const importedState: ProgressState = {
          ...DEFAULT_STATE,
          ...parsed.state,
        };

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(importedState));
          if (parsed.drafts && typeof parsed.drafts === 'object') {
            Object.entries(parsed.drafts).forEach(([k, v]) => {
              if (typeof v === 'string') {
                localStorage.setItem(k, v);
              }
            });
          }
        }

        setState(importedState);
        return true;
      } catch (err) {
        console.error('Ошибка импорта бэкапа:', err);
        return false;
      }
    },
    []
  );

  const getModuleProgress = useCallback(
    (slug: string) => {
      const mod = MODULES.find((m) => m.slug === slug);
      const total = mod ? mod.totalLessons : 10;
      const completed = state.demoModuleCompletions[slug] ?? 0;
      const percent = Math.min(100, Math.round((completed / total) * 100));
      const isCompleted = completed >= total;
      const isActive = completed > 0 && !isCompleted;
      return { completed, total, percent, isCompleted, isActive };
    },
    [state.demoModuleCompletions]
  );

  const totalCompletedLessons = Object.values(state.demoModuleCompletions).reduce(
    (acc, v) => acc + v,
    0
  );

  const totalCourseLessons = MODULES.reduce((acc, m) => acc + m.totalLessons, 0);

  const overallPercent = Math.round((totalCompletedLessons / totalCourseLessons) * 100);

  return {
    isLoaded: true,
    userName: state.userName,
    streakDays: state.streakDays,
    timezone: state.timezone,
    completedLessonIds: state.completedLessonIds,
    fixedBrokenProdIds: state.fixedBrokenProdIds,
    bookmarkedLessonIds: state.bookmarkedLessonIds,
    activityHistory: state.activityHistory,
    getModuleProgress,
    markLessonCompleted,
    toggleBookmark,
    setUserName,
    setTimezone,
    resetProgress,
    exportBackup,
    importBackup,
    totalCompletedLessons,
    totalBrokenProdFixed: state.fixedBrokenProdIds.length,
    totalCourseLessons,
    overallPercent,
  };
}