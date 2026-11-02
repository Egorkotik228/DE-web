import { Lesson } from '@/types/course';

export const sparkLesson3: Lesson = {
  "id": "spark-3",
  "moduleSlug": "spark",
  "order": 3,
  "title": "Анатомия Shuffle в Spark: Wide vs Narrow Transformations, сетевые пересылки и Spill",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Shuffle (Перетасовка)",
      "definition": "Процесс перераспределения данных между партициями на всех экзекьюторах кластера для группировок, объединений и сортировок, включающий сериализацию, запись на диск и сетевую передачу."
    },
    {
      "term": "Narrow vs Wide Dependency",
      "definition": "Узкая зависимость (map, filter) не требует пересылки данных между узлами; широкая зависимость (groupByKey, join) требует объединения данных с нескольких партиций и создает границу стадий (Stage boundary)."
    },
    {
      "term": "Shuffle Spill",
      "definition": "Аварийный сброс промежуточных буферов перетасовки из оперативной памяти экзекьютора на локальный диск при превышении выделенного объема Execution Memory."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "spark_shuffle_metrics",
      "description": "Метрики операции Shuffle в Spark UI для стадии агрегации",
      "columns": [
        {
          "name": "stage_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "shuffle_write_mb",
          "type": "FLOAT"
        },
        {
          "name": "shuffle_read_mb",
          "type": "FLOAT"
        },
        {
          "name": "spill_memory_mb",
          "type": "FLOAT"
        },
        {
          "name": "spill_disk_mb",
          "type": "FLOAT"
        }
      ],
      "sampleRows": [
        {
          "stage_id": 4,
          "shuffle_write_mb": 14250.5,
          "shuffle_read_mb": 14250.5,
          "spill_memory_mb": 42100.0,
          "spill_disk_mb": 8500.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия Shuffle: Почему перетасовка — главное бутылочное горлышко Spark\n\nВ Apache Spark операции делятся на две фундаментальные категории: **Narrow (узкие)** и **Wide (широкие)** трансформации.\n\n1. **Narrow Transformations (`map`, `filter`, `flatMap`):** каждая партиция результирующего RDD/DataFrame зависит только от одной входной партиции родителя. Экзекьютор обрабатывает данные полностью локально в памяти в потоковом режиме без сетевых пересылок (Pipelining).\n2. **Wide Transformations (`groupByKey`, `reduceByKey`, `join`, `distinct`, `repartition`):** данные для одной выходной партиции должны быть собраны со всех или многих партиций кластера. Для этого Spark инициирует **Shuffle (Перетасовку)**.\n\n```\n[Экзекьютор 1: Партиция 0] --(Хэш-партиционирование)--> [Сортировка/Буфер] -> Shuffle Write (.data + .index)\n                                                      │\n                                                      ├──(Netty Network Fetch)--> [Экзекьютор A: Редьюсер 0]\n                                                      │\n[Экзекьютор 2: Партиция 1] --(Хэш-партиционирование)--> [Сортировка/Буфер] -> Shuffle Write (.data + .index)\n```\n\n#### Стадии выполнения Shuffle:\n1. **Shuffle Write:** Экзекьютор берет записи входной партиции, вычисляет `hash(key) % numPartitions`, раскладывает по бакетам в оперативной памяти (AppendOnlyMap или PartitionedAppendOnlyMap), сортирует по ключу и сбрасывает в единый файл данных `.data` и индексный файл смещений `.index` на локальном диске.\n2. **Shuffle Fetch:** Редьюсеры (Shuffle Read) отправляют асинхронные RPC-запросы через Netty Shuffle Service ко всем воркерам, скачивая необходимые байты по сети.\n3. **Shuffle Read & Aggregation:** Полученные блоки десериализуются в кучу JVM и агрегируются/соединяются.\n\nЕсли объема Execution Memory во время сортировки в Shuffle Write или буферизации в Shuffle Read недостаточно, Spark сбрасывает данные на локальный диск (**Shuffle Spill to Disk**). Это приводит к падению скорости джоба в 10–50 раз из-за дискового I/O и повторной десериализации."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 Инженерная аналогия: Городская почта и районные курьеры",
      "content": "**Narrow-операция** похожа на курьера, который обходит один конкретный район и бросает письма в почтовые ящики: он никуда не выезжает за пределы своей улицы. **Shuffle (Wide-операция)** — это отправка всех писем города в центральный сортировочный логистический хаб: письма свозятся отовсюду на грузовиках (сеть), сортируются по почтовым индексам (хэш-партиционирование), при нехватке места складываются на сырой склад (spill to disk) и развозятся обратно в другие районы. Центральный хаб всегда является узким горлышком всей логистики."
    },
    {
      "type": "data-flow",
      "data": {
        "title": "Разделение графа вычислений на Stage границей ShuffleExchange",
        "description": "Узкие операции объединяются внутри одного Stage. Широкие операции требуют границы ShuffleExchange.",
        "nodes": [
          {
            "id": "read",
            "label": "spark.read.parquet",
            "sublabel": "Narrow",
            "type": "source"
          },
          {
            "id": "filter",
            "label": "filter(status == 'ACTIVE')",
            "sublabel": "Narrow (Stage 0)",
            "type": "transform"
          },
          {
            "id": "shuffle",
            "label": "ShuffleExchange (hash)",
            "sublabel": "Сеть + Диск I/O",
            "type": "queue"
          },
          {
            "id": "group",
            "label": "groupBy('country').sum()",
            "sublabel": "Wide (Stage 1)",
            "type": "transform"
          },
          {
            "id": "save",
            "label": "write.parquet",
            "sublabel": "Sink",
            "type": "storage"
          }
        ],
        "edges": [
          {
            "from": "read",
            "to": "filter",
            "label": "Pipelined local memory"
          },
          {
            "from": "filter",
            "to": "shuffle",
            "label": "Shuffle Write (.data + .index)"
          },
          {
            "from": "shuffle",
            "to": "group",
            "label": "Netty Network Fetch"
          },
          {
            "from": "group",
            "to": "save",
            "label": "Local partition writes"
          }
        ]
      }
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение coalesce() и repartition(): когда использовать каждое",
        "beforeDescription": "Неоптимальное управление партициями (тяжелый Shuffle или перекос)",
        "beforeColumns": [
          "Операция",
          "Поведение в кластере",
          "Последствия для Prod"
        ],
        "beforeRows": [
          [
            "repartition(1) на 100GB",
            "Полный Shuffle всех данных",
            "OOM на одном экзекьюторе"
          ],
          [
            "coalesce(1000) при 200",
            "Игнорируется или ошибка",
            "Число партиций не растет"
          ],
          [
            "200 дефолтных партиций",
            "Мелкие 1-мегабайтные файлы",
            "Перегрузка NameNode HDFS"
          ]
        ],
        "afterDescription": "Оптимальное управление партициями без лишнего Shuffle",
        "afterColumns": [
          "Операция",
          "Оптимальное поведение",
          "Эффект в проде"
        ],
        "afterRows": [
          [
            "coalesce(10) перед записью",
            "Схлопывание соседних партиций",
            "Без Shuffle, 10 файлов"
          ],
          [
            "repartition(100, 'region')",
            "Хэширование по бизнес-ключу",
            "Устранение перекоса (Skew)"
          ],
          [
            "AQE Coalesce (Spark 3+)",
            "Автоматическое слияние мелких",
            "Адаптивный размер партиций"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Дефолтный spark.sql.shuffle.partitions = 200",
      "content": "По умолчанию в Spark SQL параметр `spark.sql.shuffle.partitions` равен **200**. Если вы агрегируете датасет в 5 ТБ, Spark разобьет его всего на 200 партиций по 25 ГБ каждая. Это гарантированно вызовет катастрофический `Shuffle Spill (Disk)` и `OutOfMemoryError`. Напротив, если датасет всего 100 МБ, 200 партиций создадут тысячи микроскопических сетевых запросов и файлов по 500 КБ. **Правило Senior DE:** ориентируйтесь на размер партиции в 128–200 МБ после перетасовки либо активируйте `spark.sql.adaptive.enabled = true`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем глубинное отличие repartition() от coalesce() под капотом?",
      "content": "**Ответ:** `repartition(N)` выполняет полный **Shuffle** с хэш-распределением или Round-Robin, пересылая 100% данных по сети. Его можно использовать как для увеличения, так и для уменьшения числа партиций, а также для равномерного устранения перекоса. `coalesce(N)` работает **без Shuffle**: он только схлопывает соседние партиции локально на тех же узлах кластера. Поэтому `coalesce` работает в разы быстрее, но может использоваться только для **уменьшения** числа партиций и не может устранить перекос внутри сливаемых партиций."
    }
  ],
  "taskDescription": "Оптимизируйте пайплайн с Wide-трансформацией (groupBy) и сохранением:\n1. Настройте в SparkSession параметр 'spark.sql.shuffle.partitions' равным '50'.\n2. Прочитайте логи транзакций из 's3://lake/raw/transactions.parquet'.\n3. Отфильтруйте записи, оставив только 'status == \"SUCCESS\"'.\n4. Выполните группировку по 'merchant_id' и вычислите сумму покупок 'total_amount = F.sum(\"amount\")' и количество 'tx_count = F.count(\"tx_id\")'.\n5. Перед сохранением примените `.coalesce(5)`, чтобы слить выходные партиции без лишнего Shuffle.\n6. Сохраните результат в Parquet по пути 's3://lake/marts/merchant_daily_summary.parquet' в режиме 'overwrite'.",
  "seedCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\n# Инициализируйте Spark с shuffle.partitions=50 и напишите пайплайн\n",
  "initialCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = (SparkSession.builder\n    .appName('optimized_shuffle')\n    .config('spark.sql.shuffle.partitions', '50')\n    .getOrCreate())\n\ndf = spark.read.parquet('s3://lake/raw/transactions.parquet')\n\nsummary_df = (\n    df.filter(F.col('status') == 'SUCCESS')\n      .groupBy('merchant_id')\n      .agg(\n          F.sum('amount').alias('total_amount'),\n          F.count('tx_id').alias('tx_count')\n      )\n      .coalesce(5)\n)\n\nsummary_df.write.mode('overwrite').parquet('s3://lake/marts/merchant_daily_summary.parquet')",
  "solutionCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = (SparkSession.builder\n    .appName('optimized_shuffle')\n    .config('spark.sql.shuffle.partitions', '50')\n    .getOrCreate())\n\ndf = spark.read.parquet('s3://lake/raw/transactions.parquet')\n\nsummary_df = (\n    df.filter(F.col('status') == 'SUCCESS')\n      .groupBy('merchant_id')\n      .agg(\n          F.sum('amount').alias('total_amount'),\n          F.count('tx_id').alias('tx_count')\n      )\n      .coalesce(5)\n)\n\nsummary_df.write.mode('overwrite').parquet('s3://lake/marts/merchant_daily_summary.parquet')",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      ".config('spark.sql.shuffle.partitions', '50')",
      "F.col('status') == 'SUCCESS'",
      ".groupBy('merchant_id')",
      "F.sum('amount').alias('total_amount')",
      "F.count('tx_id').alias('tx_count')",
      ".coalesce(5)",
      ".write.mode('overwrite').parquet"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1303: Вызов repartition(1) на терабайтной витрине вызвал OOM экзекьютора",
    "incidentDescription": "Junior-инженер хотел получить один итоговый Parquet-файл и вызвал df.repartition(1) на таблице объемом 400 ГБ. Вся перетасовка пошла на один контейнер, вызвав зависание на 2 часа и аварийный сбой кластера по OOM.",
    "buggyCode": "# Запись терабайтного датасета в один файл через полный Shuffle\ndf.groupBy('category_id').agg(F.sum('price')).repartition(1).write.parquet('s3://lake/mart.parquet')",
    "fixHint": "Используйте coalesce(10) для разумного сжатия партиций без полного Shuffle перераспределения.",
    "solutionCode": "# Оптимальное уменьшение числа партиций без Shuffle\ndf.groupBy('category_id').agg(F.sum('price')).coalesce(10).write.parquet('s3://lake/mart.parquet')",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Задайте конфиг `spark.sql.shuffle.partitions` через `.config('spark.sql.shuffle.partitions', '50')` в билдере сессии.",
    "Для объединения нескольких агрегаций используйте метод `.agg(F.sum('amount').alias('total_amount'), F.count('tx_id').alias('tx_count'))`.",
    "Для уменьшения числа партиций без сетевого Shuffle используйте `.coalesce(5)` перед `.write`."
  ]
};
