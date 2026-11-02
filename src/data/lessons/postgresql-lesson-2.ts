import { Lesson } from '@/types/course';

export const postgresqlLesson2: Lesson = {
  "id": "postgresql-2",
  "moduleSlug": "postgresql",
  "order": 2,
  "title": "Типы данных PostgreSQL с нуля: Числа (NUMERIC vs FLOAT), даты (TIMESTAMPTZ), JSONB и UUID v4 vs UUID v7",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "NUMERIC / DECIMAL",
      "definition": "Числовой тип с произвольной точностью без погрешностей стандартов IEEE 754. Хранится в десятичном виде с переменной длиной."
    },
    {
      "term": "TIMESTAMPTZ",
      "definition": "Тип даты и времени, сохраняющий переданное значение в UTC и конвертирующий его в таймзону клиентской сессии при чтении."
    },
    {
      "term": "JSONB",
      "definition": "Бинарное декомпозированное представление JSON в PostgreSQL с поддержкой индексов GIN, мгновенного поиска по ключам и отсутствием дубликатов."
    },
    {
      "term": "UUID v7",
      "definition": "Спецификация UUID с временным префиксом (Time-ordered), обеспечивающая последовательную вставку в B-Tree без фрагментации страниц."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "invoices",
      "description": "Финансовые инвойсы с бинарными метаданными и временными метками",
      "columns": [
        {
          "name": "invoice_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "client_uuid",
          "type": "VARCHAR(36)",
          "keyType": "INDEX"
        },
        {
          "name": "total_rub",
          "type": "NUMERIC(12,2)"
        },
        {
          "name": "metadata_json",
          "type": "TEXT"
        },
        {
          "name": "created_at",
          "type": "TIMESTAMP"
        }
      ],
      "sampleRows": [
        {
          "invoice_id": 1,
          "client_uuid": "018f4a12-7000-7abc",
          "total_rub": 154000.5,
          "metadata_json": "{\"source\":\"web\",\"tax_rate\":0.2}",
          "created_at": "2026-11-01 10:00:00"
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия типов данных PostgreSQL\n\nВыбор типов данных в PostgreSQL определяет объем дискового пространства, скорость сканирования индексов и корректность математических операций.\n\n#### 1. Числа: NUMERIC против FLOAT (DOUBLE PRECISION)\n* **`FLOAT` / `DOUBLE PRECISION`:** Вычисляется аппаратно на процессоре (FPU). Работает максимально быстро, но не гарантирует точного десятичного представления (`0.1 + 0.2 = 0.30000000000000004`). В финансовых расчетах запрещен.\n* **`NUMERIC(precision, scale)`:** Хранит цифры десятично в памяти. Вычисления производятся программно. Гарантирует абсолютную точность для биллинга.\n\n#### 2. Даты и таймзоны: TIMESTAMP vs TIMESTAMPTZ\n* **`TIMESTAMP` (без таймзоны):** «Наивная» дата. Если сервер в Москве запишет `12:00`, а клиент в Лондоне прочитает ее, Лондон увидит `12:00` (хотя реальная разница 3 часа).\n* **`TIMESTAMPTZ`:** Всегда нормализует значение к **UTC** при записи, а при выдаче клиенту пересчитывает в `TIME ZONE` текущей сессии.\n\n#### 3. Полуструктурированные данные: JSON vs JSONB\n* **`JSON`:** Хранит исходный текст как есть (включая пробелы и дубликаты ключей). При каждом обращении требует полного повторного парсинга строки.\n* **`JSONB`:** Бинарное разобранное дерево. Вставка чуть медленнее, но чтение и поиск по ключам `->`, `->>`, оператор вхождения `@>` работают за доли миллисекунды и поддерживают **GIN-индексы**.\n\n#### 4. Идентификаторы: UUID v4 против UUID v7\n* **UUID v4 (Random):** Случайное распределение байт. При вставке в B-Tree индекс попадает в случайные блоки по всему дереву, вызывая **Page Splits** (дробление страниц) и деградацию кэша `shared_buffers`.\n* **UUID v7 (Time-ordered):** Первые 48 бит содержат Unix Timestamp в миллисекундах. Значения монотонно возрастают, как автоинкремент, предотвращая фрагментацию индексов."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Складывание коробок разной формы",
      "content": "UUID v7 — это кирпичи, которые аккуратно кладутся в конец стены ряд за рядом. UUID v4 — это метеориты, которые падают в случайные места стены, разбивая уже уложенные кирпичи пополам (Page Splits) и требуя постоянной перестройки блоков."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение производительности и поведения типов данных",
        "beforeDescription": "Неоптимальные типы для финансового хранилища",
        "beforeColumns": [
          "type_used",
          "limitation",
          "risk"
        ],
        "beforeRows": [
          [
            "FLOAT8",
            "Rounding errors",
            "Financial audit failure"
          ],
          [
            "TIMESTAMP",
            "No timezone context",
            "Time drift across regions"
          ],
          [
            "UUID v4",
            "Random distribution",
            "B-Tree fragmentation & bloat"
          ]
        ],
        "afterDescription": "Рекомендуемые типы Enterprise-стандарта",
        "afterColumns": [
          "type_used",
          "advantage",
          "best_practice"
        ],
        "afterRows": [
          [
            "NUMERIC(12,2)",
            "Exact decimal precision",
            "Mandatory for money"
          ],
          [
            "TIMESTAMPTZ",
            "UTC storage with conversion",
            "Global time consistency"
          ],
          [
            "UUID v7",
            "Sequential B-Tree inserts",
            "Zero page splits"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: FLOAT в расчете налогов привел к штрафу налоговой",
      "content": "В платежном шлюзе сумма НДС рассчитывалась во `FLOAT8`. При суммировании 10 миллионов чеков накопилась погрешность округления в 42 000 рублей. Аудит выявил расхождение между счетами и выписками из банка. Переход на `NUMERIC(15,4)` полностью устранил ошибку."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: В чем физическая разница между JSON и JSONB?",
      "content": "**Ответ:** `JSON` хранит точную текстовую копию ввода (включая форматирование пробелами и дубликаты ключей). `JSONB` при вставке парсит строку, удаляет лишние пробелы, устраняет дубликаты ключей (оставляя последнее значение) и сохраняет в бинарном формате с хэшированными смещениями ключей, что позволяет мгновенно извлекать поля без чтения всего документа и строить GIN-индексы."
    }
  ],
  "taskDescription": "Создайте таблицу 'invoices' со следующими полями:\n- 'invoice_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY'\n- 'client_uuid VARCHAR(36) NOT NULL'\n- 'total_rub NUMERIC(12,2) NOT NULL CHECK (total_rub > 0)'\n- 'metadata_json TEXT NOT NULL'\n- 'created_at TIMESTAMP NOT NULL'\nВставьте запись:\nclient_uuid = '018f4a12-7000-7abc', total_rub = 154000.50, metadata_json = '{\"source\": \"web\", \"tax_rate\": 0.20}', created_at = '2026-11-01 10:00:00'.\nВыведите все поля инвойса, у которого 'total_rub > 100000.00'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте таблицу invoices с полями invoice_id, client_uuid, total_rub, metadata_json, created_at\n-- 2. Вставьте тестовый инвойс\n-- 3. Выберите инвойсы с total_rub > 100000.00",
  "solutionCode": "CREATE TABLE invoices (\n    invoice_id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n    client_uuid VARCHAR(36) NOT NULL,\n    total_rub NUMERIC(12,2) NOT NULL CHECK (total_rub > 0),\n    metadata_json TEXT NOT NULL,\n    created_at TIMESTAMP NOT NULL\n);\n\nINSERT INTO invoices (client_uuid, total_rub, metadata_json, created_at) VALUES\n('018f4a12-7000-7abc', 154000.50, '{\"source\": \"web\", \"tax_rate\": 0.20}', '2026-11-01 10:00:00');\n\nSELECT invoice_id, client_uuid, total_rub, metadata_json, created_at FROM invoices WHERE total_rub > 100000.00;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 1,
    "expectedColumns": [
      "invoice_id",
      "client_uuid",
      "total_rub",
      "metadata_json",
      "created_at"
    ],
    "requiredAstPatterns": [
      "NUMERIC",
      "CHECK"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #302: Дробная погрешность FLOAT разрушила баланс счетов",
    "incidentDescription": "В таблице счетов использовали FLOAT вместо NUMERIC, из-за чего проверка total_rub == 154000.50 не сработала.",
    "buggyCode": "CREATE TABLE invoices (invoice_id INT PRIMARY KEY, total_rub FLOAT);\nINSERT INTO invoices VALUES (1, 154000.50);",
    "fixHint": "Замените FLOAT на NUMERIC(12,2).",
    "solutionCode": "CREATE TABLE invoices (invoice_id INT PRIMARY KEY, total_rub NUMERIC(12,2));\nINSERT INTO invoices VALUES (1, 154000.50);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Для точного хранения денежных сумм используйте тип NUMERIC(12,2).",
    "Добавьте ограничение CHECK (total_rub > 0).",
    "Отфильтруйте результат через WHERE total_rub > 100000.00."
  ]
};
