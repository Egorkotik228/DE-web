import { Lesson } from '@/types/course';

export const postgresqlLesson1: Lesson = {
  "id": "postgresql-1",
  "moduleSlug": "postgresql",
  "order": 1,
  "title": "Введение в PostgreSQL с нуля: Архитектура клиент-сервер (Postmaster, Backend), создание таблиц (DDL), ограничения (Constraints) и CRUD",
  "estimatedMinutes": 30,
  "glossaryTerms": [
    {
      "term": "Postmaster",
      "definition": "Главный управляющий процесс PostgreSQL, слушающий входящие TCP-соединения и порождающий дочерний рабочий процесс (Backend process) на каждого клиента."
    },
    {
      "term": "Process-based Model",
      "definition": "Архитектура PostgreSQL, при которой каждое клиентское соединение обслуживается отдельным процессом ОС со своей памятью, а не потоком (thread)."
    },
    {
      "term": "Constraints (Ограничения)",
      "definition": "Декларативные правила целостности данных: PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "sensors",
      "description": "Справочник IoT-датчиков на производственной линии",
      "columns": [
        {
          "name": "sensor_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "device_uuid",
          "type": "VARCHAR(36)",
          "keyType": "INDEX"
        },
        {
          "name": "is_active",
          "type": "BOOLEAN"
        },
        {
          "name": "threshold_celsius",
          "type": "NUMERIC(5,2)"
        }
      ],
      "sampleRows": [
        {
          "sensor_id": 1,
          "device_uuid": "d1a2b3c4-0001",
          "is_active": true,
          "threshold_celsius": 85.5
        },
        {
          "sensor_id": 2,
          "device_uuid": "d1a2b3c4-0002",
          "is_active": false,
          "threshold_celsius": 90.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Архитектура PostgreSQL: От сокета до диска\n\nPostgreSQL — это объектно-реляционная СУБД с классической **процессной архитектурой (Process-based Model)**.\n\n#### 1. Клиент-серверное взаимодействие\n1. **Postmaster (главный процесс):** Слушает сетевой порт (по умолчанию 5432). При поступлении входящего запроса на соединение вызывает `fork()` и создает отдельный независимый процесс **Backend process (postgres)**.\n2. **Backend process:** Выделенный процесс, живущий столько же, сколько открыта клиентская сессия. Занимает в памяти от 5 до 20+ МБ RAM даже в простое.\n3. **Вспомогательные процессы (Background Workers):** Checkpointer, Background Writer, WAL Writer, Autovacuum Launcher, Stats Collector.\n\n#### 2. DDL: Ограничения целостности (Constraints)\nОграничения защищают базу данных от логического мусора на уровне ядра:\n```sql\nCREATE TABLE sensors (\n    sensor_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    device_uuid VARCHAR(36) NOT NULL UNIQUE,\n    is_active BOOLEAN DEFAULT TRUE NOT NULL,\n    threshold_celsius NUMERIC(5,2) NOT NULL CHECK (threshold_celsius BETWEEN -50 AND 150)\n);\n```\n\n#### 3. CRUD операции в транзакциях\nЛюбая операция в PostgreSQL выполняется внутри транзакции. Если не указан `BEGIN ... COMMIT`, СУБД неявно оборачивает каждый отдельный запрос в авто-транзакцию (`AUTOCOMMIT`)."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Ресторан с персональным официантом",
      "content": "Postmaster — это метрдотель у входа в ресторан. Когда приходит гость (клиент), метрдотель не обслуживает его сам, а выделяет персонального официанта (Backend process), который неотлучно сопровождает гостя. Если придет 10 000 гостей одновременно, ресторан разорится на найме 10 000 официантов — поэтому в PostgreSQL перед базой ставят пулеры (PgBouncer)."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Влияние ограничений целостности на безопасность данных",
        "beforeDescription": "Таблица без ограничений (свободная вставка)",
        "beforeColumns": [
          "input_value",
          "check_constraint",
          "table_state"
        ],
        "beforeRows": [
          [
            "threshold: 999 C",
            "None",
            "Accepted (Nonsense)"
          ],
          [
            "device_uuid: NULL",
            "None",
            "Accepted (Broken FK)"
          ],
          [
            "duplicate_uuid",
            "None",
            "Silent duplicate"
          ]
        ],
        "afterDescription": "Таблица с CHECK, NOT NULL и UNIQUE",
        "afterColumns": [
          "input_value",
          "applied_rule",
          "result"
        ],
        "afterRows": [
          [
            "threshold: 999 C",
            "CHECK (val <= 150)",
            "Rejected: Check violation"
          ],
          [
            "device_uuid: NULL",
            "NOT NULL",
            "Rejected: Null violation"
          ],
          [
            "duplicate_uuid",
            "UNIQUE",
            "Rejected: Unique violation"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Превышение max_connections уронило Linux в OOM",
      "content": "Администратор выставил `max_connections = 5000` без пулера. Во время пиковой нагрузки микросервисы открыли 4200 соединений. Каждый процесс `postgres` выделил по 15 МБ под служебные структуры и `work_mem`. Оперативная память сервера исчерпалась, и ядро Linux вызвало `OOM Killer`, который принудительно убил главный процесс базы данных."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему PostgreSQL использует процессы, а не потоки (threads)?",
      "content": "**Ответ:** Исторически PostgreSQL разрабатывался в Беркли для Unix, где потоков еще не существовало либо они были нестабильны. Преимущество процессов — полная изоляция памяти: если один backend-процесс упадет с segmentation fault из-за сбоя в расширении C, остальные тысячи клиентов и сама база продолжат стабильно работать."
    }
  ],
  "taskDescription": "Создайте таблицу 'sensors' с полями:\n- 'sensor_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY'\n- 'device_uuid VARCHAR(36) NOT NULL UNIQUE'\n- 'is_active BOOLEAN DEFAULT TRUE NOT NULL'\n- 'threshold_celsius NUMERIC(5,2) NOT NULL CHECK (threshold_celsius >= -50.00 AND threshold_celsius <= 150.00)'\nВставьте две тестовые строки:\n(1) device_uuid = 'd1a2b3c4-0001', is_active = true, threshold_celsius = 85.50\n(2) device_uuid = 'd1a2b3c4-0002', is_active = false, threshold_celsius = 90.00\nВыведите все записи, отсортированные по 'sensor_id ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте таблицу sensors с ограничениями PRIMARY KEY, NOT NULL, UNIQUE, CHECK\n-- 2. Вставьте 2 записи\n-- 3. Выведите данные через SELECT",
  "solutionCode": "CREATE TABLE sensors (\n    sensor_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    device_uuid VARCHAR(36) NOT NULL UNIQUE,\n    is_active BOOLEAN DEFAULT TRUE NOT NULL,\n    threshold_celsius NUMERIC(5,2) NOT NULL CHECK (threshold_celsius >= -50.00 AND threshold_celsius <= 150.00)\n);\n\nINSERT INTO sensors (device_uuid, is_active, threshold_celsius) VALUES\n('d1a2b3c4-0001', TRUE, 85.50),\n('d1a2b3c4-0002', FALSE, 90.00);\n\nSELECT sensor_id, device_uuid, is_active, threshold_celsius FROM sensors ORDER BY sensor_id ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "sensor_id",
      "device_uuid",
      "is_active",
      "threshold_celsius"
    ],
    "requiredAstPatterns": [
      "CHECK",
      "UNIQUE",
      "NOT NULL"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #301: Некорректные отрицательные температуры разрушили витрину",
    "incidentDescription": "В таблицу датчиков вставили значение -273.15 из-за отсутствия CHECK-констрейнта, что привело к сбою расчета калибровки.",
    "buggyCode": "CREATE TABLE sensors (\n    sensor_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    device_uuid VARCHAR(36) NOT NULL,\n    is_active BOOLEAN DEFAULT TRUE,\n    threshold_celsius NUMERIC(5,2)\n);\nINSERT INTO sensors (device_uuid, threshold_celsius) VALUES ('bad-uuid', -999.00);",
    "fixHint": "Добавьте CHECK (threshold_celsius >= -50.00 AND threshold_celsius <= 150.00) и UNIQUE на device_uuid.",
    "solutionCode": "CREATE TABLE sensors (\n    sensor_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    device_uuid VARCHAR(36) NOT NULL UNIQUE,\n    is_active BOOLEAN DEFAULT TRUE NOT NULL,\n    threshold_celsius NUMERIC(5,2) NOT NULL CHECK (threshold_celsius >= -50.00 AND threshold_celsius <= 150.00)\n);\nINSERT INTO sensors (device_uuid, is_active, threshold_celsius) VALUES ('d1a2b3c4-0001', TRUE, 85.50);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Используйте GENERATED ALWAYS AS IDENTITY PRIMARY KEY для создания автоинкрементного первичного ключа.",
    "Добавьте ограничение CHECK (threshold_celsius >= -50.00 AND threshold_celsius <= 150.00).",
    "Завершите запрос выборкой SELECT sensor_id, device_uuid, is_active, threshold_celsius FROM sensors ORDER BY sensor_id ASC;."
  ]
};
