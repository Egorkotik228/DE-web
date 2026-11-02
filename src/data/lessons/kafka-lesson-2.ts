import { Lesson } from '@/types/course';

export const kafkaLesson2: Lesson = {
  "id": "kafka-2",
  "moduleSlug": "kafka",
  "order": 2,
  "title": "Consumer Groups, ребалансировка и оффсеты: как Kafka распределяет нагрузку",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Consumer Group",
      "definition": "Группа консьюмеров, совместно читающих топик так, что каждая партиция назначена ровно одному участнику."
    },
    {
      "term": "Group Coordinator",
      "definition": "Брокер Kafka, управляющий составом группы и координирующий процедуру ребалансировки."
    },
    {
      "term": "Rebalance",
      "definition": "Процесс перераспределения партиций между консьюмерами при изменении состава группы или сбое heartbeat."
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
      "content": "### Механика Consumer Groups и Group Coordinator\nДля масштабирования чтения консьюмеры объединяются в **Consumer Groups**. Главное правило Kafka: **одна партиция топика может читаться ровно одним консьюмером из группы** (но один консьюмер может читать несколько партиций). Один из брокеров назначается **Group Coordinator** — он следит за здоровьем консьюмеров через `heartbeat`. Если консьюмер упал или завис на сборке мусора (`STW GC`), координатор инициирует процедуру **ребалансировки (Rebalance)** — перераспределение партиций между выжившими консьюмерами."
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
  "seedCode": "CREATE TABLE consumer_metrics (group_id INT, poll_interval_ms INT, batch_size INT, has_rebalance_storm INT);\nINSERT INTO consumer_metrics VALUES (1, 10000, 500, 0), (2, 600000, 10000, 1), (3, 15000, 1000, 0), (4, 400000, 8000, 1);",
  "initialCode": "SELECT\n  group_id,\n  poll_interval_ms,\n  CASE\n    WHEN poll_interval_ms > 300000 AND has_rebalance_storm = 1 THEN 'TUNE_MAX_POLL_INTERVAL_OR_REDUCE_BATCH'\n    ELSE 'CONSUMER_GROUP_STABLE'\n  END AS group_health\nFROM consumer_metrics\nORDER BY group_id ASC;",
  "solutionCode": "SELECT\n  group_id,\n  poll_interval_ms,\n  CASE\n    WHEN poll_interval_ms > 300000 AND has_rebalance_storm = 1 THEN 'TUNE_MAX_POLL_INTERVAL_OR_REDUCE_BATCH'\n    ELSE 'CONSUMER_GROUP_STABLE'\n  END AS group_health\nFROM consumer_metrics\nORDER BY group_id ASC;",
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
    "title": "Инцидент #902: Шторм ребалансировок из-за таймаута max.poll.interval",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT group_id, poll_interval_ms, 'CONSUMER_GROUP_STABLE' AS group_health FROM consumer_metrics;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  group_id,\n  poll_interval_ms,\n  CASE\n    WHEN poll_interval_ms > 300000 AND has_rebalance_storm = 1 THEN 'TUNE_MAX_POLL_INTERVAL_OR_REDUCE_BATCH'\n    ELSE 'CONSUMER_GROUP_STABLE'\n  END AS group_health\nFROM consumer_metrics\nORDER BY group_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте шторм ребалансировок и интервал: WHEN poll_interval_ms > 300000 AND has_rebalance_storm = 1.",
    "Верните 'TUNE_MAX_POLL_INTERVAL_OR_REDUCE_BATCH' для проблемных групп и 'CONSUMER_GROUP_STABLE' для остальных.",
    "Отсортируйте результат по group_id ASC."
  ]
};
