import { Lesson } from '@/types/course';

export const formatsS3Lesson2: Lesson = {
  "id": "formats-s3-2",
  "moduleSlug": "formats-s3",
  "order": 2,
  "title": "Анатомия Apache Parquet: Footer, Row Groups, Column Chunks, Pages и кодировки",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "File Footer (Подвал Parquet)",
      "definition": "Секция в самом конце Parquet-файла, содержащая метаданные схемы, число строк, смещения байтов и Min/Max статистики по каждой колонке каждой группы строк."
    },
    {
      "term": "Row Group (Группа строк)",
      "definition": "Логический горизонтальный срез таблицы размером обычно 128–512 МБ, внутри которого данные разбиты по колоночным блокам (Column Chunks)."
    },
    {
      "term": "Dictionary Encoding & RLE",
      "definition": "Методы кодирования страниц: Dictionary Encoding заменяет повторяющиеся значения на компактные числовые ключи, а Run-Length Encoding сжимает серии повторяющихся значений."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "parquet_file_metadata",
      "description": "Снимок метаданных файла Parquet из File Footer",
      "columns": [
        {
          "name": "row_group_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "column_name",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "min_value",
          "type": "VARCHAR(32)"
        },
        {
          "name": "max_value",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "row_group_id": 0,
          "column_name": "event_date",
          "min_value": "2026-11-01",
          "max_value": "2026-11-01"
        },
        {
          "row_group_id": 1,
          "column_name": "event_date",
          "min_value": "2026-11-02",
          "max_value": "2026-11-02"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия Apache Parquet под капотом: Почему читатель начинает с конца файла\n\nФайл Parquet — это шедевр оптимизации систем хранения данных. Он разработан так, чтобы аналитический движок (Spark, DuckDB, ClickHouse, Trino) мог прочитать **абсолютный минимум байт**, отбросив 95% ненужных данных еще до их распаковки.\n\n#### Внутренняя иерархия Parquet-файла:\n1. **Magic Bytes `PAR1`:** 4 байта в начале и в конце файла для идентификации формата.\n2. **Row Groups (Группы строк):** файл делится на крупные блоки строк (обычно по 128–512 МБ). Например, 1 миллион строк на Row Group.\n3. **Column Chunks (Куски колонок):** внутри Row Group данные каждой колонки лежат непрерывным куском байтов.\n4. **Data Pages (Страницы данных):** блоки по ~1 МБ. Это минимальная единица сжатия и кодирования (Snappy, ZSTD).\n5. **File Footer (в самом конце файла!):**\n   - Хранит схему колонок и типов данных.\n   - Хранит точные смещения байтов (byte offsets) каждого Column Chunk.\n   - **Min/Max статистики по каждому столбцу каждой Row Group!**\n\n#### Как работает Predicate Pushdown (Min/Max Pruning):\nЕсли вы выполняете `WHERE order_date = '2026-11-02'`:\n* Движок запрашивает через HTTP Range Request только **последние 64 КБ файла** (Footer).\n* Проверяет статистики Row Group 0: `[min: '2026-11-01', max: '2026-11-01']` -> дата не попадает!\n* Движок **вообще не скачивает** Row Group 0 из S3, экономя 99% времени и сетевого трафика!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Оглавление в конце книги",
      "content": "Представьте энциклопедию, где подробный предметный указатель с номерами страниц и диапазонами дат напечатан на последней обложке. Чтобы найти факты за 1945 год, вам не нужно листать все 1000 страниц: вы открываете заднюю обложку (Footer), находите точный номер главы (Row Group) и открываете сразу нужную страницу."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение чтения без метаданных и со статистиками Parquet Footer",
        "beforeDescription": "Полное сканирование (Full Scan без футера)",
        "beforeColumns": [
          "scan_strategy",
          "s3_range_requests",
          "query_throughput"
        ],
        "beforeRows": [
          [
            "Download entire 1 GB file",
            "Single full HTTP GET",
            "Network bandwidth saturated"
          ],
          [
            "Decompress all columns in RAM",
            "High CPU cycles on decompress",
            "Slow analytical queries"
          ],
          [
            "Filter rows in application",
            "Evaluates WHERE on 10M rows",
            "High memory usage"
          ]
        ],
        "afterDescription": "Чтение по Parquet Footer (Predicate Pushdown)",
        "afterColumns": [
          "scan_strategy",
          "s3_range_requests",
          "query_throughput"
        ],
        "afterRows": [
          [
            "Read 64 KB footer metadata",
            "Targeted byte-range HTTP GET",
            "Sub-second metadata lookup"
          ],
          [
            "Skip 90% Row Groups on Min/Max",
            "Zero bytes transferred for skipped",
            "Near-instant response time"
          ],
          [
            "Read only filtered Column Chunks",
            "Direct vectorized CPU processing",
            "Minimal memory consumption"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Слишком маленькие Row Groups (1-5 МБ)",
      "content": "Разработчик задал `parquet.block.size = 2 * 1024 * 1024` (2 МБ). Размер Footer раздулся, словарное сжатие перестало работать (слишком мало повторяющихся значений в микрогруппе), а накладные расходы на чтение тысяч метаданных замедлили Spark в 8 раз. Оптимальный размер Row Group для DWH — от 128 МБ до 512 МБ!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем метаданные Parquet хранятся в конце файла (Footer), а не в начале (Header)?",
      "content": "**Ответ:** При потоковой записи данных (Single-pass streaming write) вы не знаете заранее, сколько строк будет записано и каковы будут финальные min/max статистики и смещения байтов. Хранение метаданных в конце позволяет писать данные на лету и зафиксировать финальный Footer перед закрытием файла без перезаписи начала файла."
    }
  ],
  "taskDescription": "Смоделируйте структуру метаданных колоночного сжатия Parquet:\n1. Создайте таблицу 'parquet_row_groups' (row_group_id INT, column_name VARCHAR(32), min_val VARCHAR(32), max_val VARCHAR(32), row_count INT, PRIMARY KEY (row_group_id, column_name)).\n2. Вставьте метаданные для двух групп строк колонки 'created_date':\n   - Группа 0: min_val = '2026-11-01', max_val = '2026-11-01', row_count = 500000\n   - Группа 1: min_val = '2026-11-02', max_val = '2026-11-02', row_count = 500000\n3. Напишите запрос симуляции Predicate Pushdown: выберите 'row_group_id', который необходимо прочитать для фильтра `WHERE created_date = '2026-11-02'`.\n\nВведите SQL-скрипт создания, вставки и выборки целевой группы строк.",
  "seedCode": "-- Смоделируйте Predicate Pushdown по метаданным Parquet\n",
  "initialCode": "CREATE TABLE parquet_row_groups (\n    row_group_id INT,\n    column_name VARCHAR(32),\n    min_val VARCHAR(32),\n    max_val VARCHAR(32),\n    row_count INT,\n    PRIMARY KEY (row_group_id, column_name)\n);\n\nINSERT INTO parquet_row_groups VALUES\n(0, 'created_date', '2026-11-01', '2026-11-01', 500000),\n(1, 'created_date', '2026-11-02', '2026-11-02', 500000);\n\nSELECT row_group_id\nFROM parquet_row_groups\nWHERE column_name = 'created_date'\n  AND '2026-11-02' BETWEEN min_val AND max_val;",
  "solutionCode": "CREATE TABLE parquet_row_groups (\n    row_group_id INT,\n    column_name VARCHAR(32),\n    min_val VARCHAR(32),\n    max_val VARCHAR(32),\n    row_count INT,\n    PRIMARY KEY (row_group_id, column_name)\n);\n\nINSERT INTO parquet_row_groups VALUES\n(0, 'created_date', '2026-11-01', '2026-11-01', 500000),\n(1, 'created_date', '2026-11-02', '2026-11-02', 500000);\n\nSELECT row_group_id\nFROM parquet_row_groups\nWHERE column_name = 'created_date'\n  AND '2026-11-02' BETWEEN min_val AND max_val;",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "CREATE TABLE parquet_row_groups",
      "row_group_id",
      "min_val",
      "max_val",
      "BETWEEN min_val AND max_val"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1002: Деградация сжатия из-за микроскопических Row Groups",
    "incidentDescription": "ETL пайплайн записывал Parquet с размером row_group_size = 500 КБ, что привело к 10-кратному раздуванию метаданных и падению Trino.",
    "buggyCode": "spark.conf.set('parquet.block.size', 512 * 1024)",
    "fixHint": "Увеличьте размер Row Group до стандартных 128–512 МБ.",
    "solutionCode": "spark.conf.set('parquet.block.size', 128 * 1024 * 1024)",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицу `parquet_row_groups` с составным первичным ключом.",
    "Вставьте строки со статистиками min_val и max_val.",
    "Выполните выборку с условием `'2026-11-02' BETWEEN min_val AND max_val`."
  ]
};
