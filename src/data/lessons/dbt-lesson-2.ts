import { Lesson } from '@/types/course';

export const dbtLesson2: Lesson = {
  "id": "dbt-2",
  "moduleSlug": "dbt",
  "order": 2,
  "title": "Материализации в dbt: View, Table, Ephemeral и Incremental",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Материализация (Materialization)",
      "definition": "Стратегия сохранения результата SQL-модели dbt в базе данных: представление (view), физическая таблица (table), временный CTE (ephemeral) или инкрементальное обновление (incremental)."
    },
    {
      "term": "Ephemeral материализация",
      "definition": "Модель dbt, которая не создает физических объектов в базе данных, а интерполируется в виде CTE (WITH-подзапроса) в зависимые модели во время компиляции."
    },
    {
      "term": "dbt run --full-refresh",
      "definition": "Команда принудительного пересоздания инкрементальной таблицы с нуля (DROP TABLE + CREATE TABLE) при изменении структуры или логики расчета."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dbt_materializations_catalog",
      "description": "Сравнение стратегий материализации моделей",
      "columns": [
        {
          "name": "materialization",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "db_object_type",
          "type": "VARCHAR(32)"
        },
        {
          "name": "build_time",
          "type": "VARCHAR(16)"
        },
        {
          "name": "query_speed",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "materialization": "view",
          "db_object_type": "VIEW",
          "build_time": "Instant (ms)",
          "query_speed": "Slow on big data"
        },
        {
          "materialization": "table",
          "db_object_type": "TABLE",
          "build_time": "Slow (full CTAS)",
          "query_speed": "Fast (cached)"
        },
        {
          "materialization": "incremental",
          "db_object_type": "TABLE (delta)",
          "build_time": "Fast (appends delta)",
          "query_speed": "Fast (cached)"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Стратегии материализации в dbt: Как экономить терабайты и секунды\n\nВ dbt вам не нужно писать команды `CREATE TABLE` или `CREATE VIEW`. Вы указываете стратегию в блоке `config()` в начале SQL-файла:\n\n```sql\n{{ config(materialized='table') }}\nSELECT ...\n```\n\n#### 4 базовых типа материализации:\n1. **`view` (по умолчанию):** создает представление `CREATE VIEW`. Идеально для легковесного слоя staging, где выполняется только очистка и переименование колонок. Занимает 0 байт на диске.\n2. **`table`:** полностью пересоздает физическую таблицу `CREATE TABLE AS SELECT` при каждом запуске. Идеально для небольших справочников и агрегатов (до 5-10 млн строк), где пересчет занимает менее 1 минуты.\n3. **`ephemeral`:** код модели встраивается в качестве CTE (`WITH ... AS (...)`) прямо в тело зависимых моделей. В базе данных не создается вообще ничего. Полезно для переиспользуемой сложной математики или масок валидации.\n4. **`incremental`:** при первом запуске создает таблицу, а при последующих — обрабатывает и вставляет **только новые или изменившиеся строки** с момента последнего запуска. Жизненно необходимо для таблиц фактов на сотни миллионов записей."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Кулинарная книга, полуфабрикат и заготовка",
      "content": "View — это закладка в рецепте: когда гость заказывает блюдо, повар варит его с нуля. Table — это сваренный с утра суп в кастрюле: наливается мгновенно, но каждый день его нужно варить заново. Ephemeral — это секретный соус, который повар замешивает в ложке прямо перед подачей. А Incremental — это закваска: вы берете основу вчерашнего дня и просто подмешиваете свежую муку."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение материализаций View и Table",
        "beforeDescription": "Материализация View на тяжелых витринах",
        "beforeColumns": [
          "workload_type",
          "dbt_run_duration",
          "bi_dashboard_latency"
        ],
        "beforeRows": [
          [
            "50M rows multi-join",
            "Sub-second dbt compile",
            "45-60 seconds on load"
          ],
          [
            "Repeated BI queries",
            "Zero storage cost",
            "High CPU spikes on DWH"
          ],
          [
            "Complex window functions",
            "Fast CI deployment",
            "Frustrated business users"
          ]
        ],
        "afterDescription": "Материализация Table / Incremental",
        "afterColumns": [
          "workload_type",
          "dbt_run_duration",
          "bi_dashboard_latency"
        ],
        "afterRows": [
          [
            "50M rows precalculated",
            "Computed once in nightly ETL",
            "Sub-second instant load"
          ],
          [
            "Repeated BI queries",
            "Stores physical columnar blocks",
            "Zero CPU load on reporting"
          ],
          [
            "Complex window functions",
            "Indexed storage layout",
            "Happy business analysts"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Превращение 50-гигабайтной таблицы фактов в `materialized='table'`",
      "content": "Инженер указал `materialized='table'` для таблицы событий кликстрима в 500 млн строк. Каждый запуск `dbt run` начал занимать 4 часа, сканируя терабайты диска и забивая I/O хранилища. На больших объемах фактов обязательна инкрементальная модель (`materialized='incremental'`)!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Когда стоит выбирать материализацию `ephemeral` вместо `view`?",
      "content": "**Ответ:** `ephemeral` идеален, когда модель является вспомогательной (например, фильтр аномалий или промежуточная нормализация) и используется только внутри одного пайплайна. Она не засоряет каталог базы данных сотнями мелких view и позволяет оптимизатору СУБД объединить CTE в один план выполнения (inlining)."
    }
  ],
  "taskDescription": "Сконфигурируйте модель витрины данных 'dim_customers.sql' с материализацией 'table':\n1. Добавьте блок конфигурации `{{ config(materialized='table') }}`.\n2. Выберите идентификатор клиента 'customer_id' и имя 'full_name' из модели `{{ ref('stg_customers') }}`.\n3. Отсортируйте результат по 'customer_id ASC'.\n\nВведите полный код модели dbt.",
  "seedCode": "-- Напишите модель dim_customers.sql с материализацией table\n",
  "initialCode": "{{ config(materialized='table') }}\n\nSELECT\n    customer_id,\n    full_name\nFROM {{ ref('stg_customers') }}\nORDER BY customer_id ASC",
  "solutionCode": "{{ config(materialized='table') }}\n\nSELECT\n    customer_id,\n    full_name\nFROM {{ ref('stg_customers') }}\nORDER BY customer_id ASC",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "{{ config(materialized='table') }}",
      "SELECT",
      "customer_id",
      "full_name",
      "{{ ref('stg_customers') }}",
      "ORDER BY customer_id ASC"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #902: Медленный дашборд из-за тяжелого view в production",
    "incidentDescription": "Аналитики жалуются на 2-минутную загрузку отчета, потому что витрина 100 млн строк была оставлена как view.",
    "buggyCode": "{{ config(materialized='view') }}\nSELECT customer_id, sum(amount) FROM raw_events GROUP BY customer_id",
    "fixHint": "Переключите материализацию на table или incremental.",
    "solutionCode": "{{ config(materialized='table') }}\nSELECT customer_id, sum(amount) FROM raw_events GROUP BY customer_id",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Начните файл со строчки `{{ config(materialized='table') }}`.",
    "Используйте `{{ ref('stg_customers') }}` в блоке FROM.",
    "Добавьте сортировку `ORDER BY customer_id ASC`."
  ]
};
