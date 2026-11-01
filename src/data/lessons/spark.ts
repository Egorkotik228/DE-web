import { Lesson } from '@/types/course';

export const sparkLessons: Lesson[] = [
  {
    id: 'pyspark-window-functions',
    moduleSlug: 'spark',
    order: 1,
    title: 'Apache Spark & PySpark: Архитектура Catalyst, Shuffle и оконные функции',
    estimatedMinutes: 45,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Apache Spark: Распределенная обработка в памяти (In-Memory Processing)

Apache Spark вытеснил классический Hadoop MapReduce благодаря вычислениям в оперативной памяти (**до 100x быстрее**) и графу ленивых вычислений (**DAG Lineage**).

#### Архитектура кластера Spark
1. **Driver (Драйвер):** главный процесс, который содержит \`SparkSession\`, превращает код пользователя в логический план, оптимизирует его через **Catalyst Optimizer** и компилирует в физический Java-байткод через **Tungsten**.
2. **Cluster Manager (YARN, K8s, Standalone):** выделяет ресурсы кластера.
3. **Executors (Исполнители):** JVM-процессы на рабочих узлах, в которых выделены слоты (Cores) для параллельного выполнения задач (Tasks). Хранят кэш данных (\`cache()\` / \`persist()\`).

#### Narrow vs Wide Transformations
- **Narrow (Узкие трансформации):** \`filter()\`, \`select()\`, \`withColumn()\`. Каждая выходная партиция зависит только от одной входной. Выполняются на месте без передачи данных по сети (Pipelining).
- **Wide (Широкие трансформации):** \`groupBy()\`, \`join()\`, \`distinct()\`, \`repartition()\`. Требуют перераспределения данных между всеми узлами кластера (**Shuffle**).

#### Оконные функции в PySpark (\`pyspark.sql.window\`)
Оконные функции позволяют производить вычисления по группе строк (партиции) без сжатия строк в одну:
\`\`\`python
from pyspark.sql import functions as F
from pyspark.sql.window import Window

# Окно с партиционированием по отделу и сортировкой по окладу
window_spec = Window.partitionBy('department').orderBy(F.col('salary').desc())

# Присвоение ранга внутри отдела
ranked_df = df.withColumn('rank', F.row_number().over(window_spec))
\`\`\``,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Тасовка колоды карт (Shuffle)',
        content:
          'Узкая трансформация — это покрасить рубашку каждой карты в руке игрока (быстро, на месте). Широкая трансформация (Shuffle) — это собрать все карты со всех столов в казино в одну колоду, перетасовать и раздать заново по мастям. Это самая дорогая операция в дата-инженерии.',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Перекос данных (Data Skew)',
        content:
          'Если при джойне по \`user_id\` 99% строк имеют значение \`user_id = NULL\` (или ID гостя), все эти миллионы строк полетят в один-единственный экзекьютор. 99 экзекьюторов закончат работу за 10 секунд, а один зависнет на 3 часа и упадет с OOM. Решение: соление ключей (Salting) или фильтрация NULL до джойна.',
      },
    ],
    glossaryTerms: [
      { term: 'Catalyst Optimizer', definition: 'Оптимизатор запросов Spark, проводящий предикатный пушдаун, проекции колонок и выбор стратегии джойна (Broadcast vs SortMerge).' },
      { term: 'Shuffle', definition: 'Процесс перераспределения данных между экзекьюторами по сети при выполнении операций группировки или объединения.' },
      { term: 'Window.partitionBy()', definition: 'Спецификация окна в PySpark, задающая границы группы для аналитических расчетов (row_number, lag, sum over).' },
    ],
    schemaPreview: [
      {
        tableName: 'employees',
        columns: [
          { name: 'name', type: 'VARCHAR(50)' },
          { name: 'dept', type: 'VARCHAR(20)' },
          { name: 'salary', type: 'INT' },
        ],
        sampleRows: [
          { name: 'Alice', dept: 'IT', salary: 150000 },
          { name: 'Bob', dept: 'IT', salary: 120000 },
          { name: 'Carol', dept: 'HR', salary: 90000 },
        ],
      },
    ],
    taskDescription:
      'Используя PySpark, создайте DataFrame с сотрудниками, примените оконную функцию `F.row_number().over(Window.partitionBy("dept").orderBy(F.col("salary").desc()))` и выберите топ-1 самого высокооплачиваемого сотрудника в каждом отделе (`rank == 1`). Запустите расчет через встроенный PySpark Wasm эмулятор.',
    seedCode: `# Seed DataFrame setup
import pandas as pd
raw_data = [
    {"name": "Alice", "dept": "IT", "salary": 150000},
    {"name": "Bob", "dept": "IT", "salary": 120000},
    {"name": "Charlie", "dept": "IT", "salary": 95000},
    {"name": "Diana", "dept": "HR", "salary": 90000},
    {"name": "Evan", "dept": "HR", "salary": 75000},
]
df = spark.createDataFrame(raw_data)
`,
    initialCode: `from pyspark.sql import functions as F
from pyspark.sql.window import Window

# 1. Задаем спецификацию окна по отделу с сортировкой по зарплате
window_spec = Window.partitionBy("dept").orderBy(F.col("salary").desc())

# 2. Вычисляем ранг и фильтруем топ-1 в каждом отделе
ranked_df = df.withColumn("rn", F.row_number().over(window_spec))
result = ranked_df.filter(F.col("rn") == 1).select("name", "dept", "salary")
result.show()
`,
    solutionCode: `from pyspark.sql import functions as F
from pyspark.sql.window import Window

window_spec = Window.partitionBy("dept").orderBy(F.col("salary").desc())
ranked_df = df.withColumn("rn", F.row_number().over(window_spec))
result = ranked_df.filter(F.col("rn") == 1).select("name", "dept", "salary")
`,
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['Window.partitionBy', 'row_number', 'over'],
    },
    brokenProdTask: {
      title: 'Авария: Зависание Shuffle из-за df.collect()',
      incidentDescription:
        'P1 Incident: Драйвер Spark упал с Java Heap Space OutOfMemory из-за вызова .collect() на датасете размером 400 ГБ.',
      buggyCode: 'all_rows = df.collect()',
      fixHint: 'Никогда не выгружайте весь датасет на драйвер! Используйте .take(10) или агрегацию на экзекьюторах.',
      solutionCode: 'all_rows = df.take(10)',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Используйте Window.partitionBy("dept").orderBy(F.col("salary").desc()).',
      'Примените F.row_number().over(window_spec).',
      'Отфильтруйте результат по rn == 1.',
    ],
  },
];
