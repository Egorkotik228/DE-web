import { Lesson } from '@/types/course';

export const dataVaultLesson1: Lesson = {
  "id": "data-vault-1",
  "moduleSlug": "data-vault",
  "order": 1,
  "title": "Философия Data Vault 2.0: Зачем нужна методология, разделение бизнес-логики и технологической структуры, гибкость при изменении источников",
  "estimatedMinutes": 30,
  "glossaryTerms": [
    {
      "term": "Data Vault 2.0",
      "definition": "Комплексная архитектурная методология Дэна Линстедта, сочетающая моделирование (Hub, Link, Sat), параллельную загрузку и NoSQL/Hadoop масштабируемость."
    },
    {
      "term": "Raw Vault",
      "definition": "Слой сырых историзованных данных в модели Data Vault, в который данные загружаются без применения разрушающих бизнес-правил трансформирования."
    },
    {
      "term": "Business Vault",
      "definition": "Обогащенный слой поверх Raw Vault, где применяются бизнес-вычисления, расчетные метрики и консолидация сложных правил."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "hub_account",
      "description": "Хаб учетных записей: фиксация бизнес-сущности без контекстных атрибутов",
      "columns": [
        {
          "name": "hk_account",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "account_number",
          "type": "VARCHAR(50)",
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
          "hk_account": "4a8a08f09d37b73795649038408b5f33",
          "account_number": "ACC-77401",
          "load_date": "2026-11-01 00:00:00",
          "record_source": "CORE_BANKING"
        },
        {
          "hk_account": "d41d8cd98f00b204e9800998ecf8427e",
          "account_number": "ACC-77402",
          "load_date": "2026-11-01 00:00:00",
          "record_source": "CORE_BANKING"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Почему классические DWH (3NF и Кимбалл) дают сбой в больших корпорациях?\n\nВ крупных компаниях источники меняются непрерывно: подключаются новые CRM, меняются структуры ERP, сливаются дочерние банки. В классических архитектурах это вызывает лавину проблем:\n\n1. **Хрупкость 3NF (Инмон):** Добавление нового источника требует сложного рефакторинга центральной реляционной модели и переписывания десятков существующих связей.\n2. **Уязвимость Звезды (Кимбалл):** Изменение гранулярности или формата первичных ключей в источнике ломает измерения и факты.\n\n#### Ответ Дэна Линстедта: Архитектура Data Vault 2.0\nData Vault разделяет моделирование на три изолированных строительных блока:\n* **Хабы (Hubs):** Хранят только *бизнес-ключ* сущности (ИНН, VIN, номер счета). Не содержат никаких описательных атрибутов!\n* **Линки (Links):** Хранят только *связи* между сущностями (клиент оформил заказ). Отношения всегда моделируются как $M:N$.\n* **Сателлиты (Satellites):** Хранят *описательный контекст* и историю изменений во времени.\n\n#### Главное преимущество: Независимость от источников\nЕсли завтра появится новая CRM с 20 новыми полями клиента, существующие Хабы и Линки **вообще не меняются**! Вы просто подключаете рядом новый сателлит `sat_customer_new_crm`. Ни один существующий пайплайн не пострадает."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Конструктор LEGO и электрический щиток",
      "content": "Data Vault похож на современный модульный электрощиток. Хаб — это посадочное гнездо на DIN-рейке. Линк — проводка между гнездами. Сателлиты — сменные модули автоматов. Если вам нужно добавить новый датчик умного дома, вы просто защелкиваете новый модуль на рейку, не разбирая весь щиток."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение архитектурных методологий DWH",
        "beforeDescription": "Классические архитектуры (3NF / Star)",
        "beforeColumns": [
          "dwh_architecture",
          "source_schema_change",
          "loading_dependency"
        ],
        "beforeRows": [
          [
            "Inmon 3NF",
            "Requires complex schema refactoring",
            "Sequential ETL chains"
          ],
          [
            "Kimball Star",
            "Breaks dimensions on new keys",
            "Must lookup keys before fact insert"
          ],
          [
            "Tight coupling",
            "High regression testing overhead",
            "Single point of pipeline failure"
          ]
        ],
        "afterDescription": "Методология Data Vault 2.0",
        "afterColumns": [
          "dwh_architecture",
          "source_schema_change",
          "loading_dependency"
        ],
        "afterRows": [
          [
            "Data Vault 2.0",
            "Zero-impact schema expansion",
            "100% parallel loading"
          ],
          [
            "Hub/Link/Sat split",
            "Add new satellite without refactor",
            "HashKeys enable async ingestion"
          ],
          [
            "Decoupled layers",
            "Business logic in Business Vault",
            "Scales to thousands of sources"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Смешение бизнес-правил в слое Raw Vault",
      "content": "Инженер применил расчет скидки и очистку статусов прямо при загрузке в Raw Vault. Спустя 4 месяца бизнес изменил формулу скидки, и данные за прошлый квартал стало невозможно восстановить. Правило Data Vault: в Raw Vault данные идут строго как в источнике, любые расчеты — только в Business Vault!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему в Data Vault 2.0 отказались от автоинкрементных суррогатных ключей в пользу Hash Keys?",
      "content": "**Ответ:** Автоинкрементные ключи (SERIAL/IDENTITY) требуют предварительного обращения к таблице или блокировки сиквенса в СУБД, создавая узкое бутылочное горлышко. Детерминированный хэш (MD5/SHA) вычисляется на клиенте/воркере ETL независимо, позволяя загружать Хабы, Линки и Сателлиты **полностью параллельно** без блокировок."
    }
  ],
  "taskDescription": "Смоделируйте базовую структуру сущности Data Vault для клиентов:\n1. Создайте Хаб 'hub_clients' (hk_client VARCHAR(32) PRIMARY KEY, client_bk VARCHAR(50) NOT NULL UNIQUE, load_dts VARCHAR(20) NOT NULL, rec_source VARCHAR(30) NOT NULL).\n2. Создайте Сателлит 'sat_clients' (hk_client VARCHAR(32) NOT NULL, load_dts VARCHAR(20) NOT NULL, full_name VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL, rec_source VARCHAR(30) NOT NULL, PRIMARY KEY (hk_client, load_dts)).\n3. Вставьте клиента с хэш-ключом 'c4ca4238a0b923820dcc509a6f75849b', бизнес-ключом 'CL_101', именем 'Иван Иванов', email 'ivan@corp.ru', датой '2026-11-01 10:00:00', источником 'CRM_SOURCE'.\n4. Выведите данные, соединив Хаб и Сателлит по 'hk_client'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте hub_clients и sat_clients\n-- 2. Вставьте тестовые записи\n-- 3. Выведите данные через JOIN по hk_client",
  "solutionCode": "CREATE TABLE hub_clients (\n    hk_client VARCHAR(32) PRIMARY KEY,\n    client_bk VARCHAR(50) NOT NULL UNIQUE,\n    load_dts VARCHAR(20) NOT NULL,\n    rec_source VARCHAR(30) NOT NULL\n);\n\nCREATE TABLE sat_clients (\n    hk_client VARCHAR(32) NOT NULL,\n    load_dts VARCHAR(20) NOT NULL,\n    full_name VARCHAR(100) NOT NULL,\n    email VARCHAR(100) NOT NULL,\n    rec_source VARCHAR(30) NOT NULL,\n    PRIMARY KEY (hk_client, load_dts)\n);\n\nINSERT INTO hub_clients VALUES ('c4ca4238a0b923820dcc509a6f75849b', 'CL_101', '2026-11-01 10:00:00', 'CRM_SOURCE');\nINSERT INTO sat_clients VALUES ('c4ca4238a0b923820dcc509a6f75849b', '2026-11-01 10:00:00', 'Иван Иванов', 'ivan@corp.ru', 'CRM_SOURCE');\n\nSELECT h.client_bk, s.full_name, s.email, h.load_dts, h.rec_source\nFROM hub_clients h\nJOIN sat_clients s ON h.hk_client = s.hk_client;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 1,
    "expectedColumns": [
      "client_bk",
      "full_name",
      "email",
      "load_dts",
      "rec_source"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #501: Помещение атрибута в Хаб сломало архитектуру Data Vault",
    "incidentDescription": "Разработчик добавил поле email прямо в таблицу hub_clients. При смене email пришлось мутировать Хаб, что нарушило неизменяемость бизнес-ключей.",
    "buggyCode": "CREATE TABLE hub_clients (hk VARCHAR(32) PRIMARY KEY, client_bk VARCHAR(50), email VARCHAR(100));",
    "fixHint": "Хаб хранит ТОЛЬКО бизнес-ключи и метаданные. Все описательные атрибуты должны быть в Сателлите.",
    "solutionCode": "CREATE TABLE hub_clients (hk VARCHAR(32) PRIMARY KEY, client_bk VARCHAR(50), load_dts VARCHAR(20), rec_src VARCHAR(20));\nCREATE TABLE sat_clients (hk VARCHAR(32), load_dts VARCHAR(20), email VARCHAR(100), PRIMARY KEY (hk, load_dts));",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицы hub_clients и sat_clients с указанными первичными ключами.",
    "Вставьте строки с переданными значениями хэш-ключа.",
    "Выполните выборку SELECT h.client_bk, s.full_name, s.email, h.load_dts, h.rec_source FROM hub_clients h JOIN sat_clients s ON h.hk_client = s.hk_client;."
  ]
};
