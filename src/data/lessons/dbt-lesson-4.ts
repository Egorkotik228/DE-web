import { Lesson } from '@/types/course';

export const dbtLesson4: Lesson = {
  "id": "dbt-4",
  "moduleSlug": "dbt",
  "order": 4,
  "title": "Jinja и макросы: Динамический SQL, циклы for, кастомные макросы и пакет dbt_utils",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Jinja2 в dbt",
      "definition": "Движок шаблонизации текста в Python, позволяющий писать циклы, условные операторы и макросы прямо внутри SQL-файлов для динамической кодогенерации."
    },
    {
      "term": "dbt Macro (Макрос)",
      "definition": "Переиспользуемый фрагмент логики или функции (аналог функции в языках программирования), определяемый через тег {% macro %} и возвращающий скомпилированный SQL."
    },
    {
      "term": "Пакет dbt_utils",
      "definition": "Официальная стандартная библиотека макросов dbt с готовыми решениями для суррогатных ключей (generate_surrogate_key), pivot-таблиц и валидаций."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "payment_pivoted_mart",
      "description": "Сводная витрина платежей, сгенерированная циклом Jinja",
      "columns": [
        {
          "name": "order_id",
          "type": "INTEGER",
          "keyType": "PK"
        },
        {
          "name": "credit_card_amount",
          "type": "NUMERIC(10, 2)"
        },
        {
          "name": "sbp_amount",
          "type": "NUMERIC(10, 2)"
        },
        {
          "name": "cash_amount",
          "type": "NUMERIC(10, 2)"
        }
      ],
      "sampleRows": [
        {
          "order_id": 501,
          "credit_card_amount": 1500.0,
          "sbp_amount": 0.0,
          "cash_amount": 0.0
        },
        {
          "order_id": 502,
          "credit_card_amount": 0.0,
          "sbp_amount": 3200.0,
          "cash_amount": 0.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Jinja в dbt: Превращаем статичный SQL в мощный язык программирования\n\nОбычный SQL страдает от чудовищного дублирования кода: если нужно сделать сводную таблицу (pivot) по 15 типам платежей, приходится писать 15 одинаковых блоков `SUM(CASE WHEN method = '...' THEN amount ELSE 0 END) AS ...`.\n\nШаблонизатор **Jinja** позволяет использовать циклы `for`, переменные и условия прямо в SQL!\n\n#### 1. Генерация сводных колонок (Pivot) через цикл Jinja:\n```sql\n{% set payment_methods = ['credit_card', 'sbp', 'cash', 'crypto'] %}\n\nSELECT\n    order_id,\n    {% for method in payment_methods %}\n        SUM(CASE WHEN payment_method = '{{ method }}' THEN amount ELSE 0 END) AS {{ method }}_amount\n        {%- if not loop.last %},{% endif %}\n    {% endfor %}\nFROM {{ ref('stg_payments') }}\nGROUP BY order_id\n```\n\n#### 2. Создание кастомного переиспользуемого макроса (`macros/cents_to_rub.sql`):\n```sql\n{% macro cents_to_rub(column_name, scale=2) %}\n    ROUND({{ column_name }} / 100.0, {{ scale }})\n{% endmacro %}\n```\nТеперь в любых 50 моделях хранилища можно писать просто: `{{ cents_to_rub('amount_cents') }} AS amount_rub`!\n\n#### 3. Мощь библиотеки `dbt_utils`:\nВместо самодельного хэширования используйте стандарт индустрии: `{{ dbt_utils.generate_surrogate_key(['customer_id', 'order_date']) }} AS hk_order`."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Печатный станок Гутенберга",
      "content": "Писать 20 одинаковых выражений CASE WHEN вручную — это труд средневекового монаха-переписчика. Цикл Jinja — это печатный станок: вы задаете один шаблон оттиска и набор букв (список методов), а станок штампует безупречный SQL без единой опечатки в названиях колонок."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение ручного SQL и Jinja-шаблонизации",
        "beforeDescription": "Ручной копипаст 15 колонок CASE WHEN",
        "beforeColumns": [
          "maintenance_task",
          "manual_sql_effort",
          "bug_probability"
        ],
        "beforeRows": [
          [
            "Add new payment method",
            "Edit 20 models manually",
            "Forgot comma or typo in alias"
          ],
          [
            "Change currency scale",
            "Search & replace 100 files",
            "Missed 5 files, broken mart"
          ],
          [
            "Surrogate key hash formula",
            "Inconsistent MD5 concatenation",
            "Collision on NULL values"
          ]
        ],
        "afterDescription": "Jinja цикл + переиспользуемый макрос",
        "afterColumns": [
          "maintenance_task",
          "manual_sql_effort",
          "bug_probability"
        ],
        "afterRows": [
          [
            "Add new payment method",
            "Add 1 string to list",
            "Generated 100% syntactically valid"
          ],
          [
            "Change currency scale",
            "Edit 1 macro file in /macros",
            "Applied globally across all DWH"
          ],
          [
            "Surrogate key hash formula",
            "dbt_utils.generate_surrogate_key",
            "Standardized robust hashing"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Пропущенный дефис обрезки пробелов `{%-` и синтаксическая ошибка запятой",
      "content": "В цикле `for` забыли проверку `if not loop.last`. После последней сгенерированной колонки Jinja поставил лишнюю запятую перед блоком `FROM`. Запрос упал в базе с синтаксической ошибкой `Syntax error at or near FROM`. Всегда используйте проверку `{% if not loop.last %},{% endif %}`."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем `{{ ... }}` отличается от `{% ... %}` в синтаксисе Jinja?",
      "content": "**Ответ:** Двойные фигурные скобки `{{ expression }}` используются для вывода значения выражения или вызова макроса в скомпилированный SQL-текст (Print statement). Скобки с процентами `{% statement %}` используются для управляющих конструкций (логические ветвления `if`, циклы `for`, установка переменных `set`), которые сами по себе текст не выводят."
    }
  ],
  "taskDescription": "Сформируйте витрину агрегации платежей с использованием цикла Jinja:\n1. Задайте список методов оплаты: `{% set methods = ['card', 'cash'] %}`.\n2. В блоке SELECT извлеките 'order_id'.\n3. С помощью цикла `{% for method in methods %}` сгенерируйте колонки:\n   `SUM(CASE WHEN payment_type = '{{ method }}' THEN amount ELSE 0 END) AS {{ method }}_total`.\n4. Используйте проверку `{% if not loop.last %},{% endif %}` для разделения колонок.\n5. Завершите цикл `{% endfor %}` и укажите источник `FROM {{ ref('stg_payments') }} GROUP BY order_id`.",
  "seedCode": "-- Сгенерируйте динамический SQL с помощью цикла Jinja\n",
  "initialCode": "{% set methods = ['card', 'cash'] %}\n\nSELECT\n    order_id,\n    {% for method in methods %}\n        SUM(CASE WHEN payment_type = '{{ method }}' THEN amount ELSE 0 END) AS {{ method }}_total{% if not loop.last %},{% endif %}\n    {% endfor %}\nFROM {{ ref('stg_payments') }}\nGROUP BY order_id",
  "solutionCode": "{% set methods = ['card', 'cash'] %}\n\nSELECT\n    order_id,\n    {% for method in methods %}\n        SUM(CASE WHEN payment_type = '{{ method }}' THEN amount ELSE 0 END) AS {{ method }}_total{% if not loop.last %},{% endif %}\n    {% endfor %}\nFROM {{ ref('stg_payments') }}\nGROUP BY order_id",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "{% set methods = ['card', 'cash'] %}",
      "{% for method in methods %}",
      "payment_type = '{{ method }}'",
      "{{ method }}_total",
      "{% if not loop.last %},{% endif %}",
      "{% endfor %}",
      "{{ ref('stg_payments') }}",
      "GROUP BY order_id"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #904: Лишняя запятая перед FROM при генерации цикла в Jinja",
    "incidentDescription": "Из-за отсутствия проверки loop.last dbt сгенерировал синтаксическую ошибку 'SELECT order_id, col1, col2, FROM table'.",
    "buggyCode": "{% for c in ['a', 'b'] %}\n  sum({{ c }}) as {{ c }},\n{% endfor %}\nFROM my_table",
    "fixHint": "Добавьте проверку {% if not loop.last %},{% endif %} после каждой сгенерированной колонки.",
    "solutionCode": "{% for c in ['a', 'b'] %}\n  sum({{ c }}) as {{ c }}{% if not loop.last %},{% endif %}\n{% endfor %}\nFROM my_table",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Объявите список: `{% set methods = ['card', 'cash'] %}`.",
    "Внутри цикла используйте `CASE WHEN payment_type = '{{ method }}' THEN amount ELSE 0 END AS {{ method }}_total`.",
    "Для корректной расстановки запятых используйте `{% if not loop.last %},{% endif %}`."
  ]
};
