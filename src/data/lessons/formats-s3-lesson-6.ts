import { Lesson } from '@/types/course';

export const formatsS3Lesson6: Lesson = {
  "id": "formats-s3-6",
  "moduleSlug": "formats-s3",
  "order": 6,
  "title": "Продвинутая работа с Iceberg: Time Travel, Rollback, Compaction и Z-Ordering",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Time Travel (Путешествие во времени)",
      "definition": "Возможность выполнять SQL-запросы к состоянию таблицы на определенный момент в прошлом (TIMESTAMP AS OF) или по номеру исторического снимка (VERSION AS OF)."
    },
    {
      "term": "Compaction (Компактизация / RewriteDataFiles)",
      "definition": "Процесс слияния сотен мелких файлов (Small Files) в крупные оптимальные Parquet-файлы (128–512 МБ) в фоновом режиме без блокировки читателей."
    },
    {
      "term": "Z-Ordering (Кривая Гильберта / Z-кривая)",
      "definition": "Метод многомерной кластеризации данных по нескольким колонкам одновременно, позволяющий эффективно пропускать файлы при фильтрах по любой из этих колонок."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "iceberg_time_travel_audit",
      "description": "Результат запроса Time Travel к историческому снимку таблицы",
      "columns": [
        {
          "name": "order_id",
          "type": "BIGINT",
          "keyType": "PK"
        },
        {
          "name": "total_amount",
          "type": "NUMERIC(10, 2)"
        },
        {
          "name": "as_of_snapshot",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "order_id": 901,
          "total_amount": 15000.0,
          "as_of_snapshot": "snapshot_v1 (2026-11-01)"
        },
        {
          "order_id": 901,
          "total_amount": 12000.0,
          "as_of_snapshot": "current_v2 (refunded)"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Продвинутые возможности Apache Iceberg: Управление жизненным циклом данных\n\nТабличные форматы превратили озеро данных в полноценное хранилище с возможностями, недоступными традиционным базам данных.\n\n#### 1. Time Travel и мгновенный откат (Rollback):\nОшибочный скрипт выполнил `DELETE` или залил битые данные? В Iceberg данные не теряются:\n```sql\n-- 1. Запрос исторического среза на вчерашний полдень:\nSELECT * FROM lake.orders\nFOR SYSTEM_TIME AS OF TIMESTAMP '2026-11-01 12:00:00 UTC';\n\n-- 2. Запрос по конкретному Snapshot ID:\nSELECT * FROM lake.orders\nFOR SYSTEM_VERSION AS OF 849302910482910;\n\n-- 3. Мгновенный откат всей таблицы на снимок до аварии (Rollback):\nCALL lake.system.rollback_to_snapshot('lake.orders', 849302910482910);\n```\nОперация Rollback занимает 100 миллисекунд: в каталоге просто меняется указатель на старый снимок!\n\n#### 2. Борьба с мелкими файлами: Compaction (Rewrite Data Files)\nПри потоковой записи в S3 образуются тысячи мелких файлов по 50 КБ. Процедура компактизации объединяет их в крупные Parquet-блоки:\n```sql\nCALL lake.system.rewrite_data_files(\n    table => 'lake.orders',\n    strategy => 'binpack',\n    options => map('target-file-size-bytes', '536870912') -- 512 MB\n);\n```\n\n#### 3. Многомерная кластеризация Z-Ordering:\nОбычное партиционирование работает только для 1-2 колонок (например, дата). **Z-Ordering** кластеризует строки сразу по 3-4 измерениям (`customer_id`, `product_category`, `region`), позволяя отсекать 90% Parquet-файлов при фильтрации по любому из этих полей!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Машина времени и переупаковка чемодана",
      "content": "Time Travel — это функция Undo (Ctrl+Z) в текстовом редакторе: если вы стерли главу, вы просто откатываетесь на 3 правки назад. А Compaction — это переупаковка рюкзака: вместо того чтобы нести 100 мелких спичечных коробков, вы складываете вещи в один плотный дорожный чемодан."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение производительности до и после Compaction",
        "beforeDescription": "Таблица с 50 000 мелких файлов (Small Files)",
        "beforeColumns": [
          "lake_metric",
          "small_files_state",
          "query_impact"
        ],
        "beforeRows": [
          [
            "File count",
            "50,000 files (100 KB each)",
            "Driver OOM on listing"
          ],
          [
            "Trino query time",
            "3 minutes 40 seconds",
            "High S3 GET request latency"
          ],
          [
            "Compression efficiency",
            "Poor dictionary encoding",
            "Wasted storage space"
          ]
        ],
        "afterDescription": "После выполнения Iceberg Compaction",
        "afterColumns": [
          "lake_metric",
          "small_files_state",
          "query_impact"
        ],
        "afterRows": [
          [
            "File count",
            "20 optimal files (256 MB each)",
            "Instant metadata read"
          ],
          [
            "Trino query time",
            "1.4 seconds execution",
            "Maximum read throughput"
          ],
          [
            "Compression efficiency",
            "Maximized Parquet compression",
            "30% storage savings"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Запуск Z-Ordering без фильтра по партициям на терабайтной таблице",
      "content": "Инженер запустил `rewrite_data_files` со стратегией `sort (z-order)` на всей таблице в 50 ТБ без фильтра. Кластер Spark начал глобальный shuffle и пересортировку всех петабайт истории за 5 лет, сожрал бюджет облака на 10 000$ и завис. Всегда ограничивайте компактизацию: `where => 'created_at >= current_date - interval 7 days'`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как работает Rollback в Apache Iceberg при наличии параллельно пишущих ETL-процессов?",
      "content": "**Ответ:** Rollback в Iceberg создает новый коммит, родительским снимком которого объявляется выбранный исторический снимок. Новые файлы, записанные после этого снимка, не удаляются физически с диска сразу, а исключаются из активного манифеста. Читатели мгновенно переключаются на старое состояние без блокировок."
    }
  ],
  "taskDescription": "Сформируйте SQL-запрос для исследования истории изменений заказа с использованием синтаксиса Time Travel в Apache Iceberg:\n1. Выполните выборку полей 'order_id', 'status', 'total_amount' из таблицы 'lakehouse.orders'.\n2. Используйте директиву Time Travel по времени: `FOR SYSTEM_TIME AS OF TIMESTAMP '2026-11-01 00:00:00 UTC'`.\n3. Отфильтруйте заказ с 'order_id = 10492'.\n\nВведите SQL-запрос Time Travel к таблице Iceberg.",
  "seedCode": "-- Напишите Time Travel запрос к Apache Iceberg таблице\n",
  "initialCode": "SELECT\n    order_id,\n    status,\n    total_amount\nFROM lakehouse.orders\nFOR SYSTEM_TIME AS OF TIMESTAMP '2026-11-01 00:00:00 UTC'\nWHERE order_id = 10492;",
  "solutionCode": "SELECT\n    order_id,\n    status,\n    total_amount\nFROM lakehouse.orders\nFOR SYSTEM_TIME AS OF TIMESTAMP '2026-11-01 00:00:00 UTC'\nWHERE order_id = 10492;",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SELECT",
      "order_id",
      "status",
      "total_amount",
      "FROM lakehouse.orders",
      "FOR SYSTEM_TIME AS OF TIMESTAMP",
      "WHERE order_id = 10492"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1006: Случайное удаление данных в проде и спасение через Rollback",
    "incidentDescription": "Junior инженер выполнил DELETE FROM lakehouse.customers без условия WHERE, стерев 10 млн клиентов.",
    "buggyCode": "DELETE FROM lakehouse.customers; -- Катастрофа в продакшне",
    "fixHint": "Используйте вызов системной процедуры rollback_to_snapshot с ID снимка до аварии.",
    "solutionCode": "CALL lakehouse.system.rollback_to_snapshot('lakehouse.customers', 89201948190284);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте конструкцию `FOR SYSTEM_TIME AS OF TIMESTAMP '2026-11-01 00:00:00 UTC'` после имени таблицы.",
    "Выберите поля `order_id`, `status`, `total_amount`.",
    "Добавьте условие `WHERE order_id = 10492;`."
  ]
};
