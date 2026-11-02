import { Lesson } from '@/types/course';

export const dbtLesson1: Lesson = {
  "id": "dbt-1",
  "moduleSlug": "dbt",
  "order": 1,
  "title": "Философия dbt: Analytics Engineering, модульный SQL и функция ref()",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Analytics Engineering",
      "definition": "Дисциплина на стыке Data Engineering и Data Analytics, применяющая инженерные практики (Git, CI/CD, тесты, документация) к разработке аналитических моделей данных."
    },
    {
      "term": "Функция ref()",
      "definition": "Ключевой Jinja-макрос dbt, связывающий SQL-модели в единый граф зависимостей (DAG Lineage) и автоматически подставляющий реальные имена схем и таблиц в зависимости от окружения."
    },
    {
      "term": "T (Transform) в ELT",
      "definition": "Концепция ELT, при которой сырые данные сначала загружаются в хранилище без изменений, а все вычисления и трансформации выполняются внутри самого DWH средствами dbt."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "stg_customers",
      "description": "Стейджинг-модель клиентов: очистка и переименование полей",
      "columns": [
        {
          "name": "customer_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "full_name",
          "type": "VARCHAR(128)"
        },
        {
          "name": "email",
          "type": "VARCHAR(128)"
        }
      ],
      "sampleRows": [
        {
          "customer_id": 1,
          "full_name": "Иван Смирнов",
          "email": "ivan@example.com"
        },
        {
          "customer_id": 2,
          "full_name": "Анна Кузнецова",
          "email": "anna@example.com"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Философия dbt: Конец эпохи спагетти-хранимок на 3000 строк\n\nДо появления dbt трансформация данных в DWH представляла собой хаос: гигантские SQL-скрипты, хранимые процедуры с транзакциями, захардкоженные имена схем (`prod_dwh.orders`) и никакой возможности протестировать логику до попадания на прод.\n\n**dbt (data build tool)** превратил разработку хранилищ в разработку программного обеспечения (Software Engineering for Data):\n1. **Только `SELECT`:** дата-инженер пишет исключительно логику выборки (`SELECT`). Всю рутину DDL/DML (`CREATE TABLE`, `CREATE VIEW`, `INSERT`, `MERGE`, транзакции) dbt берет на себя.\n2. **Управление графом через `ref()`:** вместо жесткой привязки `FROM raw_db.stg_orders` пишется `FROM {{ ref('stg_orders') }}`. dbt автоматически строит направленный ациклический граф (DAG Lineage) и запускает модели в строгом порядке параллельно.\n3. **Изоляция окружений:** тот же самый код в дев-ветке создаст таблицы в вашей персональной схеме `dbt_ivan.stg_orders`, а в продакшне — в `analytics.stg_orders`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Сборка конструктора Lego по инструкции",
      "content": "Хранимые процедуры старой школы — это попытка вылепить замок из сырой глины за один присест: если фундамент треснет, рухнет все здание. Модели dbt — это стандартизированные кирпичики Lego с четкими пазами `ref()`: каждый кубик проверяется отдельно, а из готовых блоков собирается крепость любой сложности."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение традиционного SQL и dbt",
        "beforeDescription": "Хранимые процедуры и ad-hoc скрипты",
        "beforeColumns": [
          "development_factor",
          "legacy_stored_procs",
          "operational_risk"
        ],
        "beforeRows": [
          [
            "Dependencies",
            "Hardcoded schema.table names",
            "Broken execution order"
          ],
          [
            "Environment switching",
            "Manual editing of prod SQL",
            "Accidental drop of prod data"
          ],
          [
            "Testing & QA",
            "Manual verification queries",
            "Undetected data anomalies"
          ]
        ],
        "afterDescription": "Модульный подход dbt (Analytics Engineering)",
        "afterColumns": [
          "development_factor",
          "legacy_stored_procs",
          "operational_risk"
        ],
        "afterRows": [
          [
            "Dependencies",
            "Automated DAG via ref()",
            "100% optimal parallel execution"
          ],
          [
            "Environment switching",
            "Dynamic schemas per branch",
            "Zero prod contamination"
          ],
          [
            "Testing & QA",
            "Automated schema & unit tests",
            "Bad data blocked before deploy"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Хардкод имени схемы вместо `ref()` или `source()`",
      "content": "Инженер написал в модели: `FROM production_dwh.stg_orders`. При запуске тестов в локальной ветке dbt прочитал данные из продакшна и попытался записать результат в продакшн-схему, затерев данные аналитиков. Никогда не хардкодьте схемы — используйте `{{ ref('model_name') }}` и `{{ source('raw_source', 'table_name') }}`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что именно делает макрос `{{ ref() }}` под капотом?",
      "content": "**Ответ:** Макрос `ref()` решает две важнейшие задачи: во-первых, во время компиляции он интерполирует реальное имя таблицы с учетом текущего таргета (схема пользователя в dev или схема prod). Во-вторых, он регистрирует ребро в графе зависимостей (DAG), сообщая dbt, какая модель должна быть собрана раньше текущей."
    }
  ],
  "taskDescription": "Сформируйте базовую dbt-модель стейджинга 'stg_payments.sql':\n1. Сошлитесь на модель заказов с помощью макроса `{{ ref('stg_orders') }}`.\n2. Выберите поля: 'order_id', 'customer_id', 'amount' (переименовав его в 'payment_amount_rub'), и 'status'.\n3. Отфильтруйте только успешные платежи: `status = 'COMPLETED'`.\n\nВведите текст SQL-модели dbt.",
  "seedCode": "-- Напишите модель stg_payments.sql с использованием {{ ref() }}\n",
  "initialCode": "SELECT\n    order_id,\n    customer_id,\n    amount AS payment_amount_rub,\n    status\nFROM {{ ref('stg_orders') }}\nWHERE status = 'COMPLETED'",
  "solutionCode": "SELECT\n    order_id,\n    customer_id,\n    amount AS payment_amount_rub,\n    status\nFROM {{ ref('stg_orders') }}\nWHERE status = 'COMPLETED'",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "SELECT",
      "order_id",
      "customer_id",
      "amount AS payment_amount_rub",
      "{{ ref('stg_orders') }}",
      "WHERE status = 'COMPLETED'"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #901: Нарушение Lineage из-за прямого обращения к таблице",
    "incidentDescription": "Инженер захардкодил 'FROM prod_dwh.stg_orders' вместо ref(), из-за чего dbt не включил зависимость в DAG и построил витрину из пустой недозагруженной таблицы.",
    "buggyCode": "SELECT * FROM prod_dwh.stg_orders WHERE status = 'SUCCESS'",
    "fixHint": "Замените прямое обращение на макрос {{ ref('stg_orders') }}.",
    "solutionCode": "SELECT * FROM {{ ref('stg_orders') }} WHERE status = 'SUCCESS'",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте `{{ ref('stg_orders') }}` в предложении FROM.",
    "Выполните переименование колонки: `amount AS payment_amount_rub`.",
    "Добавьте условие фильтрации `WHERE status = 'COMPLETED'`."
  ]
};
