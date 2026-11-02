import { Lesson } from '@/types/course';

export const kafkaLesson3: Lesson = {
  "id": "kafka-3",
  "moduleSlug": "kafka",
  "order": 3,
  "title": "Надёжность Kafka: acks, ISR (In-Sync Replicas), min.insync.replicas и коммит данных",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "ISR (In-Sync Replicas)",
      "definition": "Список актуальных реплик партиции, не отстающих от лидера больше заданного интервала времени."
    },
    {
      "term": "acks",
      "definition": "Уровень подтверждения записи продюсеру: 0 (без ответа), 1 (от лидера), all/-1 (от всех реплик в ISR)."
    },
    {
      "term": "min.insync.replicas",
      "definition": "Минимальное число реплик в ISR, при котором брокер согласен принимать новые записи (защита от потери)."
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
      "content": "### Репликация и анатомия ISR (In-Sync Replicas)\nУ каждой партиции в Kafka есть один **Лидер** (Leader) и несколько **Фолловеров** (Followers). Лидер принимает все запросы на чтение и запись. Фолловеры пассивно вытягивают данные у лидера. Множество фолловеров, которые успевают вовремя скачивать данные (не отставая дольше чем на `replica.lag.time.max.ms`), образуют **ISR (In-Sync Replicas)**. Если лидер падает, новым лидером может стать **только** узел из списка ISR."
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
  "seedCode": "CREATE TABLE kafka_producers (prod_id INT, acks_setting VARCHAR(10), min_isr INT, is_financial_system INT);\nINSERT INTO kafka_producers VALUES (1, '1', 1, 1), (2, 'all', 2, 1), (3, '0', 1, 0), (4, 'all', 2, 0);",
  "initialCode": "SELECT\n  prod_id,\n  acks_setting,\n  min_isr,\n  CASE\n    WHEN is_financial_system = 1 AND (acks_setting != 'all' OR min_isr < 2) THEN 'CRITICAL_RISK_FINANCIAL_DATA_LOSS'\n    ELSE 'RELIABLE_PRODUCER_CONFIG'\n  END AS producer_verdict\nFROM kafka_producers\nORDER BY prod_id ASC;",
  "solutionCode": "SELECT\n  prod_id,\n  acks_setting,\n  min_isr,\n  CASE\n    WHEN is_financial_system = 1 AND (acks_setting != 'all' OR min_isr < 2) THEN 'CRITICAL_RISK_FINANCIAL_DATA_LOSS'\n    ELSE 'RELIABLE_PRODUCER_CONFIG'\n  END AS producer_verdict\nFROM kafka_producers\nORDER BY prod_id ASC;",
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
    "title": "Инцидент #903: Потеря денежных переводов из-за acks = 1",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT prod_id, acks_setting, min_isr, 'RELIABLE_PRODUCER_CONFIG' AS producer_verdict FROM kafka_producers;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  prod_id,\n  acks_setting,\n  min_isr,\n  CASE\n    WHEN is_financial_system = 1 AND (acks_setting != 'all' OR min_isr < 2) THEN 'CRITICAL_RISK_FINANCIAL_DATA_LOSS'\n    ELSE 'RELIABLE_PRODUCER_CONFIG'\n  END AS producer_verdict\nFROM kafka_producers\nORDER BY prod_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте финансовые продюсеры с ослабленным acks: WHEN is_financial_system = 1 AND (acks_setting != 'all' OR min_isr < 2).",
    "Верните 'CRITICAL_RISK_FINANCIAL_DATA_LOSS' для нарушителей и 'RELIABLE_PRODUCER_CONFIG' для безопасных.",
    "Отсортируйте результат по prod_id ASC."
  ]
};
