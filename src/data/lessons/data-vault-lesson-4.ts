import { Lesson } from '@/types/course';

export const dataVaultLesson4: Lesson = {
  "id": "data-vault-4",
  "moduleSlug": "data-vault",
  "order": 4,
  "title": "Атрибуты и история: Сателлиты (Satellites). HashDiff для отслеживания изменений, версионирование во времени, Multi-active Satellites",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Satellite (Сателлит)",
      "definition": "Таблица Data Vault, хранящая описательные контекстные атрибуты Хаба или Линка и всю историю их изменения во времени."
    },
    {
      "term": "HashDiff (Хэш разницы)",
      "definition": "Детерминированный хэш (MD5/SHA) от конкатенации всех описательных атрибутов строки для мгновенного выявления изменений (CDC) без сравнения десятков колонок."
    },
    {
      "term": "Multi-active Satellite",
      "definition": "Сателлит, позволяющий хранить несколько активных записей на один бизнес-ключ на одну дату (например, список из нескольких номеров телефонов клиента)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "sat_customer_profile",
      "description": "Сателлит профиля клиента с HashDiff для контроля версий",
      "columns": [
        {
          "name": "hk_customer",
          "type": "CHAR(32)",
          "keyType": "FK"
        },
        {
          "name": "load_date",
          "type": "TIMESTAMP",
          "keyType": "PK"
        },
        {
          "name": "hash_diff",
          "type": "CHAR(32)"
        },
        {
          "name": "city",
          "type": "VARCHAR(50)"
        },
        {
          "name": "phone",
          "type": "VARCHAR(20)"
        },
        {
          "name": "record_source",
          "type": "VARCHAR(30)"
        }
      ],
      "sampleRows": [
        {
          "hk_customer": "c4ca4238a0b923820dcc509a6f75849b",
          "load_date": "2026-11-01 00:00:00",
          "hash_diff": "9e107d9d372bb6826bd81d3542a419d6",
          "city": "Самара",
          "phone": "+79991112233",
          "record_source": "CRM"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия Сателлита (Satellite) в Data Vault 2.0\n\nСателлит — это единственный тип таблиц в Data Vault, который **содержит описательные атрибуты** и хранит **всю историю изменений во времени**.\n\n#### 1. Структура таблицы Сателлита\n* **`hk_<parent>`:** Хэш-ключ родительского Хаба или Линка (составной PK часть 1).\n* **`load_date`:** Метка времени фиксации версии (составной PK часть 2).\n* **`hash_diff`:** Хэш от конкатенации всех описательных колонок строки.\n* **Описательные атрибуты:** `first_name`, `city`, `phone`, `status`...\n* **`record_source`:** Система-источник.\n\n#### 2. Магия HashDiff при инкрементальной загрузке (CDC)\nПредставьте таблицу клиента из 40 атрибутов. Как ETL-пайплайну понять, изменилось ли хоть одно поле у клиента среди 10 миллионов строк?\n* **В 3NF / Кимбалле:** Приходится писать гигантское условие сравнения `WHERE t.c1 != s.c1 OR t.c2 != s.c2 OR ...` (тяжело для СУБД, уязвимо к NULL).\n* **В Data Vault 2.0:** Сравнивается ровно одно поле!\n```sql\n-- Мгновенный поиск измененных строк:\nWHERE current_sat.hash_diff != incoming.hash_diff\n```\nЕсли `hash_diff` совпадает — строка не изменилась, запись в Сателлит не делается!\n\n#### 3. Разделение сателлитов по скорости изменения и источникам\nНикогда не сваливайте все 60 атрибутов клиента в один сателлит! Они разделяются:\n* `sat_customer_core` — редко меняющиеся паспортные данные (SCD2).\n* `sat_customer_activity` — часто меняющиеся счетчики посещений.\n* `sat_customer_crm_b` — поля, приходящие из внешней системы маркетинга."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Контрольная сумма файла (MD5 Checksum)",
      "content": "HashDiff — это контрольная сумма файла при скачивании из интернета. Чтобы убедиться, что гигабайтный файл скачался без ошибок, вы не сверяете каждый байт вручную, а сравниваете одну 32-значную строчку хэша. Если хэш совпал — данные идентичны."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение методов выявления изменений (Change Data Capture)",
        "beforeDescription": "Поколоночное сравнение атрибутов в SQL",
        "beforeColumns": [
          "cdc_approach",
          "comparison_cost",
          "null_handling_risk"
        ],
        "beforeRows": [
          [
            "Compare 40 columns in WHERE",
            "High CPU overhead on join",
            "NULL != NULL trap breaks CDC"
          ],
          [
            "Row-by-row cursors",
            "Unacceptable performance on big data",
            "Deadlocks & lock contention"
          ],
          [
            "Monolithic wide dimension",
            "Rewrites 40 cols on 1 col change",
            "Massive storage bloat"
          ]
        ],
        "afterDescription": "Векторное сравнение через HashDiff",
        "afterColumns": [
          "cdc_approach",
          "comparison_cost",
          "null_handling_risk"
        ],
        "afterRows": [
          [
            "Single hash_diff check",
            "Instant single-column B-Tree comparison",
            "Deterministic NULL normalization"
          ],
          [
            "Set-based insert only",
            "Zero UPDATE locks in database",
            "Linear scalability to billions"
          ],
          [
            "Split satellites by frequency",
            "Isolates fast and slow attributes",
            "Minimal storage footprint"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Несогласованный порядок колонок в HashDiff",
      "content": "При расчете HashDiff в пайплайне переставили колонки местами: `hash(city + phone)` вместо `hash(phone + city)`. Вся таблица в 50 млн клиентов посчиталась «измененной», и в ночном запуске в сателлит записались 50 миллионов ложных дубликатов."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в сателлитах Data Vault нет колонки load_end_date (valid_to) и флага is_current?",
      "content": "**Ответ:** В классическом Raw Vault сателлиты являются **строго Append-only** (только вставка). Обновление `load_end_date` в предыдущей строке требует `UPDATE`, что вызывает блокировки страниц (Row/Page Locks), распухание (Bloat) и препятствует параллельной потоковой загрузке. Актуальная версия определяется на лету аналитическим окном `LEAD(load_date) OVER (...)` либо через вспомогательные **PIT-таблицы**."
    }
  ],
  "taskDescription": "Смоделируйте отслеживание версий в Сателлите клиентов с использованием HashDiff:\n1. Создайте Сателлит 'sat_clients' (hk_client VARCHAR(32) NOT NULL, load_dts VARCHAR(20) NOT NULL, hash_diff VARCHAR(32) NOT NULL, city VARCHAR(50) NOT NULL, phone VARCHAR(20) NOT NULL, PRIMARY KEY (hk_client, load_dts)).\n2. Вставьте первоначальное состояние клиента: hk_client = 'hk_1', load_dts = '2026-11-01 10:00:00', hash_diff = 'diff_v1', city = 'Казань', phone = '+79991112233'.\n3. Клиент сменил телефон на '+79994445566'. Вставьте новую версию с load_dts = '2026-11-01 15:00:00' и hash_diff = 'diff_v2'.\n4. Напишите запрос, выводящий все версии клиента 'hk_1', отсортированные по 'load_dts DESC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте sat_clients с составным первичным ключом\n-- 2. Вставьте две версии с разными hash_diff\n-- 3. Выведите историю изменений",
  "solutionCode": "CREATE TABLE sat_clients (\n    hk_client VARCHAR(32) NOT NULL,\n    load_dts VARCHAR(20) NOT NULL,\n    hash_diff VARCHAR(32) NOT NULL,\n    city VARCHAR(50) NOT NULL,\n    phone VARCHAR(20) NOT NULL,\n    PRIMARY KEY (hk_client, load_dts)\n);\n\nINSERT INTO sat_clients VALUES\n('hk_1', '2026-11-01 10:00:00', 'diff_v1', 'Казань', '+79991112233'),\n('hk_1', '2026-11-01 15:00:00', 'diff_v2', 'Казань', '+79994445566');\n\nSELECT hk_client, load_dts, hash_diff, city, phone FROM sat_clients WHERE hk_client = 'hk_1' ORDER BY load_dts DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 2,
    "expectedColumns": [
      "hk_client",
      "load_dts",
      "hash_diff",
      "city",
      "phone"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #504: Дублирование строк сателлита при неизменившихся данных",
    "incidentDescription": "ETL вставил новую строку в сателлит при совпадении hash_diff, раздув таблицу на 40% ложными дублями.",
    "buggyCode": "INSERT INTO sat_clients SELECT * FROM incoming_stage;",
    "fixHint": "Вставляйте запись только в том случае, если incoming.hash_diff != current_sat.hash_diff.",
    "solutionCode": "INSERT INTO sat_clients SELECT s.* FROM incoming_stage s LEFT JOIN current_sat c ON s.hk = c.hk WHERE c.hash_diff IS NULL OR s.hash_diff != c.hash_diff;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте sat_clients с составным PRIMARY KEY (hk_client, load_dts).",
    "Вставьте две строки с датами '2026-11-01 10:00:00' и '2026-11-01 15:00:00'.",
    "Отсортируйте выборку по load_dts DESC;."
  ]
};
