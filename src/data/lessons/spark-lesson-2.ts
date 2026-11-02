import { Lesson } from '@/types/course';

export const sparkLesson2: Lesson = {
  "id": "spark-2",
  "moduleSlug": "spark",
  "order": 2,
  "title": "Оптимизатор Catalyst и движок Tungsten: Физический план, CodeGen и Off-Heap память",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Catalyst Optimizer",
      "definition": "Движок оптимизации запросов в Spark SQL, трансформирующий абстрактное синтаксическое дерево через 4 стадии: Unresolved Logical Plan -> Resolved -> Optimized -> Physical Plan."
    },
    {
      "term": "Project Tungsten",
      "definition": "Низкоуровневый движок выполнения Spark, управляющий памятью вне кучи JVM (Off-Heap) и компилирующий цепочки операторов в монолитный Java-байткод в рантайме (Whole-Stage CodeGen)."
    },
    {
      "term": "Whole-Stage Code Generation",
      "definition": "Техника компиляции графа физического плана в один монолитный цикл на Java, исключающая виртуальные вызовы функций между операторами и удерживающая переменные в регистрах CPU."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "spark_plan_stages",
      "description": "Четыре стадии компиляции запроса оптимизатором Catalyst",
      "columns": [
        {
          "name": "stage_order",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "plan_phase",
          "type": "VARCHAR(32)"
        },
        {
          "name": "optimizer_action",
          "type": "VARCHAR(64)"
        },
        {
          "name": "output_artifact",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "stage_order": 1,
          "plan_phase": "Analysis",
          "optimizer_action": "Resolves column names and types via Catalog",
          "output_artifact": "Logical Plan"
        },
        {
          "stage_order": 2,
          "plan_phase": "Optimization",
          "optimizer_action": "Applies rule-based optimizations (Pruning, Pushdown)",
          "output_artifact": "Optimized Logical Plan"
        },
        {
          "stage_order": 3,
          "plan_phase": "Physical Planning",
          "optimizer_action": "Selects algorithms (SortMergeJoin vs BroadcastJoin)",
          "output_artifact": "Selected Physical Plan"
        },
        {
          "stage_order": 4,
          "plan_phase": "Code Generation",
          "optimizer_action": "Tungsten compiles Java bytecode via Janino",
          "output_artifact": "Tungsten Bytecode RDD"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Под капотом Spark: Как Catalyst и Tungsten ускоряют код в 10 раз\n\nНачинающие дата-инженеры считают, что PySpark выполняет Python-код. Это заблуждение! Код на Python в PySpark — это лишь **декларация намерений**. Сам Python код выполняется только на драйвере при построении графа. Физические вычисления на воркерах выполняются в компилированном Java-байткоде!\n\n#### 1. Четыре фазы работы оптимизатора Catalyst:\n1. **Unresolved Logical Plan:** парсинг SQL/DataFrame кода в дерево выражений (имена колонок еще не проверены).\n2. **Analysis (Резолвинг):** обращение к каталогу метаданных (Hive/Iceberg), проверка типов и существования таблиц.\n3. **Optimization (Оптимизация):** применение сотен эвристических правил:\n   - **Constant Folding:** замена `1 + 1` на `2`.\n   - **Predicate Pushdown:** перемещение `filter` как можно ближе к чтению Parquet.\n   - **Column Pruning:** отсечение неиспользуемых колонок.\n4. **Physical Planning:** выбор физических алгоритмов (SortMergeJoin против BroadcastHashJoin) на основе стоимостной модели (Cost-Based Optimizer, CBO).\n\n#### 2. Project Tungsten: Преодоление ограничений JVM\n* **Off-Heap Memory (Свой формат памяти):** JVM-объект `java.lang.String` весит 48 байт для 4 символов текста из-за накладных расходов заголовков JVM. Tungsten хранит данные в плоских бинарных массивах памяти без накладных расходов и без нагрузки на Garbage Collector (GC)!\n* **Whole-Stage CodeGen (`*` в планах `explain()`):** вместо пошаговой передачи кортежей из одного итератора в другой, Tungsten генерирует **один непрерывный Java for-цикл**, работающий на кэшах L1/L2 процессора!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Переводчик с русского на машинные коды завода",
      "content": "PySpark — это чертеж, написанный вами на русском языке (Python). Catalyst — это главный инженер завода: он смотрит на чертеж, убирает дублирующиеся детали и заменяет дорогие узлы на эффективные аналоги. А Tungsten — это ЧПУ-станок: он преобразует чертеж в бинарные команды лазера, вырезающего сталь на предельной скорости."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение традиционного RDD и Spark SQL с Tungsten",
        "beforeDescription": "Низкоуровневый RDD (Java Objects in Heap)",
        "beforeColumns": [
          "execution_dimension",
          "jvm_memory_impact",
          "cpu_cache_locality"
        ],
        "beforeRows": [
          [
            "Object overhead",
            "24-48 bytes overhead per row",
            "High GC pauses (Stop-the-world)"
          ],
          [
            "Virtual function calls",
            "Iterator pattern (next() calls)",
            "CPU cache misses on every row"
          ],
          [
            "Python Py4J serialization",
            "Heavy pickle serialization",
            "Slow socket IPC between Python/JVM"
          ]
        ],
        "afterDescription": "Catalyst + Tungsten DataFrame",
        "afterColumns": [
          "execution_dimension",
          "jvm_memory_impact",
          "cpu_cache_locality"
        ],
        "afterRows": [
          [
            "Compact binary layout",
            "Zero JVM object overhead",
            "Zero GC overhead in off-heap memory"
          ],
          [
            "Whole-Stage CodeGen",
            "Single tight for-loop in Java",
            "L1/L2 CPU cache friendly"
          ],
          [
            "Native C++ speed",
            "Zero python runtime penalty",
            "Identical speed in Python and Scala"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Использование обычных Python UDF вместо нативных функций Spark",
      "content": "Инженер написал `from pyspark.sql.functions import udf` и применил обычную Python-функцию `@udf`. Это разрушает Whole-Stage CodeGen: Spark вынужден сериализовать каждую строку из Tungsten бинарного формата, пересылать через сокет в отдельный Python-процесс, десериализовать, выполнить функцию и вернуть обратно. Запрос замедлился в 25 раз! Всегда используйте нативные функции `pyspark.sql.functions` или Pandas UDF (PyArrow vectorized)!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что означает звездочка `*` перед операторами в плане `df.explain()` (например, `*(1) HashAggregate`)?",
      "content": "**Ответ:** Звездочка `*` означает, что для этого блока операторов активен **Whole-Stage Code Generation** (Tungsten). Все операторы с одинаковым номером фазы (например, `*(1) Filter`, `*(1) Project`, `*(1) HashAggregate`) скомпилированы компилятором Janino в один монолитный Java-класс, работающий без виртуальных вызовов."
    }
  ],
  "taskDescription": "Вам необходимо исследовать оптимизированный физический план выполнения запроса:\n1. Создайте SparkSession 'catalyst_demo'.\n2. Прочитайте таблицу 's3://lake/orders.parquet'.\n3. Примените фильтр `F.col('amount') > 500` и выберите колонку `'customer_id'`.\n4. Вызовите метод `.explain(mode='formatted')` для вывода детального физического плана с метриками Whole-Stage CodeGen.\n\nВведите PySpark код инспекции плана через explain().",
  "seedCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\n# Исследуйте план выполнения запроса через explain()\n",
  "initialCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = SparkSession.builder.appName('catalyst_demo').getOrCreate()\ndf = spark.read.parquet('s3://lake/orders.parquet')\n\nquery_df = df.filter(F.col('amount') > 500).select('customer_id')\nquery_df.explain(mode='formatted')",
  "solutionCode": "from pyspark.sql import SparkSession\nimport pyspark.sql.functions as F\n\nspark = SparkSession.builder.appName('catalyst_demo').getOrCreate()\ndf = spark.read.parquet('s3://lake/orders.parquet')\n\nquery_df = df.filter(F.col('amount') > 500).select('customer_id')\nquery_df.explain(mode='formatted')",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SparkSession.builder.appName('catalyst_demo')",
      ".filter(F.col('amount') > 500)",
      ".select('customer_id')",
      ".explain(mode='formatted')"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1202: 30-кратное падение скорости из-за стандартной Python UDF",
    "incidentDescription": "Разработчик применил обычный @udf для парсинга домена из email, сломав Whole-Stage CodeGen.",
    "buggyCode": "@udf(returnType=StringType())\ndef extract_domain(email):\n    return email.split('@')[-1]",
    "fixHint": "Замените кастомный Python UDF на нативную функцию F.split() или регулярное выражение F.regexp_extract().",
    "solutionCode": "df.withColumn('domain', F.split(F.col('email'), '@').getItem(1))",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Инициализируйте сессию SparkSession с именем приложения 'catalyst_demo'.",
    "Сформируйте ленивый запрос с `filter` и `select`.",
    "Выведите отформатированный план через `query_df.explain(mode='formatted')`."
  ]
};
