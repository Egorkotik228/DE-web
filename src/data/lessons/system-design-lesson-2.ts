import { Lesson } from '@/types/course';

export const systemDesignLesson2: Lesson = {
  "id": "system-design-2",
  "moduleSlug": "system-design",
  "order": 2,
  "title": "Capacity Planning и расчет ресурсов: память, CPU, диски и пропускная способность сети",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Capacity Planning",
      "definition": "Процесс расчета вычислительных ресурсов (CPU, RAM, Disk, Network) под целевые нагрузки и объемы данных."
    },
    {
      "term": "IOPS (Input/Output Operations)",
      "definition": "Количество операций ввода-вывода в секунду, критический показатель производительности дисковой подсистемы."
    },
    {
      "term": "Headroom",
      "definition": "Запас прочности инфраструктуры (обычно 30–50%), оставляемый свободным для обработки пиковых нагрузок и бэкфиллов."
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
      "content": "### Формулы Capacity Planning для Data Platform\nПри проектировании кластера нельзя брать железо «на глаз». Расчет строится на метриках:\n1. **Сетевой трафик ($BW$):** $TPS \\times AvgPayloadSize \\times ReplicationFactor$. Например, 10 000 сообщений/сек по 2 КБ с репликацией 3 дают $10000 \\times 2048 \\times 3 = 60 \\text{ МБ/сек}$ сетевой нагрузки на запись.\n2. **Дисковое пространство ($Disk$):** $DailyIngestGB \\times RetentionDays \\times CompressionFactor$. Если в сутки пишется 500 ГБ несжатых логов, retention 30 дней и сжатие ZSTD дает x5 ($500 \\times 30 / 5 = 3 \\text{ ТБ}$ полезного диска с запасом под пики x2).\n3. **Память для Spark/ClickHouse:** расчет RAM под пулы Execution Memory, размер хэш-таблиц для JOIN и размер буферов саб-партиций."
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
  "seedCode": "CREATE TABLE capacity_plans (plan_id INT, tps INT, disk_type VARCHAR(10), has_headroom INT);\nINSERT INTO capacity_plans VALUES (1, 25000, 'HDD', 0), (2, 50000, 'NVMe', 1), (3, 1000, 'HDD', 1), (4, 80000, 'NVMe', 0);",
  "initialCode": "SELECT\n  plan_id,\n  tps,\n  disk_type,\n  CASE\n    WHEN disk_type = 'HDD' OR has_headroom = 0 THEN 'UPGRADE_TO_NVME_AND_ADD_HEADROOM'\n    ELSE 'CAPACITY_PLAN_VALIDATED'\n  END AS plan_verdict\nFROM capacity_plans\nORDER BY plan_id ASC;",
  "solutionCode": "SELECT\n  plan_id,\n  tps,\n  disk_type,\n  CASE\n    WHEN disk_type = 'HDD' OR has_headroom = 0 THEN 'UPGRADE_TO_NVME_AND_ADD_HEADROOM'\n    ELSE 'CAPACITY_PLAN_VALIDATED'\n  END AS plan_verdict\nFROM capacity_plans\nORDER BY plan_id ASC;",
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
    "title": "Инцидент #1002: Коллапс дисков из-за использования HDD вместо NVMe",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT plan_id, tps, disk_type, 'CAPACITY_PLAN_VALIDATED' AS plan_verdict FROM capacity_plans;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  plan_id,\n  tps,\n  disk_type,\n  CASE\n    WHEN disk_type = 'HDD' OR has_headroom = 0 THEN 'UPGRADE_TO_NVME_AND_ADD_HEADROOM'\n    ELSE 'CAPACITY_PLAN_VALIDATED'\n  END AS plan_verdict\nFROM capacity_plans\nORDER BY plan_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте устаревшие диски или отсутствие запаса: WHEN disk_type = 'HDD' OR has_headroom = 0.",
    "Верните 'UPGRADE_TO_NVME_AND_ADD_HEADROOM' для рискованных планов и 'CAPACITY_PLAN_VALIDATED' для безопасных.",
    "Отсортируйте результат по plan_id ASC."
  ]
};
