import { Lesson } from '@/types/course';

export const dbtLesson8: Lesson = {
  "id": "dbt-8",
  "moduleSlug": "dbt",
  "order": 8,
  "title": "Production Best Practices: Slim CI, Data Contracts и Unit-тесты dbt 1.8+",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Slim CI (state:modified)",
      "definition": "Техника запуска dbt в CI/CD, при которой тестируются и собираются только измененные в Pull Request модели и их прямые потомки (dbt build --select state:modified+), экономя часы времени сборки."
    },
    {
      "term": "Data Contract (Контракт данных)",
      "definition": "Декларативное соглашение в dbt (contract: enforced: true), жестко фиксирующее типы колонок и запрещающее изменение схемы модели без согласования с потребителями."
    },
    {
      "term": "Unit-тесты в dbt (dbt 1.8+)",
      "definition": "Встроенный механизм юнит-тестирования бизнес-логики SQL на фиктивных таблицах (mock inputs) без обращения к реальным сырым данным хранилища."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dbt_contract_audit",
      "description": "Проверка соблюдения контрактов данных при сборке моделей",
      "columns": [
        {
          "name": "model_name",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "contract_enforced",
          "type": "BOOLEAN"
        },
        {
          "name": "schema_diff_status",
          "type": "VARCHAR(32)"
        }
      ],
      "sampleRows": [
        {
          "model_name": "dim_clients",
          "contract_enforced": true,
          "schema_diff_status": "CONTRACT_VALID"
        },
        {
          "model_name": "fct_transactions",
          "contract_enforced": true,
          "schema_diff_status": "TYPE_MISMATCH_BLOCKED"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Enterprise dbt в продакшне: Slim CI, Контракты данных и Unit-тесты\n\nКогда в репозитории dbt работает 30 инженеров и 1000 моделей, полный запуск `dbt build` на каждый Pull Request занимает 2 часа и сжигает тысячи долларов в Snowflake/ClickHouse.\n\n#### 1. Slim CI через сравнение состояний (`state:modified`):\nCI скачивает скомпилированный `manifest.json` из последнего успешного продакшн-запуска и запускает **только измененные модели и их детей**:\n```bash\ndbt build --select state:modified+ --defer --state path/to/prod_artifacts\n```\nФлаг `--defer` заставляет dbt брать неизменившиеся родительские модели напрямую из продакшн-схемы, экономя часы ожидания!\n\n#### 2. Data Contracts (Гарантия схемы в dbt):\nРаньше разработчик мог случайно изменить тип поля с `integer` на `varchar`, сломав BI. Контракт данных гарантирует неизменность схемы на уровне СУБД:\n```yaml\nmodels:\n  - name: dim_customers\n    config:\n      contract:\n        enforced: true\n    columns:\n      - name: customer_id\n        data_type: integer\n      - name: email\n        data_type: varchar\n```\nЕсли типы в SQL-запросе не совпадут со спецификацией, dbt упадет с ошибкой компиляции еще до запуска запроса в базе!\n\n#### 3. Встроенные Unit-тесты dbt (dbt 1.8+):\nВместо тестирования на грязных терабайтах данных вы задаете моковые данные прямо в YAML:\n```yaml\nunit_tests:\n  - name: test_calculate_vip_status\n    model: dim_customers\n    given:\n      - input: ref('stg_orders')\n        rows:\n          - {customer_id: 1, total_spent: 150000}\n    expect:\n      rows:\n        - {customer_id: 1, is_vip: true}\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Нотариальный договор и краш-тест",
      "content": "Data Contract — это нотариальный договор между дата-командой и потребителями: вы гарантируете, что квартира 3-комнатная (типы колонок зафиксированы), и никто не имеет права снести стену без уведомления. А Slim CI — это ремонт только сломанной детали, а не снос всего дома до фундамента при замене дверной ручки."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение традиционного CI и Slim CI с контрактами",
        "beforeDescription": "Полный перезапуск всех 1000 моделей в PR",
        "beforeColumns": [
          "ci_aspect",
          "pr_validation_time",
          "schema_stability"
        ],
        "beforeRows": [
          [
            "Rebuild all models",
            "90-120 minutes waiting",
            "High compute bills"
          ],
          [
            "Unchecked schema drift",
            "Silent breaking type changes",
            "Downstream BI crashes"
          ],
          [
            "Test on full dataset only",
            "Slow non-deterministic tests",
            "Hard to simulate edge cases"
          ]
        ],
        "afterDescription": "Slim CI + Data Contracts + Unit Tests",
        "afterColumns": [
          "ci_aspect",
          "pr_validation_time",
          "schema_stability"
        ],
        "afterRows": [
          [
            "state:modified+ with --defer",
            "2 minutes execution",
            "90% CI cloud cost savings"
          ],
          [
            "contract: enforced: true",
            "Compile-time schema lock",
            "100% stable downstream contracts"
          ],
          [
            "dbt 1.8 unit tests on mocks",
            "Instant deterministic test",
            "Zero test data maintenance"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Запуск CI без флага `--defer`",
      "content": "Инженер запустил `dbt run --select state:modified+` без флага `--defer`. dbt попытался собрать модель, ссылающуюся на родительскую таблицу `ref('stg_users')`, которой нет в пустой тестовой CI-схеме, и упал с ошибкой `Table not found`. Флаг `--defer` обязателен для чтения неизменившихся родителей из продакшна!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что произойдет при нарушении Data Contract (например, если модель вернет дополнительную незадекларированную колонку)?",
      "content": "**Ответ:** Если включен `contract: enforced: true`, dbt производит строгую валидацию набора и типов колонок. Если модель возвращает колонку, которой нет в списке `columns:`, или отсутствует задекларированная колонка, или не совпадает тип данных (`data_type`), dbt немедленно прерывает выполнение с ошибкой `Compilation Error: Contract enforcement failed`."
    }
  ],
  "taskDescription": "Сформируйте спецификацию модели с принудительным Data Contract в файле 'schema.yml':\n1. Версия спецификации: `version: 2`.\n2. Модель: `name: dim_accounts`.\n3. В блоке `config:` активируйте контракт: `contract:` с параметром `enforced: true`.\n4. Задекларируйте колонки:\n   - `name: account_id` с типом `data_type: integer`\n   - `name: balance` с типом `data_type: numeric`\n\nВведите текст YAML-конфигурации модели с контрактом данных.",
  "seedCode": "# Напишите модель с Data Contract в schema.yml\n",
  "initialCode": "version: 2\n\nmodels:\n  - name: dim_accounts\n    config:\n      contract:\n        enforced: true\n    columns:\n      - name: account_id\n        data_type: integer\n      - name: balance\n        data_type: numeric",
  "solutionCode": "version: 2\n\nmodels:\n  - name: dim_accounts\n    config:\n      contract:\n        enforced: true\n    columns:\n      - name: account_id\n        data_type: integer\n      - name: balance\n        data_type: numeric",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "version: 2",
      "name: dim_accounts",
      "contract:",
      "enforced: true",
      "name: account_id",
      "data_type: integer",
      "name: balance",
      "data_type: numeric"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #908: Изменение типа поля в DWH сломало downstream BI",
    "incidentDescription": "Разработчик изменил тип client_id с int на text, и дашборд упал с ошибкой Type Mismatch.",
    "buggyCode": "models:\n  - name: dim_clients\n    # Без контракта данных",
    "fixHint": "Включите contract: enforced: true и зафиксируйте data_type для каждой колонки.",
    "solutionCode": "models:\n  - name: dim_clients\n    config:\n      contract:\n        enforced: true\n    columns:\n      - name: client_id\n        data_type: integer",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "В секции `config:` укажите `contract:` со значением `enforced: true`.",
    "Для каждой колонки в секции `columns:` обязательно укажите свойство `data_type`.",
    "Соблюдайте корректные отступы YAML (2 пробела)."
  ]
};
