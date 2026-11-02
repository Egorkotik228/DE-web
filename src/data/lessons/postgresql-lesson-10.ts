import { Lesson } from '@/types/course';

export const postgresqlLesson10: Lesson = {
  "id": "postgresql-10",
  "moduleSlug": "postgresql",
  "order": 10,
  "title": "Масштабирование: Декларативное партиционирование (RANGE/LIST), репликация (Streaming/Logical) и пулинг коннектов (PgBouncer)",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Partition Pruning (Обрезка партиций)",
      "definition": "Оптимизация планировщика, исключающая сканирование заведомо неподходящих партиций на этапе построения плана или рантайма."
    },
    {
      "term": "Streaming Replication",
      "definition": "Физическая побайтовая репликация WAL-записей с Primary на Standby-серверы для обеспечения высокой доступности (HA)."
    },
    {
      "term": "Transaction Pooling",
      "definition": "Режим работы PgBouncer, при котором физическое соединение с базой выдается клиенту только на время выполнения одной транзакции."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "measurements_range",
      "description": "Партиционированная по годам таблица метрик энергопотребления",
      "columns": [
        {
          "name": "city_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "log_date",
          "type": "VARCHAR(20)",
          "keyType": "PK"
        },
        {
          "name": "kwh_consumed",
          "type": "NUMERIC(10,2)"
        }
      ],
      "sampleRows": [
        {
          "city_id": 1,
          "log_date": "2026-05-15",
          "kwh_consumed": 1420.5
        },
        {
          "city_id": 2,
          "log_date": "2025-11-20",
          "kwh_consumed": 980.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура масштабирования PostgreSQL до десятков терабайт\n\nКогда объем таблицы превышает объем RAM, а число подключений переваливает за 500, одиночный инстанс PostgreSQL требует архитектурных решений.\n\n#### 1. Декларативное партиционирование (Declarative Partitioning)\nВместо одной гигантской таблицы на 2 млрд строк создается родительская таблица и дочерние секции:\n* **`PARTITION BY RANGE`:** Идеально для временных рядов (по месяцам/годам).\n* **`PARTITION BY LIST`:** Разделение по дискретным регионам (`RU`, `EU`, `US`).\n* **`PARTITION BY HASH`:** Равномерное распределение нагрузки между дисковыми томами.\n\nГлавный выигрыш — **Partition Pruning:**\nЗапрос с `WHERE log_date >= '2026-01-01'` физически откроет только одну секцию 2026 года, проигнорировав терабайты архивов за 2020–2025 годы!\n\n#### 2. Физическая против Логической репликации\n* **Streaming Replication (Физическая):** Копирует побайтовые изменения WAL. Реплика является точной копией (Read-Only) master-узла. Применяется для отказоустойчивости (High Availability с Patroni).\n* **Logical Replication (Логическая):** Передает события изменений на уровне строк (`INSERT`, `UPDATE`, `DELETE`). Позволяет реплицировать отдельные таблицы, стримить данные в Kafka/Debezium или делать онлайн-обновление мажорных версий PostgreSQL без даунтайма.\n\n#### 3. Пулинг соединений: PgBouncer\nПоскольку каждый процесс `postgres` требует 10–20 МБ памяти, 2000 соединений из Kubernetes съедят 40 ГБ RAM только на простой сокетов.\n**PgBouncer** в режиме `pool_mode = transaction` мультиплексирует 10 000 клиентских соединений всего в 50–100 реальных серверных процессов PostgreSQL!"
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Библиотека с тематическими залами",
      "content": "Партиционирование — это как разложить книги в библиотеке по залам веков: зал 2025 года, зал 2026 года. Читатель, ищущий события мая 2026 года, не обходит все хранилище (Seq Scan), а сразу идет в нужный зал (Partition Pruning)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Эволюция архитектуры хранения и масштабирования",
        "beforeDescription": "Монолитная таблица без пулера",
        "beforeColumns": [
          "workload_type",
          "resource_bottleneck",
          "failure_mode"
        ],
        "beforeRows": [
          [
            "Monolithic 10 TB heap",
            "Full table scans & bloat",
            "Autovacuum failure"
          ],
          [
            "Direct client sockets",
            "High RAM consumption",
            "Postgres connection limit"
          ],
          [
            "Single instance",
            "Zero failover capability",
            "Single point of failure"
          ]
        ],
        "afterDescription": "Масштабируемый Enterprise-кластер",
        "afterColumns": [
          "solution_pattern",
          "performance_gain",
          "scalability"
        ],
        "afterRows": [
          [
            "Partitioning by RANGE",
            "Instant partition pruning",
            "Drop partition in 1 ms"
          ],
          [
            "PgBouncer pooling",
            "10 000 clients on 80 procs",
            "Constant low memory"
          ],
          [
            "Patroni + Streaming HA",
            "Automatic zero-data-loss failover",
            "99.99% SLA"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Удаление терабайта через DELETE вместо DROP PARTITION",
      "content": "Команда попыталась удалить старые данные за 2023 год через `DELETE FROM logs WHERE year = 2023`. Это вызвало генерацию сотен гигабайт WAL, блокировку строк, распухание таблицы (Bloat) и 6 часов деградации базы. В партиционированной таблице это делается мгновенно: `DROP TABLE logs_2023;` за 5 миллисекунд без распухания!"
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему первичный ключ партиционированной таблицы обязан включать колонку разбиения?",
      "content": "**Ответ:** PostgreSQL проверяет уникальность (PRIMARY KEY) локально внутри каждой отдельной партиции. Чтобы глобально гарантировать уникальность без сканирования всех остальных партиций при каждой вставке, колонка партиционирования обязана входить в состав составного ключа."
    }
  ],
  "taskDescription": "Смоделируйте партиционированную витрину потребления энергии:\n1. Создайте родительскую таблицу 'measurements_range' с полями 'city_id INT NOT NULL', 'log_date VARCHAR(20) NOT NULL', 'kwh_consumed NUMERIC(10,2) NOT NULL'.\n2. Создайте две таблицы секций:\n   - 'measurements_2025' для архива 2025 года\n   - 'measurements_2026' для актуальных данных 2026 года\n3. Вставьте данные:\n   - в 2025: (1, '2025-11-20', 980.00)\n   - в 2026: (1, '2026-05-15', 1420.50), (2, '2026-06-01', 2100.00)\n4. Выберите из секции 'measurements_2026' все записи с 'kwh_consumed > 1000.00', отсортированные по 'kwh_consumed DESC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте measurements_2025 и measurements_2026\n-- 2. Вставьте тестовые записи\n-- 3. Выведите данные из measurements_2026 с kwh_consumed > 1000.00",
  "solutionCode": "CREATE TABLE measurements_2025 (\n    city_id INT NOT NULL,\n    log_date VARCHAR(20) NOT NULL,\n    kwh_consumed NUMERIC(10,2) NOT NULL\n);\n\nCREATE TABLE measurements_2026 (\n    city_id INT NOT NULL,\n    log_date VARCHAR(20) NOT NULL,\n    kwh_consumed NUMERIC(10,2) NOT NULL\n);\n\nINSERT INTO measurements_2025 VALUES (1, '2025-11-20', 980.00);\nINSERT INTO measurements_2026 VALUES (1, '2026-05-15', 1420.50), (2, '2026-06-01', 2100.00);\n\nSELECT city_id, log_date, kwh_consumed FROM measurements_2026 WHERE kwh_consumed > 1000.00 ORDER BY kwh_consumed DESC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "city_id",
      "log_date",
      "kwh_consumed"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #310: Падение ночного пайплайна из-за отсутствия партиции на новый месяц",
    "incidentDescription": "В 00:00 1 января вставка упала с ошибкой: no partition of relation found for row. Забыли заранее создать секцию на 2026 год.",
    "buggyCode": "-- Вставка в несуществующую партицию\nINSERT INTO measurements_2026 VALUES (1, '2027-01-01', 500.00);",
    "fixHint": "Создайте секцию и направьте вставку в корректный диапазон дат 2026 года.",
    "solutionCode": "INSERT INTO measurements_2026 VALUES (1, '2026-05-15', 1420.50);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте таблицу measurements_2026 с полями city_id, log_date, kwh_consumed.",
    "Вставьте данные за 2026 год: (1, '2026-05-15', 1420.50) и (2, '2026-06-01', 2100.00).",
    "Отфильтруйте через WHERE kwh_consumed > 1000.00 ORDER BY kwh_consumed DESC;."
  ]
};
