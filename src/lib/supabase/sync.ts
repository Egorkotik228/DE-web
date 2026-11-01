/**
 * DE ACADEMY — Гибридный синхронизатор прогресса (Local <-> Cloud Sync)
 * Автоматически мигрирует оффлайн-прогресс и черновики из localStorage в Supabase
 */

import { getSupabase } from './client';
import { ProgressState } from '@/hooks/useProgress';

export async function syncLocalToCloud(local: ProgressState): Promise<{ success: boolean; cloudStreak?: number }> {
  const sb = getSupabase();
  if (!sb) return { success: false };

  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return { success: false };

    // 1. Обновляем профиль пользователя в Supabase
    await sb.from('profiles').upsert(
      {
        id: user.id,
        display_name: user.user_metadata?.display_name || local.userName,
        avatar_url: user.user_metadata?.avatar_url || null,
        timezone: local.timezone || 'Europe/Moscow',
      },
      { onConflict: 'id' }
    );

    // 2. Слияние выполненных уроков в user_lesson_progress
    const progressRecords = local.completedLessonIds.map((lessonId) => {
      // Ищем черновик кода из localStorage
      let savedCode = '';
      let savedBrokenCode = '';
      if (typeof window !== 'undefined') {
        savedCode = localStorage.getItem(`draft_normal_${lessonId}`) || '';
        savedBrokenCode = localStorage.getItem(`draft_broken_${lessonId}`) || '';
      }

      return {
        user_id: user.id,
        lesson_id: lessonId,
        module_slug: lessonId.split('-')[0] || 'general',
        is_completed: true,
        is_broken_prod_fixed: local.fixedBrokenProdIds?.includes(lessonId) || false,
        saved_code: savedCode || null,
        saved_broken_code: savedBrokenCode || null,
        updated_at: new Date().toISOString(),
      };
    });

    if (progressRecords.length > 0) {
      await sb.from('user_lesson_progress').upsert(progressRecords, {
        onConflict: 'user_id,lesson_id',
      });
    }

    // 3. Вызываем безопасную RPC функцию для пересчета стрика
    const { data: streakData } = await sb.rpc('get_user_streak', {
      p_user_id: user.id,
    });

    return { success: true, cloudStreak: typeof streakData === 'number' ? streakData : local.streakDays };
  } catch (err) {
    console.warn('Ошибка облачной синхронизации Supabase:', err);
    return { success: false };
  }
}

/**
 * Загрузка актуального прогресса из облака при входе с нового устройства
 */
export async function fetchCloudProgress(): Promise<{
  completedLessonIds: string[];
  fixedBrokenProdIds: string[];
  streakDays: number;
} | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return null;

    const [progRes, profRes] = await Promise.all([
      sb.from('user_lesson_progress').select('lesson_id, is_completed, is_broken_prod_fixed').eq('user_id', user.id),
      sb.from('profiles').select('streak_days').eq('id', user.id).single(),
    ]);

    const completedLessonIds: string[] = [];
    const fixedBrokenProdIds: string[] = [];

    if (progRes.data) {
      progRes.data.forEach((row) => {
        if (row.is_completed) completedLessonIds.push(row.lesson_id);
        if (row.is_broken_prod_fixed) fixedBrokenProdIds.push(row.lesson_id);
      });
    }

    return {
      completedLessonIds,
      fixedBrokenProdIds,
      streakDays: profRes.data?.streak_days || 0,
    };
  } catch {
    return null;
  }
}
