import { Lesson } from '@/types/course';

export const clickhouseLesson2: Lesson = {
  "id": "clickhouse-2",
  "moduleSlug": "clickhouse",
  "order": 2,
  "title": "Движок MergeTree под капотом: Гранулы (8192), Sparse Primary Index, засечки и ORDER BY",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Гранула (Granule)",
      "definition": "Минимальная неделимая пачка строк (по умолчанию 8192 строки), которую ClickHouse считывает при поиске."
    },
    {
      "term": "Sparse Primary Index",
      "definition": "Разреженный первичный индекс в файле primary.idx, хранящий значение ключа только для начала каждой гранулы."
    },
    {
      "term": "Засечки (Marks)",
      "definition": "Бинарные смещения в файле колонке, позволяющие перейти ровно к нужной грануле в сжатом файле .bin."
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
      "content": "### Разреженный индекс (Sparse Primary Index) и гранулы\nВ PostgreSQL B-Tree индекс хранит указатель на каждую строку таблицы, поэтому на 10 млрд строк индекс весит сотни гигабайт. В **ClickHouse (`MergeTree`)** данные внутри каждого куска физически отсортированы по ключу **`ORDER BY`** и нарезаны на логические пачки по **8192 строки — гранулы (`index_granularity = 8192`)**. В файл первичного индекса `primary.idx` записывается значение ключа только для **первой строки каждой гранулы**! Благодаря этому индекс в 8192 раза меньше таблицы и всегда целиком помещается в оперативную память."
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
        "title": "Сравнение Eager-вычислений (Pandas) и Lazy Evaluation (Spark)",
        "beforeDescription": "Немедленные вычисления (Eager: Pandas)",
        "beforeColumns": [
          "processing_stage",
          "memory_allocation",
          "optimization_scope"
        ],
        "beforeRows": [
          [
            "df = pd.read_csv('100GB.csv')",
            "Loads 100GB into single RAM",
            "Out-Of-Memory immediate crash"
          ],
          [
            "df = df[df['price'] > 100]",
            "Filters already loaded data",
            "Wasted read of discarded rows"
          ],
          [
            "df = df[['id', 'price']]",
            "Discards columns after read",
            "Zero predicate/column pushdown"
          ]
        ],
        "afterDescription": "Ленивые вычисления (Lazy: Apache Spark)",
        "afterColumns": [
          "processing_stage",
          "memory_allocation",
          "optimization_scope"
        ],
        "afterRows": [
          [
            "df = spark.read.parquet(...)",
            "Instant 1ms metadata plan",
            "Zero bytes read into memory"
          ],
          [
            "df = df.filter('price > 100')",
            "Fused into scan filter",
            "Pushed down into Parquet footer"
          ],
          [
            "df.select('id', 'price').write",
            "Reads ONLY 2 columns on action",
            "Reads 1% of bytes at wire speed"
          ]
        ]
      }
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
  "seedCode": "CREATE TABLE mergetree_keys (table_id INT, first_key_col VARCHAR(30), first_col_cardinality INT, partition_expr VARCHAR(30));\nINSERT INTO mergetree_keys VALUES (1, 'random_uuid', 500000000, 'toYYYYMM(dt)'), (2, 'country_code', 200, 'toYYYYMM(dt)'), (3, 'status', 10, 'user_id'), (4, 'tenant_id', 500, 'toYYYYMM(dt)');",
  "initialCode": "SELECT\n  table_id,\n  first_key_col,\n  partition_expr,\n  CASE\n    WHEN partition_expr = 'user_id' THEN 'BAD_PARTITION_KEY_TOO_MANY_PARTS'\n    WHEN first_col_cardinality > 10000000 THEN 'BAD_ORDER_BY_HIGH_CARDINALITY_FIRST'\n    ELSE 'OPTIMAL_MERGETREE_DESIGN'\n  END AS schema_verdict\nFROM mergetree_keys\nORDER BY table_id ASC;",
  "solutionCode": "SELECT\n  table_id,\n  first_key_col,\n  partition_expr,\n  CASE\n    WHEN partition_expr = 'user_id' THEN 'BAD_PARTITION_KEY_TOO_MANY_PARTS'\n    WHEN first_col_cardinality > 10000000 THEN 'BAD_ORDER_BY_HIGH_CARDINALITY_FIRST'\n    ELSE 'OPTIMAL_MERGETREE_DESIGN'\n  END AS schema_verdict\nFROM mergetree_keys\nORDER BY table_id ASC;",
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
    "title": "Инцидент #802: Деградация запросов из-за UUID на первом месте в ORDER BY",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT table_id, first_key_col, partition_expr, 'OPTIMAL_MERGETREE_DESIGN' AS schema_verdict FROM mergetree_keys;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  table_id,\n  first_key_col,\n  partition_expr,\n  CASE\n    WHEN partition_expr = 'user_id' THEN 'BAD_PARTITION_KEY_TOO_MANY_PARTS'\n    WHEN first_col_cardinality > 10000000 THEN 'BAD_ORDER_BY_HIGH_CARDINALITY_FIRST'\n    ELSE 'OPTIMAL_MERGETREE_DESIGN'\n  END AS schema_verdict\nFROM mergetree_keys\nORDER BY table_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Сначала проверьте ошибку партиционирования: WHEN partition_expr = 'user_id' THEN 'BAD_PARTITION_KEY_TOO_MANY_PARTS'.",
    "Затем проверьте кардинальность первой колонки ORDER BY: WHEN first_col_cardinality > 10000000.",
    "Для правильных схем верните 'OPTIMAL_MERGETREE_DESIGN' и отсортируйте по table_id ASC."
  ]
};
