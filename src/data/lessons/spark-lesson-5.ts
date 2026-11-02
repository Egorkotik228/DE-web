import { Lesson } from '@/types/course';

export const sparkLesson5: Lesson = {
  "id": "spark-5",
  "moduleSlug": "spark",
  "order": 5,
  "title": "Борьба с перекосом данных (Data Skew): проблема 199/200 тасков, Salting и AQE Skew Join",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Data Skew",
      "definition": "Неравномерное распределение данных по партициям, когда один Task обрабатывает непропорционально огромный объем."
    },
    {
      "term": "Key Salting",
      "definition": "Добавление случайного суффикса (0..N-1) к горячему ключу для разбиения одной перегруженной партиции на N задач."
    },
    {
      "term": "AQE Skew Join",
      "definition": "Механизм Spark 3+, автоматически разрезающий перекошенные партиции при SortMergeJoin по статистике стадии."
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
      "content": "### Симптом Data Skew: «199 из 200 тасков завершились за 5 секунд, последний висит 2 часа»\nПри `groupBy` или `SortMergeJoin` Spark распределяет строки по партициям по формуле `hash(key) % num_partitions`. Все записи с одинаковым ключом всегда попадают в одну партицию на один Task. Если у 60% событий `user_id IS NULL` или равен `GUEST_DEFAULT`, то 199 ядер обработают по 15 МБ и освободятся, а одно ядро получит 70 ГБ, уйдет в тяжелый `Disk Spill` и упадет с `OutOfMemoryError`."
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
  "seedCode": "CREATE TABLE partition_stats (partition_id INT, key_value VARCHAR(30), rows_count INT, spill_mb INT);\nINSERT INTO partition_stats VALUES (1, 'user_101', 120000, 0), (2, 'GUEST_DEFAULT', 45000000, 18400), (3, 'user_205', 115000, 0), (4, 'VIP_MERCHANT', 12000000, 4200);",
  "initialCode": "SELECT\n  partition_id,\n  key_value,\n  rows_count,\n  CASE\n    WHEN key_value = 'GUEST_DEFAULT' THEN 'FILTER_OUT_BEFORE_JOIN'\n    WHEN rows_count > 1000000 THEN 'APPLY_KEY_SALTING'\n    ELSE 'NORMAL_PARTITION'\n  END AS mitigation_plan\nFROM partition_stats\nORDER BY partition_id ASC;",
  "solutionCode": "SELECT\n  partition_id,\n  key_value,\n  rows_count,\n  CASE\n    WHEN key_value = 'GUEST_DEFAULT' THEN 'FILTER_OUT_BEFORE_JOIN'\n    WHEN rows_count > 1000000 THEN 'APPLY_KEY_SALTING'\n    ELSE 'NORMAL_PARTITION'\n  END AS mitigation_plan\nFROM partition_stats\nORDER BY partition_id ASC;",
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
    "title": "Инцидент #705: Зависание 199/200 тасков из-за ключа GUEST_DEFAULT",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT partition_id, key_value, rows_count, 'NORMAL_PARTITION' AS mitigation_plan FROM partition_stats;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  partition_id,\n  key_value,\n  rows_count,\n  CASE\n    WHEN key_value = 'GUEST_DEFAULT' THEN 'FILTER_OUT_BEFORE_JOIN'\n    WHEN rows_count > 1000000 THEN 'APPLY_KEY_SALTING'\n    ELSE 'NORMAL_PARTITION'\n  END AS mitigation_plan\nFROM partition_stats\nORDER BY partition_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Для дефолтного ключа проверьте WHEN key_value = 'GUEST_DEFAULT' THEN 'FILTER_OUT_BEFORE_JOIN'.",
    "Для крупных реальных ключей проверьте WHEN rows_count > 1000000 THEN 'APPLY_KEY_SALTING'.",
    "В ветке ELSE верните 'NORMAL_PARTITION' и отсортируйте по partition_id ASC."
  ]
};
