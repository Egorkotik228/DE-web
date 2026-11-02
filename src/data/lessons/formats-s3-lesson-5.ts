import { Lesson } from '@/types/course';

export const formatsS3Lesson5: Lesson = {
  "id": "formats-s3-5",
  "moduleSlug": "formats-s3",
  "order": 5,
  "title": "Архитектура Apache Iceberg: Catalog, Metadata files, Manifest lists и Manifest files",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Iceberg Catalog",
      "definition": "Центральный реестр (Nessie, Hive Metastore, AWS Glue, REST Catalog), хранящий атомарную ссылку на текущий активный metadata.json файл для каждой таблицы."
    },
    {
      "term": "Manifest List (.avro)",
      "definition": "Файл метаданных конкретного снимка (Snapshot), содержащий список всех входящих в него файлов манифестов с диапазонами партиций для быстрого отсечения."
    },
    {
      "term": "Manifest File (.avro)",
      "definition": "Файл метаданных, содержащий список физических Parquet-файлов с детальными min/max статистиками колонок, размерами и количеством null-значений."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "iceberg_metadata_tree",
      "description": "Иерархическая структура метаданных таблицы Apache Iceberg",
      "columns": [
        {
          "name": "layer_level",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "file_format",
          "type": "VARCHAR(16)"
        },
        {
          "name": "metadata_role",
          "type": "VARCHAR(64)"
        },
        {
          "name": "stored_data",
          "type": "VARCHAR(64)"
        }
      ],
      "sampleRows": [
        {
          "layer_level": "1. Catalog",
          "file_format": "Key-Value",
          "metadata_role": "Atomic pointer",
          "stored_data": "Pointer to v3.metadata.json"
        },
        {
          "layer_level": "2. Metadata File",
          "file_format": "JSON",
          "metadata_role": "Table configuration",
          "stored_data": "Schema, snapshots history, current snapshot ID"
        },
        {
          "layer_level": "3. Manifest List",
          "file_format": "AVRO",
          "metadata_role": "Snapshot manifest index",
          "stored_data": "List of manifest files with partition ranges"
        },
        {
          "layer_level": "4. Manifest File",
          "file_format": "AVRO",
          "metadata_role": "Data files index",
          "stored_data": "List of Parquet files with column min/max"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия метаданных Apache Iceberg: Как устроено дерево коммитов\n\nВ отличие от традиционных баз данных, где метаданные хранятся внутри закрытого ядра СУБД, в **Apache Iceberg метаданные хранятся в виде открытых файлов прямо в вашем S3 бакете!**\n\n#### Четыре уровня дерева метаданных Iceberg:\n1. **Iceberg Catalog (Вершина дерева):**\n   - Хранит соответствие: `sales.orders -> s3://lake/metadata/v4.metadata.json`.\n   - При коммите новой транзакции каталог атомарно меняет указатель `v3` на `v4` (CAS — Compare-And-Swap).\n2. **Table Metadata File (`v4.metadata.json`):**\n   - Хранит текущую схему (Field IDs), схему партиционирования и список всех исторических снимков (**Snapshots**).\n   - Указывает на `manifest-list-v4.avro` текущего снимка.\n3. **Manifest List (`snap-10492.avro`):**\n   - Список файлов манифестов, составляющих этот снимок.\n   - **Partition Pruning на уровне манифеста:** хранит диапазоны значений партиций в каждом манифесте. Если запрос ищет дату `2026-11-01`, манифесты за другие месяцы отсекаются моментально!\n4. **Manifest Files (`manifest-abc.avro`):**\n   - Список конкретных файлов данных (Parquet).\n   - Хранит путь к файлу в S3, количество строк и точные **Min/Max статистики колонок** для отсечения файлов без чтения S3."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Древовидная опись архива",
      "content": "Каталог — это табличка на двери архивариуса. Metadata file — это журнал учета: в нем записано, какие ревизии архива выходили. Manifest list — это опись стеллажей (на стеллаже №5 лежат документы за 2026 год). Manifest file — это список папок на полке с номерами дел. А Data files — это сами папки с документами (Parquet)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение поиска файлов в Hive и Apache Iceberg",
        "beforeDescription": "Hive Metastore (Поиск сканированием S3)",
        "beforeColumns": [
          "operation_scale",
          "listing_latency",
          "cloud_api_cost"
        ],
        "beforeRows": [
          [
            "100K data files in table",
            "10-15 minutes of S3 LIST API",
            "$$$ High S3 GET/LIST request costs"
          ],
          [
            "Partition pruning check",
            "Must query slow Hive RDBMS",
            "Metastore becomes bottleneck"
          ],
          [
            "Concurrent schema change",
            "Metadata corruption risk",
            "Locked metastore tables"
          ]
        ],
        "afterDescription": "Apache Iceberg (Дерево манифестов в S3)",
        "afterColumns": [
          "operation_scale",
          "listing_latency",
          "cloud_api_cost"
        ],
        "afterRows": [
          [
            "100K data files in table",
            "200 ms reading manifest Avro",
            "99% reduction in S3 API costs"
          ],
          [
            "Partition pruning check",
            "Pre-computed in manifest list",
            "Zero metastore load"
          ],
          [
            "Concurrent schema change",
            "Isolated snapshot metadata file",
            "100% lock-free concurrency"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Накопление старых Manifest и Metadata файлов без экспирации",
      "content": "Если в потоковом пайплайне Iceberg коммитит каждые 30 секунд и не настроена экспирация снимков (`expire_snapshots`), за месяц в каталоге образуется 100 000 JSON и Avro файлов метаданных. Размер каталога превысит размер самих данных, а запросы начнут тормозить. Регулярно запускайте `CALL system.expire_snapshots(...)`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем файлы Manifest List и Manifest File хранятся в формате AVRO, а не в Parquet или JSON?",
      "content": "**Ответ:** JSON слишком медленно парсится и много весит. Parquet оптимизирован для больших колоночных аналитических выборок сотен тысяч строк. Avro — это легкий компактный бинарный формат со строгой схемой, который идеально быстро читается строками (Row-based) при обходе дерева метаданных движками запросов."
    }
  ],
  "taskDescription": "Смоделируйте таблицу метаданных снимков Iceberg для системы аудита коммитов:\n1. Создайте таблицу 'iceberg_snapshots' (snapshot_id BIGINT PRIMARY KEY, parent_id BIGINT, manifest_list_path VARCHAR(255) NOT NULL, committed_at TIMESTAMP NOT NULL, operation VARCHAR(32) NOT NULL).\n2. Вставьте два последовательных снимка:\n   - Снимок 1: snapshot_id = 1001, parent_id = NULL, путь 's3://lake/meta/snap-1001.avro', дата '2026-11-01 10:00:00', операция 'append'\n   - Снимок 2: snapshot_id = 1002, parent_id = 1001, путь 's3://lake/meta/snap-1002.avro', дата '2026-11-01 11:00:00', операция 'overwrite'\n3. Напишите запрос, находящий последний актуальный снимок (с максимальной датой коммита).\n\nВведите SQL-скрипт моделирования снимков Iceberg.",
  "seedCode": "-- Смоделируйте журнал снимков Apache Iceberg\n",
  "initialCode": "CREATE TABLE iceberg_snapshots (\n    snapshot_id BIGINT PRIMARY KEY,\n    parent_id BIGINT,\n    manifest_list_path VARCHAR(255) NOT NULL,\n    committed_at TIMESTAMP NOT NULL,\n    operation VARCHAR(32) NOT NULL\n);\n\nINSERT INTO iceberg_snapshots VALUES\n(1001, NULL, 's3://lake/meta/snap-1001.avro', '2026-11-01 10:00:00', 'append'),\n(1002, 1001, 's3://lake/meta/snap-1002.avro', '2026-11-01 11:00:00', 'overwrite');\n\nSELECT snapshot_id, manifest_list_path, operation\nFROM iceberg_snapshots\nORDER BY committed_at DESC\nLIMIT 1;",
  "solutionCode": "CREATE TABLE iceberg_snapshots (\n    snapshot_id BIGINT PRIMARY KEY,\n    parent_id BIGINT,\n    manifest_list_path VARCHAR(255) NOT NULL,\n    committed_at TIMESTAMP NOT NULL,\n    operation VARCHAR(32) NOT NULL\n);\n\nINSERT INTO iceberg_snapshots VALUES\n(1001, NULL, 's3://lake/meta/snap-1001.avro', '2026-11-01 10:00:00', 'append'),\n(1002, 1001, 's3://lake/meta/snap-1002.avro', '2026-11-01 11:00:00', 'overwrite');\n\nSELECT snapshot_id, manifest_list_path, operation\nFROM iceberg_snapshots\nORDER BY committed_at DESC\nLIMIT 1;",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "CREATE TABLE iceberg_snapshots",
      "snapshot_id BIGINT",
      "manifest_list_path",
      "ORDER BY committed_at DESC",
      "LIMIT 1"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1005: Утечка осиротевших Parquet файлов при сбоях коммита",
    "incidentDescription": "Сбой воркера во время записи создал в S3 40 Parquet-файлов, которые не попали ни в один снимок манифеста, раздувая расходы на хранение.",
    "buggyCode": "-- Оставление мусорных файлов в S3 без очистки\nCALL system.expire_snapshots('orders', older_than => TIMESTAMP '2026-11-01');",
    "fixHint": "Выполняйте удаление осиротевших файлов с помощью процедуры remove_orphan_files.",
    "solutionCode": "CALL system.remove_orphan_files(table => 'orders', older_than => TIMESTAMP '2026-11-01');",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицу `iceberg_snapshots` с указанными полями.",
    "Вставьте два снимка с цепочкой parent_id.",
    "Отсортируйте по `committed_at DESC LIMIT 1` для получения последнего снимка."
  ]
};
