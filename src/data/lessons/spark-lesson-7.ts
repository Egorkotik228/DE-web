import { Lesson } from '@/types/course';

export const sparkLesson7: Lesson = {
  "id": "spark-7",
  "moduleSlug": "spark",
  "order": 7,
  "title": "Spark UI и чтение планов explain(): диагностика Spill, GC, PartitionFilters и PushedFilters",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "PartitionFilters",
      "definition": "Отсечение физических директорий партиций на этапе планирования без чтения файлов."
    },
    {
      "term": "PushedFilters",
      "definition": "Проталкивание предикатов фильтрации внутрь ридера Parquet для пропуска Row Groups по статистикам min/max."
    },
    {
      "term": "Spill (Memory / Disk)",
      "definition": "Выгрузка промежуточных буферов на диск при нехватке Execution Memory."
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
      "content": "### Чтение плана `df.explain(mode='formatted')`\nВ узле `FileScan parquet` критичны две строки: **PartitionFilters** (отсечение папок S3/HDFS по партициям каталога, например `dt = 2026-11-01`) и **PushedFilters** (проталкивание условий `GreaterThan`, `IsNotNull` в статистику Row Groups внутри Parquet). Если обернуть партиционированную колонку в функцию (`YEAR(dt) = 2026`), `PartitionFilters` обнулится и начнется Full Scan всего хранилища."
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
        "Метрика / Узел",
        "До оптимизации",
        "Последствие"
      ],
      "afterColumns": [
        "Метрика / Узел",
        "После тюнинга",
        "Результат"
      ],
      "beforeRows": [
        [
          "PartitionFilters в FileScan",
          "Пустой список [] (Full Scan)",
          "Колонка партиции обернута в функцию"
        ],
        [
          "PushedFilters в Parquet",
          "Пустой список []",
          "Фильтрация через Python UDF после чтения"
        ],
        [
          "Spill (Disk) в Stages",
          "85 ГБ временных файлов на диске",
          "Мало партиций или нехватка Execution RAM"
        ]
      ],
      "afterRows": [
        [
          "PartitionFilters в FileScan",
          "[isnotnull(dt), (dt = 2026-11-01)]",
          "Читается ровно 1 папка в S3"
        ],
        [
          "PushedFilters в Parquet",
          "[GreaterThan(amount, 1000)]",
          "Пропуск 90% Row Groups по min/max"
        ],
        [
          "*(1) HashAggregate (Tungsten)",
          "Spill = 0 Б, включен WholeStageCodegen",
          "Агрегация полностью в бинарной памяти"
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
  "seedCode": "CREATE TABLE explain_audit (query_id INT, has_partition_filter INT, scanned_tb INT, spill_disk_gb INT);\nINSERT INTO explain_audit VALUES (1, 0, 65, 120), (2, 1, 1, 0), (3, 1, 4, 85), (4, 1, 2, 0);",
  "initialCode": "SELECT\n  query_id,\n  scanned_tb,\n  spill_disk_gb,\n  CASE\n    WHEN has_partition_filter = 0 THEN 'BROKEN_PARTITION_PRUNING'\n    WHEN spill_disk_gb > 0 THEN 'NEEDS_MORE_PARTITIONS_OR_RAM'\n    ELSE 'OPTIMAL_PHYSICAL_PLAN'\n  END AS plan_verdict\nFROM explain_audit\nORDER BY query_id ASC;",
  "solutionCode": "SELECT\n  query_id,\n  scanned_tb,\n  spill_disk_gb,\n  CASE\n    WHEN has_partition_filter = 0 THEN 'BROKEN_PARTITION_PRUNING'\n    WHEN spill_disk_gb > 0 THEN 'NEEDS_MORE_PARTITIONS_OR_RAM'\n    ELSE 'OPTIMAL_PHYSICAL_PLAN'\n  END AS plan_verdict\nFROM explain_audit\nORDER BY query_id ASC;",
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
    "title": "Инцидент #707: Чтение 65 ТБ из S3 из-за потери Partition Pruning",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT query_id, scanned_tb, spill_disk_gb, 'OPTIMAL_PHYSICAL_PLAN' AS plan_verdict FROM explain_audit;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  query_id,\n  scanned_tb,\n  spill_disk_gb,\n  CASE\n    WHEN has_partition_filter = 0 THEN 'BROKEN_PARTITION_PRUNING'\n    WHEN spill_disk_gb > 0 THEN 'NEEDS_MORE_PARTITIONS_OR_RAM'\n    ELSE 'OPTIMAL_PHYSICAL_PLAN'\n  END AS plan_verdict\nFROM explain_audit\nORDER BY query_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Первым делом проверьте WHEN has_partition_filter = 0 THEN 'BROKEN_PARTITION_PRUNING'.",
    "Затем проверьте сброс на диск: WHEN spill_disk_gb > 0 THEN 'NEEDS_MORE_PARTITIONS_OR_RAM'.",
    "В ветке ELSE верните 'OPTIMAL_PHYSICAL_PLAN' и отсортируйте по query_id ASC."
  ]
};
