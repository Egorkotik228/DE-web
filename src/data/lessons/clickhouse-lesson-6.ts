import { Lesson } from '@/types/course';

export const clickhouseLesson6: Lesson = {
  "id": "clickhouse-6",
  "moduleSlug": "clickhouse",
  "order": 6,
  "title": "JOIN-ы и внешние словари (Dictionaries) в ClickHouse: как ускорить соединения в 50 раз",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Hash Join (ClickHouse)",
      "definition": "Базовый алгоритм соединения, полностью загружающий правую таблицу в оперативную память для построения хэш-таблицы."
    },
    {
      "term": "ClickHouse Dictionary",
      "definition": "Специальная структура в памяти (FLAT, HASHED, COMPLEX_KEY_HASHED) для мгновенного обогащения данных через dictGet()."
    },
    {
      "term": "GLOBAL JOIN",
      "definition": "Модификатор для Distributed-таблиц, при котором правая таблица вычисляется один раз на сервере-инициаторе и рассылается на шарды."
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
      "content": "### Золотое правило JOIN в ClickHouse: малая таблица всегда СПРАВА\nПри выполнении `FROM left_tbl JOIN right_tbl ON ...` дефолтный алгоритм `hash` join в ClickHouse **считывает всю правую таблицу в оперативную память** и строит по ней хэш-таблицу, а затем потоково пропускает через неё левую таблицу. Если поставить справа таблицу на 500 млн строк, запрос мгновенно упрется в лимит **`MEMORY_LIMIT_EXCEEDED`**! Для гигантских таблиц включают `join_algorithm = 'partial_merge'` или `'grace_hash'`, сбрасывающие буферы на диск."
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
          "Большая таблица фактов СПРАВА в JOIN",
          "Попытка загрузить миллиарды строк в RAM",
          "Падение с MEMORY_LIMIT_EXCEEDED"
        ],
        [
          "Постоянный JOIN со справочником товаров",
          "Построение Hash Map на каждом запросе",
          "Лишние 3–5 секунд CPU и гигабайты памяти"
        ],
        [
          "Distributed JOIN без GLOBAL",
          "Каждый шард сам качает правую таблицу N раз",
          "Умножение сетевого трафика на число шардов"
        ]
      ],
      "afterRows": [
        [
          "Маленькая таблица СПРАВА в JOIN",
          "Компактная Hash Map в памяти",
          "Быстрое потоковое чтение левой таблицы"
        ],
        [
          "Использование dictGet('products_dict', ...)",
          "Чтение из готового кэша в RAM за O(1)",
          "Ускорение запроса в 30 раз без JOIN"
        ],
        [
          "GLOBAL JOIN в распределенном запросе",
          "Инициатор собирает правую таблицу 1 раз",
          "Защита от сетевого шторма (Read Amplification)"
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
  "seedCode": "CREATE TABLE join_queries (query_id INT, left_rows_m INT, right_rows_m INT, is_dict_candidate INT);\nINSERT INTO join_queries VALUES (1, 5000, 2, 1), (2, 10, 4000, 0), (3, 2000, 1, 1), (4, 800, 600, 0);",
  "initialCode": "SELECT\n  query_id,\n  left_rows_m,\n  right_rows_m,\n  CASE\n    WHEN right_rows_m > left_rows_m THEN 'SWAP_JOIN_SIDES_OOM_RISK'\n    WHEN is_dict_candidate = 1 THEN 'REPLACE_JOIN_WITH_DICTGET'\n    ELSE 'USE_GRACE_HASH_OR_MERGE_JOIN'\n  END AS join_optimization\nFROM join_queries\nORDER BY query_id ASC;",
  "solutionCode": "SELECT\n  query_id,\n  left_rows_m,\n  right_rows_m,\n  CASE\n    WHEN right_rows_m > left_rows_m THEN 'SWAP_JOIN_SIDES_OOM_RISK'\n    WHEN is_dict_candidate = 1 THEN 'REPLACE_JOIN_WITH_DICTGET'\n    ELSE 'USE_GRACE_HASH_OR_MERGE_JOIN'\n  END AS join_optimization\nFROM join_queries\nORDER BY query_id ASC;",
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
    "title": "Инцидент #806: Падение ClickHouse с MEMORY_LIMIT_EXCEEDED на JOIN",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT query_id, left_rows_m, right_rows_m, 'USE_GRACE_HASH_OR_MERGE_JOIN' AS join_optimization FROM join_queries;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  query_id,\n  left_rows_m,\n  right_rows_m,\n  CASE\n    WHEN right_rows_m > left_rows_m THEN 'SWAP_JOIN_SIDES_OOM_RISK'\n    WHEN is_dict_candidate = 1 THEN 'REPLACE_JOIN_WITH_DICTGET'\n    ELSE 'USE_GRACE_HASH_OR_MERGE_JOIN'\n  END AS join_optimization\nFROM join_queries\nORDER BY query_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте ошибку порядка таблиц: WHEN right_rows_m > left_rows_m THEN 'SWAP_JOIN_SIDES_OOM_RISK'.",
    "Проверьте кандидата на словарь: WHEN is_dict_candidate = 1 THEN 'REPLACE_JOIN_WITH_DICTGET'.",
    "Для двух крупных таблиц верните 'USE_GRACE_HASH_OR_MERGE_JOIN' и отсортируйте по query_id ASC."
  ]
};
