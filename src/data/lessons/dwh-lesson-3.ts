import { Lesson } from '@/types/course';

export const dwhLesson3: Lesson = {
  "id": "dwh-3",
  "moduleSlug": "dwh",
  "order": 3,
  "title": "Паттерны Ральфа Кимбалла с нуля: подход снизу-вверх (Bottom-Up), витрины, таблицы фактов и измерений, суррогатные ключи",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Star Schema (Схема «Звезда»)",
      "definition": "Архитектура размерного моделирования, где центральная таблица фактов ссылается на денормализованные таблицы измерений в один шаг."
    },
    {
      "term": "Surrogate Key (Суррогатный ключ)",
      "definition": "Синтетический целочисленный идентификатор строки измерения (например user_sk), создаваемый в DWH независимо от бизнес-ключа источника."
    },
    {
      "term": "Granularity (Гранулярность)",
      "definition": "Уровень детализации одной строки в таблице фактов (например, 'одна строка = одна товарная позиция в чеке')."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dim_products",
      "description": "Измерение товаров с суррогатным ключом",
      "columns": [
        {
          "name": "product_sk",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "product_code",
          "type": "VARCHAR(50)",
          "keyType": "BK"
        },
        {
          "name": "category",
          "type": "VARCHAR(50)"
        }
      ],
      "sampleRows": [
        {
          "product_sk": 1,
          "product_code": "PRD_001",
          "category": "Смартфоны"
        },
        {
          "product_sk": 2,
          "product_code": "PRD_002",
          "category": "Ноутбуки"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Размерное моделирование Ральфа Кимбалла (Dimensional Modeling)\n\nРальф Кимбалл предложил подход, ориентированный на бизнес-пользователей и аналитические инструменты (BI). Вместо нормализации 3NF данные организуются вокруг бизнес-процессов в виде **схемы «Звезда» (Star Schema)**.\n\n#### 1. Таблицы фактов (Fact Tables)\n* Хранят числовые метрики бизнес-событий: сумму продажи, скидку, количество, длительность звонка.\n* **Гранулярность (Grain):** Фундамент проектирования факта. Всегда начинайте модель с четкого ответа: *что именно означает одна строка?*\n\n#### 2. Таблицы измерений (Dimension Tables)\n* Хранят контекст события («кто?», «где?», «когда?», «по какому каналу?»).\n* Намеренно **денормализованы**: категория товара хранится прямо в таблице товаров, а не выносится в отдельную таблицу категорий (как в схеме «Снежинка»).\n\n#### 3. Почему Суррогатные ключи (Surrogate Keys) обязательны?\nНикогда не используйте бизнес-ключ (`id` из CRM) в качестве внешнего ключа в таблице фактов:\n1. **Интеграция источников:** Клиент с `id=42` может существовать и в SAP, и в 1С, и в биллинге. Суррогатный ключ `user_sk` разрешает коллизии.\n2. **Историчность (SCD):** У одного клиента с `id=42` может быть 5 исторических версий (5 разных строк с разными `user_sk`). Факт связывается со строкой той версии, которая действовала на момент покупки!\n3. **Производительность:** `INT` / `BIGINT` джойнится в разы быстрее длинных `VARCHAR`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Планеты и Солнце",
      "content": "Схема «Звезда» — это солнечная система. В центре находится яркое Солнце (таблица фактов с миллиардами событий), а вокруг него вращаются планеты (измерения: даты, клиенты, склады, товары), дающие контекст каждому лучу света."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение связывания по бизнес-ключу и суррогатному ключу",
        "beforeDescription": "Прямая связь по Natural / Business Key",
        "beforeColumns": [
          "join_key_type",
          "scd_handling",
          "multi_source_risk"
        ],
        "beforeRows": [
          [
            "VARCHAR business_id",
            "Fails on history updates",
            "Key collisions across CRMs"
          ],
          [
            "Direct source ID",
            "Cannot represent version",
            "Breaks on source renumbering"
          ],
          [
            "String join",
            "High memory overhead in joins",
            "Slow index scans"
          ]
        ],
        "afterDescription": "Связь через синтетический Surrogate Key (SK)",
        "afterColumns": [
          "join_key_type",
          "scd_handling",
          "performance_gain"
        ],
        "afterRows": [
          [
            "INT/BIGINT surrogate_sk",
            "Perfect point-in-time joins",
            "Zero collision risk"
          ],
          [
            "Immutable synthetic ID",
            "Preserves exact history",
            "Independent of upstream"
          ],
          [
            "Compact integer join",
            "Fastest CPU hash joins",
            "Compact B-Tree index"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Размытая гранулярность факта исказила годовой отчет",
      "content": "В таблицу фактов продаж записали как общие чеки заказов, так и отдельные позиции товаров. Аналитик сделал `SUM(amount)` и получил завышенную выручку, так как сумма чека сложилась со стоимостью входящих в него позиций. В факте всегда должна быть единая строгая гранулярность!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем схема «Звезда» (Star) отличается от схемы «Снежинка» (Snowflake) и что предпочесть в современном DWH?",
      "content": "**Ответ:** В «Звезде» измерения полностью денормализованы (1 JOIN до факта). В «Снежинке» измерения нормализованы (например, `dim_product -> dim_subcategory -> dim_category`), что требует многоуровневых JOIN'ов. В современных колоночных DWH (ClickHouse, BigQuery, Snowflake) предпочитают «Звезду», так как плоские таблицы сканируются значительно быстрее."
    }
  ],
  "taskDescription": "Спроектируйте схему «Звезда» для анализа продаж:\n1. Создайте измерение 'dim_clients' (client_sk INT PRIMARY KEY, client_code VARCHAR(20) NOT NULL, tier VARCHAR(20) NOT NULL).\n2. Создайте измерение 'dim_items' (item_sk INT PRIMARY KEY, item_name VARCHAR(100) NOT NULL, category VARCHAR(50) NOT NULL).\n3. Создайте таблицу фактов 'fct_sales' (sale_id INT PRIMARY KEY, client_sk INT NOT NULL, item_sk INT NOT NULL, amount_rub NUMERIC(10,2) NOT NULL).\n4. Заполните тестовыми данными (2 клиента, 2 товара, 3 факта продажи).\n5. Напишите аналитический запрос, выводящий название категории товара 'category' и суммарную выручку 'total_revenue', отсортированный по 'total_revenue DESC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте dim_clients, dim_items, fct_sales\n-- 2. Вставьте тестовые записи\n-- 3. Выведите сумму продаж по категориям",
  "solutionCode": "CREATE TABLE dim_clients (\n    client_sk INT PRIMARY KEY,\n    client_code VARCHAR(20) NOT NULL,\n    tier VARCHAR(20) NOT NULL\n);\n\nCREATE TABLE dim_items (\n    item_sk INT PRIMARY KEY,\n    item_name VARCHAR(100) NOT NULL,\n    category VARCHAR(50) NOT NULL\n);\n\nCREATE TABLE fct_sales (\n    sale_id INT PRIMARY KEY,\n    client_sk INT NOT NULL,\n    item_sk INT NOT NULL,\n    amount_rub NUMERIC(10,2) NOT NULL\n);\n\nINSERT INTO dim_clients VALUES (1, 'C_101', 'VIP'), (2, 'C_102', 'Standard');\nINSERT INTO dim_items VALUES (1, 'Ноутбук Pro', 'Компьютеры'), (2, 'Мышь беспроводная', 'Аксессуары');\n\nINSERT INTO fct_sales VALUES \n(101, 1, 1, 120000.00),\n(102, 2, 1, 120000.00),\n(103, 1, 2, 3500.00);\n\nSELECT \n    i.category,\n    SUM(f.amount_rub) AS total_revenue\nFROM fct_sales f\nJOIN dim_items i ON f.item_sk = i.item_sk\nGROUP BY i.category\nORDER BY total_revenue DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "category",
      "total_revenue"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #403: Смешение уровней гранулярности в таблице фактов",
    "incidentDescription": "В fct_sales записали строку итога заказа и строки позиций, что удвоило выручку в BI-дашборде.",
    "buggyCode": "INSERT INTO fct_sales VALUES (1, 1, 1, 100), (2, 1, 1, 100), (3, 1, 0, 200); -- строка 3 итог",
    "fixHint": "Исключите строки агрегатов из таблицы фактов, храните строго атомарные события.",
    "solutionCode": "INSERT INTO fct_sales VALUES (1, 1, 1, 100), (2, 1, 1, 100);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Свяжите fct_sales и dim_items по суррогатному ключу item_sk.",
    "Рассчитайте сумму через SUM(f.amount_rub) AS total_revenue.",
    "Сгруппируйте по i.category и отсортируйте по убыванию total_revenue DESC."
  ]
};
