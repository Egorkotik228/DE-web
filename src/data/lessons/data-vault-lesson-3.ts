import { Lesson } from '@/types/course';

export const dataVaultLesson3: Lesson = {
  "id": "data-vault-3",
  "moduleSlug": "data-vault",
  "order": 3,
  "title": "Связи в Data Vault: Линки (Links). Моделирование отношений M:N, составные хэш-ключи связей, Same-As Links",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Link (Линк)",
      "definition": "Таблица Data Vault, моделирующая транзакцию или связь между двумя и более Хабами. Всегда моделируется как связь многие-ко-многим (M:N)."
    },
    {
      "term": "Link Hash Key",
      "definition": "Суррогатный первичный ключ связи, вычисляемый как хэш от конкатенации канонизированных бизнес-ключей всех связанных Хабов."
    },
    {
      "term": "Same-As Link (SAL)",
      "definition": "Специальный линк между двумя записями одного Хаба, фиксирующий эквивалентность бизнес-ключей из разных систем (Master Data Management)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "lnk_customer_order",
      "description": "Линк связывания клиентов и заказов",
      "columns": [
        {
          "name": "hk_lnk_customer_order",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "hk_customer",
          "type": "CHAR(32)",
          "keyType": "FK"
        },
        {
          "name": "hk_order",
          "type": "CHAR(32)",
          "keyType": "FK"
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
          "hk_lnk_customer_order": "7f8b9a1c2d3e4f5061728394a5b6c7d8",
          "hk_customer": "c4ca4238a0b923820dcc509a6f75849b",
          "hk_order": "c81e728d9d4c2f636f067f89cc14862c",
          "load_date": "2026-11-01 03:00:00",
          "record_source": "ORDER_SERVICE"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия Линка (Link) в Data Vault 2.0\n\nЛинк представляет собой **ассоциацию, транзакцию или отношение** между бизнес-сущностями. Например: «Клиент оформил Заказ», «Сотрудник прикреплен к Отделу», «Товар лежит на Складе».\n\n#### 1. Почему в Data Vault все связи моделируются как $M:N$ (многие-ко-многим)?\nВ реальном бизнесе любая связь со временем меняет кардинальность:\n* Сегодня в компании действует правило: «У клиента может быть строго 1 менеджер» ($1:N$).\n* Через год маркетинг вводит совместное ведение VIP-клиентов двумя менеджерами ($M:N$).\nВ классической 3NF это потребовало бы дропа внешнего ключа и создания новой таблицы сопряжения. В Data Vault Линк изначально спроектирован как **$M:N$**, поэтому изменение бизнес-правил не требует перестройки структуры!\n\n#### 2. Расчет Link Hash Key\nХэш-ключ Линка вычисляется от упорядоченного объединения бизнес-ключей Хабов:\n```sql\n-- Правильный расчет Link Hash Key:\nMD5(CONCAT(UPPER(TRIM(client_bk)), '||', UPPER(TRIM(order_bk))))\n```\n* Обязательно используйте разделитель (например, `||`), чтобы избежать коллизий склейки (`'A' + 'BC'` и `'AB' + 'C'`)!\n\n#### 3. Специализированные виды Линков:\n* **Hierarchical Link (Иерархический линк):** Моделирует связи «родитель-потомок» внутри одной сущности (дерево категорий, начальник-подчиненный).\n* **Same-As Link (SAL):** Фиксирует соответствие сущностей при дедупликации (например, клиент `CRM_101` из старой базы — это тот же человек, что `SAP_994` из новой)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Свадебное свидетельство",
      "content": "Хабы — это граждане (жених и невеста). Линк — это свидетельство о браке: оно содержит ссылку на жениха, ссылку на невесту и дату регистрации союза. Линк фиксирует факт отношений между людьми, но не описывает цвет их глаз."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Преимущества моделирования связей через Линки",
        "beforeDescription": "Реляционные внешние ключи (FK в теле сущности)",
        "beforeColumns": [
          "cardinality_evolution",
          "refactoring_cost",
          "source_coupling"
        ],
        "beforeRows": [
          [
            "1:N shifts to M:N",
            "High: requires DDL drop & join table",
            "Breaks downstream ETL"
          ],
          [
            "Multi-parent entities",
            "Rigid hierarchy fails on matrices",
            "High complexity in 3NF"
          ],
          [
            "Cross-system joins",
            "Impossible without global surrogate key",
            "Lookup locks during ETL"
          ]
        ],
        "afterDescription": "Связи через Линки Data Vault 2.0",
        "afterColumns": [
          "cardinality_evolution",
          "refactoring_cost",
          "source_coupling"
        ],
        "afterRows": [
          [
            "1:N shifts to M:N",
            "Zero DDL changes required",
            "Full backward compatibility"
          ],
          [
            "Hierarchical & SAL",
            "Native support for parent-child & MDM",
            "Clean decoupled links"
          ],
          [
            "Parallel link load",
            "Generated independently via hashes",
            "Zero foreign key locks"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Склейка хэша линка без разделителя вызвала ложную коллизию",
      "content": "В коде формирования хэша склеили ключи напрямую: `f\"{cust_id}{item_id}\"`. Для клиента '12' и товара '3' получилось '123'. Для клиента '1' и товара '23' тоже получилось '123'! Два разных заказа объединились в один хэш-ключ, сломав финансовую сверку."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Можно ли помещать метрики или атрибуты транзакции прямо в таблицу Линка?",
      "content": "**Ответ:** Нет! Линк хранит строго ключи связи и метаданные (`hk_link`, `hk_hub_1`, `hk_hub_2`, `load_date`, `record_source`). Любые описательные атрибуты транзакции (сумма, статус, комментарий) выносятся в связанный сателлит линка (**Link Satellite: sat_lnk_...**), чтобы не нарушать принцип неизменяемости связей."
    }
  ],
  "taskDescription": "Смоделируйте Линк связывания клиентов и заказов 'lnk_orders':\n1. Создайте Хаб 'hub_users' (hk_user VARCHAR(32) PRIMARY KEY, user_bk VARCHAR(50) NOT NULL UNIQUE).\n2. Создайте Хаб 'hub_deals' (hk_deal VARCHAR(32) PRIMARY KEY, deal_bk VARCHAR(50) NOT NULL UNIQUE).\n3. Создайте Линк 'lnk_orders' (hk_lnk_order VARCHAR(32) PRIMARY KEY, hk_user VARCHAR(32) NOT NULL, hk_deal VARCHAR(32) NOT NULL, load_dts VARCHAR(20) NOT NULL, rec_source VARCHAR(30) NOT NULL).\n4. Заполните тестовыми данными (1 пользователь, 2 сделки, 2 строки в линке).\n5. Напишите запрос, выводящий 'user_bk', 'deal_bk', 'load_dts' через связывание Хабов с Линком, отсортированный по 'deal_bk ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте hub_users, hub_deals, lnk_orders\n-- 2. Вставьте тестовые записи\n-- 3. Выведите связи через JOIN",
  "solutionCode": "CREATE TABLE hub_users (\n    hk_user VARCHAR(32) PRIMARY KEY,\n    user_bk VARCHAR(50) NOT NULL UNIQUE\n);\n\nCREATE TABLE hub_deals (\n    hk_deal VARCHAR(32) PRIMARY KEY,\n    deal_bk VARCHAR(50) NOT NULL UNIQUE\n);\n\nCREATE TABLE lnk_orders (\n    hk_lnk_order VARCHAR(32) PRIMARY KEY,\n    hk_user VARCHAR(32) NOT NULL,\n    hk_deal VARCHAR(32) NOT NULL,\n    load_dts VARCHAR(20) NOT NULL,\n    rec_source VARCHAR(30) NOT NULL\n);\n\nINSERT INTO hub_users VALUES ('u_hash_1', 'USR_42');\nINSERT INTO hub_deals VALUES ('d_hash_1', 'DEAL_101'), ('d_hash_2', 'DEAL_102');\n\nINSERT INTO lnk_orders VALUES\n('lnk_hash_1', 'u_hash_1', 'd_hash_1', '2026-11-01 10:00:00', 'CRM_DEALS'),\n('lnk_hash_2', 'u_hash_1', 'd_hash_2', '2026-11-01 10:00:00', 'CRM_DEALS');\n\nSELECT u.user_bk, d.deal_bk, l.load_dts\nFROM lnk_orders l\nJOIN hub_users u ON l.hk_user = u.hk_user\nJOIN hub_deals d ON l.hk_deal = d.hk_deal\nORDER BY d.deal_bk ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 2,
    "expectedColumns": [
      "user_bk",
      "deal_bk",
      "load_dts"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #503: Коллизия в хэше Линка из-за конкатенации без разделителя",
    "incidentDescription": "Склеили ключи 'A' и 'BC' как 'ABC', что совпало с клиентом 'AB' и товаром 'C', объединив несовместимые заказы.",
    "buggyCode": "-- Конкатенация без разделителя\nSELECT MD5('A' || 'BC') AS h1, MD5('AB' || 'C') AS h2;",
    "fixHint": "Используйте надежный разделитель: MD5('A' || '||' || 'BC') и MD5('AB' || '||' || 'C').",
    "solutionCode": "SELECT MD5('A' || '||' || 'BC') AS h1, MD5('AB' || '||' || 'C') AS h2;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте hub_users, hub_deals и lnk_orders с указанными полями.",
    "Вставьте записи в таблицы и соедините их: lnk_orders l JOIN hub_users u ON l.hk_user = u.hk_user JOIN hub_deals d ON l.hk_deal = d.hk_deal.",
    "Отсортируйте итоговую выборку по d.deal_bk ASC;."
  ]
};
