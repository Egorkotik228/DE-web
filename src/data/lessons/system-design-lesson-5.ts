import { Lesson } from '@/types/course';

export const systemDesignLesson5: Lesson = {
  "id": "system-design-5",
  "moduleSlug": "system-design",
  "order": 5,
  "title": "FinOps для Data Platform: оптимизация затрат на облака, S3, ClickHouse и Spark",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "FinOps (Financial Operations)",
      "definition": "Культура и практика финансовой подотчетности в облаках, объединяющая инженеров, финансы и бизнес."
    },
    {
      "term": "S3 Lifecycle Policies",
      "definition": "Правила автоматического перемещения или удаления объектов в объектном хранилище по истечении времени."
    },
    {
      "term": "Spot Instances",
      "definition": "Прерываемые облачные серверы со скидкой до 70%, используемые для устойчивых к сбоям batch-расчетов."
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
      "content": "### FinOps в мире больших данных\nОблачные счета за AWS/GCP могут незаметно вырасти до астрономических сумм. Основные статьи перерасхода в DE:\n1. **Хранение в S3:** хранение бесконечных сырых бэкапов и неструктурированных файлов без Lifecycle-политик. Решение: автоматический перевод в **S3 Glacier** через 30–90 дней и удаление временных партиций.\n2. **Вычисления Spark / ClickHouse:** запуск тяжелых тяжелых кластеров 24/7 под редкие ночные джобы. Решение: запуск по требованию через **Spot Instances** (прерываемые инстансы со скидкой до 70%) и автомасштабирование.\n3. **Сетевой трафик (Data Transfer):** перегонка терабайт между зонами доступности и облаками. Решение: кокалокация сервисов в одной AZ."
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
  "seedCode": "CREATE TABLE finops_audit (audit_id INT, has_lifecycle INT, uses_spot_instances INT, unbounded_scans_allowed INT);\nINSERT INTO finops_audit VALUES (1, 0, 0, 1), (2, 1, 1, 0), (3, 1, 0, 1), (4, 0, 1, 0);",
  "initialCode": "SELECT\n  audit_id,\n  has_lifecycle,\n  uses_spot_instances,\n  CASE\n    WHEN has_lifecycle = 0 OR unbounded_scans_allowed = 1 THEN 'OPTIMIZE_FINOPS_ADD_LIFECYCLE_AND_QUOTES'\n    ELSE 'FINOPS_BUDGET_OPTIMIZED'\n  END AS finops_verdict\nFROM finops_audit\nORDER BY audit_id ASC;",
  "solutionCode": "SELECT\n  audit_id,\n  has_lifecycle,\n  uses_spot_instances,\n  CASE\n    WHEN has_lifecycle = 0 OR unbounded_scans_allowed = 1 THEN 'OPTIMIZE_FINOPS_ADD_LIFECYCLE_AND_QUOTES'\n    ELSE 'FINOPS_BUDGET_OPTIMIZED'\n  END AS finops_verdict\nFROM finops_audit\nORDER BY audit_id ASC;",
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
    "title": "Инцидент #1005: Перерасход облачного бюджета из-за отсутствия FinOps",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT audit_id, has_lifecycle, uses_spot_instances, 'FINOPS_BUDGET_OPTIMIZED' AS finops_verdict FROM finops_audit;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  audit_id,\n  has_lifecycle,\n  uses_spot_instances,\n  CASE\n    WHEN has_lifecycle = 0 OR unbounded_scans_allowed = 1 THEN 'OPTIMIZE_FINOPS_ADD_LIFECYCLE_AND_QUOTES'\n    ELSE 'FINOPS_BUDGET_OPTIMIZED'\n  END AS finops_verdict\nFROM finops_audit\nORDER BY audit_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие lifecycle или разрешенные сканы: WHEN has_lifecycle = 0 OR unbounded_scans_allowed = 1.",
    "Верните 'OPTIMIZE_FINOPS_ADD_LIFECYCLE_AND_QUOTES' для неоптимальных бюджетов и 'FINOPS_BUDGET_OPTIMIZED' для оптимизированных.",
    "Отсортируйте результат по audit_id ASC."
  ]
};
