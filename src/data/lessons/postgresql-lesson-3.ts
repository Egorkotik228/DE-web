import { Lesson } from '@/types/course';

export const postgresqlLesson3: Lesson = {
  "id": "postgresql-3",
  "moduleSlug": "postgresql",
  "order": 3,
  "title": "Table & Index Bloat, VACUUM, Autovacuum, карты FSM/VM и HOT-обновления",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Table Bloat (Раздувание)",
      "definition": "Накопление «мертвых» версий строк (Dead Tuples) и пустых страниц на диске после операций UPDATE/DELETE, приводящее к замедлению Seq Scan и росту дискового I/O."
    },
    {
      "term": "HOT (Heap-Only Tuple)",
      "definition": "Оптимизация обновлений в PostgreSQL: новая версия строки размещается на той же 8 КБ странице, связывается цепочкой указателей ctid и не требует перестроения индексов таблицы."
    },
    {
      "term": "Visibility Map (VM)",
      "definition": "Служебная битовая карта таблицы, отслеживающая страницы, где все строки гарантированно видимы всем транзакциям (позволяет VACUUM пропускать блоки, а планировщику делать Index-Only Scan)."
    },
    {
      "term": "Free Space Map (FSM)",
      "definition": "Служебная бинарная карта свободного пространства страниц таблицы, используемая для мгновенного поиска 8 КБ блока, в который поместится новый кортеж при INSERT/UPDATE."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "table_bloat_monitoring",
      "columns": [
        {
          "name": "relname",
          "type": "TEXT",
          "keyType": "PK"
        },
        {
          "name": "n_live_tup",
          "type": "INTEGER"
        },
        {
          "name": "n_dead_tup",
          "type": "INTEGER"
        },
        {
          "name": "autovacuum_threshold",
          "type": "INTEGER"
        },
        {
          "name": "table_size_mb",
          "type": "FLOAT"
        }
      ],
      "sampleRows": [
        {
          "relname": "orders",
          "n_live_tup": 10000000,
          "n_dead_tup": 2800000,
          "autovacuum_threshold": 2000050,
          "table_size_mb": 4200.0
        },
        {
          "relname": "users",
          "n_live_tup": 5000000,
          "n_dead_tup": 150000,
          "autovacuum_threshold": 1000050,
          "table_size_mb": 850.0
        },
        {
          "relname": "inventory_items",
          "n_live_tup": 2000000,
          "n_dead_tup": 950000,
          "autovacuum_threshold": 400050,
          "table_size_mb": 980.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия раздувания (Bloat) таблиц и индексов в PostgreSQL\n\nИз-за многоверсионной модели MVCC операции `DELETE` и `UPDATE` никогда не перезаписывают данные на месте. При каждом `UPDATE` создается новая версия строки, а старая помечается мертвой (`dead tuple`).\n\nЕсли таблица заказов содержит 10 миллионов строк, но за сутки в ней происходит 20 миллионов обновлений статусов, в файле таблицы на диске скапливаются десятки миллионов мертвых кортежей. Таблица раздувается с 2 ГБ до **30 ГБ** (явление **Table Bloat**). Запрос `SELECT COUNT(*)` или `Seq Scan` вынужден считывать с диска гигантский массив пустых и мертвых страниц, что обрушивает производительность ввода-вывода (I/O) и забивает кэш `shared_buffers` мусором.\n\n#### Физика работы VACUUM: что он делает, а чего не делает\nСтандартная команда `VACUUM` (и фоновый демон `Autovacuum`):\n1. **Очищает мертвые кортежи:** Удаляет указатели `Line Pointers` на мертвые строки внутри 8 КБ страниц, освобождая место для будущих вставок `INSERT`.\n2. **Обновляет FSM (Free Space Map):** Записывает освобожденные байты в карту свободного пространства, чтобы новые строки вставлялись в старые дыры, а не расширяли файл таблицы.\n3. **Обновляет VM (Visibility Map):** Помечает страницы, где больше нет мертвых строк, флагом `all-visible` (это дает колоссальное ускорение `Index-Only Scan`).\n4. **НЕ блокирует пользователей:** Работает в фоне в режиме `ShareUpdateExclusiveLock`, позволяя параллельно читать и изменять таблицу.\n5. **⚠️ ВАЖНО:** Обычный `VACUUM` **НЕ возвращает место операционной системе**! Размер файла на диске остается прежним (за исключением обрезки пустых блоков в самом хвосте файла — page truncation).\n\n#### VACUUM FULL vs pg_repack: Как сжать таблицу на диске\n- **VACUUM FULL:** Создает новый файл таблицы, копирует туда только живые кортежи и удаляет старый раздутый файл. Место на диске освобождается полностью. **Опасность:** берет `AccessExclusiveLock` — блокирует ЛЮБЫЕ операции чтения и записи на все время перестроения (часы простоя на больших базах!).\n- **pg_repack:** Утилита онлайн-компактизации. Создает теневую таблицу (shadow table), копирует данные, переносит инкрементальные изменения через триггер и подменяет файлы с блокировкой всего на доли секунды.\n\n#### HOT (Heap-Only Tuple) обновления: Спасение индексов\nЕсли у таблицы 10 индексов, обычный `UPDATE` обязан добавить новую запись в каждый из 10 индексов (так как изменился `ctid` строки). Это вызывает колоссальный write amplification.\n\nМеханизм **HOT-обновления** активируется автоматически, если соблюдены 2 условия:\n1. Ни одна из колонок, входящих в индексы таблицы, **не была изменена** в запросе `UPDATE`.\n2. На текущей 8 КБ странице есть свободное место (`Free Space`) для размещения новой версии строки.\n\nВ этом случае PostgreSQL сохраняет новую строку на той же странице и связывает старый Line Pointer с новым цепочкой указателей прямо в Heap. **Индексы не трогаются вообще!** Для поддержки HOT часто обновляемым таблицам задают параметр `fillfactor`:\n```sql\nALTER TABLE orders SET (fillfactor = 80);\n```\nЭто оставляет 20% свободного места на каждой странице специально под будущие HOT-обновления.\n\n#### Тюнинг Autovacuum на больших объемах\nПо умолчанию порог запуска очистки рассчитывается как:\n`threshold = autovacuum_vacuum_threshold (50) + autovacuum_vacuum_scale_factor (0.2) * n_live_tup`.\nДля таблицы на 100 млн строк `scale_factor = 0.2` означает, что Autovacuum запустится только после накопления **20 миллионов мертвых строк**! За это время диск кластера успеет переполниться.\n\n**Решение для Highload DWH:** переопределение параметров на уровне конкретных тяжелых таблиц:\n```sql\nALTER TABLE orders SET (\n    autovacuum_vacuum_scale_factor = 0.01,\n    autovacuum_vacuum_cost_limit = 2000\n);\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Уборка в квартирах против сноса дома",
      "content": "Обычный VACUUM — это уборка мусора в освободившихся квартирах жилого дома. Комнаты очистились, в них можно заселять новых жильцов (новые INSERT), но сам дом меньше по высоте не стал, и земельный участок городу (ОС) не вернулся. VACUUM FULL — это принудительное выселение всех жителей в палаточный лагерь (AccessExclusiveLock), полный снос старого 20-этажного дома и постройка компактной 5-этажки на освободившейся земле. Вход закрыт для всех, жизнь парализована."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение дефолтного Autovacuum и настроенного под Highload",
        "beforeDescription": "Дефолтные настройки PostgreSQL для скромных веб-приложений",
        "beforeColumns": [
          "Параметр / Метрика",
          "Дефолтный Autovacuum (scale=0.2)",
          "Highload тюнинг (scale=0.01 + HOT)"
        ],
        "beforeRows": [
          [
            "Порог очистки (100M строк)",
            "20 000 050 мертвых строк",
            "1 000 050 мертвых строк"
          ],
          [
            "Запас под HOT-обновления",
            "0% запаса (fillfactor = 100)",
            "20% свободного места (fillfactor = 80)"
          ],
          [
            "Динамика раздувания Bloat",
            "Пиковый Bloat до 40–60%",
            "Стабильный Bloat < 5% без всплесков"
          ]
        ],
        "afterDescription": "Агрессивный тюнинг для тяжелых OLTP/DWH таблиц",
        "afterColumns": [
          "Параметр / Метрика",
          "Дефолтный Autovacuum (scale=0.2)",
          "Highload тюнинг (scale=0.01 + HOT)"
        ],
        "afterRows": [
          [
            "Порог очистки (100M строк)",
            "20 000 050 мертвых строк",
            "1 000 050 мертвых строк"
          ],
          [
            "Запас под HOT-обновления",
            "0% запаса (fillfactor = 100)",
            "20% свободного места (fillfactor = 80)"
          ],
          [
            "Динамика раздувания Bloat",
            "Пиковый Bloat до 40–60%",
            "Стабильный Bloat < 5% без всплесков"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: VACUUM FULL в разгар рабочего дня",
      "content": "Классическая авария: заметив раздувание таблицы orders на 40 ГБ, инженер выполнил команду VACUUM FULL orders; в 14:00. Команда захватила AccessExclusiveLock. Все входящие заказы клиентов встали в очередь ожидания блокировки, пулы соединений бэкендов мгновенно переполнились, и веб-сайт лег с ошибками 504 Gateway Timeout. Запомните: на живом проде компактизацию проводят строго через pg_repack!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: При каких условиях работает HOT (Heap-Only Tuple) обновление?",
      "content": "Для успешного применения HOT-обновления требуются строго два условия: 1) Ни одна колонка, по которой построен хотя бы один индекс таблицы, не обновляется в выражении SET; 2) На той же самой 8 КБ странице, где находится текущая версия строки, имеется достаточное количество свободного пространства (Free Space) для размещения нового кортежа. Если места нет или затронут индекс, HOT не срабатывает, и Postgres создает новые записи во всех индексах таблицы."
    }
  ],
  "taskDescription": "Перед вами таблица мониторинга состояния таблиц кластера PostgreSQL `table_bloat_monitoring`. Напишите SQL-запрос, который:\n1. Для каждой таблицы рассчитывает процент раздувания мертвыми строками (`bloat_pct`): `(n_dead_tup * 100.0) / (n_live_tup + n_dead_tup)`, округленный до 2 знаков после запятой.\n2. Формирует статус срочности очистки (`vacuum_urgency`):\n   - 'IMMEDIATE_ACTION', если количество мертвых строк превысило порог автовакуума (`n_dead_tup >= autovacuum_threshold`);\n   - 'STABLE', если порог еще не достигнут.\n3. Фильтрует только проблемные таблицы, накопившие не менее 500 000 мертвых строк (`n_dead_tup >= 500000`).\n4. Выводит поля: `relname`, `n_live_tup`, `n_dead_tup`, `bloat_pct`, `vacuum_urgency`.\n5. Сортирует результат по убыванию процента раздувания `bloat_pct`.",
  "seedCode": "CREATE TABLE table_bloat_monitoring (\n    relname TEXT PRIMARY KEY,\n    n_live_tup INT,\n    n_dead_tup INT,\n    autovacuum_threshold INT,\n    table_size_mb REAL\n);\nINSERT INTO table_bloat_monitoring VALUES ('orders', 10000000, 2800000, 2000050, 4200.0);\nINSERT INTO table_bloat_monitoring VALUES ('users', 5000000, 150000, 1000050, 850.0);\nINSERT INTO table_bloat_monitoring VALUES ('inventory_items', 2000000, 950000, 400050, 980.0);\nINSERT INTO table_bloat_monitoring VALUES ('audit_events', 8000000, 600000, 1600050, 2100.0);",
  "initialCode": "-- Рассчитайте bloat_pct и определите необходимость запуска vacuum\nSELECT \n    relname,\n    n_live_tup,\n    n_dead_tup,\n    0.0 AS bloat_pct,\n    'STABLE' AS vacuum_urgency\nFROM table_bloat_monitoring;",
  "solutionCode": "SELECT \n    relname,\n    n_live_tup,\n    n_dead_tup,\n    ROUND((n_dead_tup * 100.0) / (n_live_tup + n_dead_tup), 2) AS bloat_pct,\n    CASE \n        WHEN n_dead_tup >= autovacuum_threshold THEN 'IMMEDIATE_ACTION'\n        ELSE 'STABLE'\n    END AS vacuum_urgency\nFROM table_bloat_monitoring\nWHERE n_dead_tup >= 500000\nORDER BY bloat_pct DESC;",
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
    "title": "Инцидент #303: Блокировка прода из-за применения VACUUM FULL в дневное время",
    "incidentDescription": "Junior-инженер обнаружил Bloat на таблице платежей payments и выполнил VACUUM FULL payments;, что вызвало AccessExclusiveLock и парализовало обработку платежей на 25 минут. Требуется заменить блокирующую команду на безопасную регулярную очистку без эксклюзивной блокировки.",
    "buggyCode": "VACUUM FULL payments;",
    "fixHint": "Используйте безопасный неблокирующий VACUUM ANALYZE payments; который собирает статистику и очищает страницы без эксклюзивных блокировок.",
    "solutionCode": "VACUUM ANALYZE payments;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "VACUUM",
        "ANALYZE",
        "payments"
      ]
    }
  },
  "hints": [
    "Формула процента раздувания: ROUND((n_dead_tup * 100.0) / (n_live_tup + n_dead_tup), 2).",
    "Используйте конструкцию CASE WHEN n_dead_tup >= autovacuum_threshold THEN 'IMMEDIATE_ACTION' ELSE 'STABLE' END.",
    "Укажите условие WHERE n_dead_tup >= 500000 и выполните сортировку ORDER BY bloat_pct DESC."
  ]
};
