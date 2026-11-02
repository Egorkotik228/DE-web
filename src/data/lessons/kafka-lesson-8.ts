import { Lesson } from '@/types/course';

export const kafkaLesson8: Lesson = {
  "id": "kafka-8",
  "moduleSlug": "kafka",
  "order": 8,
  "title": "Проектирование энд-топик архитектуры и тюнинг Kafka: retention, сжатие сегментов и батчинг",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Log Retention",
      "definition": "Политика очистки старых сегментов лога по времени или суммарному размеру."
    },
    {
      "term": "Log Compaction",
      "definition": "Политика сжатия лога, оставляющая только последнее сообщение для каждого уникального ключа."
    },
    {
      "term": "linger.ms",
      "definition": "Время ожидания продюсера для накопления крупного батча сообщений перед отправкой на брокер."
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
      "content": "### Стратегии хранения: Log Retention против Log Compaction\nБрокеры Kafka хранят данные на диске в виде сегментов (`.log`, `.index`). Управлять их очисткой можно двумя политиками:\n1. **Log Retention (`cleanup.policy = delete`)** — удаление старых сегментов по времени (`retention.hours = 72`) или по достижении лимита объема (`retention.bytes`). Используется для логов и событий.\n2. **Log Compaction (`cleanup.policy = compact`)** — фоновый процесс удаляет старые версии сообщений с одинаковым ключом, оставляя **только последнее актуальное состояние для каждого ключа**. Это превращает топик в персистентную хэш-таблицу (идеально для справочников и таблиц состояний!)."
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
  "seedCode": "CREATE TABLE kafka_cluster_tuning (cluster_id INT, retention_configured INT, uses_compression INT, linger_ms INT);\nINSERT INTO kafka_cluster_tuning VALUES (1, 0, 0, 0), (2, 1, 1, 20), (3, 1, 0, 0), (4, 0, 1, 10);",
  "initialCode": "SELECT\n  cluster_id,\n  retention_configured,\n  uses_compression,\n  CASE\n    WHEN retention_configured = 0 OR uses_compression = 0 OR linger_ms = 0 THEN 'OPTIMIZE_RETENTION_COMPRESSION_AND_BATCHING'\n    ELSE 'KAFKA_CLUSTER_TUNED_OPTIMALLY'\n  END AS tuning_verdict\nFROM kafka_cluster_tuning\nORDER BY cluster_id ASC;",
  "solutionCode": "SELECT\n  cluster_id,\n  retention_configured,\n  uses_compression,\n  CASE\n    WHEN retention_configured = 0 OR uses_compression = 0 OR linger_ms = 0 THEN 'OPTIMIZE_RETENTION_COMPRESSION_AND_BATCHING'\n    ELSE 'KAFKA_CLUSTER_TUNED_OPTIMALLY'\n  END AS tuning_verdict\nFROM kafka_cluster_tuning\nORDER BY cluster_id ASC;",
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
    "title": "Инцидент #907: Аварийная остановка кластера из-за переполнения дисков",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT cluster_id, retention_configured, uses_compression, 'KAFKA_CLUSTER_TUNED_OPTIMALLY' AS tuning_verdict FROM kafka_cluster_tuning;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  cluster_id,\n  retention_configured,\n  uses_compression,\n  CASE\n    WHEN retention_configured = 0 OR uses_compression = 0 OR linger_ms = 0 THEN 'OPTIMIZE_RETENTION_COMPRESSION_AND_BATCHING'\n    ELSE 'KAFKA_CLUSTER_TUNED_OPTIMALLY'\n  END AS tuning_verdict\nFROM kafka_cluster_tuning\nORDER BY cluster_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие retention или сжатия: WHEN retention_configured = 0 OR uses_compression = 0 OR linger_ms = 0.",
    "Верните 'OPTIMIZE_RETENTION_COMPRESSION_AND_BATCHING' для неоптимальных кластеров и 'KAFKA_CLUSTER_TUNED_OPTIMALLY' для настроенных.",
    "Отсортируйте результат по cluster_id ASC."
  ]
};
