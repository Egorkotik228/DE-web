import { Lesson } from '@/types/course';

export const clickhouseLesson1: Lesson = {
  "id": "clickhouse-1",
  "moduleSlug": "clickhouse",
  "order": 1,
  "title": "Архитектура ClickHouse с нуля: Колоночное хранение, SIMD-векторизация и батчевая вставка",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Data Part (Кусок данных)",
      "definition": "Неизменяемая директория на диске, создаваемая при каждом INSERT и содержащая сжатые колонки и индекс."
    },
    {
      "term": "SIMD Векторизация",
      "definition": "Выполнение одной процессорной инструкции сразу над массивом значений из колоночного буфера в кэше CPU."
    },
    {
      "term": "Too many parts",
      "definition": "Защитная ошибка ClickHouse, блокирующая новые вставки, если фоновые слияния не успевают за потоком мелких INSERT."
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
      "content": "### Колоночная физика и векторизация SIMD\nВ отличие от строчных СУБД (PostgreSQL), где вся строка лежит в 8-КБ странице, **ClickHouse** хранит каждую колонку в отдельном сжатом файле `.bin`. Когда вы выполняете `SELECT sum(amount) FROM events WHERE dt = today()`, движок читает с диска только 2 колонки из 150. Обработка идет пачками (векторами) напрямую в регистрах процессора (**SIMD — Single Instruction, Multiple Data**), а однотипные данные в колонке сжимаются алгоритмами **LZ4** или **ZSTD** в 5–15 раз."
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
          "Вставка по 1 строке в цикле",
          "Создание 500 мелких Parts в секунду",
          "Ошибка Too many parts (300)"
        ],
        [
          "SELECT * FROM wide_table",
          "Чтение и распаковка всех 120 колонок",
          "Деградация скорости в 50 раз"
        ],
        [
          "Частые ALTER TABLE UPDATE",
          "Тяжелая фоновая перезапись Parts",
          "100% утилизация диска I/O"
        ]
      ],
      "afterRows": [
        [
          "Батчи по 50 000 строк / async_insert=1",
          "1–2 крупных куска в секунду",
          "Стабильная вставка миллионов строк/с"
        ],
        [
          "Выборка только нужных колонок",
          "Чтение только 2–3 файлов .bin",
          "Ответ за 20 миллисекунд"
        ],
        [
          "Append-only + ReplacingMergeTree",
          "Версионирование без мутаций",
          "Нулевая нагрузка на перезапись"
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
  "seedCode": "CREATE TABLE ch_inserts (batch_id INT, rows_in_batch INT, inserts_per_sec INT);\nINSERT INTO ch_inserts VALUES (1, 1, 800), (2, 50000, 2), (3, 5, 450), (4, 100000, 1);",
  "initialCode": "SELECT\n  batch_id,\n  rows_in_batch,\n  inserts_per_sec,\n  CASE\n    WHEN rows_in_batch < 1000 AND inserts_per_sec > 100 THEN 'TOO_MANY_PARTS_RISK'\n    ELSE 'OPTIMAL_BATCH_SIZE'\n  END AS insert_health\nFROM ch_inserts\nORDER BY batch_id ASC;",
  "solutionCode": "SELECT\n  batch_id,\n  rows_in_batch,\n  inserts_per_sec,\n  CASE\n    WHEN rows_in_batch < 1000 AND inserts_per_sec > 100 THEN 'TOO_MANY_PARTS_RISK'\n    ELSE 'OPTIMAL_BATCH_SIZE'\n  END AS insert_health\nFROM ch_inserts\nORDER BY batch_id ASC;",
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
    "title": "Инцидент #801: Падение записи с ошибкой Too many parts (300)",
    "incidentDescription": "Из-за отключенного авто-бродкаста джойн 5 млрд кликов со справочником регионов выполнялся через SortMergeJoin, пересылая 3 ТБ по сети и вызывая таймауты.",
    "buggyCode": "SELECT batch_id, rows_in_batch, inserts_per_sec, 'OPTIMAL_BATCH_SIZE' AS insert_health FROM ch_inserts;",
    "fixHint": "Оберните малый датафрейм regions в F.broadcast() для мгновенного выполнения без сетевого Shuffle.",
    "solutionCode": "SELECT\n  batch_id,\n  rows_in_batch,\n  inserts_per_sec,\n  CASE\n    WHEN rows_in_batch < 1000 AND inserts_per_sec > 100 THEN 'TOO_MANY_PARTS_RISK'\n    ELSE 'OPTIMAL_BATCH_SIZE'\n  END AS insert_health\nFROM ch_inserts\nORDER BY batch_id ASC;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Проверьте опасный режим вставки: WHEN rows_in_batch < 1000 AND inserts_per_sec > 100.",
    "Для мелких частых вставок верните 'TOO_MANY_PARTS_RISK', иначе 'OPTIMAL_BATCH_SIZE'.",
    "Отсортируйте результат по batch_id ASC."
  ]
};
