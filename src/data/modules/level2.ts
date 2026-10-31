import { TrackModule } from '@/types/course';

export const level2Modules: TrackModule[] = [
  {
    id: 'sql',
    slug: 'sql',
    title: 'Продвинутый SQL для Data Engineer',
    shortDescription: 'Глубокий SQL: логический порядок выполнения, NULL-логика, LATERAL JOIN, оконные фреймы, рекурсивные CTE и Gaps & Islands.',
    level: 2,
    levelTitle: 'Уровень 2: Ядро и Код',
    engineType: 'sql',
    dependencies: ['intro'],
    totalLessons: 20,
    curriculumTopics: [
      'Логический порядок выполнения SQL-запроса (FROM -> JOIN -> WHERE -> GROUP BY -> HAVING -> SELECT -> WINDOW -> ORDER BY -> LIMIT)',
      'Троичная логика (3VL) и ловушки предикатов с NULL (NOT IN vs NOT EXISTS)',
      'Сложные соединения: SELF JOIN, CROSS JOIN, FULL OUTER JOIN и мощный LATERAL JOIN',
      'Операции над множествами: производительность UNION ALL против дедупликации UNION',
      'Рекурсивные Common Table Expressions (CTE) для графов и иерархических структур данных',
      'Оконные функции: навигационные (LEAD, LAG), ранжирующие (RANK, DENSE_RANK, ROW_NUMBER)',
      'Фреймы оконных функций: физический ROWS BETWEEN против логического RANGE/GROUPS BETWEEN',
      'Дедупликация потоков данных через QUALIFY / ROW_NUMBER() OVER (...)',
      'Классическая алгоритмическая задача Gaps & Islands (поиск непрерывных интервалов активности)',
    ],
    resumeBulletPoints: [
      'Разработка высоконагруженных аналитических SQL-скриптов с использованием оконных функций и CTE',
      'Реализация алгоритмов дедупликации и выявления разрывов данных (Gaps & Islands pattern)',
      'Оптимизация аналитических запросов за счет устранения неэффективных подзапросов и перехода на LATERAL JOIN',
      'Проектирование идемпотентных витрин данных с учетом троичной логики и NULL-безопасности',
    ],
    cheatSheetMarkdown: `### Продвинутый SQL: Шпаргалка инженера

#### 1. Логический порядок выполнения запроса
1. \`FROM\` / \`JOIN\` (+ \`ON\`) — определение источника и декартово произведение/фильтрация по ключу
2. \`WHERE\` — фильтрация отдельных строк ДО группировки (не видит псевдонимы из SELECT)
3. \`GROUP BY\` — сжатие строк в группы по уникальным ключам
4. \`HAVING\` — фильтрация сгруппированных данных по результатам агрегатных функций
5. \`SELECT\` — вычисление выражений, колонок и псевдонимов
6. \`WINDOW\` — расчет оконных функций на результирующем наборе строк
7. \`DISTINCT\` — удаление полных дубликатов строк
8. \`UNION\` / \`INTERSECT\` / \`EXCEPT\` — объединение результирующих множеств
9. \`ORDER BY\` — сортировка (видит псевдонимы SELECT)
10. \`OFFSET\` / \`LIMIT\` — усечение результирующей выборки

#### 2. Троичная логика (Three-Valued Logic: TRUE, FALSE, UNKNOWN)
* \`WHERE status NOT IN ('active', NULL)\` ВСЕГДА возвращает 0 строк!
  * Почему: \`x != 'active' AND x != NULL\` -> \`TRUE AND UNKNOWN\` -> \`UNKNOWN\`. В секции WHERE отбираются строго \`TRUE\`.
  * Решение: использовать \`WHERE NOT EXISTS (...)\` или \`WHERE status IS DISTINCT FROM 'active'\`.

#### 3. ROWS BETWEEN vs RANGE BETWEEN
\`\`\`sql
-- ROWS: сдвиг ровно на N физических строк
AVG(amount) OVER (
    ORDER BY tx_date 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)

-- RANGE: сдвиг по логическому значению колонки (все строки с одинаковой датой попадут во фрейм!)
SUM(amount) OVER (
    ORDER BY tx_date 
    RANGE BETWEEN INTERVAL '7 days' PRECEDING AND CURRENT ROW
)
\`\`\`

#### 4. Дедупликация через ROW_NUMBER
\`\`\`sql
WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY user_id 
               ORDER BY updated_at DESC
           ) as rn
    FROM raw_events
)
SELECT * FROM ranked WHERE rn = 1;
\`\`\``,
    interviewQuestions: [
      {
        id: 'sql-q1',
        question: 'В чем разница между ROWS BETWEEN и RANGE BETWEEN в оконных функциях?',
        answer: 'ROWS оперирует физическими строками: ROWS BETWEEN 1 PRECEDING AND CURRENT ROW возьмет ровно предыдущую строку и текущую, независимо от их значений. RANGE оперирует логическим диапазоном значений в колонке сортировки ORDER BY: если несколько строк имеют одинаковое значение сортировочного поля (peers), RANGE включит их все в расчет текущего фрейма. Если фрейм в OVER() не указан, по умолчанию стандарт SQL применяет RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, что при наличии дубликатов в датах приведет к неожиданному объединению значений, а также работает значительно медленнее ROWS из-за необходимости материализации групп.',
        level: 'Middle',
        tags: ['sql', 'window-functions', 'frames'],
      },
      {
        id: 'sql-q2',
        question: 'Почему `WHERE col NOT IN (subquery)` опасен при наличии NULL, и чем его заменить?',
        answer: 'Если подзапрос возвращает хотя бы одну строку со значением NULL, предикат `val NOT IN (val1, NULL)` разворачивается в `(val != val1 AND val != NULL)`. Поскольку любое сравнение с NULL возвращает UNKNOWN, логическое выражение принимает вид `(TRUE AND UNKNOWN)`, что дает `UNKNOWN`. Строка отбрасывается, и весь внешний запрос вернет пустой результат (0 строк). Надежное решение — использовать `WHERE NOT EXISTS (SELECT 1 FROM ... WHERE ...)`: оно работает по двухзначной логике присутствия строк и устойчиво к NULL в любых столбцах.',
        level: 'Junior',
        tags: ['sql', 'null', 'subqueries'],
      },
      {
        id: 'sql-q3',
        question: 'Что такое LATERAL JOIN и когда его применение незаменимо?',
        answer: 'CROSS JOIN LATERAL (или LEFT JOIN LATERAL) позволяет правому подзапросу обращаться к колонкам из левой таблицы построчно (как `for each row` в языках программирования). Это незаменимо для: 1) вычисления Top-N записей для каждой категории (например, последние 3 заказа каждого клиента), 2) разворачивания JSON-массивов или массивов PostgreSQL (jsonb_to_recordset), 3) повторного использования сложных вычисленных выражений без дублирования кода в SELECT и WHERE.',
        level: 'Middle',
        tags: ['sql', 'lateral', 'joins'],
      },
      {
        id: 'sql-q4',
        question: 'Как решить задачу Gaps & Islands (поиск непрерывных периодов активности)?',
        answer: 'Метод разности рангов (Row Number Difference technique): 1) Присваиваем непрерывный порядковый номер событиям: `ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_date) as rn`. 2) Вычитаем `rn * INTERVAL \'1 day\'` из `event_date`. 3) Магическое свойство: для последовательных дней эта разница дает постоянную дату — маркер группы («острова»). 4) Делаем `GROUP BY user_id, (event_date - rn)` и вычисляем `MIN(event_date)` и `MAX(event_date)` как границы непрерывного периода.',
        level: 'Senior',
        tags: ['sql', 'gaps-and-islands', 'analytics'],
      },
      {
        id: 'sql-q5',
        question: 'В чем разница между CTE и подзапросом с точки зрения оптимизатора PostgreSQL?',
        answer: 'До PostgreSQL 12 CTE всегда являлись границей оптимизации (Optimization Fence) — материализовались целиком на диск или в память (Materialized CTE), лишая планировщик возможности проталкивать предикаты (Predicate Pushdown). Начиная с PG 12, CTE по умолчанию инлайнятся (INLINE), если они не рекурсивные и используются один раз. Если CTE тяжелый и используется 3 раза в запросе, поведение можно контролировать явно ключевыми словами `WITH cte AS MATERIALIZED (...)` или `WITH cte AS NOT MATERIALIZED (...)`.',
        level: 'Senior',
        tags: ['sql', 'postgresql', 'cte', 'performance'],
      },
    ],
  },
  {
    id: 'python',
    slug: 'python',
    title: 'Python для Data Engineer',
    shortDescription: 'Потоковая обработка без OOM: генераторы, валидация через Pydantic, работа с таймзонами, ретраи с Exponential Backoff.',
    level: 2,
    levelTitle: 'Уровень 2: Ядро и Код',
    engineType: 'python',
    dependencies: ['intro'],
    totalLessons: 15,
    curriculumTopics: [
      'Модель памяти CPython: ссылки, счетчик ссылок (refcount), сборщик мусора (gc) и __slots__',
      'Потоковая обработка терабайтных файлов через генераторы и итераторы (yield)',
      'Работа с датами и временем: наивные (naive) против aware объектов, UTC, pytz и ZoneInfo',
      'Надежные сетевые коннекторы: requests / httpx, таймауты, пагинация и Exponential Backoff',
      'Строгая валидация контрактов данных с использованием Pydantic V2',
      'Асинхронный сбор данных (asyncio / aiohttp) для параллельного обращения к REST API',
      'Структурированное логирование (structlog) и сбор телеметрии в ETL-скриптах',
    ],
    resumeBulletPoints: [
      'Разработка отказоустойчивых ETL-коннекторов на Python с поддержкой Exponential Backoff и пагинации',
      'Оптимизация ресурсоемких пайплайнов с помощью генераторов, сократившая потребление RAM на 80%',
      'Внедрение строгой типизации и валидации схем контрактов данных через Pydantic V2',
      'Создание асинхронных микросервисов сбора данных с внешних REST API с контролем рейт-лимитов',
    ],
    cheatSheetMarkdown: `### Python для инженерии данных: Шпаргалка

#### 1. Потоковое чтение тяжелых файлов без OOM
\`\`\`python
def stream_large_file(file_path: str, chunk_size: int = 65536):
    """Генератор для потокового чтения без загрузки всего файла в RAM."""
    with open(file_path, 'r', encoding='utf-8') as f:
        buffer = ""
        while chunk := f.read(chunk_size):
            buffer += chunk
            lines = buffer.split('\\n')
            buffer = lines.pop()  # Сохраняем незавершенную строку
            for line in lines:
                if line:
                    yield line
        if buffer:
            yield buffer
\`\`\`

#### 2. Экспоненциальный откат (Exponential Backoff) с джиттером
\`\`\`python
import time
import random

def fetch_with_retry(fetch_fn, max_retries: int = 5, base_delay: float = 1.0):
    for attempt in range(max_retries):
        try:
            return fetch_fn()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            # Добавляем случайный разброс (jitter), чтобы не устраивать Thundering Herd на API
            sleep_time = (base_delay * (2 ** attempt)) + random.uniform(0, 0.5)
            time.sleep(sleep_time)
\`\`\`

#### 3. Строгая работа с таймзонами (ZoneInfo)
\`\`\`python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

# ПРАВИЛО DE: Хранить и передавать строго в UTC!
utc_now = datetime.now(timezone.utc)

# Конвертация в локальное время для отчетов
msk_time = utc_now.astimezone(ZoneInfo("Europe/Moscow"))
\`\`\``,
    interviewQuestions: [
      {
        id: 'python-q1',
        question: 'Как прочитать и обработать CSV файл размером 60 ГБ на сервере с 8 ГБ оперативной памяти?',
        answer: 'Категорически нельзя использовать `open().readlines()` или `pd.read_csv()` без параметров. Решения: 1) Использование итераторов файлов Python: конструкция `with open(...) as f: for line in f:` читает файл буферизированно построчно, потребляя всего несколько килобайт памяти. 2) Чтение пакетами через Pandas: `pd.read_csv(\'file.csv\', chunksize=100000)` возвращает генератор датафреймов. 3) Использование Polars/DuckDB в потоковом (streaming/lazy) режиме: `pl.scan_csv(\'file.csv\').sink_parquet(...)`.',
        level: 'Junior',
        tags: ['python', 'memory', 'oom', 'generators'],
      },
      {
        id: 'python-q2',
        question: 'Что такое GIL (Global Interpreter Lock) и как он влияет на задачи обработки данных?',
        answer: 'GIL — это мьютекс в CPython, предотвращающий одновременное выполнение нескольких нативных потоков байткода Python на нескольких ядрах CPU (защищает структуру памяти CPython и счетчики ссылок). Для I/O-bound задач (сетевые запросы, скачивание данных из S3) потоки (threading / asyncio) эффективны, так как GIL отпускается во время ожидания сети. Для CPU-bound задач (парсинг строк, математические расчеты) потоки бесполезны — необходимо использовать модуль multiprocessing, либо библиотеки на C/Rust (NumPy, Polars, DuckDB), которые освобождают GIL при выполнении тяжелых операций.',
        level: 'Middle',
        tags: ['python', 'gil', 'concurrency'],
      },
      {
        id: 'python-q3',
        question: 'В чем разница между `datetime.utcnow()` и `datetime.now(timezone.utc)`?',
        answer: 'Метод `datetime.utcnow()` возвращает так называемый наивный (naive) объект даты-времени — в нем отсутствует информация о таймзоне (поле tzinfo равно None). Если такой объект передать в функцию, ожидающую aware-дату, или сериализовать в базу, она может быть ошибочно интерпретирована как локальное время сервера. Начиная с Python 3.12 метод `utcnow()` объявлен устаревшим (deprecated). Единственно верный способ — явное создание timezone-aware объекта: `datetime.now(timezone.utc)`.',
        level: 'Junior',
        tags: ['python', 'datetime', 'timezone'],
      },
      {
        id: 'python-q4',
        question: 'Зачем в алгоритм Exponential Backoff добавляют Full Jitter (случайную задержку)?',
        answer: 'Без случайного разброса (Jitter) все клиенты, получившие сетевую ошибку 429 (Too Many Requests) или 503 от внешнего сервиса одновременно, повторят запросы через абсолютно равные промежутки времени (через 1 сек, затем через 2 сек, 4 сек и т.д.). Это вызывает эффект Thundering Herd («громовое стадо») и лавинообразно добивает восстанавливающийся сервис. Jitter размазывает нагрузку во времени, распределяя запросы равномерным шлейфом.',
        level: 'Middle',
        tags: ['python', 'networking', 'api', 'backoff'],
      },
      {
        id: 'python-q5',
        question: 'Как устроен сборщик мусора (GC) в CPython и почему возникают циклические ссылки?',
        answer: 'Основной механизм управления памятью CPython — счетчик ссылок (Reference Counting). Как только счетчик падает до 0, память освобождается немедленно. Однако рефкаунтинг не способен обнаружить циклические ссылки (объект A ссылается на B, а B на A). Для их выявления работает циклический сборщик мусора (Generational GC), разделяющий объекты на 3 поколения (0, 1, 2) по времени жизни. Объекты с переопределенным методом `__del__` до Python 3.4 не могли быть собраны сборщиком при циклах. В DE при тяжелых трансформациях важно разрывать циклические зависимости или вызывать `weakref`.',
        level: 'Senior',
        tags: ['python', 'garbage-collector', 'memory-management'],
      },
    ],
  },
  {
    id: 'pandas',
    slug: 'pandas',
    title: 'Pandas & Polars для Big Data',
    shortDescription: 'Векторизация, даункастинг типов, чанки и переход на Polars: мультитрединг, Lazy API и оптимизатор запросов.',
    level: 2,
    levelTitle: 'Уровень 2: Ядро и Код',
    engineType: 'python',
    dependencies: ['python'],
    totalLessons: 12,
    curriculumTopics: [
      'Векторизация в Pandas против медленных циклов Python (iterrows / apply)',
      'Оптимизация памяти DataFrame: даункастинг числовых типов (int64 -> int16) и Category',
      'Сложные трансформации: merge, join, pivot_table и melt',
      'Пакетная обработка объемных файлов через chunksize',
      'Архитектура Polars: Apache Arrow в памяти, отсутствие GIL и векторные вычисления на Rust',
      'Polars LazyFrame: синтаксис scan_parquet, предикатное и проекционное проталкивание (Pushdown)',
      'Сравнение производительности и миграция критических пайплайнов с Pandas на Polars',
    ],
    resumeBulletPoints: [
      'Оптимизация аналитических скриптов Pandas с уменьшением потребления RAM на 75% за счет даункастинга типов',
      'Миграция критических ETL-модулей с Pandas на Polars с 10-кратным ускорением времени обработки',
      'Построение параллельных пайплайнов на базе Polars Lazy API с оптимизацией дискового ввода-вывода',
      'Реализация сложных трансформаций данных (pivot, melt, rolling windows) на мультимиллионных датасетах',
    ],
    cheatSheetMarkdown: `### Pandas & Polars: Шпаргалка инженера

#### 1. Оптимизация памяти в Pandas (Downcasting)
\`\`\`python
import pandas as pd
import numpy as np

def optimize_df(df: pd.DataFrame) -> pd.DataFrame:
    for col in df.columns:
        col_type = df[col].dtype
        if col_type == 'int64':
            df[col] = pd.to_numeric(df[col], downcast='integer')
        elif col_type == 'float64':
            df[col] = pd.to_numeric(df[col], downcast='float')
        elif col_type == 'object':
            num_unique = len(df[col].unique())
            num_total = len(df[col])
            # Если кардинальность < 50%, преобразуем в категорию
            if num_unique / num_total < 0.5:
                df[col] = df[col].astype('category')
    return df
\`\`\`

#### 2. Polars: Eager vs Lazy API
\`\`\`python
import polars as pl

# ❌ Eager: Читает файл целиком в память сразу
df = pl.read_parquet("sales_huge.parquet")
res = df.filter(pl.col("country") == "RU").select(["order_id", "amount"])

# ✅ Lazy: Строит план выполнения, применяет Predicate & Projection Pushdown
lazy_plan = (
    pl.scan_parquet("sales_huge.parquet")
    .filter(pl.col("country") == "RU")          # Прочитает только нужные строки
    .select(["order_id", "amount"])            # Прочитает только 2 колонки с диска
)
# Выполнение только по вызову .collect()
res = lazy_plan.collect()
\`\`\``,
    interviewQuestions: [
      {
        id: 'pandas-q1',
        question: 'Почему `df.apply()` и `df.iterrows()` работают медленно и чем их заменить?',
        answer: 'И `iterrows()`, и `apply()` не используют векторизацию — они создают объект Series на каждой итерации и прогоняют цикл в интерпретаторе Python с накладными расходами на boxing/unboxing типов. Векторизованные операции (например, `df[\'a\'] + df[\'b\']` или `np.where(...)`) передают массивы целиком в скомпилированный код C/Fortran (SIMD-инструкции процессора), выполняя оператор за один проход по смежным блокам памяти в кэше L1/L2.',
        level: 'Junior',
        tags: ['pandas', 'vectorization', 'performance'],
      },
      {
        id: 'pandas-q2',
        question: 'За счет чего Polars работает быстрее Pandas в 5–30 раз?',
        answer: '1) Язык реализации: Polars написан на Rust с нуля. 2) Формат памяти: использует спецификацию Apache Arrow (колоночный буфер без копирований). 3) Многопоточность: Polars параллелит практически любую операцию на все ядра CPU без ограничений GIL. 4) Оптимизатор запросов в Lazy API: выполняет Predicate Pushdown (фильтрация на уровне чтения Parquet с диска) и Projection Pushdown (чтение только запрошенных колонок).',
        level: 'Middle',
        tags: ['polars', 'arrow', 'concurrency'],
      },
      {
        id: 'pandas-q3',
        question: 'Что произойдет, если в колонке Pandas типа int64 появится хотя бы одно значение NaN?',
        answer: 'Исторически в стандартном NumPy бэкенде Pandas значения NaN определены только для чисел с плавающей точкой. Поэтому колонка целых чисел автоматически повышалась (upcasting) до `float64`, что удваивало расход памяти и ломало сравнения на равенство ID. В современном Pandas для решения этой проблемы добавлены nullable-типы (Int64 с заглавной буквы) на базе маски отсутствующих значений.',
        level: 'Junior',
        tags: ['pandas', 'null', 'types'],
      },
      {
        id: 'pandas-q4',
        question: 'Как устроен механизм Predicate Pushdown в Polars при чтении Parquet?',
        answer: 'Parquet-файл содержит метаданные (Footer), в которых для каждой группы строк (Row Group) записаны min и max значения каждого столбца. Когда Polars Lazy API видит фильтр `filter(col(\'age\') > 50)`, оптимизатор считывает только footer файла и отбрасывает (пропускает) целые Row Groups, у которых `max(age) <= 50`, даже не прикасаясь к сжатым данным на диске.',
        level: 'Middle',
        tags: ['polars', 'parquet', 'predicate-pushdown'],
      },
      {
        id: 'pandas-q5',
        question: 'Что такое Streaming Mode в Polars и как обработать датасет, превышающий объем RAM?',
        answer: 'При вызове `.collect(streaming=True)` Polars переключает вычислительный граф в режим пакетной потоковой обработки чанками. Вместо материализации промежуточных таблиц целиком, данные пропускаются через пайплайн батчами, поддерживая пиковое потребление памяти на фиксированном уровне независимо от размера входного файла на диске.',
        level: 'Senior',
        tags: ['polars', 'streaming', 'memory-management'],
      },
    ],
  },
];
