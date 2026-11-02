import { Lesson } from '@/types/course';

export const sparkLesson4: Lesson = {
  "id": "spark-4",
  "moduleSlug": "spark",
  "order": 4,
  "title": "Стратегии соединений (Joins) в Spark: SortMergeJoin, BroadcastHashJoin и ShuffleHashJoin",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "BroadcastHashJoin (BHJ)",
      "definition": "Самая быстрая стратегия соединения в Spark: малая таблица рассылается целиком на каждый экзекьютор, полностью исключая сетевой Shuffle для большой таблицы."
    },
    {
      "term": "SortMergeJoin (SMJ)",
      "definition": "Дефолтная надежная стратегия соединения двух больших таблиц: обе стороны шафлятся по ключу соединения, сортируются на узлах и сливаются линейным проходом."
    },
    {
      "term": "Broadcast Nested Loop Join (BNLJ)",
      "definition": "Крайне медленный алгоритм типа декартова произведения, применяемый при отсутствии условий равенства в предикате соединения (Theta Joins)."
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
      "content": "### Анатомия соединений в Spark: Как Catalyst выбирает стратегию Join\n\nСоединение распределенных датасетов — самая ресурсоемкая операция в Big Data. Оптимизатор Spark SQL поддерживает 4 основные стратегии:\n\n#### 1. BroadcastHashJoin (BHJ)\n* **Как работает:** Драйвер скачивает малую таблицу целиком, строит из нее хэш-таблицу и рассылает ее через P2P-механизм (BitTorrent TorrentBroadcast) на ВСЕ экзекьюторы. Экзекьюторы читают свои локальные партиции большой таблицы и делают `lookup` в хэш-таблице без единого байта сетевого Shuffle!\n* **Условие включения:** Размер таблицы меньше порога `spark.sql.autoBroadcastJoinThreshold` (по умолчанию 10 МБ) или указан явный хинт `F.broadcast(small_df)`.\n* **Сложность:** O(M + N). Самый быстрый Join в распределенных системах.\n\n#### 2. SortMergeJoin (SMJ)\n* **Как работает:** По умолчанию используется для соединения двух больших таблиц.\n  1. Обе таблицы перетасовываются по хэшу ключа соединения (`ShuffleExchange hashpartitioning`).\n  2. На каждом экзекьюторе строки локально сортируются по ключу (`Sort [key ASC]`).\n  3. Экзекьютор идет двумя указателями по отсортированным потокам, сшивая совпадающие ключи (`SortMergeJoin`).\n* **Преимущество:** Не требует удержания всей таблицы в оперативной памяти — данные читаются потоком с диска/памяти, что защищает от OOM даже при петабайтах данных.\n\n#### 3. ShuffleHashJoin (SHJ)\n* **Как работает:** Обе таблицы шафлятся по ключу, но вместо сортировки экзекьютор строит хэш-таблицу из меньшей партиции прямо в памяти и джойнит вторую.\n* **Минус:** Если меньшая партиция не поместится в память экзекьютора, возникнет OOM.\n\n#### 4. Broadcast Nested Loop Join (BNLJ) и CartesianProduct\n* **Применяется,** когда в условии join нет знака равенства (например, `fact.time >= dim.start_time AND fact.time <= dim.end_time`).\n* **Сложность:** O(M * N). Чрезвычайно тяжелая операция, способная повесить кластер."
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
  "seedCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\n# Напишите оптимизированный Broadcast Join\n",
  "initialCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = SparkSession.builder.appName('broadcast_join_lab').getOrCreate()\n\nfact_sales = spark.read.parquet('s3://lake/raw/fact_sales.parquet')\ndim_stores = spark.read.parquet('s3://lake/raw/dim_stores.parquet')\n\njoined_df = (\n    fact_sales.join(F.broadcast(dim_stores), on='store_id', how='inner')\n              .select('sale_id', 'store_id', 'store_name', 'amount')\n)\n\njoined_df.write.mode('overwrite').parquet('s3://lake/marts/sales_with_stores.parquet')",
  "solutionCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = SparkSession.builder.appName('broadcast_join_lab').getOrCreate()\n\nfact_sales = spark.read.parquet('s3://lake/raw/fact_sales.parquet')\ndim_stores = spark.read.parquet('s3://lake/raw/dim_stores.parquet')\n\njoined_df = (\n    fact_sales.join(F.broadcast(dim_stores), on='store_id', how='inner')\n              .select('sale_id', 'store_id', 'store_name', 'amount')\n)\n\njoined_df.write.mode('overwrite').parquet('s3://lake/marts/sales_with_stores.parquet')",
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
    "title": "Инцидент #1404: 40-минутный Shuffle Join терабайтной таблицы с 500 строками справочника",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "# Тяжелый SMJ без хинта\nclicks = spark.read.parquet('s3://lake/clicks')\nregions = spark.read.parquet('s3://lake/regions') # всего 89 регионов\nresult = clicks.join(regions, 'region_id')",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "# Оптимальный Broadcast Hash Join\nclicks = spark.read.parquet('s3://lake/clicks')\nregions = spark.read.parquet('s3://lake/regions')\nresult = clicks.join(F.broadcast(regions), 'region_id')",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте `F.broadcast(dim_stores)` внутри первого аргумента метода `.join()`.",
    "Параметры соединения: `fact_sales.join(F.broadcast(dim_stores), on='store_id', how='inner')`.",
    "Для выбора полей примените `.select('sale_id', 'store_id', 'store_name', 'amount')`."
  ]
};
