import { Lesson } from '@/types/course';

export const kafkaLesson1: Lesson = {
  "id": "kafka-1",
  "moduleSlug": "kafka",
  "order": 1,
  "title": "Архитектура Apache Kafka с нуля: Commit Log, топики, партиции, нулевое копирование и оффсеты",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Commit Log",
      "definition": "Неизменяемый распределенный журнал, в который сообщения дописываются последовательно в конец."
    },
    {
      "term": "Zero-Copy",
      "definition": "Технология передачи данных из дискового PageCache в сетевой интерфейс в обход памяти пользовательского приложения."
    },
    {
      "term": "Offset",
      "definition": "Уникальный монотонно возрастающий целочисленный номер сообщения внутри конкретной партиции топика."
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
      "content": "### Commit Log и физика нулевого копирования (Zero-Copy)\n**Apache Kafka** — это не классическая брокерная очередь сообщений, а распределенный неизменяемый журнал фиксации транзакций (**Append-only Commit Log**). Сообщения пишутся в конец файла последовательно (Sequential I/O), что дает скорость записи на обычных HDD, сопоставимую с памятью. При чтении Kafka использует системный вызов `sendfile` (**Zero-Copy**): данные из дискового кэша ядра ОС (`PageCache`) пересылаются в сетевой сокет минуя пользовательское пространство памяти JVM, нагружая CPU всего на несколько процентов."
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
  "seedCode": "CREATE TABLE kafka_topics (topic_id INT, partitions_count INT, has_message_key INT, order_strictness_req INT);\nINSERT INTO kafka_topics VALUES (1, 12, 1, 1), (2, 8, 0, 1), (3, 4, 1, 0), (4, 16, 0, 0);",
  "initialCode": "SELECT\n  topic_id,\n  partitions_count,\n  CASE\n    WHEN order_strictness_req = 1 AND has_message_key = 0 THEN 'ORDER_VIOLATION_ADD_MESSAGE_KEY'\n    ELSE 'KAFKA_TOPIC_CONFIG_OK'\n  END AS topic_verdict\nFROM kafka_topics\nORDER BY topic_id ASC;",
  "solutionCode": "SELECT\n  topic_id,\n  partitions_count,\n  CASE\n    WHEN order_strictness_req = 1 AND has_message_key = 0 THEN 'ORDER_VIOLATION_ADD_MESSAGE_KEY'\n    ELSE 'KAFKA_TOPIC_CONFIG_OK'\n  END AS topic_verdict\nFROM kafka_topics\nORDER BY topic_id ASC;",
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
    "title": "Инцидент #901: Нарушение хронологии заказов из-за отсутствия ключа",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT topic_id, partitions_count, 'KAFKA_TOPIC_CONFIG_OK' AS topic_verdict FROM kafka_topics;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  topic_id,\n  partitions_count,\n  CASE\n    WHEN order_strictness_req = 1 AND has_message_key = 0 THEN 'ORDER_VIOLATION_ADD_MESSAGE_KEY'\n    ELSE 'KAFKA_TOPIC_CONFIG_OK'\n  END AS topic_verdict\nFROM kafka_topics\nORDER BY topic_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте требование порядка без ключа: WHEN order_strictness_req = 1 AND has_message_key = 0.",
    "Верните 'ORDER_VIOLATION_ADD_MESSAGE_KEY' для нарушителей и 'KAFKA_TOPIC_CONFIG_OK' для остальных.",
    "Отсортируйте результат по topic_id ASC."
  ]
};
