import { Lesson } from '@/types/course';

export const dwhLesson7: Lesson = {
  "id": "dwh-7",
  "moduleSlug": "dwh",
  "order": 7,
  "title": "Проектирование инкрементальных витрин данных и расчет агрегатов: борьба с дублями, идемпотентность и пересчет витрин",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Идемпотентность (Idempotency)",
      "definition": "Свойство ETL-пайплайна выдавать строго один и тот же результат в целевой таблице независимо от того, сколько раз пайплайн был перезапущен."
    },
    {
      "term": "Watermark (Вотермарка)",
      "definition": "Метка времени или монотонно растущий идентификатор, фиксирующий границу среза успешно обработанных данных в инкременте."
    },
    {
      "term": "Upsert (Merge)",
      "definition": "Атомарная операция вставки новой записи при отсутствии ключа или обновления существующей при совпадении (INSERT ON CONFLICT / MERGE)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "mart_daily_revenue",
      "description": "Ежедневная инкрементальная витрина выручки с контролем идемпотентности",
      "columns": [
        {
          "name": "report_date",
          "type": "VARCHAR(10)",
          "keyType": "PK"
        },
        {
          "name": "total_orders",
          "type": "INT"
        },
        {
          "name": "total_revenue",
          "type": "NUMERIC(14,2)"
        }
      ],
      "sampleRows": [
        {
          "report_date": "2026-11-01",
          "total_orders": 1500,
          "total_revenue": 4500000.0
        },
        {
          "report_date": "2026-11-02",
          "total_orders": 1850,
          "total_revenue": 5200000.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Идемпотентность и инкрементальная загрузка витрин\n\nВ реальной эксплуатации Airflow-таски регулярно падают из-за сетевых таймаутов, недоступности баз или перезапуска воркеров. Если запустить упавший пайплайн повторно, данные **не должны задвоиться**.\n\n#### 1. Антипаттерн: «Слепой» Append\n```sql\n-- ❌ ОПАСНО: при ретрае все строки добавятся еще раз!\nINSERT INTO mart_daily_sales SELECT ... FROM stg_sales;\n```\n\n#### 2. Золотой стандарт: Паттерн Delete + Insert (Партиционный перезапуск)\nЕсли витрина разбита по дням, перед загрузкой дня старые данные этого дня атомарно удаляются в транзакции:\n```sql\nBEGIN;\nDELETE FROM mart_daily_sales WHERE report_date = '2026-11-01';\nINSERT INTO mart_daily_sales (report_date, revenue)\nSELECT '2026-11-01', SUM(amount) FROM raw_events WHERE event_date = '2026-11-01';\nCOMMIT;\n```\nСколько бы раз вы ни перезапустили таску за 1 ноября, результат будет гарантированно идентичным.\n\n#### 3. Паттерн UPSERT (ON CONFLICT DO UPDATE / MERGE)\nЕсли обновление происходит построчно, используется конструкция слияния по первичному ключу:\n```sql\nINSERT INTO mart_user_balances (user_id, balance, updated_at)\nVALUES (42, 1500.00, CURRENT_TIMESTAMP)\nON CONFLICT (user_id) DO UPDATE \nSET balance = EXCLUDED.balance, updated_at = EXCLUDED.updated_at;\n```"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Кнопка лифта",
      "content": "Идемпотентность — это кнопка вызова лифта. Сколько бы раз вы ни нажали на нее (один раз или десять), лифт все равно приедет ровно один раз. Неидемпотентный пайплайн — это автомат с кофе, который при каждом нажатии списывает деньги и выливает стакан на пол."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение стратегий инкрементальной загрузки",
        "beforeDescription": "Неидемпотентный наивный Append",
        "beforeColumns": [
          "retry_behavior",
          "duplicate_risk",
          "recovery_effort"
        ],
        "beforeRows": [
          [
            "Airflow task fails & retries",
            "Rows duplicated on each run",
            "Manual manual cleanup needed"
          ],
          [
            "Blind INSERT INTO mart",
            "Revenue doubles/triples",
            "Corrupted analytics in BI"
          ],
          [
            "No unique constraint",
            "Undetected duplicate records",
            "Audit failure"
          ]
        ],
        "afterDescription": "Идемпотентный Delete+Insert / Upsert",
        "afterColumns": [
          "retry_behavior",
          "duplicate_risk",
          "recovery_effort"
        ],
        "afterRows": [
          [
            "Airflow task fails & retries",
            "Zero duplicate risk",
            "Safe automatic restarts"
          ],
          [
            "Atomic partition rewrite",
            "Exact matching totals",
            "Deterministic BI numbers"
          ],
          [
            "PK / Unique conflict guard",
            "Duplicate updates record",
            "Production peace of mind"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Ретрай дага в Airflow задвоил 40 миллионов транзакций",
      "content": "Airflow упал по сетевому таймауту на 98% выполнения дага. Сработал дефолтный `retries = 3`. Пайплайн выполнил слепой `INSERT INTO` еще трижды, умножив квартальный объем выручки на четыре."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как реализовать идемпотентный пересчет витрины, если данные за прошлые дни могут приходить с опозданием (Late Arriving Data)?",
      "content": "**Ответ:** Используется скользящее окно пересчета (Lookback Window). Например, каждый запуск перезаписывает не только сегодняшний день, но и последние 3–7 дней через `DELETE ... WHERE report_date >= CURRENT_DATE - INTERVAL '3 days'`, либо применяется `MERGE / UPSERT` по составному бизнес-ключу."
    }
  ],
  "taskDescription": "Реализуйте идемпотентную вставку в витрину счетов 'mart_accounts':\n1. Создайте таблицу 'mart_accounts' (account_id INT PRIMARY KEY, owner_name VARCHAR(100) NOT NULL, balance NUMERIC(12,2) NOT NULL, last_updated VARCHAR(20) NOT NULL).\n2. Вставьте начальную запись (101, 'Иван', 5000.00, '2026-11-01 10:00:00').\n3. Выполните идемпотентное обновление: повторный запуск передает счет 101 с балансом 7500.00 и новый счет 102 с балансом 10000.00 через конструкцию 'ON CONFLICT (account_id) DO UPDATE SET balance = EXCLUDED.balance, last_updated = EXCLUDED.last_updated'.\n4. Выведите все записи из 'mart_accounts', отсортированные по 'account_id ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте mart_accounts с PRIMARY KEY на account_id\n-- 2. Вставьте начальную запись\n-- 3. Выполните INSERT ON CONFLICT DO UPDATE\n-- 4. Выведите mart_accounts",
  "solutionCode": "CREATE TABLE mart_accounts (\n    account_id INT PRIMARY KEY,\n    owner_name VARCHAR(100) NOT NULL,\n    balance NUMERIC(12,2) NOT NULL,\n    last_updated VARCHAR(20) NOT NULL\n);\n\nINSERT INTO mart_accounts VALUES (101, 'Иван', 5000.00, '2026-11-01 10:00:00');\n\nINSERT INTO mart_accounts (account_id, owner_name, balance, last_updated) VALUES\n(101, 'Иван', 7500.00, '2026-11-01 12:00:00'),\n(102, 'Ольга', 10000.00, '2026-11-01 12:00:00')\nON CONFLICT (account_id) DO UPDATE SET\n    balance = EXCLUDED.balance,\n    last_updated = EXCLUDED.last_updated;\n\nSELECT account_id, owner_name, balance, last_updated FROM mart_accounts ORDER BY account_id ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "account_id",
      "owner_name",
      "balance",
      "last_updated"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #407: Падение инкремента с ошибкой duplicate key value violates unique constraint",
    "incidentDescription": "Попытка повторной вставки без секции ON CONFLICT привела к падению дага при ретрае.",
    "buggyCode": "INSERT INTO mart_accounts VALUES (101, 'Иван', 7500.00, '2026-11-01 12:00:00');",
    "fixHint": "Добавьте конструкцию ON CONFLICT (account_id) DO UPDATE для обеспечения идемпотентности.",
    "solutionCode": "INSERT INTO mart_accounts VALUES (101, 'Иван', 7500.00, '2026-11-01 12:00:00') ON CONFLICT (account_id) DO UPDATE SET balance = EXCLUDED.balance;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте mart_accounts с PRIMARY KEY (account_id).",
    "Используйте конструкцию ON CONFLICT (account_id) DO UPDATE SET balance = EXCLUDED.balance, last_updated = EXCLUDED.last_updated.",
    "Отсортируйте итоговую выборку по account_id ASC;."
  ]
};
