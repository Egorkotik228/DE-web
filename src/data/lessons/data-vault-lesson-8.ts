import { Lesson } from '@/types/course';

export const dataVaultLesson8: Lesson = {
  "id": "data-vault-8",
  "moduleSlug": "data-vault",
  "order": 8,
  "title": "Business Vault и построение Information Mart (Звезда и Снежинка поверх Data Vault)",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Business Vault",
      "definition": "Слой хранилища поверх Raw Data Vault, содержащий бизнес-правила, деривации, PIT-таблицы и агрегации без искажения сырых данных."
    },
    {
      "term": "Information Mart",
      "definition": "Витрины данных (звезда/снежинка), оптимизированные для BI-систем, бизнес-пользователей и аналитических ad-hoc отчетов."
    },
    {
      "term": "Cartesian Explosion (Взрыв размерности)",
      "definition": "Экспоненциальное размножение строк при некорректном соединении версионных таблиц без фиксации временного среза или уникального ключа."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dim_clients",
      "description": "Витрина измерения клиентов (Star Schema), собранная поверх Data Vault",
      "columns": [
        {
          "name": "client_sk",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "client_bk",
          "type": "VARCHAR(50)",
          "keyType": "BK"
        },
        {
          "name": "full_name",
          "type": "VARCHAR(100)"
        },
        {
          "name": "loyalty_tier",
          "type": "VARCHAR(20)"
        }
      ],
      "sampleRows": [
        {
          "client_sk": "c1111111111111111111111111111111",
          "client_bk": "CL-101",
          "full_name": "Иван Смирнов",
          "loyalty_tier": "GOLD"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Business Vault и витрины Information Mart (Star Schema поверх Data Vault)\n\nСырой слой Raw Data Vault создан для инженеров и ETL-конвейеров: он гарантирует масштабируемость и 100% аудит. Но отдавать бизнес-пользователям и BI-инструментам (PowerBI, Superset, Tableau) модель из сотен Хабов и Линков — верный путь к хаосу.\n\n#### Архитектура слоев Data Vault 2.0\n1. **Raw Data Vault:** сырые Hubs, Links, Satellites без бизнес-трансформаций.\n2. **Business Vault:** бизнес-правила, расчетные скоринги, склейка мастер-записей (MDM), PIT и Bridge таблицы.\n3. **Information Mart (Витрины):** классическая размерная модель Ральфа Кимбалла (звезда / снежинка) с таблицами фактов (`fact_*`) и измерений (`dim_*`).\n\nВитрины данных строятся поверх Raw и Business Vault в виде представлений (`VIEW`) либо материализуются в быстрые аналитические СУБД (ClickHouse)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Кухня ресторана vs Сервированный стол",
      "content": "Raw Data Vault — это склад продуктов на кухне (мука, яйца, сахар в отдельных контейнерах). Гостю ресторана не подают сырые яйца и мешок сахара. Business Vault замешивает тесто и выпекает бисквит, а Information Mart подает гостю красивое готовое пирожное на блюде."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение слоев хранения и витрин",
        "beforeDescription": "Прямой доступ аналитиков к Raw Data Vault",
        "beforeColumns": [
          "user_experience",
          "query_complexity",
          "business_logic"
        ],
        "beforeRows": [
          [
            "Confusing schema",
            "15 JOINs between Hubs and Sats",
            "Duplicate business rules"
          ],
          [
            "Slow BI reports",
            "Subqueries on window functions",
            "Inconsistent metric definitions"
          ],
          [
            "High support load",
            "Analysts constantly ask for help",
            "Data team bottleneck"
          ]
        ],
        "afterDescription": "Потребление через Information Mart (Star Schema)",
        "afterColumns": [
          "user_experience",
          "query_complexity",
          "business_logic"
        ],
        "afterRows": [
          [
            "Intuitive Star schema",
            "Simple 1-hop JOIN (Fact to Dim)",
            "Centralized canonical metrics"
          ],
          [
            "Fast sub-second BI",
            "Optimized indexes and columnar store",
            "Standardized definitions"
          ],
          [
            "Self-service BI",
            "Business builds reports independently",
            "Zero distraction for engineers"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Открытие Raw Data Vault для BI-пользователей",
      "content": "Компания предоставила аналитикам прямой доступ к таблицам `hub_*`, `link_*` и `sat_*`. Из-за непонимания версионирования в сателлитах аналитики соединяли таблицы без учета `load_dts`, получая раздутые декартовым произведением финансовые отчеты с ошибками на десятки миллионов рублей."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое Business Vault и чем он отличается от Raw Vault?",
      "content": "**Ответ:** Raw Vault хранит данные первоисточников без каких-либо искажений и бизнес-правил (только хэширование и структурирование в Hub/Link/Sat). Business Vault строится поверх Raw Vault и содержит расчетные сущности, бизнес-правила (например, скоринг риска, категоризацию клиентов), PIT и Bridge структуры. При изменении бизнес-правил Business Vault можно удалить и пересчитать заново без потери истории."
    }
  ],
  "taskDescription": "Сформируйте витрину измерения клиентов 'dim_clients' поверх Хаба и Сателлитов:\n1. Создайте Хаб 'hub_client' (hk_client VARCHAR(32) PRIMARY KEY, client_bk VARCHAR(50) NOT NULL).\n2. Создайте Сателлит профиля 'sat_profile' (hk_client VARCHAR(32) NOT NULL, full_name VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL).\n3. Создайте Сателлит лояльности 'sat_loyalty' (hk_client VARCHAR(32) NOT NULL, tier VARCHAR(20) NOT NULL).\n4. Вставьте данные для клиента: hk_client = 'hk_1', client_bk = 'CL_101', full_name = 'Алексей Иванов', email = 'alex@corp.ru', tier = 'GOLD'.\n5. Напишите запрос, формирующий витрину: соедините Хаб и Сателлиты, вернув колонки 'client_bk', 'full_name', 'email', 'tier'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте hub_client, sat_profile, sat_loyalty\n-- 2. Вставьте тестовые записи\n-- 3. Выведите плоскую витрину измерения клиентов",
  "solutionCode": "CREATE TABLE hub_client (\n    hk_client VARCHAR(32) PRIMARY KEY,\n    client_bk VARCHAR(50) NOT NULL\n);\n\nCREATE TABLE sat_profile (\n    hk_client VARCHAR(32) NOT NULL,\n    full_name VARCHAR(100) NOT NULL,\n    email VARCHAR(100) NOT NULL\n);\n\nCREATE TABLE sat_loyalty (\n    hk_client VARCHAR(32) NOT NULL,\n    tier VARCHAR(20) NOT NULL\n);\n\nINSERT INTO hub_client VALUES ('hk_1', 'CL_101');\nINSERT INTO sat_profile VALUES ('hk_1', 'Алексей Иванов', 'alex@corp.ru');\nINSERT INTO sat_loyalty VALUES ('hk_1', 'GOLD');\n\nSELECT h.client_bk, p.full_name, p.email, l.tier\nFROM hub_client h\nJOIN sat_profile p ON h.hk_client = p.hk_client\nJOIN sat_loyalty l ON h.hk_client = l.hk_client;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 1,
    "expectedColumns": [
      "client_bk",
      "full_name",
      "email",
      "tier"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #508: Декартово умножение сателлитов в витрине данных",
    "incidentDescription": "Прямой JOIN нескольких сателлитов без фильтрации по последней дате среза привел к дублированию строк в витрине измерения.",
    "buggyCode": "SELECT * FROM hub_client h JOIN sat_profile p ON h.hk = p.hk JOIN sat_loyalty l ON h.hk = l.hk;",
    "fixHint": "Используйте оконную функцию ROW_NUMBER() для выбора только последней актуальной версии сателлита либо используйте PIT-таблицу.",
    "solutionCode": "SELECT h.client_bk, p.full_name, l.tier FROM hub_client h JOIN (SELECT *, ROW_NUMBER() OVER(PARTITION BY hk ORDER BY dts DESC) rn FROM sat_profile) p ON h.hk = p.hk AND p.rn = 1 JOIN (SELECT *, ROW_NUMBER() OVER(PARTITION BY hk ORDER BY dts DESC) rn FROM sat_loyalty) l ON h.hk = l.hk AND l.rn = 1;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Создайте таблицы hub_client, sat_profile и sat_loyalty.",
    "Вставьте предоставленные тестовые строки.",
    "Соедините таблицы через JOIN по hk_client и выведите client_bk, full_name, email, tier."
  ]
};
