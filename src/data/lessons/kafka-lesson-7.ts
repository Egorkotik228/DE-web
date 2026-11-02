import { Lesson } from '@/types/course';

export const kafkaLesson7: Lesson = {
  "id": "kafka-7",
  "moduleSlug": "kafka",
  "order": 7,
  "title": "Dead Letter Queue (DLQ) и обработка ошибок: изоляция ядовитых сообщений (Poison Pills)",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Poison Pill (Ядовитое сообщение)",
      "definition": "Сообщение с некорректным форматом или данными, вызывающее фатальное исключение при обработке."
    },
    {
      "term": "DLQ (Dead Letter Queue)",
      "definition": "Изолированный топик для сбора необрабатываемых и битых сообщений после исчерпания всех лимитов повторов."
    },
    {
      "term": "Retry Topics",
      "definition": "Промежуточные топики для отложенного перезапуска обработки временных сбоев с экспоненциальной задержкой."
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
      "content": "### Проблема Poison Pills (Ядовитых сообщений)\nПредставьте, что в партицию Kafka попало некорректное сообщение (битый JSON, нулевой указатель в поле, непредвиденный тип данных). Консьюмер начинает его обрабатывать, падает с исключением, откатывает оффсет, берет это же сообщение снова — и так до бесконечности (**Infinite Retry Loop**). Консьюмер зависает на одной записи, блокируя всю партицию."
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
  "seedCode": "CREATE TABLE dlq_strategies (strat_id INT, has_dlq INT, commits_offset_on_poison_pill INT, has_retry_backoff INT);\nINSERT INTO dlq_strategies VALUES (1, 0, 0, 0), (2, 1, 1, 1), (3, 1, 0, 0), (4, 0, 1, 1);",
  "initialCode": "SELECT\n  strat_id,\n  has_dlq,\n  commits_offset_on_poison_pill,\n  CASE\n    WHEN has_dlq = 0 OR commits_offset_on_poison_pill = 0 THEN 'CRITICAL_RISK_INFINITE_RETRY_LOOP'\n    ELSE 'DLQ_ARCHITECTURE_SECURE'\n  END AS dlq_verdict\nFROM dlq_strategies\nORDER BY strat_id ASC;",
  "solutionCode": "SELECT\n  strat_id,\n  has_dlq,\n  commits_offset_on_poison_pill,\n  CASE\n    WHEN has_dlq = 0 OR commits_offset_on_poison_pill = 0 THEN 'CRITICAL_RISK_INFINITE_RETRY_LOOP'\n    ELSE 'DLQ_ARCHITECTURE_SECURE'\n  END AS dlq_verdict\nFROM dlq_strategies\nORDER BY strat_id ASC;",
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
    "title": "Инцидент #906: Парализация партиций топика ядовитым сообщением",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT strat_id, has_dlq, commits_offset_on_poison_pill, 'DLQ_ARCHITECTURE_SECURE' AS dlq_verdict FROM dlq_strategies;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  strat_id,\n  has_dlq,\n  commits_offset_on_poison_pill,\n  CASE\n    WHEN has_dlq = 0 OR commits_offset_on_poison_pill = 0 THEN 'CRITICAL_RISK_INFINITE_RETRY_LOOP'\n    ELSE 'DLQ_ARCHITECTURE_SECURE'\n  END AS dlq_verdict\nFROM dlq_strategies\nORDER BY strat_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие DLQ или коммита: WHEN has_dlq = 0 OR commits_offset_on_poison_pill = 0.",
    "Верните 'CRITICAL_RISK_INFINITE_RETRY_LOOP' для опасных конфигураций и 'DLQ_ARCHITECTURE_SECURE' для безопасных.",
    "Отсортируйте результат по strat_id ASC."
  ]
};
