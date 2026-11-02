import { Lesson } from '@/types/course';

export const sparkLesson1: Lesson = {
  "id": "spark-1",
  "moduleSlug": "spark",
  "order": 1,
  "title": "Архитектура Apache Spark: Driver, Executors, RDD vs DataFrame и Lazy Evaluation",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Driver Program (Драйвер Spark)",
      "definition": "Главный процесс Spark-приложения, содержащий SparkSession, строящий граф вычислений (DAG) и распределяющий задачи между экзекьюторами."
    },
    {
      "term": "Executors (Экзекьюторы)",
      "definition": "JVM-процессы на рабочих узлах кластера (YARN NodeManagers / K8s Pods), выполняющие таски в выделенных потоках (cores) и хранящие кэшированные данные в памяти."
    },
    {
      "term": "Lazy Evaluation (Ленивые вычисления)",
      "definition": "Принцип работы Spark, при котором трансформации (map, filter, join) не выполняются немедленно, а накапливаются в виде графа DAG до вызова первого действия (action: count, collect, write)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "spark_cluster_executors",
      "description": "Снимок активных экзекьюторов кластера в Spark UI",
      "columns": [
        {
          "name": "executor_id",
          "type": "VARCHAR(16)",
          "keyType": "PK"
        },
        {
          "name": "address",
          "type": "VARCHAR(32)"
        },
        {
          "name": "cores",
          "type": "INTEGER"
        },
        {
          "name": "active_tasks",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "executor_id": "driver",
          "address": "10.0.1.10:38291",
          "cores": 4,
          "active_tasks": 0
        },
        {
          "executor_id": "1",
          "address": "10.0.1.15:42100",
          "cores": 4,
          "active_tasks": 4
        },
        {
          "executor_id": "2",
          "address": "10.0.1.16:42100",
          "cores": 4,
          "active_tasks": 3
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура Apache Spark: Вычисления в оперативной памяти\n\nКлассический MapReduce записывал результаты каждого промежуточного шага на медленный жесткий диск HDFS. **Apache Spark совершил революцию**, перенеся промежуточные вычисления в оперативную память (RAM) и объединив их в единый конвейер вычислений.\n\n#### 1. Компоненты приложения Spark:\n* **Driver (Мозг приложения):** инициализирует `SparkSession`, транслирует Python/SQL в логический план, планирует стадии (Stages) и задачи (Tasks), координирует завершение джоба.\n* **Cluster Manager (YARN / Kubernetes / Standalone):** аллоцирует ресурсы физических серверов.\n* **Executors (Рабочие руки):** изолированные процессы JVM, исполняющие таски. У каждого экзекьютора есть фиксированное число ядер (`--executor-cores`) и памяти (`--executor-memory`).\n\n#### 2. Эволюция API: RDD -> DataFrame -> Dataset\n* **RDD (Resilient Distributed Dataset):** низкоуровневая коллекция объектов Java/Python. Не имеет схемы, черная коробка для оптимизатора, сериализуется медленно.\n* **DataFrame (Стандарт PySpark):** распределенная таблица с именованными колонками и типами данных (Schema). Оптимизируется движком **Catalyst** и выполняется на C++ скорости через **Tungsten**!\n* **Dataset (Scala/Java):** строго типизированный DataFrame с проверкой типов на этапе компиляции.\n\n#### 3. Трансформации (Transformations) vs Действия (Actions):\n* **Трансформации (`filter`, `select`, `join`, `groupBy`):** ленивы (Lazy). Они лишь регистрируют шаг в графе вычислений (DAG Lineage), не читая ни одного байта с диска!\n* **Действия (`count()`, `show()`, `collect()`, `write.parquet()`):** триггерят физический запуск вычислений на кластере."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: План постройки дома и стройка",
      "content": "Трансформации в Spark — это чертежи архитектора: вы можете начертить 50 этажей, добавить лифт и изменить цвет обоев на бумаге за 2 секунды (ленивое построение плана). Никто не кладет кирпичи. Действие (`action`) — это приказ генерального подрядчика: «Начать стройку!». Только в этот момент строители (Executors) берут лопаты и начинают копать фундамент."
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
      "title": "⚠️ Грабли в проде: Вызов `.collect()` на миллиардном датасете",
      "content": "Инженер вызвал `df.collect()` в PySpark. Команда `collect()` собирает ВСЕ партиции со всех 200 экзекьюторов в память одного процесса Driver. Драйвер мгновенно упал с `java.lang.OutOfMemoryError: Java heap space`, уронив весь кластерный джоб. Для отладки используйте `df.take(10)` или `df.limit(10).toPandas()`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в Spark сделана Lazy Evaluation вместо немедленного выполнения шагов?",
      "content": "**Ответ:** Ленивость позволяет оптимизатору **Catalyst** увидеть весь граф вычислений целиком от источника до сохранения. Это дает возможность применить глобальные оптимизации: объединить несколько фильтров в один (Filter Pushdown), исключить ненужные колонки при чтении (Column Pruning) и объединить последовательные операции в единый скомпилированный цикл (Whole-Stage Code Generation)."
    }
  ],
  "taskDescription": "Напишите базовый пайплайн PySpark с ленивой фильтрацией и сохранением:\n1. Инициализируйте SparkSession с именем приложения 'sales_etl'.\n2. Прочитайте Parquet-файл 's3://lake/raw/orders.parquet'.\n3. Отфильтруйте заказы со статусом 'status == \"COMPLETED\"' и суммой 'amount > 1000'.\n4. Выберите только колонки 'order_id', 'customer_id', 'amount'.\n5. Сохраните результат в формате Parquet по пути 's3://lake/marts/completed_orders.parquet' в режиме 'overwrite'.\n\nВведите законченный PySpark скрипт.",
  "seedCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\n# Напишите ленивый ETL пайплайн\n",
  "initialCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = SparkSession.builder.appName('sales_etl').getOrCreate()\n\ndf = spark.read.parquet('s3://lake/raw/orders.parquet')\n\nfiltered_df = (\n    df.filter((F.col('status') == 'COMPLETED') & (F.col('amount') > 1000))\n      .select('order_id', 'customer_id', 'amount')\n)\n\nfiltered_df.write.mode('overwrite').parquet('s3://lake/marts/completed_orders.parquet')",
  "solutionCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = SparkSession.builder.appName('sales_etl').getOrCreate()\n\ndf = spark.read.parquet('s3://lake/raw/orders.parquet')\n\nfiltered_df = (\n    df.filter((F.col('status') == 'COMPLETED') & (F.col('amount') > 1000))\n      .select('order_id', 'customer_id', 'amount')\n)\n\nfiltered_df.write.mode('overwrite').parquet('s3://lake/marts/completed_orders.parquet')",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SparkSession.builder.appName('sales_etl')",
      "spark.read.parquet",
      "F.col('status') == 'COMPLETED'",
      "F.col('amount') > 1000",
      ".select('order_id', 'customer_id', 'amount')",
      ".write.mode('overwrite').parquet"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1201: Падение Spark Driver из-за вызова .collect() на боевом кластере",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "# Загрузка всего распределенного датасета в память драйвера\nall_orders = df.filter('amount > 0').collect()",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "sample_orders = df.filter('amount > 0').limit(10).collect()",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте `SparkSession.builder.appName('sales_etl').getOrCreate()`.",
    "Комбинируйте условия через побитовое И `&` с круглыми скобками: `(F.col('status') == 'COMPLETED') & (F.col('amount') > 1000)`.",
    "Сохранение выполняется методом `.write.mode('overwrite').parquet(...)`."
  ]
};
