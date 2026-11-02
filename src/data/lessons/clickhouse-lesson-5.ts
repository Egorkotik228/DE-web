import { Lesson } from '@/types/course';

export const clickhouseLesson5: Lesson = {
  "id": "clickhouse-5",
  "moduleSlug": "clickhouse",
  "order": 5,
  "title": "Оптимизация ClickHouse: PREWHERE, Data Skipping Indexes, Projections и Materialized Views",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "PREWHERE",
      "definition": "Двухфазное чтение в ClickHouse: сначала считывается только колонка фильтра, а затем дочитываются остальные поля для прошедших гранул."
    },
    {
      "term": "Data Skipping Index",
      "definition": "Вторичный индекс (minmax, set, bloom_filter) поверх блока гранул, позволяющий пропускать чтение неподходящих участков."
    },
    {
      "term": "Projection (Проекция)",
      "definition": "Встроенное в кусок данных альтернативное представление с другим порядком сортировки или агрегацией."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "spark_join_strategies",
      "description": "Сравнение стратегий соединений в зависимости от объема таблиц",
      "columns": [
        {
          "name": "join_strategy",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "shuffle_required",
          "type": "BOOLEAN"
        },
        {
          "name": "memory_consumption",
          "type": "VARCHAR(32)"
        },
        {
          "name": "best_use_case",
          "type": "VARCHAR(128)"
        }
      ],
      "sampleRows": [
        {
          "join_strategy": "BroadcastHashJoin",
          "shuffle_required": false,
          "memory_consumption": "Driver + Executor Memory",
          "best_use_case": "Большой факт + Малое измерение (< 10-100MB)"
        },
        {
          "join_strategy": "SortMergeJoin",
          "shuffle_required": true,
          "memory_consumption": "Низкое (потоковое слияние)",
          "best_use_case": "Большой факт + Большой факт (терабайты)"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Магия `PREWHERE` и Data Skipping Indexes\nПри фильтрации ClickHouse автоматически применяет оптимизацию **`PREWHERE`**: сначала читает с диска **только легкую колонку условия фильтрации**, находит гранулы и строки, где условие истинно, и только для прошедших гранул дочитывает остальные тяжелые колонки из `SELECT`! Для фильтрации по колонкам, не входящим в первичный ключ `ORDER BY`, используются **индексы пропуска данных (Data Skipping Indexes)**: `minmax` (хранит минимум и максимум на блок гранул), `set(N)` и `bloom_filter`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 Инженерная аналогия: Карманный справочник против городского съезда",
      "content": "**BroadcastHashJoin** — это раздача каждому продавцу в городе маленькой карманной брошюрки с новыми ценами (справочник): продавец мгновенно на месте отвечает покупателю, никуда не выходя. **SortMergeJoin** — это сбор всех покупателей и продавцов на гигантском стадионе, где всех выстраивают строго по алфавиту фамилий и сливают списки: процесс долгий и тяжелый (Shuffle), но работает даже для миллиона человек."
    },
    {
      "type": "data-flow",
      "data": {
        "title": "Сравнение BroadcastHashJoin и SortMergeJoin",
        "description": "BHJ исключает пересылку большой таблицы по сети, тогда как SMJ шафлит обе стороны.",
        "nodes": [
          {
            "id": "dim",
            "label": "dim_categories (10 MB)",
            "sublabel": "Малая таблица",
            "type": "source"
          },
          {
            "id": "fact",
            "label": "fact_orders (2 TB)",
            "sublabel": "Большая таблица",
            "type": "source"
          },
          {
            "id": "bcast",
            "label": "Broadcast to Executors",
            "sublabel": "Без Shuffle факта",
            "type": "transform"
          },
          {
            "id": "bhj",
            "label": "BroadcastHashJoin",
            "sublabel": "Локальный Lookup в RAM",
            "type": "transform"
          },
          {
            "id": "out",
            "label": "Результат Join",
            "sublabel": "Быстрый вывод",
            "type": "storage"
          }
        ],
        "edges": [
          {
            "from": "dim",
            "to": "bcast",
            "label": "Driver collect + broadcast"
          },
          {
            "from": "fact",
            "to": "bhj",
            "label": "Прямое чтение партиций"
          },
          {
            "from": "bcast",
            "to": "bhj",
            "label": "Lookup в Hash Table"
          },
          {
            "from": "bhj",
            "to": "out",
            "label": "0 Shuffle Bytes для факта"
          }
        ]
      }
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Эффект применения broadcast() при соединении факта со справочником",
        "beforeDescription": "Дефолтный SortMergeJoin без хинта (обе таблицы шафлятся)",
        "beforeColumns": [
          "Тип Join",
          "Объем Shuffle по сети",
          "Время выполнения"
        ],
        "beforeRows": [
          [
            "SortMergeJoin (дефолт)",
            "2.0 TB (факт) + 20 MB (дим)",
            "48 минут 30 сек"
          ],
          [
            "Shuffle Spill Disk",
            "180 GB промежуточных файлов",
            "Высокая нагрузка на I/O"
          ],
          [
            "Сортировка ключей",
            "100% CPU на всех экзекьюторах",
            "Задержка очереди YARN"
          ]
        ],
        "afterDescription": "BroadcastHashJoin с явным хинтом F.broadcast(dim)",
        "afterColumns": [
          "Тип Join",
          "Объем Shuffle по сети",
          "Время выполнения"
        ],
        "afterRows": [
          [
            "BroadcastHashJoin",
            "0 байт для факта (только 20 MB дим)",
            "2 минуты 15 сек"
          ],
          [
            "Shuffle Spill Disk",
            "0 байт (spill отсутствует)",
            "Минимальный I/O диска"
          ],
          [
            "Потоковый Lookup",
            "Параллельный доступ к хэш-карте",
            "Снижение CPU в 8 раз"
          ]
        ]
      },
      "beforeColumns": [
        "Подход / Настройка",
        "Механика",
        "Последствие в проде"
      ],
      "afterColumns": [
        "Подход / Настройка",
        "Механика",
        "Результат в проде"
      ],
      "beforeRows": [
        [
          "Фильтр по неключевой колонке без индекса",
          "Чтение 100% гранул с диска",
          "Высокий I/O на каждом поисковом запросе"
        ],
        [
          "Два разных паттерна поиска по таблице",
          "Быстрый поиск только по 1-му ключу",
          "Второй запрос идет полным сканом"
        ],
        [
          "Тяжелый GROUP BY по 10 млрд строк",
          "Полный пересчет при каждом открытии BI",
          "Задержка дашборда 25 секунд"
        ]
      ],
      "afterRows": [
        [
          "INDEX idx_trace trace_id TYPE bloom_filter",
          "Пропуск 98% гранул без чтения .bin",
          "Точечный поиск trace_id за 50 мс"
        ],
        [
          "ALTER TABLE ADD PROJECTION (ORDER BY user_id)",
          "Автоматический выбор второй сортировки",
          "Оба запроса работают по индексу"
        ],
        [
          "Materialized View + AggregatingMergeTree",
          "Инкрементальный подсчет при INSERT",
          "Дашборд открывается за 10 миллисекунд"
        ]
      ]
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Принудительный broadcast таблицы в 20 ГБ",
      "content": "Инженер увидел, что джойн идет медленно, и добавил `F.broadcast(df)` к датафрейму клиентов размером 15 ГБ. Driver попытался скачать эти 15 ГБ через `collect()`, мгновенно упал с `OutOfMemoryError: Java heap space` и завершил весь джоб. **Запомните:** никогда не бродкастите таблицы больше 1–2 ГБ (а в идеале держитесь в пределах 100–200 МБ)!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему SortMergeJoin считается более масштабируемым, чем ShuffleHashJoin?",
      "content": "**Ответ:** ShuffleHashJoin требует построения хэш-таблицы из одной из сторон прямо в оперативной памяти (JVM Heap) экзекьютора. Если размер данных на ключ превышает доступную память, задача падает с OOM. SortMergeJoin сначала сортирует данные: если они не помещаются в память, Spark сбрасывает отсортированные куски на диск (external merge sort) и затем читает их потоково двумя итераторами. Это позволяет SMJ стабильно работать с любыми петабайтными объемами без риска падения по памяти."
    }
  ],
  "taskDescription": "Оптимизируйте джойн огромного факта продаж и справочника магазинов:\n1. Инициализируйте SparkSession с именем приложения 'broadcast_join_lab'.\n2. Прочитайте таблицу фактов 's3://lake/raw/fact_sales.parquet'.\n3. Прочитайте справочник магазинов 's3://lake/raw/dim_stores.parquet'.\n4. Выполните соединение 'fact_sales' со справочником 'dim_stores' по ключу 'store_id', применив явный хинт `F.broadcast` к таблице справочника магазинов.\n5. Отберите поля 'sale_id', 'store_id', 'store_name', 'amount'.\n6. Запишите результат в Parquet по пути 's3://lake/marts/sales_with_stores.parquet' в режиме 'overwrite'.",
  "seedCode": "CREATE TABLE ch_queries (q_id INT, filter_in_pk INT, has_skip_index INT, has_projection INT, exec_ms INT);\nINSERT INTO ch_queries VALUES (1, 1, 0, 0, 15), (2, 0, 0, 0, 14500), (3, 0, 1, 0, 90), (4, 0, 0, 1, 25);",
  "initialCode": "SELECT\n  q_id,\n  exec_ms,\n  CASE\n    WHEN filter_in_pk = 0 AND has_skip_index = 0 AND has_projection = 0 THEN 'ADD_PROJECTION_OR_SKIP_INDEX'\n    ELSE 'FAST_QUERY_PATH'\n  END AS tuning_action\nFROM ch_queries\nORDER BY q_id ASC;",
  "solutionCode": "SELECT\n  q_id,\n  exec_ms,\n  CASE\n    WHEN filter_in_pk = 0 AND has_skip_index = 0 AND has_projection = 0 THEN 'ADD_PROJECTION_OR_SKIP_INDEX'\n    ELSE 'FAST_QUERY_PATH'\n  END AS tuning_action\nFROM ch_queries\nORDER BY q_id ASC;",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SparkSession.builder.appName('broadcast_join_lab')",
      "spark.read.parquet('s3://lake/raw/fact_sales.parquet')",
      "spark.read.parquet('s3://lake/raw/dim_stores.parquet')",
      "fact_sales.join(F.broadcast(dim_stores)",
      "on='store_id'",
      ".select('sale_id', 'store_id', 'store_name', 'amount')",
      ".write.mode('overwrite').parquet"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #805: Полный скан 14.5 секунд при поиске по неключевому полю",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT q_id, exec_ms, 'FAST_QUERY_PATH' AS tuning_action FROM ch_queries;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  q_id,\n  exec_ms,\n  CASE\n    WHEN filter_in_pk = 0 AND has_skip_index = 0 AND has_projection = 0 THEN 'ADD_PROJECTION_OR_SKIP_INDEX'\n    ELSE 'FAST_QUERY_PATH'\n  END AS tuning_action\nFROM ch_queries\nORDER BY q_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие всех ускорителей: WHEN filter_in_pk = 0 AND has_skip_index = 0 AND has_projection = 0.",
    "Верните 'ADD_PROJECTION_OR_SKIP_INDEX' для медленных запросов и 'FAST_QUERY_PATH' для остальных.",
    "Отсортируйте результат по q_id ASC."
  ]
};
