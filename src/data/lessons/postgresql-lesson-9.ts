import { Lesson } from '@/types/course';

export const postgresqlLesson9: Lesson = {
  "id": "postgresql-9",
  "moduleSlug": "postgresql",
  "order": 9,
  "title": "Система блокировок (Locks), очередь блокировок, Deadlocks и безопасные DDL-миграции на проде (lock_timeout)",
  "estimatedMinutes": 35,
  "glossaryTerms": [
    {
      "term": "Lock Queue (Очередь блокировок)",
      "definition": "Механизм очередей в PostgreSQL: если тяжелая транзакция запрашивает эксклюзивную блокировку (AccessExclusiveLock), она встает в очередь и блокирует ВСЕ последующие запросы к таблице, включая SELECT."
    },
    {
      "term": "lock_timeout",
      "definition": "Параметр сессии, ограничивающий максимальное время ожидания захвата блокировки перед аварийным сбросом транзакции."
    },
    {
      "term": "Deadlock (Взаимная блокировка)",
      "definition": "Ситуация, при которой две транзакции ждут освобождения блокировок друг от друга по кругу. Разрешается фоновым Deadlock Detector."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "payment_accounts",
      "description": "Счета клиентов с балансами для межбанковских переводов",
      "columns": [
        {
          "name": "account_id",
          "type": "INT",
          "keyType": "PK"
        },
        {
          "name": "owner_name",
          "type": "VARCHAR(100)"
        },
        {
          "name": "balance_rub",
          "type": "NUMERIC(14,2)"
        }
      ],
      "sampleRows": [
        {
          "account_id": 1,
          "owner_name": "ООО Альфа",
          "balance_rub": 5000000.0
        },
        {
          "account_id": 2,
          "owner_name": "ООО Бета",
          "balance_rub": 3200000.0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Анатомия блокировок: Как одна DDL-миграция ставит на колени весь продакшн\n\nВ PostgreSQL многоуровневая матрица блокировок (от `AccessShareLock` до `AccessExclusiveLock`). Понимание их взаимодействия обязательно для каждого дата-инженера.\n\n#### 1. Очередь блокировок (Lock Queue)\nПредставьте, что выполняется долгий аналитический запрос: `SELECT * FROM orders` (держит `AccessShareLock`).\nВы запускаете миграцию: `ALTER TABLE orders ADD COLUMN is_archived BOOLEAN;`.\nЭта операция требует **`AccessExclusiveLock`** (полной блокировки таблицы).\n\nЧто происходит в ядре:\n1. Миграция видит, что `SELECT` еще работает, и **встает в очередь ожидания**.\n2. **Катастрофа:** Все новые запросы (даже легкие точечные `SELECT` по ключу), приходящие после миграции, **встают в очередь ПОЗАДИ нее**!\n3. За 10 секунд скапливается 500 запросов, исчерпывается пул соединений (`max_connections`), и приложение падает с ошибкой `504 Gateway Timeout`.\n\n#### 2. Золотой стандарт безопасных миграций:\n```sql\nSET lock_timeout = '2s';\nALTER TABLE orders ADD COLUMN is_archived BOOLEAN DEFAULT FALSE;\n```\nЕсли блокировка не захвачена за 2 секунды, транзакция падает, освобождая очередь, и не подвешивает продакшн!\n\n#### 3. Безопасное создание индексов\nКоманда `CREATE INDEX` блокирует запись (`ShareLock`).\nВ проде **всегда** используется:\n`CREATE INDEX CONCURRENTLY idx_orders_user ON orders(user_id);` — выполняется в 2 прохода без блокировки параллельных INSERT/UPDATE."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Шлагбаум и скорая помощь",
      "content": "AccessExclusiveLock — это огромный негабаритный грузовик, который пытается повернуть в узкий переулок. Пока он маневрирует, за ним мгновенно выстраивается глухая пробка из сотен легковых машин (SELECT), которые не могут проехать вперед."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение опасных и безопасных паттернов DDL-миграций",
        "beforeDescription": "Опасный наивный запуск миграций",
        "beforeColumns": [
          "operation",
          "lock_acquired",
          "prod_impact"
        ],
        "beforeRows": [
          [
            "CREATE INDEX",
            "ShareLock",
            "Blocks all INSERT/UPDATE"
          ],
          [
            "ALTER TABLE without timeout",
            "AccessExclusiveLock",
            "Pool exhaustion & downtime"
          ],
          [
            "ADD COLUMN with heavy func",
            "AccessExclusiveLock",
            "Rewrites whole table heap"
          ]
        ],
        "afterDescription": "Zero-downtime production паттерны",
        "afterColumns": [
          "operation",
          "safety_guarantee",
          "de_rule"
        ],
        "afterRows": [
          [
            "CREATE INDEX CONCURRENTLY",
            "ShareUpdateExclusive",
            "Zero writes blocked"
          ],
          [
            "SET lock_timeout = '2s'",
            "Fails fast on queue",
            "Never starves connections"
          ],
          [
            "ADD COLUMN constant default",
            "Metadata only update",
            "Instant on PG 11+"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: CREATE INDEX без CONCURRENTLY остановил маркетплейс в черную пятницу",
      "content": "Инженер решил ускорить поиск и запустил `CREATE INDEX` на таблице заказов в 100 млн строк без ключевого слова `CONCURRENTLY`. Создание индекса заняло 18 минут. Все это время ни один покупатель не мог оформить заказ. Убытки составили десятки миллионов рублей."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Почему CREATE INDEX CONCURRENTLY нельзя запускать внутри транзакции (BEGIN ... COMMIT)?",
      "content": "**Ответ:** `CONCURRENTLY` выполняет построение индекса в два последовательных сканирования таблицы, ожидая завершения всех старых транзакций между фазами. Сам процесс управления несколькими внутренними транзакциями не может быть вложен в пользовательскую транзакцию."
    }
  ],
  "taskDescription": "Смоделируйте безопасный DDL-скрипт обновления балансов:\n1. Создайте таблицу 'payment_accounts' с полями 'account_id INT PRIMARY KEY', 'owner_name VARCHAR(100)', 'balance_rub NUMERIC(14,2)'.\n2. Вставьте тестовые счета (1, 'ООО Альфа', 5000000.00) и (2, 'ООО Бета', 3200000.00).\n3. Выполните перевод 500000.00 рублей со счета 1 на счет 2 упорядоченно по 'account_id', чтобы исключить Deadlock.\n4. Выведите итоговые балансы, отсортированные по 'account_id ASC'.",
  "seedCode": "",
  "initialCode": "-- 1. Создайте payment_accounts\n-- 2. Вставьте тестовые счета\n-- 3. Выполните перевод с фиксацией сумм\n-- 4. Выведите балансы",
  "solutionCode": "CREATE TABLE payment_accounts (\n    account_id INT PRIMARY KEY,\n    owner_name VARCHAR(100),\n    balance_rub NUMERIC(14,2)\n);\n\nINSERT INTO payment_accounts VALUES\n(1, 'ООО Альфа', 5000000.00),\n(2, 'ООО Бета', 3200000.00);\n\nUPDATE payment_accounts SET balance_rub = balance_rub - 500000.00 WHERE account_id = 1;\nUPDATE payment_accounts SET balance_rub = balance_rub + 500000.00 WHERE account_id = 2;\n\nSELECT account_id, owner_name, balance_rub FROM payment_accounts ORDER BY account_id ASC;",
  "testConfig": {
    "checkOrder": true,
    "floatPrecision": 2,
    "expectedRowCount": 2,
    "expectedColumns": [
      "account_id",
      "owner_name",
      "balance_rub"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #309: Взаимная блокировка (Deadlock) при параллельных переводах",
    "incidentDescription": "Транзакция А блокировала счет 1, затем 2. Транзакция Б параллельно блокировала счет 2, затем 1. Процессы встали в Deadlock.",
    "buggyCode": "-- Транзакция перевода без упорядочивания ключей\nUPDATE payment_accounts SET balance_rub = balance_rub - 100 WHERE account_id = 2;\nUPDATE payment_accounts SET balance_rub = balance_rub + 100 WHERE account_id = 1;",
    "fixHint": "Всегда захватывайте строки в строго монотонном порядке первичных ключей (WHERE account_id = 1, затем account_id = 2).",
    "solutionCode": "UPDATE payment_accounts SET balance_rub = balance_rub + 100 WHERE account_id = 1;\nUPDATE payment_accounts SET balance_rub = balance_rub - 100 WHERE account_id = 2;",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 2
    }
  },
  "hints": [
    "Создайте таблицу payment_accounts с точным типом NUMERIC(14,2).",
    "Для предотвращения Deadlock строки в транзакции всегда обновляются в порядке возрастания account_id.",
    "Завершите выборкой SELECT account_id, owner_name, balance_rub FROM payment_accounts ORDER BY account_id ASC;."
  ]
};
