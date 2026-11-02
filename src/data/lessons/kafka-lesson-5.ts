import { Lesson } from '@/types/course';

export const kafkaLesson5: Lesson = {
  "id": "kafka-5",
  "moduleSlug": "kafka",
  "order": 5,
  "title": "CDC (Change Data Capture) и Debezium: чтение WAL базы данных и Outbox Pattern",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "WAL (Write-Ahead Log)",
      "definition": "Журнал предзаписи транзакций в СУБД, используемый Debezium для извлечения изменений в реальном времени."
    },
    {
      "term": "Transactional Outbox",
      "definition": "Паттерн надежной интеграции: сохранение событий в таблицу outbox в той же транзакции, что и бизнес-данные."
    },
    {
      "term": "Replication Slot",
      "definition": "Механизм в PostgreSQL, удерживающий WAL-логи от удаления до тех пор, пока CDC-клиент их не вычитает."
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
      "content": "### Как работает Debezium и логирование WAL\n**Change Data Capture (CDC)** позволяет мгновенно транслировать любые изменения из реляционной СУБД (Postgres, MySQL) в Kafka. **Debezium** подключается к базе как репликационный клиент и читает системный журнал транзакций (**WAL — Write-Ahead Log** или Postgres *Logical Decoding*). Каждое изменение (`INSERT`, `UPDATE`, `DELETE`) превращается в структурированное JSON/Avro-событие с секциями `before` (старое состояние), `after` (новое состояние) и метаданными операции."
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
  "seedCode": "CREATE TABLE cdc_patterns (pat_id INT, has_dual_write INT, uses_outbox INT, captures_deletes INT);\nINSERT INTO cdc_patterns VALUES (1, 1, 0, 0), (2, 0, 1, 1), (3, 1, 1, 1), (4, 0, 0, 0);",
  "initialCode": "SELECT\n  pat_id,\n  has_dual_write,\n  uses_outbox,\n  CASE\n    WHEN has_dual_write = 1 AND uses_outbox = 0 THEN 'DANGER_DUAL_WRITE_REPLACE_WITH_OUTBOX'\n    ELSE 'CDC_ARCHITECTURE_SECURE'\n  END AS cdc_verdict\nFROM cdc_patterns\nORDER BY pat_id ASC;",
  "solutionCode": "SELECT\n  pat_id,\n  has_dual_write,\n  uses_outbox,\n  CASE\n    WHEN has_dual_write = 1 AND uses_outbox = 0 THEN 'DANGER_DUAL_WRITE_REPLACE_WITH_OUTBOX'\n    ELSE 'CDC_ARCHITECTURE_SECURE'\n  END AS cdc_verdict\nFROM cdc_patterns\nORDER BY pat_id ASC;",
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
    "title": "Инцидент #904: Рассинхрон данных из-за Dual-Write в микросервисах",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT pat_id, has_dual_write, uses_outbox, 'CDC_ARCHITECTURE_SECURE' AS cdc_verdict FROM cdc_patterns;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  pat_id,\n  has_dual_write,\n  uses_outbox,\n  CASE\n    WHEN has_dual_write = 1 AND uses_outbox = 0 THEN 'DANGER_DUAL_WRITE_REPLACE_WITH_OUTBOX'\n    ELSE 'CDC_ARCHITECTURE_SECURE'\n  END AS cdc_verdict\nFROM cdc_patterns\nORDER BY pat_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте опасный паттерн Dual-Write: WHEN has_dual_write = 1 AND uses_outbox = 0.",
    "Верните 'DANGER_DUAL_WRITE_REPLACE_WITH_OUTBOX' для нарушителей и 'CDC_ARCHITECTURE_SECURE' для безопасных архитектур.",
    "Отсортируйте результат по pat_id ASC."
  ]
};
