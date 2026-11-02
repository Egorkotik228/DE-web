import { Lesson } from '@/types/course';

export const formatsS3Lesson4: Lesson = {
  "id": "formats-s3-4",
  "moduleSlug": "formats-s3",
  "order": 4,
  "title": "Табличные форматы Data Lakehouse: Зачем нужен Apache Iceberg и решение проблем S3",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Table Format (Табличный формат)",
      "definition": "Слой абстракции метаданных поверх сырых файлов (Parquet/ORC) в объектном хранилище, представляющий набор файлов как единую реляционную таблицу с поддержкой ACID."
    },
    {
      "term": "ACID в Data Lake",
      "definition": "Гарантии транзакционности (Atomicity, Consistency, Isolation, Durability), исключающие чтение частично записанных файлов и конфликты параллельных записей."
    },
    {
      "term": "Schema Evolution в Iceberg",
      "definition": "Возможность безопасного добавления, переименования, удаления и изменения порядка колонок по постоянным целочисленным ID (Field ID) без перезаписи существующих файлов."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "lakehouse_architecture_comparison",
      "description": "Сравнение сырого озера данных (Raw S3) и Lakehouse (Apache Iceberg)",
      "columns": [
        {
          "name": "capability",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "raw_parquet_s3",
          "type": "VARCHAR(32)"
        },
        {
          "name": "iceberg_lakehouse",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "capability": "ACID Transactions",
          "raw_parquet_s3": "None (dirty reads)",
          "iceberg_lakehouse": "Serializable / Snapshot isolation"
        },
        {
          "capability": "Schema Evolution",
          "raw_parquet_s3": "Breaks queries on column rename",
          "iceberg_lakehouse": "Seamless via Column Field IDs"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Рождение Data Lakehouse: Зачем Netflix создал Apache Iceberg\n\nДо 2018 года озера данных строились по схеме **Hive Metastore поверх S3/HDFS**. Таблица считалась просто «директорией на диске», а список файлов определялся сканированием каталогов.\n\n#### 3 фундаментальные проблемы сырого озера на S3:\n1. **Отсутствие атомарности (Грязное чтение):** Spark пишет 100 Parquet-файлов. Если в этот момент дашборд выполняет `SELECT`, он прочитает первые 40 файлов и выдаст искаженные цифры выручки! Если Spark упадет на 99-м файле, в озере останется мусор.\n2. **Убийственный `LIST` файлов в S3:** Чтобы узнать, какие файлы есть в таблице на 1 млн объектов, движок делает тысячи медленных пагинированных HTTP `LIST` запросов, тратя на это 10 минут еще до начала вычислений!\n3. **Хрупкая эволюция схемы:** Если переименовать колонку `price` в `cost`, старые Parquet-файлы перестанут читаться либо заполнятся `NULL`.\n\n#### Решение Apache Iceberg:\nIceberg переносит определение таблицы **с уровня директорий на уровень независимых файлов метаданных**:\n* Таблица — это не папка, а **дерево снимков (Snapshots)**.\n* Новая запись фиксируется атомарной сменой указателя на новый `snapshot`.\n* Читатели всегда видят только полностью зафиксированные снимки (Snapshot Isolation).\n* Добавление/удаление/переименование колонок отслеживается по постоянным **Field IDs**, а не по именам колонок!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Папка с бумагами против реестра с подписями",
      "content": "Сырое озеро S3 — это папка с разрозненными листами на столе: любой может подложить лист или выдернуть половину страниц прямо во время чтения. Apache Iceberg — это официальный реестр с оглавлением и нотариальной печатью: новая редакция вступает в силу только после финальной подписи (коммита), а читатели гарантированно видят цельный документ."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение Hive-таблиц поверх S3 и Apache Iceberg",
        "beforeDescription": "Hive-стиль (Таблица как директория в S3)",
        "beforeColumns": [
          "lake_feature",
          "hive_metastore_style",
          "concurrency_risk"
        ],
        "beforeRows": [
          [
            "ACID Commit",
            "File rename (slow and non-atomic)",
            "Partial dirty reads during ETL"
          ],
          [
            "File discovery",
            "S3 LIST prefix scan (slow)",
            "Minutes spent before query starts"
          ],
          [
            "Concurrent writes",
            "Last write wins (data corruption)",
            "Race conditions on concurrent jobs"
          ]
        ],
        "afterDescription": "Apache Iceberg (Таблица как дерево метаданных)",
        "afterColumns": [
          "lake_feature",
          "hive_metastore_style",
          "concurrency_risk"
        ],
        "afterRows": [
          [
            "ACID Commit",
            "Atomic snapshot pointer swap",
            "100% isolated concurrent reads"
          ],
          [
            "File discovery",
            "Pre-computed in manifest files",
            "Sub-second metadata resolution"
          ],
          [
            "Concurrent writes",
            "Optimistic Concurrency Control (OCC)",
            "Conflict detection with auto-retry"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Чтение таблицы во время ночной перезаписи в сыром S3",
      "content": "В сыром S3 запущен скрипт перезаписи партиции. В середине процесса BI-система запросила данные за месяц. Дашборд показал нулевую выручку, сработали ошибочные P1-алерты, а дежурные инженеры начали экстренное расследование. Табличный формат Iceberg полностью устраняет эту проблему благодаря Snapshot Isolation!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как Apache Iceberg обеспечивает ACID транзакции в хранилище без поддержки транзакций (S3)?",
      "content": "**Ответ:** Iceberg использует принцип **Optimistic Concurrency Control (OCC)** и атомарный обмен указателей в Каталоге (Iceberg Catalog). Воркеры пишут новые Parquet-файлы и создают новый манифест независимо. Фиксация транзакции происходит одной атомарной операцией обновления ссылки на новый `metadata.json` в каталоге (DynamoDB, Nessie, Hive, JDBC)."
    }
  ],
  "taskDescription": "Сформируйте DDL-запрос создания таблицы в формате Apache Iceberg для движка Trino/Spark:\n1. Имя таблицы: 'lakehouse.sales.orders_iceberg'.\n2. Колонки:\n   - 'order_id' BIGINT\n   - 'customer_id' BIGINT\n   - 'order_amount' DECIMAL(10, 2)\n   - 'order_date' DATE\n3. Партиционируйте таблицу по месяцам от даты: `PARTITIONED BY (months(order_date))`.\n4. Укажите формат хранения Parquet: `TBLPROPERTIES ('format' = 'ICEBERG', 'write.format.default' = 'PARQUET')`.\n\nВведите SQL-запрос создания таблицы Iceberg.",
  "seedCode": "-- Создайте таблицу в табличном формате Apache Iceberg\n",
  "initialCode": "CREATE TABLE lakehouse.sales.orders_iceberg (\n    order_id BIGINT,\n    customer_id BIGINT,\n    order_amount DECIMAL(10, 2),\n    order_date DATE\n)\nPARTITIONED BY (months(order_date))\nTBLPROPERTIES ('format' = 'ICEBERG', 'write.format.default' = 'PARQUET');",
  "solutionCode": "CREATE TABLE lakehouse.sales.orders_iceberg (\n    order_id BIGINT,\n    customer_id BIGINT,\n    order_amount DECIMAL(10, 2),\n    order_date DATE\n)\nPARTITIONED BY (months(order_date))\nTBLPROPERTIES ('format' = 'ICEBERG', 'write.format.default' = 'PARQUET');",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "CREATE TABLE lakehouse.sales.orders_iceberg",
      "order_id BIGINT",
      "PARTITIONED BY (months(order_date))",
      "'format' = 'ICEBERG'"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1004: Чтение наполовину загруженной таблицы при ETL-сбое",
    "incidentDescription": "ETL-пайплайн в сыром S3 упал посередине записи, оставив 50 битых файлов, которые сломали утренние отчеты.",
    "buggyCode": "-- Запись напрямую в сырую S3 директорию\ndf.write.mode('overwrite').parquet('s3://lake/orders/')",
    "fixHint": "Используйте запись в таблицу Apache Iceberg для гарантии атомарного коммита.",
    "solutionCode": "df.writeTo('lakehouse.orders').append()",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте команду `CREATE TABLE lakehouse.sales.orders_iceberg`.",
    "Партиционирование по месяцам задается функцией `PARTITIONED BY (months(order_date))`.",
    "В свойствах укажите `TBLPROPERTIES ('format' = 'ICEBERG', 'write.format.default' = 'PARQUET')`."
  ]
};
