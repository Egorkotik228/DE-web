import { Lesson } from '@/types/course';

export const postgresqlLesson4: Lesson = {
  "id": "postgresql-4",
  "moduleSlug": "postgresql",
  "order": 4,
  "title": "MVCC, видимость строк (xmin/xmax), снимки (Snapshots) и изоляция транзакций",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "MVCC (Multi-Version Concurrency Control)",
      "definition": "Модель управления параллельным доступом, при которой каждая транзакция видит консистентный срез данных за счет хранения нескольких версий одного и того же кортежа."
    },
    {
      "term": "Hint Bits (Биты подсказок)",
      "definition": "Специальные биты в t_infomask кортежа (HEAP_XMIN_COMMITTED, HEAP_XMAX_COMMITTED), кэширующие статус завершения транзакции прямо в строке, избавляя от повторных обращений к clog (pg_xact)."
    },
    {
      "term": "Snapshot (Снимок данных)",
      "definition": "Структура данных в памяти вида xmin:xmax:xip_list, фиксирующая минимальный и максимальный номер активных транзакций в момент начала запроса или транзакции."
    },
    {
      "term": "Transaction ID Wraparound",
      "definition": "Критическая аварийная ситуация переполнения 32-битного счетчика транзакций (4.2 млрд XID), при которой старые строки могут внезапно стать невидимыми."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "transaction_activity_monitor",
      "columns": [
        {
          "name": "pid",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "usename",
          "type": "TEXT"
        },
        {
          "name": "state",
          "type": "TEXT"
        },
        {
          "name": "duration_seconds",
          "type": "INTEGER"
        },
        {
          "name": "xmin_horizon_age",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "pid": 4821,
          "usename": "etl_worker",
          "state": "idle in transaction",
          "duration_seconds": 380,
          "xmin_horizon_age": 450000
        },
        {
          "pid": 4822,
          "usename": "analytics_dwh",
          "state": "active",
          "duration_seconds": 120,
          "xmin_horizon_age": 120000
        },
        {
          "pid": 4823,
          "usename": "web_api",
          "state": "idle",
          "duration_seconds": 5,
          "xmin_horizon_age": 0
        },
        {
          "pid": 4824,
          "usename": "bi_dashboard",
          "state": "idle in transaction",
          "duration_seconds": 75,
          "xmin_horizon_age": 85000
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Физика MVCC в PostgreSQL: почему чтение никогда не блокирует запись\n\nВ традиционных блокировочных СУБД (2PL — Two-Phase Locking) читающий запрос ставит разделяемую блокировку (`Shared Lock`), запрещая изменение строк до конца транзакции, а пишущий запрос полностью блокирует читателей. Это приводило к взаимным блокировкам (Deadlocks) и деградации производительности.\n\nВ архитектуре PostgreSQL реализована многоверсионность **MVCC (Multi-Version Concurrency Control)**: каждый раз, когда строка изменяется, СУБД сохраняет физически новую версию строки в таблице (Heap), не перетирая старые значения.\n\n#### Поля заголовка xmin и xmax\nКаждая версия строки несет в своем заголовке системные атрибуты:\n1. `t_xmin` (4 байта): идентификатор транзакции (XID), которая выполнила `INSERT` этой версии.\n2. `t_xmax` (4 байта): идентификатор транзакции, которая выполнила `DELETE` или `UPDATE` этой версии (для живой актуальной строки `xmax = 0`).\n\n```text\n-- Исходная строка\nTuple 1: [xmin = 100, xmax = 0] (id = 1, balance = 1000)\n\n-- Выполняем UPDATE account SET balance = 1200 WHERE id = 1 (в транзакции 105)\nTuple 1 (старая): [xmin = 100, xmax = 105] (помечена удаленной для будущих транзакций)\nTuple 2 (новая):  [xmin = 105, xmax = 0]   (id = 1, balance = 1200, новая версия в куче)\n```\n\nПри операции `DELETE` строка физически **не удаляется со страницы**! В ней всего лишь выставляется `xmax = current_xid`. До тех пор, пока процесс `VACUUM` не освободит место, мертвый кортеж продолжает занимать место на 8-килобайтной странице.\n\n#### Биты подсказок (Hint Bits) и парадокс «пишущего SELECT»\nКогда транзакция читает кортеж, ей нужно знать: зафиксирована ли транзакция `xmin` (`COMMIT`) или откатана (`ROLLBACK`)? Эта информация лежит в системном журнале статусов транзакций **clog (pg_xact)**.\n\nОбращение к `pg_xact` на каждую строчку миллионов записей вызвало бы катастрофический bottleneck по блокировкам кэша. Поэтому PostgreSQL использует оптимизацию **Hint Bits (биты подсказок)** в поле `t_infomask`:\n- `HEAP_XMIN_COMMITTED`: транзакция xmin точно успешно завершена.\n- `HEAP_XMIN_INVALID`: транзакция xmin была откатана (rollback).\n\n**Парадокс:** Когда вы только что загрузили 10 миллионов строк через `COPY` или быстрый `INSERT`, биты подсказок еще не проставлены. Самый первый запрос `SELECT * FROM table` обращается к clog, определяет статус транзакции и **прямо во время чтения записывает Hint Bits в заголовок строк** в оперативной памяти `shared_buffers`! Страницы помечаются как «грязные» (dirty), и фоновый процесс фоновой записи (Checkpointer / BgWriter) сбрасывает их на диск. Таким образом, в PostgreSQL обычный `SELECT` может генерировать сотни мегабайт дисковой записи!\n\n#### Снимки данных (Snapshots) и уровни изоляции\nСнимок транзакции описывается структурой `xmin:xmax:xip_list`:\n- `xmin`: наименьший XID транзакции, которая еще была активна на момент создания снимка. Все транзакции `< xmin` считаются гарантированно завершенными.\n- `xmax`: первый еще не выданный номер транзакции на момент снимка. Все транзакции `>= xmax` невидимы.\n- `xip_list`: список активных транзакций между `xmin` и `xmax`.\n\nУровни изоляции в PostgreSQL:\n- **Read Committed (по умолчанию):** Снимок пересоздается **перед каждым SQL-запросом**. Вы видите изменения, закоммиченные между запросами внутри одной транзакции (возможно появление Non-repeatable reads).\n- **Repeatable Read:** Снимок создается **один раз в начале транзакции** (перед первой командой). Все последующие запросы видят мир, замерзший на момент старта транзакции.\n- **Serializable:** Полная изоляция через SSI (Serializable Snapshot Isolation) с графом зависимостей чтения/записи (SIREAD-блокировки в памяти). Предотвращает Write Skew без блокировки строк."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Моментальный снимок площади",
      "content": "Снимок (Snapshot) — это как моментальная фотография оживленной городской площади. Когда затвор фотоаппарата щелкнул (стартовал запрос или транзакция), на снимке зафиксированы только те люди, которые уже зашли на площадь (xmin committed). Те, кто еще только открывал дверь кафе (активные транзакции в xip_list), на фото выглядят полупрозрачными силуэтами и не учитываются. А те, кто прибежит через секунду после щелчка затвора, на снимок не попадут вовсе, даже если вы будете разглядывать фотографию целый час."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение феноменов аномалий на уровнях изоляции в PostgreSQL",
        "beforeDescription": "Стандартный уровень изоляции по умолчанию в PostgreSQL",
        "beforeColumns": [
          "Уровень изоляции",
          "Неповторяемое чтение (Non-repeatable read)",
          "Фантомные строки (Phantom Read)"
        ],
        "beforeRows": [
          [
            "Read Committed",
            "Возможно (данные меняются между SELECT)",
            "Возможно (новые строки видны)"
          ],
          [
            "Repeatable Read",
            "Защищено (снимок заморожен на старте)",
            "Защищено в Postgres через MVCC"
          ],
          [
            "Serializable",
            "Защищено (SSI предикатные блокировки)",
            "Защищено (полная эмуляция порядка)"
          ]
        ],
        "afterDescription": "Строгие уровни изоляции для финансовых и транзакционных сценариев",
        "afterColumns": [
          "Уровень изоляции",
          "Неповторяемое чтение (Non-repeatable read)",
          "Фантомные строки (Phantom Read)"
        ],
        "afterRows": [
          [
            "Read Committed",
            "Возможно (данные меняются между SELECT)",
            "Возможно (новые строки видны)"
          ],
          [
            "Repeatable Read",
            "Защищено (снимок заморожен на старте)",
            "Защищено в Postgres через MVCC"
          ],
          [
            "Serializable",
            "Защищено (SSI предикатные блокировки)",
            "Защищено (полная эмуляция порядка)"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Зависшая транзакция (Idle in Transaction) и Wraparound авария",
      "content": "Если аналитик или бэкенд открыл транзакцию `BEGIN;` и завис в состоянии `idle in transaction`, его снимок удерживает горизонт чистки `xmin`. Фоновый процесс AUTOVACUUM не имеет права удалять мертвые строки, созданные позже этой точки! За считанные часы таблицы раздуваются в 10 раз. Но худшее — счетчик XID приближается к 2^31 (лимит Wraparound). Когда до катастрофы остается 10 млн XID, PostgreSQL принудительно выключается в режим аварийного readonly и перестает принимать любые записи от клиентов!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему UPDATE в Postgres не делает блокировку на чтение, но создает нагрузку на дисковые индексы?",
      "content": "Потому что читатели обращаются к старой версии строки (которая остается неизменной), сверяя xmax со своим снимком. Однако при создании новой версии строки создается новый ctid. Если обновленная колонка входит хотя бы в один индекс (или если на странице нет места для HOT-обновления), PostgreSQL обязан обновить записи во ВСЕХ индексах таблицы, многократно умножая write amplification."
    }
  ],
  "taskDescription": "Перед вами таблица мониторинга сессий PostgreSQL `transaction_activity_monitor`. Для предотвращения зависания очистки MVCC и угрозы переполнения счетчика транзакций (Wraparound) напишите SQL-запрос, который:\n1. Отбирает подозрительные сессии в состоянии `idle in transaction` или `active`, работающие не менее 60 секунд (`duration_seconds >= 60`).\n2. Формирует категорию опасности `severity`:\n   - 'CRITICAL', если `duration_seconds >= 300`;\n   - 'WARNING', если `duration_seconds < 300`.\n3. Выбирает колонки: `pid`, `usename`, `state`, `duration_seconds`, `severity`.\n4. Сортирует результат по убыванию длительности `duration_seconds`.",
  "seedCode": "CREATE TABLE transaction_activity_monitor (\n    pid INT PRIMARY KEY,\n    usename TEXT,\n    state TEXT,\n    duration_seconds INT,\n    xmin_horizon_age INT\n);\nINSERT INTO transaction_activity_monitor VALUES (4821, 'etl_worker', 'idle in transaction', 380, 450000);\nINSERT INTO transaction_activity_monitor VALUES (4822, 'analytics_dwh', 'active', 120, 120000);\nINSERT INTO transaction_activity_monitor VALUES (4823, 'web_api', 'idle', 5, 0);\nINSERT INTO transaction_activity_monitor VALUES (4824, 'bi_dashboard', 'idle in transaction', 75, 85000);\nINSERT INTO transaction_activity_monitor VALUES (4825, 'reporting_svc', 'idle in transaction', 20, 10000);",
  "initialCode": "-- Выявите опасные транзакции, блокирующие очистку MVCC\nSELECT \n    pid,\n    usename,\n    state,\n    duration_seconds,\n    'WARNING' AS severity\nFROM transaction_activity_monitor;",
  "solutionCode": "SELECT \n    pid,\n    usename,\n    state,\n    duration_seconds,\n    CASE \n        WHEN duration_seconds >= 300 THEN 'CRITICAL'\n        ELSE 'WARNING'\n    END AS severity\nFROM transaction_activity_monitor\nWHERE state IN ('idle in transaction', 'active')\n  AND duration_seconds >= 60\nORDER BY duration_seconds DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "requiredAstPatterns": [
      "CASE",
      "WHEN",
      "WHERE",
      "ORDER BY"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #302: Скрипт мониторинга пропускает зависшие транзакции",
    "incidentDescription": "Скрипт алерта отслеживал только состояние 'active', пропуская опаснейшее состояние 'idle in transaction', из-за чего зависшая сессия заблокировала очистку таблицы на 6 часов и вызвала Bloat на 120 ГБ.",
    "buggyCode": "SELECT pid, usename, duration_seconds FROM transaction_activity_monitor WHERE state = 'active' AND duration_seconds > 60;",
    "fixHint": "Добавьте проверку состояния 'idle in transaction' через оператор IN ('active', 'idle in transaction').",
    "solutionCode": "SELECT pid, usename, duration_seconds FROM transaction_activity_monitor WHERE state IN ('active', 'idle in transaction') AND duration_seconds > 60;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "idle in transaction"
      ]
    }
  },
  "hints": [
    "Используйте конструкцию CASE WHEN duration_seconds >= 300 THEN 'CRITICAL' ELSE 'WARNING' END AS severity.",
    "Отфильтруйте состояния через state IN ('idle in transaction', 'active') и длительность duration_seconds >= 60.",
    "Упорядочите вывод по убыванию времени работы: ORDER BY duration_seconds DESC."
  ]
};
