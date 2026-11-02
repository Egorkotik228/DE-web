import { Lesson } from '@/types/course';

export const kafkaLesson4: Lesson = {
  "id": "kafka-4",
  "moduleSlug": "kafka",
  "order": 4,
  "title": "Exactly-Once Semantics (EOS) в Kafka: Идемпотентный продюсер и транзакции",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Idempotent Producer",
      "definition": "Режим продюсера, гарантирующий отсутствие дублей при сетевых ретраях с помощью Producer ID и Sequence Number."
    },
    {
      "term": "Transaction Coordinator",
      "definition": "Внутренний компонент Kafka, управляющий двухфазным коммитом транзакционных сообщений и оффсетов."
    },
    {
      "term": "read_committed",
      "definition": "Уровень изоляции консьюмера, отфильтровывающий незавершенные и прерванные транзакции."
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
      "content": "### Идемпотентный продюсер (`enable.idempotence = true`)\nПри сетевых сбоях продюсер может отправить одно и то же сообщение повторно (At-Least-Once), что приводит к дублям. **Идемпотентный продюсер** присваиваетж каждому сообщению уникальный порядковый номер (`Sequence Number`) и ID продюсера (`PID`). Брокер Kafka отслеживает последовательность номеров и автоматически отбрасывает дубликаты на лету, гарантируя доставку **ровно один раз в рамках одной сессии** без потери производительности."
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
  "seedCode": "CREATE TABLE eos_configs (app_id INT, idempotence_enabled INT, isolation_level VARCHAR(20), processes_financial_ledger INT);\nINSERT INTO eos_configs VALUES (1, 0, 'read_uncommitted', 1), (2, 1, 'read_committed', 1), (3, 0, 'read_committed', 0), (4, 1, 'read_uncommitted', 0);",
  "initialCode": "SELECT\n  app_id,\n  idempotence_enabled,\n  isolation_level,\n  CASE\n    WHEN processes_financial_ledger = 1 AND (idempotence_enabled = 0 OR isolation_level != 'read_committed') THEN 'UPGRADE_TO_EXACTLY_ONCE_EOS'\n    ELSE 'EOS_CONFIG_SECURE'\n  END AS eos_verdict\nFROM eos_configs\nORDER BY app_id ASC;",
  "solutionCode": "SELECT\n  app_id,\n  idempotence_enabled,\n  isolation_level,\n  CASE\n    WHEN processes_financial_ledger = 1 AND (idempotence_enabled = 0 OR isolation_level != 'read_committed') THEN 'UPGRADE_TO_EXACTLY_ONCE_EOS'\n    ELSE 'EOS_CONFIG_SECURE'\n  END AS eos_verdict\nFROM eos_configs\nORDER BY app_id ASC;",
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
    "title": "Инцидент #903b: Двойное зачисление средств из-за отключенной идемпотентности",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT app_id, idempotence_enabled, isolation_level, 'EOS_CONFIG_SECURE' AS eos_verdict FROM eos_configs;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  app_id,\n  idempotence_enabled,\n  isolation_level,\n  CASE\n    WHEN processes_financial_ledger = 1 AND (idempotence_enabled = 0 OR isolation_level != 'read_committed') THEN 'UPGRADE_TO_EXACTLY_ONCE_EOS'\n    ELSE 'EOS_CONFIG_SECURE'\n  END AS eos_verdict\nFROM eos_configs\nORDER BY app_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте финансовые леджеры без EOS: WHEN processes_financial_ledger = 1 AND (idempotence_enabled = 0 OR isolation_level != 'read_committed').",
    "Верните 'UPGRADE_TO_EXACTLY_ONCE_EOS' для уязвимых приложений и 'EOS_CONFIG_SECURE' для безопасных.",
    "Отсортируйте результат по app_id ASC."
  ]
};
