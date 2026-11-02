import { Lesson } from '@/types/course';

export const systemDesignLesson1: Lesson = {
  "id": "system-design-1",
  "moduleSlug": "system-design",
  "order": 1,
  "title": "Архитектурные паттерны: Lambda, Kappa архитектуры и Data Mesh",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Lambda Architecture",
      "definition": "Гибридный подход с раздельным Batch-слоем для точности и Speed-слоем для быстрой доставки."
    },
    {
      "term": "Kappa Architecture",
      "definition": "Упрощенная архитектура без batch-слоя, где вся историческая и потоковая обработка идет через единый лог."
    },
    {
      "term": "Data Mesh",
      "definition": "Организационный и архитектурный подход, децентрализующий владение данными по бизнес-доменам."
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
      "content": "### Lambda и Kappa архитектуры\n- **Lambda Architecture**: разделяет обработку на два слоя — **Batch Layer** (ночной пересчет абсолютной точности в Hadoop/Spark/dbt) и **Speed Layer** (быстрый стриминг в Kafka/Flink для свежих апроксимаций). Главная боль — поддержка двух разных кодовых баз (Batch и Streaming), которые часто дают расходящиеся результаты.\n- **Kappa Architecture**: упраздняет отдельный Batch-слой. Все данные (и стрим, и исторический бэкфилл) проходят через единый лог (Apache Kafka), а пересчет витрин делается простым перезапуском стрима с нулевого оффсета в новый топик."
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
  "seedCode": "CREATE TABLE arch_choices (project_id INT, has_dual_codebase INT, team_count INT, domain_split INT);\nINSERT INTO arch_choices VALUES (1, 1, 2, 0), (2, 0, 15, 1), (3, 1, 20, 0), (4, 0, 3, 1);",
  "initialCode": "SELECT\n  project_id,\n  has_dual_codebase,\n  team_count,\n  CASE\n    WHEN has_dual_codebase = 1 THEN 'MIGRATE_TO_KAPPA_UNIFY_CODE'\n    WHEN team_count > 10 AND domain_split = 0 THEN 'IMPLEMENT_DATA_MESH_DOMAINS'\n    ELSE 'ARCHITECTURE_DESIGN_OPTIMAL'\n  END AS arch_verdict\nFROM arch_choices\nORDER BY project_id ASC;",
  "solutionCode": "SELECT\n  project_id,\n  has_dual_codebase,\n  team_count,\n  CASE\n    WHEN has_dual_codebase = 1 THEN 'MIGRATE_TO_KAPPA_UNIFY_CODE'\n    WHEN team_count > 10 AND domain_split = 0 THEN 'IMPLEMENT_DATA_MESH_DOMAINS'\n    ELSE 'ARCHITECTURE_DESIGN_OPTIMAL'\n  END AS arch_verdict\nFROM arch_choices\nORDER BY project_id ASC;",
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
    "title": "Инцидент #1001: Рассинхрон витрин из-за раздельного кода в Lambda",
    "incidentDescription": "Инженер выполнил `rows = df.collect()` для 100 млн записей, вызвав OOM на драйвере и срыв ночного расписания.",
    "buggyCode": "SELECT project_id, has_dual_codebase, team_count, 'ARCHITECTURE_DESIGN_OPTIMAL' AS arch_verdict FROM arch_choices;",
    "fixHint": "Используйте запись на диск напрямую df.write или ограничьте выборку через df.take(10).",
    "solutionCode": "SELECT\n  project_id,\n  has_dual_codebase,\n  team_count,\n  CASE\n    WHEN has_dual_codebase = 1 THEN 'MIGRATE_TO_KAPPA_UNIFY_CODE'\n    WHEN team_count > 10 AND domain_split = 0 THEN 'IMPLEMENT_DATA_MESH_DOMAINS'\n    ELSE 'ARCHITECTURE_DESIGN_OPTIMAL'\n  END AS arch_verdict\nFROM arch_choices\nORDER BY project_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте наличие двойного кода: WHEN has_dual_codebase = 1.",
    "Проверьте крупную компанию без доменов: WHEN team_count > 10 AND domain_split = 0.",
    "Для сбалансированных проектов верните 'ARCHITECTURE_DESIGN_OPTIMAL' и отсортируйте по project_id ASC."
  ]
};
