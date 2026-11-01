-- =====================================================================
-- DE ACADEMY — PRODUCTION DATABASE SCHEMA & SECURITY POLICIES
-- PostgreSQL 15+ / Supabase Schema with Strict RLS and Timezone Streaks
-- =====================================================================

-- 1. ТАБЛИЦА ПРОФИЛЕЙ ПОЛЬЗОВАТЕЛЕЙ
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Инженер данных',
    avatar_url TEXT,
    streak_days INT NOT NULL DEFAULT 0 CHECK (streak_days >= 0),
    last_activity_date DATE,
    timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ТАБЛИЦА ПРОГРЕССА ПО УРОКАМ
CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    module_slug TEXT NOT NULL,
    lesson_id TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_broken_prod_fixed BOOLEAN NOT NULL DEFAULT FALSE,
    saved_code TEXT,
    saved_broken_code TEXT,
    execution_time_ms INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_lesson_unique UNIQUE (user_id, lesson_id)
);

-- Индексы для быстрого поиска прогресса пользователя
CREATE INDEX IF NOT EXISTS idx_progress_user_module ON public.user_lesson_progress(user_id, module_slug);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON public.user_lesson_progress(lesson_id);

-- 3. ТАБЛИЦА ОТЧЕТОВ ОБ ОШИБКАХ В УРОКАХ (BUG REPORTS)
CREATE TABLE IF NOT EXISTS public.lesson_bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    lesson_id TEXT NOT NULL,
    category TEXT DEFAULT 'content_issue',
    comment TEXT NOT NULL,
    code_snapshot TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) ПОЛИТИКИ
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_bug_reports ENABLE ROW LEVEL SECURITY;

-- Политики для profiles:
-- Пользователь может читать свой профиль
CREATE POLICY "Users can read own profile"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Пользователь может обновлять только display_name, avatar_url и timezone
-- Прямое изменение streak_days и last_activity_date блокируется триггером!
CREATE POLICY "Users can update own display profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Политики для user_lesson_progress:
CREATE POLICY "Users can view own lesson progress"
    ON public.user_lesson_progress
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress"
    ON public.user_lesson_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress"
    ON public.user_lesson_progress
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Политики для lesson_bug_reports:
CREATE POLICY "Anyone can submit bug reports"
    ON public.lesson_bug_reports
    FOR INSERT
    WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

CREATE POLICY "Only admins read bug reports"
    ON public.lesson_bug_reports
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================================
-- ЗАЩИТА: ТРИГГЕР ЗАПРЕТА РУЧНОГО ИЗМЕНЕНИЯ СТРИКА
-- =====================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_streak_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Разрешаем изменение стрика ТОЛЬКО системным вызовам (security definer функции)
    IF (NEW.streak_days <> OLD.streak_days OR NEW.last_activity_date IS DISTINCT FROM OLD.last_activity_date) THEN
        IF current_setting('de_academy.allow_streak_update', true) IS DISTINCT FROM 'true' THEN
            NEW.streak_days := OLD.streak_days;
            NEW.last_activity_date := OLD.last_activity_date;
        END IF;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_profile_streak ON public.profiles;
CREATE TRIGGER trg_protect_profile_streak
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profile_streak_fields();

-- =====================================================================
-- СЕРВЕРНАЯ ФУНКЦИЯ ПЕРЕСЧЕТА СТРИКА С УЧЕТОМ ЧАСОВОГО ПОЯСА
-- =====================================================================

CREATE OR REPLACE FUNCTION public.record_lesson_completion(
    p_lesson_id TEXT,
    p_module_slug TEXT,
    p_is_broken_prod BOOLEAN DEFAULT FALSE,
    p_code TEXT DEFAULT NULL,
    p_timezone TEXT DEFAULT 'Europe/Moscow'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_today DATE;
    v_last_date DATE;
    v_streak INT;
    v_tz TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Требуется авторизация для сохранения прогресса';
    END IF;

    -- Получаем таймзону пользователя или берем переданную
    SELECT COALESCE(timezone, p_timezone, 'Europe/Moscow'), last_activity_date, streak_days
    INTO v_tz, v_last_date, v_streak
    FROM public.profiles
    WHERE id = v_user_id;

    -- Вычисляем дату "сегодня" в локальном часовом поясе студента
    BEGIN
        v_today := (NOW() AT TIME ZONE v_tz)::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_today := (NOW() AT TIME ZONE 'Europe/Moscow')::DATE;
    END;

    -- Алгоритм пересчета стрика:
    IF v_last_date IS NULL THEN
        -- Первый выполненный урок
        v_streak := 1;
        v_last_date := v_today;
    ELSIF v_last_date = v_today THEN
        -- Студент уже занимался сегодня — стрик не меняется
        NULL;
    ELSIF v_last_date = v_today - 1 THEN
        -- Занятие на следующий календарный день подряд — стрик растет!
        v_streak := v_streak + 1;
        v_last_date := v_today;
    ELSIF v_last_date < v_today - 1 THEN
        -- Студент пропустил день — стрик сбрасывается на 1
        v_streak := 1;
        v_last_date := v_today;
    END IF;

    -- Разрешаем триггеру обновить стрик
    PERFORM set_config('de_academy.allow_streak_update', 'true', true);

    -- Обновляем профиль
    UPDATE public.profiles
    SET streak_days = v_streak,
        last_activity_date = v_last_date,
        updated_at = NOW()
    WHERE id = v_user_id;

    -- Сохраняем прогресс по уроку (Upsert)
    INSERT INTO public.user_lesson_progress (
        user_id,
        module_slug,
        lesson_id,
        is_completed,
        is_broken_prod_fixed,
        saved_code,
        updated_at
    )
    VALUES (
        v_user_id,
        p_module_slug,
        p_lesson_id,
        TRUE,
        p_is_broken_prod,
        p_code,
        NOW()
    )
    ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        is_completed = TRUE,
        is_broken_prod_fixed = CASE WHEN p_is_broken_prod THEN TRUE ELSE user_lesson_progress.is_broken_prod_fixed END,
        saved_code = COALESCE(p_code, user_lesson_progress.saved_code),
        updated_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'streak_days', v_streak,
        'activity_date', v_today,
        'lesson_id', p_lesson_id
    );
END;
$$;

-- Функция получения актуального стрика пользователя
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_streak INT;
    v_last_date DATE;
    v_today DATE;
    v_tz TEXT;
BEGIN
    SELECT streak_days, last_activity_date, timezone
    INTO v_streak, v_last_date, v_tz
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_last_date IS NULL THEN
        RETURN 0;
    END IF;

    BEGIN
        v_today := (NOW() AT TIME ZONE COALESCE(v_tz, 'Europe/Moscow'))::DATE;
    EXCEPTION WHEN OTHERS THEN
        v_today := (NOW() AT TIME ZONE 'Europe/Moscow')::DATE;
    END;

    -- Если с последнего занятия прошло более 1 дня, стрик сгорел
    IF v_last_date < v_today - 1 THEN
        RETURN 0;
    END IF;

    RETURN COALESCE(v_streak, 0);
END;
$$;

-- =====================================================================
-- АВТОМАТИЧЕСКОЕ СОЗДАНИЕ ПРОФИЛЯ ПРИ РЕГИСТРАЦИИ ПОЛЬЗОВАТЕЛЯ
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, timezone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', 'Инженер данных'),
        NEW.raw_user_meta_data->>'avatar_url',
        'Europe/Moscow'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
