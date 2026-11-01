/**
 * DE ACADEMY — Клиент Supabase с автономным гибридным режимом
 * Если ключи Supabase не заданы в .env.local, приложение работает на 100% автономно
 */

import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

export interface UserProfile {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  streakDays: number;
  lastActivityDate?: string;
  timezone: string;
}

/**
 * Получение текущего пользователя Supabase (если настроен)
 */
export async function getCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Вход через OAuth (GitHub / Google)
 */
export async function signInWithOAuth(provider: 'github' | 'google'): Promise<{ error: Error | null }> {
  const sb = getSupabase();
  if (!sb) {
    return { error: new Error('Облачная авторизация Supabase не настроена в .env.local') };
  }

  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });
    return { error };
  } catch (err: unknown) {
    return { error: err as Error };
  }
}

/**
 * Вход по Email и Паролю
 */
export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; error: Error | null }> {
  const sb = getSupabase();
  if (!sb) {
    return { user: null, error: new Error('Облачная авторизация Supabase не настроена в .env.local') };
  }

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    return { user: data.user, error };
  } catch (err: unknown) {
    return { user: null, error: err as Error };
  }
}

/**
 * Регистрация по Email и Паролю
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<{ user: User | null; error: Error | null }> {
  const sb = getSupabase();
  if (!sb) {
    return { user: null, error: new Error('Облачная авторизация Supabase не настроена в .env.local') };
  }

  try {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });
    return { user: data.user, error };
  } catch (err: unknown) {
    return { user: null, error: err as Error };
  }
}

/**
 * Выход из аккаунта
 */
export async function signOut(): Promise<{ error: Error | null }> {
  const sb = getSupabase();
  if (!sb) return { error: null };
  try {
    const { error } = await sb.auth.signOut();
    return { error };
  } catch (err: unknown) {
    return { error: err as Error };
  }
}
