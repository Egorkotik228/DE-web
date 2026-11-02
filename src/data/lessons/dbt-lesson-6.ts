import { Lesson } from '@/types/course';

export const dbtLesson6: Lesson = {
  "id": "dbt-6",
  "moduleSlug": "dbt",
  "order": 6,
  "title": "Тестирование и Качество данных: Встроенные generic тесты, кастомные singular тесты и dbt-expectations",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Generic Tests (Встроенные тесты dbt)",
      "definition": "Параметризованные тесты качества данных (unique, not_null, accepted_values, relationships), декларируемые в YAML-файлах схемы (schema.yml)."
    },
    {
      "term": "Singular Tests (Сингулярные тесты)",
      "definition": "Пользовательские SQL-запросы в папке tests/, возвращающие ошибочные строки (Failing Records); если запрос возвращает хотя бы 1 строку — тест считается проваленным."
    },
    {
      "term": "Severity: error vs warn",
      "definition": "Уровень строгости проверки в dbt: warn выводит предупреждение в консоль без остановки пайплайна; error немедленно прерывает выполнение DAG."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dbt_test_failures_audit",
      "description": "Журнал проваленных проверок качества данных dbt test",
      "columns": [
        {
          "name": "test_name",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "model_name",
          "type": "VARCHAR(64)"
        },
        {
          "name": "failed_records_count",
          "type": "INTEGER"
        },
        {
          "name": "severity",
          "type": "VARCHAR(16)"
        }
      ],
      "sampleRows": [
        {
          "test_name": "not_null_customer_id",
          "model_name": "dim_customers",
          "failed_records_count": 0,
          "severity": "error"
        },
        {
          "test_name": "accepted_values_order_status",
          "model_name": "fct_orders",
          "failed_records_count": 14,
          "severity": "error"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Тестирование данных в dbt: Как защитить витрины от мусора источников\n\nДата-инженер отвечает за качество данных головой. Если в витрине выручки появятся отрицательные суммы заказов или дублирующиеся ID клиентов, бизнес примет ошибочные решения на миллионы рублей.\n\ndbt предоставляет встроенный фреймворк автоматизированного тестирования Data Quality:\n\n#### 1. Четыре встроенных generic-теста в `schema.yml`:\n```yaml\nversion: 2\nmodels:\n  - name: fct_orders\n    columns:\n      - name: order_id\n        tests:\n          - unique\n          - not_null\n      - name: status\n        tests:\n          - accepted_values:\n              values: ['placed', 'shipped', 'completed', 'returned']\n      - name: customer_id\n        tests:\n          - relationships:\n              to: ref('dim_customers')\n              field: customer_id\n```\n\n#### 2. Философия Singular-тестов (Ассерты в SQL):\nТест в dbt пишется как **запрос, ищущий ошибки**. Если тест возвращает 0 строк — данные чисты (Success). Если возвращает хоть одну строку — тест упал (Failed)!\n\nФайл `tests/assert_total_order_amount_positive.sql`:\n```sql\n-- Тест упадет, если найдется заказ с отрицательной суммой\nSELECT order_id, amount\nFROM {{ ref('fct_orders') }}\nWHERE amount < 0\n```\n\nКоманда `dbt test` автоматически выполняет все проверки параллельно перед публикацией витрин."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Металлодетектор на входе в аэропорт",
      "content": "Тесты dbt — это рамка металлодетектора: в нормальном режиме через нее молча проходят тысячи пассажиров (запрос возвращает 0 строк). Но если в кармане запрещенный предмет (дубликат ID или NULL), рамка звенит на весь зал (тест находит строки) и охрана останавливает движение (dbt test прерывает деплой)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение ручных проверок и тестов dbt",
        "beforeDescription": "Ручные ad-hoc проверки аналитиками",
        "beforeColumns": [
          "quality_gate",
          "detection_time",
          "business_reputation"
        ],
        "beforeRows": [
          [
            "No automated assertions",
            "Detected weeks later by CEO",
            "Trust in data team destroyed"
          ],
          [
            "Duplicate primary keys",
            "Dashboard figures distorted",
            "Manual forensic SQL queries"
          ],
          [
            "Orphan foreign keys",
            "Silent data loss in inner joins",
            "Wrong financial calculations"
          ]
        ],
        "afterDescription": "Автоматизированные тесты dbt (dbt test)",
        "afterColumns": [
          "quality_gate",
          "detection_time",
          "business_reputation"
        ],
        "afterRows": [
          [
            "unique & not_null tests",
            "Caught in CI in 15 seconds",
            "100% confidence in reports"
          ],
          [
            "relationships integrity",
            "Orphan keys blocked immediately",
            "Clean referential integrity"
          ],
          [
            "accepted_values checks",
            "New unexpected status alerted",
            "Proactive engineering alerts"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Прогон тяжелых `relationships` тестов без фильтрации по дате",
      "content": "Инженер повесил тест `relationships` между фактами на 1 млрд строк и справочником на 50 млн клиентов. При выполнении `dbt test` база сделала гигантский `LEFT JOIN ... WHERE parent.id IS NULL` на терабайты данных и положила кластер. На огромных таблицах используйте сингулярные тесты с фильтром по дате или пакет `dbt_expectations`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что именно возвращает SQL-запрос dbt теста, когда тест успешно проходит?",
      "content": "**Ответ:** Успешный тест dbt возвращает **ровно 0 строк** (пустой результат). dbt транслирует каждый тест в конструкцию `SELECT COUNT(*) FROM (...) dbt_test_view`. Если счетчик равен 0 — тест зеленый (PASSED). Если счетчик $> 0$ — тест красный (FAILED)."
    }
  ],
  "taskDescription": "Сформируйте файл спецификации тестов 'schema.yml' для модели 'fct_payments':\n1. Версия спецификации: `version: 2`.\n2. Модель: `name: fct_payments`.\n3. Колонка 'payment_id' имеет обязательные тесты `unique` и `not_null`.\n4. Колонка 'payment_method' проверяется тестом `accepted_values` с допустимым списком: `['card', 'cash']`.\n\nВведите текст YAML-конфигурации тестов dbt.",
  "seedCode": "# Напишите schema.yml с тестами dbt\n",
  "initialCode": "version: 2\n\nmodels:\n  - name: fct_payments\n    columns:\n      - name: payment_id\n        tests:\n          - unique\n          - not_null\n      - name: payment_method\n        tests:\n          - accepted_values:\n              values: ['card', 'cash']",
  "solutionCode": "version: 2\n\nmodels:\n  - name: fct_payments\n    columns:\n      - name: payment_id\n        tests:\n          - unique\n          - not_null\n      - name: payment_method\n        tests:\n          - accepted_values:\n              values: ['card', 'cash']",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "version: 2",
      "name: fct_payments",
      "name: payment_id",
      "- unique",
      "- not_null",
      "accepted_values:",
      "values: ['card', 'cash']"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #906: Падение ночного пайплайна из-за нового непредвиденного статуса заказа",
    "incidentDescription": "Маркетплейс добавил статус 'disputed', а в accepted_values он не был внесен, из-за чего упал весь ночной ETL.",
    "buggyCode": "- accepted_values:\n    values: ['placed', 'shipped', 'delivered']",
    "fixHint": "Добавьте severity: warn или расширьте список допустимых значений.",
    "solutionCode": "- accepted_values:\n    values: ['placed', 'shipped', 'delivered', 'disputed']\n    config:\n      severity: warn",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Укажите `version: 2` и секцию `models:`.",
    "В секции `tests:` для `payment_id` укажите `- unique` и `- not_null`.",
    "Для `payment_method` используйте `- accepted_values:` со списком `values: ['card', 'cash']`."
  ]
};
