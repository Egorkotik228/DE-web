import { Lesson } from '@/types/course';

export const systemDesignLesson3: Lesson = {
  "id": "system-design-3",
  "moduleSlug": "system-design",
  "order": 3,
  "title": "End-to-End проектирование платформ: от источника OLTP до BI-дашбордов",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "End-to-End Architecture",
      "definition": "Сквозное проектное решение, описывающее весь жизненный цикл данных от источника до потребителя."
    },
    {
      "term": "Serving Layer",
      "definition": "Слой быстрой выдачи готовых витрин данных в BI-системы и микросервисы."
    },
    {
      "term": "Single Point of Failure (SPOF)",
      "definition": "Узел системы, отказ которого приводит к остановке всей платформы целиком."
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
      "content": "### Четыре слота End-to-End Data Platform\nПри проектировании платформ данные проходят стандартизированный путь:\n1. **Ingestion (Захват):** Debezium (CDC из Postgres), Kafka Connect (API-интеграции), Airbyte/Fivetran (SaaS). На выходе — сырые топики Kafka.\n2. **Storage & Lakehouse (Хранение):** S3 / MinIO как объектное озеро, Apache Iceberg как транзакционный табличный формат (ACID, Time Travel).\n3. **Processing & Transformation (Обработка):** Apache Spark для тяжелого тяжелого бэкфилла и ML, dbt Core для модульных SQL-трансформаций в DWH (ClickHouse / Greenplum).\n4. **Serving & Consumption (Витрины):** ClickHouse / PostgreSQL для BI-систем (Superset, PowerBI) и оперативных API."
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
  "seedCode": "CREATE TABLE e2e_pipelines (pipe_id INT, has_kafka_buffer INT, is_idempotent INT, has_spof INT);\nINSERT INTO e2e_pipelines VALUES (1, 0, 0, 1), (2, 1, 1, 0), (3, 1, 0, 1), (4, 0, 1, 0);",
  "initialCode": "SELECT\n  pipe_id,\n  has_kafka_buffer,\n  is_idempotent,\n  CASE\n    WHEN has_kafka_buffer = 0 OR is_idempotent = 0 OR has_spof = 1 THEN 'REDESIGN_PIPELINE_ADD_BUFFER_AND_IDEMPOTENCY'\n    ELSE 'E2E_ARCHITECTURE_APPROVED'\n  END AS e2e_verdict\nFROM e2e_pipelines\nORDER BY pipe_id ASC;",
  "solutionCode": "SELECT\n  pipe_id,\n  has_kafka_buffer,\n  is_idempotent,\n  CASE\n    WHEN has_kafka_buffer = 0 OR is_idempotent = 0 OR has_spof = 1 THEN 'REDESIGN_PIPELINE_ADD_BUFFER_AND_IDEMPOTENCY'\n    ELSE 'E2E_ARCHITECTURE_APPROVED'\n  END AS e2e_verdict\nFROM e2e_pipelines\nORDER BY pipe_id ASC;",
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
    "title": "Инцидент #1003: Потеря данных и SPOF в сквозном конвейере",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT pipe_id, has_kafka_buffer, is_idempotent, 'E2E_ARCHITECTURE_APPROVED' AS e2e_verdict FROM e2e_pipelines;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  pipe_id,\n  has_kafka_buffer,\n  is_idempotent,\n  CASE\n    WHEN has_kafka_buffer = 0 OR is_idempotent = 0 OR has_spof = 1 THEN 'REDESIGN_PIPELINE_ADD_BUFFER_AND_IDEMPOTENCY'\n    ELSE 'E2E_ARCHITECTURE_APPROVED'\n  END AS e2e_verdict\nFROM e2e_pipelines\nORDER BY pipe_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие буфера или идемпотентности: WHEN has_kafka_buffer = 0 OR is_idempotent = 0 OR has_spof = 1.",
    "Верните 'REDESIGN_PIPELINE_ADD_BUFFER_AND_IDEMPOTENCY' для уязвимых проектов и 'E2E_ARCHITECTURE_APPROVED' для надежных.",
    "Отсортируйте результат по pipe_id ASC."
  ]
};
