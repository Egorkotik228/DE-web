import { Lesson } from '@/types/course';

export const airflowLesson7: Lesson = {
  "id": "airflow-7",
  "moduleSlug": "airflow",
  "order": 7,
  "title": "Управление ресурсами: Пулы (Pools), Concurrency, Priority Weight и очереди задач (Queues)",
  "estimatedMinutes": 40,
  "glossaryTerms": [
    {
      "term": "Airflow Pools (Пулы)",
      "definition": "Механизм ограничения количества одновременно выполняющихся задач (слотов), обращающихся к определенному общему ресурсу (например, не более 4 параллельных запросов к ClickHouse)."
    },
    {
      "term": "Priority Weight (Вес приоритета)",
      "definition": "Целочисленный приоритет задачи: при нехватке слотов в пуле Scheduler сначала запускает задачи с наибольшим весом (weight_rule='downstream')."
    },
    {
      "term": "Celery Queues",
      "definition": "Разделение задач по выделенным очередям воркеров (например, очередь 'gpu_queue' для ML-моделей или 'heavy_memory' для Spark-выгрузок)."
    }
  ],
  "schemaPreview": [
    {
      "tableName": "airflow_pools_registry",
      "description": "Конфигурация лимитов параллелизма в пулах ресурсов",
      "columns": [
        {
          "name": "pool_name",
          "type": "VARCHAR(64)",
          "keyType": "PK"
        },
        {
          "name": "slots",
          "type": "INTEGER"
        },
        {
          "name": "occupied_slots",
          "type": "INTEGER"
        },
        {
          "name": "queued_tasks",
          "type": "INTEGER"
        }
      ],
      "sampleRows": [
        {
          "pool_name": "clickhouse_heavy_queries",
          "slots": 4,
          "occupied_slots": 4,
          "queued_tasks": 12
        },
        {
          "pool_name": "external_api_rate_limit",
          "slots": 2,
          "occupied_slots": 1,
          "queued_tasks": 0
        }
      ]
    }
  ],
  "theoryBlocks": [
    {
      "type": "markdown",
      "content": "### Управление конкурентностью в Airflow: Как не положить боевые СУБД\n\nКогда в компании запускается 50 DAG'ов одновременно, каждый из которых пытается сделать `SELECT * FROM production_postgres`, база данных мгновенно исчерпывает пул подключений и ложится с ошибкой `FATAL: remaining connection slots are reserved for non-replication superuser connections`.\n\nВ Airflow для защиты внешних ресурсов используются **Пулы (Pools)**.\n\n#### 1. Механика Airflow Pools:\n* Создается именованный пул: `clickhouse_pool` с лимитом `slots = 4`.\n* Каждая задача, обращающаяся к ClickHouse, объявляет `pool=\"clickhouse_pool\"` и `pool_slots=1` (или `2` для сверхтяжелых выгрузок).\n* Если 4 слота заняты, 5-я задача встает в статус `queued` и терпеливо ждет освобождения слота.\n\n#### 2. Приоритеты: `priority_weight` и `weight_rule`\nЕсли в очереди пула скопилось 20 задач, какая должна пойти первой? Та, от которой зависят утренние отчеты генерального директора!\nПараметр `priority_weight=10` (по умолчанию `1`) гарантирует первоочередной запуск критических задач.\n\n#### 3. Тонкая настройка лимитов DAG:\n* `max_active_runs = 1`: не запускать новый экземпляр DAG, пока старый не завершился.\n* `max_active_tasks = 8`: ограничение параллельных тасок внутри одного DAG."
    },
    {
      "type": "callout",
      "variant": "analogy",
      "title": "💡 На пальцах: Шлагбаум на платной парковке",
      "content": "Пул Airflow — это шлагбаум подземной парковки на 50 мест: сколько бы машин ни приехало к торговому центру, шлагбаум не впустит 51-ю машину, пока не выедет одна из припаркованных. Машины скорой помощи (высокий `priority_weight`) объезжают общую очередь и заезжают первыми."
    },
    {
      "type": "before-after-table",
      "data": {
        "title": "Сравнение работы кластера с пулами и без них",
        "beforeDescription": "Неконтролируемый параллелизм (No Pools)",
        "beforeColumns": [
          "database_load",
          "connection_pool_state",
          "cluster_impact"
        ],
        "beforeRows": [
          [
            "50 simultaneous heavy queries",
            "Max connections exceeded",
            "Database crashes completely"
          ],
          [
            "Zero query prioritization",
            "CEO dashboard waits for logs",
            "Missed critical business SLAs"
          ],
          [
            "Uncontrolled memory burst",
            "OOM on database server",
            "Data engineers firefighting at 9 AM"
          ]
        ],
        "afterDescription": "Защита через Airflow Pools & Priority",
        "afterColumns": [
          "database_load",
          "connection_pool_state",
          "cluster_impact"
        ],
        "afterRows": [
          [
            "Strictly 4 concurrent queries",
            "Stable connection reserve",
            "Smooth predictable query latency"
          ],
          [
            "Priority weight ordering",
            "Critical marts finish first",
            "100% on-time CEO reporting"
          ],
          [
            "Capped resource usage",
            "Predictable RAM & CPU usage",
            "Zero downtime, zero alerts"
          ]
        ]
      }
    },
    {
      "type": "callout",
      "variant": "prod-danger",
      "title": "⚠️ Грабли в проде: Отсутствие `max_active_runs=1` при долгих выгрузках",
      "content": "DAG выгрузки данных рассчитывался на 15 минут, но из-за тормозов базы выполнялся 3 часа. Scheduler по расписанию запустил еще 2 экземпляра того же DAG. Три конкурирующих процесса начали одновременно читать и писать в одну таблицу, вызвав взаимоблокировку (Deadlock) в PostgreSQL."
    },
    {
      "type": "callout",
      "variant": "interview",
      "title": "🎯 Спросят на собесе: Чем `max_active_tasks_per_dag` отличается от `AIRFLOW__CORE__PARALLELISM`?",
      "content": "**Ответ:** `AIRFLOW__CORE__PARALLELISM` — это глобальный потолок одновременно выполняющихся задач во ВСЕМ кластере Airflow на всех воркерах. `max_active_tasks_per_dag` (ранее `dag_concurrency`) ограничивает параллелизм внутри одного конкретного DAG, не позволяя одному графу забрать себе все доступные слоты кластера."
    }
  ],
  "taskDescription": "Сконфигурируйте задачу TaskFlow с выделенным пулом ресурсов и повышенным приоритетом:\n1. Примените декоратор '@task'.\n2. Назначьте задачу в пул 'heavy_dw_pool' через аргумент `pool=\"heavy_dw_pool\"`.\n3. Укажите, что задача занимает 2 слота в пуле: `pool_slots=2`.\n4. Установите повышенный приоритет: `priority_weight=50`.\n5. Имя функции: 'extract_core_metrics()'. В теле функции выведите 'Metrics extracted successfully'.\n\nВведите код функции с декоратором @task и указанными параметрами.",
  "seedCode": "from airflow.decorators import task\n\n# Настройте задачу с пулом heavy_dw_pool и приоритетом\n@task(\n    # укажите параметры\n)\ndef extract_core_metrics():\n    print(\"Metrics extracted successfully\")",
  "initialCode": "from airflow.decorators import task\n\n@task(pool=\"heavy_dw_pool\", pool_slots=2, priority_weight=50)\ndef extract_core_metrics():\n    print(\"Metrics extracted successfully\")",
  "solutionCode": "from airflow.decorators import task\n\n@task(pool=\"heavy_dw_pool\", pool_slots=2, priority_weight=50)\ndef extract_core_metrics():\n    print(\"Metrics extracted successfully\")",
  "testConfig": {
    "checkOrder": false,
    "floatPrecision": 0,
    "requiredAstPatterns": [
      "@task",
      "pool=\"heavy_dw_pool\"",
      "pool_slots=2",
      "priority_weight=50",
      "extract_core_metrics"
    ]
  },
  "brokenProdTask": {
    "title": "Инцидент #807: Обрушение аналитической БД при одновременном запуске 30 задач",
    "incidentDescription": "30 задач параллельного экспорта одновременно обратились к ClickHouse, превысив лимит max_concurrent_queries.",
    "buggyCode": "@task\ndef export_table(name: str):\n    run_clickhouse_query(name)",
    "fixHint": "Добавьте ограничение pool='clickhouse_export_pool' в декоратор @task.",
    "solutionCode": "@task(pool='clickhouse_export_pool', pool_slots=1)\ndef export_table(name: str):\n    run_clickhouse_query(name)",
    "testConfig": {
      "checkOrder": false,
      "floatPrecision": 0
    }
  },
  "hints": [
    "Используйте аргументы `pool=\"heavy_dw_pool\"` и `pool_slots=2` в `@task(...)`.",
    "Повышенный приоритет задается аргументом `priority_weight=50`.",
    "Функция должна называться `extract_core_metrics()`."
  ]
};
