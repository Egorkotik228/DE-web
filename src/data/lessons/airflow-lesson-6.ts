import { Lesson } from '@/types/course';

export const airflowLesson6: Lesson = {
  "id": "airflow-6",
  "moduleSlug": "airflow",
  "order": 6,
  "title": "Идемпотентность и Backfill: Параметризация макросами ({{ ds }}), пересчет истории и catchup",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "Идемпотентность (Idempotency)",
      "definition": "Свойство конвейера данных давать строго одинаковый результат при многократном повторном запуске за один и тот же временной срез без накопления дубликатов."
    },
    {
      "term": "catchup (Догоняющий запуск)",
      "definition": "Параметр DAG (True/False), указывающий планировщику, нужно ли автоматически запустить все пропущенные исторические интервалы между start_date и текущей датой."
    },
    {
      "term": "Jinja-макрос {{ ds }}",
      "definition": "Встроенная переменная шаблонизатора Airflow, возвращающая расчетную дату logical_date в строковом формате YYYY-MM-DD (например, '2026-11-01')."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "idempotent_partition_sync",
      "description": "Партиционированная таблица DWH с атомарной перезаписью среза",
      "columns": [
        {
          "name": "partition_date",
          "type": "DATE",
          "keyType": "PK"
        },
        {
          "name": "total_orders",
          "type": "INTEGER"
        },
        {
          "name": "updated_at",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "partition_date": "2026-11-01",
          "total_orders": 4500,
          "updated_at": "2026-11-02 00:05:00"
        },
        {
          "partition_date": "2026-11-02",
          "total_orders": 5120,
          "updated_at": "2026-11-03 00:05:00"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Идемпотентность и пересчет истории (Backfill) в Apache Airflow\n\nРано или поздно в логике расчета метрик обнаружат ошибку: «последние 6 месяцев LTV считался без учета возвратов». Дата-инженеру нужно запустить **Backfill** (пересчитать 180 дней истории). Если DAG не идемпотентен, вы получите кашу из удвоенных и утроенных строк!\n\n#### 1. Золотой паттерн WAP (Write-Audit-Publish) или Атомарный Replace:\n❌ **Убийственный антипаттерн:**\n```sql\nINSERT INTO mart_orders SELECT * FROM staging_orders WHERE order_date = '{{ ds }}';\n-- Запустили Backfill 3 раза -> выручка увеличилась в 3 раза!\n```\n\n✅ **Идемпотентный паттерн (Delete + Insert / Replace Partition):**\n```sql\nDELETE FROM mart_orders WHERE partition_date = '{{ ds }}';\nINSERT INTO mart_orders (partition_date, customer_id, total)\nSELECT '{{ ds }}', customer_id, SUM(price)\nFROM raw_orders\nWHERE order_date = '{{ ds }}'\nGROUP BY customer_id;\n```\n\n#### 2. Зачем отключать `catchup=False`?\nЕсли вы создадите DAG со `start_date=datetime(2025, 1, 1)` и оставите `catchup=True` (по умолчанию), Scheduler моментально поставит в очередь **700 параллельных запусков** за каждый пропущенный день за последние 2 года! Это обрушит базу данных и заполнит очередь задач. Всегда выставляйте `catchup=False`, а исторический пересчет запускайте контролируемо через CLI:\n```bash\nairflow dags backfill -s 2026-01-01 -e 2026-02-01 --reset-dagruns my_dag_id\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Замена страницы в паспорте",
      "content": "Неидемпотентная операция — это вклеивать новую фотографию поверх старой: после трех попыток паспорт раздуется и станет недействительным. Идемпотентная операция — это стереть старую страницу ластиком и вписать актуальные данные заново. Сколько бы раз вы ни повторяли процедуру, в паспорте будет ровно одна актуальная запись."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение методов загрузки данных при ретраях и Backfill",
        "beforeDescription": "Неидемпотентный слепой INSERT",
        "beforeColumns": [
          "backfill_scenario",
          "db_state_after_retry",
          "business_impact"
        ],
        "beforeRows": [
          [
            "Retry on network timeout",
            "Duplicate transactions created",
            "Financial reporting distorted"
          ],
          [
            "Manual historical backfill",
            "Rows multiplied by run count",
            "Metrics inflated 300%"
          ],
          [
            "Catchup=True on new DAG",
            "Massive cluster-wide queue burst",
            "Database CPU hits 100%"
          ]
        ],
        "afterDescription": "Строгая партиционная идемпотентность (WAP)",
        "afterColumns": [
          "backfill_scenario",
          "db_state_after_retry",
          "business_impact"
        ],
        "afterRows": [
          [
            "Retry on network timeout",
            "Clean idempotent partition replace",
            "Exact match to reality"
          ],
          [
            "Manual historical backfill",
            "Historical slice cleanly updated",
            "100% audit accuracy"
          ],
          [
            "Catchup=False with targeted CLI",
            "Controlled, sequential backfill",
            "Zero database overload"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: `datetime.today()` вместо `{{ ds }}` в SQL-запросах",
      "content": "Инженер написал в SQL-файле: `WHERE dt = CURRENT_DATE`. При штатной работе в полночь всё работало. Но когда упал сервер и пришлось запустить Backfill за прошлый понедельник, запрос все равно выбрал данные за СЕГОДНЯ, перезаписав прошлую неделю сегодняшними данными. Используйте только шаблонизированный макрос `{{ ds }}`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Что такое `data_interval_start` и `data_interval_end` в Airflow 2.2+?",
      "content": "**Ответ:** Раньше в Airflow было неинтуитивное понятие `execution_date` (которое на самом деле означало начало интервала). В 2.2+ введены прозрачные поля `data_interval_start` и `data_interval_end`. Для ежедневного дага за 1 ноября: start = `2026-11-01 00:00:00`, end = `2026-11-02 00:00:00`. Запрос должен фильтровать данные строго внутри этого полуинтервала: `timestamp >= start AND timestamp < end`."
    }
  ],
  "taskDescription": "Сформируйте строго идемпотентный SQL-запрос для оператора PostgresOperator с использованием Jinja-макроса '{{ ds }}':\n1. Удалите старые данные за расчетный день: `DELETE FROM mart_daily_revenue WHERE calculation_date = '{{ ds }}';`.\n2. Вставьте агрегированные метрики: `INSERT INTO mart_daily_revenue (calculation_date, total_revenue) SELECT '{{ ds }}', SUM(amount) FROM raw_payments WHERE payment_date = '{{ ds }}';`.\n\nВведите объединенный идемпотентный SQL-запрос с точкой с запятой между командами.",
  "seedCode": "-- Напишите строго идемпотентный SQL для Airflow с макросом {{ ds }}\n",
  "initialCode": "DELETE FROM mart_daily_revenue WHERE calculation_date = '{{ ds }}';\nINSERT INTO mart_daily_revenue (calculation_date, total_revenue)\nSELECT '{{ ds }}', SUM(amount)\nFROM raw_payments\nWHERE payment_date = '{{ ds }}';",
  "solutionCode": "DELETE FROM mart_daily_revenue WHERE calculation_date = '{{ ds }}';\nINSERT INTO mart_daily_revenue (calculation_date, total_revenue)\nSELECT '{{ ds }}', SUM(amount)\nFROM raw_payments\nWHERE payment_date = '{{ ds }}';",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "DELETE FROM mart_daily_revenue",
      "calculation_date = '{{ ds }}'",
      "INSERT INTO mart_daily_revenue",
      "WHERE payment_date = '{{ ds }}'"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #806: Утроение выручки в BI-дашборде после перезапуска таски",
    "incidentDescription": "Из-за сбоя в сети DAG выполнил 3 ретрая неидемпотентного INSERT INTO sales, раздув финансовый отчет компании.",
    "buggyCode": "INSERT INTO sales_mart SELECT date, sum(amount) FROM raw_sales WHERE date = '{{ ds }}' GROUP BY date;",
    "fixHint": "Добавьте предварительное удаление DELETE FROM sales_mart WHERE date = '{{ ds }}' перед вставкой.",
    "solutionCode": "DELETE FROM sales_mart WHERE date = '{{ ds }}';\nINSERT INTO sales_mart SELECT date, sum(amount) FROM raw_sales WHERE date = '{{ ds }}' GROUP BY date;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Идемпотентный паттерн объединяет `DELETE ... WHERE calculation_date = '{{ ds }}'` и последующий `INSERT`.",
    "Используйте макрос `{{ ds }}` как для даты удаления, так и для фильтрации исходных данных.",
    "Разделяйте выражения точкой с запятой: `DELETE ...; INSERT ...;`."
  ]
};
