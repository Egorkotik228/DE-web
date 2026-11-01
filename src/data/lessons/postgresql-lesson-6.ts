import { Lesson } from '@/types/course';

export const postgresqlLesson6: Lesson = {
  "id": "postgresql-6",
  "moduleSlug": "postgresql",
  "order": 6,
  "title": "Чтение EXPLAIN (ANALYZE, BUFFERS), алгоритмы Scan/Join и статистика планировщика",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Cost-Based Optimizer (CBO)",
      "definition": "Планировщик запросов на основе стоимостной модели, рассчитывающий оптимальное дерево физических узлов выполнения по статистике распределения данных."
    },
    {
      "term": "EXPLAIN (ANALYZE, BUFFERS)",
      "definition": "Инструмент глубокого профилирования SQL, который физически исполняет запрос и замеряет точное число прочитанных 8 КБ страниц из shared_buffers и диска."
    },
    {
      "term": "Bitmap Heap Scan",
      "definition": "Двухфазный алгоритм: Bitmap Index Scan строит битовую карту номеров страниц с совпадениями, а Bitmap Heap Scan считывает их строго в физическом порядке расположения на диске."
    },
    {
      "term": "Extended Statistics",
      "definition": "Механизм CREATE STATISTICS, собирающий многомерную статистику зависимостей (dependencies) между взаимосвязанными колонками для предотвращения ошибок оценки кардинальности."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "query_plan_benchmarks",
      "columns": [
        {
          "name": "query_id",
          "type": "TEXT",
          "keyType": "PK"
        },
        {
          "name": "scan_type",
          "type": "TEXT"
        },
        {
          "name": "join_type",
          "type": "TEXT"
        },
        {
          "name": "estimated_rows",
          "type": "INTEGER"
        },
        {
          "name": "actual_rows",
          "type": "INTEGER"
        },
        {
          "name": "shared_hit_blks",
          "type": "INTEGER"
        },
        {
          "name": "shared_read_blks",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "query_id": "q_nested_loop_disaster",
          "scan_type": "Seq Scan",
          "join_type": "Nested Loop",
          "estimated_rows": 5,
          "actual_rows": 2500000,
          "shared_hit_blks": 12000,
          "shared_read_blks": 85000
        },
        {
          "query_id": "q_efficient_hash_join",
          "scan_type": "Index Scan",
          "join_type": "Hash Join",
          "estimated_rows": 45000,
          "actual_rows": 46200,
          "shared_hit_blks": 154000,
          "shared_read_blks": 210
        },
        {
          "query_id": "q_spill_merge_join",
          "scan_type": "Bitmap Heap Scan",
          "join_type": "Merge Join",
          "estimated_rows": 80000,
          "actual_rows": 810000,
          "shared_hit_blks": 92000,
          "shared_read_blks": 15400
        },
        {
          "query_id": "q_simple_point_lookup",
          "scan_type": "Index Scan",
          "join_type": "None",
          "estimated_rows": 1,
          "actual_rows": 1,
          "shared_hit_blks": 4,
          "shared_read_blks": 0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия Cost-Based Optimizer (CBO): Как думает планировщик PostgreSQL\n\nКогда вы отправляете запрос в PostgreSQL, он не выполняется сразу. Движок проходит этапы: `Парсинг -> Анализ -> Переписывание (Rewrite) -> Планирование (Optimizer) -> Выполнение (Executor)`.\n\nПланировщик оценивает миллионы возможных деревьев выполнения и выбирает план с наименьшей расчетной стоимостью (**Cost**):\n```text\nSeq Scan on orders (cost=0.00..458.20 rows=1000 width=64)\n```\n- **0.00 (Startup Cost):** Затраты до получения первой строки (у `Seq Scan` это 0, а у `Sort` или `Hash Join` — высокое число, так как нужно сначала прочитать весь поток).\n- **458.20 (Total Cost):** Суммарная стоимость выполнения узла до конца в условных единицах дискового ввода-вывода (I/O Cost) и процессора (CPU Cost).\n- **Веса планировщика:** `seq_page_cost = 1.0` (чтение последовательного блока), `random_page_cost = 4.0` (случайное чтение; на современных NVMe SSD обязательно снижают до `1.1–1.5`), `cpu_tuple_cost = 0.01` (обработка строки в CPU).\n\n#### Почему EXPLAIN ANALYZE без BUFFERS слеп\nКоманда `EXPLAIN` показывает лишь теорию планировщика. Ключевое слово `ANALYZE` **реально исполняет запрос** и замеряет фактические цифры (`actual time`, `actual rows`).\n\n**⚠️ ОПАСНОСТЬ:** Если вы запустите `EXPLAIN ANALYZE DELETE FROM users;`, строки удалятся по-настоящему! Для модифицирующих команд всегда используйте: `BEGIN; EXPLAIN ANALYZE DELETE...; ROLLBACK;`.\n\nОбязательно добавляйте флаг `BUFFERS`: `EXPLAIN (ANALYZE, BUFFERS) SELECT...`:\n- `shared hit`: страницы, найденные в оперативной памяти `shared_buffers`.\n- `shared read`: страницы, прочитанные с физического диска (главный источник задержек).\n- `temp read / temp written`: маркер катастрофы! Памяти `work_mem` не хватило, и СУБД сбросила промежуточные данные сортировки или хэш-таблицы во временные файлы на диск.\n\n#### Три физических алгоритма сканирования (Scan Types)\n1. **Seq Scan:** Последовательное чтение всех страниц таблицы подряд. Оптимально, если выбирается более 15–20% строк таблицы.\n2. **Index Scan:** Чтение B-Tree, получение `ctid` и точечный прыжок в страницу Heap. Идеально для 1–100 строк. Но при 50 000 строк вызывает лавину случайных дисковых чтений.\n3. **Bitmap Index Scan + Bitmap Heap Scan:** Спасительный гибрид для средних выборок (1%–15% строк):\n   - Сначала `Bitmap Index Scan` строит битовую карту номеров страниц с совпадениями в памяти `work_mem`.\n   - Затем `Bitmap Heap Scan` считывает блоки таблицы строго последовательно по возрастанию адресов на диске.\n   - **Ловушка Lossy-блоков:** Если битовая карта не влезает в лимит `work_mem`, Postgres переключается в режим `lossy` (помнит только факт совпадения на странице, но не конкретные строки). В плане появляется `Heap Blocks: exact=120 lossy=4500` и узел `Recheck Cond`, повторно проверяющий условие на каждой строке в CPU!\n\n#### Три физических алгоритма соединения (JOIN)\n1. **Nested Loop:** Для каждой строки внешней таблицы сканирует внутреннюю (желательно по индексу). Идеально для маленьких выборок ($O(N \\log M)$). **Катастрофа:** если оптимизатор ошибся в оценке кардинальности ($N=5$ вместо $N=5\\,000\\,000$), цикл выполнит 5 миллионов вложенных сканирований и намертво повесит CPU на часы!\n2. **Hash Join:** Строит хэш-таблицу в памяти по меньшей таблице, затем одним проходом читает большую. Скорость $O(N + M)$. Если таблица не влезла в `work_mem`, в плане появляется `Batches: 16`, означающее сброс хэша на диск в несколько проходов.\n3. **Merge Join:** Соединяет два предварительно отсортированных потока (по индексу или после узла Sort) за один линейный проход $O(N + M)$.\n\n#### Статистика планировщика и расширенная статистика (CREATE STATISTICS)\nПланировщик строит гистограммы в `pg_stats`. Но по умолчанию он считает колонки независимыми:\n$P(A \\land B) = P(A) \\times P(B)$.\nДля колонок `make = 'Audi'` и `model = 'A6'` он перемножит их вероятности и посчитает, что совпадений будет 2 строки вместо реальных 50 000! Увидев 2 строки, он выберет смертельный `Nested Loop`.\n\n**Решение:**\n```sql\nCREATE STATISTICS st_cars (dependencies) ON make, model FROM cars;\nANALYZE cars;\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Автомобильный навигатор с устаревшими картами",
      "content": "Оптимизатор CBO — это автомобильный навигатор. Он не знает, что прямо сейчас происходит на дороге, но рассчитывает маршрут по сохраненной карте скоростей (статистике pg_stats). Если карты устарели (не запущен ANALYZE после вставки 50 млн строк в партицию), навигатор уверен, что узкая деревенская грунтовка свободна (rows=5), и отправляет 40-тонную фуру в тупик: выбирает Nested Loop вместо широкой скоростной магистрали Hash Join."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение физических стратегий соединения таблиц (JOIN Algorithms)",
        "beforeDescription": "Алгоритмы соединений и их вычислительная сложность",
        "beforeColumns": [
          "Алгоритм JOIN",
          "Сложность и потребление RAM",
          "Когда оптимален"
        ],
        "beforeRows": [
          [
            "Nested Loop",
            "O(N * log M), память O(1)",
            "Маленькая внешняя таблица и индекс во внутренней"
          ],
          [
            "Hash Join",
            "O(N + M), требует work_mem под хэш",
            "Средние и большие несортированные таблицы"
          ],
          [
            "Merge Join",
            "O(N + M), память O(1) при индексе",
            "Большие таблицы, уже отсортированные по ключу"
          ]
        ],
        "afterDescription": "Сценарии применения в зависимости от индексов и объема памяти",
        "afterColumns": [
          "Алгоритм JOIN",
          "Сложность и потребление RAM",
          "Когда оптимален"
        ],
        "afterRows": [
          [
            "Nested Loop",
            "O(N * log M), память O(1)",
            "Маленькая внешняя таблица и индекс во внутренней"
          ],
          [
            "Hash Join",
            "O(N + M), требует work_mem под хэш",
            "Средние и большие несортированные таблицы"
          ],
          [
            "Merge Join",
            "O(N + M), память O(1) при индексе",
            "Большие таблицы, уже отсортированные по ключу"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Забытый ANALYZE после ночного ETL-залива",
      "content": "В ночном пайплайне в новую партицию залили 50 млн строк через быстрый COPY. Разработчик забыл выполнить ANALYZE. Утром первый же аналитический отчет выполнялся 3 часа вместо 10 секунд: планировщик посчитал таблицу пустой (rows=1), выбрал Nested Loop с 50 миллионами итераций. Всегда завершайте массовые вставки командой ANALYZE target_table!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что означает надпись «Batches: > 1» в Hash Join?",
      "content": "В плане EXPLAIN надпись Batches: 1 означает, что вся хэш-таблица полностью поместилась в оперативную память, выделенную параметром work_mem. Если вы видите Batches: 4, 16 или 64 — это маркер нехватки work_mem: хэш-таблица не поместилась в память, была разбита на части и частично сброшена на диск во временные файлы, что вызывает сильное замедление из-за дискового ввода-вывода."
    }
  ],
  "taskDescription": "Перед вами таблица бенчмарков планов запросов `query_plan_benchmarks`. Для выявления катастрофических расхождений в оценке кардинальности напишите SQL-запрос, который:\n1. Рассчитывает кратность ошибки оценки строк планировщиком (`error_factor`): отношение большего значения к меньшему между `estimated_rows` и `actual_rows`: `ROUND(MAX(actual_rows * 1.0, estimated_rows * 1.0) / MIN(actual_rows * 1.0, estimated_rows * 1.0), 1)`.\n2. Фильтрует запросы, где оценка кардинальности разошлась не менее чем в 10 раз (`error_factor >= 10.0`) ИЛИ где количество физических чтений с диска составило не менее 10 000 блоков (`shared_read_blks >= 10000`).\n3. Выбирает поля: `query_id`, `scan_type`, `join_type`, `estimated_rows`, `actual_rows`, `error_factor`.\n4. Сортирует результат по убыванию коэффициента ошибки `error_factor`.",
  "seedCode": "CREATE TABLE query_plan_benchmarks (\n    query_id TEXT PRIMARY KEY,\n    scan_type TEXT,\n    join_type TEXT,\n    estimated_rows INT,\n    actual_rows INT,\n    shared_hit_blks INT,\n    shared_read_blks INT\n);\nINSERT INTO query_plan_benchmarks VALUES ('q_nested_loop_disaster', 'Seq Scan', 'Nested Loop', 5, 2500000, 12000, 85000);\nINSERT INTO query_plan_benchmarks VALUES ('q_efficient_hash_join', 'Index Scan', 'Hash Join', 45000, 46200, 154000, 210);\nINSERT INTO query_plan_benchmarks VALUES ('q_spill_merge_join', 'Bitmap Heap Scan', 'Merge Join', 80000, 810000, 92000, 15400);\nINSERT INTO query_plan_benchmarks VALUES ('q_simple_point_lookup', 'Index Scan', 'None', 1, 1, 4, 0);\nINSERT INTO query_plan_benchmarks VALUES ('q_correlated_skew', 'Bitmap Heap Scan', 'Nested Loop', 20, 180000, 45000, 12000);",
  "initialCode": "-- Выявите запросы с критическими ошибками планировщика и тяжелым дисковым чтением\nSELECT \n    query_id,\n    scan_type,\n    join_type,\n    estimated_rows,\n    actual_rows,\n    1.0 AS error_factor\nFROM query_plan_benchmarks;",
  "solutionCode": "SELECT \n    query_id,\n    scan_type,\n    join_type,\n    estimated_rows,\n    actual_rows,\n    ROUND(MAX(actual_rows * 1.0, estimated_rows * 1.0) / MIN(actual_rows * 1.0, estimated_rows * 1.0), 1) AS error_factor\nFROM query_plan_benchmarks\nWHERE ROUND(MAX(actual_rows * 1.0, estimated_rows * 1.0) / MIN(actual_rows * 1.0, estimated_rows * 1.0), 1) >= 10.0\n   OR shared_read_blks >= 10000\nORDER BY error_factor DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 1,
    "requiredAstPatterns": [
      "ROUND",
      "MAX",
      "MIN",
      "WHERE",
      "ORDER BY"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #306: Катастрофический выбор Nested Loop из-за скоррелированных колонок",
    "incidentDescription": "Запрос фильтровал таблицу магазинов по полям country = 'US' и city = 'New York'. Планировщик перемножил вероятности, занизил оценку строк в 300 раз и выбрал мучительный Nested Loop. Требуется создать расширенную статистику зависимостей между колонками и собрать ее.",
    "buggyCode": "SELECT * FROM stores WHERE country = 'US' AND city = 'New York';",
    "fixHint": "Создайте расширенную статистику зависимостей CREATE STATISTICS st_geo (dependencies) ON country, city FROM stores; и выполните ANALYZE stores;.",
    "solutionCode": "CREATE STATISTICS st_geo (dependencies) ON country, city FROM stores; ANALYZE stores; SELECT * FROM stores WHERE country = 'US' AND city = 'New York';",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "CREATE",
        "STATISTICS",
        "dependencies",
        "ANALYZE"
      ]
    }
  },
  "hints": [
    "Для расчета коэффициента ошибки используйте: ROUND(MAX(actual_rows * 1.0, estimated_rows * 1.0) / MIN(actual_rows * 1.0, estimated_rows * 1.0), 1).",
    "В предложении WHERE объедините условия через OR: error_factor >= 10.0 OR shared_read_blks >= 10000.",
    "Отсортируйте результат по убыванию: ORDER BY error_factor DESC."
  ]
};
