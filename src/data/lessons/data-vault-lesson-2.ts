import { Lesson } from '@/types/course';

export const dataVaultLesson2: Lesson = {
  "id": "data-vault-2",
  "moduleSlug": "data-vault",
  "order": 2,
  "title": "Сущности Data Vault: Хабы (Hubs). Бизнес-ключи, суррогатные хэш-ключи (HashKeys: MD5/SHA), метаданные загрузки",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Hub (Хаб)",
      "definition": "Таблица Data Vault, хранящая список уникальных бизнес-ключей сущности, их детерминированные хэш-ключи и метаданные первой фиксации."
    },
    {
      "term": "Hash Key (Хэш-ключ)",
      "definition": "Криптографический хэш (MD5 или SHA-256) от очищенного бизнес-ключа: UPPER(TRIM(business_key)), выступающий первичным ключом."
    },
    {
      "term": "Record Source",
      "definition": "Обязательное техническое метаполе в Data Vault, указывающее на исходную систему или источник происхождения записи."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "hub_products",
      "description": "Хаб уникальных товаров по стандарту Data Vault 2.0",
      "columns": [
        {
          "name": "hk_product",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "product_bk",
          "type": "VARCHAR(64)",
          "keyType": "BK"
        },
        {
          "name": "load_date",
          "type": "TIMESTAMP"
        },
        {
          "name": "record_source",
          "type": "VARCHAR(30)"
        }
      ],
      "sampleRows": [
        {
          "hk_product": "e2fc714c4727ee9395f324cd2e7f331f",
          "product_bk": "SKU-99201",
          "load_date": "2026-11-01 02:00:00",
          "record_source": "ERP_SAP"
        },
        {
          "hk_product": "76d80224611fc919a5d54f0ff9fba446",
          "product_bk": "SKU-99202",
          "load_date": "2026-11-01 02:00:00",
          "record_source": "ERP_SAP"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия Хаба (Hub) в Data Vault 2.0\n\nХаб моделирует **стержневую бизнес-сущность** предприятия: Клиент, Товар, Договор, Банковский счет, Автомобиль.\n\n#### 1. Структура таблицы Хаба (строгий стандарт)\nТаблица Хаба содержит строго 4 элемента:\n1. **`hk_<entity>` (PK):** Суррогатный хэш-ключ (MD5 — 16 байт / 32 hex, либо SHA-256 — 32 байта / 64 hex).\n2. **`<entity>_bk` (BK):** Исходный бизнес-ключ из реального мира.\n3. **`load_date`:** Метка времени первого появления этого бизнес-ключа в хранилище.\n4. **`record_source`:** Имя системы-источника (например, `SAP_ERP_RU`).\n\n#### 2. Золотое правило генерации Hash Key\nПеред вычислением хэша бизнес-ключ обязан пройти **канонизацию**:\n```sql\n-- Правильный расчет хэш-ключа в SQL:\nMD5(UPPER(TRIM(product_code)))\n```\n* Если не сделать `TRIM()`, значения `'SKU-100 '` и `'SKU-100'` дадут разные хэши, и сущность продублируется!\n* Если не сделать `UPPER()`, значения `'sku-100'` и `'SKU-100'` создадут две строки в Хабе.\n\n#### 3. Семантика вставки: Append-Only без обновлений\nВ Хаб записи **только вставляются**. Строки в Хабе **никогда не обновляются и не удаляются**. Если бизнес-ключ уже есть в таблице, он просто игнорируется (`ON CONFLICT DO NOTHING`)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Паспортный стол",
      "content": "Хаб — это картотека в паспортном столе. При рождении гражданина в картотеку вносится запись: номер паспорта (BK), присвоенный уникальный штрихкод (HK), дата выдачи и кем выдан (record_source). Где гражданин живет и сколько зарабатывает — картотеку не волнует."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Влияние канонизации бизнес-ключа на генерацию Hash Key",
        "beforeDescription": "Вычисление хэша без нормализации (грязные ключи)",
        "beforeColumns": [
          "raw_input",
          "hash_function",
          "result_behavior"
        ],
        "beforeRows": [
          [
            "'  ABC-01 '",
            "MD5(raw_input)",
            "Generates false unique HK"
          ],
          [
            "'abc-01'",
            "MD5(raw_input)",
            "Different HK than uppercase"
          ],
          [
            "NULL in key",
            "MD5(raw_input)",
            "Null hash collision disaster"
          ]
        ],
        "afterDescription": "Стандартизированная канонизация Data Vault 2.0",
        "afterColumns": [
          "raw_input",
          "hash_function",
          "result_behavior"
        ],
        "afterRows": [
          [
            "'  ABC-01 '",
            "MD5(UPPER(TRIM(input)))",
            "Identical hash guaranteed"
          ],
          [
            "'abc-01'",
            "MD5(UPPER(TRIM(input)))",
            "Matches canonical 'ABC-01'"
          ],
          [
            "Missing key",
            "COALESCE(input, '-1')",
            "Predictable zero-key hash"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Разные алгоритмы хэширования между пайплайнами",
      "content": "В Airflow один инженер считал хэши через `hashlib.md5(x.strip().encode())`, а другой в Spark забыл вызвать `.strip()`. В результате заказы не смогли соединиться со своими клиентами в витрине, потеряв 100% данных при INNER JOIN."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Какова вероятность коллизии MD5 в Data Vault и почему многие компании до сих пор используют MD5 вместо SHA-256?",
      "content": "**Ответ:** Пространство MD5 составляет $2^{128} \\approx 3.4 \\times 10^{38}$ вариантов. Для возникновения вероятности коллизии в 1 к миллиарду требуется сгенерировать более $2.6 \\times 10^{14}$ уникальных ключей. MD5 занимает 16 байт против 32 байт у SHA-256, экономя 50% RAM в индексах и памяти джойнов, поэтому в хранилищах до 100 млрд строк MD5 остается стандартом."
    }
  ],
  "taskDescription": "Смоделируйте наполнение Хаба товаров 'hub_products':\n1. Создайте таблицу 'hub_products' (hk_product VARCHAR(32) PRIMARY KEY, product_bk VARCHAR(50) NOT NULL UNIQUE, load_dts VARCHAR(20) NOT NULL, rec_source VARCHAR(30) NOT NULL).\n2. Вставьте уникальные товары, исключая дубликаты бизнес-ключа:\n   (1) 'PRD_1001', дата '2026-11-01 00:00:00', источник 'CATALOG_DB', хэш '9b70cd90485b0ed6ec08a204650627f8'\n   (2) 'PRD_1002', дата '2026-11-01 00:00:00', источник 'CATALOG_DB', хэш '2a3c714c4727ee9395f324cd2e7f331a'\n3. Попробуйте повторно вставить 'PRD_1001' с другим хэшем через 'INSERT ... ON CONFLICT (product_bk) DO NOTHING', убедившись в идемпотентности.\n4. Выведите все записи Хаба, отсортированные по 'product_bk ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте hub_products\n-- 2. Вставьте записи\n-- 3. Выведите данные",
  "solutionCode": "CREATE TABLE hub_products (\n    hk_product VARCHAR(32) PRIMARY KEY,\n    product_bk VARCHAR(50) NOT NULL UNIQUE,\n    load_dts VARCHAR(20) NOT NULL,\n    rec_source VARCHAR(30) NOT NULL\n);\n\nINSERT INTO hub_products VALUES\n('9b70cd90485b0ed6ec08a204650627f8', 'PRD_1001', '2026-11-01 00:00:00', 'CATALOG_DB'),\n('2a3c714c4727ee9395f324cd2e7f331a', 'PRD_1002', '2026-11-01 00:00:00', 'CATALOG_DB');\n\nINSERT INTO hub_products VALUES\n('ffffffffffffffffffffffffffffffff', 'PRD_1001', '2026-11-01 01:00:00', 'CATALOG_DB')\nON CONFLICT (product_bk) DO NOTHING;\n\nSELECT hk_product, product_bk, load_dts, rec_source FROM hub_products ORDER BY product_bk ASC;",
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
    "title": "Инцидент #502: Дублирование сущностей в Хабе из-за отсутствия канонизации пробелов",
    "incidentDescription": "В Хаб попали строки 'PRD_1001' и ' PRD_1001 ', создав два разных хэш-ключа на один и тот же товар.",
    "buggyCode": "INSERT INTO hub_products VALUES ('hash1', 'PRD_1001'), ('hash2', ' PRD_1001 ');",
    "fixHint": "Используйте UPPER(TRIM(bk)) перед хэшированием и уникальное ограничение на product_bk.",
    "solutionCode": "INSERT INTO hub_products VALUES ('hash1', 'PRD_1001', '2026-11-01', 'CATALOG');",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте hub_products с ограничением UNIQUE на product_bk.",
    "Используйте конструкцию ON CONFLICT (product_bk) DO NOTHING для безопасной идемпотентной вставки.",
    "Отсортируйте итоговый результат по product_bk ASC;."
  ]
};
