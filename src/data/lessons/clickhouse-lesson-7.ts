import { Lesson } from '@/types/course';

export const clickhouseLesson7: Lesson = {
  "id": "clickhouse-7",
  "moduleSlug": "clickhouse",
  "order": 7,
  "title": "Архитектура MPP Greenplum / Arenadata DB: Master, Segments, Interconnect и Data Skew",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Segment (Сегмент Greenplum)",
      "definition": "Отдельный рабочий процесс СУБД PostgreSQL на узле кластера, хранящий и обрабатывающий свою долю данных."
    },
    {
      "term": "Redistribute Motion",
      "definition": "Операция пересылки данных по сети Interconnect между сегментами для выравнивания ключей перед JOIN или GROUP BY."
    },
    {
      "term": "GPORCA",
      "definition": "Стоимостной оптимизатор запросов в Greenplum, строящий параллельные планы для MPP-архитектуры."
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
      "content": "### Архитектура Shared-Nothing в Greenplum\n**Greenplum (и Arenadata DB)** — это массивно-параллельная (MPP) аналитическая СУБД, построенная из десятков независимых инстансов PostgreSQL, объединенных быстрой сетью **Interconnect**. **Master Host** принимает SQL-запрос, строит распределенный план (оптимизатор **GPORCA**) и раздает задания рабочим узлам — **Segment Hosts** (у каждого свои CPU, RAM и диски, архитектура *Shared-Nothing*). Данные таблицы физически нарезаны между сегментами согласно политике **`DISTRIBUTED BY (col)`** (хэш-распределение), **`DISTRIBUTED RANDOMLY`** или **`DISTRIBUTED REPLICATED`**."
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
          "DISTRIBUTED BY (status_code)",
          "Всего 5 значений на 64 сегмента",
          "Дикий перекос (Skew) и падение 5 сегментов по диску"
        ],
        [
          "JOIN таблиц с разными ключами дистрибуции",
          "Тяжелый Redistribute Motion по сети",
          "Упор в полосу пропускания Interconnect"
        ],
        [
          "Забытая колонка дистрибуции в CREATE TABLE",
          "Дефолт по первой колонке или RANDOMLY",
          "Непредсказуемые планы и лишние перемещения"
        ]
      ],
      "afterRows": [
        [
          "DISTRIBUTED BY (user_id) или (order_id)",
          "Высокая кардинальность и ровный хэш",
          "Идеально ровная загрузка всех 64 сегментов"
        ],
        [
          "Одинаковый DISTRIBUTED BY у фактов и связей",
          "Локальный Co-located Join внутри сегмента",
          "Нулевой сетевой трафик при соединении"
        ],
        [
          "DISTRIBUTED REPLICATED для малых справочников",
          "Полная копия справочника на каждом сегменте",
          "Мгновенный джойн без Broadcast Motion"
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
  "seedCode": "CREATE TABLE gp_tables (tbl_id INT, dist_column VARCHAR(30), distinct_keys INT, skew_pct INT);\nINSERT INTO gp_tables VALUES (1, 'order_id', 80000000, 2), (2, 'country_region', 8, 88), (3, 'payment_type', 4, 92), (4, 'customer_id', 15000000, 3);",
  "initialCode": "SELECT\n  tbl_id,\n  dist_column,\n  skew_pct,\n  CASE\n    WHEN skew_pct > 15 OR distinct_keys < 1000 THEN 'CHANGE_DISTRIBUTED_BY_KEY'\n    ELSE 'BALANCED_MPP_DISTRIBUTION'\n  END AS gp_verdict\nFROM gp_tables\nORDER BY tbl_id ASC;",
  "solutionCode": "SELECT\n  tbl_id,\n  dist_column,\n  skew_pct,\n  CASE\n    WHEN skew_pct > 15 OR distinct_keys < 1000 THEN 'CHANGE_DISTRIBUTED_BY_KEY'\n    ELSE 'BALANCED_MPP_DISTRIBUTION'\n  END AS gp_verdict\nFROM gp_tables\nORDER BY tbl_id ASC;",
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
    "title": "Инцидент #807: Переполнение дисков на 4 сегментах Greenplum из-за перекоса",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT tbl_id, dist_column, skew_pct, 'BALANCED_MPP_DISTRIBUTION' AS gp_verdict FROM gp_tables;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  tbl_id,\n  dist_column,\n  skew_pct,\n  CASE\n    WHEN skew_pct > 15 OR distinct_keys < 1000 THEN 'CHANGE_DISTRIBUTED_BY_KEY'\n    ELSE 'BALANCED_MPP_DISTRIBUTION'\n  END AS gp_verdict\nFROM gp_tables\nORDER BY tbl_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте перекос или низкую кардинальность: WHEN skew_pct > 15 OR distinct_keys < 1000.",
    "Верните 'CHANGE_DISTRIBUTED_BY_KEY' для перекошенных таблиц и 'BALANCED_MPP_DISTRIBUTION' для ровных.",
    "Отсортируйте результат по tbl_id ASC."
  ]
};
