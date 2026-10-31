'use client';

import { useState, useCallback } from 'react';
import { MODULES } from '@/data/modules';

const STORAGE_KEY = 'de_academy_user_progress_v1';

export interface ProgressState {
  userName: string;
  streakDays: number;
  lastActiveDate: string;
  completedLessonIds: string[];
  bookmarkedLessonIds: string[];
  demoModuleCompletions: Record<string, number>;
}

const DEFAULT_STATE: ProgressState = {
  userName: 'Александр',
  streakDays: 5,
  lastActiveDate: new Date().toISOString().split('T')[0],
  completedLessonIds: ['intro-1', 'intro-2'],
  bookmarkedLessonIds: [],
  demoModuleCompletions: {
    intro: 6, // 6/6 completed
    sql: 14,  // 14/20 completed
    python: 8, // 8/15 completed
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
          demoModuleCompletions: {
            ...DEFAULT_STATE.demoModuleCompletions,
            ...(parsed.demoModuleCompletions || {}),
          },
        };
      }
    } catch {
      // fallback to default
    }
    return DEFAULT_STATE;
  });

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
      return next;
    });
  }, []);

  const markLessonCompleted = useCallback(
    (lessonId: string, moduleSlug?: string) => {
      saveState((prev) => {
        if (prev.completedLessonIds.includes(lessonId)) return prev;
        const nextCompleted = [...prev.completedLessonIds, lessonId];
        const nextDemo = { ...prev.demoModuleCompletions };
        if (moduleSlug) {
          nextDemo[moduleSlug] = (nextDemo[moduleSlug] || 0) + 1;
        }
        return {
          ...prev,
          completedLessonIds: nextCompleted,
          demoModuleCompletions: nextDemo,
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
    completedLessonIds: state.completedLessonIds,
    bookmarkedLessonIds: state.bookmarkedLessonIds,
    getModuleProgress,
    markLessonCompleted,
    toggleBookmark,
    totalCompletedLessons,
    totalCourseLessons,
    overallPercent,
  };
}
