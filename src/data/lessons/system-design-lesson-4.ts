import { Lesson } from '@/types/course';

export const systemDesignLesson4: Lesson = {
  "id": "system-design-4",
  "moduleSlug": "system-design",
  "order": 4,
  "title": "Data Governance, Lineage, Data Quality и Data Contracts",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Data Lineage",
      "definition": "Граф зависимостей и прослеживаемости данных от первичных источников до конечных аналитических витрин."
    },
    {
      "term": "Data Contract",
      "definition": "Официальное соглашение о структуре и качестве данных между создателями источника и потребителями."
    },
    {
      "term": "Data Quality",
      "definition": "Процесс валидации данных на соответствие бизнес-правилам, уникальности, полноте и свежести."
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
      "content": "### Data Lineage и Data Quality в продакшене\nКогда в компании тысячи таблиц, жизненно необходим **Data Lineage** (карта родословной данных: откуда пришла колонка, какие модели её пересчитывают и кто её потребитель в BI). При изменении структуры сырой таблицы Lineage мгновенно подсвечивает все затронутые витрины. За качество данных (**Data Quality**) отвечают автоматические тесты (проверка на уникальность, не-null, свежесть данных и отсутствие выбросов), интегрированные в Airflow или dbt."
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
  "seedCode": "CREATE TABLE governance_audits (audit_id INT, has_data_contract INT, has_lineage INT, has_dq_tests INT);\nINSERT INTO governance_audits VALUES (1, 0, 0, 0), (2, 1, 1, 1), (3, 1, 0, 1), (4, 0, 1, 0);",
  "initialCode": "SELECT\n  audit_id,\n  has_data_contract,\n  has_lineage,\n  CASE\n    WHEN has_data_contract = 0 OR has_lineage = 0 OR has_dq_tests = 0 THEN 'ENFORCE_DATA_CONTRACTS_AND_LINEAGE'\n    ELSE 'GOVERNANCE_FRAMEWORK_COMPLIANT'\n  END AS governance_verdict\nFROM governance_audits\nORDER BY audit_id ASC;",
  "solutionCode": "SELECT\n  audit_id,\n  has_data_contract,\n  has_lineage,\n  CASE\n    WHEN has_data_contract = 0 OR has_lineage = 0 OR has_dq_tests = 0 THEN 'ENFORCE_DATA_CONTRACTS_AND_LINEAGE'\n    ELSE 'GOVERNANCE_FRAMEWORK_COMPLIANT'\n  END AS governance_verdict\nFROM governance_audits\nORDER BY audit_id ASC;",
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
    "title": "Инцидент #1004: Срыв отчетов из-за тихого изменения схемы бэкенда",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT audit_id, has_data_contract, has_lineage, 'GOVERNANCE_FRAMEWORK_COMPLIANT' AS governance_verdict FROM governance_audits;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  audit_id,\n  has_data_contract,\n  has_lineage,\n  CASE\n    WHEN has_data_contract = 0 OR has_lineage = 0 OR has_dq_tests = 0 THEN 'ENFORCE_DATA_CONTRACTS_AND_LINEAGE'\n    ELSE 'GOVERNANCE_FRAMEWORK_COMPLIANT'\n  END AS governance_verdict\nFROM governance_audits\nORDER BY audit_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте отсутствие контракта или Lineage: WHEN has_data_contract = 0 OR has_lineage = 0 OR has_dq_tests = 0.",
    "Верните 'ENFORCE_DATA_CONTRACTS_AND_LINEAGE' для нарушителей и 'GOVERNANCE_FRAMEWORK_COMPLIANT' для безопасных.",
    "Отсортируйте результат по audit_id ASC."
  ]
};
