import { Lesson } from '@/types/course';

export const clickhouseLesson8: Lesson = {
  "id": "clickhouse-8",
  "moduleSlug": "clickhouse",
  "order": 8,
  "title": "Хранение и эксплуатация Greenplum: Heap против Append-Optimized Columnar (AOCO), ZSTD и PXF",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "AOCO (Append-Optimized Columnar)",
      "definition": "Колоночный формат хранения таблиц в Greenplum с поддержкой блочного сжатия ZSTD и RLE."
    },
    {
      "term": "Visimap (Visibility Map в AO)",
      "definition": "Специальная структура для отслеживания удаленных/обновленных строк в Append-Optimized таблицах."
    },
    {
      "term": "PXF (Platform Extension Framework)",
      "definition": "Параллельный коннектор Greenplum для прямого чтения/записи данных из S3, HDFS, Hive и внешних СУБД силами всех сегментов."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "spark_join_strategies",
      "description": "Сравнение стратегий соединений в зависимости от объема таблиц",
      "columns": [
        {
          "name": "join_strategy",
          "type": "VARCHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "shuffle_required",
          "type": "BOOLEAN"
        },
        {
          "name": "memory_consumption",
          "type": "VARCHAR(32)"
        },
        {
          "name": "best_use_case",
          "type": "VARCHAR(128)"
        }
      ],
      "sampleRows": [
        {
          "join_strategy": "BroadcastHashJoin",
          "shuffle_required": false,
          "memory_consumption": "Driver + Executor Memory",
          "best_use_case": "Большой факт + Малое измерение (< 10-100MB)"
        },
        {
          "join_strategy": "SortMergeJoin",
          "shuffle_required": true,
          "memory_consumption": "Низкое (потоковое слияние)",
          "best_use_case": "Большой факт + Большой факт (терабайты)"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### `Heap` против `Append-Optimized Columnar (AOCO)`\nВ Greenplum можно выбрать тип физического хранения для каждой таблицы (или даже для отдельных партиций одной таблицы!):\n1. **Heap (строчный, по умолчанию)** — классический движок PostgreSQL с поддержкой MVCC, частых `UPDATE`/`DELETE` и B-Tree индексов. Подходит для витрин с частыми точечными изменениями и горячих оперативных партиций.\n2. **`WITH (appendoptimized=true, orientation=column, compresstype=zstd, compresslevel=3)` (AOCO)** — колоночное хранение с мощным сжатием ZSTD (в 5–10 раз компактнее Heap!). Идеально для крупных исторических таблиц фактов, где читаются отдельные столбцы."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 Инженерная аналогия: Карманный справочник против городского съезда",
      "content": "**BroadcastHashJoin** — это раздача каждому продавцу в городе маленькой карманной брошюрки с новыми ценами (справочник): продавец мгновенно на месте отвечает покупателю, никуда не выходя. **SortMergeJoin** — это сбор всех покупателей и продавцов на гигантском стадионе, где всех выстраивают строго по алфавиту фамилий и сливают списки: процесс долгий и тяжелый (Shuffle), но работает даже для миллиона человек."
    },
    {
      "type": "data-flow",
      "data": {
        "title": "Сравнение BroadcastHashJoin и SortMergeJoin",
        "description": "BHJ исключает пересылку большой таблицы по сети, тогда как SMJ шафлит обе стороны.",
        "nodes": [
          {
            "id": "dim",
            "label": "dim_categories (10 MB)",
            "sublabel": "Малая таблица",
            "type": "source"
          },
          {
            "id": "fact",
            "label": "fact_orders (2 TB)",
            "sublabel": "Большая таблица",
            "type": "source"
          },
          {
            "id": "bcast",
            "label": "Broadcast to Executors",
            "sublabel": "Без Shuffle факта",
            "type": "transform"
          },
          {
            "id": "bhj",
            "label": "BroadcastHashJoin",
            "sublabel": "Локальный Lookup в RAM",
            "type": "transform"
          },
          {
            "id": "out",
            "label": "Результат Join",
            "sublabel": "Быстрый вывод",
            "type": "storage"
          }
        ],
        "edges": [
          {
            "from": "dim",
            "to": "bcast",
            "label": "Driver collect + broadcast"
          },
          {
            "from": "fact",
            "to": "bhj",
            "label": "Прямое чтение партиций"
          },
          {
            "from": "bcast",
            "to": "bhj",
            "label": "Lookup в Hash Table"
          },
          {
            "from": "bhj",
            "to": "out",
            "label": "0 Shuffle Bytes для факта"
          }
        ]
      }
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Эффект применения broadcast() при соединении факта со справочником",
        "beforeDescription": "Дефолтный SortMergeJoin без хинта (обе таблицы шафлятся)",
        "beforeColumns": [
          "Тип Join",
          "Объем Shuffle по сети",
          "Время выполнения"
        ],
        "beforeRows": [
          [
            "SortMergeJoin (дефолт)",
            "2.0 TB (факт) + 20 MB (дим)",
            "48 минут 30 сек"
          ],
          [
            "Shuffle Spill Disk",
            "180 GB промежуточных файлов",
            "Высокая нагрузка на I/O"
          ],
          [
            "Сортировка ключей",
            "100% CPU на всех экзекьюторах",
            "Задержка очереди YARN"
          ]
        ],
        "afterDescription": "BroadcastHashJoin с явным хинтом F.broadcast(dim)",
        "afterColumns": [
          "Тип Join",
          "Объем Shuffle по сети",
          "Время выполнения"
        ],
        "afterRows": [
          [
            "BroadcastHashJoin",
            "0 байт для факта (только 20 MB дим)",
            "2 минуты 15 сек"
          ],
          [
            "Shuffle Spill Disk",
            "0 байт (spill отсутствует)",
            "Минимальный I/O диска"
          ],
          [
            "Потоковый Lookup",
            "Параллельный доступ к хэш-карте",
            "Снижение CPU в 8 раз"
          ]
        ]
      },
      "beforeColumns": [
        "Подход / Настройка",
        "Механика",
        "Последствие в проде"
      ],
      "afterColumns": [
        "Подход / Настройка",
        "Механика",
        "Результат в проде"
      ],
      "beforeRows": [
        [
          "Хранение 50 ТБ архива в обычном Heap",
          "Огромный расход диска без сжатия",
          "Медленное чтение всех колонок при агрегации"
        ],
        [
          "Частые мелкие UPDATE в таблице AOCO",
          "Раздувание visimap и файлов сегментов",
          "Катастрофический Bloat и деградация"
        ],
        [
          "Выгрузка из S3 через Master-ноду (COPY)",
          "Вся сеть идет через 1 узел Master",
          "Узкое горлышко в 1 Гбит/с вместо 100 Гбит/с"
        ]
      ],
      "afterRows": [
        [
          "Гибрид: горячая в Heap, архив в AOCO + ZSTD",
          "Сжатие архива в 6–8 раз",
          "Мгновенное чтение только нужных колонок"
        ],
        [
          "Батчевый перезалив партиций (staging swap)",
          "Чистые файлы сегментов без мусора",
          "Стабильная скорость без тяжелого VACUUM"
        ],
        [
          "Чтение S3 через внешние таблицы PXF",
          "Все 64 сегмента качают из S3 параллельно",
          "Линейный рост скорости загрузки"
        ]
      ]
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Принудительный broadcast таблицы в 20 ГБ",
      "content": "Инженер увидел, что джойн идет медленно, и добавил `F.broadcast(df)` к датафрейму клиентов размером 15 ГБ. Driver попытался скачать эти 15 ГБ через `collect()`, мгновенно упал с `OutOfMemoryError: Java heap space` и завершил весь джоб. **Запомните:** никогда не бродкастите таблицы больше 1–2 ГБ (а в идеале держитесь в пределах 100–200 МБ)!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему SortMergeJoin считается более масштабируемым, чем ShuffleHashJoin?",
      "content": "**Ответ:** ShuffleHashJoin требует построения хэш-таблицы из одной из сторон прямо в оперативной памяти (JVM Heap) экзекьютора. Если размер данных на ключ превышает доступную память, задача падает с OOM. SortMergeJoin сначала сортирует данные: если они не помещаются в память, Spark сбрасывает отсортированные куски на диск (external merge sort) и затем читает их потоково двумя итераторами. Это позволяет SMJ стабильно работать с любыми петабайтными объемами без риска падения по памяти."
    }
  ],
  "taskDescription": "Оптимизируйте джойн огромного факта продаж и справочника магазинов:\n1. Инициализируйте SparkSession с именем приложения 'broadcast_join_lab'.\n2. Прочитайте таблицу фактов 's3://lake/raw/fact_sales.parquet'.\n3. Прочитайте справочник магазинов 's3://lake/raw/dim_stores.parquet'.\n4. Выполните соединение 'fact_sales' со справочником 'dim_stores' по ключу 'store_id', применив явный хинт `F.broadcast` к таблице справочника магазинов.\n5. Отберите поля 'sale_id', 'store_id', 'store_name', 'amount'.\n6. Запишите результат в Parquet по пути 's3://lake/marts/sales_with_stores.parquet' в режиме 'overwrite'.",
  "seedCode": "CREATE TABLE gp_partitions (part_id INT, is_hot_mutable INT, size_gb INT, storage_type VARCHAR(20));\nINSERT INTO gp_partitions VALUES (1, 0, 2400, 'HEAP'), (2, 0, 1800, 'AOCO_ZSTD'), (3, 1, 150, 'AOCO_ZSTD'), (4, 1, 120, 'HEAP');",
  "initialCode": "SELECT\n  part_id,\n  size_gb,\n  storage_type,\n  CASE\n    WHEN is_hot_mutable = 0 AND storage_type = 'HEAP' THEN 'CONVERT_ARCHIVE_TO_AOCO_ZSTD'\n    WHEN is_hot_mutable = 1 AND storage_type = 'AOCO_ZSTD' THEN 'MOVE_MUTABLE_PART_TO_HEAP'\n    ELSE 'OPTIMAL_STORAGE_TIER'\n  END AS storage_advice\nFROM gp_partitions\nORDER BY part_id ASC;",
  "solutionCode": "SELECT\n  part_id,\n  size_gb,\n  storage_type,\n  CASE\n    WHEN is_hot_mutable = 0 AND storage_type = 'HEAP' THEN 'CONVERT_ARCHIVE_TO_AOCO_ZSTD'\n    WHEN is_hot_mutable = 1 AND storage_type = 'AOCO_ZSTD' THEN 'MOVE_MUTABLE_PART_TO_HEAP'\n    ELSE 'OPTIMAL_STORAGE_TIER'\n  END AS storage_advice\nFROM gp_partitions\nORDER BY part_id ASC;",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SparkSession.builder.appName('broadcast_join_lab')",
      "spark.read.parquet('s3://lake/raw/fact_sales.parquet')",
      "spark.read.parquet('s3://lake/raw/dim_stores.parquet')",
      "fact_sales.join(F.broadcast(dim_stores)",
      "on='store_id'",
      ".select('sale_id', 'store_id', 'store_name', 'amount')",
      ".write.mode('overwrite').parquet"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #808: Раздувание AOCO на частых UPDATE и перерасход диска на архивах",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT part_id, size_gb, storage_type, 'OPTIMAL_STORAGE_TIER' AS storage_advice FROM gp_partitions;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  part_id,\n  size_gb,\n  storage_type,\n  CASE\n    WHEN is_hot_mutable = 0 AND storage_type = 'HEAP' THEN 'CONVERT_ARCHIVE_TO_AOCO_ZSTD'\n    WHEN is_hot_mutable = 1 AND storage_type = 'AOCO_ZSTD' THEN 'MOVE_MUTABLE_PART_TO_HEAP'\n    ELSE 'OPTIMAL_STORAGE_TIER'\n  END AS storage_advice\nFROM gp_partitions\nORDER BY part_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте холодный архив на Heap: WHEN is_hot_mutable = 0 AND storage_type = 'HEAP' THEN 'CONVERT_ARCHIVE_TO_AOCO_ZSTD'.",
    "Проверьте изменяемую партицию на AOCO: WHEN is_hot_mutable = 1 AND storage_type = 'AOCO_ZSTD' THEN 'MOVE_MUTABLE_PART_TO_HEAP'.",
    "В остальных случаях верните 'OPTIMAL_STORAGE_TIER' и отсортируйте по part_id ASC."
  ]
};
