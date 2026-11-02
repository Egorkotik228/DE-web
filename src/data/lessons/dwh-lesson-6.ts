import { Lesson } from '@/types/course';

export const dwhLesson6: Lesson = {
  "id": "dwh-6",
  "moduleSlug": "dwh",
  "order": 6,
  "title": "Архитектура Medallion в Data Lakehouse: слои Bronze (Raw), Silver (Cleansed) и Gold (Aggregated/Business-ready)",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Medallion Architecture",
      "definition": "Трехуровневая архитектура Lakehouse (Delta Lake, Apache Iceberg): последовательное повышение качества данных от Bronze (сырые) через Silver (очищенные) к Gold (бизнес-агрегаты)."
    },
    {
      "term": "Bronze Layer",
      "definition": "Слой хранения сырых неизменяемых данных (Append-only), сохраняющий историческую точность входных сообщений."
    },
    {
      "term": "Gold Layer",
      "definition": "Слой высокопроизводительных денормализованных витрин и агрегатов, готовых для мгновенного потребления в BI и ML."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "gold_monthly_customer_revenue",
      "description": "Золотая витрина месячной выручки в разрезе сегментов",
      "columns": [
        {
          "name": "report_month",
          "type": "VARCHAR(7)",
          "keyType": "PK"
        },
        {
          "name": "segment",
          "type": "VARCHAR(50)",
          "keyType": "PK"
        },
        {
          "name": "total_revenue",
          "type": "NUMERIC(14,2)"
        }
      ],
      "sampleRows": [
        {
          "report_month": "2026-11",
          "segment": "B2B",
          "total_revenue": 14500000.0
        },
        {
          "report_month": "2026-11",
          "segment": "B2C",
          "total_revenue": 8900000.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура Medallion в Data Lakehouse\n\nС появлением форматов открытых таблиц (Delta Lake, Apache Iceberg, Apache Hudi) границы между Data Lake (озером файлов Parquet) и DWH стерлись. Стандартом построения пайплайнов стала **архитектура медальонов (Medallion Architecture)**.\n\n#### 1. Слой Bronze (Бронзовый / Сырой)\n* Хранит данные в исходном виде («raw payload»).\n* **Append-only:** строки никогда не обновляются и не удаляются.\n* Обогащается метаданными загрузки: `_ingestion_ts`, `_source_file_name`.\n* Позволяет в любой момент пересчитать downstream-слои с самого начала при изменении бизнес-логики.\n\n#### 2. Слой Silver (Серебряный / Очищенный)\n* Распаковка JSON/XML, фильтрация битых записей (DQ rules).\n* Дедупликация событий по первичным ключам.\n* Приведение типов данных и обогащение справочниками.\n* Единая нормализованная корпоративная модель сущностей.\n\n#### 3. Слой Gold (Золотой / Витрины для бизнеса)\n* Агрегированные отчеты, когорты, срезы для дашбордов PowerBI/Superset.\n* Максимальная денормализация под конкретные бизнес-сценарии.\n* Мгновенный отклик аналитических запросов за доли секунды."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Добыча золота",
      "content": "Bronze — это сырая руда с песком и камнями, выкопанная из карьера. Silver — это очищенный слиток золота 999 пробы на аффинажном заводе. Gold — это изящное ювелирное кольцо с бриллиантом на витрине магазина."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение слоев архитектуры Medallion",
        "beforeDescription": "Входной сырой слой (Bronze)",
        "beforeColumns": [
          "layer_level",
          "data_quality_state",
          "primary_users"
        ],
        "beforeRows": [
          [
            "Bronze (Raw)",
            "Untrusted raw schema",
            "Data Engineers only"
          ],
          [
            "Append-only logs",
            "Contains duplicates & corruptions",
            "Reprocessing source"
          ],
          [
            "Json / Parquet dump",
            "No indexes or aggregates",
            "Audit & lineage"
          ]
        ],
        "afterDescription": "Очищенные слои (Silver и Gold)",
        "afterColumns": [
          "layer_level",
          "data_quality_state",
          "primary_users"
        ],
        "afterRows": [
          [
            "Silver (Enriched)",
            "Validated & deduplicated",
            "Data Scientists & ML"
          ],
          [
            "Gold (Marts)",
            "Aggregated & curated",
            "Business & Executives"
          ],
          [
            "Optimized formats",
            "Sub-second query SLA",
            "Tableau / BI Dashboards"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Прямой коннект BI-дашборда к слою Bronze",
      "content": "Аналитики подключили дашборд генерального директора напрямую к сырой таблице Bronze с миллионами сырых JSON-логов. При первом же обновлении дашборда сервер ушел в OOM, а цифры выручки утроились из-за неотфильтрованных дубликатов ретраев."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем сохранять неизменяемый слой Bronze, если все равно нужен Silver?",
      "content": "**Ответ:** Bronze гарантирует воспроизводимость (Data Reproducibility). Если в коде очистки Silver обнаружат критический баг спустя полгода, наличие неизменного сырого Bronze позволяет накатить патч и заново пересчитать всю историю без потерь. Это также ключевое требование аудита и Data Lineage."
    }
  ],
  "taskDescription": "Смоделируйте конвейер Medallion от Bronze до Gold:\n1. Создайте таблицу 'bronze_orders' (raw_id VARCHAR(50), payload_json TEXT, ingested_at VARCHAR(20)).\n2. Создайте таблицу 'silver_orders' (order_id INT PRIMARY KEY, customer_id INT NOT NULL, amount NUMERIC(10,2) NOT NULL, status VARCHAR(20) NOT NULL).\n3. Создайте витрину 'gold_revenue' (customer_id INT PRIMARY KEY, total_spent NUMERIC(10,2) NOT NULL).\n4. Заполните 'silver_orders' двумя заказами клиента 101 (сумма 5000.00 со статусом 'PAID' и сумма 2000.00 со статусом 'PAID') и заказом клиента 102 (сумма 3000.00 со статусом 'CANCELLED').\n5. Агрегируйте в 'gold_revenue' только успешные платежи ('PAID') и выведите клиентов с 'total_spent > 0', отсортировав по 'total_spent DESC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте silver_orders и gold_revenue\n-- 2. Вставьте тестовые заказы в silver_orders\n-- 3. Агрегируйте в gold_revenue по статусу PAID\n-- 4. Выведите gold_revenue",
  "solutionCode": "CREATE TABLE silver_orders (\n    order_id INT PRIMARY KEY,\n    customer_id INT NOT NULL,\n    amount NUMERIC(10,2) NOT NULL,\n    status VARCHAR(20) NOT NULL\n);\n\nCREATE TABLE gold_revenue (\n    customer_id INT PRIMARY KEY,\n    total_spent NUMERIC(10,2) NOT NULL\n);\n\nINSERT INTO silver_orders VALUES\n(1, 101, 5000.00, 'PAID'),\n(2, 101, 2000.00, 'PAID'),\n(3, 102, 3000.00, 'CANCELLED');\n\nINSERT INTO gold_revenue (customer_id, total_spent)\nSELECT customer_id, SUM(amount)\nFROM silver_orders\nWHERE status = 'PAID'\nGROUP BY customer_id;\n\nSELECT customer_id, total_spent FROM gold_revenue ORDER BY total_spent DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 1,
    "expectedColumns": [
      "customer_id",
      "total_spent"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #406: В витрину Gold попали отмененные заказы из-за отсутствия фильтрации в Silver",
    "incidentDescription": "В расчет квартального бонуса отдела продаж включили заказы со статусом CANCELLED, завысив выручку на 15 млн рублей.",
    "buggyCode": "INSERT INTO gold_revenue SELECT customer_id, SUM(amount) FROM silver_orders GROUP BY customer_id;",
    "fixHint": "Добавьте фильтр WHERE status = 'PAID' при формировании золотой витрины.",
    "solutionCode": "INSERT INTO gold_revenue SELECT customer_id, SUM(amount) FROM silver_orders WHERE status = 'PAID' GROUP BY customer_id;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте таблицы silver_orders и gold_revenue.",
    "Выполните агрегацию через INSERT INTO gold_revenue ... SELECT customer_id, SUM(amount) ... WHERE status = 'PAID' GROUP BY customer_id.",
    "Выведите результат SELECT customer_id, total_spent FROM gold_revenue ORDER BY total_spent DESC;."
  ]
};
