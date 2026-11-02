import { Lesson } from '@/types/course';

export const sparkLesson6: Lesson = {
  "id": "spark-6",
  "moduleSlug": "spark",
  "order": 6,
  "title": "Архитектура памяти Executor и Driver: Unified Memory Manager, persist() и Exit Code 137",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Unified Memory Manager",
      "definition": "Менеджер памяти Spark, динамически распределяющий 60% кучи JVM между Storage и Execution."
    },
    {
      "term": "memoryOverhead",
      "definition": "Внекучевая память контейнера для процессов Python, Arrow и сетевых буферов Netty."
    },
    {
      "term": "Exit Code 137",
      "definition": "Код принудительного завершения контейнера сигналом SIGKILL (128 + 9) от Linux OOM Killer."
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
      "content": "### Память контейнера: JVM Heap + memoryOverhead\nПолный размер контейнера в YARN/K8s равен `spark.executor.memory` (куча JVM) плюс `spark.executor.memoryOverhead` (по умолчанию 10%, минимум 384 МБ — буферы Netty и процессы Python/Arrow). Внутри самой JVM 60% кучи отдается под **Unified Spark Memory**, разделенную между **Storage Memory** (кэш `df.cache()`) и **Execution Memory** (буферы для Shuffle, Join и Sort)."
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
          "Exit Code 137 в PySpark",
          "Маленький memoryOverhead (10%)",
          "OOM Killer убивает контейнер воркера"
        ],
        [
          "Вызов .cache() на каждом шаге",
          "Забита вся область Storage Memory",
          "Вытеснение кэша и долгие паузы GC"
        ],
        [
          "Экзекьютор на 64 ГБ RAM",
          "Куча JVM свыше 32 ГБ",
          "Отключение сжатых указателей JVM"
        ]
      ],
      "afterRows": [
        [
          "memoryOverhead = 20–25%",
          "Запас RAM под Python и Arrow",
          "Стабильная работа без кода 137"
        ],
        [
          "Кэш только на развилках + unpersist()",
          "Чистый пул под джойны и сортировки",
          "Максимум памяти для Execution"
        ],
        [
          "Контейнеры по 4–5 ядер и 16–24 ГБ",
          "Компактные кучи с Compressed Oops",
          "Быстрый и предсказуемый GC"
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
  "seedCode": "CREATE TABLE executor_crashes (executor_id INT, jvm_heap_gb INT, overhead_mb INT, exit_code INT);\nINSERT INTO executor_crashes VALUES (1, 16, 512, 137), (2, 16, 4096, 0), (3, 64, 2048, 1), (4, 16, 3072, 0);",
  "initialCode": "SELECT\n  executor_id,\n  jvm_heap_gb,\n  overhead_mb,\n  exit_code,\n  CASE\n    WHEN exit_code = 137 THEN 'INCREASE_MEMORY_OVERHEAD'\n    WHEN jvm_heap_gb > 32 THEN 'SHRINK_HEAP_BELOW_32GB_FOR_GC'\n    ELSE 'HEALTHY_EXECUTOR'\n  END AS crash_diagnosis\nFROM executor_crashes\nORDER BY executor_id ASC;",
  "solutionCode": "SELECT\n  executor_id,\n  jvm_heap_gb,\n  overhead_mb,\n  exit_code,\n  CASE\n    WHEN exit_code = 137 THEN 'INCREASE_MEMORY_OVERHEAD'\n    WHEN jvm_heap_gb > 32 THEN 'SHRINK_HEAP_BELOW_32GB_FOR_GC'\n    ELSE 'HEALTHY_EXECUTOR'\n  END AS crash_diagnosis\nFROM executor_crashes\nORDER BY executor_id ASC;",
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
    "title": "Инцидент #706: Падение контейнеров PySpark с Exit Code 137",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT executor_id, jvm_heap_gb, overhead_mb, exit_code, 'HEALTHY_EXECUTOR' AS crash_diagnosis FROM executor_crashes;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  executor_id,\n  jvm_heap_gb,\n  overhead_mb,\n  exit_code,\n  CASE\n    WHEN exit_code = 137 THEN 'INCREASE_MEMORY_OVERHEAD'\n    WHEN jvm_heap_gb > 32 THEN 'SHRINK_HEAP_BELOW_32GB_FOR_GC'\n    ELSE 'HEALTHY_EXECUTOR'\n  END AS crash_diagnosis\nFROM executor_crashes\nORDER BY executor_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте код убийства контейнера ОС: WHEN exit_code = 137 THEN 'INCREASE_MEMORY_OVERHEAD'.",
    "Проверьте раздутую кучу JVM: WHEN jvm_heap_gb > 32 THEN 'SHRINK_HEAP_BELOW_32GB_FOR_GC'.",
    "В ветке ELSE верните 'HEALTHY_EXECUTOR' и отсортируйте по executor_id ASC."
  ]
};
