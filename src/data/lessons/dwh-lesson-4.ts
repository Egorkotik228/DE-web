import { Lesson } from '@/types/course';

export const dwhLesson4: Lesson = {
  "id": "dwh-4",
  "moduleSlug": "dwh",
  "order": 4,
  "title": "Управление историей изменений (SCD): SCD Type 0, Type 1, Type 2 (Effective Dates), Type 3 и гибридный Type 6",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "SCD (Slowly Changing Dimensions)",
      "definition": "Набор методологий Кимбалла для управления изменением значений атрибутов в таблицах измерений во времени."
    },
    {
      "term": "SCD Type 1",
      "definition": "Перезапись старого значения новым без сохранения истории. Используется для исправления опечаток."
    },
    {
      "term": "SCD Type 2",
      "definition": "Создание новой строки с версией при каждом изменении атрибута с фиксацией интервала effective_from / effective_to и флага is_current."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "dim_customers_scd2",
      "description": "Измерение клиентов с версионированием по SCD2",
      "columns": [
        {
          "name": "customer_sk",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "customer_id",
          "type": "INT",
          "keyType": "BK"
        },
        {
          "name": "city",
          "type": "VARCHAR(50)"
        },
        {
          "name": "valid_from",
          "type": "VARCHAR(20)"
        },
        {
          "name": "valid_to",
          "type": "VARCHAR(20)"
        },
        {
          "name": "is_current",
          "type": "BOOLEAN"
        }
      ],
      "sampleRows": [
        {
          "customer_sk": 1,
          "customer_id": 42,
          "city": "Казань",
          "valid_from": "2025-01-01",
          "valid_to": "2026-03-01",
          "is_current": false
        },
        {
          "customer_sk": 2,
          "customer_id": 42,
          "city": "Москва",
          "valid_from": "2026-03-01",
          "valid_to": "9999-12-31",
          "is_current": true
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Управление историчностью: Семейство Slowly Changing Dimensions (SCD)\n\nВ реальном мире атрибуты сущностей меняются: клиенты переезжают в другие города, сотрудники переходят в другие отделы, категории товаров переименовываются. Как отразить это в DWH?\n\n#### Классификация типов SCD по Кимбаллу:\n1. **SCD Type 0 (Fixed):** Атрибут никогда не меняется (дата рождения, первоначальный ID регистрации).\n2. **SCD Type 1 (Overwrite):** Значение просто перезаписывается (`UPDATE`). Старая история стирается безвозвратно. Применимо только для исправления ошибок ввода.\n3. **SCD Type 2 (Add New Row) — ЗОЛОТОЙ СТАНДАРТ DWH:**\n   * При изменении закрывается старая версия: `valid_to = change_date`, `is_current = FALSE`.\n   * Вставляется новая версия с новым суррогатным ключом `customer_sk`, `valid_from = change_date`, `valid_to = '9999-12-31'`, `is_current = TRUE`.\n   * **Результат:** 100% сохранение истории для отчетов на любую точку во времени (Point-in-Time analysis)!\n4. **SCD Type 3 (Previous Column):** В таблицу добавляется колонка `previous_city`. Хранит только последнее предыдущее значение.\n5. **SCD Type 6 (Гибрид 1 + 2 + 3 = 6):** Строка SCD2, в которой дополнительно есть колонка `current_city` (обновляемая по типу 1 во всех версиях), что позволяет легко фильтровать данные как по историческому, так и по актуальному состоянию."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Трудовая книжка против пластикового бейджа",
      "content": "SCD Type 1 — это пластиковый бейдж сотрудника: сменилась должность — наклеили новую бумажку поверх старой. SCD Type 2 — это трудовая книжка: каждая новая должность записывается отдельной строкой с датой приказа. Всегда видно, кем человек работал в 2024 году."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение стратегий управления историей изменений SCD",
        "beforeDescription": "Наивная перезапись (SCD Type 1)",
        "beforeColumns": [
          "change_event",
          "historical_report",
          "table_growth"
        ],
        "beforeRows": [
          [
            "Client moved to Moscow",
            "Past sales re-attributed to Moscow",
            "Zero row growth"
          ],
          [
            "Typo fix in name",
            "Completely fine",
            "Single row updated"
          ],
          [
            "Product category change",
            "Corrupts past margin analytics",
            "Destroys audit trail"
          ]
        ],
        "afterDescription": "Версионная история (SCD Type 2)",
        "afterColumns": [
          "change_event",
          "historical_report",
          "audit_capability"
        ],
        "afterRows": [
          [
            "Client moved to Moscow",
            "Past sales stay in Kazan",
            "Exact point-in-time truth"
          ],
          [
            "New version inserted",
            "Close old record with valid_to",
            "Surrogate key generated"
          ],
          [
            "Audit requirement",
            "100% regulatory compliance",
            "Full timeline reconstructed"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Джойн фактов с SCD2 по бизнес-ключу вместо суррогатного",
      "content": "Разработчик связал `fct_orders` с таблицей клиентов по `customer_id` без фильтра `is_current = TRUE`. У активного клиента было 6 исторических версий адреса. Заказ размножился в 6 раз, и выручка филиала удвоилась."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Зачем в SCD Type 2 в valid_to записывают дату '9999-12-31' вместо NULL?",
      "content": "**Ответ:** Использование фиксированной бесконечной даты ('9999-12-31') позволяет писать быстрые и элегантные предикаты между датами через `event_date BETWEEN valid_from AND valid_to` с использованием стандартных B-Tree индексов, избегая медленной и громоздкой логики с `valid_to IS NULL OR event_date < valid_to`."
    }
  ],
  "taskDescription": "Смоделируйте обработку изменения адреса клиента по протоколу SCD Type 2:\n1. Создайте таблицу 'dim_clients_scd' (client_sk INT PRIMARY KEY, client_id INT NOT NULL, city VARCHAR(50) NOT NULL, valid_from VARCHAR(10) NOT NULL, valid_to VARCHAR(10) NOT NULL, is_current BOOLEAN NOT NULL).\n2. Вставьте первоначальную запись: client_sk = 1, client_id = 42, city = 'Казань', valid_from = '2025-01-01', valid_to = '9999-12-31', is_current = TRUE.\n3. Клиент переехал в Москву '2026-03-01': закройте старую версию (valid_to = '2026-03-01', is_current = FALSE) и вставьте новую версию с client_sk = 2, city = 'Москва', valid_from = '2026-03-01', valid_to = '9999-12-31', is_current = TRUE.\n4. Выведите все версии клиента, отсортированные по 'client_sk ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте таблицу dim_clients_scd\n-- 2. Вставьте версию 1 (Казань)\n-- 3. Закройте версию 1 и вставьте версию 2 (Москва)\n-- 4. Выведите результат",
  "solutionCode": "CREATE TABLE dim_clients_scd (\n    client_sk INT PRIMARY KEY,\n    client_id INT NOT NULL,\n    city VARCHAR(50) NOT NULL,\n    valid_from VARCHAR(10) NOT NULL,\n    valid_to VARCHAR(10) NOT NULL,\n    is_current BOOLEAN NOT NULL\n);\n\nINSERT INTO dim_clients_scd VALUES (1, 42, 'Казань', '2025-01-01', '9999-12-31', TRUE);\n\nUPDATE dim_clients_scd \nSET valid_to = '2026-03-01', is_current = FALSE \nWHERE client_id = 42 AND is_current = TRUE;\n\nINSERT INTO dim_clients_scd VALUES (2, 42, 'Москва', '2026-03-01', '9999-12-31', TRUE);\n\nSELECT client_sk, client_id, city, valid_from, valid_to, is_current FROM dim_clients_scd ORDER BY client_sk ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 0,
    "expectedRowCount": 2,
    "expectedColumns": [
      "client_sk",
      "client_id",
      "city",
      "valid_from",
      "valid_to",
      "is_current"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #404: Перезапись адреса стерла региональные продажи 2025 года",
    "incidentDescription": "Применили SCD1 вместо SCD2: UPDATE стер старый город, из-за чего отчет за 2025 год показал продажи в регионе, где компания тогда еще не работала.",
    "buggyCode": "UPDATE dim_clients_scd SET city = 'Москва' WHERE client_id = 42;",
    "fixHint": "Не перезаписывайте строку. Закройте действующую версию по valid_to и добавьте новую запись с новым client_sk.",
    "solutionCode": "UPDATE dim_clients_scd SET valid_to = '2026-03-01', is_current = FALSE WHERE client_id = 42 AND is_current = TRUE;\nINSERT INTO dim_clients_scd VALUES (2, 42, 'Москва', '2026-03-01', '9999-12-31', TRUE);",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Сначала создайте таблицу и вставьте запись со статусом is_current = TRUE.",
    "В UPDATE закройте старую строку: valid_to = '2026-03-01', is_current = FALSE.",
    "Вставьте новую строку с client_sk = 2 и выберите все записи с ORDER BY client_sk ASC;."
  ]
};
