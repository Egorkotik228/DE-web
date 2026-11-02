import { TrackModule } from '@/types/course';

export const level6Modules: TrackModule[] = [
  {
    id: 'formats-s3',
    slug: 'formats-s3',
    title: 'Форматы, S3 и Lakehouse',
    shortDescription: 'Анатомия Parquet, сжатие Snappy/ZSTD, объектное хранилище S3, архитектура метаданных Apache Iceberg и Time Travel.',
    level: 6,
    levelTitle: 'Уровень 6: Big Data, Lakehouse & Streaming',
    engineType: 'schema-builder',
    dependencies: ['dbt', 'docker'],
    totalLessons: 6,
    curriculumTopics: [
      'Эволюция форматов данных: От CSV и JSON к колоночным форматам (Parquet, ORC, Avro). Row-based vs Column-based хранение в памяти и на диске',
      'Анатомия Apache Parquet: Footer, Metadata, Row Groups, Columns Chunks, Pages, кодировки (Dictionary, RLE) и алгоритмы сжатия (Snappy, ZSTD)',
      'Объектное хранилище S3 / MinIO для Data Engineer: Архитектура flat namespace, правила генерации ключей (префиксы и TPS limits), multipart upload',
      'Табличные форматы Data Lakehouse: Зачем потребовался Apache Iceberg (и Delta Lake) поверх сырого S3, проблема переименования папок и ACID в хранилищах',
      'Архитектура Apache Iceberg: Catalog, Metadata files, Manifest lists, Manifest files, атомарные Snapshots и изоляция транзакций',
      'Продвинутая работа с Iceberg: Time Travel, Rollback, инкрементальное чтение (Incremental Read), оптимизация файлов (Compaction, Bin-packing, Z-Ordering)',
    ],
    resumeBulletPoints: [
      'Проектирование корпоративных озер данных (Data Lakehouse) на базе Apache Iceberg и MinIO/S3',
      'Оптимизация хранения и скорости аналитических запросов за счет тонкой настройки Row Groups в Parquet',
      'Автоматизация процессов компактизации мелких файлов (Small Files Compaction) в S3',
      'Реализация версионирования данных и Time Travel в соответствии с ACID-стандартами',
    ],
    cheatSheetMarkdown: `### Форматы данных & Lakehouse: Шпаргалка инженера

#### 1. Анатомия Parquet файла
* **Магические байты:** \`PAR1\` в начале и конце файла.
* **Row Group (Группа строк):** логический горизонтальный срез таблицы (обычно 128–512 МБ).
* **Column Chunk:** непрерывные данные одного столбца внутри Row Group.
* **Pages (Страницы):** минимальная единица сжатия и чтения (обычно 1 МБ).
* **File Footer (в самом конце файла!):** содержит глобальную схему данных, число строк и **min/max статистики по каждой колонке каждой Row Group**. Оптимизатор сначала читает последние несколько килобайт файла, чтобы понять, какие Row Groups пропустить!

#### 2. Дерево метаданных Apache Iceberg
1. **Catalog (Nessie/Hive/REST/Glue):** указывает на текущий активный \`metadata.json\`.
2. **Snapshot Metadata JSON:** содержит список снимков таблицы, схему и путь к Manifest List.
3. **Manifest List (AVRO):** список всех манифест-файлов, входящих в этот снимок, с min/max границами партиций.
4. **Manifest File (AVRO):** список конкретных Parquet-файлов с детальными статистиками колонок.
5. **Data Files (PARQUET):** физические файлы с данными в S3.

#### 3. Запрос Time Travel в Iceberg
\`\`\`sql
-- Запрос состояния таблицы на конкретный момент времени в прошлом:
SELECT * FROM sales_lake.orders 
FOR SYSTEM_TIME AS OF TIMESTAMP '2026-05-01 10:00:00 UTC';

-- Или по конкретному ID снимка (Snapshot ID):
SELECT * FROM sales_lake.orders 
FOR SYSTEM_VERSION AS OF 842918491823901;
\`\`\``,
    interviewQuestions: [
      {
        id: 'lake-q1',
        question: 'Почему Parquet хранит метаданные (Footer) в конце файла, а не в начале?',
        answer: 'При записи больших данных (например, стримингом или в распределенном Spark-джобе) итоговый размер столбцов, точное число строк, смещения байтов страниц (byte offsets) и min/max статистики заранее неизвестны. Если бы метаданные находились в заголовке, процессу пришлось бы либо держать весь файл в оперативной памяти до окончания записи, либо совершать повторный случайный перезапуск записи в начало файла. Запись метаданных в конец позволяет непрерывно стримить блоки на диск/S3 и в самом финале дописать Footer.',
        level: 'Middle',
        tags: ['parquet', 'storage', 'metadata'],
      },
      {
        id: 'lake-q2',
        question: 'Что такое Small Files Problem в S3/HDFS и как с ней бороться?',
        answer: 'Когда стриминговые пайплайны или неоттюненные Spark-задачи сбрасывают данные каждые 10 секунд, в хранилище образуются миллионы файлов размером в несколько килобайт. Это катастрофа: 1) В S3 возрастает число платных GET/LIST запросов и сетевых round-trips. 2) В HDFS NameNode держит метаданные каждого файла в RAM (150 байт на файл), вызывая OOM NameNode. 3) Любой аналитический запрос тратит 90% времени на открытие и декомпрессию микрофайлов вместо вычислений. Решение: периодическая фоновая компактизация (Compaction) — фоновый джоб объединяет сотни мелких файлов в оптимизированные файлы по 128-512 МБ.',
        level: 'Junior',
        tags: ['s3', 'hdfs', 'small-files', 'compaction'],
      },
      {
        id: 'lake-q3',
        question: 'В чем фундаментальное преимущество Apache Iceberg перед обычной структурой каталогов Hive (`year=2026/month=05/`)?',
        answer: 'В стиле Hive партиционирование привязано к физической структуре папок на диске. Чтобы узнать список файлов для запроса, движок должен сделать медленный рекурсивный `LIST directory` по S3 (а в S3 операция LIST медленная и неатомарная). Кроме того, операции изменения данных неатомарны: сбой посередине оставляет каталог поврежденным. Apache Iceberg хранит точный список файлов в неизменяемых (immutable) метаданных (Avro Manifests). Определение файлов происходит чтением метаданных за миллисекунды без единого вызова LIST S3. Коммит в Iceberg — это атомарная замена указателя в каталоге (ACID snapshot), обеспечивающая Time Travel и изоляцию транзакций.',
        level: 'Senior',
        tags: ['iceberg', 'lakehouse', 'hive', 'acid'],
      },
      {
        id: 'lake-q4',
        question: 'Как устроен словарь (Dictionary Encoding) в Parquet и сколько памяти он экономит?',
        answer: 'Если в колонке из 10 000 000 строк содержится строковый статус (например, \'PENDING\', \'SUCCESS\', \'FAILED\'), обычное хранение строк займет 10 000 000 * 7 байт ~ 70 МБ. Dictionary Encoding создает словарь уникальных значений: 0 -> \'PENDING\', 1 -> \'SUCCESS\', 2 -> \'FAILED\'. Сами строки таблицы заменяются битовыми идентификаторами (2 бита на значение вместо 7 байт). Размер данных сжимается с 70 МБ до 2.5 МБ еще до применения основного алгоритма сжатия (Snappy/ZSTD).',
        level: 'Junior',
        tags: ['parquet', 'compression', 'dictionary-encoding'],
      },
      {
        id: 'lake-q5',
        question: 'Что такое Partition Evolution в Apache Iceberg и почему она не требует перезаписи исторических данных?',
        answer: 'В классическом Hive, если мы партиционировали данные по дням (`order_date`), а через 2 года объем вырос и мы решили перейти на партиционирование по часам (`order_hour`), нам пришлось бы перезаписать ВСЕ терабайты исторических данных за прошлые годы в новые папки. В Iceberg партиционирование является частью плана метаданных каждого снимка. Старые файлы остаются привязаны к старой схеме партиционирования (Spec 0), а новые файлы записываются по новой схеме (Spec 1). Движок чтения умеет параллельно применять фильтры к обоим форматам без единой перезаписи старых файлов.',
        level: 'Senior',
        tags: ['iceberg', 'partition-evolution', 'lakehouse'],
      },
    ],
  },
  {
    id: 'hadoop',
    slug: 'hadoop',
    title: 'Apache Hadoop & HDFS',
    shortDescription: 'Архитектура HDFS (NameNode, DataNode, блоки 128 МБ), репликация, YARN Resource Manager и фазы MapReduce.',
    level: 6,
    levelTitle: 'Уровень 6: Big Data, Lakehouse & Streaming',
    engineType: 'cli',
    dependencies: ['linux-git'],
    totalLessons: 8,
    curriculumTopics: [
      'Архитектура распределенной файловой системы HDFS: NameNode, DataNodes, Secondary NameNode',
      'Отказоустойчивость NameNode High Availability: Active/Standby, Quorum Journal Manager (QJM) и ZKFC',
      'Физика хранения в HDFS: блоки данных (по умолчанию 128 МБ), фактор репликации (Replication Factor = 3) и Rack Awareness',
      'Менеджер распределенных ресурсов YARN: ResourceManager, NodeManager, ApplicationMaster и Containers',
      'Классическая парадигма MapReduce: фазы Map -> Spill to Disk -> Sort & Partition -> Shuffle -> Reduce',
      'Узкие места MapReduce: почему запись промежуточных результатов на локальный диск сделала Spark победителем',
    ],
    resumeBulletPoints: [
      'Администрирование распределенных кластеров HDFS и тюнинг ресурсов менеджера YARN',
      'Настройка отказоустойчивости NameNode HA с использованием ZooKeeper и JournalNodes',
      'Оптимизация сетевого трафика и топологии репликации с учетом Rack Awareness политики',
      'Устранение узких мест при выполнении распределенных вычислений на кластере',
    ],
    cheatSheetMarkdown: `### Apache Hadoop & HDFS: Шпаргалка инженера

#### 1. Политика размещения реплик HDFS (Rack Awareness, фактор 3)
1. **Первая реплика:** размещается на том же узле, где запущен процесс записи (или на случайном узле в той же стойке).
2. **Вторая реплика:** размещается на узле в **ДРУГОЙ (удаленной) стойке** (защита от выхода из строя сетевого свитча стойки).
3. **Третья реплика:** размещается на другом узле в той же второй стойке (для ускорения локального сетевого трафика).

#### 2. Полезные CLI-команды HDFS
\`\`\`bash
# Проверка здоровья файловой системы и поиск поврежденных (corrupt) блоков:
hdfs fsck / -summary

# Отчет по использованию дискового пространства узлами DataNode:
hdfs dfsadmin -report

# Изменение фактора репликации критической директории:
hdfs dfs -setrep -w 3 /data/prod/core_marts
\`\`\`

#### 3. Архитектура YARN
* **ResourceManager (RM):** глобальный арбитр ресурсов всего кластера (память и CPU-ядра).
* **NodeManager (NM):** агент на каждом сервере, отслеживающий контейнеры.
* **ApplicationMaster (AM):** экземпляр, выделяемый под конкретное приложение (Spark-сессию, Flink), договаривающийся с RM о ресурсах.`,
    interviewQuestions: [
      {
        id: 'hadoop-q1',
        question: 'Почему размер блока в HDFS по умолчанию составляет 128 МБ (а не 4 КБ, как в ОС)?',
        answer: 'Размер 128 МБ выбран для минимизации накладных расходов на поиск данных на диске (Seek Time) по отношению к скорости непрерывного чтения (Transfer Rate). При поиске блока на механическом диске головка тратит ~10 мс. Передача 128 МБ на скорости 100 МБ/с занимает ~1.3 секунды. Таким образом, время поиска составляет менее 1% от времени передачи данных. Кроме того, метаданные каждого блока NameNode хранит в оперативной памяти (150 байт на блок). Если бы блоки были по 4 КБ, терабайт данных породил бы миллиарды блоков и мгновенно уничтожил память NameNode.',
        level: 'Junior',
        tags: ['hadoop', 'hdfs', 'block-size', 'storage'],
      },
      {
        id: 'hadoop-q2',
        question: 'Какую роль выполняет Secondary NameNode в Hadoop и является ли он Standby-нодой?',
        answer: 'Secondary NameNode НЕ является резервным сервером для горячей замены (Failover). Его единственная функция — периодическое слияние текущего файла снимка памяти (fsimage) с накопившимся журналом изменений (edits log), так называемый Checkpoint процесс. Без него файл edits разросся бы до сотен гигабайт, и перезапуск основного NameNode занимал бы многие часы. Горячую замену обеспечивает архитектура NameNode High Availability на базе Quorum Journal Manager (QJM) и Standby NameNode.',
        level: 'Junior',
        tags: ['hadoop', 'hdfs', 'namenode', 'checkpoint'],
      },
      {
        id: 'hadoop-q3',
        question: 'Что происходит во время фазы Shuffle в MapReduce?',
        answer: 'Фаза Shuffle — самый ресурсоемкий этап. После завершения фазы Map воркер сортирует ключи в буфере памяти, сбрасывает их на локальный диск в виде партиций (по количеству Reducer-ов с помощью хэш-функции от ключа). Затем воркеры Reduce по протоколу HTTP скачивают по сети СВОИ порции ключей со ВСЕХ узлов кластера Map. Далее скачанные сегменты объединяются слиянием (External Merge Sort), чтобы все строки с одинаковым ключом гарантированно поступили на один Reduce-процесс.',
        level: 'Middle',
        tags: ['hadoop', 'mapreduce', 'shuffle'],
      },
      {
        id: 'hadoop-q4',
        question: 'Что такое Rack Awareness (осведомленность о стойках) и как она защищает кластер от аварий?',
        answer: 'Rack Awareness позволяет NameNode знать физическую топологию размещения серверов в стойках дата-центра. При записи данных первой реплика пишется на локальный узел, вторая — на узел в абсолютно другой серверной стойке, а третья — на другой сервер той же второй стойки. Если в первой стойке сгорит блок питания или выйдет из строя коммутатор (Top-of-Rack Switch), данные останутся доступны со второй стойки без потери информации.',
        level: 'Middle',
        tags: ['hadoop', 'hdfs', 'rack-awareness', 'fault-tolerance'],
      },
      {
        id: 'hadoop-q5',
        question: 'Почему Apache Spark практически полностью вытеснил MapReduce в индустрии?',
        answer: 'MapReduce проектировался для эпохи дефицита RAM: он принудительно материализует и сбрасывает на физический диск (I/O) результаты абсолютно каждого промежуточного шага Map. Многошаговый алгоритм (например, итеративное машинное обучение или 5 последовательных джойнов) 5 раз читает и пишет данные на диск. Spark сохраняет данные между операциями в распределенной оперативной памяти (RDD/DataFrame) и выполняет конвейеризацию (Pipelining) операций в виде ориентированного графа (DAG) без промежуточного дискового ввода-вывода, работая до 100 раз быстрее.',
        level: 'Junior',
        tags: ['hadoop', 'spark', 'mapreduce', 'evolution'],
      },
    ],
  },
  {
    id: 'spark',
    slug: 'spark',
    title: 'Apache Spark (PySpark)',
    shortDescription: 'Архитектура Driver/Executors, Catalyst Optimizer, Tungsten, Narrow vs Wide трансформации, Shuffle, Data Skew и Key Salting.',
    level: 6,
    levelTitle: 'Уровень 6: Big Data, Lakehouse & Streaming',
    engineType: 'python',
    dependencies: ['hadoop', 'pandas'],
    totalLessons: 12,
    curriculumTopics: [
      'Архитектура кластера: Driver Program, Cluster Manager, Executors, Tasks и Cores/Slots',
      'Отказоустойчивые распределенные датасеты: RDD, DataFrame и Dataset API',
      'Классификация трансформаций: Узкие (Narrow: map, filter) против Широких (Wide: groupBy, join, distinct)',
      'Анатомия плана выполнения: оптимизатор Catalyst (Analysis, Logical Plan, Physical Plan, Cost-Based Optimizer) и движок Tungsten (Off-heap память и Whole-Stage Code Generation)',
      'Физика Shuffle: Shuffle Read, Shuffle Write, spill на диск и влияние параметра spark.sql.shuffle.partitions',
      'Стратегии распределенных джойнов: Broadcast Hash Join (BHJ), Shuffle Hash Join (SHJ) и Sort Merge Join (SMJ)',
      'Проблема перекоса данных (Data Skew): симптомы (последняя таска 99%), лечение через Key Salting и AQE',
      'Управление памятью: Storage Memory vs Execution Memory, cache() против persist(StorageLevel)',
      'Adaptive Query Execution (AQE): динамическое объединение мелких партиций и переключение на Broadcast Join на лету',
    ],
    resumeBulletPoints: [
      'Разработка высоконагруженных распределенных ETL-пайплайнов на PySpark для обработки терабайтных массивов',
      'Оптимизация Spark-приложений: тюнинг параметров памяти, исключение Shuffle и выбор стратегии Broadcast Join',
      'Успешное устранение проблемы перекоса данных (Data Skew) на боевых кластерах с помощью паттерна Key Salting',
      'Включение и настройка Adaptive Query Execution (AQE) с сокращением времени расчета витрин на 40%',
    ],
    cheatSheetMarkdown: `### Apache Spark: Шпаргалка инженера

#### 1. Стратегии распределенных JOIN
* **Broadcast Hash Join (BHJ):** Маленькая таблица (< 10 МБ по умолчанию, настраивается \`spark.sql.autoBroadcastJoinThreshold\`) рассылается Driver-ом целиком на ВСЕ экзекьюторы. **Shuffle отсутствует!** Максимально быстрая стратегия.
* **Sort Merge Join (SMJ):** Обе таблицы огромные. Spark партиционирует обе таблицы по хэшу ключа джойна (тяжелый **Shuffle**), затем сортирует данные внутри каждой партиции и объединяет слиянием.

#### 2. Паттерн Key Salting против Data Skew
Когда 90% строк имеют один и тот же ключ (например, \`customer_id = 0\` для анонимных пользователей), один воркер захлебывается, а остальные простаивают:
\`\`\`python
import pyspark.sql.functions as F

# 1. Добавляем случайную «соль» (от 0 до 9) к ключу перекошенной таблицы
salted_df1 = df1.withColumn(
    "salted_key", 
    F.concat(F.col("customer_id"), F.lit("_"), F.floor(F.rand() * 10))
)

# 2. Во второй таблице размножаем строки для каждого возможного значения соли (0..9)
salt_df = spark.range(0, 10).withColumnRenamed("id", "salt")
exploded_df2 = df2.crossJoin(salt_df).withColumn(
    "salted_key",
    F.concat(F.col("customer_id"), F.lit("_"), F.col("salt"))
)

# 3. Джойним по равномерно распределенному соленому ключу без перекоса!
result = salted_df1.join(exploded_df2, on="salted_key")
\`\`\`

#### 3. repartition() vs coalesce()
* \`repartition(N)\`: Полноценный Shuffle данных по кластеру. Позволяет как увеличивать, так и уменьшать число партиций, гарантируя их равный размер.
* \`coalesce(N)\`: Только УМЕНЬШАЕТ число партиций БЕЗ Shuffle (просто объединяет соседние партиции на одном экзекьюторе). Идеально перед сохранением в S3.`,
    interviewQuestions: [
      {
        id: 'spark-q1',
        question: 'В чем разница между Narrow и Wide трансформациями в Spark?',
        answer: 'Narrow (узкая) трансформация (map, filter, union) выполняется каждым воркером независимо: каждая партиция родительского DataFrame используется строго одной партицией дочернего. Передачи данных по сети нет. Wide (широкая) трансформация (groupByKey, join, distinct, repartition) требует данных из множества партиций для вычисления результата. Она порождает границу стадии (Stage Boundary) и тяжелый Shuffle — обмен гигабайтами данных между всеми узлами кластера по сети с записью на диск.',
        level: 'Junior',
        tags: ['spark', 'transformations', 'shuffle', 'stages'],
      },
      {
        id: 'spark-q2',
        question: 'Что такое Data Skew в Spark, как его обнаружить в Spark UI и как устранить?',
        answer: 'Data Skew (перекос данных) возникает, когда данные распределены по ключам неравномерно (например, у одного селлера 100 млн заказов, а у остальных по 10). В Spark UI это видно по зависанию стадии на 99%: 199 задач завершились за 10 секунд, а одна последняя таска висит 40 минут или падает с OOM (Exit code 137). Способы решения: 1) Включение Adaptive Query Execution (AQE): `spark.sql.adaptive.skewJoin.enabled = true`. 2) Broadcast Join, если вторая таблица небольшая. 3) Key Salting — искусственное добавление случайного префикса к перекошенному ключу.',
        level: 'Middle',
        tags: ['spark', 'data-skew', 'spark-ui', 'salting'],
      },
      {
        id: 'spark-q3',
        question: 'В чем разница между `cache()` и `persist()` и когда кэширование вредит?',
        answer: 'Метод `cache()` — это просто шорткат для `persist(StorageLevel.MEMORY_AND_DISK)`. Метод `persist()` позволяет явно выбрать уровень хранения: только в RAM, сериализованно в RAM (MEMORY_ONLY_SER), только на диск (DISK_ONLY) или с репликацией на 2 узла (_2). Кэширование вредит, если датафрейм используется всего один раз (напрасная трата памяти и времени на сериализацию), либо если датафрейм огромен — он вытеснит из кэша Execution Memory, спровоцировав сброс данных сортировки на диск (Spill to Disk).',
        level: 'Junior',
        tags: ['spark', 'caching', 'memory'],
      },
      {
        id: 'spark-q4',
        question: 'Как работает Catalyst Optimizer и какие этапы проходит запрос в Spark SQL?',
        answer: '1) Unresolved Logical Plan: проверка синтаксиса SQL. 2) Resolved Logical Plan: обращение к Catalog/Metastore для проверки существования таблиц, колонок и типов. 3) Optimized Logical Plan: применение стандартных правил оптимизации — проталкивание предикатов (Predicate Pushdown), отсечение лишних колонок (Projection Pruning), сворачивание констант. 4) Physical Plan: генерация нескольких физических планов и выбор оптимального по стоимости (Cost Model, выбор между SortMergeJoin и BroadcastHashJoin). 5) Code Generation: движок Tungsten генерирует Java-байткод всего пайплайна (Whole-Stage Java CodeGen).',
        level: 'Senior',
        tags: ['spark', 'catalyst', 'optimizer', 'tungsten'],
      },
      {
        id: 'spark-q5',
        question: 'Что такое Spill (Memory / Disk) в метриках Spark UI и почему он возникает?',
        answer: 'Spill возникает, когда во время Shuffle, сортировки или агрегации объем промежуточных данных превышает размер выделенной Execution Memory экзекьютора. Spark вынужден выгружать избыток строк из оперативной памяти на локальный жесткий диск экзекьютора. В Spark UI отображаются два числа: Spill (Memory) — размер данных в десериализованном виде в памяти, и Spill (Disk) — сжатый объем, записанный на диск. Появление Spill многократно замедляет работу из-за дискового ввода-вывода; устраняется увеличением памяти на экзекьютор или увеличением `spark.sql.shuffle.partitions`.',
        level: 'Middle',
        tags: ['spark', 'spill', 'memory', 'spark-ui'],
      },
    ],
  },
  {
    id: 'clickhouse',
    slug: 'clickhouse',
    title: 'ClickHouse & MPP Greenplum',
    shortDescription: 'Shared-Nothing архитектура, разреженный индекс, гранулы, движки семейства MergeTree (Replacing, Aggregating) и мутации.',
    level: 6,
    levelTitle: 'Уровень 6: Big Data, Lakehouse & Streaming',
    engineType: 'sql',
    dependencies: ['postgresql', 'dwh'],
    totalLessons: 10,
    curriculumTopics: [
      'Массивно-параллельная архитектура (MPP): Shared-Nothing против Shared-Disk (Greenplum / ClickHouse)',
      'Дистрибуция данных в Greenplum: сегменты, мастер, DISTRIBUTED BY (Hash, Replicated, Randomly)',
      'Колоночный движок ClickHouse: почему он читает данные со скоростью терабайт в секунду',
      'Разреженный первичный индекс (Sparse Primary Index), индексные засечки и гранулы по 8192 строки',
      'Семейство движков MergeTree: партиционирование (PARTITION BY), сортировка (ORDER BY) и фоновый процесс фонового слияния кусков (Part Merges)',
      'Специализированные движки: ReplacingMergeTree (дедупликация и модификатор FINAL), SummingMergeTree и AggregatingMergeTree (State & Merge комбинаторы)',
      'Материализованные представления (Materialized Views) как непрерывные стриминговые триггеры на вставку',
      'Мутации (ALTER UPDATE / ALTER DELETE) в ClickHouse: почему классический UPDATE здесь асинхронен и тяжел',
    ],
    resumeBulletPoints: [
      'Проектирование высокопроизводительных аналитических витрин в ClickHouse со временем отклика < 100 ms',
      'Разработка схем на базе движков MergeTree, ReplacingMergeTree и AggregatingMergeTree',
      'Построение архитектуры предварительной агрегации данных через ClickHouse Materialized Views',
      'Оптимизация структуры первичных индексов (ORDER BY) с минимизацией сканируемых гранул данных',
    ],
    cheatSheetMarkdown: `### ClickHouse: Шпаргалка инженера

#### 1. Анатомия MergeTree таблицы
\`\`\`sql
CREATE TABLE events (
    event_date Date,
    tenant_id UInt32,
    user_id UInt64,
    event_type LowCardinality(String),
    cost Decimal64(4)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)  -- Физическая нарезка на директории на диске
ORDER BY (tenant_id, event_date, user_id)  -- ОПРЕДЕЛЯЕТ РАЗРЕЖЕННЫЙ ПЕРВИЧНЫЙ ИНДЕКС!
SETTINGS index_granularity = 8192;
\`\`\`

#### 2. Разреженный индекс (Sparse Index)
* ClickHouse НЕ индексирует каждую строку! Индекс сохраняет 1 запись на каждые **8192 строки (гранула)**.
* Благодаря этому первичный индекс на миллиард строк весит всего пару мегабайт и целиком живет в RAM.
* Фильтр \`WHERE tenant_id = 5\` моментально отсекает 99% гранул, считывая с диска только целевые блоки.

#### 3. Асинхронные мутации (ALTER UPDATE / DELETE)
\`\`\`sql
-- ❌ В ClickHouse НЕТ классического легковесного UPDATE!
-- Следующая команда — тяжелая фоновая МУТАЦИЯ, переписывающая куски данных целиком на диске:
ALTER TABLE events UPDATE cost = 0 WHERE tenant_id = 99;

-- Проверка прогресса выполнения мутации:
SELECT command, is_done, parts_to_do_names FROM system.mutations WHERE is_done = 0;
\`\`\``,
    interviewQuestions: [
      {
        id: 'ch-q1',
        question: 'Как устроен разреженный первичный индекс (Sparse Index) в ClickHouse и почему он помещается в RAM?',
        answer: 'В отличие от традиционных СУБД (PostgreSQL B-Tree), которые хранят указатель на каждую отдельную строку, ClickHouse создает индексную засечку (Index Mark) только для первой строки каждой гранулы (по умолчанию 1 раз на 8192 физические строки). Для таблицы в 100 000 000 строк первичный индекс будет содержать всего ~12 200 записей. Такой компактный индекс весит несколько сотен килобайт и постоянно резидентно находится в оперативной памяти сервера, позволяя совершать бинарный поиск по гранулам без предварительного обращения к диску.',
        level: 'Junior',
        tags: ['clickhouse', 'sparse-index', 'granularity'],
      },
      {
        id: 'ch-q2',
        question: 'В чем разница между PARTITION BY и ORDER BY при создании таблицы MergeTree?',
        answer: 'PARTITION BY отвечает за грубое физическое разделение данных на изолированные каталоги на диске (обычно по месяцам: `toYYYYMM(date)`). Данные из разных партиций никогда не объединяются в один файл. ORDER BY определяет физический порядок сортировки строк внутри каждого куска (Part) и формирует первичный индекс таблицы. Правило DE: нельзя делать PARTITION BY со слишком высокой кардинальностью (например, по секундам или id пользователя) — это создаст миллионы мелких директорий (Too many parts error) и уронит сервер.',
        level: 'Middle',
        tags: ['clickhouse', 'mergetree', 'partitioning', 'order-by'],
      },
      {
        id: 'ch-q3',
        question: 'Как работает ReplacingMergeTree и гарантирует ли он немедленное удаление дубликатов?',
        answer: 'ReplacingMergeTree выполняет дедупликацию строк с одинаковым первичным ключом (ORDER BY). Однако дедупликация происходит ТОЛЬКО в момент фонового слияния кусков (Part Merges), точное время которого недетерминировано. Поэтому сразу после INSERT дубликаты физически присутствуют в таблице. Чтобы гарантированно получить дедуплицированные данные в запросе, необходимо явно добавлять модификатор `FINAL` (`SELECT * FROM table FINAL`), либо использовать группировку `argMax()` по версии записи.',
        level: 'Middle',
        tags: ['clickhouse', 'replacingmergetree', 'deduplication', 'final'],
      },
      {
        id: 'ch-q4',
        question: 'Чем материализованное представление (Materialized View) в ClickHouse отличается от Postgres/Oracle?',
        answer: 'В классических СУБД Materialized View — это статический снимок запроса, который пересчитывается вручную командой `REFRESH MATERIALIZED VIEW`. В ClickHouse Materialized View — это по сути триггер на вставку (Insert Trigger). Когда данные вставляются в базовую таблицу, они на лету трансформируются запросом представления и сразу же записываются в целевую таблицу представления. Старые данные, которые уже были в таблице до создания MV, в него автоматически не попадают.',
        level: 'Senior',
        tags: ['clickhouse', 'materialized-views', 'architecture'],
      },
      {
        id: 'ch-q5',
        question: 'Что означает ошибка «Too many parts in all data parts in table» в ClickHouse и как ее предотвратить?',
        answer: 'Ошибка означает, что число несмерженных кусков (Parts) в одной партиции превысило лимит (по умолчанию 300). Причина — вставка данных слишком частыми и мелкими пачками (например, 1000 INSERT в секунду по 1 строке). ClickHouse физически не успевает фоново объединять (сливать) эти куски на диске. Профилактика: 1) Пакетирование на стороне клиента — вставлять батчами от 10 000 до 100 000 строк не чаще 1 раза в секунду. 2) Использование буферного движка Buffer. 3) Включение асинхронных вставок (`async_insert=1`).',
        level: 'Middle',
        tags: ['clickhouse', 'parts', 'batching', 'troubleshooting'],
      },
    ],
  },
  {
    id: 'kafka',
    slug: 'kafka',
    title: 'Apache Kafka & CDC Debezium',
    shortDescription: 'Партиции, сегменты лога, Zero-Copy, Consumer Groups, гарантии доставки (acks=all), Exactly-Once и чтение WAL через Debezium.',
    level: 6,
    levelTitle: 'Уровень 6: Big Data, Lakehouse & Streaming',
    engineType: 'cli',
    dependencies: ['docker', 'postgresql'],
    totalLessons: 10,
    curriculumTopics: [
      'Архитектура распределенного лога Apache Kafka: Брокеры, Топики, Партиции и сегменты (.log и .index)',
      'Секрет производительности Kafka: последовательная запись на диск (Sequential I/O), Page Cache ОС и Zero-Copy (sendfile)',
      'Концепция Consumer Groups: масштабирование чтения, партиционирование и протокол ребалансировки (Rebalance)',
      'Ключи сообщений и семантика партиционирования (MurmurHash2)',
      'Гарантии доставки сообщений: At-Most-Once, At-Least-Once и Exactly-Once Semantics (EOS)',
      'Настройка продюсера для предотвращения потерь: acks=all, min.insync.replicas=2, enable.idempotence=true',
      'Паттерн Transactional Outbox для надежной отправки событий из реляционной СУБД без распределенных транзакций',
      'Change Data Capture (CDC) на базе Debezium: потоковое чтение журналов WAL PostgreSQL и публикация изменений в Kafka',
    ],
    resumeBulletPoints: [
      'Проектирование потоковых архитектур реального времени на базе Apache Kafka и Kafka Connect',
      'Настройка отказоустойчивых топиков с гарантией доставки без потерь (acks=all, min.insync.replicas)',
      'Внедрение Change Data Capture (CDC) пайплайнов на основе Debezium для синхронизации Postgres с DWH',
      'Реализация паттерна Transactional Outbox для устранения проблемы двойной записи (Dual Writes)',
    ],
    cheatSheetMarkdown: `### Apache Kafka: Шпаргалка инженера

#### 1. Золотой стандарт надежности продюсера (No Data Loss)
\`\`\`properties
# Гарантирует запись на кворум реплик:
acks=all
# Включает дедупликацию и нумерацию сообщений брокером:
enable.idempotence=true
# Максимальное число ретраев при сбоях сети:
retries=2147483647
max.in.flight.requests.per.connection=5
\`\`\`

На стороне брокера (в конфигурации топика):
\`\`\`properties
# Минимальное число подтвердивших реплик (при факторе репликации 3):
min.insync.replicas=2
\`\`\`

#### 2. Физика Zero-Copy передачи данных
Традиционный подход: Диск -> Буфер ядра ОС -> Буфер приложения (JVM) -> Сокет ядра -> Сетевая карта (4 копирования, 4 переключения контекста).
**Kafka Zero-Copy (\`sendfile\`):** Диск -> Буфер ядра ОС (Page Cache) -> Напрямую в сетевую карту (DMA Controller). Процессор и JVM вообще не трогают байты сообщения!

#### 3. Паттерн Transactional Outbox
1. Бизнес-сервис в **ЕДИНОЙ локальной транзакции** PostgreSQL обновляет таблицу сущности (\`orders\`) и вставляет событие в таблицу \`outbox\`.
2. Коннектор **Debezium** читает PostgreSQL WAL и транслирует записи из таблицы \`outbox\` в топик Kafka.
3. Исключается рассинхронизация (когда в базу записали, а Kafka в этот момент упала).`,
    interviewQuestions: [
      {
        id: 'kafka-q1',
        question: 'За счет чего Apache Kafka обеспечивает пропускную способность в миллионы сообщений в секунду?',
        answer: '1) Последовательная запись (Sequential I/O): сообщения дописываются только в конец неизменяемого файла сегмента (Append-Only Log), что по скорости сопоставимо с оперативной памятью. 2) Использование Page Cache операционной системы вместо управления памятью в куче JVM (исключает паузы GC). 3) Системный вызов Zero-Copy (`sendfile`): данные передаются из дискового кэша ядра напрямую в сетевой сокет минуя пространство пользователя. 4) Пакетная передача (Batching) и компрессия (Snappy/LZ4) на стороне клиента.',
        level: 'Middle',
        tags: ['kafka', 'performance', 'zero-copy', 'page-cache'],
      },
      {
        id: 'kafka-q2',
        question: 'Что произойдет, если в Consumer Group количество консьюмеров превысит количество партиций топика?',
        answer: 'Партиция в Kafka — неделимая единица параллелизма. Одну партицию внутри одной Consumer Group может читать строго один консьюмер. Если в топике 4 партиции, а в группе запущено 6 консьюмеров, то 4 консьюмера получат по одной партиции, а 2 консьюмера будут полностью простаивать в режиме горячего резерва (Idle).',
        level: 'Junior',
        tags: ['kafka', 'consumer-groups', 'partitions'],
      },
      {
        id: 'kafka-q3',
        question: 'В чем разница между `acks=1` и `acks=all` и к какому сбою приводит `acks=1`?',
        answer: 'При `acks=1` продюсер считает отправку успешной, как только сообщение записано на диск Leader-брокера, не дожидаясь репликации на Follower-брокеры. Если сразу после подтверждения Leader-брокер физически сгорит (до того, как фолловеры скопировали данные), новый выбранный Leader не будет иметь этого сообщения — данные будут безвозвратно потеряны. При `acks=all` (в связке с `min.insync.replicas=2`) Leader подтвердит запись только после того, как кворум реплик сохранит сообщение в свой лог.',
        level: 'Middle',
        tags: ['kafka', 'acks', 'reliability', 'replication'],
      },
      {
        id: 'kafka-q4',
        question: 'Какую проблему решает паттерн Transactional Outbox и почему опасна «двойная запись» (Dual Write)?',
        answer: 'Dual Write — это попытка приложения в одном методе сделать `db.save(order)` и следом `kafka.send(order)`. Если база упадет — событие не отправится (нормально). Но если база закоммитила заказ, а сеть до Kafka упала или процесс убили по OOM, заказ в базе есть, а в Kafka события нет (рассинхрон). Transactional Outbox решает проблему: событие пишется в специальную таблицу outbox в ТОЙ ЖЕ транзакции, что и заказ. А внешний процесс (Debezium через чтение WAL) гарантированно доставляет событие в Kafka.',
        level: 'Senior',
        tags: ['kafka', 'transactional-outbox', 'cdc', 'debezium'],
      },
      {
        id: 'kafka-q5',
        question: 'Как Debezium считывает данные из PostgreSQL без нагрузки на базу данных?',
        answer: 'Debezium НЕ выполняет регулярные запросы `SELECT * FROM table WHERE updated_at > ...` (polling), которые нагружают СУБД и пропускают промежуточные состояния записей (удаления). Debezium подключается к PostgreSQL как клиент логической репликации (Logical Replication Slot) и асинхронно читает сырой журнал упреждающей записи WAL (Write-Ahead Log) через плагин декодирования (pgoutput). Это фиксирует абсолютно все транзакции (INSERT, UPDATE, DELETE с предыдущим и новым состоянием строки) практически с нулевой задержкой и нулевым влиянием на производительность СУБД.',
        level: 'Senior',
        tags: ['kafka', 'debezium', 'cdc', 'wal'],
      },
    ],
  },
];
