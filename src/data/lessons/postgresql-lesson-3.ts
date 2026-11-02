import { Lesson } from '@/types/course';

export const postgresqlLesson3: Lesson = {
  "id": "postgresql-3",
  "moduleSlug": "postgresql",
  "order": 3,
  "title": "Физика хранения: Страницы (Pages 8 КБ), Heap, Tuple Header и TOAST",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Page (Страница 8 КБ)",
      "definition": "Базовый квант дискового ввода-вывода в PostgreSQL размером 8192 байта, содержащий заголовок, массив указателей Line Pointers и сами кортежи данных."
    },
    {
      "term": "HeapTupleHeader",
      "definition": "Заголовок кортежа размером 23 байта, содержащий системные метаданные видимости: t_xmin, t_xmax, t_cid, t_ctid, t_infomask и битовую маску NULL."
    },
    {
      "term": "Column Alignment (Column Tetris)",
      "definition": "Аппаратное выравнивание типов данных по границам адресов (2, 4, 8 байт). Неоптимальный порядок колонок создает байтовые дыры (Padding) и раздувает таблицу на 20–30%."
    },
    {
      "term": "TOAST",
      "definition": "The Oversized-Attribute Storage Technique — механизм выноса широких полей (>2 КБ) в отдельную вспомогательную таблицу со сжатием (pglz/lz4) и нарезкой на чанки."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "table_storage_audit",
      "columns": [
        {
          "name": "table_name",
          "type": "TEXT",
          "keyType": "PK"
        },
        {
          "name": "unaligned_row_bytes",
          "type": "INTEGER"
        },
        {
          "name": "aligned_row_bytes",
          "type": "INTEGER"
        },
        {
          "name": "total_rows",
          "type": "INTEGER"
        },
        {
          "name": "toast_bytes",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "table_name": "user_profiles",
          "unaligned_row_bytes": 48,
          "aligned_row_bytes": 32,
          "total_rows": 2000000,
          "toast_bytes": 10485760
        },
        {
          "table_name": "audit_logs",
          "unaligned_row_bytes": 56,
          "aligned_row_bytes": 40,
          "total_rows": 5000000,
          "toast_bytes": 0
        },
        {
          "table_name": "product_catalog",
          "unaligned_row_bytes": 40,
          "aligned_row_bytes": 36,
          "total_rows": 500000,
          "toast_bytes": 52428800
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Как таблица PostgreSQL физически устроена на диске\n\nВ реляционной СУБД PostgreSQL таблицы и индексы не хранятся единым неделимым файлом. В директории кластера `$PGDATA/base/<db_oid>/<relfilenode>` таблица разбивается на сегменты по **1 ГБ** (чтобы не упираться в лимиты файловых систем на старых ОС).\n\nКаждый гигабайтный сегмент представляет собой непрерывный массив **страниц памяти (Pages / Blocks)** фиксированного размера **8192 байта (8 КБ)**. Именно страница является атомарной единицей дискового ввода-вывода (I/O) и кэширования в общем пуле памяти СУБД — `shared_buffers`.\n\n#### Внутренняя анатомия 8-килобайтной страницы (Page Layout)\nСтраница организована по принципу «встречного движения»:\n1. **PageHeaderData (24 байта):** Заголовок страницы в самом начале. Хранит LSN (Log Sequence Number) последней записи WAL для контроля целостности, контрольную сумму (checksum), смещения свободного пространства `pd_lower` и `pd_upper`.\n2. **Массив указателей Line Pointers (ItemIdData):** Растет **сверху вниз** (сразу после `PageHeaderData`). Каждый указатель занимает ровно **4 байта** и содержит флаги состояния, смещение и длину соответствующей строки в байтах.\n3. **Свободное пространство (Free Space):** Дырка между концом массива указателей `pd_lower` и началом данных кортежей `pd_upper`. Сюда вставляются новые строки.\n4. **Кортежи строк (HeapTupleData):** Записываются в конец страницы и растут **снизу вверх**.\n5. **Физический адрес `ctid`:** Пара чисел `(номер_страницы, номер_указателя_в_массиве)`, например `(0, 1)`. Индексы B-Tree указывают именно на `ctid` (Line Pointer), а не на физические байты строки в куче. Если кортеж перемещается внутри страницы при HOT-обновлении (Heap-Only Tuple), `ctid` в индексе не меняется!\n\n#### Заголовок строки HeapTupleHeader и Column Tetris (Выравнивание данных)\nКаждая отдельная строка на диске предваряется тяжелым заголовком **HeapTupleHeader (23 байта)**:\n- `t_xmin` (4 байта) — XID транзакции создания.\n- `t_xmax` (4 байта) — XID транзакции удаления/обновления.\n- `t_cid` (4 байта) — Command ID внутри транзакции.\n- `t_ctid` (6 байт) — физический адрес текущей или более свежей версии строки.\n- `t_infomask` (4 байта) — битовые флаги статуса (наличие NULL, коммит транзакции).\n- Битовая маска NULL (Null Bitmap, переменная длина, минимум 1 байт).\n\nЗатем следует архитектурное выравнивание процессора (**CPU Memory Alignment**): 8-байтовые типы (`int8`, `timestamptz`, `float8`) обязаны начинаться по адресам, кратным 8 байтам. 4-байтовые (`int4`) — кратным 4, 2-байтовые (`int2`) — кратным 2.\n\n```text\n❌ НЕОПТИМАЛЬНЫЙ ПОРЯДОК: CREATE TABLE bad (a int2, b int8, c int2, d int8);\n[Заголовок 23Б] + [pad 1Б] + [a: 2Б] + [pad 6Б!] + [b: 8Б] + [c: 2Б] + [pad 6Б!] + [d: 8Б] = 48 байт!\n\n✅ ОПТИМИЗИРОВАННЫЙ (Column Tetris): CREATE TABLE good (b int8, d int8, a int2, c int2);\n[Заголовок 23Б] + [pad 1Б] + [b: 8Б] + [d: 8Б] + [a: 2Б] + [c: 2Б] + [pad 4Б] = 40 байт! (Экономия 17% диска!)\n```\n\n#### Механизм TOAST (The Oversized-Attribute Storage Technique)\nЕсли размер строки превышает четверть страницы (~2 КБ, `TOAST_TUPLE_THRESHOLD`), строка не поместится в страницу. PostgreSQL активирует механизм **TOAST**:\n1. Широкое поле сжимается (алгоритм `pglz` по умолчанию или современный `lz4`).\n2. Если поле все еще велико, оно разрезается на чанки по ~2 КБ и выносится в отдельную скрытую таблицу `pg_toast_<oid>`.\n3. В исходной строке остается 18-байтовый указатель `TOAST Pointer`.\n\nСтратегии хранения колонок:\n- `PLAIN`: сжатие и вынос запрещены (только числа и короткие типы).\n- `EXTENDED`: сначала сжатие, если не помогло — вынос в TOAST (по умолчанию для `TEXT`, `JSONB`, `BYTEA`).\n- `EXTERNAL`: вынос в TOAST без сжатия (ускоряет работу с подстроками).\n- `MAIN`: сжатие разрешено, но вынос в TOAST только в крайнем случае."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Гостиничный этаж с ресепшеном",
      "content": "Страница 8 КБ — это гостиничный этаж. Входной ресепшен — это Line Pointers: он выдает гостю карточку с номером 1, 2, 3... Сами гости (строки) заселяются в номера в глубине коридора. Курьеры доставки (индексы B-Tree) знают только: «Этаж 4, гость №2». Если гость сменил комнату на том же этаже (HOT-обновление), ресепшен просто меняет стрелочку у себя в журнале. Внешним курьерам не нужно менять свои карты и адресные книги!"
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение физического выравнивания колонок в PostgreSQL (Column Tetris)",
        "beforeDescription": "Неоптимальный порядок колонок с фрагментацией памяти (Padding Holes)",
        "beforeColumns": [
          "Параметр",
          "Хаотичный порядок колонок",
          "Оптимальный Column Tetris"
        ],
        "beforeRows": [
          [
            "Схема таблицы",
            "int2, int8, int2, int8",
            "int8, int8, int2, int2"
          ],
          [
            "Размер кортежа в RAM/диске",
            "48 байт (13 байт пустых дыр)",
            "40 байт (минимум padding)"
          ],
          [
            "Объем таблицы на 100M строк",
            "4.8 ГБ (Heap) + медленный I/O",
            "4.0 ГБ (экономия 800 МБ)"
          ]
        ],
        "afterDescription": "Оптимальный порядок: тяжелые 8-байтовые типы первыми, мелкие в конце",
        "afterColumns": [
          "Параметр",
          "Хаотичный порядок колонок",
          "Оптимальный Column Tetris"
        ],
        "afterRows": [
          [
            "Схема таблицы",
            "int2, int8, int2, int8",
            "int8, int8, int2, int2"
          ],
          [
            "Размер кортежа в RAM/диске",
            "48 байт (13 байт пустых дыр)",
            "40 байт (минимум padding)"
          ],
          [
            "Объем таблицы на 100M строк",
            "4.8 ГБ (Heap) + медленный I/O",
            "4.0 ГБ (экономия 800 МБ)"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: SELECT * и скрытый ад TOAST-колонок",
      "content": "Когда таблица содержит поле description TEXT или payload JSONB на 100 КБ, эти поля лежат в TOAST-таблице на диске. Обычный запрос `SELECT id, status FROM orders` читает только 8 КБ страницу Heap за микросекунды. Но стоит ленивому разработчику написать `SELECT * FROM orders`, как движок PostgreSQL вынужден на КАЖДУЮ строку делать десятки случайных дисковых чтений из TOAST-сегментов, вызывая I/O Throttling и убивая SSD кластера."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое ctid и почему его нельзя использовать как первичный ключ?",
      "content": "ctid (Current Tuple ID) — это физический адрес версии строки: пара (номер_блока, индекс_строки). Его нельзя использовать в качестве постоянного ключа, потому что при любом UPDATE строка перемещается на новое свободное место на текущей или другой странице, и ctid бесповоротно меняется. Кроме того, операция VACUUM FULL физически перезаписывает все страницы и перемещает кортежи, перетирая все ctid."
    }
  ],
  "taskDescription": "Перед вами таблица `table_storage_audit`, хранящая статистику по размерам строк и выравниванию в базе данных DWH. Напишите SQL-запрос, который:\n1. Для каждой таблицы рассчитывает потерянный объем диска из-за неоптимального выравнивания колонок (`wasted_padding_mb`): `((unaligned_row_bytes - aligned_row_bytes) * total_rows) / (1024.0 * 1024.0)`, округленный до 2 знаков после запятой.\n2. Рассчитывает полный физический объем таблицы с учетом данных Heap и TOAST (`total_storage_mb`): `((unaligned_row_bytes * total_rows) + toast_bytes) / (1024.0 * 1024.0)`, округленный до 2 знаков после запятой.\n3. Фильтрует таблицы, у которых потерянный объем `wasted_padding_mb > 10.0`.\n4. Сортирует результат по убыванию `wasted_padding_mb`.",
  "seedCode": "CREATE TABLE table_storage_audit (\n    table_name TEXT PRIMARY KEY,\n    unaligned_row_bytes INT,\n    aligned_row_bytes INT,\n    total_rows INT,\n    toast_bytes INT\n);\nINSERT INTO table_storage_audit VALUES ('user_profiles', 48, 32, 2000000, 10485760);\nINSERT INTO table_storage_audit VALUES ('audit_logs', 56, 40, 5000000, 0);\nINSERT INTO table_storage_audit VALUES ('product_catalog', 40, 36, 500000, 52428800);\nINSERT INTO table_storage_audit VALUES ('payment_events', 64, 48, 800000, 20971520);",
  "initialCode": "-- Рассчитайте wasted_padding_mb и total_storage_mb\nSELECT \n    table_name,\n    0.0 AS wasted_padding_mb,\n    0.0 AS total_storage_mb\nFROM table_storage_audit;",
  "solutionCode": "SELECT \n    table_name,\n    ROUND(((unaligned_row_bytes - aligned_row_bytes) * total_rows) / (1024.0 * 1024.0), 2) AS wasted_padding_mb,\n    ROUND(((unaligned_row_bytes * total_rows) + toast_bytes) / (1024.0 * 1024.0), 2) AS total_storage_mb\nFROM table_storage_audit\nWHERE ROUND(((unaligned_row_bytes - aligned_row_bytes) * total_rows) / (1024.0 * 1024.0), 2) > 10.0\nORDER BY wasted_padding_mb DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "requiredAstPatterns": [
      "ROUND",
      "WHERE",
      "ORDER BY"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #301: Деградация I/O аналитического запроса из-за вычитывания TOAST",
    "incidentDescription": "ETL-пайплайн начал выполняться 40 минут вместо 1 минуты. Анализ запроса выявил вызов SELECT * из таблицы orders_events, где колонка raw_payload JSONB лежала в TOAST и вычитывалась миллионы раз впустую, создав гигантский дисковый I/O.",
    "buggyCode": "SELECT * FROM orders_events WHERE status = 'COMPLETED';",
    "fixHint": "Замените SELECT * на выборку только нужных легковесных полей: order_id, customer_id, amount, status.",
    "solutionCode": "SELECT order_id, customer_id, amount, status FROM orders_events WHERE status = 'COMPLETED';",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2,
      "requiredAstPatterns": [
        "SELECT",
        "order_id",
        "customer_id",
        "amount",
        "status"
      ]
    }
  },
  "hints": [
    "Для перевода байт в мегабайты разделите произведение байт и строк на (1024.0 * 1024.0).",
    "Используйте функцию ROUND(выражение, 2) для округления до сотых долей.",
    "Примените фильтрацию в условии WHERE для wasted_padding_mb > 10.0 и сортировку ORDER BY wasted_padding_mb DESC."
  ]
};
