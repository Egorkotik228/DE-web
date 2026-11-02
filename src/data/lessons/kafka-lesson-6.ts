import { Lesson } from '@/types/course';

export const kafkaLesson6: Lesson = {
  "id": "kafka-6",
  "moduleSlug": "kafka",
  "order": 6,
  "title": "Управление схемой данных: Schema Registry, Confluent Avro и эволюция схем (Compatibility)",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Schema Registry",
      "definition": "Сервис хранения и валидации версий схем данных (Avro, Protobuf, JSON Schema) с поддержкой правил совместимости."
    },
    {
      "term": "Apache Avro",
      "definition": "Компактный бинарный формат сериализации со схемой, хранящейся отдельно от самих данных."
    },
    {
      "term": "BACKWARD Compatibility",
      "definition": "Правило совместимости, при котором код нового консьюмера способен успешно читать старые сообщения."
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
      "content": "### Confluent Schema Registry и Apache Avro\nПересылка сырых JSON-строк в Kafka — это пустая трата трафика (громоздкие ключи полей) и огромный риск сломать консьюмер при изменении структуры. В продакшене используют бинарную сериализацию **Apache Avro** совместно с централизованным сервисом **Schema Registry**. Продюсер отправляет в Kafka крошечный хэш-код схемы (ID схемы, 5 байт) и бинарный хвост полезной нагрузки. Консьюмер по ID запрашивает схему у Schema Registry и мгновенно расшифровывает байты."
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
  "seedCode": "CREATE TABLE schema_rules (rule_id INT, has_schema_registry INT, compatibility_mode VARCHAR(20), allows_breaking_change INT);\nINSERT INTO schema_rules VALUES (1, 0, 'NONE', 1), (2, 1, 'BACKWARD', 0), (3, 1, 'NONE', 1), (4, 1, 'FULL', 0);",
  "initialCode": "SELECT\n  rule_id,\n  has_schema_registry,\n  compatibility_mode,\n  CASE\n    WHEN has_schema_registry = 0 OR compatibility_mode = 'NONE' THEN 'CRITICAL_RISK_UNCONTROLLED_SCHEMA_DRIFT'\n    ELSE 'SCHEMA_REGISTRY_GOVERNANCE_OK'\n  END AS governance_verdict\nFROM schema_rules\nORDER BY rule_id ASC;",
  "solutionCode": "SELECT\n  rule_id,\n  has_schema_registry,\n  compatibility_mode,\n  CASE\n    WHEN has_schema_registry = 0 OR compatibility_mode = 'NONE' THEN 'CRITICAL_RISK_UNCONTROLLED_SCHEMA_DRIFT'\n    ELSE 'SCHEMA_REGISTRY_GOVERNANCE_OK'\n  END AS governance_verdict\nFROM schema_rules\nORDER BY rule_id ASC;",
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
    "title": "Инцидент #905: Падение консьюмеров из-за неконтроллируемого дрейфа схем",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT rule_id, has_schema_registry, compatibility_mode, 'SCHEMA_REGISTRY_GOVERNANCE_OK' AS governance_verdict FROM schema_rules;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  rule_id,\n  has_schema_registry,\n  compatibility_mode,\n  CASE\n    WHEN has_schema_registry = 0 OR compatibility_mode = 'NONE' THEN 'CRITICAL_RISK_UNCONTROLLED_SCHEMA_DRIFT'\n    ELSE 'SCHEMA_REGISTRY_GOVERNANCE_OK'\n  END AS governance_verdict\nFROM schema_rules\nORDER BY rule_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие реестра или режима: WHEN has_schema_registry = 0 OR compatibility_mode = 'NONE'.",
    "Верните 'CRITICAL_RISK_UNCONTROLLED_SCHEMA_DRIFT' для незащищенных схем и 'SCHEMA_REGISTRY_GOVERNANCE_OK' для защищенных.",
    "Отсортируйте результат по rule_id ASC."
  ]
};
