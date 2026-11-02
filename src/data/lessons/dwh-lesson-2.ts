import { Lesson } from '@/types/course';

export const dwhLesson2: Lesson = {
  "id": "dwh-2",
  "moduleSlug": "dwh",
  "order": 2,
  "title": "Корпоративная фабрика данных Билла Инмона: подход сверху-вниз (Top-Down), нормализация 3NF и единый источник правды",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Corporate Information Factory (CIF)",
      "definition": "Архитектурная концепция Билла Инмона: централизованное корпоративное хранилище (EDW) в 3-й нормальной форме, питающее специализированные датамарты."
    },
    {
      "term": "3NF (Третья нормальная форма)",
      "definition": "Правило нормализации: таблица находится во 2NF и каждый неключевой атрибут нетранзитивно зависит от первичного ключа ('the key, the whole key, and nothing but the key')."
    },
    {
      "term": "Single Source of Truth",
      "definition": "Единый источник достоверных данных, исключающий противоречивые трактовки метрик разными подразделениями компании."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "edw_customers",
      "description": "Нормализованная сущность клиентов ядра EDW (3NF)",
      "columns": [
        {
          "name": "customer_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "legal_name",
          "type": "VARCHAR(150)"
        },
        {
          "name": "tax_id",
          "type": "VARCHAR(20)",
          "keyType": "INDEX"
        }
      ],
      "sampleRows": [
        {
          "customer_id": 1,
          "legal_name": "ПАО Сбертех",
          "tax_id": "7707083893"
        },
        {
          "customer_id": 2,
          "legal_name": "ООО Яндекс Маркет",
          "tax_id": "7704357909"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура Билла Инмона: Корпоративная фабрика данных (CIF)\n\nБилл Инмон, признанный «отец DWH», сформулировал классическое определение хранилища:\n> *«DWH — это предметно-ориентированный, интегрированный, неизменяемый и поддерживающий хронологию набор данных для поддержки принятия управленческих решений».*\n\n#### Ключевые принципы подхода Инмона (Top-Down):\n1. **Центральное ядро (EDW):** Все данные из всех источников стекаются в единое гигантское хранилище, спроектированное в **строгой 3-й нормальной форме (3NF)**.\n2. **Устранение избыточности:** Никакого дублирования строк или атрибутов. Адрес клиента хранится строго в таблице `addresses`, контакт — в `contacts`.\n3. **Независимость от BI:** Ядро EDW не подстраивается под конкретные отчеты аналитиков. Оно моделирует реальный бизнес предприятия.\n4. **Витрины данных (Data Marts):** Отделы (маркетинг, финансы) получают денормализованные «срезы» (data marts), которые строятся **строго из ядра EDW**, а не напрямую из сырых источников!\n\n#### Сильные и слабые стороны CIF:\n* **Плюсы:** Абсолютная консистентность. Единый источник правды (Single Source of Truth). Отсутствие аномалий обновления.\n* **Минусы:** Огромный Time-to-Market (проектирование корпоративной 3NF-модели в банке может занимать 2–3 года до получения первого отчета)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Центральный водоканал и фасовочные бутылки",
      "content": "Подход Инмона — это строительство центральной системы фильтрации воды (EDW 3NF). Вода очищается по высочайшему стандарту один раз в центре, а затем разливается по специализированным бутылкам (Data Marts) для магазинов и кафе."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение нормализованного ядра (Инмон) и размерной витрины (Кимбалл)",
        "beforeDescription": "Ядро EDW по Инмону (3-я нормальная форма)",
        "beforeColumns": [
          "characteristic",
          "inmon_edw_3nf",
          "tradeoff"
        ],
        "beforeRows": [
          [
            "Structure",
            "Highly normalized 3NF",
            "Many JOINs in queries"
          ],
          [
            "Orientation",
            "Enterprise-wide entity model",
            "Long implementation time"
          ],
          [
            "Data integrity",
            "Zero duplication of entities",
            "High consistency"
          ]
        ],
        "afterDescription": "Витрина данных по Кимбаллу (Звездная схема)",
        "afterColumns": [
          "characteristic",
          "kimball_star_schema",
          "tradeoff"
        ],
        "afterRows": [
          [
            "Structure",
            "Denormalized Star Schema",
            "Controlled duplication in dims"
          ],
          [
            "Orientation",
            "Business-process focused",
            "Rapid delivery & fast BI"
          ],
          [
            "Query speed",
            "Minimal JOINs & flat scans",
            "High analyst performance"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Прямой доступ аналитиков к 3NF ядру обрушил BI",
      "content": "В ритейлере аналитикам дали прямой доступ к ядру Инмона из 150 таблиц. Для построения дашборда продаж аналитик написал запрос с 18 JOIN'ами. Запрос выполнялся 45 минут вместо 2 секунд. Для BI всегда нужны агрегированные витрины!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему нормализация 3NF хороша для записи, но плоха для аналитических агрегаций?",
      "content": "**Ответ:** 3NF исключает аномалии обновления и дубликаты, что идеально для целостности. Однако при аналитических запросах (OLAP) требуется сканировать миллиарды строк: объединение десятка таблиц через JOIN в 3NF требует колоссального объема случайного доступа к памяти и дискового I/O."
    }
  ],
  "taskDescription": "Смоделируйте 3NF сущности клиентов и их договоров по Инмону:\n1. Создайте таблицу 'edw_clients' (client_id INT PRIMARY KEY, legal_name VARCHAR(100) NOT NULL, inn VARCHAR(12) NOT NULL UNIQUE).\n2. Создайте связанную таблицу 'edw_contracts' (contract_id INT PRIMARY KEY, client_id INT NOT NULL, contract_number VARCHAR(50) NOT NULL, signed_amount NUMERIC(12,2) NOT NULL).\n3. Вставьте двух клиентов и три договора.\n4. Напишите витринный агрегатный запрос, рассчитывающий суммарный объем договоров по каждому клиенту (client_id, legal_name, total_contract_sum), отсортированный по 'total_contract_sum DESC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте edw_clients и edw_contracts\n-- 2. Вставьте тестовые записи\n-- 3. Рассчитайте суммарный объем договоров",
  "solutionCode": "CREATE TABLE edw_clients (\n    client_id INT PRIMARY KEY,\n    legal_name VARCHAR(100) NOT NULL,\n    inn VARCHAR(12) NOT NULL UNIQUE\n);\n\nCREATE TABLE edw_contracts (\n    contract_id INT PRIMARY KEY,\n    client_id INT NOT NULL,\n    contract_number VARCHAR(50) NOT NULL,\n    signed_amount NUMERIC(12,2) NOT NULL\n);\n\nINSERT INTO edw_clients VALUES\n(1, 'ПАО Сбертех', '7707083893'),\n(2, 'ООО Яндекс', '7704357909');\n\nINSERT INTO edw_contracts VALUES\n(101, 1, 'CNT-2026-01', 5000000.00),\n(102, 1, 'CNT-2026-02', 3500000.00),\n(103, 2, 'CNT-2026-03', 12000000.00);\n\nSELECT \n    c.client_id,\n    c.legal_name,\n    SUM(ct.signed_amount) AS total_contract_sum\nFROM edw_clients c\nJOIN edw_contracts ct ON c.client_id = ct.client_id\nGROUP BY c.client_id, c.legal_name\nORDER BY total_contract_sum DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "client_id",
      "legal_name",
      "total_contract_sum"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #402: Денормализация в ядре вызвала расхождение балансов контрагентов",
    "incidentDescription": "В 3NF ядре продублировали юридический адрес в таблице договоров. При смене адреса обновили только 1 договор, что привело к юридической ошибке в претензии.",
    "buggyCode": "CREATE TABLE contracts_denorm (contract_id INT, client_name VARCHAR(100), client_address VARCHAR(200));",
    "fixHint": "Вынесите атрибуты клиента в отдельную нормализованную таблицу edw_clients.",
    "solutionCode": "CREATE TABLE edw_clients (client_id INT PRIMARY KEY, legal_name VARCHAR(100));\nCREATE TABLE edw_contracts (contract_id INT PRIMARY KEY, client_id INT);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Свяжите edw_clients и edw_contracts по ключу client_id.",
    "Используйте SUM(ct.signed_amount) AS total_contract_sum в SELECT.",
    "Сгруппируйте по c.client_id, c.legal_name и отсортируйте по убыванию суммы."
  ]
};
