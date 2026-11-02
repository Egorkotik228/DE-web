import { Lesson } from '@/types/course';

export const formatsS3Lesson3: Lesson = {
  "id": "formats-s3-3",
  "moduleSlug": "formats-s3",
  "order": 3,
  "title": "Объектное хранилище S3 / MinIO для DE: Flat namespace, префиксы, TPS limits и multipart upload",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Object Storage (Объектное хранилище)",
      "definition": "Система хранения данных с плоским пространством имен (flat namespace), где данные адресуются по уникальному строковому ключу (URI) без иерархических папок файловой системы."
    },
    {
      "term": "S3 Prefix (Префикс ключа)",
      "definition": "Строка пути до последнего слэша (например, 'bucket/analytics/orders/'), используемая провайдерами (AWS S3) для шардирования и масштабирования RPS/TPS."
    },
    {
      "term": "Multipart Upload (Составная загрузка)",
      "definition": "Протокол S3 для параллельной загрузки больших файлов (от 100 МБ до 5 ТБ) отдельными частями (parts) с автоматическим докачиванием упавших фрагментов."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "s3_storage_objects",
      "description": "Реестр объектов в бакете S3 / MinIO Data Lake",
      "columns": [
        {
          "name": "object_key",
          "type": "VARCHAR(255)",
          "keyType": "PK"
        },
        {
          "name": "size_bytes",
          "type": "BIGINT"
        },
        {
          "name": "storage_class",
          "type": "VARCHAR(32)"
        },
        {
          "name": "etag",
          "type": "VARCHAR(64)"
        }
      ],
      "sampleRows": [
        {
          "object_key": "raw/crm/customers/dt=2026-11-01/part-0001.parquet",
          "size_bytes": 145000000,
          "storage_class": "STANDARD",
          "etag": "\"a1b2c3d4e5f6\""
        },
        {
          "object_key": "raw/crm/customers/dt=2026-11-01/part-0002.parquet",
          "size_bytes": 138000000,
          "storage_class": "STANDARD",
          "etag": "\"f6e5d4c3b2a1\""
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура объектного хранилища (S3 / MinIO): В чем подвох Flat Namespace\n\nВ традиционных файловых системах (POSIX / HDFS) папки существуют физически как узлы дерева каталогов (inodes). Операция `mv /folderA /folderB` выполняется мгновенно (изменение ссылки в inode).\n\nВ **AWS S3, MinIO и Ceph папок не существует вообще!**\n* Пространство имен **абсолютно плоское** (Key-Value хранилище).\n* Ключ `sales/2026/11/01/data.parquet` — это просто одна длинная текстовая строка.\n* Слэши `/` — лишь визуальная иллюзия в UI для удобства человека.\n\n#### Почему в S3 смертельно опасен rename (переименование):\nЧтобы переименовать «папку» с 10 000 файлов в S3, клиент обязан:\n1. Сделать 10 000 операций `COPY object_old object_new`.\n2. Сделать 10 000 операций `DELETE object_old`.\nЭто занимает десятки минут и стоит кучу денег в API-запросах!\n\n#### Лимиты масштабирования префиксов (S3 TPS Limits):\nКаждый уникальный префикс в S3 выдерживает до **3 500 операций PUT/POST/DELETE** и **5 500 операций GET** в секунду. Если весь кластер из 100 воркеров Spark пишет в один плоский путь без партиционирования по префиксам, S3 начнет отдавать ошибки `503 Slow Down` (Throttling)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Камера хранения на вокзале",
      "content": "Файловая система — это шкаф с выдвижными ящиками (папками). S3 — это гигантская автоматизированная камера хранения на 10 миллиардов ячеек: у вас есть только номер ячейки (строковый ключ). Если вы хотите переложить вещи из «секции А» в «секцию Б», робот должен физически перетащить каждый предмет по одному, потому что самих секций как физических стен не существует."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение файловых систем (HDFS/POSIX) и S3",
        "beforeDescription": "Иерархическая файловая система (POSIX / HDFS)",
        "beforeColumns": [
          "operation_type",
          "execution_mechanism",
          "performance_cost"
        ],
        "beforeRows": [
          [
            "Directory rename",
            "Instant metadata inode update",
            "O(1) 1 millisecond execution"
          ],
          [
            "File append",
            "Append bytes to open block",
            "Native write lock support"
          ],
          [
            "Directory listing",
            "Traverse directory inode tree",
            "Fast sub-second scan"
          ]
        ],
        "afterDescription": "Объектное хранилище (AWS S3 / MinIO)",
        "afterColumns": [
          "operation_type",
          "execution_mechanism",
          "performance_cost"
        ],
        "afterRows": [
          [
            "Directory rename",
            "Copy all files + Delete originals",
            "O(N) minutes of network I/O"
          ],
          [
            "File append",
            "Not supported (immutability)",
            "Must rewrite 100% of object"
          ],
          [
            "Directory listing",
            "List API with pagination tokens",
            "Slow on millions of keys"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Ошибки 503 Slow Down из-за одинаковых префиксов ключей",
      "content": "Пайплайн генерировал ключи с монотонно возрастающим таймстемпом в начале: `20261101_100000_part1.parquet`. Все запросы попадали в один внутренний шардинг-узел S3, и сервис выдал ошибку `503 Slow Down`. Всегда размещайте функциональные префиксы или хэш в начале пути (`data/events/dt=.../`)."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем нужен Multipart Upload при загрузке файлов в S3?",
      "content": "**Ответ:** При передаче файлов размером более 100 МБ один сбой сети в конце прервет 100% передачи. Multipart Upload делит файл на независимые части (от 5 МБ до 5 ГБ) и передает их параллельно в несколько потоков. Если упадет часть №14, перекачивается только она, а после завершения всех частей S3 атомарно собирает финальный объект."
    }
  ],
  "taskDescription": "Смоделируйте каталог объектов S3 Data Lake с разбиением по префиксам партиций:\n1. Создайте таблицу 's3_lake_objects' (object_key VARCHAR(255) PRIMARY KEY, prefix VARCHAR(64) NOT NULL, file_size_mb INT NOT NULL, format VARCHAR(16) NOT NULL).\n2. Вставьте два объекта с префиксом 'events/clicks/dt=2026-11-01/':\n   - Ключ 'events/clicks/dt=2026-11-01/part-01.parquet', размер 250 MB, формат 'PARQUET'\n   - Ключ 'events/clicks/dt=2026-11-01/part-02.parquet', размер 280 MB, формат 'PARQUET'\n3. Напишите запрос суммарного объема данных в МБ для префикса 'events/clicks/dt=2026-11-01/'.\n\nВведите SQL-скрипт создания таблицы и агрегации.",
  "seedCode": "-- Смоделируйте структуру префиксов S3 Data Lake\n",
  "initialCode": "CREATE TABLE s3_lake_objects (\n    object_key VARCHAR(255) PRIMARY KEY,\n    prefix VARCHAR(64) NOT NULL,\n    file_size_mb INT NOT NULL,\n    format VARCHAR(16) NOT NULL\n);\n\nINSERT INTO s3_lake_objects VALUES\n('events/clicks/dt=2026-11-01/part-01.parquet', 'events/clicks/dt=2026-11-01/', 250, 'PARQUET'),\n('events/clicks/dt=2026-11-01/part-02.parquet', 'events/clicks/dt=2026-11-01/', 280, 'PARQUET');\n\nSELECT prefix, SUM(file_size_mb) AS total_mb\nFROM s3_lake_objects\nWHERE prefix = 'events/clicks/dt=2026-11-01/'\nGROUP BY prefix;",
  "solutionCode": "CREATE TABLE s3_lake_objects (\n    object_key VARCHAR(255) PRIMARY KEY,\n    prefix VARCHAR(64) NOT NULL,\n    file_size_mb INT NOT NULL,\n    format VARCHAR(16) NOT NULL\n);\n\nINSERT INTO s3_lake_objects VALUES\n('events/clicks/dt=2026-11-01/part-01.parquet', 'events/clicks/dt=2026-11-01/', 250, 'PARQUET'),\n('events/clicks/dt=2026-11-01/part-02.parquet', 'events/clicks/dt=2026-11-01/', 280, 'PARQUET');\n\nSELECT prefix, SUM(file_size_mb) AS total_mb\nFROM s3_lake_objects\nWHERE prefix = 'events/clicks/dt=2026-11-01/'\nGROUP BY prefix;",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "CREATE TABLE s3_lake_objects",
      "prefix",
      "file_size_mb",
      "SUM(file_size_mb)",
      "GROUP BY prefix"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #1003: Падение Spark-джоба из-за переименования директории в S3",
    "incidentDescription": "Пайплайн попытался выполнить атомарный move директории в S3 перед фиксацией транзакции, вызвав таймаут на 50 000 файлов.",
    "buggyCode": "fs.rename('/mnt/s3/staging_orders', '/mnt/s3/prod_orders')",
    "fixHint": "Используйте табличные форматы Apache Iceberg или Delta Lake вместо файлового rename в S3.",
    "solutionCode": "-- Переход на метаданные Iceberg устраняет необходимость физического rename файлов\nALTER TABLE prod_orders RENAME TO prod_orders_old;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицу `s3_lake_objects` со столбцами `object_key`, `prefix`, `file_size_mb`, `format`.",
    "Вставьте две строки с префиксом `'events/clicks/dt=2026-11-01/'`.",
    "Вычислите `SUM(file_size_mb)` с группировкой по префиксу."
  ]
};
