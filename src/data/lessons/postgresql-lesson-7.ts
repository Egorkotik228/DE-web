import { Lesson } from '@/types/course';

export const postgresqlLesson7: Lesson = {
  "id": "postgresql-7",
  "moduleSlug": "postgresql",
  "order": 7,
  "title": "Анатомия индексов: B-Tree (Леман-Яо), BRIN, GIN, Covering (INCLUDE) и Partial индексы",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "B-Tree (Lehman & Yao)",
      "definition": "Сбалансированное дерево поиска в PostgreSQL с правыми ссылками (right-links) и high keys на страницах, позволяющее выполнять конкурентные расщепления узлов (splits) без глобальной блокировки дерева."
    },
    {
      "term": "BRIN (Block Range Index)",
      "definition": "Легковесный индекс для больших физически упорядоченных таблиц (time-series, logs), хранящий только min/max значения для диапазонов 8 КБ страниц (обычно 128 блоков = 1 МБ)."
    },
    {
      "term": "Covering Index (INCLUDE)",
      "definition": "Индекс, в листовые страницы которого добавлены неключевые колонки (payload), позволяющий выполнять Index-Only Scan без похода в Heap и без раздувания внутренних узлов дерева."
    },
    {
      "term": "GIN (Generalized Inverted Index)",
      "definition": "Инвертированный индекс для массивов, полнотекстового поиска и JSONB (операторы @>, ?), сопоставляющий каждый элемент или ключ со списком физических указателей ctid."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "index_efficiency_audit",
      "columns": [
        {
          "name": "index_name",
          "type": "TEXT",
          "keyType": "PK"
        },
        {
          "name": "table_name",
          "type": "TEXT"
        },
        {
          "name": "index_type",
          "type": "TEXT"
        },
        {
          "name": "index_size_mb",
          "type": "FLOAT"
        },
        {
          "name": "idx_scan_count",
          "type": "INTEGER"
        },
        {
          "name": "correlation",
          "type": "FLOAT"
        }
      ],
      "sampleRows": [
        {
          "index_name": "idx_orders_created_at_brin",
          "table_name": "orders_archive",
          "index_type": "BRIN",
          "index_size_mb": 2.5,
          "idx_scan_count": 85000,
          "correlation": 0.99
        },
        {
          "index_name": "idx_orders_created_at_btree",
          "table_name": "orders_archive",
          "index_type": "BTREE",
          "index_size_mb": 4800.0,
          "idx_scan_count": 120,
          "correlation": 0.99
        },
        {
          "index_name": "idx_events_user_id_brin",
          "table_name": "events_log",
          "index_type": "BRIN",
          "index_size_mb": 1.8,
          "idx_scan_count": 500,
          "correlation": 0.02
        },
        {
          "index_name": "idx_users_email_btree",
          "table_name": "users",
          "index_type": "BTREE",
          "index_size_mb": 120.0,
          "idx_scan_count": 950000,
          "correlation": 0.15
        },
        {
          "index_name": "idx_old_sessions_unused",
          "table_name": "web_sessions",
          "index_type": "BTREE",
          "index_size_mb": 650.0,
          "idx_scan_count": 0,
          "correlation": 0.05
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия индексов PostgreSQL: Как данные адресуются под капотом\n\nИндекс в реляционной СУБД — это отдельный файл на диске, представляющий собой специализированную структуру данных, связывающую значения индексированных колонок с физическими адресами строк (`ctid`) в основной таблице (Heap).\n\n#### B-Tree по алгоритму Лемана-Яо (Lehman & Yao)\nСтандартный B-Tree в PostgreSQL — это не классическое академическое B-дерево, а его высококонкурентная модификация **Lehman-Yao B-Tree**:\n1. **Мета-страница (Meta page):** Хранит корневой блок (Root), версию и глубину дерева.\n2. **Внутренние страницы (Internal pages):** Хранят ключи и указатели на дочерние страницы следующего уровня.\n3. **Листовые страницы (Leaf pages):** Хранят реальные ключи и физические `ctid` строк в таблице. Все листовые страницы связаны в **двунаправленный связный список**, что делает диапазоны `WHERE x BETWEEN 10 AND 100` и сортировку `ORDER BY` невероятно быстрыми.\n4. **Right-Link и High-Key:** В классическом дереве при делении переполненной страницы (page split) нужно было блокировать всё поддерево от корня. В алгоритме Лемана-Яо каждая страница имеет `high key` (верхняя граница ключей блока) и `right-link` (указатель на правого соседа). При сплите читающий процесс не блокируется: если он ищет ключ больше `high key`, он просто мгновенно переходит вправо по ссылке!\n5. **Дедупликация B-Tree (PostgreSQL 13+):** Если миллион строк имеют одинаковое значение (например, `status = 'ACTIVE'`), Postgres не дублирует ключ миллион раз, а хранит один ключ и плотный массив `ctid` (Posting List), экономя до 40% диска.\n\n#### Покрывающие индексы (Covering Indexes) через INCLUDE\nЧасто в запросе требуется не только отфильтровать данные, но и вернуть пару дополнительных колонок:\n```sql\nSELECT order_id, order_date, amount FROM orders WHERE order_date >= '2026-01-01';\n```\nЕсли индекс построен как `CREATE INDEX (order_date, amount)`, значение `amount` будет храниться на ВСЕХ уровнях дерева (в корне, ветвях и листьях), раздувая размер индекса.\n\nКонструкция **INCLUDE** решает эту проблему:\n```sql\nCREATE INDEX idx_orders_covering ON orders (order_date) INCLUDE (amount);\n```\nКолонка `amount` записывается **только в листовые страницы** (payload). Это позволяет планировщику выполнить **Index-Only Scan** (взять `amount` прямо из индекса без похода в Heap), не утяжеляя дерево и не накладывая ограничений уникальности на колонку `amount`.\n\n#### Частичные индексы (Partial Indexes)\nВ аналитических базах часто 95% строк находятся в терминальном статусе (`COMPLETED`), а запросы ищут оставшиеся 5% (`PENDING`):\n```sql\nCREATE INDEX idx_orders_pending ON orders (created_at) WHERE status = 'PENDING';\n```\nЧастичный индекс отслеживает только строки, удовлетворяющие условию `WHERE`. Он в 20 раз меньше полного B-Tree, мгновенно помещается в кэш процессора и не замедляет вставки заказов в статусе `COMPLETED`!\n\n#### Специализированные индексы: BRIN и GIN\n1. **BRIN (Block Range Index):**\n   - Индекс диапазонов блоков: на каждые 128 страниц (1 МБ данных) сохраняет всего 2 значения: `[min, max]`.\n   - Таблица на 1 миллиард строк в B-Tree весит 35 ГБ, а в BRIN — всего **15–20 Мегабайт**!\n   - **Условие применимости:** Физическая упорядоченность данных на диске (`correlation ≈ 1.0` в `pg_stats`). Идеален для `created_at` в логах, где строки пишутся строго последовательно.\n   - **Ловушка:** Если разброс случаен (`correlation < 0.5`), диапазон каждого мегабайта покрывает все значения, и BRIN вырождается в пустой `Seq Scan`.\n2. **GIN (Generalized Inverted Index):**\n   - Инвертированный индекс для `JSONB`, массивов и полнотекстового поиска: каждому вложенному ключу/элементу сопоставляется список строк `ctid`.\n   - `jsonb_path_ops` vs `jsonb_ops`: `jsonb_path_ops` хэширует цепочку путь+значение (`{\"user\": {\"age\": 30}}`), работает в 3 раза быстрее и занимает меньше места, но поддерживает только оператор `@>`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Предметный указатель против этикеток на коробках",
      "content": "B-Tree — это подробнейший алфавитный указатель в конце энциклопедии: на каждое отдельное слово указана конкретная страница. Находит точечно за долю секунды, но сам указатель весит как треть книги. BRIN — это крупные наклейки на ящиках в архивном складе: «Документы с 1 по 10 000», «Документы с 10 001 по 20 000». Наклейка занимает минимум места, но работает только тогда, когда папки складывали на полки строго по порядку номеров!"
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение архитектур индексов: B-Tree vs BRIN на таблице логов 1 млрд строк",
        "beforeDescription": "Классический сбалансированный B-Tree (Lehman & Yao)",
        "beforeColumns": [
          "Параметр сравнения",
          "B-Tree индекс",
          "BRIN индекс (Block Range)"
        ],
        "beforeRows": [
          [
            "Размер на 1 млрд строк",
            "32 ГБ (забивает shared_buffers)",
            "18 МБ (помещается в L3 кэш CPU)"
          ],
          [
            "Накладные расходы на INSERT",
            "Высокие (поиск и деление страниц)",
            "Минимальные (проверка min/max диапазона)"
          ],
          [
            "Требование к данным",
            "Любая кардинальность и случайный порядок",
            "Строгая сортировка (correlation ≈ 1.0)"
          ]
        ],
        "afterDescription": "Легковесный блочный индекс BRIN для упорядоченных time-series таблиц",
        "afterColumns": [
          "Параметр сравнения",
          "B-Tree индекс",
          "BRIN индекс (Block Range)"
        ],
        "afterRows": [
          [
            "Размер на 1 млрд строк",
            "32 ГБ (забивает shared_buffers)",
            "18 МБ (помещается в L3 кэш CPU)"
          ],
          [
            "Накладные расходы на INSERT",
            "Высокие (поиск и деление страниц)",
            "Минимальные (проверка min/max диапазона)"
          ],
          [
            "Требование к данным",
            "Любая кардинальность и случайный порядок",
            "Строгая сортировка (correlation ≈ 1.0)"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: CREATE INDEX без CONCURRENTLY блокирует прод",
      "content": "Команда CREATE INDEX по умолчанию берет блокировку ShareLock. Она позволяет читать таблицу, но НАГЛУХО БЛОКИРУЕТ любые INSERT, UPDATE и DELETE на все время создания индекса (которое на таблице в 100 млн строк может длиться 40 минут!). Очередь транзакций мгновенно переполняет max_connections, и сайт падает. Всегда используйте на проде: CREATE INDEX CONCURRENTLY!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем отличие составного ключа (a, b) от покрывающего (a) INCLUDE (b)?",
      "content": "В составном индексе (a, b) оба поля участвуют в навигации по всему дереву, сохраняются на внутренних узлах и могут использоваться для многоколоночной сортировки и фильтрации. В покрывающем индексе (a) INCLUDE (b) колонка b хранится ТОЛЬКО в листовых страницах (Leaf). Она не раздувает внутренние узлы B-Tree, не участвует в уникальности (если индекс UNIQUE), но позволяет планировщику выполнить Index-Only Scan без похода в Heap."
    }
  ],
  "taskDescription": "Перед вами таблица аудита индексов кластера `index_efficiency_audit`. Для оптимизации дискового пространства и устранения архитектурных ошибок напишите SQL-запрос, который классифицирует индексы и формирует рекомендацию (`recommendation`):\n1. 'REPLACE_BRIN_WITH_BTREE' — для BRIN-индексов с низкой корреляцией (`index_type = 'BRIN' AND correlation < 0.8`), которые неэффективны и вызывают лишний I/O.\n2. 'REPLACE_BTREE_WITH_BRIN' — для тяжелых B-Tree индексов (`index_type = 'BTREE' AND index_size_mb >= 500.0`), построенных по строго отсортированным колонкам (`correlation >= 0.95`), где BRIN сэкономит гигабайты памяти.\n3. 'DROP_UNUSED_INDEX' — для неиспользуемых индексов любого типа (`idx_scan_count = 0 AND index_size_mb >= 50.0`), которые только замедляют вставки.\n4. Запрос должен возвращать: `index_name`, `table_name`, `index_type`, `index_size_mb`, `recommendation`.\n5. Отфильтруйте только те индексы, которые попали под одну из этих 3 категорий, и отсортируйте результат по убыванию `index_size_mb`.",
  "seedCode": "CREATE TABLE index_efficiency_audit (\n    index_name TEXT PRIMARY KEY,\n    table_name TEXT,\n    index_type TEXT,\n    index_size_mb REAL,\n    idx_scan_count INT,\n    correlation REAL\n);\nINSERT INTO index_efficiency_audit VALUES ('idx_orders_created_at_brin', 'orders_archive', 'BRIN', 2.5, 85000, 0.99);\nINSERT INTO index_efficiency_audit VALUES ('idx_orders_created_at_btree', 'orders_archive', 'BTREE', 4800.0, 120, 0.99);\nINSERT INTO index_efficiency_audit VALUES ('idx_events_user_id_brin', 'events_log', 'BRIN', 1.8, 500, 0.02);\nINSERT INTO index_efficiency_audit VALUES ('idx_users_email_btree', 'users', 'BTREE', 120.0, 950000, 0.15);\nINSERT INTO index_efficiency_audit VALUES ('idx_old_sessions_unused', 'web_sessions', 'BTREE', 650.0, 0, 0.05);\nINSERT INTO index_efficiency_audit VALUES ('idx_logs_timestamp_btree', 'app_logs', 'BTREE', 2100.0, 450, 0.98);",
  "initialCode": "-- Выявите неэффективные индексы и сформируйте рекомендации по оптимизации\nSELECT \n    index_name,\n    table_name,\n    index_type,\n    index_size_mb,\n    'RECOMMENDATION' AS recommendation\nFROM index_efficiency_audit;",
  "solutionCode": "SELECT \n    index_name,\n    table_name,\n    index_type,\n    index_size_mb,\n    CASE \n        WHEN index_type = 'BRIN' AND correlation < 0.8 THEN 'REPLACE_BRIN_WITH_BTREE'\n        WHEN index_type = 'BTREE' AND correlation >= 0.95 AND index_size_mb >= 500.0 THEN 'REPLACE_BTREE_WITH_BRIN'\n        WHEN idx_scan_count = 0 AND index_size_mb >= 50.0 THEN 'DROP_UNUSED_INDEX'\n    END AS recommendation\nFROM index_efficiency_audit\nWHERE (index_type = 'BRIN' AND correlation < 0.8)\n   OR (index_type = 'BTREE' AND correlation >= 0.95 AND index_size_mb >= 500.0)\n   OR (idx_scan_count = 0 AND index_size_mb >= 50.0)\nORDER BY index_size_mb DESC;",
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
    "title": "Инцидент #305: Падение прода из-за эксклюзивной блокировки CREATE INDEX",
    "incidentDescription": "Дата-инженер выполнил миграцию CREATE INDEX idx_orders_status ON orders (status); в 12:00 на таблице из 80 млн строк. Команда захватила ShareLock, заблокировав все клиентские вставки. Требуется переписать команду с неблокирующим созданием индекса.",
    "buggyCode": "CREATE INDEX idx_orders_status ON orders (status);",
    "fixHint": "Добавьте ключевое слово CONCURRENTLY для неблокирующего создания индекса без эксклюзивных блокировок.",
    "solutionCode": "CREATE INDEX CONCURRENTLY idx_orders_status ON orders (status);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "CREATE",
        "INDEX",
        "CONCURRENTLY"
      ]
    }
  },
  "hints": [
    "Используйте конструкцию CASE WHEN ... THEN ... END для вычисления поля recommendation.",
    "Не забудьте продублировать логические условия категорий в предложении WHERE через OR.",
    "Отсортируйте вывод по размеру индекса: ORDER BY index_size_mb DESC."
  ]
};
