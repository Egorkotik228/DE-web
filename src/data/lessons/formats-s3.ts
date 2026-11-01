import { Lesson } from '@/types/course';

export const formatsS3Lessons: Lesson[] = [
  {
    id: 'parquet-iceberg-lakehouse',
    moduleSlug: 'formats-s3',
    order: 1,
    title: 'Форматы данных и Lakehouse: Анатомия Parquet, S3 и Apache Iceberg',
    estimatedMinutes: 40,
    theoryBlocks: [
      {
        type: 'markdown',
        content: `### Форматы хранения Big Data: Почему CSV и JSON непригодны для аналитики?

В распределенных системах хранения (S3, MinIO, HDFS) файлы формата CSV и JSON создают катастрофические накладные расходы:
1. **Строчное чтение (Row-oriented):** чтобы посчитать сумму по одной колонке (\`SELECT SUM(price)\`), аналитическому движку приходится вычитывать с диска и передавать по сети 100% байт всех строк таблицы!
2. **Отсутствие схемы и типов данных:** числа и даты хранятся в виде текста, требуя парсинга строк при каждом запросе.
3. **Неэффективное сжатие:** смешанные типы данных в строках сжимаются с коэффициентом всего 1.5–2x.

#### Внутреннее устройство Apache Parquet (Columnar Storage)
Parquet организует данные на диске в колоночном формате:
- **File Footer (Подвал файла):** хранит точную схему таблицы, количество записей и метаданные групп строк. Читатель сначала считывает последние байты файла!
- **Row Groups (Группы строк):** логическое разбиение на куски (по умолчанию **128–512 МБ**).
- **Column Chunks (Куски колонок):** данные одного столбца в рамках Row Group лежат на диске строго последовательно.
- **Data Pages (Страницы данных):** блоки по 1 МБ с алгоритмами сжатия:
  - **Dictionary Encoding (Словарное сжатие):** повторяющиеся строки (например, названия городов) заменяются на короткие 1-байтовые ID.
  - **RLE (Run-Length Encoding) & Bit-Packing:** длинные цепочки нулей или одинаковых чисел упаковываются в считанные биты.
  - **Snappy / Zstandard (ZSTD):** мощное финальное сжатие (коэффициент до 8–10x).

#### Архитектура современного Lakehouse: Apache Iceberg
Объектное хранилище S3 не поддерживает транзакции (ACID) и атомарную замену файлов. **Apache Iceberg** решает эту проблему на уровне метаданных:
- **Iceberg Catalog:** хранит указатель на текущий активный метафайл.
- **Metadata File (\`.metadata.json\`):** список всех снимков состояния (Snapshots).
- **Manifest List (\`.avro\`):** список файлов манифестов, вошедших в снимок.
- **Manifest Files (\`.avro\`):** списки конкретных файлов Parquet с диапазонами минимумов и максимумов (Min/Max Stats).
- **Predicate Pushdown & Min/Max Pruning:** движок (Trino/Spark) читает только метаданные манифеста и отсекает 95% Parquet-файлов еще до их скачивания из S3!`,
      },
      {
        type: 'callout',
        variant: 'analogy',
        title: '💡 На пальцах: Библиотечный каталог',
        content:
          'CSV похож на чтение всех книг в библиотеке подряд от корки до корки, чтобы найти дату рождения Пушкина. Parquet похож на алфавитный предметный указатель в конце книги (Footer), который сразу открывает нужную страницу и нужный абзац.',
      },
      {
        type: 'callout',
        variant: 'prod-danger',
        title: '⚠️ Грабли в проде: Проблема миллиона мелких файлов (Small Files Problem)',
        content:
          'Если потоковый джоб пишет в S3 микро-батчами каждые 10 секунд, за месяц образуются миллионы файлов по 50 КБ. Запросы Spark начнут падать из-за огромного сетевого overhead на HTTP GET запросы к S3. Решение: периодическая фоновая компактизация (Compaction) файлов в блоки по 256–512 МБ.',
      },
    ],
    glossaryTerms: [
      { term: 'Predicate Pushdown', definition: 'Оптимизация, при которой фильтры WHERE проталкиваются на уровень чтения файлов хранения (отсечение страниц Parquet по min/max).' },
      { term: 'Row Group', definition: 'Логический блок строк в файле Parquet (обычно 128-512 МБ), внутри которого данные сгруппированы по колонкам.' },
      { term: 'Time Travel', definition: 'Возможность делать запросы к историческому снимку таблицы Iceberg на определенный момент времени в прошлом (AS OF TIMESTAMP).' },
    ],
    schemaPreview: [
      {
        tableName: 'iceberg_transactions',
        columns: [
          { name: 'tx_id', type: 'UUID', keyType: 'PK' },
          { name: 'amount', type: 'DECIMAL(18,2)' },
          { name: 'currency', type: 'VARCHAR(3)' },
          { name: 'tx_date', type: 'DATE' },
        ],
        sampleRows: [
          { tx_id: 'c810-f120', amount: 45000.0, currency: 'RUB', tx_date: '2026-11-01' },
          { tx_id: 'a902-b341', amount: 120.5, currency: 'USD', tx_date: '2026-11-01' },
        ],
      },
    ],
    taskDescription:
      'В тренажере SchemaBuilderEngine спроектируйте структуру таблицы Lakehouse: добавьте поля `tx_id` (PK), `amount` (Attribute), `tx_date` (Metadata) и проверьте настройки формата Parquet с партиционированием по `tx_date`. Нажмите «Проверить архитектуру».',
    seedCode: '',
    initialCode: '-- Спроектируйте метаданные таблицы Apache Iceberg на S3:\nCREATE TABLE iceberg_transactions (\n    tx_id STRING,\n    amount DECIMAL(18,2),\n    tx_date DATE\n)\nUSING iceberg\nPARTITIONED BY (days(tx_date));',
    solutionCode: 'CREATE TABLE iceberg_transactions (tx_id STRING, amount DECIMAL(18,2), tx_date DATE) USING iceberg PARTITIONED BY (days(tx_date));',
    testConfig: {
      checkOrder: false,
      floatPrecision: 2,
      requiredAstPatterns: ['iceberg', 'PARTITIONED BY'],
    },
    brokenProdTask: {
      title: 'Авария: Зависание Spark из-за отсутствия партиционирования',
      incidentDescription:
        'P1 Incident: Запрос сканирует 80 ТБ данных вместо 50 ГБ из-за отсутствия партиционирования по дате.',
      buggyCode: 'SELECT SUM(amount) FROM iceberg_transactions WHERE tx_date = "2026-11-01"',
      fixHint: 'Добавьте партиционирование PARTITIONED BY (days(tx_date)) для работы min/max pruning.',
      solutionCode: 'ALTER TABLE iceberg_transactions ADD PARTITION FIELD days(tx_date)',
      testConfig: { checkOrder: false, floatPrecision: 2 },
    },
    hints: [
      'Используйте партиционирование по дате tx_date.',
      'Убедитесь в выборе формата Iceberg + Parquet.',
      'Нажмите «Проверить архитектуру».',
    ],
  },
];
