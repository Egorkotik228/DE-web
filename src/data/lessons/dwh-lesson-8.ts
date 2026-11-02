import { Lesson } from '@/types/course';

export const dwhLesson8: Lesson = {
  "id": "dwh-8",
  "moduleSlug": "dwh",
  "order": 8,
  "title": "Data Governance, Data Lineage и аудит качества данных в DWH: отслеживание происхождения строк и сквозная документация",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Data Lineage (Происхождение данных)",
      "definition": "Визуальный и логический граф жизненного цикла данных: от первичного источника через все промежуточные ETL/dbt-трансформации до конечных BI-дашбордов."
    },
    {
      "term": "Data Governance",
      "definition": "Комплекс корпоративных политик, ролей и стандартов контроля безопасности, доступности, конфиденциальности и качества данных."
    },
    {
      "term": "Data Contract (Контракт данных)",
      "definition": "Формальное соглашение между поставщиком (сервисом-источником) и потребителем (командой DWH) о схеме, типах, SLA и семантике данных."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "audit_pipeline_runs",
      "description": "Журнал аудита качества данных и происхождения строк (Lineage)",
      "columns": [
        {
          "name": "run_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "pipeline_name",
          "type": "VARCHAR(100)"
        },
        {
          "name": "rows_processed",
          "type": "INT"
        },
        {
          "name": "status",
          "type": "VARCHAR(20)"
        }
      ],
      "sampleRows": [
        {
          "run_id": 1,
          "pipeline_name": "crm_to_silver_orders",
          "rows_processed": 150000,
          "status": "SUCCESS"
        },
        {
          "run_id": 2,
          "pipeline_name": "silver_to_gold_revenue",
          "rows_processed": 149800,
          "status": "SUCCESS"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Data Governance, Lineage и контроль качества данных\n\nСовременное хранилище данных — это сложнейший граф из сотен источников, тысяч dbt-моделей и десятков витрин. Если в отчете генерального директора цифра выручки расходится на 2%, как мгновенно найти причину?\n\n#### 1. Data Lineage (Сквозное происхождение данных)\nLineage отвечает на вопросы:\n* *Откуда взялась эта колонка в витрине?*\n* *Какие upstream-таблицы сломаются, если удалить поле в источнике?*\nИнструменты OpenLineage, dbt docs, DataHub строят автоматический DAG (направленный ациклический граф) движения каждого атрибута.\n\n#### 2. Аудит и метаданные строк\nВ каждой таблице DWH обязаны присутствовать технические атрибуты аудита:\n* `_loaded_at TIMESTAMP` — время вставки записи в хранилище.\n* `_source_system VARCHAR` — исходная система (например, CRM_PROD, 1C_ACCOUNTING).\n* `_job_run_id BIGINT` — идентификатор запуска пайплайна в Airflow.\n\n#### 3. Data Contracts (Контракты данных)\nСоглашение между разработчиками микросервисов и дата-инженерами. Если бекендер решает изменить тип поля с `int` на `string` в Postgres или переименовать поле в Kafka-событии, CI/CD блокирует деплой до согласования контракта с DWH."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Паспорт продукта и штрихкод",
      "content": "Data Lineage — это трекер посылки в службе доставки: вы точно видите, где посылка была принята, на каком складе прошла сортировку и какой курьер доставил ее в пункт выдачи. Вы всегда можете отследить путь каждого испорченного товара."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение хранилища без Governance и зрелого DWH",
        "beforeDescription": "Неуправляемое хранилище («Болото данных»)",
        "beforeColumns": [
          "governance_aspect",
          "data_swamp_state",
          "business_impact"
        ],
        "beforeRows": [
          [
            "Lineage",
            "Zero visibility of dependencies",
            "Fear to modify any SQL"
          ],
          [
            "Schema changes",
            "Silent breaking changes upstream",
            "Morning downtime incidents"
          ],
          [
            "Metadata audit",
            "No _loaded_at or origin keys",
            "Impossible to debug numbers"
          ]
        ],
        "afterDescription": "Зрелый Enterprise DWH с Data Governance",
        "afterColumns": [
          "governance_aspect",
          "data_governance_state",
          "business_impact"
        ],
        "afterRows": [
          [
            "Lineage",
            "End-to-end DAG in DataHub/dbt",
            "Instant root cause analysis"
          ],
          [
            "Data contracts",
            "Schema enforcement in CI/CD",
            "Zero unexpected schema drift"
          ],
          [
            "Metadata audit",
            "Full trace from source to gold",
            "100% regulatory trust"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Бэкендер удалил поле в БД, уронив 40 ночных пайплайнов",
      "content": "Разработчик удалил неиспользуемую, по его мнению, колонку `client_type` в боевой PostgreSQL. Ночью упало 40 дагов в Airflow, зависли расчеты бонусов и сорвался квартальный релиз. Внедрение Data Contracts защищает от подобных катастроф."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое Data Lineage на уровне колонок (Column-Level Lineage) и как его получить?",
      "content": "**Ответ:** Column-Level Lineage отслеживает путь не просто между таблицами, а трансформацию конкретных полей (например: `stg_orders.price * stg_orders.qty -> fct_sales.total_amount -> mart_kpi.avg_check`). Он извлекается автоматически с помощью синтаксического разбора SQL AST (библиотеки sqlglot, dbt, OpenLineage)."
    }
  ],
  "taskDescription": "Смоделируйте таблицу с техническими атрибутами Data Governance и проверку качества:\n1. Создайте витрину 'curated_customer_balances' (customer_id INT PRIMARY KEY, balance NUMERIC(12,2) NOT NULL, _source_system VARCHAR(50) NOT NULL, _loaded_at VARCHAR(20) NOT NULL, _pipeline_run_id INT NOT NULL).\n2. Вставьте две записи из разных источников ('CRM_MSK' и 'BILLING_ONLINE').\n3. Напишите запрос аудита, группирующий число записей и средний баланс по источникам '_source_system', отсортированный по '_source_system ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте curated_customer_balances с метаполями аудита\n-- 2. Вставьте записи\n-- 3. Выведите аудит по _source_system",
  "solutionCode": "CREATE TABLE curated_customer_balances (\n    customer_id INT PRIMARY KEY,\n    balance NUMERIC(12,2) NOT NULL,\n    _source_system VARCHAR(50) NOT NULL,\n    _loaded_at VARCHAR(20) NOT NULL,\n    _pipeline_run_id INT NOT NULL\n);\n\nINSERT INTO curated_customer_balances VALUES\n(1, 150000.00, 'CRM_MSK', '2026-11-01 04:00:00', 4001),\n(2, 350000.00, 'BILLING_ONLINE', '2026-11-01 04:00:00', 4001),\n(3, 250000.00, 'CRM_MSK', '2026-11-01 04:00:00', 4001);\n\nSELECT \n    _source_system,\n    COUNT(*) AS total_records,\n    ROUND(AVG(balance), 2) AS avg_balance\nFROM curated_customer_balances\nGROUP BY _source_system\nORDER BY _source_system ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "_source_system",
      "total_records",
      "avg_balance"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #408: Отсутствие метаданных сделало невозможным расследование расхождения данных",
    "incidentDescription": "В витрине без технических полей _loaded_at и _source_system обнаружили некорректные балансы, но не смогли понять, какой сервис прислал мусорные данные.",
    "buggyCode": "CREATE TABLE customer_balances (customer_id INT, balance NUMERIC(12,2));",
    "fixHint": "Добавьте обязательные метаполя _source_system, _loaded_at и _pipeline_run_id.",
    "solutionCode": "CREATE TABLE customer_balances (customer_id INT, balance NUMERIC(12,2), _source_system VARCHAR(50), _loaded_at VARCHAR(20));",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте curated_customer_balances с указанными полями аудита.",
    "Выполните агрегацию: COUNT(*) AS total_records, ROUND(AVG(balance), 2) AS avg_balance.",
    "Сгруппируйте по _source_system и отсортируйте по _source_system ASC;."
  ]
};
