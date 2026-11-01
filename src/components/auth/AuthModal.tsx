'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  LogOut,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  isSupabaseConfigured,
  signInWithOAuth,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  getSupabase,
} from '@/lib/supabase/client';
import { syncLocalToCloud } from '@/lib/supabase/sync';
import { useProgress } from '@/hooks/useProgress';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { userName, streakDays, timezone, completedLessonIds, fixedBrokenProdIds, bookmarkedLessonIds, activityHistory } = useProgress();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Check auth status on open
  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured) return;
    const sb = getSupabase();
    if (!sb) return;

    sb.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOAuth = async (provider: 'github' | 'google') => {
    setErrorMsg(null);
    setIsLoading(true);
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setErrorMsg(error.message || 'Ошибка входа через внешнего провайдера');
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email || !password) {
      setErrorMsg('Пожалуйста, заполните все обязательные поля');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Пароль должен содержать как минимум 6 символов');
      return;
    }

    setIsLoading(true);

    try {
      if (activeTab === 'login') {
        const { user, error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(
            error.message.includes('Invalid login credentials')
              ? 'Неверный email или пароль'
              : error.message
          );
        } else if (user) {
          setCurrentUser(user);
          setSuccessMsg('Успешный вход в систему!');
          // Синхронизируем прогресс
          triggerSync();
        }
      } else {
        const { user, error } = await signUpWithEmail(email, password, displayName || 'Инженер данных');
        if (error) {
          setErrorMsg(error.message);
        } else if (user) {
          setCurrentUser(user);
          setSuccessMsg('Аккаунт успешно создан! Проверьте почту для подтверждения или используйте систему.');
          triggerSync();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSync = async () => {
    setSyncStatus('Синхронизация прогресса с облаком...');
    const result = await syncLocalToCloud({
      userName,
      streakDays,
      lastActiveDate: new Date().toISOString().split('T')[0],
      timezone,
      completedLessonIds,
      fixedBrokenProdIds,
      bookmarkedLessonIds,
      demoModuleCompletions: {},
      activityHistory,
    });

    if (result.success) {
      setSyncStatus('✅ Прогресс успешно синхронизирован с базой Supabase!');
      setTimeout(() => setSyncStatus(null), 3500);
    } else {
      setSyncStatus('⚠️ Ошибка синхронизации. Попробуйте позже.');
      setTimeout(() => setSyncStatus(null), 3500);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setCurrentUser(null);
    setIsLoading(false);
    setSuccessMsg('Вы успешно вышли из аккаунта');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#151B23] border border-[#21262D] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="h-14 px-6 border-b border-[#21262D] bg-[#090C10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#E6EDF3]">
                {currentUser ? 'Профиль Supabase Cloud' : 'Авторизация в DE Academy'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#7D8590] hover:text-[#E6EDF3] hover:bg-[#21262D] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {/* Autonomy Badge when Supabase is not configured */}
          {!isSupabaseConfigured && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Автономный режим (100% LocalStorage)</span>
              </div>
              <p className="text-xs text-[#E6EDF3]/80 leading-relaxed">
                Переменные <code className="text-amber-300 font-mono text-[11px] bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> и{' '}
                <code className="text-amber-300 font-mono text-[11px] bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> еще не настроены в{' '}
                <code className="text-amber-300 font-mono text-[11px]">.env.local</code>.
              </p>
              <p className="text-[11px] text-[#7D8590] leading-relaxed">
                Все ваши решения, стрик, черновики кода и результаты тестов надежно сохраняются в браузере. Вы можете экспортировать JSON-бэкап в любой момент во вкладке настроек.
              </p>
            </div>
          )}

          {/* User Already Logged In State */}
          {currentUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#090C10] border border-[#21262D] flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-base">
                  {currentUser.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#E6EDF3] truncate">
                    {currentUser.user_metadata?.display_name || userName}
                  </div>
                  <div className="text-xs text-[#7D8590] font-mono truncate">{currentUser.email}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-medium">Облако подключено</span>
                  </div>
                </div>
              </div>

              {syncStatus && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>{syncStatus}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={triggerSync}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Синхронизировать прогресс</span>
                </button>

                <button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#090C10] hover:bg-rose-500/10 border border-[#21262D] hover:border-rose-500/30 text-rose-400 text-xs transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          )}

          {/* Not Logged In & Supabase Configured */}
          {isSupabaseConfigured && !currentUser && (
            <div className="space-y-4">
              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#090C10] hover:bg-[#21262D] border border-[#21262D] text-xs font-medium text-[#E6EDF3] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    />
                  </svg>
                  <span>GitHub</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#090C10] hover:bg-[#21262D] border border-[#21262D] text-xs font-medium text-[#E6EDF3] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-[#21262D]"></div>
                <span className="flex-shrink mx-3 text-[11px] text-[#7D8590]">или по email</span>
                <div className="flex-grow border-t border-[#21262D]"></div>
              </div>

              {/* Tabs */}
              <div className="flex bg-[#090C10] p-1 rounded-xl border border-[#21262D]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'login'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-[#7D8590] hover:text-[#E6EDF3]'
                  }`}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === 'register'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'text-[#7D8590] hover:text-[#E6EDF3]'
                  }`}
                >
                  Регистрация
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {activeTab === 'register' && (
                  <div>
                    <label className="block text-[11px] text-[#7D8590] mb-1 font-medium">Ваше имя</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-[#7D8590] absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Александр Иванов"
                        className="w-full bg-[#090C10] border border-[#21262D] rounded-xl pl-9 pr-3 py-2 text-xs text-[#E6EDF3] placeholder-[#7D8590]/50 focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-[#7D8590] mb-1 font-medium">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#7D8590] absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@data-academy.ru"
                      required
                      className="w-full bg-[#090C10] border border-[#21262D] rounded-xl pl-9 pr-3 py-2 text-xs text-[#E6EDF3] placeholder-[#7D8590]/50 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-[#7D8590] mb-1 font-medium">Пароль</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7D8590] absolute left-3 top-2.5" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-[#090C10] border border-[#21262D] rounded-xl pl-9 pr-3 py-2 text-xs text-[#E6EDF3] placeholder-[#7D8590]/50 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-black font-semibold text-xs transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : activeTab === 'login' ? (
                    'Войти в аккаунт'
                  ) : (
                    'Зарегистрироваться'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Quick link to Supabase Guide */}
          <div className="pt-2 border-t border-[#21262D]/60 flex items-center justify-between text-[11px] text-[#7D8590]">
            <span>Защита данных: PostgreSQL RLS + SHA-256</span>
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#38BDF8] hover:underline flex items-center gap-1"
            >
              <span>Supabase Cloud</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};