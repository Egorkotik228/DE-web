import { Lesson } from '@/types/course';

export const clickhouseLesson4: Lesson = {
  "id": "clickhouse-4",
  "moduleSlug": "clickhouse",
  "order": 4,
  "title": "Масштабирование ClickHouse: ReplicatedMergeTree, ClickHouse Keeper и Distributed таблицы",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "ReplicatedMergeTree",
      "definition": "Движок с автоматической репликацией кусков данных между узлами шарда через координатор."
    },
    {
      "term": "ClickHouse Keeper",
      "definition": "Высокопроизводительный координатор на C++ (замена ZooKeeper), реализующий алгоритм консенсуса Raft."
    },
    {
      "term": "internal_replication",
      "definition": "Настройка шарда в конфиге кластера, доверяющая репликацию кусков движку ReplicatedMergeTree."
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
      "content": "### `ReplicatedMergeTree` и координация через ClickHouse Keeper\nДля отказоустойчивости используется движок **`ReplicatedMergeTree('/clickhouse/tables/{shard}/events', '{replica}')`**. В ClickHouse нет понятия Master/Slave — репликация **мульти-мастерная**: вставлять данные можно на любую реплику. Координатор **ClickHouse Keeper** (написанный на C++ аналог ZooKeeper) хранит только лог операций (`какой кусок появился`, `какие куски нужно слить`) и контрольные суммы, а сами сжатые куски реплики скачивают друг у друга напрямую по сети."
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
          "Обычный MergeTree на 1 ноде",
          "Отказ диска ведет к полной потере данных",
          "Простой аналитики на часы"
        ],
        [
          "internal_replication = false",
          "Distributed пишет во все реплики в обход Keeper",
          "Дублирование или рассинхрон реплик"
        ],
        [
          "Тяжелый ZooKeeper на старой JVM",
          "Паузы GC в ZooKeeper рвут сессии реплик",
          "Таблицы падают в режим Read-Only"
        ]
      ],
      "afterRows": [
        [
          "ReplicatedMergeTree (2+ реплики)",
          "Автоматическая докачка недостающих Parts",
          "Нулевая потеря данных при падении ноды"
        ],
        [
          "internal_replication = true",
          "Запись в 1 реплику + надежная репликация Keeper",
          "Строгая консистентность и дедупликация батчей"
        ],
        [
          "Нативный ClickHouse Keeper на C++",
          "Низкое потребление RAM и отсутствие GC",
          "Стабильная работа кластера 24/7"
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
  "seedCode": "CREATE TABLE cluster_shards (shard_id INT, engine_type VARCHAR(30), internal_repl INT, keeper_healthy INT);\nINSERT INTO cluster_shards VALUES (1, 'ReplicatedMergeTree', 1, 1), (2, 'ReplicatedMergeTree', 0, 1), (3, 'ReplicatedMergeTree', 1, 0), (4, 'MergeTree', 0, 1);",
  "initialCode": "SELECT\n  shard_id,\n  engine_type,\n  CASE\n    WHEN keeper_healthy = 0 THEN 'REPLICA_READ_ONLY_MODE'\n    WHEN engine_type = 'ReplicatedMergeTree' AND internal_repl = 0 THEN 'ENABLE_INTERNAL_REPLICATION'\n    WHEN engine_type = 'MergeTree' THEN 'NO_FAULT_TOLERANCE'\n    ELSE 'CLUSTER_SHARD_OK'\n  END AS shard_status\nFROM cluster_shards\nORDER BY shard_id ASC;",
  "solutionCode": "SELECT\n  shard_id,\n  engine_type,\n  CASE\n    WHEN keeper_healthy = 0 THEN 'REPLICA_READ_ONLY_MODE'\n    WHEN engine_type = 'ReplicatedMergeTree' AND internal_repl = 0 THEN 'ENABLE_INTERNAL_REPLICATION'\n    WHEN engine_type = 'MergeTree' THEN 'NO_FAULT_TOLERANCE'\n    ELSE 'CLUSTER_SHARD_OK'\n  END AS shard_status\nFROM cluster_shards\nORDER BY shard_id ASC;",
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
    "title": "Инцидент #804: Переход реплик в Read-Only и дубли при записи в Distributed",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT shard_id, engine_type, 'CLUSTER_SHARD_OK' AS shard_status FROM cluster_shards;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  shard_id,\n  engine_type,\n  CASE\n    WHEN keeper_healthy = 0 THEN 'REPLICA_READ_ONLY_MODE'\n    WHEN engine_type = 'ReplicatedMergeTree' AND internal_repl = 0 THEN 'ENABLE_INTERNAL_REPLICATION'\n    WHEN engine_type = 'MergeTree' THEN 'NO_FAULT_TOLERANCE'\n    ELSE 'CLUSTER_SHARD_OK'\n  END AS shard_status\nFROM cluster_shards\nORDER BY shard_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Сначала проверьте падение координатора: WHEN keeper_healthy = 0 THEN 'REPLICA_READ_ONLY_MODE'.",
    "Затем проверьте отключенную внутреннюю репликацию: WHEN engine_type = 'ReplicatedMergeTree' AND internal_repl = 0.",
    "Для нереплицируемого MergeTree верните 'NO_FAULT_TOLERANCE', иначе 'CLUSTER_SHARD_OK'."
  ]
};
