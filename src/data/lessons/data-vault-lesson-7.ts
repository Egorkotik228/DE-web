import { Lesson } from '@/types/course';

export const dataVaultLesson7: Lesson = {
  "id": "data-vault-7",
  "moduleSlug": "data-vault",
  "order": 7,
  "title": "Архитектура загрузки Data Vault: параллельность, идемпотентность и Set-Based Loading",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Set-Based Loading",
      "definition": "Пакетная реляционная обработка множеств данных средствами SQL/движка базы данных без использования построчных курсоров и циклов."
    },
    {
      "term": "Идемпотентность (Idempotence)",
      "definition": "Свойство операции давать одинаковый результат при многократном повторении (повторный запуск ETL-пайплайна не дублирует данные и не падает с ошибкой)."
    },
    {
      "term": "Anti-Join (LEFT JOIN ... IS NULL)",
      "definition": "Техника реляционной фильтрации, позволяющая вернуть только те строки левой таблицы, для которых отсутствует соответствие в правой таблице."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "hub_product",
      "description": "Хаб товаров: хранение уникальных бизнес-ключей товаров",
      "columns": [
        {
          "name": "hk_product",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "product_bk",
          "type": "VARCHAR(50)",
          "keyType": "BK"
        },
        {
          "name": "load_dts",
          "type": "TIMESTAMP"
        },
        {
          "name": "rec_source",
          "type": "VARCHAR(30)"
        }
      ],
      "sampleRows": [
        {
          "hk_product": "p1111111111111111111111111111111",
          "product_bk": "PROD-100",
          "load_dts": "2026-11-01 00:00:00",
          "rec_source": "ERP_SYSTEM"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура загрузки Data Vault: параллельность и идемпотентность\n\nГлавная суперсила Data Vault 2.0 перед классическими хранилищами — **полная независимость потоков загрузки**:\n1. Все хэш-ключи рассчитываются на этапе Staging в памяти воркеров.\n2. Хаб клиентов, Хаб заказов, Линк между ними и соответствующие Сателлиты могут загружаться **одновременно в параллельных ETL-потоках**.\n3. Отсутствуют внешние ключи (Foreign Keys) на уровне физических таблиц в DWH, что исключает взаимоблокировки (deadlocks).\n\n#### Паттерн Set-Based загрузки Хаба\nЗагрузка в Хаб должна быть абсолютно идемпотентной:\n* Выбираются уникальные бизнес-ключи из стейджинга (`DISTINCT`).\n* Исключаются ключи, уже присутствующие в целевом Хабе (`LEFT JOIN ... WHERE hub.hk IS NULL`).\n* Новые строки вставляются единым пакетом (`INSERT INTO ...`)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Бригада строителей без очередей за номерами",
      "content": "В старых DWH загрузка похожа на очередь за талонами в поликлинике: дочерняя таблица не может записаться, пока родительская таблица не сгенерирует автоинкрементный ID. В Data Vault 2.0 каждый строитель заранее знает точный хэш-номер кирпича и кладет свою часть стены одновременно с остальными."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение архитектур загрузки данных",
        "beforeDescription": "Последовательная загрузка с автоинкрементными суррогатами (DV 1.0 / Kimball)",
        "beforeColumns": [
          "pipeline_stage",
          "dependency",
          "concurrency"
        ],
        "beforeRows": [
          [
            "Load Dimensions / Hubs",
            "Generates auto-increment ID",
            "Single worker sequential"
          ],
          [
            "Wait for IDs completion",
            "Lookup generated integer keys",
            "Bottleneck lock"
          ],
          [
            "Load Facts / Links",
            "Depends on parent surrogate IDs",
            "Blocked until dim finishes"
          ]
        ],
        "afterDescription": "Параллельная Set-Based загрузка на хэшах (Data Vault 2.0)",
        "afterColumns": [
          "pipeline_stage",
          "dependency",
          "concurrency"
        ],
        "afterRows": [
          [
            "Stage Hashing",
            "Calculate MD5/SHA256 in memory",
            "100% parallel across nodes"
          ],
          [
            "Load Hubs & Links",
            "Independent Set-Based Inserts",
            "Zero lock contention"
          ],
          [
            "Load Satellites",
            "Independent Delta Inserts on HashDiff",
            "Zero lock contention"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Построчный MERGE/CURSOR вместо Set-Based вставки",
      "content": "ETL-разработчик реализовал загрузку Хаба через цикл `FOR EACH ROW` с `MERGE`. На объеме в 10 млн строк ночной пайплайн выполнялся 14 часов вместо 40 секунд, вызвав таймаут ночных отчетов."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему в Data Vault 2.0 возможна параллельная загрузка Хабов и Линков?",
      "content": "**Ответ:** Потому что первичные ключи в DV 2.0 являются детерминированными хэшами (MD5/SHA), вычисляемыми исключительно на основе бизнес-ключей источника. Линк может рассчитать хэши связываемых сущностей в памяти еще до того, как они физически запишутся в Хабы."
    }
  ],
  "taskDescription": "Смоделируйте идемпотентную пакетную загрузку в Хаб с отсечением дубликатов:\n1. Создайте таблицу Хаба 'hub_products' (hk_product VARCHAR(32) PRIMARY KEY, product_bk VARCHAR(50) NOT NULL UNIQUE, load_dts VARCHAR(20) NOT NULL, rec_source VARCHAR(30) NOT NULL).\n2. Создайте стейджинг-таблицу 'stg_products' (product_bk VARCHAR(50) NOT NULL, load_dts VARCHAR(20) NOT NULL, rec_source VARCHAR(30) NOT NULL).\n3. Вставьте в 'hub_products' уже существующий товар: hk_product = 'hk_p1', product_bk = 'P-100', load_dts = '2026-11-01 00:00:00', rec_source = 'ERP'.\n4. Вставьте в 'stg_products' две записи: 'P-100' (уже есть в хабе) и 'P-200' (новый товар), обе с load_dts = '2026-11-01 10:00:00' и rec_source = 'ERP'.\n5. Выполните запрос вставки НОВЫХ товаров в 'hub_products' через LEFT JOIN ... WHERE hub.hk_product IS NULL (используя 'hk_p2' в качестве hk_product для P-200).\n6. Выведите все записи из 'hub_products', отсортированные по 'product_bk ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте таблицы hub_products и stg_products\n-- 2. Вставьте тестовые строки\n-- 3. Выполните идемпотентную вставку новых товаров\n-- 4. Выведите результат из hub_products",
  "solutionCode": "CREATE TABLE hub_products (\n    hk_product VARCHAR(32) PRIMARY KEY,\n    product_bk VARCHAR(50) NOT NULL UNIQUE,\n    load_dts VARCHAR(20) NOT NULL,\n    rec_source VARCHAR(30) NOT NULL\n);\n\nCREATE TABLE stg_products (\n    product_bk VARCHAR(50) NOT NULL,\n    load_dts VARCHAR(20) NOT NULL,\n    rec_source VARCHAR(30) NOT NULL\n);\n\nINSERT INTO hub_products VALUES ('hk_p1', 'P-100', '2026-11-01 00:00:00', 'ERP');\nINSERT INTO stg_products VALUES\n('P-100', '2026-11-01 10:00:00', 'ERP'),\n('P-200', '2026-11-01 10:00:00', 'ERP');\n\nINSERT INTO hub_products (hk_product, product_bk, load_dts, rec_source)\nSELECT 'hk_p2', s.product_bk, s.load_dts, s.rec_source\nFROM stg_products s\nLEFT JOIN hub_products h ON s.product_bk = h.product_bk\nWHERE h.hk_product IS NULL;\n\nSELECT hk_product, product_bk, load_dts, rec_source\nFROM hub_products\nORDER BY product_bk ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 2,
    "expectedColumns": [
      "hk_product",
      "product_bk",
      "load_dts",
      "rec_source"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #507: Дублирование ключей при повторном запуске DAG в Airflow",
    "incidentDescription": "ETL пайплайн упал на полпути и был перезапущен. Прямой INSERT без фильтрации упал с ошибкой Unique Violation.",
    "buggyCode": "INSERT INTO hub_products SELECT hk, bk, dts, src FROM stg_products;",
    "fixHint": "Используйте LEFT JOIN с целевым хабом и условие WHERE target.hk IS NULL для идемпотентности.",
    "solutionCode": "INSERT INTO hub_products SELECT s.hk, s.bk, s.dts, s.src FROM stg_products s LEFT JOIN hub_products h ON s.hk = h.hk WHERE h.hk IS NULL;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте hub_products и stg_products с указанными структурами.",
    "Используйте INSERT INTO hub_products ... SELECT ... FROM stg_products s LEFT JOIN hub_products h ON s.product_bk = h.product_bk WHERE h.hk_product IS NULL;.",
    "Выведите SELECT * FROM hub_products ORDER BY product_bk ASC;."
  ]
};
