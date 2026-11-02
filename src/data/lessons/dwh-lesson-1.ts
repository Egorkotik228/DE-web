import { Lesson } from '@/types/course';

export const dwhLesson1: Lesson = {
  "id": "dwh-1",
  "moduleSlug": "dwh",
  "order": 1,
  "title": "Введение в DWH с нуля: OLTP vs OLAP, задачи хранилища, Staging-слой и принципы Кимбалла/Инмона",
  "estimatedMinutes": 30,
  "glossaryTerms": [
    {
      "term": "OLTP",
      "definition": "Online Transaction Processing — транзакционные базы (PostgreSQL, MySQL), оптимизированные под частую точечную запись и чтение отдельных строк."
    },
    {
      "term": "OLAP",
      "definition": "Online Analytical Processing — аналитические хранилища (ClickHouse, Snowflake, BigQuery), оптимизированные под тяжелое сканирование миллиардов строк."
    },
    {
      "term": "Staging (RAW)",
      "definition": "Буферный посадочный слой хранилища, куда сырые данные загружаются из источников 'как есть' без бизнес-трансформаций."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "stg_orders",
      "description": "Сырой посадочный слой заказов из операционной CRM",
      "columns": [
        {
          "name": "raw_order_id",
          "type": "VARCHAR(50)",
          "keyType": "PK"
        },
        {
          "name": "payload_json",
          "type": "TEXT"
        },
        {
          "name": "loaded_at",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "raw_order_id": "ord_101",
          "payload_json": "{\"amount\": 5000, \"status\": \"paid\"}",
          "loaded_at": "2026-11-01 02:00:00"
        },
        {
          "raw_order_id": "ord_102",
          "payload_json": "{\"amount\": 3200, \"status\": \"new\"}",
          "loaded_at": "2026-11-01 02:00:00"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Зачем бизнесу отдельное хранилище данных (DWH)?\n\nВ любой компании есть боевая база данных (OLTP), обслуживающая сайт или мобильное приложение. Почему нельзя строить аналитические отчеты прямо в ней?\n\n1. **Падение продакшна:** Тяжелый запрос `SELECT customer_id, SUM(amount) FROM orders GROUP BY customer_id` заблокирует таблицы и съест все ресурсы CPU/RAM, парализовав оформление заказов клиентами.\n2. **Разрозненность источников:** Данные о клиенте живут в CRM, транзакции — в биллинге, клики — в веб-аналитике, логи — в Kafka. DWH объединяет разрозненные острова данных в **единую картину**.\n3. **История:** OLTP хранит только текущий срез (статус заказа = 'доставлен'). DWH сохраняет всю историю изменений каждого события.\n\n#### Ключевые архитектурные концепции:\n* **Слой Staging:** Сырая посадочная зона. Минимальное время удержания блокировок источника.\n* **Билл Инмон (Top-Down):** Единый нормализованный репозиторий в 3NF (Enterprise Data Warehouse), из которого затем нарезаются зависимые витрины.\n* **Ральф Кимбалл (Bottom-Up):** Размерное моделирование («Звезда» / «Снежинка») из витрин фактов и измерений, объединенных через общие справочники (Conformed Dimensions)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Кухня ресторана vs Архив бухгалтерии",
      "content": "OLTP — это раскаленная кухня ресторана: повара быстро готовят заказы, отдают тарелки, здесь важна скорость каждой миллисекунды. DWH — это архив бухгалтерии, куда в конце дня приносят копии всех чеков, чтобы спокойно посчитать месячную прибыль."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение операционных (OLTP) и аналитических (OLAP) систем",
        "beforeDescription": "Характеристики транзакционных баз (OLTP)",
        "beforeColumns": [
          "dimension",
          "oltp_trait",
          "typical_query"
        ],
        "beforeRows": [
          [
            "Pattern",
            "Write-heavy short transactions",
            "UPDATE user SET city='Msk'"
          ],
          [
            "Storage",
            "Row-oriented (B-Tree indexed)",
            "SELECT * FROM orders WHERE id=42"
          ],
          [
            "Data volume",
            "Current state (Gigabytes)",
            "Normalized 3NF schema"
          ]
        ],
        "afterDescription": "Характеристики аналитических хранилищ (OLAP/DWH)",
        "afterColumns": [
          "dimension",
          "olap_trait",
          "typical_query"
        ],
        "afterRows": [
          [
            "Pattern",
            "Batch insert & read-heavy",
            "SUM(spent) over 50M rows"
          ],
          [
            "Storage",
            "Columnar / Vectorized engines",
            "Aggregates over specific columns"
          ],
          [
            "Data volume",
            "Historical archive (Terabytes)",
            "Star / Medallion schemas"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Аналитический отчет на боевой реплике положил биллинг",
      "content": "Аналитики запустили выгрузку годовой отчетности на Read-Only реплике PostgreSQL. Долгий запрос задержал применение WAL-логов репликации (Replication Lag превысил 4 часа). Реплика переполнила диск и отключилась от мастера."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем фундаментальное отличие подходов Инмона и Кимбалла?",
      "content": "**Ответ:** Инмон предлагает строить хранилище «сверху-вниз»: сначала централизованное DWH в 3NF (единый источник правды), а из него строить витрины. Кимбалл предлагает идти «снизу-вверх»: проектировать размерные витрины (звезда/снежинка) вокруг бизнес-процессов, объединяя их через согласованные измерения (Conformed Dimensions)."
    }
  ],
  "taskDescription": "Смоделируйте загрузку из сырого стейджинга 'stg_orders' в слой очищенных фактов 'fct_orders':\n1. Создайте таблицу 'stg_orders' (raw_id VARCHAR(50), customer_code VARCHAR(50), order_cost NUMERIC(10,2), order_dts VARCHAR(20)).\n2. Создайте таблицу 'fct_orders' (order_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, customer_code VARCHAR(50) NOT NULL, order_cost NUMERIC(10,2) NOT NULL, order_date VARCHAR(10) NOT NULL).\n3. Вставьте в 'stg_orders' две записи:\n   ('o_1', 'CUST_A', 4500.00, '2026-11-01 14:20:00'), ('o_2', 'CUST_B', 12000.00, '2026-11-01 15:30:00').\n4. Перенесите записи в 'fct_orders', отрезав дату до 10 символов ('2026-11-01').\n5. Выведите 'fct_orders', отсортировав по 'order_id ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте stg_orders и fct_orders\n-- 2. Вставьте в stg_orders\n-- 3. Заполните fct_orders из stg_orders\n-- 4. Выведите fct_orders",
  "solutionCode": "CREATE TABLE stg_orders (\n    raw_id VARCHAR(50),\n    customer_code VARCHAR(50),\n    order_cost NUMERIC(10,2),\n    order_dts VARCHAR(20)\n);\n\nCREATE TABLE fct_orders (\n    order_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    customer_code VARCHAR(50) NOT NULL,\n    order_cost NUMERIC(10,2) NOT NULL,\n    order_date VARCHAR(10) NOT NULL\n);\n\nINSERT INTO stg_orders VALUES\n('o_1', 'CUST_A', 4500.00, '2026-11-01 14:20:00'),\n('o_2', 'CUST_B', 12000.00, '2026-11-01 15:30:00');\n\nINSERT INTO fct_orders (customer_code, order_cost, order_date)\nSELECT customer_code, order_cost, SUBSTR(order_dts, 1, 10)\nFROM stg_orders;\n\nSELECT order_id, customer_code, order_cost, order_date FROM fct_orders ORDER BY order_id ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "order_id",
      "customer_code",
      "order_cost",
      "order_date"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #401: Прямая запись аналитиков в Staging сломала ETL-пайплайн",
    "incidentDescription": "Аналитики вручную отредактировали цены в стейджинге, удалив исходные таймстампы загрузки.",
    "buggyCode": "UPDATE stg_orders SET order_cost = 9999 WHERE raw_id = 'o_1';",
    "fixHint": "Никогда не мутируйте данные в Staging. Слой сырых данных должен быть неизменяемым (Append-only).",
    "solutionCode": "INSERT INTO stg_orders VALUES ('o_3', 'CUST_C', 9999.00, '2026-11-01 16:00:00');",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте таблицы stg_orders и fct_orders с указанными типами.",
    "Используйте конструкцию INSERT INTO fct_orders ... SELECT ... для загрузки из стейджинга.",
    "Обрежьте дату с помощью SUBSTR(order_dts, 1, 10) и отсортируйте по order_id ASC."
  ]
};
