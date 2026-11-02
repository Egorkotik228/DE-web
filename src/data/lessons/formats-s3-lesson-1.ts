import { Lesson } from '@/types/course';

export const formatsS3Lesson1: Lesson = {
  "id": "formats-s3-1",
  "moduleSlug": "formats-s3",
  "order": 1,
  "title": "Эволюция форматов данных: CSV, JSON, Avro, ORC и Parquet (Row vs Columnar)",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Columnar Storage (Колоночное хранение)",
      "definition": "Архитектура хранения на диске, при которой значения одного столбца физически записываются последовательно друг за другом, минимизируя дисковый ввод-вывод при аналитических агрегациях."
    },
    {
      "term": "Row-based Storage (Строчное хранение)",
      "definition": "Формат хранения (CSV, JSON, Avro, реляционные OLTP-таблицы), при котором все атрибуты одной строки располагаются рядом, идеальный для частой точечной записи единичных строк."
    },
    {
      "term": "Apache Avro",
      "definition": "Бинарный строчный формат хранения с обязательной схемой JSON, стандарт де-факто для потоковой передачи сообщений в Apache Kafka."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "format_benchmarks_catalog",
      "description": "Сравнение производительности и размера хранения 100 млн записей",
      "columns": [
        {
          "name": "format_type",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "storage_size_gb",
          "type": "VARCHAR(16)"
        },
        {
          "name": "scan_time_sec",
          "type": "VARCHAR(16)"
        },
        {
          "name": "best_use_case",
          "type": "VARCHAR(64)"
        }
      ],
      "sampleRows": [
        {
          "format_type": "CSV (uncompressed)",
          "storage_size_gb": "42 GB",
          "scan_time_sec": "180s",
          "best_use_case": "Small export/import only"
        },
        {
          "format_type": "Apache Avro (Snappy)",
          "storage_size_gb": "14 GB",
          "scan_time_sec": "45s",
          "best_use_case": "Kafka streaming events"
        },
        {
          "format_type": "Apache Parquet (ZSTD)",
          "storage_size_gb": "3.8 GB",
          "scan_time_sec": "1.2s",
          "best_use_case": "Analytical DWH / Lakehouse"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Эволюция форматов данных: Почему CSV и JSON непригодны для Big Data\n\nВ начале эры Hadoop данные хранили в текстовых форматах — CSV, TSV и текстовом JSON. Но по мере роста объемов до десятков терабайт компании столкнулись с кризисом инфраструктуры:\n\n1. **Катастрофа дискового I/O:** Чтобы выполнить простой `SELECT SUM(amount) FROM sales`, аналитическому движку (Trino, Spark, Hive) приходится читать с диска и передавать по сети **100% байт всех строк таблицы** (включая текстовые комментарии, адреса и ФИО), просто чтобы проигнорировать их в памяти!\n2. **Затраты на парсинг:** Числа `\"12500.50\"` хранятся как строки ASCII, требуя миллионов тактов CPU на парсинг строк в бинарный `float/double`.\n3. **Слабое сжатие:** Чередование разных типов данных в строке разрушает компрессию (сжатие всего 1.5–2x).\n\n#### Разделение мира форматов:\n* **Row-based (Строчные: CSV, JSON, Avro):** Все колонки одной записи лежат рядом `[id1, name1, price1], [id2, name2, price2]`. **Идеально для OLTP и стриминга (Kafka)**, где нужно быстро записать или прочитать отдельную строку целиком.\n* **Column-based (Колоночные: Parquet, ORC):** Данные группируются по столбцам `[id1, id2, ...], [price1, price2, ...]`. **Идеально для OLAP и Lakehouse**, где читаются только нужные 3 колонки из 50."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Стопка телефонных справочников",
      "content": "Строчный формат — это классический телефонный справочник: каждая строка содержит ФИО, адрес и номер телефона. Если вам нужно узнать средний возраст жителей города, вам придется перелистывать каждую страницу от корки до корки. Колоночный формат — это 3 отдельных блокнота: в одном только имена, во втором только телефоны, в третьем только возраст. Чтобы посчитать средний возраст, вы берете тонкую тетрадь с возрастами, вообще не трогая остальные две."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение строчного (CSV/JSON) и колоночного (Parquet) хранения",
        "beforeDescription": "Строчное хранение (CSV / JSON в S3)",
        "beforeColumns": [
          "query_pattern",
          "network_io_bytes",
          "cpu_deserialization"
        ],
        "beforeRows": [
          [
            "SELECT SUM(price)",
            "Reads 100% of entire file",
            "Heavy string-to-number parsing"
          ],
          [
            "Schema evolution",
            "Fragile text delimiter bugs",
            "Silent column shift failures"
          ],
          [
            "Storage footprint",
            "Uncompressed text bloating",
            "High cloud S3 storage bills"
          ]
        ],
        "afterDescription": "Колоночное хранение (Apache Parquet)",
        "afterColumns": [
          "query_pattern",
          "network_io_bytes",
          "cpu_deserialization"
        ],
        "afterRows": [
          [
            "SELECT SUM(price)",
            "Reads ONLY price column bytes",
            "Zero CPU parsing (native binary)"
          ],
          [
            "Schema evolution",
            "Embedded schema in footer",
            "Backward compatible schema evolution"
          ],
          [
            "Storage footprint",
            "85% compression ratio (ZSTD)",
            "10x cheaper S3 storage footprint"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Использование Parquet для потоковой построчной записи (Row-by-Row streaming)",
      "content": "Разработчик настроил Kafka Consumer, записывающий каждое входящее сообщение напрямую в новый Parquet-файл в S3. За сутки образовалось 5 000 000 микрофайлов по 2 КБ. Кластер Spark упал при первой попытке прочитать таблицу из-за перегрузки метаданными (Small Files Problem). Для стриминга сообщений пишите в Avro или используйте буферизованный батчинг!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему однотипные данные в колонке сжимаются в разы лучше, чем строки в CSV?",
      "content": "**Ответ:** В колоночном формате одинаковые типы данных лежат последовательно. Это позволяет использовать алгоритмы специализированного сжатия: Dictionary Encoding (замена повторяющихся строк на короткие целочисленные индексы), Run-Length Encoding (упаковка повторяющихся чисел `0, 0, 0, 0` в пару `4x0`) и Bit-Packing, недоступные для разнородных строк CSV."
    }
  ],
  "taskDescription": "Вам необходимо выбрать и сконфигурировать оптимальный формат хранения в зависимости от типа рабочей нагрузки дата-платформы:\n1. Для аналитического слоя Data Lakehouse выберите колоночный формат 'PARQUET' со сжатием 'SNAPPY'.\n2. Для слоя потоковой передачи сообщений в Kafka выберите строчный бинарный формат 'AVRO'.\n3. Сформируйте конфигурационную структуру 'lakehouse_format_spec' в виде SQL DDL таблицы метаданных для каталога форматов.\n\nВведите SQL-команду создания таблицы с правильными форматами.",
  "seedCode": "-- Создайте таблицу спецификации форматов lakehouse_format_spec\n",
  "initialCode": "CREATE TABLE lakehouse_format_spec (\n    workload_type VARCHAR(32) PRIMARY KEY,\n    storage_format VARCHAR(16) NOT NULL,\n    compression_codec VARCHAR(16) NOT NULL\n);\n\nINSERT INTO lakehouse_format_spec VALUES\n('olap_lakehouse', 'PARQUET', 'SNAPPY'),\n('streaming_kafka', 'AVRO', 'SNAPPY');",
  "solutionCode": "CREATE TABLE lakehouse_format_spec (\n    workload_type VARCHAR(32) PRIMARY KEY,\n    storage_format VARCHAR(16) NOT NULL,\n    compression_codec VARCHAR(16) NOT NULL\n);\n\nINSERT INTO lakehouse_format_spec VALUES\n('olap_lakehouse', 'PARQUET', 'SNAPPY'),\n('streaming_kafka', 'AVRO', 'SNAPPY');",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "CREATE TABLE lakehouse_format_spec",
      "PARQUET",
      "SNAPPY",
      "AVRO"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1001: 4-часовой опрос дашборда из-за хранения кликстрима в CSV",
    "incidentDescription": "Команда хранила 100 млн сырых кликов в CSV файлах на S3. Запрос метрик выполнялся 4 часа и сканировал 150 ГБ трафика.",
    "buggyCode": "-- Хранение в сыром CSV без колоночной оптимизации\nCREATE EXTERNAL TABLE raw_events ROW FORMAT DELIMITED FIELDS TERMINATED BY ',';",
    "fixHint": "Переведите хранение в STORED AS PARQUET со сжатием Snappy или ZSTD.",
    "solutionCode": "CREATE EXTERNAL TABLE raw_events STORED AS PARQUET TBLPROPERTIES ('parquet.compression'='SNAPPY');",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицу `lakehouse_format_spec` с полями `workload_type`, `storage_format`, `compression_codec`.",
    "Вставьте строки с конфигурацией `'olap_lakehouse', 'PARQUET', 'SNAPPY'`.",
    "Для потоковых задач укажите `'streaming_kafka', 'AVRO', 'SNAPPY'`."
  ]
};
