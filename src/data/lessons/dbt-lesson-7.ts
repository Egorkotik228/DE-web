import { Lesson } from '@/types/course';

export const dbtLesson7: Lesson = {
  "id": "dbt-7",
  "moduleSlug": "dbt",
  "order": 7,
  "title": "Документирование и Lineage: dbt docs, doc blocks, exposures и сквозной граф данных",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "dbt Docs (dbt docs generate)",
      "definition": "Инструмент автоматической генерации интерактивного статического веб-сайта с полным описанием моделей, колонок, тестов и графа происхождения данных (DAG Lineage)."
    },
    {
      "term": "dbt Exposure",
      "definition": "Элемент метаданных dbt, определяющий внешнего потребителя данных (дашборд в Superset/Tableau, ML-модель, эндпоинт API) и связывающий его с исходными таблицами."
    },
    {
      "term": "Doc Block ({% docs %})",
      "definition": "Фрагмент форматированного Markdown-описания, вынесенный в отдельный файл и переиспользуемый для документирования одинаковых по смыслу колонок в разных таблицах."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dbt_exposures_catalog",
      "description": "Реестр BI-дашбордов и их прямых зависимостей от витрин dbt",
      "columns": [
        {
          "name": "exposure_name",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "type",
          "type": "VARCHAR(32)"
        },
        {
          "name": "owner_email",
          "type": "VARCHAR(64)"
        },
        {
          "name": "depends_on_model",
          "type": "VARCHAR(64)"
        }
      ],
      "sampleRows": [
        {
          "exposure_name": "executive_revenue_dashboard",
          "type": "dashboard",
          "owner_email": "bi_lead@corp.com",
          "depends_on_model": "fct_monthly_financials"
        },
        {
          "exposure_name": "churn_prediction_model",
          "type": "ml",
          "owner_email": "ml_eng@corp.com",
          "depends_on_model": "dim_customer_features"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Самодокументируемое хранилище: dbt Docs и сквозной Data Lineage\n\nВ большинстве компаний документация к DWH хранится в устаревшем Confluence, куда никто не заглядывал 2 года. Инженер меняет колонку — и через час ломается главный финансовый дашборд генерального директора.\n\nВ dbt документация живет **вместе с кодом в Git** и компилируется автоматически:\n\n#### 1. Описание моделей и колонок в `schema.yml`:\n```yaml\nversion: 2\nmodels:\n  - name: dim_customers\n    description: \"Каноническое измерение клиентов с историей покупок\"\n    columns:\n      - name: customer_id\n        description: \"Естественный идентификатор клиента из CRM\"\n      - name: ltv_amount\n        description: \"Суммарный доход за все время жизни клиента\"\n```\n\n#### 2. Переиспользуемые блоки документации (Doc Blocks):\nЧтобы не копипастить описание поля `customer_id` в 30 таблицах, создают файл `docs/customers.md`:\n```markdown\n{% docs customer_id %}\nУникальный целочисленный идентификатор клиента, генерируемый PostgreSQL в сервисе Auth.\n{% enddocs %}\n```\nА в YAML пишут: `description: \"{{ doc('customer_id') }}\"`.\n\n#### 3. Понятие Exposure (Связь с BI):\nСекция `exposures:` сообщает dbt: «Этот дашборд в Metabase читает модель `fct_orders`». При изменении модели инженер на Lineage-графе сразу видит, какие именно отчеты бизнеса будут затронуты (Impact Analysis)!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Интерактивная карта метрополитена",
      "content": "Lineage Graph в dbt Docs — это схема метро: вы видите, с какой сырой станции (источник в CRM) отправляется поезд, через какие пересадки (staging и intermediate) он проходит и на какой конечной станции (дашборд в PowerBI) выходят пассажиры. Если станция на ремонте, вы заранее знаете, какие ветки встанут."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение статической документации и dbt Docs",
        "beforeDescription": "Документация в Confluence / Excel",
        "beforeColumns": [
          "documentation_aspect",
          "maintenance_reality",
          "business_trust"
        ],
        "beforeRows": [
          [
            "Separate wiki pages",
            "Outdated after first sprint",
            "Nobody reads or believes it"
          ],
          [
            "Unknown downstream impacts",
            "Drop column breaks BI reports",
            "Constant production incidents"
          ],
          [
            "Manual schema diagrams",
            "Drawings drift from reality",
            "Impossible column lineage"
          ]
        ],
        "afterDescription": "Автогенерируемый dbt Docs сайт",
        "afterColumns": [
          "documentation_aspect",
          "maintenance_reality",
          "business_trust"
        ],
        "afterRows": [
          [
            "Code-adjacent markdown",
            "Updated on every git commit",
            "100% single source of truth"
          ],
          [
            "Exposures track BI tools",
            "Instant impact analysis on PR",
            "Zero surprise report breakage"
          ],
          [
            "Interactive DAG Lineage",
            "Generated directly from SQL ref()",
            "Clickable end-to-end lineage"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Удаление колонки без проверки Exposures в Lineage",
      "content": "Инженер удалил «неиспользуемую» колонку `utm_source` из витрины. Через 10 минут упал дашборд маркетологов, управляющий закупкой рекламы на 50 млн рублей. Если бы в проекте были настроены `exposures`, инженер бы сразу увидел зависимость в графе dbt Docs!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как команда `dbt docs generate` строит Data Lineage граф?",
      "content": "**Ответ:** Во время компиляции dbt парсит все вызовы макросов `{{ ref(...) }}` и `{{ source(...) }}` во всех `.sql` файлах. На их основе формируется направленный ациклический граф (DAG), который сериализуется в единый JSON-манифест `target/manifest.json`. Веб-интерфейс dbt Docs рендерит этот граф прямо в браузере."
    }
  ],
  "taskDescription": "Сформируйте спецификацию внешнего BI-дашборда 'exposures.yml' в dbt:\n1. Версия спецификации: `version: 2`.\n2. Секция: `exposures:`.\n3. Имя дашборда: `name: weekly_executive_kpis`.\n4. Тип потребителя: `type: dashboard`.\n5. Владелец: `owner:` с полем `email: analytics@company.com`.\n6. Зависимость: `depends_on:` со ссылкой на модель `- ref('fct_orders')`.\n\nВведите текст YAML-конфигурации exposure.",
  "seedCode": "# Напишите exposures.yml для связи с BI-дашбордом\n",
  "initialCode": "version: 2\n\nexposures:\n  - name: weekly_executive_kpis\n    type: dashboard\n    owner:\n      email: analytics@company.com\n    depends_on:\n      - ref('fct_orders')",
  "solutionCode": "version: 2\n\nexposures:\n  - name: weekly_executive_kpis\n    type: dashboard\n    owner:\n      email: analytics@company.com\n    depends_on:\n      - ref('fct_orders')",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "version: 2",
      "exposures:",
      "name: weekly_executive_kpis",
      "type: dashboard",
      "email: analytics@company.com",
      "depends_on:",
      "- ref('fct_orders')"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #907: Падение отчетов руководства из-за скрытой зависимости",
    "incidentDescription": "Инженер удалил поле в dbt, не зная, что оно используется в ключевом отчете PowerBI.",
    "buggyCode": "# Отсутствие декларации exposures в dbt проекте\nmodels:\n  - name: fct_orders",
    "fixHint": "Задекларируйте exposure для отчета с указанием depends_on: ref('fct_orders').",
    "solutionCode": "exposures:\n  - name: powerbi_sales_report\n    type: dashboard\n    depends_on:\n      - ref('fct_orders')",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте корневой ключ `exposures:`.",
    "Укажите `type: dashboard` и объект `owner:` с email.",
    "В секции `depends_on:` укажите `- ref('fct_orders')`."
  ]
};
