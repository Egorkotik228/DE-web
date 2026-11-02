import { Lesson } from '@/types/course';

export const dbtLesson5: Lesson = {
  "id": "dbt-5",
  "moduleSlug": "dbt",
  "order": 5,
  "title": "Снимки (Snapshots): Реализация SCD Type 2 в dbt через snapshot-блоки",
  "estimatedMinutes": 45,
  "glossaryTerms": [
    {
      "term": "dbt Snapshot",
      "definition": "Специальный механизм dbt, фиксирующий состояние изменяемой таблицы источника во времени и автоматически поддерживающий исторические строки по стандарту SCD Type 2."
    },
    {
      "term": "dbt_valid_from / dbt_valid_to",
      "definition": "Системные метаколонки временного интервала актуальности версии записи, генерируемые dbt; для текущей активной строки dbt_valid_to равен NULL."
    },
    {
      "term": "Стратегии: timestamp vs check",
      "definition": "Стратегия timestamp отслеживает изменения по колонке updated_at в источнике; стратегия check вычисляет хэш от указанного списка колонок (check_cols), когда надежного поля даты изменения нет."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "snp_customers_scd2",
      "description": "Снимок SCD Type 2 с историей изменения статусов клиентов",
      "columns": [
        {
          "name": "dbt_scd_id",
          "type": "CHAR(32)",
          "keyType": "PK"
        },
        {
          "name": "customer_id",
          "type": "INTEGER"
        },
        {
          "name": "status",
          "type": "VARCHAR(32)"
        },
        {
          "name": "dbt_valid_from",
          "type": "TIMESTAMP"
        },
        {
          "name": "dbt_valid_to",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "dbt_scd_id": "a1b2c3d4e5f60718293a4b5c6d7e8f90",
          "customer_id": 101,
          "status": "SILVER",
          "dbt_valid_from": "2026-01-01 00:00:00",
          "dbt_valid_to": "2026-06-01 14:00:00"
        },
        {
          "dbt_scd_id": "f6e5d4c3b2a10987293a4b5c6d7e8f90",
          "customer_id": 101,
          "status": "GOLD",
          "dbt_valid_from": "2026-06-01 14:00:00",
          "dbt_valid_to": null
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Медленно меняющиеся измерения (SCD Type 2) в dbt за 10 строк кода\n\nВ реляционных базах источников таблицы клиентов и заказов постоянно перезаписываются (SCD Type 1): клиент сменил фамилию, VIP-статус или адрес доставки — старое значение затерто навсегда. Для исторического финансового учета бизнесу жизненно необходим **SCD Type 2** (сохранение каждой версии с датами `valid_from` и `valid_to`).\n\nРаньше инженеры писали монструозные хранимые процедуры на 500 строк с курсорами. В dbt для этого есть файлы в папке `snapshots/`:\n\n```sql\n{% snapshot snp_customers %}\n\n{{ \n    config(\n      target_schema='snapshots',\n      unique_key='customer_id',\n      strategy='timestamp',\n      updated_at='updated_at',\n      invalidate_hard_deletes=True\n    )\n}}\n\nSELECT customer_id, full_name, status, updated_at\nFROM {{ source('raw_crm', 'customers') }}\n\n{% endsnapshot %}\n```\n\n#### Системные колонки dbt:\n1. `dbt_scd_id`: суррогатный первичный ключ конкретной версии записи.\n2. `dbt_updated_at`: дата обнаружения изменения.\n3. `dbt_valid_from`: начало периода действия версии.\n4. `dbt_valid_to`: окончание действия (`NULL` для актуальной версии записи прямо сейчас!)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Фотоальбом вместо зеркала",
      "content": "Обычная таблица в базе данных источников — это зеркало: вы видите отражение только в текущую секунду, а как вы выглядели 5 лет назад, зеркало не помнит. dbt Snapshot — это фотоаппарат: каждый раз, когда меняется прическа или одежда, он делает снимок и вклеивает новую страницу в семейный альбом."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение ручного SCD2 и dbt Snapshots",
        "beforeDescription": "Хранимые процедуры с курсорами на PL/pgSQL",
        "beforeColumns": [
          "implementation_aspect",
          "maintenance_overhead",
          "bug_rate"
        ],
        "beforeRows": [
          [
            "500 lines of complex SQL",
            "High maintenance effort",
            "Tricky concurrency locks"
          ],
          [
            "Custom boundary checks",
            "Manual valid_to patching",
            "Missing microsecond edge cases"
          ],
          [
            "Hard deletes handling",
            "Manual tombstone tracking",
            "Orphaned active records"
          ]
        ],
        "afterDescription": "Декларативный dbt Snapshot блок",
        "afterColumns": [
          "implementation_aspect",
          "maintenance_overhead",
          "bug_rate"
        ],
        "afterRows": [
          [
            "10 lines of declarative config",
            "Zero boilerplate maintenance",
            "Industry standard verified"
          ],
          [
            "Automated valid_to patching",
            "Built-in microsecond accuracy",
            "Zero overlapping time intervals"
          ],
          [
            "invalidate_hard_deletes=True",
            "Auto-closes deleted records",
            "100% reliable audit history"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Использование `strategy='timestamp'` на источнике с ненадежным `updated_at`",
      "content": "В исходной CRM при смене адреса клиента разработчики забыли обновлять поле `updated_at`. dbt Snapshot со стратегией timestamp посчитал, что изменений не было, и исторические переезды клиентов не зафиксировались. Если в источнике нет гарантии надежности даты обновления, используйте `strategy='check'` с перечислением всех полей `check_cols=['address', 'phone', 'status']`!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Как выбрать актуальную на сегодняшний день запись из dbt snapshot?",
      "content": "**Ответ:** Для получения текущего активного состояния достаточно добавить условие `WHERE dbt_valid_to IS NULL`. А для восстановления исторического среза на дату $T$: `WHERE dbt_valid_from <= 'T' AND (dbt_valid_to > 'T' OR dbt_valid_to IS NULL)`."
    }
  ],
  "taskDescription": "Сконфигурируйте dbt Snapshot 'snp_users' для отслеживания истории пользователей по SCD Type 2:\n1. Оберните модель в блок `{% snapshot snp_users %} ... {% endsnapshot %}`.\n2. В блоке `config()` укажите:\n   - Целевая схема: `target_schema='snapshots'`\n   - Бизнес-ключ: `unique_key='user_id'`\n   - Стратегия: `strategy='timestamp'`\n   - Колонка отслеживания: `updated_at='updated_at'`\n3. В теле запроса выберите 'user_id', 'email', 'tier', 'updated_at' из `{{ ref('stg_users') }}`.\n\nВведите полный код dbt Snapshot.",
  "seedCode": "-- Напишите snapshot snp_users\n",
  "initialCode": "{% snapshot snp_users %}\n\n{{\n    config(\n        target_schema='snapshots',\n        unique_key='user_id',\n        strategy='timestamp',\n        updated_at='updated_at'\n    )\n}}\n\nSELECT\n    user_id,\n    email,\n    tier,\n    updated_at\nFROM {{ ref('stg_users') }}\n\n{% endsnapshot %}",
  "solutionCode": "{% snapshot snp_users %}\n\n{{\n    config(\n        target_schema='snapshots',\n        unique_key='user_id',\n        strategy='timestamp',\n        updated_at='updated_at'\n    )\n}}\n\nSELECT\n    user_id,\n    email,\n    tier,\n    updated_at\nFROM {{ ref('stg_users') }}\n\n{% endsnapshot %}",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "{% snapshot snp_users %}",
      "target_schema='snapshots'",
      "unique_key='user_id'",
      "strategy='timestamp'",
      "updated_at='updated_at'",
      "{{ ref('stg_users') }}",
      "{% endsnapshot %}"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #905: Утечка удаленных клиентов в актуальном срезе Snapshot",
    "incidentDescription": "Клиент удалил аккаунт в CRM (hard delete), но в dbt Snapshot его последняя версия осталась висеть с dbt_valid_to IS NULL навсегда.",
    "buggyCode": "{{\\n    config(\\n        target_schema='snapshots',\\n        unique_key='user_id',\\n        strategy='timestamp',\\n        updated_at='updated_at'\\n    )\\n}}",
    "fixHint": "Добавьте опцию invalidate_hard_deletes=True в блок конфигурации snapshot.",
    "solutionCode": "{{\n    config(\n        target_schema='snapshots',\n        unique_key='user_id',\n        strategy='timestamp',\n        updated_at='updated_at',\n        invalidate_hard_deletes=True\n    )\n}}",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Начните с открывающего тега `{% snapshot snp_users %}` и завершите `{% endsnapshot %}`.",
    "В блоке `config()` задайте `target_schema`, `unique_key`, `strategy` и `updated_at`.",
    "Выберите поля из `{{ ref('stg_users') }}`."
  ]
};
