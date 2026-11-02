import { Lesson } from '@/types/course';

export const postgresqlLesson6: Lesson = {
  "id": "postgresql-6",
  "moduleSlug": "postgresql",
  "order": 6,
  "title": "Память и надежность: Shared Buffers, WAL (Write-Ahead Log), Checkpoints и Background Writer",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "shared_buffers",
      "definition": "Главный пул общей разделяемой оперативной памяти PostgreSQL (обычно 25%–40% RAM сервера), предназначенный для кэширования 8 КБ страниц таблиц и индексов."
    },
    {
      "term": "WAL (Write-Ahead Log)",
      "definition": "Журнал опережающей записи на диске (сегменты по 16 МБ), гарантирующий долговечность транзакций (Durability в ACID) за счет строго последовательной записи байт до сброса страниц в таблицы."
    },
    {
      "term": "Checkpoint (Контрольная точка)",
      "definition": "Процесс принудительного упорядоченного сброса всех «грязных» страниц из shared_buffers на диск и фиксации точки восстановления (REDO Point), позволяющий удалять старые сегменты WAL."
    },
    {
      "term": "Full Page Writes (FPW)",
      "definition": "Механизм защиты от частичной записи страниц (Torn Pages): при первом изменении страницы после чекпоинта ее образ размером 8 КБ целиком записывается в WAL."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "buffer_cache_stats",
      "columns": [
        {
          "name": "relname",
          "type": "TEXT",
          "keyType": "PK"
        },
        {
          "name": "heap_blks_read",
          "type": "INTEGER"
        },
        {
          "name": "heap_blks_hit",
          "type": "INTEGER"
        },
        {
          "name": "dirty_buffers",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "relname": "orders",
          "heap_blks_read": 45000,
          "heap_blks_hit": 855000,
          "dirty_buffers": 1200
        },
        {
          "relname": "users",
          "heap_blks_read": 2000,
          "heap_blks_hit": 498000,
          "dirty_buffers": 80
        },
        {
          "relname": "click_events",
          "heap_blks_read": 720000,
          "heap_blks_hit": 280000,
          "dirty_buffers": 5400
        },
        {
          "relname": "catalog_categories",
          "heap_blks_read": 50,
          "heap_blks_hit": 15000,
          "dirty_buffers": 5
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура памяти PostgreSQL: Общие буферы и память процессов\n\nМодель памяти PostgreSQL разделена на две фундаментальные зоны:\n1. **Общая память (Shared Memory):** Доступна всем процессам кластера. Главный компонент — `shared_buffers` (по умолчанию всего 128 МБ, в проде выделяют 25%–40% от всей оперативной памяти хоста). Здесь кэшируются 8-килобайтные страницы таблиц и индексов. Другие компоненты: `wal_buffers` (16–64 МБ) и таблицы блокировок (`lock table`).\n2. **Локальная память процесса (Local Memory):** Выделяется индивидуально каждому подключению backend-воркера:\n   - `work_mem`: Память для операций сортировки (`ORDER BY`), построения хэш-таблиц (`Hash Join`, `HashAggregate`) и оконных функций.\n   - `maintenance_work_mem`: Память для утилитных задач (`CREATE INDEX`, `VACUUM`, добавление внешних ключей).\n   - `temp_buffers`: Хранение временных таблиц сессии.\n\n#### Ловушка work_mem и Linux OOM Killer\nСамая опасная ошибка начинающего DBA — установить `work_mem = 1GB` в глобальном конфиге `postgresql.conf`.\nПараметр `work_mem` выделяется **не на сессию и не на запрос**, а **на каждый отдельный узел плана выполнения (Execution Plan Node)**!\nЕсли сложный аналитический запрос выполняет 4 операции сортировки и 3 хэш-джойна, он может аллоцировать `7 * 1GB = 7 ГБ RAM` в рамках одного запроса! При 50 одновременных пользователях сервер мгновенно расходует всю память и принудительно убивается ядром Linux (**SIGKILL, exit code 137**).\n\n#### Алгоритм Clock Sweep: Вытеснение страниц из shared_buffers\nКогда с диска нужно прочитать новую 8 КБ страницу, а в `shared_buffers` нет свободного места, СУБД использует алгоритм **Clock Sweep (часовой алгоритм)**:\n- Каждому буферу сопоставлен счетчик использования `usage_count` (число от 0 до 5).\n- Виртуальная стрелка часов обходит массив буферов по кругу:\n  - Если у страницы `usage_count > 0`, стрелка декрементирует его на 1 и идет дальше.\n  - Если `usage_count == 0` и страница не заблокирована, она выбирается жертвой на вытеснение.\n\n#### Журнал упреждающей записи (WAL) и гарантия Durability\nЕсли бы при каждом коммите сервер сбрасывал случайные 8 КБ страницы данных в файлы таблиц на диске, СУБД не могла бы обрабатывать больше 100–200 транзакций в секунду из-за случайного дискового I/O (Random I/O).\n\nPostgreSQL реализует принцип **WAL (Write-Ahead Logging)**:\n1. При изменении строки меняется 8 КБ страница в оперативной памяти (`shared_buffers`), она становится **«грязной» (dirty page)**.\n2. В компактный последовательный журнал **WAL** записывается бинарный diff изменений.\n3. При выполнении команды `COMMIT` СУБД гарантирует сброс на диск (через системный вызов `fsync`) **ТОЛЬКО записи WAL**! Это быстрый последовательный синхронный I/O. Пользователь получает ответ «OK», хотя сама таблица на диске еще не обновлена.\n\n#### Чекпоинты (Checkpoints), Background Writer и Full Page Writes\nКто и когда сбрасывает грязные страницы из `shared_buffers` на диск?\n1. **Checkpointer (Контрольная точка):** По таймеру (`checkpoint_timeout = 15min`) или объему накопившегося WAL (`max_wal_size = 16GB-64GB`) сбрасывает все накопившиеся грязные страницы на диск. Параметр `checkpoint_completion_target = 0.9` размазывает запись на 90% интервала, устраняя всплески дисковой нагрузки (I/O spikes).\n2. **Background Writer (bgwriter):** В непрерывном режиме сбрасывает небольшие порции грязных страниц чуть впереди стрелки Clock Sweep, чтобы у читающих процессов всегда были готовые чистые буферы.\n3. **Backend Writes (buffers_backend):** Худший сценарий. Если bgwriter не успевает, сам клиентский процесс останавливает выполнение своего SQL-запроса и лично сбрасывает чужую грязную страницу на диск. Рост `buffers_backend` — маркер критической нехватки дисковой подсистемы.\n4. **Full Page Writes (FPW):** Защита от повреждения блоков при сбое питания (Torn Pages). Если сервер выключится ровно посередине записи 8 КБ страницы, блок будет разрушен. Поэтому при первом изменении страницы после чекпоинта весь ее образ целиком сохраняется в WAL."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Блокнот официанта и повара на кухне",
      "content": "WAL — это блокнот официанта в переполненном ресторане. Принимая заказ, официант за секунду черкает три слова в блокнот (быстрый последовательный лог WAL) и отдает вам чек: «Ваш заказ принят!» (COMMIT). Если в зале погаснет свет, по блокноту точно восстановят, кто что заказал. А приготовление блюд и мытье посуды (Checkpointer и bgwriter) спокойно идет на кухне в фоновом режиме: повара не ждут, пока вы доедите, чтобы принять заказ у следующего столика."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение дефолтной и промышленной Highload конфигурации памяти PostgreSQL",
        "beforeDescription": "Дефолтные устаревшие настройки PostgreSQL из коробки",
        "beforeColumns": [
          "Параметр памяти / WAL",
          "Дефолтная конфигурация",
          "Промышленный Highload тюнинг"
        ],
        "beforeRows": [
          [
            "shared_buffers",
            "128 МБ (рудимент старых ОС)",
            "25% – 40% всей оперативной памяти"
          ],
          [
            "max_wal_size и completion",
            "1 ГБ и target = 0.5 (пилы I/O)",
            "16–64 ГБ и target = 0.9 (размазывание)"
          ],
          [
            "work_mem контроль",
            "4 МБ (spill на диск в temp)",
            "32–64 МБ с мониторингом соединений"
          ]
        ],
        "afterDescription": "Оптимальная архитектура для высоконагруженных DWH и OLTP систем",
        "afterColumns": [
          "Параметр памяти / WAL",
          "Дефолтная конфигурация",
          "Промышленный Highload тюнинг"
        ],
        "afterRows": [
          [
            "shared_buffers",
            "128 МБ (рудимент старых ОС)",
            "25% – 40% всей оперативной памяти"
          ],
          [
            "max_wal_size и completion",
            "1 ГБ и target = 0.5 (пилы I/O)",
            "16–64 ГБ и target = 0.9 (размазывание)"
          ],
          [
            "work_mem контроль",
            "4 МБ (spill на диск в temp)",
            "32–64 МБ с мониторингом соединений"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Лавина Full Page Writes из-за маленького max_wal_size",
      "content": "Если оставить дефолтный max_wal_size = 1GB на активной базе, чекпоинты начинают происходить каждые 30 секунд. При каждом чекпоинте сбрасывается флаг, и следующее изменение КАЖДОЙ страницы вызывает запись полных 8 КБ в WAL (Full Page Writes). В результате объем генерируемого WAL подскакивает в 5–10 раз, дисковая полка раскаляется до 100% утилизации, а репликация отстает на часы."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что физически происходит на диске при выполнении COMMIT?",
      "content": "При выполнении команды COMMIT сервер PostgreSQL: 1) Генерирует в wal_buffers специальную запись commit record; 2) Вызывает системный вызов fsync() для сброса WAL-буфера на диск до физического энергонезависимого накопителя; 3) Помечает транзакцию зафиксированной в clog (pg_xact); 4) Освобождает удерживаемые блокировки heavyweight locks; 5) Возвращает клиенту подтверждение успешного коммита. Сами страницы данных в shared_buffers на диск НЕ сбрасываются — они будут записаны позже асинхронно Checkpointer или bgwriter."
    }
  ],
  "taskDescription": "Перед вами таблица `buffer_cache_stats`, собирающая метрики чтения из оперативной памяти (`heap_blks_hit`) и физических чтений с диска (`heap_blks_read`) по таблицам кластера. Для оценки качества кэширования в `shared_buffers` напишите SQL-запрос, который:\n1. Для каждой таблицы рассчитывает коэффициент попадания в кэш (`cache_hit_ratio`): `(heap_blks_hit * 100.0) / (heap_blks_hit + heap_blks_read)`, округленный до 2 знаков после запятой.\n2. Формирует статус эффективности кэширования (`cache_status`):\n   - 'OPTIMAL', если `cache_hit_ratio >= 95.0`;\n   - 'NEEDS_TUNING', если показатель ниже 95%.\n3. Фильтрует только достаточно нагруженные таблицы с суммарным числом обращений к блокам не менее 100 000 (`(heap_blks_hit + heap_blks_read) >= 100000`).\n4. Выводит поля: `relname`, `heap_blks_read`, `heap_blks_hit`, `cache_hit_ratio`, `cache_status`.\n5. Сортирует результат по убыванию количества дисковых чтений `heap_blks_read`.",
  "seedCode": "CREATE TABLE buffer_cache_stats (\n    relname TEXT PRIMARY KEY,\n    heap_blks_read INT,\n    heap_blks_hit INT,\n    dirty_buffers INT\n);\nINSERT INTO buffer_cache_stats VALUES ('orders', 45000, 855000, 1200);\nINSERT INTO buffer_cache_stats VALUES ('users', 2000, 498000, 80);\nINSERT INTO buffer_cache_stats VALUES ('click_events', 720000, 280000, 5400);\nINSERT INTO buffer_cache_stats VALUES ('catalog_categories', 50, 15000, 5);\nINSERT INTO buffer_cache_stats VALUES ('temp_logs', 90000, 60000, 400);",
  "initialCode": "-- Рассчитайте cache_hit_ratio и определите статус кэширования таблиц\nSELECT \n    relname,\n    heap_blks_read,\n    heap_blks_hit,\n    0.0 AS cache_hit_ratio,\n    'OPTIMAL' AS cache_status\nFROM buffer_cache_stats;",
  "solutionCode": "SELECT \n    relname,\n    heap_blks_read,\n    heap_blks_hit,\n    ROUND((heap_blks_hit * 100.0) / (heap_blks_hit + heap_blks_read), 2) AS cache_hit_ratio,\n    CASE \n        WHEN ROUND((heap_blks_hit * 100.0) / (heap_blks_hit + heap_blks_read), 2) >= 95.0 THEN 'OPTIMAL'\n        ELSE 'NEEDS_TUNING'\n    END AS cache_status\nFROM buffer_cache_stats\nWHERE (heap_blks_hit + heap_blks_read) >= 100000\nORDER BY heap_blks_read DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "requiredAstPatterns": [
      "ROUND",
      "CASE",
      "WHEN",
      "WHERE",
      "ORDER BY"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #304: Замедление аналитического запроса из-за сброса сортировки на диск (Work_mem Spill)",
    "incidentDescription": "Сложный аналитический запрос начал выполняться 45 секунд. В плане EXPLAIN ANALYZE виден узел: Sort Method: external merge Disk: 48000kB, что означает нехватку work_mem и сброс промежуточных данных во временные файлы на диск. Требуется локально в рамках сессии увеличить лимит рабочей памяти до 64MB для ускорения вычислений в RAM.",
    "buggyCode": "SELECT customer_id, SUM(amount) FROM payments GROUP BY customer_id ORDER BY SUM(amount) DESC;",
    "fixHint": "Добавьте команду SET work_mem = '64MB'; перед выполнением аналитического запроса.",
    "solutionCode": "SET work_mem = '64MB'; SELECT customer_id, SUM(amount) FROM payments GROUP BY customer_id ORDER BY SUM(amount) DESC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "work_mem",
        "64MB"
      ]
    }
  },
  "hints": [
    "Формула коэффициента попадания: ROUND((heap_blks_hit * 100.0) / (heap_blks_hit + heap_blks_read), 2).",
    "Используйте CASE WHEN расчетное_значение >= 95.0 THEN 'OPTIMAL' ELSE 'NEEDS_TUNING' END AS cache_status.",
    "Отфильтруйте таблицы условием (heap_blks_hit + heap_blks_read) >= 100000 и выполните сортировку ORDER BY heap_blks_read DESC."
  ]
};
