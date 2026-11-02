import { Lesson } from '@/types/course';

export const dbtLesson3: Lesson = {
  "id": "dbt-3",
  "moduleSlug": "dbt",
  "order": 3,
  "title": "Инкрементальные модели: Стратегии append, merge, delete+insert и макрос is_incremental()",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "is_incremental()",
      "definition": "Макрос dbt, возвращающий True только при повторных запусках инкрементальной модели (когда целевая таблица уже существует в DWH и флаг --full-refresh не указан)."
    },
    {
      "term": "Стратегия merge",
      "definition": "Инкрементальная стратегия обновления, выполняющая SQL MERGE по unique_key: существующие строки обновляются, а новые вставляются."
    },
    {
      "term": "Lookback Window (Окно оглядки)",
      "definition": "Техника инкрементальной фильтрации (например, updated_at >= max(updated_at) - interval '3 days') для надежного подхвата запоздавших данных (late-arriving data)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "fct_orders_incremental",
      "description": "Инкрементальная таблица фактов заказов с отсечением по updated_at",
      "columns": [
        {
          "name": "order_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "customer_id",
          "type": "INTEGER"
        },
        {
          "name": "amount",
          "type": "NUMERIC(10, 2)"
        },
        {
          "name": "updated_at",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "order_id": 1001,
          "customer_id": 42,
          "amount": 2500.0,
          "updated_at": "2026-11-01 10:00:00"
        },
        {
          "order_id": 1002,
          "customer_id": 89,
          "amount": 8900.0,
          "updated_at": "2026-11-01 11:30:00"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Инкрементальные модели в dbt: Эволюция от Full Refresh к дельте\n\nКогда таблица фактов вырастает до сотен миллионов строк, пересчитывать ее целиком каждую ночь становится технически невозможно. dbt предоставляет мощную абстракцию **`materialized='incremental'`**.\n\n#### 1. Анатомия инкрементальной модели:\n```sql\n{{\n    config(\n        materialized='incremental',\n        unique_key='order_id',\n        incremental_strategy='merge',\n        on_schema_change='sync_all_columns'\n    )\n}}\n\nSELECT\n    order_id,\n    customer_id,\n    amount,\n    updated_at\nFROM {{ ref('stg_orders') }}\n\n{% if is_incremental() %}\n    -- Этот блок компилируется ТОЛЬКО при повторных запусках!\n    WHERE updated_at >= (SELECT MAX(updated_at) FROM {{ this }})\n{% endif %}\n```\n\n#### 2. Переменная `{{ this }}` и макрос `is_incremental()`:\n* `{{ this }}` ссылается на существующую целевую таблицу в хранилище прямо сейчас.\n* `{% if is_incremental() %}` позволяет отсечь дельту только новых строк, сканируя в исходном источнике минимум данных.\n\n#### 3. Инкрементальные стратегии:\n* **`append`:** только `INSERT INTO ...` (для неизменяемых логов, кликстрима, метрик без обновлений).\n* **`merge`:** классический `MERGE INTO ... USING` по `unique_key` (для PostgreSQL, Snowflake, BigQuery).\n* **`delete+insert`:** атомарный `DELETE FROM target WHERE key IN (SELECT key FROM staging)` и последующий `INSERT` (идеально для хранилищ без поддержки чистого MERGE)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Журнал учета посылок",
      "content": "Full refresh — это каждый вечер переписывать весь журнал из 10 000 страниц каллиграфическим почерком заново. Инкрементальная модель — это открыть последнюю заполненную страницу журнала (`SELECT MAX(updated_at) FROM {{ this }}`) и дописать только 5 посылок, поступивших за последний час."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение Full Refresh и Incremental загрузки",
        "beforeDescription": "Полный перезапуск (Full Refresh CTAS)",
        "beforeColumns": [
          "dataset_scale",
          "dbt_build_time",
          "dwh_compute_cost"
        ],
        "beforeRows": [
          [
            "500M rows fact table",
            "45-90 minutes daily",
            "$$$ Cloud warehouse spend"
          ],
          [
            "Lock contention",
            "Table locked during recreate",
            "BI dashboard downtime"
          ],
          [
            "Network I/O transfer",
            "Terabytes read & written",
            "High storage write IOPS"
          ]
        ],
        "afterDescription": "Инкрементальный запуск (is_incremental)",
        "afterColumns": [
          "dataset_scale",
          "dbt_build_time",
          "dwh_compute_cost"
        ],
        "afterRows": [
          [
            "100K daily delta",
            "15-30 seconds execution",
            "98% reduction in cloud cost"
          ],
          [
            "Lock contention",
            "Atomic partition or row merge",
            "Zero reporting downtime"
          ],
          [
            "Network I/O transfer",
            "Megabytes transferred",
            "Minimal storage footprint"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Отсутствие Lookback Window и потеря запоздавших строк",
      "content": "Если написать строго `WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})`, то любые строки, которые пришли из источника с задержкой в 5 минут (late-arriving data из-за лага репликации), навсегда выпадут из DWH! Всегда добавляйте буфер: `WHERE updated_at >= (SELECT MAX(updated_at) - INTERVAL '3 day' FROM {{ this }})` с указанием `unique_key`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что произойдет, если запустить `dbt run --full-refresh` для инкрементальной модели?",
      "content": "**Ответ:** Флаг `--full-refresh` принудительно заставляет макрос `is_incremental()` вернуть `False`. dbt удалит целевую таблицу (`DROP TABLE`), проигнорирует блок фильтрации дельты и полностью пересоздаст таблицу со всеми историческими данными с первого дня."
    }
  ],
  "taskDescription": "Напишите законченную инкрементальную dbt-модель 'fct_orders.sql':\n1. Сконфигурируйте модель: `materialized='incremental'`, `unique_key='order_id'`.\n2. Выберите поля: 'order_id', 'customer_id', 'order_amount', 'order_status', 'updated_at' из `{{ ref('stg_orders') }}`.\n3. Добавьте блок фильтрации `{% if is_incremental() %}` с условием: `WHERE updated_at >= (SELECT MAX(updated_at) FROM {{ this }})`.\n\nВведите код модели dbt.",
  "seedCode": "-- Напишите инкрементальную модель fct_orders.sql\n",
  "initialCode": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id'\n    )\n}}\n\nSELECT\n    order_id,\n    customer_id,\n    order_amount,\n    order_status,\n    updated_at\nFROM {{ ref('stg_orders') }}\n\n{% if is_incremental() %}\nWHERE updated_at >= (SELECT MAX(updated_at) FROM {{ this }})\n{% endif %}",
  "solutionCode": "{{\n    config(\n        materialized='incremental',\n        unique_key='order_id'\n    )\n}}\n\nSELECT\n    order_id,\n    customer_id,\n    order_amount,\n    order_status,\n    updated_at\nFROM {{ ref('stg_orders') }}\n\n{% if is_incremental() %}\nWHERE updated_at >= (SELECT MAX(updated_at) FROM {{ this }})\n{% endif %}",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "materialized='incremental'",
      "unique_key='order_id'",
      "{{ ref('stg_orders') }}",
      "{% if is_incremental() %}",
      "SELECT MAX(updated_at) FROM {{ this }}",
      "{% endif %}"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #903: Дублирование строк в инкрементальной таблице без unique_key",
    "incidentDescription": "Инженер создал инкрементальную модель без unique_key, из-за чего при повторном запуске обновившиеся заказы вставились как дубликаты.",
    "buggyCode": "{{\n  config(materialized='incremental')\n}}\nSELECT * FROM {{ ref('stg_orders') }}\n{% if is_incremental() %}\n  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})\n{% endif %}",
    "fixHint": "Добавьте уникальный идентификатор unique_key='order_id' в конфигурацию для стратегии merge.",
    "solutionCode": "{{\n  config(materialized='incremental', unique_key='order_id')\n}}\nSELECT * FROM {{ ref('stg_orders') }}\n{% if is_incremental() %}\n  WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})\n{% endif %}",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "В блоке `config()` укажите `materialized='incremental'` и `unique_key='order_id'`.",
    "Используйте конструкцию `{% if is_incremental() %} ... {% endif %}`.",
    "Для получения текущей максимальной даты используйте `(SELECT MAX(updated_at) FROM {{ this }})`."
  ]
};
